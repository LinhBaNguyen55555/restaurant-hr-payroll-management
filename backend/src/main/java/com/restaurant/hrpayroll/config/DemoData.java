package com.restaurant.hrpayroll.config;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;
import com.restaurant.hrpayroll.entity.*;
import com.restaurant.hrpayroll.controller.PlatformController;
import com.restaurant.hrpayroll.service.EmployeeService;
import java.math.BigDecimal;
import com.restaurant.hrpayroll.service.AuthService;



import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoData implements CommandLineRunner {

  final Store db;
  final AuthService auth;
  final EmployeeService employees;

  @Value("${app.seed-demo:false}")
  boolean enabled;

  @Value("${BOOTSTRAP_ADMIN_EMAIL:}")
  String bootstrapEmail;

  @Value("${BOOTSTRAP_ADMIN_PASSWORD:}")
  String bootstrapPassword;

  public DemoData(Store db, AuthService auth, EmployeeService employees) {
    this.db = db;
    this.auth = auth;
    this.employees = employees;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (!enabled && bootstrapEmail.isBlank() && bootstrapPassword.isBlank()) return;
    if (!db.all(UserAccount.class).isEmpty()) return;
    if (!enabled) {
      if (bootstrapEmail.isBlank() != bootstrapPassword.isBlank())
        throw new IllegalStateException("Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.");
      if (!bootstrapEmail.isBlank()) user(bootstrapEmail.trim().toLowerCase(Locale.ROOT), "Administrator", "SYSTEM_ADMIN", bootstrapPassword);
      return;
    }
    LegalEntity entity = new LegalEntity();
    entity.name = "Atelier Gastronomie GmbH";
    entity.code = "AT-DE-01";
    entity.registrationNumber = "HRB 784210";
    entity.address = "Königstraße 26, 70173 Stuttgart";
    db.save(entity);
    UserAccount admin = user(
      "admin@atelier.local",
      "Alex Morgan",
      "SYSTEM_ADMIN",
      "Atelier!2026Demo"
    );
    UserAccount hr = user(
      "hr@atelier.local",
      "Lena Fischer",
      "HR_OFFICER",
      "Atelier!2026Demo"
    );
    hr.legalEntityIds = entity.id;
    UserAccount manager = user(
      "manager@atelier.local",
      "Jonas Weber",
      "RESTAURANT_MANAGER",
      "Atelier!2026Demo"
    );
    user(
      "employee@atelier.local",
      "Emma Schneider",
      "EMPLOYEE",
      "Atelier!2026Demo"
    );
    seedReferenceData(entity);
    user("kitchen@atelier.local", "Lukas Hoffmann", "EMPLOYEE", "Atelier!2026Demo");
    String[][] places = {
      {
        "STR-01",
        "Atelier Stuttgart",
        "Stuttgart",
        "Königstraße 26, 70173 Stuttgart",
        "BW",
        "mint",
      },
      {
        "HD-02",
        "Atelier Heidelberg",
        "Heidelberg",
        "Hauptstraße 42, 69117 Heidelberg",
        "BW",
        "peach",
      },
      {
        "FR-03",
        "Atelier Freiburg",
        "Freiburg",
        "Kaiser-Joseph-Straße 18, 79098 Freiburg",
        "BW",
        "violet",
      },
      {
        "KA-04",
        "Atelier Karlsruhe",
        "Karlsruhe",
        "Kaiserstraße 92, 76133 Karlsruhe",
        "BW",
        "blue",
      },
      {
        "MUC-05",
        "Atelier München",
        "München",
        "Leopoldstraße 15, 80802 München",
        "BY",
        "sand",
      },
    };
    String[] names = {
      "Emma Schneider",
      "Lukas Hoffmann",
      "Mia Becker",
      "Noah Wagner",
      "Hannah Müller",
      "Ben Fischer",
      "Clara Richter",
      "Paul Bauer",
      "Sophie Klein",
      "Leon Wolf",
      "Anna Schmid",
      "Felix Braun",
      "Marie Koch",
      "Max Neumann",
      "Laura Hartmann",
      "David Schwarz",
      "Julia Zimmermann",
      "Tim Lange",
      "Sarah Werner",
      "Finn König",
    };
    for (int i = 0; i < places.length; i++) {
      var v = places[i];
      Branch b = new Branch();
      b.code = v[0];
      b.name = v[1];
      b.city = v[2];
      b.address = v[3];
      b.stateCode = v[4];
      b.accent = v[5];
      b.legalEntityId = entity.id;
      db.save(b);
      WorkLocation l = new WorkLocation();
      l.branchId = b.id;
      l.name = "Restaurant & Terrasse";
      l.address = b.address;
      l.stateCode = b.stateCode;
      db.save(l);
      for (int j = 0; j < 4; j++) {
        int index = i * 4 + j;
        String[] name = names[index].split(" ", 2);
        String positionCode = List.of("SERVICE", "KITCHEN", "LEAD", "BAR").get(j);
        PositionEntity position = db.all(PositionEntity.class).stream()
          .filter(p -> p.positionCode.equals(positionCode))
          .findFirst().orElseThrow();
        var employee = employees.createEmployee(new EmployeeService.EmployeeInput(
          "AT-%03d".formatted(index + 1), entity.id, b.id, position.positionId, name[0], name[1],
          LocalDate.of(1995, 1, 1), switch (index) {
            case 0 -> "employee@atelier.local";
            case 1 -> "kitchen@atelier.local";
            default -> null;
          },
          LocalDate.of(2026, 1, 1), "UNLIMITED", "HOURLY", 2400, new BigDecimal("16"), null
        ));
        Integer annualType = db.all(LeaveTypeEntity.class).stream().filter(t -> "ANNUAL".equals(t.leaveCode))
          .findFirst().orElseThrow().leaveTypeId;
        for (int year = 2026; year <= 2027; year++) {
          var balance = new LeaveBalanceEntity();
          balance.employeeId = employee.employeeId;
          balance.leaveTypeId = annualType;
          balance.leaveYear = year;
          balance.entitledDays = new BigDecimal("25");
          balance.remainingDays = balance.entitledDays;
          db.save(balance);
        }
      }
      if (i == 0) {
        ManagerAssignment a = new ManagerAssignment();
        a.branchId = b.id;
        a.managerId = manager.id;
        a.validFrom = LocalDate.of(2026, 1, 1);
        db.save(a);
      }
      auth.audit(
        admin,
        "BRANCH_CREATED",
        b.id,
        b.id,
        b.name + " · Standort eingerichtet"
      );
    }
    auth.audit(
      admin,
      "WORKSPACE_CREATED",
      entity.id,
      null,
      "Atelier Arbeitsbereich eingerichtet"
    );
  }

  private void seedReferenceData(LegalEntity entity) {
    for (String[] labels : new String[][] {
      {"SERVICE", "Service", "Service"}, {"KITCHEN", "Küche", "Kitchen"},
      {"LEAD", "Serviceleitung", "Service lead"}, {"BAR", "Bar", "Bar"}
    }) {
      var position = new PositionEntity();
      position.positionCode = labels[0];
      position.positionNameDe = labels[1];
      position.positionNameEn = labels[2];
      db.save(position);
    }
    for (String[] labels : new String[][] {
      {"ANNUAL", "Urlaub", "Nghỉ phép năm", "PAID"},
      {"SICK", "Krankheit", "Nghỉ ốm", "REVIEW_REQUIRED"},
      {"CHILD_SICK", "Kind krank", "Nghỉ chăm con ốm", "REVIEW_REQUIRED"},
      {"COMP_REST", "Ersatzruhetag", "Nghỉ bù", "PAID"},
      {"UNPAID", "Unbezahlter Urlaub", "Nghỉ không lương", "UNPAID"}
    }) {
      var type = new LeaveTypeEntity();
      type.leaveCode = labels[0];
      type.nameDe = labels[1];
      type.nameVi = labels[2];
      type.payTreatment = labels[3];
      type.countsAgainstAnnualLeave = "ANNUAL".equals(type.leaveCode);
      db.save(type);
    }

    for (int year = 2025; year <= 2027; year++) {
      for (var holiday : PlatformController.getGermanHolidays(year)) {
        for (String state : List.of("BW", "BY")) {
          if ((!holiday.nationwide() && !holiday.states().contains(state))
            || ("BY".equals(state) && holiday.name().equals("Mariä Himmelfahrt"))) continue;
          var row = new PublicHolidayEntity();
          row.stateCode = state;
          row.holidayDate = holiday.date();
          row.holidayCode = "DE-" + holiday.date();
          row.holidayNameDe = holiday.name();
          db.save(row);
        }
      }
    }

    var policy = new AllowancePolicyEntity();
    policy.legalEntityId = entity.id;
    policy.policyCode = "DEMO_SFN";
    policy.referenceDocument = "Atelier Demodaten";
    policy.validFrom = LocalDate.of(2025, 1, 1);
    db.save(policy);
    for (String[] config : new String[][] {
      {"NIGHT", "25", "NIGHT"}, {"DEEP_NIGHT", "40", "NIGHT"}, {"SUNDAY", "50", "DAY"},
      {"HOLIDAY", "100", "DAY"}, {"SPECIAL_HOLIDAY", "150", "DAY"},
      {"CHRISTMAS_EVE", "150", "DAY"}, {"NEW_YEAR_EVE", "125", "DAY"}
    }) {
      var rate = new AllowanceRateEntity();
      rate.policyId = policy.policyId;
      rate.allowanceCode = config[0];
      rate.paymentPercent = new BigDecimal(config[1]);
      rate.stackingGroup = config[2];
      rate.stackingBehavior = "DAY".equals(config[2]) ? "MAX_OF_DAY" : "ADD";
      db.save(rate);
    }
  }

  UserAccount user(String email, String name, String role, String password) {
    UserAccount u = new UserAccount();
    u.email = email;
    u.name = name;
    u.roles = role;
    u.passwordHash = auth.hash(password);
    return db.save(u);
  }
}
