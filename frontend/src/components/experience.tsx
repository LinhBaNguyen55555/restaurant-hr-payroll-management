import { useRef, type ReactNode, type ComponentProps } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog";
import { X, ArrowUpRight, Check, LoaderCircle, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { spring, useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useI18n } from "../lib/i18n";
gsap.registerPlugin(useGSAP);
export function Scene({
  compact = false,
  color = "mint",
}: {
  compact?: boolean;
  color?: string;
}) {
  const { lang } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useShouldReduceMotion();
  useGSAP(
    (_, contextSafe) => {
      if (!root.current || reduced || !contextSafe) return;
      const model = root.current.querySelector(".restaurant-model");
      if (!model) return;
      const x = gsap.quickTo(model, "rotationX", {
        duration: 0.7,
        ease: "power3.out",
      });
      const y = gsap.quickTo(model, "rotationY", {
        duration: 0.7,
        ease: "power3.out",
      });
      const move = contextSafe((e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        const box = root.current!.getBoundingClientRect();
        x(-8 - ((e.clientY - box.top) / box.height - 0.5) * 12);
        y(((e.clientX - box.left) / box.width - 0.5) * 22);
      });
      const leave = contextSafe(() => {
        x(-8);
        y(0);
      });
      const el = root.current;
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );
  return (
    <div
      ref={root}
      className={`scene ${compact ? "scene-compact" : ""} scene-${color}`}
      aria-hidden="true"
    >
      <div className="scene-grid" />
      <div className="restaurant-model">
        <div className="model-ground" />
        <div className="model-path" />
        <div className="building">
          <div className="building-front">
            <div className="shop-name">
              ATELIER<span>RESTAURANT & BAR</span>
            </div>
            <div className="shop-awning" />
            <div className="shop-windows">
              <i />
              <i />
              <i />
            </div>
            <div className="shop-door" />
            <div className="flower-box">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="building-side">
            <i />
            <i />
          </div>
          <div className="building-roof" />
        </div>
        <div className="model-tree tree-one">
          <i />
          <span />
        </div>
        <div className="model-tree tree-two">
          <i />
          <span />
        </div>
        <div className="cafe-table table-one">
          <i />
          <b />
          <b />
        </div>
        <div className="cafe-table table-two">
          <i />
          <b />
          <b />
        </div>
        <div className="model-sign">
          <span>a.</span>
        </div>
      </div>
      {!compact && (
        <>
          <div className="scene-label">
            <span className="status-dot" /> {lang === "vi" ? "Stuttgart, Đức" : "Stuttgart, Deutschland"}{" "}
            <ArrowUpRight size={13} />
          </div>
          <div className="scene-floating">
            <div className="floating-check">
              <Check size={16} />
            </div>
            <div>
              <b>{lang === "vi" ? "Tất cả tại một nơi." : "Alles an einem Ort."}</b>
              <span>{lang === "vi" ? "Con người. Chi nhánh. Tiềm năng." : "Menschen. Standorte. Möglichkeiten."}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  drawer = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  drawer?: boolean;
  busy?: boolean;
}) {
  const { lang } = useI18n();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup
          className={`modal ${wide ? "modal-wide" : ""} ${drawer ? "modal-drawer" : ""}`}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title className="modal-title">{title}</Dialog.Title>
              {description && <Dialog.Description className="modal-description">{description}</Dialog.Description>}
            </div>
            <Dialog.Close
              disabled={busy}
              className="icon-button"
              aria-label={lang === "vi" ? "Đóng" : "Schließen"}
            >
              <X size={19} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EditButton({ name, onClick }: { name: string; onClick: () => void }) {
  const { lang } = useI18n();
  return <button type="button" className="record-action"
    aria-label={lang === "vi" ? `Sửa ${name}` : `${name} bearbeiten`} onClick={onClick}>
    <Pencil size={14} aria-hidden="true" />{lang === "vi" ? "Sửa" : "Bearbeiten"}
  </button>;
}
export function Press({
  children,
  className = "",
  ...props
}: ComponentProps<typeof motion.button>) {
  const reduced = useShouldReduceMotion();
  return (
    <motion.button
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={spring.press}
      className={`button ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Loading() {
  const { lang } = useI18n();
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={25} />
      <span>{lang === "vi" ? "Đang tải dữ liệu …" : "Arbeitsbereich wird geladen …"}</span>
    </div>
  );
}
export function Status({ active, label }: { active: boolean; label?: string }) {
  const { lang } = useI18n();
  return (
    <span className={`status ${active ? "status-active" : "status-muted"}`}>
      <span />
      {label || (active ? (lang === "vi" ? "Hoạt động" : "Aktiv") : (lang === "vi" ? "Ngừng hoạt động" : "Inaktiv"))}
    </span>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-symbol">a.</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
