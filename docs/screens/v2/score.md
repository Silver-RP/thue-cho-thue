# Chấm giao diện v2 (nhánh design/v2, 2026-10-28)

Ảnh trong thư mục này (`SCREENS_DIR=docs/screens/v2 yarn -s e2e:screens`), chấm theo `docs/design/RUBRIC.md`.

| # | Tiêu chí | Điểm | Bằng chứng |
|---|---|---|---|
| 1 | Trả lời trước | 2 | `02-vuot-nguong-390-0-dau`: số phải nộp và "Hạn khai và nộp 31/01/2027, còn 21 ngày" trong 800 px đầu |
| 2 | Phân cấp | 2 | `01-so-trong-390-2-so`: "Sổ doanh thu năm 2026" lớn, "Các căn cho thuê" là dòng phụ xám; sổ trống không còn tiêu đề "Doanh thu theo căn"/"Thuế theo hợp đồng" đứng một mình |
| 3 | Khoảng cách và lưới | 2 | Căn → hợp đồng → kỳ thu lồng đều; form thêm căn là một khối như các căn |
| 4 | Màu và trạng thái | 2 | Như v1: cam/xanh theo trạng thái, "còn 21 ngày" có chữ, chip "ước tính" |
| 5 | Không vỡ | 2 | `05-sang-nam-2027-390-0-dau`: ô chọn năm hiện đủ "2027 (chưa có quy định)", thanh trên một hàng (e2e v2). e2e 200% chữ và font rộng kiểu Linux không tràn |
| 6 | Nút và ô nhập | 1 | Nút đều kiểu chung, cao từ 44 px. Ô ngày vẫn là ô ngày gốc của trình duyệt ("mm/dd/yyyy" trong ảnh Chromium chạy nền) |
| 7 | Số liệu | 1 | `04-tinh-nhanh-1280-4-tinh`: bảng Kết quả ở cột phải hẹp, "300.000.000" và "đ" rớt hai dòng. Các nơi khác căn phải, đều cột |
| 8 | Trống, lỗi, ước tính | 2 | Sổ trống: "Sổ năm 2026 chưa có kỳ thu" + link Sổ doanh thu; năm 2027 có "Xem năm 2026" |
| 9 | Hai khổ màn hình | 2 | 390 px gọn, thanh dưới; 1280 px ba cột dùng hết bề ngang |
| 10 | Tin cậy | 1 | Căn cứ của máy tính gập vào "Giải thích từng bước và căn cứ". Còn: câu miễn trừ hiện hai lần liền nhau cuối sổ (`01-so-trong-390-2-so`) |

**Tổng: 17/20. Đạt** (cần từ 16, không tiêu chí nào 0 điểm).

## So với v1 (16/20)
- Tăng: 2 (+1, bỏ tiêu đề trùng và trống), 5 (+1, ô chọn năm đủ chữ).
- Giữ: các tiêu chí khác. Không tiêu chí nào tụt.
- Chiều cao: `04-tinh-nhanh` 390 px 4.387 → 3.917 px (căn cứ gập lại). Xem `do-dai.tsv`.

## 3 chỗ nên sửa nhất (cho v3)
1. **Bảng Kết quả ở cột hẹp** (V1, V3): xếp dòng nhãn trên, số dưới, hoặc bỏ bảng trùng với khối kết luận.
2. **Miễn trừ lặp hai lần** cuối sổ (V1): giữ một câu.
3. **Ô ngày** (V2, V6): cân nhắc ô ngày dạng dd/mm/yyyy tự viết; cần test logic vì đổi cách nhập.
