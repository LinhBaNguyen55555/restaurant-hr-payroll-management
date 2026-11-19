import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Search,
  Building,
  Euro,
  Shield,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  api,
  type EmployeeDto,
  type EmployeeDetailDto,
  type PositionItem,
  type Branch,
  type ImportResult,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Modal } from "./experience";
import { formatPosition } from "./scheduling";

export function WorkforceView({ branches }: { branches: Branch[] }) {
  const { t, lang } = useI18n();
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<EmployeeDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"profile" | "contracts" | "wages" | "restrictions">("profile");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load employees
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const bId = selectedBranch !== "ALL" ? Number(selectedBranch) : undefined;
      const data = await api<EmployeeDto[]>(
        `/workforce/employees?${bId ? `branchId=${bId}&` : ""}${search ? `search=${encodeURIComponent(search)}&` : ""}status=${selectedStatus}`
      );
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const data = await api<PositionItem[]>("/workforce/positions");
      setPositions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [selectedBranch, selectedStatus]);

  // Open Employee Detail
  const openDetail = async (id: number) => {
    setSelectedEmployeeId(id);
    setDetailLoading(true);
    setDetailTab("profile");
    try {
      const data = await api<EmployeeDetailDto>(`/workforce/employees/${id}`);
      setDetailData(data);
    } catch (e) {
      alert((e as Error).message);
      setSelectedEmployeeId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // KPI Calculations
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.employmentStatus === "ACTIVE").length;
  const minijobCount = employees.filter((e) => e.contractType === "MINIJOB").length;
  const protectedCount = employees.filter((e) => e.activeRestrictions && e.activeRestrictions.length > 0).length;

  return (
    <div className="workforce-page">
      {/* Header & Actions */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-emerald-950/40 text-slate-700 dark:text-emerald-200 hover:bg-slate-50 dark:hover:bg-emerald-900/50 shadow-sm transition"
        >
          <FileSpreadsheet size={16} className="text-emerald-500" />
          <span>{t("wf.import_csv")}</span>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
        >
          <UserPlus size={16} />
          <span>{t("wf.add_employee")}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="stat-card">
          <div className="stat-top">
            <span>{t("wf.total_employees")}</span>
            <Users size={18} className="text-emerald-500" />
          </div>
          <div className="stat-number">{totalCount}</div>
          <small>{t("ui.active")}</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>{t("wf.active_employees")}</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="stat-number">{activeCount}</div>
          <small>Hợp đồng có hiệu lực</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>{t("wf.minijob_count")}</span>
            <Euro size={18} className="text-amber-500" />
          </div>
          <div className="stat-number">{minijobCount}</div>
          <small>{t("wf.minijob_notice")}</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>{t("wf.protected_count")}</span>
            <Shield size={18} className="text-purple-400" />
          </div>
          <div className="stat-number">{protectedCount}</div>
          <small>JArbSchG / MuSchG</small>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-emerald-950/20 shadow-sm mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã nhân viên (E-0001), email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadEmployees()}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={loadEmployees}
            className="px-3.5 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
          >
            {t("ui.search")}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Building size={16} className="text-slate-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-emerald-950/40 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-emerald-950/40 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang làm việc (ACTIVE)</option>
              <option value="PROBATION">Thử việc (PROBATION)</option>
              <option value="TERMINATED">Đã nghỉ việc (TERMINATED)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-emerald-950/20 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/40 text-slate-600 dark:text-slate-400 font-medium">
              <th className="py-3 px-4">{t("wf.emp_code")}</th>
              <th className="py-3 px-4">{t("wf.name")}</th>
              <th className="py-3 px-4">{t("wf.position")}</th>
              <th className="py-3 px-4">{t("wf.branch")}</th>
              <th className="py-3 px-4">{t("wf.contract")}</th>
              <th className="py-3 px-4">{t("wf.wage")}</th>
              <th className="py-3 px-4">{t("wf.restrictions")}</th>
              <th className="py-3 px-4 text-right">{t("ui.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Đang tải danh sách nhân sự...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Không tìm thấy nhân viên phù hợp.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.employeeId}
                  className="hover:bg-slate-50/80 dark:hover:bg-emerald-900/20 transition cursor-pointer"
                  onClick={() => openDetail(emp.employeeId)}
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {emp.employeeCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {emp.displayName}
                    </div>
                    <div className="text-xs text-slate-400">{emp.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-300">
                      {formatPosition(emp.positionNameDe || emp.positionNameEn || emp.positionCode, lang)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {emp.branchName || "Chi nhánh chính"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        emp.contractType === "MINIJOB"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : emp.contractType === "UNLIMITED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {emp.contractType || "UNLIMITED"} ({emp.weeklyHours || 40}h)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {emp.currentHourlyWage ? (
                      <span>{Number(emp.currentHourlyWage).toFixed(2)} €/h</span>
                    ) : emp.currentMonthlyWage ? (
                      <span>{Number(emp.currentMonthlyWage).toFixed(2)} €/tháng</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {emp.activeRestrictions && emp.activeRestrictions.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {emp.activeRestrictions.map((r, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-medium"
                          >
                            <Shield size={12} />
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Tiêu chuẩn</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(emp.employeeId);
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-800/40 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Employee Details & Timelines */}
      {selectedEmployeeId && (
        <Modal
          open={true}
          wide={true}
          title={detailData?.profile?.displayName || "Hồ sơ nhân viên"}
          description={
            lang === "vi"
              ? "Chi tiết thông tin nhân sự, dòng thời gian hợp đồng và các điều kiện bảo vệ theo luật Đức."
              : "Mitarbeiterdaten, Vertragshistorie und Schutzbestimmungen gemäß deutschem Arbeitsrecht."
          }
          onClose={() => {
            setSelectedEmployeeId(null);
            setDetailData(null);
          }}
        >
          {detailLoading || !detailData ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              {lang === "vi" ? "Đang tải chi tiết hồ sơ..." : "Lade Profildaten..."}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-emerald-950/40 border border-slate-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center">
                    {detailData.profile?.firstName?.[0]}
                    {detailData.profile?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-slate-900 dark:text-white">
                      {detailData.profile?.displayName}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-emerald-500 font-semibold">{detailData.profile?.employeeCode}</span>
                      <span>•</span>
                      <span>{detailData.profile?.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {detailData.profile?.employmentStatus}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-emerald-800/40 gap-4 text-sm font-medium">
                <button
                  className={`pb-2 border-b-2 transition ${
                    detailTab === "profile"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setDetailTab("profile")}
                >
                  {t("wf.tab_profile")}
                </button>
                <button
                  className={`pb-2 border-b-2 transition ${
                    detailTab === "contracts"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setDetailTab("contracts")}
                >
                  {t("wf.tab_contracts")} ({detailData.contracts.length})
                </button>
                <button
                  className={`pb-2 border-b-2 transition ${
                    detailTab === "wages"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setDetailTab("wages")}
                >
                  {t("wf.tab_wages")} ({detailData.wageRates.length})
                </button>
                <button
                  className={`pb-2 border-b-2 transition ${
                    detailTab === "restrictions"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setDetailTab("restrictions")}
                >
                  {t("wf.tab_restrictions")} ({detailData.restrictions.length})
                </button>
              </div>

              {/* Tab Content */}
              {detailTab === "profile" && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Ngày sinh:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {detailData.profile?.dateOfBirth || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Ngày tuyển dụng:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {detailData.profile?.hireDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Chi nhánh chính:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {detailData.profile?.branchName || "Chi nhánh 1"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Vị trí đảm nhiệm:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatPosition(detailData.profile?.positionNameDe || detailData.profile?.positionNameEn, lang)}
                      {detailData.profile?.positionNameDe ? ` (${detailData.profile.positionNameDe})` : ""}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === "contracts" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    Lịch sử hợp đồng không bao giờ bị xóa. Mỗi lần gia hạn tạo ra một giai đoạn hiệu lực mới.
                  </div>
                  {detailData.contracts.map((c) => (
                    <div
                      key={c.contractId}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-emerald-800/40 bg-slate-50/50 dark:bg-emerald-950/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.contractNumber} • {c.contractType}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Thời hạn: {c.startDate} → {c.endDate || "Vô thời hạn (Unbefristet)"}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Thời giờ chuẩn: {c.standardWeeklyMinutes / 60} giờ/tuần
                        </div>
                      </div>
                      <div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "wages" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
                    {t("wf.milog_notice")} Mọi mức lương lưu theo dòng thời gian phục vụ tính lương và truy toán (AC04).
                  </div>
                  {detailData.wageRates.map((w) => (
                    <div
                      key={w.wageRateId}
                      className="p-3 rounded-lg border border-slate-200 dark:border-emerald-800/40 flex items-center justify-between text-sm"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {w.grossHourlyEur
                            ? `${Number(w.grossHourlyEur).toFixed(2)} €/giờ (Brutto)`
                            : `${Number(w.grossMonthlyEur).toFixed(2)} €/tháng (Brutto)`}
                        </div>
                        <div className="text-xs text-slate-400">
                          Hiệu lực: {w.validFrom} → {w.validTo || "Hiện hành"}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {w.approvalStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "restrictions" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-800 dark:text-purple-300">
                    Bảo vệ dữ liệu y tế & sức khỏe theo GDPR/BDSG: Người quản lý chỉ nhìn thấy quy tắc xếp lịch áp dụng.
                  </div>
                  {detailData.restrictions.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-sm">
                      Không có điều kiện hạn chế đặc biệt. Nhân viên tuân theo luật lao động thông thường.
                    </div>
                  ) : (
                    detailData.restrictions.map((r) => (
                      <div
                        key={r.restrictionId}
                        className="p-3.5 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50/20 dark:bg-purple-950/20"
                      >
                        <div className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Shield size={16} />
                          {r.restrictionType}
                        </div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                          {r.schedulingRuleSummary}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Hiệu lực: {r.validFrom} → {r.validTo || "Vô thời hạn"}
                          {r.maxDailyMinutes ? ` • Tối đa ${r.maxDailyMinutes / 60}h/ngày` : ""}
                          {r.allowNightShift ? " • Được phép làm đêm" : " • Cấm làm ca đêm"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeId(null);
                    setDetailData(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300 text-sm transition"
                >
                  {lang === "vi" ? "Đóng" : "Schließen"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal: Add Employee */}
      {showAddModal && (
        <AddEmployeeModal
          positions={positions}
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadEmployees();
          }}
        />
      )}

      {/* Modal: Import CSV */}
      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadEmployees();
          }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({
  positions,
  branches,
  onClose,
  onSuccess,
}: {
  positions: PositionItem[];
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useI18n();
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState(branches[0]?.id || "1");
  const [positionId, setPositionId] = useState(positions[0]?.positionId || 2);
  const [contractType, setContractType] = useState("UNLIMITED");
  const [payType, setPayType] = useState("HOURLY");
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [hourlyWage, setHourlyWage] = useState("13.50");
  const [monthlyWage, setMonthlyWage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // German MiLoG Validation
    if (payType === "HOURLY" && Number(hourlyWage) < 12.41) {
      setError(
        lang === "vi"
          ? "Vi phạm luật tiền lương tối thiểu Đức (MiLoG): Mức lương giờ phải từ 12,41 € trở lên."
          : "Verstoß gegen das Mindestlohngesetz (MiLoG): Mindestens 12,41 €/Stunde erforderlich."
      );
      return;
    }

    if (contractType === "MINIJOB" && monthlyWage && Number(monthlyWage) > 538) {
      setError(
        lang === "vi"
          ? "Hợp đồng Minijob không được vượt quá mức trần 538,00 €/tháng theo luật Đức."
          : "Minijob-Vergütung darf 538,00 €/Monat nicht überschreiten."
      );
      return;
    }

    setBusy(true);
    try {
      await api("/workforce/employees", "POST", {
        employeeCode: code,
        firstName,
        lastName,
        email,
        dateOfBirth: dob || null,
        hireDate,
        branchId: Number(branchId),
        positionId: Number(positionId),
        contractType,
        payType,
        weeklyMinutes: Number(weeklyHours) * 60,
        hourlyWage: payType === "HOURLY" ? Number(hourlyWage) : null,
        monthlyWage: payType === "MONTHLY" ? Number(monthlyWage) : null,
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
      title={lang === "vi" ? "Thêm nhân viên mới" : "Neuen Mitarbeiter anlegen"}
      description={
        lang === "vi"
          ? "Nhập hồ sơ cá nhân, phân công vị trí và thiết lập hợp đồng lao động tuân thủ luật Đức (MiLoG / ArbZG)."
          : "Stammdaten, Einsatzort und Vertragsdaten gemäß deutschem Arbeitsrecht erfassen."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-6 pt-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Thông tin cá nhân */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/20 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-slate-200/80 dark:border-emerald-900/40">
            <Users size={14} />
            <span>{lang === "vi" ? "1. Thông tin cá nhân & Liên lạc" : "1. Persönliche Stammdaten"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Mã nhân sự *" : "Personalnummer *"}
              </label>
              <input
                type="text"
                placeholder="E-0011"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Tên *" : "Vorname *"}
              </label>
              <input
                type="text"
                placeholder="Max"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Họ *" : "Nachname *"}
              </label>
              <input
                type="text"
                placeholder="Mustermann"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Email liên lạc" : "E-Mail-Adresse"}
              </label>
              <input
                type="email"
                placeholder="max.mustermann@restaurant.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Ngày sinh (YYYY-MM-DD)" : "Geburtsdatum"}
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Vị trí & Chi nhánh */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/20 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-slate-200/80 dark:border-emerald-900/40">
            <Building size={14} />
            <span>{lang === "vi" ? "2. Chi nhánh & Vị trí đảm nhiệm" : "2. Einsatzort & Rolle"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Chi nhánh làm việc *" : "Stammniederlassung *"}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Vị trí đảm nhận *" : "Position *"}
              </label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(Number(e.target.value))}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              >
                {positions.map((p) => (
                  <option key={p.positionId} value={p.positionId}>
                    {formatPosition(p.positionNameDe, lang)} ({p.positionNameDe})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Hợp đồng & Lương */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/20 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-slate-200/80 dark:border-emerald-900/40">
            <Euro size={14} />
            <span>{lang === "vi" ? "3. Hợp đồng lao động & Tiền lương" : "3. Arbeitsvertrag & Vergütung"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Loại hợp đồng *" : "Vertragsart *"}
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              >
                <option value="UNLIMITED">{lang === "vi" ? "Không thời hạn (Unbefristet)" : "Unbefristet"}</option>
                <option value="FIXED_TERM">{lang === "vi" ? "Có thời hạn (Befristet)" : "Befristet"}</option>
                <option value="MINIJOB">Minijob (≤ 538 €)</option>
                <option value="PROBATION">{lang === "vi" ? "Thử việc (Probezeit)" : "Probezeit"}</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Hình thức lương *" : "Vergütungsmodell *"}
              </label>
              <select
                value={payType}
                onChange={(e) => setPayType(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              >
                <option value="HOURLY">{lang === "vi" ? "Theo giờ (Stundenlohn)" : "Stundenlohn"}</option>
                <option value="MONTHLY">{lang === "vi" ? "Theo tháng (Monatsgehalt)" : "Monatsgehalt"}</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {payType === "HOURLY"
                  ? (lang === "vi" ? "Mức lương giờ (€/h) *" : "Stundenlohn (€) *")
                  : (lang === "vi" ? "Lương tháng (€/tháng) *" : "Monatsgehalt (€) *")}
              </label>
              {payType === "HOURLY" ? (
                <input
                  type="number"
                  step="0.01"
                  min="12.41"
                  required
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
                />
              ) : (
                <input
                  type="number"
                  step="0.01"
                  required
                  value={monthlyWage}
                  onChange={(e) => setMonthlyWage(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Ngày tuyển dụng / Bắt đầu *" : "Eintrittsdatum *"}
              </label>
              <input
                type="date"
                required
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {lang === "vi" ? "Giờ làm việc tuần (giờ)" : "Wochenstunden"}
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
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
            <UserPlus size={16} />
            <span>
              {busy
                ? (lang === "vi" ? "Đang lưu..." : "Wird gespeichert...")
                : (lang === "vi" ? "Tạo hồ sơ nhân viên" : "Mitarbeiter anlegen")}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportCsvModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { lang } = useI18n();
  const [csvText, setCsvText] = useState(
    `employee_code,first_name,last_name,email,date_of_birth,hire_date,branch_id,position_id,contract_type,pay_type,weekly_hours,hourly_wage,monthly_wage\nE-0020,Johannes,Klein,johannes.klein@restaurant.example,1995-04-12,2026-03-01,1,2,UNLIMITED,HOURLY,40,14.50,\nE-0021,Clara,Schulz,clara.schulz@restaurant.example,2002-08-25,2026-03-01,1,4,MINIJOB,HOURLY,10,13.00,520.00`
  );
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const runImport = async (isDry: boolean) => {
    setBusy(true);
    setDryRun(isDry);
    try {
      const res = await api<ImportResult>("/workforce/import", "POST", {
        csv: csvText,
        dryRun: isDry,
      });
      setResult(res);
      if (!isDry && res.successRows > 0) {
        onSuccess();
      }
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
      title={lang === "vi" ? "Nhập danh sách nhân sự (CSV/Excel)" : "Mitarbeiter importieren (CSV)"}
      description={
        lang === "vi"
          ? "Tải lên hoặc dán danh sách nhân viên theo định dạng chuẩn. Có chế độ kiểm tra trước (Dry-Run) để phát hiện lỗi."
          : "Mitarbeiterdaten im CSV-Format importieren. Mit Vorabprüfung (Dry-Run)."
      }
      onClose={onClose}
    >
      <div className="space-y-4 pt-1">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50/50 dark:bg-emerald-950/20 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {lang === "vi" ? "Cấu trúc cột dữ liệu yêu cầu:" : "Erforderliches Spaltenformat:"}
          </div>
          <code className="text-emerald-700 dark:text-emerald-300 break-all font-mono text-[11px]">
            employee_code,first_name,last_name,email,date_of_birth,hire_date,branch_id,position_id,contract_type,pay_type,weekly_hours,hourly_wage,monthly_wage
          </code>
        </div>

        <textarea
          rows={8}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full p-3.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-xs"
        />

        {/* Results summary */}
        {result && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              result.errorRows > 0
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200"
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {result.errorRows === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {dryRun
                ? (lang === "vi" ? "Kết quả kiểm tra trước (Dry-Run Preview):" : "Prüfergebnis (Dry-Run):")
                : (lang === "vi" ? "Kết quả nhập dữ liệu:" : "Importergebnis:")}
            </div>
            <div className="text-xs mt-1.5 font-medium">
              {lang === "vi"
                ? `Tổng số dòng: ${result.totalRows} • Hợp lệ: ${result.successRows} • Lỗi: ${result.errorRows}`
                : `Gesamtzeilen: ${result.totalRows} • Gültig: ${result.successRows} • Fehler: ${result.errorRows}`}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {result.errors.map((err, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white/60 dark:bg-black/20 text-red-700 dark:text-red-300">
                    <span className="font-bold">
                      {lang === "vi" ? `Dòng ${err.lineNumber}` : `Zeile ${err.lineNumber}`} [{err.fieldName}]:
                    </span>{" "}
                    {lang === "vi" ? err.errorMessageVi : err.errorMessageDe}
                    {err.rawValue ? ` (Giá trị: "${err.rawValue}")` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-200 dark:border-emerald-900/40">
          <button
            type="button"
            disabled={busy}
            onClick={() => runImport(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/40 text-slate-700 dark:text-emerald-200 hover:bg-slate-100 dark:hover:bg-emerald-900/40 shadow-xs transition cursor-pointer"
          >
            {busy && dryRun
              ? (lang === "vi" ? "Đang kiểm tra..." : "Wird geprüft...")
              : (lang === "vi" ? "Kiểm tra trước (Dry-Run)" : "Vorabprüfung (Dry-Run)")}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 hover:bg-slate-100 dark:hover:bg-emerald-900/40 shadow-xs transition cursor-pointer"
            >
              {lang === "vi" ? "Đóng" : "Schließen"}
            </button>
            <button
              type="button"
              disabled={busy || !csvText.trim()}
              onClick={() => runImport(false)}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition cursor-pointer disabled:opacity-50"
            >
              {busy && !dryRun
                ? (lang === "vi" ? "Đang xử lý..." : "Wird importiert...")
                : (lang === "vi" ? "Xác nhận nhập dữ liệu" : "Daten importieren")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
