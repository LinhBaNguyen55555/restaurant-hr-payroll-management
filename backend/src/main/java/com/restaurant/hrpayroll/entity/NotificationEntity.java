package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class NotificationEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "notification_id")
  public Long notificationId;

  @Column(name = "recipient_user_id", nullable = false)
  public Long recipientUserId;

  @Column(name = "notification_type", nullable = false, length = 50)
  public String notificationType; // SCHEDULE_PUBLISHED, SHIFT_CHANGED, SWAP_REQUESTED, SWAP_APPROVED

  @Column(name = "title", nullable = false, length = 180)
  public String title;

  @Column(name = "message", nullable = false, length = 500)
  public String message;

  @Column(name = "status", nullable = false, length = 20)
  public String status = "UNREAD"; // UNREAD, READ

  @Column(name = "created_at_utc")
  public Instant createdAtUtc = Instant.now();
}
