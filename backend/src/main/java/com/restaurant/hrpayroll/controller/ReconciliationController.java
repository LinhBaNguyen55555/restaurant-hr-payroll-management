package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.service.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/v1/reconciliation", "/api/reconciliation"})
@Transactional
public class ReconciliationController {

  @PersistenceContext
  private EntityManager em;

  private final ReconciliationService reconciliationService;
  private final AuthService auth;
  private final Access access;

  public ReconciliationController(ReconciliationService reconciliationService, AuthService auth, Access access) {
    this.reconciliationService = reconciliationService;
    this.auth = auth;
    this.access = access;
  }

  private AttendanceTimesheetEntity scopedTimesheet(Long id) {
    var timesheet = id == null ? null : em.find(AttendanceTimesheetEntity.class, id);
    if (timesheet == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng công.");
    access.requireScheduleBranch(timesheet.branchId);
    return timesheet;
  }

  private AttendanceTimesheetEntity scopedRequest(Long id) {
    var request = em.find(AttendanceChangeRequestEntity.class, id);
    return scopedTimesheet(request == null ? null : request.timesheetId);
  }

  @GetMapping("/kpis")
  public ReconciliationService.ReconciliationKpiDto getKpis(
    @RequestParam String branchId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate
  ) {
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
    access.requireScheduleBranch(branchId);
    return reconciliationService.getKpis(branchId, from, to);
  }

  @GetMapping("/items")
  public List<ReconciliationService.ReconciliationItemDto> getItems(
    @RequestParam String branchId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate,
    @RequestParam(required = false, defaultValue = "ALL") String filterStatus
  ) {
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
    access.requireScheduleBranch(branchId);
    return reconciliationService.getReconciliationItems(branchId, from, to, filterStatus);
  }

  public record CreateChangeRequestInput(
    Long timesheetId,
    Long employeeId,
    String requestedStartUtc,
    String requestedEndUtc,
    Integer requestedBreakMinutes,
    String reason,
    String evidenceUrl
  ) {}

  @PostMapping("/change-requests")
  public AttendanceChangeRequestEntity createChangeRequest(@RequestBody CreateChangeRequestInput in) {
    Long empId = access.requireSelf(in.employeeId());
    Instant start = (in.requestedStartUtc() != null && !in.requestedStartUtc().isBlank()) ? Instant.parse(in.requestedStartUtc()) : null;
    Instant end = (in.requestedEndUtc() != null && !in.requestedEndUtc().isBlank()) ? Instant.parse(in.requestedEndUtc()) : null;

    return reconciliationService.createChangeRequest(
      empId,
      in.timesheetId(),
      start,
      end,
      in.requestedBreakMinutes(),
      in.reason(),
      in.evidenceUrl()
    );
  }

  @GetMapping("/change-requests")
  public List<ReconciliationService.ChangeRequestDto> getChangeRequests(
    @RequestParam String branchId,
    @RequestParam(required = false, defaultValue = "ALL") String statusFilter
  ) {
    access.requireScheduleBranch(branchId);
    return reconciliationService.getChangeRequests(branchId, statusFilter);
  }

  public record DecisionInput(String notes) {}

  @PostMapping("/change-requests/{id}/approve")
  public AttendanceChangeRequestEntity approveChangeRequest(
    @PathVariable Long id,
    @RequestBody(required = false) DecisionInput in
  ) {
    var timesheet = scopedRequest(id);
    String notes = in != null ? in.notes() : null;
    var decided = reconciliationService.approveChangeRequest(
      id,
      access.actorId(),
      auth.current().roles,
      access.selfEmployee(),
      notes
    );
    auth.audit(auth.current(), "approveChangeRequest", id.toString(), timesheet.branchId, "");
    return decided;
  }

  @PostMapping("/change-requests/{id}/reject")
  public AttendanceChangeRequestEntity rejectChangeRequest(
    @PathVariable Long id,
    @RequestBody(required = false) DecisionInput in
  ) {
    var timesheet = scopedRequest(id);
    String notes = in != null ? in.notes() : null;
    var decided = reconciliationService.rejectChangeRequest(
      id,
      access.actorId(),
      auth.current().roles,
      access.selfEmployee(),
      notes
    );
    auth.audit(auth.current(), "rejectChangeRequest", id.toString(), timesheet.branchId, "");
    return decided;
  }

  @PostMapping("/timesheets/{id}/approve")
  public AttendanceTimesheetEntity approveTimesheetDirect(@PathVariable Long id) {
    var timesheet = scopedTimesheet(id);
    var approved = reconciliationService.approveTimesheetDirect(
      id,
      access.actorId(),
      access.selfEmployee()
    );
    auth.audit(auth.current(), "TIMESHEET_APPROVED", id.toString(), timesheet.branchId, "");
    return approved;
  }

  public record LockPeriodInput(String branchId, String lockUpToDate) {}

  @PostMapping("/lock-period")
  public Map<String, Object> lockPeriod(@RequestBody LockPeriodInput in) {
    access.requireScheduleBranch(in.branchId());
    LocalDate upTo = (in.lockUpToDate() != null) ? LocalDate.parse(in.lockUpToDate()) : LocalDate.now(java.time.ZoneId.of("Europe/Berlin"));
    reconciliationService.lockPeriod(in.branchId(), upTo, access.actorId());
    auth.audit(auth.current(), "TIMESHEETS_LOCKED", upTo.toString(), in.branchId(), "");
    return Map.of("success", true, "message", "Đã chốt và khóa kỳ công thành công đến ngày " + upTo);
  }

  public record ResolveExceptionInput(String notes) {}

  @PostMapping("/exceptions/{id}/resolve")
  public Map<String, Object> resolveException(
    @PathVariable Long id,
    @RequestBody(required = false) ResolveExceptionInput in
  ) {
    var exception = em.find(AttendanceExceptionEntity.class, id);
    var timesheet = scopedTimesheet(exception == null ? null : exception.timesheetId);
    String notes = in != null ? in.notes() : null;
    reconciliationService.resolveException(id, notes, access.actorId());
    auth.audit(auth.current(), "ATTENDANCE_EXCEPTION_RESOLVED", id.toString(), timesheet.branchId, "");
    return Map.of("success", true, "message", "Đã giải quyết bất thường chấm công #" + id);
  }
}
