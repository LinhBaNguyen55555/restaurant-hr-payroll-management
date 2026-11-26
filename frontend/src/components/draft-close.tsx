import { useState, type ReactNode } from "react";
import { useI18n } from "../lib/i18n";
import { Modal, Press } from "./experience";

export function useDraftChanged(values: unknown[]) {
  const snapshot = JSON.stringify(values);
  const [initial] = useState(snapshot);
  return snapshot !== initial;
}

export function useDraftClose(
  onClose: () => void,
  busy: boolean,
  changed: () => boolean,
) {
  const { lang } = useI18n();
  const vi = lang === "vi";
  const [confirming, setConfirming] = useState(false);
  function requestClose() {
    if (busy) return;
    if (changed()) setConfirming(true);
    else onClose();
  }
  const confirmation = confirming && (
    <Modal
      open
      onClose={() => setConfirming(false)}
      title={
        vi ? "Bỏ thay đổi chưa lưu?" : "Ungespeicherte Änderungen verwerfen?"
      }
      description={
        vi
          ? "Bạn có thể quay lại biểu mẫu để tiếp tục nhập."
          : "Sie können zum Formular zurückkehren und weiterarbeiten."
      }
    >
      <div className="modal-footer">
        <Press type="button" onClick={() => setConfirming(false)}>
          {vi ? "Tiếp tục chỉnh sửa" : "Weiter bearbeiten"}
        </Press>
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          {vi ? "Bỏ thay đổi" : "Änderungen verwerfen"}
        </button>
      </div>
    </Modal>
  );
  return { requestClose, confirming, confirmation };
}

export function DraftModal({
  title,
  action,
  values,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  action: string;
  values: unknown[];
  onClose: () => void;
  onSubmit: () => Promise<void>;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const changed = useDraftChanged(values);
  const { requestClose, confirmation } = useDraftClose(
    onClose,
    busy,
    () => changed,
  );
  return (
    <Modal open title={title} busy={busy} onClose={requestClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await onSubmit();
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="modal-body editor-body">
          {children}
        </fieldset>
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={requestClose}
          >
            {lang === "vi" ? "Hủy" : "Abbrechen"}
          </button>
          <Press type="submit" disabled={busy}>
            {busy
              ? lang === "vi"
                ? "Đang lưu…"
                : "Wird gespeichert…"
              : action}
          </Press>
        </div>
      </form>
      {confirmation}
    </Modal>
  );
}
