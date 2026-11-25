package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.service.*;
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
    @RequestParam(value = "branchId", required = false) Long branchId,
    @RequestParam(value = "year", required = false) Integer year
  ) {
    return allowanceService.getHolidaysForBranch(branchId, year);
  }

  // 2. Tính toán & chứng nhận phụ cấp cho 1 ca làm việc (F07.02 - F07.06)
  @PostMapping("/calculate/{timesheetId}")
  public TimesheetAllowanceBreakdownDto calculateTimesheet(
    @PathVariable Long timesheetId
  ) {
    return allowanceService.calculateAllowancesForTimesheet(timesheetId);
  }

  // 3. Tra cứu chi tiết phân đoạn phụ cấp và kiểm toán trace (F07.07)
  @GetMapping("/timesheets/{timesheetId}")
  public TimesheetAllowanceBreakdownDto getTimesheetAllowance(
    @PathVariable Long timesheetId
  ) {
    return allowanceService.calculateAllowancesForTimesheet(timesheetId);
  }

  // 4. Báo cáo tổng hợp phụ cấp cho chi nhánh trong kỳ (F07.07)
  @GetMapping("/branch-summary")
  public BranchAllowanceSummaryDto getBranchSummary(
    @RequestParam(value = "branchId", required = false, defaultValue = "1") Long branchId,
    @RequestParam(value = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
    @RequestParam(value = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
  ) {
    return allowanceService.getBranchAllowanceSummary(branchId, fromDate, toDate);
  }
}
