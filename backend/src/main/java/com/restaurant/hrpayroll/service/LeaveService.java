package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class LeaveService {

  @PersistenceContext
  private EntityManager em;

  private final Access access;

  public LeaveService(Access access) {
    this.access = access;
  }

  private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");

  // DTOs
  public record LeaveTypeDto(
    Integer leaveTypeId,
    String leaveCode,
    String nameDe,
    String nameVi,
    String description,
    String payTreatment,
    boolean countsAgainstAnnualLeave
  ) {}

  public record LeaveBalanceDto(
    Long balanceId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    Integer leaveTypeId,
    String leaveTypeName,
    Integer leaveYear,
    BigDecimal entitledDays,
    BigDecimal usedDays,
    BigDecimal carriedDays,
    BigDecimal remainingDays,
    LocalDate expiryDate,
    String approvalStatus
  ) {}

  public record LeaveRequestDto(
    Long leaveRequestId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    Integer leaveTypeId,
    String leaveTypeCode,
    String leaveTypeName,
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal requestedDays,
    String reason,
    String status,
    String reviewedByUserId,
    String reviewedByName,
    String reviewNotes,
    Instant reviewedAtUtc,
    Instant createdAtUtc
  ) {}

  public record SicknessAbsenceDto(
    Long absenceId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    LocalDate startDate,
    LocalDate endDate,
    long durationDays,
    boolean hasMedicalCertificate,
    LocalDate certificateDate,
    boolean isContinuedPayEligible,
    boolean isChildSickLeave,
    BigDecimal grossPayImpactPercent,
    String confidentialDocumentRef,
    String verificationStatus,
    String notes,
    Instant createdAtUtc
  ) {}

  public record CompensatoryRestDto(
    Long restId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    String branchId,
    LocalDate relatedWorkDate,
    LocalDate restDate,
    LocalDate deadlineDate,
    String restKind,
    String status,
    String policyReference,
    String notes,
    long daysUntilDeadline,
    boolean isOverdue
  ) {}

  // 1. Danh mục loại nghỉ
  public List<LeaveTypeDto> getLeaveTypes() {
    List<LeaveTypeEntity> list = em.createQuery(
      "SELECT t FROM LeaveTypeEntity t ORDER BY t.leaveTypeId ASC",
      LeaveTypeEntity.class
    ).getResultList();

    return list.stream().map(t -> new LeaveTypeDto(
      t.leaveTypeId,
      t.leaveCode,
      t.nameDe,
      t.nameVi != null ? t.nameVi : t.nameDe,
      t.description,
      t.payTreatment,
      Boolean.TRUE.equals(t.countsAgainstAnnualLeave)
    )).toList();
  }

  // 2. Tra cứu & tự khởi tạo số dư phép năm (BUrlG)
  public List<LeaveBalanceDto> getLeaveBalances(Long employeeId, Integer year) {
    int targetYear = (year != null && year > 2000) ? year : LocalDate.now(BERLIN_ZONE).getYear();

    String q = "SELECT b FROM LeaveBalanceEntity b WHERE b.leaveYear = :y";
    if (employeeId != null && employeeId > 0) {
      q += " AND b.employeeId = :empId";
    }
    q += " ORDER BY b.employeeId ASC, b.leaveTypeId ASC";

    var query = em.createQuery(q, LeaveBalanceEntity.class).setParameter("y", targetYear);
    if (employeeId != null && employeeId > 0) {
      query.setParameter("empId", employeeId);
    }
    List<LeaveBalanceEntity> list = query.getResultList();

    Map<Long, EmployeeEntity> empCache = new HashMap<>();
    Map<Integer, LeaveTypeEntity> typeCache = new HashMap<>();

    return list.stream().map(b -> {
      EmployeeEntity emp = empCache.computeIfAbsent(b.employeeId, id -> em.find(EmployeeEntity.class, id));
      LeaveTypeEntity lt = typeCache.computeIfAbsent(b.leaveTypeId, id -> em.find(LeaveTypeEntity.class, id));

      return new LeaveBalanceDto(
        b.balanceId,
        b.employeeId,
        emp != null ? emp.displayName : "Nhân viên #" + b.employeeId,
        emp != null ? emp.employeeCode : "E-",
        b.leaveTypeId,
        lt != null ? (lt.nameVi != null ? lt.nameVi : lt.nameDe) : "Phép năm",
        b.leaveYear,
        b.entitledDays,
        b.usedDays,
        b.carriedDays,
        b.remainingDays,
        b.expiryDate,
        b.approvalStatus
      );
    }).toList();
  }

  // 3. Nhân viên gửi đơn xin nghỉ phép (F06.02)
  public LeaveRequestEntity createLeaveRequest(
    Long employeeId,
    Integer leaveTypeId,
    LocalDate start,
    LocalDate end,
    String reason
  ) {
    if (employeeId == null || leaveTypeId == null || start == null || end == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin bắt buộc của đơn xin nghỉ phép!");
    }
    if (end.isBefore(start)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc nghỉ phép không được trước ngày bắt đầu!");
    }

    LeaveTypeEntity type = em.find(LeaveTypeEntity.class, leaveTypeId);
    if (type == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy loại nghỉ phép tương ứng!");
    }

    if (start.getYear() != end.getYear() || ChronoUnit.DAYS.between(start, end) > 366)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy gửi đơn riêng cho từng năm.");
    if (List.of("SICK", "CHILD_SICK", "COMP_REST").contains(type.leaveCode))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy sử dụng quy trình nghỉ ốm hoặc nghỉ bù riêng.");
    var employee = em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (employee == null || start.isBefore(employee.hireDate) || (employee.terminationDate != null && end.isAfter(employee.terminationDate)))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ngày nghỉ nằm ngoài thời gian làm việc.");
    Long overlap = em.createQuery("""
      select count(r) from LeaveRequestEntity r where r.employeeId=:id and r.status in ('PENDING','APPROVED')
      and r.startDate<=:end and r.endDate>=:start
      """, Long.class).setParameter("id", employeeId).setParameter("start", start).setParameter("end", end).getSingleResult();
    Long sickOverlap = em.createQuery("""
      select count(a) from SicknessAbsenceEntity a where a.employeeId=:id and a.verificationStatus<>'REJECTED'
      and a.startDate<=:end and a.endDate>=:start
      """, Long.class).setParameter("id", employeeId).setParameter("start", start).setParameter("end", end).getSingleResult();
    if (overlap > 0 || sickOverlap > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã có đơn nghỉ hoặc hồ sơ nghỉ ốm trùng khoảng ngày.");

    long totalDays = 0;
    for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
      boolean scheduled = hasShift(employeeId, day, false);
      boolean businessDay = day.getDayOfWeek().getValue() <= 5 && !isHoliday(employeeId, null, day);
      if (scheduled || businessDay) totalDays++;
    }
    if (totalDays == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng ngày không có ngày làm việc.");
    BigDecimal reqDays = BigDecimal.valueOf(totalDays);
    if (Boolean.TRUE.equals(type.countsAgainstAnnualLeave))
      leaveBalance(employeeId, leaveTypeId, start.getYear(), reqDays, start);

    LeaveRequestEntity req = new LeaveRequestEntity();
    req.employeeId = employeeId;
    req.leaveTypeId = leaveTypeId;
    req.startDate = start;
    req.endDate = end;
    req.requestedDays = reqDays;
    req.reason = reason;
    req.status = "PENDING";
    req.createdAtUtc = Instant.now();

    em.persist(req);
    return req;
  }

  // 4. Lấy danh sách đơn xin nghỉ phép (theo chi nhánh hoặc nhân viên)
  public List<LeaveRequestDto> getLeaveRequests(Long employeeId, String statusFilter) {
    String q = "SELECT r FROM LeaveRequestEntity r WHERE 1=1";
    if (employeeId != null && employeeId > 0) {
      q += " AND r.employeeId = :empId";
    }
    if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
      q += " AND r.status = :status";
    }
    q += " ORDER BY r.createdAtUtc DESC";

    var query = em.createQuery(q, LeaveRequestEntity.class);
    if (employeeId != null && employeeId > 0) {
      query.setParameter("empId", employeeId);
    }
    if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
      query.setParameter("status", statusFilter);
    }

    List<LeaveRequestEntity> list = query.getResultList();
    Map<Long, EmployeeEntity> empCache = new HashMap<>();
    Map<Integer, LeaveTypeEntity> typeCache = new HashMap<>();
    Map<String, String> reviewerCache = new HashMap<>();

    return list.stream().map(r -> {
      EmployeeEntity emp = empCache.computeIfAbsent(r.employeeId, id -> em.find(EmployeeEntity.class, id));
      LeaveTypeEntity lt = typeCache.computeIfAbsent(r.leaveTypeId, id -> em.find(LeaveTypeEntity.class, id));
      String reviewerName = r.reviewedByUserId == null ? null : reviewerCache.computeIfAbsent(r.reviewedByUserId, uid -> {
        var u = em.find(Domain.UserAccount.class, uid);
        return u != null ? u.name : "Quản lý / HR";
      });

      return new LeaveRequestDto(
        r.leaveRequestId,
        r.employeeId,
        emp != null ? emp.displayName : "Nhân viên #" + r.employeeId,
        emp != null ? emp.employeeCode : "E-",
        r.leaveTypeId,
        lt != null ? lt.leaveCode : "LEAVE",
        lt != null ? (lt.nameVi != null ? lt.nameVi : lt.nameDe) : "Nghỉ phép",
        r.startDate,
        r.endDate,
        r.requestedDays,
        r.reason,
        r.status,
        r.reviewedByUserId,
        reviewerName,
        r.reviewNotes,
        r.reviewedAtUtc,
        r.createdAtUtc
      );
    }).toList();
  }

  // 5. Quản lý duyệt hoặc từ chối đơn xin nghỉ phép (F06.02 + SoD)
  public LeaveRequestEntity reviewLeaveRequest(
    Long requestId,
    boolean approve,
    String notes,
    String currentUserId,
    Long currentEmployeeId
  ) {
    LeaveRequestEntity req = em.find(LeaveRequestEntity.class, requestId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (req == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn xin nghỉ phép ID #" + requestId);
    }
    if (!"PENDING".equals(req.status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn xin nghỉ này đã được xử lý từ trước!");
    }

    // Segregation of Duties (SoD): Manager cannot approve own leave request!
    if (currentEmployeeId != null && currentEmployeeId.equals(req.employeeId)) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Vi phạm quy tắc SoD (Segregation of Duties): Bạn không được phép tự phê duyệt đơn xin nghỉ phép của chính mình!"
      );
    }

    req.reviewedByUserId = currentUserId;
    req.reviewNotes = notes;
    req.reviewedAtUtc = Instant.now();

    if (approve) {
      req.status = "APPROVED";

      // If counts against annual leave, deduct balance
      LeaveTypeEntity type = em.find(LeaveTypeEntity.class, req.leaveTypeId);
      if (type != null && Boolean.TRUE.equals(type.countsAgainstAnnualLeave)) {
        var balance = leaveBalance(req.employeeId, req.leaveTypeId, req.startDate.getYear(), req.requestedDays, req.startDate);
        balance.usedDays = balance.usedDays.add(req.requestedDays);
        balance.remainingDays = balance.remainingDays.subtract(req.requestedDays);
        balance.updatedAtUtc = Instant.now();
      }

      markAbsence(req.employeeId, req.startDate, req.endDate, "LEAVE_APPROVED");

    } else {
      req.status = "REJECTED";
    }

    return req;
  }

  // 6. Ghi nhận nghỉ ốm tuân thủ DSGVO / EntgFG (F06.03)
  public SicknessAbsenceEntity recordSickness(
    Long employeeId,
    LocalDate start,
    LocalDate end,
    boolean hasCert,
    boolean childSick,
    LocalDate certDate,
    String documentRef,
    String notes,
    String recorderUserId
  ) {
    if (employeeId == null || start == null || end == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin bắt buộc của hồ sơ nghỉ ốm!");
    }
    if (end.isBefore(start)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc nghỉ ốm không được trước ngày bắt đầu!");
    }

    long days = ChronoUnit.DAYS.between(start, end) + 1;

    // Check EntgFG: Continued pay up to 42 days (6 weeks)
    var employee = em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (employee == null || start.isBefore(employee.hireDate) || (employee.terminationDate != null && end.isAfter(employee.terminationDate)))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Nghỉ ốm nằm ngoài thời gian làm việc.");
    if (certDate != null && !hasCert) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần xác nhận chứng từ trước khi nhập ngày.");
    Long sickOverlap = em.createQuery("""
      select count(a) from SicknessAbsenceEntity a where a.employeeId=:id and a.verificationStatus<>'REJECTED'
      and a.startDate<=:end and a.endDate>=:start
      """, Long.class).setParameter("id", employeeId).setParameter("start", start).setParameter("end", end).getSingleResult();
    Long leaveOverlap = em.createQuery("""
      select count(r) from LeaveRequestEntity r where r.employeeId=:id and r.status in ('PENDING','APPROVED')
      and r.startDate<=:end and r.endDate>=:start
      """, Long.class).setParameter("id", employeeId).setParameter("start", start).setParameter("end", end).getSingleResult();
    if (sickOverlap > 0 || leaveOverlap > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã có hồ sơ nghỉ ốm hoặc đơn nghỉ phép trùng khoảng ngày.");
    }
    boolean eligible = !childSick && !start.isBefore(employee.hireDate.plusWeeks(4));
    BigDecimal payPercent = new BigDecimal("100.00");
    if (eligible && days > 42) {
      payPercent = BigDecimal.valueOf(4200).divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP);
    } else if (!eligible) {
      // Waiting period from the start of employment
      payPercent = BigDecimal.ZERO;
    }

    SicknessAbsenceEntity s = new SicknessAbsenceEntity();
    s.employeeId = employeeId;
    s.leaveTypeId = em.createQuery("select t.leaveTypeId from LeaveTypeEntity t where t.leaveCode=:code", Integer.class)
      .setParameter("code", childSick ? "CHILD_SICK" : "SICK").getResultList().stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu loại nghỉ ốm."));
    s.startDate = start;
    s.endDate = end;
    s.hasMedicalCertificate = hasCert;
    s.certificateDate = certDate;
    s.isContinuedPayEligible = eligible;
    s.grossPayImpactPercent = payPercent;
    s.confidentialDocumentRef = documentRef == null || documentRef.isBlank() ? null : documentRef.trim();
    s.notes = notes != null ? notes : "Ghi nhận nghỉ ốm theo quy định EntgFG";
    s.recordedByUserId = recorderUserId;
    s.verificationStatus = hasCert && eligible && days <= 42 ? "VERIFIED" : "PENDING_REVIEW";
    s.createdAtUtc = Instant.now();

    em.persist(s);

    markAbsence(employeeId, start, end, "SICK_LEAVE");

    return s;
  }

  // 7. Lấy danh sách hồ sơ nghỉ ốm
  public List<SicknessAbsenceDto> getSicknessAbsences(Long employeeId) {
    String q = "SELECT a FROM SicknessAbsenceEntity a, LeaveTypeEntity t WHERE t.leaveTypeId=a.leaveTypeId AND t.leaveCode IN ('SICK','CHILD_SICK')";
    if (employeeId != null && employeeId > 0) {
      q += " AND a.employeeId = :empId";
    }
    q += " ORDER BY a.startDate DESC";

    var query = em.createQuery(q, SicknessAbsenceEntity.class);
    if (employeeId != null && employeeId > 0) {
      query.setParameter("empId", employeeId);
    }
    List<SicknessAbsenceEntity> list = query.getResultList();

    Map<Long, EmployeeEntity> empCache = new HashMap<>();

    return list.stream().map(a -> {
      EmployeeEntity emp = empCache.computeIfAbsent(a.employeeId, id -> em.find(EmployeeEntity.class, id));
      long duration = ChronoUnit.DAYS.between(a.startDate, a.endDate) + 1;

      return new SicknessAbsenceDto(
        a.absenceId,
        a.employeeId,
        emp != null ? emp.displayName : "Nhân viên #" + a.employeeId,
        emp != null ? emp.employeeCode : "E-",
        a.startDate,
        a.endDate,
        duration,
        Boolean.TRUE.equals(a.hasMedicalCertificate),
        a.certificateDate,
        Boolean.TRUE.equals(a.isContinuedPayEligible),
        "CHILD_SICK".equals(em.find(LeaveTypeEntity.class, a.leaveTypeId).leaveCode),
        a.grossPayImpactPercent,
        a.confidentialDocumentRef,
        a.verificationStatus,
        a.notes,
        a.createdAtUtc
      );
    }).toList();
  }

  // 8. Theo dõi nghĩa vụ nghỉ bù ArbZG §11(3)
  public List<CompensatoryRestDto> getCompensatoryRestObligations(String branchId, Long employeeId) {
    String q = "SELECT r FROM CompensatoryRestDayEntity r WHERE 1=1";
    if (branchId != null) {
      q += " AND r.branchId = :bId";
    }
    if (employeeId != null && employeeId > 0) {
      q += " AND r.employeeId = :empId";
    }
    q += " ORDER BY r.deadlineDate ASC, r.relatedWorkDate DESC";

    var query = em.createQuery(q, CompensatoryRestDayEntity.class);
    if (branchId != null) {
      query.setParameter("bId", branchId);
    }
    if (employeeId != null && employeeId > 0) {
      query.setParameter("empId", employeeId);
    }
    List<CompensatoryRestDayEntity> list = query.getResultList();

    LocalDate today = LocalDate.now(BERLIN_ZONE);
    Map<Long, EmployeeEntity> empCache = new HashMap<>();

    return list.stream().map(r -> {
      EmployeeEntity emp = empCache.computeIfAbsent(r.employeeId, id -> em.find(EmployeeEntity.class, id));
      LocalDate dl = r.deadlineDate != null ? r.deadlineDate : r.relatedWorkDate.plusWeeks(2);
      long daysLeft = ChronoUnit.DAYS.between(today, dl);
      boolean overdue = !"COMPLETED".equals(r.status) && daysLeft < 0;

      return new CompensatoryRestDto(
        r.restId,
        r.employeeId,
        emp != null ? emp.displayName : "Nhân viên #" + r.employeeId,
        emp != null ? emp.employeeCode : "E-",
        r.branchId,
        r.relatedWorkDate,
        r.restDate,
        dl,
        r.restKind,
        overdue ? "OVERDUE" : r.status,
        r.policyReference,
        r.notes,
        daysLeft,
        overdue
      );
    }).toList();
  }

  public void recordRestObligations(AttendanceTimesheetEntity timesheet) {
    if (timesheet.actualStartUtc == null || timesheet.actualEndUtc == null) return;
    LocalDate day = timesheet.actualStartUtc.atZone(BERLIN_ZONE).toLocalDate();
    LocalDate last = timesheet.actualEndUtc.minusNanos(1).atZone(BERLIN_ZONE).toLocalDate();
    for (; !day.isAfter(last); day = day.plusDays(1)) {
      boolean sunday = day.getDayOfWeek() == DayOfWeek.SUNDAY;
      boolean holiday = !sunday && isHoliday(timesheet.employeeId, timesheet.branchId, day);
      if (!sunday && !holiday) continue;
      String kind = holiday ? "HOLIDAY_COMPENSATION" : "SUNDAY_COMPENSATION";
      long existing = em.createQuery("""
        select count(r) from CompensatoryRestDayEntity r where r.employeeId=:employee
        and r.relatedWorkDate=:day and r.restKind=:kind
        """, Long.class).setParameter("employee", timesheet.employeeId).setParameter("day", day)
        .setParameter("kind", kind).getSingleResult();
      if (existing != 0) continue;
      var row = new CompensatoryRestDayEntity();
      row.employeeId = timesheet.employeeId;
      row.branchId = timesheet.branchId;
      row.relatedWorkDate = day;
      row.deadlineDate = day.plusWeeks(holiday ? 8 : 2);
      row.restKind = kind;
      row.policyReference = "ArbZG §11 Abs. 3";
      row.status = "PENDING";
      em.persist(row);
    }
  }

  private boolean isHoliday(Long employee, String branchId, LocalDate day) {
    var assignment = access.assignments(employee, day).stream()
      .filter(a -> branchId == null || branchId.equals(a.branchId)).findFirst().orElse(null);
    String state = assignment == null ? null : assignment.stateCode;
    if (state == null && branchId != null) {
      var branch = em.find(Domain.Branch.class, branchId);
      if (branch != null) state = branch.stateCode;
    }
    if (state == null) return false;
    return em.createQuery("""
      select count(h) from PublicHolidayEntity h where h.stateCode=:state and h.holidayDate=:day
      and h.isStatutory=true and h.verificationStatus='VERIFIED' and h.municipalityCode is null
      """, Long.class).setParameter("state", state).setParameter("day", day).getSingleResult() > 0;
  }

  public LeaveBalanceEntity approveLeaveBalance(Long employeeId, int year, BigDecimal entitled, BigDecimal carried) {
    if (employeeId == null || year < 2000 || year > 2200 || entitled == null || carried == null
      || entitled.signum() < 0 || carried.signum() < 0 || entitled.add(carried).compareTo(BigDecimal.valueOf(366)) > 0
      || entitled.stripTrailingZeros().scale() > 2 || carried.stripTrailingZeros().scale() > 2)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số dư phép không hợp lệ.");
    var employee = em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (employee == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên.");
    Integer annual = em.createQuery("select t.leaveTypeId from LeaveTypeEntity t where t.leaveCode='ANNUAL'", Integer.class)
      .getResultList().stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu loại phép năm."));
    var balance = em.createQuery("""
      select b from LeaveBalanceEntity b where b.employeeId=:employee and b.leaveTypeId=:type and b.leaveYear=:year
      """, LeaveBalanceEntity.class).setParameter("employee", employeeId).setParameter("type", annual)
      .setParameter("year", year).setLockMode(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
      .getResultList().stream().findFirst().orElse(null);
    if (balance == null) {
      balance = new LeaveBalanceEntity();
      balance.employeeId = employeeId;
      balance.leaveTypeId = annual;
      balance.leaveYear = year;
      em.persist(balance);
    }
    if (entitled.add(carried).compareTo(balance.usedDays) < 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Số dư cấp thấp hơn số ngày đã dùng.");
    balance.entitledDays = entitled;
    balance.carriedDays = carried;
    balance.expiryDate = carried.signum() > 0 ? LocalDate.of(year, 3, 31) : null;
    balance.remainingDays = entitled.add(carried).subtract(balance.usedDays);
    balance.approvalStatus = "APPROVED";
    balance.updatedAtUtc = Instant.now();
    return balance;
  }

  private LeaveBalanceEntity leaveBalance(Long employee, Integer type, int year, BigDecimal days, LocalDate requestStart) {
    var balances = em.createQuery("""
      select b from LeaveBalanceEntity b where b.employeeId=:employee and b.leaveTypeId=:type
      and b.leaveYear=:year and b.approvalStatus='APPROVED'
      """, LeaveBalanceEntity.class).setParameter("employee", employee).setParameter("type", type)
      .setParameter("year", year).setLockMode(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
      .setMaxResults(2).getResultList();
    if (balances.size() != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Chưa có số dư phép năm đã duyệt.");
    var balance = balances.getFirst();
    BigDecimal effectiveRemaining = balance.remainingDays;
    if (balance.carriedDays.signum() > 0 && balance.expiryDate != null && requestStart.isAfter(balance.expiryDate)) {
      BigDecimal usedBeforeExpiry = em.createQuery("""
        select coalesce(sum(r.requestedDays), 0) from LeaveRequestEntity r
        where r.employeeId=:employee and r.leaveTypeId=:type and r.status='APPROVED'
        and r.startDate>=:yrStart and r.startDate<=:exp
        """, BigDecimal.class)
        .setParameter("employee", employee)
        .setParameter("type", type)
        .setParameter("yrStart", LocalDate.of(year, 1, 1))
        .setParameter("exp", balance.expiryDate)
        .getSingleResult();
      BigDecimal usableCarried = usedBeforeExpiry.min(balance.carriedDays);
      effectiveRemaining = balance.entitledDays.add(usableCarried).subtract(balance.usedDays).max(BigDecimal.ZERO);
    }
    if (effectiveRemaining.compareTo(days) < 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Số ngày yêu cầu vượt số dư phép hiệu lực.");
    }
    return balance;
  }

  private boolean hasShift(Long employee, LocalDate day, boolean actual) {
    Instant start = day.atStartOfDay(BERLIN_ZONE).toInstant();
    Instant end = day.plusDays(1).atStartOfDay(BERLIN_ZONE).toInstant();
    if (actual && em.createQuery("""
      select count(t) from AttendanceTimesheetEntity t where t.employeeId=:id
      and t.actualStartUtc<:end and (t.actualEndUtc is null or t.actualEndUtc>:start)
      """, Long.class).setParameter("id", employee).setParameter("start", start).setParameter("end", end).getSingleResult() > 0) return true;
    return em.createQuery("""
      select count(s) from ShiftScheduleEntity s where s.employeeId=:id and s.status in ('DRAFT','PUBLISHED')
      and s.plannedStartUtc<:end and s.plannedEndUtc>:start
      """, Long.class).setParameter("id", employee).setParameter("start", start).setParameter("end", end).getSingleResult() > 0;
  }

  private void markAbsence(Long employee, LocalDate from, LocalDate to, String status) {
    em.createQuery("""
      update ShiftScheduleEntity s set s.status=:status where s.employeeId=:id and s.status in ('DRAFT','PUBLISHED')
      and s.plannedStartUtc<:end and s.plannedEndUtc>:start
      """).setParameter("id", employee).setParameter("status", status)
      .setParameter("start", from.atStartOfDay(BERLIN_ZONE).toInstant())
      .setParameter("end", to.plusDays(1).atStartOfDay(BERLIN_ZONE).toInstant()).executeUpdate();
  }

  // 9. Xác nhận / xếp lịch ngày nghỉ bù thực tế (F06.04)
  public CompensatoryRestDayEntity fulfillCompensatoryRest(Long restId, LocalDate restDate, String notes) {
    CompensatoryRestDayEntity r = em.find(CompensatoryRestDayEntity.class, restId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (r == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nghĩa vụ nghỉ bù ID #" + restId);
    }
    LocalDate deadline = r.deadlineDate != null ? r.deadlineDate : r.relatedWorkDate.plusWeeks("HOLIDAY_COMPENSATION".equals(r.restKind) ? 8 : 2);
    if ("COMPLETED".equals(r.status) || restDate == null || !restDate.isAfter(r.relatedWorkDate)
      || restDate.isAfter(deadline) || hasShift(r.employeeId, restDate, true)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ngày nghỉ bù phải sau ngày làm việc, trong hạn luật định và không có ca hoặc bảng công.");
    }
    if (isHoliday(r.employeeId, r.branchId, restDate)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể chọn ngày lễ làm ngày nghỉ bù.");
    }
    Long onLeave = em.createQuery("""
      select count(lr) from LeaveRequestEntity lr where lr.employeeId=:e and lr.status in ('PENDING','APPROVED')
      and lr.startDate<=:d and lr.endDate>=:d
      """, Long.class).setParameter("e", r.employeeId).setParameter("d", restDate).getSingleResult();
    Long onSick = em.createQuery("""
      select count(sa) from SicknessAbsenceEntity sa where sa.employeeId=:e and sa.verificationStatus<>'REJECTED'
      and sa.startDate<=:d and sa.endDate>=:d
      """, Long.class).setParameter("e", r.employeeId).setParameter("d", restDate).getSingleResult();
    Long usedForOtherRest = em.createQuery("""
      select count(c) from CompensatoryRestDayEntity c where c.employeeId=:e and c.restId<>:id and c.restDate=:d
      """, Long.class).setParameter("e", r.employeeId).setParameter("id", restId).setParameter("d", restDate).getSingleResult();
    if (onLeave + onSick + usedForOtherRest > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ngày nghỉ bù bị trùng với lịch nghỉ hoặc ngày nghỉ bù khác.");
    }
    r.restDate = restDate;
    r.status = "COMPLETED";
    if (notes != null && !notes.isBlank()) {
      r.notes = notes;
    }
    return r;
  }
}
