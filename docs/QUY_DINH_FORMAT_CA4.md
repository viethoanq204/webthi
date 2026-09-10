# Quy định file nhập đề CA4-1.0

## Cấu trúc bài kiểm tra

| Câu | Loại | Mã trong file | Yêu cầu |
|---|---|---|---|
| 01–48 | Trắc nghiệm đơn | `DON` | 4 phương án A–D, một đáp án đúng |
| 49–51 | Câu hỏi nhóm | `NHOM`, nhóm `N1` | Dùng chung tình huống N1 |
| 52–54 | Câu hỏi nhóm | `NHOM`, nhóm `N2` | Dùng chung tình huống N2 |
| 55–60 | Trả lời ngắn | `NGAN` | Không có phương án A–D |

Đề có đúng 60 câu, tổng 70 điểm và tỷ lệ mức độ gồm 12 câu `BIET`, 18 câu `HIEU`, 30 câu `VANDUNG`.

## Sheet THONG_TIN

Không đổi tên khóa ở cột A.

| Khóa | Quy định |
|---|---|
| `format_version` | Bắt buộc là `CA4-1.0` |
| `ten_bai_kiem_tra` | Từ 1 đến 160 ký tự |
| `mo_ta` | Không quá 500 ký tự |
| `thoi_gian_phut` | Số nguyên từ 1 đến 300 |
| `so_luot_lam` | Số nguyên không âm; 0 là không giới hạn |
| `thu_muc` | Tự tạo thư mục nếu chưa tồn tại |
| `trang_thai` | `draft` hoặc `published` |

## Sheet TINH_HUONG

Gồm đúng hai dòng:

| ma_nhom | noi_dung_tinh_huong |
|---|---|
| N1 | Đoạn tình huống dùng cho câu 49–51 |
| N2 | Đoạn tình huống dùng cho câu 52–54 |

## Sheet CAU_HOI

| Cột | Nội dung |
|---|---|
| `so_cau` | Số nguyên từ 1 đến 60, không trùng |
| `loai_cau` | `DON`, `NHOM` hoặc `NGAN` |
| `ma_nhom` | N1 cho câu 49–51; N2 cho câu 52–54; các câu khác để trống |
| `noi_dung` | Nội dung câu hỏi |
| `phuong_an_a`…`phuong_an_d` | Bắt buộc với câu 01–54; để trống với câu 55–60 |
| `dap_an_dung` | A–D với câu trắc nghiệm; nội dung đáp án chính với câu ngắn |
| `dap_an_tuong_duong` | Các cách viết khác, ngăn cách bằng `||` |
| `loi_giai` | Giải thích hiển thị sau khi nộp |
| `chu_de` | Chuyên đề kiến thức |
| `muc_do` | `BIET`, `HIEU` hoặc `VANDUNG` |
| `diem` | Điểm của câu; tổng 60 câu phải bằng 70 |

## Chuẩn hóa trả lời ngắn

Khi chấm, hệ thống bỏ khoảng trắng thừa, không phân biệt chữ hoa/chữ thường và bỏ dấu câu ở cuối. Hệ thống không tự bỏ dấu tiếng Việt vì điều đó có thể làm thay đổi thuật ngữ pháp lý.

Ví dụ:

```text
dap_an_dung: Nhà nước đơn nhất
dap_an_tuong_duong: nhà nước đơn nhất||Nhà nước đơn nhất.
```

## Các lỗi làm file bị từ chối

- Thiếu, thừa hoặc trùng số câu.
- Sai loại câu theo phạm vi 01–60.
- Thiếu N1 hoặc N2.
- Trắc nghiệm thiếu một phương án hoặc có hai phương án giống nhau.
- Đáp án trắc nghiệm không phải A, B, C hoặc D.
- Câu trả lời ngắn có phương án A–D hoặc không có đáp án.
- Sai tỷ lệ 12–18–30.
- Tổng điểm khác 70.
- Thời gian hoặc số lượt làm không hợp lệ.
