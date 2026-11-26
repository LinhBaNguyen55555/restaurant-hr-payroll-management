# KỊCH BẢN KIỂM THỬ CHI TIẾT TỪ F00 ĐẾN F07 — ATELIER GASTRONOMIE (DT06)

> Tài liệu chuẩn hóa khớp với mã nguồn hiện hành (sau kiểm toán logic F00–F07) và cơ sở dữ liệu **MySQL 8 (`restaurant_hr_payroll_management`)** đang kết nối trực tiếp với **MySQL Workbench**.

---

## MỤC LỤC
1. [Khởi chạy hệ thống & Kiểm tra trong MySQL Workbench](#1-khởi-chạy-hệ-thống--kiểm-tra-trong-mysql-workbench)
2. [Bản đồ Tài khoản Thực tế trong MySQL](#2-bản-đồ-tài-khoản-thực-tế-trong-mysql)
3. [Ma trận Tổng hợp: Ai được làm gì & Không được làm gì](#3-ma-trận-tổng-hợp-ai-được-làm-gì--không-được-làm-gì)
   - [3.1. Theo 8 Vai trò RBAC & Quyền API](#31-theo-8-vai-trò-rbac--quyền-api)
   - [3.2. Theo Phạm vi dữ liệu & Nguyên tắc Phân tách nhiệm vụ (SoD)](#32-theo-phạm-vi-dữ-liệu--nguyên-tắc-phân-tách-nhiệm-vụ-sod)
4. [Kịch bản Kiểm thử Chi tiết (F00 → F07)](#4-kịch-bản-kiểm-thử-chi-tiết-f00--f07)
   - [F00 · Xác thực, MFA, Phiên & Kiểm toán](#f00--xác-thực-mfa-phiên--kiểm-toán)
   - [F01 · Pháp nhân, Chi nhánh, Địa điểm & Điều chuyển](#f01--pháp-nhân-chi-nhánh-địa-điểm--điều-chuyển)
   - [F02 · Hồ sơ Nhân sự, Hợp đồng, Lương, Hạn chế & CSV Import](#f02--hồ-sơ-nhân-sự-hợp-đồng-lương-hạn-chế--csv-import)
   - [F03 · Mẫu ca, Xếp lịch tuần, Luật lao động Đức & Đổi ca](#f03--mẫu-ca-xếp-lịch-tuần-luật-lao-động-đức--đổi-ca)
   - [F04 · Chấm công trực tiếp, Nghỉ giải lao & Bổ sung thủ công](#f04--chấm-công-trực-tiếp-nghỉ-giải-lao--bổ-sung-thủ-công)
   - [F05 · Đối soát giờ công, Điều chỉnh leo thang & Khóa kỳ](#f05--đối-soát-giờ-công-điều-chỉnh-leo-thang--khóa-kỳ)
   - [F06 · Nghỉ phép năm BUrlG, Nghỉ ốm EntgFG & Nghỉ bù ArbZG §11](#f06--nghỉ-phép-năm-burlg-nghỉ-ốm-entgfg--nghỉ-bù-arbzg-11)
   - [F07 · Ngày lễ theo bang & Phụ cấp SFN §3b EStG / §1 SvEV](#f07--ngày-lễ-theo-bang--phụ-cấp-sfn-3b-estg--1-svev)
5. [Bảng kiểm Tuân thủ Luật lao động & Thuế CHLB Đức (2026)](#5-bảng-kiểm-tuân-thủ-luật-lao-động--thuế-chlb-đức-2026)

---

## 1. KHỞI CHẠY HỆ THỐNG & KIỂM TRA TRONG MYSQL WORKBENCH

### 1.1. Khởi chạy nhanh
- Đảm bảo service **`MySQL80`** đang chạy và `backend/.env` trỏ tới `jdbc:mysql://localhost:3306/restaurant_hr_payroll_management`.
- Tại thư mục gốc dự án, chạy PowerShell:
```powershell
.\Start-Atelier.ps1
```
- Truy cập giao diện web: **`http://127.0.0.1:5173`** (Frontend proxy `/api` tới Backend Spring Boot `http://127.0.0.1:8080` bật `spring.jpa.hibernate.ddl-auto=validate`).

### 1.2. Bộ câu lệnh đối soát trực tiếp trong MySQL Workbench
Mở **MySQL Workbench**, kết nối `localhost:3306` và chạy các truy vấn dưới đây để đối chiếu tức thì kết quả sau mỗi test case:

```sql
USE restaurant_hr_payroll_management;

-- F00: Tài khoản, khóa đăng nhập, MFA và nhật ký kiểm toán
SELECT id, email, name, roles, legal_entity_ids, branch_ids, active, mfa_enabled, failures, locked_until FROM user_accounts;
SELECT created_at, actor_id, actor_name, action, target, branch_id, detail FROM audit_events ORDER BY created_at DESC LIMIT 30;

-- F01: Pháp nhân, Chi nhánh, Bổ nhiệm Quản lý & Điều chuyển nhân viên
SELECT id, code, name, active FROM legal_entities;
SELECT id, code, name, legal_entity_id, state_code, city, active FROM branches;
SELECT id, manager_id, branch_id, valid_from, valid_to FROM manager_assignments;
SELECT id, employee_id, branch_id, work_location_id, position_id, kind, valid_from, valid_to, reason FROM employee_assignments;

-- F02: Nhân sự, Hợp đồng, Mức lương & Hạn chế xếp ca
SELECT e.employee_id, e.employee_code, e.display_name, e.legal_entity_id, e.email, e.hire_date,
       c.contract_type, c.pay_type, c.standard_weekly_minutes,
       w.gross_hourly_eur, w.gross_monthly_eur, w.approval_status
FROM employees e
LEFT JOIN employment_contracts c ON e.employee_id = c.employee_id AND c.status = 'ACTIVE'
LEFT JOIN wage_rates w ON c.contract_id = w.contract_id
ORDER BY e.employee_id;
SELECT restriction_id, employee_id, restriction_type, valid_from, max_daily_minutes, allow_night_shift, allow_sunday FROM work_restrictions;

-- F03: Lịch ca & Yêu cầu đổi ca
SELECT shift_id, employee_id, branch_id, planned_start_utc, planned_end_utc, planned_break_minutes, status, version_number
FROM shift_schedules ORDER BY planned_start_utc DESC;
SELECT swap_request_id, source_shift_id, requested_by_employee_id, target_employee_id, status, reviewed_by_user_id FROM shift_swap_requests;

-- F04 & F05: Chấm công thô, Nghỉ giải lao, Bảng công, Ngoại lệ & Yêu cầu sửa giờ
SELECT event_id, employee_id, shift_id, event_type, event_time_utc, source FROM attendance_events ORDER BY event_time_utc DESC;
SELECT break_id, employee_id, break_type, start_time_utc, end_time_utc, duration_minutes FROM break_records ORDER BY break_id DESC;
SELECT timesheet_id, employee_id, branch_id, work_date, actual_start_utc, actual_end_utc, actual_break_minutes,
       worked_minutes, late_minutes, early_departure_minutes, overtime_minutes, status, has_exception, approved_by_user_id, is_locked, recalculation_required
FROM attendance_timesheets ORDER BY timesheet_id DESC;
SELECT exception_id, timesheet_id, employee_id, exception_type, severity, status, resolved_by_user_id FROM attendance_exceptions ORDER BY exception_id DESC;
SELECT request_id, timesheet_id, employee_id, delta_minutes, requires_hr_escalation, status, decided_by_user_id FROM attendance_change_requests ORDER BY request_id DESC;
SELECT adjustment_id, timesheet_id, change_request_id, adjusted_by_user_id, old_break_minutes, new_break_minutes, reason FROM attendance_adjustments ORDER BY adjustment_id DESC;

-- F06: Số dư phép, Đơn nghỉ phép, Nghỉ ốm & Nghỉ bù
SELECT b.balance_id, b.employee_id, lt.leave_code, b.leave_year, b.entitled_days, b.used_days, b.carried_days, b.remaining_days, b.expiry_date, b.approval_status
FROM leave_balances b JOIN leave_types lt ON b.leave_type_id = lt.leave_type_id;
SELECT leave_request_id, employee_id, leave_type_id, start_date, end_date, requested_days, status, reviewed_by_user_id FROM leave_requests ORDER BY leave_request_id DESC;
SELECT absence_id, employee_id, leave_type_id, start_date, end_date, has_medical_certificate, is_continued_pay_eligible, gross_pay_impact_percent, verification_status, recorded_by_user_id FROM absence_records;
SELECT rest_id, employee_id, branch_id, related_work_date, rest_date, deadline_date, rest_kind, status FROM compensatory_rest_days;

-- F07: Ngày lễ, Chính sách phụ cấp, Phân đoạn giờ làm & Kết quả tính SFN
SELECT state_code, holiday_date, holiday_code, holiday_name_de, verification_status FROM public_holidays WHERE YEAR(holiday_date) = 2026 ORDER BY state_code, holiday_date;
SELECT policy_id, legal_entity_id, policy_code, valid_from, approval_status, approved_by_user_id FROM allowance_policies;
SELECT segment_id, timesheet_id, employee_id, segment_start_utc, segment_end_utc, payable_minutes, is_night, is_deep_night, is_sunday, is_holiday, is_special_day, segment_type
FROM work_time_segments ORDER BY segment_id DESC;
SELECT calculation_id, timesheet_id, employee_id, allowance_code, base_wage_eur, rate_percent, paid_amount_eur, tax_exempt_amount_eur, taxable_amount_eur, social_insurance_exempt_amount_eur
FROM allowance_calculations ORDER BY calculation_id DESC;
```

---

## 2. BẢN ĐỒ TÀI KHOẢN THỰC TẾ TRONG MYSQL

> **Quan trọng:** Khi kiểm thử quyền chi nhánh / pháp nhân, cần dùng đúng tài khoản khớp với chi nhánh được gán trong DB `restaurant_hr_payroll_management`:

| ID User | Email đăng nhập | Tên hiển thị | Vai trò (`roles`) | Pháp nhân (`legalEntityIds`) | Chi nhánh quản lý / làm việc | Hồ sơ NV liên kết | MFA bắt buộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `admin` | `admin@restaurant.example` | Administrator | `SYSTEM_ADMIN`, `HR_OFFICER`, `RESTAURANT_MANAGER`, `PAYROLL_OFFICER` | `1, 2` (Toàn cục) | Tất cả (`1..5`) | Không có | **Có** |
| `1` | `lukas.schneider@restaurant.example` | Lukas Schneider | `SYSTEM_ADMIN`, `HR_OFFICER`, `RESTAURANT_MANAGER` | `1` (`DEMO-BW`) | `1` (`STU-01` · Stuttgart, BW) | `#1` (`E-0001`) | **Có** |
| `10` | `daniel.krueger@restaurant.example` | Daniel Krüger | `HR_OFFICER`, `PAYROLL_OFFICER` | `2` (`DEMO-NORTH`) | `4` (`BER-01` · Berlin, BE) | `#10` (`E-0010`) | **Có** |
| `5` | `tobias.hoffmann@restaurant.example` | Tobias Hoffmann | `RESTAURANT_MANAGER` | `1` | **`2` (`KAR-01` · Karlsruhe, BW)** | `#5` (`E-0005`) | Tùy chọn |
| `7` | `katharina.wagner@restaurant.example` | Katharina Wagner | `RESTAURANT_MANAGER` | `1` | **`3` (`FRE-01` · Freiburg, BW)** | `#7` (`E-0007`) | Tùy chọn |
| `9` | `jonas.richter@restaurant.example` | Jonas Richter | `RESTAURANT_MANAGER` | `2` | **`5` (`MUC-01` · München, BY)** | `#9` (`E-0009`) | Tùy chọn |
| `2` | `anna.mueller@restaurant.example` | Anna Müller | `EMPLOYEE` | `1` | `1` (`STU-01`) | `#2` (`E-0002` · Server) | Tùy chọn |
| `3` | `markus.weber@restaurant.example` | Markus Weber | `EMPLOYEE` | `1` | `1` (`STU-01`) | `#3` (`E-0003` · Chef) | Tùy chọn |
| `4` | `sophie.fischer@restaurant.example` | Sophie Fischer | `EMPLOYEE` | `1` | `1` (`STU-01`) | `#4` (`E-0004` · **MuSchG**) | Tùy chọn |
| `6` | `felix.bauer@restaurant.example` | Felix Bauer | `EMPLOYEE` | `1` | `2` (`KAR-01`) | `#6` (`E-0006` · **JArbSchG**) | Tùy chọn |
| `8` | `leonie.becker@restaurant.example` | Leonie Becker | `EMPLOYEE` | `2` | `4` (`BER-01` · Berlin) | `#8` (`E-0008` · Server) | Tùy chọn |
| `demo-hr` | `hr@atelier.local` | Lena Fischer (HR) | `HR_OFFICER` (thuần) | *(cập nhật nếu test)* | `1, 2, 3` | Không có | **Có** |

> 💡 **Lưu ý kiểm thử các vai trò chưa có tài khoản riêng (`AUDITOR`, `DPO`, `FINANCE_APPROVER`):** Dùng tài khoản `admin@restaurant.example` vào mục **Tài khoản & Phân quyền** (`#access`) tạo 3 tài khoản riêng gắn từng role tương ứng để kiểm thử ma trận 8 vai trò đầy đủ.

---

## 3. MA TRẬN TỔNG HỢP: AI ĐƯỢC LÀM GÌ & KHÔNG ĐƯỢC LÀM GÌ

### 3.1. Theo 8 Vai trò RBAC & Quyền API

Quy ước ký hiệu:
- ✅ **Được phép** (bị giới hạn thêm bởi phạm vi Pháp nhân/Chi nhánh hoặc Hồ sơ cá nhân ở Mục 3.2)
- 👤 **Chỉ dữ liệu của chính mình** (`access.requireSelf` / `selfEmployeeId`)
- ❌ **Bị chặn** (`403 Forbidden` ở Backend & ẩn/khóa thao tác trên UI)

| Phân hệ / Chức năng cụ thể | `SYSTEM_ADMIN` | `HR_OFFICER` | `RESTAURANT_MANAGER` | `EMPLOYEE` | `PAYROLL_OFFICER` | `FINANCE_APPROVER` | `AUDITOR` / `DPO` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Bắt buộc MFA TOTP khi dùng nghiệp vụ** | **Bắt buộc** | **Bắt buộc** | Tự chọn | Tự chọn | **Bắt buộc** | **Bắt buộc** | **Bắt buộc** |
| **F00 · Xem danh sách User, Tạo/Sửa User, Reset password** (`iam.read`/`write`) | ✅ Toàn hệ thống | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **F00 · Xem Ma trận phân quyền & SoD** (`/iam/sod-matrix`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **F00 · Xem Nhật ký hoạt động (`audit.read`)** | ✅ Toàn bộ | ✅ Trong phạm vi | ❌ | ❌ | ❌ | ❌ | ✅ Trong phạm vi |
| **F00 · Bảo mật cá nhân (Đổi/bật MFA, Thu hồi phiên của mình)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **F01 · Xem Pháp nhân & Chi nhánh (`org.read`)** | ✅ Toàn bộ | ✅ Trong phạm vi | ✅ Chi nhánh được giao | ❌ | ✅ Trong phạm vi | ✅ Trong phạm vi | ✅ Trong phạm vi |
| **F01 · Tạo Pháp nhân mới (`POST /org/entities`)** | ✅ Duy nhất | ❌ (`403`) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **F01 · Sửa Pháp nhân / Tạo & sửa Chi nhánh, Địa điểm (`org.write`)** | ✅ | ✅ Trong pháp nhân | ❌ | ❌ | ❌ | ❌ | ❌ |
| **F01 · Bổ nhiệm Quản lý & Điều chuyển NV (`assignment.write`)** | ✅ | ✅ Trong phạm vi | ❌ | ❌ | ❌ | ❌ | ❌ |
| **F02 · Xem danh sách Nhân viên (không có hợp đồng/lương)** (`workforce.read`) | ✅ | ✅ | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ (`403`) | ❌ | ❌ |
| **F02 · Xem chi tiết Hợp đồng, Lương, Hạn chế (`GET /employees/{id}`)** | ❌ (SoD-02) | ✅ Trong phạm vi | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ❌ | ❌ |
| **F02 · Tạo NV, Sửa hợp đồng, Sửa lương, Thêm hạn chế, Import CSV (`workforce.write`)** | ❌ (`403`) | ✅ Trong phạm vi | ❌ (`403`) | ❌ | ❌ | ❌ | ❌ |
| **F03 · Xem Lịch ca (`schedule.read`)** | ✅ Nháp + Công bố | ✅ Nháp + Công bố | ✅ Chi nhánh quản lý | 👤 Chỉ ca **PUBLISHED** của mình | ❌ | ❌ | ❌ |
| **F03 · Tạo Mẫu ca, Thêm/Xóa ca nháp, Kiểm tra ArbZG, Công bố ca (`schedule.write`)** | ✅ | ✅ Trong phạm vi | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ | ❌ | ❌ |
| **F03 · Gửi yêu cầu đổi ca (`POST /swap-requests`)** | 👤 (nếu có hồ sơ NV) | 👤 (nếu có hồ sơ NV) | 👤 | 👤 Ca của mình | ❌ | ❌ | ❌ |
| **F03 · Duyệt / Từ chối đổi ca (`schedule.write`)** | ✅ | ✅ Trong phạm vi | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ | ❌ | ❌ |
| **F04 · Check-in / Check-out / Bắt đầu-Kết thúc nghỉ / Xem công cá nhân** | 👤 | 👤 | 👤 | 👤 | 👤 (nếu có NV) | 👤 (nếu có NV) | 👤 (nếu có NV) |
| **F04 · Xem công chi nhánh & Bổ sung giờ công thủ công (`manual-entry`)** | ✅ | ✅ Trong phạm vi | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ | ❌ | ❌ |
| **F05 · Gửi đơn xin sửa giờ công (`POST /change-requests`)** | 👤 | 👤 | 👤 | 👤 Công của mình | 👤 (nếu có NV) | 👤 (nếu có NV) | 👤 (nếu có NV) |
| **F05 · Xem KPI/Bảng đối soát, Duyệt công, Giải quyết ngoại lệ, Khóa kỳ** | ✅ | ✅ Trong phạm vi | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ | ❌ | ❌ |
| **F05 · Duyệt / Từ chối đơn sửa giờ ≤ 60 phút** | ✅ (trừ đơn mình) | ✅ (trừ đơn mình) | ✅ Chi nhánh (trừ đơn mình) | ❌ | ❌ | ❌ | ❌ |
| **F05 · Duyệt / Từ chối đơn sửa giờ > 60 phút (`HR_ESCALATED`)** | ✅ (trừ đơn mình) | ✅ (trừ đơn mình) | ❌ (`403` Bắt buộc HR/Admin) | ❌ | ❌ | ❌ | ❌ |
| **F06 · Cấp / Duyệt số dư phép năm BUrlG (`POST /leaves/balances`)** | ❌ (`403`) | ✅ Nhân viên quản lý (trừ mình) | ❌ (`403`) | ❌ | ❌ | ❌ | ❌ |
| **F06 · Nộp đơn xin nghỉ phép năm / không lương (`POST /leaves/requests`)** | 👤 | 👤 | 👤 | 👤 | 👤 (nếu có NV) | 👤 (nếu có NV) | 👤 (nếu có NV) |
| **F06 · Duyệt / Từ chối đơn nghỉ phép (`schedule.write`)** | ✅ (trừ đơn mình) | ✅ (trừ đơn mình) | ✅ Nhân viên quản lý (trừ mình) | ❌ | ❌ | ❌ | ❌ |
| **F06 · Ghi nhận hồ sơ nghỉ ốm EntgFG (`POST /leaves/sickness`)** | ❌ (`403`) | ✅ Trong phạm vi | ❌ (`403`) | ❌ | ❌ | ❌ | ❌ |
| **F06 · Xem hồ sơ nghỉ ốm (`GET /leaves/sickness`)** | 👤 Chỉ của mình | ✅ Trong phạm vi | 👤 Chỉ của mình | 👤 Chỉ của mình | 👤 | 👤 | 👤 |
| **F06 · Xác nhận ngày nghỉ bù ArbZG §11 (`compensatory-rests/{id}/fulfill`)** | ✅ | ✅ Trong phạm vi | ✅ Chi nhánh quản lý | ❌ (`403`) | ❌ | ❌ | ❌ |
| **F07 · Xem lịch lễ theo bang (`GET /allowances/holidays`)** | ✅ Trong chi nhánh | ✅ Trong chi nhánh | ✅ Trong chi nhánh | 👤 Chi nhánh mình trực | ✅ Trong chi nhánh | ✅ Trong chi nhánh | ✅ Trong chi nhánh |
| **F07 · Xem báo cáo & chi tiết phụ cấp SFN (`allowance.read`)** | ❌ (`403`) | ✅ Trong chi nhánh | ❌ (`403`) | 👤 Chỉ bảng công của mình | ✅ Trong chi nhánh | ❌ (`403`) | ❌ (`403`) |
| **F07 · Tính & lưu phân đoạn phụ cấp SFN (`POST /calculate/{id}` - `allowance.write`)** | ❌ (`403`) | ✅ Trong chi nhánh | ❌ (`403`) | ❌ (`403`) | ✅ Trong chi nhánh | ❌ (`403`) | ❌ (`403`) |

> ⚠️ **Lưu ý quan trọng về tài khoản kết hợp role trong MySQL:** Tài khoản `admin@restaurant.example` đang gán đồng thời 4 role (`SYSTEM_ADMIN, HR_OFFICER, RESTAURANT_MANAGER, PAYROLL_OFFICER`), và `lukas.schneider` có 3 role (`SYSTEM_ADMIN, HR_OFFICER, RESTAURANT_MANAGER`). Để kiểm chứng **những gì một role đơn lẻ KHÔNG được làm** (ví dụ: `SYSTEM_ADMIN` thuần không sửa lương F02 hay tính SFN F07; `RESTAURANT_MANAGER` thuần `tobias.hoffmann` không xem lương F02, không duyệt đơn >60m F05, không cấp số dư phép/ghi nghỉ ốm F06, không xem/tính SFN F07), hãy dùng đúng tài khoản có role thuần (`tobias.hoffmann`, `daniel.krueger`, `anna.mueller`, hoặc tài khoản tạo mới gán 1 role).

---

### 3.2. Theo Phạm vi dữ liệu & Nguyên tắc Phân tách nhiệm vụ (SoD)

1. **Giới hạn Phạm vi Pháp nhân & Chi nhánh (`Access` Scope)**:
   - `RESTAURANT_MANAGER` chỉ thấy và thao tác được trên **chi nhánh mình được giao** (ví dụ: Tobias chỉ quản lý chi nhánh `2 · KAR-01`, **không thể** xem hay duyệt dữ liệu của chi nhánh `1 · STU-01` hoặc `5 · MUC-01` — API trả `403 Forbidden`).
   - `HR_OFFICER` / `PAYROLL_OFFICER` chỉ thao tác trong **pháp nhân/chi nhánh được cấp** (ví dụ: Lukas thuộc pháp nhân `1`, không xem/sửa được nhân sự của pháp nhân `2 · DEMO-NORTH`; Daniel thuộc pháp nhân `2`, không xem/sửa được pháp nhân `1`).
2. **SOD-01 — Cấm kết hợp `PAYROLL_OFFICER` + `FINANCE_APPROVER`**:
   - Tạo hoặc sửa tài khoản có cả 2 vai trò này bị chặn ngay (`400 Bad Request`).
3. **SOD-02 — Tách biệt Quản trị hệ thống & Dữ liệu tiền lương**:
   - `SYSTEM_ADMIN` thuần không được cấp `workforce.write`, `allowance.read`, `allowance.write` nên không xem/sửa được hợp đồng, mức lương, nghỉ ốm của người khác hay báo cáo phụ cấp SFN.
4. **SOD-03 — Cấm tự phê duyệt cho chính bản thân (4-Eyes Principle)**:
   - Quản lý/HR không thể tự duyệt bảng chấm công của chính mình (`approveTimesheetDirect`), tự duyệt/từ chối đơn xin sửa giờ của chính mình (`approveChangeRequest` / `rejectChangeRequest`), tự duyệt đơn nghỉ phép của chính mình (`reviewLeaveRequest`), hay tự cấp số dư phép cho mình (`approveLeaveBalance`). Hệ thống chặn cả trên giao diện (nút bị disable) và ở Backend (`403 Forbidden`).
5. **SOD-04 — Cấm điều chuyển xuyên pháp nhân trực tiếp**:
   - Không thể điều chuyển nhân viên từ chi nhánh thuộc pháp nhân `1` (`DEMO-BW`) sang chi nhánh thuộc pháp nhân `2` (`DEMO-NORTH`) qua form điều chuyển F01 (`400 Bad Request`).
6. **SOD-05 — Một Quản lý trưởng duy nhất tại mỗi chi nhánh trong cùng khoảng thời gian**:
   - Bổ nhiệm hai `RESTAURANT_MANAGER` cho cùng một chi nhánh với khoảng ngày `validFrom..validTo` giao nhau bị chặn (`400 Bad Request`).
7. **Không thể tự khóa hoặc hạ cấp tài khoản Admin đang đăng nhập**:
   - Admin sửa chính tài khoản của mình thành `active = false` hoặc bỏ role `SYSTEM_ADMIN` bị chặn (`400 Bad Request`).

---

## 4. KỊCH BẢN KIỂM THỬ CHI TIẾT (F00 → F07)

---

### F00 · Xác thực, MFA, Phiên & Kiểm toán

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F00-01** | `anna.mueller@restaurant.example` | Dương | Đăng nhập đúng mật khẩu (role `EMPLOYEE`, chưa bật MFA) -> chuyển đổi ngôn ngữ `VI`/`DE` và Light/Dark mode -> vào `#security`. | Vào thẳng không qua `MfaGate`. Mọi nhãn UI đổi ngôn ngữ tức thì. Có thể tự bật/xoay MFA hoặc thu hồi phiên của chính mình. |
| **TC-F00-02** | `lukas.schneider@restaurant.example` hoặc `daniel.krueger@restaurant.example` | Âm | Đăng nhập bằng tài khoản có role nhạy cảm nhưng chưa hoàn tất bước nhập mã TOTP 6 số -> thử gọi API nghiệp vụ (ví dụ `/api/v1/workforce/employees`). | Bị giữ tại màn hình `MfaGate`. API trả `403 Forbidden` (*"Bitte zuerst die Zwei-Faktor-Anmeldung abschließen."*). Sau khi xác thực TOTP đúng mới truy cập được; nhập lại cùng mã OTP đó lần 2 trong cùng bước 30s bị từ chối. |
| **TC-F00-03** | *(Bất kỳ tài khoản hợp lệ)* | Âm | Nhập sai mật khẩu đúng **5 lần liên tiếp** cho `anna.mueller`. Sau khi bị khóa, thử gửi thêm **1 lần sai** và **1 lần đúng** ngay trong thời gian khóa 15 phút. | Lần thứ 5: `user_accounts.failures = 5`, `locked_until = now + 900s`. Lần thứ 6 trở đi trong lúc đang khóa: **trả 401**, **KHÔNG tăng `failures` lên 6** và **KHÔNG đẩy lùi `locked_until`**. Sau 15 phút đăng nhập lại thành công sẽ reset `failures = 0`. |
| **TC-F00-04** | `admin@restaurant.example` | Dương + Âm | Vào `#access` -> tạo user kết hợp `PAYROLL_OFFICER` + `FINANCE_APPROVER` -> tạo user đơn lẻ `AUDITOR` -> thử bỏ tích `active` hoặc role `SYSTEM_ADMIN` trên chính tài khoản `admin`. | Kết hợp `PAYROLL_OFFICER + FINANCE_APPROVER`: bị chặn **`400` (SOD-01)**. Tạo `AUDITOR` thành công. Tự khóa/hạ cấp chính mình: bị chặn **`400`**. Vô hiệu hóa một user khác đang có phiên -> phiên của user đó lập tức mất hiệu lực ở request kế tiếp. |
| **TC-F00-05** | `tobias.hoffmann` (`RESTAURANT_MANAGER`) vs `AUDITOR` mới tạo (gắn `legalEntityIds = 1`) | Âm + Dương | Tobias truy cập `#access` hoặc `#activity`; `AUDITOR` (đã qua MFA) truy cập `#activity` (hoạt động hệ thống). | Tobias: menu ẩn hoàn toàn, gọi `/api/v1/iam/users` trả `403`. `AUDITOR`: thấy cả sự kiện gắn chi nhánh thuộc pháp nhân `1` lẫn sự kiện không gắn `branch_id` (như `ACCOUNT_CREATED`, `WORKFORCE_IMPORTED` của pháp nhân `1`), không thấy sự kiện của pháp nhân `2`. |

---

### F01 · Pháp nhân, Chi nhánh, Địa điểm & Điều chuyển

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F01-01** | `admin@restaurant.example` | Dương | Vào `#entities` -> bấm **Thêm pháp nhân** (`code: AT-SOUTH-01`, `name: Süd Gastronomie GmbH`) -> vào `#branches` tạo chi nhánh mới trực thuộc pháp nhân đó (chọn bang `BY` hoặc `HH`, múi giờ `Europe/Berlin`). | Pháp nhân và chi nhánh (kèm 1 `WorkLocation` mặc định `Hauptstandort`) được lưu vào bảng `legal_entities`, `branches`, `work_locations` với khóa `id` dạng UUID. |
| **TC-F01-02** | `demo-hr` (`hr@atelier.local` — `HR_OFFICER` thuần) | Âm | Thử gửi `POST /api/v1/org/entities` tạo pháp nhân mới, hoặc sửa `legal_entities` không nằm trong `legalEntityIds` của mình. | Bị chặn **`403 Forbidden`**: chỉ `SYSTEM_ADMIN` được tạo pháp nhân; `HR_OFFICER` chỉ sửa pháp nhân và quản lý chi nhánh nằm trong phạm vi của mình. |
| **TC-F01-03** | `tobias.hoffmann` (`RESTAURANT_MANAGER`) | Dương + Âm | Kiểm tra màn hình `#branches` & thử sửa thông tin chi nhánh `KAR-01` hoặc xem chi nhánh `BER-01`. | Chỉ thấy duy nhất chi nhánh `2 · KAR-01`. Không có nút thêm/sửa chi nhánh (`org.write`), cố gọi API sửa trả `403`. Không thấy `BER-01` hoặc `STU-01`. |
| **TC-F01-04** | `lukas.schneider` (pháp nhân `1`) | Âm | Vào `#people` -> gán thêm 1 Quản lý thứ hai cho `STU-01` có ngày giao với `mgr-1-1` (`2026-01-01..null`); thử điều chuyển Anna Müller (`STU-01` thuộc pháp nhân `1`) sang `BER-01` (thuộc pháp nhân `2`). | Bổ nhiệm quản lý trùng ngày bị chặn **`400` (SOD-05)**. Điều chuyển sang pháp nhân khác bị chặn **`400` (SOD-04)**. Điều chuyển trong cùng pháp nhân `1` (ví dụ `STU-01` -> `FRE-01`) sau khi kết thúc phân công cũ thành công và giữ lịch sử snapshot địa chỉ/bang cũ. |

---

### F02 · Hồ sơ Nhân sự, Hợp đồng, Lương, Hạn chế & CSV Import

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F02-01** | `tobias.hoffmann` (`RESTAURANT_MANAGER`) | Dương + Âm | Vào **Nhân sự & Hợp đồng** (`#workforce`) -> kiểm tra danh sách nhân viên, thử bấm xem chi tiết hợp đồng/lương của `Felix Bauer` (`KAR-01`) hoặc thử tạo nhân viên mới / import CSV. | Chỉ thấy danh sách cơ bản nhân viên thuộc chi nhánh `KAR-01` (cột lương/hợp đồng rỗng, không lộ dữ liệu nhạy cảm). Không có quyền tạo NV, sửa lương, thêm hạn chế hay import CSV (API trả `403`). |
| **TC-F02-02** | `lukas.schneider` (`HR_OFFICER`, pháp nhân `1`) | Âm + Dương | Tạo nhân viên mới ở `STU-01` với `hireDate = 2026-05-01`: (a) nhập lương `13.89 EUR/h`; (b) sửa thành `13.90 EUR/h`; (c) thử thêm hợp đồng `MINIJOB` lương `604 EUR/tháng` rồi đổi thành `603 EUR/tháng`. | `13.89 EUR/h` bị chặn **`400`** (vi phạm MiLoG 2026 `>= 13.90 EUR/h`). `13.90 EUR/h` lưu thành công cùng hợp đồng, `WageRate` `APPROVED`, `EmployeeRef` và `EmployeeAssignment`. `MINIJOB > 603 EUR/tháng` bị chặn **`400`**; `603 EUR/tháng` hợp lệ. |
| **TC-F02-03** | `lukas.schneider` (`HR_OFFICER`) | Dương + Âm | Thêm `WorkRestriction` cho một nhân viên nữ (`MATERNITY_PROTECTION`) hoặc nhân viên có ngày thuê tương lai (`hireDate = tháng sau`). Kiểm tra phân quyền xem nhân viên mới tạo bởi Lukas vs Tobias (`KAR-01`). | Validate loại restriction, khoảng ngày hiệu lực và giới hạn phút hợp lệ (giá trị sai trả `400`). Nhân viên mới có ngày bắt đầu làm trong tương lai vẫn được HR/Quản lý chi nhánh nhận việc nhìn thấy và xếp lịch trước. |
| **TC-F02-04** | `lukas.schneider` (`HR_OFFICER`) | Dương + Âm | Vào **Nhập CSV** -> bấm **Chạy thử (`dryRun: true`)** với tệp chứa: (a) dấu `;`, trường tên có dấu ngoặc kép `"Müller, Max"`; (b) cột `weekly_hours = 37,5`; (c) `hire_date = 2020-01-01`; (d) dòng có lỗi ở cả `branch_id` (lệch chi nhánh) lẫn `weekly_hours = 0`. | Dry-run **không ghi DB**. Trả đúng lỗi từng cột trên cùng 1 dòng (không dừng sớm khi gặp lỗi `branch_id`); ngày chưa cấu hình MiLoG báo đúng lỗi ở `hire_date`; `37,5` được parse thành `2250` phút hợp lệ; dòng hợp lệ khi bấm **Nhập chính thức** được ghi vào `employees` và `import_jobs.created_by_user_id = '1'`. |

---

### F03 · Mẫu ca, Xếp lịch tuần, Luật lao động Đức & Đổi ca

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F03-01** | `anna.mueller` (`EMPLOYEE`) | Âm | Mở **Lịch ca** (`#scheduling`) trước khi quản lý công bố lịch tuần mới; thử gọi `POST /api/v1/scheduling/shifts` hoặc `publish`. | Chỉ thấy các ca **của chính mình** ở trạng thái **`PUBLISHED`**; tuyệt đối không thấy ca `DRAFT` hoặc ca của đồng nghiệp (`Markus`, `Sophie`). Gọi API tạo/xóa/công bố trả `403`. |
| **TC-F03-02** | `lukas.schneider` (`STU-01`) | Âm | Kiểm thử các ca vi phạm luật Đức cho nhân viên tại `STU-01`:<br>1. Xếp cho **Sophie Fischer (`#4` · `MATERNITY_PROTECTION`)** ca `14:00–20:30` Berlin hoặc ca Chủ nhật.<br>2. Xếp cho **Felix Bauer (`#6` · `JArbSchG` tại `KAR-01` khi đăng nhập `Tobias`)** ca `05:30–13:30` hoặc `14:00–22:15`.<br>3. Xếp cho **Anna Müller (`#2`)** 2 ca liên tiếp nối đuôi không nghỉ: `08:00–12:00` và `12:00–16:00`.<br>4. Xếp ca dài đúng `6h00` không nghỉ vs `6h05` không nghỉ; ca > `10h`. | 1. Bị chặn `BLOCKER`: `MUSCHG_NIGHT_WORK_BAN` (kết thúc `20:30 > 20:00`) / `RESTRICTION_SUNDAY_BAN`.<br>2. Bị chặn `BLOCKER`: `JARBSCHG_NIGHT_WORK` (trước `06:00` hoặc sau `22:00`; `<16` tuổi bị chặn sau `20:00`).<br>3. Ca thứ 2 bị chặn **`400` `REST_PERIOD_VIOLATION`** (`0.0h < 11.0h` nghỉ bù ArbZG §5).<br>4. Ca `6h00` không cảnh báo thừa; ca `6h05` cảnh báo ArbZG §4 (`WARNING`); ca `> 10h` bị chặn `BLOCKER` ArbZG §3. |
| **TC-F03-03** | `lukas.schneider` (`STU-01`) | Dương | Tạo ca hợp lệ -> kiểm tra cảnh báo (`check`) -> bấm **Công bố lịch (`publish`)** -> bấm **Xóa ca nháp** trên một ca `DRAFT` khác -> thử xóa ca đã `PUBLISHED`. | Khi xóa ca nháp, hộp xác nhận hiện đúng tên NV, ngày, giờ. Ca `PUBLISHED` bị chặn xóa **`409`**. Khi công bố, bảng `notifications` sinh thông báo cho nhân viên liên quan. |
| **TC-F03-04** | `anna.mueller` & `lukas.schneider` | Dương + Âm | Anna gửi yêu cầu đổi ca đã `PUBLISHED` cho đồng nghiệp `Markus Weber` (`#3`) cùng chi nhánh -> thử gửi tiếp lần 2 cho cùng ca đó -> mở Sàn đổi ca xem tên người nhận -> Lukas duyệt đơn. | Gửi trùng đơn `PENDING` cùng ca bị chặn **`409`**. Trong sàn đổi ca của Anna vẫn hiển thị đúng tên **`Markus Weber`** (không chỉ `#3`). Lukas duyệt thành công -> `shift_schedules.employee_id` đổi sang `3`, `reviewed_by_user_id = '1'`. |

---

### F04 · Chấm công trực tiếp, Nghỉ giải lao & Bổ sung thủ công

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F04-01** | `anna.mueller` (`EMPLOYEE`) | Dương | Vào **Chấm công** (`#attendance`) kiểm tra đồng hồ Berlin -> bấm **Check-in** -> bấm **Bắt đầu nghỉ** rồi đợi **< 60 giây** bấm **Kết thúc nghỉ** -> bấm **Check-out**. | Đồng hồ UI hiển thị đúng giờ `Europe/Berlin`. Kết thúc nghỉ dưới 60 giây ghi `duration_minutes = 0`, `actual_break_minutes = 0` (không làm tròn lên 1 phút gây lỗi `409` ở F07). `attendance_events` lưu đủ `CHECK_IN` và `CHECK_OUT`. |
| **TC-F04-02** | `markus.weber` (`EMPLOYEE`) | Dương | Giả lập hoặc thực hiện check-in ca đêm trước 00:00 (ví dụ `22:00` Berlin hôm trước) -> sau 00:00 hôm sau tải lại trang Chấm công -> bấm **Check-out**. | Sau nửa đêm `getStatus` vẫn hiển thị **`Đang làm việc trong ca`** (không mất trạng thái đang trực) và cho phép Check-out khớp timesheet qua đêm đó. |
| **TC-F04-03** | `anna.mueller` vs `lukas.schneider` | Âm + Dương | Anna thử gửi `POST /api/v1/attendance/manual-entry` -> bị từ chối. Lukas mở modal **Bổ sung giờ công thủ công**: (a) nhập ngày đang thuộc kỳ **đã khóa**; (b) nhập ngày chưa khóa ca `08:00–15:00` (`7h`) nghỉ `0` phút. | Anna gọi API trả `403`. Nhập vào ngày đã khóa kỳ bị chặn **`409`**. Nhập `7h` nghỉ `0` phút thành công (`PENDING_APPROVAL`) nhưng tự động sinh ngoại lệ `INSUFFICIENT_BREAK` (`has_exception = true`) theo ArbZG §4. |

---

### F05 · Đối soát giờ công, Điều chỉnh leo thang & Khóa kỳ

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F05-01** | `tobias.hoffmann` (`KAR-01`) vs `lukas.schneider` (`STU-01`) | Âm (Scope) | Có yêu cầu sửa giờ đang `PENDING` ở chi nhánh `STU-01` (của Anna) -> đăng nhập Tobias mở **Đối soát (`#reconciliation`)** hoặc gọi API `/kpis`, `/change-requests?branchId=2`. | Tobias chỉ thấy số liệu KPI và yêu cầu sửa giờ thuộc chi nhánh **`2 · KAR-01`**; **tuyệt đối không rò rỉ** ngoại lệ hay đơn sửa giờ từ `STU-01` hay `MUC-01`. |
| **TC-F05-02** | `tobias.hoffmann` (`RESTAURANT_MANAGER` · `KAR-01`) | Âm (SoD) | Tobias tự chấm công cho mình ở `KAR-01` (hoặc tạo đơn sửa giờ cho timesheet của chính Tobias) -> mở trang Đối soát xem dòng của chính mình. | Cả nút **Duyệt** trực tiếp và nút **Xem xét & Duyệt** đơn sửa giờ của chính Tobias bị disable kèm tooltip SoD; gọi API trực tiếp bị chặn **`403 Forbidden` (SOD-03)**. |
| **TC-F05-03** | `felix.bauer` (`KAR-01`), `tobias.hoffmann`, `lukas.schneider`/`admin` | Âm + Dương | Felix mở modal **Yêu cầu điều chỉnh** kiểm tra giờ gốc hiển thị theo `Europe/Berlin` (kể cả khi ca qua nửa đêm `22:00 → 04:00`, preview `deltaMinutes` tính đúng) -> gửi 1 đơn lệch **`≤ 60 phút`** (`PENDING`) và 1 đơn lệch **`> 60 phút`** (`HR_ESCALATED`, đổi giờ nghỉ từ `0` lên `30` phút). | Đơn `≤ 60m`: Tobias duyệt/từ chối được. Đơn `> 60m`: Tobias bị chặn **`403`** khi bấm cả Duyệt lẫn Từ chối; phải dùng tài khoản có quyền HR/Admin (`admin@restaurant.example`) xử lý. Sau khi duyệt: `attendance_adjustments.adjusted_by_user_id` lưu đúng ID user, `early_departure_minutes` cập nhật lại, `break_records` được đồng bộ thành khoảng nghỉ `30` phút trong khung giờ mới. Không thể từ chối lại đơn đã `APPROVED` (`400`). |
| **TC-F05-04** | `tobias.hoffmann` (`KAR-01`) | Âm + Dương | Thử bấm **Khóa kỳ công** khi còn timesheet `PENDING_APPROVAL` hoặc đơn sửa giờ đang chờ -> duyệt hết bảng công (giải quyết hết ngoại lệ trước khi duyệt trực tiếp) -> khóa kỳ đến ngày T. | Còn đơn/công chưa duyệt -> chặn **`409`**. Sau khi duyệt hết -> `is_locked = 1`. Mọi thao tác gửi đơn sửa giờ hoặc bổ sung công thủ công `manual-entry` vào `<= T` sau đó đều bị chặn. |

---

### F06 · Nghỉ phép năm BUrlG, Nghỉ ốm EntgFG & Nghỉ bù ArbZG §11

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F06-01** | `lukas.schneider` (`HR_OFFICER`), `tobias.hoffmann`, `anna.mueller` | Dương + Âm | 1. Tobias thử cấp số dư phép hoặc ghi nhận nghỉ ốm.<br>2. Anna mở modal tạo đơn kiểm tra loại nghỉ hiển thị; Anna thử xem nút Duyệt trên dòng đơn của mình.<br>3. Lukas cấp số dư cho Anna năm 2026: `entitledDays = 20, carriedDays = 5` (kiểm tra `expiryDate = 2026-03-31`) -> Anna xin nghỉ 22 ngày trong tháng 6/2026 (`> 31/03`) -> Anna xin lại 2 ngày hợp lệ -> Lukas duyệt. | 1. Tobias bị chặn **`403`** ở cả cấp phép & ghi nghỉ ốm (chỉ `HR_OFFICER` được làm).<br>2. Form tạo đơn của Anna chỉ hiện loại có trong DB (`ANNUAL`, `UNPAID`), bảng đơn ẩn nút Duyệt/Từ chối với Anna.<br>3. Đơn 22 ngày sau 31/03 bị chặn **`409`** do `5` ngày chuyển tiếp đã hết hạn sau `31/03` (BUrlG §7(3)). Đơn 2 ngày được Lukas duyệt -> `remaining_days` giảm 2, `reviewed_by_user_id = '1'`. |
| **TC-F06-02** | `lukas.schneider` (`HR_OFFICER`) & `anna.mueller` | Dương + Âm | Lukas ghi nhận nghỉ ốm `2026-11-24..2026-11-26` (kèm mã eAU / chọn nghỉ chăm con ốm) cho Markus Weber (`#3`) -> thử ghi thêm 1 hồ sơ nghỉ ốm khác trùng ngày `2026-11-25` -> Markus thử nộp đơn nghỉ phép trùng ngày `2026-11-25`. | Hồ sơ đầu lưu vào `absence_records` (`100%` EntgFG nếu NV đủ >4 tuần và không phải `CHILD_SICK`; `0%` nếu `CHILD_SICK`). Ghi trùng ngày nghỉ ốm hoặc nộp đơn nghỉ phép đè lên ngày nghỉ ốm đều bị chặn **`409`**. Nhân viên chỉ xem được nghỉ ốm của mình; Tobias (không có `workforce.write`) không xem được nghỉ ốm của nhân viên khác. |
| **TC-F06-03** | `lukas.schneider` / `tobias.hoffmann` | Dương + Âm | Duyệt 1 bảng công làm việc ngày **Chủ nhật** (`deadline = +14 ngày`) hoặc **Ngày lễ** (`deadline = +56 ngày`) -> vào tab **Nghỉ bù** thử xác nhận `restDate`: (a) trước hoặc bằng ngày làm việc; (b) sau `deadlineDate`; (c) trùng ngày lễ / ngày có ca / ngày nghỉ phép; (d) ngày hợp lệ còn trống. | Hệ thống tự sinh bản ghi `compensatory_rest_days` `PENDING`. Các trường hợp (a), (b), (c) đều bị chặn **`409`**. Ngày (d) hợp lệ chuyển sang `COMPLETED`. |

---

### F07 · Ngày lễ theo bang & Phụ cấp SFN §3b EStG / §1 SvEV

| Mã TC | Tài khoản thực hiện | Loại | Các bước thực hiện | Kết quả mong đợi & Kiểm chứng |
| :--- | :--- | :---: | :--- | :--- |
| **TC-F07-01** | `daniel.krueger` (`PAYROLL_OFFICER` · `BER-01`/`BE`) vs `admin` vs `tobias.hoffmann` | Dương + Âm | 1. Tobias (`RESTAURANT_MANAGER`) hoặc `anna.mueller` vào trang Phụ cấp / gọi `POST /api/v1/allowances/calculate/{id}`.<br>2. Daniel xem lịch lễ của `BER-01` (Berlin) và `lukas.schneider` xem lịch lễ của `STU-01` (BW). | 1. Tobias và Anna bị chặn **`403`** ở báo cáo tổng hợp chi nhánh & nút tính/lưu phụ cấp SFN (`allowance.read`/`allowance.write` chỉ thuộc `HR_OFFICER` và `PAYROLL_OFFICER`).<br>2. `BER-01` trả về 10 ngày lễ `BE` (có Quốc tế Phụ nữ `08/03`, không có Lễ Ba Vua); `STU-01` trả về 12 ngày lễ `BW`. |
| **TC-F07-02** | `daniel.krueger` (`PAYROLL_OFFICER`, `DEMO-NORTH`) hoặc `lukas.schneider` (`HR_OFFICER`, `DEMO-BW`) | Dương + Âm | 1. Dùng nhân viên lương `60 EUR/h` ở `STU-01` có ca Chủ nhật xuyên đêm **Chủ nhật `22:00` → Thứ Hai `05:00` Berlin** (nghỉ `01:00–01:30`), bảng công ở trạng thái **`APPROVED`** và **`is_locked = 0`**.<br>2. Mở xem trước -> kiểm tra DB chưa sinh dòng mới -> bấm **Tính & Lưu SFN** -> kiểm tra `recalculation_required`.<br>3. Khóa kỳ (`is_locked = 1`) rồi thử bấm **Tính & Lưu** lại. | 1. Time Splitting Engine cắt đúng 6 mốc (`22:00–00:00` Đêm+CN, `00:00–01:00` & `01:30–04:00` Đêm sâu `40%` + CN `50%`, `04:00–05:00` Đêm `25%`).<br>2. Với lương gốc `60 EUR/h`: tiền thực trả tính trên `60 EUR/h`, miễn thuế **§3b EStG** bị chặn trần ở **`50 EUR/h`**, phần chênh `10 EUR/h` đưa vào `taxable_amount_eur`; miễn BHXH **§1 SvEV** bị chặn trần ở **`25 EUR/h`**. Sau khi tính, **`recalculation_required` reset về `0`** (`false`).<br>3. Bảng công chưa duyệt hoặc đã khóa khi bấm Tính & Lưu bị chặn **`409 Conflict`**. |

---

## 5. BẢNG KIỂM TUÂN THỦ LUẬT LAO ĐỘNG & THUẾ CHLB ĐỨC (2026)

| STT | Quy định pháp lý | Ngưỡng kiểm tra trong hệ thống | Tài khoản kiểm thử tiêu biểu | Kết quả yêu cầu |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **MiLoG 2026** | Lương giờ tối thiểu **`>= 13,90 EUR/h`** (áp dụng theo bậc ngày hiệu lực từ `2026-01-01`) | `lukas.schneider` | `[ ] Đạt` |
| **2** | **Minijob-Gesetz 2026** | Trần lương tháng hợp đồng `MINIJOB` **`<= 603,00 EUR/tháng`** | `lukas.schneider` | `[ ] Đạt` |
| **3** | **ArbZG §3** | Tối đa `10h` làm việc thực/ngày; `> 8h` cảnh báo `WARNING`, `> 10h` chặn `BLOCKER` / exception `CRITICAL` | `lukas.schneider`, `anna.mueller` | `[ ] Đạt` |
| **4** | **ArbZG §4** | `> 6h` (`> 360m`) nghỉ tối thiểu `30 phút`; `> 9h` (`> 540m`) nghỉ tối thiểu `45 phút` | `lukas.schneider`, `anna.mueller` | `[ ] Đạt` |
| **5** | **ArbZG §5 / JArbSchG §11** | Nghỉ giữa 2 ca tối thiểu `11h` liên tục (`12h` với vị thành niên `< 18` tuổi), kể cả 2 ca nối sát nhau (`0m`) | `lukas.schneider`, `tobias.hoffmann` | `[ ] Đạt` |
| **6** | **ArbZG §11 Abs. 3** | Làm Chủ nhật sinh nghỉ bù hạn **`14 ngày`**; làm Ngày lễ sinh nghỉ bù hạn **`56 ngày`** (`restDate` phải hợp lệ, trong hạn) | `tobias.hoffmann`, `markus.weber` | `[ ] Đạt` |
| **7** | **MuSchG §4, §5** | Cấm làm việc từ `20:00` đến `06:00` (chặn cả ca kết thúc `20:01–20:59`), tối đa `8,5h/ngày` | `lukas.schneider`, `sophie.fischer` | `[ ] Đạt` |
| **8** | **JArbSchG §8, §14** | Vị thành niên `< 18` tối đa `8h/ngày`, chỉ làm trong khung `06:00–22:00` (`06:00–20:00` nếu `< 16` tuổi) | `tobias.hoffmann`, `felix.bauer` | `[ ] Đạt` |
| **9** | **BUrlG §7(3)** | Ngày phép chuyển tiếp (`carried_days`) có `expiry_date = YYYY-03-31` và hết hiệu lực cho đơn sau `31/03` | `lukas.schneider`, `anna.mueller` | `[ ] Đạt` |
| **10** | **EntgFG §3 & DSGVO** | Hưởng `100%` lương đến `42 ngày` (nếu đã làm `>= 4 tuần` & không phải `CHILD_SICK`), chỉ lưu mã chứng từ eAU | `lukas.schneider`, `markus.weber` | `[ ] Đạt` |
| **11** | **§3b EStG & §1 SvEV** | Miễn thuế đêm `25%`, đêm sâu `40%`, CN `50%`, lễ `125%`, lễ đặc biệt `150%` tối đa lương cơ sở **`50 EUR/h`**; miễn BHXH tối đa **`25 EUR/h`** | `daniel.krueger`, `lukas.schneider` | `[ ] Đạt` |
| **12** | **RBAC & SoD (SOD-01..05)** | Cô lập chi nhánh/pháp nhân, tách quyền `PAYROLL` vs `FINANCE`, chặn tự duyệt cho bản thân | `admin`, `tobias`, `lukas`, `anna` | `[ ] Đạt` |
