# Chấm giao diện v3 (nhánh design/v3, 2026-10-28)

Ảnh trong thư mục này (`SCREENS_DIR=docs/screens/v3 yarn -s e2e:screens`), chấm theo `docs/design/RUBRIC.md`.

| # | Tiêu chí | Điểm | Bằng chứng |
|---|---|---|---|
| 1 | Trả lời trước | 2 | `02-vuot-nguong-390-0-dau`: số phải nộp và "còn 21 ngày" trong 800 px đầu |
| 2 | Phân cấp | 2 | Một điểm nhấn mỗi màn hình; sổ có tiêu đề chính và dòng phụ |
| 3 | Khoảng cách và lưới | 2 | Căn → hợp đồng → kỳ thu lồng đều; các khối cùng lề |
| 4 | Màu và trạng thái | 2 | Trạng thái có chữ, không chỉ màu |
| 5 | Không vỡ | 2 | Ô chọn năm đủ chữ; e2e 200% chữ, font rộng không tràn |
| 6 | Nút và ô nhập | 1 | Nút đều kiểu chung, cao từ 44 px. Ô ngày vẫn là ô gốc của trình duyệt ("mm/dd/yyyy" trong Chromium chạy nền) |
| 7 | Số liệu | 2 | `04-tinh-nhanh-1280-4-tinh`: ở cột hẹp, "300.000.000 đ" nằm một dòng, căn phải; ô chữ "Chỉ thông báo doanh thu" vẫn xuống dòng |
| 8 | Trống, lỗi, ước tính | 2 | Sổ trống mời thêm căn; năm chưa có luật có "Xem năm 2026" |
| 9 | Hai khổ màn hình | 2 | 390 px gọn có thanh dưới; 1280 px ba cột |
| 10 | Tin cậy | 2 | Căn cứ gập trong "Giải thích từng bước và căn cứ"; `01-so-trong-390-2-so`: câu miễn trừ còn một lần |

**Tổng: 19/20. Đạt.**

## So với v2 (17/20)
- Tăng: 7 (+1, số tiền không tách "đ" ở cột hẹp), 10 (+1, miễn trừ một lần).
- Không tiêu chí nào tụt.

## Còn lại (chưa làm, cần cân nhắc)
1. **Ô ngày** dd/mm/yyyy tự viết (V2, V6): đổi cách nhập ngày nên cần test logic riêng; trên máy người dùng tiếng Việt, ô ngày gốc thường đã hiện dd/mm/yyyy.
2. Sổ trống nói "Chưa có kỳ thu năm 2026" hai lần (khối Tổng năm và Hạn khai).
3. Nhãn bảng Kết quả ở cột hẹp 1280 px xuống 3–4 dòng ("Hạn thông báo doanh thu").
