package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
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
    Long reviewedByUserId,
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
    BigDecimal grossPayImpactPercent,
    String confidentialDocumentRef,
    String notes,
    Instant createdAtUtc
  ) {}

  public record CompensatoryRestDto(
    Long restId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    Long branchId,
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

    // If empty for specific employee, create default statutory balance
    if (list.isEmpty() && employeeId != null && employeeId > 0) {
      EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
      if (emp != null) {
        LeaveBalanceEntity nb = new LeaveBalanceEntity();
        nb.employeeId = employeeId;
        nb.leaveTypeId = 1; // ANNUAL
        nb.leaveYear = targetYear;
        nb.entitledDays = new BigDecimal("25.00"); // 25 days contract (BUrlG requires min 20 for 5-day week)
        nb.usedDays = BigDecimal.ZERO;
        nb.carriedDays = BigDecimal.ZERO;
        nb.remainingDays = new BigDecimal("25.00");
        nb.expiryDate = LocalDate.of(targetYear, 3, 31); // 31. März standard
        nb.approvalStatus = "APPROVED";
        em.persist(nb);
        list = List.of(nb);
      }
    }

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

    // Calculate working days (excluding Saturdays & Sundays for standard workweek)
    long totalDays = 0;
    LocalDate curr = start;
    while (!curr.isAfter(end)) {
      DayOfWeek dow = curr.getDayOfWeek();
      if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
        totalDays++;
      }
      curr = curr.plusDays(1);
    }
    if (totalDays == 0) totalDays = 1;

    BigDecimal reqDays = BigDecimal.valueOf(totalDays);

    // If Annual Leave, check remaining balance
    if (Boolean.TRUE.equals(type.countsAgainstAnnualLeave)) {
      int year = start.getYear();
      List<LeaveBalanceEntity> bals = em.createQuery(
        "SELECT b FROM LeaveBalanceEntity b WHERE b.employeeId = :e AND b.leaveTypeId = :t AND b.leaveYear = :y",
        LeaveBalanceEntity.class
      )
      .setParameter("e", employeeId)
      .setParameter("t", leaveTypeId)
      .setParameter("y", year)
      .getResultList();

      if (!bals.isEmpty()) {
        LeaveBalanceEntity bal = bals.get(0);
        if (bal.remainingDays.compareTo(reqDays) < 0) {
          throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Số ngày nghỉ yêu cầu (" + reqDays + " ngày) vượt quá số dư phép năm còn lại (" + bal.remainingDays + " ngày)!"
          );
        }
      }
    }

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

    return list.stream().map(r -> {
      EmployeeEntity emp = empCache.computeIfAbsent(r.employeeId, id -> em.find(EmployeeEntity.class, id));
      LeaveTypeEntity lt = typeCache.computeIfAbsent(r.leaveTypeId, id -> em.find(LeaveTypeEntity.class, id));

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
        r.reviewedByUserId != null ? "Quản lý / HR" : null,
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
    Long currentUserId,
    Long currentEmployeeId
  ) {
    LeaveRequestEntity req = em.find(LeaveRequestEntity.class, requestId);
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

    req.reviewedByUserId = currentUserId != null ? currentUserId : 1L;
    req.reviewNotes = notes;
    req.reviewedAtUtc = Instant.now();

    if (approve) {
      req.status = "APPROVED";

      // If counts against annual leave, deduct balance
      LeaveTypeEntity type = em.find(LeaveTypeEntity.class, req.leaveTypeId);
      if (type != null && Boolean.TRUE.equals(type.countsAgainstAnnualLeave)) {
        int year = req.startDate.getYear();
        List<LeaveBalanceEntity> bals = em.createQuery(
          "SELECT b FROM LeaveBalanceEntity b WHERE b.employeeId = :e AND b.leaveTypeId = :t AND b.leaveYear = :y",
          LeaveBalanceEntity.class
        )
        .setParameter("e", req.employeeId)
        .setParameter("t", req.leaveTypeId)
        .setParameter("y", year)
        .getResultList();

        if (!bals.isEmpty()) {
          LeaveBalanceEntity bal = bals.get(0);
          bal.usedDays = bal.usedDays.add(req.requestedDays);
          bal.remainingDays = bal.entitledDays.add(bal.carriedDays).subtract(bal.usedDays);
          bal.updatedAtUtc = Instant.now();
        }
      }

      // Sync schedule: Cancel any conflicting shifts during this period
      List<ShiftScheduleEntity> shifts = em.createQuery(
        "SELECT s FROM ShiftScheduleEntity s WHERE s.employeeId = :emp AND s.workDate BETWEEN :sDate AND :eDate AND s.status != 'CANCELLED'",
        ShiftScheduleEntity.class
      )
      .setParameter("emp", req.employeeId)
      .setParameter("sDate", req.startDate)
      .setParameter("eDate", req.endDate)
      .getResultList();

      for (ShiftScheduleEntity shift : shifts) {
        shift.status = "LEAVE_APPROVED";
      }

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
    LocalDate certDate,
    String notes,
    Long recorderUserId
  ) {
    if (employeeId == null || start == null || end == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin bắt buộc của hồ sơ nghỉ ốm!");
    }
    if (end.isBefore(start)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc nghỉ ốm không được trước ngày bắt đầu!");
    }

    long days = ChronoUnit.DAYS.between(start, end) + 1;

    // Check EntgFG: Continued pay up to 42 days (6 weeks)
    boolean eligible = true;
    BigDecimal payPercent = new BigDecimal("100.00");
    if (days > 42) {
      // Over 6 weeks: Krankengeld starts, company continued pay stops
      payPercent = BigDecimal.ZERO;
    }

    SicknessAbsenceEntity s = new SicknessAbsenceEntity();
    s.employeeId = employeeId;
    s.leaveTypeId = 2; // SICK
    s.startDate = start;
    s.endDate = end;
    s.hasMedicalCertificate = hasCert;
    s.certificateDate = certDate;
    s.isContinuedPayEligible = eligible;
    s.grossPayImpactPercent = payPercent;
    s.confidentialDocumentRef = "eAU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    s.notes = notes != null ? notes : "Ghi nhận nghỉ ốm theo quy định EntgFG";
    s.recordedByUserId = recorderUserId;
    s.verificationStatus = "VERIFIED";
    s.createdAtUtc = Instant.now();

    em.persist(s);

    // Cancel conflicting shifts during sick leave
    List<ShiftScheduleEntity> shifts = em.createQuery(
      "SELECT sh FROM ShiftScheduleEntity sh WHERE sh.employeeId = :emp AND sh.workDate BETWEEN :sDate AND :eDate AND sh.status != 'CANCELLED'",
      ShiftScheduleEntity.class
    )
    .setParameter("emp", employeeId)
    .setParameter("sDate", start)
    .setParameter("eDate", end)
    .getResultList();

    for (ShiftScheduleEntity shift : shifts) {
      shift.status = "SICK_LEAVE";
    }

    return s;
  }

  // 7. Lấy danh sách hồ sơ nghỉ ốm
  public List<SicknessAbsenceDto> getSicknessAbsences(Long employeeId) {
    String q = "SELECT a FROM SicknessAbsenceEntity a WHERE a.leaveTypeId = 2";
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
        a.grossPayImpactPercent,
        a.confidentialDocumentRef,
        a.notes,
        a.createdAtUtc
      );
    }).toList();
  }

  // 8. Theo dõi nghĩa vụ nghỉ bù ArbZG §11(3)
  public List<CompensatoryRestDto> getCompensatoryRestObligations(Long branchId, Long employeeId) {
    // Generate obligations from Sunday/Holiday timesheets if missing
    syncCompensatoryRestObligations(branchId);

    String q = "SELECT r FROM CompensatoryRestDayEntity r WHERE 1=1";
    if (branchId != null && branchId > 0) {
      q += " AND r.branchId = :bId";
    }
    if (employeeId != null && employeeId > 0) {
      q += " AND r.employeeId = :empId";
    }
    q += " ORDER BY r.deadlineDate ASC, r.relatedWorkDate DESC";

    var query = em.createQuery(q, CompensatoryRestDayEntity.class);
    if (branchId != null && branchId > 0) {
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

  // Tự động quét các ca Chủ nhật / Ngày lễ để ghi nhận nghĩa vụ nghỉ bù ArbZG §11
  private void syncCompensatoryRestObligations(Long branchId) {
    try {
      List<AttendanceTimesheetEntity> sunShifts = em.createQuery(
        "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.status IN ('APPROVED', 'PENDING_APPROVAL', 'OPEN')",
        AttendanceTimesheetEntity.class
      )
      .setParameter("b", branchId != null ? branchId : 1L)
      .getResultList();

      for (AttendanceTimesheetEntity ts : sunShifts) {
        DayOfWeek dow = ts.workDate.getDayOfWeek();
        boolean isSun = (dow == DayOfWeek.SUNDAY);

        // Check if holiday in BW
        List<PublicHolidayEntity> hols = em.createQuery(
          "SELECT h FROM PublicHolidayEntity h WHERE h.stateCode = 'BW' AND h.holidayDate = :d",
          PublicHolidayEntity.class
        )
        .setParameter("d", ts.workDate)
        .getResultList();
        boolean isHol = !hols.isEmpty();

        if (isSun || isHol) {
          String kind = isHol ? "HOLIDAY_COMPENSATION" : "SUNDAY_COMPENSATION";
          LocalDate deadline = isHol ? ts.workDate.plusWeeks(8) : ts.workDate.plusWeeks(2);

          List<CompensatoryRestDayEntity> existing = em.createQuery(
            "SELECT c FROM CompensatoryRestDayEntity c WHERE c.employeeId = :e AND c.relatedWorkDate = :d",
            CompensatoryRestDayEntity.class
          )
          .setParameter("e", ts.employeeId)
          .setParameter("d", ts.workDate)
          .getResultList();

          if (existing.isEmpty()) {
            CompensatoryRestDayEntity c = new CompensatoryRestDayEntity();
            c.employeeId = ts.employeeId;
            c.branchId = ts.branchId;
            c.relatedWorkDate = ts.workDate;
            c.deadlineDate = deadline;
            c.restKind = kind;
            c.status = "PENDING";
            c.policyReference = isHol ? "ArbZG §11(3) - 8 tuần" : "ArbZG §11(3) - 2 tuần";
            c.notes = (isHol ? "Làm việc ngày lễ (" : "Làm việc Chủ nhật (") + ts.workDate + "), cần bố trí ngày nghỉ bù.";
            c.createdAtUtc = Instant.now();
            em.persist(c);
          }
        }
      }
    } catch (Exception ignored) {}
  }

  // 9. Xác nhận / xếp lịch ngày nghỉ bù thực tế (F06.04)
  public CompensatoryRestDayEntity fulfillCompensatoryRest(Long restId, LocalDate restDate, String notes) {
    CompensatoryRestDayEntity r = em.find(CompensatoryRestDayEntity.class, restId);
    if (r == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nghĩa vụ nghỉ bù ID #" + restId);
    }
    r.restDate = restDate != null ? restDate : LocalDate.now(BERLIN_ZONE);
    r.status = "COMPLETED";
    if (notes != null && !notes.isBlank()) {
      r.notes = notes;
    }
    return r;
  }
}
