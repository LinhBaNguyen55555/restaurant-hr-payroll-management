package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "positions")
public class PositionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "position_id")
  public Long positionId;

  @Column(name = "position_code", nullable = false, unique = true, length = 40)
  public String positionCode;

  @Column(name = "position_name_de", nullable = false, length = 120)
  public String positionNameDe;

  @Column(name = "position_name_en", nullable = false, length = 120)
  public String positionNameEn;

  @Column(name = "is_active", nullable = false)
  public boolean active = true;
}
