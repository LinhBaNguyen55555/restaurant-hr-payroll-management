import { useState, useEffect } from "react";
import {
  Clock,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  ArrowLeftRight,
  Building,
  X,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  api,
  type Shift,
  type ShiftTemplate,
  type EmployeeDto,
  type Branch,
  type LaborLawCheckSummary,
  type ShiftSwapRequest,
  type PublishResult,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Modal } from "./experience";

const POSITION_NAMES_VI: Record<string, string> = {
  "Koch/Köchin": "Đầu bếp",
  "Koch": "Đầu bếp",
  "Chef": "Bếp trưởng",
  "Cook": "Đầu bếp",
  "Servicekraft": "Phục vụ bàn",
  "Server": "Phục vụ bàn",
  "Waiter": "Phục vụ bàn",
  "Barista": "Pha chế",
  "Barkraft": "Pha chế",
  "Barista / Barkraft": "Pha chế",
  "Spülkraft": "Rửa bát / Phụ bếp",
  "Küchenhilfe": "Phụ bếp",
  "Spülkraft / Küchenhilfe": "Phụ bếp",
  "Restaurantleitung": "Quản lý nhà hàng",
  "Restaurant Manager": "Quản lý nhà hàng",
  "Schichtleitung": "Trưởng ca",
  "Shift Leader": "Trưởng ca",
  "HR-Referent/in": "Chuyên viên nhân sự",
  "HR Specialist": "Chuyên viên nhân sự",
};

export function formatPosition(name: string | undefined | null, lang: string): string {
  if (!name) return lang === "vi" ? "Nhân viên" : "Mitarbeiter/in";
  if (lang === "vi") {
    return POSITION_NAMES_VI[name] || name;
  }
  return name;
}

export function SchedulingView({ branches }: { branches: Branch[] }) {
  const { t, lang } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<number>(() =>
    branches.length > 0 ? Number(branches[0].id) : 1
  );

  // Week calculation (Monday to Sunday)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkSummary, setCheckSummary] = useState<LaborLawCheckSummary | null>(null);
  const [checking, setChecking] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);

  // 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const periodStart = weekDays[0].toISOString();
  const periodEnd = new Date(weekDays[6].getTime() + 86399000).toISOString();

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftData, tmplData, empData] = await Promise.all([
        api<Shift[]>(
          `/scheduling/shifts?branchId=${selectedBranchId}&start=${encodeURIComponent(
            periodStart
          )}&end=${encodeURIComponent(periodEnd)}`
        ),
        api<ShiftTemplate[]>(`/scheduling/templates?branchId=${selectedBranchId}`),
        api<EmployeeDto[]>(`/workforce/employees?branchId=${selectedBranchId}&status=ACTIVE`),
      ]);
      setShifts(shiftData);
      setTemplates(tmplData);
      setEmployees(empData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, currentMonday]);

  // Navigate Weeks
  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };

  const gotoToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    setCurrentMonday(mon);
  };

  // Run German Labor Law Audit
  const openPublishModal = async () => {
    setChecking(true);
    setShowPublishModal(true);
    try {
      const summary = await api<LaborLawCheckSummary>("/scheduling/check", "POST", {
        branchId: selectedBranchId,
        start: periodStart,
        end: periodEnd,
      });
      setCheckSummary(summary);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const executePublish = async () => {
    setPublishBusy(true);
    try {
      const res = await api<PublishResult>("/scheduling/publish", "POST", {
        branchId: selectedBranchId,
        start: periodStart,
        end: periodEnd,
        changeReason: changeReason || "Phát hành lịch tuần chính thức",
      });
      alert(lang === "vi" ? res.messageVi : res.messageDe);
      setShowPublishModal(false);
      setChangeReason("");
      loadData();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPublishBusy(false);
    }
  };

  const executeDeleteShift = async () => {
    if (!shiftToDelete) return;
    setDeleting(true);
    try {
      await api(`/scheduling/shifts/${shiftToDelete.shiftId}`, "DELETE");
      setShiftToDelete(null);
      loadData();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const draftCount = shifts.filter((s) => s.status === "DRAFT").length;
  const publishedCount = shifts.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="scheduling-page">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => setShowSwapModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-emerald-950/40 text-slate-700 dark:text-emerald-200 hover:bg-slate-50 dark:hover:bg-emerald-900/50 shadow-sm transition"
        >
          <ArrowLeftRight size={16} className="text-emerald-500" />
          <span>{t("sched.swaps")}</span>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
        >
          <Plus size={16} />
          <span>{t("sched.add_shift")}</span>
        </button>
        <button
          onClick={openPublishModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
        >
          <Send size={16} />
          <span>{t("sched.publish")}</span>
          {draftCount > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-800 text-white text-xs rounded-full">
              {draftCount} {lang === "vi" ? "nháp" : "Entwürfe"}
            </span>
          )}
        </button>
      </div>

      {/* Week Navigation & Branch Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-emerald-950/20 shadow-sm my-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Building size={16} className="text-emerald-500" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-200"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-emerald-800/40 hover:bg-slate-100 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-slate-300"
            title={t("sched.prev_week")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={gotoToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-emerald-800/40 hover:bg-slate-100 dark:hover:bg-emerald-900/40 text-slate-700 dark:text-slate-300"
          >
            {t("sched.today")}
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-emerald-800/40 hover:bg-slate-100 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-slate-300"
            title={t("sched.next_week")}
          >
            <ChevronRight size={18} />
          </button>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 ml-2">
            {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} —{" "}
            {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 size={13} />
            {publishedCount} {lang === "vi" ? "Đã công bố" : "Veröffentlicht"}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
            <Clock size={13} />
            {draftCount} {lang === "vi" ? "Bản nháp" : "Entwürfe"}
          </span>
        </div>
      </div>

      {/* Interactive Weekly Shift Grid */}
      <div className="rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-emerald-950/20 overflow-x-auto shadow-sm">
        <div className="min-w-[900px] grid grid-cols-7 divide-x divide-slate-200 dark:divide-emerald-900/40 border-b border-slate-200 dark:border-emerald-900/40">
          {weekDays.map((d, index) => {
            const isSunday = d.getDay() === 0;
            const isToday = d.toDateString() === new Date().toDateString();
            const dayNamesVi = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
            const dayNamesDe = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
            return (
              <div
                key={index}
                className={`p-3 text-center ${
                  isToday
                    ? "bg-emerald-50/70 dark:bg-emerald-950/60"
                    : isSunday
                    ? "bg-amber-50/40 dark:bg-amber-950/20"
                    : "bg-slate-50/40 dark:bg-emerald-950/30"
                }`}
              >
                <div
                  className={`text-xs font-semibold ${
                    isSunday ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {lang === "vi" ? dayNamesVi[d.getDay()] : dayNamesDe[d.getDay()]}
                </div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    isToday ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {d.getDate()}
                </div>
                {isSunday && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                    ArbZG §11
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Shift Grid Cells */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu ca trực...
          </div>
        ) : (
          <div className="min-w-[900px] grid grid-cols-7 divide-x divide-slate-200 dark:divide-emerald-900/40 min-h-[460px]">
            {weekDays.map((dayDate, dayIdx) => {
              const dayString = dayDate.toISOString().slice(0, 10);
              const dayShifts = shifts.filter((s) => s.plannedStartUtc.slice(0, 10) === dayString);

              return (
                <div key={dayIdx} className="p-2.5 space-y-2.5">
                  {dayShifts.map((shift) => {
                    const sTime = shift.plannedStartUtc.slice(11, 16);
                    const eTime = shift.plannedEndUtc.slice(11, 16);
                    const isDraft = shift.status === "DRAFT";

                    return (
                      <div
                        key={shift.shiftId}
                        className={`group relative p-2.5 rounded-lg border text-xs shadow-xs transition hover:shadow-md ${
                          isDraft
                            ? "border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-700/50"
                            : "border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-700/50"
                        }`}
                      >
                        <button
                          onClick={() => setShiftToDelete(shift)}
                          className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                          title={lang === "vi" ? "Xóa ca trực này" : "Schicht löschen"}
                        >
                          <X size={13} />
                        </button>

                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
                          <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-300">
                            <Clock size={12} />
                            {sTime} - {eTime}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                              isDraft
                                ? "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                                : "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200"
                            }`}
                          >
                            {isDraft ? (lang === "vi" ? "Nháp" : "Entwurf") : (lang === "vi" ? "Đã duyệt" : "Bestätigt")}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-900 dark:text-white mt-1.5 truncate">
                          {shift.employeeName}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                          <span className="truncate">{formatPosition(shift.positionName || shift.templateName, lang)}</span>
                          <span>{shift.plannedBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"}</span>
                        </div>
                      </div>
                    );
                  })}

                  {dayShifts.length === 0 && (
                    <div className="h-full flex items-center justify-center py-10 text-slate-300 dark:text-emerald-950/80 text-xs">
                      {lang === "vi" ? "Trống" : "Frei"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Shift */}
      {showAddModal && (
        <AddShiftModal
          branchId={selectedBranchId}
          templates={templates}
          employees={employees}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {/* Modal: German Labor Law Pre-Publishing Audit */}
      {showPublishModal && (
        <PublishAuditModal
          checking={checking}
          summary={checkSummary}
          changeReason={changeReason}
          setChangeReason={setChangeReason}
          busy={publishBusy}
          onClose={() => setShowPublishModal(false)}
          onConfirm={executePublish}
        />
      )}

      {/* Modal: Shift Swap Center */}
      {showSwapModal && (
        <ShiftSwapCenterModal
          branchId={selectedBranchId}
          shifts={shifts}
          employees={employees}
          onClose={() => setShowSwapModal(false)}
          onSuccess={() => {
            setShowSwapModal(false);
            loadData();
          }}
        />
      )}

      {/* Modal: Confirm Delete Shift (replaces native window.confirm) */}
      {shiftToDelete && (
        <Modal
          open={true}
          title={lang === "vi" ? "Xác nhận xóa ca làm việc" : "Schicht löschen"}
          description={
            lang === "vi"
              ? "Bạn có chắc chắn muốn xóa ca làm việc này không? Ca trực sẽ bị loại bỏ khỏi lịch tuần."
              : "Möchten Sie diese Schicht wirklich löschen? Diese Aktion entfernt den Einsatz aus dem Dienstplan."
          }
          onClose={() => setShiftToDelete(null)}
        >
          <div className="space-y-5 pt-1">
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 text-slate-800 dark:text-slate-200 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 shrink-0 mt-0.5">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1.5 flex-1 text-sm">
                <div className="font-bold text-base text-red-950 dark:text-red-200">
                  {shiftToDelete.employeeName}
                </div>
                <div className="text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-black/30 border border-red-200/60 dark:border-red-900/40 text-red-900 dark:text-red-300">
                    {formatPosition(shiftToDelete.positionName, lang)}
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold">
                    {shiftToDelete.plannedStartUtc.slice(0, 10)} ({shiftToDelete.plannedStartUtc.slice(11, 16)} - {shiftToDelete.plannedEndUtc.slice(11, 16)})
                  </span>
                  <span>•</span>
                  <span>{shiftToDelete.plannedBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-emerald-900/40">
              <button
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-emerald-900/40 shadow-xs transition cursor-pointer"
              >
                {lang === "vi" ? "Hủy bỏ" : "Abbrechen"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDeleteShift}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-700/20 hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>
                  {deleting
                    ? (lang === "vi" ? "Đang xóa..." : "Wird gelöscht...")
                    : (lang === "vi" ? "Xác nhận xóa ca" : "Schicht löschen")}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddShiftModal({
  branchId,
  templates,
  employees,
  onClose,
  onSuccess,
}: {
  branchId: number;
  templates: ShiftTemplate[];
  employees: EmployeeDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const [employeeId, setEmployeeId] = useState<number>(employees[0]?.employeeId || 2);
  const [templateId, setTemplateId] = useState<number | null>(templates[0]?.templateId || null);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleTemplateSelect = (tId: number) => {
    setTemplateId(tId);
    const tmpl = templates.find((t) => t.templateId === tId);
    if (tmpl) {
      setStartTime(tmpl.localStartTime.slice(0, 5));
      setEndTime(tmpl.localEndTime.slice(0, 5));
      setBreakMinutes(tmpl.defaultBreakMinutes);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Calculate ISO strings in UTC
    const startIso = `${shiftDate}T${startTime}:00Z`;
    // If end time is before start time, it crosses midnight
    const isNextDay = endTime <= startTime;
    let endDate = shiftDate;
    if (isNextDay) {
      const d = new Date(shiftDate);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString().slice(0, 10);
    }
    const endIso = `${endDate}T${endTime}:00Z`;

    setBusy(true);
    try {
      await api("/scheduling/shifts", "POST", {
        branchId,
        employeeId,
        templateId,
        start: startIso,
        end: endIso,
        breakMinutes,
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? "Thêm ca làm việc mới" : "Neue Schicht anlegen"}
      description={
        lang === "vi"
          ? "Phân công nhân sự theo mẫu ca hoặc tùy chỉnh thời gian trực ca tuân thủ luật lao động Đức ArbZG."
          : "Einsatz nach Schichtvorlage oder mit individuellen Arbeitszeiten planen."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5 pt-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/20">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              {lang === "vi" ? "Chọn nhanh từ mẫu ca có sẵn" : "Aus Schichtvorlage wählen"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.templateId}
                  onClick={() => handleTemplateSelect(t.templateId)}
                  className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                    templateId === t.templateId
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30"
                      : "border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-emerald-950/30 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{t.templateName}</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock size={12} className="text-emerald-500" />
                    <span>{t.localStartTime.slice(0, 5)} - {t.localEndTime.slice(0, 5)}</span>
                    <span>•</span>
                    <span>{t.defaultBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            {lang === "vi" ? "Nhân viên trực ca *" : "Mitarbeitende Person *"}
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(Number(e.target.value))}
            className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
          >
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.displayName} ({emp.employeeCode}) • {formatPosition(emp.positionNameDe, lang)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Ngày làm việc *" : "Arbeitstag *"}
            </label>
            <input
              type="date"
              required
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ bắt đầu *" : "Beginn *"}
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ kết thúc *" : "Ende *"}
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            {lang === "vi" ? "Thời gian nghỉ giải lao (phút)" : "Ruhepause (Minuten)"}
          </label>
          <input
            type="number"
            min="0"
            step="5"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {lang === "vi"
              ? "Theo ArbZG §4: Ca từ 6-9h nghỉ tối thiểu 30m; ca trên 9h nghỉ tối thiểu 45m."
              : "Gemäß § 4 ArbZG: Ab 6 Std. mind. 30 Min., ab 9 Std. mind. 45 Min. Pause."}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-emerald-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-emerald-900/40 shadow-xs transition cursor-pointer"
          >
            {lang === "vi" ? "Hủy bỏ" : "Abbrechen"}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-700/20 hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>
              {busy
                ? (lang === "vi" ? "Đang lưu..." : "Wird gespeichert...")
                : (lang === "vi" ? "Thêm ca trực" : "Schicht speichern")}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PublishAuditModal({
  checking,
  summary,
  changeReason,
  setChangeReason,
  busy,
  onClose,
  onConfirm,
}: {
  checking: boolean;
  summary: LaborLawCheckSummary | null;
  changeReason: string;
  setChangeReason: (s: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { lang } = useI18n();
  const hasBlockers = summary && summary.blockerCount > 0;

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? "Kiểm tra Luật Lao động Đức & Công bố lịch" : "ArbZG-Prüfung & Veröffentlichung"}
      description={
        lang === "vi"
          ? "Đảm bảo tuân thủ các quy định bắt buộc về thời giờ làm việc và nghỉ ngơi theo luật Đức (ArbZG / JArbSchG / MuSchG) trước khi phát hành lịch ca."
          : "Zwingende Ruhezeiten und Höchstarbeitszeiten gemäß ArbZG vor der Veröffentlichung prüfen."
      }
      onClose={onClose}
    >
      <div className="space-y-5 pt-1">
        {checking ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            {lang === "vi"
              ? "Đang chạy bộ kiểm tra luật lao động Đức (ArbZG, JArbSchG, MuSchG)..."
              : "Prüfe Arbeitszeitgesetz (ArbZG, JArbSchG, MuSchG)..."}
          </div>
        ) : !summary ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            {lang === "vi" ? "Không có dữ liệu kiểm tra." : "Keine Prüfdaten vorhanden."}
          </div>
        ) : (
          <>
            {/* Status overview */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                hasBlockers
                  ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900/60 text-red-950 dark:text-red-200"
                  : summary.warningCount > 0
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200"
              }`}
            >
              {hasBlockers ? (
                <AlertOctagon size={24} className="text-red-600 shrink-0 mt-0.5" />
              ) : summary.warningCount > 0 ? (
                <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-base">
                  {hasBlockers
                    ? (lang === "vi"
                        ? `Phát hiện ${summary.blockerCount} vi phạm luật bắt buộc (BLOCKER)!`
                        : `${summary.blockerCount} zwingende Rechtsverstöße festgestellt (BLOCKER)!`)
                    : summary.warningCount > 0
                    ? (lang === "vi"
                        ? `Lịch hợp lệ với ${summary.warningCount} cảnh báo cần quản lý xác nhận.`
                        : `Dienstplan gültig mit ${summary.warningCount} Hinweisen zur Bestätigung.`)
                    : (lang === "vi"
                        ? "Lịch ca hoàn toàn tuân thủ các quy định Luật Lao động Đức!"
                        : "Dienstplan entspricht vollständig dem deutschen Arbeitszeitgesetz!")}
                </div>
                <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                  {hasBlockers
                    ? (lang === "vi"
                        ? "Hệ thống chặn việc công bố lịch theo quy tắc BR14 để tránh vi phạm pháp luật lao động. Bạn phải điều chỉnh lại các ca bị vi phạm."
                        : "Veröffentlichung gemäß BR14 gesperrt. Bitte korrigieren Sie die betroffenen Schichten.")
                    : (lang === "vi"
                        ? "Bạn có thể tiến hành công bố lịch chính thức cho toàn bộ nhân viên chi nhánh."
                        : "Sie können den Dienstplan nun für alle Mitarbeiter verbindlich veröffentlichen.")}
                </div>
              </div>
            </div>

            {/* Violations List */}
            {summary.violations.length > 0 && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {summary.violations.map((v, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border text-xs ${
                      v.severity === "BLOCKER"
                        ? "border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200"
                        : "border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                            v.severity === "BLOCKER" ? "bg-red-200 text-red-900" : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {v.severity}
                        </span>
                        <span>{v.legalBasis}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 font-semibold text-sm">{lang === "vi" ? v.messageVi : v.messageDe}</div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 italic">
                      {lang === "vi" ? v.messageDe : v.messageVi}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Change Reason Field */}
            {!hasBlockers && (
              <div className="pt-2">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {lang === "vi"
                    ? "Lý do / Kế hoạch điều chỉnh (sẽ gửi thông báo cho nhân sự):"
                    : "Änderungsgrund (wird an Mitarbeiter übermittelt):"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "vi" ? "Công bố lịch ca tuần mới..." : "Veröffentlichung des neuen Dienstplans..."}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-emerald-900/40">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-emerald-900/40 shadow-xs transition cursor-pointer"
              >
                {lang === "vi" ? "Đóng" : "Schließen"}
              </button>
              <button
                type="button"
                disabled={busy || Boolean(hasBlockers)}
                onClick={onConfirm}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition cursor-pointer flex items-center gap-2 ${
                  hasBlockers
                    ? "bg-slate-400 text-white cursor-not-allowed opacity-60"
                    : "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-700/20 hover:shadow-lg"
                }`}
              >
                <Send size={16} />
                <span>
                  {busy
                    ? (lang === "vi" ? "Đang công bố..." : "Wird veröffentlicht...")
                    : (lang === "vi" ? "Xác nhận & Phát hành lịch" : "Bestätigen & Veröffentlichen")}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ShiftSwapCenterModal({
  branchId,
  shifts,
  employees,
  onClose,
  onSuccess,
}: {
  branchId: number;
  shifts: Shift[];
  employees: EmployeeDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Create request form
  const [sourceShiftId, setSourceShiftId] = useState<number>(shifts[0]?.shiftId || 1);
  const [targetEmployeeId, setTargetEmployeeId] = useState<number>(employees[0]?.employeeId || 3);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api<ShiftSwapRequest[]>(`/scheduling/swap-requests?branchId=${branchId}`);
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approve = async (id: number) => {
    try {
      await api(`/scheduling/swap-requests/${id}/approve`, "POST", { reason: "Quản lý đã phê duyệt" });
      alert(lang === "vi" ? "Đã phê duyệt đổi ca thành công!" : "Schichttausch erfolgreich genehmigt!");
      loadRequests();
      onSuccess();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const reject = async (id: number) => {
    try {
      await api(`/scheduling/swap-requests/${id}/reject`, "POST", { reason: "Không phù hợp điều kiện vận hành" });
      alert(lang === "vi" ? "Đã từ chối yêu cầu đổi ca." : "Schichttausch abgelehnt.");
      loadRequests();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/scheduling/swap-requests", "POST", {
        sourceShiftId,
        targetEmployeeId,
        reason,
      });
      alert(lang === "vi" ? "Đã gửi yêu cầu đổi ca tới đồng nghiệp!" : "Tauschanfrage erfolgreich gesendet!");
      setActiveTab("list");
      loadRequests();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? "Sàn đổi ca & Quản lý yêu cầu trực" : "Schichtbörse & Schichttausch"}
      description={
        lang === "vi"
          ? "Nhân viên yêu cầu đổi ca trực hoặc đăng ký nhận ca trống. Quản lý kiểm tra điều kiện và xét duyệt tuân thủ Luật lao động Đức (ArbZG)."
          : "Mitarbeiter können Schichten tauschen oder freie Einsätze übernehmen. Prüfung gemäß ArbZG."
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex border-b border-slate-200 dark:border-emerald-800/40 gap-6 text-sm font-semibold">
          <button
            type="button"
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "list"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            onClick={() => setActiveTab("list")}
          >
            <Clock size={16} />
            <span>{lang === "vi" ? "Yêu cầu chờ duyệt" : "Ausstehende Anfragen"}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {requests.filter((r) => r.status === "PENDING").length}
            </span>
          </button>
          <button
            type="button"
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            onClick={() => setActiveTab("create")}
          >
            <ArrowLeftRight size={16} />
            <span>{lang === "vi" ? "Gửi yêu cầu đổi ca mới" : "Neuen Tausch anfragen"}</span>
          </button>
        </div>

        {activeTab === "list" && (
          <div className="space-y-3">
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
              {loading ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  {lang === "vi" ? "Đang tải danh sách..." : "Lade Anfragen..."}
                </div>
              ) : requests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                  {lang === "vi" ? "Hiện không có yêu cầu đổi ca nào cần xử lý." : "Keine offenen Tauschanfragen vorhanden."}
                </div>
              ) : (
                requests.map((r) => {
                  const targetEmp = employees.find((e) => e.employeeId === r.targetEmployeeId);
                  const displayReason =
                    r.reason === "Demo request to exchange a shift"
                      ? lang === "vi"
                        ? "Thỏa thuận đổi ca cá nhân"
                        : "Schichttausch nach Absprache"
                      : r.reason || (lang === "vi" ? "Thỏa thuận nội bộ" : "Interne Vereinbarung");

                  return (
                    <div
                      key={r.swapRequestId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Ca #{r.sourceShiftId}</span>
                          <ArrowLeftRight size={14} className="text-emerald-500" />
                          <span>
                            {lang === "vi" ? "Chuyển cho" : "Übertragen an"}{" "}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {targetEmp ? targetEmp.displayName : `#${r.targetEmployeeId}`}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                          <span className="font-medium">{lang === "vi" ? "Lý do: " : "Begründung: "}</span>
                          <span className="italic font-normal">"{displayReason}"</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {r.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => approve(r.swapRequestId)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition"
                            >
                              <CheckCircle2 size={14} />
                              <span>{lang === "vi" ? "Duyệt" : "Genehmigen"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => reject(r.swapRequestId)}
                              className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs transition inline-flex items-center gap-1.5"
                            >
                              <XCircle size={14} />
                              <span>{lang === "vi" ? "Từ chối" : "Ablehnen"}</span>
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              r.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                            }`}
                          >
                            {r.status === "APPROVED"
                              ? lang === "vi"
                                ? "Đã duyệt"
                                : "Genehmigt"
                              : lang === "vi"
                              ? "Đã từ chối"
                              : "Abgelehnt"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition"
              >
                {lang === "vi" ? "Đóng" : "Schließen"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "create" && (
          <form onSubmit={submitCreate} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === "vi" ? "Ca trực cần chuyển nhượng *" : "Zu tauschende Schicht *"}
              </label>
              <select
                value={sourceShiftId}
                onChange={(e) => setSourceShiftId(Number(e.target.value))}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              >
                {shifts.map((s) => (
                  <option key={s.shiftId} value={s.shiftId} className="dark:bg-slate-900">
                    Ca #{s.shiftId} • {s.plannedStartUtc.slice(0, 10)} ({s.plannedStartUtc.slice(11, 16)} -{" "}
                    {s.plannedEndUtc.slice(11, 16)}) • {s.employeeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === "vi" ? "Đổi sang cho đồng nghiệp *" : "Mit Kollege/in tauschen *"}
              </label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(Number(e.target.value))}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              >
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId} className="dark:bg-slate-900">
                    {emp.displayName} ({emp.employeeCode}) • {formatPosition(emp.positionNameDe, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === "vi" ? "Lý do xin đổi ca (minh bạch nội bộ)" : "Begründung"}
              </label>
              <input
                type="text"
                placeholder={lang === "vi" ? "Ví dụ: Có việc gia đình bận, đã thỏa thuận trước..." : "Private Gründe / Absprache..."}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition"
              >
                {lang === "vi" ? "Hủy bỏ" : "Abbrechen"}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                <ArrowLeftRight size={16} />
                <span>
                  {busy
                    ? lang === "vi"
                      ? "Đang gửi..."
                      : "Wird gesendet..."
                    : lang === "vi"
                    ? "Gửi yêu cầu đổi ca"
                    : "Anfrage senden"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
