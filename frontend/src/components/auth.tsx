import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  Fingerprint,
  Globe2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api, type User } from "../lib/api";
import { Press, Scene } from "./experience";
import { useI18n, LanguageSwitcher } from "../lib/i18n";

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const { lang } = useI18n();
  const reset = new URLSearchParams(location.search).get("reset");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (reset && password !== confirm) {
      setError(lang === "vi" ? "Mật khẩu xác nhận không khớp." : "Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      if (reset) {
        await api("/auth/reset", "POST", { token: reset, password });
        setDone(true);
      } else
        onLogin(await api<User>("/auth/login", "POST", { email, password }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "1.5rem" }}>
          <a href="/" className="brand" style={{ marginBottom: 0 }}>
            <span className="brand-mark">
              a<span>.</span>
            </span>
            <div>
              atelier<span>{lang === "vi" ? "NHÂN SỰ & CHI NHÁNH" : "PEOPLE & PLACES"}</span>
            </div>
          </a>
          <LanguageSwitcher />
        </div>
        <div className="auth-form">
          <div className="eyebrow">{lang === "vi" ? "HỆ THỐNG QUẢN TRỊ NHÂN SỰ & TIỀN LƯƠNG NHÀ HÀNG" : "EIN GUTER ORT FÜR IHR TEAM"}</div>
          <h1>
            {done ? (
              lang === "vi" ? "Khởi đầu mới." : "Ein neuer Anfang."
            ) : reset ? (
              lang === "vi" ? "Đặt lại mật khẩu." : "Passwort erneuern."
            ) : (
              <>
                {lang === "vi" ? "Chào mừng bạn" : "Schön, dass"}
                <br />
                {lang === "vi" ? "đã quay lại" : "Sie da sind"}<span>.</span>
              </>
            )}
          </h1>
          <p>
            {done
              ? (lang === "vi" ? "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại ngay." : "Ihr Passwort wurde aktualisiert. Sie können sich jetzt wieder anmelden.")
              : reset
                ? (lang === "vi" ? "Chọn một mật khẩu an toàn cho tài khoản của bạn." : "Wählen Sie ein sicheres Passwort für Ihr Konto.")
                : (lang === "vi" ? "Đăng nhập để quản lý lịch ca, nhân sự và chuỗi nhà hàng." : "Melden Sie sich an. Ihr Team und Ihre Standorte warten schon.")}
          </p>
          {done ? (
            <Press
              onClick={() => {
                location.href = "/";
              }}
            >
              {lang === "vi" ? "Đến trang đăng nhập" : "Zur Anmeldung"} <ArrowRight size={17} />
            </Press>
          ) : (
            <form onSubmit={submit}>
              {!reset && (
                <label className="field">
                  <span>{lang === "vi" ? "Email hoặc Tên tài khoản" : "E-Mail oder Benutzername"}</span>
                  <div className="input-with-icon">
                    <Mail size={17} />
                    <input
                      type="text"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={lang === "vi" ? "tobias.hoffmann hoặc email ..." : "tobias.hoffmann oder E-Mail ..."}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>
                </label>
              )}
              <label className="field">
                <span>{reset ? (lang === "vi" ? "Mật khẩu mới" : "Neues Passwort") : (lang === "vi" ? "Mật khẩu" : "Passwort")}</span>
                <div className="input-with-icon">
                  <LockKeyhole size={17} />
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      reset ? (lang === "vi" ? "Ít nhất 12 ký tự" : "Mindestens 12 Zeichen") : (lang === "vi" ? "Nhập mật khẩu" : "Ihr Passwort")
                    }
                    minLength={reset ? 12 : undefined}
                    maxLength={72}
                    autoComplete={reset ? "new-password" : "current-password"}
                    required
                  />
                </div>
              </label>
              {reset && (
                <label className="field">
                  <span>{lang === "vi" ? "Xác nhận mật khẩu" : "Passwort bestätigen"}</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={12}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}
              {!reset && (
                <div className="auth-form-note">
                  <ShieldCheck size={15} /> {lang === "vi" ? "Đăng nhập bảo mật với Authenticator" : "Geschützte Anmeldung mit Authenticator"}
                </div>
              )}
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
              <Press type="submit" disabled={busy}>
                {busy
                  ? (lang === "vi" ? "Đang xử lý …" : "Einen Moment …")
                  : reset
                    ? (lang === "vi" ? "Lưu mật khẩu" : "Passwort speichern")
                    : (lang === "vi" ? "Vào làm việc" : "Zum Arbeitsbereich")}
                <ArrowRight size={17} />
              </Press>
              {!reset && (
                <details className="recovery-help">
                  <summary>{lang === "vi" ? "Quên mật khẩu?" : "Passwort vergessen?"}</summary>
                  <p>
                    {lang === "vi"
                      ? "Quản trị viên có thể cung cấp liên kết khôi phục 1 lần. Vì lý do bảo mật, hệ thống không tiết lộ sự tồn tại của tài khoản."
                      : "Ihre Administration kann einen einmaligen Wiederherstellungslink bereitstellen. Aus Sicherheitsgründen geben wir keine Auskunft über bestehende E-Mail-Adressen."}
                  </p>
                </details>
              )}
              {import.meta.env.DEV && !reset && (
                <div className="demo-access">
                  <span>{lang === "vi" ? "Tài khoản mẫu từ MySQL (Bấm để điền):" : "MySQL Demo-Konten"}</span>
                  <div>
                    {[
                      ["tobias.hoffmann", lang === "vi" ? "QL Tobias" : "Tobias (Leitung)", "Password123!"],
                      ["lukas.schneider", lang === "vi" ? "Admin Lukas" : "Lukas (Admin/HR)", "Password123!"],
                      ["admin", lang === "vi" ? "Quản trị" : "Administration", "Password123!"],
                      ["anna.mueller", lang === "vi" ? "NV Anna" : "Anna (Mitarb.)", "Password123!"],
                    ].map(([acc, title, pwd]) => (
                      <button
                        type="button"
                        key={acc}
                        onClick={() => {
                          setEmail(acc);
                          setPassword(pwd);
                        }}
                      >
                        {title}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                  <small>
                    {lang === "vi"
                      ? "Các vai trò nhạy cảm (Admin, HR) sẽ thiết lập Authenticator TOTP trong lần đăng nhập đầu tiên."
                      : "Sensible Rollen richten bei der ersten Anmeldung einen Authenticator ein."}
                  </small>
                </div>
              )}
            </form>
          )}
        </div>
        <div className="auth-footer">
          <span>© {new Date().getFullYear()} Atelier</span>
          <span>
            <Globe2 size={14} /> {lang === "vi" ? "Tiếng Việt · Hệ thống Đức" : "Deutsch · Deutschland"}
          </span>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-art-caption">
          <span className="pill">{lang === "vi" ? "CON NGƯỜI LÀ TRỌNG TÂM" : "PEOPLE FIRST. ALWAYS."}</span>
          <span>01 / 02</span>
        </div>
        <Scene />
        <div className="auth-art-text">
          <h2>
            {lang === "vi" ? (
              <>
                Nhiều chi nhánh.
                <br />
                Chung một chuẩn mực.
              </>
            ) : (
              <>
                Viele Orte.
                <br />
                Ein gemeinsames Gefühl.
              </>
            )}
          </h2>
          <p>
            {lang === "vi" ? (
              <>
                Dành cho những con người mỗi ngày
                <br />
                tạo nên chất lượng dịch vụ ẩm thực xuất sắc.
              </>
            ) : (
              <>
                Für die Menschen, die jeden Tag
                <br />
                Gastfreundschaft möglich machen.
              </>
            )}
          </p>
        </div>
        <div className="auth-art-bottom">
          <span>
            <i /> {lang === "vi" ? "Con người là trung tâm" : "Menschen im Mittelpunkt"}
          </span>
          <span>{lang === "vi" ? "HỆ THỐNG NHÀ HÀNG ATELIER" : "ATELIER GASTRONOMIE"}</span>
        </div>
      </div>
    </div>
  );
}

export function MfaGate({
  user,
  onComplete,
  onLogout,
  embedded = false,
  initialSetup,
}: {
  user: User;
  onComplete: (u: User) => void;
  onLogout: () => void;
  embedded?: boolean;
  initialSetup?: { secret: string; uri: string };
}) {
  const { lang } = useI18n();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
    initialSetup || null,
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const enroll = !!initialSetup || !user.mfaEnabled;
  const start = async () => {
    setBusy(true);
    try {
      setSetup(await api("/auth/mfa/setup", "POST"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onComplete(await api<User>("/auth/mfa/verify", "POST", { code, enroll }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={embedded ? "mfa-embedded" : "mfa-page"}>
      <div className="mfa-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "1rem" }}>
          {!embedded && (
            <span className="brand-mark">
              a<span>.</span>
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>
            <LanguageSwitcher />
          </div>
        </div>
        <div className="mfa-symbol">
          <Fingerprint size={31} />
        </div>
        <div className="eyebrow">{lang === "vi" ? "BẢO MẬT NÂNG CAO" : "EIN ZUSÄTZLICHER SCHUTZ"}</div>
        <h1>{enroll ? (lang === "vi" ? "Tài khoản của bạn. Được bảo vệ an toàn." : "Ihr Konto. Gut geschützt.") : (lang === "vi" ? "Sắp hoàn tất." : "Fast geschafft.")}</h1>
        <p>
          {enroll
            ? (lang === "vi" ? "Để bảo mật quyền hạn, hệ thống yêu cầu xác thực 2 bước (MFA). Vui lòng thiết lập ứng dụng TOTP Authenticator." : "Für sensible Zugriffe ist eine Zwei-Faktor-Anmeldung erforderlich. Richten Sie einen TOTP-Authenticator ein.")
            : (lang === "vi" ? `Nhập mã xác thực 6 số hiện tại từ Authenticator cho ${user.email}.` : `Geben Sie den aktuellen 6-stelligen Code aus Ihrem Authenticator für ${user.email} ein.`)}
        </p>
        {enroll && !setup ? (
          <Press disabled={busy} onClick={start}>
            {lang === "vi" ? "Thiết lập Authenticator" : "Authenticator einrichten"} <ArrowRight size={16} />
          </Press>
        ) : (
          <form onSubmit={submit}>
            {setup && (
              <>
                <div className="setup-instruction">
                  <span>1</span>
                  <p>
                    {lang === "vi"
                      ? "Mở ứng dụng Google Authenticator trên điện thoại, thêm tài khoản và nhập khóa thủ công này:"
                      : "In Ihrer Authenticator-App ein Konto hinzufügen und diesen Schlüssel manuell eingeben."}
                  </p>
                </div>
                <div className="secret-code">
                  <code>{setup.secret}</code>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={lang === "vi" ? "Sao chép khóa" : "Schlüssel kopieren"}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(setup.secret)
                        .catch(() => {})
                    }
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="small muted">
                  {lang === "vi" ? `Tài khoản: ${user.email} · Time-based (TOTP), 6 chữ số` : `Konto: ${user.email} · Zeitbasiert (TOTP), 6 Stellen`}
                </p>
                <div className="setup-instruction">
                  <span>2</span>
                  <p>{lang === "vi" ? "Nhập mã 6 số hiển thị trong ứng dụng để xác nhận:" : "Bestätigen Sie den aktuellen Code aus Ihrer App."}</p>
                </div>
              </>
            )}
            <label className="field">
              <span>{lang === "vi" ? "Mã xác nhận 6 số" : "Bestätigungscode"}</span>
              <input
                autoFocus
                className="otp-input"
                name="otp"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                placeholder="000000"
                required
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Press type="submit" disabled={busy || code.length !== 6}>
              {busy ? (lang === "vi" ? "Đang kiểm tra …" : "Wird geprüft …") : (lang === "vi" ? "Đăng nhập an toàn" : "Sicher anmelden")}
              <ShieldCheck size={17} />
            </Press>
          </form>
        )}
        {error && !setup && enroll && <div className="form-error">{error}</div>}
        <button className="text-button" onClick={onLogout}>
          {embedded ? (lang === "vi" ? "Hủy bỏ" : "Abbrechen") : (lang === "vi" ? "Quay lại đăng nhập" : "Zurück zur Anmeldung")}
        </button>
        <small className="muted">
          {lang === "vi"
            ? "Mã khóa bí mật chỉ hiển thị khi thiết lập. Tuyệt đối không chia sẻ cho người khác."
            : "Der Schlüssel wird nur zur Einrichtung angezeigt. Teilen Sie ihn nicht."}
        </small>
      </div>
    </div>
  );
}
