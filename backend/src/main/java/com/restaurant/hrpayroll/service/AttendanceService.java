package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AttendanceService {

  private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");
  private static final DateTimeFormatter BERLIN_TIME = DateTimeFormatter.ofPattern("HH:mm");

  private static String berlinHHmm(Instant utc) {
    return utc.atZone(BERLIN_ZONE).format(BERLIN_TIME);
  }

  @PersistenceContext
  private EntityManager em;

  private final Access access;

  public AttendanceService(Access access) {
    this.access = access;
  }

  public record AttendanceStatusDto(
    boolean isCheckedIn,
    boolean isOnBreak,
    Long timesheetId,
    Long employeeId,
    String employeeName,
    Instant actualStartUtc,
    Instant breakStartUtc,
    Integer currentBreakMinutes,
    Integer workedMinutes,
    Long currentShiftId,
    String shiftInfo
  ) {}

  public record BreakDto(
    Long breakId,
    String breakType,
    Instant startTimeUtc,
    Instant endTimeUtc,
    Integer durationMinutes
  ) {}

  public record AttendanceExceptionDto(
    Long exceptionId,
    Long timesheetId,
    String exceptionType,
    String severity,
    String descriptionVi,
    String descriptionDe,
    String status,
    String resolutionNotes
  ) {}

  public record TimesheetDto(
    Long timesheetId,
    Long employeeId,
    String employeeName,
    String employeeCode,
    String positionName,
    String branchId,
    Long shiftId,
    LocalDate workDate,
    Instant plannedStartUtc,
    Instant plannedEndUtc,
    Integer plannedBreakMinutes,
    Instant actualStartUtc,
    Instant actualEndUtc,
    Integer actualBreakMinutes,
    Integer workedMinutes,
    Integer lateMinutes,
    Integer earlyDepartureMinutes,
    Integer overtimeMinutes,
    String status,
    Boolean hasException,
    Boolean isLocked,
    List<BreakDto> breaks,
    List<AttendanceExceptionDto> exceptions
  ) {}

  public AttendanceStatusDto getStatus(Long employeeId) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    if (emp == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ nhân viên");
    }

    List<AttendanceTimesheetEntity> openSheets = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.actualStartUtc IS NOT NULL AND t.actualEndUtc IS NULL ORDER BY t.timesheetId DESC",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .setMaxResults(1)
    .getResultList();

    AttendanceTimesheetEntity activeTs = openSheets.isEmpty() ? null : openSheets.get(0);

    boolean isCheckedIn = (activeTs != null);
    boolean isOnBreak = false;
    Instant breakStart = null;
    Integer currentBreakMins = 0;

    if (isCheckedIn) {
      List<BreakRecordEntity> openBreaks = em.createQuery(
        "SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e AND b.endTimeUtc IS NULL ORDER BY b.breakId DESC",
        BreakRecordEntity.class
      )
      .setParameter("e", employeeId)
      .getResultList();

      if (!openBreaks.isEmpty()) {
        isOnBreak = true;
        breakStart = openBreaks.get(0).startTimeUtc;
        currentBreakMins = (int) Duration.between(breakStart, Instant.now()).toMinutes();
      }
    }

    // Find shift info if any
    String shiftInfo = null;
    Long shiftId = (activeTs != null) ? activeTs.shiftId : null;
    if (shiftId != null) {
      ShiftScheduleEntity s = em.find(ShiftScheduleEntity.class, shiftId);
      if (s != null) {
        shiftInfo = berlinHHmm(s.plannedStartUtc) + " - " + berlinHHmm(s.plannedEndUtc);
      }
    }

    int workedMins = 0;
    if (activeTs != null && activeTs.actualStartUtc != null) {
      long totalSinceStart = Duration.between(activeTs.actualStartUtc, Instant.now()).toMinutes();
      int totalBreaks = (activeTs.actualBreakMinutes != null ? activeTs.actualBreakMinutes : 0) + currentBreakMins;
      workedMins = Math.max(0, (int) totalSinceStart - totalBreaks);
    }

    return new AttendanceStatusDto(
      isCheckedIn,
      isOnBreak,
      activeTs != null ? activeTs.timesheetId : null,
      emp.employeeId,
      emp.displayName,
      activeTs != null ? activeTs.actualStartUtc : null,
      breakStart,
      currentBreakMins,
      workedMins,
      shiftId,
      shiftInfo
    );
  }

  public AttendanceTimesheetEntity checkIn(Long employeeId, String source, String ipAddress, String deviceInfo, String notes) {
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    if (emp == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên ID #" + employeeId);
    }

    Instant now = Instant.now();
    LocalDate today = LocalDate.now(BERLIN_ZONE);

    // Check if already checked in and hasn't checked out
    List<AttendanceTimesheetEntity> activeList = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.actualStartUtc IS NOT NULL AND t.actualEndUtc IS NULL",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (!activeList.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn đang trong ca làm việc, vui lòng Check-out trước!");
    }

    // Try to match a scheduled shift for today within +/- 3 hours
    Instant searchStart = now.minus(Duration.ofHours(3));
    Instant searchEnd = now.plus(Duration.ofHours(3));

    List<ShiftScheduleEntity> shifts = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE s.employeeId = :e AND s.plannedStartUtc BETWEEN :start AND :end AND s.status = 'PUBLISHED' ORDER BY s.plannedStartUtc ASC",
      ShiftScheduleEntity.class
    )
    .setParameter("e", employeeId)
    .setParameter("start", searchStart)
    .setParameter("end", searchEnd)
    .getResultList();

    ShiftScheduleEntity matchedShift = shifts.isEmpty() ? null : shifts.get(0);

    // 1. Record immutable raw event
    AttendanceEventEntity event = new AttendanceEventEntity();
    event.employeeId = employeeId;
    event.shiftId = matchedShift != null ? matchedShift.shiftId : null;
    event.eventType = "CHECK_IN";
    event.eventTimeUtc = now;
    event.source = source != null ? source : "WEB_PORTAL";
    event.ipAddress = ipAddress;
    event.deviceInfo = deviceInfo;
    event.notes = notes;
    em.persist(event);

    // 2. Create or initialize timesheet
    AttendanceTimesheetEntity ts = new AttendanceTimesheetEntity();
    ts.employeeId = employeeId;
    var assignments = access.assignments(employeeId, today);
    ts.branchId = matchedShift != null ? matchedShift.branchId : assignments.stream()
      .map(a -> a.branchId).distinct().reduce((first, second) -> {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Cần có ca đã công bố khi làm việc tại nhiều chi nhánh.");
      }).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Chưa có phân công chi nhánh hiệu lực."));
    ts.shiftId = matchedShift != null ? matchedShift.shiftId : null;
    ts.workDate = matchedShift == null ? today : matchedShift.plannedStartUtc.atZone(BERLIN_ZONE).toLocalDate();
    ts.actualStartUtc = now;
    ts.status = "OPEN";
    em.persist(ts);

    if (matchedShift != null) {
      ts.plannedStartUtc = matchedShift.plannedStartUtc;
      ts.plannedEndUtc = matchedShift.plannedEndUtc;
      ts.plannedBreakMinutes = matchedShift.plannedBreakMinutes != null ? matchedShift.plannedBreakMinutes : 30;

      // Check Late Arrival
      if (now.isAfter(matchedShift.plannedStartUtc)) {
        long late = Duration.between(matchedShift.plannedStartUtc, now).toMinutes();
        ts.lateMinutes = (int) late;
        if (late > 15) {
          ts.hasException = true;
          createException(ts, employeeId, "LATE_ARRIVAL", "WARNING",
            "Đi muộn " + late + " phút so với ca phân công (" + berlinHHmm(matchedShift.plannedStartUtc) + ")",
            "Verspätung von " + late + " Minuten gegenüber Dienstplan");
        }
      }
    } else {
      ts.hasException = true;
      createException(ts, employeeId, "UNSCHEDULED_WORK", "INFO",
        "Chấm công vào ca ngoài lịch xếp trước",
        "Einsatz ohne vorherige Dienstplanung");
    }

    return ts;
  }

  public AttendanceTimesheetEntity checkOut(Long employeeId, String source, String notes) {
    em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    Instant now = Instant.now();

    List<AttendanceTimesheetEntity> activeList = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.actualStartUtc IS NOT NULL AND t.actualEndUtc IS NULL ORDER BY t.timesheetId DESC",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (activeList.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn chưa thực hiện Check-in ca làm việc!");
    }

    AttendanceTimesheetEntity ts = activeList.get(0);

    // Close any running break
    List<BreakRecordEntity> openBreaks = em.createQuery(
      "SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e AND b.endTimeUtc IS NULL",
      BreakRecordEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    for (BreakRecordEntity b : openBreaks) {
      b.endTimeUtc = now;
      b.durationMinutes = (int) Duration.between(b.startTimeUtc, now).toMinutes();
      ts.actualBreakMinutes = (ts.actualBreakMinutes != null ? ts.actualBreakMinutes : 0) + b.durationMinutes;
    }

    // 1. Record immutable raw event
    AttendanceEventEntity event = new AttendanceEventEntity();
    event.employeeId = employeeId;
    event.shiftId = ts.shiftId;
    event.eventType = "CHECK_OUT";
    event.eventTimeUtc = now;
    event.source = source != null ? source : "WEB_PORTAL";
    event.notes = notes;
    em.persist(event);

    // 2. Complete timesheet
    ts.actualEndUtc = now;
    long totalMinutes = Duration.between(ts.actualStartUtc, now).toMinutes();
    int breakMins = ts.actualBreakMinutes != null ? ts.actualBreakMinutes : 0;
    int workedMins = Math.max(0, (int) totalMinutes - breakMins);
    ts.workedMinutes = workedMins;

    // Check Early Departure / Overtime against planned shift
    if (ts.plannedEndUtc != null) {
      if (now.isBefore(ts.plannedEndUtc)) {
        long early = Duration.between(now, ts.plannedEndUtc).toMinutes();
        ts.earlyDepartureMinutes = (int) early;
        if (early > 15) {
          ts.hasException = true;
          createException(ts, employeeId, "EARLY_DEPARTURE", "WARNING",
            "Rời ca sớm " + early + " phút so với ca kế hoạch (" + berlinHHmm(ts.plannedEndUtc) + ")",
            "Vorzeitiges Verlassen der Schicht um " + early + " Minuten");
        }
      } else {
        long ot = Duration.between(ts.plannedEndUtc, now).toMinutes();
        ts.overtimeMinutes = (int) ot;
      }
    }

    applyArbZgChecks(ts, employeeId, workedMins, breakMins);

    ts.status = "PENDING_APPROVAL";
    ts.updatedAtUtc = now;
    return ts;
  }

  private void applyArbZgChecks(AttendanceTimesheetEntity ts, Long employeeId, int workedMins, int breakMins) {
    // Check ArbZG §4 - Break compliance
    if (workedMins > 360 && workedMins <= 540 && breakMins < 30) { // > 6h must have >= 30m
      ts.hasException = true;
      createException(ts, employeeId, "INSUFFICIENT_BREAK", "WARNING",
        "Vi phạm ArbZG §4: Ca làm việc trên 6 giờ phải nghỉ tối thiểu 30 phút (thực tế nghỉ " + breakMins + " phút)",
        "Verstoß ArbZG §4: Bei mehr als 6 Stunden Arbeit mindestens 30 Minuten Ruhepause erforderlich");
    }
    if (workedMins > 540 && breakMins < 45) { // > 9h must have >= 45m
      ts.hasException = true;
      createException(ts, employeeId, "INSUFFICIENT_BREAK", "WARNING",
        "Vi phạm ArbZG §4: Ca làm việc trên 9 giờ phải nghỉ tối thiểu 45 phút (thực tế nghỉ " + breakMins + " phút)",
        "Verstoß ArbZG §4: Bei mehr als 9 Stunden Arbeit mindestens 45 Minuten Ruhepause erforderlich");
    }

    // Check ArbZG §3 - Max 10h per day
    if (workedMins > 600) { // 10h
      ts.hasException = true;
      createException(ts, employeeId, "EXCESSIVE_WORK_HOURS", "CRITICAL",
        "Vi phạm ArbZG §3: Tổng giờ làm việc thực tế " + (workedMins / 60.0) + "h vượt quá giới hạn 10 giờ/ngày",
        "Kritischer Verstoß ArbZG §3: Arbeitszeit übersteigt 10 Stunden pro Tag");
    }
  }

  public BreakRecordEntity startBreak(Long employeeId, String breakType) {
    em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    Instant now = Instant.now();

    List<AttendanceTimesheetEntity> activeList = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.actualStartUtc IS NOT NULL AND t.actualEndUtc IS NULL",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (activeList.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn phải Check-in vào ca trước khi bấm nghỉ giải lao!");
    }

    List<BreakRecordEntity> openBreaks = em.createQuery(
      "SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e AND b.endTimeUtc IS NULL",
      BreakRecordEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (!openBreaks.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn đang trong thời gian nghỉ giải lao rồi!");
    }

    AttendanceTimesheetEntity ts = activeList.get(0);

    BreakRecordEntity br = new BreakRecordEntity();
    br.employeeId = employeeId;
    br.shiftId = ts.shiftId;
    br.breakType = (breakType != null && !breakType.isBlank()) ? breakType : "STATUTORY_BREAK";
    br.startTimeUtc = now;
    em.persist(br);
    return br;
  }

  public BreakRecordEntity endBreak(Long employeeId) {
    em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    Instant now = Instant.now();

    List<BreakRecordEntity> openBreaks = em.createQuery(
      "SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e AND b.endTimeUtc IS NULL",
      BreakRecordEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (openBreaks.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có phiên nghỉ giải lao nào đang diễn ra!");
    }

    BreakRecordEntity br = openBreaks.get(0);
    br.endTimeUtc = now;
    int mins = (int) Duration.between(br.startTimeUtc, now).toMinutes();
    br.durationMinutes = Math.max(0, mins);

    // Update timesheet
    List<AttendanceTimesheetEntity> activeList = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.actualStartUtc IS NOT NULL AND t.actualEndUtc IS NULL",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .getResultList();

    if (!activeList.isEmpty()) {
      AttendanceTimesheetEntity ts = activeList.get(0);
      ts.actualBreakMinutes = (ts.actualBreakMinutes != null ? ts.actualBreakMinutes : 0) + br.durationMinutes;
      ts.updatedAtUtc = now;
    }

    return br;
  }

  public List<TimesheetDto> getMyTimesheets(Long employeeId, LocalDate from, LocalDate to) {
    LocalDate start = (from != null) ? from : LocalDate.now(BERLIN_ZONE).minusDays(30);
    LocalDate end = (to != null) ? to : LocalDate.now(BERLIN_ZONE).plusDays(1);

    List<AttendanceTimesheetEntity> list = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.employeeId = :e AND t.workDate BETWEEN :s AND :eDate ORDER BY t.workDate DESC, t.timesheetId DESC",
      AttendanceTimesheetEntity.class
    )
    .setParameter("e", employeeId)
    .setParameter("s", start)
    .setParameter("eDate", end)
    .getResultList();

    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    String empName = emp != null ? emp.displayName : "Nhân viên #" + employeeId;
    String empCode = emp != null ? emp.employeeCode : "E-";
    String posName = null;

    return list.stream().map(t -> toDto(t, empName, empCode, posName)).toList();
  }

  public List<TimesheetDto> getBranchTimesheets(String branchId, LocalDate from, LocalDate to) {
    LocalDate start = (from != null) ? from : LocalDate.now(BERLIN_ZONE).minusDays(7);
    LocalDate end = (to != null) ? to : LocalDate.now(BERLIN_ZONE).plusDays(1);

    List<AttendanceTimesheetEntity> list = em.createQuery(
      "SELECT t FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate BETWEEN :s AND :eDate ORDER BY t.workDate DESC, t.actualStartUtc DESC",
      AttendanceTimesheetEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("s", start)
    .setParameter("eDate", end)
    .getResultList();

    Map<Long, EmployeeEntity> empMap = new HashMap<>();
    return list.stream().map(t -> {
      EmployeeEntity emp = empMap.computeIfAbsent(t.employeeId, id -> em.find(EmployeeEntity.class, id));
      String name = emp != null ? emp.displayName : "Nhân viên #" + t.employeeId;
      String code = emp != null ? emp.employeeCode : "E-";
      String pos = access.positionName(t.employeeId, t.branchId, t.workDate);
      return toDto(t, name, code, access.positionName(t.employeeId, t.branchId, t.workDate));
    }).toList();
  }

  public AttendanceTimesheetEntity addManualEntry(
    String branchId,
    Long employeeId,
    LocalDate workDate,
    Instant startUtc,
    Instant endUtc,
    Integer breakMinutes,
    Instant breakStartUtc,
    String reason,
    String authorUserId
  ) {
    if (reason == null || reason.trim().length() < 5) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bắt buộc phải nhập lý do bổ sung giờ công hợp lệ (tối thiểu 5 ký tự)!");
    }
    if (startUtc == null || endUtc == null || !endUtc.isAfter(startUtc)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời gian bắt đầu và kết thúc không hợp lệ!");
    }

    int breakMins = breakMinutes == null ? 0 : breakMinutes;
    long totalMins = Duration.between(startUtc, endUtc).toMinutes();
    LocalDate effectiveWorkDate = (workDate != null) ? workDate : startUtc.atZone(BERLIN_ZONE).toLocalDate();
    if (breakMins < 0 || breakMins >= totalMins || totalMins > 24 * 60
      || !startUtc.atZone(BERLIN_ZONE).toLocalDate().equals(effectiveWorkDate)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày làm việc hoặc thời lượng nghỉ không hợp lệ.");
    }
    Long lockedPeriod = em.createQuery(
      "SELECT COUNT(t) FROM AttendanceTimesheetEntity t WHERE t.branchId = :b AND t.workDate >= :d AND t.isLocked = TRUE",
      Long.class
    ).setParameter("b", branchId).setParameter("d", effectiveWorkDate).getSingleResult();
    if (lockedPeriod > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Kỳ công đến ngày này đã được chốt khóa, không thể bổ sung thủ công!");
    }
    em.find(EmployeeEntity.class, employeeId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    Long overlap = em.createQuery("""
      select count(t) from AttendanceTimesheetEntity t where t.employeeId=:employee
      and t.actualStartUtc<:end and (t.actualEndUtc is null or t.actualEndUtc>:start)
      """, Long.class).setParameter("employee", employeeId).setParameter("start", startUtc)
      .setParameter("end", endUtc).getSingleResult();
    if (overlap > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Khoảng giờ đã có bảng công.");
    Instant breakEndUtc = breakStartUtc == null ? null : breakStartUtc.plus(Duration.ofMinutes(breakMins));
    if (breakStartUtc != null && (breakMins == 0 || breakStartUtc.isBefore(startUtc) || breakEndUtc.isAfter(endUtc)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng nghỉ phải nằm trong giờ làm việc.");
    int workedMins = (int) totalMins - breakMins;

    AttendanceTimesheetEntity ts = new AttendanceTimesheetEntity();
    ts.employeeId = employeeId;
    ts.branchId = branchId;
    ts.workDate = effectiveWorkDate;
    ts.actualStartUtc = startUtc;
    ts.actualEndUtc = endUtc;
    ts.actualBreakMinutes = breakMins;
    ts.workedMinutes = workedMins;
    ts.status = "PENDING_APPROVAL";
    ts.hasException = false;
    em.persist(ts);
    em.flush();
    applyArbZgChecks(ts, employeeId, workedMins, breakMins);

    if (breakStartUtc != null) {
      var pause = new BreakRecordEntity();
      pause.employeeId = employeeId;
      pause.breakType = "MANUAL_BREAK";
      pause.startTimeUtc = breakStartUtc;
      pause.endTimeUtc = breakEndUtc;
      pause.durationMinutes = breakMins;
      em.persist(pause);
    }

    // Save adjustment log
    AttendanceAdjustmentEntity adj = new AttendanceAdjustmentEntity();
    adj.timesheetId = ts.timesheetId;
    adj.adjustedByUserId = authorUserId;
    adj.newStartUtc = startUtc;
    adj.newEndUtc = endUtc;
    adj.newBreakMinutes = breakMins;
    adj.reason = "Bổ sung thủ công: " + reason;
    em.persist(adj);

    return ts;
  }

  private void createException(AttendanceTimesheetEntity ts, Long employeeId, String type, String severity, String vi, String de) {
    AttendanceExceptionEntity exc = new AttendanceExceptionEntity();
    exc.timesheetId = ts.timesheetId;
    exc.employeeId = employeeId;
    exc.exceptionType = type;
    exc.severity = severity;
    exc.descriptionVi = vi;
    exc.descriptionDe = de;
    exc.status = "OPEN";
    em.persist(exc);
  }

  private TimesheetDto toDto(AttendanceTimesheetEntity t, String empName, String empCode, String posName) {
    List<BreakDto> breaks = em.createQuery(
      "SELECT b FROM BreakRecordEntity b WHERE b.employeeId = :e AND b.startTimeUtc >= :s AND b.startTimeUtc < :end ORDER BY b.startTimeUtc ASC",
      BreakRecordEntity.class
    )
    .setParameter("e", t.employeeId)
    .setParameter("s", t.actualStartUtc == null ? t.workDate.atStartOfDay(BERLIN_ZONE).toInstant() : t.actualStartUtc)
    .setParameter("end", t.actualEndUtc == null ? Instant.now() : t.actualEndUtc)
    .getResultList()
    .stream()
    .map(b -> new BreakDto(b.breakId, b.breakType, b.startTimeUtc, b.endTimeUtc, b.durationMinutes))
    .toList();

    List<AttendanceExceptionDto> exceptions = em.createQuery(
      "SELECT x FROM AttendanceExceptionEntity x WHERE x.timesheetId = :ts ORDER BY x.exceptionId ASC",
      AttendanceExceptionEntity.class
    )
    .setParameter("ts", t.timesheetId)
    .getResultList()
    .stream()
    .map(x -> new AttendanceExceptionDto(x.exceptionId, x.timesheetId, x.exceptionType, x.severity, x.descriptionVi, x.descriptionDe, x.status, x.resolutionNotes))
    .toList();

    return new TimesheetDto(
      t.timesheetId,
      t.employeeId,
      empName,
      empCode,
      posName,
      t.branchId,
      t.shiftId,
      t.workDate,
      t.plannedStartUtc,
      t.plannedEndUtc,
      t.plannedBreakMinutes,
      t.actualStartUtc,
      t.actualEndUtc,
      t.actualBreakMinutes,
      t.workedMinutes,
      t.lateMinutes,
      t.earlyDepartureMinutes,
      t.overtimeMinutes,
      t.status,
      t.hasException,
      t.isLocked,
      breaks,
      exceptions
    );
  }
}
