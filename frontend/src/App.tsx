import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ReducedMotionConfig, spring } from "@animate-ui/react/utils/motion";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Search,
  Bell,
  ArrowUpRight,
  Plus,
  ArrowRight,
  LogOut,
  Menu,
  X,
  Copy,
  Globe2,
  Fingerprint,
  FileClock,
  CircleHelp,
  ChevronRight,
  Command,
  RefreshCw,
  Sun,
  Moon,
  ArrowLeftRight,
  Info,
  AlertCircle,
  Calendar,
  Clock,
  FileCheck,
  CalendarDays,
  Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  api,
  ApiError,
  dateDE,
  initials,
  type User,
  type Workspace,
} from "./lib/api";
import { EditButton, Empty, Loading, Modal, Press, Status } from "./components/experience";
import { Login, MfaGate } from "./components/auth";
import {
  Overview,
  BranchList,
  People,
  Accounts,
  Activity,
  BranchDetails,
  Security,
} from "./components/workspace";
import { WorkforceView } from "./components/workforce";
import { SchedulingView } from "./components/scheduling";
import { AttendanceView } from "./components/attendance";
import { ReconciliationView } from "./components/reconciliation";
import { LeaveView } from "./components/leave";
import { AllowancesView } from "./components/allowances";
import { EditorModal, type Editor } from "./components/editor";
import { I18nProvider, useI18n, LanguageSwitcher } from "./lib/i18n";
import "./App.css";
import "./admin.css";
import "./workspace.css";
import { DutyHome, WorkspaceActions, workspaceKind, workspaceNames } from "./components/role-home";
import { NoticeContext } from "./lib/notice";
export type Page =
  | "overview"
  | "workforce"
  | "scheduling"
  | "attendance"
  | "reconciliation"
  | "leave"
  | "allowances"
  | "branches"
  | "entities"
  | "people"
  | "access"
  | "security"
  | "activity";
const navDefinition: {
  page: Page;
  deLabel: string;
  key: string;
  icon: LucideIcon;
  permission?: string;
}[] = [
  { page: "overview", deLabel: "Übersicht", key: "nav.overview", icon: LayoutDashboard },
  {
    page: "workforce",
    deLabel: "Personal & Verträge",
    key: "nav.workforce",
    icon: Users,
    permission: "workforce.read",
  },
  {
    page: "scheduling",
    deLabel: "Schichtplanung",
    key: "nav.scheduling",
    icon: Calendar,
    permission: "schedule.read",
  },
  {
    page: "attendance",
    deLabel: "Zeiterfassung",
    key: "nav.attendance",
    icon: Clock,
  },
  {
    page: "reconciliation",
    deLabel: "Soll-Ist-Abgleich",
    key: "nav.reconciliation",
    icon: FileCheck,
    permission: "schedule.write",
  },
  {
    page: "leave",
    deLabel: "Urlaub & Abwesenheit",
    key: "nav.leave",
    icon: CalendarDays,
  },
  {
    page: "allowances",
    deLabel: "SFN-Zuschläge & Feiertage",
    key: "nav.allowances",
    icon: Coins,
    permission: "allowance.read",
  },
  {
    page: "branches",
    deLabel: "Niederlassungen",
    key: "nav.branches",
    icon: Building2,
    permission: "org.read",
  },
  {
    page: "entities",
    deLabel: "Rechtseinheiten",
    key: "nav.entities",
    icon: Globe2,
    permission: "org.read",
  },
  {
    page: "people",
    deLabel: "Team & Zuordnungen",
    key: "nav.people",
    icon: Users,
    permission: "workforce.read",
  },
  {
    page: "access",
    deLabel: "Konten & Rollen",
    key: "nav.access",
    icon: ShieldCheck,
    permission: "iam.read",
  },
  { page: "security", deLabel: "Meine Sicherheit", key: "nav.security", icon: Fingerprint },
  {
    page: "activity",
    deLabel: "Aktivitätsprotokoll",
    key: "nav.activity",
    icon: FileClock,
    permission: "audit.read",
  },
];
const navigationGroups: { vi: string; de: string; pages: Page[] }[] = [
  { vi: "Vận hành", de: "Betrieb", pages: ["overview", "scheduling", "attendance", "leave"] },
  { vi: "Nhân sự & tổ chức", de: "Personal & Organisation", pages: ["workforce", "people", "branches", "entities"] },
  { vi: "Giờ công & phụ cấp", de: "Arbeitszeit & Zuschläge", pages: ["reconciliation", "allowances"] },
  { vi: "Quản trị hệ thống", de: "Systemverwaltung", pages: ["access", "activity", "security"] },
];
const fromHash = (): Page =>
  navDefinition.some((n) => n.page === location.hash.slice(1))
    ? (location.hash.slice(1) as Page)
    : "overview";
export default function App() {
  return (
    <ReducedMotionConfig>
      <I18nProvider>
        <Application />
      </I18nProvider>
    </ReducedMotionConfig>
  );
}
function Application() {
  const { lang, t, roleName } = useI18n();
  const nav = navDefinition.map((n) => ({
    ...n,
    label: t(n.key, n.deLabel),
  }));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Workspace | null>(null);
  const [page, setPage] = useState<Page>(fromHash);
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("atelier-theme") === "dark",
  );
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [dutyBranch, setDutyBranch] = useState("");
  const [scheduleDay, setScheduleDay] = useState<string>();
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [history, setHistory] = useState<string | null>(null);
  const content = useRef<HTMLElement>(null);
  const needsMfa =
    !!user && (user.mfaEnabled || user.mfaRequired) && !user.mfaVerified;
  const load = useCallback(async () => {
    try {
      const next = await api<Workspace>("/workspace");
      setData(next);
      setUser(next.user);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setData(null);
      } else setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (user && !needsMfa) void load();
  }, [user?.id, needsMfa, load]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("atelier-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    const hash = () => setPage(fromHash());
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".reveal", {
          y: 15,
          opacity: 0,
          duration: 0.48,
          stagger: 0.055,
          ease: "power2.out",
          clearProps: "all",
        });
      });
      return () => mm.revert();
    },
    { scope: content, dependencies: [page, !!data], revertOnUpdate: true },
  );
  const navigate = (to: Page) => {
    setScheduleDay(undefined);
    location.hash = to;
    setPage(to);
    setMobile(false);
    setCommand(false);
    window.scrollTo({ top: 0 });
  };
  const has = (p: string) => data?.permissions.includes(p) || false;
  const logout = async () => {
    try {
      await api("/auth/logout", "POST");
      setUser(null);
      setData(null);
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  if (!ready) return <Loading />;
  if (!user || new URLSearchParams(location.search).has("reset"))
    return <Login onLogin={setUser} />;
  if (needsMfa)
    return <MfaGate user={user} onComplete={setUser} onLogout={logout} />;
  if (!data)
    return error ? (
      <div className="connection-state">
        <AlertCircle />
        <h2>{lang === "vi" ? "Mất kết nối máy chủ" : "Verbindung unterbrochen"}</h2>
        <p>{error}</p>
        <Press onClick={load}>{lang === "vi" ? "Thử lại" : "Erneut versuchen"}</Press>
        <button className="text-button" onClick={logout}>
          {lang === "vi" ? "Đăng xuất" : "Abmelden"}
        </button>
      </div>
    ) : (
      <Loading />
    );
  const selected = data.branches.find((b) => b.id === branchId);
  const kind = workspaceKind(data);
  const personal = kind === "employee" || kind === "kitchen";
  const activeBranch = data.branches.some(b => b.id === dutyBranch) ? dutyBranch : data.branches[0]?.id ?? "";
  const workspaceTitle = workspaceNames[kind][lang];
  const current = nav.find((n) => n.page === page)!;
  const allowed = !current.permission || has(current.permission);
  const date = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  return (
    <NoticeContext.Provider value={setToast}><div className={`app-shell workspace-shell workspace-${kind}`} data-screen={page}>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label={t("ui.close", "Navigation schließen")}
          onClick={() => setMobile(false)}
        />
      )}
      <aside id="workspace-navigation" className={`sidebar ${mobile ? "sidebar-open" : ""}`}
        onKeyDown={(event) => { if (event.key === "Escape") setMobile(false); }}>
        {mobile && <button className="drawer-close" onClick={() => setMobile(false)}
          aria-label={lang === "vi" ? "Đóng menu" : "Menü schließen"}><X size={18} /></button>}
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate("overview")}
        >
          <span className="brand-mark">
            a<span>.</span>
          </span>
          <div>
            atelier<span>{workspaceTitle}</span>
          </div>
        </a>
        <div className="admin-nav-groups">
          {navigationGroups.map((group) => {
            const items = nav.filter((item) =>
              group.pages.includes(item.page) && (!item.permission || has(item.permission))
            );
            const label = items.length === 1 && items[0].page === "security"
              ? (lang === "vi" ? "Tài khoản cá nhân" : "Mein Konto")
              : group[lang];
            return items.length > 0 && (
              <nav key={group.de} aria-label={label}>
                <div className="nav-caption">{label}</div>
                {items.map((item) => (
                  <NavItem key={item.page} item={item} page={page} navigate={navigate}
                    count={item.page === "branches" ? data.branches.length : undefined} />
                ))}
              </nav>
            );
          })}
        </div>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> {lang === "vi" ? "Trợ giúp & Hướng dẫn" : "Hilfe & Orientierung"}{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-profile">
            <span className="avatar avatar-mint">{initials(user.name)}</span>
            <div>
              <b>{user.name}</b>
              <small>{roleName(user.roles[0])}</small>
            </div>
            <button
              className="icon-button"
              aria-label={t("ui.logout", "Abmelden")}
              title={t("ui.logout", "Abmelden")}
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-controls="workspace-navigation"
              aria-expanded={mobile}
              aria-label={t("ui.open_nav", "Navigation öffnen")}
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>{workspaceTitle}</span>
            <ChevronRight size={13} />
            <b>{current.label}</b>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" aria-label={t("ui.search", "Suchen …")} onClick={() => setCommand(true)}>
              <Search size={16} />
              <span>{t("ui.search", "Suchen …")}</span>
              <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"}</kbd>
            </button>
            <span className="topbar-divider" />
            <LanguageSwitcher />
            <button
              className="icon-button"
              aria-label={dark ? (lang === "vi" ? "Giao diện sáng" : "Helles Design") : (lang === "vi" ? "Giao diện tối" : "Dunkles Design")}
              title={dark ? (lang === "vi" ? "Giao diện sáng" : "Helles Design") : (lang === "vi" ? "Giao diện tối" : "Dunkles Design")}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {has("audit.read") && <button
              className="icon-button notification-button"
              aria-label={t("ui.notifications", "Aktivitäten anzeigen")}
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
              {data.audit.length > 0 && <i />}
            </button>}
            <span className="avatar avatar-small avatar-peach">
              {initials(user.name)}
            </span>
          </div>
        </header>
        <main ref={content} className="main-content" id="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={17} />
              {error}
              <button onClick={load}>
                <RefreshCw size={14} /> {t("ui.reload", "Neu laden")}
              </button>
            </div>
          )}
          <div className="page-heading reveal">
            <div>
              <div className="admin-date"><CalendarDays size={14} />{date} · Berlin</div>
              <h1>{page === "overview"
                ? (kind === "admin" ? (lang === "vi" ? "Tổng quan quản trị" : "Verwaltungsübersicht") : workspaceTitle)
                : current.label}</h1>
              {page !== "overview" && <p>{t(`sub.${page}`, current.label)}</p>}
            </div>
            <div className="heading-actions">
              {page === "overview" && has("audit.read") && (
                <button
                  className="button button-secondary"
                  onClick={() => navigate("activity")}
                >
                  <FileClock size={16} /> {t("ui.activities", "Aktivitäten")}
                </button>
              )}
              {(["overview", "branches"] as Page[]).includes(page) &&
                has("org.write") && (
                  <Press onClick={() => setEditor({ kind: "branch" })}>
                    <Plus size={17} /> {t("btn.add_branch", "Niederlassung hinzufügen")}
                  </Press>
                )}
              {page === "entities" && has("org.write") && user.roles.includes("SYSTEM_ADMIN") && (
                <Press onClick={() => setEditor({ kind: "entity" })}>
                  <Plus size={17} /> {t("btn.add_entity", "Rechtseinheit hinzufügen")}
                </Press>
              )}
              {page === "access" && has("iam.write") && (
                <Press onClick={() => setEditor({ kind: "user" })}>
                  <Plus size={17} /> {t("btn.add_user", "Konto anlegen")}
                </Press>
              )}
              {page === "people" && has("assignment.write") && (
                <Press onClick={() => setEditor({ kind: "assignment" })}>
                  <ArrowLeftRight size={17} /> {t("btn.assign_team", "Neue Zuordnung")}
                </Press>
              )}
            </div>
          </div>
          {!allowed ? (
            <Empty
              title={lang === "vi" ? "Khu vực này được bảo vệ" : "Dieser Bereich ist geschützt"}
              text={lang === "vi" ? "Tài khoản của bạn không có quyền truy cập vào mục này." : "Ihr Konto hat keinen Zugriff auf diese Ansicht."}
            />
          ) : (
            <>
              {page === "overview" && <WorkspaceActions data={data} navigate={navigate} />}
              {page === "overview" && (personal || kind === "manager") && (
                <DutyHome data={data} branchId={activeBranch} onBranch={setDutyBranch} navigate={navigate}
                  openWeek={(day) => { navigate("scheduling"); setScheduleDay(day); }} />
              )}
              {page === "overview" && !personal && (
                <Overview
                  data={data}
                  navigate={navigate}
                  onBranch={setBranchId}
                  onEdit={(row) => setEditor({ kind: "branch", row })}
                />
              )}
              {page === "branches" && (
                <BranchList
                  data={data}
                  onBranch={setBranchId}
                  onEdit={(row) => setEditor({ kind: "branch", row })}
                />
              )}
              {page === "entities" && (
                <div className="panel reveal">
                  <div className="panel-heading">
                    <h2>
                      {lang === "vi" ? "Danh sách pháp nhân" : "Ihre Rechtseinheiten"}{" "}
                      <span className="count">{data.entities.length}</span>
                    </h2>
                    <span className="muted">Deutschland · EUR</span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{lang === "vi" ? "Pháp nhân" : "Rechtseinheit"}</th>
                          <th>{lang === "vi" ? "Số ĐKKD" : "Registrierung"}</th>
                          <th>{lang === "vi" ? "Chi nhánh" : "Niederlassungen"}</th>
                          <th>{lang === "vi" ? "Trạng thái" : "Status"}</th>
                          {has("org.write") && <th>{lang === "vi" ? "Thao tác" : "Aktionen"}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {data.entities.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <div className="table-identity">
                                <span className="entity-icon">
                                  <Globe2 size={20} />
                                </span>
                                <div>
                                  <b>{e.name}</b>
                                  <small>
                                    {e.code} · {e.address}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{e.registrationNumber}</td>
                            <td>
                              {
                                data.branches.filter(
                                  (b) => b.legalEntityId === e.id,
                                ).length
                              }{" "}
                              {lang === "vi" ? "chi nhánh" : "Standorte"}
                            </td>
                            <td>
                              <Status active={e.active} />
                            </td>
                            {has("org.write") && <td>
                              {(user.roles.includes("SYSTEM_ADMIN") || user.legalEntityIds.includes(e.id)) &&
                                <EditButton name={e.name} onClick={() => setEditor({ kind: "entity", row: e })} />}
                            </td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!data.entities.length && (
                    <Empty
                      title={lang === "vi" ? "Chưa có pháp nhân nào" : "Noch keine Rechtseinheiten"}
                      text={
                        lang === "vi"
                          ? "Vui lòng khởi tạo cấu trúc pháp lý trước tiên cho doanh nghiệp."
                          : "Legen Sie zuerst die juristische Struktur Ihrer Organisation an."
                      }
                    />
                  )}
                </div>
              )}
              {page === "workforce" && (
                <WorkforceView branches={data.branches} canEdit={has("workforce.write")} />
              )}
              {page === "scheduling" && (
                <SchedulingView branches={data.branches} canManage={has("schedule.write")} selfEmployeeId={data.selfEmployeeId}
                  selfPostings={data.selfPostings} selectedBranchId={activeBranch} setSelectedBranchId={setDutyBranch}
                  initialDay={scheduleDay} />
              )}
              {page === "attendance" && (
                <AttendanceView branches={data.branches} canManage={has("schedule.write")} selfEmployeeId={data.selfEmployeeId} />
              )}
              {page === "reconciliation" && (
                <ReconciliationView branches={data.branches} currentUserId={user?.id} selfEmployeeId={data.selfEmployeeId} />
              )}
              {page === "leave" && (
                <LeaveView canReview={has("schedule.write")} canRecord={has("workforce.write")} canRequest={data.selfEmployeeId != null} />
              )}
              {page === "allowances" && (
                <AllowancesView branches={data.branches} />
              )}
              {page === "people" && (
                <People
                  data={data}
                  onAssign={(employeeId) =>
                    setEditor({ kind: "assignment", employeeId })
                  }
                  onHistory={setHistory}
                  onEnd={(row) => setEditor({ kind: "end", row })}
                />
              )}
              {page === "access" && (
                <Accounts
                  data={data}
                  onEdit={(row) => setEditor({ kind: "user", row })}
                  onReset={async (row) => {
                    try {
                      const r = await api<{ url: string }>(
                        `/iam/users/${row.id}/reset-link`,
                        "POST",
                      );
                      setResetLink(r.url);
                      await load();
                    } catch (e) {
                      setToast((e as Error).message);
                    }
                  }}
                />
              )}
              {page === "security" && (
                <Security
                  user={user}
                  onUser={setUser}
                  notify={setToast}
                  data={data}
                  onLogout={() => {
                    setUser(null);
                    setData(null);
                  }}
                />
              )}
              {page === "activity" && (
                <div className="panel reveal">
                  <div className="panel-heading">
                    <h2>{lang === "vi" ? "Lịch sử hoạt động" : "Aktivitätsverlauf"}</h2>
                    <span className="muted">
                      {lang === "vi"
                        ? `${data.audit.length} sự kiện gần nhất trong phạm vi quyền hạn`
                        : `Letzte ${data.audit.length} Ereignisse im berechtigten Bereich`}
                    </span>
                  </div>
                  <Activity data={data} />
                </div>
              )}
            </>
          )}
          <footer className="content-footer">
            <span>
              <span className="status-dot" />{" "}
              {lang === "vi" ? "Đã kết nối với không gian làm việc" : "Mit Ihrem Arbeitsbereich verbunden"}
            </span>
            <span>
              Atelier · People & Places <i>/</i> Europe/Berlin
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <EditorModal
          editor={editor}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={async (message) => {
            setEditor(null);
            await load();
            setToast(message);
          }}
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => setBranchId(null)}
        title={selected?.name || (lang === "vi" ? "Chi nhánh" : "Niederlassung")}
        description={selected ? `${selected.code} · ${selected.city}` : ""}
        drawer
        wide
      >
        {selected && (
          <BranchDetails branch={selected} data={data} onEdit={setEditor} />
        )}
      </Modal>
      <Modal
        open={!!history}
        onClose={() => setHistory(null)}
        title={lang === "vi" ? "Lịch sử phân công" : "Zuordnungshistorie"}
        description={data.employees.find((e) => e.id === history)?.name}
      >
        <div className="modal-body history-list">
          {data.assignments
            .filter((a) => a.employeeId === history)
            .sort((a, b) => b.validFrom.localeCompare(a.validFrom))
            .map((a) => (
              <div className="history-item" key={a.id}>
                <MapPin size={18} />
                <div>
                  <b>{data.branches.find((b) => b.id === a.branchId)?.name}</b>
                  <p>
                    {dateDE(a.validFrom)} — {dateDE(a.validTo)}
                  </p>
                  <small>{a.reason}</small>
                  {a.addressSnapshot && (
                    <small>
                      {a.addressSnapshot} ·{" "}
                      {a.stateCode ? data.states[a.stateCode] : ""} ·{" "}
                      {a.timezone}
                    </small>
                  )}
                </div>
              </div>
            ))}
        </div>
      </Modal>
      <Modal
        open={command}
        onClose={() => setCommand(false)}
        title={lang === "vi" ? "Tìm nhanh (Quick Search)" : "Schnell finden"}
        description={
          lang === "vi"
            ? "Mục điều hướng và chi nhánh trong không gian làm việc"
            : "Ansichten und Niederlassungen in Ihrem Arbeitsbereich"
        }
      >
        <div className="modal-body">
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "vi" ? "Nhập tên mục hoặc chi nhánh …" : "Name oder Bereich eingeben …"}
            />
          </div>
          <div className="command-results">
            {nav
              .filter(
                (n) =>
                  (!n.permission || has(n.permission)) &&
                  n.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map((n) => (
                <button key={n.page} onClick={() => navigate(n.page)}>
                  <n.icon size={18} />
                  <span>{n.label}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            {data.branches
              .filter((b) =>
                `${b.name} ${b.city}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setCommand(false);
                    setBranchId(b.id);
                  }}
                >
                  <Building2 size={18} />
                  <span>
                    {b.name}
                    <small>{b.city}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </div>
        </div>
      </Modal>
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title={lang === "vi" ? "Cập nhật gần đây" : "Neu im Arbeitsbereich"}
        description={
          lang === "vi"
            ? "Các thay đổi mới nhất trong phạm vi quyền hạn của bạn"
            : "Letzte Änderungen in Ihrem berechtigten Bereich"
        }
      >
        <Activity data={data} limit={8} />
      </Modal>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title={lang === "vi" ? "Chào mừng đến với Atelier" : "Willkommen bei Atelier"}
        description={
          lang === "vi"
            ? "Không gian làm việc quản trị nhân sự và chuỗi chi nhánh nhà hàng"
            : "Ihr Arbeitsbereich für Menschen und Standorte"
        }
      >
        <div className="modal-body help-content">
          <div className="help-brand">a.</div>
          <h3>{lang === "vi" ? "Kết nối nhân sự, chuẩn hóa quy trình." : "Struktur, die Menschen verbindet."}</h3>
          <p>
            {lang === "vi"
              ? "Tại mục Chi nhánh, bạn quản lý chuỗi nhà hàng và các địa điểm làm việc thực tế. Mục Pháp nhân phản ánh cơ cấu tổ chức doanh nghiệp. Mục Nhân sự & Phân công theo dõi thời hạn hiệu lực của từng vị trí."
              : "Unter Niederlassungen verwalten Sie Restaurants und tatsächliche Arbeitsorte. Rechtseinheiten bilden Ihre Organisation ab. Team & Zuordnungen zeigt gültige Einsatzzeiträume."}
          </p>
          <p>
            {lang === "vi"
              ? "Mục Tài khoản & Phân quyền dành riêng cho Quản trị viên (RBAC). Mục Bảo mật tài khoản cho phép cài đặt xác thực 2 lớp (MFA) và kiểm tra các phiên đăng nhập."
              : "Konten & Rollen ist der Administration vorbehalten. Meine Sicherheit enthält Ihren Authenticator und aktive Sitzungen."}
          </p>
          <div className="note">
            <Command size={17} />
            <span>
              {lang === "vi"
                ? "Nhấn phím Ctrl + K hoặc ⌘ K để mở menu tìm kiếm nhanh mọi lúc."
                : "Mit Strg + K oder ⌘ K finden Sie Bereiche und Standorte."}
            </span>
          </div>
          <p className="muted">Deutsch · Euro · Europe/Berlin</p>
        </div>
      </Modal>
      <Modal
        open={!!resetLink}
        onClose={() => setResetLink("")}
        title={lang === "vi" ? "Liên kết một lần để đặt lại mật khẩu" : "Einmal-Link zur Wiederherstellung"}
        description={
          lang === "vi"
            ? "Môi trường phát triển · Có hiệu lực trong 30 phút · Chuyển an toàn cho người có thẩm quyền"
            : "Lokale Entwicklung · 30 Minuten gültig · sicher an die berechtigte Person übergeben"
        }
      >
        <div className="modal-body">
          <p>
            {lang === "vi"
              ? "Liên kết này cho phép thiết lập mật khẩu mới. Các phiên đăng nhập hiện tại sẽ bị vô hiệu sau đó. Xác thực 2 lớp (MFA) vẫn được bảo vệ."
              : "Dieser Link erlaubt das Setzen eines neuen Passworts. Bestehende Sitzungen werden danach ungültig. Der Authenticator bleibt geschützt."}
          </p>
          <div className="copy-box">
            <input readOnly value={resetLink} />
            <button
              className="icon-button"
              aria-label={lang === "vi" ? "Sao chép liên kết" : "Link kopieren"}
              onClick={() =>
                navigator.clipboard
                  .writeText(resetLink)
                  .then(() => setToast(lang === "vi" ? "Đã sao chép liên kết." : "Link kopiert."))
                  .catch(() => setToast(lang === "vi" ? "Vui lòng sao chép liên kết thủ công." : "Bitte den Link manuell kopieren."))
              }
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </Modal>
      <AnimatePresence>
        {toast && !editor && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={spring.toast}
          >
            <Info size={18} aria-hidden="true" />
            <span>{toast}</span>
            <button aria-label={lang === "vi" ? "Đóng thông báo" : "Meldung schließen"} onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div></NoticeContext.Provider>
  );
}
function NavItem({
  item,
  page,
  navigate,
  count,
}: {
  item: { page: Page; label: string; icon: LucideIcon; permission?: string };
  page: Page;
  navigate: (p: Page) => void;
  count?: number;
}) {
  return (
    <button
      className={`nav-item ${page === item.page ? "nav-active" : ""}`}
      onClick={() => navigate(item.page)}
      aria-current={page === item.page ? "page" : undefined}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
      {count !== undefined && (
        <small>{count}</small>
      )}
      {page === item.page && (
        <motion.i
          className="nav-indicator"
          layoutId="nav-indicator"
          transition={spring.selection}
        />
      )}
    </button>
  );
}
