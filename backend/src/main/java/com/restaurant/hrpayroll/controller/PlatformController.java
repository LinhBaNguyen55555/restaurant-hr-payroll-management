package com.restaurant.hrpayroll.controller;

import com.restaurant.hrpayroll.service.Access;
import com.restaurant.hrpayroll.service.AuthService;
import com.restaurant.hrpayroll.repository.Store;

import static com.restaurant.hrpayroll.entity.Domain.*;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class PlatformController {

  final Store db;
  final AuthService auth;
  final Access access;

  public PlatformController(Store db, AuthService auth, Access access) {
    this.db = db;
    this.auth = auth;
    this.access = access;
  }

  record Login(
    @NotBlank @Size(max = 255) String email,
    @NotBlank @Size(max = 72) String password
  ) {}

  record Otp(@Pattern(regexp = "\\d{6}") String code, boolean enroll) {}

  record Reset(
    @NotBlank String token,
    @NotBlank @Size(min = 12, max = 72) String password
  ) {}

  record Rotate(
    @NotBlank @Size(max = 72) String password,
    @NotBlank @Pattern(regexp = "\\d{6}") String code
  ) {}

  record EntityInput(
    @NotBlank @Pattern(regexp = "[A-Z0-9-]{2,24}") String code,
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Size(max = 100) String registrationNumber,
    @NotBlank @Size(max = 240) String address,
    boolean active,
    long version
  ) {}

  record BranchInput(
    @NotBlank @Pattern(regexp = "[A-Z0-9-]{2,24}") String code,
    @NotBlank @Size(max = 120) String name,
    @NotBlank String legalEntityId,
    @NotBlank @Size(max = 100) String city,
    @NotBlank @Size(max = 240) String address,
    @NotBlank String stateCode,
    @NotBlank String timezone,
    boolean active,
    long version
  ) {}

  record LocationInput(
    @NotBlank String branchId,
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Size(max = 240) String address,
    @NotBlank String stateCode,
    @NotBlank String timezone,
    boolean active,
    long version
  ) {}

  record ManagerInput(
    @NotBlank String managerId,
    @NotBlank String branchId,
    @NotNull LocalDate validFrom,
    LocalDate validTo
  ) {}

  record AssignmentInput(
    @NotBlank String employeeId,
    @NotBlank String branchId,
    @NotBlank String workLocationId,
    @NotNull LocalDate validFrom,
    LocalDate validTo,
    @NotBlank @Pattern(regexp = "HOME|TEMPORARY") String kind,
    @NotBlank @Size(max = 500) String reason
  ) {}

  record EndInput(@NotNull LocalDate validTo, long version) {}

  record UserInput(
    @NotBlank @Size(max = 100) String name,
    @Email @NotBlank String email,
    @NotEmpty Set<Role> roles,
    Set<String> legalEntityIds,
    Set<String> branchIds,
    @Size(min = 12, max = 72) String password,
    boolean active,
    long version
  ) {}

  public static final Map<String, String> STATES = Map.ofEntries(
    Map.entry("BW", "Baden-Württemberg"),
    Map.entry("BY", "Bayern"),
    Map.entry("BE", "Berlin"),
    Map.entry("BB", "Brandenburg"),
    Map.entry("HB", "Bremen"),
    Map.entry("HH", "Hamburg"),
    Map.entry("HE", "Hessen"),
    Map.entry("MV", "Mecklenburg-Vorpommern"),
    Map.entry("NI", "Niedersachsen"),
    Map.entry("NW", "Nordrhein-Westfalen"),
    Map.entry("RP", "Rheinland-Pfalz"),
    Map.entry("SL", "Saarland"),
    Map.entry("SN", "Sachsen"),
    Map.entry("ST", "Sachsen-Anhalt"),
    Map.entry("SH", "Schleswig-Holstein"),
    Map.entry("TH", "Thüringen")
  );

  public record HolidayInfo(
    String name,
    String nameVi,
    LocalDate date,
    boolean nationwide,
    List<String> states
  ) {}

  public static LocalDate calculateEaster(int year) {
    int a = year % 19;
    int b = year / 100;
    int c = year % 100;
    int d = b / 4;
    int e = b % 4;
    int f = (b + 8) / 25;
    int g = (b - f + 1) / 3;
    int h = (19 * a + b - d - g + 15) % 30;
    int i = c / 4;
    int k = c % 4;
    int l = (32 + 2 * e + 2 * i - h - k) % 7;
    int m = (a + 11 * h + 22 * l) / 451;
    int month = (h + l - 7 * m + 114) / 31;
    int day = ((h + l - 7 * m + 114) % 31) + 1;
    return LocalDate.of(year, month, day);
  }

  public static List<HolidayInfo> getGermanHolidays(int year) {
    LocalDate easter = calculateEaster(year);
    List<HolidayInfo> list = new ArrayList<>();
    list.add(new HolidayInfo("Neujahr", "Tết Dương lịch", LocalDate.of(year, 1, 1), true, List.of()));
    list.add(new HolidayInfo("Karfreitag", "Thứ Sáu Tuần Thánh", easter.minusDays(2), true, List.of()));
    list.add(new HolidayInfo("Ostermontag", "Thứ Hai Phục Sinh", easter.plusDays(1), true, List.of()));
    list.add(new HolidayInfo("Tag der Arbeit", "Ngày Quốc tế Lao động", LocalDate.of(year, 5, 1), true, List.of()));
    list.add(new HolidayInfo("Christi Himmelfahrt", "Lễ Thăng Thiên", easter.plusDays(39), true, List.of()));
    list.add(new HolidayInfo("Pfingstmontag", "Thứ Hai Lễ Hiện Xuống", easter.plusDays(50), true, List.of()));
    list.add(new HolidayInfo("Tag der Deutschen Einheit", "Ngày Thống nhất Đức", LocalDate.of(year, 10, 3), true, List.of()));
    list.add(new HolidayInfo("1. Weihnachtstag", "Giáng sinh (Ngày 1)", LocalDate.of(year, 12, 25), true, List.of()));
    list.add(new HolidayInfo("2. Weihnachtstag", "Giáng sinh (Ngày 2)", LocalDate.of(year, 12, 26), true, List.of()));
    list.add(new HolidayInfo("Heilige Drei Könige", "Lễ Ba Vua", LocalDate.of(year, 1, 6), false, List.of("BW", "BY", "ST")));
    list.add(new HolidayInfo("Internationaler Frauentag", "Ngày Quốc tế Phụ nữ", LocalDate.of(year, 3, 8), false, List.of("BE", "MV")));
    list.add(new HolidayInfo("Fronleichnam", "Lễ Mình Máu Thánh Chúa", easter.plusDays(60), false, List.of("BW", "BY", "HE", "NW", "RP", "SL")));
    list.add(new HolidayInfo("Mariä Himmelfahrt", "Lễ Đức Mẹ Hồn Xác Lên Trời", LocalDate.of(year, 8, 15), false, List.of("BY", "SL")));
    list.add(new HolidayInfo("Weltkindertag", "Ngày Quốc tế Thiếu nhi", LocalDate.of(year, 9, 20), false, List.of("TH")));
    list.add(new HolidayInfo("Reformationstag", "Ngày Cải cách Kháng cách", LocalDate.of(year, 10, 31), false, List.of("BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH")));
    list.add(new HolidayInfo("Allerheiligen", "Lễ Các Thánh", LocalDate.of(year, 11, 1), false, List.of("BW", "BY", "NW", "RP", "SL")));
    LocalDate nov23 = LocalDate.of(year, 11, 23);
    int daysToWed = (nov23.getDayOfWeek().getValue() - DayOfWeek.WEDNESDAY.getValue() + 7) % 7;
    if (daysToWed == 0) daysToWed = 7;
    LocalDate bussUndBettag = nov23.minusDays(daysToWed);
    list.add(new HolidayInfo("Buß- und Bettag", "Ngày Sám hối và Cầu nguyện", bussUndBettag, false, List.of("SN")));
    list.sort(Comparator.comparing(HolidayInfo::date));
    return list;
  }

  public static final List<Map<String, Object>> SOD_RULES = List.of(
    Map.of(
      "code", "SOD-01",
      "nameVi", "Không kiêm nhiệm Tính lương & Phê duyệt chi trả",
      "nameDe", "Trennung Entgeltabrechnung und Finanzfreigabe",
      "descriptionVi", "Người tính lương (PAYROLL_OFFICER) không được đồng thời là Người phê duyệt thanh toán (FINANCE_APPROVER) để bảo đảm kiểm soát chi độc lập.",
      "descriptionDe", "Eine Person darf nicht gleichzeitig Abrechnung erstellen und Auszahlung freigeben.",
      "severity", "CRITICAL"
    ),
    Map.of(
      "code", "SOD-02",
      "nameVi", "Tách biệt Quản trị hệ thống và Dữ liệu tiền lương",
      "nameDe", "Trennung Systemadministration und Gehaltsdaten",
      "descriptionVi", "Quản trị viên tài khoản (SYSTEM_ADMIN) không mặc nhiên có quyền xem dữ liệu tiền lương nhạy cảm của nhân sự.",
      "descriptionDe", "Administrationskonten erhalten keinen automatischen Zugriff auf vertrauliche Gehaltsdaten.",
      "severity", "HIGH"
    ),
    Map.of(
      "code", "SOD-03",
      "nameVi", "Không tự phê duyệt chấm công cá nhân",
      "nameDe", "Keine Selbstfreigabe von Arbeitszeiten",
      "descriptionVi", "Quản lý nhà hàng (RESTAURANT_MANAGER) không được tự phê duyệt giờ làm việc hoặc chấm công của chính mình (Nguyên tắc 4 mắt).",
      "descriptionDe", "Leitungskräfte dürfen ihre eigenen Arbeitszeitnachweise nicht eigenständig abzeichnen.",
      "severity", "HIGH"
    ),
    Map.of(
      "code", "SOD-04",
      "nameVi", "Cấm điều chuyển xuyên pháp nhân không hợp đồng",
      "nameDe", "Verbot gesellschaftsübergreifender Versetzung ohne Vertrag",
      "descriptionVi", "Không được điều chuyển nhân viên sang chi nhánh thuộc pháp nhân khác khi chưa hoàn tất phụ lục hoặc hợp đồng lao động mới.",
      "descriptionDe", "Ein Wechsel der Rechtseinheit erfordert zwingend einen gesonderten Vertragsprozess.",
      "severity", "CRITICAL"
    ),
    Map.of(
      "code", "SOD-05",
      "nameVi", "Không trùng lặp người quản lý chi nhánh",
      "nameDe", "Eindeutige Leitungszuordnung ohne Überschneidung",
      "descriptionVi", "Trong cùng một khoảng thời gian hiệu lực, mỗi chi nhánh chỉ có một Quản lý trưởng chịu trách nhiệm điều hành.",
      "descriptionDe", "Zeiträume für Restaurantleitung dürfen sich an einem Standort nicht überschneiden.",
      "severity", "MEDIUM"
    )
  );

  void guard(String permission, HttpServletRequest req) {
    auth.complete(req);
    access.require(permission);
  }

  void state(String code, String timezone) {
    if (!STATES.containsKey(code)) AuthService.bad(
      "Bitte ein gültiges Bundesland wählen."
    );
    if (!"Europe/Berlin".equals(timezone)) AuthService.bad(
      "Für deutsche Standorte ist Europe/Berlin erforderlich."
    );
  }

  boolean overlaps(LocalDate a, LocalDate b, LocalDate c, LocalDate d) {
    return (b == null || !b.isBefore(c)) && (d == null || !d.isBefore(a));
  }

  void dates(LocalDate from, LocalDate to) {
    if (to != null && to.isBefore(from)) AuthService.bad(
      "Das Enddatum liegt vor dem Startdatum."
    );
  }

  void audit(String action, String target, String branch, String detail) {
    auth.audit(auth.current(), action, target, branch, detail);
  }

  @GetMapping("/auth/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }

  @PostMapping("/auth/login")
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public Map<String, Object> login(
    @Valid @RequestBody Login input,
    HttpServletRequest req
  ) {
    return auth.login(input.email, input.password, req);
  }

  @GetMapping("/auth/me")
  public Map<String, Object> me(HttpServletRequest req) {
    return auth.view(auth.current(), req.getSession());
  }

  @PostMapping("/auth/logout")
  public Map<String, Boolean> logout(HttpServletRequest req) {
    auth.logout(req);
    return Map.of("ok", true);
  }

  @PostMapping("/auth/mfa/setup")
  public Map<String, String> setup(HttpServletRequest req) {
    return auth.setup(req);
  }

  @PostMapping("/auth/mfa/rotate")
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public Map<String, String> rotate(
    @Valid @RequestBody Rotate in,
    HttpServletRequest req
  ) {
    return auth.rotate(in.password, in.code, req);
  }

  @PostMapping("/auth/mfa/verify")
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public Map<String, Object> verify(
    @Valid @RequestBody Otp input,
    HttpServletRequest req
  ) {
    return auth.verify(input.code, input.enroll, req);
  }

  @PostMapping("/auth/reset")
  public Map<String, Boolean> reset(
    @Valid @RequestBody Reset input,
    HttpServletRequest req
  ) {
    auth.reset(input.token, input.password, req);
    return Map.of("ok", true);
  }

  @GetMapping("/auth/sessions")
  public Object sessions(HttpServletRequest req) {
    return auth.sessions(req);
  }

  @DeleteMapping("/auth/sessions/{id}")
  public Map<String, Boolean> revoke(
    @PathVariable String id,
    HttpServletRequest req
  ) {
    auth.revoke(id, req);
    return Map.of("ok", true);
  }

  @GetMapping("/workspace")
  public Map<String, Object> workspace(HttpServletRequest req) {
    auth.complete(req);
    UserAccount u = auth.current();
    Set<String> perms = access.permissions(u);
    List<Branch> branches = perms.contains("org.read")
      ? db
          .all(Branch.class)
          .stream()
          .filter(b -> access.branch(u, b))
          .toList()
      : List.of();
    Set<String> branchIds = new HashSet<>(
      branches
        .stream()
        .map(b -> b.id)
        .toList()
    );
    List<LegalEntity> entities = db
      .all(LegalEntity.class)
      .stream()
      .filter(
        e ->
          perms.contains("org.read") &&
          (access.entity(u, e.id) ||
            branches.stream().anyMatch(b -> b.legalEntityId.equals(e.id)))
      )
      .toList();
    List<EmployeeAssignment> assignments = perms.contains("workforce.read")
      ? db
          .all(EmployeeAssignment.class)
          .stream()
          .filter(a -> branchIds.contains(a.branchId))
          .toList()
      : List.of();
    Set<String> employeeIds = new HashSet<>(
      assignments
        .stream()
        .map(a -> a.employeeId)
        .toList()
    );
    List<EmployeeRef> employees = perms.contains("workforce.read")
      ? db
          .all(EmployeeRef.class)
          .stream()
          .filter(
            e ->
              branchIds.contains(e.homeBranchId) || employeeIds.contains(e.id)
          )
          .toList()
      : List.of();
    List<ManagerAssignment> managers = db
      .all(ManagerAssignment.class)
      .stream()
      .filter(a -> branchIds.contains(a.branchId))
      .toList();
    List<Map<String, Object>> managerOptions = db
      .all(UserAccount.class)
      .stream()
      .filter(a -> a.active && csv(a.roles).contains("RESTAURANT_MANAGER"))
      .filter(
        a ->
          access.global(u) ||
          managers.stream().anyMatch(m -> m.managerId.equals(a.id)) ||
          (perms.contains("assignment.write") &&
            (csv(a.branchIds).stream().anyMatch(branchIds::contains) ||
              csv(a.legalEntityIds)
                .stream()
                .anyMatch(id -> access.entity(u, id))))
      )
      .map(a -> Map.<String, Object>of("id", a.id, "name", a.name))
      .toList();
    List<AuditEvent> events = perms.contains("audit.read")
      ? db
          .all(AuditEvent.class)
          .stream()
          .filter(
            a ->
              access.global(u) ||
              (a.branchId != null && branchIds.contains(a.branchId))
          )
          .sorted(
            Comparator.comparing((AuditEvent a) -> a.createdAt).reversed()
          )
          .limit(50)
          .toList()
      : List.of();
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("user", auth.view(u, req.getSession()));
    result.put("permissions", perms);
    result.put("entities", entities);
    result.put("branches", branches);
    result.put(
      "locations",
      db
        .all(WorkLocation.class)
        .stream()
        .filter(l -> branchIds.contains(l.branchId))
        .toList()
    );
    result.put("employees", employees);
    result.put("assignments", assignments);
    result.put("managerAssignments", managers);
    result.put("managerOptions", managerOptions);
    result.put("audit", events);
    result.put("states", STATES);
    result.put(
      "users",
      perms.contains("iam.read")
        ? db.all(UserAccount.class).stream().map(this::userView).toList()
        : List.of()
    );
    result.put("sodRules", SOD_RULES);
    result.put(
      "holidays",
      getGermanHolidays(LocalDate.now(ZoneId.of("Europe/Berlin")).getYear())
    );
    return result;
  }

  @GetMapping("/iam/sod-matrix")
  public Map<String, Object> sodMatrix(HttpServletRequest req) {
    auth.complete(req);
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("rules", SOD_RULES);
    Map<String, Set<String>> rolePerms = new LinkedHashMap<>();
    for (Role r : Role.values()) {
      UserAccount dummy = new UserAccount();
      dummy.roles = r.name();
      rolePerms.put(r.name(), access.permissions(dummy));
    }
    map.put("rolePermissions", rolePerms);
    map.put(
      "incompatibleRoles",
      List.of(
        Map.of(
          "roleA",
          "PAYROLL_OFFICER",
          "roleB",
          "FINANCE_APPROVER",
          "reason",
          "Trennung von Entgeltberechnung und Zahlungsfreigabe (SoD)"
        )
      )
    );
    return map;
  }

  @GetMapping("/org/holidays")
  public Map<String, Object> holidays(
    @RequestParam(required = false) String stateCode,
    @RequestParam(required = false) Integer year,
    HttpServletRequest req
  ) {
    auth.complete(req);
    int targetYear =
      year != null
        ? year
        : LocalDate.now(ZoneId.of("Europe/Berlin")).getYear();
    List<HolidayInfo> all = getGermanHolidays(targetYear);
    List<HolidayInfo> filtered =
      stateCode == null || stateCode.isBlank()
        ? all
        : all
          .stream()
          .filter(
            h ->
              h.nationwide() ||
              h.states().contains(stateCode.toUpperCase(Locale.ROOT))
          )
          .toList();
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("year", targetYear);
    res.put(
      "stateCode",
      stateCode != null ? stateCode.toUpperCase(Locale.ROOT) : "ALL"
    );
    res.put(
      "stateName",
      stateCode != null &&
        STATES.containsKey(stateCode.toUpperCase(Locale.ROOT))
        ? STATES.get(stateCode.toUpperCase(Locale.ROOT))
        : "Deutschland"
    );
    res.put("count", filtered.size());
    res.put("holidays", filtered);
    return res;
  }

  Map<String, Object> userView(UserAccount u) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", u.id);
    m.put("version", u.version);
    m.put("name", u.name);
    m.put("email", u.email);
    m.put("roles", csv(u.roles));
    m.put("legalEntityIds", csv(u.legalEntityIds));
    m.put("branchIds", csv(u.branchIds));
    m.put("active", u.active);
    m.put("mfaEnabled", u.mfaEnabled);
    m.put("lastLogin", u.lastLogin);
    return m;
  }

  @PostMapping("/org/entities")
  public LegalEntity createEntity(
    @Valid @RequestBody EntityInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    if (!access.global(auth.current())) AuthService.forbidden();
    LegalEntity e = new LegalEntity();
    setEntity(e, in);
    db.save(e);
    audit("ENTITY_CREATED", e.id, null, e.code + " · " + e.name);
    return e;
  }

  @PutMapping("/org/entities/{id}")
  public LegalEntity updateEntity(
    @PathVariable String id,
    @Valid @RequestBody EntityInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    access.entity(id);
    LegalEntity e = db.get(LegalEntity.class, id);
    Store.checkVersion(e, in.version);
    if (
      !in.active &&
      db
        .all(Branch.class)
        .stream()
        .anyMatch(b -> b.legalEntityId.equals(id) && b.active)
    ) AuthService.bad("Bitte zuerst die aktiven Niederlassungen deaktivieren.");
    setEntity(e, in);
    audit("ENTITY_UPDATED", id, null, e.code + " · Status " + e.active);
    db.flush();
    return e;
  }

  void setEntity(LegalEntity e, EntityInput in) {
    e.code = in.code;
    e.name = in.name.trim();
    e.registrationNumber = in.registrationNumber.trim();
    e.address = in.address.trim();
    e.active = in.active;
  }

  @PostMapping("/org/branches")
  public Branch createBranch(
    @Valid @RequestBody BranchInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    access.entity(in.legalEntityId);
    Branch b = new Branch();
    setBranch(b, in);
    db.save(b);
    WorkLocation l = new WorkLocation();
    l.branchId = b.id;
    l.name = "Hauptstandort";
    l.address = b.address;
    l.stateCode = b.stateCode;
    db.save(l);
    audit("BRANCH_CREATED", b.id, b.id, b.code + " · " + b.name);
    return b;
  }

  @PutMapping("/org/branches/{id}")
  public Branch updateBranch(
    @PathVariable String id,
    @Valid @RequestBody BranchInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    access.branch(id);
    Branch b = db.get(Branch.class, id);
    Store.checkVersion(b, in.version);
    if (!b.legalEntityId.equals(in.legalEntityId)) AuthService.bad(
      "Die Rechtseinheit einer bestehenden Niederlassung kann nicht geändert werden."
    );
    setBranch(b, in);
    audit("BRANCH_UPDATED", id, id, b.code + " · Status " + b.active);
    db.flush();
    return b;
  }

  void setBranch(Branch b, BranchInput in) {
    state(in.stateCode, in.timezone);
    if (!db.get(LegalEntity.class, in.legalEntityId).active) AuthService.bad(
      "Die Rechtseinheit ist inaktiv."
    );
    b.code = in.code;
    b.name = in.name.trim();
    b.legalEntityId = in.legalEntityId;
    b.city = in.city.trim();
    b.address = in.address.trim();
    b.stateCode = in.stateCode;
    b.timezone = in.timezone;
    b.active = in.active;
  }

  @PostMapping("/org/locations")
  public WorkLocation createLocation(
    @Valid @RequestBody LocationInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    access.branch(in.branchId);
    if (!db.get(Branch.class, in.branchId).active) AuthService.bad(
      "Die Niederlassung ist inaktiv."
    );
    WorkLocation l = new WorkLocation();
    setLocation(l, in);
    db.save(l);
    audit("LOCATION_CREATED", l.id, l.branchId, l.name + " · " + l.stateCode);
    return l;
  }

  @PutMapping("/org/locations/{id}")
  public WorkLocation updateLocation(
    @PathVariable String id,
    @Valid @RequestBody LocationInput in,
    HttpServletRequest req
  ) {
    guard("org.write", req);
    WorkLocation l = db.get(WorkLocation.class, id);
    access.branch(l.branchId);
    Store.checkVersion(l, in.version);
    if (!l.branchId.equals(in.branchId)) AuthService.bad(
      "Standorte können nicht in eine andere Niederlassung verschoben werden."
    );
    setLocation(l, in);
    audit("LOCATION_UPDATED", id, l.branchId, l.name + " · " + l.stateCode);
    db.flush();
    return l;
  }

  void setLocation(WorkLocation l, LocationInput in) {
    state(in.stateCode, in.timezone);
    l.branchId = in.branchId;
    l.name = in.name.trim();
    l.address = in.address.trim();
    l.stateCode = in.stateCode;
    l.timezone = in.timezone;
    l.active = in.active;
  }

  @PostMapping("/org/managers")
  public ManagerAssignment manager(
    @Valid @RequestBody ManagerInput in,
    HttpServletRequest req
  ) {
    guard("assignment.write", req);
    access.branch(in.branchId);
    dates(in.validFrom, in.validTo);
    if (!db.get(Branch.class, in.branchId).active) AuthService.bad(
      "Die Niederlassung ist inaktiv."
    );
    UserAccount u = db.get(UserAccount.class, in.managerId);
    if (
      !u.active || !csv(u.roles).contains("RESTAURANT_MANAGER")
    ) AuthService.bad("Bitte eine aktive Restaurantleitung wählen.");
    db.lock(db.get(Branch.class, in.branchId));
    if (
      db
        .all(ManagerAssignment.class)
        .stream()
        .anyMatch(
          a ->
            a.branchId.equals(in.branchId) &&
            overlaps(a.validFrom, a.validTo, in.validFrom, in.validTo)
        )
    ) AuthService.bad(
      "Für diesen Zeitraum ist bereits eine Leitung zugeordnet."
    );
    ManagerAssignment a = new ManagerAssignment();
    a.managerId = in.managerId;
    a.branchId = in.branchId;
    a.validFrom = in.validFrom;
    a.validTo = in.validTo;
    db.save(a);
    audit(
      "MANAGER_ASSIGNED",
      a.id,
      a.branchId,
      u.name + " · ab " + a.validFrom
    );
    return a;
  }

  @PostMapping("/org/assignments")
  public EmployeeAssignment assign(
    @Valid @RequestBody AssignmentInput in,
    HttpServletRequest req
  ) {
    guard("assignment.write", req);
    access.branch(in.branchId);
    EmployeeRef e = db.get(EmployeeRef.class, in.employeeId);
    access.branch(e.homeBranchId);
    Branch b = db.get(Branch.class, in.branchId);
    Branch home = db.get(Branch.class, e.homeBranchId);
    if (!home.legalEntityId.equals(b.legalEntityId)) AuthService.bad(
      "Ein Wechsel der Rechtseinheit benötigt einen gesonderten Vertragsprozess."
    );
    WorkLocation l = db.get(WorkLocation.class, in.workLocationId);
    if (!b.active || !l.active || !l.branchId.equals(b.id)) AuthService.bad(
      "Bitte einen aktiven Standort dieser Niederlassung wählen."
    );
    dates(in.validFrom, in.validTo);
    db.lock(e);
    if (
      db
        .all(EmployeeAssignment.class)
        .stream()
        .anyMatch(
          a ->
            a.employeeId.equals(e.id) &&
            overlaps(a.validFrom, a.validTo, in.validFrom, in.validTo)
        )
    ) AuthService.bad(
      "Für diese Person besteht eine überlappende Zuordnung. Bitte zuerst den bisherigen Zeitraum beenden."
    );
    EmployeeAssignment a = new EmployeeAssignment();
    a.employeeId = e.id;
    a.branchId = b.id;
    a.workLocationId = l.id;
    a.validFrom = in.validFrom;
    a.validTo = in.validTo;
    a.kind = in.kind;
    a.reason = in.reason.trim();
    a.stateCode = l.stateCode;
    a.timezone = l.timezone;
    a.addressSnapshot = l.address;
    db.save(a);
    audit(
      "EMPLOYEE_ASSIGNED",
      a.id,
      b.id,
      e.name + " · " + a.reason + " · " + a.validFrom
    );
    return a;
  }

  @PutMapping("/org/assignments/{id}/end")
  public EmployeeAssignment end(
    @PathVariable String id,
    @Valid @RequestBody EndInput in,
    HttpServletRequest req
  ) {
    guard("assignment.write", req);
    EmployeeAssignment a = db.get(EmployeeAssignment.class, id);
    access.branch(a.branchId);
    Store.checkVersion(a, in.version);
    dates(a.validFrom, in.validTo);
    if (a.validTo != null && !a.validTo.equals(in.validTo)) AuthService.bad(
      "Ein beendeter Zeitraum kann nicht überschrieben werden."
    );
    a.validTo = in.validTo;
    audit("ASSIGNMENT_ENDED", id, a.branchId, "Ende " + in.validTo);
    db.flush();
    return a;
  }

  @PutMapping("/org/managers/{id}/end")
  public ManagerAssignment endManager(
    @PathVariable String id,
    @Valid @RequestBody EndInput in,
    HttpServletRequest req
  ) {
    guard("assignment.write", req);
    ManagerAssignment a = db.get(ManagerAssignment.class, id);
    access.branch(a.branchId);
    Store.checkVersion(a, in.version);
    dates(a.validFrom, in.validTo);
    if (a.validTo != null && !a.validTo.equals(in.validTo)) AuthService.bad(
      "Ein beendeter Zeitraum kann nicht überschrieben werden."
    );
    a.validTo = in.validTo;
    audit("MANAGER_ENDED", id, a.branchId, "Ende " + in.validTo);
    db.flush();
    return a;
  }

  @PostMapping("/iam/users")
  public Object createUser(
    @Valid @RequestBody UserInput in,
    HttpServletRequest req
  ) {
    guard("iam.write", req);
    if (in.password == null) AuthService.bad(
      "Bitte ein initiales Passwort angeben."
    );
    UserAccount u = new UserAccount();
    setUser(u, in);
    u.passwordHash = auth.hash(in.password);
    db.save(u);
    audit("ACCOUNT_CREATED", u.id, null, u.email + " · " + u.roles);
    return userView(u);
  }

  @PutMapping("/iam/users/{id}")
  public Object updateUser(
    @PathVariable String id,
    @Valid @RequestBody UserInput in,
    HttpServletRequest req
  ) {
    guard("iam.write", req);
    UserAccount u = db.get(UserAccount.class, id);
    Store.checkVersion(u, in.version);
    if (
      u.id.equals(auth.current().id) &&
      (!in.active || !in.roles.contains(Role.SYSTEM_ADMIN))
    ) AuthService.bad(
      "Das eigene Administratorkonto darf hier nicht gesperrt oder herabgestuft werden."
    );
    setUser(u, in);
    u.authVersion++;
    audit(
      "ACCOUNT_UPDATED",
      id,
      null,
      u.email + " · " + u.roles + " · active=" + u.active
    );
    db.flush();
    return userView(u);
  }

  void setUser(UserAccount u, UserInput in) {
    if (in.roles.contains(Role.PAYROLL_OFFICER) && in.roles.contains(Role.FINANCE_APPROVER)) {
      AuthService.bad(
        "Funktionstrennung (SoD): Die Rollen Entgeltabrechnung (PAYROLL_OFFICER) und Finanzfreigabe (FINANCE_APPROVER) schließen sich gegenseitig aus."
      );
    }
    for (String id : in.legalEntityIds == null
      ? Set.<String>of()
      : in.legalEntityIds)
      db.get(LegalEntity.class, id);
    for (String id : in.branchIds == null ? Set.<String>of() : in.branchIds)
      db.get(Branch.class, id);
    u.name = in.name.trim();
    u.email = in.email.toLowerCase(Locale.ROOT).trim();
    u.roles = join(in.roles.stream().map(Enum::name).toList());
    u.legalEntityIds = join(
      in.legalEntityIds == null ? Set.of() : in.legalEntityIds
    );
    u.branchIds = join(in.branchIds == null ? Set.of() : in.branchIds);
    u.active = in.active;
  }

  @PostMapping("/iam/users/{id}/reset-link")
  public Object resetLink(@PathVariable String id, HttpServletRequest req) {
    guard("iam.write", req);
    UserAccount u = db.get(UserAccount.class, id);
    var link = auth.resetLink(u);
    audit(
      "RESET_LINK_CREATED",
      id,
      null,
      "Einmal-Link für " + u.email + " erstellt"
    );
    return link;
  }

  @RestControllerAdvice
  public static class Errors {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> response(
      ResponseStatusException e
    ) {
      return ResponseEntity.status(e.getStatusCode()).body(
        Map.of(
          "message",
          Optional.ofNullable(e.getReason()).orElse("Anfrage nicht möglich.")
        )
      );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalid(
      MethodArgumentNotValidException e
    ) {
      String field = e.getBindingResult().getFieldErrors().isEmpty()
        ? "Eingaben"
        : e.getBindingResult().getFieldErrors().getFirst().getField();
      return ResponseEntity.badRequest().body(
        Map.of("message", "Bitte das Feld „" + field + "“ prüfen.")
      );
    }

    @ExceptionHandler({
      DataIntegrityViolationException.class,
      OptimisticLockingFailureException.class,
    })
    public ResponseEntity<Map<String, String>> conflict(Exception e) {
      return ResponseEntity.status(409).body(
        Map.of(
          "message",
          "Der Code oder die E-Mail existiert bereits, oder der Datensatz wurde zwischenzeitlich geändert. Bitte neu laden."
        )
      );
    }

    @ExceptionHandler(
      org.springframework.http.converter.HttpMessageNotReadableException.class
    )
    public ResponseEntity<Map<String, String>> malformed(Exception e) {
      return ResponseEntity.badRequest().body(
        Map.of("message", "Die Eingaben sind unvollständig oder ungültig.")
      );
    }
  }
}

