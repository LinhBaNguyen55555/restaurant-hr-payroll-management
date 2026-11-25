import { useState, useEffect } from "react";
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Filter,
  Check,
  Building,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import {
  api,
  type ReconciliationKpi,
  type ReconciliationItem,
  type AttendanceChangeRequest,
  type Branch,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Modal } from "./experience";

export function ReconciliationView({
  branches,
  currentUserId,
}: {
  branches: Branch[];
  currentUserId?: string;
}) {
  const { lang } = useI18n();

  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches[0]?.id ? Number(branches[0].id) : 1
  );
  const [activeTab, setActiveTab] = useState<"reconcile" | "requests" | "lock">("reconcile");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [kpis, setKpis] = useState<ReconciliationKpi | null>(null);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<AttendanceChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedRequestToDecide, setSelectedRequestToDecide] = useState<AttendanceChangeRequest | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<ReconciliationItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const k = await api<ReconciliationKpi>(`/reconciliation/kpis?branchId=${selectedBranchId}`);
      setKpis(k);

      const itms = await api<ReconciliationItem[]>(
        `/reconciliation/items?branchId=${selectedBranchId}&filterStatus=${statusFilter}`
      );
      setItems(itms);

      const reqs = await api<AttendanceChangeRequest[]>(
        `/reconciliation/change-requests?branchId=${selectedBranchId}&statusFilter=ALL`
      );
      setChangeRequests(reqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, statusFilter]);

  const handleApproveDirect = async (timesheetId: number) => {
    try {
      await api(`/reconciliation/timesheets/${timesheetId}/approve`, "POST", {});
      await loadData();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.abs(minutes % 60);
    return `${h}h ${m < 10 ? "0" : ""}${m}m`;
  };

  const formatTimeStr = (iso: string | null) => {
    if (!iso) return "--:--";
    try {
      return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso.slice(11, 16);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === "vi" ? "Đối soát & Phê duyệt giờ công (F05)" : "Soll-Ist-Abgleich & Genehmigung (F05)"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lang === "vi"
              ? "Đối chiếu 3 trục giữa Lịch ca kế hoạch và Giờ quẹt thẻ thực tế. Kiểm soát phân tách nhiệm vụ (SoD)."
              : "Drei-Achsen-Abgleich von Plan- und Ist-Zeiten. Einhaltung von Funktionstrennung (SoD)."}
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <Building size={16} className="text-slate-400" />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            className="h-10 px-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-emerald-950/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-slate-900">
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === "vi" ? "Tổng giờ công thực tế" : "Gesamtarbeitszeit"}</span>
            <Clock size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {formatHours(kpis?.totalWorkedMinutes || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {kpis?.totalTimesheets || 0} {lang === "vi" ? "ca làm việc" : "Einsätze"}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === "vi" ? "Tổng giờ làm thêm (OT)" : "Überstunden"}</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            +{formatHours(kpis?.totalOvertimeMinutes || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {lang === "vi" ? "Đi muộn: " : "Verspätung: "} {formatHours(kpis?.totalLateMinutes || 0)}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === "vi" ? "Bất thường chờ xử lý" : "Offene Abweichungen"}</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {kpis?.openExceptionsCount || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {lang === "vi" ? "Vi phạm ArbZG hoặc đi muộn" : "ArbZG & Verspätungen"}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === "vi" ? "Đơn xin sửa giờ" : "Korrekturanträge"}</span>
            <ShieldAlert size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
            {kpis?.pendingRequestsCount || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {lang === "vi" ? "Yêu cầu từ nhân viên" : "Anträge ausstehend"}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 gap-4">
        <div className="flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("reconcile")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "reconcile"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck size={16} />
            <span>{lang === "vi" ? "Bảng đối soát ca" : "Soll-Ist-Vergleich"}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-white/10">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "requests"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <UserCheck size={16} />
            <span>{lang === "vi" ? "Đơn xin sửa giờ" : "Korrekturanträge"}</span>
            {changeRequests.filter((r) => r.status === "PENDING" || r.status === "HR_ESCALATED").length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                {changeRequests.filter((r) => r.status === "PENDING" || r.status === "HR_ESCALATED").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("lock")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "lock"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Lock size={16} />
            <span>{lang === "vi" ? "Khóa kỳ chấm công" : "Periodenabschluss"}</span>
          </button>
        </div>

        {activeTab === "reconcile" && (
          <div className="flex items-center gap-2 pb-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-emerald-950/40 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">{lang === "vi" ? "Tất cả trạng thái" : "Alle Status"}</option>
              <option value="PENDING_APPROVAL">{lang === "vi" ? "Chờ duyệt" : "Ausstehend"}</option>
              <option value="APPROVED">{lang === "vi" ? "Đã duyệt" : "Genehmigt"}</option>
              <option value="LOCKED">{lang === "vi" ? "Đã khóa" : "Gesperrt"}</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Reconciliation Table */}
      {activeTab === "reconcile" && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  <th className="py-3.5 px-4">{lang === "vi" ? "Nhân viên & Ngày" : "Mitarbeiter & Tag"}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Ca kế hoạch (Soll)" : "Soll-Arbeitszeit"}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Thực tế chấm công (Ist)" : "Ist-Arbeitszeit"}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Chênh lệch (Delta)" : "Abweichung"}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Cảnh báo / Ngoại lệ" : "Warnungen / ArbZG"}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Trạng thái" : "Status"}</th>
                  <th className="py-3.5 px-4 text-right">{lang === "vi" ? "Thao tác" : "Aktion"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      {lang === "vi" ? "Đang tải dữ liệu đối soát..." : "Lade Abgleichdaten..."}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      {lang === "vi" ? "Không có ca làm việc nào trong kỳ đối soát." : "Keine Einträge vorhanden."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    return (
                      <tr key={item.timesheetId} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.employeeName}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-emerald-500 font-semibold">{item.employeeCode}</span>
                            <span>•</span>
                            <span>{item.workDate}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono">
                          {item.plannedStartUtc ? (
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatTimeStr(item.plannedStartUtc)} - {formatTimeStr(item.plannedEndUtc)}
                              </span>
                              <div className="text-slate-400 mt-0.5">
                                {item.plannedBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"}
                              </div>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">{lang === "vi" ? "Không có lịch" : "Ungeplant"}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono">
                          {item.actualStartUtc ? (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatTimeStr(item.actualStartUtc)} - {formatTimeStr(item.actualEndUtc)}
                              </span>
                              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {formatHours(item.workedMinutes)} ({item.actualBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"})
                              </div>
                            </div>
                          ) : (
                            <span className="text-rose-500 font-semibold">{lang === "vi" ? "Chưa có giờ ra" : "Kein Ausstempeln"}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono">
                          {item.deltaMinutes !== 0 ? (
                            <span className={`font-bold ${item.deltaMinutes > 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {item.deltaMinutes > 0 ? `+${item.deltaMinutes}m` : `${item.deltaMinutes}m`}
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold">0m</span>
                          )}
                          {item.lateMinutes > 0 && (
                            <div className="text-rose-500 text-[11px] font-semibold mt-0.5">
                              {lang === "vi" ? `Trễ: ${item.lateMinutes}m` : `Verspätung: ${item.lateMinutes}m`}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {item.exceptions && item.exceptions.length > 0 ? (
                            <div className="space-y-1">
                              {item.exceptions.map((ex) => (
                                <div
                                  key={ex.exceptionId}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                                >
                                  <AlertTriangle size={12} className="text-amber-600" />
                                  <span>{lang === "vi" ? ex.descriptionVi : ex.descriptionDe}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={14} />
                              <span>{lang === "vi" ? "Chuẩn ArbZG" : "Konform"}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : item.status === "LOCKED"
                                ? "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                            }`}
                          >
                            {item.status === "APPROVED"
                              ? (lang === "vi" ? "Đã duyệt" : "Genehmigt")
                              : item.status === "LOCKED"
                              ? (lang === "vi" ? "Đã khóa" : "Gesperrt")
                              : (lang === "vi" ? "Chờ duyệt" : "Ausstehend")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status !== "APPROVED" && item.status !== "LOCKED" && (
                              <button
                                disabled={Boolean(currentUserId && (item.employeeId?.toString() === currentUserId || item.employeeCode === currentUserId))}
                                title={
                                  Boolean(currentUserId && (item.employeeId?.toString() === currentUserId || item.employeeCode === currentUserId))
                                    ? (lang === "vi" ? "Vi phạm SoD: Không thể tự duyệt ca của chính mình" : "SoD: Keine Selbstgenehmigung")
                                    : ""
                                }
                                onClick={() => handleApproveDirect(item.timesheetId)}
                                className={`px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs inline-flex items-center gap-1.5 transition ${
                                  Boolean(currentUserId && (item.employeeId?.toString() === currentUserId || item.employeeCode === currentUserId))
                                    ? "bg-slate-300 dark:bg-white/10 text-slate-400 cursor-not-allowed opacity-60"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                }`}
                              >
                                <Check size={14} />
                                <span>{lang === "vi" ? "Duyệt" : "Freigeben"}</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedItemDetail(item)}
                              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                            >
                              {lang === "vi" ? "Chi tiết" : "Details"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Change Requests List */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {changeRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              {lang === "vi" ? "Không có yêu cầu điều chỉnh nào cần xử lý." : "Keine offenen Korrekturanträge."}
            </div>
          ) : (
            changeRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {req.employeeName}
                    </span>
                    <span className="font-mono text-xs text-slate-400">({req.employeeCode})</span>
                    {req.requiresHrEscalation && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <ShieldAlert size={12} />
                        <span>{lang === "vi" ? "Lệch > 60p (Cần HR duyệt)" : "Eskaliert an HR (> 60m)"}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-slate-400">{lang === "vi" ? "Giờ quẹt ban đầu: " : "Bisher: "}</span>
                      <span className="font-mono font-semibold">
                        {formatTimeStr(req.currentStartUtc)} - {formatTimeStr(req.currentEndUtc)}
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-emerald-500" />
                    <div>
                      <span className="text-slate-400">{lang === "vi" ? "Giờ xin sửa: " : "Beantragt: "}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatTimeStr(req.requestedStartUtc)} - {formatTimeStr(req.requestedEndUtc)} ({req.requestedBreakMinutes}m {lang === "vi" ? "nghỉ" : "Pause"})
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {lang === "vi" ? "Lý do: " : "Begründung: "}
                    </span>
                    <span className="italic">"{req.reason}"</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {req.status === "PENDING" || req.status === "HR_ESCALATED" ? (
                    <button
                      onClick={() => setSelectedRequestToDecide(req)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Check size={14} />
                      <span>{lang === "vi" ? "Xem xét & Duyệt" : "Prüfen & Entscheiden"}</span>
                    </button>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}
                    >
                      {req.status === "APPROVED"
                        ? (lang === "vi" ? "Đã duyệt" : "Genehmigt")
                        : (lang === "vi" ? "Đã từ chối" : "Abgelehnt")}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Period Locking */}
      {activeTab === "lock" && (
        <PeriodLockingCard
          branchId={selectedBranchId}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal: Decide Change Request */}
      {selectedRequestToDecide && (
        <DecideRequestModal
          request={selectedRequestToDecide}
          onClose={() => setSelectedRequestToDecide(null)}
          onSuccess={() => {
            setSelectedRequestToDecide(null);
            loadData();
          }}
        />
      )}

      {/* Modal: Item Details */}
      {selectedItemDetail && (
        <TimesheetDetailModal
          item={selectedItemDetail}
          onClose={() => setSelectedItemDetail(null)}
        />
      )}
    </div>
  );
}

function DecideRequestModal({
  request,
  onClose,
  onSuccess,
}: {
  request: AttendanceChangeRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await api(`/reconciliation/change-requests/${request.requestId}/approve`, "POST", { notes });
      alert(lang === "vi" ? "Đã phê duyệt điều chỉnh giờ công thành công!" : "Korrekturantrag erfolgreich genehmigt!");
      onSuccess();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await api(`/reconciliation/change-requests/${request.requestId}/reject`, "POST", { notes });
      alert(lang === "vi" ? "Đã từ chối yêu cầu điều chỉnh giờ công." : "Korrekturantrag abgelehnt.");
      onSuccess();
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
      title={lang === "vi" ? "Xét duyệt đơn điều chỉnh giờ công" : "Korrekturantrag entscheiden"}
      description={
        lang === "vi"
          ? "Kiểm tra tính hợp lệ và tuân thủ nguyên tắc SoD (Quản lý không tự duyệt cho bản thân)."
          : "Prüfung auf Funktionstrennung (SoD) und gesetzliche Arbeitszeitregeln."
      }
      onClose={onClose}
    >
      <div className="space-y-4 pt-1">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-2 text-sm">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span>{request.employeeName} ({request.employeeCode})</span>
            {request.requiresHrEscalation && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Lệch {request.deltaMinutes}m (Cần quyền HR)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "vi" ? "Lý do nhân viên gửi: " : "Begründung: "}
            <span className="font-medium text-slate-800 dark:text-slate-200">"{request.reason}"</span>
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            {lang === "vi" ? "Ghi chú phê duyệt / Căn cứ xét duyệt" : "Entscheidungsbegründung"}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === "vi" ? "Đã xác nhận với trưởng ca / đúng thực tế..." : "Bestätigung liegt vor..."}
            className="w-full p-3 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition cursor-pointer"
          >
            {lang === "vi" ? "Đóng" : "Schließen"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleReject}
            className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-sm transition cursor-pointer disabled:opacity-50"
          >
            {lang === "vi" ? "Từ chối" : "Ablehnen"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleApprove}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Check size={16} />
            <span>{lang === "vi" ? "Phê duyệt" : "Genehmigen"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PeriodLockingCard({
  branchId,
  onSuccess,
}: {
  branchId: number;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const [lockDate, setLockDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const handleLock = async () => {
    if (!confirm(lang === "vi" ? `Xác nhận khóa kỳ công đến hết ngày ${lockDate}? Sau khi khóa sẽ không thể sửa đổi trực tiếp.` : `Konto bis ${lockDate} abschließen?`)) {
      return;
    }
    setBusy(true);
    try {
      await api("/reconciliation/lock-period", "POST", { branchId, lockUpToDate: lockDate });
      alert(lang === "vi" ? "Đã chốt và khóa kỳ công thành công!" : "Periode erfolgreich gesperrt!");
      onSuccess();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-emerald-950/20 max-w-xl space-y-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200">
          <Lock size={20} />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {lang === "vi" ? "Khóa kỳ chấm công (Period Lock)" : "Monatsabschluss / Sperrung"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === "vi"
              ? "Bảo vệ toàn vẹn dữ liệu trước khi chuyển sang tính bảng lương (Payroll). Sau khi khóa, chỉ có thể sửa đổi bằng bản ghi hồi tố có phê duyệt."
              : "Verhindert nachträgliche Änderungen vor dem Payroll-Lauf."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
          {lang === "vi" ? "Khóa đến hết ngày *" : "Stichtag *"}
        </label>
        <input
          type="date"
          value={lockDate}
          onChange={(e) => setLockDate(e.target.value)}
          className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      <div className="pt-2">
        <button
          disabled={busy}
          onClick={handleLock}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Lock size={16} />
          <span>{busy ? (lang === "vi" ? "Đang xử lý..." : "Wird gesperrt...") : (lang === "vi" ? "Xác nhận khóa kỳ công" : "Periode sperren")}</span>
        </button>
      </div>
    </div>
  );
}

function TimesheetDetailModal({
  item,
  onClose,
}: {
  item: ReconciliationItem;
  onClose: () => void;
}) {
  const { lang } = useI18n();

  return (
    <Modal
      open={true}
      wide={true}
      title={lang === "vi" ? `Chi tiết đối soát: ${item.employeeName}` : `Abgleichdetails: ${item.employeeName}`}
      description={`${item.employeeCode} • ${item.workDate} • ${item.positionName}`}
      onClose={onClose}
    >
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <span className="text-slate-400 block font-semibold mb-1">
              {lang === "vi" ? "Ca kế hoạch (Dienstplan)" : "Soll-Plan"}
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              {item.plannedStartUtc ? `${item.plannedStartUtc.slice(11, 16)} - ${item.plannedEndUtc?.slice(11, 16)}` : "Ngoài lịch"}
            </div>
            <div className="text-slate-500 mt-1">{item.plannedBreakMinutes}m nghỉ quy định</div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <span className="text-slate-400 block font-semibold mb-1">
              {lang === "vi" ? "Thực tế quẹt thẻ" : "Ist-Erfassung"}
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              {item.actualStartUtc ? `${item.actualStartUtc.slice(11, 16)} - ${item.actualEndUtc?.slice(11, 16)}` : "Chưa có giờ ra"}
            </div>
            <div className="text-slate-500 mt-1">{item.actualBreakMinutes}m nghỉ thực tế</div>
          </div>
        </div>

        {item.exceptions && item.exceptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {lang === "vi" ? "Danh sách cảnh báo luật lao động" : "ArbZG-Abweichungen"}
            </h4>
            <div className="space-y-1.5">
              {item.exceptions.map((ex) => (
                <div
                  key={ex.exceptionId}
                  className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950 dark:text-amber-200">
                      {lang === "vi" ? ex.descriptionVi : ex.descriptionDe}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Loại: {ex.exceptionType} • Mức độ: {ex.severity} • Trạng thái: {ex.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition cursor-pointer"
          >
            {lang === "vi" ? "Đóng" : "Schließen"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
