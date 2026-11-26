package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_requests")
public class LeaveRequestEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "leave_request_id")
  public Long leaveRequestId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "leave_type_id", nullable = false)
  public Integer leaveTypeId;

  @Column(name = "start_date", nullable = false)
  public LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  public LocalDate endDate;

  @Column(name = "requested_days", nullable = false, precision = 5, scale = 2)
  public BigDecimal requestedDays = BigDecimal.ONE;

  @Column(name = "reason", length = 600)
  public String reason;

  @Column(name = "status", nullable = false, length = 25)
  public String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

  @Column(name = "reviewed_by_user_id", length = 255)
  public String reviewedByUserId;

  @Column(name = "review_notes", length = 500)
  public String reviewNotes;

  @Column(name = "reviewed_at_utc")
  public Instant reviewedAtUtc;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
