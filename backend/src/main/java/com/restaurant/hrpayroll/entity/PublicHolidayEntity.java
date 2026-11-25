package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "public_holidays")
public class PublicHolidayEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "holiday_id")
  public Long holidayId;

  @Column(name = "state_code", nullable = false, length = 2)
  public String stateCode; // BW, BY, BE...

  @Column(name = "municipality_code", length = 40)
  public String municipalityCode;

  @Column(name = "holiday_date", nullable = false)
  public LocalDate holidayDate;

  @Column(name = "holiday_code", nullable = false, length = 60)
  public String holidayCode;

  @Column(name = "holiday_name_de", nullable = false, length = 160)
  public String holidayNameDe;

  @Column(name = "is_statutory", nullable = false)
  public Boolean isStatutory = true;

  @Column(name = "verification_status", nullable = false, length = 25)
  public String verificationStatus = "VERIFIED"; // PENDING_REVIEW, VERIFIED

  @Column(name = "official_source_url", length = 500)
  public String officialSourceUrl;
}
