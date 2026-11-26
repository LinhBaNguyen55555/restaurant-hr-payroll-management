package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "allowance_calculations")
public class AllowanceCalculationEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "calculation_id")
  public Long calculationId;

  @Column(name = "segment_id", nullable = false)
  public Long segmentId;

  @Column(name = "timesheet_id")
  public Long timesheetId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "allowance_rate_id", nullable = false)
  public Long allowanceRateId;

  @Column(name = "tax_rule_id")
  public Long taxRuleId;

  @Column(name = "wage_rate_id", nullable = false)
  public Long wageRateId;

  @Column(name = "allowance_code", nullable = false, length = 50)
  public String allowanceCode = "NIGHT";

  @Column(name = "base_wage_eur", nullable = false, precision = 10, scale = 2)
  public BigDecimal baseWageEur = BigDecimal.ZERO;

  @Column(name = "rate_percent", nullable = false, precision = 7, scale = 3)
  public BigDecimal ratePercent = BigDecimal.ZERO;

  @Column(name = "tax_exempt_percent", nullable = false, precision = 7, scale = 3)
  public BigDecimal taxExemptPercent = BigDecimal.ZERO;

  @Column(name = "paid_amount_eur", nullable = false, precision = 14, scale = 2)
  public BigDecimal paidAmountEur = BigDecimal.ZERO;

  @Column(name = "tax_exempt_amount_eur", precision = 14, scale = 2)
  public BigDecimal taxExemptAmountEur = BigDecimal.ZERO;

  @Column(name = "taxable_amount_eur", precision = 14, scale = 2)
  public BigDecimal taxableAmountEur = BigDecimal.ZERO;

  @Column(name = "social_insurance_exempt_amount_eur", precision = 14, scale = 2)
  public BigDecimal socialInsuranceExemptAmountEur = BigDecimal.ZERO;

  @Column(name = "calculation_status", nullable = false, length = 30)
  public String calculationStatus = "CALCULATED";

  @Column(name = "calculation_trace_json", columnDefinition = "json")
  public String calculationTraceJson;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
