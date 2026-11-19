import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { spring } from "@animate-ui/react/utils/motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Fingerprint,
  GitBranch,
  Globe2,
  Info,
  KeyRound,
  LayoutGrid,
  List,
  LockKeyhole,
  LogOut,
  MapPin,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  api,
  activeOn,
  dateDE,
  initials,
  today,
  type Account,
  type Assignment,
  type Branch,
  type Role,
  type Session,
  type SodRule,
  type User,
  type Workspace,
} from "../lib/api";
import type { Page } from "../App";
import type { Editor } from "./editor";
import { Empty, Modal, Press, Scene, Status } from "./experience";
import { MfaGate } from "./auth";
import { useI18n } from "../lib/i18n";

export function Overview({
  data,
  navigate,
  onBranch,
}: {
  data: Workspace;
  navigate: (p: Page) => void;
  onBranch: (id: string) => void;
}) {
  const { lang } = useI18n();
  const active = data.branches.filter((b) => b.active);
  const assigned = new Set(
    data.assignments.filter((a) => activeOn(a)).map((a) => a.employeeId),
  ).size;
  const stats = [
    {
      title: lang === "vi" ? "Chi nhánh nhà hàng" : "Niederlassungen",
      value: active.length,
      icon: Building2,
      note: lang === "vi" ? `${data.branches.length} chi nhánh tổng cộng` : `${data.branches.length} Standorte insgesamt`,
      color: "mint",
    },
    {
      title: lang === "vi" ? "Thành viên nhân sự" : "Teammitglieder",
      value: data.employees.length,
      icon: Users,
      note: lang === "vi" ? `${assigned} đang được phân công` : `${assigned} aktuell zugeordnet`,
      color: "peach",
    },
    {
      title: lang === "vi" ? "Pháp nhân" : "Rechtseinheiten",
      value: data.entities.filter((e) => e.active).length,
      icon: Globe2,
      note: lang === "vi" ? "Cơ cấu doanh nghiệp chung" : "Eine gemeinsame Struktur",
      color: "violet",
    },
    {
      title: lang === "vi" ? "Địa điểm làm việc" : "Arbeitsorte",
      value: data.locations.filter((l) => l.active).length,
      icon: MapPin,
      note: lang === "vi" ? "Theo địa điểm thực tế" : "Standortgenau organisiert",
      color: "blue",
    },
  ];
  return (
    <>
      <section className="welcome-hero reveal">
        <div className="welcome-copy">
          <div className="pill">
            <span className="status-dot" /> {lang === "vi" ? "KẾT NỐI NHÂN SỰ" : "MENSCHEN VERBINDEN"}
          </div>
          <h2>
            {lang === "vi" ? (
              <>
                Sự hiếu khách tuyệt vời
                <br />
                bắt đầu từ một đội ngũ vững mạnh.
              </>
            ) : (
              <>
                Große Gastfreundschaft
                <br />
                beginnt mit einem guten Team.
              </>
            )}
          </h2>
          <p>
            {lang === "vi" ? (
              <>
                Quản lý minh bạch và gắn kết đội ngũ
                <br className="desktop-break" /> tại mọi chi nhánh trong chuỗi nhà hàng của bạn.
              </>
            ) : (
              <>
                Schaffen Sie Klarheit für die Menschen und Orte,
                <br className="desktop-break" /> die Ihr Unternehmen besonders
                machen.
              </>
            )}
          </p>
          <button
            onClick={() =>
              navigate(
                data.permissions.includes("org.read") ? "branches" : "security",
              )
            }
          >
            {lang === "vi" ? "Khám phá không gian làm việc" : "Ihren Arbeitsbereich entdecken"} <ArrowUpRight size={17} />
          </button>
          <div className="hero-caption">
            <span className="mini-avatars">
              {data.employees.slice(0, 3).map((e) => (
                <i key={e.id}>{initials(e.name)}</i>
              ))}
            </span>
            <span>
              {data.employees.length
                ? (lang === "vi" ? `${data.employees.length} thành viên. Cùng một mục tiêu chung.` : `${data.employees.length} Menschen. Ein gemeinsames Ziel.`)
                : (lang === "vi" ? "Tổ chức chặt chẽ. Kết nối an toàn." : "Gut organisiert. Sicher verbunden.")}
            </span>
          </div>
        </div>
        <Scene />
      </section>
      <section className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card reveal" key={s.title}>
            <div className="stat-top">
              <span>{s.title}</span>
              <span className={`stat-icon tone-${s.color}`}>
                <s.icon size={18} />
              </span>
            </div>
            <div className="stat-number">
              {s.value.toString().padStart(2, "0")}
              <span className="stat-decoration">↗</span>
            </div>
            <small>
              <span className="tiny-dot" />
              {s.note}
            </small>
          </div>
        ))}
      </section>
      {data.permissions.includes("org.read") ? (
        <div className="overview-grid">
          <section className="panel reveal">
            <div className="panel-heading">
              <div>
                <h2>
                  {lang === "vi" ? "Chi nhánh nhà hàng" : "Ihre Niederlassungen"}{" "}
                  <span className="count">{data.branches.length}</span>
                </h2>
                <p>{lang === "vi" ? "Địa điểm và trạng thái hoạt động." : "Gastfreundschaft hat viele Adressen."}</p>
              </div>
              <button
                className="text-button"
                onClick={() => navigate("branches")}
              >
                {lang === "vi" ? "Xem tất cả" : "Alle ansehen"} <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="table-scroll">
              <table className="branch-table">
                <thead>
                  <tr>
                    <th>{lang === "vi" ? "Chi nhánh" : "Standort"}</th>
                    <th>{lang === "vi" ? "Nhân sự" : "Team"}</th>
                    <th>{lang === "vi" ? "Trạng thái" : "Status"}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.branches.slice(0, 4).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button
                          className="table-identity row-button"
                          onClick={() => onBranch(b.id)}
                        >
                          <span className={`branch-icon tone-${b.accent}`}>
                            <Building2 size={20} />
                          </span>
                          <span>
                            <b>{b.name}</b>
                            <small>
                              <MapPin size={11} /> {b.city} · {b.code}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="team-count">
                          <Users size={14} />{" "}
                          {
                            new Set(
                              data.assignments
                                .filter(
                                  (a) => a.branchId === b.id && activeOn(a),
                                )
                                .map((a) => a.employeeId),
                            ).size
                          }
                        </span>
                      </td>
                      <td>
                        <Status active={b.active} />
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`${b.name} öffnen`}
                          onClick={() => onBranch(b.id)}
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.branches.length && (
              <Empty
                title={lang === "vi" ? "Bắt đầu thiết lập tổ chức" : "Hier beginnt Ihre Organisation"}
                text={lang === "vi" ? "Các chi nhánh đầu tiên của bạn sẽ xuất hiện tại đây." : "Ihre ersten Niederlassungen erscheinen hier."}
              />
            )}
          </section>
          <section className="panel network-panel reveal">
            <div className="panel-heading">
              <div>
                <h2>{lang === "vi" ? "Mạng lưới cơ sở" : "Überall ein Zuhause."}</h2>
                <p>{lang === "vi" ? "Mạng lưới chi nhánh của bạn tại Đức" : "Ihr Standortnetz in Deutschland"}</p>
              </div>
              <span className="map-icon">
                <Globe2 size={17} />
              </span>
            </div>
            <NetworkMap branches={data.branches} onBranch={onBranch} />
            <div className="network-footer">
              <span>
                <i /> {active.length} {lang === "vi" ? "chi nhánh đang hoạt động" : "aktive Niederlassungen"}
              </span>
              <span>
                {new Set(data.branches.map((b) => b.stateCode)).size}{" "}
                {lang === "vi" ? "Bang (Đức)" : "Bundesländer"}
              </span>
            </div>
          </section>
        </div>
      ) : (
        <div className="panel reveal employee-welcome">
          <ShieldCheck size={32} />
          <div>
            <h2>{lang === "vi" ? "Chào mừng bạn đến với không gian làm việc cá nhân." : "Willkommen in Ihrem persönlichen Arbeitsbereich."}</h2>
            <p>
              {lang === "vi"
                ? "Tại đây bạn quản lý phiên đăng nhập và bảo mật tài khoản. Dữ liệu nhân sự và chi nhánh chỉ hiển thị cho các vai trò được phân quyền."
                : "Hier verwalten Sie Ihre Anmeldung und Sitzungen. Personaldaten und Standorte sind nur für berechtigte Rollen sichtbar."}
            </p>
          </div>
          <Press onClick={() => navigate("security")}>
            {lang === "vi" ? "Bảo mật tài khoản" : "Meine Sicherheit"} <ArrowRight size={16} />
          </Press>
        </div>
      )}
      <div className="overview-bottom">
        <section className="panel reveal">
          <div className="panel-heading">
            <div>
              <h2>{lang === "vi" ? "Hoạt động gần đây" : "Was sich bewegt"}</h2>
              <p>{lang === "vi" ? "Những cập nhật mới nhất trong không gian làm việc của bạn" : "Die letzten Änderungen in Ihrem Arbeitsbereich"}</p>
            </div>
            {data.permissions.includes("audit.read") && (
              <button
                className="icon-button"
                aria-label={lang === "vi" ? "Tất cả hoạt động" : "Alle Aktivitäten"}
                onClick={() => navigate("activity")}
              >
                <ArrowUpRight size={17} />
              </button>
            )}
          </div>
          <Activity data={data} limit={3} />
        </section>
        <section className="access-summary reveal">
          <div className="access-orb">
            <ShieldCheck size={29} />
          </div>
          <div className="eyebrow">{lang === "vi" ? "HỢP TÁC AN TOÀN" : "SICHER ZUSAMMENARBEITEN"}</div>
          <h2>
            {lang === "vi" ? (
              <>
                Tin cậy bắt nguồn từ
                <br />
                quyền hạn rõ ràng.
              </>
            ) : (
              <>
                Vertrauen braucht
                <br />
                klare Zugriffe.
              </>
            )}
          </h2>
          <p>
            {lang === "vi"
              ? "Vai trò của bạn xác định dữ liệu bạn được xem và quản lý. Các quyền hạn nhạy cảm luôn được bảo vệ nghiêm ngặt."
              : "Ihre Rolle bestimmt, was Sie sehen und verwalten. Sensible Zugriffe bleiben geschützt."}
          </p>
          <button
            onClick={() =>
              navigate(
                data.permissions.includes("iam.read") ? "access" : "security",
              )
            }
          >
            {lang === "vi" ? "Kiểm tra quyền truy cập" : "Zugriffe im Blick"} <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
function NetworkMap({
  branches,
  onBranch,
}: {
  branches: Branch[];
  onBranch: (id: string) => void;
}) {
  const { lang } = useI18n();
  const coords: Record<string, [number, number]> = {
    Stuttgart: [31, 73],
    Heidelberg: [28, 61],
    Freiburg: [22, 83],
    Karlsruhe: [23, 70],
    München: [62, 80],
    Berlin: [71, 30],
    Hamburg: [43, 16],
  };
  return (
    <div className="network-map">
      <svg viewBox="0 0 300 260" aria-hidden="true">
        <defs>
          <pattern
            id="mapdots"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <path
          d="M116 12 135 19 144 9 157 21 164 15 174 28 196 23 207 37 224 33 229 49 244 57 236 75 249 90 237 104 243 122 223 130 225 150 211 161 218 177 204 192 198 207 174 210 166 228 148 224 139 237 119 229 109 239 93 226 78 228 73 213 55 210 60 191 48 183 58 168 49 153 59 140 50 123 64 112 57 96 69 83 75 60 90 57 87 37 103 35Z"
          fill="url(#mapdots)"
        />
        <path
          className="map-connection"
          d="M85 181 Q100 157 78 157 M85 181 Q76 201 66 213 M85 181 Q130 140 180 207"
          fill="none"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>
      {branches.map((b, i) => {
        const xy = coords[b.city] || [45 + (i % 3) * 8, 45 + (i % 4) * 6];
        return (
          <button
            key={b.id}
            className={`map-pin pin-${b.city.toLowerCase()}`}
            style={{ left: `${xy[0]}%`, top: `${xy[1]}%` }}
            onClick={() => onBranch(b.id)}
            aria-label={`${b.name} auf der Karte öffnen`}
          >
            <span />
            <small>{b.city}</small>
          </button>
        );
      })}
      <span className="map-country">{lang === "vi" ? "NƯỚC ĐỨC" : "DEUTSCHLAND"}</span>
      <span className="map-note">{lang === "vi" ? "Sơ đồ mạng lưới chi nhánh" : "Schematische Standortübersicht"}</span>
    </div>
  );
}
export function OrganizationTree({
  data,
  onBranch,
  onEdit,
}: {
  data: Workspace;
  onBranch: (id: string) => void;
  onEdit: (b: Branch) => void;
}) {
  const { lang } = useI18n();
  return (
    <div className="org-tree-root reveal" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="note">
        <GitBranch size={18} />
        <span>
          {lang === "vi"
            ? "F01 01: Cây cơ cấu chuỗi nhà hàng: Pháp nhân doanh nghiệp → Chi nhánh / Nhà hàng → Địa điểm làm việc thực tế."
            : "F01 01: Organisationshierarchie: Rechtseinheiten → Niederlassungen → Tatsächliche Arbeitsorte."}
        </span>
      </div>

      {data.entities.map((entity) => {
        const entityBranches = data.branches.filter((b) => b.legalEntityId === entity.id);
        return (
          <div
            key={entity.id}
            className="panel"
            style={{ padding: 22, border: "1px solid var(--line)", borderRadius: 12 }}
          >
            {/* Cấp 1: Pháp nhân */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--line)",
                paddingBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  className="entity-icon"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--violet-light, #ede9fe)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--violet, #7c3aed)",
                  }}
                >
                  <Globe2 size={24} />
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <b style={{ fontSize: 16 }}>{entity.name}</b>
                    <span className="pill" style={{ fontWeight: 600 }}>{entity.code}</span>
                  </div>
                  <small style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, display: "block" }}>
                    {entity.registrationNumber} · {entity.address}
                  </small>
                </div>
              </div>
              <Status active={entity.active} />
            </div>

            {/* Cấp 2: Chi nhánh */}
            <div style={{ paddingLeft: 20, marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {entityBranches.map((b) => {
                const branchLocations = data.locations.filter((l) => l.branchId === b.id);
                const activeManagers = data.managerAssignments.filter((m) => m.branchId === b.id && activeOn(m));
                return (
                  <div
                    key={b.id}
                    style={{
                      borderLeft: "2px solid var(--line)",
                      paddingLeft: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg-subtle, #f8fafc)",
                        border: "1px solid var(--line)",
                        padding: "14px 18px",
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          className={`branch-icon tone-${b.accent}`}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Building2 size={20} />
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={() => onBranch(b.id)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "var(--text)",
                                textDecoration: "underline",
                                textUnderlineOffset: 3,
                              }}
                            >
                              {b.name}
                            </button>
                            <span className="role-tag">{b.code}</span>
                            <span className="pill" style={{ fontSize: 11 }}>
                              {data.states[b.stateCode]} ({b.stateCode})
                            </span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{b.timezone}</span>
                          </div>
                          <small style={{ color: "var(--muted)", fontSize: 12, display: "block", marginTop: 4 }}>
                            {b.address} · {b.city}
                            {activeManagers.length > 0 && (
                              <span>
                                {" "}· <b>{lang === "vi" ? "Quản lý:" : "Leitung:"}</b>{" "}
                                {activeManagers
                                  .map((m) => data.managerOptions.find((o) => o.id === m.managerId)?.name || m.managerId)
                                  .join(", ")}
                              </span>
                            )}
                          </small>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Status active={b.active} />
                        {data.permissions.includes("org.write") && (
                          <button
                            className="icon-button"
                            aria-label={`${b.name} bearbeiten`}
                            onClick={() => onEdit(b)}
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        )}
                        <button
                          className="icon-button"
                          aria-label={`${b.name} öffnen`}
                          onClick={() => onBranch(b.id)}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Cấp 3: Địa điểm làm việc thực tế */}
                    <div style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
                      {branchLocations.map((loc) => (
                        <div
                          key={loc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            border: "1px dashed var(--line)",
                            borderRadius: 8,
                            background: "var(--bg)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <MapPin size={16} style={{ color: "var(--muted)" }} />
                            <div>
                              <b style={{ fontSize: 13 }}>{loc.name}</b>
                              <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted)" }}>{loc.address}</span>
                              <span className="pill" style={{ marginLeft: 8, fontSize: 10 }}>
                                {loc.stateCode}
                              </span>
                            </div>
                          </div>
                          <Status active={loc.active} />
                        </div>
                      ))}
                      {!branchLocations.length && (
                        <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                          {lang === "vi" ? "Chưa có địa điểm làm việc thực tế" : "Keine Arbeitsorte hinterlegt"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!entityBranches.length && (
                <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                  {lang === "vi"
                    ? "Chưa có chi nhánh nào trực thuộc pháp nhân này."
                    : "Keine Niederlassungen dieser Rechtseinheit zugeordnet."}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BranchList({
  data,
  onBranch,
  onEdit,
}: {
  data: Workspace;
  onBranch: (id: string) => void;
  onEdit: (b: Branch) => void;
}) {
  const { lang } = useI18n();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "tree">("grid");
  const branches = data.branches
    .filter(
      (b) =>
        `${b.name} ${b.city} ${b.code}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!state || b.stateCode === state) &&
        (status === "all" || b.active === (status === "active")),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  return (
    <>
      <div className="list-toolbar reveal">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Niederlassungen suchen"
            placeholder={lang === "vi" ? "Tìm theo tên chi nhánh hoặc thành phố …" : "Standort oder Stadt suchen …"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="list-filters">
          <select
            aria-label="Bundesland filtern"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">{lang === "vi" ? "Tất cả vùng bang" : "Alle Bundesländer"}</option>
            {[...new Set(data.branches.map((b) => b.stateCode))].map((s) => (
              <option key={s} value={s}>
                {data.states[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Status filtern"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{lang === "vi" ? "Tất cả trạng thái" : "Alle Status"}</option>
            <option value="active">{lang === "vi" ? "Đang hoạt động" : "Aktiv"}</option>
            <option value="inactive">{lang === "vi" ? "Ngừng hoạt động" : "Inaktiv"}</option>
          </select>
          <div className="view-toggle">
            <button
              aria-label="Rasteransicht"
              aria-pressed={viewMode === "grid"}
              className={viewMode === "grid" ? "selected" : ""}
              onClick={() => setViewMode("grid")}
              title={lang === "vi" ? "Dạng lưới" : "Rasteransicht"}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="Listenansicht"
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "selected" : ""}
              onClick={() => setViewMode("list")}
              title={lang === "vi" ? "Dạng danh sách" : "Listenansicht"}
            >
              <List size={18} />
            </button>
            <button
              aria-label="Organisationsbaum"
              aria-pressed={viewMode === "tree"}
              className={viewMode === "tree" ? "selected" : ""}
              onClick={() => setViewMode("tree")}
              title={lang === "vi" ? "Cơ cấu tổ chức (F01 01: Pháp nhân → Chi nhánh → Địa điểm)" : "Organisationshierarchie (F01 01)"}
            >
              <GitBranch size={17} />
            </button>
          </div>
        </div>
      </div>
      <div className="results-caption">
        {branches.length} {lang === "vi" ? "chi nhánh" : "Niederlassungen"} <span>{lang === "vi" ? "Sắp xếp theo tên A-Z" : "Nach Name sortiert"}</span>
      </div>

      {viewMode === "tree" ? (
        <OrganizationTree data={data} onBranch={onBranch} onEdit={onEdit} />
      ) : viewMode === "grid" ? (
        <div className="branch-grid">
          {branches.map((b) => (
            <article
              className={`branch-card reveal card-${b.accent}`}
              key={b.id}
            >
              <button
                className="branch-art"
                aria-label={`${b.name} öffnen`}
                onClick={() => onBranch(b.id)}
              >
                <span className="branch-code">{b.code}</span>
                <Scene compact color={b.accent} />
                <span className="art-arrow">
                  <ArrowUpRight size={18} />
                </span>
              </button>
              <div className="branch-card-body">
                <div className="branch-card-title">
                  <button onClick={() => onBranch(b.id)}>
                    <h2>{b.name}</h2>
                  </button>
                  {data.permissions.includes("org.write") && (
                    <button
                      className="icon-button"
                      aria-label={`${b.name} bearbeiten`}
                      onClick={() => onEdit(b)}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  )}
                </div>
                <p>
                  <MapPin size={13} />
                  {b.city} · {data.states[b.stateCode]}
                </p>
                <div className="branch-card-footer">
                  <span>
                    <Users size={15} />
                    {
                      new Set(
                        data.assignments
                          .filter((a) => a.branchId === b.id && activeOn(a))
                          .map((a) => a.employeeId),
                      ).size
                    }{" "}
                    {lang === "vi" ? "nhân sự" : "im Team"}
                  </span>
                  <Status active={b.active} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>{lang === "vi" ? "Chi nhánh" : "Niederlassung"}</th>
                <th>{lang === "vi" ? "Vùng bang" : "Bundesland"}</th>
                <th>{lang === "vi" ? "Địa điểm làm việc" : "Arbeitsorte"}</th>
                <th>{lang === "vi" ? "Trạng thái" : "Status"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <button
                      className="table-identity row-button"
                      onClick={() => onBranch(b.id)}
                    >
                      <span className={`branch-icon tone-${b.accent}`}>
                        <Building2 size={19} />
                      </span>
                      <span>
                        <b>{b.name}</b>
                        <small>
                          {b.city} · {b.code}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>{data.states[b.stateCode]}</td>
                  <td>
                    {data.locations.filter((l) => l.branchId === b.id).length}
                  </td>
                  <td>
                    <Status active={b.active} />
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`${b.name} öffnen`}
                      onClick={() => onBranch(b.id)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!branches.length && (
        <Empty
          title={lang === "vi" ? "Không tìm thấy chi nhánh nào" : "Kein Standort gefunden"}
          text={lang === "vi" ? "Vui lòng thử từ khóa tìm kiếm khác hoặc điều chỉnh lại bộ lọc." : "Versuchen Sie einen anderen Suchbegriff oder passen Sie die Filter an."}
        />
      )}
    </>
  );
}
const actions: Record<string, string> = {
  MFA_ROTATION_STARTED: "Authenticator-Wechsel begonnen",
  BRANCH_CREATED: "Niederlassung hinzugefügt",
  BRANCH_UPDATED: "Niederlassung aktualisiert",
  ENTITY_CREATED: "Rechtseinheit erstellt",
  ENTITY_UPDATED: "Rechtseinheit aktualisiert",
  LOCATION_CREATED: "Arbeitsort hinzugefügt",
  LOCATION_UPDATED: "Arbeitsort aktualisiert",
  EMPLOYEE_ASSIGNED: "Teamzuordnung erstellt",
  ASSIGNMENT_ENDED: "Zuordnung beendet",
  MANAGER_ASSIGNED: "Leitung zugeordnet",
  MANAGER_ENDED: "Leitungszuordnung beendet",
  ACCOUNT_CREATED: "Konto erstellt",
  ACCOUNT_UPDATED: "Konto aktualisiert",
  RESET_LINK_CREATED: "Passwort-Link erstellt",
  LOGIN: "Sicher angemeldet",
  LOGOUT: "Sitzung beendet",
  MFA_ENROLLED: "Authenticator aktiviert",
  SESSION_REVOKED: "Sitzung widerrufen",
  PASSWORD_RESET: "Passwort erneuert",
  WORKSPACE_CREATED: "Arbeitsbereich eingerichtet",
};
const actionsVi: Record<string, string> = {
  MFA_ROTATION_STARTED: "Bắt đầu đổi Authenticator",
  BRANCH_CREATED: "Thêm mới chi nhánh",
  BRANCH_UPDATED: "Cập nhật chi nhánh",
  ENTITY_CREATED: "Tạo pháp nhân",
  ENTITY_UPDATED: "Cập nhật pháp nhân",
  LOCATION_CREATED: "Thêm địa điểm làm việc",
  LOCATION_UPDATED: "Cập nhật địa điểm làm việc",
  EMPLOYEE_ASSIGNED: "Phân công nhân sự",
  ASSIGNMENT_ENDED: "Kết thúc phân công",
  MANAGER_ASSIGNED: "Bổ nhiệm quản lý",
  MANAGER_ENDED: "Kết thúc quản lý",
  ACCOUNT_CREATED: "Tạo tài khoản",
  ACCOUNT_UPDATED: "Cập nhật tài khoản",
  RESET_LINK_CREATED: "Tạo liên kết đặt lại mật khẩu",
  LOGIN: "Đăng nhập an toàn",
  LOGOUT: "Đăng xuất tài khoản",
  MFA_ENROLLED: "Kích hoạt Authenticator",
  SESSION_REVOKED: "Thu hồi phiên làm việc",
  PASSWORD_RESET: "Đổi mật khẩu mới",
  WORKSPACE_CREATED: "Khởi tạo không gian làm việc",
};
export function Activity({ data, limit }: { data: Workspace; limit?: number }) {
  const { lang } = useI18n();
  const events = data.audit.slice(0, limit);
  return (
    <div className="activity-list">
      {events.map((e, i) => (
        <div className="activity-item" key={e.id}>
          <span
            className={`activity-icon ${i % 2 ? "tone-violet" : "tone-mint"}`}
          >
            {e.action.includes("BRANCH") || e.action.includes("LOCATION") ? (
              <Building2 size={16} />
            ) : e.action.includes("ASSIGN") ? (
              <Users size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
          </span>
          <div>
            <b>
              {(lang === "vi" ? actionsVi[e.action] : actions[e.action]) ||
                actions[e.action] ||
                e.action}
            </b>
            <p>{e.detail}</p>
            <small>{e.actorName}</small>
          </div>
          <time dateTime={e.createdAt}>
            {new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "de-DE", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Berlin",
            }).format(new Date(e.createdAt))}
          </time>
        </div>
      ))}
      {!events.length && (
        <Empty
          title={lang === "vi" ? "Mọi thứ đã được cập nhật" : "Alles ist auf dem aktuellen Stand"}
          text={
            lang === "vi"
              ? "Các hoạt động mới sẽ xuất hiện tại đây theo quyền hạn của bạn."
              : "Neue Aktivitäten erscheinen hier, sofern Ihre Rolle Zugriff darauf hat."
          }
        />
      )}
    </div>
  );
}
export function People({
  data,
  onAssign,
  onHistory,
  onEnd,
}: {
  data: Workspace;
  onAssign: (id: string) => void;
  onHistory: (id: string) => void;
  onEnd: (a: Assignment) => void;
}) {
  const { lang } = useI18n();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const people = data.employees.filter(
    (e) =>
      `${e.name} ${e.position}`.toLowerCase().includes(search.toLowerCase()) &&
      (!branch ||
        data.assignments.some(
          (a) => a.employeeId === e.id && a.branchId === branch && activeOn(a),
        )),
  );
  return (
    <>
      <div className="list-toolbar reveal">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Team suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "vi" ? "Tìm kiếm nhân sự …" : "Menschen finden …"}
          />
        </div>
        <select
          value={branch}
          aria-label="Team nach Standort filtern"
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value="">{lang === "vi" ? "Tất cả chi nhánh" : "Alle Niederlassungen"}</option>
          {data.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="panel reveal">
        <div className="panel-heading">
          <h2>
            {lang === "vi" ? "Đội ngũ nhân sự" : "Ihr Team"}{" "}
            <span className="count">{people.length}</span>
          </h2>
          <span className="muted">
            {lang === "vi" ? "Phân công theo thời hạn hiệu lực" : "Zuordnungen nach Gültigkeitszeitraum"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{lang === "vi" ? "Thành viên" : "Teammitglied"}</th>
                <th>{lang === "vi" ? "Chi nhánh gốc" : "Stammniederlassung"}</th>
                <th>{lang === "vi" ? "Địa điểm làm việc hiện tại" : "Aktueller Arbeitsort"}</th>
                <th>{lang === "vi" ? "Thời hạn" : "Zeitraum"}</th>
                <th>{lang === "vi" ? "Thao tác" : "Aktionen"}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((e) => {
                const a = data.assignments.find(
                  (a) => a.employeeId === e.id && activeOn(a),
                );
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="table-identity">
                        <span className="avatar avatar-peach">
                          {initials(e.name)}
                        </span>
                        <div>
                          <b>{e.name}</b>
                          <small>{e.position}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {data.branches.find((b) => b.id === e.homeBranchId)
                        ?.city || (lang === "vi" ? "Ngoài phạm vi" : "Außerhalb des Bereichs")}
                    </td>
                    <td>
                      {a ? (
                        <>
                          <b>
                            {
                              data.branches.find((b) => b.id === a.branchId)
                                ?.city
                            }
                          </b>
                          <small className="block muted">
                            {
                              data.locations.find(
                                (l) => l.id === a.workLocationId,
                              )?.name
                            }
                          </small>
                        </>
                      ) : (
                        <span className="muted">{lang === "vi" ? "Chưa phân công" : "Nicht zugeordnet"}</span>
                      )}
                    </td>
                    <td>
                      {a ? (
                        <>
                          <span>{dateDE(a.validFrom)}</span>
                          <small className="block muted">
                            {lang === "vi" ? "đến" : "bis"} {dateDE(a.validTo)}
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Historie ${e.name}`}
                          onClick={() => onHistory(e.id)}
                        >
                          <Clock3 size={16} />
                        </button>
                        {data.permissions.includes("assignment.write") && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`${e.name} zuordnen`}
                              onClick={() => onAssign(e.id)}
                            >
                              <ArrowLeftRight size={16} />
                            </button>
                            {a && !a.validTo && (
                              <button
                                className="text-button small"
                                onClick={() => onEnd(a)}
                              >
                                {lang === "vi" ? "Kết thúc" : "Beenden"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!people.length && (
          <Empty
            title={lang === "vi" ? "Không tìm thấy thành viên" : "Keine Teammitglieder gefunden"}
            text={
              lang === "vi"
                ? "Hãy thay đổi từ khóa tìm kiếm hoặc chọn chi nhánh khác."
                : "Ändern Sie die Suche oder wählen Sie eine andere Niederlassung."
            }
          />
        )}
      </div>
    </>
  );
}
export function SodModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: Workspace;
}) {
  const { lang, roleName } = useI18n();
  const [tab, setTab] = useState<"rules" | "matrix" | "forbidden">("rules");

  const rules: SodRule[] =
    data.sodRules && data.sodRules.length > 0
      ? data.sodRules
      : [
          {
            code: "SOD-01",
            nameVi: "Không kiêm nhiệm Tính lương & Phê duyệt chi trả",
            nameDe: "Trennung Entgeltabrechnung und Finanzfreigabe",
            descriptionVi:
              "Người tính lương (PAYROLL_OFFICER) không được đồng thời là Người phê duyệt thanh toán (FINANCE_APPROVER) để bảo đảm kiểm soát chi độc lập.",
            descriptionDe:
              "Eine Person darf nicht gleichzeitig Abrechnung erstellen und Auszahlung freigeben.",
            severity: "CRITICAL",
          },
          {
            code: "SOD-02",
            nameVi: "Tách biệt Quản trị hệ thống và Dữ liệu tiền lương",
            nameDe: "Trennung Systemadministration und Gehaltsdaten",
            descriptionVi:
              "Quản trị viên tài khoản (SYSTEM_ADMIN) không mặc nhiên có quyền xem dữ liệu tiền lương nhạy cảm của nhân sự.",
            descriptionDe:
              "Administrationskonten erhalten keinen automatischen Zugriff auf vertrauliche Gehaltsdaten.",
            severity: "HIGH",
          },
          {
            code: "SOD-03",
            nameVi: "Không tự phê duyệt chấm công cá nhân",
            nameDe: "Keine Selbstfreigabe von Arbeitszeiten",
            descriptionVi:
              "Quản lý nhà hàng (RESTAURANT_MANAGER) không được tự phê duyệt giờ làm việc hoặc chấm công của chính mình (Nguyên tắc 4 mắt).",
            descriptionDe:
              "Leitungskräfte dürfen ihre eigenen Arbeitszeitnachweise nicht eigenständig abzeichnen.",
            severity: "HIGH",
          },
          {
            code: "SOD-04",
            nameVi: "Cấm điều chuyển xuyên pháp nhân không hợp đồng",
            nameDe: "Verbot gesellschaftsübergreifender Versetzung ohne Vertrag",
            descriptionVi:
              "Không được điều chuyển nhân viên sang chi nhánh thuộc pháp nhân khác khi chưa hoàn tất phụ lục hoặc hợp đồng lao động mới.",
            descriptionDe:
              "Ein Wechsel der Rechtseinheit erfordert zwingend einen gesonderten Vertragsprozess.",
            severity: "CRITICAL",
          },
          {
            code: "SOD-05",
            nameVi: "Không trùng lặp người quản lý chi nhánh",
            nameDe: "Eindeutige Leitungszuordnung ohne Überschneidung",
            descriptionVi:
              "Trong cùng một khoảng thời gian hiệu lực, mỗi chi nhánh chỉ có một Quản lý trưởng chịu trách nhiệm điều hành.",
            descriptionDe:
              "Zeiträume für Restaurantleitung dürfen sich an einem Standort nicht überschneiden.",
            severity: "MEDIUM",
          },
        ];

  const roleList: { role: Role; perms: string[] }[] = [
    { role: "SYSTEM_ADMIN", perms: ["iam.read", "iam.write", "audit.read"] },
    {
      role: "HR_OFFICER",
      perms: ["iam.read", "org.read", "workforce.read", "assignment.write"],
    },
    {
      role: "RESTAURANT_MANAGER",
      perms: ["org.read", "workforce.read", "assignment.write"],
    },
    { role: "EMPLOYEE", perms: [] },
    { role: "PAYROLL_OFFICER", perms: ["workforce.read"] },
    { role: "FINANCE_APPROVER", perms: [] },
    { role: "AUDITOR", perms: ["org.read", "workforce.read", "audit.read"] },
    { role: "DPO", perms: ["iam.read", "audit.read"] },
  ];

  const allPerms = [
    { key: "iam.read", labelVi: "Xem tài khoản", labelDe: "Konten lesen" },
    {
      key: "iam.write",
      labelVi: "Quản lý tài khoản",
      labelDe: "Konten verwalten",
    },
    {
      key: "org.read",
      labelVi: "Xem cơ cấu tổ chức",
      labelDe: "Organisation lesen",
    },
    {
      key: "org.write",
      labelVi: "Quản lý pháp nhân & chi nhánh",
      labelDe: "Organisation schreiben",
    },
    { key: "workforce.read", labelVi: "Xem nhân sự", labelDe: "Personal lesen" },
    {
      key: "assignment.write",
      labelVi: "Phân công & điều chuyển",
      labelDe: "Einsätze zuordnen",
    },
    {
      key: "audit.read",
      labelVi: "Nhật ký kiểm toán",
      labelDe: "Audit-Protokoll",
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        lang === "vi"
          ? "Ma trận phân quyền & Quy tắc SoD (F00 05)"
          : "Berechtigungsmatrix & Funktionstrennung SoD (F00 05)"
      }
      description={
        lang === "vi"
          ? "Kiểm soát phân quyền theo nguyên tắc Segregation of Duties (SoD), ngăn chặn xung đột lợi ích và bảo vệ dữ liệu nhạy cảm."
          : "Zugriffskontrollen und Funktionstrennung (Segregation of Duties) zur Vermeidung von Interessenkonflikten und Schutz sensibler Daten."
      }
    >
      <div className="detail-tabs" style={{ marginBottom: 20 }}>
        <button
          className={tab === "rules" ? "selected" : ""}
          onClick={() => setTab("rules")}
        >
          {lang === "vi" ? "Quy tắc SoD" : "SoD-Regeln"}
        </button>
        <button
          className={tab === "matrix" ? "selected" : ""}
          onClick={() => setTab("matrix")}
        >
          {lang === "vi" ? "Ma trận quyền hạn" : "Rechtematrix"}
        </button>
        <button
          className={tab === "forbidden" ? "selected" : ""}
          onClick={() => setTab("forbidden")}
        >
          {lang === "vi" ? "Tình huống cấm & Kiểm soát" : "Verbotene Szenarien"}
        </button>
      </div>

      <div className="modal-body">
        {tab === "rules" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rules.map((r) => (
              <div
                key={r.code}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 16,
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="pill" style={{ fontWeight: 700 }}>
                      {r.code}
                    </span>
                    <b style={{ fontSize: 14 }}>
                      {lang === "vi" ? r.nameVi : r.nameDe}
                    </b>
                  </div>
                  <span
                    className={`pill ${
                      r.severity === "CRITICAL"
                        ? "sod-critical"
                        : r.severity === "HIGH"
                          ? "sod-high"
                          : "sod-medium"
                    }`}
                  >
                    {r.severity}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--muted)",
                    lineHeight: 1.6,
                  }}
                >
                  {lang === "vi" ? r.descriptionVi : r.descriptionDe}
                </p>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--green)",
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {lang === "vi"
                      ? "Được xác thực và bảo vệ tự động bởi Backend API"
                      : "Automatisch durch Backend-API durchgesetzt"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "matrix" && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{lang === "vi" ? "Vai trò hệ thống" : "Rolle"}</th>
                  {allPerms.map((p) => (
                    <th
                      key={p.key}
                      title={p.key}
                      style={{ textAlign: "center", fontSize: 12 }}
                    >
                      {lang === "vi" ? p.labelVi : p.labelDe}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roleList.map((r) => (
                  <tr key={r.role}>
                    <td>
                      <b>{roleName(r.role)}</b>
                      <small
                        style={{
                          display: "block",
                          color: "var(--muted)",
                          fontSize: 11,
                        }}
                      >
                        {r.role}
                      </small>
                    </td>
                    {allPerms.map((p) => {
                      const hasPerm = r.perms.includes(p.key);
                      return (
                        <td key={p.key} style={{ textAlign: "center" }}>
                          {hasPerm ? (
                            <span
                              style={{
                                color: "var(--green)",
                                display: "inline-flex",
                              }}
                            >
                              <Check size={16} />
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--line)",
                                display: "inline-flex",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "forbidden" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#b91c1c",
                  marginBottom: 6,
                }}
              >
                <AlertTriangle size={18} />
                <b>
                  {lang === "vi"
                    ? "1. Cấm kiêm nhiệm Tính lương & Phê duyệt chi trả (SOD-01)"
                    : "1. Trennung Abrechnung & Auszahlung (SOD-01)"}
                </b>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#7f1d1d",
                  lineHeight: 1.6,
                }}
              >
                {lang === "vi"
                  ? "Không cho phép một tài khoản đồng thời mang vai trò PAYROLL_OFFICER và FINANCE_APPROVER. Backend chặn trực tiếp khi tạo hoặc cập nhật tài khoản (HTTP 400 Bad Request)."
                  : "Ein Konto darf nicht gleichzeitig die Rollen PAYROLL_OFFICER und FINANCE_APPROVER besitzen. Backend blockiert dies mit HTTP 400 Bad Request."}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#c2410c",
                  marginBottom: 6,
                }}
              >
                <ShieldAlert size={18} />
                <b>
                  {lang === "vi"
                    ? "2. Tách biệt Quản trị tài khoản và Dữ liệu tiền lương (SOD-02)"
                    : "2. Trennung Administration & Gehaltsdaten (SOD-02)"}
                </b>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#7c2d12",
                  lineHeight: 1.6,
                }}
              >
                {lang === "vi"
                  ? "Vai trò SYSTEM_ADMIN chỉ quản lý danh tính và hạ tầng, không mặc nhiên có quyền đọc hoặc thao tác dữ liệu tiền lương nhạy cảm của người lao động."
                  : "SYSTEM_ADMIN verwaltet Konten und Berechtigungen, hat jedoch keinen automatischen Zugriff auf Gehalts- und Abrechnungsdaten."}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #fde68a",
                background: "#fffbeb",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#b45309",
                  marginBottom: 6,
                }}
              >
                <AlertTriangle size={18} />
                <b>
                  {lang === "vi"
                    ? "3. Không tự phê duyệt chấm công cá nhân (SOD-03)"
                    : "3. Keine Selbstfreigabe eigener Zeiten (SOD-03)"}
                </b>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#78350f",
                  lineHeight: 1.6,
                }}
              >
                {lang === "vi"
                  ? "Quản lý nhà hàng (RESTAURANT_MANAGER) không được tự phê duyệt bảng chấm công hoặc giờ làm việc cá nhân của mình; bắt buộc cấp quản lý khác hoặc HR phê duyệt."
                  : "Leitungskräfte dürfen eigene Arbeitszeiten nicht selbst genehmigen (Vier-Augen-Prinzip)."}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                <Info size={18} />
                <b>
                  {lang === "vi"
                    ? "4. Cấm điều chuyển xuyên pháp nhân không hợp đồng (SOD-04)"
                    : "4. Keine unzulässige konzernübergreifende Versetzung (SOD-04)"}
                </b>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
                {lang === "vi"
                  ? "Hệ thống kiểm tra tính đồng nhất của pháp nhân sở hữu (LegalEntityId) giữa chi nhánh gốc và chi nhánh đích. Nếu khác pháp nhân, hệ thống chặn với thông báo yêu cầu ký hợp đồng mới."
                  : "Versetzungen zwischen verschiedenen Rechtseinheiten erfordern einen neuen Arbeitsvertrag und werden vom Backend abgewiesen."}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                <Info size={18} />
                <b>
                  {lang === "vi"
                    ? "5. Chống trùng lặp thời gian quản lý chi nhánh (SOD-05)"
                    : "5. Eindeutige Leitungszuordnung (SOD-05)"}
                </b>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
                {lang === "vi"
                  ? "Mỗi chi nhánh chỉ có một người quản lý trưởng phụ trách trong một khoảng ngày hiệu lực. Backend tự động chặn các phân công bị trùng lặp thời gian."
                  : "Zeiträume für Restaurantleitung dürfen sich an einem Standort nicht überschneiden."}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function Accounts({
  data,
  onEdit,
  onReset,
}: {
  data: Workspace;
  onEdit: (a: Account) => void;
  onReset: (a: Account) => void;
}) {
  const { lang, roleName } = useI18n();
  const [search, setSearch] = useState("");
  const [showSod, setShowSod] = useState(false);
  const users = data.users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="security-banner reveal">
        <span className="security-small-icon">
          <ShieldCheck size={22} />
        </span>
        <div>
          <b>{lang === "vi" ? "Phân quyền và bảo mật nghiêm ngặt." : "Zugriffe mit Verantwortung."}</b>
          <p>
            {lang === "vi"
              ? "Vai trò và phạm vi dữ liệu được kiểm tra ở từng API backend. Tài khoản Quản trị không mặc định đọc được dữ liệu lương."
              : "Rollen und Datenbereiche werden bei jeder Anfrage geprüft. Administration gewährt keinen automatischen Zugriff auf Gehaltsdaten."}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="pill">F00 · IAM</span>
          <button
            className="button button-secondary"
            onClick={() => setShowSod(true)}
            style={{ fontSize: 13, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <ShieldCheck size={16} />
            {lang === "vi" ? "Ma trận phân quyền & SoD" : "Rechtematrix & SoD"}
          </button>
        </div>
      </div>
      <div className="list-toolbar reveal">
        <div className="search-field">
          <Search size={17} />
          <input
            placeholder={lang === "vi" ? "Tìm theo tên hoặc email …" : "Name oder E-Mail suchen …"}
            aria-label="Konten suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">{users.length} {lang === "vi" ? "tài khoản" : "Konten"}</span>
      </div>
      <div className="panel reveal table-scroll">
        <table>
          <thead>
            <tr>
              <th>{lang === "vi" ? "Tài khoản" : "Konto"}</th>
              <th>{lang === "vi" ? "Vai trò" : "Rollen"}</th>
              <th>{lang === "vi" ? "Phạm vi dữ liệu" : "Datenbereich"}</th>
              <th>Authenticator (MFA)</th>
              <th>{lang === "vi" ? "Trạng thái" : "Status"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="table-identity">
                    <span className="avatar avatar-mint">
                      {initials(u.name)}
                    </span>
                    <div>
                      <b>{u.name}</b>
                      <small>{u.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="role-tags">
                    {u.roles.map((r) => (
                      <span key={r} className="role-tag">
                        {roleName(r)}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="scope-text">
                    {u.roles.includes("SYSTEM_ADMIN")
                      ? (lang === "vi" ? "Toàn bộ tổ chức" : "Organisationsverwaltung")
                      : u.legalEntityIds.length
                        ? (lang === "vi" ? `${u.legalEntityIds.length} pháp nhân` : `${u.legalEntityIds.length} Rechtseinheit(en)`)
                        : u.branchIds.length
                          ? (lang === "vi" ? `${u.branchIds.length} chi nhánh` : `${u.branchIds.length} Niederlassung(en)`)
                          : u.roles.includes("RESTAURANT_MANAGER")
                            ? (lang === "vi" ? "Theo chi nhánh phụ trách" : "Nach Leitungszuordnung")
                            : (lang === "vi" ? "Dữ liệu cá nhân" : "Persönlich")}
                  </span>
                </td>
                <td>
                  <span className={u.mfaEnabled ? "text-green" : "muted"}>
                    {u.mfaEnabled ? (
                      <Check size={14} />
                    ) : (
                      <KeyRound size={14} />
                    )}{" "}
                    {u.mfaEnabled ? (lang === "vi" ? "Đã bật" : "Aktiviert") : (lang === "vi" ? "Chưa cài đặt" : "Nicht eingerichtet")}
                  </span>
                </td>
                <td>
                  <Status active={u.active} />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`${u.name} bearbeiten`}
                      onClick={() => onEdit(u)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Passwort-Link für ${u.name}`}
                      onClick={() => onReset(u)}
                    >
                      <KeyRound size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <Empty
            title={lang === "vi" ? "Không tìm thấy tài khoản nào" : "Kein Konto gefunden"}
            text={lang === "vi" ? "Vui lòng điều chỉnh lại từ khóa tìm kiếm." : "Bitte passen Sie Ihre Suche an."}
          />
        )}
      </div>

      <SodModal
        open={showSod}
        onClose={() => setShowSod(false)}
        data={data}
      />
    </>
  );
}

export function BranchDetails({
  branch,
  data,
  onEdit,
}: {
  branch: Branch;
  data: Workspace;
  onEdit: (e: Editor) => void;
}) {
  const { lang } = useI18n();
  const [tab, setTab] = useState("details");
  const locations = data.locations.filter((l) => l.branchId === branch.id);
  const assignments = data.managerAssignments.filter(
    (a) => a.branchId === branch.id,
  );
  return (
    <>
      <div className={`detail-visual card-${branch.accent}`}>
        <Scene compact color={branch.accent} />
        <Status active={branch.active} />
      </div>
      <div className="detail-tabs">
        {[
          ["details", lang === "vi" ? "Tổng quan" : "Übersicht"],
          ["locations", lang === "vi" ? "Địa điểm làm việc" : "Arbeitsorte"],
          ["management", lang === "vi" ? "Ban quản lý" : "Leitung"],
          ["holidays", lang === "vi" ? "Ngày lễ vùng bang" : "Feiertage"],
        ].map(([id, label]) => (
          <button
            className={id === tab ? "selected" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
            {id === tab && (
              <motion.span
                layoutId={`branch-tab-${branch.id}`}
                transition={spring.selection}
              />
            )}
          </button>
        ))}
      </div>
      <div className="modal-body">
        {tab === "details" && (
          <>
            <div className="details-grid">
              <Detail
                label={lang === "vi" ? "Pháp nhân" : "Rechtseinheit"}
                value={
                  data.entities.find((e) => e.id === branch.legalEntityId)?.name
                }
              />
              <Detail label={lang === "vi" ? "Mã chi nhánh" : "Standortcode"} value={branch.code} />
              <Detail label={lang === "vi" ? "Địa chỉ" : "Adresse"} value={branch.address} />
              <Detail
                label={lang === "vi" ? "Vùng bang" : "Bundesland"}
                value={data.states[branch.stateCode]}
              />
              <Detail label={lang === "vi" ? "Múi giờ" : "Zeitzone"} value={branch.timezone} />
              <Detail
                label={lang === "vi" ? "Nhân sự tại chi nhánh" : "Team am Standort"}
                value={`${new Set(data.assignments.filter((a) => a.branchId === branch.id && activeOn(a)).map((a) => a.employeeId)).size} ${lang === "vi" ? "người" : "Personen"}`}
              />
            </div>
            <div className="note">
              <MapPin size={18} />
              <span>
                {lang === "vi"
                  ? `Địa điểm làm việc thực tế quyết định chế độ ngày lễ. ${
                      branch.stateCode === "BW"
                        ? "Baden-Württemberg là khu vực thí điểm chính."
                        : "Quy tắc ngày lễ của bang này cần phê duyệt trước khi tính lương."
                    }`
                  : `Für Feiertage zählt der tatsächliche Arbeitsort. ${
                      branch.stateCode === "BW"
                        ? "Baden-Württemberg ist das vorgesehene Pilotgebiet."
                        : "Die Feiertagsregeln dieses Bundeslands benötigen vor Payroll eine gesonderte Freigabe."
                    }`}
              </span>
            </div>
            {data.permissions.includes("org.write") && (
              <Press onClick={() => onEdit({ kind: "branch", row: branch })}>
                <Pencil size={16} /> {lang === "vi" ? "Chỉnh sửa chi nhánh" : "Niederlassung bearbeiten"}
              </Press>
            )}
          </>
        )}
        {tab === "locations" && (
          <>
            <div className="section-inline">
              <h3>{locations.length} {lang === "vi" ? "địa điểm làm việc thực tế" : "tatsächliche Arbeitsorte"}</h3>
              {data.permissions.includes("org.write") && (
                <button
                  className="text-button"
                  onClick={() => onEdit({ kind: "location", branch })}
                >
                  <Plus size={16} /> {lang === "vi" ? "Thêm mới" : "Hinzufügen"}
                </button>
              )}
            </div>
            {locations.map((l) => (
              <div className="location-item" key={l.id}>
                <span className="entity-icon">
                  <MapPin size={19} />
                </span>
                <div>
                  <b>{l.name}</b>
                  <p>{l.address}</p>
                  <small>
                    {data.states[l.stateCode]} · {l.timezone}
                  </small>
                  <Status active={l.active} />
                </div>
                {data.permissions.includes("org.write") && (
                  <button
                    className="icon-button"
                    aria-label={`${l.name} bearbeiten`}
                    onClick={() => onEdit({ kind: "location", branch, row: l })}
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            ))}
          </>
        )}
        {tab === "management" && (
          <>
            <div className="section-inline">
              <h3>{lang === "vi" ? "Trách nhiệm quản lý theo hiệu lực" : "Verantwortung mit Gültigkeit"}</h3>
              {data.permissions.includes("assignment.write") && (
                <button
                  className="text-button"
                  onClick={() => onEdit({ kind: "manager", branch })}
                >
                  <Plus size={16} /> {lang === "vi" ? "Phân công" : "Zuordnen"}
                </button>
              )}
            </div>
            {assignments.map((a) => (
              <div className="location-item" key={a.id}>
                <span className="avatar avatar-violet">
                  {initials(
                    data.managerOptions.find((u) => u.id === a.managerId)
                      ?.name || (lang === "vi" ? "Quản lý" : "Leitung"),
                  )}
                </span>
                <div>
                  <b>
                    {data.managerOptions.find((u) => u.id === a.managerId)
                      ?.name || (lang === "vi" ? "Quản lý nhà hàng" : "Restaurantleitung")}
                  </b>
                  <p>
                    {dateDE(a.validFrom)} — {dateDE(a.validTo)}
                  </p>
                  <Status
                    active={activeOn(a)}
                    label={
                      activeOn(a)
                        ? (lang === "vi" ? "Hiện tại" : "Aktuell")
                        : a.validFrom > today()
                          ? (lang === "vi" ? "Kế hoạch" : "Geplant")
                          : (lang === "vi" ? "Đã kết thúc" : "Beendet")
                    }
                  />
                </div>
                {data.permissions.includes("assignment.write") &&
                  !a.validTo && (
                    <button
                      className="text-button small"
                      onClick={() =>
                        onEdit({ kind: "end", row: a, manager: true })
                      }
                    >
                      {lang === "vi" ? "Kết thúc" : "Beenden"}
                    </button>
                  )}
              </div>
            ))}
            {!assignments.length && (
              <Empty
                title={lang === "vi" ? "Chưa có quản lý được phân công" : "Noch keine Leitung zugeordnet"}
                text={lang === "vi" ? "Việc phân công quản lý sẽ xác định phạm vi trách nhiệm và thời hạn." : "Eine Leitungszuordnung legt Verantwortungsbereich und Gültigkeit fest."}
              />
            )}
          </>
        )}
        {tab === "holidays" && (
          <>
            <div className="section-inline">
              <h3>
                {lang === "vi"
                  ? `Lịch ngày lễ ${data.states[branch.stateCode]} (${branch.stateCode})`
                  : `Gesetzliche Feiertage ${data.states[branch.stateCode]} (${branch.stateCode})`}
              </h3>
              <span className="pill">
                <CalendarDays size={14} />{" "}
                {
                  (data.holidays || []).filter(
                    (h) => h.nationwide || h.states.includes(branch.stateCode),
                  ).length
                }{" "}
                {lang === "vi" ? "ngày lễ" : "Tage"}
              </span>
            </div>
            <div className="note" style={{ marginBottom: 16 }}>
              <ShieldCheck size={18} />
              <span>
                {lang === "vi"
                  ? "F01 02: Dùng đúng địa điểm thực tế làm việc để áp dụng lịch lễ và chính sách địa phương. Không dùng lịch lễ Baden-Württemberg cho chi nhánh chưa cấu hình hoặc ở bang khác."
                  : "F01 02: Für Feiertagszuschläge und Arbeitszeiterfassung gilt der tatsächliche Arbeitsort. Feiertage anderer Bundesländer dürfen unkonfigurierten Standorten nicht zugewiesen werden."}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{lang === "vi" ? "Ngày" : "Datum"}</th>
                    <th>{lang === "vi" ? "Tên ngày lễ" : "Feiertag"}</th>
                    <th>{lang === "vi" ? "Phạm vi" : "Geltungsbereich"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.holidays || [])
                    .filter(
                      (h) =>
                        h.nationwide || h.states.includes(branch.stateCode),
                    )
                    .map((h) => (
                      <tr key={h.name + h.date}>
                        <td>
                          <b>{dateDE(h.date)}</b>
                        </td>
                        <td>
                          <div>
                            <b>{lang === "vi" ? h.nameVi : h.name}</b>
                            <small
                              style={{
                                display: "block",
                                color: "var(--muted)",
                                fontSize: 12,
                              }}
                            >
                              {lang === "vi" ? h.name : h.nameVi}
                            </small>
                          </div>
                        </td>
                        <td>
                          {h.nationwide ? (
                            <span className="holiday-badge nationwide">
                              {lang === "vi" ? "Toàn quốc" : "Bundesweit"}
                            </span>
                          ) : (
                            <span className="holiday-badge state">
                              {lang === "vi"
                                ? `Đặc thù bang ${branch.stateCode}`
                                : `Landesspezifisch (${branch.stateCode})`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <small>{label}</small>
      <p>{value || "—"}</p>
    </div>
  );
}
export function Security({
  user,
  onUser,
  notify,
  onLogout,
  data,
}: {
  user: User;
  onUser: (u: User) => void;
  notify: (m: string) => void;
  onLogout: () => void;
  data?: Workspace;
}) {
  const { lang, roleName } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(false);
  const [rotation, setRotation] = useState(false);
  const [showSod, setShowSod] = useState(false);
  const [newSecret, setNewSecret] = useState<{
    secret: string;
    uri: string;
  } | null>(null);
  const [rotationBusy, setRotationBusy] = useState(false);
  const load = useCallback(
    () =>
      api<Session[]>("/auth/sessions")
        .then(setSessions)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <div className="security-layout">
        <section className="panel reveal security-panel">
          <div className="security-large-icon">
            <Fingerprint size={30} />
          </div>
          <h2>{lang === "vi" ? "Xác thực hai yếu tố (2FA)" : "Zwei-Faktor-Anmeldung"}</h2>
          <p>
            {lang === "vi"
              ? "Yếu tố thứ hai giúp bảo vệ tài khoản của bạn ngay cả khi mật khẩu bị lộ."
              : "Ein zweiter Faktor schützt Ihr Konto auch dann, wenn Ihr Passwort bekannt wird."}
          </p>
          <div className="security-fact">
            <span>Authenticator</span>
            <Status
              active={user.mfaEnabled}
              label={
                user.mfaEnabled
                  ? (lang === "vi" ? "Đã kích hoạt" : "Aktiviert")
                  : (lang === "vi" ? "Chưa cài đặt" : "Nicht eingerichtet")
              }
            />
          </div>
          <div className="security-fact">
            <span>{lang === "vi" ? "Đối với vai trò của bạn" : "Für Ihre Rolle"}</span>
            <b>{user.mfaRequired ? (lang === "vi" ? "Bắt buộc" : "Verpflichtend") : (lang === "vi" ? "Khuyến nghị" : "Empfohlen")}</b>
          </div>
          {!user.mfaEnabled ? (
            <Press onClick={() => setSetup(true)}>
              {lang === "vi" ? "Cài đặt Authenticator" : "Authenticator einrichten"} <ArrowRight size={16} />
            </Press>
          ) : (
            <div>
              <div className="note">
                <ShieldCheck size={18} />
                <span>
                  {lang === "vi"
                    ? "Đăng nhập của bạn đã được xác nhận bằng mã OTP theo thời gian thực."
                    : "Ihre Anmeldung wurde mit einem zeitbasierten Einmalcode bestätigt."}
                </span>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setError("");
                  setRotation(true);
                }}
              >
                {lang === "vi" ? "Đổi Authenticator" : "Authenticator wechseln"} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="panel reveal security-panel">
          <div className="security-large-icon tone-violet">
            <LockKeyhole size={27} />
          </div>
          <h2>{lang === "vi" ? "Tài khoản cá nhân" : "Ihr persönlicher Zugang"}</h2>
          <p>
            {lang === "vi"
              ? "Vai trò của bạn xác định quyền truy cập vào tổ chức và dữ liệu."
              : "Ihre Rollen bestimmen den Zugriff auf Organisation und Daten."}
          </p>
          <div className="details-grid">
            <Detail label={lang === "vi" ? "Họ tên" : "Name"} value={user.name} />
            <Detail label="E-Mail" value={user.email} />
          </div>
          <div className="role-tags">
            {user.roles.map((r) => (
              <span className="role-tag" key={r}>
                {roleName(r)}
              </span>
            ))}
          </div>
          {data && (
            <div style={{ marginTop: 14 }}>
              <button
                className="button button-secondary"
                onClick={() => setShowSod(true)}
                style={{
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                }}
              >
                <ShieldCheck size={16} />
                {lang === "vi"
                  ? "Ma trận phân quyền & SoD (F00 05)"
                  : "Berechtigungsmatrix & SoD-Regeln"}
              </button>
              <SodModal
                open={showSod}
                onClose={() => setShowSod(false)}
                data={data}
              />
            </div>
          )}
          <p className="muted small">
            {lang === "vi"
              ? "Để đặt lại mật khẩu, bạn cần nhận liên kết dùng một lần từ Quản trị viên."
              : "Zum Zurücksetzen Ihres Passworts erhalten Sie einen Einmal-Link von Ihrer Administration."}
          </p>
        </section>
      </div>
      <section className="panel reveal">
        <div className="panel-heading">
          <div>
            <h2>
              {lang === "vi" ? "Thiết bị đã đăng nhập" : "Angemeldete Geräte"}{" "}
              <span className="count">{sessions.length}</span>
            </h2>
            <p>
              {lang === "vi"
                ? "Đăng xuất khỏi các phiên thiết bị bạn không còn sử dụng."
                : "Beenden Sie Sitzungen, die Sie nicht mehr benötigen."}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Sitzungen aktualisieren"
            onClick={load}
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
        {sessions.map((s) => (
          <div className="session-row" key={s.id}>
            <span className="entity-icon">
              <Monitor size={21} />
            </span>
            <div>
              <b>
                {s.agent.includes("Edg")
                  ? "Microsoft Edge"
                  : s.agent.includes("Chrome")
                    ? "Google Chrome"
                    : s.agent.includes("Firefox")
                      ? "Firefox"
                      : "Webbrowser"}
                {s.current && (
                  <span className="role-tag">
                    {lang === "vi" ? "Thiết bị này" : "Dieses Gerät"}
                  </span>
                )}
              </b>
              <p>
                {lang === "vi" ? "Đăng nhập ngày" : "Angemeldet am"} {dateDE(s.createdAt)}
              </p>
            </div>
            <button
              className="button button-secondary"
              onClick={async () => {
                try {
                  await api(`/auth/sessions/${s.id}`, "DELETE");
                  if (s.current) onLogout();
                  else {
                    await load();
                    notify(lang === "vi" ? "Đã đăng xuất phiên." : "Sitzung beendet.");
                  }
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              {lang === "vi" ? "Đăng xuất phiên" : "Sitzung beenden"} <LogOut size={14} />
            </button>
          </div>
        ))}
      </section>
      <Modal
        open={setup}
        onClose={() => setSetup(false)}
        title={lang === "vi" ? "Cài đặt Authenticator" : "Authenticator einrichten"}
        description={
          lang === "vi"
            ? "Bảo mật hai lớp cho tài khoản cá nhân của bạn"
            : "Ein zweiter Faktor für Ihren persönlichen Zugang"
        }
      >
        <MfaGate
          embedded
          user={user}
          onComplete={(u) => {
            onUser(u);
            setSetup(false);
            notify(lang === "vi" ? "Đã cài đặt Authenticator thành công." : "Authenticator eingerichtet.");
          }}
          onLogout={() => setSetup(false)}
        />
      </Modal>
      <Modal
        open={rotation}
        onClose={() => {
          setRotation(false);
          setNewSecret(null);
          setError("");
        }}
        title={lang === "vi" ? "Đổi Authenticator" : "Authenticator wechseln"}
        description={
          lang === "vi"
            ? "Chỉ thay thế yếu tố xác thực cũ sau khi đã xác nhận mã mới thành công."
            : "Den bisherigen Faktor erst nach erfolgreicher Bestätigung ersetzen."
        }
      >
        {newSecret ? (
          <MfaGate
            key={newSecret.secret}
            embedded
            user={user}
            initialSetup={newSecret}
            onComplete={(u) => {
              onUser(u);
              setRotation(false);
              setNewSecret(null);
              notify(
                lang === "vi"
                  ? "Đã đổi Authenticator. Các phiên đăng nhập khác đã được kết thúc."
                  : "Authenticator ersetzt. Andere Sitzungen wurden beendet.",
              );
            }}
            onLogout={() => {
              setRotation(false);
              setNewSecret(null);
            }}
          />
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRotationBusy(true);
              setError("");
              const fields = new FormData(e.currentTarget);
              try {
                setNewSecret(
                  await api("/auth/mfa/rotate", "POST", {
                    password: String(fields.get("password")),
                    code: String(fields.get("code")),
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setRotationBusy(false);
              }
            }}
          >
            <div className="modal-body">
              <label className="field">
                <span>{lang === "vi" ? "Mật khẩu hiện tại" : "Aktuelles Passwort"}</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={72}
                  required
                />
              </label>
              <label className="field">
                <span>
                  {lang === "vi"
                    ? "Mã mới từ Authenticator hiện tại"
                    : "Neuer Code des bisherigen Authenticators"}
                </span>
                <input
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <p className="muted small">
                {lang === "vi"
                  ? "Vui lòng đợi một mã mới nếu mã trước đó vừa được dùng khi đăng nhập."
                  : "Warten Sie auf einen neuen Code, falls der letzte bereits bei der Anmeldung verwendet wurde."}
              </p>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <Press type="submit" disabled={rotationBusy}>
                {rotationBusy
                  ? (lang === "vi" ? "Đang kiểm tra …" : "Wird geprüft …")
                  : (lang === "vi" ? "Xác nhận và cài đặt lại" : "Bestätigen und neu einrichten")}
              </Press>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
