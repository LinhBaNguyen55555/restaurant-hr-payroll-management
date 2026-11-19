package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "wage_rates")
public class WageRateEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "wage_rate_id")
  public Long wageRateId;

  @Column(name = "contract_id", nullable = false)
  public Long contractId;

  @Column(name = "valid_from", nullable = false)
  public LocalDate validFrom;

  @Column(name = "valid_to")
  public LocalDate validTo;

  @Column(name = "gross_hourly_eur", precision = 12, scale = 4)
  public BigDecimal grossHourlyEur;

  @Column(name = "gross_monthly_eur", precision = 14, scale = 2)
  public BigDecimal grossMonthlyEur;

  @Column(name = "sfn_approved_hourly_base_eur", precision = 12, scale = 4)
  public BigDecimal sfnApprovedHourlyBaseEur;

  @Column(name = "currency_code", nullable = false, length = 3)
  public String currencyCode = "EUR";

  @Column(name = "approval_status", nullable = false, length = 30)
  public String approvalStatus = "APPROVED"; // APPROVED, PENDING_REVIEW
}
