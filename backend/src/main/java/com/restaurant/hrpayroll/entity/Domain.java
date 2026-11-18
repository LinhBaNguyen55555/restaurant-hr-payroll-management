package com.restaurant.hrpayroll.entity;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

public final class Domain {

  private Domain() {}

  @MappedSuperclass
  public abstract static class Row {

    @Id
    public String id = UUID.randomUUID().toString();

    @Version
    public long version;

    public Instant createdAt = Instant.now();
  }

  public enum Role {
    SYSTEM_ADMIN,
    HR_OFFICER,
    RESTAURANT_MANAGER,
    EMPLOYEE,
    PAYROLL_OFFICER,
    FINANCE_APPROVER,
    AUDITOR,
    DPO,
  }

  @Entity(name = "UserAccount")
  @Table(name = "user_accounts")
  public static class UserAccount extends Row {

    @Column(nullable = false, unique = true)
    public String email;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String passwordHash;

    public String roles = "EMPLOYEE";

    @Column(length = 4000)
    public String legalEntityIds = "";

    @Column(length = 4000)
    public String branchIds = "";

    public boolean active = true;
    public boolean mfaEnabled;

    @Column(length = 1024)
    public String mfaSecret;

    public long lastTotpStep = -1;
    public int authVersion;
    public int failures;
    public Instant lockedUntil;
    public Instant lastLogin;
  }

  @Entity(name = "LegalEntity")
  @Table(name = "legal_entities")
  public static class LegalEntity extends Row {

    @Column(nullable = false, unique = true)
    public String code;

    public String name;
    public String registrationNumber;
    public String address;
    public boolean active = true;
  }

  @Entity(name = "Branch")
  @Table(name = "branches")
  public static class Branch extends Row {

    @Column(nullable = false, unique = true)
    public String code;

    public String name;
    public String legalEntityId;
    public String city;
    public String address;
    public String stateCode;
    public String timezone = "Europe/Berlin";
    public boolean active = true;
    public String accent = "mint";
  }

  @Entity(name = "WorkLocation")
  @Table(name = "work_locations")
  public static class WorkLocation extends Row {

    public String branchId;
    public String name;
    public String address;
    public String stateCode;
    public String timezone = "Europe/Berlin";
    public boolean active = true;
  }

  @Entity(name = "EmployeeRef")
  @Table(name = "employee_refs")
  public static class EmployeeRef extends Row {

    public String name;
    public String position;
    public String homeBranchId;
  }

  @Entity(name = "EmployeeAssignment")
  @Table(name = "employee_assignments")
  public static class EmployeeAssignment extends Row {

    public String employeeId;
    public String branchId;
    public String workLocationId;
    public LocalDate validFrom;
    public LocalDate validTo;
    public String kind;

    @Column(length = 500)
    public String reason;

    public String stateCode;
    public String timezone;
    public String addressSnapshot;
  }

  @Entity(name = "ManagerAssignment")
  @Table(name = "manager_assignments")
  public static class ManagerAssignment extends Row {

    public String managerId;
    public String branchId;
    public LocalDate validFrom;
    public LocalDate validTo;
  }

  @Entity(name = "AuditEvent")
  @Table(name = "audit_events")
  public static class AuditEvent extends Row {

    public String actorId;
    public String actorName;
    public String action;
    public String target;
    public String branchId;

    @Column(length = 4000)
    public String detail;
  }

  @Entity(name = "AccountReset")
  @Table(name = "account_resets")
  public static class AccountReset extends Row {

    @Column(unique = true)
    public String tokenHash;

    public String userId;
    public Instant expiresAt;
    public boolean used;
  }

  @Entity(name = "AccountSession")
  @Table(name = "account_sessions")
  public static class AccountSession extends Row {

    public String userId;
    public String sessionHash;
    public String agent;
    public boolean revoked;
    public Instant expiresAt = Instant.now().plusSeconds(1800);
  }

  public static Set<String> csv(String text) {
    return text == null || text.isBlank()
      ? Set.of()
      : new LinkedHashSet<>(Arrays.asList(text.split(",")));
  }

  public static String join(Collection<String> values) {
    return String.join(",", new TreeSet<>(values));
  }
}
