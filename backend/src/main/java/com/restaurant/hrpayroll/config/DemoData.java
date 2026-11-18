package com.restaurant.hrpayroll.config;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;
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

  @Value("${app.seed-demo:false}")
  boolean enabled;

  @Value("${BOOTSTRAP_ADMIN_EMAIL:}")
  String bootstrapEmail;

  @Value("${BOOTSTRAP_ADMIN_PASSWORD:}")
  String bootstrapPassword;

  public DemoData(Store db, AuthService auth) {
    this.db = db;
    this.auth = auth;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (!enabled) {
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
        EmployeeRef e = new EmployeeRef();
        e.name = names[i * 4 + j];
        e.position = new String[] {
          "Service",
          "Küche",
          "Serviceleitung",
          "Bar",
        }[j];
        e.homeBranchId = b.id;
        db.save(e);
        EmployeeAssignment a = new EmployeeAssignment();
        a.employeeId = e.id;
        a.branchId = b.id;
        a.workLocationId = l.id;
        a.validFrom = LocalDate.of(2026, 1, 1);
        a.kind = "HOME";
        a.reason = "Initiale Standortzuordnung";
        a.stateCode = l.stateCode;
        a.timezone = l.timezone;
        a.addressSnapshot = l.address;
        db.save(a);
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

  UserAccount user(String email, String name, String role, String password) {
    UserAccount u = new UserAccount();
    u.email = email;
    u.name = name;
    u.roles = role;
    u.passwordHash = auth.hash(password);
    return db.save(u);
  }
}
