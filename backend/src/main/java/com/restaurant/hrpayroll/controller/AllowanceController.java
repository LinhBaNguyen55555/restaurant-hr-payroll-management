package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.service.*;
import com.restaurant.hrpayroll.entity.AttendanceTimesheetEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Objects;
import com.restaurant.hrpayroll.service.HolidayAllowanceService.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/allowances", "/api/allowances"})
@Transactional
public class AllowanceController {

  @PersistenceContext
  private EntityManager em;

  private final HolidayAllowanceService allowanceService;
  private final AuthService auth;
  private final Access access;

  public AllowanceController(
    HolidayAllowanceService allowanceService,
    AuthService auth,
    Access access
  ) {
    this.allowanceService = allowanceService;
    this.auth = auth;
    this.access = access;
  }

  // 1. Lấy danh sách ngày lễ của bang chi nhánh (F07.01)
  @GetMapping("/holidays")
  public List<PublicHolidayDto> getHolidays(
    @RequestParam("branchId") String branchId,
    @RequestParam(value = "year", required = false) Integer year
  ) {
    if (!access.assignedTo(access.selfEmployee(), branchId, LocalDate.now(java.time.ZoneId.of("Europe/Berlin")))) access.scopedBranch(branchId);
    return allowanceService.getHolidaysForBranch(branchId, year);
  }

  // 2. Tính và lưu kết quả phụ cấp cho 1 ca làm việc (F07.02 - F07.06)
  @PostMapping("/calculate/{timesheetId}")
  public TimesheetAllowanceBreakdownDto calculateTimesheet(
    @PathVariable Long timesheetId
  ) {
    access.require("allowance.write");
    var timesheet = timesheet(timesheetId);
    access.scopedBranch(timesheet.branchId);
    var result = allowanceService.calculateAllowancesForTimesheet(timesheetId);
    auth.audit(auth.current(), "SFN_CALCULATED", timesheetId.toString(), timesheet.branchId, "");
    return result;
  }

  // 3. Tra cứu chi tiết phân đoạn phụ cấp và kiểm toán trace (F07.07)
  @GetMapping("/timesheets/{timesheetId}")
  public TimesheetAllowanceBreakdownDto getTimesheetAllowance(
    @PathVariable Long timesheetId
  ) {
    var timesheet = timesheet(timesheetId);
    if (!Objects.equals(timesheet.employeeId, access.selfEmployee())) {
      access.require("allowance.read");
      access.scopedBranch(timesheet.branchId);
    }
    return allowanceService.getTimesheetAllowance(timesheetId);
  }

  // 4. Báo cáo tổng hợp phụ cấp cho chi nhánh trong kỳ (F07.07)
  @GetMapping("/branch-summary")
  public BranchAllowanceSummaryDto getBranchSummary(
    @RequestParam("branchId") String branchId,
    @RequestParam(value = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
    @RequestParam(value = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
  ) {
    access.require("allowance.read");
    access.scopedBranch(branchId);
    return allowanceService.getBranchAllowanceSummary(branchId, fromDate, toDate);
  }
  private AttendanceTimesheetEntity timesheet(Long id) {
    var timesheet = em.find(AttendanceTimesheetEntity.class, id);
    if (timesheet == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return timesheet;
  }
}
