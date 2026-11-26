package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employees")
public class EmployeeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "employee_id")
  public Long employeeId;

  @Column(name = "employee_code", nullable = false, unique = true, length = 30)
  public String employeeCode;

  @Column(name = "legal_entity_id", nullable = false)
  public String legalEntityId;

  @Column(name = "first_name", nullable = false, length = 100)
  public String firstName;

  @Column(name = "last_name", nullable = false, length = 100)
  public String lastName;

  @Column(name = "display_name", nullable = false, length = 180)
  public String displayName;

  @Column(name = "date_of_birth")
  public LocalDate dateOfBirth;

  @Column(name = "email", unique = true, length = 180)
  public String email;

  @Column(name = "hire_date", nullable = false)
  public LocalDate hireDate;

  @Column(name = "termination_date")
  public LocalDate terminationDate;

  @Column(name = "employment_status", nullable = false, length = 25)
  public String employmentStatus = "ACTIVE";

  @Column(name = "created_at_utc")
  public Instant createdAtUtc = Instant.now();
}
