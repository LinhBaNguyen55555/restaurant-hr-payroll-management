package com.restaurant.hrpayroll.service;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;



import java.time.LocalDate;
import java.time.ZoneId;
import com.restaurant.hrpayroll.entity.EmployeeEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class Access {

  final Store db;
  final AuthService auth;
  @PersistenceContext EntityManager em;

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
            "allowance.read",
            "allowance.write",
            "assignment.write",
            "audit.read"
          )
        );
        case RESTAURANT_MANAGER -> out.addAll(
          Set.of("org.read", "workforce.read", "schedule.read", "schedule.write")
        );
        case AUDITOR, DPO -> out.addAll(Set.of("org.read", "audit.read"));
        case PAYROLL_OFFICER -> out.addAll(Set.of("org.read", "allowance.read", "allowance.write"));
        case FINANCE_APPROVER -> out.add("org.read");
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

  public static Long numericId(String value) {
    try { return Long.valueOf(value); } catch (NumberFormatException e) { return null; }
  }

  public String positionName(Long employeeId, String branchId, LocalDate date) {
    return assignments(employeeId, date).stream()
      .filter(a -> Objects.equals(a.branchId, branchId) && a.positionId != null)
      .map(a -> em.find(com.restaurant.hrpayroll.entity.PositionEntity.class, a.positionId))
      .filter(Objects::nonNull).map(p -> p.positionNameDe).findFirst().orElse("Nhân viên");
  }

  public String actorId() { return auth.current().id; }

  public Long selfEmployee() {
    String email = auth.current().email;
    var matches = em.createQuery("select e.employeeId from EmployeeEntity e where lower(e.email)=:email", Long.class)
      .setParameter("email", email.toLowerCase(Locale.ROOT)).setMaxResults(2).getResultList();
    return matches.size() == 1 ? matches.getFirst() : null;
  }

  public Long requireSelf(Long requested) {
    Long self = selfEmployee();
    if (self == null || (requested != null && !self.equals(requested))) AuthService.forbidden();
    return self;
  }

  public record Posting(String branchId, String branchName, String positionCode) {}

  public List<Posting> currentPostings(Long employeeId) {
    if (employeeId == null) return List.of();
    return assignments(employeeId, LocalDate.now(ZoneId.of("Europe/Berlin"))).stream()
      .map(a -> {
        Branch branch = em.find(Branch.class, a.branchId);
        var position = a.positionId == null ? null : em.find(com.restaurant.hrpayroll.entity.PositionEntity.class, a.positionId);
        return new Posting(a.branchId, branch == null ? a.branchId : branch.name, position == null ? null : position.positionCode);
      }).distinct().toList();
  }

  public Branch scopedBranch(String id) {
    if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chi nhánh là bắt buộc.");
    Branch branch = db.get(Branch.class, id);
    if (!branch(auth.current(), branch)) AuthService.forbidden();
    return branch;
  }

  public List<EmployeeAssignment> assignments(Long employeeId, LocalDate day) {
    return em.createQuery("""
      select a from EmployeeAssignment a where a.employeeId=:id and a.validFrom<=:day
      and (a.validTo is null or a.validTo>=:day) order by a.validFrom desc
      """, EmployeeAssignment.class).setParameter("id", employeeId.toString()).setParameter("day", day).getResultList();
  }

  public boolean assignedTo(Long employeeId, String branchId, LocalDate day) {
    return employeeId != null && branchId != null && assignments(employeeId, day).stream()
      .anyMatch(a -> branchId.equals(a.branchId));
  }

  public boolean managesEmployee(Long id) {
    UserAccount user = auth.current();
    EmployeeEntity employee = id == null ? null : em.find(EmployeeEntity.class, id);
    if (employee == null) return false;
    if (entity(user, employee.legalEntityId)) return true;
    LocalDate today = LocalDate.now(ZoneId.of("Europe/Berlin"));
    List<EmployeeAssignment> current = assignments(id, today);
    List<EmployeeAssignment> candidate = !current.isEmpty()
      ? current
      : em.createQuery("""
          select a from EmployeeAssignment a where a.employeeId=:id and a.validFrom>:day
          order by a.validFrom asc
          """, EmployeeAssignment.class)
          .setParameter("id", id.toString())
          .setParameter("day", today)
          .setMaxResults(1)
          .getResultList();
    return candidate.stream().anyMatch(a -> {
      Branch branch = em.find(Branch.class, a.branchId);
      return branch != null && branch(user, branch);
    });
  }

  public void requireManagedEmployee(Long id) {
    if (!managesEmployee(id)) AuthService.forbidden();
  }

  public boolean canScheduleBranch(String branchId) {
    Branch branch = branchId == null ? null : em.find(Branch.class, branchId.toString());
    return branch != null && permissions(auth.current()).contains("schedule.write") && branch(auth.current(), branch);
  }

  public void requireScheduleBranch(String branchId) {
    if (!canScheduleBranch(branchId)) AuthService.forbidden();
  }
}
