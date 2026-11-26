package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "compensatory_rest_days")
public class CompensatoryRestDayEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "rest_id")
  public Long restId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "branch_id", nullable = false)
  public String branchId;

  @Column(name = "related_work_date", nullable = false)
  public LocalDate relatedWorkDate;

  @Column(name = "rest_date")
  public LocalDate restDate;

  @Column(name = "deadline_date")
  public LocalDate deadlineDate; // ArbZG §11(3): 2 weeks for Sunday, 8 weeks for Holiday

  @Column(name = "rest_kind", nullable = false, length = 30)
  public String restKind; // SUNDAY_COMPENSATION, HOLIDAY_COMPENSATION

  @Column(name = "status", nullable = false, length = 30)
  public String status = "PENDING"; // PENDING, SCHEDULED, COMPLETED, OVERDUE

  @Column(name = "policy_reference", length = 180)
  public String policyReference = "ArbZG §11";

  @Column(name = "notes", length = 500)
  public String notes;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
