# Chấm giao diện v1 (nhánh design/v1, 2026-10-28)

Ảnh trong thư mục này (`SCREENS_DIR=docs/screens/v1 yarn -s e2e:screens`), chấm theo `docs/design/RUBRIC.md`.

| # | Tiêu chí | Điểm | Bằng chứng |
|---|---|---|---|
| 1 | Trả lời trước | 2 | `02-vuot-nguong-390-0-dau`: trong 800 px đầu có "Phải nộp khoảng 70.000.000 đ" và "Hạn khai và nộp 31/01/2027, còn 21 ngày"; `03-duoi-nguong-390-0-dau`: "Thông báo doanh thu trước 31/01/2027, còn 21 ngày". Đoạn giới thiệu dài đã ẩn ở điện thoại |
| 2 | Phân cấp | 1 | Khối tổng quan một điểm nhấn. `01-so-trong-390-2-so`: "Sổ doanh thu năm 2026" và "Các căn cho thuê" là hai tiêu đề liền nhau cùng nặng; tiêu đề "Doanh thu theo căn" đứng một mình khi sổ trống |
| 3 | Khoảng cách và lưới | 2 | `02-vuot-nguong-*-2-so`: căn → hợp đồng → danh sách kỳ thu lồng đều 12–16 px; dòng kỳ thu cao 44 px, cạnh số tiền thẳng hàng |
| 4 | Màu và trạng thái | 2 | Nền cam khi phải nộp, xanh khi chưa; "còn 21 ngày" màu cảnh báo kèm chữ; chip "ước tính" |
| 5 | Không vỡ | 1 | `05-sang-nam-2027-390-0-dau`: ô chọn năm vẫn cắt "2027 (". (Thử nới rộng ô thì thanh trên rớt hai dòng nên đã bỏ.) e2e 200% chữ ở 360 px không cuộn ngang |
| 6 | Nút và ô nhập | 1 | Mọi nút có viền, cao từ 44 px (e2e H-67); "Xoá" màu đỏ; "Nhập JSON" là nút. Ô ngày vẫn hiện "mm/dd/yyyy" kiểu mặc định của trình duyệt |
| 7 | Số liệu | 2 | Dòng kỳ thu căn phải, chữ số đều cột; `04-tinh-nhanh-390-4-tinh`: ô tiền hiện "25.000.000"; bảng kết quả căn phải |
| 8 | Trống, lỗi, ước tính | 2 | Sổ trống mời "Thêm căn" ngay trong khối; năm 2027 có "Xem năm 2026" |
| 9 | Hai khổ màn hình | 2 | 390 px gọn, có thanh dưới; 1280 px: dòng kỳ thu kéo hết bề ngang, "Sửa hợp đồng" nằm phải cùng hàng tên |
| 10 | Tin cậy | 1 | `04-tinh-nhanh-390-4-tinh`: mỗi bước giải thích kèm đoạn "Căn cứ" dài lặp lại hai lần; miễn trừ hiện hai lần ở cuối sổ |

**Tổng: 16/20. Đạt sát ngưỡng** (cần từ 16, không tiêu chí nào 0 điểm).

## So với v0 (11/20)
- Tăng: 1 (+1, hạn vào khối tổng quan), 3 (+1, sổ gọn), 6 (+1, nút chung), 7 (+1, ô tiền có dấu chấm), 9 (+1).
- Giữ: 2, 4, 5, 8, 10. Không tiêu chí nào tụt.
- Chiều cao trang S2: 22.123 → 10.881 px (390), 19.461 → 8.232 px (1280). Xem `do-dai.tsv`.

## 3 chỗ nên sửa nhất (cho v2)
1. **Ô chọn năm cắt chữ ở điện thoại** (V1, V6): nhãn năm chưa có luật ngắn lại để vừa ô.
2. **"Căn cứ" dài lặp lại** trong máy tính (V1, V3): gom vào một dòng gập "Căn cứ pháp lý".
3. **Tiêu đề trùng và trống** (V1): gộp "Sổ doanh thu năm" với "Các căn cho thuê"; ẩn "Doanh thu theo căn" khi chưa có căn; miễn trừ chỉ một lần.
