package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EmployeeService {

  private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");

  @PersistenceContext
  private EntityManager em;


  private static final NavigableMap<LocalDate, BigDecimal> WAGES = new TreeMap<>(Map.of(
    LocalDate.of(2022, 10, 1), new BigDecimal("12.00"),
    LocalDate.of(2024, 1, 1), new BigDecimal("12.41"),
    LocalDate.of(2025, 1, 1), new BigDecimal("12.82"),
    LocalDate.of(2026, 1, 1), new BigDecimal("13.90"),
    LocalDate.of(2027, 1, 1), new BigDecimal("14.60")
  ));
  private final Access access;

  public EmployeeService(Access access) {
    this.access = access;
  }

  public static BigDecimal minimumWage(LocalDate date) {
    var rate = WAGES.floorEntry(date);
    if (rate == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa cấu hình lương tối thiểu cho ngày hiệu lực.");
    return rate.getValue();
  }

  public static BigDecimal minijobLimit(LocalDate date) {
    return minimumWage(date).multiply(BigDecimal.valueOf(130)).divide(BigDecimal.valueOf(3), 0, RoundingMode.CEILING);
  }

  private static void validateWage(LocalDate date, String type, BigDecimal hourly, BigDecimal monthly) {
    if (hourly != null && hourly.compareTo(minimumWage(date)) < 0)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lương giờ tối thiểu tại ngày hiệu lực: " + minimumWage(date) + " EUR.");
    if (monthly != null && (monthly.signum() <= 0 || ("MINIJOB".equals(type) && monthly.compareTo(minijobLimit(date)) > 0)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lương tháng hoặc hạn mức Minijob không hợp lệ.");
  }

  public record EmployeeDto(
    Long employeeId,
    String employeeCode,
    String legalEntityId,
    String firstName,
    String lastName,
    String displayName,
    LocalDate dateOfBirth,
    String email,
    LocalDate hireDate,
    LocalDate terminationDate,
    String employmentStatus,
    Long positionId,
    String positionCode,
    String positionNameDe,
    String positionNameEn,
    String branchId,
    String branchName,
    String contractType,
    String payType,
    Integer weeklyHours,
    BigDecimal currentHourlyWage,
    BigDecimal currentMonthlyWage,
    List<String> activeRestrictions
  ) {}

  public record EmployeeDetailDto(
    EmployeeDto profile,
    List<EmploymentContractEntity> contracts,
    List<WageRateEntity> wageRates,
    List<WorkRestrictionEntity> restrictions
  ) {}

  public record EmployeeInput(
    String employeeCode,
    String legalEntityId,
    String branchId,
    Long positionId,
    String firstName,
    String lastName,
    LocalDate dateOfBirth,
    String email,
    LocalDate hireDate,
    String contractType, // UNLIMITED, FIXED_TERM, PROBATION, MINIJOB
    String payType, // HOURLY, MONTHLY
    Integer weeklyMinutes, // e.g. 2400 (40h), 1200 (20h)
    BigDecimal hourlyWage,
    BigDecimal monthlyWage
  ) {}

  public List<EmployeeDto> listEmployees(String branchId, String search, String status, Long exactId, boolean privateFields) {
    StringBuilder sql = new StringBuilder("SELECT e FROM EmployeeEntity e WHERE 1=1 ");
    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
      sql.append("AND e.employmentStatus = :st ");
    }
    if (search != null && !search.isBlank()) {
      sql.append("AND (LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s OR LOWER(e.employeeCode) LIKE :s) ");
    }
    if (exactId != null) sql.append("AND e.employeeId = :id ");
    sql.append("ORDER BY e.employeeId ASC");

    var query = em.createQuery(sql.toString(), EmployeeEntity.class);
    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
      query.setParameter("st", status);
    }
    if (search != null && !search.isBlank()) {
      query.setParameter("s", "%" + search.toLowerCase().trim() + "%");
    }

    if (exactId != null) query.setParameter("id", exactId);
    List<EmployeeEntity> list = query.getResultList();
    List<EmployeeDto> result = new ArrayList<>();

    LocalDate todayBerlin = LocalDate.now(BERLIN_ZONE);
    for (EmployeeEntity e : list) {
      if (!access.managesEmployee(e.employeeId)) continue;
      var assignment = access.assignments(e.employeeId, todayBerlin).stream()
        .filter(a -> branchId == null || branchId.equals(a.branchId)).findFirst().orElse(null);
      if (branchId != null && assignment == null) continue;
      String bId = assignment == null ? null : assignment.branchId;
      var branch = bId == null ? null : em.find(Domain.Branch.class, bId);
      String bName = branch == null ? null : branch.name;
      Long pId = assignment == null ? null : assignment.positionId;

      // Position
      String pCode = null, pDe = null, pEn = null;
      if (pId != null) {
        PositionEntity pos = em.find(PositionEntity.class, pId);
        if (pos != null) {
          pCode = pos.positionCode;
          pDe = pos.positionNameDe;
          pEn = pos.positionNameEn;
        }
      }

      // Active Contract
      List<EmploymentContractEntity> contracts = em.createQuery(
        "SELECT c FROM EmploymentContractEntity c WHERE c.employeeId = :eid AND c.startDate<=:today AND (c.endDate IS NULL OR c.endDate>=:today) ORDER BY c.startDate DESC",
        EmploymentContractEntity.class
      ).setParameter("eid", e.employeeId).setParameter("today", todayBerlin).setMaxResults(1).getResultList();

      String cType = null, payType = null;
      Integer weeklyHours = null;
      BigDecimal hourly = null, monthly = null;

      if (privateFields && !contracts.isEmpty()) {
        EmploymentContractEntity c = contracts.get(0);
        cType = c.contractType;
        payType = c.payType;
        weeklyHours = c.standardWeeklyMinutes != null ? c.standardWeeklyMinutes / 60 : null;

        // Current Wage
        List<WageRateEntity> wages = em.createQuery(
          "SELECT w FROM WageRateEntity w WHERE w.contractId = :cid AND w.validFrom <= :today AND (w.validTo IS NULL OR w.validTo >= :today) ORDER BY w.validFrom DESC",
          WageRateEntity.class
        )
        .setParameter("cid", c.contractId)
        .setParameter("today", todayBerlin)
        .setMaxResults(1)
        .getResultList();

        if (!wages.isEmpty()) {
          hourly = wages.get(0).grossHourlyEur;
          monthly = wages.get(0).grossMonthlyEur;
        }
      }

      // Active Restrictions
      List<WorkRestrictionEntity> restrList = em.createQuery(
        "SELECT r FROM WorkRestrictionEntity r WHERE r.employeeId = :eid AND r.validFrom <= :today AND (r.validTo IS NULL OR r.validTo >= :today)",
        WorkRestrictionEntity.class
      )
      .setParameter("eid", e.employeeId)
      .setParameter("today", todayBerlin)
      .getResultList();

      List<String> restrSummaries = new ArrayList<>();
      for (WorkRestrictionEntity r : restrList) {
        restrSummaries.add(r.schedulingRuleSummary);
      }

      result.add(new EmployeeDto(
        e.employeeId,
        e.employeeCode,
        e.legalEntityId,
        e.firstName,
        e.lastName,
        e.displayName,
        privateFields ? e.dateOfBirth : null,
        privateFields ? e.email : null,
        privateFields ? e.hireDate : null,
        privateFields ? e.terminationDate : null,
        e.employmentStatus,
        pId,
        pCode,
        pDe,
        pEn,
        bId,
        bName,
        cType,
        payType,
        weeklyHours,
        hourly,
        monthly,
        privateFields ? restrSummaries : List.of()
      ));
    }

    return result;
  }

  public EmployeeDetailDto getEmployeeDetail(Long employeeId) {
    EmployeeEntity e = em.find(EmployeeEntity.class, employeeId);
    if (e == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ nhân viên.");
    }

    List<EmploymentContractEntity> contracts = em.createQuery(
      "SELECT c FROM EmploymentContractEntity c WHERE c.employeeId = :eid ORDER BY c.startDate DESC",
      EmploymentContractEntity.class
    ).setParameter("eid", employeeId).getResultList();

    List<WageRateEntity> allWages = new ArrayList<>();
    for (EmploymentContractEntity c : contracts) {
      List<WageRateEntity> wages = em.createQuery(
        "SELECT w FROM WageRateEntity w WHERE w.contractId = :cid ORDER BY w.validFrom DESC",
        WageRateEntity.class
      ).setParameter("cid", c.contractId).getResultList();
      allWages.addAll(wages);
    }

    List<WorkRestrictionEntity> restrictions = em.createQuery(
      "SELECT r FROM WorkRestrictionEntity r WHERE r.employeeId = :eid ORDER BY r.validFrom DESC",
      WorkRestrictionEntity.class
    ).setParameter("eid", employeeId).getResultList();

    // Summary profile
    List<EmployeeDto> summaryList = listEmployees(null, null, "ALL", employeeId, true);
    EmployeeDto profile = !summaryList.isEmpty() ? summaryList.get(0) : null;

    return new EmployeeDetailDto(profile, contracts, allWages, restrictions);
  }

  public EmployeeEntity createEmployee(EmployeeInput input) {
    // 1. Validation for unique employeeCode
    Long countCode = em.createQuery(
      "SELECT COUNT(e) FROM EmployeeEntity e WHERE e.employeeCode = :code", Long.class
    ).setParameter("code", input.employeeCode()).getSingleResult();
    if (countCode > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã nhân viên '" + input.employeeCode() + "' đã tồn tại.");
    }

    LocalDate effective = input.hireDate() == null ? LocalDate.now(BERLIN_ZONE) : input.hireDate();
    validateWage(effective, input.contractType(), input.hourlyWage(), input.monthlyWage());
    var branch = input.branchId() == null ? null : em.find(Domain.Branch.class, input.branchId());
    var position = input.positionId() == null ? null : em.find(PositionEntity.class, input.positionId());
    if (branch == null || !branch.active || !Objects.equals(branch.legalEntityId, input.legalEntityId())
      || (input.positionId() != null && (position == null || !position.active))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chi nhánh, pháp nhân hoặc vị trí không hợp lệ.");
    }
    var location = em.createQuery(
      "select l from WorkLocation l where l.branchId=:id and l.active=true order by l.createdAt, l.id", Domain.WorkLocation.class)
      .setParameter("id", branch.id).setMaxResults(1).getResultList().stream().findFirst()
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Chi nhánh chưa có địa điểm làm việc đang hoạt động."));
    if (input.employeeCode() == null || input.employeeCode().isBlank() || input.firstName() == null
      || input.firstName().isBlank() || input.lastName() == null || input.lastName().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã, họ và tên nhân viên là bắt buộc.");
    }
    String email = input.email() == null || input.email().isBlank() ? null : input.email().trim().toLowerCase(Locale.ROOT);
    if (email != null && em.createQuery("select count(e) from EmployeeEntity e where lower(e.email)=:email", Long.class)
      .setParameter("email", email).getSingleResult() != 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã thuộc một hồ sơ nhân viên khác.");

    EmployeeEntity emp = new EmployeeEntity();
    emp.employeeCode = input.employeeCode();
    emp.legalEntityId = input.legalEntityId();
    emp.firstName = input.firstName();
    emp.lastName = input.lastName();
    emp.displayName = input.firstName() + " " + input.lastName();
    emp.dateOfBirth = input.dateOfBirth();
    emp.email = email;
    emp.hireDate = effective;
    emp.employmentStatus = "ACTIVE";
    emp.createdAtUtc = Instant.now();
    em.persist(emp);
    em.flush();

    // Create Initial Contract
    EmploymentContractEntity contract = new EmploymentContractEntity();
    contract.employeeId = emp.employeeId;
    contract.contractNumber = "CTR-" + emp.employeeCode;
    contract.contractType = input.contractType() != null ? input.contractType() : "UNLIMITED";
    contract.payType = input.payType() != null ? input.payType() : "HOURLY";
    contract.startDate = emp.hireDate;
    contract.standardWeeklyMinutes = input.weeklyMinutes() != null ? input.weeklyMinutes() : 2400;
    contract.status = "ACTIVE";
    em.persist(contract);
    em.flush();

    // Create Initial Wage Rate
    if (input.hourlyWage() != null || input.monthlyWage() != null) {
      WageRateEntity wage = new WageRateEntity();
      wage.contractId = contract.contractId;
      wage.validFrom = contract.startDate;
      wage.grossHourlyEur = input.hourlyWage();
      wage.grossMonthlyEur = input.monthlyWage();
      wage.currencyCode = "EUR";
      wage.approvalStatus = "APPROVED";
      em.persist(wage);
    }

    var profile = new Domain.EmployeeRef();
    profile.id = emp.employeeId.toString();
    profile.name = emp.displayName;
    profile.position = position == null ? null : position.positionNameDe;
    profile.homeBranchId = branch.id;
    em.persist(profile);

    var assignment = new Domain.EmployeeAssignment();
    assignment.employeeId = profile.id;
    assignment.branchId = branch.id;
    assignment.workLocationId = location.id;
    assignment.positionId = input.positionId();
    assignment.validFrom = effective;
    assignment.kind = "HOME";
    assignment.reason = "Tạo hồ sơ nhân viên";
    assignment.stateCode = location.stateCode;
    assignment.timezone = location.timezone;
    assignment.addressSnapshot = location.address;
    em.persist(assignment);

    return emp;
  }

  public void addContractRevision(Long employeeId, EmploymentContractEntity newContract) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    if (emp == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên.");

    if (newContract.startDate == null || newContract.startDate.isBefore(emp.hireDate)
      || (newContract.endDate != null && newContract.endDate.isBefore(newContract.startDate)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày hiệu lực hợp đồng không hợp lệ.");

    // Close previous active contract by setting end_date = newContract.startDate - 1 day
    List<EmploymentContractEntity> activeContracts = em.createQuery(
      "SELECT c FROM EmploymentContractEntity c WHERE c.employeeId = :eid AND c.status = 'ACTIVE'",
      EmploymentContractEntity.class
    ).setParameter("eid", employeeId).getResultList();

    for (EmploymentContractEntity old : activeContracts) {
      if (!old.startDate.isBefore(newContract.startDate)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã có hợp đồng hiệu lực vào ngày này hoặc sau đó.");
      if (old.endDate == null || !old.endDate.isBefore(newContract.startDate)) {
        old.endDate = newContract.startDate.minusDays(1);
        old.status = "EXPIRED";
      }
    }

    newContract.contractId = null;
    newContract.employeeId = employeeId;
    newContract.status = "ACTIVE";
    em.persist(newContract);
  }

  public void addWageRateRevision(Long contractId, WageRateEntity newWage) {
    EmploymentContractEntity contract = em.find(EmploymentContractEntity.class, contractId);
    if (contract == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng.");

    if (newWage.validFrom == null || newWage.validFrom.isBefore(contract.startDate)
      || (contract.endDate != null && newWage.validFrom.isAfter(contract.endDate))
      || (newWage.validTo != null && newWage.validTo.isBefore(newWage.validFrom))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày hiệu lực mức lương không hợp lệ.");
    }
    validateWage(newWage.validFrom, contract.contractType, newWage.grossHourlyEur, newWage.grossMonthlyEur);

    // Close previous wage rate
    List<WageRateEntity> activeWages = em.createQuery(
      "SELECT w FROM WageRateEntity w WHERE w.contractId = :cid AND (w.validTo IS NULL OR w.validTo >= :vf)",
      WageRateEntity.class
    )
    .setParameter("cid", contractId)
    .setParameter("vf", newWage.validFrom)
    .getResultList();

    for (WageRateEntity old : activeWages) {
      if (!old.validFrom.isBefore(newWage.validFrom)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã có mức lương cho ngày này hoặc ngày sau đó.");
      old.validTo = newWage.validFrom.minusDays(1);
    }

    newWage.wageRateId = null;
    newWage.contractId = contractId;
    newWage.approvalStatus = "APPROVED";
    em.persist(newWage);
  }

  public void addWorkRestriction(Long employeeId, WorkRestrictionEntity restriction) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    if (emp == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên.");
    if (restriction == null || restriction.restrictionType == null
      || !List.of("YOUTH_PROTECTION", "MATERNITY_PROTECTION", "MEDICAL_LIMIT").contains(restriction.restrictionType.toUpperCase(Locale.ROOT))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại hạn chế lao động không hợp lệ.");
    }
    if (restriction.validFrom == null || (restriction.validTo != null && restriction.validTo.isBefore(restriction.validFrom))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng ngày hiệu lực hạn chế không hợp lệ.");
    }
    if ((restriction.maxDailyMinutes != null && (restriction.maxDailyMinutes <= 0 || restriction.maxDailyMinutes > 720))
      || (restriction.maxWeeklyMinutes != null && (restriction.maxWeeklyMinutes <= 0 || restriction.maxWeeklyMinutes > 3600))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giới hạn số phút làm việc không hợp lệ.");
    }
    if (restriction.schedulingRuleSummary == null || restriction.schedulingRuleSummary.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mô tả quy tắc xếp ca không được để trống.");
    }

    restriction.restrictionId = null;
    restriction.restrictionType = restriction.restrictionType.toUpperCase(Locale.ROOT);
    restriction.employeeId = employeeId;
    restriction.createdAtUtc = Instant.now();
    em.persist(restriction);
  }
}
