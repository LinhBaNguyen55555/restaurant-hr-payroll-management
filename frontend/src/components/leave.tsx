import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldAlert,
  FileText,
  HeartPulse,
  CalendarCheck,
  AlertCircle,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import {
  getLeaveTypes,
  getLeaveBalances,
  getLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getSicknessAbsences,
  recordSicknessAbsence,
  getCompensatoryRest,
  completeCompensatoryRest,
  type LeaveType,
  type LeaveBalance,
  type LeaveRequest,
  type SicknessAbsence,
  type CompensatoryRest,
  type Branch,
  api,
  type EmployeeDto,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

export function LeaveView({
  branches: _branches,
  currentUserId: _currentUserId,
}: {
  branches: Branch[];
  currentUserId?: string;
}) {
  const { lang } = useI18n();
  const [tab, setTab] = useState<"balances" | "requests" | "sickness" | "compensatory">("balances");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Data states
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [sicknessList, setSicknessList] = useState<SicknessAbsence[]>([]);
  const [compensatoryList, setCompensatoryList] = useState<CompensatoryRest[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSicknessModal, setShowSicknessModal] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{
    request: LeaveRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  // Form states
  const [reqEmpId, setReqEmpId] = useState<number>(0);
  const [reqTypeCode, setReqTypeCode] = useState<string>("ANNUAL");
  const [reqStartDate, setReqStartDate] = useState<string>("");
  const [reqEndDate, setReqEndDate] = useState<string>("");
  const [reqReason, setReqReason] = useState<string>("");

  const [sickEmpId, setSickEmpId] = useState<number>(0);
  const [sickStartDate, setSickStartDate] = useState<string>("");
  const [sickEndDate, setSickEndDate] = useState<string>("");
  const [sickEauNumber, setSickEauNumber] = useState<string>("");
  const [sickIsChild, setSickIsChild] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, bList, rList, sList, cList, empList] = await Promise.all([
        getLeaveTypes().catch(() => []),
        getLeaveBalances().catch(() => []),
        getLeaveRequests().catch(() => []),
        getSicknessAbsences().catch(() => []),
        getCompensatoryRest().catch(() => []),
        api<EmployeeDto[]>("/api/workforce/employees").catch(() => []),
      ]);
      setLeaveTypes(tList);
      setBalances(bList);
      setRequests(rList);
      setSicknessList(sList);
      setCompensatoryList(cList);
      setEmployees(empList);

      if (empList.length > 0) {
        if (!reqEmpId) setReqEmpId(empList[0].employeeId);
        if (!sickEmpId) setSickEmpId(empList[0].employeeId);
      }
    } catch (e: any) {
      setToast(e.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async () => {
    if (!reqStartDate || !reqEndDate) {
      setToast(lang === "vi" ? "Vui lòng chọn ngày bắt đầu và kết thúc!" : "Bitte Start- und Enddatum wählen!");
      return;
    }
    try {
      await createLeaveRequest({
        employeeId: reqEmpId || undefined,
        leaveTypeCode: reqTypeCode,
        startDate: reqStartDate,
        endDate: reqEndDate,
        reason: reqReason,
      });
      setShowRequestModal(false);
      setReqReason("");
      setToast(lang === "vi" ? "Đã gửi đơn xin nghỉ thành công!" : "Urlaubsantrag erfolgreich übermittelt!");
      await loadData();
    } catch (e: any) {
      setToast(e.message || "Lỗi gửi đơn");
    }
  };

  const handleRecordSickness = async () => {
    if (!sickEmpId || !sickStartDate || !sickEndDate) {
      setToast(lang === "vi" ? "Vui lòng chọn nhân viên và khoảng thời gian!" : "Bitte Mitarbeiter und Zeitraum wählen!");
      return;
    }
    try {
      await recordSicknessAbsence({
        employeeId: sickEmpId,
        startDate: sickStartDate,
        endDate: sickEndDate,
        eauReferenceNumber: sickEauNumber || undefined,
        isChildSickLeave: sickIsChild,
      });
      setShowSicknessModal(false);
      setSickEauNumber("");
      setToast(lang === "vi" ? "Đã ghi nhận nghỉ ốm eAU (EntgFG) thành công!" : "Krankmeldung (EntgFG) erfolgreich erfasst!");
      await loadData();
    } catch (e: any) {
      setToast(e.message || "Lỗi ghi nhận nghỉ ốm");
    }
  };

  const handleDecision = async () => {
    if (!decisionModal) return;
    try {
      if (decisionModal.action === "approve") {
        await approveLeaveRequest(decisionModal.request.requestId, decisionNote);
        setToast(lang === "vi" ? "Đã phê duyệt đơn nghỉ phép!" : "Urlaubsantrag genehmigt!");
      } else {
        await rejectLeaveRequest(decisionModal.request.requestId, decisionNote);
        setToast(lang === "vi" ? "Đã từ chối đơn nghỉ phép!" : "Urlaubsantrag abgelehnt!");
      }
      setDecisionModal(null);
      setDecisionNote("");
      await loadData();
    } catch (e: any) {
      setToast(e.message || "Lỗi xử lý đơn");
    }
  };

  const handleCompleteCompensatory = async (restId: number) => {
    try {
      await completeCompensatoryRest(restId);
      setToast(lang === "vi" ? "Đã xác nhận bố trí ngày nghỉ bù (§ 11 ArbZG)!" : "Ersatzruhetag (§ 11 ArbZG) bestätigt!");
      await loadData();
    } catch (e: any) {
      setToast(e.message || "Lỗi cập nhật nghỉ bù");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-xl border border-neutral-700 animate-fade-in">
          <AlertCircle size={18} className="text-amber-400" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CalendarCheck className="text-emerald-600" />
            {lang === "vi" ? "Nghỉ phép, Nghỉ ốm & Nghỉ bù (F06)" : "Urlaub, Krankheit & Ersatzruhetage (F06)"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {lang === "vi"
              ? "Tuân thủ Chuẩn Luật Lao động CHLB Đức (BUrlG, EntgFG, ArbZG §11)"
              : "Rechtskonforme Abwicklung nach deutschem Arbeitsrecht (BUrlG, EntgFG, § 11 ArbZG)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Plus size={16} />
            {lang === "vi" ? "Nộp đơn xin nghỉ" : "Urlaubsantrag stellen"}
          </button>
          <button
            onClick={() => setShowSicknessModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            <HeartPulse size={16} />
            {lang === "vi" ? "Ghi nhận nghỉ ốm eAU" : "Krankmeldung (eAU)"}
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            title={lang === "vi" ? "Tải lại dữ liệu" : "Aktualisieren"}
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-neutral-400" : ""} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setTab("balances")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "balances"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <CalendarDays size={16} />
          {lang === "vi" ? "Số dư phép năm (BUrlG)" : "Urlaubsanspruch (BUrlG)"}
        </button>

        <button
          onClick={() => setTab("requests")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition relative ${
            tab === "requests"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <FileText size={16} />
          {lang === "vi" ? "Đơn xin nghỉ & Phê duyệt" : "Anträge & Genehmigungen"}
          {requests.filter(r => r.status === "PENDING").length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
              {requests.filter(r => r.status === "PENDING").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("sickness")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "sickness"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <HeartPulse size={16} />
          {lang === "vi" ? "Nghỉ ốm (EntgFG / DSGVO)" : "Krankmeldungen (EntgFG)"}
        </button>

        <button
          onClick={() => setTab("compensatory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition relative ${
            tab === "compensatory"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Clock size={16} />
          {lang === "vi" ? "Hạn nghỉ bù (§ 11 ArbZG)" : "Ersatzruhetage (§ 11 ArbZG)"}
          {compensatoryList.filter(c => !c.isCompleted && c.isOverdue).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose-500 text-white rounded-full">
              {compensatoryList.filter(c => !c.isCompleted && c.isOverdue).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Balances */}
      {tab === "balances" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {lang === "vi" ? "Quy định BUrlG CHLB Đức" : "Gesetzlicher Mindesturlaub"}
              </span>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">20 - 24 {lang === "vi" ? "ngày/năm" : "Tage/Jahr"}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {lang === "vi"
                  ? "Tối thiểu 24 ngày làm việc (tuần 6 ngày) hoặc 20 ngày (tuần 5 ngày) theo §3 BUrlG."
                  : "Mindestens 24 Werktage bei 6-Tage-Woche bzw. 20 Arbeitstage bei 5-Tage-Woche (§ 3 BUrlG)."}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {lang === "vi" ? "Hạn chuyển phép dư (Übertrag)" : "Verfall & Übertragungsfrist"}
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">31. März 2027</p>
              <p className="text-xs text-neutral-500 mt-1">
                {lang === "vi"
                  ? "Phép tồn năm trước được bảo lưu tối đa đến hết ngày 31/03 năm kế tiếp theo §7(3) BUrlG."
                  : "Übertragener Resturlaub verfällt nach § 7 Abs. 3 BUrlG grundsätzlich zum 31.03."}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {lang === "vi" ? "Phân loại phép" : "Urlaubsarten"}
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{leaveTypes.length} {lang === "vi" ? "loại phép" : "Arten"}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {lang === "vi"
                  ? "Phép năm, Nghỉ đặc biệt (§616 BGB), Nghỉ việc riêng, Nghỉ đào tạo nghề."
                  : "Erholungsurlaub, Sonderurlaub (§ 616 BGB), Unbezahlter Urlaub, Bildungsurlaub."}
              </p>
            </div>
          </div>

          {/* Balance Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {lang === "vi" ? "Bảng theo dõi số dư phép nhân sự (Năm 2026)" : "Urlaubskonten der Mitarbeitenden (2026)"}
              </h3>
              <span className="text-xs text-neutral-500">
                {balances.length} {lang === "vi" ? "bản ghi" : "Einträge"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{lang === "vi" ? "Mã NV" : "Mitarbeiter-ID"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Loại phép" : "Urlaubsart"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Được hưởng" : "Anspruch"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Chuyển sang" : "Übertrag"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Đã nghỉ" : "Genommen"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Đang chờ duyệt" : "Beantragt"}</th>
                    <th className="px-5 py-3 text-right font-bold text-emerald-600">{lang === "vi" ? "Còn lại" : "Resturlaub"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Hạn sử dụng" : "Verfall"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-neutral-500">
                        {lang === "vi" ? "Chưa có dữ liệu số dư phép" : "Keine Urlaubskonten vorhanden"}
                      </td>
                    </tr>
                  ) : (
                    balances.map((b) => (
                      <tr key={b.balanceId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="px-5 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                          EMP-{b.employeeId}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800">
                            {b.leaveTypeNameVi || b.leaveTypeCode}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">{b.entitledDays} {lang === "vi" ? "ngày" : "T."}</td>
                        <td className="px-5 py-3 text-right text-neutral-500">+{b.carriedOverDays}</td>
                        <td className="px-5 py-3 text-right text-neutral-500">-{b.takenDays}</td>
                        <td className="px-5 py-3 text-right text-amber-600">{b.pendingDays}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {b.remainingDays} {lang === "vi" ? "ngày" : "Tage"}
                        </td>
                        <td className="px-5 py-3 text-neutral-500 text-xs">
                          {b.expiryDate ? b.expiryDate : "31.12.2026"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Requests & Approvals */}
      {tab === "requests" && (
        <div className="space-y-4">
          {/* Segregation of Duties Notice */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
            <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                {lang === "vi" ? "Nguyên tắc Phân tách nhiệm vụ (Segregation of Duties - SoD)" : "Funktionstrennung (Segregation of Duties)"}
              </span>
              <p className="text-amber-800 dark:text-amber-400 text-xs mt-0.5">
                {lang === "vi"
                  ? "Quản lý và cấp phê duyệt không được phép tự duyệt đơn xin nghỉ phép của chính mình. Đơn của Quản lý phải do Admin hoặc Quản lý cấp trên phê duyệt."
                  : "Führungskräfte können eigene Urlaubsanträge nicht selbst genehmigen. Diese müssen durch die übergeordnete Stelle freigegeben werden."}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {lang === "vi" ? "Danh sách đơn xin nghỉ phép" : "Urlaubsanträge"}
              </h3>
              <span className="text-xs text-neutral-500">
                {requests.length} {lang === "vi" ? "đơn" : "Anträge"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{lang === "vi" ? "Mã đơn" : "ID"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Nhân viên" : "Mitarbeiter"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Loại nghỉ" : "Art"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Thời gian" : "Zeitraum"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Số ngày" : "Tage"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Lý do" : "Grund"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Trạng thái" : "Status"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Thao tác" : "Aktionen"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-neutral-500">
                        {lang === "vi" ? "Chưa có đơn xin nghỉ phép nào" : "Keine Urlaubsanträge vorhanden"}
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => {
                      const isPending = r.status === "PENDING";
                      return (
                        <tr key={r.requestId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="px-5 py-3 font-mono text-xs">#{r.requestId}</td>
                          <td className="px-5 py-3">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{r.employeeName}</span>
                            <span className="block text-xs text-neutral-400">{r.employeeCode}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800">
                              {r.leaveTypeNameVi || r.leaveTypeCode}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {r.startDate} ➔ {r.endDate}
                          </td>
                          <td className="px-5 py-3 text-right font-medium">
                            {r.totalDays} {lang === "vi" ? "ngày" : "T."}
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-500 max-w-[200px] truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="px-5 py-3">
                            {r.status === "PENDING" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                                {lang === "vi" ? "Chờ duyệt" : "Ausstehend"}
                              </span>
                            )}
                            {r.status === "APPROVED" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                                {lang === "vi" ? "Đã duyệt" : "Genehmigt"}
                              </span>
                            )}
                            {r.status === "REJECTED" && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                                {lang === "vi" ? "Từ chối" : "Abgelehnt"}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setDecisionModal({ request: r, action: "approve" })}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition"
                                >
                                  {lang === "vi" ? "Duyệt" : "Genehmigen"}
                                </button>
                                <button
                                  onClick={() => setDecisionModal({ request: r, action: "reject" })}
                                  className="px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-medium transition"
                                >
                                  {lang === "vi" ? "Từ chối" : "Ablehnen"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-400">
                                {r.decidedByUserName ? `${r.decidedByUserName}` : "—"}
                              </span>
                            )}
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
      )}

      {/* Tab 3: Sickness Absences (EntgFG / DSGVO) */}
      {tab === "sickness" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3">
            <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <span className="font-semibold text-blue-900 dark:text-blue-300">
                {lang === "vi" ? "Bảo vệ dữ liệu y tế theo quy định DSGVO / GDPR & EntgFG" : "DSGVO-Konformität & Entgeltfortzahlung (EntgFG)"}
              </span>
              <p className="text-blue-800 dark:text-blue-400 text-xs mt-0.5">
                {lang === "vi"
                  ? "Hệ thống tuyệt đối KHÔNG lưu trữ chẩn đoán bệnh lý y tế (mã ICD-10) hay thông tin lâm sàng. Chỉ lưu mã chứng thực điện tử eAU từ bảo hiểm y tế và mốc thời gian để tính lương 100% trong 6 tuần theo Luật EntgFG."
                  : "Es werden keine Diagnosen (ICD-10-Codes) gespeichert. Die Erfassung dient ausschließlich dem Anspruch auf 100 % Entgeltfortzahlung bis zu 6 Wochen gemäß EntgFG via eAU-Abruf."}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {lang === "vi" ? "Danh sách ghi nhận nghỉ ốm eAU" : "Erfasste Krankmeldungen (eAU)"}
              </h3>
              <span className="text-xs text-neutral-500">
                {sicknessList.length} {lang === "vi" ? "bản ghi" : "Fälle"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{lang === "vi" ? "Mã hồ sơ" : "ID"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Nhân viên" : "Mitarbeiter"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Thời gian nghỉ" : "Zeitraum"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Mã xác thực eAU" : "eAU-Referenz"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Phân loại" : "Art"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Hưởng lương 100% (EntgFG)" : "Entgeltfortzahlung"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Trạng thái" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {sicknessList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-neutral-500">
                        {lang === "vi" ? "Chưa có bản ghi nghỉ ốm nào" : "Keine Krankmeldungen vorhanden"}
                      </td>
                    </tr>
                  ) : (
                    sicknessList.map((s) => (
                      <tr key={s.absenceId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="px-5 py-3 font-mono text-xs">#{s.absenceId}</td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.employeeName}</span>
                          <span className="block text-xs text-neutral-400">{s.employeeCode}</span>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {s.startDate} ➔ {s.endDate}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {s.eauReferenceNumber || "eAU-AUTOMATIC"}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {s.isChildSickLeave ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {lang === "vi" ? "Nghỉ chăm con ốm" : "Kind krank"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              {lang === "vi" ? "Nghỉ ốm cá nhân" : "Arbeitsunfähig"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {s.continuedPayEligible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 size={14} />
                              {lang === "vi" ? "Đủ điều kiện 100% lương" : "100 % fortzahlungspflichtig"}
                            </span>
                          ) : (
                            <span className="text-neutral-400">
                              {lang === "vi" ? "Hết hạn (Chuyển BHYT chi trả)" : "Krankengeldanspruch"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Compensatory Rest (§ 11 ArbZG) */}
      {tab === "compensatory" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Clock className="text-amber-600" />
                {lang === "vi" ? "Quy định bố trí nghỉ bù theo § 11 Abs. 3 ArbZG" : "Gesetzliche Ausgleichsfristen (§ 11 Abs. 3 ArbZG)"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {lang === "vi"
                  ? "• Làm việc vào Chủ nhật: Phải bố trí 1 ngày nghỉ bù trong vòng 2 tuần (14 ngày).\n• Làm việc vào Ngày lễ rơi vào ngày làm việc: Phải bố trí 1 ngày nghỉ bù trong vòng 8 tuần (56 ngày)."
                  : "• Sonntagsarbeit: Ausgleich innerhalb von 2 Wochen.\n• Feiertagsarbeit: Ausgleich innerhalb von 8 Wochen."}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {lang === "vi" ? "Danh sách nghĩa vụ bố trí ngày nghỉ bù" : "Offene Ersatzruhetags-Verpflichtungen"}
              </h3>
              <span className="text-xs text-neutral-500">
                {compensatoryList.length} {lang === "vi" ? "nghĩa vụ" : "Verpflichtungen"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{lang === "vi" ? "Mã số" : "ID"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Nhân viên" : "Mitarbeiter"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Ngày làm việc" : "Einsatztag"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Nguồn phát sinh" : "Grund"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Hạn chót luật định" : "Ausschlussfrist"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Thời hạn còn lại" : "Verbleibende Frist"}</th>
                    <th className="px-5 py-3">{lang === "vi" ? "Tình trạng" : "Status"}</th>
                    <th className="px-5 py-3 text-right">{lang === "vi" ? "Thao tác" : "Aktionen"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {compensatoryList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-neutral-500">
                        {lang === "vi" ? "Không có nghĩa vụ nghỉ bù nào đang chờ xử lý" : "Keine offenen Ausgleichstage vorhanden"}
                      </td>
                    </tr>
                  ) : (
                    compensatoryList.map((c) => (
                      <tr key={c.restId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="px-5 py-3 font-mono text-xs">#{c.restId}</td>
                        <td className="px-5 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                          {c.employeeName || `EMP-${c.employeeId}`}
                        </td>
                        <td className="px-5 py-3 text-xs">{c.workedDate}</td>
                        <td className="px-5 py-3 text-xs">
                          {c.sourceType === "SUNDAY" ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              {lang === "vi" ? "Chủ nhật (2 tuần)" : "Sonntag (2 W.)"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {lang === "vi" ? "Ngày lễ (8 tuần)" : "Feiertag (8 W.)"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono">{c.deadlineDate}</td>
                        <td className="px-5 py-3 text-xs font-medium">
                          {c.isCompleted ? (
                            <span className="text-neutral-400">{lang === "vi" ? "Đã xong" : "Erledigt"}</span>
                          ) : c.isOverdue ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-bold flex items-center gap-1 w-fit">
                              <AlertTriangle size={12} />
                              {lang === "vi" ? "Quá hạn!" : "Überfällig!"}
                            </span>
                          ) : c.daysRemaining <= 5 ? (
                            <span className="text-amber-600 font-bold">
                              {lang === "vi" ? `Còn ${c.daysRemaining} ngày` : `Noch ${c.daysRemaining} T.`}
                            </span>
                          ) : (
                            <span className="text-emerald-600">
                              {lang === "vi" ? `Còn ${c.daysRemaining} ngày` : `Noch ${c.daysRemaining} T.`}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {c.isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 size={14} />
                              {lang === "vi" ? "Đã bố trí nghỉ" : "Gewährt"}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              {lang === "vi" ? "Chưa bố trí" : "Offen"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {!c.isCompleted && (
                            <button
                              onClick={() => handleCompleteCompensatory(c.restId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition"
                            >
                              {lang === "vi" ? "Xác nhận đã nghỉ" : "Als gewährt markieren"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Leave Request */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Calendar className="text-emerald-600" />
              {lang === "vi" ? "Tạo đơn xin nghỉ phép" : "Neuen Urlaubsantrag stellen"}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {lang === "vi" ? "Nhân viên" : "Mitarbeiter"}
                </label>
                <select
                  value={reqEmpId}
                  onChange={(e) => setReqEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                >
                  {employees.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.displayName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {lang === "vi" ? "Loại nghỉ" : "Urlaubsart"}
                </label>
                <select
                  value={reqTypeCode}
                  onChange={(e) => setReqTypeCode(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                >
                  <option value="ANNUAL">{lang === "vi" ? "Nghỉ phép năm (BUrlG)" : "Erholungsurlaub (BUrlG)"}</option>
                  <option value="SPECIAL">{lang === "vi" ? "Nghỉ việc riêng (§616 BGB)" : "Sonderurlaub (§ 616 BGB)"}</option>
                  <option value="UNPAID">{lang === "vi" ? "Nghỉ không lương" : "Unbezahlter Urlaub"}</option>
                  <option value="EDUCATION">{lang === "vi" ? "Nghỉ đào tạo (Bildungsurlaub)" : "Bildungsurlaub"}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                    {lang === "vi" ? "Từ ngày" : "Von"}
                  </label>
                  <input
                    type="date"
                    value={reqStartDate}
                    onChange={(e) => setReqStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                    {lang === "vi" ? "Đến ngày" : "Bis"}
                  </label>
                  <input
                    type="date"
                    value={reqEndDate}
                    onChange={(e) => setReqEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {lang === "vi" ? "Lý do xin nghỉ" : "Begründung"}
                </label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  rows={2}
                  placeholder={lang === "vi" ? "Ví dụ: Nghỉ du lịch cùng gia đình..." : "Grund des Antrags..."}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {lang === "vi" ? "Hủy" : "Abbrechen"}
              </button>
              <button
                onClick={handleCreateRequest}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
              >
                {lang === "vi" ? "Gửi đơn" : "Antrag einreichen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Sickness Absence */}
      {showSicknessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <HeartPulse className="text-rose-600" />
              {lang === "vi" ? "Ghi nhận Nghỉ ốm eAU (EntgFG)" : "Krankmeldung erfassen (eAU)"}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {lang === "vi" ? "Nhân viên" : "Mitarbeiter"}
                </label>
                <select
                  value={sickEmpId}
                  onChange={(e) => setSickEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                >
                  {employees.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.displayName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                    {lang === "vi" ? "Từ ngày" : "Von"}
                  </label>
                  <input
                    type="date"
                    value={sickStartDate}
                    onChange={(e) => setSickStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                    {lang === "vi" ? "Đến ngày" : "Bis"}
                  </label>
                  <input
                    type="date"
                    value={sickEndDate}
                    onChange={(e) => setSickEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                  {lang === "vi" ? "Mã tra cứu eAU từ BHYT (Tùy chọn)" : "eAU-Referenznummer (Krankenkasse)"}
                </label>
                <input
                  type="text"
                  value={sickEauNumber}
                  onChange={(e) => setSickEauNumber(e.target.value)}
                  placeholder="eAU-2026-TK-..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="childSick"
                  checked={sickIsChild}
                  onChange={(e) => setSickIsChild(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="childSick" className="text-xs text-neutral-700 dark:text-neutral-300">
                  {lang === "vi" ? "Nghỉ chăm con ốm (Kind krank)" : "Kind krank (Kinderpflege-Krankengeld)"}
                </label>
              </div>

              <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg text-xs text-neutral-500">
                {lang === "vi"
                  ? "✓ Tuân thủ DSGVO: Không lưu chẩn đoán y tế. Tự động hủy các ca làm việc bị trùng lặp trong lịch."
                  : "✓ DSGVO-konform: Keine Diagnose-Speicherung. Dienstplan-Schichten im Zeitraum werden storniert."}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSicknessModal(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {lang === "vi" ? "Hủy" : "Abbrechen"}
              </button>
              <button
                onClick={handleRecordSickness}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition"
              >
                {lang === "vi" ? "Lưu hồ sơ nghỉ ốm" : "Krankmeldung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Approval / Rejection Decision */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {decisionModal.action === "approve"
                ? (lang === "vi" ? "Phê duyệt đơn xin nghỉ phép" : "Urlaubsantrag genehmigen")
                : (lang === "vi" ? "Từ chối đơn xin nghỉ phép" : "Urlaubsantrag ablehnen")}
            </h3>

            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
              <p><strong>{lang === "vi" ? "Nhân viên:" : "Mitarbeiter:"}</strong> {decisionModal.request.employeeName} ({decisionModal.request.employeeCode})</p>
              <p><strong>{lang === "vi" ? "Thời gian:" : "Zeitraum:"}</strong> {decisionModal.request.startDate} ➔ {decisionModal.request.endDate} ({decisionModal.request.totalDays} {lang === "vi" ? "ngày" : "Tage"})</p>
              <p><strong>{lang === "vi" ? "Lý do:" : "Grund:"}</strong> {decisionModal.request.reason || "—"}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">
                {lang === "vi" ? "Ghi chú phê duyệt / lý do từ chối" : "Entscheidungsbegründung"}
              </label>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={2}
                placeholder={lang === "vi" ? "Nhập ghi chú cho nhân viên..." : "Begründung eingeben..."}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {lang === "vi" ? "Hủy" : "Abbrechen"}
              </button>
              <button
                onClick={handleDecision}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition ${
                  decisionModal.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {decisionModal.action === "approve"
                  ? (lang === "vi" ? "Xác nhận duyệt" : "Genehmigen")
                  : (lang === "vi" ? "Xác nhận từ chối" : "Ablehnen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
