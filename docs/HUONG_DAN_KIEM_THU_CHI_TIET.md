# TÀI LIỆU HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN HỆ THỐNG ATELIER (DT06)
## Phân hệ Nhân sự, Lịch ca, Chấm công, Đối soát & Phê duyệt Giờ công (Chuẩn Luật Lao động CHLB Đức)

---

## 1. MỤC ĐÍCH & PHẠM VI KIỂM THỬ

Tài liệu này cung cấp hướng dẫn kiểm thử toàn diện từ đầu đến cuối (End-to-End Testing) cho toàn bộ hệ thống **Atelier - Restaurant HR & Payroll Management** được chuẩn hóa theo phương án **DT06 (Phương án C - Chuẩn Luật Lao động CHLB Đức)**.

### Phạm vi bao gồm đầy đủ 6 phân hệ cốt lõi (F00 → F05):
1. **F00 (Bảo mật & Trải nghiệm):** Đăng nhập, Xác thực hai bước (MFA/TOTP), Phân quyền RBAC, Phân tách nhiệm vụ (SoD), Chế độ Tối (Dark Mode), Giao diện song ngữ Việt - Đức (i18n).
2. **F01 (Chi nhánh & Pháp nhân):** Chuỗi nhà hàng, cơ cấu pháp nhân, địa điểm làm việc thực tế, phân công địa điểm không bị ghi đè.
3. **F02 (Hồ sơ nhân sự & Hợp đồng):** Hồ sơ nhân viên, dòng thời gian hợp đồng và mức lương (MiLoG ≥ 12,41 €/h, Minijob ≤ 538 €), nhóm bảo vệ đặc biệt (MuSchG thai sản, JArbSchG thanh thiếu niên), nhập liệu hàng loạt bằng CSV với chế độ Dry-Run.
4. **F03 (Xếp lịch ca & Luật lao động ArbZG):** Lịch làm việc tuần, mẫu ca làm việc, kiểm tra cảnh báo luật lao động Đức (ArbZG §3, §4, §5, §11), hộp thoại xác nhận xóa ca nội bộ, công bố lịch ca có phiên bản & audit trail, sàn đổi ca trực (Shift Swap Center).
5. **F04 (Chấm công trực tiếp & Quản lý nghỉ giữa ca):** Check-in / Check-out thời gian thực với timestamp UTC bất biến, ghi nhận nghỉ giữa ca thực tế theo ArbZG §4, phát hiện bất thường tự động (quên check-out, đi muộn, về sớm, thiếu giờ nghỉ, làm quá 10h), bổ sung giờ công thủ công có kiểm soát.
6. **F05 (Đối soát, sửa & phê duyệt giờ công):** Bảng đối soát 3 trục (Lịch ca vs Thực tế vs Chênh lệch phút), nhân viên gửi đơn xin sửa giờ, quy tắc leo thang HR tự động khi chênh lệch > 60 phút (US-026), ngăn chặn người quản lý tự duyệt ca của bản thân (SoD), khóa kỳ chấm công (Period Locking - US-028), lưu vết điều chỉnh (Audit Trail) và đánh dấu tái tính toán phục vụ Payroll.

---

## 2. MÔI TRƯỜNG THỰC THI & TÀI KHOẢN MẪU

### 2.1. Địa chỉ dịch vụ
* **Giao diện Web (Frontend):** `http://127.0.0.1:5173`
* **Dịch vụ API (Backend):** `http://127.0.0.1:8080/api`
* **Cơ sở dữ liệu:** MySQL 8.0 (`restaurant_hr_payroll_management`) trên cổng `3306`

### 2.2. Danh sách tài khoản thử nghiệm theo vai trò

| Tài khoản (Username / Email) | Mật khẩu | Vai trò (Role) | Chức vụ thực tế | Phạm vi quyền hạn | Ghi chú nút tắt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `admin@restaurant.example` | `Password123!` | `SYSTEM_ADMIN` | Quản trị viên hệ thống | Toàn quyền kiểm soát, phê duyệt đơn leo thang HR, khóa kỳ công, giải quyết xung đột SoD | Nút tắt `Quản trị` |
| `tobias.hoffmann@restaurant.example` | `Password123!` | `RESTAURANT_MANAGER` | Quản lý nhà hàng (Stuttgart) | Quản lý ca trực, xem bảng đối soát chi nhánh, duyệt ca của nhân viên khác (không được tự duyệt chính mình) | Nút tắt `QL Tobias` |
| `anna.mueller@restaurant.example` | `Password123!` | `EMPLOYEE` | Nhân viên phục vụ (Servicekraft) | Chấm công trực tiếp, xem ca cá nhân, gửi yêu cầu đổi ca, gửi đơn xin sửa giờ | Nút tắt `NV Anna` |
| `markus.weber@restaurant.example` | `Password123!` | `EMPLOYEE` | Đầu bếp (Koch) | Chấm công ca bếp, đổi ca, kiểm tra giờ làm và số phút nghỉ | Nhân viên Full-time |
| `sophie.fischer@restaurant.example` | `Password123!` | `EMPLOYEE` | Nhân viên (Thai sản MuSchG) | Được bảo vệ thai sản theo luật Đức (cấm ca đêm 20:00 - 06:00, cấm làm thêm giờ) | Nhóm bảo vệ đặc biệt |

---

## 3. HƯỚNG DẪN CHẠY KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

### 3.1. Chạy kiểm thử tự động tầng Backend (Spring Boot / JUnit 5)
Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục `backend`:
```powershell
cd backend
.\mvnw.cmd test
```
* **Tiêu chuẩn đạt (PASS):** Kết quả hiển thị **`BUILD SUCCESS`** với toàn bộ **`Tests run: 24, Failures: 0, Errors: 0, Skipped: 0`**. Toàn bộ logic kiểm tra luật lao động Đức (ArbZG §3, §4, §5, §11), phân tách nhiệm vụ (SoD), xác thực tài khoản và tính toán lương/thời gian đều vượt qua.

### 3.2. Chạy kiểm thử biên dịch Frontend (React / TypeScript / Vite)
Mở cửa sổ dòng lệnh tại thư mục `frontend`:
```powershell
cd frontend
npm.cmd run build
```
* **Tiêu chuẩn đạt (PASS):** Quá trình Type-checking (`tsc -b`) và bundling (`vite build`) hoàn thành với **0 lỗi**, sinh gói tĩnh trong thư mục `dist/` trong vòng ~1-2 giây.

---

## 4. MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT (TEST CASES F00 → F05)

### PHÂN HỆ F00: BẢO MẬT, PHÂN QUYỀN & TRẢI NGHIỆM

#### TC-F00-01: Đăng nhập sai và Thông báo lỗi bằng tiếng Việt chuẩn
* **Mục tiêu:** Kiểm tra hệ thống phát hiện mật khẩu không đúng, không lộ thông tin nội bộ và thông báo tiếng Việt mượt mà.
* **Các bước:**
  1. Truy cập `http://127.0.0.1:5173/`.
  2. Chọn ngôn ngữ `VI` ở thanh công cụ góc trên.
  3. Nhập email: `anna.mueller@restaurant.example`, mật khẩu: `MatKhauSai999!`.
  4. Bấm **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Xuất hiện thông báo lỗi tiếng Việt: *"Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu."*
  * Không rò rỉ mã lỗi Java hay thông báo tiếng Đức khi đang ở chế độ tiếng Việt.

#### TC-F00-02: Đăng nhập nhanh và Chuyển hướng theo vai trò
* **Các bước:**
  1. Bấm nút tắt **"QL Tobias"** trên giao diện đăng nhập.
  2. Bấm **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Đăng nhập thành công, chuyển thẳng đến màn hình **Tổng quan** (`#overview`).
  * Huy hiệu người dùng hiển thị: *"Tobias Hoffmann - Quản lý nhà hàng"*.

#### TC-F00-03: Chuyển đổi song ngữ Việt - Đức (i18n) & Chế độ tối (Dark Mode)
* **Các bước:**
  1. Bấm chuyển đổi giữa cờ `VI` và `DE`.
  2. Bấm icon Mặt trăng / Mặt trời để bật/tắt Dark Mode.
* **Kết quả mong đợi:**
  * Menu, tiêu đề bảng, nhãn trường, trạng thái ca chuyển dịch lập tức giữa hai ngôn ngữ.
  * Ở Dark Mode: Nền xanh đen sâu thẳm, chữ xám bạc và trắng rõ nét, tương phản cao, không có tình trạng nút bị tàng hình.

---

### PHÂN HỆ F01: CƠ CẤU CHI NHÁNH & PHÁP NHÂN

#### TC-F01-01: Quản lý Chi nhánh Nhà hàng & Địa điểm làm việc
* **Các bước:**
  1. Vào menu **"Chi nhánh"** (`#branches`).
  2. Quan sát danh sách 3 chi nhánh mẫu: *Stuttgart Mitte*, *Karlsruhe City*, *Freiburg Altstadt*.
  3. Bấm vào chi nhánh *Stuttgart Mitte* để mở Drawer chi tiết.
* **Kết quả mong đợi:**
  * Hiển thị đầy đủ thông tin: Mã chi nhánh, Địa chỉ, Bang (Baden-Württemberg), Múi giờ bắt buộc `Europe/Berlin`, danh sách nhân sự được phân công và vị trí.

---

### PHÂN HỆ F02: HỒ SƠ NHÂN SỰ, HỢP ĐỒNG & LUẬT LƯƠNG ĐỨC

#### TC-F02-01: Thêm mới nhân sự & Kiểm soát mức lương tối thiểu (MiLoG ≥ 12,41 €/h)
* **Mục tiêu:** Kiểm tra form modal thêm nhân viên chuẩn hóa 3 khối và bắt buộc tuân thủ luật lương tối thiểu của Đức.
* **Các bước:**
  1. Vào menu **"Hồ sơ & Hợp đồng"** (`#workforce`).
  2. Bấm nút xanh **"+ Thêm nhân viên"**.
  3. Nhập họ tên, email, chọn chi nhánh và vị trí.
  4. Tại mục lương, nhập mức lương giờ: `11.00` €/h (vi phạm luật).
  5. Bấm **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống phát hiện vi phạm và báo lỗi: *"Mức lương giờ phải tối thiểu bằng mức lương quy định theo luật Đức (12.41 €/h)"*.
  * Sửa lại thành `14.50` €/h và bấm tạo -> Tạo hồ sơ thành công.

#### TC-F02-02: Kiểm soát trần thu nhập Minijob (≤ 538,00 €/tháng)
* **Các bước:**
  1. Trong modal thêm nhân viên, chọn loại hợp đồng: **"Minijob (≤ 538 €)"**.
  2. Nhập mức lương tháng: `650.00` €.
  3. Bấm **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống chặn và cảnh báo: *"Thu nhập Minijob không được vượt quá giới hạn luật định (538.00 €/tháng)"*.

#### TC-F02-03: Nhóm bảo vệ đặc biệt (MuSchG - Thai sản & JArbSchG - Vị thành niên)
* **Các bước:**
  1. Tại bảng danh sách, chọn nhân viên **Sophie Fischer**.
  2. Chuyển sang tab **"Điều kiện bảo vệ"**.
* **Kết quả mong đợi:**
  * Hiển thị huy hiệu bảo vệ thai sản MuSchG kèm quy tắc: Cấm làm việc ca đêm từ 20:00 - 06:00, cấm làm thêm giờ quá 8.5 giờ/ngày.

#### TC-F02-04: Nhập liệu hàng loạt qua CSV với cơ chế Dry-Run
* **Các bước:**
  1. Bấm nút **"Nhập file CSV"**.
  2. Dán dữ liệu kiểm thử (có 1 dòng hợp lệ và 1 dòng vi phạm trùng mã hoặc lương thấp).
  3. Bấm **"Kiểm tra trước (Dry-Run)"**.
* **Kết quả mong đợi:**
  * Hệ thống không chèn vào database ngay mà hiển thị bảng xem trước: Số dòng hợp lệ, số dòng lỗi và lý do lỗi chi tiết bằng tiếng Việt.
  * Chỉ khi xác nhận nhập, các dòng hợp lệ mới được cập nhật.

---

### PHÂN HỆ F03: XẾP LỊCH CA & LUẬT LAO ĐỘNG ĐỨC (ArbZG)

#### TC-F03-01: Kiểm tra tự động 4 quy tắc Luật Lao động Đức (ArbZG)
* **Quy tắc 1: Khoảng cách nghỉ giữa 2 ca tối thiểu 11 giờ (ArbZG §5):**
  * Xếp ca ngày 1 kết thúc lúc `23:00`, xếp tiếp ca ngày 2 cho cùng nhân viên bắt đầu lúc `07:00` sáng hôm sau (nghỉ 8h < 11h).
  * *Kết quả:* Hiển thị cảnh báo đỏ vi phạm ArbZG §5 kèm số giờ nghỉ thiếu.
* **Quy tắc 2: Giới hạn tối đa 10 giờ làm việc mỗi ngày (ArbZG §3):**
  * Xếp ca kéo dài 11 tiếng trong ngày.
  * *Kết quả:* Cảnh báo đỏ vi phạm ArbZG §3: Thời gian làm việc tối đa không được vượt quá 10 giờ.
* **Quy tắc 3: Nghỉ giải lao bắt buộc giữa ca (ArbZG §4):**
  * Xếp ca 7 tiếng nhưng đặt thời gian nghỉ là `0` phút.
  * *Kết quả:* Cảnh báo vi phạm ArbZG §4: Ca làm việc trên 6 giờ bắt buộc có tối thiểu 30 phút nghỉ.
* **Quy tắc 4: Cảnh báo làm việc ngày Chủ nhật (ArbZG §11):**
  * Xếp ca làm việc vào ngày Chủ nhật.
  * *Kết quả:* Thẻ ca hiển thị nhãn cảnh báo `ArbZG §11`, nhắc nhở bố trí ngày nghỉ bù trong 2 tuần tiếp theo.

#### TC-F03-02: Hộp thoại xác nhận xóa ca an toàn (Modal Dialog)
* **Các bước:**
  1. Rê chuột lên một thẻ ca bất kỳ trên lịch tuần.
  2. Bấm vào icon **`✕`** (Xóa ca).
* **Kết quả mong đợi:**
  * Mở hộp thoại xác nhận nội bộ với thông tin nhân viên, ngày làm, giờ ca.
  * Bấm nút **"Xác nhận xóa ca"** màu đỏ -> Ca làm việc được xóa mượt mà, không dùng `confirm()` mặc định của trình duyệt.

#### TC-F03-03: Công bố lịch ca có phiên bản & Sàn đổi ca trực (Shift Swap Center)
* **Các bước:**
  1. Bấm **"Công bố lịch làm việc"** -> Toàn bộ ca chuyển trạng thái sang *Đã công bố*, ghi nhận Revision 1 và lưu audit log.
  2. Bấm **"Đổi ca & Sàn ca trống"** -> Gửi yêu cầu đổi ca với đồng nghiệp kèm lý do -> Quản lý có thể Duyệt hoặc Từ chối kèm kiểm tra điều kiện ArbZG tự động.

---

### PHÂN HỆ F04: CHẤM CÔNG TRỰC TIẾP & QUẢN LÝ GIỜ NGHỈ

#### TC-F04-01: Bắt đầu ca làm việc (Check-in trực tiếp)
* **Mục tiêu:** Kiểm tra nhân viên bắt đầu làm việc trực tiếp trong hệ thống, ghi nhận timestamp UTC chính xác và tạo bản ghi bất biến trong `attendance_events`.
* **Tiền điều kiện:** Đăng nhập tài khoản nhân viên `anna.mueller` hoặc quản lý `tobias.hoffmann`.
* **Các bước:**
  1. Vào menu **"Chấm công cá nhân"** (`#attendance`).
  2. Quan sát thẻ đồng hồ thời gian thực (Live Time Clock): Trạng thái hiển thị *"Đang ngoài ca"*.
  3. Bấm nút màu xanh ngọc lớn: **"Vào ca làm việc"**.
* **Kết quả mong đợi:**
  * Hệ thống ghi nhận giờ vào ca chính xác theo giờ hiện tại.
  * Trạng thái đồng hồ chuyển sang: *"Đang trong ca làm việc"*, nhấp nháy đèn xanh theo dõi.
  * Bảng chấm công bên dưới sinh ra 1 dòng ca mới với trạng thái `OPEN`.
  * Cơ sở dữ liệu: Bản ghi được lưu bất biến vào bảng `attendance_events` với `event_type = 'CHECK_IN'`.

#### TC-F04-02: Ghi nhận giờ nghỉ giữa ca thực tế (Start / End Break)
* **Mục tiêu:** Ghi nhận thời điểm bắt đầu và kết thúc giờ nghỉ thực tế, gắn với ca làm việc hiện hành.
* **Các bước:**
  1. Khi đang trong ca làm việc, bấm nút **"Bắt đầu nghỉ giải lao"**.
  2. Quan sát trạng thái đồng hồ: Chuyển sang *"Đang nghỉ giải lao"* (màu vàng hổ phách).
  3. Chờ 1-2 phút (hoặc giả lập qua kiểm thử), sau đó bấm nút **"Kết thúc nghỉ giải lao"**.
* **Kết quả mong đợi:**
  * Hệ thống tính toán chính xác số phút nghỉ thực tế (không tự giả định thời gian nghỉ).
  * Bản ghi giờ nghỉ được lưu vào bảng `break_records` với `start_time_utc`, `end_time_utc`, `duration_minutes`.
  * Trạng thái đồng hồ chuyển lại thành *"Đang trong ca làm việc"*.

#### TC-F04-03: Kiểm tra tự động vi phạm giờ nghỉ theo ArbZG §4
* **Mục tiêu:** Phát hiện ca làm việc trên 6 giờ hoặc trên 9 giờ nhưng không đạt thời gian nghỉ luật định.
* **Kịch bản kiểm thử:**
  * Nhân viên làm việc ca kéo dài 7 tiếng nhưng tổng thời gian nghỉ thực tế chỉ có 15 phút (< 30 phút theo luật).
* **Kết quả mong đợi:**
  * Cột thời gian nghỉ trên Timesheet hiển thị icon cảnh báo tam giác vàng.
  * Rê chuột hoặc xem chi tiết hiển thị cảnh báo: *"Chưa đủ thời gian nghỉ theo luật CHLB Đức (ArbZG §4): Ca trên 6h cần tối thiểu 30 phút nghỉ"*.
  * Tự động ghi nhận một bất thường vào bảng `attendance_exceptions` với mã `INSUFFICIENT_BREAK`.

#### TC-F04-04: Kết thúc ca làm việc (Check-out)
* **Các bước:**
  1. Bấm nút màu đỏ: **"Kết thúc ca làm"**.
* **Kết quả mong đợi:**
  * Trạng thái ca chuyển sang `PENDING_APPROVAL` (Chờ đối soát & duyệt).
  * Ghi nhận sự kiện `CHECK_OUT` vào bảng `attendance_events`.
  * Cột tổng giờ làm việc (`workedMinutes`) được tính tự động: `(Giờ ra - Giờ vào) - Giờ nghỉ`.

#### TC-F04-05: Bổ sung giờ công thủ công có kiểm soát (Manual Entry - F04.05)
* **Mục tiêu:** Dành cho Quản lý / HR bổ sung giờ làm việc khi có sự cố kỹ thuật hoặc mất mạng, đảm bảo có lý do và audit trail.
* **Các bước:**
  1. Tại màn hình Chấm công cá nhân, bấm nút **"+ Bổ sung giờ công thủ công"**.
  2. Chọn chi nhánh làm việc (ví dụ: *Stuttgart Mitte*).
  3. Chọn nhân viên (ví dụ: *Markus Weber*).
  4. Chọn ngày làm việc, nhập giờ vào `09:00`, giờ ra `17:00`, giờ nghỉ `30m`.
  5. Bắt buộc nhập lý do: *"Hệ thống mạng chi nhánh mất kết nối, nhân viên có mặt đầy đủ theo xác nhận của bếp trưởng"*.
  6. Bấm **"Lưu bản ghi giờ công"**.
* **Kết quả mong đợi:**
  * Bản ghi giờ công được tạo thành công với trạng thái `PENDING_APPROVAL`.
  * Ghi nhận audit trail rõ ràng về người tạo, thời điểm và lý do bổ sung.

---

### PHÂN HỆ F05: ĐỐI SOÁT, SỬA & PHÊ DUYỆT GIỜ CÔNG

#### TC-F05-01: Bảng đối soát 3 trục theo ca (Soll-Ist-Vergleich)
* **Mục tiêu:** Quản lý đối soát giữa kế hoạch xếp ca và thực tế chấm công của từng nhân viên.
* **Các bước:**
  1. Đăng nhập tài khoản Quản lý `tobias.hoffmann`.
  2. Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
  3. Chọn chi nhánh *Demo Stuttgart Mitte*.
  4. Quan sát 4 thẻ KPI trên cùng: *Tổng số ca đối soát*, *Tổng giờ làm việc*, *Bất thường cần xử lý*, *Đơn xin sửa giờ*.
  5. Xem bảng đối soát ca làm việc:
     * Cột 1: Thông tin nhân viên & Vị trí.
     * Cột 2: Lịch ca dự kiến (Soll) kèm giờ nghỉ dự kiến.
     * Cột 3: Chấm công thực tế (Ist) kèm số phút nghỉ thực tế.
     * Cột 4: Chênh lệch (Delta phút) & Số phút đi muộn (nếu có).
     * Cột 5: Tuân thủ Luật Đức ArbZG (Chuẩn ArbZG hoặc cảnh báo chi tiết).
     * Cột 6: Trạng thái (Chờ duyệt, Đã duyệt, Đã khóa kỳ).
* **Kết quả mong đợi:**
  * Dữ liệu hiển thị trực quan 3 trục rõ ràng; chênh lệch thời gian được tính chính xác từng phút, không tự động cắt xén giờ làm thực tế của nhân viên.

#### TC-F05-02: Nhân viên gửi đơn xin điều chỉnh giờ công (Change Request)
* **Mục tiêu:** Nhân viên gửi yêu cầu sửa giờ kèm lý do và xem trước chênh lệch thời gian.
* **Các bước:**
  1. Tại màn hình Chấm công của nhân viên, tìm một ca làm việc và bấm nút **"Xin sửa giờ"**.
  2. Nhập giờ vào đề xuất, giờ ra đề xuất, số phút nghỉ.
  3. Nhập lý do điều chỉnh: *"Quên quẹt thẻ khi vào ca, có xác nhận từ trưởng ca bàn giao"*.
  4. Quan sát ô cảnh báo leo thang:
     * Nếu thời gian chênh lệch `<= 60 phút`: Không có cảnh báo leo thang.
     * Nếu thời gian chênh lệch `> 60 phút`: Xuất hiện khung viền cam cảnh báo quy tắc **US-026**: *"Yêu cầu này có chênh lệch thời gian > 60 phút sẽ tự động được chuyển lên cấp HR xác minh bổ sung."*
  5. Bấm nút **"Gửi yêu cầu điều chỉnh"**.
* **Kết quả mong đợi:**
  * Yêu cầu được gửi lên hệ thống và chuyển trạng thái phù hợp (`PENDING` hoặc `HR_ESCALATED`).

#### TC-F05-03: Kiểm thử Quy tắc Leo thang HR (US-026 Escalation Rule)
* **Kịch bản kiểm thử:**
  * Nhân viên gửi yêu cầu sửa giờ ca làm việc từ 08:00 đến 16:00 (chênh lệch so với giờ thực tế 484 phút > 60 phút).
* **Kết quả mong đợi:**
  * Đơn yêu cầu được hệ thống tự động gán trạng thái **`HR_ESCALATED`** (`requires_hr_escalation = true`).
  * Trên tab *Đơn xin sửa giờ* của Quản lý nhà hàng, đơn này hiển thị nhãn màu cam nổi bật: **`CẦN HR XÁC MINH (>60m)`**.
  * Quản lý nhà hàng (Restaurant Manager) khi bấm duyệt đơn này sẽ bị hệ thống chặn với thông báo: *"Yêu cầu này có chênh lệch thời gian > 60 phút, bắt buộc phải do HR hoặc Quản trị viên phê duyệt!"*.

#### TC-F05-04: Kiểm thử Quy tắc Phân tách nhiệm vụ (Segregation of Duties - SoD)
* **Mục tiêu:** Đảm bảo Quản lý nhà hàng **không thể tự phê duyệt** bảng chấm công hoặc đơn xin điều chỉnh giờ của chính mình.
* **Các bước:**
  1. Đăng nhập bằng tài khoản Quản lý `tobias.hoffmann` (Employee ID = 5).
  2. Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
  3. Tìm ca làm việc hoặc đơn xin sửa giờ thuộc về chính nhân viên **Tobias Hoffmann**.
  4. Quan sát nút **"Duyệt"**:
     * Nút "Duyệt" bị vô hiệu hóa (disabled), hiển thị màu xám mờ.
     * Rê chuột lên nút hiển thị tooltip: *"Vi phạm SoD: Không thể tự duyệt ca của chính mình"*.
  5. Thử gửi lệnh duyệt trực tiếp qua API: `POST /api/reconciliation/timesheets/{id}/approve`.
* **Kết quả mong đợi:**
  * Hệ thống chặn hoàn toàn với mã lỗi **`HTTP 403 Forbidden`** và thông báo lỗi: *"Vi phạm quy tắc SoD (Segregation of Duties): Bạn không được phép tự phê duyệt bảng chấm công của chính mình!"*.

#### TC-F05-05: Cấp HR / Quản trị viên duyệt đơn & Lưu vết kiểm toán (Audit Trail)
* **Các bước:**
  1. Đăng nhập bằng tài khoản `admin@restaurant.example` (hoặc tài khoản HR).
  2. Vào menu **"Đối soát & Phê duyệt"**, chuyển sang tab **"Đơn xin sửa giờ"**.
  3. Bấm **"Xử lý"** trên đơn của Tobias Hoffmann.
  4. Nhập ghi chú xử lý: *"HR đã đối soát qua camera giám sát và xác nhận giờ vào thực tế."*.
  5. Bấm nút màu xanh: **"Phê duyệt"**.
* **Kết quả mong đợi:**
  * Yêu cầu được duyệt thành công, trạng thái chuyển thành `APPROVED`.
  * Bảng chấm công được cập nhật theo giờ mới đã duyệt.
  * Hệ thống tự động ghi một bản ghi lịch sử vào bảng **`attendance_adjustments`** lưu vết: `timesheet_id`, `old_start_utc`, `new_start_utc`, `old_break_minutes`, `new_break_minutes`, `adjusted_by_user_id`, thời điểm và lý do.
  * Ca làm việc được tự động bật cờ **`recalculation_required = true`** để sẵn sàng đồng bộ tính lương/phụ cấp.

#### TC-F05-06: Chốt và Khóa kỳ chấm công (Period Locking - US-028)
* **Mục tiêu:** Đảm bảo dữ liệu trong kỳ đã khóa chỉ có thể xem, không thể sửa đổi hoặc gửi yêu cầu điều chỉnh trực tiếp.
* **Các bước:**
  1. Đăng nhập tài khoản Quản trị / HR.
  2. Vào menu **"Đối soát & Phê duyệt"**, chuyển sang tab **"Khóa kỳ chấm công"**.
  3. Chọn ngày kết thúc kỳ chốt (ví dụ: `2026-11-30`).
  4. Bấm **"Xác nhận khóa kỳ công"**.
* **Kết quả mong đợi:**
  * Toàn bộ các ca làm việc của chi nhánh trước và trong ngày được chọn chuyển sang trạng thái `LOCKED` (`is_locked = true`).
  * Trên giao diện Timesheet của nhân viên, các ca này hiển thị huy hiệu xám **`Đã khóa kỳ`**; nút *"Xin sửa giờ"* bị vô hiệu hóa.
  * Mọi hành động gửi điều chỉnh hoặc sửa giờ trực tiếp vào các ca đã khóa đều bị hệ thống chặn với thông báo: *"Kỳ công này đã được chốt và khóa, không thể sửa đổi trực tiếp!"*.

---

## 5. BẢNG TỔNG HỢP RÀNG BUỘC PHÁP LÝ & PHÂN TÁCH NHIỆM VỤ (COMPLIANCE CHECKLIST)

| STT | Quy định / Luật định | Mã điều luật | Giới hạn & Hành vi của hệ thống | Trạng thái xác minh |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Mức lương tối thiểu Đức | **MiLoG** | Bắt buộc mức lương giờ ≥ **12,41 €/h**; chặn lưu nếu thấp hơn | **PASS** |
| 2 | Giới hạn Minijob | **Minijob-Gesetz** | Trần thu nhập tối đa **538,00 €/tháng**; cảnh báo phân loại lại nếu vượt | **PASS** |
| 3 | Thời gian làm việc tối đa | **ArbZG §3** | Tối đa **10 giờ/ngày**; cảnh báo đỏ khi xếp ca hoặc chấm công vượt mức | **PASS** |
| 4 | Nghỉ giải lao bắt buộc | **ArbZG §4** | Ca >6h: tối thiểu **30 phút**; Ca >9h: tối thiểu **45 phút**; tự động phát hiện vi phạm | **PASS** |
| 5 | Khoảng cách nghỉ giữa ca | **ArbZG §5** | Bắt buộc tối thiểu **11 giờ liên tục** nghỉ giữa 2 ca làm việc; cảnh báo vi phạm | **PASS** |
| 6 | Làm việc ngày Chủ nhật | **ArbZG §11** | Cảnh báo làm việc Chủ nhật và nghĩa vụ bố trí ngày nghỉ bù trong vòng 2 tuần | **PASS** |
| 7 | Bảo vệ thai sản | **MuSchG** | Cấm xếp ca đêm từ **20:00 - 06:00**, cấm làm thêm giờ đối với phụ nữ mang thai | **PASS** |
| 8 | Phân tách nhiệm vụ | **SoD Rule** | Quản lý **không được tự phê duyệt** bảng công hoặc đơn xin sửa giờ của bản thân | **PASS** |
| 9 | Leo thang phê duyệt | **US-026 Rule** | Chênh lệch điều chỉnh **> 60 phút** tự động chuyển cấp HR phê duyệt bổ sung | **PASS** |
| 10 | Bất biến & Khóa kỳ | **US-028 Rule** | Giữ bản ghi sự kiện gốc; sau khi khóa kỳ, không được sửa đổi trực tiếp | **PASS** |

---

## 6. MẪU BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG (SIGN-OFF TEMPLATE)

```text
========================================================================================
                      BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG ATELIER (DT06)
             Dự án: Hệ thống Quản lý Nhân sự, Lịch ca & Chấm công Nhà hàng tại Đức
========================================================================================

Thời gian nghiệm thu: Ngày ..... tháng ..... năm 2026
Địa điểm nghiệm thu: ...................................................................
Thành phần tham dự:
  1. Đại diện Đội ngũ Phát triển: Nguyễn Bá Linh & Nguyễn Hữu Phương
  2. Đại diện Đội ngũ Kiểm thử (QA/QC): .................................................
  3. Đại diện Quản lý Dự án (Project Manager): ..........................................

KẾT QUẢ NGHIỆM THU THEO PHÂN HỆ:
----------------------------------------------------------------------------------------
Phân hệ                            Mã kiểm thử       Kết quả       Ghi chú
----------------------------------------------------------------------------------------
F00: Bảo mật & Phân quyền RBAC      TC-F00-01..04     [ ] ĐẠT       [ ] CHƯA ĐẠT
F00: Song ngữ Việt - Đức & DarkMode TC-F00-03         [ ] ĐẠT       [ ] CHƯA ĐẠT
F01: Cơ cấu Chi nhánh & Pháp nhân   TC-F01-01         [ ] ĐẠT       [ ] CHƯA ĐẠT
F02: Hồ sơ & Kiểm soát Lương MiLoG  TC-F02-01..02     [ ] ĐẠT       [ ] CHƯA ĐẠT
F02: Bảo vệ MuSchG & Import CSV     TC-F02-03..04     [ ] ĐẠT       [ ] CHƯA ĐẠT
F03: Xếp lịch ca & Luật ArbZG       TC-F03-01         [ ] ĐẠT       [ ] CHƯA ĐẠT
F03: Modal xóa ca & Sàn đổi ca      TC-F03-02..03     [ ] ĐẠT       [ ] CHƯA ĐẠT
F04: Check-in / Check-out & Giờ nghỉ TC-F04-01..04     [ ] ĐẠT       [ ] CHƯA ĐẠT
F04: Bổ sung giờ công thủ công      TC-F04-05         [ ] ĐẠT       [ ] CHƯA ĐẠT
F05: Bảng đối soát 3 trục theo ca   TC-F05-01         [ ] ĐẠT       [ ] CHƯA ĐẠT
F05: Đơn xin sửa giờ & Leo thang HR TC-F05-02..03     [ ] ĐẠT       [ ] CHƯA ĐẠT
F05: Chặn tự duyệt SoD              TC-F05-04         [ ] ĐẠT       [ ] CHƯA ĐẠT
F05: Duyệt có Audit Trail & Khóa kỳ TC-F05-05..06     [ ] ĐẠT       [ ] CHƯA ĐẠT
----------------------------------------------------------------------------------------

KẾT LUẬN CHUNG:
[ ] HỆ THỐNG ĐẠT CHUẨN ĐẶC TẢ DT06, SẴN SÀNG ĐƯA VÀO VẬN HÀNH THỬ NGHIỆM (UAT).
[ ] CẦN CHỈNH SỬA BỔ SUNG CÁC HẠNG MỤC: ................................................

  ĐẠI DIỆN ĐỘI PHÁT TRIỂN             ĐẠI DIỆN KIỂM THỬ              QUẢN LÝ DỰ ÁN
    (Ký & ghi rõ họ tên)             (Ký & ghi rõ họ tên)        (Ký & ghi rõ họ tên)
```
