package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ReconciliationService {

  private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");

  @PersistenceContext
  private EntityManager em;

  private final Access access;
  private final LeaveService leave;

  public ReconciliationService(Access access, LeaveService leave) {
    this.access = access;
    this.leave = leave;
  }

  public record ReconciliationKpiDto(
    Integer totalTimesheets,
    Integer totalWorkedMinutes,
    Integer totalOvertimeMinutes,
    Integer totalLateMinutes,
    Integer openExceptionsCount,
    Integer pendingRequestsCount,
    Integer approvedTimesheetsCount
  ) {}

  public record ChangeRequestDto(
    Long requestId,
    Long timesheetId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    Instant currentStartUtc,
    Instant currentEndUtc,
    Integer currentBreakMinutes,
    Instant requestedStartUtc,
    Instant requestedEndUtc,
    Integer requestedBreakMinutes,
    String reason,
    String evidenceUrl,
    Integer deltaMinutes,
    Boolean requiresHrEscalation,
    String status,
    String decisionNotes,
    String decidedByUserId,
    Instant decidedAtUtc,
    Instant createdAtUtc
  ) {}

  public record ReconciliationItemDto(
    Long timesheetId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    String positionName,
    String branchId,
    LocalDate workDate,
    Instant plannedStartUtc,
    Instant plannedEndUtc,
    Integer plannedBreakMinutes,
    Instant actualStartUtc,
    Instant actualEndUtc,
    Integer actualBreakMinutes,
    Integer workedMinutes,
    Integer deltaMinutes,
    Integer lateMinutes,
    Integer earlyDepartureMinutes,
    Integer overtimeMinutes,
    String status,
    Boolean hasException,
    Boolean isLocked,
    Boolean recalculationRequired,
    List<AttendanceService.AttendanceExceptionDto> exceptions
  ) {}

  public ReconciliationKpiDto getKpis(String branchId, LocalDate from, LocalDate to) {
    LocalDate start = (from != null) ? from : LocalDate.now(BERLIN_ZONE).minusDays(7);
    LocalDate end = (to != null) ? to : LocalDate.now(BERLIN_ZONE).plusDays(1);

    List<AttendanceTimesheetEntity> list = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate BETWEEN :s AND :eDate",
      AttendanceTimesheetEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("s", start)
    .setParameter("eDate", end)
    .getResultList();

    int totalWorked = 0;
    int totalOt = 0;
    int totalLate = 0;
    int approved = 0;

    for (AttendanceTimesheetEntity t : list) {
      if (t.workedMinutes != null) totalWorked += t.workedMinutes;
      if (t.overtimeMinutes != null) totalOt += t.overtimeMinutes;
      if (t.lateMinutes != null) totalLate += t.lateMinutes;
      if ("APPROVED".equals(t.status) || "LOCKED".equals(t.status)) approved++;
    }

    Long openExc = em.createQuery(
      "SELECT COUNT(x) FROM AttendanceExceptionEntity x, AttendanceTimesheetEntity t WHERE x.timesheetId = t.timesheetId AND x.status = 'OPEN' AND t.branchId = :b AND t.workDate BETWEEN :s AND :eDate",
      Long.class
    ).setParameter("b", branchId).setParameter("s", start).setParameter("eDate", end).getSingleResult();

    Long pendingReq = em.createQuery(
      "SELECT COUNT(r) FROM AttendanceChangeRequestEntity r, AttendanceTimesheetEntity t WHERE r.timesheetId = t.timesheetId AND r.status IN ('PENDING', 'HR_ESCALATED') AND t.branchId = :b AND t.workDate BETWEEN :s AND :eDate",
      Long.class
    ).setParameter("b", branchId).setParameter("s", start).setParameter("eDate", end).getSingleResult();

    return new ReconciliationKpiDto(
      list.size(),
      totalWorked,
      totalOt,
      totalLate,
      openExc.intValue(),
      pendingReq.intValue(),
      approved
    );
  }

  public List<ReconciliationItemDto> getReconciliationItems(String branchId, LocalDate from, LocalDate to, String filterStatus) {
    LocalDate start = (from != null) ? from : LocalDate.now(BERLIN_ZONE).minusDays(7);
    LocalDate end = (to != null) ? to : LocalDate.now(BERLIN_ZONE).plusDays(1);

    String query = "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate BETWEEN :s AND :eDate";
    if (filterStatus != null && !filterStatus.equalsIgnoreCase("ALL")) {
      query += " AND t.status = :status";
    }
    query += " ORDER BY t.workDate DESC, t.actualStartUtc DESC";

    var q = em.createQuery(query, AttendanceTimesheetEntity.class)
      .setParameter("b", branchId)
      .setParameter("s", start)
      .setParameter("eDate", end);

    if (filterStatus != null && !filterStatus.equalsIgnoreCase("ALL")) {
      q.setParameter("status", filterStatus);
    }

    List<AttendanceTimesheetEntity> list = q.getResultList();
    Map<Long, EmployeeEntity> empMap = new HashMap<>();

    return list.stream().map(t -> {
      EmployeeEntity emp = empMap.computeIfAbsent(t.employeeId, id -> em.find(EmployeeEntity.class, id));
      String empName = (emp != null) ? emp.displayName : "Nhân viên #" + t.employeeId;
      String empCode = (emp != null) ? emp.employeeCode : "E-";
      String posName = access.positionName(t.employeeId, t.branchId, t.workDate);

      int delta = 0;
      if (t.plannedStartUtc != null && t.plannedEndUtc != null && t.actualStartUtc != null && t.actualEndUtc != null) {
        long plannedDuration = Duration.between(t.plannedStartUtc, t.plannedEndUtc).toMinutes() - (t.plannedBreakMinutes != null ? t.plannedBreakMinutes : 0);
        long actualDuration = t.workedMinutes != null ? t.workedMinutes : 0;
        delta = (int) (actualDuration - plannedDuration);
      }

      List<AttendanceService.AttendanceExceptionDto> exceptions = em.createQuery(
        "SELECT x FROM AttendanceExceptionEntity x WHERE x.timesheetId = :ts ORDER BY x.exceptionId ASC",
        AttendanceExceptionEntity.class
      )
      .setParameter("ts", t.timesheetId)
      .getResultList()
      .stream()
      .map(x -> new AttendanceService.AttendanceExceptionDto(x.exceptionId, x.timesheetId, x.exceptionType, x.severity, x.descriptionVi, x.descriptionDe, x.status, x.resolutionNotes))
      .toList();

      return new ReconciliationItemDto(
        t.timesheetId,
        t.employeeId,
        empName,
        empCode,
        posName,
        t.branchId,
        t.workDate,
        t.plannedStartUtc,
        t.plannedEndUtc,
        t.plannedBreakMinutes,
        t.actualStartUtc,
        t.actualEndUtc,
        t.actualBreakMinutes,
        t.workedMinutes,
        delta,
        t.lateMinutes,
        t.earlyDepartureMinutes,
        t.overtimeMinutes,
        t.status,
        t.hasException,
        t.isLocked,
        t.recalculationRequired,
        exceptions
      );
    }).toList();
  }

  public AttendanceChangeRequestEntity createChangeRequest(
    Long employeeId,
    Long timesheetId,
    Instant reqStart,
    Instant reqEnd,
    Integer reqBreakMins,
    String reason,
    String evidenceUrl
  ) {
    if (reason == null || reason.trim().length() < 5) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do điều chỉnh rõ ràng (tối thiểu 5 ký tự)!");
    }

    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, timesheetId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công ID #" + timesheetId);
    }
    if (!Objects.equals(ts.employeeId, employeeId)) AuthService.forbidden();
    if (ts.actualStartUtc == null || ts.actualEndUtc == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cần kết thúc ca trước khi yêu cầu sửa giờ.");
    if (Boolean.TRUE.equals(ts.isLocked)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kỳ công này đã được chốt và khóa, không thể gửi yêu cầu điều chỉnh trực tiếp!");
    }

    Instant proposedStart = reqStart == null ? ts.actualStartUtc : reqStart;
    Instant proposedEnd = reqEnd == null ? ts.actualEndUtc : reqEnd;
    long grossMinutes = Duration.between(proposedStart, proposedEnd).toMinutes();
    int breakMinutes = reqBreakMins == null ? Objects.requireNonNullElse(ts.actualBreakMinutes, 0) : reqBreakMins;
    if (grossMinutes <= 0 || grossMinutes > 24 * 60 || breakMinutes < 0 || breakMinutes >= grossMinutes)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng giờ hoặc thời lượng nghỉ sau điều chỉnh không hợp lệ.");
    long pending = em.createQuery("""
      select count(r) from AttendanceChangeRequestEntity r where r.timesheetId=:id and r.status in ('PENDING','HR_ESCALATED')
      """, Long.class).setParameter("id", timesheetId).getSingleResult();
    if (pending != 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công đã có yêu cầu đang chờ xử lý.");

    // Calculate delta minutes
    int delta = 0;
    if (reqStart != null && ts.actualStartUtc != null) {
      delta += (int) Math.abs(Duration.between(ts.actualStartUtc, reqStart).toMinutes());
    }
    if (reqEnd != null && ts.actualEndUtc != null) {
      delta += (int) Math.abs(Duration.between(ts.actualEndUtc, reqEnd).toMinutes());
    }

    delta += Math.abs(breakMinutes - Objects.requireNonNullElse(ts.actualBreakMinutes, 0));
    if (delta == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa thay đổi giờ công hoặc giờ nghỉ.");
    boolean requiresHr = delta > 60;

    AttendanceChangeRequestEntity req = new AttendanceChangeRequestEntity();
    req.timesheetId = timesheetId;
    req.employeeId = employeeId;
    req.requestedStartUtc = reqStart;
    req.requestedEndUtc = reqEnd;
    req.requestedBreakMinutes = reqBreakMins;
    req.reason = reason;
    req.evidenceUrl = evidenceUrl;
    req.deltaMinutes = delta;
    req.requiresHrEscalation = requiresHr;
    req.status = requiresHr ? "HR_ESCALATED" : "PENDING";

    em.persist(req);
    return req;
  }

  public List<ChangeRequestDto> getChangeRequests(String branchId, String statusFilter) {
    String query = "SELECT r FROM AttendanceChangeRequestEntity r, AttendanceTimesheetEntity ts WHERE r.timesheetId = ts.timesheetId AND ts.branchId = :b";
    if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
      query += " AND r.status = :s";
    }
    query += " ORDER BY r.requestId DESC";

    var q = em.createQuery(query, AttendanceChangeRequestEntity.class).setParameter("b", branchId);
    if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
      q.setParameter("s", statusFilter);
    }

    List<AttendanceChangeRequestEntity> list = q.getResultList();
    Map<Long, EmployeeEntity> empMap = new HashMap<>();

    return list.stream().map(r -> {
      EmployeeEntity emp = empMap.computeIfAbsent(r.employeeId, id -> em.find(EmployeeEntity.class, id));
      AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, r.timesheetId);

      return new ChangeRequestDto(
        r.requestId,
        r.timesheetId,
        r.employeeId,
        (emp != null) ? emp.displayName : "Nhân viên #" + r.employeeId,
        (emp != null) ? emp.employeeCode : "E-",
        (ts != null) ? ts.actualStartUtc : null,
        (ts != null) ? ts.actualEndUtc : null,
        (ts != null) ? ts.actualBreakMinutes : 0,
        r.requestedStartUtc,
        r.requestedEndUtc,
        r.requestedBreakMinutes,
        r.reason,
        r.evidenceUrl,
        r.deltaMinutes,
        r.requiresHrEscalation,
        r.status,
        r.decisionNotes,
        r.decidedByUserId,
        r.decidedAtUtc,
        r.createdAtUtc
      );
    }).toList();
  }

  public AttendanceChangeRequestEntity approveChangeRequest(
    Long requestId,
    String currentUserId,
    String currentUserRole,
    Long currentEmployeeId,
    String decisionNotes
  ) {
    AttendanceChangeRequestEntity req = em.find(AttendanceChangeRequestEntity.class, requestId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (req == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu điều chỉnh ID #" + requestId);
    }
    if (!"PENDING".equals(req.status) && !"HR_ESCALATED".equals(req.status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu này đã được xử lý từ trước (Trạng thái: " + req.status + ")");
    }

    // 1. Segregation of Duties (SoD) Rule: Cannot approve own requests!
    if (currentEmployeeId != null && currentEmployeeId.equals(req.employeeId)) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Vi phạm quy tắc SoD (Segregation of Duties): Bạn không được phép tự phê duyệt yêu cầu điều chỉnh giờ công của chính mình!"
      );
    }

    // 2. Escalation Rule: Delta > 60 mins requires HR/Admin
    var roles = Domain.csv(currentUserRole);
    boolean isHrOrAdmin = roles.contains("HR_OFFICER") || roles.contains("SYSTEM_ADMIN");

    if (req.requiresHrEscalation && !isHrOrAdmin) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Yêu cầu này có chênh lệch thời gian > 60 phút (" + req.deltaMinutes + " phút), bắt buộc phải do HR hoặc Quản trị viên phê duyệt!"
      );
    }

    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, req.timesheetId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công tương ứng!");
    }

    if (Boolean.TRUE.equals(ts.isLocked) || !Objects.equals(ts.employeeId, req.employeeId))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công đã khóa hoặc không còn khớp với yêu cầu.");
    // Log adjustment audit
    AttendanceAdjustmentEntity adj = new AttendanceAdjustmentEntity();
    adj.timesheetId = ts.timesheetId;
    adj.changeRequestId = req.requestId;
    em.createQuery("delete from AllowanceCalculationEntity a where a.timesheetId=:id")
      .setParameter("id", ts.timesheetId).executeUpdate();
    em.createQuery("delete from WorkTimeSegmentEntity s where s.timesheetId=:id")
      .setParameter("id", ts.timesheetId).executeUpdate();
    Instant oldStart = ts.actualStartUtc;
    Instant oldEnd = ts.actualEndUtc;
    adj.adjustedByUserId = currentUserId;
    adj.oldStartUtc = oldStart;
    adj.newStartUtc = req.requestedStartUtc != null ? req.requestedStartUtc : oldStart;
    adj.oldEndUtc = oldEnd;
    adj.newEndUtc = req.requestedEndUtc != null ? req.requestedEndUtc : oldEnd;
    adj.oldBreakMinutes = ts.actualBreakMinutes;
    adj.newBreakMinutes = req.requestedBreakMinutes != null ? req.requestedBreakMinutes : ts.actualBreakMinutes;
    adj.reason = "Duyệt yêu cầu #" + req.requestId + ": " + (decisionNotes != null ? decisionNotes : req.reason);
    em.persist(adj);

    // Apply changes to timesheet
    if (req.requestedStartUtc != null) ts.actualStartUtc = req.requestedStartUtc;
    if (req.requestedEndUtc != null) ts.actualEndUtc = req.requestedEndUtc;
    if (req.requestedBreakMinutes != null) ts.actualBreakMinutes = req.requestedBreakMinutes;

    int workedMins = 0;
    int brk = (ts.actualBreakMinutes != null) ? ts.actualBreakMinutes : 0;
    if (ts.actualStartUtc != null && ts.actualEndUtc != null) {
      long total = Duration.between(ts.actualStartUtc, ts.actualEndUtc).toMinutes();
      workedMins = Math.max(0, (int) total - brk);
      ts.workedMinutes = workedMins;

      if (ts.plannedStartUtc != null && ts.actualStartUtc.isAfter(ts.plannedStartUtc)) {
        ts.lateMinutes = (int) Duration.between(ts.plannedStartUtc, ts.actualStartUtc).toMinutes();
      } else {
        ts.lateMinutes = 0;
      }

      if (ts.plannedEndUtc != null && ts.actualEndUtc.isBefore(ts.plannedEndUtc)) {
        ts.earlyDepartureMinutes = (int) Duration.between(ts.actualEndUtc, ts.plannedEndUtc).toMinutes();
      } else {
        ts.earlyDepartureMinutes = 0;
      }

      if (ts.plannedEndUtc != null && ts.actualEndUtc.isAfter(ts.plannedEndUtc)) {
        ts.overtimeMinutes = (int) Duration.between(ts.plannedEndUtc, ts.actualEndUtc).toMinutes();
      } else {
        ts.overtimeMinutes = 0;
      }

      syncBreakRecords(ts, oldStart, oldEnd, brk);
    }

    // Resolve prior open exceptions and re-validate ArbZG §3/§4 on updated timestamps
    List<AttendanceExceptionEntity> openExceptions = em.createQuery(
      "SELECT x FROM AttendanceExceptionEntity x WHERE x.timesheetId = :ts AND x.status = 'OPEN'",
      AttendanceExceptionEntity.class
    ).setParameter("ts", ts.timesheetId).getResultList();
    Instant now = Instant.now();
    for (AttendanceExceptionEntity exc : openExceptions) {
      exc.status = "RESOLVED";
      exc.resolutionNotes = "Đã giải quyết qua duyệt điều chỉnh #" + req.requestId;
      exc.resolvedByUserId = currentUserId;
      exc.resolvedAtUtc = now;
    }
    ts.hasException = false;
    boolean hasViolation = applyArbZgChecks(ts, workedMins, brk);

    if (hasViolation) {
      ts.status = "PENDING_APPROVAL";
      ts.approvedByUserId = null;
      ts.approvedAtUtc = null;
    } else {
      ts.status = "APPROVED";
      ts.approvedByUserId = currentUserId;
      ts.approvedAtUtc = now;
      leave.recordRestObligations(ts);
    }
    ts.recalculationRequired = true;
    ts.updatedAtUtc = now;

    req.status = "APPROVED";
    req.decisionNotes = decisionNotes;
    req.decidedByUserId = currentUserId;
    req.decidedAtUtc = now;

    return req;
  }

  private void syncBreakRecords(AttendanceTimesheetEntity ts, Instant oldStart, Instant oldEnd, int breakMins) {
    Instant windowStart = oldStart == null ? ts.actualStartUtc : (ts.actualStartUtc.isBefore(oldStart) ? ts.actualStartUtc : oldStart);
    Instant windowEnd = oldEnd == null ? ts.actualEndUtc : (ts.actualEndUtc.isAfter(oldEnd) ? ts.actualEndUtc : oldEnd);
    List<BreakRecordEntity> breaks = em.createQuery("""
      SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e
      AND b.startTimeUtc < :wEnd AND (b.endTimeUtc IS NULL OR b.endTimeUtc > :wStart)
      ORDER BY b.startTimeUtc ASC
      """, BreakRecordEntity.class)
      .setParameter("e", ts.employeeId)
      .setParameter("wStart", windowStart)
      .setParameter("wEnd", windowEnd)
      .getResultList();

    long validBreakNanos = 0;
    boolean allWithinAdjusted = true;
    for (BreakRecordEntity b : breaks) {
      if (b.endTimeUtc == null || !b.endTimeUtc.isAfter(b.startTimeUtc)
        || b.startTimeUtc.isBefore(ts.actualStartUtc) || b.endTimeUtc.isAfter(ts.actualEndUtc)) {
        allWithinAdjusted = false;
        break;
      }
      validBreakNanos += Duration.between(b.startTimeUtc, b.endTimeUtc).toNanos();
    }
    long matchedBreakMins = validBreakNanos / Duration.ofMinutes(1).toNanos();
    if (allWithinAdjusted && matchedBreakMins == breakMins) {
      return;
    }

    for (BreakRecordEntity b : breaks) {
      em.remove(b);
    }
    if (breakMins > 0) {
      long totalSeconds = Duration.between(ts.actualStartUtc, ts.actualEndUtc).getSeconds();
      long offsetSeconds = Math.max(0L, (totalSeconds - breakMins * 60L) / 2L);
      BreakRecordEntity synced = new BreakRecordEntity();
      synced.employeeId = ts.employeeId;
      synced.shiftId = ts.shiftId;
      synced.breakType = "STATUTORY_BREAK";
      synced.startTimeUtc = ts.actualStartUtc.plusSeconds(offsetSeconds);
      synced.endTimeUtc = synced.startTimeUtc.plus(Duration.ofMinutes(breakMins));
      synced.durationMinutes = breakMins;
      em.persist(synced);
    }
  }

  private boolean applyArbZgChecks(AttendanceTimesheetEntity ts, int workedMins, int breakMins) {
    boolean violated = false;
    if (workedMins > 360 && workedMins <= 540 && breakMins < 30) {
      violated = true;
      createTimesheetException(ts, "INSUFFICIENT_BREAK", "WARNING",
        "Vi phạm ArbZG §4: Ca làm việc trên 6 giờ phải nghỉ tối thiểu 30 phút (thực tế nghỉ " + breakMins + " phút)",
        "Verstoß ArbZG §4: Bei mehr als 6 Stunden Arbeit mindestens 30 Minuten Ruhepause erforderlich");
    }
    if (workedMins > 540 && breakMins < 45) {
      violated = true;
      createTimesheetException(ts, "INSUFFICIENT_BREAK", "WARNING",
        "Vi phạm ArbZG §4: Ca làm việc trên 9 giờ phải nghỉ tối thiểu 45 phút (thực tế nghỉ " + breakMins + " phút)",
        "Verstoß ArbZG §4: Bei mehr als 9 Stunden Arbeit mindestens 45 Minuten Ruhepause erforderlich");
    }
    if (workedMins > 600) {
      violated = true;
      createTimesheetException(ts, "EXCESSIVE_WORK_HOURS", "CRITICAL",
        "Vi phạm ArbZG §3: Tổng giờ làm việc thực tế " + (workedMins / 60.0) + "h vượt quá giới hạn 10 giờ/ngày",
        "Kritischer Verstoß ArbZG §3: Arbeitszeit übersteigt 10 Stunden pro Tag");
    }
    if (violated) ts.hasException = true;
    return violated;
  }

  private void createTimesheetException(AttendanceTimesheetEntity ts, String type, String severity, String vi, String de) {
    AttendanceExceptionEntity exc = new AttendanceExceptionEntity();
    exc.timesheetId = ts.timesheetId;
    exc.employeeId = ts.employeeId;
    exc.exceptionType = type;
    exc.severity = severity;
    exc.descriptionVi = vi;
    exc.descriptionDe = de;
    exc.status = "OPEN";
    em.persist(exc);
  }

  public AttendanceChangeRequestEntity rejectChangeRequest(
    Long requestId,
    String currentUserId,
    String currentUserRole,
    Long currentEmployeeId,
    String decisionNotes
  ) {
    AttendanceChangeRequestEntity req = em.find(AttendanceChangeRequestEntity.class, requestId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (req == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu điều chỉnh ID #" + requestId);
    }
    if (!"PENDING".equals(req.status) && !"HR_ESCALATED".equals(req.status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu này đã được xử lý từ trước (Trạng thái: " + req.status + ")");
    }

    // SoD Check: Cannot reject/decide own request
    if (currentEmployeeId != null && currentEmployeeId.equals(req.employeeId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Theo quy tắc SoD, bạn không được tự thao tác trên yêu cầu của bản thân!");
    }

    var roles = Domain.csv(currentUserRole);
    boolean isHrOrAdmin = roles.contains("HR_OFFICER") || roles.contains("SYSTEM_ADMIN");
    if (Boolean.TRUE.equals(req.requiresHrEscalation) && !isHrOrAdmin) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Yêu cầu này có chênh lệch thời gian > 60 phút (" + req.deltaMinutes + " phút), bắt buộc phải do HR hoặc Quản trị viên quyết định!"
      );
    }

    req.status = "REJECTED";
    req.decisionNotes = decisionNotes != null ? decisionNotes : "Từ chối yêu cầu điều chỉnh";
    req.decidedByUserId = currentUserId;
    req.decidedAtUtc = Instant.now();

    return req;
  }

  public AttendanceTimesheetEntity approveTimesheetDirect(
    Long timesheetId,
    String currentUserId,
    Long currentEmployeeId
  ) {
    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, timesheetId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công ID #" + timesheetId);
    }

    if (Boolean.TRUE.equals(ts.isLocked) || !List.of("PENDING_APPROVAL", "ADJUSTED").contains(ts.status)
      || ts.actualStartUtc == null || ts.actualEndUtc == null || !ts.actualEndUtc.isAfter(ts.actualStartUtc)
      || Boolean.TRUE.equals(ts.hasException))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công chưa đủ điều kiện duyệt.");

    // SoD Check: Manager cannot approve their own timesheet!
    if (currentEmployeeId != null && currentEmployeeId.equals(ts.employeeId)) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Vi phạm quy tắc SoD (Segregation of Duties): Bạn không được phép tự phê duyệt bảng chấm công của chính mình!"
      );
    }

    ts.status = "APPROVED";
    ts.approvedByUserId = currentUserId;
    ts.approvedAtUtc = Instant.now();
    leave.recordRestObligations(ts);
    ts.updatedAtUtc = Instant.now();
    return ts;
  }

  public void lockPeriod(String branchId, LocalDate lockUpToDate, String currentUserId) {
    if (lockUpToDate == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ngày chốt khóa kỳ công!");
    }

    List<AttendanceTimesheetEntity> list = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate <= :upTo AND t.isLocked = FALSE",
      AttendanceTimesheetEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("upTo", lockUpToDate)
    .setLockMode(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    .getResultList();

    long pending = em.createQuery("""
      select count(r) from AttendanceChangeRequestEntity r, AttendanceTimesheetEntity t
      where r.timesheetId=t.timesheetId and t.branchId=:branch and t.workDate<=:day
      and r.status in ('PENDING','HR_ESCALATED')
      """, Long.class).setParameter("branch", branchId).setParameter("day", lockUpToDate).getSingleResult();
    if (pending > 0 || list.stream().anyMatch(t -> !"APPROVED".equals(t.status)))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Cần duyệt mọi bảng công của kỳ trước khi khóa.");
    Instant now = Instant.now();
    for (AttendanceTimesheetEntity t : list) {
      t.isLocked = true;
      t.updatedAtUtc = now;
    }
  }

  public void resolveException(Long exceptionId, String notes, String currentUserId) {
    AttendanceExceptionEntity exc = em.find(AttendanceExceptionEntity.class, exceptionId);
    if (exc == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất thường chấm công ID #" + exceptionId);
    }
    var timesheet = em.find(AttendanceTimesheetEntity.class, exc.timesheetId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (timesheet == null || Boolean.TRUE.equals(timesheet.isLocked)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công đã khóa hoặc không còn tồn tại.");
    exc.status = "RESOLVED";
    exc.resolutionNotes = notes != null ? notes : "Quản lý đã xác minh và giải quyết";
    exc.resolvedByUserId = currentUserId;
    exc.resolvedAtUtc = Instant.now();

    // Check if timesheet has any remaining open exceptions
    Long remaining = em.createQuery(
      "SELECT COUNT(x) FROM AttendanceExceptionEntity x WHERE x.timesheetId = :ts AND x.status = 'OPEN' AND x.exceptionId != :curId",
      Long.class
    )
    .setParameter("ts", exc.timesheetId)
    .setParameter("curId", exceptionId)
    .getSingleResult();

    if (remaining == 0) {
      AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, exc.timesheetId);
      if (ts != null) {
        ts.hasException = false;
      }
    }
  }


}
