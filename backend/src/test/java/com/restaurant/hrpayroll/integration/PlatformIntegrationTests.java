package com.restaurant.hrpayroll.integration;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;
import com.restaurant.hrpayroll.service.Access;
import com.restaurant.hrpayroll.service.AuthService;
import com.restaurant.hrpayroll.service.MfaService;


import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:platformtests;DB_CLOSE_DELAY=-1",
    "app.seed-demo=true",
    "app.mfa-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  }
)
@AutoConfigureMockMvc
@Transactional
class PlatformIntegrationTests {

  @Autowired
  MockMvc mvc;

  @Autowired
  Store db;

  @Autowired
  MfaService mfa;

  @Autowired
  ObjectMapper json;

  @Autowired
  AuthService auth;

  @BeforeEach
  void resetRateLimitState() {
    Object target =
      org.springframework.test.util.AopTestUtils.getUltimateTargetObject(auth);
    (
      (Map<?, ?>) org.springframework.test.util.ReflectionTestUtils.getField(
        target,
        "attempts"
      )
    ).clear();
  }

  @Test
  void actualCsrfCookieWorksForLogin() throws Exception {
    var first = mvc
      .perform(get("/api/v1/auth/csrf"))
      .andExpect(status().isOk())
      .andReturn();
    String token = json
      .readTree(first.getResponse().getContentAsString())
      .get("token")
      .asString();
    var cookie = first.getResponse().getCookie("XSRF-TOKEN");
    assertNotNull(cookie);
    mvc
      .perform(
        post("/api/v1/auth/login")
          .cookie(cookie)
          .header("X-XSRF-TOKEN", token)
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "employee@atelier.local",
                "password",
                "Atelier!2026Demo"
              )
            )
          )
      )
      .andExpect(status().isOk());
  }

  @Test
  void totpMatchesPublishedRfcVector() {
    assertEquals("287082", mfa.code("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1));
  }

  @Test
  void accountLocksAfterFiveFailures() throws Exception {
    for (int i = 0; i < 5; i++) mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "employee@atelier.local",
                "password",
                "WrongPassword!"
              )
            )
          )
      )
      .andExpect(status().isUnauthorized());
    assertTrue(
      db.byEmail("employee@atelier.local").lockedUntil.isAfter(Instant.now())
    );
    mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "employee@atelier.local",
                "password",
                "Atelier!2026Demo"
              )
            )
          )
      )
      .andExpect(status().isUnauthorized());
  }

  @Test
  void sessionCannotBeRevokedByAnotherUser() throws Exception {
    var manager = login("manager@atelier.local");
    var employee = login("employee@atelier.local");
    mvc
      .perform(
        delete("/api/v1/auth/sessions/" + manager.getAttribute("sessionId"))
          .session(employee)
          .with(csrf())
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/v1/workspace").session(manager))
      .andExpect(status().isOk());
  }

  @Test
  void authenticatorRotationKeepsOldSecretUntilNewCodeConfirmed() throws Exception {
    var s = login("admin@atelier.local");
    String old = enroll(s);
    String encrypted = db.byEmail("admin@atelier.local").mfaSecret;
    String response = mvc
      .perform(
        post("/api/v1/auth/mfa/rotate")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "password",
                "Atelier!2026Demo",
                "code",
                mfa.code(old, Instant.now().getEpochSecond() / 30 + 1)
              )
            )
          )
      )
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    assertEquals(encrypted, db.byEmail("admin@atelier.local").mfaSecret);
    String replacement = json.readTree(response).get("secret").asString();
    mvc
      .perform(
        post("/api/v1/auth/mfa/verify")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "code",
                mfa.code(replacement, Instant.now().getEpochSecond() / 30),
                "enroll",
                true
              )
            )
          )
      )
      .andExpect(status().isOk());
    assertEquals(
      replacement,
      mfa.decrypt(db.byEmail("admin@atelier.local").mfaSecret)
    );
    mvc.perform(get("/api/v1/workspace").session(s)).andExpect(status().isOk());
  }

  @Test
  void transferRetainsLocationSnapshotAndHistory() throws Exception {
    var s = admin();
    EmployeeRef employee = db.all(EmployeeRef.class).getFirst();
    EmployeeAssignment previous = db
      .all(EmployeeAssignment.class)
      .stream()
      .filter(a -> a.employeeId.equals(employee.id))
      .findFirst()
      .orElseThrow();
    mvc
      .perform(
        put("/api/v1/org/assignments/" + previous.id + "/end")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(Map.of("validTo", "2026-11-19", "version", previous.version))
          )
      )
      .andExpect(status().isOk());
    Branch target = db
      .all(Branch.class)
      .stream()
      .filter(b -> !b.id.equals(employee.homeBranchId))
      .findFirst()
      .orElseThrow();
    WorkLocation place = db
      .all(WorkLocation.class)
      .stream()
      .filter(l -> l.branchId.equals(target.id))
      .findFirst()
      .orElseThrow();
    var r = mvc
      .perform(
        post("/api/v1/org/assignments")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "employeeId",
                employee.id,
                "branchId",
                target.id,
                "workLocationId",
                place.id,
                "validFrom",
                "2026-11-20",
                "kind",
                "TEMPORARY",
                "reason",
                "Unterstützung im Restaurant"
              )
            )
          )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.stateCode").value(place.stateCode))
      .andReturn();
    String id = json
      .readTree(r.getResponse().getContentAsString())
      .get("id")
      .asString();
    String original = place.address;
    place.address = "Neue Adresse";
    assertEquals(
      original,
      db.get(EmployeeAssignment.class, id).addressSnapshot
    );
    assertEquals(
      2,
      db
        .all(EmployeeAssignment.class)
        .stream()
        .filter(a -> a.employeeId.equals(employee.id))
        .count()
    );
  }

  String body(Object o) {
    return json.writeValueAsString(o);
  }

  MockHttpSession login(String email) throws Exception {
    return (MockHttpSession) mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(body(Map.of("email", email, "password", "Atelier!2026Demo")))
      )
      .andExpect(status().isOk())
      .andReturn()
      .getRequest()
      .getSession();
  }

  MockHttpSession admin() throws Exception {
    var session = login("admin@atelier.local");
    enroll(session);
    return session;
  }

  String enroll(MockHttpSession session) throws Exception {
    String response = mvc
      .perform(post("/api/v1/auth/mfa/setup").session(session).with(csrf()))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    String secret = json.readTree(response).get("secret").asString();
    mvc
      .perform(
        post("/api/v1/auth/mfa/verify")
          .session(session)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "code",
                mfa.code(secret, Instant.now().getEpochSecond() / 30),
                "enroll",
                true
              )
            )
          )
      )
      .andExpect(status().isOk());
    return secret;
  }

  @Test
  void anonymousAndCsrfAreRejected() throws Exception {
    mvc.perform(get("/api/v1/workspace")).andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/v1/auth/login")
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "admin@atelier.local",
                "password",
                "Atelier!2026Demo"
              )
            )
          )
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void sensitiveAccountCannotBypassMfa() throws Exception {
    var s = login("admin@atelier.local");
    mvc
      .perform(get("/api/v1/workspace").session(s))
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/v1/auth/mfa/verify")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(body(Map.of("code", "000000", "enroll", true)))
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void totpEnrollIsEncryptedAndCodeCannotBeReplayed() throws Exception {
    var s = login("admin@atelier.local");
    String secret = enroll(s);
    assertNotEquals(secret, db.byEmail("admin@atelier.local").mfaSecret);
    mvc
      .perform(get("/api/v1/workspace").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.users[0].passwordHash").doesNotExist());
    mvc
      .perform(
        post("/api/v1/auth/mfa/verify")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "code",
                mfa.code(secret, Instant.now().getEpochSecond() / 30),
                "enroll",
                false
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void managerSeesOnlyAssignedBranchAndCannotWrite() throws Exception {
    var s = login("manager@atelier.local");
    mvc
      .perform(get("/api/v1/workspace").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.branches.length()").value(1))
      .andExpect(jsonPath("$.branches[0].city").value("Stuttgart"))
      .andExpect(jsonPath("$.users.length()").value(0));
    mvc
      .perform(
        post("/api/v1/org/entities")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(body(entityPayload("TEST")))
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void employeeGetsNoOrganizationOrCoworkerData() throws Exception {
    var s = login("employee@atelier.local");
    mvc
      .perform(get("/api/v1/workspace").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.branches.length()").value(0))
      .andExpect(jsonPath("$.employees.length()").value(0))
      .andExpect(jsonPath("$.users.length()").value(0));
  }

  Map<String, Object> entityPayload(String code) {
    return Map.of(
      "code",
      code,
      "name",
      "Test GmbH",
      "registrationNumber",
      "HRB 123",
      "address",
      "Teststraße 1, Stuttgart",
      "active",
      true,
      "version",
      0
    );
  }

  @Test
  void entityCreateDuplicateAndOptimisticConflict() throws Exception {
    var s = admin();
    var result = mvc
      .perform(
        post("/api/v1/org/entities")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(body(entityPayload("NEW-01")))
      )
      .andExpect(status().isOk())
      .andReturn();
    String id = json
      .readTree(result.getResponse().getContentAsString())
      .get("id")
      .asString();
    mvc
      .perform(
        put("/api/v1/org/entities/" + id)
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              new HashMap<>(entityPayload("NEW-01")) {
                {
                  put("version", 99);
                }
              }
            )
          )
      )
      .andExpect(status().isConflict());
  }

  @Test
  void hrScopeRejectsForeignLegalEntity() throws Exception {
    LegalEntity foreign = new LegalEntity();
    foreign.code = "FOREIGN";
    foreign.name = "Other";
    db.save(foreign);
    var s = login("hr@atelier.local");
    enroll(s);
    mvc
      .perform(
        put("/api/v1/org/entities/" + foreign.id)
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(body(entityPayload("FOREIGN")))
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void overlappingEmployeeAssignmentIsRejected() throws Exception {
    var s = admin();
    EmployeeRef e = db.all(EmployeeRef.class).getFirst();
    Branch b = db.get(Branch.class, e.homeBranchId);
    WorkLocation l = db
      .all(WorkLocation.class)
      .stream()
      .filter(w -> w.branchId.equals(b.id))
      .findFirst()
      .orElseThrow();
    mvc
      .perform(
        post("/api/v1/org/assignments")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "employeeId",
                e.id,
                "branchId",
                b.id,
                "workLocationId",
                l.id,
                "validFrom",
                "2026-11-20",
                "kind",
                "TEMPORARY",
                "reason",
                "Test"
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void branchManagerDatesCannotOverlap() throws Exception {
    var s = admin();
    var original = db.all(ManagerAssignment.class).getFirst();
    mvc
      .perform(
        post("/api/v1/org/managers")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "managerId",
                original.managerId,
                "branchId",
                original.branchId,
                "validFrom",
                "2026-11-20"
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void deactivationRevokesExistingSession() throws Exception {
    var employee = login("employee@atelier.local");
    var s = admin();
    var u = db.byEmail("employee@atelier.local");
    mvc
      .perform(
        put("/api/v1/iam/users/" + u.id)
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "name",
                u.name,
                "email",
                u.email,
                "roles",
                List.of("EMPLOYEE"),
                "active",
                false,
                "version",
                u.version
              )
            )
          )
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/v1/workspace").session(employee))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void selfAdminCannotBeDeactivated() throws Exception {
    var s = admin();
    var u = db.byEmail("admin@atelier.local");
    mvc
      .perform(
        put("/api/v1/iam/users/" + u.id)
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "name",
                u.name,
                "email",
                u.email,
                "roles",
                List.of("SYSTEM_ADMIN"),
                "active",
                false,
                "version",
                u.version
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void resetTokenSingleUseAndSessionRevocation() throws Exception {
    var employee = login("employee@atelier.local");
    var s = admin();
    var u = db.byEmail("employee@atelier.local");
    var response = mvc
      .perform(
        post("/api/v1/iam/users/" + u.id + "/reset-link")
          .session(s)
          .with(csrf())
      )
      .andExpect(status().isOk())
      .andReturn();
    String url = json
      .readTree(response.getResponse().getContentAsString())
      .get("url")
      .asString();
    String token = url.substring(url.indexOf("reset=") + 6);
    String payload = body(
      Map.of("token", token, "password", "NewPassword!2026")
    );
    mvc
      .perform(
        post("/api/v1/auth/reset")
          .with(csrf())
          .contentType("application/json")
          .content(payload)
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/v1/workspace").session(employee))
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/v1/auth/reset")
          .with(csrf())
          .contentType("application/json")
          .content(payload)
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void revokeOwnSessionTakesEffectImmediately() throws Exception {
    var s = login("employee@atelier.local");
    String id = (String) s.getAttribute("sessionId");
    mvc
      .perform(
        delete("/api/v1/auth/sessions/" + id)
          .session(s)
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/v1/workspace").session(s))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void badCredentialsDoNotRevealAccountExistence() throws Exception {
    String a = mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "unknown@atelier.local",
                "password",
                "Wrong!Password"
              )
            )
          )
      )
      .andExpect(status().isUnauthorized())
      .andReturn()
      .getResponse()
      .getContentAsString();
    String b = mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "email",
                "admin@atelier.local",
                "password",
                "Wrong!Password"
              )
            )
          )
      )
      .andExpect(status().isUnauthorized())
      .andReturn()
      .getResponse()
      .getContentAsString();
    assertEquals(a, b);
  }

  @Test
  void sodRulePayrollAndFinanceCannotBeCombined() throws Exception {
    var s = admin();
    mvc
      .perform(
        post("/api/v1/iam/users")
          .session(s)
          .with(csrf())
          .contentType("application/json")
          .content(
            body(
              Map.of(
                "name",
                "Conflict User",
                "email",
                "conflict@atelier.local",
                "password",
                "Atelier!2026Conflict",
                "roles",
                List.of("PAYROLL_OFFICER", "FINANCE_APPROVER"),
                "active",
                true
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void sodMatrixEndpointReturnsRulesAndPairs() throws Exception {
    var s = admin();
    mvc
      .perform(get("/api/v1/iam/sod-matrix").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.rules").isArray())
      .andExpect(jsonPath("$.rules[0].code").value("SOD-01"))
      .andExpect(jsonPath("$.incompatibleRoles[0].roleA").value("PAYROLL_OFFICER"))
      .andExpect(jsonPath("$.incompatibleRoles[0].roleB").value("FINANCE_APPROVER"));
  }

  @Test
  void germanHolidaysEndpointReturnsAccurateHolidays() throws Exception {
    var s = admin();
    // Baden-Württemberg has Heilige Drei Könige (Jan 6) and Allerheiligen (Nov 1)
    mvc
      .perform(get("/api/v1/org/holidays?stateCode=BW&year=2026").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.stateCode").value("BW"))
      .andExpect(jsonPath("$.holidays[?(@.name == 'Heilige Drei Könige')]").exists())
      .andExpect(jsonPath("$.holidays[?(@.name == 'Allerheiligen')]").exists())
      .andExpect(jsonPath("$.holidays[?(@.name == 'Internationaler Frauentag')]").doesNotExist());

    // Berlin has Internationaler Frauentag (Mar 8), but not Heilige Drei Könige or Allerheiligen
    mvc
      .perform(get("/api/v1/org/holidays?stateCode=BE&year=2026").session(s))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.stateCode").value("BE"))
      .andExpect(jsonPath("$.holidays[?(@.name == 'Internationaler Frauentag')]").exists())
      .andExpect(jsonPath("$.holidays[?(@.name == 'Heilige Drei Könige')]").doesNotExist())
      .andExpect(jsonPath("$.holidays[?(@.name == 'Allerheiligen')]").doesNotExist());
  }
}
