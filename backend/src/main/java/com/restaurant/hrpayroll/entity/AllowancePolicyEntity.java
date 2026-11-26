package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "allowance_policies")
public class AllowancePolicyEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "policy_id")
  public Long policyId;

  @Column(name = "legal_entity_id", nullable = false)
  public String legalEntityId;

  @Column(name = "policy_code", nullable = false, length = 40)
  public String policyCode;

  @Column(name = "valid_from", nullable = false)
  public LocalDate validFrom;

  @Column(name = "valid_to")
  public LocalDate validTo;

  @Column(name = "approval_status", nullable = false, length = 25)
  public String approvalStatus = "ACTIVE"; // ACTIVE, DRAFT, ARCHIVED

  @Column(name = "approved_by_user_id", length = 255)
  public String approvedByUserId;

  @Column(name = "reference_document", length = 180)
  public String referenceDocument = "SFN-Tarifvertrag / Hausvereinbarung";
}
