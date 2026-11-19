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
