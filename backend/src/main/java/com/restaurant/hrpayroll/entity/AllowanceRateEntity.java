package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "allowance_rates")
public class AllowanceRateEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "allowance_rate_id")
  public Long allowanceRateId;

  @Column(name = "policy_id", nullable = false)
  public Long policyId;

  @Column(name = "allowance_code", nullable = false, length = 50)
  public String allowanceCode; // NIGHT, DEEP_NIGHT, SUNDAY, HOLIDAY, SPECIAL_HOLIDAY, CHRISTMAS_EVE, NEW_YEAR_EVE

  @Column(name = "payment_percent", nullable = false, precision = 7, scale = 3)
  public BigDecimal paymentPercent; // e.g. 25.000, 40.000, 50.000, 100.000, 125.000, 150.000

  @Column(name = "stacking_group", nullable = false, length = 40)
  public String stackingGroup; // NIGHT, DAY

  @Column(name = "stacking_behavior", nullable = false, length = 30)
  public String stackingBehavior; // ADD, MAX_OF_DAY

  @Column(name = "conditions_json", columnDefinition = "json")
  public String conditionsJson;
}
