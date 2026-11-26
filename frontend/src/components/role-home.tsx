import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarCheck,
  ChefHat,
  FileCheck,
  Fingerprint,
  MapPin,
  Users,
} from "lucide-react";
import type { Page } from "../App";
import {
  api,
  type AttendanceStatus,
  type Shift,
  type Workspace,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import {
  addCalendarDays,
  berlinDate,
  berlinInstant,
  berlinTime,
} from "../lib/work-time";
import { formatPosition } from "../lib/positions";

export function workspaceKind(data: Workspace) {
  const roles = data.user.roles;
  if (roles.includes("SYSTEM_ADMIN")) return "admin";
  if (roles.includes("RESTAURANT_MANAGER")) return "manager";
  if (
    data.permissions.includes("org.read") ||
    data.permissions.includes("workforce.read")
  )
    return "office";
  if (data.selfPostings?.some((p) => p.positionCode === "KITCHEN"))
    return "kitchen";
  return "employee";
}
export const workspaceNames = {
  admin: { vi: "Quản trị hệ thống", de: "Systemverwaltung" },
  manager: { vi: "Điều hành nhà hàng", de: "Restaurantleitung" },
  kitchen: { vi: "Không gian bếp", de: "Küchendienst" },
  employee: { vi: "Không gian nhân viên", de: "Mein Dienst" },
  office: { vi: "Không gian nghiệp vụ", de: "Fachbereich" },
};

export function ShiftAgenda({
  shifts,
  data,
  team = false,
}: {
  shifts: Shift[];
  data: Pick<Workspace, "branches" | "selfPostings">;
  team?: boolean;
}) {
  const { lang } = useI18n();
  const vi = lang === "vi";
  const dayLabel = new Intl.DateTimeFormat(vi ? "vi-VN" : "de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  });
  return (
    <ul className="shift-agenda">
      {shifts.map((s) => {
        const location =
          data.branches.find((b) => b.id === s.branchId)?.name ??
          data.selfPostings?.find((a) => a.branchId === s.branchId)
            ?.branchName ??
          s.branchId;
        return (
          <li key={s.shiftId}>
            <div className="agenda-time">
              <small>{dayLabel.format(new Date(s.plannedStartUtc))}</small>
              <b>
                {berlinTime(s.plannedStartUtc)} – {berlinTime(s.plannedEndUtc)}
                {berlinDate(s.plannedStartUtc) !==
                  berlinDate(s.plannedEndUtc) && <sup> +1</sup>}
              </b>
            </div>
            <div className="agenda-identity">
              <strong>
                {team
                  ? s.employeeName
                  : s.templateName || formatPosition(s.positionName, lang)}
              </strong>
              <small>
                <MapPin size={13} />
                {location}
              </small>
            </div>
            <span>
              {vi ? "Nghỉ" : "Pause"} {s.plannedBreakMinutes}{" "}
              {vi ? "phút" : "Min."}
            </span>
            {team && (
              <span
                className={
                  s.status === "DRAFT" ? "agenda-draft" : "agenda-published"
                }
              >
                {s.status === "DRAFT"
                  ? vi
                    ? "Nháp"
                    : "Entwurf"
                  : vi
                    ? "Đã công bố"
                    : "Veröffentlicht"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type Navigate = (page: Page) => void;
export function WorkspaceActions({
  data,
  navigate,
}: {
  data: Workspace;
  navigate: Navigate;
}) {
  const { lang } = useI18n();
  const kind = workspaceKind(data);
  const items = {
    branches: {
      icon: Building2,
      vi: "Chi nhánh",
      de: "Niederlassungen",
      permission: "org.read",
    },
    access: {
      icon: Users,
      vi: "Tài khoản & phân quyền",
      de: "Konten & Rollen",
      permission: "iam.read",
    },
    activity: {
      icon: FileCheck,
      vi: "Nhật ký hoạt động",
      de: "Aktivitätsprotokoll",
      permission: "audit.read",
    },
    scheduling: {
      icon: CalendarDays,
      vi: kind === "manager" ? "Xếp lịch ca" : "Lịch cá nhân",
      de: kind === "manager" ? "Dienstplan erstellen" : "Mein Dienstplan",
      permission: "schedule.read",
    },
    reconciliation: {
      icon: FileCheck,
      vi: "Duyệt giờ công",
      de: "Arbeitszeiten prüfen",
      permission: "schedule.write",
    },
    leave: {
      icon: CalendarCheck,
      vi: kind === "manager" ? "Duyệt nghỉ phép" : "Nghỉ phép của tôi",
      de: kind === "manager" ? "Urlaub prüfen" : "Mein Urlaub",
      permission: "",
    },
    security: {
      icon: Fingerprint,
      vi: "Bảo mật tài khoản",
      de: "Kontosicherheit",
      permission: "",
    },
  };
  let pages: (keyof typeof items)[];
  if (kind === "admin") pages = ["branches", "access", "activity"];
  else if (kind === "manager")
    pages = ["scheduling", "reconciliation", "leave"];
  else if (kind === "office") pages = ["branches", "activity", "security"];
  else pages = ["scheduling", "leave", "security"];
  return (
    <nav
      className="workspace-actions"
      aria-label={lang === "vi" ? "Công việc thường dùng" : "Häufige Aufgaben"}
    >
      {pages
        .filter(
          (p) =>
            !items[p].permission ||
            data.permissions.includes(items[p].permission),
        )
        .map((p) => {
          const action = items[p];
          return (
            <button key={p} onClick={() => navigate(p)}>
              <action.icon size={20} />
              <b>{action[lang]}</b>
              <ArrowRight size={15} />
            </button>
          );
        })}
    </nav>
  );
}

export function DutyHome({
  data,
  branchId,
  onBranch,
  navigate,
  openWeek,
}: {
  data: Workspace;
  branchId: string;
  onBranch: (id: string) => void;
  navigate: Navigate;
  openWeek: (day: string) => void;
}) {
  const { lang } = useI18n();
  const vi = lang === "vi";
  const kind = workspaceKind(data);
  const team =
    kind === "manager" && data.permissions.includes("schedule.write");
  const canLoad =
    data.permissions.includes("schedule.read") &&
    (team ? !!branchId : data.selfEmployeeId != null);
  const [day, setDay] = useState(berlinDate);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    shifts: Shift[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    let current = true;
    setResult(null);
    if (canLoad && day) {
      const params = new URLSearchParams({
        start: berlinInstant(day, "00:00"),
        end: berlinInstant(addCalendarDays(day, team ? 1 : 7), "00:00"),
      });
      if (team) params.set("branchId", branchId);
      api<Shift[]>("/scheduling/shifts?" + params)
        .then((shifts) => {
          if (current)
            setResult({
              shifts: team
                ? shifts
                : shifts.filter(
                    (s) =>
                      s.employeeId === data.selfEmployeeId &&
                      s.status === "PUBLISHED",
                  ),
            });
        })
        .catch((e: Error) => {
          if (current) setResult({ shifts: [], error: e.message });
        });
    }
    return () => {
      current = false;
    };
  }, [canLoad, day, branchId, team, data.selfEmployeeId, retry]);
  const shifts = result?.shifts ?? [];
  const kitchens = [
    ...new Set(
      data.selfPostings
        ?.filter((p) => p.positionCode === "KITCHEN")
        .map((p) => p.branchName),
    ),
  ];
  return (
    <>
      {!team && data.selfEmployeeId != null && (
        <div className="personal-duty">
          <DutyClock key={data.selfEmployeeId} navigate={navigate} />
          {kind === "kitchen" && (
            <section className="kitchen-posting">
              <ChefHat size={24} aria-hidden="true" />
              <div>
                <h2>
                  {vi ? "Bếp được phân công hôm nay" : "Kücheneinsatz heute"}
                </h2>
                <p>{kitchens.join(" · ")}</p>
              </div>
            </section>
          )}
        </div>
      )}
      <section className="ops-panel duty-panel">
        <header className="ops-panel-heading">
          <h2>
            {team
              ? vi
                ? "Ca làm theo chi nhánh"
                : "Schichten je Niederlassung"
              : kind === "kitchen"
                ? vi
                  ? "Lịch trực của tôi tại bếp"
                  : "Meine Dienste in der Küche"
                : vi
                  ? "Lịch làm việc của tôi"
                  : "Meine Schichten"}
          </h2>
          {data.permissions.includes("schedule.read") && (
            <button className="ops-link" onClick={() => openWeek(day)}>
              {vi ? "Mở lịch tuần" : "Wochenplan öffnen"}{" "}
              <ArrowRight size={15} />
            </button>
          )}
        </header>
        <div className="duty-filters">
          {team && (
            <label>
              {vi ? "Chi nhánh" : "Niederlassung"}
              <select
                value={branchId}
                onChange={(e) => onBranch(e.target.value)}
              >
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {team
              ? vi
                ? "Ngày làm việc"
                : "Arbeitstag"
              : vi
                ? "7 ngày từ"
                : "7 Tage ab"}
            <input
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value) setDay(e.target.value);
              }}
            />
          </label>
        </div>
        {!canLoad ? (
          <p className="agenda-message">
            {team
              ? vi
                ? "Chưa có chi nhánh được phân công."
                : "Keine Niederlassung zugeordnet."
              : vi
                ? "Tài khoản cần có hồ sơ nhân viên và quyền xem lịch để hiển thị ca cá nhân."
                : "Für den persönlichen Dienstplan sind ein Mitarbeiterprofil und Lesezugriff erforderlich."}
          </p>
        ) : !result ? (
          <p className="agenda-message" role="status">
            {vi ? "Đang tải lịch ca…" : "Dienstplan wird geladen…"}
          </p>
        ) : result.error ? (
          <div className="agenda-message" role="alert">
            {result.error}{" "}
            <button className="ops-link" onClick={() => setRetry((n) => n + 1)}>
              {vi ? "Thử lại" : "Erneut laden"}
            </button>
          </div>
        ) : shifts.length ? (
          <ShiftAgenda data={data} shifts={shifts} team={team} />
        ) : (
          <p className="agenda-message">
            {team
              ? vi
                ? "Chưa có ca tại chi nhánh trong ngày đã chọn."
                : "Für diesen Tag sind keine Schichten eingetragen."
              : vi
                ? "Bạn chưa có ca được công bố trong 7 ngày này."
                : "Für diese sieben Tage sind keine Dienste veröffentlicht."}
          </p>
        )}
      </section>
    </>
  );
}

function DutyClock({ navigate }: { navigate: Navigate }) {
  const vi = useI18n().lang === "vi";
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    api<AttendanceStatus>("/attendance/status")
      .then((s) => {
        if (current) setStatus(s);
      })
      .catch((e: Error) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, []);
  const state = !status
    ? vi
      ? "Đang tải…"
      : "Wird geladen…"
    : status.isOnBreak
      ? vi
        ? "Đang nghỉ giữa ca"
        : "In der Pause"
      : status.isCheckedIn
        ? vi
          ? "Đang trong ca"
          : "Im Dienst"
        : vi
          ? "Chưa vào ca"
          : "Nicht eingestempelt";
  return (
    <section className="duty-clock">
      <div>
        <h2>{vi ? "Chấm công hôm nay" : "Zeiterfassung heute"}</h2>
        <p role="status">
          {error || state}
          {status?.actualStartUtc && (
            <> · {berlinTime(status.actualStartUtc)}</>
          )}
        </p>
      </div>
      <button onClick={() => navigate("attendance")}>
        {vi ? "Mở chấm công" : "Zeiterfassung öffnen"}
      </button>
    </section>
  );
}
