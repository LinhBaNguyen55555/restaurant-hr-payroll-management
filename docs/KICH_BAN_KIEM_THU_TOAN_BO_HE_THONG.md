# KỊCH BẢN KIỂM THỬ TOÀN DIỆN TOÀN BỘ HỆ THỐNG ATELIER (DT06)
## Phân hệ Quản trị, Nhân sự, Lịch ca, Chấm công, Đối soát, Nghỉ phép & Phụ cấp SFN (F00 → F07)
### Tuân thủ Pháp luật CHLB Đức: ArbZG, MiLoG, MuSchG, JArbSchG, BUrlG, EntgFG, §3b EStG, SvEV & Nguyên tắc Phân tách nhiệm vụ (SoD)

---

## MỤC LỤC
1. [Hướng dẫn Khởi động Hệ thống trên Windows CMD](#1-hướng-dẫn-khởi-động-hệ-thống-trên-windows-cmd)
2. [Bản đồ Tài khoản Kiểm thử theo Vị trí & Phân quyền (Role Matrix)](#2-bản-đồ-tài-khoản-kiểm-thử-theo-vị-trí--phân-quyền-role-matrix)
3. [Quy trình Đối soát Trực tiếp trong MySQL Workbench](#3-quy-trình-đối-soát-trực-tiếp-trong-mysql-workbench)
4. [Kịch bản Kiểm thử Chi tiết Từng Phân hệ (F00 → F07)](#4-kịch-bản-kiểm-thử-chi-tiết-từng-phân-hệ-f00--f07)
   - [Phân hệ F00: Quản trị, Bảo mật RBAC & Trải nghiệm Người dùng](#f00-quản-trị-bảo-mật-rbac--trải-nghiệm-người-dùng)
   - [Phân hệ F01: Cơ cấu Tổ chức, Chi nhánh & Pháp nhân Doanh nghiệp](#f01-cơ-cấu-tổ-chức-chi-nhánh--pháp-nhân-doanh-nghiệp)
   - [Phân hệ F02: Hồ sơ Nhân sự, Hợp đồng & Luật Lương Đức (MiLoG, Minijob, MuSchG)](#f02-hồ-sơ-nhân-sự-hợp-đồng--luật-lương-đức)
   - [Phân hệ F03: Lập Lịch ca & Kiểm soát Luật Lao động Đức (ArbZG §3, §4, §5, §11)](#f03-lập-lịch-ca--kiểm-soát-luật-lao-động-đức-arbzg)
   - [Phân hệ F04: Chấm công Trực tiếp & Quản lý Giờ nghỉ Thực tế](#f04-chấm-công-trực-tiếp--quản-lý-giờ-nghỉ-thực-tế)
   - [Phân hệ F05: Đối soát Giờ công, Đơn xin Sửa giờ & Phê duyệt Phân tầng (SoD)](#f05-đối-soát-giờ-công-đơn-xin-sửa-giờ--phê-duyệt-phân-tầng-sod)
   - [Phân hệ F06: Nghỉ phép BUrlG, Nghỉ ốm EntgFG / DSGVO & Nghỉ bù ArbZG §11](#f06-nghỉ-phép-nghỉ-ốm-và-ngày-nghỉ-bù)
   - [Phân hệ F07: Ngày lễ, Phụ cấp SFN & Miễn thuế §3b EStG / SvEV](#f07-ngày-lễ-phụ-cấp-sfn--miễn-thuế-3b-estg--svev)
5. [Bảng Kiểm tra Tuân thủ Luật định & Ràng buộc Hệ thống (Compliance Checklist)](#5-bảng-kiểm-tra-tuân-thủ-luật-định--ràng-buộc-hệ-thống)
6. [Biên bản Nghiệm thu Kiểm thử Toàn diện Hệ thống](#6-biên-bản-nghiệm-thu-kiểm-thử-toàn-diện-hệ-thống)

---

## 1. HƯỚNG DẪN KHỞI ĐỘNG HỆ THỐNG TRÊN WINDOWS CMD

Để hệ thống hoạt động ổn định và chính xác, cần mở **2 cửa sổ Command Prompt (CMD)** riêng biệt cho Backend và Frontend.

### 1.1. Bước 1: Đảm bảo MySQL Server đang hoạt động
Mở CMD và kiểm tra dịch vụ MySQL:
```cmd
net start MySQL80
```
> [!NOTE]
> Database mặc định: `restaurant_hr_payroll_management` (User: `root`, Mật khẩu: `Vomy1011@`).

### 1.2. Bước 2: Cửa sổ CMD 1 — Chạy Backend (Spring Boot)
Mở cửa sổ CMD thứ nhất:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\backend"
mvnw.cmd spring-boot:run
```
* **Dấu hiệu thành công:** Xuất hiện log `Tomcat started on port 8080 (http)` và `Started BackendApplication`.

### 1.3. Bước 3: Cửa sổ CMD 2 — Chạy Frontend (React / Vite)
Mở cửa sổ CMD thứ hai:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\frontend"
npm.cmd run dev
```
> [!IMPORTANT]
> **Lưu ý quan trọng:** Bắt buộc phải có lệnh `cd frontend` trước khi chạy `npm.cmd run dev`. Nếu chạy ngay từ thư mục gốc sẽ gặp lỗi `ENOENT: no such file or directory, open 'package.json'`.

* **Dấu hiệu thành công:** Màn hình hiển thị `VITE ready ... Local: http://127.0.0.1:5173/`.

### 1.4. Bước 4: Mở ứng dụng trên trình duyệt
* Mở trình duyệt Web truy cập: **`http://127.0.0.1:5173`**.

---

## 2. BẢN ĐỒ TÀI KHOẢN KIỂM THỬ THEO VỊ TRÍ & PHÂN QUYỀN (ROLE MATRIX)

Tất cả các tài khoản demo đều dùng chung mật khẩu: **`Atelier!2026Demo`**

| STT | Họ và tên | Email đăng nhập | Vị trí công tác (Role) | Chức năng kiểm thử chính đảm nhận |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Administrator** | `admin@restaurant.example` | **Quản trị viên / HR cấp cao**<br>`SYSTEM_ADMIN, HR_OFFICER, RESTAURANT_MANAGER` | • Quản trị hệ thống, Chi nhánh, Pháp nhân, Phân quyền RBAC (F00, F01)<br>• Cấp duyệt độc lập giải quyết SoD cho Quản lý Tobias (F05, F06)<br>• Phê duyệt đơn xin sửa giờ leo thang > 60 phút (US-026)<br>• Khóa kỳ chấm công chi nhánh (US-028)<br>• Báo cáo tổng hợp phụ cấp SFN & Tra cứu kiểm toán toàn chi nhánh (F07) |
| **2** | **Tobias Hoffmann** | `tobias.hoffmann@restaurant.example` | **Quản lý Nhà hàng**<br>`RESTAURANT_MANAGER` | • Quản lý hồ sơ nhân sự, hợp đồng lương tối thiểu MiLoG ≥12.41€ (F02)<br>• Lập lịch ca tuần, kiểm tra tuân thủ luật lao động ArbZG (F03)<br>• Phê duyệt đổi ca, xóa ca có xác nhận lý do (F03)<br>• Bổ sung giờ công thủ công kèm lý do (F04)<br>• Đối soát bảng công 3 trục, duyệt đơn sửa giờ ≤ 60 phút (F05)<br>• **Bị hệ thống chặn tự duyệt bảng công & đơn nghỉ của bản thân (SoD)**<br>• Phê duyệt đơn nghỉ phép của nhân viên & Quản lý hạn nghỉ bù ArbZG §11 (F06)<br>• Tính toán & xem phân đoạn phụ cấp ca đêm, chủ nhật, ngày lễ (F07) |
| **3** | **Anna Müller** | `anna.mueller@restaurant.example` | **Nhân viên Phục vụ bàn**<br>`EMPLOYEE` | • Chấm công Check-in / Check-out, Nghỉ giữa ca thực tế (F04)<br>• Gửi đơn xin sửa giờ ≤ 60m và > 60m kèm lý do (F05)<br>• Tham gia sàn đổi ca trực (Shift Swap Center) (F03)<br>• Xem số dư phép năm BUrlG (20-24 ngày) và nộp đơn xin nghỉ phép (F06)<br>• Xem bảng phụ cấp ca đêm thường 25% (F07) |
| **4** | **Markus Weber** | `markus.weber@restaurant.example` | **Đầu bếp chính**<br>`EMPLOYEE` | • Chấm công ca gãy, ca đêm sâu (0h-4h), Chủ nhật & Ngày lễ (F04, F07)<br>• Ghi nhận nghỉ ốm eAU theo luật EntgFG (100% lương, bảo mật DSGVO) (F06)<br>• Theo dõi nghĩa vụ nghỉ bù 14 ngày (Chủ nhật) & 56 ngày (Ngày lễ) (F06)<br>• Hưởng phụ cấp SFN (Đêm 40%, CN 50%, Lễ 100%-150%) và kiểm tra trần thuế 50€ §3b EStG vs trần 25€ SvEV (F07) |
| **5** | **Sophie Fischer** | `sophie.fischer@restaurant.example` | **Nhân viên Phụ bếp**<br>`EMPLOYEE` | • Đối tượng được bảo vệ theo **Luật Thai sản (MuSchG)**<br>• Kiểm tra hệ thống tự động cấm xếp ca đêm (20h - 6h) và cấm làm thêm giờ (F02, F03) |

---

## 3. QUY TRÌNH ĐỐI SOÁT TRỰC TIẾP TRONG MYSQL WORKBENCH

Khi thực hiện các thao tác trên giao diện web, dữ liệu được ghi tức thì vào CSDL MySQL. Mở **MySQL Workbench**, chọn database `restaurant_hr_payroll_management` và thực thi các câu lệnh sau để đối soát:

```sql
USE restaurant_hr_payroll_management;

-- 1. Kiểm tra tài khoản người dùng & phân quyền RBAC (F00)
SELECT email, name, roles, active FROM user_accounts;

-- 2. Kiểm tra hồ sơ nhân viên, hợp đồng và lương tối thiểu MiLoG (F02)
SELECT e.employee_id, e.employee_code, e.display_name, c.contract_type, w.gross_hourly_eur 
FROM employees e
JOIN employment_contracts c ON e.employee_id = c.employee_id
JOIN wage_rates w ON c.contract_id = w.contract_id;

-- 3. Kiểm tra lịch ca tuần đã công bố (F03)
SELECT schedule_id, employee_id, shift_date, start_time, end_time, status 
FROM shift_schedules ORDER BY shift_date DESC;

-- 4. Kiểm tra sự kiện chấm công vào/ra thực tế bất biến (F04)
SELECT event_id, employee_id, event_type, event_time_utc, work_date, source 
FROM attendance_events ORDER BY event_time_utc DESC;

-- 5. Kiểm tra bảng công tổng hợp và trạng thái phê duyệt (F04 & F05)
SELECT timesheet_id, employee_id, work_date, worked_minutes, status, is_locked 
FROM attendance_timesheets ORDER BY work_date DESC;

-- 6. Kiểm tra đơn xin sửa giờ và vết kiểm toán điều chỉnh (F05)
SELECT request_id, timesheet_id, employee_id, delta_minutes, requires_hr_escalation, status 
FROM attendance_change_requests;

-- 7. Kiểm tra số dư ngày phép năm 2026 theo luật BUrlG (F06)
SELECT balance_id, employee_id, leave_type_code, entitled_days, taken_days, remaining_days, expiry_date 
FROM leave_balances;

-- 8. Kiểm tra danh sách đơn xin nghỉ phép và người duyệt (F06)
SELECT request_id, employee_id, leave_type_code, start_date, end_date, total_days, status, decided_by_user_id 
FROM leave_requests;

-- 9. Kiểm tra hồ sơ nghỉ ốm eAU theo luật EntgFG (F06)
SELECT absence_id, employee_id, start_date, end_date, eau_reference_number, continued_pay_eligible, status 
FROM absence_records;

-- 10. Kiểm tra nghĩa vụ nghỉ bù 14 ngày & 56 ngày theo § 11 ArbZG (F06)
SELECT rest_id, employee_id, worked_date, source_type, deadline_date, is_completed, granted_date 
FROM compensatory_rest_days;

-- 11. Kiểm tra danh mục 12 ngày lễ Baden-Württemberg 2026 (F07)
SELECT holiday_id, state_code, holiday_date, holiday_code, holiday_name_de 
FROM public_holidays WHERE state_code = 'BW' ORDER BY holiday_date ASC;

-- 12. Kiểm tra các phân đoạn thời gian đã băm qua Time Splitting Engine (F07)
SELECT segment_id, timesheet_id, segment_start_utc, segment_end_utc, payable_minutes, segment_type 
FROM work_time_segments ORDER BY segment_start_utc DESC;

-- 13. Kiểm tra tiền phụ cấp, miễn thuế §3b EStG (trần 50€) và miễn BHXH SvEV (trần 25€) (F07)
SELECT calc_id, timesheet_id, employee_id, allowance_code, base_wage_eur, rate_percent, 
       paid_amount_eur, tax_exempt_amount_eur, taxable_amount_eur, social_insurance_exempt_amount_eur 
FROM allowance_calculations;
```

---

## 4. KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG PHÂN HỆ (F00 → F07)

---

### F00: QUẢN TRỊ, BẢO MẬT RBAC & TRẢI NGHIỆM NGƯỜI DÙNG

#### TC-F00-01: Chuyển đổi Ngôn ngữ Song ngữ Đức - Việt (DE / VI)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Đảm bảo toàn bộ giao diện hỗ trợ hoàn hảo cả tiếng Đức và tiếng Việt.
* **Các bước:** Bấm vào nút chuyển đổi ngôn ngữ `DE` / `VI` ở góc phải thanh tiêu đề.
* **Kết quả:** Toàn bộ menu, bảng biểu, thẻ thống kê và thông báo lập tức đổi ngôn ngữ; cấu hình được lưu vào `localStorage`.

#### TC-F00-02: Chế độ Giao diện Sáng / Tối (Light / Dark Mode)
* **Tài khoản:** `tobias.hoffmann@restaurant.example`.
* **Các bước:** Bấm nút biểu tượng Mặt trời / Mặt trăng trên thanh tiêu đề.
* **Kết quả:** Giao diện chuyển đổi tức thì giữa nền sáng và nền tối sang trọng.

#### TC-F00-03: Kiểm tra Phân quyền RBAC & Ẩn hiện Menu theo Vai trò
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Đăng nhập tài khoản Anna Müller.
* **Kết quả:** Menu bên trái chỉ hiển thị các tính năng dành cho nhân viên (*Chấm công & Giờ nghỉ*, *Lịch ca*, *Nghỉ phép & Nghỉ bù*). Các menu quản trị (*Tài khoản & Phân quyền*, *Pháp nhân*) hoàn toàn bị ẩn.

---

### F01: CƠ CẤU TỔ CHỨC, CHI NHÁNH & PHÁP NHÂN DOANH NGHIỆP

#### TC-F01-01: Xem Danh sách & Chi tiết Chi nhánh Nhà hàng tại Đức
* **Tài khoản:** `admin@restaurant.example` hoặc `tobias.hoffmann@restaurant.example`.
* **Các bước:** Vào menu **"Chi nhánh"** (`#branches`), chọn chi nhánh `Stuttgart Hauptbahnhof`.
* **Kết quả:** Hiển thị thông tin pháp nhân sở hữu, địa chỉ, múi giờ `Europe/Berlin`, danh sách địa điểm làm việc thực tế và nhân viên thuộc chi nhánh.

---

### F02: HỒ SƠ NHÂN SỰ, HỢP ĐỒNG & LUẬT LƯƠNG ĐỨC

#### TC-F02-01: Ràng buộc Lương Tối thiểu CHLB Đức (MiLoG ≥ 12,41 €/h)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Kiểm tra hệ thống tự động ngăn chặn mức lương dưới luật định Đức.
* **Các bước:** Vào `#workforce`, bấm "Thêm nhân viên", nhập mức lương cơ sở `11.50 €/h` (< 12,41 €) rồi bấm Lưu.
* **Kết quả:** Hệ thống báo lỗi đỏ: *"Mức lương không được thấp hơn mức lương tối thiểu 12,41 €/h theo Luật MiLoG!"* và chặn lưu vào CSDL.

#### TC-F02-02: Kiểm tra Ràng buộc Bảo vệ Thai sản (MuSchG)
* **Tài khoản:** `tobias.hoffmann@restaurant.example`.
* **Đối tượng:** Nhân viên **Sophie Fischer** (thuộc diện bảo vệ thai sản MuSchG).
* **Các bước:** Xem chi tiết nhân viên Sophie Fischer trong `#workforce`.
* **Kết quả:** Hiển thị cờ `MuSchG Active`, cấm xếp ca đêm (20h - 6h) và cấm làm thêm giờ quá 8.5 giờ/ngày.

#### TC-F02-03: Nhập liệu Nhân sự Hàng loạt bằng CSV (Import Dry-Run)
* **Tài khoản:** `tobias.hoffmann@restaurant.example`.
* **Các bước:** Vào tab "Nhập liệu hàng loạt (CSV)", tải lên file CSV mẫu nhân viên.
* **Kết quả:** Hệ thống kiểm tra dữ liệu trước (Dry-Run), báo cáo số dòng hợp lệ và chỉ ra các dòng có lỗi trước khi ghi vào MySQL.

---

### F03: LẬP LỊCH CA & KIỂM SOÁT LUẬT LAO ĐỘNG ĐỨC (ArbZG)

#### TC-F03-01: Giờ làm Tối đa trong Ngày (ArbZG §3: Tối đa 10h/ngày)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào `#scheduling`, xếp 1 ca làm việc cho Anna Müller từ `08:00` đến `19:00` (11 tiếng).
* **Kết quả:** Hệ thống hiển thị cảnh báo đỏ vi phạm **ArbZG §3**: *"Thời giờ làm việc vượt quá 10 giờ tối đa trong ngày!"*.

#### TC-F03-02: Khoảng cách Nghỉ giữa 2 Ca liên tiếp (ArbZG §5: Tối thiểu 11 giờ)
* **Tài khoản:** `tobias.hoffmann@restaurant.example`.
* **Các bước:** Xếp ca 1 kết thúc lúc `23:00` hôm nay và ca 2 bắt đầu lúc `07:00` sáng mai cho Markus Weber (nghỉ chỉ 8 tiếng).
* **Kết quả:** Hệ thống báo vi phạm **ArbZG §5**: *"Thời gian nghỉ giữa hai ca ít hơn 11 giờ liên tục bắt buộc!"*.

#### TC-F03-03: Sàn Đổi ca Trực (Shift Swap Center)
* **Tài khoản:** `anna.mueller@restaurant.example` (tạo yêu cầu), `markus.weber@restaurant.example` (nhận ca), `tobias.hoffmann@restaurant.example` (duyệt).
* **Các bước:**
  1. Anna vào `#scheduling`, bấm "Đổi ca trực" trên ca của mình.
  2. Markus đăng nhập, vào tab "Đổi ca", bấm "Nhận ca".
  3. Quản lý Tobias đăng nhập, bấm "Phê duyệt đổi ca".
* **Kết quả:** Ca làm việc trên lịch tuần lập tức chuyển sang cho Markus; MySQL cập nhật `shift_schedules.employee_id`.

---

### F04: CHẤM CÔNG TRỰC TIẾP & QUẢN LÝ GIỜ NGHỈ THỰC TẾ

#### TC-F04-01: Chấm công Check-in / Check-out Trực tiếp (US-016)
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Vào `#attendance`, bấm **"Bắt đầu ca làm (Check-in)"**; sau một lúc bấm **"Kết thúc ca làm (Check-out)"**.
* **Kết quả:** Timestamp được ghi nhận chuẩn xác theo UTC và hiển thị giờ Berlin; bảng `attendance_events` trong MySQL lưu sự kiện gốc bất biến.

#### TC-F04-02: Ghi nhận Nghỉ giữa ca Thực tế (ArbZG §4) (US-018)
* **Tài khoản:** `anna.mueller@restaurant.example`.
* **Các bước:** Bấm **"Bắt đầu nghỉ giữa ca"**, sau đó bấm **"Kết thúc nghỉ giải lao"**.
* **Kết quả:** Bảng `break_records` lưu chính xác số phút nghỉ thực tế; hệ thống không tự ý cắt xén giờ làm việc khi không có chứng cứ.

#### TC-F04-03: Bổ sung Giờ công Thủ công có Kiểm soát (US-021)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào `#attendance`, bấm **"Bổ sung giờ công thủ công"**, chọn nhân viên, nhập giờ và lý do: *"Máy POS mất mạng, bổ sung theo biên bản xác nhận"*.
* **Kết quả:** Bản ghi được tạo với nguồn gốc rõ ràng, lưu vết `MANUAL_ENTRY` trong nhật ký kiểm toán.

---

### F05: ĐỐI SOÁT GIỜ CÔNG, ĐƠN XIN SỬA GIỜ & PHÊ DUYỆT PHÂN TẦNG (SoD)

#### TC-F05-01: Bảng Đối soát 3 trục (Giờ dự kiến, Giờ thực tế, Sai lệch) (US-022)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
* **Kết quả:** Bảng đối soát hiển thị đầy đủ: Giờ dự kiến, Giờ thực tế, Giờ nghỉ, Đi muộn, Về sớm, Delta (+/-) theo từng ca; không tự cắt bỏ giờ làm thực tế.

#### TC-F05-02: Nhân viên Gửi Đơn xin Sửa giờ Thông thường (≤ 60 phút) (US-023)
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Vào `#attendance`, chọn ca làm việc, bấm "Xin sửa giờ", yêu cầu tăng thêm **30 phút** với lý do: *"Dọn dẹp bàn tiệc đông khách muộn"*.
* **Kết quả:** Đơn tạo thành công với trạng thái `PENDING`, cờ `requires_hr_escalation = false`.

#### TC-F05-03: Quản lý Phê duyệt Đơn Sửa giờ Thông thường (US-025)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào `#reconciliation`, tab "Đơn xin sửa giờ", tìm đơn 30 phút của Anna, bấm "Phê duyệt" kèm ghi chú.
* **Kết quả:** Đơn chuyển sang `APPROVED`; timesheet của Anna tự động cập nhật và bật cờ `recalculation_required = true`.

#### TC-F05-04: Leo thang Cấp duyệt HR khi Sai lệch > 60 phút (US-026)
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Anna tạo đơn xin sửa giờ với chênh lệch **90 phút** (> 60 phút).
* **Kết quả:** Hệ thống tự động bật cờ `requires_hr_escalation = true`, trạng thái chuyển thành `HR_ESCALATED`.

#### TC-F05-05: Chặn Quản lý Duyệt Đơn bị Leo thang HR
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Quản lý Tobias cố gắng bấm duyệt đơn 90 phút của Anna.
* **Kết quả:** Hệ thống chặn lại với thông báo: *"Đơn điều chỉnh trên 60 phút vượt thẩm quyền của Quản lý nhà hàng, bắt buộc chuyển cấp HR / Admin phê duyệt!"*.

#### TC-F05-06: Quản trị viên / Cấp duyệt HR Phê duyệt Đơn Leo thang
* **Tài khoản:** `admin@restaurant.example` (Admin / HR).
* **Các bước:** Admin đăng nhập, vào `#reconciliation`, tab "Đơn xin sửa giờ", bấm duyệt đơn 90 phút của Anna Müller.
* **Kết quả:** Đơn được duyệt thành công, lưu vết điều chỉnh trong `attendance_adjustments`.

#### TC-F05-07: Kiểm tra Quy tắc SoD - Chặn Quản lý Tự duyệt Bản thân
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Kiểm tra quy tắc Phân tách nhiệm vụ (Segregation of Duties).
* **Các bước:** Tobias vào `#reconciliation`, tìm ca làm việc của chính nhân viên **Tobias Hoffmann** và cố gắng bấm duyệt.
* **Kết quả:** Nút duyệt bị vô hiệu hóa hoặc hệ thống trả về lỗi **`HTTP 403 Forbidden`**: *"Vi phạm quy tắc SoD: Bạn không thể tự phê duyệt bảng chấm công của chính mình!"*.

#### TC-F05-08: Admin Duyệt Bảng công cho Quản lý Tobias Giải quyết SoD
* **Tài khoản:** `admin@restaurant.example` (Admin).
* **Các bước:** Admin đăng nhập, vào `#reconciliation`, duyệt ca làm việc của Tobias Hoffmann.
* **Kết quả:** Ca của Tobias được duyệt thành công sang trạng thái `APPROVED`.

#### TC-F05-09: Chốt và Khóa kỳ Chấm công Chi nhánh (US-028)
* **Tài khoản:** `admin@restaurant.example`.
* **Các bước:** Vào `#reconciliation`, chuyển tab "Khóa kỳ công", chọn ngày chốt và bấm "Xác nhận khóa kỳ".
* **Kết quả:** Toàn bộ timesheet trong kỳ chuyển sang `LOCKED` (`is_locked = true`), dữ liệu trở thành bất biến để phục vụ tính lương.

---

### F06: NGHỈ PHÉP, NGHỈ ỐM VÀ NGÀY NGHỈ BÙ

#### TC-F06-01: Kiểm tra Danh mục & Số dư Phép năm BUrlG (US-066, US-082)
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:**
  1. Đăng nhập Anna Müller, bấm vào menu **"Nghỉ phép & Nghỉ bù"** (`#leave`).
  2. Xem tab **"Số dư phép năm (BUrlG)"**.
* **Kết quả:**
  * Hiển thị đầy đủ: Loại phép, Được hưởng (20-24 ngày theo luật BUrlG), Chuyển sang, Đã nghỉ, Đang chờ duyệt và Còn lại.
  * Hiển thị hạn bảo lưu phép tồn theo **§7 Abs. 3 BUrlG**: Hạn dùng đến hết ngày **31.03 năm kế tiếp**.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT * FROM leave_balances WHERE employee_id = 1;
  ```

#### TC-F06-02: Nhân viên Nộp Đơn xin Nghỉ phép năm (US-065)
* **Tài khoản:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:**
  1. Trong `#leave`, bấm nút **"Nộp đơn xin nghỉ"**.
  2. Chọn loại: `Nghỉ phép năm (BUrlG)`, từ ngày `2026-07-06` đến `2026-07-10` (5 ngày làm việc).
  3. Nhập lý do: *"Nghỉ hè cùng gia đình"*, bấm **"Gửi đơn"**.
* **Kết quả:** Đơn tạo thành công với trạng thái `PENDING`, cột *Đang chờ duyệt* của Anna tăng thêm 5 ngày.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT * FROM leave_requests WHERE employee_id = 1 ORDER BY created_at_utc DESC LIMIT 1;
  ```

#### TC-F06-03: Quản lý Phê duyệt Đơn Nghỉ phép & Trừ Số dư Tự động (US-079)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Đăng nhập Tobias Hoffmann, vào menu `#leave`.
  2. Chuyển sang tab **"Đơn xin nghỉ & Phê duyệt"**, bấm nút **"Duyệt"** trên đơn của Anna Müller.
  3. Nhập ghi chú: *"Đã sắp xếp người thay thế trong ca"*, bấm **"Xác nhận duyệt"**.
* **Kết quả:**
  * Đơn chuyển sang `APPROVED`.
  * Số dư ngày phép của Anna tự động khấu trừ: `taken_days += 5`, `pending_days -= 5`, `remaining_days -= 5`.
  * Các ca làm việc bị trùng lặp trên lịch ca tuần tự động bị hủy bỏ.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT entitled_days, taken_days, remaining_days FROM leave_balances WHERE employee_id = 1 AND leave_type_code = 'ANNUAL';
  ```

#### TC-F06-04: Kiểm tra Ràng buộc SoD - Chặn Quản lý Tự duyệt Đơn nghỉ của Mình
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Tobias nộp đơn xin nghỉ cho chính mình (Employee ID: 5). Sau đó vào danh sách chờ duyệt tìm đơn của mình.
* **Kết quả:** Hệ thống hiển thị cảnh báo **Segregation of Duties (SoD)** và chặn nút Duyệt (`HTTP 403 Forbidden`). Đơn của Tobias phải do Admin (`admin@restaurant.example`) phê duyệt.

#### TC-F06-05: Ghi nhận Nghỉ ốm eAU theo EntgFG & Bảo vệ Dữ liệu Y tế DSGVO (US-080)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý) hoặc `admin@restaurant.example` (HR).
* **Các bước:**
  1. Vào menu `#leave`, bấm nút đỏ **"Ghi nhận nghỉ ốm eAU"**.
  2. Chọn nhân viên: `Markus Weber`, thời gian từ `2026-06-01` đến `2026-06-05`.
  3. Nhập mã tra cứu điện tử eAU từ bảo hiểm y tế: `eAU-2026-TK-99214`, bấm **"Lưu hồ sơ nghỉ ốm"**.
* **Kết quả:**
  * Hồ sơ ghi nhận cờ `continued_pay_eligible = true` (Đủ điều kiện hưởng 100% lương theo Luật Tiếp tục trả lương EntgFG trong 6 tuần).
  * **Tuân thủ quyền riêng tư DSGVO**: Tuyệt đối **không lưu trữ chẩn đoán bệnh lý y tế (mã ICD-10)** hay thông tin bệnh án trong hệ thống.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT * FROM absence_records WHERE employee_id = 2;
  ```

#### TC-F06-06: Theo dõi & Quản lý Hạn Bố trí Nghỉ bù (§ 11 Abs. 3 ArbZG) (US-081, US-082)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Vào menu `#leave`, chuyển tab **"Hạn nghỉ bù (§ 11 ArbZG)"**.
  2. Quan sát danh sách nghĩa vụ nghỉ bù:
     * **Làm ngày Chủ nhật:** Bắt buộc bố trí nghỉ bù trong vòng **2 tuần (14 ngày)**.
     * **Làm Ngày lễ:** Bắt buộc bố trí nghỉ bù trong vòng **8 tuần (56 ngày)**.
     * Cột hạn chót hiển thị đếm ngược: Xanh lá (> 5 ngày), Vàng (≤ 5 ngày), Đỏ (*Quá hạn - Überfällig*).
  3. Bấm nút **"Xác nhận đã nghỉ (Als gewährt markieren)"** trên một nghĩa vụ nghỉ bù.
* **Kết quả:** Nghĩa vụ chuyển sang trạng thái `Đã bố trí nghỉ` (`is_completed = true`), lưu vết ngày được cấp nghỉ bù.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT rest_id, employee_id, worked_date, deadline_date, is_completed, granted_date FROM compensatory_rest_days;
  ```

---

### F07: NGÀY LỄ, PHỤ CẤP SFN & MIỄN THUẾ §3b EStG / SvEV

#### TC-F07-01: Lịch 12 Ngày lễ Pháp định bang Baden-Württemberg (FTG) (US-014, US-015, US-034)
* **Tài khoản:** Mọi tài khoản (`admin`, `tobias.hoffmann`, `anna.mueller`).
* **Các bước:** Vào menu **"Phụ cấp SFN & Ngày lễ"** (`#allowances`), bấm nút **"Lịch 12 ngày lễ BW"**.
* **Kết quả:** Hiển thị trọn vẹn 12 ngày lễ chính thức năm 2026 của bang Baden-Württemberg. Hiển thị ghi chú: MVP hỗ trợ đầy đủ Baden-Württemberg; chi nhánh tại các bang khác chưa cấu hình sẽ bị chặn tính phụ cấp chính thức để tránh sai lệch thuế.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT holiday_id, state_code, holiday_date, holiday_code, holiday_name_de FROM public_holidays WHERE state_code = 'BW' ORDER BY holiday_date ASC;
  ```

#### TC-F07-02: Động cơ Phân đoạn Thời gian (Time Splitting Engine) (US-029, US-030)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Kiểm tra ca làm việc qua nửa đêm hoặc qua các khung phụ cấp bị băm thành các đoạn nhỏ không chồng lấn.
* **Các bước:** Trong `#allowances`, tìm ca làm việc từ `18:00` Chủ nhật đến `02:00` sáng Thứ Hai, bấm **"Xem phân đoạn"**.
* **Kết quả:** Ca làm việc được băm thành 3 phân đoạn chính xác theo phút:
  * **Đoạn 1 (18:00 - 20:00 - 120 phút):** Giờ Chủ nhật thông thường -> Phụ cấp **50%**.
  * **Đoạn 2 (20:00 - 24:00 - 240 phút):** Giờ Chủ nhật ban đêm -> Phụ cấp **75%** (50% Chủ nhật + 25% Đêm).
  * **Đoạn 3 (00:00 - 02:00 - 120 phút):** Qua nửa đêm, đêm sâu (ca bắt đầu trước 00h) -> Phụ cấp **90%** (50% Chủ nhật kéo dài đến 04:00 sáng Thứ Hai + 40% Đêm sâu).
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT segment_id, timesheet_id, payable_minutes, segment_type, is_night, is_deep_night, is_sunday 
  FROM work_time_segments WHERE timesheet_id = ...;
  ```

#### TC-F07-03: Phụ cấp Ngày đặc biệt (24/12 & 31/12 sau 14h) (US-035)
* **Tài khoản:** `admin@restaurant.example` hoặc `tobias.hoffmann@restaurant.example`.
* **Mục tiêu:** Kiểm tra quy định luật thuế tách riêng thời gian trước và sau 14:00 ngày 24/12 (Đêm Giáng sinh) và 31/12 (Giao thừa).
* **Kết quả:**
  * Ca làm việc ngày 24/12: Từ 00:00 - 14:00 tính ngày làm việc bình thường; từ **sau 14:00** được áp mức phụ cấp lễ đặc biệt **150%**.
  * Ca làm việc ngày 31/12: Sau 14:00 áp mức phụ cấp **125%**.

#### TC-F07-04: Tách biệt Trần Miễn Thuế §3b EStG (50 €/h) vs Trần Miễn BHXH SvEV (25 €/h) (US-038)
* **Tài khoản:** `admin@restaurant.example` (Quản trị / Kế toán lương).
* **Mục tiêu:** Kiểm tra trần miễn thuế TNCN và trần miễn đóng BHXH không bị đánh đồng.
* **Kịch bản tính toán với Lương cơ sở = 30.00 €/h, ca đêm phụ cấp 25%:**
  * Tiền phụ cấp thực trả: `30 € * 25% = 7.50 €/h`.
  * **Theo §3b EStG (Trần 50 €/h):** Vì 30 € < 50 € -> Được **miễn thuế toàn bộ 7.50 €/h** (`tax_exempt = 7.50 €`, `taxable = 0.00 €`).
  * **Theo SvEV (Trần 25 €/h):** Vì 30 € > 25 € -> Mức tối đa được miễn BHXH là `25 € * 25% = 6.25 €/h`.
  * **Phần chịu đóng BHXH:** `7.50 € - 6.25 € = 1.25 €/h`.
* **Kết quả:** Hệ thống tính toán độc lập 2 cột `tax_exempt_amount_eur` và `social_insurance_exempt_amount_eur`, không sao chép kết quả miễn thuế sang bảo hiểm.
* **Đối soát MySQL Workbench:**
  ```sql
  SELECT base_wage_eur, paid_amount_eur, tax_exempt_amount_eur, taxable_amount_eur, social_insurance_exempt_amount_eur 
  FROM allowance_calculations WHERE timesheet_id = ...;
  ```

#### TC-F07-05: Kiểm tra Tính Minh bạch Trace Kiểm toán & Tái tính toán Phụ cấp (US-039)
* **Tài khoản:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Trong `#allowances`, bấm nút "Xem phân đoạn" trên một ca làm việc.
  2. Quan sát dòng `🔍 Trace:` ở mỗi phân đoạn.
* **Kết quả:** Chuỗi Trace hiển thị tường minh mọi thông số:
  ```text
  Lương cơ sở: 15.00 €/h | Tỷ lệ trả: 75.0% (Đêm 25.0% + Ngày SUNDAY 50.0%) | Thực trả: 22.50 € | Miễn thuế §3b (trần 50€): 22.50 € | Chịu thuế: 0.00 € | Miễn BH SvEV (trần 25€): 22.50 €
  ```
* **Thao tác:** Bấm nút icon **"Tái tính toán (Refresh)"** trên ca làm việc -> Hệ thống tự động xóa kết quả cũ, băm lại phân đoạn và tính toán lại tức thì.

---

## 5. BẢNG KIỂM TRA TUÂN THỦ LUẬT ĐỊNH & RÀNG BUỘC HỆ THỐNG

| STT | Quy định / Luật định | Điều luật CHLB Đức | Hành vi kiểm soát của hệ thống | Tài khoản kiểm thử chính | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Lương tối thiểu Đức | **MiLoG** | Bắt buộc lương giờ ≥ **12,41 €/h**; chặn lưu nếu thấp hơn | `tobias.hoffmann` | **PASS** |
| 2 | Giới hạn Minijob | **Minijob-Gesetz** | Trần thu nhập tối đa **538,00 €/tháng**; cảnh báo nếu vượt | `tobias.hoffmann` | **PASS** |
| 3 | Giờ làm tối đa trong ngày | **ArbZG §3** | Tối đa **10 giờ/ngày**; cảnh báo đỏ khi xếp ca hoặc chấm công quá giờ | `tobias.hoffmann`, `anna.mueller` | **PASS** |
| 4 | Nghỉ giải lao bắt buộc | **ArbZG §4** | Ca >6h: nghỉ tối thiểu **30m**; Ca >9h: nghỉ tối thiểu **45m** | `markus.weber`, `anna.mueller` | **PASS** |
| 5 | Khoảng cách nghỉ giữa ca | **ArbZG §5** | Bắt buộc nghỉ tối thiểu **11 giờ liên tục** giữa 2 ca làm việc | `tobias.hoffmann` | **PASS** |
| 6 | Làm việc ngày Chủ nhật | **ArbZG §11** | Cảnh báo làm việc Chủ nhật và sinh nghĩa vụ nghỉ bù trong 2 tuần | `tobias.hoffmann` | **PASS** |
| 7 | Bảo vệ thai sản | **MuSchG** | Cấm xếp ca đêm từ **20:00 - 06:00**, cấm làm thêm giờ | `sophie.fischer` | **PASS** |
| 8 | Phân tách nhiệm vụ | **SoD Rule** | Quản lý **không được tự duyệt** bảng công, đơn sửa giờ hoặc đơn xin nghỉ của mình | `tobias.hoffmann` bị chặn, `admin` duyệt | **PASS** |
| 9 | Leo thang phê duyệt | **US-026 Rule** | Chênh lệch điều chỉnh **> 60 phút** tự động chuyển cấp HR phê duyệt | `anna.mueller` tạo, `admin` duyệt | **PASS** |
| 10 | Bất biến & Khóa kỳ | **US-028 Rule** | Giữ bản ghi sự kiện gốc; sau khi khóa kỳ, không được sửa đổi trực tiếp | `admin` khóa, toàn bộ NV tuân thủ | **PASS** |
| 11 | Nghỉ phép năm Đức | **BUrlG §3, §7** | Quản lý số dư phép tối thiểu 20-24 ngày; hạn chót bảo lưu chuyển phép sang năm sau là **31.03** | `anna.mueller`, `tobias.hoffmann` | **PASS** |
| 12 | Tiếp tục trả lương nghỉ ốm | **EntgFG §3** | Chi trả **100% lương** trong tối đa 6 tuần khi ốm đau; xác thực bằng mã eAU | `markus.weber`, `admin` | **PASS** |
| 13 | Bảo vệ dữ liệu y tế | **DSGVO / GDPR** | Tuyệt đối **không lưu trữ chẩn đoán bệnh lý y tế (mã ICD-10)** trong hệ thống HR | Toàn bộ hệ thống tuân thủ | **PASS** |
| 14 | Hạn bố trí ngày nghỉ bù | **ArbZG §11(3)** | Bố trí nghỉ bù trong **14 ngày** (Chủ nhật) và **56 ngày** (Ngày lễ) | `tobias.hoffmann`, `markus.weber` | **PASS** |
| 15 | Phụ cấp ca đêm & Ngày lễ | **§ 3b EStG** | Đêm thường 25%, Đêm sâu 40%, Chủ nhật 50%, Lễ 100-150%; trần miễn thuế **50.00 €/h** | `markus.weber`, `tobias.hoffmann` | **PASS** |
| 16 | Miễn đóng BHXH phụ cấp | **§ 1 SvEV** | Phụ cấp SFN được miễn đóng BHXH áp trần lương cơ sở tối đa **25.00 €/h** | `admin`, `tobias.hoffmann` | **PASS** |

---

## 6. BIÊN BẢN NGHIỆM THU KIỂM THỬ TOÀN DIỆN HỆ THỐNG

```text
========================================================================================
                      BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG ATELIER (DT06)
             Dự án: Quản lý Nhân sự, Lịch ca, Chấm công, Đối soát, Nghỉ phép & Phụ cấp
========================================================================================

Thời gian nghiệm thu: Ngày ..... tháng ..... năm 2026
Địa điểm: ..............................................................................
Thành phần tham gia nghiệm thu:
  1. Đại diện Nhóm Phát triển: Nguyễn Bá Linh & Nguyễn Hữu Phương
  2. Đại diện Nhóm Kiểm thử (QA/QC): ...................................................
  3. Đại diện Quản lý Dự án (PM): ......................................................

KẾT QUẢ NGHIỆM THU THEO PHÂN HỆ VÀ TÀI KHOẢN PHÂN VAI (F00 → F07):
----------------------------------------------------------------------------------------
Mã phân hệ   Tên phân hệ                         Tài khoản chính          Kết quả
----------------------------------------------------------------------------------------
F00          Bảo mật, RBAC & Phân quyền SoD      admin, tobias.hoffmann   [ ] ĐẠT  [ ] CHƯA
F00          Song ngữ Việt - Đức & Dark Mode     tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F01          Cơ cấu Chi nhánh & Pháp nhân        tobias.hoffmann, admin   [ ] ĐẠT  [ ] CHƯA
F02          Hồ sơ Nhân sự & Lương MiLoG ≥12.41€ tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F02          Bảo vệ thai sản MuSchG              sophie.fischer           [ ] ĐẠT  [ ] CHƯA
F02          Nhập liệu hàng loạt CSV Dry-Run     tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F03          Xếp lịch ca tuần & Luật ArbZG       tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F03          Modal xóa ca an toàn                tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F03          Sàn đổi ca trực (Shift Swap Center) anna.mueller, markus     [ ] ĐẠT  [ ] CHƯA
F04          Chấm công Check-in / Check-out UTC  anna.mueller             [ ] ĐẠT  [ ] CHƯA
F04          Nghỉ giữa ca thực tế (ArbZG §4)     anna.mueller, markus     [ ] ĐẠT  [ ] CHƯA
F04          Bổ sung giờ công thủ công (F04.05)  tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F05          Bảng đối soát 3 trục theo ca        tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F05          Đơn xin sửa giờ thông thường ≤60m   anna.mueller, tobias     [ ] ĐẠT  [ ] CHƯA
F05          Leo thang phê duyệt HR >60m (US-026)anna.mueller, admin      [ ] ĐẠT  [ ] CHƯA
F05          Chặn Quản lý tự duyệt bản thân (SoD)tobias (chặn), admin     [ ] ĐẠT  [ ] CHƯA
F05          Chốt & Khóa kỳ chấm công (US-028)   admin                    [ ] ĐẠT  [ ] CHƯA
F06          Số dư phép năm BUrlG & Hạn 31.03    anna.mueller, tobias     [ ] ĐẠT  [ ] CHƯA
F06          Đơn xin nghỉ phép & Tự động trừ phépanna.mueller, tobias     [ ] ĐẠT  [ ] CHƯA
F06          Chặn Quản lý tự duyệt đơn nghỉ (SoD)tobias (chặn), admin     [ ] ĐẠT  [ ] CHƯA
F06          Nghỉ ốm eAU theo EntgFG (100% lương)markus.weber, admin      [ ] ĐẠT  [ ] CHƯA
F06          Bảo vệ dữ liệu y tế DSGVO (Không ICD)Toàn bộ hệ thống        [ ] ĐẠT  [ ] CHƯA
F06          Hạn nghỉ bù 14d/56d (ArbZG §11(3))  tobias.hoffmann, markus  [ ] ĐẠT  [ ] CHƯA
F07          Lịch 12 ngày lễ Baden-Württemberg   admin, tobias.hoffmann   [ ] ĐẠT  [ ] CHƯA
F07          Động cơ băm phân đoạn (Time Split)  tobias.hoffmann          [ ] ĐẠT  [ ] CHƯA
F07          Phụ cấp Đêm 25%/40%, CN 50%, Lễ 150%markus.weber, tobias     [ ] ĐẠT  [ ] CHƯA
F07          Trần miễn thuế 50€ (§3b EStG)       admin, tobias.hoffmann   [ ] ĐẠT  [ ] CHƯA
F07          Trần miễn BHXH 25€ (SvEV)           admin, tobias.hoffmann   [ ] ĐẠT  [ ] CHƯA
F07          Minh bạch Trace kiểm toán & Tái tínhadmin, tobias.hoffmann   [ ] ĐẠT  [ ] CHƯA
----------------------------------------------------------------------------------------

KẾT LUẬN NGHIỆM THU:
[ ] HỆ THỐNG ĐẠT CHUẨN ĐẶC TẢ DT06 (F00 - F07), TÍNH NĂNG VẬN HÀNH ỔN ĐỊNH, ĐỦ ĐIỀU KIỆN BÀN GIAO.
[ ] CẦN BỔ SUNG / ĐIỀU CHỈNH: .........................................................

    ĐẠI DIỆN ĐỘI PHÁT TRIỂN            ĐẠI DIỆN KIỂM THỬ              QUẢN LÝ DỰ ÁN
     (Ký & ghi rõ họ tên)             (Ký & ghi rõ họ tên)        (Ký & ghi rõ họ tên)
```
