export type Role =
  | "SYSTEM_ADMIN"
  | "HR_OFFICER"
  | "RESTAURANT_MANAGER"
  | "EMPLOYEE"
  | "PAYROLL_OFFICER"
  | "FINANCE_APPROVER"
  | "AUDITOR"
  | "DPO";
export type Row = { id: string; version: number; createdAt: string };
export type User = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  mfaEnabled: boolean;
  mfaRequired: boolean;
  mfaVerified: boolean;
  legalEntityIds: string[];
  branchIds: string[];
};
export type Account = User &
  Row & { active: boolean; lastLogin: string | null };
export type LegalEntity = Row & {
  code: string;
  name: string;
  registrationNumber: string;
  address: string;
  active: boolean;
};
export type Branch = Row & {
  code: string;
  name: string;
  legalEntityId: string;
  city: string;
  address: string;
  stateCode: string;
  timezone: string;
  active: boolean;
  accent: string;
};
export type WorkLocation = Row & {
  branchId: string;
  name: string;
  address: string;
  stateCode: string;
  timezone: string;
  active: boolean;
};
export type Employee = Row & {
  name: string;
  position: string;
  homeBranchId: string;
};
export type Assignment = Row & {
  stateCode?: string;
  timezone?: string;
  addressSnapshot?: string;
  employeeId: string;
  branchId: string;
  workLocationId: string;
  validFrom: string;
  validTo: string | null;
  kind: string;
  reason: string;
};
export type ManagerAssignment = Row & {
  managerId: string;
  branchId: string;
  validFrom: string;
  validTo: string | null;
};
export type AuditEvent = Row & {
  actorName: string;
  action: string;
  target: string;
  branchId: string | null;
  detail: string;
};
export type Session = {
  id: string;
  agent: string;
  createdAt: string;
  current: boolean;
};
export type SodRule = {
  code: string;
  nameVi: string;
  nameDe: string;
  descriptionVi: string;
  descriptionDe: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
};
export type HolidayInfo = {
  name: string;
  nameVi: string;
  date: string;
  nationwide: boolean;
  states: string[];
};
export type SodMatrix = {
  rules: SodRule[];
  rolePermissions: Record<string, string[]>;
  incompatibleRoles: { roleA: string; roleB: string; reason: string }[];
};
export type Workspace = {
  user: User;
  permissions: string[];
  selfEmployeeId?: number | null;
  selfPostings?: { branchId: string; branchName: string; positionCode: string | null }[];
  entities: LegalEntity[];
  branches: Branch[];
  locations: WorkLocation[];
  employees: Employee[];
  assignments: Assignment[];
  managerAssignments: ManagerAssignment[];
  managerOptions: { id: string; name: string }[];
  users: Account[];
  audit: AuditEvent[];
  states: Record<string, string>;
  sodRules?: SodRule[];
  holidays?: HolidayInfo[];
};
let csrf = "";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function translateErrorMessage(message: string): string {
  const isVi = (() => {
    try {
      return localStorage.getItem("atelier_language") === "vi";
    } catch {
      return false;
    }
  })();
  if (!isVi || !message) return message;

  const m = message.trim();

  if (m.includes("Zu viele Versuche") || m.includes("in 15 Minuten")) {
    return "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.";
  }
  if (m.includes("Anmeldung nicht möglich") || m.includes("Zugangsdaten prüfen")) {
    return "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.";
  }
  if (m.includes("Bitte anmelden")) {
    return "Vui lòng đăng nhập để tiếp tục.";
  }
  if (m.includes("Zugriff verweigert") || m.includes("Sicherheitstoken abgelaufen")) {
    return "Từ chối truy cập hoặc phiên làm việc đã hết hạn. Vui lòng tải lại trang.";
  }
  if (m.includes("Zwei-Faktor-Anmeldung abschließen") || m.includes("Zwei-Faktor")) {
    return "Vui lòng hoàn tất xác thực 2 bước (MFA) trước khi truy cập.";
  }
  if (m.includes("Das Enddatum liegt vor dem Startdatum")) {
    return "Ngày kết thúc không được trước ngày bắt đầu.";
  }
  if (m.includes("Bitte ein gültiges Bundesland wählen")) {
    return "Vui lòng chọn một vùng bang hợp lệ của Đức.";
  }
  if (m.includes("Für deutsche Standorte ist Europe/Berlin erforderlich")) {
    return "Múi giờ bắt buộc cho các cơ sở tại Đức là Europe/Berlin.";
  }
  if (m.includes("Link ungültig oder abgelaufen")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  }
  if (m.includes("Bestätigung nicht möglich")) {
    return "Không thể xác nhận thao tác. Mật khẩu không chính xác.";
  }
  if (m.includes("Bitte einen neuen gültigen Authenticator-Code verwenden")) {
    return "Mã Authenticator không đúng hoặc đã hết hạn. Vui lòng thử mã mới.";
  }
  if (m.includes("Bitte zuerst die aktiven Niederlassungen deaktivieren")) {
    return "Vui lòng dừng hoạt động tất cả chi nhánh trực thuộc trước khi ngừng pháp nhân.";
  }
  if (m.includes("Die Passwörter stimmen nicht überein")) {
    return "Mật khẩu xác nhận không khớp.";
  }
  if (m.includes("Keine Verbindung zum Server") || m.includes("Server nicht erreichbar")) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend.";
  }
  if (m.includes("Die Anfrage konnte nicht verarbeitet werden")) {
    return "Yêu cầu không thể xử lý được. Vui lòng thử lại sau.";
  }
  if (m.includes("Bitte das Feld „") && m.includes("“ prüfen")) {
    const fieldMatch = m.match(/Bitte das Feld „(.*?)“ prüfen/);
    const field = fieldMatch ? fieldMatch[1] : "";
    const fieldNameVi: Record<string, string> = {
      email: "Email hoặc Tên tài khoản",
      password: "Mật khẩu",
      name: "Tên",
      code: "Mã",
      address: "Địa chỉ",
      city: "Thành phố",
      stateCode: "Bang",
      timezone: "Múi giờ",
      validFrom: "Ngày bắt đầu",
      validTo: "Ngày kết thúc",
      reason: "Lý do",
      token: "Mã xác nhận",
    };
    return `Vui lòng kiểm tra lại trường: ${fieldNameVi[field] || field}.`;
  }

  return message;
}

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  try {
    if (method !== "GET" && !csrf) {
      const r = await fetch("/api/v1/auth/csrf");
      if (!r.ok) throw new ApiError(translateErrorMessage("Server nicht erreichbar."), r.status);
      csrf = (await r.json()).token;
    }
    const r = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(method !== "GET" ? { "X-XSRF-TOKEN": csrf } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 403) csrf = "";
      const raw = data.message || "Die Anfrage konnte nicht verarbeitet werden.";
      throw new ApiError(
        translateErrorMessage(raw),
        r.status,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      translateErrorMessage("Keine Verbindung zum Server. Bitte Backend starten und erneut versuchen."),
      0,
    );
  }
}
export const roleLabels: Record<Role, string> = {
  SYSTEM_ADMIN: "Systemadministration",
  HR_OFFICER: "Personalverwaltung",
  RESTAURANT_MANAGER: "Restaurantleitung",
  EMPLOYEE: "Mitarbeitende",
  PAYROLL_OFFICER: "Entgeltabrechnung",
  FINANCE_APPROVER: "Finanzfreigabe",
  AUDITOR: "Revision",
  DPO: "Datenschutz",
};
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(
    new Date(),
  );
export const activeOn = (
  a: { validFrom: string; validTo: string | null },
  date = today(),
) => a.validFrom <= date && (!a.validTo || a.validTo >= date);
export const dateDE = (s: string | null | undefined) =>
  s
    ? new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(s.length === 10 ? `${s}T12:00:00Z` : s))
    : "Unbefristet";
export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

// --- F02 & F03 TYPES ---

export type EmployeeDto = {
  employeeId: number;
  employeeCode: string;
  legalEntityId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string | null;
  email: string;
  hireDate: string;
  terminationDate: string | null;
  employmentStatus: string;
  positionId: number | null;
  positionCode: string | null;
  positionNameDe: string | null;
  positionNameEn: string | null;
  branchId: string | null;
  branchName: string | null;
  contractType: string | null;
  payType: string | null;
  weeklyHours: number | null;
  currentHourlyWage: number | null;
  currentMonthlyWage: number | null;
  activeRestrictions: string[];
};

export type EmploymentContract = {
  contractId: number;
  employeeId: number;
  contractNumber: string;
  contractType: string;
  payType: string;
  startDate: string;
  endDate: string | null;
  standardWeeklyMinutes: number;
  collectiveAgreementReference?: string;
  status: string;
};

export type WageRate = {
  wageRateId: number;
  contractId: number;
  validFrom: string;
  validTo: string | null;
  grossHourlyEur: number | null;
  grossMonthlyEur: number | null;
  sfnApprovedHourlyBaseEur?: number | null;
  currencyCode: string;
  approvalStatus: string;
};

export type WorkRestriction = {
  restrictionId: number;
  employeeId: number;
  restrictionType: string;
  validFrom: string;
  validTo: string | null;
  maxDailyMinutes: number | null;
  maxWeeklyMinutes: number | null;
  allowNightShift: boolean;
  allowSunday: boolean;
  schedulingRuleSummary: string;
  confidentialNotes?: string;
};

export type EmployeeDetailDto = {
  profile: EmployeeDto | null;
  contracts: EmploymentContract[];
  wageRates: WageRate[];
  restrictions: WorkRestriction[];
};

export type PositionItem = {
  positionId: number;
  positionCode: string;
  positionNameDe: string;
  positionNameEn: string;
  active: boolean;
};

export type ShiftTemplate = {
  templateId: number;
  branchId: string;
  templateCode: string;
  templateName: string;
  localStartTime: string;
  localEndTime: string;
  endsNextDay: boolean;
  defaultBreakMinutes: number;
};

export type Shift = {
  shiftId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  branchId: string;
  templateId: number | null;
  templateName: string | null;
  plannedStartUtc: string;
  plannedEndUtc: string;
  plannedBreakMinutes: number;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  publishedAtUtc: string | null;
  versionNumber: number;
  durationMinutes: number;
  isSunday: boolean;
  positionName: string | null;
};

export type LaborLawViolation = {
  code: string;
  severity: "BLOCKER" | "WARNING";
  messageVi: string;
  messageDe: string;
  legalBasis: string;
  employeeId: number;
  shiftId: number;
};

export type LaborLawCheckSummary = {
  validForPublish: boolean;
  blockerCount: number;
  warningCount: number;
  violations: LaborLawViolation[];
};

export type PublishResult = {
  publishedShiftCount: number;
  versionNumber: number;
  success: boolean;
  messageVi: string;
  messageDe: string;
  warnings: LaborLawViolation[];
};

export type ShiftSwapRequest = {
  swapRequestId: number;
  sourceShiftId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  requestedByEmployeeId: number;
  requestedByEmployeeName?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedByUserId: string | null;
  createdAtUtc: string;
};

export type ImportError = {
  lineNumber: number;
  fieldName: string;
  errorMessageVi: string;
  errorMessageDe: string;
  rawValue: string;
};

export type ImportResult = {
  jobId: number | null;
  dryRun: boolean;
  totalRows: number;
  successRows: number;
  errorRows: number;
  status: string;
  errors: ImportError[];
};

// --- F04 & F05: ATTENDANCE & RECONCILIATION TYPES ---

export type AttendanceStatus = {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  timesheetId: number | null;
  employeeId: number;
  employeeName: string;
  actualStartUtc: string | null;
  breakStartUtc: string | null;
  currentBreakMinutes: number;
  workedMinutes: number;
  currentShiftId: number | null;
  shiftInfo: string | null;
};

export type BreakRecord = {
  breakId: number;
  breakType: string;
  startTimeUtc: string;
  endTimeUtc: string | null;
  durationMinutes: number;
};

export type AttendanceException = {
  exceptionId: number;
  timesheetId: number;
  exceptionType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  descriptionVi: string;
  descriptionDe: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolutionNotes: string | null;
};

export type Timesheet = {
  timesheetId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  positionName: string;
  branchId: string;
  shiftId: number | null;
  workDate: string;
  plannedStartUtc: string | null;
  plannedEndUtc: string | null;
  plannedBreakMinutes: number;
  actualStartUtc: string | null;
  actualEndUtc: string | null;
  actualBreakMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  status: "OPEN" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "LOCKED";
  hasException: boolean;
  isLocked: boolean;
  breaks: BreakRecord[];
  exceptions: AttendanceException[];
};

export type ReconciliationKpi = {
  totalTimesheets: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  totalLateMinutes: number;
  openExceptionsCount: number;
  pendingRequestsCount: number;
  approvedTimesheetsCount: number;
};

export type ReconciliationItem = {
  timesheetId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  positionName: string;
  branchId: string;
  workDate: string;
  plannedStartUtc: string | null;
  plannedEndUtc: string | null;
  plannedBreakMinutes: number;
  actualStartUtc: string | null;
  actualEndUtc: string | null;
  actualBreakMinutes: number;
  workedMinutes: number;
  deltaMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  status: "OPEN" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "LOCKED";
  hasException: boolean;
  isLocked: boolean;
  recalculationRequired: boolean;
  exceptions: AttendanceException[];
};

export type AttendanceChangeRequest = {
  requestId: number;
  timesheetId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  currentStartUtc: string | null;
  currentEndUtc: string | null;
  currentBreakMinutes: number;
  requestedStartUtc: string | null;
  requestedEndUtc: string | null;
  requestedBreakMinutes: number | null;
  reason: string;
  evidenceUrl: string | null;
  deltaMinutes: number;
  requiresHrEscalation: boolean;
  status: "PENDING" | "HR_ESCALATED" | "APPROVED" | "REJECTED";
  decisionNotes: string | null;
  decidedByUserId: string | null;
  decidedAtUtc: string | null;
  createdAtUtc: string;
};

// --- F06 & F07 TYPES ---

export type LeaveType = {
  leaveTypeId: number;
  leaveCode: string;
  nameDe: string;
  nameVi: string;
};

export type LeaveBalance = {
  balanceId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  leaveYear: number;
  leaveTypeId: number;
  leaveTypeName: string;
  entitledDays: number;
  carriedDays: number;
  usedDays: number;
  remainingDays: number;
  expiryDate: string | null;
};

export type LeaveRequest = {
  leaveRequestId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNotes: string | null;
  reviewedByName: string | null;
  reviewedAtUtc: string | null;
  createdAtUtc: string;
};

export type SicknessAbsence = {
  absenceId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  startDate: string;
  endDate: string;
  confidentialDocumentRef: string | null;
  hasMedicalCertificate: boolean;
  isContinuedPayEligible: boolean;
  isChildSickLeave: boolean;
  verificationStatus: string;
  createdAtUtc: string;
};

export type CompensatoryRest = {
  restId: number;
  employeeId: number;
  employeeName: string;
  relatedWorkDate: string;
  restKind: "SUNDAY_COMPENSATION" | "HOLIDAY_COMPENSATION";
  deadlineDate: string;
  status: string;
  restDate: string | null;
  daysUntilDeadline: number;
  isOverdue: boolean;
};

export type PublicHoliday = {
  holidayId: number;
  stateCode: string;
  holidayDate: string;
  holidayCode: string;
  holidayNameDe: string;
  holidayNameVi: string;
  isStatutory: boolean;
};

export type SegmentCalculation = {
  segmentId: number | null;
  timesheetId: number;
  segmentStartBerlin: string;
  segmentEndBerlin: string;
  payableMinutes: number;
  segmentType: string;
  isNight: boolean;
  isDeepNight: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  isSpecialDay: boolean;
  baseWageEur: number;
  payableRatePercent: number;
  paidAmountEur: number;
  taxExemptPercent: number;
  taxExemptAmountEur: number;
  taxableAmountEur: number;
  socialInsuranceExemptAmountEur: number;
  calculationTrace: string;
};

export type TimesheetAllowanceBreakdown = {
  timesheetId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  workDate: string;
  actualStartBerlin: string;
  actualEndBerlin: string;
  workedMinutes: number;
  baseWageEur: number;
  totalPaidAmountEur: number;
  totalTaxExemptAmountEur: number;
  totalTaxableAmountEur: number;
  totalSvExemptAmountEur: number;
  segments: SegmentCalculation[];
  calculationIssue: string | null;
  locked: boolean;
};

export type BranchAllowanceSummary = {
  branchId: string;
  fromDate: string;
  toDate: string;
  totalTimesheetsCount: number;
  totalPaidAllowancesEur: number;
  totalTaxExemptEur: number;
  totalTaxableEur: number;
  totalSvExemptEur: number;
  timesheets: TimesheetAllowanceBreakdown[];
};

// API calls for Leave (F06)
export const getLeaveTypes = () => api<LeaveType[]>("/leaves/types");

export const getLeaveBalances = (employeeId?: number, year?: number) => {
  const p = new URLSearchParams();
  if (employeeId) p.set("employeeId", String(employeeId));
  if (year) p.set("year", String(year));
  return api<LeaveBalance[]>(`/leaves/balances?${p.toString()}`);
};

export const getLeaveRequests = (employeeId?: number, status?: string) => {
  const p = new URLSearchParams();
  if (employeeId) p.set("employeeId", String(employeeId));
  if (status) p.set("statusFilter", status);
  return api<LeaveRequest[]>(`/leaves/requests?${p.toString()}`);
};

export const createLeaveRequest = (body: {
  employeeId?: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
}) => api<LeaveRequest>("/leaves/requests", "POST", body);

export const approveLeaveRequest = (requestId: number, notes?: string) =>
  api<LeaveRequest>(`/leaves/requests/${requestId}/approve`, "POST", { notes });

export const rejectLeaveRequest = (requestId: number, notes?: string) =>
  api<LeaveRequest>(`/leaves/requests/${requestId}/reject`, "POST", { notes });

export const getSicknessAbsences = (employeeId?: number) => {
  const p = new URLSearchParams();
  if (employeeId) p.set("employeeId", String(employeeId));
  return api<SicknessAbsence[]>(`/leaves/sickness?${p.toString()}`);
};

export const recordSicknessAbsence = (body: {
  employeeId: number;
  startDate: string;
  endDate: string;
  documentRef?: string;
  hasMedicalCertificate: boolean;
  isChildSickLeave: boolean;
  certificateDate?: string;
}) => api<SicknessAbsence>("/leaves/sickness", "POST", body);

export const getCompensatoryRest = (employeeId?: number) => {
  const p = new URLSearchParams();
  if (employeeId) p.set("employeeId", String(employeeId));
  return api<CompensatoryRest[]>(`/leaves/compensatory-rests?${p.toString()}`);
};

export const completeCompensatoryRest = (restId: number, restDate: string) =>
  api<CompensatoryRest>(`/leaves/compensatory-rests/${restId}/fulfill`, "POST", { restDate });

// API calls for Allowance (F07)
export const getPublicHolidays = (branchId: string, year?: number) => {
  const p = new URLSearchParams();
  if (branchId) p.set("branchId", String(branchId));
  if (year) p.set("year", String(year));
  return api<PublicHoliday[]>(`/allowances/holidays?${p.toString()}`);
};

export const calculateTimesheetAllowance = (timesheetId: number) =>
  api<TimesheetAllowanceBreakdown>(`/allowances/calculate/${timesheetId}`, "POST");

export const getTimesheetAllowance = (timesheetId: number) =>
  api<TimesheetAllowanceBreakdown>(`/allowances/timesheets/${timesheetId}`);

export const getBranchAllowanceSummary = (
  branchId: string,
  fromDate?: string,
  toDate?: string
) => {
  const p = new URLSearchParams();
  if (branchId) p.set("branchId", String(branchId));
  if (fromDate) p.set("fromDate", fromDate);
  if (toDate) p.set("toDate", toDate);
  return api<BranchAllowanceSummary>(`/allowances/branch-summary?${p.toString()}`);
};


