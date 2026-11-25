package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "absence_records")
public class SicknessAbsenceEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "absence_id")
  public Long absenceId;

  @Column(name = "employee_id", nullable = false)
  public Long employeeId;

  @Column(name = "leave_type_id", nullable = false)
  public Integer leaveTypeId = 2; // Default 2 for SICK

  @Column(name = "start_date", nullable = false)
  public LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  public LocalDate endDate;

  @Column(name = "verification_status", nullable = false, length = 25)
  public String verificationStatus = "VERIFIED"; // PENDING, VERIFIED, REJECTED

  @Column(name = "has_medical_certificate", nullable = false)
  public Boolean hasMedicalCertificate = false; // eAU / AU-Bescheinigung

  @Column(name = "certificate_date")
  public LocalDate certificateDate;

  @Column(name = "is_continued_pay_eligible", nullable = false)
  public Boolean isContinuedPayEligible = true; // §3 EntgFG (100% pay up to 6 weeks)

  @Column(name = "gross_pay_impact_percent", nullable = false, precision = 5, scale = 2)
  public BigDecimal grossPayImpactPercent = new BigDecimal("100.00");

  @Column(name = "confidential_document_ref", length = 120)
  public String confidentialDocumentRef; // eAU reference ID, no clinical data

  @Column(name = "notes", length = 500)
  public String notes;

  @Column(name = "recorded_by_user_id")
  public Long recordedByUserId;

  @Column(name = "created_at_utc", nullable = false)
  public Instant createdAtUtc = Instant.now();
}
