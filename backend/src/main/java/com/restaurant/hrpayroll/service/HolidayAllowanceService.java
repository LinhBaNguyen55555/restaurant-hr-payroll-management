package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
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

  private final Access access;

  public HolidayAllowanceService(Access access) {
    this.access = access;
  }

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
    List<SegmentCalculationDto> segments,
    String calculationIssue,
    boolean locked
  ) {}

  public record BranchAllowanceSummaryDto(
    String branchId,
    LocalDate fromDate,
    LocalDate toDate,
    int totalTimesheetsCount,
    BigDecimal totalPaidAllowancesEur,
    BigDecimal totalTaxExemptEur,
    BigDecimal totalTaxableEur,
    BigDecimal totalSvExemptEur,
    List<TimesheetAllowanceBreakdownDto> timesheets
  ) {}

  public List<PublicHolidayDto> getHolidaysForBranch(String branchId, Integer year) {
    Domain.Branch branch = em.find(Domain.Branch.class, branchId);
    if (branch == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chi nhánh.");
    int targetYear = year == null ? LocalDate.now(BERLIN_ZONE).getYear() : year;
    if (targetYear < 1900 || targetYear > 2200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Năm không hợp lệ.");
    return holidays(branch.stateCode, targetYear).stream().map(h -> new PublicHolidayDto(
      h.holidayId, h.stateCode, h.holidayDate, h.holidayCode, holidayNameVi(h), h.holidayNameDe, true
    )).toList();
  }

  private static String holidayNameVi(PublicHolidayEntity h) {
    if (h.holidayCode == null) return h.holidayNameDe;
    return switch (h.holidayCode) {
      case "NEW_YEAR" -> "Tết Dương lịch (Neujahr)";
      case "EPIPHANY" -> "Lễ Ba Vua (Heilige Drei Könige)";
      case "WOMEN_DAY" -> "Quốc tế Phụ nữ (Internationaler Frauentag)";
      case "GOOD_FRIDAY" -> "Thứ Sáu Tuần Thánh (Karfreitag)";
      case "EASTER_MONDAY" -> "Thứ Hai Phục Sinh (Ostermontag)";
      case "LABOUR_DAY" -> "Quốc tế Lao động (Tag der Arbeit)";
      case "ASCENSION" -> "Lễ Thăng Thiên (Christi Himmelfahrt)";
      case "WHIT_MONDAY" -> "Thứ Hai Hiện Xuống (Pfingstmontag)";
      case "CORPUS_CHRISTI" -> "Lễ Mình Máu Thánh Chúa (Fronleichnam)";
      case "ASSUMPTION" -> "Lễ Đức Mẹ Lên Trời (Mariä Himmelfahrt)";
      case "UNITY_DAY" -> "Ngày Thống nhất nước Đức (Tag der Deutschen Einheit)";
      case "REFORMATION_DAY" -> "Ngày Cải cách (Reformationstag)";
      case "ALL_SAINTS" -> "Lễ Các Thánh (Allerheiligen)";
      case "CHRISTMAS_DAY" -> "Giáng sinh ngày 1 (1. Weihnachtstag)";
      case "BOXING_DAY" -> "Giáng sinh ngày 2 (2. Weihnachtstag)";
      default -> h.holidayNameDe;
    };
  }

  private List<PublicHolidayEntity> holidays(String state, int year) {
    return em.createQuery("""
      select h from PublicHolidayEntity h
      where h.stateCode=:state and h.holidayDate between :start and :end and h.isStatutory=true
      and h.verificationStatus='VERIFIED' and h.municipalityCode is null order by h.holidayDate, h.holidayId
      """, PublicHolidayEntity.class).setParameter("state", state)
      .setParameter("start", LocalDate.of(year, 1, 1)).setParameter("end", LocalDate.of(year, 12, 31)).getResultList();
  }

  private ZoneId zone(AttendanceTimesheetEntity timesheet) {
    var assignment = assignment(timesheet);
    Domain.Branch branch = em.find(Domain.Branch.class, timesheet.branchId);
    if (branch == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công chưa liên kết chi nhánh.");
    return ZoneId.of(assignment != null && assignment.timezone != null ? assignment.timezone : branch.timezone);
  }

  private Domain.EmployeeAssignment assignment(AttendanceTimesheetEntity ts) {
    return access.assignments(ts.employeeId, ts.workDate).stream()
      .filter(a -> ts.branchId.equals(a.branchId)).findFirst().orElse(null);
  }

  private List<WorkTimeSegmentEntity> splitWorkTimeSegments(AttendanceTimesheetEntity ts, ZoneId zone) {
    Instant start = ts.actualStartUtc;
    Instant end = ts.actualEndUtc;
    if (start == null || end == null || !end.isAfter(start) || Duration.between(start, end).compareTo(Duration.ofHours(24)) > 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Khoảng thời gian thực tế của bảng công không hợp lệ.");

    var breaks = em.createQuery("""
      select b from BreakRecordEntity b where b.employeeId=:employee
      and b.startTimeUtc<:end and (b.endTimeUtc is null or b.endTimeUtc>:start) order by b.startTimeUtc
      """, BreakRecordEntity.class).setParameter("employee", ts.employeeId)
      .setParameter("start", start).setParameter("end", end).getResultList();
    if (breaks.stream().anyMatch(b -> b.endTimeUtc == null || !b.endTimeUtc.isAfter(b.startTimeUtc)))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công có khoảng nghỉ chưa kết thúc hoặc không hợp lệ.");

    var cuts = new TreeSet<Instant>(List.of(start, end));
    for (BreakRecordEntity b : breaks) {
      if (b.startTimeUtc.isAfter(start)) cuts.add(b.startTimeUtc);
      if (b.endTimeUtc.isBefore(end)) cuts.add(b.endTimeUtc);
    }
    var transition = zone.getRules().nextTransition(start);
    if (transition != null && transition.getInstant().isBefore(end)) cuts.add(transition.getInstant());

    LocalDate firstDay = start.atZone(zone).toLocalDate();
    LocalDate lastDay = end.minusNanos(1).atZone(zone).toLocalDate();
    for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
      for (int hour : List.of(0, 4, 6, 14, 20)) {
        if (hour == 14 && eve(day) == null) continue;
        Instant cut = day.atTime(hour, 0).atZone(zone).toInstant();
        if (cut.isAfter(start) && cut.isBefore(end)) cuts.add(cut);
      }
    }

    var assignment = assignment(ts);
    var branch = em.find(Domain.Branch.class, ts.branchId);
    String state = assignment != null && assignment.stateCode != null ? assignment.stateCode : branch.stateCode;
    var calendar = new HashMap<LocalDate, PublicHolidayEntity>();
    for (int year = firstDay.getYear(); year <= lastDay.getYear(); year++) {
      var rows = holidays(state, year);
      if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu lịch lễ đã xác minh cho bang " + state + " năm " + year + ".");
      rows.forEach(h -> calendar.putIfAbsent(h.holidayDate, h));
    }

    List<Instant> points = List.copyOf(cuts);
    var segments = new ArrayList<WorkTimeSegmentEntity>();
    long breakNanos = 0;
    long workNanos = 0;
    long nanosPerMinute = Duration.ofMinutes(1).toNanos();
    for (int i = 1; i < points.size(); i++) {
      Instant from = points.get(i - 1);
      Instant to = points.get(i);
      long nanos = Duration.between(from, to).toNanos();
      if (breaks.stream().anyMatch(b -> !from.isBefore(b.startTimeUtc) && from.isBefore(b.endTimeUtc))) {
        breakNanos += nanos;
        continue;
      }
      // Carry partial minutes forward so splitting never loses a whole payable minute.
      int minutes = (int) ((workNanos + nanos) / nanosPerMinute - workNanos / nanosPerMinute);
      workNanos += nanos;
      if (minutes == 0) continue;
      var segment = new WorkTimeSegmentEntity();
      segment.timesheetId = ts.timesheetId;
      segment.employeeId = ts.employeeId;
      segment.segmentStartUtc = from;
      segment.segmentEndUtc = to;
      segment.payableMinutes = minutes;
      classify(segment, zone, firstDay, calendar);
      segments.add(segment);
    }
    if (ts.actualBreakMinutes != null && ts.actualBreakMinutes > breakNanos / nanosPerMinute)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu thời điểm bắt đầu hoặc kết thúc nghỉ để phân bổ phụ cấp.");
    return segments;
  }

  private static String eve(LocalDate date) {
    if (date.getMonth() != Month.DECEMBER) return null;
    return switch (date.getDayOfMonth()) {
      case 24 -> "CHRISTMAS_EVE";
      case 31 -> "NEW_YEAR_EVE";
      default -> null;
    };
  }

  private static boolean special(LocalDate date) {
    return (date.getMonth() == Month.MAY && date.getDayOfMonth() == 1)
      || (date.getMonth() == Month.DECEMBER && (date.getDayOfMonth() == 25 || date.getDayOfMonth() == 26));
  }

  private static List<String> dayCodes(WorkTimeSegmentEntity segment, ZoneId zone) {
    List<String> codes = new ArrayList<>();
    if (segment.isSunday) codes.add("SUNDAY");
    if (segment.isHoliday) codes.add("HOLIDAY");
    if (segment.isSpecialDay) {
      var local = segment.segmentStartUtc.atZone(zone);
      var date = local.toLocalDate();
      String code = local.getHour() >= 14 ? eve(date) : null;
      if (code == null && (special(date) || (segment.isDeepNight && special(date.minusDays(1))))) code = "SPECIAL_HOLIDAY";
      if (code != null) codes.add(code);
    }
    return codes;
  }

  private void classify(WorkTimeSegmentEntity segment, ZoneId zone, LocalDate firstDay, Map<LocalDate, PublicHolidayEntity> calendar) {
    var local = segment.segmentStartUtc.atZone(zone);
    LocalDate date = local.toLocalDate();
    int hour = local.getHour();
    segment.isNight = hour >= 20 || hour < 6;
    segment.isDeepNight = hour < 4 && firstDay.equals(date.minusDays(1));
    segment.isSunday = date.getDayOfWeek() == DayOfWeek.SUNDAY
      || (segment.isDeepNight && date.minusDays(1).getDayOfWeek() == DayOfWeek.SUNDAY);
    PublicHolidayEntity holiday = calendar.get(date);
    if (holiday == null && segment.isDeepNight) holiday = calendar.get(date.minusDays(1));
    segment.isHoliday = holiday != null;
    segment.holidayId = holiday == null ? null : holiday.holidayId;
    segment.isSpecialDay = special(date) || (hour >= 14 && eve(date) != null)
      || (segment.isDeepNight && special(date.minusDays(1)));
    segment.segmentType = segment.isSpecialDay ? "SPECIAL_DAY" : segment.isHoliday ? "HOLIDAY"
      : segment.isSunday ? "SUNDAY" : segment.isDeepNight ? "DEEP_NIGHT" : segment.isNight ? "NIGHT" : "REGULAR";
    segment.classificationVersion = "ESTG_3B_V2";
  }

  private WageRateEntity wage(Long employee, LocalDate day) {
    var wages = em.createQuery("""
      select w from WageRateEntity w, EmploymentContractEntity c where w.contractId=c.contractId and c.employeeId=:employee
      and c.startDate<=:day and (c.endDate is null or c.endDate>=:day)
      and w.approvalStatus='APPROVED' and w.currencyCode='EUR' and w.validFrom<=:day and (w.validTo is null or w.validTo>=:day)
      order by w.validFrom desc
      """, WageRateEntity.class).setParameter("employee", employee).setParameter("day", day).setMaxResults(2).getResultList();
    if (wages.size() != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cần đúng một mức lương EUR đã duyệt tại ngày làm việc.");
    return wages.getFirst();
  }

  private Map<String, AllowanceRateEntity> rates(String entity, LocalDate day) {
    var policies = em.createQuery("""
      select p from AllowancePolicyEntity p where p.legalEntityId=:entity and p.approvalStatus='ACTIVE'
      and p.validFrom<=:day and (p.validTo is null or p.validTo>=:day)
      """, AllowancePolicyEntity.class).setParameter("entity", entity).setParameter("day", day).setMaxResults(2).getResultList();
    if (policies.size() != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cần đúng một chính sách SFN hiệu lực cho pháp nhân.");
    var result = new HashMap<String, AllowanceRateEntity>();
    for (var rate : em.createQuery("select r from AllowanceRateEntity r where r.policyId=:id", AllowanceRateEntity.class)
      .setParameter("id", policies.getFirst().policyId).getResultList()) {
      if (rate.paymentPercent.signum() < 0 || result.putIfAbsent(rate.allowanceCode, rate) != null)
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Tỷ lệ phụ cấp chưa được cấu hình hợp lệ.");
    }
    return result;
  }

  private static int taxLimit(String code) {
    return switch (code) {
      case "NIGHT" -> 25;
      case "DEEP_NIGHT" -> 40;
      case "SUNDAY" -> 50;
      case "HOLIDAY", "NEW_YEAR_EVE" -> 125;
      case "SPECIAL_HOLIDAY", "CHRISTMAS_EVE" -> 150;
      default -> 0;
    };
  }

  private static BigDecimal amount(int minutes, BigDecimal wage, BigDecimal percent) {
    return wage.multiply(percent).multiply(BigDecimal.valueOf(minutes))
      .divide(BigDecimal.valueOf(6000), 2, RoundingMode.HALF_UP);
  }

  private AllowanceCalculationEntity calculation(WorkTimeSegmentEntity segment, WageRateEntity wage, AllowanceRateEntity rate) {
    BigDecimal base = wage.sfnApprovedHourlyBaseEur != null ? wage.sfnApprovedHourlyBaseEur : wage.grossHourlyEur;
    if (base == null || base.signum() <= 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu đơn giá giờ đã duyệt để tính SFN.");
    var row = new AllowanceCalculationEntity();
    row.segmentId = segment.segmentId;
    row.timesheetId = segment.timesheetId;
    row.employeeId = segment.employeeId;
    row.allowanceCode = rate.allowanceCode;
    row.allowanceRateId = rate.allowanceRateId;
    row.wageRateId = wage.wageRateId;
    row.baseWageEur = base;
    row.ratePercent = rate.paymentPercent;
    row.taxExemptPercent = BigDecimal.valueOf(taxLimit(rate.allowanceCode));
    row.paidAmountEur = amount(segment.payableMinutes, base, row.ratePercent);
    row.taxExemptAmountEur = row.paidAmountEur.min(amount(segment.payableMinutes, base.min(TAX_EXEMPT_BASE_CAP), row.taxExemptPercent));
    row.taxableAmountEur = row.paidAmountEur.subtract(row.taxExemptAmountEur);
    row.socialInsuranceExemptAmountEur = row.taxExemptAmountEur.min(amount(segment.payableMinutes, base.min(SV_EXEMPT_BASE_CAP), row.taxExemptPercent));
    row.calculationStatus = "CALCULATED";
    row.calculationTraceJson = """
      {"classification":"ESTG_3B_V2","rateId":%d,"wageId":%d,"minutes":%d,"taxBaseCap":50,"socialBaseCap":25}
      """.formatted(rate.allowanceRateId, wage.wageRateId, segment.payableMinutes).strip();
    return row;
  }

  public TimesheetAllowanceBreakdownDto calculateAllowancesForTimesheet(Long id) {
    var ts = timesheet(id, LockModeType.PESSIMISTIC_WRITE);
    if (Boolean.TRUE.equals(ts.isLocked) || !"APPROVED".equals(ts.status))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ tính phụ cấp cho bảng công đã duyệt và chưa khóa.");
    return compute(ts, true);
  }

  public TimesheetAllowanceBreakdownDto getTimesheetAllowance(Long id) {
    return read(timesheet(id, LockModeType.NONE));
  }

  private AttendanceTimesheetEntity timesheet(Long id, LockModeType lock) {
    var ts = em.find(AttendanceTimesheetEntity.class, id, lock);
    if (ts == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng công.");
    return ts;
  }

  private TimesheetAllowanceBreakdownDto compute(AttendanceTimesheetEntity ts, boolean save) {
    ZoneId zone = zone(ts);
    var segments = splitWorkTimeSegments(ts, zone);
    if (save) {
      em.createQuery("delete from AllowanceCalculationEntity a where a.timesheetId=:id").setParameter("id", ts.timesheetId).executeUpdate();
      em.createQuery("delete from WorkTimeSegmentEntity s where s.timesheetId=:id").setParameter("id", ts.timesheetId).executeUpdate();
    }
    var results = new ArrayList<SegmentCalculationDto>();
    var branch = em.find(Domain.Branch.class, ts.branchId);
    Map<LocalDate, Map<String, AllowanceRateEntity>> rateCache = new HashMap<>();
    Map<LocalDate, WageRateEntity> wageCache = new HashMap<>();
    for (var segment : segments) {
      if (save) em.persist(segment);
      var day = segment.segmentStartUtc.atZone(zone).toLocalDate();
      var dayCodes = dayCodes(segment, zone);
      if (!segment.isNight && dayCodes.isEmpty()) continue;
      var rates = rateCache.computeIfAbsent(day, d -> rates(branch.legalEntityId, d));
      var applicable = new ArrayList<AllowanceRateEntity>();
      if (segment.isNight) {
        var night = rates.get(segment.isDeepNight ? "DEEP_NIGHT" : "NIGHT");
        if (night == null && segment.isDeepNight) night = rates.get("NIGHT");
        if (night != null) applicable.add(night);
      }
      dayCodes.stream().map(rates::get).filter(Objects::nonNull)
        .max(Comparator.comparing((AllowanceRateEntity r) -> r.paymentPercent).thenComparingInt(r -> taxLimit(r.allowanceCode)))
        .ifPresent(applicable::add);
      var rows = applicable.stream().filter(rate -> rate.paymentPercent.signum() > 0)
        .map(rate -> calculation(segment, wageCache.computeIfAbsent(day, d -> wage(ts.employeeId, d)), rate)).toList();
      if (save) rows.forEach(em::persist);
      if (!rows.isEmpty()) results.add(toDto(segment, rows, zone));
    }
    if (save) {
      ts.recalculationRequired = false;
      ts.updatedAtUtc = Instant.now();
    }
    int minutes = segments.stream().mapToInt(s -> s.payableMinutes).sum();
    return breakdown(ts, zone, minutes, results, null);
  }

  private TimesheetAllowanceBreakdownDto read(AttendanceTimesheetEntity ts) {
    var saved = em.createQuery("""
      select s from WorkTimeSegmentEntity s where s.timesheetId=:id and s.classificationVersion='ESTG_3B_V2'
      order by s.segmentStartUtc
      """, WorkTimeSegmentEntity.class).setParameter("id", ts.timesheetId).getResultList();
    if (!saved.isEmpty()) {
      ZoneId zone = zone(ts);
      var rows = em.createQuery("""
        select a from AllowanceCalculationEntity a where a.timesheetId=:id order by a.calculationId
        """, AllowanceCalculationEntity.class).setParameter("id", ts.timesheetId).getResultList();
      var groups = rows.stream().collect(java.util.stream.Collectors.groupingBy(a -> a.segmentId));
      var segments = saved.stream().filter(s -> groups.containsKey(s.segmentId))
        .map(s -> toDto(s, groups.get(s.segmentId), zone)).toList();
      return breakdown(ts, zone, saved.stream().mapToInt(s -> s.payableMinutes).sum(), segments, null);
    }
    if (Boolean.TRUE.equals(ts.isLocked))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công đã khóa và chưa có kết quả SFN theo phiên bản hiện tại.");
    if (!"APPROVED".equals(ts.status))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Bảng công chưa được duyệt.");
    return compute(ts, false);
  }

  private static BigDecimal sum(List<AllowanceCalculationEntity> rows, java.util.function.Function<AllowanceCalculationEntity, BigDecimal> field) {
    return rows.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private static SegmentCalculationDto toDto(WorkTimeSegmentEntity s, List<AllowanceCalculationEntity> rows, ZoneId zone) {
    var trace = rows.stream().map(r -> r.allowanceCode + " " + r.ratePercent.toPlainString() + "% (rate #" + r.allowanceRateId
      + ", wage #" + r.wageRateId + ")").collect(java.util.stream.Collectors.joining(" + "));
    return new SegmentCalculationDto(s.segmentId, s.timesheetId, local(s.segmentStartUtc, zone), local(s.segmentEndUtc, zone),
      s.payableMinutes, s.segmentType, s.isNight, s.isDeepNight, s.isSunday, s.isHoliday, s.isSpecialDay, rows.getFirst().baseWageEur,
      sum(rows, r -> r.ratePercent), sum(rows, r -> r.paidAmountEur), sum(rows, r -> r.taxExemptPercent),
      sum(rows, r -> r.taxExemptAmountEur), sum(rows, r -> r.taxableAmountEur), sum(rows, r -> r.socialInsuranceExemptAmountEur), trace);
  }

  private static String local(Instant instant, ZoneId zone) {
    return instant == null ? "--:--" : instant.atZone(zone).toOffsetDateTime().toString();
  }

  private TimesheetAllowanceBreakdownDto breakdown(AttendanceTimesheetEntity ts, ZoneId zone, int minutes,
      List<SegmentCalculationDto> segments, String issue) {
    var employee = em.find(EmployeeEntity.class, ts.employeeId);
    return new TimesheetAllowanceBreakdownDto(ts.timesheetId, ts.employeeId,
      employee == null ? "#" + ts.employeeId : employee.displayName, employee == null ? "" : employee.employeeCode,
      ts.workDate, local(ts.actualStartUtc, zone), local(ts.actualEndUtc, zone), minutes,
      segments.isEmpty() ? BigDecimal.ZERO : segments.getFirst().baseWageEur(),
      total(segments, SegmentCalculationDto::paidAmountEur), total(segments, SegmentCalculationDto::taxExemptAmountEur),
      total(segments, SegmentCalculationDto::taxableAmountEur), total(segments, SegmentCalculationDto::socialInsuranceExemptAmountEur),
      segments, issue, Boolean.TRUE.equals(ts.isLocked));
  }

  private static <T> BigDecimal total(List<T> list, java.util.function.Function<T, BigDecimal> field) {
    return list.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public BranchAllowanceSummaryDto getBranchAllowanceSummary(String branchId, LocalDate fromDate, LocalDate toDate) {
    LocalDate start = fromDate == null ? LocalDate.now(BERLIN_ZONE).minusDays(30) : fromDate;
    LocalDate end = toDate == null ? LocalDate.now(BERLIN_ZONE) : toDate;
    if (end.isBefore(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng ngày không hợp lệ.");
    var timesheets = em.createQuery("""
      select t from AttendanceTimesheetEntity t where t.branchId=:branch and t.workDate between :start and :end
      and t.status in ('APPROVED','LOCKED') order by t.workDate desc, t.timesheetId desc
      """, AttendanceTimesheetEntity.class).setParameter("branch", branchId)
      .setParameter("start", start).setParameter("end", end).getResultList();
    var results = timesheets.stream().map(ts -> {
      try {
        return read(ts);
      } catch (ResponseStatusException e) {
        if (e.getStatusCode() != HttpStatus.CONFLICT) throw e;
        return breakdown(ts, BERLIN_ZONE, ts.workedMinutes == null ? 0 : ts.workedMinutes, List.of(), e.getReason());
      }
    }).toList();
    return new BranchAllowanceSummaryDto(branchId, start, end, results.size(),
      total(results, TimesheetAllowanceBreakdownDto::totalPaidAmountEur),
      total(results, TimesheetAllowanceBreakdownDto::totalTaxExemptAmountEur),
      total(results, TimesheetAllowanceBreakdownDto::totalTaxableAmountEur),
      total(results, TimesheetAllowanceBreakdownDto::totalSvExemptAmountEur), results);
  }
}
