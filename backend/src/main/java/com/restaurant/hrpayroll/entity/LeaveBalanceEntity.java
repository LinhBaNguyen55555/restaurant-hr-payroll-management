package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_balances")
public class LeaveBalanceEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "balance_id")
  public Long balanceId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "leave_type_id", nullable = false)
  public Integer leaveTypeId;

  @Column(name = "leave_year", nullable = false)
  public Integer leaveYear;

  @Column(name = "entitled_days", nullable = false, precision = 5, scale = 2)
  public BigDecimal entitledDays = new BigDecimal("20.00");

  @Column(name = "used_days", nullable = false, precision = 5, scale = 2)
  public BigDecimal usedDays = BigDecimal.ZERO;

  @Column(name = "carried_days", nullable = false, precision = 5, scale = 2)
  public BigDecimal carriedDays = BigDecimal.ZERO;

  @Column(name = "remaining_days", nullable = false, precision = 5, scale = 2)
  public BigDecimal remainingDays = new BigDecimal("20.00");

  @Column(name = "approval_status", nullable = false, length = 25)
  public String approvalStatus = "APPROVED"; // APPROVED, PENDING_REVIEW

  @Column(name = "expiry_date")
  public LocalDate expiryDate; // e.g. 2026-03-31 for carried over days (German law)

  @Column(name = "updated_at_utc", nullable = false)
  public Instant updatedAtUtc = Instant.now();
}
