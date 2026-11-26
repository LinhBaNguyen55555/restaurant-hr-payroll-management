package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.service.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/v1/leaves", "/api/leaves"})
@Transactional
public class LeaveController {

  @PersistenceContext
  private EntityManager em;

  private final LeaveService leaveService;
  private final AuthService auth;
  private final Access access;

  public LeaveController(LeaveService leaveService, AuthService auth, Access access) {
    this.leaveService = leaveService;
    this.auth = auth;
    this.access = access;
  }

  private boolean canManage() {
    return access.permissions(auth.current()).contains("schedule.write");
  }

  private Long readableEmployee(Long id) {
    if (!canManage() || id == null || id.equals(access.selfEmployee())) return access.requireSelf(id);
    access.requireManagedEmployee(id);
    return id;
  }

  private void reviewScope(Long id) {
    access.require("schedule.write");
    var request = em.find(LeaveRequestEntity.class, id);
    if (request == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn nghỉ.");
    access.requireManagedEmployee(request.employeeId);
  }

  @GetMapping("/types")
  public List<LeaveService.LeaveTypeDto> getLeaveTypes() {
    return leaveService.getLeaveTypes();
  }

  @GetMapping("/balances")
  public List<LeaveService.LeaveBalanceDto> getLeaveBalances(
    @RequestParam(required = false) Long employeeId,
    @RequestParam(required = false) Integer year
  ) {
    if (canManage() && employeeId == null)
      return leaveService.getLeaveBalances(null, year).stream().filter(r -> access.managesEmployee(r.employeeId())).toList();
    return leaveService.getLeaveBalances(readableEmployee(employeeId), year);
  }

  public record ApproveLeaveBalanceInput(Long employeeId, int year, BigDecimal entitledDays, BigDecimal carriedDays) {}

  @PostMapping("/balances")
  public LeaveBalanceEntity approveLeaveBalance(@RequestBody ApproveLeaveBalanceInput input) {
    access.require("workforce.write");
    access.requireManagedEmployee(input.employeeId());
    if (input.employeeId().equals(access.selfEmployee())) AuthService.forbidden();
    var balance = leaveService.approveLeaveBalance(input.employeeId(), input.year(), input.entitledDays(), input.carriedDays());
    auth.audit(auth.current(), "LEAVE_BALANCE_APPROVED", balance.balanceId.toString(), null, "");
    return balance;
  }

  public record CreateLeaveRequestInput(
    Long employeeId,
    Integer leaveTypeId,
    String startDate,
    String endDate,
    String reason
  ) {}

  @PostMapping("/requests")
  public LeaveRequestEntity createLeaveRequest(@RequestBody CreateLeaveRequestInput in) {
    Long empId = access.requireSelf(in.employeeId());
    LocalDate start = LocalDate.parse(in.startDate());
    LocalDate end = LocalDate.parse(in.endDate());

    return leaveService.createLeaveRequest(
      empId,
      in.leaveTypeId(),
      start,
      end,
      in.reason()
    );
  }

  @GetMapping("/requests")
  public List<LeaveService.LeaveRequestDto> getLeaveRequests(
    @RequestParam(required = false) Long employeeId,
    @RequestParam(required = false, defaultValue = "ALL") String statusFilter
  ) {
    if (!canManage() || employeeId != null) return leaveService.getLeaveRequests(readableEmployee(employeeId), statusFilter);
    return leaveService.getLeaveRequests(null, statusFilter).stream().filter(r -> access.managesEmployee(r.employeeId())).toList();
  }

  public record ReviewLeaveInput(String notes) {}

  @PostMapping("/requests/{id}/approve")
  public LeaveRequestEntity approveLeaveRequest(
    @PathVariable Long id,
    @RequestBody(required = false) ReviewLeaveInput in
  ) {
    reviewScope(id);
    String notes = in != null ? in.notes() : "Đã duyệt ngày nghỉ";
    var reviewed = leaveService.reviewLeaveRequest(id, true, notes, access.actorId(), access.selfEmployee());
    auth.audit(auth.current(), "LEAVE_APPROVED", id.toString(), null, "");
    return reviewed;
  }

  @PostMapping("/requests/{id}/reject")
  public LeaveRequestEntity rejectLeaveRequest(
    @PathVariable Long id,
    @RequestBody(required = false) ReviewLeaveInput in
  ) {
    reviewScope(id);
    String notes = in != null ? in.notes() : "Từ chối yêu cầu nghỉ phép";
    var reviewed = leaveService.reviewLeaveRequest(id, false, notes, access.actorId(), access.selfEmployee());
    auth.audit(auth.current(), "LEAVE_REJECTED", id.toString(), null, "");
    return reviewed;
  }

  public record RecordSicknessInput(
    Long employeeId,
    String startDate,
    String endDate,
    Boolean hasMedicalCertificate,
    Boolean isChildSickLeave,
    String certificateDate,
    String documentRef,
    String notes
  ) {}

  @PostMapping("/sickness")
  public SicknessAbsenceEntity recordSickness(@RequestBody RecordSicknessInput in) {
    access.require("workforce.write");
    access.requireManagedEmployee(in.employeeId());
    LocalDate start = LocalDate.parse(in.startDate());
    LocalDate end = LocalDate.parse(in.endDate());
    LocalDate certDate = in.certificateDate() != null ? LocalDate.parse(in.certificateDate()) : null;

    var absence = leaveService.recordSickness(
      in.employeeId(),
      start,
      end,
      Boolean.TRUE.equals(in.hasMedicalCertificate()),
      Boolean.TRUE.equals(in.isChildSickLeave()),
      certDate,
      in.documentRef(),
      in.notes(),
      access.actorId()
    );
    auth.audit(auth.current(), "SICKNESS_RECORDED", in.employeeId().toString(), null, "");
    return absence;
  }

  @GetMapping("/sickness")
  public List<LeaveService.SicknessAbsenceDto> getSicknessAbsences(
    @RequestParam(required = false) Long employeeId
  ) {
    if (!access.permissions(auth.current()).contains("workforce.write")) return leaveService.getSicknessAbsences(access.requireSelf(employeeId));
    if (employeeId != null) access.requireManagedEmployee(employeeId);
    return leaveService.getSicknessAbsences(employeeId).stream().filter(r -> access.managesEmployee(r.employeeId())).toList();
  }

  @GetMapping("/compensatory-rests")
  public List<LeaveService.CompensatoryRestDto> getCompensatoryRests(
    @RequestParam(required = false) String branchId,
    @RequestParam(required = false) Long employeeId
  ) {
    if (!canManage()) return leaveService.getCompensatoryRestObligations(null, access.requireSelf(employeeId));
    if (branchId != null) access.requireScheduleBranch(branchId);
    if (employeeId != null) access.requireManagedEmployee(employeeId);
    return leaveService.getCompensatoryRestObligations(branchId, employeeId).stream()
      .filter(r -> access.canScheduleBranch(r.branchId())).toList();
  }

  public record FulfillRestInput(String restDate, String notes) {}

  @PostMapping("/compensatory-rests/{id}/fulfill")
  public CompensatoryRestDayEntity fulfillCompensatoryRest(
    @PathVariable Long id,
    @RequestBody(required = false) FulfillRestInput in
  ) {
    var rest = em.find(CompensatoryRestDayEntity.class, id);
    if (rest == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ngày nghỉ bù.");
    access.requireScheduleBranch(rest.branchId);
    LocalDate rDate = (in != null && in.restDate() != null) ? LocalDate.parse(in.restDate()) : LocalDate.now(java.time.ZoneId.of("Europe/Berlin"));
    String notes = in != null ? in.notes() : null;
    var updated = leaveService.fulfillCompensatoryRest(id, rDate, notes);
    auth.audit(auth.current(), "COMPENSATORY_REST_FULFILLED", id.toString(), rest.branchId, "");
    return updated;
  }
}
