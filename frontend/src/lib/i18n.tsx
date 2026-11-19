import { createContext, useContext, useState, type ReactNode } from "react";
import { Globe2 } from "lucide-react";
import type { Role } from "./api";

export type Language = "de" | "vi";

export const translations = {
  // Navigation
  "nav.overview": { de: "Übersicht", vi: "Tổng quan" },
  "nav.branches": { de: "Niederlassungen", vi: "Chi nhánh" },
  "nav.entities": { de: "Rechtseinheiten", vi: "Pháp nhân" },
  "nav.people": { de: "Team & Zuordnungen", vi: "Nhân sự & Phân công" },
  "nav.access": { de: "Konten & Rollen", vi: "Tài khoản & Phân quyền" },
  "nav.security": { de: "Meine Sicherheit", vi: "Bảo mật tài khoản" },
  "nav.activity": { de: "Aktivitätsprotokoll", vi: "Nhật ký hoạt động" },
  "nav.caption.workspace": { de: "ARBEITSBEREICH", vi: "KHÔNG GIAN LÀM VIỆC" },
  "nav.caption.admin": { de: "VERWALTUNG", vi: "QUẢN TRỊ HỆ THỐNG" },

  // Subtitles
  "sub.overview": { de: "Alles, was Ihr Team verbindet. An einem Ort.", vi: "Tổng quan toàn bộ hệ thống chi nhánh, pháp nhân và nhân sự." },
  "sub.branches": { de: "Ihre Restaurants. Ihre Orte. Ein gemeinsames Zuhause.", vi: "Quản lý chuỗi nhà hàng, địa điểm làm việc và cấu hình vùng bang." },
  "sub.entities": { de: "Eine klare Struktur für Ihre Organisation.", vi: "Cơ cấu các pháp nhân doanh nghiệp và thông tin đăng ký." },
  "sub.people": { de: "Menschen verbinden. Einsätze richtig zuordnen.", vi: "Phân công nhân sự theo chi nhánh, ca kíp và điều chuyển tạm thời." },
  "sub.access": { de: "Die richtigen Zugriffe für die richtigen Menschen.", vi: "Phân quyền theo vai trò (RBAC) và phạm vi dữ liệu chi nhánh." },
  "sub.security": { de: "Ihr Konto. Ihre Geräte. Ihre Sicherheit.", vi: "Quản lý thiết bị xác thực 2 bước (MFA) và các phiên đăng nhập." },
  "sub.activity": { de: "Jede wichtige Änderung bleibt nachvollziehbar.", vi: "Kiểm toán (Audit Log) mọi thao tác và lịch sử thay đổi." },

  // Common UI
  "ui.search": { de: "Suchen …", vi: "Tìm kiếm …" },
  "ui.reload": { de: "Neu laden", vi: "Tải lại" },
  "ui.active": { de: "Aktiv", vi: "Đang hoạt động" },
  "ui.inactive": { de: "Inaktiv", vi: "Ngừng hoạt động" },
  "ui.save": { de: "Änderungen speichern", vi: "Lưu thay đổi" },
  "ui.cancel": { de: "Abbrechen", vi: "Hủy bỏ" },
  "ui.close": { de: "Schließen", vi: "Đóng" },
  "ui.edit": { de: "Bearbeiten", vi: "Chỉnh sửa" },
  "ui.delete": { de: "Löschen", vi: "Xóa" },
  "ui.back": { de: "Zurück", vi: "Quay lại" },
  "ui.unlimited": { de: "Unbefristet", vi: "Vô thời hạn" },
  "ui.details": { de: "Details", vi: "Chi tiết" },
  "ui.actions": { de: "Aktionen", vi: "Thao tác" },
  "ui.saving": { de: "Wird gespeichert …", vi: "Đang lưu …" },
  "ui.logout": { de: "Abmelden", vi: "Đăng xuất" },
  "ui.activities": { de: "Aktivitäten", vi: "Hoạt động" },
  "ui.quick_actions": { de: "Schnellaktionen", vi: "Thao tác nhanh" },
  "ui.help": { de: "Hilfe", vi: "Trợ giúp" },
  "ui.notifications": { de: "Benachrichtigungen", vi: "Thông báo" },
  "ui.filter_all": { de: "Alle", vi: "Tất cả" },
  "ui.view_all": { de: "Alle anzeigen", vi: "Xem tất cả" },

  // Overview Stats
  "stat.branches": { de: "Niederlassungen", vi: "Chi nhánh nhà hàng" },
  "stat.branches_note": { de: "Standorte insgesamt", vi: "tổng số chi nhánh" },
  "stat.members": { de: "Teammitglieder", vi: "Nhân sự" },
  "stat.members_note": { de: "aktuell zugeordnet", vi: "đang được phân công" },
  "stat.entities": { de: "Rechtseinheiten", vi: "Pháp nhân" },
  "stat.entities_note": { de: "Eine gemeinsame Struktur", vi: "Cơ cấu tổ chức chung" },
  "stat.locations": { de: "Arbeitsorte", vi: "Địa điểm làm việc" },
  "stat.locations_note": { de: "Standortgenau organisiert", vi: "Theo từng địa điểm thực tế" },

  // Buttons
  "btn.add_branch": { de: "Niederlassung hinzufügen", vi: "Thêm chi nhánh" },
  "btn.add_entity": { de: "Rechtseinheit hinzufügen", vi: "Thêm pháp nhân" },
  "btn.add_user": { de: "Konto anlegen", vi: "Tạo tài khoản" },
  "btn.assign_team": { de: "Einsatz zuordnen", vi: "Phân công nhân viên" },
  "btn.assign_manager": { de: "Leitung zuordnen", vi: "Phân công quản lý" },
  "btn.add_location": { de: "Arbeitsort hinzufügen", vi: "Thêm địa điểm" },

  // Auth & Login
  "auth.tagline": { de: "EIN GUTER ORT FÜR IHR TEAM", vi: "HỆ THỐNG QUẢN TRỊ NHÂN SỰ & TIỀN LƯƠNG NHÀ HÀNG" },
  "auth.welcome": { de: "Schön, dass Sie da sind.", vi: "Chào mừng bạn trở lại." },
  "auth.desc": { de: "Melden Sie sich an. Ihr Team und Ihre Standorte warten schon.", vi: "Đăng nhập để quản lý lịch ca, nhân sự và chuỗi nhà hàng." },
  "auth.email": { de: "E-Mail-Adresse", vi: "Địa chỉ Email" },
  "auth.password": { de: "Passwort", vi: "Mật khẩu" },
  "auth.login_btn": { de: "Anmelden", vi: "Đăng nhập" },
  "auth.logging_in": { de: "Anmeldung läuft …", vi: "Đang đăng nhập …" },
  "auth.demo_hint": { de: "Demo-Zugänge verfügbar: admin@atelier.local, hr@atelier.local, manager@atelier.local, employee@atelier.local (Passwort: Atelier!2026Demo)", vi: "Tài khoản demo: admin@atelier.local, hr@atelier.local, manager@atelier.local, employee@atelier.local (Mật khẩu: Atelier!2026Demo)" },
  
  // MFA Gate
  "mfa.title": { de: "Zwei-Faktor-Authentifizierung", vi: "Xác thực 2 yếu tố (TOTP)" },
  "mfa.setup_title": { de: "Zwei-Faktor-Schutz einrichten", vi: "Thiết lập bảo vệ 2 yếu tố (TOTP)" },
  "mfa.desc": { de: "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.", vi: "Nhập mã xác thực 6 chữ số từ ứng dụng Authenticator của bạn." },
  "mfa.setup_desc": { de: "Fügen Sie den Schlüssel zu Ihrer Authenticator-App hinzu (Time-based, 6 Ziffern, SHA1, 30 Sekunden).", vi: "Thêm khóa bí mật vào ứng dụng Authenticator (Time-based, 6 chữ số, SHA1, 30 giây)." },
  "mfa.code_label": { de: "6-stelliger Sicherheitscode", vi: "Mã bảo mật 6 số" },
  "mfa.confirm_btn": { de: "Code bestätigen", vi: "Xác nhận mã" },
  "mfa.cancel": { de: "Abmelden und abbrechen", vi: "Hủy và đăng xuất" },

  // Forms / Editor
  "editor.branch_new": { de: "Neue Niederlassung", vi: "Thêm chi nhánh mới" },
  "editor.branch_edit": { de: "Niederlassung bearbeiten", vi: "Chỉnh sửa chi nhánh" },
  "editor.entity_new": { de: "Neue Rechtseinheit", vi: "Thêm pháp nhân mới" },
  "editor.entity_edit": { de: "Rechtseinheit bearbeiten", vi: "Chỉnh sửa pháp nhân" },
  "editor.location_new": { de: "Neuer Arbeitsort", vi: "Thêm địa điểm làm việc mới" },
  "editor.location_edit": { de: "Arbeitsort bearbeiten", vi: "Chỉnh sửa địa điểm làm việc" },
  "editor.user_new": { de: "Neues Konto", vi: "Tạo tài khoản mới" },
  "editor.user_edit": { de: "Konto bearbeiten", vi: "Chỉnh sửa tài khoản" },
  "editor.manager_assign": { de: "Restaurantleitung zuordnen", vi: "Phân công quản lý chi nhánh" },
  "editor.team_assign": { de: "Neue Teamzuordnung", vi: "Phân công nhân sự mới" },
  "editor.period_end": { de: "Zeitraum beenden", vi: "Kết thúc phân công" },

  "form.branch_name": { de: "Name der Niederlassung", vi: "Tên chi nhánh" },
  "form.branch_code": { de: "Standortcode", vi: "Mã chi nhánh" },
  "form.city": { de: "Stadt", vi: "Thành phố" },
  "form.legal_entity": { de: "Rechtseinheit", vi: "Pháp nhân sở hữu" },
  "form.address": { de: "Vollständige Adresse", vi: "Địa chỉ chi tiết" },
  "form.state": { de: "Bundesland", vi: "Vùng bang (Đức)" },
  "form.timezone": { de: "Zeitzone", vi: "Múi giờ" },
  "form.color_accent": { de: "Farbakzent", vi: "Màu đại diện" },
  "form.active_status": { de: "Niederlassung ist aktiv und für den Betrieb freigegeben", vi: "Chi nhánh đang hoạt động và sẵn sàng vận hành" },
  "form.user_name": { de: "Vollständiger Name", vi: "Họ và tên" },
  "form.roles": { de: "Rollen und Berechtigungen", vi: "Vai trò và phân quyền" },
  "form.branches_scope": { de: "Zugewiesene Niederlassungen", vi: "Phạm vi chi nhánh được phụ trách" },
  "form.entities_scope": { de: "Zugewiesene Rechtseinheiten", vi: "Phạm vi pháp nhân được phụ trách" },
  "form.valid_from": { de: "Gültig ab", vi: "Hiệu lực từ ngày" },
  "form.valid_to": { de: "Gültig bis (optional)", vi: "Hiệu lực đến ngày (tùy chọn)" },
  "form.reason": { de: "Grund / Notiz", vi: "Lý do / Ghi chú" },
  "form.employee": { de: "Mitarbeitende Person", vi: "Nhân viên" },
  "form.manager": { de: "Führungskraft", vi: "Quản lý" },
  "form.location": { de: "Arbeitsort", vi: "Địa điểm làm việc" },
  "form.assignment_type": { de: "Art des Einsatzes", vi: "Hình thức phân công" },
  "form.home_assignment": { de: "Stammbetrieb (HOME)", vi: "Chi nhánh chính (HOME)" },
  "form.temp_assignment": { de: "Temporäre Ausleihe (TEMPORARY)", vi: "Điều chuyển tạm thời (TEMPORARY)" },

  // F02: Workforce & Contracts
  "nav.workforce": { de: "Personal & Verträge", vi: "Hồ sơ & Hợp đồng" },
  "sub.workforce": { de: "Mitarbeiterakten, Vertragsverlauf, Entgeltstufen und gesetzliche Schutzbedingungen verwalten.", vi: "Quản lý hồ sơ nhân viên, timeline hợp đồng, mức lương và điều kiện bảo vệ." },
  "wf.add_employee": { de: "Mitarbeiter anlegen", vi: "Thêm nhân viên" },
  "wf.import_csv": { de: "CSV-Import", vi: "Nhập tệp CSV" },
  "wf.total_employees": { de: "Gesamtbelegschaft", vi: "Tổng nhân sự" },
  "wf.active_employees": { de: "Aktiv beschäftigt", vi: "Đang làm việc" },
  "wf.minijob_count": { de: "Minijobber (≤538€)", vi: "Lao động Minijob" },
  "wf.protected_count": { de: "Besondere Schutzfälle", vi: "Điều kiện bảo vệ đặc biệt" },
  "wf.emp_code": { de: "Personalnummer", vi: "Mã nhân viên" },
  "wf.name": { de: "Name", vi: "Họ và tên" },
  "wf.position": { de: "Position", vi: "Vị trí chuyên môn" },
  "wf.branch": { de: "Stammniederlassung", vi: "Chi nhánh chính" },
  "wf.contract": { de: "Vertragsart", vi: "Hợp đồng" },
  "wf.wage": { de: "Vergütung", vi: "Mức lương" },
  "wf.status": { de: "Status", vi: "Trạng thái" },
  "wf.restrictions": { de: "Schutzregeln", vi: "Ràng buộc bảo vệ" },
  "wf.tab_profile": { de: "Stammdaten", vi: "Thông tin cá nhân" },
  "wf.tab_contracts": { de: "Vertragsverlauf", vi: "Lịch sử hợp đồng" },
  "wf.tab_wages": { de: "Entgeltstufen", vi: "Lịch sử lương" },
  "wf.tab_restrictions": { de: "Schutzbedingungen", vi: "Điều kiện bảo vệ (JArbSchG/MuSchG)" },
  "wf.milog_notice": { de: "Gesetzlicher Mindestlohn 2024: mindestens 12,41 €/Stunde.", vi: "Mức lương tối thiểu của Đức (MiLoG 2024): tối thiểu 12,41 €/giờ." },
  "wf.minijob_notice": { de: "Minijob-Grenze: maximal 538,00 €/Monat.", vi: "Trần Minijob: tối đa 538,00 €/tháng." },
  "wf.add_contract_btn": { de: "Neuer Vertrag / Verlängerung", vi: "Thêm hợp đồng mới / Gia hạn" },
  "wf.add_wage_btn": { de: "Neue Entgeltstufe", vi: "Thêm mức lương mới" },
  "wf.add_restr_btn": { de: "Schutzbedingung erfassen", vi: "Ghi nhận điều kiện bảo vệ" },

  // F03: Scheduling & Shift Planning
  "nav.scheduling": { de: "Schichtplanung", vi: "Lịch ca làm việc" },
  "sub.scheduling": { de: "Schichtvorlagen erstellen, Einsätze planen, deutsches Arbeitszeitgesetz (ArbZG) prüfen und Dienstpläne veröffentlichen.", vi: "Tạo mẫu ca, xếp lịch tuần, kiểm tra luật lao động Đức (ArbZG) và công bố lịch làm việc." },
  "sched.week": { de: "Woche", vi: "Tuần" },
  "sched.prev_week": { de: "Vorherige Woche", vi: "Tuần trước" },
  "sched.next_week": { de: "Nächste Woche", vi: "Tuần sau" },
  "sched.today": { de: "Heute", vi: "Hôm nay" },
  "sched.publish": { de: "Dienstplan veröffentlichen", vi: "Công bố lịch làm việc" },
  "sched.add_shift": { de: "Schicht anlegen", vi: "Thêm ca trực" },
  "sched.templates": { de: "Schichtvorlagen", vi: "Mẫu ca" },
  "sched.swaps": { de: "Schichttreuhänder & Tausch", vi: "Đổi ca & Sàn ca trống" },
  "sched.check_title": { de: "Arbeitszeitgesetz-Prüfung (ArbZG / JArbSchG / MuSchG)", vi: "Kiểm tra tuân thủ Luật Lao động Đức" },
  "sched.blocker_title": { de: "Zwingende Rechtsverstöße (Blocker)", vi: "Vi phạm luật lao động bắt buộc (Blocker)" },
  "sched.warning_title": { de: "Betriebliche Hinweise & Ausgleichspflichten (Warnungen)", vi: "Cảnh báo & Nghĩa vụ nghỉ bù (Warnings)" },
  "sched.ruhezeit_11h": { de: "Ruhezeit (§ 5 ArbZG): Mindestens 11 Stunden ununterbrochene Ruhezeit zwischen zwei Schichten.", vi: "Thời gian nghỉ giữa ca (§ 5 ArbZG): Tối thiểu 11 giờ nghỉ liên tục giữa 2 ca." },
  "sched.hoechst_10h": { de: "Höchstarbeitszeit (§ 3 ArbZG): Maximal 10 Stunden tägliche Arbeitszeit.", vi: "Thời giờ làm việc tối đa (§ 3 ArbZG): Tối đa 10 giờ làm việc mỗi ngày." },
  "sched.pausen_regeln": { de: "Ruhepausen (§ 4 ArbZG): 30 Min. ab 6 Std., 45 Min. ab 9 Std. Arbeitszeit.", vi: "Nghỉ giải lao (§ 4 ArbZG): 30 phút khi làm từ 6h, 45 phút khi làm từ 9h." },
  "sched.ersatzruhetag": { de: "Ersatzruhetag (§ 11 ArbZG): Sonntags-/Feiertagsarbeit erfordert Ersatzruhetag.", vi: "Nghỉ bù (§ 11 ArbZG): Bắt buộc bố trí ngày nghỉ bù khi làm việc vào Chủ nhật / Ngày lễ." },
  "sched.jarbschg_title": { de: "Jugendarbeitsschutz (JArbSchG): Max. 8h/Tag, Nachtruhe ab 22 Uhr, 12h Ruhezeit.", vi: "Bảo vệ vị thành niên (JArbSchG): Tối đa 8h/ngày, cấm làm sau 22h, nghỉ 12h giữa ca." },
  "sched.muschg_title": { de: "Mutterschutz (MuSchG): Keine Nachtarbeit 20-6 Uhr, keine Mehrarbeit.", vi: "Bảo vệ thai sản (MuSchG): Cấm làm đêm 20h - 6h, cấm làm thêm giờ." },
  "sched.swap_request": { de: "Schichttausch anfragen", vi: "Gửi yêu cầu đổi ca" },
  "sched.swap_approve": { de: "Tausch genehmigen", vi: "Phê duyệt đổi ca" },
  "sched.swap_reject": { de: "Tausch ablehnen", vi: "Từ chối đổi ca" },
  "sched.open_shifts": { de: "Offene Schichten", vi: "Ca làm việc còn trống" },
  "sched.shift_details": { de: "Schichtdetails", vi: "Chi tiết ca làm việc" },
  "sched.reason_change": { de: "Änderungsgrund für Veröffentlichung", vi: "Lý do thay đổi khi công bố lại lịch" },
};

export const roleTranslations: Record<Role, { de: string; vi: string }> = {
  SYSTEM_ADMIN: { de: "Systemadministration", vi: "Quản trị hệ thống" },
  HR_OFFICER: { de: "Personalverwaltung", vi: "Quản lý nhân sự" },
  RESTAURANT_MANAGER: { de: "Restaurantleitung", vi: "Quản lý nhà hàng" },
  EMPLOYEE: { de: "Mitarbeitende", vi: "Nhân viên" },
  PAYROLL_OFFICER: { de: "Entgeltabrechnung", vi: "Kế toán tiền lương" },
  FINANCE_APPROVER: { de: "Finanzfreigabe", vi: "Duyệt chi tài chính" },
  AUDITOR: { de: "Revision", vi: "Kiểm toán" },
  DPO: { de: "Datenschutz", vi: "Bảo mật dữ liệu (DPO)" },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, deFallback?: string) => string;
  roleName: (role: Role) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "de",
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, deFallback?: string) => deFallback || key,
  roleName: (role: Role) => roleTranslations[role]?.de || role,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("atelier_language");
      return saved === "vi" ? "vi" : "de";
    } catch {
      return "de";
    }
  });

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem("atelier_language", next);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === "de" ? "vi" : "de");
  };

  const t = (key: string, deFallback?: string): string => {
    const entry = (translations as Record<string, { de: string; vi: string }>)[key];
    if (entry) {
      return lang === "vi" ? entry.vi : entry.de;
    }
    return deFallback || key;
  };

  const roleName = (role: Role): string => {
    const entry = roleTranslations[role];
    if (!entry) return role;
    return lang === "vi" ? entry.vi : entry.de;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, roleName }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      type="button"
      className={`locale-button flex items-center gap-1.5 font-medium transition-colors ${className}`}
      onClick={toggleLang}
      title={lang === "de" ? "Chuyển sang Tiếng Việt" : "Zu Deutsch wechseln"}
      aria-label="Sprache wechseln / Chuyển ngôn ngữ"
    >
      <Globe2 size={15} />
      <span>{lang === "de" ? "🇩🇪 DE" : "🇻🇳 VI"}</span>
    </button>
  );
}
