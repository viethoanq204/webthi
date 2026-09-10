# Hướng dẫn cài đặt CA4 Exam

Thực hiện lần lượt các bước dưới đây. Không đưa secret key hoặc mật khẩu cơ sở dữ liệu lên GitHub.

## 1. Cài cơ sở dữ liệu

1. Mở Supabase Dashboard của dự án.
2. Chọn `SQL Editor` → `New query`.
3. Mở file `supabase/schema.sql`, sao chép toàn bộ nội dung và chạy.
4. Kiểm tra không có thông báo lỗi.

## 2. Tắt đăng ký công khai

1. Vào `Authentication` → `Sign In / Providers` → `Email`.
2. Tắt `Allow new users to sign up`.
3. Giữ đăng nhập bằng email và mật khẩu.

Frontend không có nút đăng ký; thiết lập này ngăn người khác tự gọi API để đăng ký.

## 3. Tạo quản trị viên gốc

1. Vào `Authentication` → `Users` → `Add user` → `Create new user`.
2. Nhập email quản trị đã thống nhất và mật khẩu ban đầu.
3. Bật xác nhận email tự động nếu Dashboard hiển thị tùy chọn này.
4. Quay lại `SQL Editor`, chạy file `supabase/bootstrap_admin.sql`.

Không ghi mật khẩu quản trị vào bất kỳ file nào trong repository. Nên đổi mật khẩu sau lần đăng nhập đầu tiên.

## 4. Triển khai Edge Function

Cài Supabase CLI, đăng nhập rồi chạy tại thư mục dự án:

```bash
supabase link --project-ref umrdfacxezbxtjhomqbs
supabase functions deploy ca4-api
```

Khuyến nghị giới hạn nguồn gọi hàm bằng secret sau; thay bằng origin GitHub Pages thực tế của bạn (không kèm đường dẫn repository):

```bash
supabase secrets set APP_ORIGINS=https://<ten-github>.github.io
```

Supabase tự cung cấp `SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` cho Edge Function. Không tự đưa service role vào frontend.

## 5. Kiểm tra cấu hình website

File `js/config.js` đã có:

- Project URL: `https://umrdfacxezbxtjhomqbs.supabase.co`
- Publishable key đã cung cấp.
- Tên Edge Function: `ca4-api`.

Nếu tạo dự án Supabase mới, chỉ sửa hai giá trị công khai trong file này.

## 6. Đưa lên GitHub Pages

1. Tạo repository hoặc mở repository hiện tại.
2. Tải toàn bộ nội dung thư mục dự án lên nhánh `main`; `index.html` phải nằm ở thư mục gốc.
3. Vào `Settings` → `Pages`.
4. Chọn `Deploy from a branch`, nhánh `main`, thư mục `/(root)`.
5. Chờ GitHub báo website đã được xuất bản.

Hệ thống dùng định tuyến sau dấu `#`, vì vậy link chia sẻ đề hoạt động trực tiếp trên GitHub Pages mà không cần cấu hình máy chủ.

## 7. Kiểm tra vận hành

1. Đăng nhập tài khoản quản trị.
2. Tạo một thư mục.
3. Tải `templates/CA4_mau_nhap_de.xlsx`, điền đề hoàn chỉnh rồi nhập thử.
4. Công bố đề.
5. Tạo một tài khoản học viên.
6. Đăng nhập học viên, mở đề, trả lời đủ 60 câu và nộp.
7. Kiểm tra điểm, màu đúng/sai, giới hạn lượt và cảnh báo thoát toàn màn hình.

## Giới hạn kỹ thuật cần biết

- Trình duyệt không thể ngăn tuyệt đối chụp màn hình, quay màn hình hoặc dùng thiết bị khác chụp lại.
- Fullscreen API có thể hoạt động khác nhau trên từng trình duyệt điện thoại. Giao diện vẫn chiếm toàn bộ vùng hiển thị khi thiết bị không hỗ trợ toàn màn hình thật.
- Số lượt được tính từ lúc nhấn `Bắt đầu làm bài`, kể cả khi người dùng đóng trang giữa chừng.
- Kết quả chi tiết chỉ tồn tại trên màn hình sau khi nộp. Rời trang sẽ không mở lại được kết quả cũ.
