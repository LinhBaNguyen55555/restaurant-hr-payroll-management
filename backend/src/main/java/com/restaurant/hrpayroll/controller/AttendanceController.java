package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.service.*;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/v1/attendance", "/api/attendance"})
@Transactional
public class AttendanceController {

  private final AttendanceService attendanceService;
  private final AuthService auth;
  private final Access access;

  public AttendanceController(AttendanceService attendanceService, AuthService auth, Access access) {
    this.attendanceService = attendanceService;
    this.auth = auth;
    this.access = access;
  }

  @GetMapping("/status")
  public AttendanceService.AttendanceStatusDto getStatus(@RequestParam(required = false) Long employeeId) {
    Long targetEmpId = access.requireSelf(employeeId);
    return attendanceService.getStatus(targetEmpId);
  }

  public record CheckInOutRequest(Long employeeId, String source, String notes) {}

  @PostMapping("/check-in")
  public AttendanceTimesheetEntity checkIn(@RequestBody(required = false) CheckInOutRequest req, HttpServletRequest httpReq) {
    Long empId = access.requireSelf(req != null ? req.employeeId() : null);
    String ip = httpReq.getRemoteAddr();
    String device = httpReq.getHeader("User-Agent");
    String src = (req != null && req.source() != null) ? req.source() : "WEB_PORTAL";
    String notes = (req != null) ? req.notes() : null;
    return attendanceService.checkIn(empId, src, ip, device, notes);
  }

  @PostMapping("/check-out")
  public AttendanceTimesheetEntity checkOut(@RequestBody(required = false) CheckInOutRequest req) {
    Long empId = access.requireSelf(req != null ? req.employeeId() : null);
    String src = (req != null && req.source() != null) ? req.source() : "WEB_PORTAL";
    String notes = (req != null) ? req.notes() : null;
    return attendanceService.checkOut(empId, src, notes);
  }

  public record BreakRequest(Long employeeId, String breakType) {}

  @PostMapping("/breaks/start")
  public BreakRecordEntity startBreak(@RequestBody(required = false) BreakRequest req) {
    Long empId = access.requireSelf(req != null ? req.employeeId() : null);
    String type = (req != null) ? req.breakType() : "STATUTORY_BREAK";
    return attendanceService.startBreak(empId, type);
  }

  @PostMapping("/breaks/end")
  public BreakRecordEntity endBreak(@RequestBody(required = false) BreakRequest req) {
    Long empId = access.requireSelf(req != null ? req.employeeId() : null);
    return attendanceService.endBreak(empId);
  }

  @GetMapping("/my-timesheet")
  public List<AttendanceService.TimesheetDto> getMyTimesheet(
    @RequestParam(required = false) Long employeeId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate
  ) {
    Long empId = access.requireSelf(employeeId);
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
    return attendanceService.getMyTimesheets(empId, from, to);
  }

  @GetMapping("/branch-timesheets")
  public List<AttendanceService.TimesheetDto> getBranchTimesheets(
    @RequestParam String branchId,
    @RequestParam(required = false) String fromDate,
    @RequestParam(required = false) String toDate
  ) {
    LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
    LocalDate to = (toDate != null && !toDate.isBlank()) ? LocalDate.parse(toDate) : null;
    access.requireScheduleBranch(branchId);
    return attendanceService.getBranchTimesheets(branchId, from, to);
  }

  public record ManualEntryRequest(
    String branchId,
    Long employeeId,
    String workDate,
    String startUtc,
    String endUtc,
    Integer breakMinutes,
    Instant breakStartUtc,
    String reason
  ) {}

  @PostMapping("/manual-entry")
  public AttendanceTimesheetEntity addManualEntry(@RequestBody ManualEntryRequest req) {
    access.require("schedule.write");
    if (req.branchId() == null || req.employeeId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin chi nhánh hoặc nhân viên");
    }
    LocalDate date = req.workDate() != null ? LocalDate.parse(req.workDate()) : LocalDate.now(java.time.ZoneId.of("Europe/Berlin"));
    Instant start = Instant.parse(req.startUtc());
    Instant end = Instant.parse(req.endUtc());
    access.requireScheduleBranch(req.branchId());
    if (!access.assignedTo(req.employeeId(), req.branchId(), date)) AuthService.forbidden();
    var entry = attendanceService.addManualEntry(
      req.branchId(),
      req.employeeId(),
      date,
      start,
      end,
      req.breakMinutes(),
      req.breakStartUtc(),
      req.reason(),
      access.actorId()
    );
    auth.audit(auth.current(), "ATTENDANCE_MANUAL_ENTRY", entry.timesheetId.toString(), entry.branchId, "");
    return entry;
  }
}
