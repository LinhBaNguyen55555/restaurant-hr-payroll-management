package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class LaborLawChecker {

  @PersistenceContext
  private EntityManager em;

  public record Violation(
    String code,
    String severity, // BLOCKER or WARNING
    String messageVi,
    String messageDe,
    String legalBasis,
    Long employeeId,
    Long shiftId
  ) {}

  public record CheckSummary(
    boolean validForPublish,
    int blockerCount,
    int warningCount,
    List<Violation> violations
  ) {}

  /**
   * Run full German labor law check on all shifts in a branch within a given period.
   */
  public CheckSummary validateSchedule(Long branchId, Instant startUtc, Instant endUtc) {
    List<ShiftScheduleEntity> shifts = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE s.branchId = :b AND s.plannedStartUtc >= :start AND s.plannedEndUtc <= :end AND s.status != 'CANCELLED' ORDER BY s.plannedStartUtc",
      ShiftScheduleEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("start", startUtc)
    .setParameter("end", endUtc)
    .getResultList();

    List<Violation> violations = new ArrayList<>();

    // Group shifts by employee
    Map<Long, List<ShiftScheduleEntity>> byEmp = new HashMap<>();
    for (ShiftScheduleEntity s : shifts) {
      byEmp.computeIfAbsent(s.employeeId, k -> new ArrayList<>()).add(s);
    }

    for (Map.Entry<Long, List<ShiftScheduleEntity>> entry : byEmp.entrySet()) {
      Long empId = entry.getKey();
      List<ShiftScheduleEntity> empShifts = entry.getValue();
      EmployeeEntity emp = em.find(EmployeeEntity.class, empId);

      // Check each shift individually
      for (int i = 0; i < empShifts.size(); i++) {
        ShiftScheduleEntity curr = empShifts.get(i);
        validateSingleShift(curr, emp, violations);

        // Check consecutive shift intervals
        for (int j = i + 1; j < empShifts.size(); j++) {
          ShiftScheduleEntity next = empShifts.get(j);
          validateShiftPair(curr, next, emp, violations);
        }
      }
    }

    int blockers = (int) violations.stream().filter(v -> "BLOCKER".equals(v.severity())).count();
    int warnings = (int) violations.stream().filter(v -> "WARNING".equals(v.severity())).count();

    return new CheckSummary(blockers == 0, blockers, warnings, violations);
  }

  /**
   * Validate a single shift against ArbZG §3, §4, JArbSchG, MuSchG, Sunday/Holiday.
   */
  public void validateSingleShift(ShiftScheduleEntity shift, EmployeeEntity emp, List<Violation> violations) {
    long durationMinutes = ChronoUnit.MINUTES.between(shift.plannedStartUtc, shift.plannedEndUtc);
    int breakMinutes = shift.plannedBreakMinutes != null ? shift.plannedBreakMinutes : 0;
    long netWorkMinutes = Math.max(0, durationMinutes - breakMinutes);

    // ArbZG §3: Max 10 hours daily work
    if (netWorkMinutes > 600) {
      violations.add(new Violation(
        "ARBZG_MAX_HOURS_EXCEEDED",
        "BLOCKER",
        "Thời giờ làm việc (" + (netWorkMinutes / 60.0) + "h) vượt quá giới hạn tối đa 10 giờ/ngày theo Luật Lao động Đức.",
        "Tägliche Arbeitszeit (" + (netWorkMinutes / 60.0) + "h) überschreitet die gesetzliche Höchstgrenze von 10 Stunden.",
        "ArbZG §3",
        shift.employeeId,
        shift.shiftId
      ));
    } else if (netWorkMinutes > 480) {
      violations.add(new Violation(
        "ARBZG_HOURS_OVER_8",
        "WARNING",
        "Thời giờ làm việc (" + (netWorkMinutes / 60.0) + "h) vượt 8 giờ. Phải bảo đảm mức trung bình 8 giờ/ngày trong vòng 6 tháng.",
        "Arbeitszeit überschreitet 8 Stunden. Ausgleich auf durchschnittlich 8 Stunden innerhalb von 6 Monaten erforderlich.",
        "ArbZG §3",
        shift.employeeId,
        shift.shiftId
      ));
    }

    // ArbZG §4: Mandatory rest breaks
    if (netWorkMinutes >= 360 && netWorkMinutes < 540 && breakMinutes < 30) {
      violations.add(new Violation(
        "ARBZG_BREAK_INSUFFICIENT_30",
        "WARNING",
        "Ca làm việc từ 6 đến 9 giờ phải có thời gian nghỉ tối thiểu 30 phút (hiện tại: " + breakMinutes + " phút).",
        "Bei einer Arbeitszeit von 6 bis 9 Stunden ist eine Ruhepause von mindestens 30 Minuten vorgeschrieben.",
        "ArbZG §4",
        shift.employeeId,
        shift.shiftId
      ));
    } else if (netWorkMinutes >= 540 && breakMinutes < 45) {
      violations.add(new Violation(
        "ARBZG_BREAK_INSUFFICIENT_45",
        "WARNING",
        "Ca làm việc trên 9 giờ phải có thời gian nghỉ tối thiểu 45 phút (hiện tại: " + breakMinutes + " phút).",
        "Bei einer Arbeitszeit von mehr als 9 Stunden ist eine Ruhepause von mindestens 45 Minuten vorgeschrieben.",
        "ArbZG §4",
        shift.employeeId,
        shift.shiftId
      ));
    }

    // Convert to Berlin local time for time-of-day checks
    ZonedDateTime startLocal = shift.plannedStartUtc.atZone(ZoneId.of("Europe/Berlin"));
    ZonedDateTime endLocal = shift.plannedEndUtc.atZone(ZoneId.of("Europe/Berlin"));
    LocalDate shiftDate = startLocal.toLocalDate();

    // Check Sunday / Holiday work under ArbZG §9, §11
    if (startLocal.getDayOfWeek() == DayOfWeek.SUNDAY) {
      violations.add(new Violation(
        "ARBZG_SUNDAY_COMPENSATION",
        "WARNING",
        "Làm việc vào Chủ nhật (" + shiftDate + "). Bắt buộc bố trí ngày nghỉ bù trong vòng 2 tuần.",
        "Sonntagsarbeit am " + shiftDate + ". Ersatzruhetag innerhalb von 2 Wochen erforderlich.",
        "ArbZG §11 Abs. 3",
        shift.employeeId,
        shift.shiftId
      ));
    }

    // Check Youth Protection (JArbSchG)
    if (emp != null && emp.dateOfBirth != null) {
      int age = Period.between(emp.dateOfBirth, shiftDate).getYears();
      if (age < 18) {
        if (netWorkMinutes > 480) {
          violations.add(new Violation(
            "JARBSCHG_MAX_HOURS",
            "BLOCKER",
            "Lao động chưa đủ 18 tuổi (vị thành niên) không được làm việc quá 8 giờ/ngày.",
            "Jugendliche dürfen nicht mehr als 8 Stunden täglich beschäftigt werden.",
            "JArbSchG §8",
            shift.employeeId,
            shift.shiftId
          ));
        }

        // Night work ban in gastronomy: after 22:00 (or after 20:00 for under 16)
        int endHour = endLocal.getHour();
        int endMinute = endLocal.getMinute();
        boolean crossesMidnight = endLocal.toLocalDate().isAfter(startLocal.toLocalDate());
        if (crossesMidnight || (endHour > 22 || (endHour == 22 && endMinute > 0))) {
          violations.add(new Violation(
            "JARBSCHG_NIGHT_WORK",
            "BLOCKER",
            "JArbSchG: Nghiêm cấm bố trí lao động vị thành niên làm việc sau 22:00 trong ngành nhà hàng.",
            "JArbSchG §14: Nachtarbeitsverbot für Jugendliche nach 22:00 Uhr in der Gastronomie.",
            "JArbSchG §14",
            shift.employeeId,
            shift.shiftId
          ));
        }
      }
    }

    // Check Work Restrictions (e.g. Maternity Protection MuSchG or Medical)
    List<WorkRestrictionEntity> restrictions = em.createQuery(
      "SELECT r FROM WorkRestrictionEntity r WHERE r.employeeId = :e AND r.validFrom <= :d AND (r.validTo IS NULL OR r.validTo >= :d)",
      WorkRestrictionEntity.class
    )
    .setParameter("e", shift.employeeId)
    .setParameter("d", shiftDate)
    .getResultList();

    for (WorkRestrictionEntity r : restrictions) {
      if ("MATERNITY_PROTECTION".equalsIgnoreCase(r.restrictionType)) {
        // MuSchG §5: Night work ban between 20:00 and 06:00
        int sHour = startLocal.getHour();
        int eHour = endLocal.getHour();
        boolean hasNightWork = (sHour >= 20 || sHour < 6 || eHour > 20 || eHour <= 6 || endLocal.toLocalDate().isAfter(startLocal.toLocalDate()));
        if (hasNightWork && !r.allowNightShift) {
          violations.add(new Violation(
            "MUSCHG_NIGHT_WORK_BAN",
            "BLOCKER",
            "Bảo vệ thai sản (MuSchG): Nghiêm cấm phân công làm việc ban đêm từ 20:00 đến 06:00.",
            "Mutterschutzgesetz (MuSchG §5): Nachtarbeitsverbot zwischen 20:00 und 06:00 Uhr.",
            "MuSchG §5",
            shift.employeeId,
            shift.shiftId
          ));
        }

        // MuSchG §4: Max 8.5 hours daily
        if (netWorkMinutes > 510) {
          violations.add(new Violation(
            "MUSCHG_OVERTIME_BAN",
            "BLOCKER",
            "Bảo vệ thai sản: Không được làm việc quá 8.5 giờ/ngày và nghiêm cấm làm thêm giờ.",
            "MuSchG §4: Höchstarbeitszeit von 8,5 Stunden täglich darf nicht überschritten werden.",
            "MuSchG §4",
            shift.employeeId,
            shift.shiftId
          ));
        }
      }
    }
  }

  /**
   * Validate a pair of shifts for the same employee: check overlapping and minimum rest period.
   */
  public void validateShiftPair(
    ShiftScheduleEntity first,
    ShiftScheduleEntity second,
    EmployeeEntity emp,
    List<Violation> violations
  ) {
    // 1. Check Overlapping Shifts (Trùng ca)
    boolean overlap = first.plannedStartUtc.isBefore(second.plannedEndUtc) &&
                      second.plannedStartUtc.isBefore(first.plannedEndUtc);
    if (overlap) {
      violations.add(new Violation(
        "SHIFT_OVERLAP",
        "BLOCKER",
        "Nhân viên bị phân công 2 ca trùng giờ làm việc.",
        "Mitarbeiter ist für sich überschneidende Schichten eingeteilt.",
        "Betriebliche Vorgabe / ArbZG",
        first.employeeId,
        first.shiftId
      ));
      return;
    }

    // 2. Check Rest Period between consecutive shifts (ArbZG §5: 11h minimum rest)
    ShiftScheduleEntity prior = first.plannedEndUtc.isBefore(second.plannedStartUtc) ? first : second;
    ShiftScheduleEntity latter = prior == first ? second : first;

    long restMinutes = ChronoUnit.MINUTES.between(prior.plannedEndUtc, latter.plannedStartUtc);
    if (restMinutes >= 0 && restMinutes < 1440) { // If within 24 hours of each other
      // Check if employee is under 18 -> 12 hours rest (JArbSchG §11)
      LocalDate shiftDate = prior.plannedEndUtc.atZone(ZoneId.of("Europe/Berlin")).toLocalDate();
      boolean isYouth = emp != null && emp.dateOfBirth != null && Period.between(emp.dateOfBirth, shiftDate).getYears() < 18;
      long requiredRestMinutes = isYouth ? 720 : 660; // 12h for youth, 11h for adults

      if (restMinutes < requiredRestMinutes) {
        double actualRestHours = Math.round((restMinutes / 60.0) * 10.0) / 10.0;
        double requiredHours = requiredRestMinutes / 60.0;
        String law = isYouth ? "JArbSchG §11" : "ArbZG §5";
        violations.add(new Violation(
          "REST_PERIOD_VIOLATION",
          "BLOCKER",
          "Vi phạm thời gian nghỉ giữa 2 ca: Chỉ có " + actualRestHours + "h nghỉ liên tục (quy định tối thiểu " + requiredHours + "h theo " + law + ").",
          "Ruhezeitunterschreitung: Nur " + actualRestHours + "h ununterbrochene Ruhezeit zwischen Schichten (gesetzlich vorgeschrieben mindestens " + requiredHours + "h nach " + law + ").",
          law,
          prior.employeeId,
          latter.shiftId
        ));
      }
    }
  }
}
