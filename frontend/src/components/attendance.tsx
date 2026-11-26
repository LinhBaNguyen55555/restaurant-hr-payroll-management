import { useDraftChanged, useDraftClose } from "./draft-close";
import { useNotice } from "../lib/notice";
import { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Calendar,
  AlertTriangle,
  FileEdit,
  Plus,
  Send,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  api,
  getTimesheetAllowance,
  type TimesheetAllowanceBreakdown,
  type AttendanceStatus,
  type Timesheet,
  type Branch,
  type EmployeeDto,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Modal } from "./experience";
import { addCalendarDays, berlinDate, berlinInstant, berlinTime } from "../lib/work-time";

export function AttendanceView({
  branches, canManage, selfEmployeeId,
}: {
  branches: Branch[];
  canManage: boolean;
  selfEmployeeId?: number | null;
}) {
  const { lang } = useI18n();
  const notify = useNotice();

  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modals
  const [selectedTimesheetForChange, setSelectedTimesheetForChange] = useState<Timesheet | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [allowance, setAllowance] = useState<TimesheetAllowanceBreakdown | null>(null);

  // Live Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!selfEmployeeId) { setLoading(false); return; }
    try {
      const s = await api<AttendanceStatus>("/attendance/status");
      setStatus(s);

      const ts = await api<Timesheet[]>("/attendance/my-timesheet");
      setTimesheets(ts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selfEmployeeId]);

  const handleCheckIn = async () => {
    setActionBusy(true);
    try {
      await api("/attendance/check-in", "POST", { source: "WEB_PORTAL" });
      await loadData();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setActionBusy(true);
    try {
      await api("/attendance/check-out", "POST", { source: "WEB_PORTAL" });
      await loadData();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleStartBreak = async () => {
    setActionBusy(true);
    try {
      await api("/attendance/breaks/start", "POST", { breakType: "STATUTORY_BREAK" });
      await loadData();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleEndBreak = async () => {
    setActionBusy(true);
    try {
      await api("/attendance/breaks/end", "POST", {});
      await loadData();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const formatTimeStr = (iso: string | null) => {
    if (!iso) return "--:--";
    try {
      return berlinTime(iso);
    } catch {
      return iso.slice(11, 16);
    }
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m < 10 ? "0" : ""}${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {canManage && branches.length > 0 && (        <button
          onClick={() => setShowManualModal(true)}
          className="self-start sm:self-center px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold text-sm transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>{lang === "vi" ? "Bổ sung giờ công thủ công" : "Manuelle Nacherfassung"}</span>
        </button>)}
      </div>

      {!selfEmployeeId && <p role="status">{lang === "vi" ? "Tài khoản chưa liên kết hồ sơ nhân viên." : "Kein Mitarbeiterprofil mit diesem Konto verknüpft."}</p>}
      {/* Digital Time Clock Widget */}
      {selfEmployeeId != null && <>
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Clock & Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  status?.isOnBreak
                    ? "bg-amber-500 animate-pulse"
                    : status?.isCheckedIn
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {status?.isOnBreak
                  ? (lang === "vi" ? "Đang trong giờ nghỉ giải lao" : "In gesetzlicher Pause")
                  : status?.isCheckedIn
                  ? (lang === "vi" ? "Đang làm việc trong ca" : "Im aktiven Dienst")
                  : (lang === "vi" ? "Chưa vào ca làm việc" : "Nicht eingestempelt")}
              </span>
            </div>

            <div className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {currentTime.toLocaleTimeString("vi-VN", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <Calendar size={14} />
              <span>
                {currentTime.toLocaleDateString("vi-VN", {
                  timeZone: "Europe/Berlin",
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>•</span>
              <span>Europe/Berlin</span>
            </div>

            {status?.shiftInfo && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                <Clock size={13} />
                <span>Ca hôm nay: {status.shiftInfo}</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {!status?.isCheckedIn ? (
              <button
                disabled={actionBusy}
                onClick={handleCheckIn}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-700/20 hover:shadow-xl transition cursor-pointer flex items-center gap-3 disabled:opacity-50"
              >
                <LogIn size={20} />
                <span>{actionBusy ? (lang === "vi" ? "Đang ghi nhận..." : "Wird erfasst...") : (lang === "vi" ? "Vào ca (Check-in)" : "Einstempeln")}</span>
              </button>
            ) : (
              <>
                {status.isOnBreak ? (
                  <button
                    disabled={actionBusy}
                    onClick={handleEndBreak}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play size={18} />
                    <span>{lang === "vi" ? "Tiếp tục làm việc (Resume)" : "Pause beenden"}</span>
                  </button>
                ) : (
                  <button
                    disabled={actionBusy}
                    onClick={handleStartBreak}
                    className="px-6 py-3.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-bold text-sm shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Coffee size={18} className="text-amber-600 dark:text-amber-400" />
                    <span>{lang === "vi" ? "Nghỉ giải lao (Break)" : "Pause beginnen"}</span>
                  </button>
                )}

                <button
                  disabled={actionBusy}
                  onClick={handleCheckOut}
                  className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-700/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <LogOut size={18} />
                  <span>{lang === "vi" ? "Tan ca (Check-out)" : "Ausstempeln"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live working duration banner when active */}
        {status?.isCheckedIn && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400">{lang === "vi" ? "Giờ vào thực tế: " : "Eingestempelt um: "}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">{formatTimeStr(status.actualStartUtc)}</span>
            </div>
            <div>
              <span className="text-slate-400">{lang === "vi" ? "Thời gian đã làm: " : "Arbeitszeit: "}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatHours(status.workedMinutes || 0)}</span>
            </div>
            <div>
              <span className="text-slate-400">{lang === "vi" ? "Tổng thời gian nghỉ: " : "Pausenzeit: "}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{status.currentBreakMinutes || 0}m</span>
            </div>
          </div>
        )}
      </div>

      {/* Timesheets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History size={18} className="text-emerald-500" />
            <span>{lang === "vi" ? "Bảng chấm công của tôi (Timesheet)" : "Meine Zeiterfassungen"}</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {timesheets.length} {lang === "vi" ? "ngày làm việc gần nhất" : "Einträge"}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-semibold">
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Ngày làm việc" : "Datum"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Ca kế hoạch" : "Dienstplan"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Giờ vào" : "Kommen"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Giờ ra" : "Gehen"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Nghỉ giải lao" : "Pause"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Tổng giờ làm" : "Gesamt"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Trạng thái" : "Status"}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === "vi" ? "Thao tác" : "Aktion"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-slate-400 font-medium">
                      {lang === "vi" ? "Đang tải bảng chấm công..." : "Lade Zeiterfassungen..."}
                    </td>
                  </tr>
                ) : timesheets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-slate-400 font-medium">
                      {lang === "vi" ? "Chưa có bản ghi chấm công nào." : "Keine Zeiteinträge vorhanden."}
                    </td>
                  </tr>
                ) : (
                  timesheets.map((ts) => {
                    const hasInsufficientBreak = ts.exceptions?.some((x) => x.exceptionType === "INSUFFICIENT_BREAK");
                    const hasOvertimeExcess = ts.exceptions?.some((x) => x.exceptionType === "EXCESSIVE_WORK_HOURS");

                    return (
                      <tr key={ts.timesheetId} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {ts.workDate}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {ts.plannedStartUtc
                            ? `${formatTimeStr(ts.plannedStartUtc)} - ${formatTimeStr(ts.plannedEndUtc)}`
                            : (lang === "vi" ? "Ngoài lịch" : "Ungeplant")}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {formatTimeStr(ts.actualStartUtc)}
                          {ts.lateMinutes> 0 && (
                            <span className="ml-1.5 text-rose-500 font-semibold" title={`Trễ ${ts.lateMinutes}m`}>
                              (+{ts.lateMinutes}m)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {formatTimeStr(ts.actualEndUtc)}
                          {ts.earlyDepartureMinutes> 0 && (
                            <span className="ml-1.5 text-amber-500 font-semibold" title={`Về sớm ${ts.earlyDepartureMinutes}m`}>
                              (-{ts.earlyDepartureMinutes}m)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <span className={hasInsufficientBreak ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                            {ts.actualBreakMinutes}m
                          </span>
                          {hasInsufficientBreak && (
                            <span title="Chưa đủ thời gian nghỉ theo ArbZG §4">
                              <AlertTriangle size={14} className="inline ml-1 text-amber-500" />
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <span className={hasOvertimeExcess ? "text-rose-600 dark:text-rose-400" : ""}>
                            {formatHours(ts.workedMinutes)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                              ts.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : ts.status === "LOCKED"
                                ? "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-300"
                                : ts.hasException
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                            }`}
                          >
                            {ts.status === "APPROVED"
                              ? (lang === "vi" ? "Đã duyệt" : "Genehmigt")
                              : ts.status === "LOCKED"
                              ? (lang === "vi" ? "Đã khóa kỳ" : "Gesperrt")
                              : ts.hasException
                              ? (lang === "vi" ? "Cần đối soát" : "Prüfung")
                              : (lang === "vi" ? "Chờ duyệt" : "Offen")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {["APPROVED", "LOCKED"].includes(ts.status) && (
                            <button type="button" className="px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300"
                              onClick={() => getTimesheetAllowance(ts.timesheetId).then(setAllowance).catch((error: Error) => notify(error.message))}>
                              SFN
                            </button>
                          )}
                          <button
                            disabled={ts.isLocked || !ts.actualEndUtc}
                            onClick={() => setSelectedTimesheetForChange(ts)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                          >
                            <FileEdit size={14} />
                            <span>{lang === "vi" ? "Xin sửa giờ" : "Korrektur"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Change Request (Xin điều chỉnh giờ công) */}
      {selectedTimesheetForChange && (
        <ChangeRequestModal
          timesheet={selectedTimesheetForChange}
          onClose={() => setSelectedTimesheetForChange(null)}
          onSuccess={() => {
            setSelectedTimesheetForChange(null);
            loadData();
          }}
        />
      )}

      {allowance && (
        <Modal open title={lang === "vi" ? "Phụ cấp SFN cá nhân" : "Meine SFN-Zuschläge"}
          description={allowance.workDate} onClose={() => setAllowance(null)}>
          <div className="space-y-2 text-sm">
            <p>{lang === "vi" ? "Tổng phụ cấp" : "Zuschläge gesamt"} <strong>{Number(allowance.totalPaidAmountEur).toFixed(2)} €</strong></p>
            {allowance.segments.map((segment) => (
              <div key={segment.segmentId ?? segment.segmentStartBerlin} className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 dark:border-white/10">
                <span>{berlinTime(segment.segmentStartBerlin)}–{berlinTime(segment.segmentEndBerlin)}</span>
                <span>{segment.calculationTrace}</span>
                <span className="text-right">{Number(segment.paidAmountEur).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal: Manual Entry (Bổ sung giờ công thủ công) */}
      </>}
      {showManualModal && (
        <ManualEntryModal
          branches={branches}
          onClose={() => setShowManualModal(false)}
          onSuccess={() => {
            setShowManualModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ChangeRequestModal({
  timesheet,
  onClose,
  onSuccess,
}: {
  timesheet: Timesheet;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const notify = useNotice();

  const [reqStart, setReqStart] = useState(timesheet.actualStartUtc ? berlinTime(timesheet.actualStartUtc) : "09:00");
  const [reqEnd, setReqEnd] = useState(timesheet.actualEndUtc ? berlinTime(timesheet.actualEndUtc) : "17:00");
  const [reqBreak, setReqBreak] = useState(timesheet.actualBreakMinutes ?? 30);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const changed = useDraftChanged([reqStart, reqEnd, reqBreak, reason]);
  const { requestClose, confirmation } = useDraftClose(onClose, busy, () => changed);

  // Calculate delta minutes for escalation preview
  const originalDuration = timesheet.actualStartUtc && timesheet.actualEndUtc
    ? Math.max(0, Math.floor((new Date(timesheet.actualEndUtc).getTime() - new Date(timesheet.actualStartUtc).getTime()) / 60000))
    : 0;

  const [startH, startM] = reqStart.split(":").map(Number);
  const [endH, endM] = reqEnd.split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const newDuration = Math.max(0, (endTotal < startTotal ? endTotal + 1440 : endTotal) - startTotal);
  const deltaMinutes = Math.abs(newDuration - originalDuration);
  const isEscalated = deltaMinutes > 60;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      notify(lang === "vi" ? "Vui lòng nhập lý do điều chỉnh giờ công!" : "Bitte Begründung angeben!");
      return;
    }
    setBusy(true);

    try {
      const workDateStr = timesheet.workDate;
      const startIso = berlinInstant(workDateStr, reqStart);
      const endIso = berlinInstant(reqEnd < reqStart ? addCalendarDays(workDateStr, 1) : workDateStr, reqEnd);

      await api("/reconciliation/change-requests", "POST", {
        timesheetId: timesheet.timesheetId,
        employeeId: timesheet.employeeId,
        requestedStartUtc: startIso,
        requestedEndUtc: endIso,
        requestedBreakMinutes: Number(reqBreak),
        reason,
      });

      notify(lang === "vi" ? "Đã gửi yêu cầu điều chỉnh giờ công thành công!" : "Korrekturantrag erfolgreich eingereicht!");
      onSuccess();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? "Yêu cầu điều chỉnh giờ công" : "Antrag auf Zeitanpassung"}
      description={
        lang === "vi"
          ? "Gửi đơn giải trình điều chỉnh thời gian làm việc hoặc giờ nghỉ khi có sự cố, quên quẹt thẻ hoặc lỗi thiết bị."
          : "Nachträgliche Zeitanpassung bei Versäumnis, technischem Ausfall oder Sonderfällen."
      }
      onClose={requestClose} busy={busy}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Summary Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between text-sm">
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              {lang === "vi" ? "Ngày làm việc: " : "Arbeitstag: "} {timesheet.workDate}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi" ? "Giờ quẹt thẻ gốc (Berlin): " : "Ursprünglich (Berlin): "}
              {timesheet.actualStartUtc ? berlinTime(timesheet.actualStartUtc) : "--:--"} →{" "}
              {timesheet.actualEndUtc ? berlinTime(timesheet.actualEndUtc) : "--:--"} ({timesheet.actualBreakMinutes}m nghỉ)
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-300">
            {timesheet.status}
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="attendance-reqStart" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ vào đề xuất *" : "Kommen soll *"}
            </label>
            <input id="attendance-reqStart"
              type="time"
              required
              value={reqStart}
              onChange={(e) => setReqStart(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="attendance-reqEnd" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ ra đề xuất *" : "Gehen soll *"}
            </label>
            <input id="attendance-reqEnd"
              type="time"
              required
              value={reqEnd}
              onChange={(e) => setReqEnd(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="attendance-reqBreak" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Phút nghỉ đề xuất *" : "Pause soll (Min.) *"}
            </label>
            <input id="attendance-reqBreak"
              type="number"
              min="0"
              max="180"
              required
              value={reqBreak}
              onChange={(e) => setReqBreak(Number(e.target.value))}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="attendance-reason" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Lý do điều chỉnh (bắt buộc) *" : "Begründung (Pflichtfeld) *"}
            </label>
          <textarea id="attendance-reason"
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              lang === "vi"
                ? "Ví dụ: Quên quẹt thẻ khi vào ca, có xác nhận từ bếp trưởng..."
                : "Z.B. Einstempeln vergessen, Bestätigung durch Schichtleitung liegt vor..."
            }
            className="w-full p-3 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
          />
        </div>

        {/* Escalation notice if > 60m */}
        {isEscalated && (
          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {lang === "vi"
                  ? `Chênh lệch thời gian ${deltaMinutes} phút (> 60 phút)`
                  : `Zeitabweichung ${deltaMinutes} Minuten (> 60 Min.)`}
              </div>
              <div className="mt-0.5 text-slate-600 dark:text-slate-400">
                {lang === "vi"
                  ? "Theo quy tắc US-026, yêu cầu chênh lệch trên 60 phút sẽ tự động được chuyển lên cấp HR xác minh bổ sung."
                  : "Gemäß US-026 wird dieser Antrag zur HR-Prüfung eskaliert."}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={requestClose} disabled={busy}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition cursor-pointer"
          >
            {lang === "vi" ? "Hủy bỏ" : "Abbrechen"}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={16} />
            <span>{busy ? (lang === "vi" ? "Đang gửi..." : "Wird gesendet...") : (lang === "vi" ? "Gửi yêu cầu điều chỉnh" : "Antrag einreichen")}</span>
          </button>
        </div>
      </form>
      {confirmation}
    </Modal>
  );
}

function ManualEntryModal({
  branches,
  onClose,
  onSuccess,
}: {
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const notify = useNotice();

  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [workDate, setWorkDate] = useState(berlinDate());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMins, setBreakMins] = useState(30);
  const [breakStart, setBreakStart] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmployees([]);
    setEmployeeId(0);
    if (!branchId) return;
    let cancelled = false;
    api<EmployeeDto[]>("/workforce/employees?branchId=" + encodeURIComponent(branchId))
      .then((list) => {
        if (!cancelled && list.length > 0) {
          setEmployees(list);
          setEmployeeId(list[0].employeeId);
        }
      })
      .catch((err) => { if (!cancelled) console.error(err); });
    return () => { cancelled = true; };
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      notify(lang === "vi" ? "Bắt buộc phải nhập lý do bổ sung giờ công!" : "Bitte Begründung angeben!");
      return;
    }
    setBusy(true);

    try {
      const startIso = berlinInstant(workDate, startTime);
      const endIso = berlinInstant(endTime < startTime ? addCalendarDays(workDate, 1) : workDate, endTime);

      await api("/attendance/manual-entry", "POST", {
        branchId,
        employeeId,
        workDate,
        startUtc: startIso,
        endUtc: endIso,
        breakMinutes: breakMins,
        breakStartUtc: breakMins > 0 && breakStart ? berlinInstant(breakStart < startTime && endTime < startTime ? addCalendarDays(workDate, 1) : workDate, breakStart) : undefined,
        reason,
      });

      notify(lang === "vi" ? "Bổ sung giờ công thủ công thành công!" : "Manuelle Zeiterfassung erfolgreich hinzugefügt!");
      onSuccess();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? "Bổ sung giờ công thủ công (F04.05)" : "Manuelle Nacherfassung (F04.05)"}
      description={
        lang === "vi"
          ? "Dành cho Quản lý / HR bổ sung giờ làm việc khi có sự cố kỹ thuật hoặc mất mạng. Mọi thay đổi đều lưu audit trail."
          : "Nachträgliches Hinzufügen von Zeiteinträgen mit Prüfpfad."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="attendance-branchId" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Chi nhánh làm việc *" : "Niederlassung *"}
            </label>
            <select id="attendance-branchId"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="attendance-employeeId" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Nhân viên *" : "Mitarbeiter/in *"}
            </label>
            <select id="attendance-employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId} className="dark:bg-slate-900">
                  {emp.displayName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="attendance-workDate" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Ngày làm *" : "Datum *"}
            </label>
            <input id="attendance-workDate"
              type="date"
              required
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="attendance-startTime" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ vào *" : "Kommen *"}
            </label>
            <input id="attendance-startTime"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="attendance-endTime" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Giờ ra *" : "Gehen *"}
            </label>
            <input id="attendance-endTime"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="attendance-breakMins" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Nghỉ (phút) *" : "Pause (Min.) *"}
            </label>
            <input id="attendance-breakMins"
              type="number"
              min="0"
              max="180"
              required
              value={breakMins}
              onChange={(e) => setBreakMins(Number(e.target.value))}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {breakMins > 0 && (
          <label className="grid gap-1 text-sm">
            {lang === "vi" ? "Bắt đầu nghỉ (để tính SFN)" : "Pausenbeginn (für SFN)"}
            <input type="time" value={breakStart} onChange={(event) => setBreakStart(event.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-white/10 dark:bg-white/5" />
          </label>
        )}
        <div>
          <label htmlFor="attendance-reason-2" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {lang === "vi" ? "Căn cứ & Lý do bổ sung (bắt buộc) *" : "Begründung & Nachweis *"}
            </label>
          <textarea id="attendance-reason-2"
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              lang === "vi"
                ? "Ghi rõ sự cố thiết bị hoặc xác nhận ca làm..."
                : "Begründung für die manuelle Nacherfassung..."
            }
            className="w-full p-3 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition cursor-pointer"
          >
            {lang === "vi" ? "Hủy bỏ" : "Abbrechen"}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>{busy ? (lang === "vi" ? "Đang lưu..." : "Wird gespeichert...") : (lang === "vi" ? "Xác nhận bổ sung" : "Erfassen")}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
