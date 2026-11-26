package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "shift_templates")
public class ShiftTemplateEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "template_id")
  public Long templateId;

  @Column(name = "branch_id", nullable = false)
  public String branchId;

  @Column(name = "template_code", nullable = false, length = 40)
  public String templateCode;

  @Column(name = "template_name", nullable = false, length = 100)
  public String templateName;

  @Column(name = "local_start_time", nullable = false)
  public LocalTime localStartTime;

  @Column(name = "local_end_time", nullable = false)
  public LocalTime localEndTime;

  @Column(name = "ends_next_day", nullable = false)
  public boolean endsNextDay = false;

  @Column(name = "default_break_minutes", nullable = false)
  public Integer defaultBreakMinutes = 30;
}
