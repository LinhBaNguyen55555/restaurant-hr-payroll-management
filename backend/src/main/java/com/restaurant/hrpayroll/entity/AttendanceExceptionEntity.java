package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "attendance_exceptions")
public class AttendanceExceptionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "exception_id")
  public Long exceptionId;

  @Column(name = "timesheet_id", nullable = false)
  public Long timesheetId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "exception_type", nullable = false, length = 50)
  public String exceptionType; // MISSING_CHECK_OUT, UNSCHEDULED_WORK, LATE_ARRIVAL, EARLY_DEPARTURE, INSUFFICIENT_BREAK, EXCESSIVE_WORK_HOURS

  @Column(name = "severity", nullable = false, length = 20)
  public String severity = "WARNING"; // INFO, WARNING, CRITICAL

  @Column(name = "description_vi", nullable = false, length = 255)
  public String descriptionVi;

  @Column(name = "description_de", nullable = false, length = 255)
  public String descriptionDe;

  @Column(name = "status", nullable = false, length = 30)
  public String status = "OPEN"; // OPEN, RESOLVED, DISMISSED

  @Column(name = "resolution_notes", length = 500)
  public String resolutionNotes;

  @Column(name = "resolved_by_user_id", length = 255)
  public String resolvedByUserId;

  @Column(name = "resolved_at_utc")
  public Instant resolvedAtUtc;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
