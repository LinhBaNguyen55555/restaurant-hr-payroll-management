# Atelier Gastronomie · DT06

Ứng dụng quản lý nhân sự và giờ công cho chuỗi nhà hàng ở Đức. Frontend dùng React 19, TypeScript và Vite. Backend dùng Spring Boot 4.1, Java 27 và JPA. Giao diện hỗ trợ tiếng Đức, tiếng Việt, chế độ sáng/tối, mô hình CSS 3D với GSAP và hiệu ứng Animate UI.

| Phân hệ | Chức năng đang có |
| --- | --- |
| F00 · Tài khoản và bảo mật | Đăng nhập bằng email hoặc tên tài khoản, MFA TOTP, CSRF, quản lý phiên, khôi phục mật khẩu, vai trò và audit |
| F01 · Tổ chức | Pháp nhân, chi nhánh, địa điểm làm việc, bổ nhiệm quản lý, điều chuyển có ngày hiệu lực và lịch lễ tham khảo |
| F02 · Nhân sự | Hồ sơ, hợp đồng, mức lương, hạn chế xếp ca, nhập CSV có chạy thử, kiểm tra MiLoG và Minijob theo ngày hiệu lực |
| F03 · Xếp ca | Mẫu ca qua API, lịch tuần, kiểm tra giờ làm và thời gian nghỉ, công bố ca, gửi và xử lý yêu cầu đổi ca |
| F04 · Chấm công | Vào ca, ra ca, bắt đầu và kết thúc nghỉ, lịch sử cá nhân, nhập giờ công thủ công theo phạm vi |
| F05 · Đối soát | So sánh lịch với giờ thực tế, xử lý ngoại lệ, yêu cầu sửa giờ và chuyển HR, duyệt và khóa bảng công |
| F06 · Nghỉ và vắng mặt | Cấp số dư phép năm, nộp và duyệt đơn, ghi nhận nghỉ ốm và nghỉ chăm con ốm, theo dõi và xác nhận nghỉ bù |
| F07 · Phụ cấp SFN | Lịch lễ theo bang, phân đoạn giờ làm thực tế, phụ cấp đêm/Chủ nhật/ngày lễ, tách khoản miễn và chịu thuế, tổng hợp theo chi nhánh |

Trang **Tổng quan vận hành** hiển thị số liệu theo phạm vi tài khoản. Người quản lý có thể tìm chi nhánh theo tên, mã hoặc thành phố, lọc các chi nhánh đang hoạt động chưa có quản lý và mở chi tiết từng nơi. Số nhân sự được tính theo người có phân công còn hiệu lực trong ngày tại Berlin. Trong mục **Chi nhánh**, người dùng có thể chuyển giữa bảng, lưới 3D và cây tổ chức.

## Chạy trên Windows với tài khoản MySQL

Cần **MySQL 8**, **JDK 27** và **Node.js 22.12+**. Backend mặc định kết nối cơ sở dữ liệu `restaurant_hr_payroll_management` và xác thực người dùng qua bảng `user_accounts`.

1. Với máy mới, sao chép `backend/.env.example` thành `backend/.env`, điền thông tin kết nối MySQL và khóa MFA đang dùng cho cơ sở dữ liệu đó. Nếu máy đã có cấu hình, tiếp tục dùng cấu hình hiện tại. Các biến môi trường của tiến trình có mức ưu tiên cao hơn tệp này.
2. Từ thư mục dự án, chạy `npm.cmd --prefix frontend ci` để cài thư viện lần đầu, sau đó chạy `.\Start-Atelier.ps1`. Cũng có thể mở hai cửa sổ để chạy riêng `.\mvnw.cmd spring-boot:run` trong `backend` và `npm.cmd run dev` trong `frontend`.
3. Mở [trang đăng nhập](http://localhost:5173). Nhập email hoặc tên đăng nhập cùng mật khẩu hiện tại. Trong chế độ phát triển, các nút Tobias Hoffmann, Lukas Schneider, admin và Anna Müller điền sẵn tên đăng nhập cho bộ tài khoản MySQL của dự án. Nếu có hai tài khoản có cùng phần tên trước dấu @, dùng email đầy đủ để chọn chính xác.

Lệnh chạy thông thường sử dụng schema MySQL hiện có và tắt khởi tạo dữ liệu demo. H2 chỉ là thư viện kiểm thử của Maven.

### Không gian làm việc

| Người dùng | Công việc trên trang tổng quan |
| --- | --- |
| Nhân viên | Xem trạng thái chấm công, lịch cá nhân đã công bố trong 7 ngày và mở đơn nghỉ phép. |
| Đầu bếp | Xem bếp được phân công hôm nay, giờ trực, chi nhánh và thời gian nghỉ giữa ca. Tài khoản liên kết bằng email với hồ sơ có phân công `KITCHEN` còn hiệu lực theo ngày tại Berlin. |
| Quản lý nhà hàng | Chọn chi nhánh và ngày để xem nhân sự trực. **Mở lịch tuần** giữ chi nhánh và mở đúng tuần chứa ngày đã chọn. Tại đây quản lý có thể thêm ca, công bố lịch hoặc xóa ca nháp. |
| Quản trị hệ thống | Xem trạng thái từng chi nhánh, nhận biết chi nhánh thiếu quản lý, mở hồ sơ chi nhánh, tài khoản và nhật ký hoạt động. Trong mục Tài khoản, chọn **Ma trận phân quyền & SoD** để tra quyền của một vai trò hoặc so sánh tám vai trò theo dữ liệu API. |

Các biểu mẫu thêm hoặc sửa cho phép quay lại khi còn thay đổi chưa lưu. Trước khi xóa ca nháp, hộp xác nhận hiển thị tên nhân viên, ngày và khung giờ. Trên điện thoại, bảng tổng quan chi nhánh chuyển sang từng bản ghi có nhãn; bảng hồ sơ nhân viên có thể cuộn ngang đến cột thao tác.

Email hồ sơ nhân viên cần khớp email tài khoản để sử dụng nghiệp vụ cá nhân. Khi tạo nhân viên, chọn chi nhánh có địa điểm làm việc đang hoạt động. CSV dùng ID chính xác của chi nhánh ở cột `branch_id`. Mẫu trong hộp nhập CSV điền sẵn một ID thuộc phạm vi đang xem. Dùng **chạy thử** để xem lỗi từng dòng trước khi nhập.

## Quy tắc vận hành

- API và giao diện giữ nguyên mã pháp nhân và chi nhánh dạng chuỗi. Quyền được kiểm tra theo vai trò, phạm vi tổ chức và hồ sơ cá nhân. Hồ sơ hợp đồng/lương dành cho HR. Báo cáo SFN dành cho HR và nhân sự tính lương có phạm vi phù hợp.
- Nhập và hiển thị giờ theo múi giờ Berlin. Backend lưu các mốc lịch ca và chấm công dưới dạng UTC. Giao diện yêu cầu người dùng nhập lại những mốc không tồn tại hoặc trùng lặp khi chuyển giờ mùa hè.
- HR cấp số dư phép năm trước khi duyệt đơn trừ phép. Đơn qua hai năm cần tách riêng. Số ngày nghỉ dựa trên ca đã xếp và lịch làm việc mặc định thứ Hai đến thứ Sáu. Nghỉ ốm lưu thông tin ngày, trạng thái và mã chứng từ do HR nhập.
- Chỉ tính và lưu SFN cho bảng công đã duyệt và chưa khóa. Lượt xem trả kết quả đã lưu hoặc bản tính xem trước. Cần lịch lễ cấp bang đã xác minh, chính sách phụ cấp của pháp nhân, đơn giá EUR hiệu lực và mốc nghỉ thực tế. Lưu kết quả SFN trước khi khóa kỳ nếu cần đối chiếu về sau.
- F02 áp dụng mức hiệu lực, ví dụ 13,90 EUR/giờ và 603 EUR/tháng năm 2026. F07 áp dụng trần cơ sở 50 EUR/giờ theo § 3b EStG và 25 EUR/giờ theo § 1 SvEV. Tỷ lệ thực trả lấy từ chính sách nội bộ. Lịch lễ cấp địa phương và các hợp đồng đặc thù cần xác minh riêng theo nơi làm việc. [BMAS](https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Mindestlohn/Glossar/G/Gesetzlicher-Mindestlohn.html) · [Minijob-Zentrale](https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Rundschreiben/Geringfuegigkeitsrichtlinien-2026.pdf?__blob=publicationFile) · [§ 3b EStG](https://www.gesetze-im-internet.de/estg/__3b.html) · [§ 1 SvEV](https://www.gesetze-im-internet.de/svev/__1.html)

## Kiểm thử và build

```powershell
# Trong backend
.\mvnw.cmd clean test

# Trong frontend
npm.cmd test
npm.cmd run build
```

Backend dùng H2 riêng cho bộ kiểm thử API F00–F07. Các kịch bản bao phủ MFA và phạm vi dữ liệu, tổ chức và điều chuyển, hồ sơ và nhập CSV, công bố và đổi ca, giờ nghỉ, sửa giờ và khóa kỳ, duyệt phép và phụ cấp qua nửa đêm. Frontend kiểm thử đăng nhập và MFA, biểu mẫu tổ chức, chọn không gian theo vai trò, ma trận phân quyền và chuyển đổi giờ Berlin. Bản build nằm trong `frontend/dist`.

Nếu môi trường chặn Mockito tự gắn agent, đặt `JAVA_TOOL_OPTIONS` bằng đường dẫn Mockito trong bộ nhớ đệm Maven trước khi chạy test.

```powershell
$mockitoJar = Join-Path $env:USERPROFILE '.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar'
$env:JAVA_TOOL_OPTIONS = '-javaagent:"' + $mockitoJar + '"'
.\mvnw.cmd clean test
Remove-Item Env:JAVA_TOOL_OPTIONS
```

## MySQL và cấu hình triển khai

1. Với cơ sở dữ liệu MySQL 8 **mới và trống**, áp dụng [baseline.sql](backend/src/main/resources/db/mysql/baseline.sql). File tạo schema F00–F07 và danh mục vị trí, loại nghỉ ban đầu.
2. Đặt các biến dưới đây trong môi trường chạy hoặc kho bí mật. Profile `mysql` kiểm tra schema khi khởi động, tắt dữ liệu demo và dùng cookie bảo mật qua HTTPS.
3. Tạo quản trị viên đầu tiên bằng `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` (12–72 ký tự), sau đó bỏ hai biến bootstrap. Tạo pháp nhân, chi nhánh, địa điểm, tài khoản HR và cấu hình lịch lễ cùng chính sách SFN cho nơi triển khai.
4. Phục vụ `frontend/dist` và chuyển tiếp `/api` cùng origin qua HTTPS. Xác minh health, đăng nhập MFA và luồng nghiệp vụ trên cơ sở dữ liệu triển khai.

| Biến | Cấu hình |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | Dùng `mysql` khi triển khai HTTPS để bật kiểm tra schema và cookie bảo mật. Môi trường cục bộ dùng MySQL mặc định. |
| `DB_URL` | JDBC URL của MySQL đã chuẩn bị |
| `DB_USER`, `DB_PASSWORD` | Tài khoản DB của ứng dụng |
| `MFA_ENCRYPTION_KEY` | Base64 của 32 byte ngẫu nhiên, lưu bền cùng cấu hình triển khai |
| `APP_BASE_URL` | URL frontend, dùng để tạo liên kết khôi phục |

V1–V4 là các script lịch sử và V2–V4 phụ thuộc schema cũ. Với DB đang có dữ liệu, sao lưu và đối chiếu schema với baseline trước khi chuyển phiên bản. Đặc biệt cần ánh xạ mã pháp nhân/chi nhánh dạng số cũ sang ID của F01 và xác minh liên kết giữa hồ sơ nhân viên và phân công. Chạy thử trên bản sao trước khi thay đổi DB chính.

Khi chuyển máy chủ, giữ khóa MFA tương ứng với dữ liệu TOTP đã đăng ký. Sao lưu khóa cùng quy trình quản lý bí mật của hệ thống.

Kiểm thử tự động dùng H2. eAU hiện ghi nhận chứng từ nội bộ. F07 tính và lưu kết quả phụ cấp để dùng trước quy trình bảng lương và chi trả.

[Ghi nhận thư viện bên thứ ba](docs/THIRD_PARTY_NOTICES.md)
