package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "shift_schedules")
public class ShiftScheduleEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "shift_id")
  public Long shiftId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "branch_id", nullable = false)
  public String branchId;

  @Column(name = "template_id")
  public Long templateId;

  @Column(name = "planned_start_utc", nullable = false)
  public Instant plannedStartUtc;

  @Column(name = "planned_end_utc", nullable = false)
  public Instant plannedEndUtc;

  @Column(name = "planned_break_minutes", nullable = false)
  public Integer plannedBreakMinutes = 30;

  @Column(name = "status", nullable = false, length = 25)
  public String status = "DRAFT"; // DRAFT, PUBLISHED, CANCELLED

  @Column(name = "published_at_utc")
  public Instant publishedAtUtc;

  @Column(name = "version_number", nullable = false)
  public Integer versionNumber = 1;
}
