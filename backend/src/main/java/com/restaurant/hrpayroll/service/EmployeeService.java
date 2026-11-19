package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EmployeeService {

  @PersistenceContext
  private EntityManager em;

  public static final BigDecimal GERMAN_MINIMUM_WAGE_2024 = new BigDecimal("12.41");
  public static final BigDecimal MINIJOB_MONTHLY_LIMIT = new BigDecimal("538.00");

  public record EmployeeDto(
    Long employeeId,
    String employeeCode,
    Long legalEntityId,
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
    Long branchId,
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
    Long legalEntityId,
    Long branchId,
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

  public List<EmployeeDto> listEmployees(Long branchId, String search, String status) {
    StringBuilder sql = new StringBuilder("SELECT e FROM EmployeeEntity e WHERE 1=1 ");
    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
      sql.append("AND e.employmentStatus = :st ");
    }
    if (search != null && !search.isBlank()) {
      sql.append("AND (LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s OR LOWER(e.employeeCode) LIKE :s OR LOWER(e.email) LIKE :s) ");
    }
    sql.append("ORDER BY e.employeeId ASC");

    var query = em.createQuery(sql.toString(), EmployeeEntity.class);
    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
      query.setParameter("st", status);
    }
    if (search != null && !search.isBlank()) {
      query.setParameter("s", "%" + search.toLowerCase().trim() + "%");
    }

    List<EmployeeEntity> list = query.getResultList();
    List<EmployeeDto> result = new ArrayList<>();

    for (EmployeeEntity e : list) {
      // Find branch from employee_assignments
      Long bId = null;
      String bName = null;
      Long pId = null;
      try {
        var assign = em.createNativeQuery(
          "SELECT a.branch_id, b.name, a.position_id FROM employee_assignments a JOIN branches b ON a.branch_id = b.id WHERE a.employee_id = :eid ORDER BY a.assignment_id DESC LIMIT 1"
        )
        .setParameter("eid", e.employeeId)
        .getResultList();
        if (!assign.isEmpty()) {
          Object[] row = (Object[]) assign.get(0);
          bId = row[0] != null ? Long.valueOf(row[0].toString()) : null;
          bName = row[1] != null ? row[1].toString() : null;
          pId = row[2] != null ? Long.valueOf(row[2].toString()) : null;
        }
      } catch (Exception ignored) {}

      // Filter by branchId if specified
      if (branchId != null && (bId == null || !bId.equals(branchId))) {
        continue;
      }

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
        "SELECT c FROM EmploymentContractEntity c WHERE c.employeeId = :eid AND c.status = 'ACTIVE' ORDER BY c.startDate DESC",
        EmploymentContractEntity.class
      ).setParameter("eid", e.employeeId).setMaxResults(1).getResultList();

      String cType = null, payType = null;
      Integer weeklyHours = null;
      BigDecimal hourly = null, monthly = null;

      if (!contracts.isEmpty()) {
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
        .setParameter("today", LocalDate.now())
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
      .setParameter("today", LocalDate.now())
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
        e.dateOfBirth,
        e.email,
        e.hireDate,
        e.terminationDate,
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
        restrSummaries
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
    List<EmployeeDto> summaryList = listEmployees(null, e.employeeCode, "ALL");
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

    // 2. Validation for German Minimum Wage (MiLoG >= 12.41€/h)
    if (input.hourlyWage() != null && input.hourlyWage().compareTo(GERMAN_MINIMUM_WAGE_2024) < 0) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Mức lương theo giờ (" + input.hourlyWage() + "€) vi phạm mức lương tối thiểu của Đức (MiLoG: tối thiểu " + GERMAN_MINIMUM_WAGE_2024 + "€/h)."
      );
    }

    // 3. Validation for Minijob limit (<= 538€)
    if ("MINIJOB".equalsIgnoreCase(input.contractType())) {
      if (input.monthlyWage() != null && input.monthlyWage().compareTo(MINIJOB_MONTHLY_LIMIT) > 0) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Hợp đồng Minijob không được vượt quá " + MINIJOB_MONTHLY_LIMIT + "€/tháng theo luật Đức."
        );
      }
    }

    EmployeeEntity emp = new EmployeeEntity();
    emp.employeeCode = input.employeeCode();
    emp.legalEntityId = input.legalEntityId() != null ? input.legalEntityId() : 1L;
    emp.firstName = input.firstName();
    emp.lastName = input.lastName();
    emp.displayName = input.firstName() + " " + input.lastName();
    emp.dateOfBirth = input.dateOfBirth();
    emp.email = input.email();
    emp.hireDate = input.hireDate() != null ? input.hireDate() : LocalDate.now();
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

    // Create assignment if branch & position provided
    if (input.branchId() != null && input.positionId() != null) {
      try {
        em.createNativeQuery(
          "INSERT INTO employee_assignments (employee_id, branch_id, position_id, valid_from, assignment_type, address_snapshot, kind, reason, state_code, timezone, work_location_id) " +
          "VALUES (:eid, :bid, :pid, :vf, 'PRIMARY', 'Snapshot', 'PRIMARY', 'Tạo mới hồ sơ', 'BW', 'Europe/Berlin', 1)"
        )
        .setParameter("eid", emp.employeeId)
        .setParameter("bid", input.branchId())
        .setParameter("pid", input.positionId())
        .setParameter("vf", emp.hireDate)
        .executeUpdate();
      } catch (Exception ignored) {}
    }

    return emp;
  }

  public void addContractRevision(Long employeeId, EmploymentContractEntity newContract) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    if (emp == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên.");

    // Close previous active contract by setting end_date = newContract.startDate - 1 day
    List<EmploymentContractEntity> activeContracts = em.createQuery(
      "SELECT c FROM EmploymentContractEntity c WHERE c.employeeId = :eid AND c.status = 'ACTIVE'",
      EmploymentContractEntity.class
    ).setParameter("eid", employeeId).getResultList();

    for (EmploymentContractEntity old : activeContracts) {
      if (old.endDate == null || old.endDate.isAfter(newContract.startDate)) {
        old.endDate = newContract.startDate.minusDays(1);
        old.status = "EXPIRED";
      }
    }

    newContract.employeeId = employeeId;
    newContract.status = "ACTIVE";
    em.persist(newContract);
  }

  public void addWageRateRevision(Long contractId, WageRateEntity newWage) {
    EmploymentContractEntity contract = em.find(EmploymentContractEntity.class, contractId);
    if (contract == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng.");

    if (newWage.grossHourlyEur != null && newWage.grossHourlyEur.compareTo(GERMAN_MINIMUM_WAGE_2024) < 0) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Mức lương theo giờ (" + newWage.grossHourlyEur + "€) vi phạm mức lương tối thiểu của Đức (MiLoG >= " + GERMAN_MINIMUM_WAGE_2024 + "€)."
      );
    }

    // Close previous wage rate
    List<WageRateEntity> activeWages = em.createQuery(
      "SELECT w FROM WageRateEntity w WHERE w.contractId = :cid AND (w.validTo IS NULL OR w.validTo >= :vf)",
      WageRateEntity.class
    )
    .setParameter("cid", contractId)
    .setParameter("vf", newWage.validFrom)
    .getResultList();

    for (WageRateEntity old : activeWages) {
      old.validTo = newWage.validFrom.minusDays(1);
    }

    newWage.contractId = contractId;
    newWage.approvalStatus = "APPROVED";
    em.persist(newWage);
  }

  public void addWorkRestriction(Long employeeId, WorkRestrictionEntity restriction) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    if (emp == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên.");

    restriction.employeeId = employeeId;
    restriction.createdAtUtc = Instant.now();
    em.persist(restriction);
  }
}
