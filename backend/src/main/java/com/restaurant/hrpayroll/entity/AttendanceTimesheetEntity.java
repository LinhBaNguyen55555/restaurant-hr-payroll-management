package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_timesheets")
public class AttendanceTimesheetEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "timesheet_id")
  public Long timesheetId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "branch_id", nullable = false)
  public String branchId;

  @Column(name = "shift_id")
  public Long shiftId;

  @Column(name = "work_date", nullable = false)
  public LocalDate workDate;

  @Column(name = "planned_start_utc")
  public Instant plannedStartUtc;

  @Column(name = "planned_end_utc")
  public Instant plannedEndUtc;

  @Column(name = "planned_break_minutes", nullable = false)
  public Integer plannedBreakMinutes = 0;

  @Column(name = "actual_start_utc")
  public Instant actualStartUtc;

  @Column(name = "actual_end_utc")
  public Instant actualEndUtc;

  @Column(name = "actual_break_minutes", nullable = false)
  public Integer actualBreakMinutes = 0;

  @Column(name = "worked_minutes", nullable = false)
  public Integer workedMinutes = 0;

  @Column(name = "late_minutes", nullable = false)
  public Integer lateMinutes = 0;

  @Column(name = "early_departure_minutes", nullable = false)
  public Integer earlyDepartureMinutes = 0;

  @Column(name = "overtime_minutes", nullable = false)
  public Integer overtimeMinutes = 0;

  @Column(name = "status", nullable = false, length = 30)
  public String status = "OPEN"; // OPEN, PENDING_APPROVAL, APPROVED, REJECTED, LOCKED

  @Column(name = "has_exception", nullable = false)
  public Boolean hasException = false;

  @Column(name = "approved_by_user_id", length = 255)
  public String approvedByUserId;

  @Column(name = "approved_at_utc")
  public Instant approvedAtUtc;

  @Column(name = "is_locked", nullable = false)
  public Boolean isLocked = false;

  @Column(name = "recalculation_required", nullable = false)
  public Boolean recalculationRequired = false;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();

  @Column(name = "updated_at_utc", nullable = false)
  public Instant updatedAtUtc = Instant.now();
}
