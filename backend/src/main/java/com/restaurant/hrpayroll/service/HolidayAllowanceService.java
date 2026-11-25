package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class HolidayAllowanceService {

  @PersistenceContext
  private EntityManager em;

  private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");
  private static final BigDecimal TAX_EXEMPT_BASE_CAP = new BigDecimal("50.00"); // §3b EStG max 50 €/h
  private static final BigDecimal SV_EXEMPT_BASE_CAP = new BigDecimal("25.00");  // §1 SvEV max 25 €/h

  // DTOs
  public record PublicHolidayDto(
    Long holidayId,
    String stateCode,
    LocalDate holidayDate,
    String holidayCode,
    String holidayNameDe,
    String holidayNameVi,
    boolean isStatutory
  ) {}

  public record SegmentCalculationDto(
    Long segmentId,
    Long timesheetId,
    String segmentStartBerlin,
    String segmentEndBerlin,
    int payableMinutes,
    String segmentType,
    boolean isNight,
    boolean isDeepNight,
    boolean isSunday,
    boolean isHoliday,
    boolean isSpecialDay,
    BigDecimal baseWageEur,
    BigDecimal payableRatePercent,
    BigDecimal paidAmountEur,
    BigDecimal taxExemptPercent,
    BigDecimal taxExemptAmountEur,
    BigDecimal taxableAmountEur,
    BigDecimal socialInsuranceExemptAmountEur,
    String calculationTrace
  ) {}

  public record TimesheetAllowanceBreakdownDto(
    Long timesheetId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    LocalDate workDate,
    String actualStartBerlin,
    String actualEndBerlin,
    int workedMinutes,
    BigDecimal baseWageEur,
    BigDecimal totalPaidAmountEur,
    BigDecimal totalTaxExemptAmountEur,
    BigDecimal totalTaxableAmountEur,
    BigDecimal totalSvExemptAmountEur,
    List<SegmentCalculationDto> segments
  ) {}

  public record BranchAllowanceSummaryDto(
    Long branchId,
    LocalDate fromDate,
    LocalDate toDate,
    int totalTimesheetsCount,
    BigDecimal totalPaidAllowancesEur,
    BigDecimal totalTaxExemptEur,
    BigDecimal totalTaxableEur,
    BigDecimal totalSvExemptEur,
    List<TimesheetAllowanceBreakdownDto> timesheets
  ) {}

  // 1. Lấy danh sách ngày lễ của bang chi nhánh
  public List<PublicHolidayDto> getHolidaysForBranch(Long branchId, Integer year) {
    int targetYear = (year != null && year > 2000) ? year : LocalDate.now(BERLIN_ZONE).getYear();

    // Default MVP: Baden-Württemberg (BW)
    List<PublicHolidayEntity> list = em.createQuery(
      "SELECT h FROM PublicHolidayEntity h WHERE h.stateCode = 'BW' AND YEAR(h.holidayDate) = :y ORDER BY h.holidayDate ASC",
      PublicHolidayEntity.class
    )
    .setParameter("y", targetYear)
    .getResultList();

    Map<String, String> viNameMap = Map.ofEntries(
      Map.entry("NEUJAHR", "Tết Dương lịch"),
      Map.entry("DREIKOENIGE", "Lễ Ba Vua"),
      Map.entry("KARFREITAG", "Thứ Sáu Tuần Thánh"),
      Map.entry("OSTERMONTAG", "Thứ Hai Phục Sinh"),
      Map.entry("MAIFEIERTAG", "Ngày Quốc tế Lao động"),
      Map.entry("HIMMELFAHRT", "Lễ Thăng Thiên"),
      Map.entry("PFINGSTMONTAG", "Thứ Hai Lễ Hiện Xuống"),
      Map.entry("FRONLEICHNAM", "Lễ Mình Máu Thánh Chúa"),
      Map.entry("EINHEIT", "Ngày Thống nhất nước Đức"),
      Map.entry("ALLERHEILIGEN", "Lễ Các Thánh"),
      Map.entry("WEIHNACHTEN_1", "Lễ Giáng sinh 1"),
      Map.entry("WEIHNACHTEN_2", "Lễ Giáng sinh 2")
    );

    return list.stream().map(h -> new PublicHolidayDto(
      h.holidayId,
      h.stateCode,
      h.holidayDate,
      h.holidayCode,
      h.holidayNameDe,
      viNameMap.getOrDefault(h.holidayCode, h.holidayNameDe),
      Boolean.TRUE.equals(h.isStatutory)
    )).toList();
  }

  // 2. Động cơ phân đoạn thời gian (Time Splitting Engine - F07.02 & F07.03 & F07.04)
  public List<WorkTimeSegmentEntity> splitWorkTimeSegments(AttendanceTimesheetEntity ts) {
    if (ts.actualStartUtc == null || ts.actualEndUtc == null) {
      return Collections.emptyList();
    }

    // Delete existing segments for this timesheet to recalculate cleanly
    em.createQuery("DELETE FROM AllowanceCalculationEntity ac WHERE ac.timesheetId = :ts")
      .setParameter("ts", ts.timesheetId)
      .executeUpdate();
    em.createQuery("DELETE FROM WorkTimeSegmentEntity s WHERE s.timesheetId = :ts")
      .setParameter("ts", ts.timesheetId)
      .executeUpdate();

    ZonedDateTime shiftStart = ts.actualStartUtc.atZone(BERLIN_ZONE);
    ZonedDateTime shiftEnd = ts.actualEndUtc.atZone(BERLIN_ZONE);

    if (!shiftEnd.isAfter(shiftStart)) {
      return Collections.emptyList();
    }

    // Build cut points within the interval [shiftStart, shiftEnd]
    TreeSet<ZonedDateTime> cutPoints = new TreeSet<>();
    cutPoints.add(shiftStart);
    cutPoints.add(shiftEnd);

    LocalDate startDate = shiftStart.toLocalDate();
    LocalDate endDate = shiftEnd.toLocalDate();

    LocalDate curr = startDate;
    while (!curr.isAfter(endDate.plusDays(1))) {
      // 00:00 midnight
      ZonedDateTime t00 = curr.atStartOfDay(BERLIN_ZONE);
      if (t00.isAfter(shiftStart) && t00.isBefore(shiftEnd)) cutPoints.add(t00);

      // 04:00 deep night end / Sunday extension end
      ZonedDateTime t04 = curr.atTime(4, 0).atZone(BERLIN_ZONE);
      if (t04.isAfter(shiftStart) && t04.isBefore(shiftEnd)) cutPoints.add(t04);

      // 06:00 night end
      ZonedDateTime t06 = curr.atTime(6, 0).atZone(BERLIN_ZONE);
      if (t06.isAfter(shiftStart) && t06.isBefore(shiftEnd)) cutPoints.add(t06);

      // 14:00 special day cut (24/12 & 31/12)
      if (curr.getMonthValue() == 12 && (curr.getDayOfMonth() == 24 || curr.getDayOfMonth() == 31)) {
        ZonedDateTime t14 = curr.atTime(14, 0).atZone(BERLIN_ZONE);
        if (t14.isAfter(shiftStart) && t14.isBefore(shiftEnd)) cutPoints.add(t14);
      }

      // 20:00 night begin
      ZonedDateTime t20 = curr.atTime(20, 0).atZone(BERLIN_ZONE);
      if (t20.isAfter(shiftStart) && t20.isBefore(shiftEnd)) cutPoints.add(t20);

      curr = curr.plusDays(1);
    }

    List<ZonedDateTime> sortedPoints = new ArrayList<>(cutPoints);
    List<WorkTimeSegmentEntity> segments = new ArrayList<>();

    boolean shiftStartedBeforeMidnight = shiftStart.toLocalTime().isBefore(LocalTime.MIDNIGHT) && shiftStart.toLocalDate().isBefore(shiftEnd.toLocalDate());
    boolean shiftStartedSunday = (shiftStart.getDayOfWeek() == DayOfWeek.SUNDAY);

    for (int i = 0; i < sortedPoints.size() - 1; i++) {
      ZonedDateTime subStart = sortedPoints.get(i);
      ZonedDateTime subEnd = sortedPoints.get(i + 1);

      long minutes = Duration.between(subStart, subEnd).toMinutes();
      if (minutes <= 0) continue;

      WorkTimeSegmentEntity seg = new WorkTimeSegmentEntity();
      seg.timesheetId = ts.timesheetId;
      seg.employeeId = ts.employeeId;
      seg.attendanceId = ts.timesheetId;
      seg.segmentStartUtc = subStart.toInstant();
      seg.segmentEndUtc = subEnd.toInstant();
      seg.payableMinutes = (int) minutes;

      // Classify interval
      classifySegment(seg, subStart, subEnd, shiftStartedBeforeMidnight, shiftStartedSunday);

      em.persist(seg);
      segments.add(seg);
    }

    return segments;
  }

  // Phân loại phân đoạn theo chuẩn luật thuế EStG §3b
  private void classifySegment(
    WorkTimeSegmentEntity seg,
    ZonedDateTime start,
    ZonedDateTime end,
    boolean shiftStartedBeforeMidnight,
    boolean shiftStartedSunday
  ) {
    LocalDate date = start.toLocalDate();
    LocalTime startTime = start.toLocalTime();
    DayOfWeek dow = start.getDayOfWeek();

    // 1. Kiểm tra đêm thường (20:00 - 06:00)
    boolean night = (startTime.isAfter(LocalTime.of(19, 59)) || startTime.isBefore(LocalTime.of(6, 0)));
    seg.isNight = night;

    // 2. Kiểm tra đêm sâu đặc biệt (00:00 - 04:00 nếu ca bắt đầu trước 00:00)
    boolean deepNight = night && (startTime.isBefore(LocalTime.of(4, 0)) || startTime.equals(LocalTime.MIDNIGHT)) && shiftStartedBeforeMidnight;
    seg.isDeepNight = deepNight;

    // 3. Kiểm tra Chủ nhật (Chủ nhật 00:00-24:00 hoặc Thứ Hai 00:00-04:00 nếu ca bắt đầu Chủ nhật)
    boolean sunday = (dow == DayOfWeek.SUNDAY);
    if (!sunday && dow == DayOfWeek.MONDAY && shiftStartedSunday && startTime.isBefore(LocalTime.of(4, 0))) {
      sunday = true; // §3b(2) EStG: kéo dài đến 04:00 sáng Thứ Hai
    }
    seg.isSunday = sunday;

    // 4. Kiểm tra ngày đặc biệt 24/12 & 31/12 sau 14h, hoặc 01/05, 25/12, 26/12
    boolean specialDay = false;
    if (date.getMonthValue() == 12 && date.getDayOfMonth() == 24 && !startTime.isBefore(LocalTime.of(14, 0))) {
      specialDay = true; // 24.12 ab 14:00
    } else if (date.getMonthValue() == 12 && date.getDayOfMonth() == 31 && !startTime.isBefore(LocalTime.of(14, 0))) {
      specialDay = true; // 31.12 ab 14:00
    } else if ((date.getMonthValue() == 5 && date.getDayOfMonth() == 1) ||
               (date.getMonthValue() == 12 && (date.getDayOfMonth() == 25 || date.getDayOfMonth() == 26))) {
      specialDay = true; // 01.05 & 25-26.12
    }
    seg.isSpecialDay = specialDay;

    // 5. Kiểm tra ngày lễ theo bang BW
    List<PublicHolidayEntity> hols = em.createQuery(
      "SELECT h FROM PublicHolidayEntity h WHERE h.stateCode = 'BW' AND h.holidayDate = :d",
      PublicHolidayEntity.class
    )
    .setParameter("d", date)
    .getResultList();

    if (!hols.isEmpty()) {
      seg.isHoliday = true;
      seg.holidayId = hols.get(0).holidayId;
    }

    // Gán segmentType hiển thị
    if (specialDay) {
      seg.segmentType = "SPECIAL_DAY";
    } else if (seg.isHoliday) {
      seg.segmentType = "HOLIDAY";
    } else if (sunday) {
      seg.segmentType = "SUNDAY";
    } else if (deepNight) {
      seg.segmentType = "DEEP_NIGHT";
    } else if (night) {
      seg.segmentType = "NIGHT";
    } else {
      seg.segmentType = "REGULAR";
    }
  }

  // 3. Tính toán phụ cấp & bóc tách thuế/bảo hiểm (F07.05 & F07.06)
  public TimesheetAllowanceBreakdownDto calculateAllowancesForTimesheet(Long timesheetId) {
    AttendanceTimesheetEntity ts = em.find(AttendanceTimesheetEntity.class, timesheetId);
    if (ts == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng chấm công ID #" + timesheetId);
    }

    // Resolve employee display info
    EmployeeEntity emp = em.find(EmployeeEntity.class, ts.employeeId);
    String empName = emp != null ? emp.displayName : "Nhân viên #" + ts.employeeId;
    String empCode = emp != null ? emp.employeeCode : "E-";

    // 1. Split segments
    List<WorkTimeSegmentEntity> segments = splitWorkTimeSegments(ts);
    if (segments.isEmpty()) {
      return new TimesheetAllowanceBreakdownDto(
        ts.timesheetId,
        ts.employeeId,
        empName,
        empCode,
        ts.workDate,
        ts.actualStartUtc != null ? ts.actualStartUtc.atZone(BERLIN_ZONE).toLocalTime().toString() : "--:--",
        ts.actualEndUtc != null ? ts.actualEndUtc.atZone(BERLIN_ZONE).toLocalTime().toString() : "--:--",
        ts.workedMinutes != null ? ts.workedMinutes : 0,
        new BigDecimal("15.00"),
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        Collections.emptyList()
      );
    }

    // Base wage calculation: default 15.00 €/h
    BigDecimal baseWage = new BigDecimal("15.00");
    try {
      List<WageRateEntity> rates = em.createQuery(
        "SELECT w FROM WageRateEntity w, EmploymentContractEntity c WHERE w.contractId = c.contractId AND c.employeeId = :e ORDER BY w.validFrom DESC",
        WageRateEntity.class
      )
      .setParameter("e", ts.employeeId)
      .setMaxResults(1)
      .getResultList();
      if (!rates.isEmpty()) {
        WageRateEntity wr = rates.get(0);
        if (wr.sfnApprovedHourlyBaseEur != null && wr.sfnApprovedHourlyBaseEur.compareTo(BigDecimal.ZERO) > 0) {
          baseWage = wr.sfnApprovedHourlyBaseEur;
        } else if (wr.grossHourlyEur != null && wr.grossHourlyEur.compareTo(BigDecimal.ZERO) > 0) {
          baseWage = wr.grossHourlyEur;
        }
      }
    } catch (Exception ignored) {}

    BigDecimal totalPaid = BigDecimal.ZERO;
    BigDecimal totalTaxExempt = BigDecimal.ZERO;
    BigDecimal totalTaxable = BigDecimal.ZERO;
    BigDecimal totalSvExempt = BigDecimal.ZERO;

    List<SegmentCalculationDto> dtoList = new ArrayList<>();

    for (WorkTimeSegmentEntity seg : segments) {
      BigDecimal hours = BigDecimal.valueOf(seg.payableMinutes).divide(new BigDecimal("60.00"), 4, RoundingMode.HALF_UP);

      // --- Quy tắc xếp chồng (Stacking Rules): Night (ADD) + Day (MAX_OF_DAY) ---
      // 1. Phụ cấp đêm
      BigDecimal nightPayRate = BigDecimal.ZERO;
      BigDecimal nightTaxRate = BigDecimal.ZERO;
      if (Boolean.TRUE.equals(seg.isDeepNight)) {
        nightPayRate = new BigDecimal("40.000"); // 40% deep night
        nightTaxRate = new BigDecimal("40.000");
      } else if (Boolean.TRUE.equals(seg.isNight)) {
        nightPayRate = new BigDecimal("25.000"); // 25% night
        nightTaxRate = new BigDecimal("25.000");
      }

      // 2. Phụ cấp ngày (Lấy MAX)
      BigDecimal dayPayRate = BigDecimal.ZERO;
      BigDecimal dayTaxRate = BigDecimal.ZERO;
      String dayType = "NONE";

      if (Boolean.TRUE.equals(seg.isSpecialDay)) {
        // 24.12, 31.12, 01.05, 25-26.12
        ZonedDateTime sDate = seg.segmentStartUtc.atZone(BERLIN_ZONE);
        if (sDate.getMonthValue() == 12 && sDate.getDayOfMonth() == 24) {
          dayPayRate = new BigDecimal("150.000");
          dayTaxRate = new BigDecimal("150.000");
          dayType = "CHRISTMAS_EVE";
        } else if (sDate.getMonthValue() == 12 && sDate.getDayOfMonth() == 31) {
          dayPayRate = new BigDecimal("125.000");
          dayTaxRate = new BigDecimal("125.000");
          dayType = "NEW_YEAR_EVE";
        } else {
          dayPayRate = new BigDecimal("150.000"); // 01.05 & 25-26.12
          dayTaxRate = new BigDecimal("150.000");
          dayType = "SPECIAL_HOLIDAY";
        }
      } else if (Boolean.TRUE.equals(seg.isHoliday)) {
        dayPayRate = new BigDecimal("100.000");
        dayTaxRate = new BigDecimal("125.000"); // §3b allows 125%
        dayType = "HOLIDAY";
      } else if (Boolean.TRUE.equals(seg.isSunday)) {
        dayPayRate = new BigDecimal("50.000");
        dayTaxRate = new BigDecimal("50.000");
        dayType = "SUNDAY";
      }

      // Stacking
      BigDecimal totalPayRate = nightPayRate.add(dayPayRate);
      BigDecimal totalTaxRate = nightTaxRate.add(dayTaxRate);

      if (totalPayRate.compareTo(BigDecimal.ZERO) == 0 && totalTaxRate.compareTo(BigDecimal.ZERO) == 0) {
        // Regular segment with no allowance
        continue;
      }

      // Tính tiền thực trả
      BigDecimal paidAmount = hours.multiply(baseWage)
        .multiply(totalPayRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP))
        .setScale(2, RoundingMode.HALF_UP);

      // Tính phần miễn thuế TNCN theo §3b EStG (áp trần 50 €/h)
      BigDecimal taxBaseWage = baseWage.min(TAX_EXEMPT_BASE_CAP);
      BigDecimal maxTaxExempt = hours.multiply(taxBaseWage)
        .multiply(totalTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP))
        .setScale(2, RoundingMode.HALF_UP);

      BigDecimal taxExemptAmount = paidAmount.min(maxTaxExempt);
      BigDecimal taxableAmount = paidAmount.subtract(taxExemptAmount).max(BigDecimal.ZERO);

      // Tính phần miễn bảo hiểm xã hội theo SvEV (áp trần 25 €/h)
      BigDecimal svBaseWage = baseWage.min(SV_EXEMPT_BASE_CAP);
      BigDecimal maxSvExempt = hours.multiply(svBaseWage)
        .multiply(totalTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP))
        .setScale(2, RoundingMode.HALF_UP);

      BigDecimal svExemptAmount = paidAmount.min(maxSvExempt);

      // Save AllowanceCalculationEntity
      AllowanceCalculationEntity ac = new AllowanceCalculationEntity();
      ac.segmentId = seg.segmentId;
      ac.timesheetId = ts.timesheetId;
      ac.employeeId = ts.employeeId;
      ac.allowanceCode = seg.segmentType;
      ac.baseWageEur = baseWage;
      ac.ratePercent = totalPayRate;
      ac.taxExemptPercent = totalTaxRate;
      ac.paidAmountEur = paidAmount;
      ac.taxExemptAmountEur = taxExemptAmount;
      ac.taxableAmountEur = taxableAmount;
      ac.socialInsuranceExemptAmountEur = svExemptAmount;
      ac.calculationStatus = "CERTIFIED";

      String trace = String.format(
        "Lương cơ sở: %.2f €/h | Tỷ lệ trả: %.1f%% (Đêm %.1f%% + Ngày %s %.1f%%) | Thực trả: %.2f € | Miễn thuế §3b (trần 50€): %.2f € | Chịu thuế: %.2f € | Miễn BH SvEV (trần 25€): %.2f €",
        baseWage, totalPayRate, nightPayRate, dayType, dayPayRate, paidAmount, taxExemptAmount, taxableAmount, svExemptAmount
      );
      ac.calculationTraceJson = "{\"trace\": \"" + trace + "\"}";
      em.persist(ac);

      totalPaid = totalPaid.add(paidAmount);
      totalTaxExempt = totalTaxExempt.add(taxExemptAmount);
      totalTaxable = totalTaxable.add(taxableAmount);
      totalSvExempt = totalSvExempt.add(svExemptAmount);

      ZonedDateTime sStart = seg.segmentStartUtc.atZone(BERLIN_ZONE);
      ZonedDateTime sEnd = seg.segmentEndUtc.atZone(BERLIN_ZONE);

      dtoList.add(new SegmentCalculationDto(
        seg.segmentId,
        ts.timesheetId,
        sStart.toLocalTime().toString(),
        sEnd.toLocalTime().toString(),
        seg.payableMinutes,
        seg.segmentType,
        Boolean.TRUE.equals(seg.isNight),
        Boolean.TRUE.equals(seg.isDeepNight),
        Boolean.TRUE.equals(seg.isSunday),
        Boolean.TRUE.equals(seg.isHoliday),
        Boolean.TRUE.equals(seg.isSpecialDay),
        baseWage,
        totalPayRate,
        paidAmount,
        totalTaxRate,
        taxExemptAmount,
        taxableAmount,
        svExemptAmount,
        trace
      ));
    }

    ZonedDateTime actStart = ts.actualStartUtc.atZone(BERLIN_ZONE);
    ZonedDateTime actEnd = ts.actualEndUtc.atZone(BERLIN_ZONE);

    return new TimesheetAllowanceBreakdownDto(
      ts.timesheetId,
      ts.employeeId,
      empName,
      empCode,
      ts.workDate,
      actStart.toLocalTime().toString(),
      actEnd.toLocalTime().toString(),
      ts.workedMinutes != null ? ts.workedMinutes : 0,
      baseWage,
      totalPaid,
      totalTaxExempt,
      totalTaxable,
      totalSvExempt,
      dtoList
    );
  }

  // 4. Báo cáo tổng hợp phụ cấp cho chi nhánh trong kỳ (F07.07)
  public BranchAllowanceSummaryDto getBranchAllowanceSummary(Long branchId, LocalDate fromDate, LocalDate toDate) {
    LocalDate start = (fromDate != null) ? fromDate : LocalDate.now(BERLIN_ZONE).minusDays(30);
    LocalDate end = (toDate != null) ? toDate : LocalDate.now(BERLIN_ZONE).plusDays(1);

    List<AttendanceTimesheetEntity> timesheets = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate BETWEEN :sDate AND :eDate AND t.status IN ('APPROVED', 'PENDING_APPROVAL') ORDER BY t.workDate DESC, t.actualStartUtc DESC",
      AttendanceTimesheetEntity.class
    )
    .setParameter("b", branchId != null ? branchId : 1L)
    .setParameter("sDate", start)
    .setParameter("eDate", end)
    .getResultList();

    BigDecimal totalPaid = BigDecimal.ZERO;
    BigDecimal totalTaxExempt = BigDecimal.ZERO;
    BigDecimal totalTaxable = BigDecimal.ZERO;
    BigDecimal totalSvExempt = BigDecimal.ZERO;

    List<TimesheetAllowanceBreakdownDto> breakdownList = new ArrayList<>();

    for (AttendanceTimesheetEntity ts : timesheets) {
      TimesheetAllowanceBreakdownDto bd = calculateAllowancesForTimesheet(ts.timesheetId);
      breakdownList.add(bd);

      totalPaid = totalPaid.add(bd.totalPaidAmountEur());
      totalTaxExempt = totalTaxExempt.add(bd.totalTaxExemptAmountEur());
      totalTaxable = totalTaxable.add(bd.totalTaxableAmountEur());
      totalSvExempt = totalSvExempt.add(bd.totalSvExemptAmountEur());
    }

    return new BranchAllowanceSummaryDto(
      branchId != null ? branchId : 1L,
      start,
      end,
      breakdownList.size(),
      totalPaid,
      totalTaxExempt,
      totalTaxable,
      totalSvExempt,
      breakdownList
    );
  }
}
