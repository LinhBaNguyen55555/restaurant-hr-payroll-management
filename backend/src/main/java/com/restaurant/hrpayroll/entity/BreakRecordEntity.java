package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "break_records")
public class BreakRecordEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "break_id")
  public Long breakId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "shift_id")
  public Long shiftId;

  @Column(name = "break_type", nullable = false, length = 50)
  public String breakType = "STATUTORY_BREAK"; // STATUTORY_BREAK, LUNCH_BREAK, REST_BREAK

  @Column(name = "start_time_utc", nullable = false)
  public Instant startTimeUtc;

  @Column(name = "end_time_utc")
  public Instant endTimeUtc;

  @Column(name = "duration_minutes", nullable = false)
  public Integer durationMinutes = 0;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
