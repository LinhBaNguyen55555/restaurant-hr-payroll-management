# TÀI LIỆU HƯỚNG DẪN CHI TIẾT KIỂM THỬ HỆ THỐNG ATELIER (DT06)
## Phân hệ Quản lý Nhân sự, Hợp đồng & Xếp ca Nhà hàng (Chuẩn Luật Lao động Đức)

---

## 1. MỤC ĐÍCH & PHẠM VI KIỂM THỬ

Tài liệu này hướng dẫn chi tiết quy trình kiểm thử chức năng (Functional Testing), kiểm thử giao diện & trải nghiệm người dùng (UI/UX Testing), và kiểm thử tính tuân thủ pháp lý (Legal Compliance Testing) cho hệ thống **Atelier - Quản lý Nhân sự & Xếp ca Nhà hàng tại Đức** (Phương án C - Chuẩn hóa DT06).

### Phạm vi kiểm thử bao gồm 4 phân hệ cốt lõi:
* **F00 (Bảo mật & Phân quyền):** Đăng nhập, Xác thực 2 bước (MFA/TOTP), Phân quyền RBAC, Phân tách nhiệm vụ (SoD), Giao diện song ngữ Việt - Đức, Chế độ Tối (Dark Mode).
* **F01 (Chi nhánh & Pháp nhân):** Quản lý chuỗi nhà hàng, cơ cấu pháp nhân, địa điểm làm việc thực tế và dòng thời gian phân công không bị ghi đè.
* **F02 (Hồ sơ nhân viên & Hợp đồng):** Quản lý hồ sơ, dòng thời gian hợp đồng và mức lương (MiLoG ≥ 12,41 €/h, Minijob ≤ 538 €), nhóm bảo vệ đặc biệt (MuSchG thai sản, JArbSchG thanh thiếu niên), nhập liệu hàng loạt bằng CSV với chế độ Dry-Run.
* **F03 (Xếp ca & Luật lao động ArbZG):** Xếp lịch tuần, mẫu ca làm việc, kiểm tra cảnh báo luật lao động Đức (ArbZG §3, §4, §5, §11), hộp thoại xác nhận xóa ca nội bộ, công bố lịch ca có phiên bản & audit trail, sàn đổi ca trực (Shift Swap Center).

---

## 2. MÔI TRƯỜNG KIỂM THỬ & TÀI KHOẢN MẪU

### 2.1. Địa chỉ truy cập
* **Giao diện Web (Frontend):** `http://127.0.0.1:5173`
* **Dịch vụ API (Backend):** `http://127.0.0.1:8080/api`
* **Tài liệu Swagger / OpenAPI:** `http://127.0.0.1:8080/swagger-ui.html`

### 2.2. Danh sách tài khoản thử nghiệm theo vai trò

| Tài khoản (Username) | Mật khẩu | Vai trò (Role) | Phạm vi quyền hạn | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `tobias.hoffmann` | `Password123!` | Quản lý nhà hàng / Quản trị viên | Toàn quyền chi nhánh, xếp ca, tạo hồ sơ, xem báo cáo | Có nút bấm nhanh `QL Tobias` trên trang đăng nhập |
| `anna.mueller` | `Password123!` | Nhân viên phục vụ (Servicekraft) | Xem ca cá nhân, yêu cầu đổi ca, xem hồ sơ cá nhân | Có nút bấm nhanh `NV Anna` |
| `markus.weber` | `Password123!` | Đầu bếp (Koch/Köchin) | Xem ca cá nhân, yêu cầu đổi ca | Nhân viên toàn thời gian |
| `admin` | `Password123!` | Quản trị viên hệ thống (System Admin) | Quản lý tài khoản, xem ma trận phân quyền & SoD | Có nút bấm nhanh `Quản trị` |

---

## 3. HƯỚNG DẪN CHẠY KIỂM THỬ TỰ ĐỘNG (AUTOMATED TESTS)

Hệ thống cung cấp bộ kiểm thử tự động toàn diện từ tầng backend (Java/Spring Boot) đến frontend (React/TypeScript/Vitest).

### 3.1. Chạy kiểm thử Backend
Mở cửa sổ dòng lệnh tại thư mục gốc của dự án:
```powershell
cd backend
.\mvnw.cmd test
```
* **Kết quả mong đợi:** Tất cả các test suites kiểm tra dịch vụ nhân sự, phân tách nhiệm vụ (SoD), kiểm soát luật lao động ArbZG (11h rest, Sunday rest, 10h max work) phải đạt trạng thái **`BUILD SUCCESS`** với 0 lỗi.

### 3.2. Chạy kiểm thử Frontend
Mở một cửa sổ dòng lệnh khác:
```powershell
cd frontend
npm.cmd test
```
* **Kết quả mong đợi:** Toàn bộ test components, navigation, format ngày tháng Đức, kiểm tra render phải vượt qua (`passed`).

---

## 4. MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT (TEST CASES)

### PHÂN HỆ F00: BẢO MẬT, PHÂN QUYỀN & TRẢI NGHIỆM

#### TC-F00-01: Kiểm tra Đăng nhập sai và Thông báo lỗi tiếng Việt
* **Mục tiêu:** Đảm bảo hệ thống phát hiện mật khẩu sai, không để lộ thông tin nhạy cảm và thông báo lỗi đúng ngôn ngữ đang chọn.
* **Các bước thực hiện:**
  1. Truy cập `http://127.0.0.1:5173/`.
  2. Đảm bảo ngôn ngữ ở góc trên là `VI` (Tiếng Việt).
  3. Nhập tên đăng nhập: `anna.mueller`, mật khẩu sai: `SaiMatKhau123!`.
  4. Bấm nút **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Thông báo lỗi hiển thị rõ ràng bằng tiếng Việt: *"Tên đăng nhập hoặc mật khẩu không chính xác."* (Không hiển thị tiếng Đức).
  * Ô nhập mật khẩu vẫn giữ nguyên để người dùng nhập lại.

#### TC-F00-02: Kiểm tra Đăng nhập thành công với nút tắt nhanh
* **Các bước thực hiện:**
  1. Bấm nút **"QL Tobias"** trên màn hình đăng nhập (hệ thống tự điền tài khoản).
  2. Bấm nút **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Đăng nhập thành công, chuyển hướng vào màn hình **Tổng quan** (`#overview`).
  * Tên người dùng hiển thị ở góc trái dưới: *"Tobias Hoffmann - Quản lý nhà hàng"*.

#### TC-F00-03: Kiểm tra Chuyển đổi Ngôn ngữ (Việt - Đức) & Chế độ Tối (Dark Mode)
* **Các bước thực hiện:**
  1. Bấm vào nút chuyển ngôn ngữ ở thanh trên cùng (chuyển giữa `VI` và `DE`).
  2. Bấm vào icon Mặt trời / Mặt trăng để chuyển giữa Chế độ sáng và Chế độ tối.
* **Kết quả mong đợi:**
  * Toàn bộ menu bên trái, tiêu đề, nút bấm, thông báo trạng thái lập tức chuyển đổi mượt mà.
  * Ở chế độ Dark Mode: Nền xanh đen dịu mắt, chữ trắng/xám tương phản tốt, không bị tình trạng mất màu nút hay chói lóa.

#### TC-F00-04: Kiểm tra Xác thực 2 bước (2FA / Authenticator)
* **Các bước thực hiện:**
  1. Vào menu **"Bảo mật tài khoản"** (`#security`).
  2. Tại mục *Xác thực hai yếu tố (2FA)*, bấm **"Cài đặt Authenticator"**.
* **Kết quả mong đợi:**
  * Xuất hiện hộp thoại hướng dẫn cài đặt với mã QR và Secret Key bí mật.
  * Nhập mã 6 chữ số từ ứng dụng Google Authenticator để kích hoạt thành công.

---

### PHÂN HỆ F01: CƠ CẤU CHI NHÁNH, PHÁP NHÂN & ĐỊA ĐIỂM

#### TC-F01-01: Quản lý Chi nhánh Nhà hàng & Địa điểm thực tế
* **Các bước thực hiện:**
  1. Vào menu **"Chi nhánh"** (`#branches`).
  2. Xem danh sách chi nhánh (ví dụ: *Demo Stuttgart Mitte*, *Demo Karlsruhe City*, *Demo Freiburg Altstadt*).
  3. Bấm vào một chi nhánh để xem ngăn kéo chi tiết (Drawer).
* **Kết quả mong đợi:**
  * Hiển thị đầy đủ thông tin: Mã chi nhánh (Code), Thành phố, Bang của Đức, Pháp nhân chủ quản và danh sách nhân sự được phân công.
  * Cho phép chỉnh sửa thông tin chi nhánh mà không làm gián đoạn hệ thống.

---

### PHÂN HỆ F02: HỒ SƠ NHÂN SỰ, HỢP ĐỒNG & TUÂN THỦ LUẬT ĐỨC

#### TC-F02-01: Thêm mới nhân viên và Kiểm soát mức lương tối thiểu (MiLoG)
* **Mục tiêu:** Đảm bảo form thêm nhân sự mới chuẩn giao diện, có phân nhóm logic và bắt buộc tuân thủ luật lương tối thiểu Đức (MiLoG ≥ 12,41 €/h).
* **Các bước thực hiện:**
  1. Vào menu **"Hồ sơ & Hợp đồng"** (`#workforce`).
  2. Bấm nút màu xanh ngọc **"+ Thêm nhân viên"**.
  3. Quan sát giao diện modal: Modal mở rộng (`wide`), bố cục 3 phần rõ ràng:
     * *1. Thông tin cá nhân & Liên lạc*
     * *2. Chi nhánh & Vị trí đảm nhiệm*
     * *3. Hợp đồng lao động & Tiền lương*
  4. Nhập thử mức lương giờ: `10.00` €/h (dưới mức quy định của luật).
  5. Bấm nút **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống phát hiện vi phạm và báo lỗi: *"Mức lương giờ phải tối thiểu bằng mức lương quy định theo luật Đức (12.41 €/h)"*.
  * Nhập lại mức lương `14.50` €/h, bấm tạo -> Hồ sơ nhân viên được tạo thành công và xuất hiện ngay trên danh sách.

#### TC-F02-02: Kiểm tra Ràng buộc Hợp đồng Minijob (≤ 538 €/tháng)
* **Các bước thực hiện:**
  1. Trong modal thêm nhân viên, chọn *Loại hợp đồng*: **"Minijob (≤ 538 €)"**.
  2. Đặt hình thức lương theo tháng: `600.00` €.
  3. Bấm nút **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống chặn và hiển thị cảnh báo: *"Thu nhập Minijob không được vượt quá giới hạn luật định (538.00 €/tháng)"*.

#### TC-F02-03: Xem Dòng thời gian Hợp đồng & Nhóm lao động được bảo vệ
* **Các bước thực hiện:**
  1. Tại danh sách nhân viên, bấm vào dòng nhân viên **Sophie Fischer** (hoặc nhân viên có trạng thái bảo vệ thai sản MuSchG).
* **Kết quả mong đợi:**
  * Modal chi tiết hồ sơ mở rộng (`wide`) hiển thị 4 tab: *Hồ sơ*, *Hợp đồng*, *Mức lương*, *Điều kiện bảo vệ*.
  * Tại tab *Điều kiện bảo vệ*: Hiển thị rõ ràng quy định bảo vệ thai sản theo luật Đức (MuSchG): Cấm xếp ca đêm từ 20:00 - 06:00, không được phép làm thêm giờ.
  * Có nút **"Đóng"** bo góc rõ ràng ở chân modal.

#### TC-F02-04: Kiểm thử Nhập dữ liệu hàng loạt bằng CSV (Dry-Run & Import)
* **Các bước thực hiện:**
  1. Bấm nút **"Nhập file CSV"**.
  2. Dán nội dung dữ liệu có sẵn (hoặc mẫu CSV có một dòng vi phạm mã nhân viên trùng lặp hoặc lương < 12.41).
  3. Bấm nút **"Kiểm tra trước (Dry-Run)"**.
* **Kết quả mong đợi:**
  * Hệ thống không ghi đè vào database mà trả về bảng xem trước: Tổng số dòng, số dòng hợp lệ, số dòng lỗi và lý do lỗi chi tiết từng dòng bằng tiếng Việt.
  * Khi dữ liệu hợp lệ, bấm **"Xác nhận nhập dữ liệu"** để cập nhật vào hệ thống.

---

### PHÂN HỆ F03: XẾP LỊCH CA & KIỂM SOÁT LUẬT LAO ĐỘNG ĐỨC (ArbZG)

#### TC-F03-01: Tạo ca làm việc mới theo tuần
* **Các bước thực hiện:**
  1. Vào menu **"Lịch ca làm việc"** (`#scheduling`).
  2. Chọn chi nhánh *Demo Stuttgart Mitte*.
  3. Bấm nút **"+ Thêm ca trực"**.
  4. Chọn nhân viên (ví dụ: *Markus Weber*), chọn ngày làm việc trong tuần, giờ bắt đầu `09:00`, kết thúc `17:00`, thời gian nghỉ `30m`.
  5. Bấm nút **"Lưu ca trực"**.
* **Kết quả mong đợi:**
  * Ca làm việc xuất hiện trên lịch tuần tại đúng ô ngày thứ trong tuần với màu xanh trạng thái *Bản nháp* hoặc *Đã duyệt*.

#### TC-F03-02: Kiểm tra Tự động Luật Lao động Đức (ArbZG Rules)
* **Kịch bản A: Nghỉ giữa 2 ca tối thiểu 11 tiếng (ArbZG §5)**
  * Xếp ca 1 kết thúc lúc `23:00` tối thứ 4.
  * Xếp tiếp ca 2 cho cùng nhân viên đó bắt đầu lúc `07:00` sáng thứ 5 (thời gian nghỉ chỉ 8 tiếng < 11 tiếng).
  * **Kết quả mong đợi:** Hệ thống hiển thị cảnh báo màu cam/đỏ: *"Vi phạm ArbZG §5: Khoảng cách nghỉ giữa hai ca làm việc phải tối thiểu 11 giờ liên tục (hiện tại: 8.0h)"*.
* **Kịch bản B: Thời gian làm việc tối đa trong ngày (ArbZG §3)**
  * Xếp ca kéo dài trên 10 tiếng (ví dụ từ `08:00` đến `20:00` = 12 tiếng).
  * **Kết quả mong đợi:** Cảnh báo vi phạm ArbZG §3: Thời gian làm việc mỗi ngày không được vượt quá 10 giờ.
* **Kịch bản C: Nghỉ giải lao bắt buộc giữa ca (ArbZG §4)**
  * Xếp ca làm việc 7 tiếng nhưng đặt thời gian nghỉ `0` phút.
  * **Kết quả mong đợi:** Cảnh báo vi phạm ArbZG §4: Ca làm việc trên 6 giờ phải có tối thiểu 30 phút nghỉ giải lao.
* **Kịch bản D: Cảnh báo làm việc ngày Chủ nhật (ArbZG §11)**
  * Xếp ca vào ngày Chủ nhật.
  * **Kết quả mong đợi:** Cột Chủ nhật hiển thị nhãn cảnh báo vàng cam `ArbZG §11` nhắc nhở quản lý nghĩa vụ bố trí ngày nghỉ bù cho nhân viên trong vòng 2 tuần.

#### TC-F03-03: Kiểm tra Xóa ca làm việc với Hộp thoại xác nhận nội bộ
* **Mục tiêu:** Kiểm tra nút xóa ca trực không còn kích hoạt popup mặc định của trình duyệt mà mở hộp thoại nội bộ an toàn.
* **Các bước thực hiện:**
  1. Rê chuột lên một thẻ ca làm việc bất kỳ trên bảng lịch tuần.
  2. Bấm vào icon dấu **`✕`** (Xóa ca) ở góc thẻ ca.
* **Kết quả mong đợi:**
  * Hộp thoại **`Xác nhận xóa ca làm việc`** xuất hiện ở trung tâm màn hình.
  * Hiển thị đầy đủ thông tin: Tên nhân viên, vị trí tiếng Việt, ngày ca làm việc và giờ nghỉ.
  * Hai nút bấm rõ ràng: **`Hủy bỏ`** (giữ nguyên ca làm việc) và nút **`Xác nhận xóa ca`** màu đỏ son (`bg-red-600`) có icon thùng rác.
  * Bấm *Xác nhận xóa ca* -> Ca trực lập tức biến mất khỏi lịch tuần mà không có lỗi.

#### TC-F03-04: Công bố Lịch ca & Ghi nhận Phiên bản (Publish Schedule & Audit)
* **Các bước thực hiện:**
  1. Bấm nút **"Công bố lịch làm việc"**.
  2. Điền lý do phát hành (ví dụ: *"Công bố lịch tuần chính thức cho tuần 47"*).
  3. Bấm **"Xác nhận công bố"**.
* **Kết quả mong đợi:**
  * Toàn bộ ca nháp chuyển sang trạng thái *Đã công bố*.
  * Hệ thống ghi nhận số phiên bản (Revision 1, 2...) và lưu nhật ký kiểm toán (Audit Trail) để nhân viên có thể tra cứu minh bạch.

#### TC-F03-05: Sàn Đổi ca Trực & Phê duyệt Điều kiện (Shift Swap Center)
* **Các bước thực hiện:**
  1. Bấm nút **"Đổi ca & Sàn ca trống"** trên thanh công cụ lịch ca.
  2. Chuyển sang tab **"Gửi yêu cầu đổi ca mới"**:
     * Chọn ca cần đổi của mình.
     * Chọn đồng nghiệp muốn đổi sang.
     * Nhập lý do: *"Có việc bận gia đình cá nhân"*.
     * Bấm nút màu xanh ngọc **"Gửi yêu cầu đổi ca"**.
  3. Chuyển về tab **"Yêu cầu chờ duyệt"**:
* **Kết quả mong đợi:**
  * Yêu cầu đổi ca xuất hiện trên danh sách với đầy đủ chi tiết: Ca nguồn, người nhận, lý do.
  * Quản lý có 2 nút thao tác rõ ràng: Nút xanh **"Duyệt"** (tự động đổi ca và kiểm tra ArbZG) và nút viền đỏ **"Từ chối"**.

---

## 5. CÁC ĐIỀU KIỆN NGOẠI LỆ & RÀNG BUỘC PHÁP LÝ CẦN CHÚ Ý

> [!IMPORTANT]
> **Quy định bất khả xâm phạm của Luật Lao động CHLB Đức:**
> 1. **Mức lương tối thiểu (MiLoG):** Từ 01/01/2024, mức lương tối thiểu là **12,41 €/giờ**. Bất kỳ hợp đồng hoặc ca trực nào có đơn giá thấp hơn con số này đều bị hệ thống chặn lưu.
> 2. **Giới hạn Minijob:** Mức thu nhập tối đa cho Minijob là **538,00 €/tháng**. Nếu số giờ nhân mức lương vượt quá giới hạn này, hợp đồng phải được phân loại lại sang Part-time hoặc Midijob.
> 3. **Khoảng cách nghỉ giữa ca (Ruhezeit - ArbZG §5):** Bắt buộc phải có **tối thiểu 11 giờ liên tục** nghỉ ngơi giữa giờ kết thúc của ca làm việc trước và giờ bắt đầu của ca tiếp theo.
> 4. **Bảo vệ thai sản (MuSchG):** Nghiêm cấm phân công phụ nữ mang thai hoặc đang nuôi con nhỏ làm việc từ **20:00 tối đến 06:00 sáng** và không được làm thêm giờ.

---

## 6. MẪU BIÊN BẢN NGHIỆM THU KIỂM THỬ (SIGN-OFF TEMPLATE)

| Hạng mục kiểm thử | Người kiểm thử (Tester) | Ngày kiểm thử | Kết quả (PASS / FAIL) | Ghi chú & Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **F00:** Đăng nhập & Xác thực 2FA | | | | |
| **F00:** Song ngữ Việt - Đức & Dark Mode | | | | |
| **F01:** Quản lý Chi nhánh & Pháp nhân | | | | |
| **F02:** Hồ sơ nhân sự & Kiểm soát MiLoG | | | | |
| **F02:** Ràng buộc Minijob (≤ 538 €) | | | | |
| **F02:** Nhóm bảo vệ MuSchG / JArbSchG | | | | |
| **F02:** Nhập liệu CSV & Báo cáo Dry-Run | | | | |
| **F03:** Xếp lịch ca & Kiểm tra ArbZG | | | | |
| **F03:** Modal xác nhận xóa ca nội bộ | | | | |
| **F03:** Công bố lịch ca & Phiên bản | | | | |
| **F03:** Sàn đổi ca trực (Shift Swap) | | | | |

* **Đại diện đội ngũ Kiểm thử:** _____________________ (Ký & ghi rõ họ tên)
* **Đại diện Quản lý Dự án (PM):** _____________________ (Ký & ghi rõ họ tên)
