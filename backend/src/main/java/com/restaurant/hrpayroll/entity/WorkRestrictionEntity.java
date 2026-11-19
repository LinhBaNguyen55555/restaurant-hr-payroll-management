package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "work_restrictions")
public class WorkRestrictionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "restriction_id")
  public Long restrictionId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "restriction_type", nullable = false, length = 50)
  public String restrictionType; // YOUTH_PROTECTION, MATERNITY_PROTECTION, MEDICAL_LIMIT

  @Column(name = "valid_from", nullable = false)
  public LocalDate validFrom;

  @Column(name = "valid_to")
  public LocalDate validTo;

  @Column(name = "max_daily_minutes")
  public Integer maxDailyMinutes; // e.g. 480 (8h), 510 (8.5h)

  @Column(name = "max_weekly_minutes")
  public Integer maxWeeklyMinutes; // e.g. 2400 (40h)

  @Column(name = "allow_night_shift", nullable = false)
  public boolean allowNightShift = false;

  @Column(name = "allow_sunday", nullable = false)
  public boolean allowSunday = false;

  @Column(name = "scheduling_rule_summary", nullable = false, length = 255)
  public String schedulingRuleSummary;

  @Column(name = "confidential_notes", length = 500)
  public String confidentialNotes;

  @Column(name = "created_at_utc")
  public Instant createdAtUtc = Instant.now();
}
