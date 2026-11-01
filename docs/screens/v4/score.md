# Chấm giao diện v4 (nhánh design/v4-c, 2026-11-01)

Ảnh trong thư mục này (`SCREENS_DIR=docs/screens/v4 yarn -s e2e`), chấm theo `docs/design/RUBRIC.md`. Ảnh mẫu: `docs/design/refs/`. Từ v4 mỗi mục là một màn hình; ảnh `5-chi-tiet`, `6-them-ky-thu` là mới.

| # | Tiêu chí | Điểm | Bằng chứng |
|---|---|---|---|
| 1 | Trả lời trước | 2 | `02-vuot-nguong-390-0-dau`: số phải nộp và "còn 21 ngày" trong 800 px đầu |
| 2 | Phân cấp | 2 | Thẻ viền đôi là điểm nhấn; chữ có chân cho số chính, chữ phụ xám |
| 3 | Khoảng cách và lưới | 2 | `02-vuot-nguong-1280-0-dau`: hai cột thẳng hàng; danh sách căn cùng nhịp |
| 4 | Màu và trạng thái | 2 | Token mới, tương phản kiểm bằng `tests/build/shell.test.ts`; trạng thái có chữ |
| 5 | Không vỡ | 2 | e2e quét đủ 4 màn hình ở 360–1280 px và chữ 200% |
| 6 | Nút và ô nhập | 2 | Ô ngày dd/mm/yyyy tự viết có nút lịch; hộp thêm kỳ thu; radio theo màu chính |
| 7 | Số liệu | 2 | Số căn phải; phụ lục hiện ngày dd/mm/yyyy |
| 8 | Trống, lỗi, ước tính | 2 | `01-so-trong-390-2-so`: một việc cần làm, không còn bảng toàn số 0 |
| 9 | Hai khổ màn hình | 2 | Điện thoại có thanh dưới; máy tính có menu trên, Tính nhanh hai cột |
| 10 | Tin cậy | 1 | Căn cứ hiện đủ ở biên lai Tổng quan, dài ở cột hẹp 1280 px |

**Tổng: 19/20. Đạt.**

## So với v3 (19/20)
- Tăng: 6 (+1, ô ngày tự viết).
- Tụt: 10 (−1, biên lai sang cột phải nên khối căn cứ lộ rõ hơn).
- Bảng điểm đã gần trần nên không đo được bước đổi lớn: phong cách theo ảnh mẫu; với sổ 3 căn trên điện thoại, cả trang v3 cao 10.855 px; v4 đo ở màn hình chi tiết một căn cao 1.190 px (`do-dai.tsv`, hai số đo khác màn hình vì v3 chỉ có một trang).

## Còn lại
1. Gập khối "Căn cứ" ở Tổng quan như ở Tính nhanh.
2. Form thêm căn và hợp đồng chưa có ảnh mẫu riêng, đang theo kiểu form kỳ thu.
3. Tên hợp đồng dài trong dòng căn chưa thử với dữ liệu thật.
