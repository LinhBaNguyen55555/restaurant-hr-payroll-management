package com.restaurant.hrpayroll.integration;

import static com.restaurant.hrpayroll.entity.Domain.*;
import com.restaurant.hrpayroll.repository.Store;
import com.restaurant.hrpayroll.entity.*;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:platformtests;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
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
  void kitchenWorkspaceUsesTheEmployeesOwnCurrentPosting() throws Exception {
    mvc.perform(get("/api/v1/workspace").session(login("kitchen@atelier.local")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.selfPostings.length()").value(1))
      .andExpect(jsonPath("$.selfPostings[0].positionCode").value("KITCHEN"))
      .andExpect(jsonPath("$.selfPostings[0].branchName").value("Atelier Stuttgart"))
      .andExpect(jsonPath("$.employees.length()").value(0))
      .andExpect(jsonPath("$.branches.length()").value(0));
  }

  @Test
  void totpMatchesPublishedRfcVector() {
    assertEquals("287082", mfa.code("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1));
  }

  @Test
  void loginRequiresThePasswordStoredForThatAccount() throws Exception {
    mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
        .content(body(Map.of("email", "employee@atelier.local", "password", "Password123!"))))
      .andExpect(status().isUnauthorized());
    assertNotNull(login("employee@atelier.local"));
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

  private MockHttpSession hr() throws Exception {
    var session = login("hr@atelier.local");
    enroll(session);
    return session;
  }

  private Branch demoBranch(String code) {
    return db.all(Branch.class).stream().filter(b -> code.equals(b.code)).findFirst().orElseThrow();
  }

  private EmployeeEntity demoEmployee() {
    return db.all(EmployeeEntity.class).stream().filter(e -> "employee@atelier.local".equals(e.email)).findFirst().orElseThrow();
  }

  private tools.jackson.databind.JsonNode okJson(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) throws Exception {
    return json.readTree(mvc.perform(request).andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString());
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder submit(String path, MockHttpSession session, Object input) {
    return post(path).session(session).with(csrf()).contentType("application/json").content(body(input));
  }

  @Test
  void f00OperationalApiRequiresMfaForSensitiveAccount() throws Exception {
    var session = login("hr@atelier.local");
    mvc.perform(get("/api/v1/workforce/employees").session(session)).andExpect(status().isForbidden());
  }

  @Test
  void f02EmployeeContractAndUuidBranchAreConnected() throws Exception {
    var session = hr();
    var branch = demoBranch("STR-01");
    var input = Map.of("branchId", branch.id, "legalEntityId", branch.legalEntityId, "employeeCode", "NEW-301",
      "firstName", "Sam", "lastName", "Bauer", "hireDate", "2026-01-01", "hourlyWage", 13.90);
    long id = okJson(submit("/api/v1/workforce/employees", session, input)).get("employeeId").asLong();
    mvc.perform(get("/api/v1/workforce/employees/{id}", id).session(session))
      .andExpect(status().isOk()).andExpect(jsonPath("$.profile.branchId").value(branch.id))
      .andExpect(jsonPath("$.wageRates[0].grossHourlyEur").value(13.90));
    mvc.perform(get("/api/v1/workforce/employees").param("branchId", branch.id).session(login("manager@atelier.local")))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentHourlyWage").isEmpty());
  }

  @Test
  void f02ImportDryRunValidatesWageAndLeavesDataUntouched() throws Exception {
    var session = hr();
    var branch = demoBranch("STR-01");
    String csv = "employee_code;first_name;last_name;email;date_of_birth;hire_date;branch_id;position_id;contract_type;pay_type;weekly_hours;hourly_wage\n"
      + "CSV-1;Sam;Bauer;;;2026-01-01;" + branch.id + ";;UNLIMITED;HOURLY;40;13.89";
    mvc.perform(submit("/api/v1/workforce/import", session, Map.of("csv", csv, "dryRun", true)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.errors[0].fieldName").value("hourly_wage"));
    assertTrue(db.all(EmployeeEntity.class).stream().noneMatch(e -> e.employeeCode.equals("CSV-1")));
  }

  @Test
  void f03PublishedShiftAndSwapWorkWithScopedAccounts() throws Exception {
    var manager = login("manager@atelier.local");
    var employeeSession = login("employee@atelier.local");
    var employee = demoEmployee();
    var branch = demoBranch("STR-01");
    String start = "2026-12-09T08:00:00Z";
    String end = "2026-12-09T14:00:00Z";
    long id = okJson(submit("/api/v1/scheduling/shifts", manager, Map.of("branchId", branch.id,
      "employeeId", employee.employeeId, "start", start, "end", end, "breakMinutes", 30))).get("shiftId").asLong();
    var period = get("/api/v1/scheduling/shifts").param("start", start).param("end", end).session(employeeSession);
    mvc.perform(period).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    okJson(submit("/api/v1/scheduling/publish", manager, Map.of("branchId", branch.id,
      "start", start, "end", end, "changeReason", "Test schedule")));
    mvc.perform(period).andExpect(status().isOk()).andExpect(jsonPath("$[0].shiftId").value(id));
    var coworkers = okJson(get("/api/v1/scheduling/shifts/{id}/colleagues", id).session(employeeSession));
    long colleague = coworkers.get(0).get("employeeId").asLong();
    long swap = okJson(submit("/api/v1/scheduling/swap-requests", employeeSession,
      Map.of("sourceShiftId", id, "targetEmployeeId", colleague, "reason", "Abgesprochen"))).get("swapRequestId").asLong();
    mvc.perform(submit("/api/v1/scheduling/swap-requests/" + swap + "/approve", manager, Map.of()))
      .andExpect(status().isOk());
    assertEquals(colleague, db.all(ShiftScheduleEntity.class).stream()
      .filter(shift -> shift.shiftId.equals(id)).findFirst().orElseThrow().employeeId);
  }

  @Test
  void f04ClockAndBreakEventsRemainAssociatedWithOwnTimesheet() throws Exception {
    var session = login("employee@atelier.local");
    long id = okJson(submit("/api/v1/attendance/check-in", session, Map.of())).get("timesheetId").asLong();
    assertEquals(demoEmployee().employeeId, db.all(AttendanceExceptionEntity.class).stream()
      .filter(e -> e.timesheetId.equals(id)).findFirst().orElseThrow().employeeId);
    okJson(submit("/api/v1/attendance/breaks/start", session, Map.of("breakType", "STATUTORY_BREAK")));
    okJson(submit("/api/v1/attendance/breaks/end", session, Map.of()));
    okJson(submit("/api/v1/attendance/check-out", session, Map.of()));
    mvc.perform(get("/api/v1/attendance/my-timesheet").session(session)).andExpect(status().isOk())
      .andExpect(jsonPath("$[0].breaks[0].breakType").value("STATUTORY_BREAK"));
  }

  @Test
  void f05OwnCorrectionCanBeApprovedAndPeriodLocked() throws Exception {
    var manager = login("manager@atelier.local");
    var session = login("employee@atelier.local");
    var branch = demoBranch("STR-01");
    String start = "2026-11-20T08:00:00Z";
    long id = okJson(submit("/api/v1/attendance/manual-entry", manager, Map.of("branchId", branch.id, "employeeId",
      demoEmployee().employeeId, "workDate", "2026-11-20", "startUtc", start, "endUtc", "2026-11-20T13:00:00Z",
      "breakMinutes", 0, "reason", "Terminal offline"))).get("timesheetId").asLong();
    long request = okJson(submit("/api/v1/reconciliation/change-requests", session, Map.of(
      "timesheetId", id, "requestedEndUtc", "2026-11-20T13:15:00Z", "reason", "Schichtübergabe")))
      .get("requestId").asLong();
    mvc.perform(submit("/api/v1/reconciliation/change-requests/" + request + "/approve", manager, Map.of()))
      .andExpect(status().isOk());
    okJson(submit("/api/v1/reconciliation/lock-period", manager, Map.of("branchId", branch.id, "lockUpToDate", "2026-11-20")));
    assertTrue(db.all(AttendanceTimesheetEntity.class).stream()
      .anyMatch(t -> t.timesheetId.equals(id) && Boolean.TRUE.equals(t.isLocked) && t.workedMinutes == 315));
  }

  @Test
  void f05ManagerRequiresBranchScope() throws Exception {
    var manager = login("manager@atelier.local");
    mvc.perform(get("/api/v1/reconciliation/kpis").session(manager).param("branchId", demoBranch("MUC-05").id))
      .andExpect(status().isForbidden());
  }

  @Test
  void f06AnnualLeaveApprovesAndDebitsOwnBalance() throws Exception {
    var employee = login("employee@atelier.local");
    var manager = login("manager@atelier.local");
    var type = db.all(LeaveTypeEntity.class).stream().filter(t -> t.leaveCode.equals("ANNUAL")).findFirst().orElseThrow();
    long id = okJson(submit("/api/v1/leaves/requests", employee,
      Map.of("leaveTypeId", type.leaveTypeId, "startDate", "2026-11-30", "endDate", "2026-12-01")))
      .get("leaveRequestId").asLong();
    mvc.perform(submit("/api/v1/leaves/requests/" + id + "/approve", manager, Map.of("notes", "Geprüft")))
      .andExpect(status().isOk());
    mvc.perform(get("/api/v1/leaves/balances").param("year", "2026").session(employee))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].remainingDays").value(23));
    mvc.perform(get("/api/v1/leaves/requests").session(employee))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("APPROVED"));
  }

  @Test
  void f06HrCanSetBalanceAndRecordChildSicknessWithoutPayrollApproval() throws Exception {
    var hrSession = hr();
    long employeeId = demoEmployee().employeeId;
    mvc.perform(submit("/api/v1/leaves/balances", hrSession, Map.of(
      "employeeId", employeeId, "year", 2026, "entitledDays", 26, "carriedDays", 2)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.remainingDays").value(28));
    mvc.perform(submit("/api/v1/leaves/sickness", hrSession, Map.of(
      "employeeId", employeeId, "startDate", "2026-11-25", "endDate", "2026-11-26", "isChildSickLeave", true)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.verificationStatus").value("PENDING_REVIEW"));
    mvc.perform(get("/api/v1/leaves/sickness").session(login("employee@atelier.local")))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].isChildSickLeave").value(true))
      .andExpect(jsonPath("$[0].isContinuedPayEligible").value(false));
  }

  @Test
  void f06SundayWorkProducesRestObligationWhenApproved() throws Exception {
    var manager = login("manager@atelier.local");
    var branch = demoBranch("STR-01");
    var entry = okJson(submit("/api/v1/attendance/manual-entry", manager, Map.of(
      "branchId", branch.id, "employeeId", demoEmployee().employeeId, "workDate", "2026-11-22",
      "startUtc", "2026-11-22T10:00:00Z", "endUtc", "2026-11-22T16:30:00Z",
      "breakMinutes", 30, "breakStartUtc", "2026-11-22T12:30:00Z", "reason", "Terminal offline")));
    mvc.perform(submit("/api/v1/reconciliation/timesheets/" + entry.get("timesheetId").asLong() + "/approve", manager, Map.of()))
      .andExpect(status().isOk());
    var rests = okJson(get("/api/v1/leaves/compensatory-rests").session(manager).param("branchId", branch.id));
    assertEquals("2026-12-06", rests.get(0).get("deadlineDate").asString());
    long restId = rests.get(0).get("restId").asLong();
    mvc.perform(submit("/api/v1/leaves/compensatory-rests/" + restId + "/fulfill", manager, Map.of("restDate", "2026-11-23")))
      .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
  }

  @Test
  void f07UsesStateHolidayNightRatesAndActualBreakWithoutWritingOnRead() throws Exception {
    var hrSession = hr();
    var stuttgart = demoBranch("STR-01");
    var munich = demoBranch("MUC-05");
    mvc.perform(get("/api/v1/allowances/holidays").param("branchId", munich.id).param("year", "2026").session(hrSession))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].stateCode").value("BY"));
    var t = new AttendanceTimesheetEntity();
    t.employeeId = demoEmployee().employeeId;
    t.branchId = stuttgart.id;
    t.workDate = LocalDate.of(2026, 1, 4);
    t.actualStartUtc = Instant.parse("2026-01-04T21:00:00Z"); // Sunday 22:00 in Berlin
    t.actualEndUtc = Instant.parse("2026-01-05T04:00:00Z");
    t.actualBreakMinutes = 30;
    t.workedMinutes = 390;
    t.status = "APPROVED";
    db.save(t);
    var rest = new BreakRecordEntity();
    rest.employeeId = t.employeeId;
    rest.startTimeUtc = Instant.parse("2026-01-05T00:00:00Z");
    rest.endTimeUtc = Instant.parse("2026-01-05T00:30:00Z");
    rest.durationMinutes = 30;
    db.save(rest);
    long existing = db.all(AllowanceCalculationEntity.class).size();
    mvc.perform(get("/api/v1/allowances/timesheets/{id}", t.timesheetId).session(hrSession))
      .andExpect(status().isOk()).andExpect(jsonPath("$.workedMinutes").value(390))
      .andExpect(jsonPath("$.segments[?(@.isDeepNight == true)]").isNotEmpty())
      .andExpect(jsonPath("$.totalPaidAmountEur").value(78.40));
    assertEquals(existing, db.all(AllowanceCalculationEntity.class).size());
    mvc.perform(submit("/api/v1/allowances/calculate/" + t.timesheetId, hrSession, Map.of()))
      .andExpect(status().isOk()).andExpect(jsonPath("$.totalPaidAmountEur").value(78.40));
    assertTrue(db.all(AllowanceCalculationEntity.class).size() > existing);
    t.isLocked = true;
    db.flush();
    mvc.perform(get("/api/v1/allowances/timesheets/{id}", t.timesheetId).session(hrSession))
      .andExpect(status().isOk()).andExpect(jsonPath("$.locked").value(true));
  }

  @Test
  void auditFixesLockoutBackToBackRestAndMuSchG() throws Exception {
    for (int i = 0; i < 5; i++) {
      mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
          .content(body(Map.of("email", "employee@atelier.local", "password", "WrongPassword!"))))
        .andExpect(status().isUnauthorized());
    }
    var lockedUser = db.byEmail("employee@atelier.local");
    Instant firstLock = lockedUser.lockedUntil;
    assertEquals(5, lockedUser.failures);
    mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
        .content(body(Map.of("email", "employee@atelier.local", "password", "WrongPassword!"))))
      .andExpect(status().isUnauthorized());
    var afterRetry = db.byEmail("employee@atelier.local");
    assertEquals(5, afterRetry.failures);
    assertEquals(firstLock, afterRetry.lockedUntil);

    var hrSession = hr();
    var manager = login("manager@atelier.local");
    var branch = demoBranch("STR-01");
    long pregnantEmpId = okJson(submit("/api/v1/workforce/employees", hrSession, Map.of(
      "branchId", branch.id, "legalEntityId", branch.legalEntityId, "employeeCode", "MUSCHG-1",
      "firstName", "Lena", "lastName", "Keller", "dateOfBirth", "1996-05-01", "hireDate", "2026-01-01", "hourlyWage", 14.50
    ))).get("employeeId").asLong();
    mvc.perform(submit("/api/v1/workforce/employees/" + pregnantEmpId + "/restrictions", hrSession, Map.of(
      "restrictionType", "MATERNITY_PROTECTION", "validFrom", "2026-11-01",
      "allowNightShift", false, "allowSunday", false, "schedulingRuleSummary", "MuSchG §5"
    ))).andExpect(status().isOk());
    // Ending at 20:30 Berlin (19:30 UTC) violates MuSchG night work ban (>= 20:00)
    mvc.perform(submit("/api/v1/scheduling/shifts", manager, Map.of(
      "branchId", branch.id, "employeeId", pregnantEmpId,
      "start", "2026-11-10T12:00:00Z", "end", "2026-11-10T19:30:00Z", "breakMinutes", 30
    ))).andExpect(status().isBadRequest());

    // Back-to-back shifts with 0m gap violate ArbZG §5 11h rest period
    long empId = demoEmployee().employeeId;
    okJson(submit("/api/v1/scheduling/shifts", manager, Map.of(
      "branchId", branch.id, "employeeId", empId,
      "start", "2026-11-12T07:00:00Z", "end", "2026-11-12T11:00:00Z", "breakMinutes", 0
    )));
    mvc.perform(submit("/api/v1/scheduling/shifts", manager, Map.of(
      "branchId", branch.id, "employeeId", empId,
      "start", "2026-11-12T11:00:00Z", "end", "2026-11-12T15:00:00Z", "breakMinutes", 0
    ))).andExpect(status().isBadRequest());
  }

  @Test
  void branchScopeBreakSyncAndLeaveGuardsWorkEndToEnd() throws Exception {
    var hrSession = hr();
    var manager = login("manager@atelier.local");
    var empSession = login("employee@atelier.local");
    var stuttgart = demoBranch("STR-01");
    var munich = demoBranch("MUC-05");
    long stuttgartEmp = demoEmployee().employeeId;

    // Create timesheet in Munich (foreign branch) with pending change request and verify Stuttgart doesn't see it
    long munichEmp = okJson(submit("/api/v1/workforce/employees", hrSession, Map.of(
      "branchId", munich.id, "legalEntityId", munich.legalEntityId, "employeeCode", "MUC-901",
      "firstName", "Paul", "lastName", "Meier", "hireDate", "2026-01-01", "email", "muc901@atelier.local", "hourlyWage", 15.00
    ))).get("employeeId").asLong();
    long mucTsId = okJson(submit("/api/v1/attendance/manual-entry", hrSession, Map.of(
      "branchId", munich.id, "employeeId", munichEmp, "workDate", "2026-11-18",
      "startUtc", "2026-11-18T08:00:00Z", "endUtc", "2026-11-18T13:00:00Z",
      "breakMinutes", 0, "reason", "Kiosk offline"
    ))).get("timesheetId").asLong();
    var foreignReq = new AttendanceChangeRequestEntity();
    foreignReq.timesheetId = mucTsId;
    foreignReq.employeeId = munichEmp;
    foreignReq.requestedEndUtc = Instant.parse("2026-11-18T13:15:00Z");
    foreignReq.reason = "Foreign branch test";
    foreignReq.deltaMinutes = 15;
    foreignReq.status = "PENDING";
    db.save(foreignReq);
    db.flush();

    mvc.perform(get("/api/v1/reconciliation/change-requests").param("branchId", stuttgart.id).session(manager))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(0));
    mvc.perform(get("/api/v1/reconciliation/kpis").param("branchId", stuttgart.id).session(manager))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.pendingRequestsCount").value(0));

    // Break adjustment sync + SFN recalculation resets recalculationRequired and stores UUID approver ID
    long tsId = okJson(submit("/api/v1/attendance/manual-entry", manager, Map.of(
      "branchId", stuttgart.id, "employeeId", stuttgartEmp, "workDate", "2026-11-19",
      "startUtc", "2026-11-19T15:00:00Z", "endUtc", "2026-11-19T22:30:00Z",
      "breakMinutes", 30, "reason", "Terminal offline"
    ))).get("timesheetId").asLong();
    long reqId = okJson(submit("/api/v1/reconciliation/change-requests", empSession, Map.of(
      "timesheetId", tsId, "requestedBreakMinutes", 45, "reason", "Extended statutory break"
    ))).get("requestId").asLong();
    mvc.perform(submit("/api/v1/reconciliation/change-requests/" + reqId + "/approve", hrSession, Map.of()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.decidedByUserId").isNotEmpty());
    // Already-approved request cannot be rejected afterward
    mvc.perform(submit("/api/v1/reconciliation/change-requests/" + reqId + "/reject", hrSession, Map.of()))
      .andExpect(status().isBadRequest());
    // SFN calculation succeeds with synced BreakRecordEntity & resets recalculationRequired
    mvc.perform(submit("/api/v1/allowances/calculate/" + tsId, hrSession, Map.of()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.totalPaidAmountEur").isNumber());
    assertFalse(Boolean.TRUE.equals(db.all(AttendanceTimesheetEntity.class).stream()
      .filter(t -> t.timesheetId.equals(tsId)).findFirst().orElseThrow().recalculationRequired));

    // Locked period rejects manual-entry for locked dates
    okJson(submit("/api/v1/reconciliation/lock-period", manager, Map.of(
      "branchId", stuttgart.id, "lockUpToDate", "2026-11-19"
    )));
    mvc.perform(submit("/api/v1/attendance/manual-entry", manager, Map.of(
      "branchId", stuttgart.id, "employeeId", stuttgartEmp, "workDate", "2026-11-19",
      "startUtc", "2026-11-19T06:00:00Z", "endUtc", "2026-11-19T10:00:00Z",
      "breakMinutes", 0, "reason", "After lock attempt"
    ))).andExpect(status().isConflict());

    // BUrlG §7(3): Carried-over days expire after March 31 and leave/sickness overlaps are blocked
    mvc.perform(submit("/api/v1/leaves/balances", hrSession, Map.of(
      "employeeId", stuttgartEmp, "year", 2026, "entitledDays", 20, "carriedDays", 5
    ))).andExpect(status().isOk()).andExpect(jsonPath("$.expiryDate").value("2026-03-31"));
    var annualType = db.all(LeaveTypeEntity.class).stream().filter(t -> t.leaveCode.equals("ANNUAL")).findFirst().orElseThrow();
    mvc.perform(submit("/api/v1/leaves/requests", empSession, Map.of(
      "leaveTypeId", annualType.leaveTypeId, "startDate", "2026-06-01", "endDate", "2026-06-30"
    ))).andExpect(status().isConflict()); // Needs 22 business days > 20 entitled (5 carried expired after 31.03)
    mvc.perform(submit("/api/v1/leaves/sickness", hrSession, Map.of(
      "employeeId", stuttgartEmp, "startDate", "2026-11-24", "endDate", "2026-11-25"
    ))).andExpect(status().isOk());
    mvc.perform(submit("/api/v1/leaves/sickness", hrSession, Map.of(
      "employeeId", stuttgartEmp, "startDate", "2026-11-25", "endDate", "2026-11-26"
    ))).andExpect(status().isConflict());
    mvc.perform(submit("/api/v1/leaves/requests", empSession, Map.of(
      "leaveTypeId", annualType.leaveTypeId, "startDate", "2026-11-24", "endDate", "2026-11-24"
    ))).andExpect(status().isConflict());
  }
}
