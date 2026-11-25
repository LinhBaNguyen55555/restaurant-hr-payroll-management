package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "work_time_segments")
public class WorkTimeSegmentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "segment_id")
  public Long segmentId;

  @Column(name = "attendance_id", nullable = false)
  public Long attendanceId = 1L; // For legacy compatibility

  @Column(name = "timesheet_id")
  public Long timesheetId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId = 1L;

  @Column(name = "segment_start_utc", nullable = false)
  public Instant segmentStartUtc;

  @Column(name = "segment_end_utc", nullable = false)
  public Instant segmentEndUtc;

  @Column(name = "payable_minutes", nullable = false)
  public Integer payableMinutes = 0;

  @Column(name = "is_night", nullable = false)
  public Boolean isNight = false; // 20:00 - 06:00

  @Column(name = "is_deep_night", nullable = false)
  public Boolean isDeepNight = false; // 00:00 - 04:00 (if shift started before midnight)

  @Column(name = "is_sunday", nullable = false)
  public Boolean isSunday = false; // Sunday 00:00-24:00 and Monday 00:00-04:00 if shift started Sunday

  @Column(name = "is_holiday", nullable = false)
  public Boolean isHoliday = false; // Statutory public holiday

  @Column(name = "is_special_day", nullable = false)
  public Boolean isSpecialDay = false; // 24/12 & 31/12 after 14:00, 01/05, 25/12, 26/12

  @Column(name = "holiday_id")
  public Long holidayId;

  @Column(name = "segment_type", nullable = false, length = 50)
  public String segmentType = "REGULAR"; // REGULAR, NIGHT, DEEP_NIGHT, SUNDAY, HOLIDAY, SPECIAL_DAY

  @Column(name = "classification_version", nullable = false, length = 30)
  public String classificationVersion = "ESTG_3B_2026";

  @Column(name = "calculation_status", nullable = false, length = 25)
  public String calculationStatus = "CALCULATED";

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
