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
    @RequestParam(required = false) String branchId,
    @RequestParam(required = false) String search,
    @RequestParam(required = false, defaultValue = "ALL") String status
  ) {
    access.require("workforce.read");
    if (branchId != null) access.scopedBranch(branchId);
    return employeeService.listEmployees(branchId, search, status, null, access.permissions(auth.current()).contains("workforce.write"));
  }

  @GetMapping("/workforce/employees/{id}")
  public EmployeeService.EmployeeDetailDto getEmployeeDetail(@PathVariable Long id) {
    access.require("workforce.write");
    access.requireManagedEmployee(id);
    return employeeService.getEmployeeDetail(id);
  }

  @PostMapping("/workforce/employees")
  public EmployeeEntity createEmployee(@RequestBody EmployeeService.EmployeeInput input) {
    access.require("workforce.write");
    access.scopedBranch(input.branchId());
    return employeeService.createEmployee(input);
  }

  @PostMapping("/workforce/employees/{id}/contracts")
  public void addContractRevision(
    @PathVariable Long id,
    @RequestBody EmploymentContractEntity contract
  ) {
    access.require("workforce.write");
    access.requireManagedEmployee(id);
    employeeService.addContractRevision(id, contract);
  }

  @PostMapping("/workforce/contracts/{id}/wages")
  public void addWageRateRevision(
    @PathVariable Long id,
    @RequestBody WageRateEntity wageRate
  ) {
    access.require("workforce.write");
    var contract = em.find(EmploymentContractEntity.class, id);
    if (contract == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    access.requireManagedEmployee(contract.employeeId);
    employeeService.addWageRateRevision(id, wageRate);
  }

  @PostMapping("/workforce/employees/{id}/restrictions")
  public void addWorkRestriction(
    @PathVariable Long id,
    @RequestBody WorkRestrictionEntity restriction
  ) {
    access.require("workforce.write");
    access.requireManagedEmployee(id);
    employeeService.addWorkRestriction(id, restriction);
  }

  public record ImportPayload(String csv, boolean dryRun) {}

  @PostMapping("/workforce/import")
  public ImportService.ImportResult importEmployees(
    @RequestBody ImportPayload payload,
    HttpServletRequest req
  ) {
    access.require("workforce.write");
    var result = importService.processEmployeeCsv(payload.csv(), access.actorId(), payload.dryRun());
    if (!payload.dryRun()) auth.audit(auth.current(), "WORKFORCE_IMPORTED", String.valueOf(result.jobId()), null, "");
    return result;
  }

  @GetMapping("/workforce/positions")
  public List<PositionEntity> listPositions() {
    access.require("workforce.read");
    return em.createQuery("SELECT p FROM PositionEntity p WHERE p.active = true ORDER BY p.positionId", PositionEntity.class)
      .getResultList();
  }

  // --- F03: SCHEDULING & SHIFTS ---

  @GetMapping("/scheduling/templates")
  public List<ShiftTemplateEntity> listTemplates(@RequestParam(required = false) String branchId) {
    access.requireScheduleBranch(branchId);
    return schedulingService.listTemplates(branchId);
  }

  @PostMapping("/scheduling/templates")
  public ShiftTemplateEntity createTemplate(@RequestBody ShiftTemplateEntity template) {
    access.requireScheduleBranch(template.branchId);
    return schedulingService.createTemplate(template);
  }

  @GetMapping("/scheduling/shifts")
  public List<SchedulingService.ShiftDto> listShifts(
    @RequestParam(required = false) String branchId,
    @RequestParam String start,
    @RequestParam String end
  ) {
    access.require("schedule.read");
    Instant s = Instant.parse(start);
    Instant e = Instant.parse(end);
    Long employee = access.canScheduleBranch(branchId) ? null : access.requireSelf(null);
    if (branchId != null && employee != null && !access.assignedTo(employee, branchId, LocalDate.now(java.time.ZoneId.of("Europe/Berlin")))) AuthService.forbidden();
    return schedulingService.listShifts(branchId, s, e, employee);
  }

  public record CreateShiftInput(
    String branchId,
    Long employeeId,
    Long templateId,
    String start,
    String end,
    Integer breakMinutes
  ) {}

  @PostMapping("/scheduling/shifts")
  public ShiftScheduleEntity createShift(@RequestBody CreateShiftInput in) {
    access.requireScheduleBranch(in.branchId());
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    if (!access.assignedTo(in.employeeId(), in.branchId(), s.atZone(java.time.ZoneId.of("Europe/Berlin")).toLocalDate())) AuthService.forbidden();
    return schedulingService.createShift(in.branchId(), in.employeeId(), in.templateId(), s, e, in.breakMinutes());
  }

  @DeleteMapping("/scheduling/shifts/{id}")
  public void deleteShift(@PathVariable Long id) {
    access.requireScheduleBranch(shift(id).branchId);
    schedulingService.deleteShift(id);
  }

  public record CheckPayload(String branchId, String start, String end) {}

  @PostMapping("/scheduling/check")
  public LaborLawChecker.CheckSummary checkSchedule(@RequestBody CheckPayload in) {
    access.requireScheduleBranch(in.branchId());
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    return lawChecker.validateSchedule(in.branchId(), s, e);
  }

  public record PublishPayload(String branchId, String start, String end, String changeReason) {}

  @PostMapping("/scheduling/publish")
  public SchedulingService.PublishResult publishSchedule(@RequestBody PublishPayload in) {
    access.requireScheduleBranch(in.branchId());
    Instant s = Instant.parse(in.start());
    Instant e = Instant.parse(in.end());
    var result = schedulingService.publishSchedule(in.branchId(), s, e, access.actorId(), in.changeReason());
    auth.audit(auth.current(), "SCHEDULE_PUBLISHED", s.toString(), in.branchId(), "");
    return result;
  }

  // --- SHIFT SWAP ---

  @GetMapping("/scheduling/swap-requests")
  public List<SchedulingService.SwapRequestDto> listSwapRequests(@RequestParam(required = false) String branchId) {
    access.require("schedule.read");
    Long employee = access.canScheduleBranch(branchId) ? null : access.requireSelf(null);
    return schedulingService.listSwapRequests(branchId, employee);
  }

  public record SwapRequestInput(Long sourceShiftId, Long targetEmployeeId, String reason) {}

  @PostMapping("/scheduling/swap-requests")
  public ShiftSwapRequestEntity requestSwap(@RequestBody SwapRequestInput in) {
    access.require("schedule.read");
    Long empId = access.requireSelf(null);
    var shift = shift(in.sourceShiftId());
    if (!access.assignedTo(in.targetEmployeeId(), shift.branchId, shift.plannedStartUtc.atZone(java.time.ZoneId.of("Europe/Berlin")).toLocalDate())) AuthService.forbidden();
    return schedulingService.requestSwap(in.sourceShiftId(), in.targetEmployeeId(), empId, in.reason());
  }

  public record DecisionInput(String reason) {}

  @PostMapping("/scheduling/swap-requests/{id}/approve")
  public void approveSwap(@PathVariable Long id, @RequestBody(required = false) DecisionInput decision) {
    var shift = swapShift(id);
    access.requireScheduleBranch(shift.branchId);
    schedulingService.approveSwap(id, access.actorId(), decision != null ? decision.reason() : null);
    auth.audit(auth.current(), "approveSwap", id.toString(), shift.branchId, "");
  }

  @PostMapping("/scheduling/swap-requests/{id}/reject")
  public void rejectSwap(@PathVariable Long id, @RequestBody(required = false) DecisionInput decision) {
    var shift = swapShift(id);
    access.requireScheduleBranch(shift.branchId);
    schedulingService.rejectSwap(id, access.actorId(), decision != null ? decision.reason() : null);
    auth.audit(auth.current(), "rejectSwap", id.toString(), shift.branchId, "");
  }

  @GetMapping("/workforce/notifications")
  public List<NotificationEntity> listNotifications() {
    Long userId = access.selfEmployee();
    if (userId == null) return List.of();
    return em.createQuery(
      "SELECT n FROM NotificationEntity n WHERE n.recipientUserId = :u ORDER BY n.createdAtUtc DESC",
      NotificationEntity.class
    )
    .setParameter("u", userId)
    .setMaxResults(20)
    .getResultList();
  }

  public record Colleague(Long employeeId, String displayName) {}

  @GetMapping("/scheduling/shifts/{id}/colleagues")
  public List<Colleague> colleagues(@PathVariable Long id) {
    var shift = shift(id);
    if (!"PUBLISHED".equals(shift.status) || !access.requireSelf(null).equals(shift.employeeId)) AuthService.forbidden();
    return em.createQuery("""
      select e from EmployeeEntity e where e.employmentStatus='ACTIVE' and e.employeeId<>:id
      order by e.displayName
      """, EmployeeEntity.class).setParameter("id", shift.employeeId).getResultList().stream()
      .filter(e -> access.assignedTo(e.employeeId, shift.branchId, shift.plannedStartUtc.atZone(java.time.ZoneId.of("Europe/Berlin")).toLocalDate()))
      .map(e -> new Colleague(e.employeeId, e.displayName)).toList();
  }

  private ShiftScheduleEntity shift(Long id) {
    var shift = id == null ? null : em.find(ShiftScheduleEntity.class, id);
    if (shift == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return shift;
  }

  private ShiftScheduleEntity swapShift(Long id) {
    var request = em.find(ShiftSwapRequestEntity.class, id);
    if (request == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return shift(request.sourceShiftId);
  }
}
