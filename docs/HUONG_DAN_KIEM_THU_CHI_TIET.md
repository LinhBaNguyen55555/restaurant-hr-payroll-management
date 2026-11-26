# TÀI LIỆU HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN HỆ THỐNG ATELIER (DT06)

> Tài liệu kịch bản lịch sử. Cách chạy, tài khoản demo và quyền hiện hành được mô tả trong [README](../README.md).
## Phân hệ Quản trị, Nhân sự, Lịch ca, Chấm công, Đối soát, Nghỉ phép & Phụ cấp SFN (F00 → F07)
### Tuân thủ Luật Lao động & Luật Thuế CHLB Đức: ArbZG, MiLoG, MuSchG, JArbSchG, BUrlG, EntgFG, §3b EStG, SvEV & Phân tách nhiệm vụ SoD

---

## MỤC LỤC
1. [Hướng dẫn cài đặt & Khởi chạy hệ thống trên CMD (Command Prompt / PowerShell)](#1-hướng-dẫn-cài-đặt--khởi-chạy-hệ-thống-trên-cmd)
2. [Bản đồ tài khoản kiểm thử theo vị trí & Phân định chức năng (Role Matrix)](#2-bản-đồ-tài-khoản-kiểm-thử-theo-vị-trí--phân-định-chức-năng)
3. [Hướng dẫn đối soát và kiểm tra trực tiếp trong MySQL Workbench](#3-hướng-dẫn-đối-soát-và-kiểm-tra-trực-tiếp-trong-mysql-workbench)
4. [Hướng dẫn chạy kiểm thử tự động (Automated Test Suite)](#4-hướng-dẫn-chạy-kiểm-thử-tự-động)
5. [Ma trận kịch bản kiểm thử chi tiết theo từng vai trò (F00 → F07)](#5-ma-trận-kịch-bản-kiểm-thử-chi-tiết)
   - [Phân hệ F00: Bảo mật, Phân quyền & Trải nghiệm người dùng](#phân-hệ-f00-bảo-mật-phân-quyền--trải-nghiệm-người-dùng)
   - [Phân hệ F01: Cơ cấu Chi nhánh & Pháp nhân chuỗi nhà hàng](#phân-hệ-f01-cơ-cấu-chi-nhánh--pháp-nhân-chuỗi-nhà-hàng)
   - [Phân hệ F02: Hồ sơ Nhân sự, Hợp đồng & Luật Lương Đức (MiLoG, Minijob, MuSchG)](#phân-hệ-f02-hồ-sơ-nhân-sự-hợp-đồng--luật-lương-đức)
   - [Phân hệ F03: Xếp lịch ca & Kiểm soát Luật Lao động Đức (ArbZG §3, §4, §5, §11)](#phân-hệ-f03-xếp-lịch-ca--kiểm-soát-luật-lao-động-đức)
   - [Phân hệ F04: Chấm công trực tiếp & Quản lý Nghỉ giữa ca](#phân-hệ-f04-chấm-công-trực-tiếp--quản-lý-nghỉ-giữa-ca)
   - [Phân hệ F05: Đối soát, Sửa giờ & Phê duyệt (Quy tắc SoD, Leo thang HR >60m, Khóa kỳ)](#phân-hệ-f05-đối-soát-sửa-giờ--phê-duyệt)
   - [Phân hệ F06: Nghỉ phép BUrlG, Nghỉ ốm EntgFG / DSGVO & Nghỉ bù ArbZG §11](#phân-hệ-f06-nghỉ-phép-nghỉ-ốm-và-ngày-nghỉ-bù)
   - [Phân hệ F07: Phụ cấp Ca đêm, Chủ nhật, Ngày lễ SFN & Miễn thuế §3b EStG / SvEV](#phân-hệ-f07-ngày-lễ-phụ-cấp-và-miễn-thuế-sfn)
6. [Bảng tổng hợp ràng buộc pháp lý & Phân tách nhiệm vụ (Compliance Checklist)](#6-bảng-tổng-hợp-ràng-buộc-pháp-lý)
7. [Mẫu biên bản nghiệm thu kiểm thử (Sign-off Template)](#7-mẫu-biên-bản-nghiệm-thu-kiểm-thử)

---

## 1. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY HỆ THỐNG TRÊN CMD

Tài liệu này hướng dẫn chi tiết cách mở và chạy toàn bộ hệ thống từ màn hình dòng lệnh **Command Prompt (cmd.exe)** hoặc **PowerShell** trên Windows.

### 1.1. Yêu cầu môi trường tối thiểu
* **Hệ điều hành:** Windows 10/11.
* **Java Development Kit (JDK):** Java 21 trở lên (máy hiện tại dùng Java 27).
* **Node.js & npm:** Node.js v18 trở lên (khuyến nghị v20+).
* **Cơ sở dữ liệu:** MySQL Server 8.0 đang chạy trên cổng `3306`.
* **Công cụ trực quan:** MySQL Workbench 8.0.

### 1.2. Bước 1: Kiểm tra dịch vụ Cơ sở dữ liệu MySQL
Mở cửa sổ `cmd.exe` với quyền Administrator (hoặc user thông thường) và kiểm tra dịch vụ MySQL:
```cmd
net start MySQL80
```
*(Nếu dịch vụ đã chạy, màn hình sẽ thông báo: `The requested service has already been started`)*.

> [!NOTE]
> Database mặc định được cấu hình trong `backend/src/main/resources/application.properties`:
> - Tên database: `restaurant_hr_payroll_management`
> - Tài khoản: `root`
> - Mật khẩu: `DB_PASSWORD`

---

### 1.3. Bước 2: Khởi động Backend (Spring Boot) trên CMD
1. Mở một cửa sổ **Command Prompt (CMD)** thứ nhất.
2. Điều hướng đến thư mục `backend` của dự án:
   ```cmd
   cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\backend"
   ```
3. Chạy lệnh khởi động Spring Boot qua Maven Wrapper:
   ```cmd
   mvnw.cmd spring-boot:run
   ```
4. **Dấu hiệu thành công:** Khi nhìn thấy các dòng log:
   ```text
   Tomcat started on port 8080 (http) with context path '/'
   Started BackendApplication in X.XXX seconds
   ```
   Backend đã sẵn sàng phục vụ API tại địa chỉ: `http://localhost:8080/api/v1`.

---

### 1.4. Bước 3: Khởi động Frontend (React / Vite) trên CMD
1. Mở một cửa sổ **Command Prompt (CMD)** thứ hai (giữ nguyên cửa sổ Backend đang chạy).
2. Điều hướng đến thư mục `frontend`:
   ```cmd
   cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\frontend"
   ```
3. Khởi chạy máy chủ phát triển Vite:
   ```cmd
   npm.cmd run dev
   ```
4. **Dấu hiệu thành công:** Màn hình hiển thị:
   ```text
   VITE v8.3.8 ready in 328 ms
   ➜ Local: http://127.0.0.1:5173/
   ```

---

### 1.5. Bước 4: Mở trình duyệt Web
* Mở trình duyệt (Google Chrome, Microsoft Edge, Firefox) và truy cập vào:
  ```text
  http://127.0.0.1:5173
  ```
* Giao diện đăng nhập hệ thống **Atelier** xuất hiện với đầy đủ các nút bấm đăng nhập nhanh theo từng vai trò.

---

### 1.6. Xử lý sự cố CMD thường gặp
* **Lỗi cổng 8080 hoặc 5173 bị xung đột:**
  Nếu xuất hiện lỗi `Port 8080 was already in use`, mở CMD và giải phóng cổng:
  ```cmd
  netstat -ano | findstr :8080
  taskkill /F /PID <Mã_PID_tìm_thấy>
  ```

---

## 2. BẢN ĐỒ TÀI KHOẢN KIỂM THỬ THEO VỊ TRÍ & PHÂN ĐỊNH CHỨC NĂNG

Mỗi chức năng trong hệ thống được thiết kế theo đúng quy chuẩn phân quyền (RBAC) và phân tách nhiệm vụ (Segregation of Duties - SoD). **Bảng phân vai kiểm thử chuẩn xác:**

| STT | Họ và tên | Email đăng nhập | Vị trí công tác (Role) | Chức năng kiểm thử đảm nhận |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Administrator** | `admin@restaurant.example` | **Quản trị viên / Cấp duyệt HR**<br>`SYSTEM_ADMIN, HR_OFFICER, RESTAURANT_MANAGER` | • Quản trị hệ thống, Chi nhánh, Pháp nhân, Phân quyền (F00, F01)<br>• Cấp duyệt độc lập giải quyết SoD cho Quản lý Tobias (F05, F06)<br>• Phê duyệt đơn sửa giờ leo thang > 60 phút (US-026)<br>• Khóa kỳ chấm công chi nhánh (US-028)<br>• Báo cáo tổng hợp phụ cấp SFN & Tra cứu kiểm toán toàn chi nhánh (F07) |
| **2** | **Tobias Hoffmann** | `tobias.hoffmann@restaurant.example` | **Quản lý Nhà hàng**<br>`RESTAURANT_MANAGER` | • Quản lý hồ sơ nhân sự, hợp đồng lương tối thiểu MiLoG (F02)<br>• Nhập liệu hàng loạt nhân sự qua file CSV (F02)<br>• Lập lịch ca tuần, kiểm tra tuân thủ luật ArbZG (F03)<br>• Phê duyệt đổi ca, xóa ca có xác nhận lý do (F03)<br>• Bổ sung giờ công thủ công có lý do (F04)<br>• Đối soát bảng công 3 trục, duyệt đơn sửa giờ ≤ 60 phút (F05)<br>• **Bị hệ thống chặn tự duyệt cho chính mình theo luật SoD (F05, F06)**<br>• Phê duyệt đơn nghỉ phép của nhân viên & quản lý hạn nghỉ bù ArbZG §11 (F06)<br>• Tính toán & xem phân đoạn phụ cấp ca đêm, chủ nhật, lễ (F07) |
| **3** | **Anna Müller** | `anna.mueller@restaurant.example` | **Nhân viên Phục vụ bàn**<br>`EMPLOYEE` | • Chấm công trực tiếp Check-in, Check-out, Giờ nghỉ thực tế (F04)<br>• Xem bảng timesheet cá nhân, phát hiện đi muộn / về sớm (F04)<br>• Gửi đơn xin sửa giờ thực tế ≤ 60m và > 60m kèm lý do (F05)<br>• Tham gia sàn đổi ca trực (Shift Swap Center) (F03)<br>• Xem số dư phép năm BUrlG và nộp đơn xin nghỉ phép năm (F06)<br>• Xem phụ cấp ca đêm thường 25% và đêm sâu 40% của bản thân (F07) |
| **4** | **Markus Weber** | `markus.weber@restaurant.example` | **Đầu bếp chính**<br>`EMPLOYEE` | • Chấm công ca gãy, ca đêm, ca Chủ nhật / Ngày lễ (F04, F07)<br>• Được ghi nhận nghỉ ốm eAU theo luật EntgFG (F06)<br>• Được phát sinh nghĩa vụ nghỉ bù 14 ngày (Chủ nhật) & 56 ngày (Ngày lễ) theo § 11 ArbZG (F06)<br>• Hưởng phụ cấp ca đêm (25%/40%), Chủ nhật (50%), Ngày lễ (100%-150%) và kiểm tra trần miễn thuế 50€ §3b EStG (F07) |
| **5** | **Sophie Fischer** | `sophie.fischer@restaurant.example` | **Nhân viên Phụ bếp**<br>`EMPLOYEE` | • Đối tượng được bảo vệ theo **Luật Thai sản (MuSchG)**<br>• Kiểm tra hệ thống tự động cấm xếp ca đêm (20h - 6h) và cấm làm thêm giờ (F02, F03)<br>• Chấm công tuân thủ giờ làm ban ngày (F04) |

---

## 3. HƯỚNG DẪN ĐỐI SOÁT VÀ KIỂM TRA TRỰC TIẾP TRONG MYSQL WORKBENCH

Hệ thống lưu trữ toàn bộ dữ liệu thực tế tại MySQL Database `restaurant_hr_payroll_management`. Bạn có thể mở **MySQL Workbench** và thực thi các câu lệnh SQL sau để kiểm tra dữ liệu:

### 3.1. Các câu lệnh SQL đối soát nhanh:

```sql
-- 1. Chọn database làm việc
USE restaurant_hr_payroll_management;

-- 2. Kiểm tra danh sách người dùng và vai trò đăng nhập (F00)
SELECT email, name, roles, active FROM user_accounts;

-- 3. Kiểm tra danh sách nhân viên và hồ sơ hợp đồng lương MiLoG (F02)
SELECT e.employee_id, e.employee_code, e.display_name, c.contract_type, w.gross_hourly_eur 
FROM employees e
LEFT JOIN employment_contracts c ON e.employee_id = c.employee_id
LEFT JOIN wage_rates w ON c.contract_id = w.contract_id;

-- 4. Kiểm tra ca làm việc đã xếp lịch trong tuần (F03)
SELECT schedule_id, employee_id, shift_date, start_time, end_time, status 
FROM shift_schedules 
ORDER BY shift_date DESC;

-- 5. Kiểm tra sự kiện chấm công vào/ra thực tế bất biến (F04)
SELECT event_id, employee_id, event_type, event_time_utc, work_date, source 
FROM attendance_events 
ORDER BY event_time_utc DESC;

-- 6. Kiểm tra bảng công tổng hợp và trạng thái phê duyệt (F04 & F05)
SELECT timesheet_id, employee_id, work_date, worked_minutes, status, is_locked 
FROM attendance_timesheets 
ORDER BY work_date DESC;

-- 7. Kiểm tra đơn xin sửa giờ và vết kiểm toán điều chỉnh (F05)
SELECT request_id, timesheet_id, employee_id, delta_minutes, requires_hr_escalation, status 
FROM attendance_change_requests;

-- 8. Kiểm tra số dư ngày phép năm 2026 theo luật BUrlG (F06)
SELECT balance_id, employee_id, leave_type_code, entitled_days, taken_days, remaining_days, expiry_date 
FROM leave_balances;

-- 9. Kiểm tra danh sách đơn xin nghỉ phép và người duyệt (F06)
SELECT request_id, employee_id, leave_type_code, start_date, end_date, total_days, status, decided_by_user_id 
FROM leave_requests;

-- 10. Kiểm tra hồ sơ nghỉ ốm eAU theo luật EntgFG (F06)
SELECT absence_id, employee_id, start_date, end_date, eau_reference_number, continued_pay_eligible, status 
FROM absence_records;

-- 11. Kiểm tra nghĩa vụ nghỉ bù 14 ngày & 56 ngày theo § 11 ArbZG (F06)
SELECT rest_id, employee_id, worked_date, source_type, deadline_date, is_completed 
FROM compensatory_rest_days;

-- 12. Kiểm tra danh mục 12 ngày lễ Baden-Württemberg 2026 (F07)
SELECT holiday_id, state_code, holiday_date, holiday_code, holiday_name_de 
FROM public_holidays 
WHERE state_code = 'BW' 
ORDER BY holiday_date ASC;

-- 13. Kiểm tra các phân đoạn thời gian đã băm qua Time Splitting Engine (F07)
SELECT segment_id, timesheet_id, segment_start_utc, segment_end_utc, payable_minutes, segment_type 
FROM work_time_segments 
ORDER BY segment_start_utc DESC;

-- 14. Kiểm tra số tiền phụ cấp, miễn thuế §3b EStG (trần 50€) và miễn BHXH SvEV (trần 25€) (F07)
SELECT calc_id, timesheet_id, employee_id, allowance_code, base_wage_eur, rate_percent, 
       paid_amount_eur, tax_exempt_amount_eur, taxable_amount_eur, social_insurance_exempt_amount_eur 
FROM allowance_calculations;
```

---

## 4. HƯỚNG DẪN CHẠY KIỂM THỬ TỰ ĐỘNG

Trước khi tiến hành kiểm thử giao diện thủ công, bạn có thể chạy toàn bộ bộ kiểm thử tự động để xác nhận tính toàn vẹn của mã nguồn:

### 4.1. Chạy Backend Automated Integration Tests
Mở CMD tại thư mục `backend`:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\backend"
mvnw.cmd test
```
* **Kết quả chuẩn:** **`Tests run: 26, Failures: 0, Errors: 0, Skipped: 0`** -> `BUILD SUCCESS`.

### 4.2. Chạy Frontend Build & Typecheck
Mở CMD tại thư mục `frontend`:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\frontend"
npm.cmd run build
```
* **Kết quả chuẩn:** `✓ built in XXXms` với **0 lỗi TypeScript**.

---

## 5. MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT (F00 → F07)

---

### PHÂN HỆ F00: BẢO MẬT, PHÂN QUYỀN & TRẢI NGHIỆM NGƯỜI DÙNG

#### TC-F00-01: Chuyển đổi Ngôn ngữ Song ngữ Đức - Việt (DE / VI)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Đăng nhập hệ thống, quan sát góc trên bên phải màn hình.
  2. Bấm vào nút chuyển đổi ngôn ngữ `DE` / `VI`.
* **Kết quả mong đợi:** Toàn bộ menu điều hướng, bảng biểu, trạng thái và tooltip lập tức chuyển đổi mượt mà giữa tiếng Đức và tiếng Việt; ngôn ngữ lựa chọn được lưu trong `localStorage`.

#### TC-F00-02: Chuyển đổi Giao diện Sáng / Tối (Light / Dark Mode)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example`.
* **Các bước:** Bấm nút biểu tượng Mặt trời / Mặt trăng trên thanh tiêu đề.
* **Kết quả mong đợi:** Giao diện chuyển đổi tức thì giữa nền sáng và nền tối sang trọng, độ tương phản văn bản đạt chuẩn WCAG AAA.

#### TC-F00-03: Kiểm tra Phân quyền RBAC & Phạm vi Truy cập Chi nhánh
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Đăng nhập tài khoản Anna Müller.
* **Kết quả mong đợi:** Menu bên trái chỉ hiển thị các mục được phép: *Chấm công & Giờ nghỉ*, *Lịch ca làm việc*, *Nghỉ phép & Nghỉ bù*. Các mục quản trị cấp cao như *Tài khoản & Phân quyền*, *Pháp nhân* hoàn toàn bị ẩn.

---

### PHÂN HỆ F01: CƠ CẤU CHI NHÁNH & PHÁP NHÂN CHUỖI NHÀ HÀNG

#### TC-F01-01: Xem danh sách Chi nhánh nhà hàng tại Đức
* **Tài khoản kiểm thử:** `admin@restaurant.example` hoặc `tobias.hoffmann@restaurant.example`.
* **Các bước:** Vào menu **"Chi nhánh"** (`#branches`).
* **Kết quả mong đợi:** Hiển thị danh sách các chi nhánh chuỗi nhà hàng (Stuttgart Hauptbahnhof, München Schwabing...) kèm mã định danh, địa chỉ, múi giờ `Europe/Berlin` và trạng thái hoạt động.

---

### PHÂN HỆ F02: HỒ SƠ NHÂN SỰ, HỢP ĐỒNG & LUẬT LƯƠNG ĐỨC

#### TC-F02-01: Kiểm tra Luật Lương Tối thiểu CHLB Đức (MiLoG ≥ 12,41 €/h)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Các bước:**
  1. Vào menu **"Hồ sơ & Hợp đồng"** (`#workforce`).
  2. Bấm "Thêm nhân viên", nhập mức lương cơ sở là `11.50 €/h` (< 12,41 €).
  3. Bấm "Lưu".
* **Kết quả mong đợi:** Hệ thống hiển thị cảnh báo đỏ vi phạm luật **MiLoG**: *"Mức lương không được thấp hơn mức lương tối thiểu 12,41 €/h theo luật định CHLB Đức!"* và chặn lưu.

#### TC-F02-02: Kiểm tra Ràng buộc Bảo vệ Thai sản (MuSchG)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Đối tượng kiểm tra:** Nhân viên **Sophie Fischer** (thuộc diện bảo vệ thai sản MuSchG).
* **Các bước:** Xem chi tiết nhân sự của Sophie Fischer trong `#workforce`.
* **Kết quả mong đợi:** Hiển thị cờ `MuSchG Active`, cấm xếp ca đêm (20:00 - 06:00) và cấm làm thêm giờ quá 8.5 giờ/ngày.

#### TC-F02-03: Nhập liệu nhân sự hàng loạt bằng file CSV (Import Dry-Run)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example`.
* **Các bước:** Vào tab "Nhập liệu hàng loạt (CSV)", tải lên file CSV mẫu nhân viên.
* **Kết quả mong đợi:** Hệ thống thực hiện chế độ Dry-Run kiểm tra từng dòng, báo cáo số dòng hợp lệ và cảnh báo các dòng thiếu thông tin trước khi ghi vào MySQL.

---

### PHÂN HỆ F03: XẾP LỊCH CA & KIỂM SOÁT LUẬT LAO ĐỘNG ĐỨC (ArbZG)

#### TC-F03-01: Lập lịch ca tuần & Kiểm tra tự động vi phạm ArbZG §3 (Tối đa 10h/ngày)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Vào menu **"Lịch ca làm việc"** (`#scheduling`).
  2. Thêm một ca làm việc cho Anna Müller từ `08:00` đến `19:00` (11 tiếng làm việc).
* **Kết quả mong đợi:** Hệ thống hiển thị cảnh báo vi phạm **ArbZG §3**: *"Thời giờ làm việc trong ngày vượt quá 10 giờ tối đa theo Luật Lao động Đức!"*.

#### TC-F03-02: Kiểm tra Khoảng cách nghỉ giữa hai ca liên tiếp (ArbZG §5: Nghỉ 11 giờ)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example`.
* **Các bước:**
  1. Xếp ca 1 cho Markus Weber: Kết thúc lúc `23:00` hôm nay.
  2. Xếp ca 2 cho Markus Weber: Bắt đầu lúc `07:00` sáng mai (khoảng cách nghỉ chỉ có 8 tiếng).
* **Kết quả mong đợi:** Hệ thống hiển thị cảnh báo đỏ vi phạm **ArbZG §5**: *"Khoảng thời gian nghỉ giữa 2 ca làm việc ít hơn 11 giờ liên tục bắt buộc!"*.

#### TC-F03-03: Sàn đổi ca trực (Shift Swap Center)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (tạo yêu cầu) và `markus.weber@restaurant.example` (nhận ca).
* **Các bước:**
  1. Anna vào `#scheduling`, chọn ca của mình và bấm "Đổi ca trực".
  2. Markus đăng nhập, vào tab "Đổi ca", nhìn thấy yêu cầu và bấm "Đồng ý nhận ca".
  3. Quản lý Tobias đăng nhập, bấm "Phê duyệt đổi ca".
* **Kết quả mong đợi:** Lịch ca trên màn hình lập tức cập nhật chuyển người thực hiện từ Anna sang Markus; MySQL cập nhật `shift_schedules.employee_id`.

---

### PHÂN HỆ F04: CHẤM CÔNG TRỰC TIẾP & QUẢN LÝ NGHỈ GIỮA CA

#### TC-F04-01: Nhân viên Check-in / Check-out bắt đầu và kết thúc ca làm
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:**
  1. Đăng nhập Anna Müller, vào menu **"Chấm công & Giờ nghỉ"** (`#attendance`).
  2. Bấm nút **"Bắt đầu ca làm (Check-in)"**.
  3. Sau một khoảng thời gian, bấm **"Kết thúc ca làm (Check-out)"**.
* **Kết quả mong đợi:**
  * Timestamp được ghi nhận chuẩn UTC và hiển thị theo giờ Berlin (`Europe/Berlin`).
  * Bảng `attendance_events` trong MySQL lưu sự kiện bất biến (`CHECK_IN`, `CHECK_OUT`).
  * Bảng công tổng hợp `attendance_timesheets` tự động tính tổng số phút làm việc thực tế.

#### TC-F04-02: Ghi nhận giờ nghỉ giải lao thực tế (ArbZG §4)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example`.
* **Các bước:**
  1. Trong ca làm việc, bấm **"Bắt đầu nghỉ giữa ca"**.
  2. Sau khi nghỉ xong, bấm **"Kết thúc nghỉ giải lao"**.
* **Kết quả mong đợi:** Bảng `break_records` lưu chính xác thời gian bắt đầu, kết thúc và số phút nghỉ; không tự giả định giờ nghỉ khi nhân viên không bấm.

#### TC-F04-03: Bổ sung giờ công thủ công có kiểm soát (F04.05)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Vào `#attendance`, bấm **"Bổ sung giờ công thủ công"**.
  2. Chọn nhân viên `Felix Bauer`, nhập ngày làm việc, giờ vào, giờ ra và **Lý do bắt buộc**: *"Máy POS mất mạng, bổ sung theo biên bản xác nhận của ca trưởng"*.
  3. Bấm "Lưu bản ghi bổ sung".
* **Kết quả mong đợi:** Ca làm việc được tạo với nguồn gốc rõ ràng, lưu vết `MANUAL_ENTRY` trong Audit Log.

---

### PHÂN HỆ F05: ĐỐI SOÁT, SỬA GIỜ & PHÊ DUYỆT CÔNG

#### TC-F05-01: Bảng đối soát 3 trục (Giờ dự kiến, Giờ thực tế, Sai lệch)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
* **Kết quả mong đợi:** Hiển thị bảng đối soát chi tiết: Giờ dự kiến, Giờ thực tế, Số phút nghỉ, Đi muộn, Về sớm, Làm ngoài lịch (+/- delta phút) theo từng ca; không tự cắt xén giờ làm thực tế của nhân viên.

#### TC-F05-02: Nhân viên gửi đơn xin sửa giờ thông thường (≤ 60 phút)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Vào `#attendance`, chọn ca làm việc ngày hôm nay, bấm "Xin sửa giờ", yêu cầu điều chỉnh giờ ra thêm **30 phút** với lý do: *"Hỗ trợ dọn dẹp bàn tiệc đông khách muộn"*.
* **Kết quả mong đợi:** Đơn tạo thành công với trạng thái `PENDING`, cờ `requires_hr_escalation = false`.

#### TC-F05-03: Quản lý phê duyệt đơn xin sửa giờ thông thường
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Vào `#reconciliation`, tab "Đơn xin sửa giờ", tìm đơn 30 phút của Anna, bấm "Phê duyệt" và nhập ghi chú.
* **Kết quả mong đợi:** Đơn chuyển sang `APPROVED`; giờ ra của Anna trên timesheet tự động cập nhật và bật cờ `recalculation_required = true`.

#### TC-F05-04: Leo thang cấp duyệt HR khi chênh lệch > 60 phút (US-026)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:** Tạo đơn xin sửa giờ với chênh lệch **90 phút** (> 60 phút).
* **Kết quả mong đợi:** Hệ thống tự động bật cờ `requires_hr_escalation = true`, trạng thái chuyển thành `HR_ESCALATED` (Leo thang lên HR).

#### TC-F05-05: Chặn Quản lý duyệt đơn bị leo thang HR
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:** Quản lý Tobias vào danh sách đơn sửa giờ, cố gắng bấm duyệt đơn 90 phút của Anna.
* **Kết quả mong đợi:** Hệ thống chặn lại với thông báo: *"Đơn điều chỉnh trên 60 phút vượt thẩm quyền của Quản lý nhà hàng, bắt buộc chuyển cấp HR / Admin phê duyệt!"*.

#### TC-F05-06: Quản trị viên / Cấp duyệt HR phê duyệt đơn leo thang
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Admin / HR).
* **Các bước:** Đăng nhập Admin, vào `#reconciliation`, tab "Đơn xin sửa giờ", bấm duyệt đơn 90 phút của Anna Müller.
* **Kết quả mong đợi:** Đơn được phê duyệt thành công, ghi nhận audit vết điều chỉnh `attendance_adjustments`.

#### TC-F05-07: Kiểm tra Quy tắc SoD - Chặn Quản lý tự duyệt bảng công của chính mình
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Kiểm tra quy tắc Phân tách nhiệm vụ (Segregation of Duties).
* **Các bước:** Tobias vào `#reconciliation`, tìm ca làm việc của chính nhân viên **Tobias Hoffmann** và cố gắng bấm duyệt.
* **Kết quả mong đợi:** Nút duyệt bị vô hiệu hóa hoặc hệ thống trả về lỗi **`HTTP 403 Forbidden`**: *"Vi phạm quy tắc SoD: Bạn không thể tự phê duyệt bảng chấm công của chính mình!"*.

#### TC-F05-08: Admin duyệt bảng công cho Quản lý Tobias giải quyết SoD
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Admin).
* **Các bước:** Admin đăng nhập, vào `#reconciliation`, duyệt ca làm việc của Tobias Hoffmann.
* **Kết quả mong đợi:** Ca của Tobias được duyệt thành công sang trạng thái `APPROVED`.

#### TC-F05-09: Chốt và Khóa kỳ chấm công chi nhánh (US-028)
* **Tài khoản kiểm thử:** `admin@restaurant.example`.
* **Các bước:** Vào `#reconciliation`, chuyển tab "Khóa kỳ công", chọn ngày chốt và bấm "Xác nhận khóa kỳ".
* **Kết quả mong đợi:** Toàn bộ timesheet trong kỳ chuyển sang `LOCKED` (`is_locked = true`), dữ liệu trở thành bất biến để phục vụ tính lương.

---

### PHÂN HỆ F06: NGHỈ PHÉP, NGHỈ ỐM VÀ NGÀY NGHỈ BÙ

#### TC-F06-01: Kiểm tra Danh mục & Số dư phép năm BUrlG (US-066, US-082)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:**
  1. Đăng nhập tài khoản Anna Müller, bấm vào menu **"Nghỉ phép & Nghỉ bù"** (`#leave`).
  2. Xem tab **"Số dư phép năm (BUrlG)"**.
* **Kết quả mong đợi:**
  * Hiển thị đầy đủ các cột: *Loại phép* (Phép năm, Nghỉ việc riêng §616 BGB, Nghỉ không lương, Nghỉ đào tạo), *Được hưởng (Entitled)* (20-24 ngày), *Chuyển sang (Carried Over)*, *Đã nghỉ (Taken)*, *Đang chờ duyệt (Pending)* và *Còn lại (Remaining)*.
  * Hiển thị thông báo hạn chót bảo lưu phép tồn theo **§7 Abs. 3 BUrlG**: Hạn sử dụng đến hết ngày **31.03 năm kế tiếp**.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT * FROM leave_balances WHERE employee_id = 1;
  ```

#### TC-F06-02: Nhân viên nộp đơn xin nghỉ phép năm (US-065)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên).
* **Các bước:**
  1. Trong màn hình `#leave`, bấm nút **"Nộp đơn xin nghỉ"**.
  2. Chọn loại nghỉ: `Nghỉ phép năm (BUrlG)`.
  3. Chọn khoảng thời gian: Từ `2026-07-06` đến `2026-07-10` (5 ngày làm việc).
  4. Nhập lý do: *"Nghỉ hè cùng gia đình"*.
  5. Bấm **"Gửi đơn"**.
* **Kết quả mong đợi:**
  * Đơn xin nghỉ được tạo thành công với trạng thái `PENDING`.
  * Cột *Đang chờ duyệt* của Anna tăng thêm 5 ngày.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT * FROM leave_requests WHERE employee_id = 1 ORDER BY created_at_utc DESC LIMIT 1;
  ```

#### TC-F06-03: Quản lý phê duyệt đơn nghỉ phép & Tự động đồng bộ số dư (US-079)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Các bước:**
  1. Đăng nhập Quản lý Tobias Hoffmann, vào menu `#leave`.
  2. Chuyển sang tab **"Đơn xin nghỉ & Phê duyệt"**.
  3. Tìm đơn của Anna Müller, bấm nút **"Duyệt"**.
  4. Nhập ghi chú: *"Đã sắp xếp người thay thế trong ca"*, bấm **"Xác nhận duyệt"**.
* **Kết quả mong đợi:**
  * Đơn chuyển sang trạng thái `APPROVED`.
  * Số dư ngày phép của Anna lập tức được khấu trừ tự động: `taken_days += 5`, `pending_days -= 5`, `remaining_days -= 5`.
  * Hệ thống tự động kiểm tra lịch ca tuần và hủy bỏ các ca làm việc bị trùng lặp với thời gian nghỉ đã duyệt.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT entitled_days, taken_days, remaining_days FROM leave_balances WHERE employee_id = 1 AND leave_type_code = 'ANNUAL';
  ```

#### TC-F06-04: Kiểm tra Ràng buộc SoD - Chặn Quản lý tự duyệt đơn nghỉ của chính mình
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Tobias Hoffmann bấm "Nộp đơn xin nghỉ" cho chính mình (Employee ID: 5).
  2. Sau khi gửi, Tobias vào tab "Đơn xin nghỉ & Phê duyệt" tìm đơn của mình.
* **Kết quả mong đợi:**
  * Hệ thống hiển thị biểu ngữ cảnh báo **Segregation of Duties (SoD)** màu vàng cam rõ ràng.
  * Nút "Duyệt" trên đơn của Tobias bị vô hiệu hóa; nếu cố tình gửi request duyệt, hệ thống từ chối với lỗi **`HTTP 403 Forbidden`**. Đơn của Tobias phải do Admin (`admin@restaurant.example`) phê duyệt.

#### TC-F06-05: Ghi nhận Nghỉ ốm eAU theo EntgFG & Bảo vệ Dữ liệu Y tế DSGVO (US-080)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý) hoặc `admin@restaurant.example` (HR).
* **Các bước:**
  1. Vào menu `#leave`, bấm nút màu đỏ **"Ghi nhận nghỉ ốm eAU"**.
  2. Chọn nhân viên: `Markus Weber`.
  3. Khoảng thời gian: Từ `2026-06-01` đến `2026-06-05`.
  4. Nhập mã tra cứu chứng thực điện tử eAU từ bảo hiểm y tế: `eAU-2026-TK-99214`.
  5. Bấm **"Lưu hồ sơ nghỉ ốm"**.
* **Kết quả mong đợi:**
  * Hồ sơ nghỉ ốm được ghi nhận với cờ `continued_pay_eligible = true` (Đủ điều kiện hưởng 100% lương theo Luật Tiếp tục trả lương khi ốm đau EntgFG trong 6 tuần).
  * **Tuân thủ quyền riêng tư DSGVO**: Tuyệt đối không có bất kỳ trường nào lưu trữ chẩn đoán bệnh lý y tế (mã ICD-10) hay thông tin bệnh án trong hệ thống.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT * FROM absence_records WHERE employee_id = 2;
  ```

#### TC-F06-06: Theo dõi & Quản lý Hạn bố trí Nghỉ bù (§ 11 Abs. 3 ArbZG) (US-081, US-082)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Vào menu `#leave`, chuyển sang tab **"Hạn nghỉ bù (§ 11 ArbZG)"**.
  2. Quan sát danh sách các nghĩa vụ nghỉ bù phát sinh từ ca làm việc Chủ nhật và Ngày lễ:
     * **Ca Chủ nhật:** Hạn chót bố trí nghỉ bù trong vòng **2 tuần (14 ngày)**.
     * **Ca Ngày lễ:** Hạn chót bố trí nghỉ bù trong vòng **8 tuần (56 ngày)**.
     * Cột "Thời hạn còn lại" hiển thị đếm ngược số ngày: Xanh lá (> 5 ngày), Vàng (≤ 5 ngày), Đỏ (*Quá hạn - Überfällig*).
  3. Bấm nút **"Xác nhận đã nghỉ (Als gewährt markieren)"** trên một nghĩa vụ nghỉ bù.
* **Kết quả mong đợi:** Nghĩa vụ chuyển sang trạng thái `Đã bố trí nghỉ` (`is_completed = true`), lưu vết ngày được cấp nghỉ bù.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT rest_id, employee_id, worked_date, deadline_date, is_completed, granted_date FROM compensatory_rest_days;
  ```

---

### PHÂN HỆ F07: NGÀY LỄ, PHỤ CẤP VÀ MIỄN THUẾ SFN

#### TC-F07-01: Lịch 12 Ngày lễ Pháp định bang Baden-Württemberg (FTG) (US-014, US-015, US-034)
* **Tài khoản kiểm thử:** Mọi tài khoản (`admin`, `tobias.hoffmann`, `anna.mueller`).
* **Các bước:**
  1. Vào menu **"Phụ cấp SFN & Ngày lễ"** (`#allowances`).
  2. Bấm nút **"Lịch 12 ngày lễ BW"**.
* **Kết quả mong đợi:**
  * Modal mở ra hiển thị chuẩn xác toàn bộ 12 ngày lễ chính thức của bang Baden-Württemberg năm 2026: *Neujahr (01.01), Heilige Drei Könige (06.01), Karfreitag (03.04), Ostermontag (06.04), Tag der Arbeit (01.05), Christi Himmelfahrt (14.05), Pfingstmontag (25.05), Fronleichnam (04.06), Tag der Deutschen Einheit (03.10), Allerheiligen (01.11), 1. Weihnachtstag (25.12), 2. Weihnachtstag (26.12)*.
  * Hiển thị lưu ý: MVP vận hành chuẩn xác cho Baden-Württemberg; chi nhánh tại các bang khác chưa có lịch lễ sẽ bị chặn tính phụ cấp chính thức để tránh sai lệch thuế.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT holiday_id, state_code, holiday_date, holiday_code, holiday_name_de FROM public_holidays WHERE state_code = 'BW' ORDER BY holiday_date ASC;
  ```

#### TC-F07-02: Động cơ Phân đoạn Thời gian (Time Splitting Engine) (US-029, US-030)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Mục tiêu:** Kiểm tra ca làm việc qua nửa đêm hoặc qua các khung phụ cấp bị băm thành các đoạn nhỏ không chồng lấn.
* **Các bước:**
  1. Trong `#allowances`, tìm một ca làm việc từ `18:00` Chủ nhật đến `02:00` sáng Thứ Hai.
  2. Bấm nút **"Xem phân đoạn"**.
* **Kết quả mong đợi:** Ca làm việc 8 tiếng được băm thành 3 phân đoạn chính xác theo phút:
  * **Đoạn 1 (18:00 - 20:00 - 120 phút):** Giờ Chủ nhật thông thường -> Phụ cấp **50%**.
  * **Đoạn 2 (20:00 - 24:00 - 240 phút):** Giờ Chủ nhật ban đêm -> Phụ cấp **75%** (50% Chủ nhật + 25% Đêm).
  * **Đoạn 3 (00:00 - 02:00 - 120 phút):** Qua nửa đêm, đêm sâu (ca bắt đầu trước 00h) -> Phụ cấp **90%** (50% Chủ nhật kéo dài đến 04:00 sáng Thứ Hai + 40% Đêm sâu).
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT segment_id, timesheet_id, payable_minutes, segment_type, is_night, is_deep_night, is_sunday 
  FROM work_time_segments 
  WHERE timesheet_id = ...;
  ```

#### TC-F07-03: Kiểm tra Phụ cấp Ngày đặc biệt (24/12 & 31/12 sau 14h) (US-035)
* **Tài khoản kiểm thử:** `admin@restaurant.example` hoặc `tobias.hoffmann@restaurant.example`.
* **Mục tiêu:** Kiểm tra quy định luật thuế tách riêng thời gian trước và sau 14:00 ngày 24/12 (Đêm Giáng sinh) và 31/12 (Giao thừa).
* **Kết quả mong đợi:**
  * Ca làm việc ngày 24/12: Khoảng thời gian từ 00:00 - 14:00 tính theo ngày làm việc bình thường; khoảng thời gian từ **sau 14:00** được áp mức phụ cấp lễ đặc biệt **150%**.
  * Tương tự ngày 31/12: Sau 14:00 áp mức phụ cấp **125%**.

#### TC-F07-04: Tách biệt Trần Miễn Thuế §3b EStG (50 €/h) vs Trần Miễn BHXH SvEV (25 €/h) (US-038)
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Quản trị / Kế toán lương).
* **Mục tiêu:** Kiểm tra trần miễn thuế TNCN và trần miễn đóng BHXH không bị đánh đồng.
* **Kịch bản tính toán với Lương cơ sở = 30.00 €/h, làm ca đêm phụ cấp 25%:**
  * Tiền phụ cấp thực trả: `30 € * 25% = 7.50 €/h`.
  * **Theo §3b EStG (Trần 50 €/h):** Vì 30 € < 50 € -> Được **miễn thuế toàn bộ 7.50 €/h** (`tax_exempt_amount_eur = 7.50 €`, `taxable_amount_eur = 0.00 €`).
  * **Theo SvEV (Trần 25 €/h):** Vì 30 € > 25 € -> Mức tối đa được miễn BHXH là `25 € * 25% = 6.25 €/h`.
  * **Phần chịu đóng BHXH:** `7.50 € - 6.25 € = 1.25 €/h`.
* **Kết quả mong đợi:** Hệ thống phân loại độc lập 2 cột `tax_exempt_amount_eur` và `social_insurance_exempt_amount_eur`, không sao chép kết quả miễn thuế sang bảo hiểm.
* **Kiểm tra trong MySQL Workbench:**
  ```sql
  SELECT base_wage_eur, paid_amount_eur, tax_exempt_amount_eur, taxable_amount_eur, social_insurance_exempt_amount_eur 
  FROM allowance_calculations 
  WHERE timesheet_id = ...;
  ```

#### TC-F07-05: Kiểm tra Tính Minh bạch Trace Kiểm toán & Tái tính toán Phụ cấp (US-039)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Trong `#allowances`, bấm nút "Xem phân đoạn" trên một ca làm việc.
  2. Quan sát dòng `🔍 Trace:` ở mỗi phân đoạn.
* **Kết quả mong đợi:** Chuỗi Trace hiển thị tường minh mọi thông số tính toán:
  ```text
  Lương cơ sở: 15.00 €/h | Tỷ lệ trả: 75.0% (Đêm 25.0% + Ngày SUNDAY 50.0%) | Thực trả: 22.50 € | Miễn thuế §3b (trần 50€): 22.50 € | Chịu thuế: 0.00 € | Miễn BH SvEV (trần 25€): 22.50 €
  ```
* **Thao tác:** Bấm nút icon **"Tái tính toán (Refresh)"** trên ca làm việc -> Hệ thống tự động xóa kết quả cũ, băm lại phân đoạn và tính toán lại tức thì.

---

## 6. BẢNG TỔNG HỢP RÀNG BUỘC PHÁP LÝ & PHÂN TÁCH NHIỆM VỤ

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

## 7. MẪU BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG

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
