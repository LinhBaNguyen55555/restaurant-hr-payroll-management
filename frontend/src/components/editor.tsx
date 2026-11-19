import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Check, Clock3, MapPin, ShieldCheck } from "lucide-react";
import {
  api,
  roleLabels,
  today,
  type Account,
  type Assignment,
  type Branch,
  type LegalEntity,
  type ManagerAssignment,
  type Role,
  type WorkLocation,
  type Workspace,
} from "../lib/api";
import { Modal, Press } from "./experience";
import { useI18n } from "../lib/i18n";

const deToViLabels: Record<string, string> = {
  "Name der Niederlassung": "Tên chi nhánh",
  "Standortcode": "Mã chi nhánh",
  "Stadt": "Thành phố",
  "Rechtseinheit": "Pháp nhân sở hữu",
  "Vollständige Adresse": "Địa chỉ chi tiết",
  "Bundesland": "Vùng bang (Đức)",
  "Firmenname": "Tên pháp nhân",
  "Unternehmenscode": "Mã doanh nghiệp",
  "Handelsregisternummer": "Số đăng ký kinh doanh (HRB)",
  "Geschäftsanschrift": "Địa chỉ trụ sở",
  "Bezeichnung des Arbeitsorts": "Tên địa điểm làm việc",
  "Adresse": "Địa chỉ",
  "Vollständiger Name": "Họ và tên",
  "E-Mail-Adresse": "Địa chỉ Email",
  "Initiales Passwort": "Mật khẩu ban đầu",
  "Führungskraft": "Quản lý phụ trách",
  "Gültig ab": "Hiệu lực từ ngày",
  "Gültig bis": "Hiệu lực đến ngày",
  "Gültig bis (optional)": "Hiệu lực đến ngày (tùy chọn)",
  "Mitarbeitende Person": "Nhân viên",
  "Niederlassung": "Chi nhánh",
  "Arbeitsort vor Ort": "Địa điểm làm việc cụ thể",
  "Art des Einsatzes": "Hình thức phân công",
  "Grund / Anlass": "Lý do / Căn cứ",
  "Letzter gültiger Tag": "Ngày hiệu lực cuối cùng",
};

export type Editor =
  | { kind: "branch"; row?: Branch }
  | { kind: "entity"; row?: LegalEntity }
  | { kind: "location"; row?: WorkLocation; branch: Branch }
  | { kind: "user"; row?: Account }
  | { kind: "manager"; branch: Branch }
  | { kind: "assignment"; employeeId?: string }
  | { kind: "end"; row: Assignment | ManagerAssignment; manager?: boolean };
export function EditorModal({
  editor,
  data,
  onClose,
  onSaved,
}: {
  editor: Editor;
  data: Workspace;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { lang, roleName } = useI18n();
  const row = "row" in editor ? editor.row : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState(
    editor.kind === "assignment"
      ? data.branches.find((b) => b.active)?.id || ""
      : "",
  );
  const title: Record<Editor["kind"], string> = {
    branch: row
      ? (lang === "vi" ? "Chỉnh sửa chi nhánh" : "Niederlassung bearbeiten")
      : (lang === "vi" ? "Thêm chi nhánh mới" : "Neue Niederlassung"),
    entity: row
      ? (lang === "vi" ? "Chỉnh sửa pháp nhân" : "Rechtseinheit bearbeiten")
      : (lang === "vi" ? "Thêm pháp nhân mới" : "Neue Rechtseinheit"),
    location: row
      ? (lang === "vi" ? "Chỉnh sửa địa điểm làm việc" : "Arbeitsort bearbeiten")
      : (lang === "vi" ? "Thêm địa điểm làm việc mới" : "Neuer Arbeitsort"),
    user: row
      ? (lang === "vi" ? "Chỉnh sửa tài khoản" : "Konto bearbeiten")
      : (lang === "vi" ? "Tạo tài khoản mới" : "Neues Konto"),
    manager: lang === "vi" ? "Phân công quản lý chi nhánh" : "Restaurantleitung zuordnen",
    assignment: lang === "vi" ? "Phân công nhân sự mới" : "Neue Teamzuordnung",
    end: lang === "vi" ? "Kết thúc phân công" : "Zeitraum beenden",
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (key: string) => String(f.get(key) || "");
    const active = f.get("active") === "on";
    setBusy(true);
    setError("");
    let path = "";
    let payload: object = {};
    let method = row ? "PUT" : "POST";
    if (editor.kind === "branch") {
      path = `/org/branches${row ? `/${row.id}` : ""}`;
      payload = {
        code: val("code").toUpperCase(),
        name: val("name"),
        legalEntityId: val("legalEntityId"),
        city: val("city"),
        address: val("address"),
        stateCode: val("stateCode"),
        timezone: "Europe/Berlin",
        active,
        version: row?.version || 0,
      };
    }
    if (editor.kind === "entity") {
      path = `/org/entities${row ? `/${row.id}` : ""}`;
      payload = {
        code: val("code").toUpperCase(),
        name: val("name"),
        registrationNumber: val("registrationNumber"),
        address: val("address"),
        active,
        version: row?.version || 0,
      };
    }
    if (editor.kind === "location") {
      path = `/org/locations${row ? `/${row.id}` : ""}`;
      payload = {
        branchId: editor.branch.id,
        name: val("name"),
        address: val("address"),
        stateCode: val("stateCode"),
        timezone: "Europe/Berlin",
        active,
        version: row?.version || 0,
      };
    }
    if (editor.kind === "user") {
      path = `/iam/users${row ? `/${row.id}` : ""}`;
      payload = {
        name: val("name"),
        email: val("email"),
        roles: f.getAll("roles"),
        legalEntityIds: f.getAll("legalEntityIds"),
        branchIds: f.getAll("branchIds"),
        ...(!row ? { password: val("password") } : {}),
        active,
        version: row?.version || 0,
      };
    }
    if (editor.kind === "manager") {
      path = "/org/managers";
      method = "POST";
      payload = {
        managerId: val("managerId"),
        branchId: editor.branch.id,
        validFrom: val("validFrom"),
        validTo: val("validTo") || null,
      };
    }
    if (editor.kind === "assignment") {
      path = "/org/assignments";
      method = "POST";
      payload = {
        employeeId: val("employeeId"),
        branchId: val("branchId"),
        workLocationId: val("workLocationId"),
        validFrom: val("validFrom"),
        validTo: val("validTo") || null,
        kind: val("kind"),
        reason: val("reason"),
      };
    }
    if (editor.kind === "end") {
      path = `/org/${editor.manager ? "managers" : "assignments"}/${editor.row.id}/end`;
      method = "PUT";
      payload = { validTo: val("validTo"), version: editor.row.version };
    }
    try {
      await api(path, method, payload);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const input = (
    label: string,
    name: string,
    value = "",
    extra: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="field">
      <span>{lang === "vi" ? (deToViLabels[label] || label) : label}</span>
      <input
        aria-label={label}
        name={name}
        defaultValue={value}
        required
        maxLength={name === "address" ? 240 : 120}
        {...extra}
      />
    </label>
  );
  const state = (value = "BW") => (
    <label className="field">
      <span>{lang === "vi" ? "Vùng bang (Đức)" : "Bundesland"}</span>
      <select aria-label="Bundesland" name="stateCode" defaultValue={value}>
        {Object.entries(data.states)
          .sort((a, b) => a[1].localeCompare(b[1], "de"))
          .map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
      </select>
    </label>
  );
  const dates = (
    <div className="form-grid">
      {input("Gültig ab", "validFrom", today(), { type: "date" })}
      {input("Gültig bis", "validTo", "", { type: "date", required: false })}
    </div>
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={title[editor.kind]}
      description={
        editor.kind === "assignment"
          ? (lang === "vi" ? "Thiết lập địa điểm làm việc và thời hạn hiệu lực. Hệ thống sẽ từ chối nếu có xung đột trùng lặp." : "Einsatzort und Gültigkeit festlegen. Überlappende Zuordnungen werden abgelehnt.")
          : editor.kind === "end"
            ? (lang === "vi" ? "Lịch sử phân công sẽ được bảo lưu. Ngày kết thúc có hiệu lực bao gồm cả ngày này." : "Die Historie bleibt erhalten. Das Enddatum ist einschließlich gültig.")
            : undefined
      }
    >
      <form onSubmit={submit}>
        <div className="modal-body editor-body">
          {editor.kind === "branch" && (
            <>
              {input("Name der Niederlassung", "name", editor.row?.name)}
              <div className="form-grid">
                {input("Standortcode", "code", editor.row?.code, {
                  pattern: "[A-Za-z0-9-]{2,24}",
                  maxLength: 24,
                  placeholder: "STR-06",
                })}
                {input("Stadt", "city", editor.row?.city)}
              </div>
              <label className="field">
                <span>{lang === "vi" ? "Pháp nhân sở hữu" : "Rechtseinheit"}</span>
                <select
                  name="legalEntityId"
                  defaultValue={editor.row?.legalEntityId || ""}
                  required
                  disabled={!!editor.row}
                >
                  {!editor.row && <option value="">{lang === "vi" ? "-- Vui lòng chọn --" : "Bitte wählen"}</option>}
                  {data.entities
                    .filter(
                      (e) => e.active || e.id === editor.row?.legalEntityId,
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
                {editor.row && (
                  <input
                    type="hidden"
                    name="legalEntityId"
                    value={editor.row.legalEntityId}
                  />
                )}
              </label>
              {input("Vollständige Adresse", "address", editor.row?.address)}
              {state(editor.row?.stateCode)}
              <div className="note">
                <Clock3 size={16} />
                {lang === "vi" ? "Múi giờ Europe/Berlin · Lịch nghỉ lễ tính theo địa điểm làm việc thực tế" : "Zeitzone Europe/Berlin · Feiertage nach tatsächlichem Arbeitsort"}
              </div>
            </>
          )}
          {editor.kind === "entity" && (
            <>
              {input("Firmenname", "name", editor.row?.name)}
              <div className="form-grid">
                {input("Unternehmenscode", "code", editor.row?.code, {
                  pattern: "[A-Za-z0-9-]{2,24}",
                  maxLength: 24,
                })}
                {input(
                  "Handelsregisternummer",
                  "registrationNumber",
                  editor.row?.registrationNumber,
                )}
              </div>
              {input("Geschäftsanschrift", "address", editor.row?.address)}
            </>
          )}
          {editor.kind === "location" && (
            <>
              {input("Bezeichnung des Arbeitsorts", "name", editor.row?.name)}
              {input(
                "Adresse",
                "address",
                editor.row?.address || editor.branch.address,
              )}
              {state(editor.row?.stateCode || editor.branch.stateCode)}
              <div className="note">
                <MapPin size={16} />
                Zugehörig zu {editor.branch.name}
              </div>
            </>
          )}
          {editor.kind === "user" && (
            <>
              {input("Vollständiger Name", "name", editor.row?.name)}
              {input("E-Mail-Adresse", "email", editor.row?.email, {
                type: "email",
                autoComplete: "off",
              })}
              {!editor.row &&
                input("Initiales Passwort", "password", "", {
                  type: "password",
                  minLength: 12,
                  maxLength: 72,
                  autoComplete: "new-password",
                  placeholder: "Mindestens 12 Zeichen",
                })}
              <fieldset className="check-fieldset">
                <legend>{lang === "vi" ? "Vai trò & Quyền hạn" : "Rollen"}</legend>
                {Object.keys(roleLabels).map((id) => (
                  <label className="checkbox-row" key={id}>
                    <input
                      type="checkbox"
                      name="roles"
                      value={id}
                      defaultChecked={
                        editor.row?.roles.includes(id as Role) ||
                        (!editor.row && id === "EMPLOYEE")
                      }
                    />
                    <span>{roleName(id as Role)}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="check-fieldset">
                <legend>{lang === "vi" ? "Phạm vi dữ liệu · Pháp nhân" : "Datenbereiche · Rechtseinheiten"}</legend>
                {data.entities.map((e) => (
                  <label className="checkbox-row" key={e.id}>
                    <input
                      type="checkbox"
                      name="legalEntityIds"
                      value={e.id}
                      defaultChecked={editor.row?.legalEntityIds.includes(e.id)}
                    />
                    <span>{e.name}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="check-fieldset">
                <legend>{lang === "vi" ? "Phạm vi dữ liệu · Chi nhánh" : "Datenbereiche · Niederlassungen"}</legend>
                {data.branches.map((b) => (
                  <label className="checkbox-row" key={b.id}>
                    <input
                      type="checkbox"
                      name="branchIds"
                      value={b.id}
                      defaultChecked={editor.row?.branchIds.includes(b.id)}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </fieldset>
              <p className="muted small">
                {lang === "vi"
                  ? "Quản lý nhà hàng sẽ được cấp quyền theo phạm vi chi nhánh được giao. Mọi thay đổi sẽ làm mới các phiên đăng nhập."
                  : "Restaurantleitungen erhalten zusätzlich den gültigen Leitungsbereich. Änderungen machen bisherige Sitzungen ungültig."}
              </p>
            </>
          )}
          {editor.kind === "manager" && (
            <>
              <label className="field">
                <span>{lang === "vi" ? "Quản lý phụ trách" : "Restaurantleitung"}</span>
                <select name="managerId" required defaultValue="">
                  <option value="">{lang === "vi" ? "-- Vui lòng chọn --" : "Bitte wählen"}</option>
                  {data.managerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              {dates}
              <div className="note">
                <ShieldCheck size={16} />
                {lang === "vi" ? "Quyền quản lý chỉ có hiệu lực trong khoảng thời gian được chỉ định." : "Der Bereich wird nur während des gültigen Zeitraums freigegeben."}
              </div>
            </>
          )}
          {editor.kind === "assignment" && (
            <>
              <label className="field">
                <span>{lang === "vi" ? "Nhân viên" : "Teammitglied"}</span>
                <select
                  name="employeeId"
                  required
                  defaultValue={editor.employeeId || ""}
                >
                  <option value="">{lang === "vi" ? "-- Vui lòng chọn --" : "Bitte wählen"}</option>
                  {data.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{lang === "vi" ? "Chi nhánh" : "Niederlassung"}</span>
                <select
                  name="branchId"
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  {data.branches
                    .filter((b) => b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>{lang === "vi" ? "Địa điểm làm việc cụ thể" : "Tatsächlicher Arbeitsort"}</span>
                <select
                  key={branchId}
                  name="workLocationId"
                  required
                  defaultValue=""
                >
                  <option value="">{lang === "vi" ? "-- Vui lòng chọn --" : "Bitte wählen"}</option>
                  {data.locations
                    .filter((l) => l.branchId === branchId && l.active)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {data.states[l.stateCode]}
                      </option>
                    ))}
                </select>
              </label>
              {dates}
              <label className="field">
                <span>{lang === "vi" ? "Hình thức phân công" : "Art der Zuordnung"}</span>
                <select name="kind">
                  <option value="TEMPORARY">{lang === "vi" ? "Điều chuyển tạm thời (TEMPORARY)" : "Vorübergehender Einsatz"}</option>
                  <option value="HOME">{lang === "vi" ? "Chi nhánh chính (HOME)" : "Reguläre Zuordnung"}</option>
                </select>
              </label>
              <label className="field">
                <span>{lang === "vi" ? "Lý do / Căn cứ" : "Begründung"}</span>
                <textarea
                  name="reason"
                  required
                  maxLength={500}
                  placeholder={lang === "vi" ? "Lý do điều chuyển hoặc phân công?" : "Warum erfolgt die Zuordnung?"}
                />
              </label>
              <p className="muted small">
                {lang === "vi"
                  ? "Hãy kết thúc đợt phân công hiện tại trước khi tạo mới. Ngày kết thúc có hiệu lực bao gồm cả ngày này; đợt mới bắt đầu sớm nhất vào ngày tiếp theo."
                  : "Beenden Sie eine bestehende Zuordnung zuerst. Das Enddatum ist einschließlich gültig; der neue Zeitraum beginnt frühestens am Folgetag."}
              </p>
            </>
          )}
          {editor.kind === "end" &&
            input("Letzter gültiger Tag", "validTo", today(), {
              type: "date",
              min: editor.row.validFrom,
            })}
          {["branch", "entity", "location", "user"].includes(editor.kind) && (
            <label className="checkbox-row active-checkbox">
              <input
                type="checkbox"
                name="active"
                defaultChecked={row && "active" in row ? row.active : true}
              />
              <span>{lang === "vi" ? "Đang hoạt động" : "Aktiv"}</span>
            </label>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            {lang === "vi" ? "Hủy" : "Abbrechen"}
          </button>
          <Press type="submit" disabled={busy}>
            {busy
              ? (lang === "vi" ? "Đang lưu …" : "Wird gespeichert …")
              : (lang === "vi" ? "Lưu thay đổi" : "Änderungen speichern")}
            <Check size={16} />
          </Press>
        </div>
      </form>
    </Modal>
  );
}
