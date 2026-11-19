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
  ChevronDown,
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
  Pencil,
  CircleHelp,
  ChevronRight,
  Command,
  RefreshCw,
  Sun,
  Moon,
  ArrowLeftRight,
  CheckCheck,
  AlertCircle,
  Calendar,
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
import { Empty, Loading, Modal, Press, Status } from "./components/experience";
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
import { EditorModal, type Editor } from "./components/editor";
import { I18nProvider, useI18n, LanguageSwitcher } from "./lib/i18n";
import "./App.css";
export type Page =
  | "overview"
  | "workforce"
  | "scheduling"
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
  const current = nav.find((n) => n.page === page)!;
  const allowed = !current.permission || has(current.permission);
  const date = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label={t("ui.close", "Navigation schließen")}
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate("overview")}
        >
          <span className="brand-mark">
            a<span>.</span>
          </span>
          <div>
            atelier<span>{lang === "vi" ? "NHÂN SỰ & CHI NHÁNH" : "PEOPLE & PLACES"}</span>
          </div>
        </a>
        <button className="workspace-selector" onClick={() => setHelp(true)}>
          <span className="workspace-icon">
            <Building2 size={17} />
          </span>
          <span>
            <b>Atelier Gastronomie</b>
            <small>{lang === "vi" ? "Hệ thống nhà hàng Đức" : "Deutschland Workspace"}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-caption">{t("nav.caption.workspace", "ARBEITSBEREICH")}</div>
        <nav>
          {nav
            .slice(0, 4)
            .filter((n) => !n.permission || has(n.permission))
            .map((n) => (
              <NavItem
                key={n.page}
                item={n}
                page={page}
                navigate={navigate}
                count={n.page === "branches" ? data.branches.length : undefined}
              />
            ))}
        </nav>
        <div className="nav-caption nav-caption-second">{t("nav.caption.admin", "VERWALTUNG")}</div>
        <nav>
          {nav
            .slice(4)
            .filter((n) => !n.permission || has(n.permission))
            .map((n) => (
              <NavItem key={n.page} item={n} page={page} navigate={navigate} />
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-small-icon">
              <ShieldCheck size={19} />
            </div>
            <b>{lang === "vi" ? "Môi trường bảo mật cho nhân sự." : "Ein guter Ort für Ihr Team."}</b>
            <p>{lang === "vi" ? "Phân quyền và chi nhánh luôn trong tầm kiểm soát." : "Zugriffe und Standorte sicher im Blick."}</p>
            <button onClick={() => navigate("security")}>
              {lang === "vi" ? "Xem bảo mật" : "Sicherheit ansehen"} <ArrowUpRight size={14} />
            </button>
          </div>
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
              aria-label={t("ui.open_nav", "Navigation öffnen")}
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>{t("nav.caption.workspace", "Arbeitsbereich")}</span>
            <ChevronRight size={13} />
            <b>{current.label}</b>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setCommand(true)}>
              <Search size={16} />
              <span>{t("ui.search", "Suchen …")}</span>
              <kbd>⌘ K</kbd>
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
            <button
              className="icon-button notification-button"
              aria-label={t("ui.notifications", "Aktivitäten anzeigen")}
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
              {data.audit.length > 0 && <i />}
            </button>
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
              <div className="eyebrow">
                ATELIER WORKSPACE <span /> {date}
              </div>
              <h1>
                {page === "overview"
                  ? `${lang === "vi" ? "Xin chào" : "Guten Tag"}, ${user.name.split(" ")[0]}.`
                  : current.label}
                <span className="title-dot">
                  {page === "overview" ? " ✳" : ""}
                </span>
              </h1>
              <p>
                {t(`sub.${page}`, {
                  overview: "Alles, was Ihr Team verbindet. An einem Ort.",
                  workforce:
                    "Mitarbeiterakten, Vertragsverlauf, Entgeltstufen und Schutzbedingungen verwalten.",
                  scheduling:
                    "Schichtvorlagen erstellen, Einsätze planen, ArbZG-Regeln prüfen und Dienstpläne veröffentlichen.",
                  branches:
                    "Ihre Restaurants. Ihre Orte. Ein gemeinsames Zuhause.",
                  entities: "Eine klare Struktur für Ihre Organisation.",
                  people: "Menschen verbinden. Einsätze richtig zuordnen.",
                  access:
                    "Die richtigen Zugriffe für die richtigen Menschen.",
                  security: "Ihr Konto. Ihre Geräte. Ihre Sicherheit.",
                  activity: "Jede wichtige Änderung bleibt nachvollziehbar.",
                }[page])}
              </p>
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
              {page === "entities" && has("iam.write") && (
                <Press onClick={() => setEditor({ kind: "entity" })}>
                  <Plus size={17} /> {t("btn.add_entity", "Rechtseinheit hinzufügen")}
                </Press>
              )}
              {page === "access" && (
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
              {page === "overview" && (
                <Overview
                  data={data}
                  navigate={navigate}
                  onBranch={setBranchId}
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
                          <th />
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
                            <td>
                              {has("org.write") && (
                                <button
                                  className="icon-button"
                                  aria-label={`${e.name} bearbeiten`}
                                  onClick={() =>
                                    setEditor({ kind: "entity", row: e })
                                  }
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                            </td>
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
                <WorkforceView branches={data.branches} />
              )}
              {page === "scheduling" && (
                <SchedulingView branches={data.branches} />
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
          onSaved={async () => {
            setEditor(null);
            await load();
            setToast(lang === "vi" ? "Đã lưu thay đổi thành công." : "Änderungen erfolgreich gespeichert.");
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
        title="Einmal-Link zur Wiederherstellung"
        description="Lokale Entwicklung · 30 Minuten gültig · sicher an die berechtigte Person übergeben"
      >
        <div className="modal-body">
          <p>
            Dieser Link erlaubt das Setzen eines neuen Passworts. Bestehende
            Sitzungen werden danach ungültig. Der Authenticator bleibt
            geschützt.
          </p>
          <div className="copy-box">
            <input readOnly value={resetLink} />
            <button
              className="icon-button"
              aria-label="Link kopieren"
              onClick={() =>
                navigator.clipboard
                  .writeText(resetLink)
                  .then(() => setToast("Link kopiert."))
                  .catch(() => setToast("Bitte den Link manuell kopieren."))
              }
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </Modal>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={spring.toast}
          >
            <CheckCheck size={18} />
            <span>{toast}</span>
            <button aria-label="Meldung schließen" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        <small>{count.toString().padStart(2, "0")}</small>
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
