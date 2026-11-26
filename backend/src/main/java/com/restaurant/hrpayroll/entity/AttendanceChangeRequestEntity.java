package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "attendance_change_requests")
public class AttendanceChangeRequestEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "request_id")
  public Long requestId;

  @Column(name = "timesheet_id", nullable = false)
  public Long timesheetId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "requested_start_utc")
  public Instant requestedStartUtc;

  @Column(name = "requested_end_utc")
  public Instant requestedEndUtc;

  @Column(name = "requested_break_minutes")
  public Integer requestedBreakMinutes;

  @Column(name = "reason", nullable = false, length = 500)
  public String reason;

  @Column(name = "evidence_url", length = 255)
  public String evidenceUrl;

  @Column(name = "delta_minutes", nullable = false)
  public Integer deltaMinutes = 0;

  @Column(name = "requires_hr_escalation", nullable = false)
  public Boolean requiresHrEscalation = false;

  @Column(name = "status", nullable = false, length = 30)
  public String status = "PENDING"; // PENDING, HR_ESCALATED, APPROVED, REJECTED

  @Column(name = "decision_notes", length = 500)
  public String decisionNotes;

  @Column(name = "decided_by_user_id", length = 255)
  public String decidedByUserId;

  @Column(name = "decided_at_utc")
  public Instant decidedAtUtc;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
