# TÀI LIỆU HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN HỆ THỐNG ATELIER (DT06)
## Phân hệ Quản trị, Nhân sự, Lịch ca, Chấm công, Đối soát & Phê duyệt Giờ công
### Chuẩn Luật Lao động CHLB Đức (ArbZG, MiLoG, MuSchG, JArbSchG & Phân tách nhiệm vụ SoD)

---

## MỤC LỤC
1. [Hướng dẫn cài đặt & Khởi chạy hệ thống trên CMD (Command Prompt / PowerShell)](#1-hướng-dẫn-cài-đặt--khởi-chạy-hệ-thống-trên-cmd)
2. [Bản đồ tài khoản kiểm thử theo vị trí & Phân định chức năng (Role Matrix)](#2-bản-đồ-tài-khoản-kiểm-thử-theo-vị-trí--phân-định-chức-năng)
3. [Hướng dẫn chạy kiểm thử tự động (Automated Test Suite)](#3-hướng-dẫn-chạy-kiểm-thử-tự-động)
4. [Ma trận kịch bản kiểm thử chi tiết theo từng vai trò (F00 → F05)](#4-ma-trận-kịch-bản-kiểm-thử-chi-tiết)
   - [Phân hệ F00: Bảo mật, Phân quyền & Trải nghiệm người dùng](#phân-hệ-f00-bảo-mật-phân-quyền--trải-nghiệm-người-dùng)
   - [Phân hệ F01: Cơ cấu Chi nhánh & Pháp nhân chuỗi nhà hàng](#phân-hệ-f01-cơ-cấu-chi-nhánh--pháp-nhân-chuỗi-nhà-hàng)
   - [Phân hệ F02: Hồ sơ Nhân sự, Hợp đồng & Luật Lương Đức (MiLoG, Minijob, MuSchG)](#phân-hệ-f02-hồ-sơ-nhân-sự-hợp-đồng--luật-lương-đức)
   - [Phân hệ F03: Xếp lịch ca & Kiểm soát Luật Lao động Đức (ArbZG §3, §4, §5, §11)](#phân-hệ-f03-xếp-lịch-ca--kiểm-soát-luật-lao-động-đức)
   - [Phân hệ F04: Chấm công trực tiếp & Quản lý Nghỉ giữa ca](#phân-hệ-f04-chấm-công-trực-tiếp--quản-lý-nghỉ-giữa-ca)
   - [Phân hệ F05: Đối soát, Sửa giờ & Phê duyệt (Quy tắc SoD, Leo thang HR >60m, Khóa kỳ)](#phân-hệ-f05-đối-soát-sửa-giờ--phê-duyệt)
5. [Bảng tổng hợp ràng buộc pháp lý & Phân tách nhiệm vụ (Compliance Checklist)](#5-bảng-tổng-hợp-ràng-buộc-pháp-lý)
6. [Mẫu biên bản nghiệm thu kiểm thử (Sign-off Template)](#6-mẫu-biên-bản-nghiệm-thu-kiểm-thử)

---

## 1. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY HỆ THỐNG TRÊN CMD

Phần này hướng dẫn chi tiết cách mở và chạy toàn bộ hệ thống từ màn hình dòng lệnh **Command Prompt (cmd.exe)** hoặc **PowerShell** trên Windows.

### 1.1. Yêu cầu môi trường tối thiểu
* **Hệ điều hành:** Windows 10/11 (hoặc macOS/Linux tương đương).
* **Java Development Kit (JDK):** Java 21 trở lên (khuyến nghị Java 27 hoặc Java 21 LTS).
* **Node.js & npm:** Node.js v18 trở lên (khuyến nghị Node.js v20+).
* **Hệ quản trị CSDL MySQL:** MySQL Server 8.0 đang chạy trên cổng `3306`.

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
> - Mật khẩu: `Vomy1011@`

---

### 1.3. Bước 2: Khởi động Backend (Spring Boot) trên CMD
1. Mở một cửa sổ **Command Prompt (CMD)** mới.
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
   Backend đã sẵn sàng phục vụ API tại địa chỉ: `http://localhost:8080/api`.

---

### 1.4. Bước 3: Khởi động Frontend (React / Vite) trên CMD
1. Mở thêm một cửa sổ **Command Prompt (CMD)** thứ hai (giữ nguyên cửa sổ Backend đang chạy).
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
* Giao diện đăng nhập hệ thống **Atelier** sẽ xuất hiện với đầy đủ các nút bấm đăng nhập nhanh theo vai trò.

---

### 1.6. Xử lý sự cố CMD thường gặp
* **Lỗi cổng 8080 hoặc 5173 bị xung đột:**
  Nếu xuất hiện lỗi `Port 8080 was already in use`, mở CMD và giải phóng cổng:
  ```cmd
  netstat -ano | findstr :8080
  taskkill /F /PID <Mã_PID_tìm_thấy>
  ```
* **Lỗi không kết nối được MySQL:**
  Kiểm tra xem MySQL service có đang chạy không:
  ```cmd
  sc query MySQL80
  ```

---

## 2. BẢN ĐỒ TÀI KHOẢN KIỂM THỬ THEO VỊ TRÍ & PHÂN ĐỊNH CHỨC NĂNG

Để đảm bảo tính độc lập, an toàn thông tin và tuân thủ nguyên tắc **Phân tách nhiệm vụ (Segregation of Duties - SoD)** theo chuẩn quốc tế, mỗi vị trí trong nhà hàng được cấp tài khoản riêng với phạm vi chức năng rõ rệt:

```
+-----------------------------------------------------------------------------------+
|                         CƠ CẤU VAI TRÒ HỆ THỐNG ATELIER                           |
+-----------------------------------------------------------------------------------+
|  1. QUẢN TRỊ VIÊN HỆ THỐNG (admin@restaurant.example)                             |
|     - Toàn quyền hệ thống, RBAC & SoD Matrix                                      |
|     - Phê duyệt các đơn leo thang HR > 60m (US-026)                               |
|     - Khóa kỳ công chi nhánh (US-028) & Giải quyết xung đột SoD                   |
+-----------------------------------------------------------------------------------+
|  2. QUẢN LÝ NHÀ HÀNG (tobias.hoffmann@restaurant.example - Stuttgart Mitte)        |
|     - Quản lý chi nhánh, tạo hợp đồng nhân viên (MiLoG, Minijob)                  |
|     - Xếp lịch ca tuần, kiểm soát ArbZG, công bố lịch, duyệt đổi ca               |
|     - Theo dõi bảng đối soát ca 3 trục, bổ sung giờ công thủ công (F04.05)        |
|     - Duyệt bảng công của nhân viên cấp dưới (KHÔNG ĐƯỢC TỰ DUYỆT BẢN THÂN - SoD) |
+-----------------------------------------------------------------------------------+
|  3. NHÂN VIÊN PHỤC VỤ (anna.mueller@restaurant.example - Servicekraft)            |
|     - Check-in / Check-out trực tiếp trên Web/Kiosk                               |
|     - Ghi nhận bắt đầu & kết thúc nghỉ giữa ca (ArbZG §4)                         |
|     - Xem Timesheet cá nhân, gửi yêu cầu đổi ca trên sàn (Shift Swap)             |
|     - Gửi đơn xin sửa giờ công (Change Request)                                   |
+-----------------------------------------------------------------------------------+
|  4. ĐẦU BẾP TOÀN THỜI GIAN (markus.weber@restaurant.example - Koch)              |
|     - Chấm công ca bếp, kiểm tra cảnh báo vi phạm giờ nghỉ ArbZG §4               |
|     - Nhận và xác nhận yêu cầu đổi ca trực với nhân viên khác                     |
+-----------------------------------------------------------------------------------+
|  5. NHÂN VIÊN THAI SẢN (sophie.fischer@restaurant.example - Chế độ MuSchG)       |
|     - Kiểm tra chính sách bảo vệ thai sản theo Luật Đức (cấm ca đêm, cấm overtime)|
+-----------------------------------------------------------------------------------+
```

### Bảng thông tin tài khoản đăng nhập chi tiết:

| STT | Vị trí / Chức vụ | Tên nhân sự | Tên đăng nhập (Email) | Mật khẩu | Mã nhân viên | Nút bấm nhanh trên Login | Chức năng chủ trì kiểm thử |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **Quản trị viên hệ thống** | Admin Hệ thống | `admin@restaurant.example` | `Password123!` | - | `Quản trị` | F00 (RBAC, SoD), F05 (Duyệt leo thang HR, Khóa kỳ công, Duyệt SoD cho Quản lý) |
| **2** | **Quản lý nhà hàng** | Tobias Hoffmann | `tobias.hoffmann@restaurant.example` | `Password123!` | `E-0005` | `QL Tobias` | F01 (Chi nhánh), F02 (Tạo NV, Lương MiLoG), F03 (Xếp ca, ArbZG), F04 (Bổ sung thủ công), F05 (Bảng đối soát, Duyệt NV cấp dưới) |
| **3** | **Nhân viên phục vụ** | Anna Müller | `anna.mueller@restaurant.example` | `Password123!` | `E-0002` | `NV Anna` | F04 (Check-in/out, Nghỉ ca), F03 (Gửi đổi ca), F05 (Gửi đơn xin sửa giờ ≤60m và >60m) |
| **4** | **Đầu bếp** | Markus Weber | `markus.weber@restaurant.example` | `Password123!` | `E-0003` | Điền tay | F03 (Đổi ca với Anna), F04 (Test vi phạm nghỉ <30m theo ArbZG §4) |
| **5** | **Nhân viên (Thai sản)** | Sophie Fischer | `sophie.fischer@restaurant.example` | `Password123!` | `E-0004` | Điền tay | F02 & F03 (Kiểm tra chặn xếp ca đêm 20:00 - 06:00 và cấm làm thêm giờ) |

---

## 3. HƯỚNG DẪN CHẠY KIỂM THỬ TỰ ĐỘNG

Bộ kiểm thử tự động xác minh tính toàn vẹn của mã nguồn từ tầng dịch vụ logic (Backend) đến giao diện (Frontend):

### 3.1. Chạy Backend Unit & Integration Tests trên CMD:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\backend"
mvnw.cmd test
```
* **Kết quả yêu cầu:** `BUILD SUCCESS` - `Tests run: 24, Failures: 0, Errors: 0, Skipped: 0`.

### 3.2. Chạy Frontend Type-check & Production Build trên CMD:
```cmd
cd /d "c:\Users\FPTSHOP NAN K6 CG\OneDrive\Tài liệu\restaurant-hr-payroll-management\frontend"
npm.cmd run build
```
* **Kết quả yêu cầu:** `✓ built in 1.xx s` - Biên dịch 0 lỗi TypeScript.

---

## 4. MA TRẬN KỊCH BẢN KIỂM THỬ CHI TIẾT

---

### PHÂN HỆ F00: BẢO MẬT, PHÂN QUYỀN & TRẢI NGHIỆM NGƯỜI DÙNG

#### TC-F00-01: Kiểm tra Đăng nhập sai và Thông báo lỗi tiếng Việt
* **Tài khoản kiểm thử:** Bất kỳ (ví dụ: `anna.mueller@restaurant.example` - Nhân viên).
* **Mục tiêu:** Đảm bảo hệ thống phát hiện mật khẩu sai, bảo vệ an toàn và hiển thị thông báo lỗi tiếng Việt thân thiện, không lộ mã lỗi kỹ thuật.
* **Các bước:**
  1. Truy cập `http://127.0.0.1:5173/`.
  2. Bấm nút cờ `VI` ở thanh trên cùng để chọn tiếng Việt.
  3. Nhập Email: `anna.mueller@restaurant.example`, Mật khẩu sai: `MatKhauSai999!`.
  4. Bấm **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Thông báo lỗi hiển thị rõ ràng: *"Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu."*
  * Không xuất hiện chuỗi tiếng Đức hoặc mã lỗi 500.

#### TC-F00-02: Đăng nhập theo vai trò Quản lý nhà hàng
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý - Nút bấm `QL Tobias`).
* **Mục tiêu:** Kiểm tra vai trò Quản lý nhà hàng được cấp quyền điều hành chi nhánh, xếp ca và đối soát.
* **Các bước:**
  1. Tại trang đăng nhập, bấm nút nhanh **"QL Tobias"**.
  2. Bấm nút **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Đăng nhập thành công, chuyển hướng vào màn hình Tổng quan (`#overview`).
  * Huy hiệu dưới góc trái ghi: *"Tobias Hoffmann - Quản lý nhà hàng"*.
  * Thanh menu hiển thị đầy đủ các phân hệ: *Tổng quan, Chi nhánh, Hồ sơ & Hợp đồng, Lịch ca làm việc, Chấm công cá nhân, Đối soát & Phê duyệt, Bảo mật*.

#### TC-F00-03: Đăng nhập theo vai trò Nhân viên phục vụ
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên - Nút bấm `NV Anna`).
* **Mục tiêu:** Kiểm tra giao diện dành cho nhân viên chỉ hiển thị các chức năng cá nhân phù hợp.
* **Các bước:**
  1. Đăng xuất tài khoản hiện tại (bấm nút Thoát ở góc trái dưới).
  2. Bấm nút nhanh **"NV Anna"**, bấm **"Vào làm việc"**.
* **Kết quả mong đợi:**
  * Đăng nhập thành công, huy hiệu hiển thị: *"Anna Müller - Nhân viên"*.
  * Menu tập trung vào các chức năng nhân viên: *Chấm công cá nhân*, *Lịch ca làm việc* (chế độ xem ca của mình), *Bảo mật*.

#### TC-F00-04: Chuyển đổi song ngữ (Việt - Đức) & Chế độ tối (Dark Mode)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Bấm nút chuyển đổi ngôn ngữ giữa `VI` và `DE`.
  2. Bấm icon Mặt trăng / Mặt trời để bật Chế độ tối.
* **Kết quả mong đợi:**
  * Toàn bộ menu, tiêu đề, nút bấm, thông báo trạng thái ca chuyển dịch tức thì.
  * Ở Dark Mode: Nền xanh đen sâu dịu mắt, độ tương phản văn bản cao, tất cả các nút bấm và nhãn trạng thái đều rõ ràng.

#### TC-F00-05: Kiểm tra Ma trận Phân quyền & Phân tách nhiệm vụ (SoD Matrix)
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Quản trị viên - Nút bấm `Quản trị`).
* **Lý do dùng tài khoản này:** Chỉ Quản trị viên hệ thống mới có quyền truy cập sâu vào cấu hình bảo mật IAM và ma trận SoD.
* **Các bước:**
  1. Đăng nhập bằng nút **"Quản trị"**.
  2. Vào menu **"Bảo mật tài khoản"** (`#security`), chọn tab **"Ma trận Phân quyền & SoD"**.
* **Kết quả mong đợi:**
  * Hiển thị bảng ma trận phân quyền RBAC và các cặp quyền xung đột (Incompatible Roles).
  * Quy tắc cấm tự duyệt (Self-Approval Prohibited) được định nghĩa rõ ràng.

---

### PHÂN HỆ F01: CƠ CẤU CHI NHÁNH & PHÁP NHÂN CHUỖI NHÀ HÀNG

#### TC-F01-01: Quản lý Chi nhánh Nhà hàng & Địa điểm làm việc thực tế
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Quản lý nhà hàng có trách nhiệm giám sát địa điểm làm việc và nhân sự tại chi nhánh mình quản lý.
* **Các bước:**
  1. Vào menu **"Chi nhánh"** (`#branches`).
  2. Chọn chi nhánh **"Demo Stuttgart Mitte"**.
* **Kết quả mong đợi:**
  * Hiển thị ngăn kéo chi tiết (Drawer): Tên chi nhánh, Mã chi nhánh (`STR-01`), Thành phố Stuttgart, Bang Baden-Württemberg, Múi giờ bắt buộc `Europe/Berlin`.
  * Danh sách nhân sự đang phân công tại chi nhánh (Tobias, Anna, Markus, Sophie).

---

### PHÂN HỆ F02: HỒ SƠ NHÂN SỰ, HỢP ĐỒNG & LUẬT LƯƠNG ĐỨC

#### TC-F02-01: Thêm mới nhân sự & Ràng buộc Mức lương tối thiểu Đức (MiLoG ≥ 12,41 €/h)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Quản lý nhà hàng chịu trách nhiệm tuyển dụng và nhập thông tin hợp đồng cho nhân sự mới của chi nhánh.
* **Các bước:**
  1. Vào menu **"Hồ sơ & Hợp đồng"** (`#workforce`).
  2. Bấm nút màu xanh ngọc: **"+ Thêm nhân viên"**.
  3. Điền thông tin nhân viên mới:
     - Họ và tên: `Hans Schmidt`
     - Email: `hans.schmidt@restaurant.example`
     - Chi nhánh: `Demo Stuttgart Mitte`
     - Vị trí: `Nhân viên phục vụ (Servicekraft)`
     - Loại hợp đồng: `Toàn thời gian (Vollzeit)`
  4. Tại ô mức lương giờ, nhập mức vi phạm luật: `10.50` €/h (< 12,41 €/h).
  5. Bấm nút **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống chặn lưu và hiển thị cảnh báo đỏ: *"Mức lương giờ phải tối thiểu bằng mức lương quy định theo luật Đức (12.41 €/h)"*.
  * Sửa lại thành `14.00` €/h và bấm tạo -> Hồ sơ được lưu thành công vào cơ sở dữ liệu.

#### TC-F02-02: Ràng buộc trần thu nhập Minijob (≤ 538,00 €/tháng)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Các bước:**
  1. Trong form thêm nhân viên, chọn loại hợp đồng: **"Minijob (≤ 538 €)"**.
  2. Nhập mức lương tháng: `620.00` €/tháng (> 538 €).
  3. Bấm **"Tạo hồ sơ nhân viên"**.
* **Kết quả mong đợi:**
  * Hệ thống chặn và cảnh báo: *"Thu nhập Minijob không được vượt quá giới hạn luật định (538.00 €/tháng)"*.

#### TC-F02-03: Kiểm tra chế độ bảo vệ thai sản theo Luật Đức (MuSchG)
* **Tài khoản kiểm thử:** `tobias.hoffmann` xem hồ sơ của `sophie.fischer@restaurant.example`.
* **Mục tiêu:** Xác minh hồ sơ của nhân viên thai sản được gắn cờ bảo vệ quyền lợi hợp pháp.
* **Các bước:**
  1. Tại danh sách nhân viên, bấm vào dòng của **Sophie Fischer**.
  2. Chuyển sang tab **"Điều kiện bảo vệ"**.
* **Kết quả mong đợi:**
  * Hiển thị điều kiện bảo vệ thai sản **MuSchG**: Cấm phân công ca đêm từ 20:00 - 06:00, cấm làm thêm giờ quá 8.5 giờ/ngày.

#### TC-F02-04: Nhập liệu nhân sự hàng loạt qua CSV với cơ chế Dry-Run
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Các bước:**
  1. Bấm nút **"Nhập file CSV"**.
  2. Dán dữ liệu thử nghiệm có 1 dòng hợp lệ và 1 dòng vi phạm mã trùng.
  3. Bấm nút **"Kiểm tra trước (Dry-Run)"**.
* **Kết quả mong đợi:**
  * Hệ thống kiểm tra trước mà không chèn vào database, báo cáo chi tiết: Số dòng hợp lệ, số dòng lỗi và lý do lỗi bằng tiếng Việt.

---

### PHÂN HỆ F03: XẾP LỊCH CA & KIỂM SOÁT LUẬT LAO ĐỘNG ĐỨC

#### TC-F03-01: Quản lý tạo ca làm việc theo tuần
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Quản lý nhà hàng là người có thẩm quyền xếp lịch tuần cho nhân sự chi nhánh.
* **Các bước:**
  1. Vào menu **"Lịch ca làm việc"** (`#scheduling`).
  2. Chọn chi nhánh `Demo Stuttgart Mitte`.
  3. Bấm **"+ Thêm ca trực"**, chọn nhân viên `Markus Weber`, thứ Hai, giờ từ `09:00` đến `17:00`, nghỉ `30m`.
  4. Bấm **"Lưu ca trực"**.
* **Kết quả mong đợi:**
  * Ca làm việc xuất hiện trên ô thứ Hai của Markus Weber với trạng thái *Bản nháp*.

#### TC-F03-02: Kiểm tra tự động 4 quy tắc Luật Lao động Đức (ArbZG)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Kịch bản A (Nghỉ giữa 2 ca tối thiểu 11 giờ - ArbZG §5):**
  * Xếp ca thứ Ba kết thúc lúc `23:00`, xếp tiếp ca thứ Tư cho Markus Weber bắt đầu lúc `07:00` sáng (thời gian nghỉ 8h < 11h).
  * *Kết quả:* Xuất hiện cảnh báo màu đỏ vi phạm **ArbZG §5**: Khoảng cách nghỉ giữa 2 ca phải tối thiểu 11 giờ liên tục.
* **Kịch bản B (Thời gian làm việc tối đa 10h/ngày - ArbZG §3):**
  * Xếp ca kéo dài từ `08:00` đến `19:30` (11.5 giờ làm việc).
  * *Kết quả:* Xuất hiện cảnh báo vi phạm **ArbZG §3**: Thời gian làm việc mỗi ngày không được vượt quá 10 giờ.
* **Kịch bản C (Nghỉ giải lao bắt buộc giữa ca - ArbZG §4):**
  * Xếp ca làm việc 7 giờ nhưng đặt thời gian nghỉ là `0` phút.
  * *Kết quả:* Cảnh báo vi phạm **ArbZG §4**: Ca làm việc trên 6 giờ bắt buộc có tối thiểu 30 phút nghỉ.
* **Kịch bản D (Làm việc ngày Chủ nhật - ArbZG §11):**
  * Xếp ca làm việc vào ngày Chủ nhật.
  * *Kết quả:* Cột Chủ nhật hiển thị nhãn vàng cảnh báo **ArbZG §11**, nhắc nhở nghĩa vụ bố trí ngày nghỉ bù trong 2 tuần.

#### TC-F03-03: Hộp thoại xác nhận xóa ca nội bộ an toàn (Modal Dialog)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Rê chuột lên thẻ ca vừa tạo, bấm icon dấu **`✕`** (Xóa ca).
* **Kết quả mong đợi:**
  * Mở hộp thoại modal nội bộ xác nhận: Hiển thị tên nhân viên, ngày ca làm việc và giờ ca.
  * Bấm nút đỏ **"Xác nhận xóa ca"** -> Ca trực được xóa an toàn khỏi lịch tuần mà không dùng popup mặc định của trình duyệt.

#### TC-F03-04: Công bố lịch ca có phiên bản & Lưu audit trail
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Bấm nút **"Công bố lịch làm việc"**.
  2. Nhập lý do phát hành: *"Công bố lịch tuần chính thức"*.
  3. Bấm **"Xác nhận công bố"**.
* **Kết quả mong đợi:**
  * Toàn bộ ca chuyển sang trạng thái *Đã công bố*, ghi nhận Revision 1 và lưu audit log.

#### TC-F03-05: Nhân viên gửi yêu cầu đổi ca trực trên Sàn đổi ca (Shift Swap Center)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Lý do dùng tài khoản này:** Nhân viên có nhu cầu đổi ca khi có việc bận đột xuất.
* **Các bước:**
  1. Đăng nhập tài khoản `anna.mueller`.
  2. Vào menu **"Lịch ca làm việc"**, bấm nút **"Đổi ca & Sàn ca trống"**.
  3. Chọn ca muốn đổi của mình, chọn đồng nghiệp nhận đổi: `Markus Weber`.
  4. Nhập lý do: *"Có việc bận gia đình cần đổi ca"*.
  5. Bấm nút màu xanh: **"Gửi yêu cầu đổi ca"**.
* **Kết quả mong đợi:**
  * Yêu cầu được gửi lên hệ thống và hiển thị ở trạng thái `PENDING`.

#### TC-F03-06: Quản lý phê duyệt yêu cầu đổi ca trực
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Quản lý có trách nhiệm thẩm định việc đổi ca để đảm bảo không vi phạm luật ArbZG và đủ nhân sự vận hành.
* **Các bước:**
  1. Đăng nhập lại tài khoản `tobias.hoffmann`.
  2. Vào Sàn đổi ca, tab **"Yêu cầu chờ duyệt"**.
  3. Bấm nút **"Duyệt"** trên yêu cầu của Anna Müller.
* **Kết quả mong đợi:**
  * Hệ thống tự động hoán đổi người nhận ca trên lịch tuần; trạng thái chuyển thành `APPROVED`.

---

### PHÂN HỆ F04: CHẤM CÔNG TRỰC TIẾP & QUẢN LÝ NGHỈ GIỮA CA

#### TC-F04-01: Bắt đầu ca làm việc (Check-in trực tiếp & Live Clock)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Lý do dùng tài khoản này:** Chấm công trực tiếp là nghĩa vụ hàng ngày của nhân viên tại nơi làm việc.
* **Các bước:**
  1. Đăng nhập tài khoản `anna.mueller`.
  2. Vào menu **"Chấm công cá nhân"** (`#attendance`).
  3. Quan sát Thẻ đồng hồ thời gian thực (Live Time Clock): Trạng thái hiển thị *"Đang ngoài ca"*.
  4. Bấm nút lớn màu xanh ngọc: **"Vào ca làm việc"**.
* **Kết quả mong đợi:**
  * Hệ thống ghi nhận giờ vào ca chính xác theo UTC.
  * Trạng thái đồng hồ chuyển sang: *"Đang trong ca làm việc"* (chấm xanh nhấp nháy).
  * Phía dưới xuất hiện 1 dòng bảng chấm công mới có trạng thái `OPEN`.
  * Cơ sở dữ liệu: Ghi 1 bản ghi bất biến vào bảng `attendance_events` (`event_type = 'CHECK_IN'`).

#### TC-F04-02: Ghi nhận giờ nghỉ giữa ca thực tế (Start / End Break)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Các bước:**
  1. Khi đang trong ca làm việc, bấm nút **"Bắt đầu nghỉ giải lao"**.
  2. Quan sát đồng hồ: Chuyển sang trạng thái *"Đang nghỉ giải lao"* (màu vàng hổ phách).
  3. Sau một khoảng thời gian, bấm nút **"Kết thúc nghỉ giải lao"**.
* **Kết quả mong đợi:**
  * Hệ thống tính số phút nghỉ thực tế và ghi nhận vào bảng `break_records`.
  * Trạng thái đồng hồ chuyển lại thành *"Đang trong ca làm việc"*.

#### TC-F04-03: Kiểm tra cảnh báo vi phạm thời gian nghỉ theo ArbZG §4
* **Tài khoản kiểm thử:** `markus.weber@restaurant.example` (Đầu bếp).
* **Kịch bản kiểm thử:**
  * Ca làm việc kéo dài trên 6 tiếng nhưng tổng thời gian nghỉ giữa ca chỉ có 10 phút (< 30 phút theo luật).
* **Kết quả mong đợi:**
  * Tại cột thời gian nghỉ trên Timesheet hiển thị icon tam giác vàng cảnh báo.
  * Rê chuột hiển thị: *"Chưa đủ thời gian nghỉ theo ArbZG §4 (Ca >6h cần tối thiểu 30m nghỉ)"*.
  * Tự động sinh bản ghi vào bảng `attendance_exceptions` (`INSUFFICIENT_BREAK`).

#### TC-F04-04: Kết thúc ca làm việc (Check-out)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Các bước:**
  1. Bấm nút màu đỏ: **"Kết thúc ca làm"**.
* **Kết quả mong đợi:**
  * Đồng hồ trở về trạng thái *"Đang ngoài ca"*.
  * Ca làm việc chuyển trạng thái thành `PENDING_APPROVAL` (Chờ đối soát).
  * Ghi nhận sự kiện `CHECK_OUT` vào bảng `attendance_events`.
  * Tự động tính toán tổng số phút làm việc thực tế (`workedMinutes`).

#### TC-F04-05: Tra cứu lịch sử Timesheet cá nhân
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Các bước:**
  1. Xem bảng danh sách chấm công cá nhân tại `#attendance`.
* **Kết quả mong đợi:**
  * Hiển thị đầy đủ ngày làm việc, giờ vào, giờ ra, số phút nghỉ, tổng thời gian làm việc và trạng thái duyệt.
  * Có nút **"Xin sửa giờ"** trên từng dòng ca.

#### TC-F04-06: Quản lý bổ sung giờ công thủ công có kiểm soát (F04.05)
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Chỉ người có thẩm quyền Quản lý/HR mới được bổ sung giờ công thủ công khi có sự cố kỹ thuật hoặc mất mạng.
* **Các bước:**
  1. Đăng nhập tài khoản `tobias.hoffmann`.
  2. Vào menu **"Chấm công cá nhân"**, bấm nút **"+ Bổ sung giờ công thủ công"**.
  3. Chọn chi nhánh `Demo Stuttgart Mitte`, chọn nhân viên `Markus Weber`.
  4. Nhập ngày làm, giờ vào `09:00`, giờ ra `17:00`, giờ nghỉ `30m`.
  5. Bắt buộc nhập lý do: *"Mất kết nối mạng tại chi nhánh, có xác nhận từ bếp trưởng"*.
  6. Bấm **"Lưu bản ghi giờ công"**.
* **Kết quả mong đợi:**
  * Tạo thành công ca làm việc với trạng thái `PENDING_APPROVAL`.
  * Lưu vết kiểm toán người bổ sung, thời điểm và lý do.

---

### PHÂN HỆ F05: ĐỐI SOÁT, SỬA GIỜ & PHÊ DUYỆT

#### TC-F05-01: Quản lý theo dõi Bảng đối soát 3 trục theo ca
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Lý do dùng tài khoản này:** Quản lý nhà hàng chịu trách nhiệm đối soát ca làm việc hàng ngày của chi nhánh mình.
* **Các bước:**
  1. Đăng nhập tài khoản `tobias.hoffmann`.
  2. Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
  3. Chọn chi nhánh `Demo Stuttgart Mitte`.
* **Kết quả mong đợi:**
  * Bảng đối soát 3 trục hiển thị rõ ràng:
    - **Trục 1:** Lịch ca kế hoạch (Soll) kèm giờ nghỉ dự kiến.
    - **Trục 2:** Giờ thực tế chấm công (Ist) kèm phút nghỉ thực tế.
    - **Trục 3:** Chênh lệch (Delta phút) và số phút đi muộn (nếu có).
  * Cột tuân thủ luật Đức: Hiển thị nhãn xanh *"Chuẩn ArbZG"* hoặc nhãn cảnh báo vi phạm.
  * Không tự động cắt xén giờ làm thực tế của nhân viên.

#### TC-F05-02: Nhân viên gửi đơn xin sửa giờ thông thường (Chênh lệch ≤ 60 phút)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Các bước:**
  1. Đăng nhập tài khoản `anna.mueller`, vào `#attendance`.
  2. Bấm nút **"Xin sửa giờ"** trên ca làm việc của mình.
  3. Đề xuất điều chỉnh giờ vào sớm hơn 20 phút (Chênh lệch 20m <= 60m).
  4. Nhập lý do: *"Quên quẹt thẻ khi vào ca 20 phút, có xác nhận của trưởng ca"*.
  5. Bấm **"Gửi yêu cầu điều chỉnh"**.
* **Kết quả mong đợi:**
  * Yêu cầu được gửi với trạng thái thông thường `PENDING` (không bị leo thang HR).

#### TC-F05-03: Quản lý phê duyệt đơn sửa giờ thông thường của nhân viên
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Các bước:**
  1. Đăng nhập tài khoản `tobias.hoffmann`.
  2. Vào menu **"Đối soát & Phê duyệt"**, chuyển sang tab **"Đơn xin sửa giờ"**.
  3. Bấm **"Xử lý"** trên đơn của Anna Müller.
  4. Nhập ghi chú và bấm **"Phê duyệt"**.
* **Kết quả mong đợi:**
  * Đơn được duyệt thành công, chuyển sang `APPROVED`.
  * Ca làm việc của Anna được cập nhật theo giờ mới, lưu vết audit vào `attendance_adjustments`.

#### TC-F05-04: Nhân viên gửi đơn xin sửa giờ có chênh lệch lớn (> 60 phút)
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên phục vụ).
* **Các bước:**
  1. Đăng nhập tài khoản `anna.mueller`, vào `#attendance`.
  2. Bấm **"Xin sửa giờ"** trên ca làm việc khác.
  3. Đề xuất điều chỉnh tăng thời gian làm việc thêm 120 phút (> 60m).
  4. Quan sát form: Khung viền cam cảnh báo quy tắc **US-026** xuất hiện: *"Chênh lệch thời gian 120 phút (> 60 phút). Yêu cầu này sẽ tự động chuyển lên cấp HR xác minh bổ sung."*
  5. Nhập lý do: *"Làm việc ca tăng cường hỗ trợ sự kiện tiệc tối"* và bấm Gửi.
* **Kết quả mong đợi:**
  * Yêu cầu được gửi thành công và tự động gắn trạng thái **`HR_ESCALATED`** (`requires_hr_escalation = true`).

#### TC-F05-05: Kiểm tra Quy tắc US-026 - Quản lý bị chặn duyệt đơn leo thang HR
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng).
* **Mục tiêu:** Đảm bảo Quản lý nhà hàng không được tự ý duyệt các ca có thay đổi lớn trên 60 phút.
* **Các bước:**
  1. Đăng nhập tài khoản `tobias.hoffmann`.
  2. Vào `#reconciliation`, tab **"Đơn xin sửa giờ"**.
  3. Tìm đơn của Anna Müller có nhãn cam **`CẦN HR XÁC MINH (>60m)`**.
  4. Thử bấm nút phê duyệt đơn này.
* **Kết quả mong đợi:**
  * Hệ thống chặn phê duyệt và hiển thị thông báo: *"Yêu cầu này có chênh lệch thời gian > 60 phút, bắt buộc phải do HR hoặc Quản trị viên phê duyệt!"*.

#### TC-F05-06: Cấp HR / Quản trị viên duyệt đơn leo thang & Lưu Audit Trail
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Quản trị viên / HR).
* **Lý do dùng tài khoản này:** Cấp HR/Quản trị viên có thẩm quyền cao nhất để thẩm định các điều chỉnh giờ công lớn.
* **Các bước:**
  1. Đăng nhập tài khoản `admin@restaurant.example`.
  2. Vào menu `#reconciliation`, tab **"Đơn xin sửa giờ"**.
  3. Bấm **"Xử lý"** trên đơn bị leo thang của Anna Müller.
  4. Nhập ghi chú: *"HR đã đối soát biên bản sự kiện và phê duyệt điều chỉnh."*.
  5. Bấm **"Phê duyệt"**.
* **Kết quả mong đợi:**
  * Đơn được duyệt thành công, chuyển sang `APPROVED`.
  * Bảng `attendance_adjustments` lưu vết: `old_start_utc`, `new_start_utc`, `adjusted_by_user_id`, thời điểm và ghi chú.
  * Ca làm việc tự động bật cờ **`recalculation_required = true`** sẵn sàng tính lương.

#### TC-F05-07: Kiểm tra Quy tắc SoD - Quản lý bị chặn tự phê duyệt bảng công của chính mình
* **Tài khoản kiểm thử:** `tobias.hoffmann@restaurant.example` (Quản lý nhà hàng - Employee ID: 5).
* **Mục tiêu:** Kiểm tra quy tắc Phân tách nhiệm vụ (Segregation of Duties): Quản lý không được tự duyệt cho bản thân.
* **Các bước:**
  1. Đăng nhập tài khoản `tobias.hoffmann`.
  2. Vào menu **"Đối soát & Phê duyệt"** (`#reconciliation`).
  3. Tìm ca làm việc của chính nhân viên **Tobias Hoffmann**.
  4. Quan sát nút "Duyệt":
     * Nút "Duyệt" bị vô hiệu hóa, hiển thị màu xám.
     * Rê chuột hiển thị tooltip: *"Vi phạm SoD: Không thể tự duyệt ca của chính mình"*.
  5. Thử gọi API duyệt trực tiếp: `POST /api/reconciliation/timesheets/{id}/approve`.
* **Kết quả mong đợi:**
  * Hệ thống chặn hoàn toàn với mã lỗi **`HTTP 403 Forbidden`**: *"Vi phạm quy tắc SoD (Segregation of Duties): Bạn không được phép tự phê duyệt bảng chấm công của chính mình!"*.

#### TC-F05-08: Quản trị viên / HR duyệt bảng công cho Quản lý giải quyết SoD
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Quản trị viên / HR).
* **Lý do dùng tài khoản này:** Là bên thứ ba có thẩm quyền độc lập duyệt ca cho cấp Quản lý theo đúng quy tắc SoD.
* **Các bước:**
  1. Đăng nhập tài khoản `admin@restaurant.example`.
  2. Vào `#reconciliation`, tìm ca làm việc của Tobias Hoffmann.
  3. Bấm nút **"Duyệt"**.
* **Kết quả mong đợi:**
  * Ca làm việc của Tobias Hoffmann được duyệt thành công, chuyển sang `APPROVED`.

#### TC-F05-09: Chốt và Khóa kỳ chấm công chi nhánh (US-028)
* **Tài khoản kiểm thử:** `admin@restaurant.example` (Quản trị viên / HR).
* **Lý do dùng tài khoản này:** Khóa kỳ công là nghiệp vụ cấp cao của phòng Nhân sự / Kế toán trước khi chạy lương.
* **Các bước:**
  1. Đăng nhập tài khoản `admin@restaurant.example`.
  2. Vào `#reconciliation`, chuyển sang tab **"Khóa kỳ chấm công"**.
  3. Chọn ngày kết thúc kỳ chốt (ví dụ: `2026-11-30`).
  4. Bấm **"Xác nhận khóa kỳ công"**.
* **Kết quả mong đợi:**
  * Toàn bộ ca làm việc của chi nhánh trước và trong ngày chọn chuyển sang trạng thái `LOCKED` (`is_locked = true`).

#### TC-F05-10: Kiểm tra tính bất biến sau khi khóa kỳ
* **Tài khoản kiểm thử:** `anna.mueller@restaurant.example` (Nhân viên) hoặc `tobias.hoffmann@restaurant.example` (Quản lý).
* **Các bước:**
  1. Đăng nhập tài khoản `anna.mueller`, vào `#attendance`.
  2. Tìm ca làm việc trong kỳ đã bị khóa.
* **Kết quả mong đợi:**
  * Ca làm việc hiển thị nhãn xám **`Đã khóa kỳ`**; nút *"Xin sửa giờ"* bị khóa (disabled).
  * Mọi nỗ lực gửi điều chỉnh trực tiếp vào kỳ đã khóa đều bị hệ thống từ chối.

---

## 5. BẢNG TỔNG HỢP RÀNG BUỘC PHÁP LÝ & PHÂN TÁCH NHIỆM VỤ

| STT | Quy định / Luật định | Điều luật CHLB Đức | Hành vi kiểm soát của hệ thống | Tài khoản kiểm thử chính | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Lương tối thiểu Đức | **MiLoG** | Bắt buộc lương giờ ≥ **12,41 €/h**; chặn lưu nếu thấp hơn | `tobias.hoffmann` | **PASS** |
| 2 | Giới hạn Minijob | **Minijob-Gesetz** | Trần thu nhập tối đa **538,00 €/tháng**; cảnh báo nếu vượt | `tobias.hoffmann` | **PASS** |
| 3 | Giờ làm tối đa trong ngày | **ArbZG §3** | Tối đa **10 giờ/ngày**; cảnh báo đỏ khi xếp ca hoặc chấm công quá giờ | `tobias.hoffmann`, `anna.mueller` | **PASS** |
| 4 | Nghỉ giải lao bắt buộc | **ArbZG §4** | Ca >6h: nghỉ tối thiểu **30m**; Ca >9h: nghỉ tối thiểu **45m** | `markus.weber`, `anna.mueller` | **PASS** |
| 5 | Khoảng cách nghỉ giữa ca | **ArbZG §5** | Bắt buộc nghỉ tối thiểu **11 giờ liên tục** giữa 2 ca làm việc | `tobias.hoffmann` | **PASS** |
| 6 | Làm việc ngày Chủ nhật | **ArbZG §11** | Cảnh báo làm việc Chủ nhật và nhắc nhở bố trí ngày nghỉ bù | `tobias.hoffmann` | **PASS** |
| 7 | Bảo vệ thai sản | **MuSchG** | Cấm xếp ca đêm từ **20:00 - 06:00**, cấm làm thêm giờ | `sophie.fischer` | **PASS** |
| 8 | Phân tách nhiệm vụ | **SoD Rule** | Quản lý **không được tự duyệt** bảng công hoặc đơn sửa giờ của mình | `tobias.hoffmann` bị chặn, `admin` duyệt | **PASS** |
| 9 | Leo thang phê duyệt | **US-026 Rule** | Chênh lệch điều chỉnh **> 60 phút** tự động chuyển cấp HR phê duyệt | `anna.mueller` tạo, `admin` duyệt | **PASS** |
| 10 | Bất biến & Khóa kỳ | **US-028 Rule** | Giữ bản ghi sự kiện gốc; sau khi khóa kỳ, không được sửa đổi trực tiếp | `admin` khóa, toàn bộ NV tuân thủ | **PASS** |

---

## 6. MẪU BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG

```text
========================================================================================
                      BIÊN BẢN NGHIỆM THU KIỂM THỬ HỆ THỐNG ATELIER (DT06)
             Dự án: Quản lý Nhân sự, Lịch ca, Chấm công & Đối soát Nhà hàng tại Đức
========================================================================================

Thời gian nghiệm thu: Ngày ..... tháng ..... năm 2026
Địa điểm: ..............................................................................
Thành phần tham gia nghiệm thu:
  1. Đại diện Nhóm Phát triển: Nguyễn Bá Linh & Nguyễn Hữu Phương
  2. Đại diện Nhóm Kiểm thử (QA/QC): ...................................................
  3. Đại diện Quản lý Dự án (PM): ......................................................

KẾT QUẢ NGHIỆM THU THEO PHÂN HỆ VÀ TÀI KHOẢN PHÂN VAI:
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
----------------------------------------------------------------------------------------

KẾT LUẬN NGHIỆM THU:
[ ] HỆ THỐNG ĐẠT CHUẨN ĐẶC TẢ DT06, TÍNH NĂNG VẬN HÀNH ỔN ĐỊNH, ĐỦ ĐIỀU KIỆN BÀN GIAO.
[ ] CẦN BỔ SUNG / ĐIỀU CHỈNH: .........................................................

    ĐẠI DIỆN ĐỘI PHÁT TRIỂN            ĐẠI DIỆN KIỂM THỬ              QUẢN LÝ DỰ ÁN
     (Ký & ghi rõ họ tên)             (Ký & ghi rõ họ tên)        (Ký & ghi rõ họ tên)
```
