package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.service.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class WorkforceSchedulingController {

  @PersistenceContext
  private EntityManager em;

  private final EmployeeService employeeService;
  private final ImportService importService;
  private final SchedulingService schedulingService;
  private final LaborLawChecker lawChecker;
  private final AuthService auth;
  private final Access access;

  public WorkforceSchedulingController(
    EmployeeService employeeService,
    ImportService importService,
    SchedulingService schedulingService,
    LaborLawChecker lawChecker,
    AuthService auth,
    Access access
  ) {
    this.employeeService = employeeService;
    this.importService = importService;
    this.schedulingService = schedulingService;
    this.lawChecker = lawChecker;
    this.auth = auth;
    this.access = access;
  }

  // --- F02: EMPLOYEES & WORKFORCE ---

  @GetMapping("/workforce/employees")
  public List<EmployeeService.EmployeeDto> listEmployees(
    @RequestParam(required = false) Long branchId,
    @RequestParam(required = false) String search,
    @RequestParam(required = false, defaultValue = "ALL") String status
  ) {
    access.require("workforce.read");
    return employeeService.listEmployees(branchId, search, status);
  }

  @GetMapping("/workforce/employees/{id}")
  public EmployeeService.EmployeeDetailDto getEmployeeDetail(@PathVariable Long id) {
    access.require("workforce.read");
    return employeeService.getEmployeeDetail(id);
  }

  @PostMapping("/workforce/employees")
  public EmployeeEntity createEmployee(@RequestBody EmployeeService.EmployeeInput input) {
    access.require("workforce.write");
    return employeeService.createEmployee(input);
  }

  @PostMapping("/workforce/employees/{id}/contracts")
  public void addContractRevision(
    @PathVariable Long id,
    @RequestBody EmploymentContractEntity contract
  ) {
    access.require("workforce.write");
    employeeService.addContractRevision(id, contract);
  }

  @PostMapping("/workforce/contracts/{id}/wages")
  public void addWageRateRevision(
    @PathVariable Long id,
    @RequestBody WageRateEntity wageRate
  ) {
    access.require("workforce.write");
    employeeService.addWageRateRevision(id, wageRate);
  }

  @PostMapping("/workforce/employees/{id}/restrictions")
  public void addWorkRestriction(
    @PathVariable Long id,
    @RequestBody WorkRestrictionEntity restriction
  ) {
    access.require("workforce.write");
    employeeService.addWorkRestriction(id, restriction);
  }

  public record ImportPayload(String csv, boolean dryRun) {}

  @PostMapping("/workforce/import")
  public ImportService.ImportResult importEmployees(
    @RequestBody ImportPayload payload,
    HttpServletRequest req
  ) {
    access.require("workforce.write");
    Domain.UserAccount current = auth.current();
    Long userId = current != null ? parseLongSafe(current.id) : 1L;
    return importService.processEmployeeCsv(payload.csv(), userId, payload.dryRun());
  }

  @GetMapping("/workforce/positions")
  public List<PositionEntity> listPositions() {
    return em.createQuery("SELECT p FROM PositionEntity p WHERE p.active = true ORDER BY p.positionId", PositionEntity.class)
      .getResultList();
  }

  // --- F03: SCHEDULING & SHIFTS ---

  @GetMapping("/scheduling/templates")
  public List<ShiftTemplateEntity> listTemplates(@RequestParam(required = false) Long branchId) {
    access.require("schedule.read");
    return schedulingService.listTemplates(branchId);
  }

  @PostMapping("/scheduling/templates")
  public ShiftTemplateEntity createTemplate(@RequestBody ShiftTemplateEntity template) {
    access.require("schedule.write");
    return schedulingService.createTemplate(template);
  }

  @GetMapping("/scheduling/shifts")
  public List<SchedulingService.ShiftDto> listShifts(
    @RequestParam Long branchId,
    @RequestParam String start,
    @RequestParam String end
  ) {
    access.require("schedule.read");
    Instant s = Instant.parse(start);
    Instant e = Instant.parse(end);
    return schedulingService.listShifts(branchId, s, e);
  }

  public record CreateShiftInput(
    Long branchId,
    Long employeeId,
    Long templateId,
    String start,
    String end,
    Integer breakMinutes
  ) {}

  @PostMapping("/scheduling/shifts")
  public ShiftScheduleEntity createShift(@RequestBody CreateShiftInput in) {
    access.require("schedule.write");
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    return schedulingService.createShift(in.branchId(), in.employeeId(), in.templateId(), s, e, in.breakMinutes());
  }

  @DeleteMapping("/scheduling/shifts/{id}")
  public void deleteShift(@PathVariable Long id) {
    access.require("schedule.write");
    schedulingService.deleteShift(id);
  }

  public record CheckPayload(Long branchId, String start, String end) {}

  @PostMapping("/scheduling/check")
  public LaborLawChecker.CheckSummary checkSchedule(@RequestBody CheckPayload in) {
    access.require("schedule.read");
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    return lawChecker.validateSchedule(in.branchId(), s, e);
  }

  public record PublishPayload(Long branchId, String start, String end, String changeReason) {}

  @PostMapping("/scheduling/publish")
  public SchedulingService.PublishResult publishSchedule(@RequestBody PublishPayload in) {
    access.require("schedule.write");
    Domain.UserAccount current = auth.current();
    Long userId = current != null ? parseLongSafe(current.id) : 1L;
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    return schedulingService.publishSchedule(in.branchId(), s, e, userId, in.changeReason());
  }

  // --- SHIFT SWAP ---

  @GetMapping("/scheduling/swap-requests")
  public List<ShiftSwapRequestEntity> listSwapRequests(@RequestParam(required = false) Long branchId) {
    access.require("schedule.read");
    return schedulingService.listSwapRequests(branchId);
  }

  public record SwapRequestInput(Long sourceShiftId, Long targetEmployeeId, String reason) {}

  @PostMapping("/scheduling/swap-requests")
  public ShiftSwapRequestEntity requestSwap(@RequestBody SwapRequestInput in) {
    access.require("schedule.read");
    Domain.UserAccount current = auth.current();
    Long empId = current != null ? parseLongSafe(current.id) : 2L;
    return schedulingService.requestSwap(in.sourceShiftId(), in.targetEmployeeId(), empId, in.reason());
  }

  public record DecisionInput(String reason) {}

  @PostMapping("/scheduling/swap-requests/{id}/approve")
  public void approveSwap(@PathVariable Long id, @RequestBody(required = false) DecisionInput decision) {
    access.require("schedule.write");
    Domain.UserAccount current = auth.current();
    Long userId = current != null ? parseLongSafe(current.id) : 1L;
    schedulingService.approveSwap(id, userId, decision != null ? decision.reason() : null);
  }

  @PostMapping("/scheduling/swap-requests/{id}/reject")
  public void rejectSwap(@PathVariable Long id, @RequestBody(required = false) DecisionInput decision) {
    access.require("schedule.write");
    Domain.UserAccount current = auth.current();
    Long userId = current != null ? parseLongSafe(current.id) : 1L;
    schedulingService.rejectSwap(id, userId, decision != null ? decision.reason() : null);
  }

  @GetMapping("/workforce/notifications")
  public List<NotificationEntity> listNotifications() {
    Domain.UserAccount current = auth.current();
    if (current == null) return List.of();
    Long userId = parseLongSafe(current.id);
    return em.createQuery(
      "SELECT n FROM NotificationEntity n WHERE n.recipientUserId = :u ORDER BY n.createdAtUtc DESC",
      NotificationEntity.class
    )
    .setParameter("u", userId)
    .setMaxResults(20)
    .getResultList();
  }

  private Long parseLongSafe(String s) {
    try {
      return Long.parseLong(s);
    } catch (Exception e) {
      return 1L;
    }
  }
}
