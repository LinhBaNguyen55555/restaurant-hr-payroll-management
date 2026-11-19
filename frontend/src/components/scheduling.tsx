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

  const deleteShift = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ca làm việc này?")) return;
    try {
      await api(`/scheduling/shifts/${id}`, "DELETE");
      loadData();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const draftCount = shifts.filter((s) => s.status === "DRAFT").length;
  const publishedCount = shifts.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="scheduling-page">
      {/* Top Header */}
      <div className="section-header-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("nav.scheduling")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("sub.scheduling")}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                {draftCount} nháp
              </span>
            )}
          </button>
        </div>
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
            {publishedCount} Đã công bố
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
            <Clock size={13} />
            {draftCount} Bản nháp
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
                          onClick={() => deleteShift(shift.shiftId)}
                          className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition"
                          title="Xóa ca"
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
                            {isDraft ? "Nháp" : "Đã duyệt"}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-900 dark:text-white mt-1.5 truncate">
                          {shift.employeeName}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                          <span className="truncate">{shift.positionName || shift.templateName || "Nhân viên"}</span>
                          <span>{shift.plannedBreakMinutes}m nghỉ</span>
                        </div>
                      </div>
                    );
                  })}

                  {dayShifts.length === 0 && (
                    <div className="h-full flex items-center justify-center py-10 text-slate-300 dark:text-emerald-950/80 text-xs">
                      Trống
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
    <Modal open={true} title="Thêm ca làm việc mới" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Template Selector */}
        {templates.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Chọn từ mẫu ca có sẵn</label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.templateId}
                  onClick={() => handleTemplateSelect(t.templateId)}
                  className={`p-2 rounded-lg border text-left text-xs transition ${
                    templateId === t.templateId
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-semibold text-emerald-800 dark:text-emerald-200"
                      : "border-slate-200 dark:border-emerald-800/40 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-semibold">{t.templateName}</div>
                  <div className="text-[11px] text-slate-400">
                    {t.localStartTime.slice(0, 5)} - {t.localEndTime.slice(0, 5)} ({t.defaultBreakMinutes}m nghỉ)
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nhân viên trực ca *</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 font-medium"
          >
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.displayName} ({emp.employeeCode}) • {emp.positionNameDe || "Nhân viên"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ngày làm việc *</label>
            <input
              type="date"
              required
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Giờ bắt đầu *</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Giờ kết thúc *</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian nghỉ giải lao (phút)</label>
          <input
            type="number"
            min="0"
            step="5"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Theo ArbZG §4: Ca 6-9h nghỉ tối thiểu 30m; ca trên 9h nghỉ tối thiểu 45m.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 text-slate-600 dark:text-slate-300"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {busy ? "Đang lưu..." : "Tạo ca"}
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
  const hasBlockers = summary && summary.blockerCount > 0;

  return (
    <Modal open={true} title="Kiểm tra tuân thủ Luật Lao động Đức & Công bố lịch" onClose={onClose}>
      <div className="space-y-4">
        {checking ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Đang chạy bộ kiểm tra luật lao động Đức (ArbZG, JArbSchG, MuSchG)...
          </div>
        ) : !summary ? (
          <div className="py-8 text-center text-slate-400">Không có dữ liệu kiểm tra.</div>
        ) : (
          <>
            {/* Status overview */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                hasBlockers
                  ? "bg-red-50 dark:bg-red-950/40 border-red-200 text-red-900 dark:text-red-200"
                  : summary.warningCount > 0
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-900 dark:text-amber-200"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200"
              }`}
            >
              {hasBlockers ? (
                <AlertOctagon size={22} className="text-red-500 shrink-0 mt-0.5" />
              ) : summary.warningCount > 0 ? (
                <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-base">
                  {hasBlockers
                    ? `Phát hiện ${summary.blockerCount} vi phạm luật bắt buộc (BLOCKER)!`
                    : summary.warningCount > 0
                    ? `Lịch hợp lệ với ${summary.warningCount} cảnh báo cần quản lý xác nhận.`
                    : "Lịch ca hoàn toàn tuân thủ các quy định Luật Lao động Đức!"}
                </div>
                <div className="text-xs mt-1">
                  {hasBlockers
                    ? "Hệ thống chặn việc công bố lịch theo quy tắc BR14 để tránh vi phạm pháp luật lao động. Bạn phải điều chỉnh lại các ca bị vi phạm."
                    : "Bạn có thể tiến hành công bố lịch chính thức cho toàn bộ nhân viên chi nhánh."}
                </div>
              </div>
            </div>

            {/* Violations List */}
            {summary.violations.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {summary.violations.map((v, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-xs ${
                      v.severity === "BLOCKER"
                        ? "border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 text-red-800 dark:text-red-200"
                        : "border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            v.severity === "BLOCKER" ? "bg-red-200 text-red-900" : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {v.severity}
                        </span>
                        <span>{v.legalBasis}</span>
                      </span>
                    </div>
                    <div className="mt-1 font-medium">{v.messageVi}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 italic">{v.messageDe}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Change Reason Field */}
            {!hasBlockers && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do / Kế hoạch điều chỉnh (sẽ gửi thông báo cho nhân sự):
                </label>
                <input
                  type="text"
                  placeholder="Công bố lịch ca tuần mới..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 font-medium"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-emerald-900/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 text-slate-600 dark:text-slate-300"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={busy || Boolean(hasBlockers)}
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${
                  hasBlockers
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                }`}
              >
                {busy ? "Đang công bố..." : "Xác nhận & Phát hành lịch"}
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
      alert("Đã phê duyệt đổi ca thành công!");
      loadRequests();
      onSuccess();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const reject = async (id: number) => {
    try {
      await api(`/scheduling/swap-requests/${id}/reject`, "POST", { reason: "Không phù hợp điều kiện vận hành" });
      alert("Đã từ chối yêu cầu đổi ca.");
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
      alert("Đã gửi yêu cầu đổi ca tới đồng nghiệp!");
      setActiveTab("list");
      loadRequests();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={true} title="Sàn Đổi ca & Quản lý Ca trực (Shift Swap Center)" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 dark:border-emerald-800/40 gap-4 text-sm font-medium">
          <button
            className={`pb-2 border-b-2 transition ${
              activeTab === "list"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500"
            }`}
            onClick={() => setActiveTab("list")}
          >
            Yêu cầu chờ duyệt ({requests.filter((r) => r.status === "PENDING").length})
          </button>
          <button
            className={`pb-2 border-b-2 transition ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500"
            }`}
            onClick={() => setActiveTab("create")}
          >
            Gửi yêu cầu đổi ca mới
          </button>
        </div>

        {activeTab === "list" && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-400">Đang tải danh sách...</div>
            ) : requests.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Hiện không có yêu cầu đổi ca nào.
              </div>
            ) : (
              requests.map((r) => (
                <div
                  key={r.swapRequestId}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50/50 dark:bg-emerald-950/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Ca ID: #{r.sourceShiftId}</span>
                      <ArrowLeftRight size={13} className="text-emerald-500" />
                      <span>Chuyển cho Nhân viên #{r.targetEmployeeId}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-1">
                      Lý do: "{r.reason || "Thỏa thuận nội bộ"}"
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => approve(r.swapRequestId)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => reject(r.swapRequestId)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-emerald-800/40 text-slate-600 hover:bg-slate-100"
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "create" && (
          <form onSubmit={submitCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ca cần đổi *</label>
              <select
                value={sourceShiftId}
                onChange={(e) => setSourceShiftId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 font-medium"
              >
                {shifts.map((s) => (
                  <option key={s.shiftId} value={s.shiftId}>
                    Ca #{s.shiftId} • {s.plannedStartUtc.slice(0, 10)} ({s.plannedStartUtc.slice(11, 16)} -{" "}
                    {s.plannedEndUtc.slice(11, 16)}) • {s.employeeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Đổi với đồng nghiệp *</label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.displayName} ({emp.employeeCode}) • {emp.positionNameDe}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Lý do xin đổi ca</label>
              <input
                type="text"
                placeholder="Có việc bận gia đình / thỏa thuận trước..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {busy ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
