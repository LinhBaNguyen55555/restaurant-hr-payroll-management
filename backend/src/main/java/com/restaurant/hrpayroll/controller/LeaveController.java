package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.service.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
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

  private Long currentUserId() {
    try {
      return Long.parseLong(auth.current().id);
    } catch (Exception e) {
      return 1L;
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

  @GetMapping("/types")
  public List<LeaveService.LeaveTypeDto> getLeaveTypes() {
    return leaveService.getLeaveTypes();
  }

  @GetMapping("/balances")
  public List<LeaveService.LeaveBalanceDto> getLeaveBalances(
    @RequestParam(required = false) Long employeeId,
    @RequestParam(required = false) Integer year
  ) {
    Long empId = employeeId;
    if (empId == null) {
      empId = currentEmployeeId();
      if (empId == null) empId = 1L;
    }
    return leaveService.getLeaveBalances(empId, year);
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
    Long empId = in.employeeId();
    if (empId == null) {
      empId = currentEmployeeId();
      if (empId == null) empId = 1L;
    }
    LocalDate start = LocalDate.parse(in.startDate());
    LocalDate end = LocalDate.parse(in.endDate());

    return leaveService.createLeaveRequest(
      empId,
      in.leaveTypeId() != null ? in.leaveTypeId() : 1,
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
    return leaveService.getLeaveRequests(employeeId, statusFilter);
  }

  public record ReviewLeaveInput(String notes) {}

  @PostMapping("/requests/{id}/approve")
  public LeaveRequestEntity approveLeaveRequest(
    @PathVariable Long id,
    @RequestBody(required = false) ReviewLeaveInput in
  ) {
    access.require("schedule.write");
    String notes = in != null ? in.notes() : "Đã duyệt ngày nghỉ";
    return leaveService.reviewLeaveRequest(id, true, notes, currentUserId(), currentEmployeeId());
  }

  @PostMapping("/requests/{id}/reject")
  public LeaveRequestEntity rejectLeaveRequest(
    @PathVariable Long id,
    @RequestBody(required = false) ReviewLeaveInput in
  ) {
    access.require("schedule.write");
    String notes = in != null ? in.notes() : "Từ chối yêu cầu nghỉ phép";
    return leaveService.reviewLeaveRequest(id, false, notes, currentUserId(), currentEmployeeId());
  }

  public record RecordSicknessInput(
    Long employeeId,
    String startDate,
    String endDate,
    Boolean hasMedicalCertificate,
    String certificateDate,
    String notes
  ) {}

  @PostMapping("/sickness")
  public SicknessAbsenceEntity recordSickness(@RequestBody RecordSicknessInput in) {
    access.require("schedule.write");
    LocalDate start = LocalDate.parse(in.startDate());
    LocalDate end = LocalDate.parse(in.endDate());
    LocalDate certDate = in.certificateDate() != null ? LocalDate.parse(in.certificateDate()) : null;

    return leaveService.recordSickness(
      in.employeeId(),
      start,
      end,
      Boolean.TRUE.equals(in.hasMedicalCertificate()),
      certDate,
      in.notes(),
      currentUserId()
    );
  }

  @GetMapping("/sickness")
  public List<LeaveService.SicknessAbsenceDto> getSicknessAbsences(
    @RequestParam(required = false) Long employeeId
  ) {
    return leaveService.getSicknessAbsences(employeeId);
  }

  @GetMapping("/compensatory-rests")
  public List<LeaveService.CompensatoryRestDto> getCompensatoryRests(
    @RequestParam(required = false) Long branchId,
    @RequestParam(required = false) Long employeeId
  ) {
    return leaveService.getCompensatoryRestObligations(branchId != null ? branchId : 1L, employeeId);
  }

  public record FulfillRestInput(String restDate, String notes) {}

  @PostMapping("/compensatory-rests/{id}/fulfill")
  public CompensatoryRestDayEntity fulfillCompensatoryRest(
    @PathVariable Long id,
    @RequestBody(required = false) FulfillRestInput in
  ) {
    access.require("schedule.write");
    LocalDate rDate = (in != null && in.restDate() != null) ? LocalDate.parse(in.restDate()) : LocalDate.now();
    String notes = in != null ? in.notes() : null;
    return leaveService.fulfillCompensatoryRest(id, rDate, notes);
  }
}
