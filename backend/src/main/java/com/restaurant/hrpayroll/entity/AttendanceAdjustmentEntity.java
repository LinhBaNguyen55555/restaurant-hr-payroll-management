package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "attendance_adjustments")
public class AttendanceAdjustmentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "adjustment_id")
  public Long adjustmentId;

  @Column(name = "timesheet_id", nullable = false)
  public Long timesheetId;

  @Column(name = "change_request_id")
  public Long changeRequestId;

  @Column(name = "adjusted_by_user_id", nullable = false)
  public Long adjustedByUserId;

  @Column(name = "adjusted_at_utc", nullable = false)
  public Instant adjustedAtUtc = Instant.now();

  @Column(name = "old_start_utc")
  public Instant oldStartUtc;

  @Column(name = "new_start_utc")
  public Instant newStartUtc;

  @Column(name = "old_end_utc")
  public Instant oldEndUtc;

  @Column(name = "new_end_utc")
  public Instant newEndUtc;

  @Column(name = "old_break_minutes")
  public Integer oldBreakMinutes;

  @Column(name = "new_break_minutes")
  public Integer newBreakMinutes;

  @Column(name = "reason", nullable = false, length = 500)
  public String reason;
}
