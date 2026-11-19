package com.restaurant.hrpayroll.service;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;



import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class Access {

  final Store db;
  final AuthService auth;

  public Access(Store db, AuthService auth) {
    this.db = db;
    this.auth = auth;
  }

  public Set<String> permissions(UserAccount u) {
    Set<String> out = new LinkedHashSet<>();
    for (String role : csv(u.roles))
      switch (Role.valueOf(role)) {
        case SYSTEM_ADMIN -> out.addAll(
          Set.of(
            "org.read",
            "org.write",
            "workforce.read",
            "workforce.write",
            "schedule.read",
            "schedule.write",
            "assignment.write",
            "iam.read",
            "iam.write",
            "audit.read"
          )
        );
        case HR_OFFICER -> out.addAll(
          Set.of(
            "org.read",
            "org.write",
            "workforce.read",
            "workforce.write",
            "schedule.read",
            "schedule.write",
            "assignment.write",
            "audit.read"
          )
        );
        case RESTAURANT_MANAGER -> out.addAll(
          Set.of("org.read", "workforce.read", "schedule.read", "schedule.write")
        );
        case AUDITOR, DPO -> out.addAll(Set.of("org.read", "audit.read"));
        case PAYROLL_OFFICER, FINANCE_APPROVER -> out.add("org.read");
        case EMPLOYEE -> out.add("schedule.read");
      }
    return out;
  }

  public void require(String permission) {
    if (
      !permissions(auth.current()).contains(permission)
    ) AuthService.forbidden();
  }

  public boolean global(UserAccount u) {
    return csv(u.roles).contains("SYSTEM_ADMIN");
  }

  public boolean branch(UserAccount u, Branch b) {
    if (
      global(u) ||
      csv(u.branchIds).contains(b.id) ||
      csv(u.legalEntityIds).contains(b.legalEntityId)
    ) return true;
    LocalDate today = LocalDate.now(ZoneId.of("Europe/Berlin"));
    return (
      csv(u.roles).contains("RESTAURANT_MANAGER") &&
      db
        .all(ManagerAssignment.class)
        .stream()
        .anyMatch(
          a ->
            a.managerId.equals(u.id) &&
            a.branchId.equals(b.id) &&
            !today.isBefore(a.validFrom) &&
            (a.validTo == null || !today.isAfter(a.validTo))
        )
    );
  }

  public void branch(String id) {
    if (
      !branch(auth.current(), db.get(Branch.class, id))
    ) AuthService.forbidden();
  }

  public boolean entity(UserAccount u, String id) {
    return global(u) || csv(u.legalEntityIds).contains(id);
  }

  public void entity(String id) {
    if (!entity(auth.current(), id)) AuthService.forbidden();
  }
}
