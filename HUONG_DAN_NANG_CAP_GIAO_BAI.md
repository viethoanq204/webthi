# Nâng cấp chức năng giao bài theo học viên

Bản nâng cấp giữ nguyên toàn bộ tài khoản, thư mục, đề thi và số lượt đã làm. Học viên được giao bài sử dụng đúng thời gian và số lượt làm đang thiết lập chung cho bài kiểm tra.

## 1. Sao lưu nhanh trước khi nâng cấp

Trong Supabase Dashboard, nên tạo một bản sao lưu hoặc xuất các bảng quan trọng nếu gói dịch vụ của bạn hỗ trợ. Không xóa bảng và không chạy lại file khởi tạo quản trị viên.

## 2. Nâng cấp cơ sở dữ liệu

1. Mở Supabase Dashboard → `SQL Editor` → `New query`.
2. Mở file `supabase/migrations/20260911_exam_assignments.sql` trong VS Code.
3. Sao chép toàn bộ nội dung, dán vào SQL Editor và bấm `Run` đúng một lần.
4. Kết quả phải báo chạy thành công, không có dòng lỗi màu đỏ.

File nâng cấp tạo bảng liên kết giao bài, mở rộng trạng thái bài kiểm tra và cập nhật RLS. Nhờ RLS, học viên không được giao không thể đọc đề chỉ bằng cách sửa mã JavaScript hoặc biết link chia sẻ.

## 3. Triển khai lại Edge Function

Mở Terminal trong thư mục dự án và chạy:

```powershell
npx.cmd supabase functions deploy ca4-api
```

Không cần chạy lại `supabase link` nếu thư mục này vẫn đang liên kết đúng dự án. Không đưa service role key vào mã frontend.

## 4. Đẩy giao diện lên GitHub

Sau khi chép các file nâng cấp vào dự án, chạy:

```powershell
git status
git add .
git commit -m "Them chuc nang giao bai theo hoc vien"
git push origin main
```

Chờ GitHub Pages triển khai xong rồi tải lại trang bằng `Ctrl + F5`.

## 5. Kiểm tra chức năng

1. Đăng nhập quản trị viên → `Quản lý bài kiểm tra`.
2. Chọn `Sửa` ở một bài → `Phạm vi bài kiểm tra` → `Giao theo học viên`.
3. Chọn một, nhiều hoặc `Chọn tất cả`, sau đó lưu.
4. Đăng nhập một học viên đã chọn: bài phải xuất hiện và có thể làm theo số lượt hiện có.
5. Đăng nhập một học viên không được chọn: bài không xuất hiện; mở link trực tiếp cũng bị từ chối.
6. Đổi bài sang `Công bố cho mọi học viên`: mọi tài khoản đang hoạt động đều thấy bài.
7. Đổi bài sang `Bản nháp`: học viên không còn thấy hoặc mở được bài.

## Các file phải thay hoặc thêm

- `js/app.js`
- `styles.css`
- `supabase/functions/ca4-api/index.ts`
- `supabase/schema.sql` (để bộ mã nguồn đầy đủ cho lần cài mới; hệ thống đang chạy dùng file migration)
- `supabase/migrations/20260911_exam_assignments.sql`
- `scripts/validate_project.mjs`
- `README.md`
- `HUONG_DAN_CAI_DAT.md`
- `HUONG_DAN_NANG_CAP_GIAO_BAI.md`

