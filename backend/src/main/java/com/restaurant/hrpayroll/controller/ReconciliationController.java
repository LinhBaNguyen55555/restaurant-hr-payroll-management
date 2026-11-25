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
@RequestMapping("/api/reconciliation")
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

  private Long currentUserId() {
    try {
      return Long.parseLong(auth.current().id);
    } catch (Exception e) {
      return 1L;
    }
  }

  private String currentUserRole() {
    try {
      return auth.current().roles;
    } catch (Exception e) {
      return "RESTAURANT_MANAGER";
    }
  }

  private Long currentEmployeeId() {
    try {
      Domain.UserAccount cur = auth.current();
      List<EmployeeEntity> list = em.createQuery(
        "SELECT e FROM EmployeeEntity e WHERE e.email = :email",
        EmployeeEntity.class
      )
      .setParameter("email", cur.email)
      .getResultList();

      if (!list.isEmpty()) {
        return list.get(0).employeeId;
      }
    } catch (Exception ignored) {}
    return null;
  }

  @GetMapping("/kpis")
  public ReconciliationService.ReconciliationKpiDto getKpis(
    @RequestParam Long branchId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate
  ) {
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
    return reconciliationService.getKpis(branchId, from, to);
  }

  @GetMapping("/items")
  public List<ReconciliationService.ReconciliationItemDto> getItems(
    @RequestParam Long branchId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate,
    @RequestParam(required = false, defaultValue = "ALL") String filterStatus
  ) {
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
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
    Long empId = in.employeeId();
    if (empId == null) {
      empId = currentEmployeeId();
      if (empId == null) empId = 1L;
    }
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
    @RequestParam Long branchId,
    @RequestParam(required = false, defaultValue = "ALL") String statusFilter
  ) {
    return reconciliationService.getChangeRequests(branchId, statusFilter);
  }

  public record DecisionInput(String notes) {}

  @PostMapping("/change-requests/{id}/approve")
  public AttendanceChangeRequestEntity approveChangeRequest(
    @PathVariable Long id,
    @RequestBody(required = false) DecisionInput in
  ) {
    access.require("schedule.write");
    String notes = in != null ? in.notes() : null;
    return reconciliationService.approveChangeRequest(
      id,
      currentUserId(),
      currentUserRole(),
      currentEmployeeId(),
      notes
    );
  }

  @PostMapping("/change-requests/{id}/reject")
  public AttendanceChangeRequestEntity rejectChangeRequest(
    @PathVariable Long id,
    @RequestBody(required = false) DecisionInput in
  ) {
    access.require("schedule.write");
    String notes = in != null ? in.notes() : null;
    return reconciliationService.rejectChangeRequest(
      id,
      currentUserId(),
      currentEmployeeId(),
      notes
    );
  }

  @PostMapping("/timesheets/{id}/approve")
  public AttendanceTimesheetEntity approveTimesheetDirect(@PathVariable Long id) {
    access.require("schedule.write");
    return reconciliationService.approveTimesheetDirect(
      id,
      currentUserId(),
      currentEmployeeId()
    );
  }

  public record LockPeriodInput(Long branchId, String lockUpToDate) {}

  @PostMapping("/lock-period")
  public Map<String, Object> lockPeriod(@RequestBody LockPeriodInput in) {
    access.require("schedule.write");
    LocalDate upTo = (in.lockUpToDate() != null) ? LocalDate.parse(in.lockUpToDate()) : LocalDate.now();
    reconciliationService.lockPeriod(in.branchId(), upTo, currentUserId());
    return Map.of("success", true, "message", "Đã chốt và khóa kỳ công thành công đến ngày " + upTo);
  }

  public record ResolveExceptionInput(String notes) {}

  @PostMapping("/exceptions/{id}/resolve")
  public Map<String, Object> resolveException(
    @PathVariable Long id,
    @RequestBody(required = false) ResolveExceptionInput in
  ) {
    access.require("schedule.write");
    String notes = in != null ? in.notes() : null;
    reconciliationService.resolveException(id, notes, currentUserId());
    return Map.of("success", true, "message", "Đã giải quyết bất thường chấm công #" + id);
  }
}
