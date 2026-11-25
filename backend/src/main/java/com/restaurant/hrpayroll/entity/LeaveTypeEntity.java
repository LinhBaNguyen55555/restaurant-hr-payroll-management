package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "leave_types")
public class LeaveTypeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "leave_type_id")
  public Integer leaveTypeId;

  @Column(name = "leave_code", nullable = false, unique = true, length = 40)
  public String leaveCode; // ANNUAL, SICK, COMP_REST, UNPAID, OTHER

  @Column(name = "name_de", nullable = false, length = 120)
  public String nameDe;

  @Column(name = "name_vi", length = 120)
  public String nameVi;

  @Column(name = "description", length = 255)
  public String description;

  @Column(name = "pay_treatment", nullable = false, length = 30)
  public String payTreatment = "PAID"; // PAID, REVIEW_REQUIRED, UNPAID

  @Column(name = "counts_against_annual_leave", nullable = false)
  public Boolean countsAgainstAnnualLeave = false;
}
