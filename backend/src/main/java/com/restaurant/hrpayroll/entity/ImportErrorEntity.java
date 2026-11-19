package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "import_errors")
public class ImportErrorEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "error_id")
  public Long errorId;

  @Column(name = "job_id", nullable = false)
  public Long jobId;

  @Column(name = "line_number", nullable = false)
  public int lineNumber;

  @Column(name = "field_name", length = 100)
  public String fieldName;

  @Column(name = "error_message_vi", nullable = false, length = 255)
  public String errorMessageVi;

  @Column(name = "error_message_de", nullable = false, length = 255)
  public String errorMessageDe;

  @Column(name = "raw_value", length = 255)
  public String rawValue;
}
