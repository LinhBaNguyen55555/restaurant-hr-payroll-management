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
    Long decidedByUserId,
    Instant decidedAtUtc,
    Instant createdAtUtc
  ) {}

  public record ReconciliationItemDto(
    Long timesheetId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    String positionName,
    Long branchId,
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

  public ReconciliationKpiDto getKpis(Long branchId, LocalDate from, LocalDate to) {
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
      "SELECT COUNT(x) FROM AttendanceExceptionEntity x WHERE x.status = 'OPEN'",
      Long.class
    ).getSingleResult();

    Long pendingReq = em.createQuery(
      "SELECT COUNT(r) FROM AttendanceChangeRequestEntity r WHERE r.status IN ('PENDING', 'HR_ESCALATED')",
      Long.class
    ).getSingleResult();

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

  public List<ReconciliationItemDto> getReconciliationItems(Long branchId, LocalDate from, LocalDate to, String filterStatus) {
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
      String posName = resolvePosition(t.employeeId);

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

    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, timesheetId);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công ID #" + timesheetId);
    }
    if (ts.isLocked) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kỳ công này đã được chốt và khóa, không thể gửi yêu cầu điều chỉnh trực tiếp!");
    }

    // Calculate delta minutes
    int delta = 0;
    if (reqStart != null && ts.actualStartUtc != null) {
      delta += (int) Math.abs(Duration.between(ts.actualStartUtc, reqStart).toMinutes());
    }
    if (reqEnd != null && ts.actualEndUtc != null) {
      delta += (int) Math.abs(Duration.between(ts.actualEndUtc, reqEnd).toMinutes());
    }

    boolean requiresHr = (delta > 60);

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

  public List<ChangeRequestDto> getChangeRequests(Long branchId, String statusFilter) {
    String query = "SELECT r FROM AttendanceChangeRequestEntity r ORDER BY r.requestId DESC";
    if (statusFilter != null && !statusFilter.equalsIgnoreCase("ALL")) {
      query = "SELECT r FROM AttendanceChangeRequestEntity r WHERE r.status = :s ORDER BY r.requestId DESC";
    }

    var q = em.createQuery(query, AttendanceChangeRequestEntity.class);
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
    Long currentUserId,
    String currentUserRole,
    Long currentEmployeeId,
    String decisionNotes
  ) {
    AttendanceChangeRequestEntity req = em.find(AttendanceChangeRequestEntity.class, requestId);
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
    boolean isHrOrAdmin = currentUserRole != null && (
      currentUserRole.contains("HR") ||
      currentUserRole.contains("ADMIN") ||
      currentUserRole.contains("SYSTEM_ADMIN") ||
      currentUserRole.contains("GENERAL_MANAGER")
    );

    if (req.requiresHrEscalation && !isHrOrAdmin) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Yêu cầu này có chênh lệch thời gian > 60 phút (" + req.deltaMinutes + " phút), bắt buộc phải do HR hoặc Quản trị viên phê duyệt!"
      );
    }

    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, req.timesheetId);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công tương ứng!");
    }

    // Log adjustment audit
    AttendanceAdjustmentEntity adj = new AttendanceAdjustmentEntity();
    adj.timesheetId = ts.timesheetId;
    adj.changeRequestId = req.requestId;
    adj.adjustedByUserId = (currentUserId != null) ? currentUserId : 1L;
    adj.oldStartUtc = ts.actualStartUtc;
    adj.newStartUtc = req.requestedStartUtc != null ? req.requestedStartUtc : ts.actualStartUtc;
    adj.oldEndUtc = ts.actualEndUtc;
    adj.newEndUtc = req.requestedEndUtc != null ? req.requestedEndUtc : ts.actualEndUtc;
    adj.oldBreakMinutes = ts.actualBreakMinutes;
    adj.newBreakMinutes = req.requestedBreakMinutes != null ? req.requestedBreakMinutes : ts.actualBreakMinutes;
    adj.reason = "Duyệt yêu cầu #" + req.requestId + ": " + (decisionNotes != null ? decisionNotes : req.reason);
    em.persist(adj);

    // Apply changes to timesheet
    if (req.requestedStartUtc != null) ts.actualStartUtc = req.requestedStartUtc;
    if (req.requestedEndUtc != null) ts.actualEndUtc = req.requestedEndUtc;
    if (req.requestedBreakMinutes != null) ts.actualBreakMinutes = req.requestedBreakMinutes;

    if (ts.actualStartUtc != null && ts.actualEndUtc != null) {
      long total = Duration.between(ts.actualStartUtc, ts.actualEndUtc).toMinutes();
      int brk = (ts.actualBreakMinutes != null) ? ts.actualBreakMinutes : 0;
      ts.workedMinutes = Math.max(0, (int) total - brk);

      if (ts.plannedStartUtc != null && ts.actualStartUtc.isAfter(ts.plannedStartUtc)) {
        ts.lateMinutes = (int) Duration.between(ts.plannedStartUtc, ts.actualStartUtc).toMinutes();
      } else {
        ts.lateMinutes = 0;
      }

      if (ts.plannedEndUtc != null && ts.actualEndUtc.isAfter(ts.plannedEndUtc)) {
        ts.overtimeMinutes = (int) Duration.between(ts.plannedEndUtc, ts.actualEndUtc).toMinutes();
      } else {
        ts.overtimeMinutes = 0;
      }
    }

    ts.status = "APPROVED";
    ts.recalculationRequired = true;
    ts.approvedByUserId = currentUserId;
    ts.approvedAtUtc = Instant.now();
    ts.updatedAtUtc = Instant.now();

    req.status = "APPROVED";
    req.decisionNotes = decisionNotes;
    req.decidedByUserId = currentUserId;
    req.decidedAtUtc = Instant.now();

    return req;
  }

  public AttendanceChangeRequestEntity rejectChangeRequest(
    Long requestId,
    Long currentUserId,
    Long currentEmployeeId,
    String decisionNotes
  ) {
    AttendanceChangeRequestEntity req = em.find(AttendanceChangeRequestEntity.class, requestId);
    if (req == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu điều chỉnh ID #" + requestId);
    }

    // SoD Check: Cannot reject/decide own request
    if (currentEmployeeId != null && currentEmployeeId.equals(req.employeeId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Theo quy tắc SoD, bạn không được tự thao tác trên yêu cầu của bản thân!");
    }

    req.status = "REJECTED";
    req.decisionNotes = decisionNotes != null ? decisionNotes : "Từ chối yêu cầu điều chỉnh";
    req.decidedByUserId = currentUserId;
    req.decidedAtUtc = Instant.now();

    return req;
  }

  public AttendanceTimesheetEntity approveTimesheetDirect(
    Long timesheetId,
    Long currentUserId,
    Long currentEmployeeId
  ) {
    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, timesheetId);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công ID #" + timesheetId);
    }

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
    ts.updatedAtUtc = Instant.now();
    return ts;
  }

  public void lockPeriod(Long branchId, LocalDate lockUpToDate, Long currentUserId) {
    if (lockUpToDate == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ngày chốt khóa kỳ công!");
    }

    List<AttendanceTimesheetEntity> list = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate <= :upTo AND t.isLocked = FALSE",
      AttendanceTimesheetEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("upTo", lockUpToDate)
    .getResultList();

    Instant now = Instant.now();
    for (AttendanceTimesheetEntity t : list) {
      t.isLocked = true;
      if (!"APPROVED".equals(t.status)) {
        t.status = "LOCKED";
      }
      t.updatedAtUtc = now;
    }
  }

  public void resolveException(Long exceptionId, String notes, Long currentUserId) {
    AttendanceExceptionEntity exc = em.find(AttendanceExceptionEntity.class, exceptionId);
    if (exc == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất thường chấm công ID #" + exceptionId);
    }
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

  private String resolvePosition(Long employeeId) {
    try {
      List<?> rows = em.createNativeQuery(
        "SELECT pos.position_name_de FROM employee_assignments a JOIN positions pos ON a.position_id = pos.position_id WHERE a.employee_id = :eid ORDER BY a.assignment_id DESC LIMIT 1"
      )
      .setParameter("eid", employeeId)
      .getResultList();
      if (!rows.isEmpty() && rows.get(0) != null) {
        return (String) rows.get(0);
      }
    } catch (Exception ignored) {}
    return "Nhân viên";
  }
}
