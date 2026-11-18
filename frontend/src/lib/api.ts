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
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  try {
    if (method !== "GET" && !csrf) {
      const r = await fetch("/api/v1/auth/csrf");
      if (!r.ok) throw new ApiError("Server nicht erreichbar.", r.status);
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
      throw new ApiError(
        data.message || "Die Anfrage konnte nicht verarbeitet werden.",
        r.status,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "Keine Verbindung zum Server. Bitte Backend starten und erneut versuchen.",
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
