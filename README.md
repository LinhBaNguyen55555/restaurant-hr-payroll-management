# Atelier · Restaurant HR & Payroll

F00 (Identity & Access) và F01 (Organization & Branches) được triển khai trên React 19 + TypeScript + Vite và Spring Boot 4.1 + Java 27. Giao diện chính bằng tiếng Đức, theo đặc tả DT06, với thiết kế sáng/tối, mô hình nhà hàng CSS 3D tương tác GSAP và dialog/chuyển trạng thái Animate UI.

## Chạy trên Windows

Cần Node.js 22.12+ và JDK 27. Không cần MySQL để chạy demo: profile `dev` dùng H2 lưu bền trong `backend/data/atelier.mv.db`.

Terminal 1 tại `backend`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-27'
.\mvnw.cmd spring-boot:run
```

Terminal 2 tại `frontend`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở **http://127.0.0.1:5173**. Frontend chuyển tiếp `/api` đến backend tại cổng 8080, dùng session cookie HttpOnly và CSRF. Không lưu mật khẩu hay token đăng nhập trong localStorage. Chỉ lựa chọn giao diện sáng/tối được lưu trong trình duyệt.

Có thể chạy `./Start-Atelier.ps1` từ PowerShell: script khởi chạy backend ẩn, in PID của launcher và giữ frontend ở terminal hiện tại. Dừng backend riêng khi không còn dùng; file log nằm tại `backend/server.log` và `backend/server-error.log`. Hai terminal ở trên dễ theo dõi và dừng độc lập hơn.

## Tài khoản demo

Chỉ được tạo khi database mới và `app.seed-demo=true` trong profile phát triển:

| Email | Vai trò | Mật khẩu ban đầu |
| --- | --- | --- |
| admin@atelier.local | System Admin | Atelier!2026Demo |
| hr@atelier.local | HR, một pháp nhân | Atelier!2026Demo |
| manager@atelier.local | Quản lý Stuttgart | Atelier!2026Demo |
| employee@atelier.local | Cá nhân, không được đọc dữ liệu tổ chức | Atelier!2026Demo |

Admin và HR phải thiết lập TOTP ngay lần đăng nhập đầu. Dùng ứng dụng Authenticator, thêm tài khoản theo khóa hiển thị, chọn **Time based, 6 digits, SHA1, 30 seconds**, rồi nhập mã 6 chữ số. Các lần sau sử dụng Authenticator đó. Không có mã MFA cố định hoặc cách bỏ qua MFA. Mã đã dùng không được chấp nhận lại trong cùng bước thời gian.

Dữ liệu mẫu gồm một pháp nhân, 5 nhà hàng, 5 địa điểm làm việc và 20 hồ sơ tham chiếu nhân viên giả lập. Khi đã tạo database, lần khởi động tiếp theo không ghi đè dữ liệu. Hồ sơ tham chiếu phục vụ F01; vòng đời hợp đồng và hồ sơ HR đầy đủ thuộc F02.

## Chức năng đã triển khai

- F00.01: đăng nhập/đăng xuất, hết hạn phiên 30 phút không hoạt động, danh sách và thu hồi phiên; thông báo lỗi không tiết lộ tài khoản tồn tại.
- F00.02: tạo/sửa/vô hiệu hóa tài khoản, nhiều vai trò, phạm vi pháp nhân/chi nhánh; vô hiệu hóa hoặc đổi quyền làm mất hiệu lực phiên cũ. Khóa tạm sau 5 lần sai, giới hạn lần thử theo IP và tài khoản. Khôi phục mật khẩu bằng token băm, hết hạn 30 phút và dùng một lần.
- F00.03: TOTP có bước chặn trước dữ liệu nhạy cảm, mã chống dùng lại, bí mật mã hóa AES-256-GCM; thay Authenticator cần xác nhận mật khẩu và mã cũ, chỉ thay khi mã mới đã được xác nhận.
- F00.04: backend kiểm tra hành động + vai trò + phạm vi dữ liệu. Không có quyền mặc định với dữ liệu lương. Bộ quyền hiện là ma trận cố định trong `Access.java`; màn hình quản trị gán vai trò và phạm vi cho tài khoản.
- F00.05: bảo vệ tài khoản admin hiện tại khỏi tự vô hiệu hóa/hạ quyền; các API ngoài phạm vi bị từ chối. Ràng buộc tự duyệt giờ công/thanh toán sẽ được áp dụng tại F05/F13 khi các nghiệp vụ đó tồn tại.
- F01.01: pháp nhân và chi nhánh có tạo/sửa/ngừng hoạt động, mã duy nhất và kiểm tra xung đột phiên bản.
- F01.02: danh mục 16 bang, địa chỉ và múi giờ Europe/Berlin; quản lý nhiều địa điểm làm việc thực tế của một chi nhánh.
- F01.03: phân công quản lý theo ngày hiệu lực; chặn khoảng chồng lấn; quyền của quản lý được tính lại theo ngày, không cấp vĩnh viễn khi tạo phân công.
- F01.04: tra cứu nhân viên theo nơi làm, điều chuyển theo thời kỳ, chặn khoảng chồng lấn, lưu lý do và snapshot bang/địa chỉ/múi giờ. Điều chuyển khác pháp nhân bị chặn để chờ quy trình hợp đồng F02.
- Có nhật ký hành động, tìm kiếm nhanh Ctrl/⌘ K, tìm kiếm/lọc, xem dạng lưới/danh sách, chi tiết chi nhánh, trạng thái rỗng/lỗi/loading, responsive và `prefers-reduced-motion`.

Giao diện gọi API thật. Không có chế độ frontend tự tạo phiên hay âm thầm chuyển sang dữ liệu giả khi backend lỗi.

## Kiểm thử

```powershell
# frontend
npm.cmd test
npm.cmd run build

# backend
.\mvnw.cmd test
```

Kiểm thử backend dùng MockMvc và H2 trong bộ nhớ: kiểm tra CSRF, MFA, phân quyền chi nhánh, dữ liệu cá nhân, thu hồi phiên, khôi phục dùng một lần, xung đột phiên bản và chồng lấn phân công. Kiểm thử frontend dùng jsdom cho API client, form đăng nhập/MFA và tạo/sửa dữ liệu. Đây không phải kiểm thử trình duyệt hoặc kiểm tra ảnh chụp. Việc kiểm tra trực quan chưa được thực hiện vì quyền truy cập bản xem trước trong trình duyệt bị từ chối trong phiên triển khai.

## Chạy với MySQL

1. Tạo database MySQL 8 mới, áp dụng `backend/src/main/resources/db/mysql/V1__f00_f01.sql` một lần. Script không tự chạy; không áp dụng trực tiếp vào database cũ chưa rà migration.
2. Đặt biến môi trường theo `backend/.env.example`. Spring không tự đọc file `.env`.
3. Sinh và lưu bền `MFA_ENCRYPTION_KEY`: Base64 của 32 byte ngẫu nhiên, không đưa vào Git. Profile mysql bắt buộc có khóa. H2 phát triển dùng `backend/data/mfa.key`, cần sao lưu cùng dữ liệu nếu muốn giữ Authenticator.
4. Chạy với `SPRING_PROFILES_ACTIVE=mysql`. JPA chỉ `validate`, không tự sửa lược đồ. Profile này tắt seed demo và dùng session cookie Secure, vì vậy cần HTTPS.
5. Database mới có thể tạo admin đầu tiên bằng `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` (12–72 ký tự). Bỏ hai biến bootstrap sau khi khởi tạo; MFA vẫn bắt buộc lúc đăng nhập.
6. Host `frontend/dist` và reverse proxy `/api` cùng origin qua HTTPS. Đặt `APP_BASE_URL` bằng URL thực.

Kênh giao token khôi phục qua email chưa tích hợp: bản phát triển cho admin lấy link để bàn giao an toàn; profile mysql trả 503 cho chức năng phát link cho đến khi có kênh gửi được cấu hình. Không có endpoint công khai trả token. Nếu mất Authenticator, quy trình xác minh danh tính/phục hồi thủ công cần được chốt trước vận hành; reset mật khẩu không tắt MFA.

MySQL migration được cung cấp nhưng chưa kiểm chứng trên một server MySQL thật. Triển khai hiện tại chỉ bao gồm F00/F01, chưa tính lương hay gửi giao dịch pháp định. Tài liệu phạm vi ở `docs/DT06_Dac_ta_chuc_nang_chuan_hoa_Phuong_an_C_v1_1.docx`.

## Thiết kế và nguồn tham khảo

Mô hình nhà hàng dựng trực tiếp bằng CSS transform 3D, không cần tải ảnh/model từ bên ngoài. GSAP dùng `useGSAP`, selector có scope, `contextSafe`, `quickTo` và cleanup. Animate UI cung cấp dialog Base UI có focus management, Escape/dismiss, motion tokens và reduced-motion configuration. Hiệu ứng di chuyển được tắt với tùy chọn giảm chuyển động.

Nguồn và giấy phép: `docs/THIRD_PARTY_NOTICES.md`, `frontend/notices/`. Hai repo tham khảo được tải vào `.references/`, nằm ngoài mã ứng dụng và được Git ignore.
