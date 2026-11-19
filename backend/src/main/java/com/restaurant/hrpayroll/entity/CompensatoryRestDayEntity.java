package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
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

  @Column(name = "related_work_date", nullable = false)
  public LocalDate relatedWorkDate;

  @Column(name = "rest_date")
  public LocalDate restDate;

  @Column(name = "rest_kind", nullable = false, length = 30)
  public String restKind; // SUNDAY_COMPENSATION, HOLIDAY_COMPENSATION

  @Column(name = "status", nullable = false, length = 30)
  public String status = "PENDING"; // PENDING, SCHEDULED, COMPLETED

  @Column(name = "policy_reference", length = 180)
  public String policyReference = "ArbZG §11";
}
