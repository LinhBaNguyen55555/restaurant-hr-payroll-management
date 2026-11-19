package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "shift_swap_requests")
public class ShiftSwapRequestEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "swap_request_id")
  public Long swapRequestId;

  @Column(name = "source_shift_id", nullable = false)
  public Long sourceShiftId;

  @Column(name = "target_employee_id", nullable = false)
  public Long targetEmployeeId;

  @Column(name = "requested_by_employee_id", nullable = false)
  public Long requestedByEmployeeId;

  @Column(name = "reason", length = 500)
  public String reason;

  @Column(name = "status", nullable = false, length = 25)
  public String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

  @Column(name = "reviewed_by_user_id")
  public Long reviewedByUserId;

  @Column(name = "created_at_utc")
  public Instant createdAtUtc = Instant.now();
}
