import { useEffect, useState } from "react";
import {
  Coins,
  Calculator,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import {
  getPublicHolidays,
  getBranchAllowanceSummary,
  calculateTimesheetAllowance,
  type PublicHoliday,
  type BranchAllowanceSummary,
  type TimesheetAllowanceBreakdown,
  type Branch,
} from "../lib/api";
import { useI18n } from "../lib/i18n";

export function AllowancesView({ branches }: { branches: Branch[] }) {
  const { lang } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches.length > 0 ? Number(branches[0].id) : 1
  );
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BranchAllowanceSummary | null>(null);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetAllowanceBreakdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const [sum, hList] = await Promise.all([
        getBranchAllowanceSummary(selectedBranchId),
        getPublicHolidays(selectedBranchId, 2026),
      ]);
      setSummary(sum);
      setHolidays(hList);
    } catch (e: any) {
      setToast(e.message || "Lỗi tải dữ liệu phụ cấp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedBranchId]);

  const handleRecalculate = async (timesheetId: number) => {
    try {
      const updated = await calculateTimesheetAllowance(timesheetId);
      setSelectedTimesheet(updated);
      setToast(lang === "vi" ? "Đã tái tính phụ cấp ca làm việc thành công!" : "Zuschläge erfolgreich neu berechnet!");
      await loadSummary();
    } catch (e: any) {
      setToast(e.message || "Lỗi tính toán phụ cấp");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-xl border border-neutral-700 animate-fade-in">
          <Info size={18} className="text-emerald-400" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Coins className="text-amber-500" />
            {lang === "vi" ? "Phụ cấp SFN & Ngày lễ (F07)" : "SFN-Zuschläge & Feiertagsarbeit (F07)"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {lang === "vi"
              ? "Tính phụ cấp Đêm, Chủ nhật, Ngày lễ theo §3b EStG và giới hạn miễn BHXH theo SvEV"
              : "Rechtskonforme Berechnung von Sonntags-, Feiertags- & Nachtzuschlägen nach § 3b EStG / SvEV"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowHolidaysModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium transition"
          >
            <Calendar size={16} />
            {lang === "vi" ? "Lịch 12 ngày lễ BW" : "Feiertagskalender (BW)"}
          </button>

          <button
            onClick={loadSummary}
            className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            title={lang === "vi" ? "Tải lại dữ liệu" : "Aktualisieren"}
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-neutral-400" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Paid Allowances */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {lang === "vi" ? "Tổng phụ cấp thực trả" : "Zuschläge Gesamt"}
            </span>
            <Coins size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {summary ? Number(summary.totalPaidAllowancesEur).toFixed(2) : "0.00"} €
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {lang === "vi" ? "Cộng dồn theo ca thực tế" : "Kumulierte Auszahlung laut Schichten"}
          </p>
        </div>

        {/* §3b EStG Tax Exemption */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {lang === "vi" ? "Miễn thuế (§3b EStG)" : "Steuerfrei (§ 3b EStG)"}
            </span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {summary ? Number(summary.totalTaxExemptEur).toFixed(2) : "0.00"} €
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {lang === "vi" ? "Áp trần tối đa 50 €/h lương cơ sở" : "Gedeckelt auf max. 50 €/Std. Grundlohn"}
          </p>
        </div>

        {/* SvEV Social Insurance Exemption */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {lang === "vi" ? "Miễn BHXH (SvEV)" : "SV-Frei (§ 1 SvEV)"}
            </span>
            <ShieldCheck size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {summary ? Number(summary.totalSvExemptEur).toFixed(2) : "0.00"} €
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {lang === "vi" ? "Áp trần tối đa 25 €/h lương cơ sở" : "Gedeckelt auf max. 25 €/Std. SV-Basis"}
          </p>
        </div>

        {/* Taxable Amount */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {lang === "vi" ? "Phần chịu thuế / BHXH" : "Steuer- / SV-Pflichtig"}
            </span>
            <Receipt size={18} className="text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300 mt-2">
            {summary ? Number(summary.totalTaxableEur).toFixed(2) : "0.00"} €
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {lang === "vi" ? "Vượt trần hoặc không đủ điều kiện" : "Übersteigender Teil des Grundlohns"}
          </p>
        </div>
      </div>

      {/* Legal & Policy Rules Banner */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
        <p className="font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          {lang === "vi" ? "Quy tắc cộng dồn phụ cấp & Giới hạn luật định CHLB Đức:" : "Rechtliche Rahmenbedingungen & Staffelungsgrundsätze:"}
        </p>
        <p>• <strong>{lang === "vi" ? "Ca đêm thường (20h - 06h):" : "Nachtarbeit (20–06 Uhr):"}</strong> 25% | <strong>{lang === "vi" ? "Đêm sâu (00h - 04h nếu ca bắt đầu trước 00h):" : "Tiefe Nacht (00–04 Uhr bei Schichtbeginn vor 00 Uhr):"}</strong> 40%</p>
        <p>• <strong>{lang === "vi" ? "Chủ nhật:" : "Sonntagsarbeit:"}</strong> 50% (kéo dài đến 04:00 sáng Thứ Hai) | <strong>{lang === "vi" ? "Ngày lễ:" : "Feiertage:"}</strong> 125% - 150% (Đêm Giáng sinh 24/12 sau 14h: 150%, Giao thừa 31/12 sau 14h: 125%)</p>
        <p>• <strong>{lang === "vi" ? "Quy tắc xếp chồng (Stacking):" : "Kumulierungsregel:"}</strong> {lang === "vi" ? "Chỉ cộng dồn Phụ cấp Đêm + [Mức cao nhất giữa Chủ nhật HOẶC Ngày lễ]. Không cộng dồn Chủ nhật với Ngày lễ." : "Nachtzuschlag kumulierbar mit Sonntag ODER Feiertag (stets der höhere Satz). Sonntag und Feiertag schließen sich gegenseitig aus."}</p>
      </div>

      {/* Timesheet Allowance Breakdown Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            {lang === "vi" ? "Bảng kê chi tiết phụ cấp theo ca làm việc" : "Schichtbezogene SFN-Abrechnung"}
          </h3>
          <span className="text-xs text-neutral-500">
            {summary ? summary.timesheets.length : 0} {lang === "vi" ? "ca làm việc" : "Schichten"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">{lang === "vi" ? "Mã ca" : "Schicht-ID"}</th>
                <th className="px-5 py-3">{lang === "vi" ? "Nhân viên" : "Mitarbeiter"}</th>
                <th className="px-5 py-3">{lang === "vi" ? "Ngày làm" : "Datum"}</th>
                <th className="px-5 py-3">{lang === "vi" ? "Giờ thực tế" : "Ist-Zeit"}</th>
                <th className="px-5 py-3 text-right">{lang === "vi" ? "Lương cơ sở" : "Grundlohn"}</th>
                <th className="px-5 py-3 text-right font-bold text-amber-600">{lang === "vi" ? "Phụ cấp trả" : "Zuschlag"}</th>
                <th className="px-5 py-3 text-right text-emerald-600">{lang === "vi" ? "Miễn thuế §3b" : "Steuerfrei"}</th>
                <th className="px-5 py-3 text-right text-blue-600">{lang === "vi" ? "Miễn BH SvEV" : "SV-Frei"}</th>
                <th className="px-5 py-3 text-right">{lang === "vi" ? "Thao tác" : "Aktionen"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {!summary || summary.timesheets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-neutral-500">
                    {lang === "vi" ? "Chưa có ca làm việc nào phát sinh phụ cấp trong kỳ" : "Keine zuschlagspflichtigen Schichten im gewählten Zeitraum"}
                  </td>
                </tr>
              ) : (
                summary.timesheets.map((ts) => (
                  <tr key={ts.timesheetId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-5 py-3 font-mono text-xs">#{ts.timesheetId}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{ts.employeeName}</span>
                      <span className="block text-xs text-neutral-400">{ts.employeeCode}</span>
                    </td>
                    <td className="px-5 py-3 text-xs">{ts.workDate}</td>
                    <td className="px-5 py-3 text-xs font-mono">
                      {ts.actualStartBerlin} ➔ {ts.actualEndBerlin}
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      {Number(ts.baseWageEur).toFixed(2)} €/h
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {Number(ts.totalPaidAmountEur).toFixed(2)} €
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {Number(ts.totalTaxExemptAmountEur).toFixed(2)} €
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {Number(ts.totalSvExemptAmountEur).toFixed(2)} €
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTimesheet(ts)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-medium transition"
                        >
                          {lang === "vi" ? "Xem phân đoạn" : "Segmente"}
                        </button>
                        <button
                          onClick={() => handleRecalculate(ts.timesheetId)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                          title={lang === "vi" ? "Tái tính toán" : "Neu berechnen"}
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Segment Breakdown & Audit Trace */}
      {selectedTimesheet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-3xl w-full p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Calculator className="text-amber-500" />
                  {lang === "vi" ? "Phân tích phân đoạn & Kiểm toán Trace (F07.07)" : "Segment-Analyse & Audit-Trace"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedTimesheet.employeeName} ({selectedTimesheet.employeeCode}) · {selectedTimesheet.workDate} ({selectedTimesheet.actualStartBerlin} ➔ {selectedTimesheet.actualEndBerlin})
                </p>
              </div>
              <button
                onClick={() => setSelectedTimesheet(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {/* Overview stats for this timesheet */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs">
              <div>
                <span className="text-neutral-400 block">{lang === "vi" ? "Lương cơ sở" : "Grundlohn"}</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{Number(selectedTimesheet.baseWageEur).toFixed(2)} €/h</span>
              </div>
              <div>
                <span className="text-neutral-400 block">{lang === "vi" ? "Phụ cấp trả" : "Auszahlung"}</span>
                <span className="font-bold text-amber-600">{Number(selectedTimesheet.totalPaidAmountEur).toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-neutral-400 block">{lang === "vi" ? "Miễn thuế §3b" : "Steuerfrei"}</span>
                <span className="font-bold text-emerald-600">{Number(selectedTimesheet.totalTaxExemptAmountEur).toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-neutral-400 block">{lang === "vi" ? "Miễn BH SvEV" : "SV-Frei"}</span>
                <span className="font-bold text-blue-600">{Number(selectedTimesheet.totalSvExemptAmountEur).toFixed(2)} €</span>
              </div>
            </div>

            {/* Segments list */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {lang === "vi" ? "Các phân đoạn thời gian (Time Splitting Engine)" : "Zeitabschnitte & Staffelung"}
              </h4>

              {selectedTimesheet.segments.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">
                  {lang === "vi" ? "Ca làm việc này không rơi vào khung giờ hưởng phụ cấp." : "Für diese Schicht fallen keine zuschlagspflichtigen Segmente an."}
                </p>
              ) : (
                selectedTimesheet.segments.map((seg, idx) => (
                  <div
                    key={seg.segmentId || idx}
                    className="p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {seg.segmentStartBerlin} ➔ {seg.segmentEndBerlin}
                        </span>
                        <span className="text-neutral-400">({seg.payableMinutes} {lang === "vi" ? "phút" : "Min."})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800">
                          {seg.segmentType}
                        </span>
                      </div>
                      <span className="font-bold text-amber-600 text-sm">
                        +{Number(seg.paidAmountEur).toFixed(2)} € ({seg.payableRatePercent}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-neutral-500 text-[11px]">
                      <span>{lang === "vi" ? "Miễn thuế §3b:" : "Steuerfrei:"} <strong className="text-emerald-600">{Number(seg.taxExemptAmountEur).toFixed(2)} €</strong></span>
                      <span>{lang === "vi" ? "Chịu thuế:" : "Steuerpflichtig:"} <strong>{Number(seg.taxableAmountEur).toFixed(2)} €</strong></span>
                      <span>{lang === "vi" ? "Miễn BHXH SvEV:" : "SV-Frei:"} <strong className="text-blue-600">{Number(seg.socialInsuranceExemptAmountEur).toFixed(2)} €</strong></span>
                    </div>

                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                      🔍 <strong>Trace:</strong> {seg.calculationTrace}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTimesheet(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition"
              >
                {lang === "vi" ? "Đóng" : "Schließen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Baden-Württemberg Statutory Holidays Calendar */}
      {showHolidaysModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Calendar className="text-emerald-600" />
                  {lang === "vi" ? "Lịch ngày lễ chính thức Baden-Württemberg (2026)" : "Gesetzliche Feiertage Baden-Württemberg (2026)"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {lang === "vi" ? "Theo Luật Ngày lễ bang BW (Feiertagsgesetz FTG)" : "Gemäß Feiertagsgesetz FTG Baden-Württemberg"}
                </p>
              </div>
              <button onClick={() => setShowHolidaysModal(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {holidays.map((h) => (
                <div key={h.holidayId} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 block">
                      {h.holidayNameVi || h.holidayNameDe}
                    </span>
                    <span className="text-neutral-400 text-[11px]">{h.holidayNameDe}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{h.holidayDate}</span>
                    <span className="block text-[10px] text-emerald-600 font-medium">{lang === "vi" ? "Lễ luật định (100%)" : "Gesetzlich"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                {lang === "vi"
                  ? "Phạm vi MVP vận hành chuẩn xác cho bang Baden-Württemberg (BW). Chi nhánh tại các bang khác nếu chưa cấu hình lịch lễ sẽ bị chặn tính phụ cấp chính thức để tránh sai lệch thuế."
                  : "MVP unterstützt Baden-Württemberg (BW). Für andere Bundesländer müssen vorab die Feiertage hinterlegt werden."}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHolidaysModal(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition"
              >
                {lang === "vi" ? "Đóng" : "Schließen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
