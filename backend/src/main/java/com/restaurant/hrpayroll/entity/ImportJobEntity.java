package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "import_jobs")
public class ImportJobEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "job_id")
  public Long jobId;

  @Column(name = "file_name", nullable = false)
  public String fileName;

  @Column(name = "job_type", nullable = false, length = 50)
  public String jobType = "EMPLOYEES";

  @Column(name = "total_rows", nullable = false)
  public int totalRows = 0;

  @Column(name = "success_rows", nullable = false)
  public int successRows = 0;

  @Column(name = "error_rows", nullable = false)
  public int errorRows = 0;

  @Column(name = "status", nullable = false, length = 30)
  public String status = "COMPLETED"; // PROCESSING, COMPLETED, FAILED, ROLLED_BACK

  @Column(name = "created_by_user_id", length = 255)
  public String createdByUserId;

  @Column(name = "summary_report", columnDefinition = "TEXT")
  public String summaryReport;

  @Column(name = "created_at_utc")
  public Instant createdAtUtc = Instant.now();
}
