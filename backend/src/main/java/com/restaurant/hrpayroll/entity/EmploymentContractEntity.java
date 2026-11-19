package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "employment_contracts")
public class EmploymentContractEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "contract_id")
  public Long contractId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "contract_number", nullable = false, unique = true, length = 60)
  public String contractNumber;

  @Column(name = "contract_type", nullable = false, length = 40)
  public String contractType; // UNLIMITED, FIXED_TERM, PROBATION, MINIJOB

  @Column(name = "pay_type", nullable = false, length = 25)
  public String payType; // HOURLY, MONTHLY

  @Column(name = "start_date", nullable = false)
  public LocalDate startDate;

  @Column(name = "end_date")
  public LocalDate endDate;

  @Column(name = "standard_weekly_minutes", nullable = false)
  public Integer standardWeeklyMinutes; // e.g. 2400 (40h), 1200 (20h), 600 (10h)

  @Column(name = "collective_agreement_reference", length = 160)
  public String collectiveAgreementReference;

  @Column(name = "status", nullable = false, length = 25)
  public String status = "ACTIVE"; // ACTIVE, EXPIRED, TERMINATED
}
