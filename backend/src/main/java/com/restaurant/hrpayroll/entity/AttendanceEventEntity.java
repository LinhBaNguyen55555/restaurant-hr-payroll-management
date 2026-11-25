package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "attendance_events")
public class AttendanceEventEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "event_id")
  public Long eventId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "shift_id")
  public Long shiftId;

  @Column(name = "event_type", nullable = false, length = 30)
  public String eventType; // CHECK_IN, CHECK_OUT

  @Column(name = "event_time_utc", nullable = false)
  public Instant eventTimeUtc;

  @Column(name = "source", nullable = false, length = 50)
  public String source = "WEB_PORTAL"; // WEB_PORTAL, KIOSK, MOBILE, MANUAL

  @Column(name = "ip_address", length = 45)
  public String ipAddress;

  @Column(name = "device_info", length = 255)
  public String deviceInfo;

  @Column(name = "is_offline_sync", nullable = false)
  public Boolean isOfflineSync = false;

  @Column(name = "notes", length = 500)
  public String notes;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
