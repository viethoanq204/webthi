# CA4 Exam

Hệ thống luyện thi Văn bằng 2 Công an môn Lý luận Nhà nước và Pháp luật, chạy bằng HTML, CSS, JavaScript trên GitHub Pages và sử dụng Supabase cho đăng nhập, dữ liệu, phân quyền và chấm bài.

## Thành phần

- Giao diện đăng nhập, học viên và quản trị responsive.
- Không cho đăng ký công khai.
- Quản trị tài khoản học viên, thư mục và bài kiểm tra.
- Ba phạm vi bài kiểm tra: bản nháp, công bố cho mọi học viên, hoặc giao cho một/nhiều/tất cả học viên đang hoạt động.
- Nhập đề từ file Excel đúng cấu trúc CA4-1.0.
- C01–C48 câu đơn; C49–C54 hai nhóm tình huống; C55–C60 trả lời ngắn.
- Đáp án chỉ được đọc bởi Edge Function khi chấm bài.
- Giới hạn lượt làm, hẹn giờ phía máy chủ và ba cảnh báo tự nộp bài.
- Không lưu lịch sử câu trả lời sau khi chấm; chỉ lưu bộ đếm lượt đã bắt đầu.

Xem `HUONG_DAN_CAI_DAT.md` để thiết lập Supabase và GitHub Pages.

## Cấu trúc thư mục

```text
assets/                       Logo
docs/                         Quy định file đề
js/config.js                  Kết nối Supabase công khai
js/app.js                     Toàn bộ chức năng frontend
supabase/schema.sql           Cơ sở dữ liệu và RLS
supabase/migrations/          Các bản nâng cấp cho hệ thống đang vận hành
supabase/bootstrap_admin.sql  Gán tài khoản quản trị gốc
supabase/functions/ca4-api/   Edge Function quản trị và chấm bài
templates/                    File Excel mẫu
vendor/                       Thư viện chạy trực tiếp trên GitHub Pages
index.html                    Điểm vào website
styles.css                    Giao diện responsive
```

## Lưu ý bảo mật

`js/config.js` chỉ chứa Project URL và publishable key. Đây là khóa dành cho trình duyệt và chỉ an toàn khi RLS đã được cài đúng. Không thêm `service_role`, secret key, database password hoặc access token vào repository.

## Nâng cấp hệ thống đang chạy

Nếu đã cài bản v1, làm theo `HUONG_DAN_NANG_CAP_GIAO_BAI.md`. Không cần chạy lại toàn bộ `schema.sql` và không cần tạo lại tài khoản, thư mục hoặc đề thi.
