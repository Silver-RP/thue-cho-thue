# Chấm giao diện v0 (main sau R10, 2026-10-28)

Ảnh trong thư mục này (`yarn -s e2e:screens`), chấm theo `docs/design/RUBRIC.md`.

| # | Tiêu chí | Điểm | Bằng chứng |
|---|---|---|---|
| 1 | Trả lời trước | 1 | `02-vuot-nguong-390-0-dau`: thấy "Phải nộp khoảng 70.000.000 đ" nhưng hạn 31/01/2027 không có trong màn hình đầu; tiêu đề và đoạn giới thiệu chiếm khoảng 260 px phía trên |
| 2 | Phân cấp | 1 | Khối tổng quan rõ. `02-…-2-so`: phần sổ có tiêu đề nhỏ, mọi kỳ thu cùng một cấp, không có điểm nhấn |
| 3 | Khoảng cách và lưới | 1 | Tổng quan và biên lai đều nhịp; sổ là chuỗi form dính nhau, mỗi kỳ thu một form đầy đủ |
| 4 | Màu và trạng thái | 2 | Khối tổng quan nền cam khi phải nộp, xanh khi chưa; chip "ước tính", "sắp tới" có chữ |
| 5 | Không vỡ | 1 | `05-sang-nam-2027-390`: ô chọn năm cắt chữ "2027 ("; tiêu đề trang vẫn ghi "2026" khi đang xem 2027 |
| 6 | Nút và ô nhập | 0 | "Xoá căn", "Xoá hợp đồng", "Xoá kỳ thu", "Xuất JSON", ô chọn tệp vẫn kiểu mặc định xám của trình duyệt; ô ngày hiện "mm/dd/yyyy" |
| 7 | Số liệu | 1 | Biên lai căn phải, chữ số đều cột. Ô "Tiền thuê mỗi kỳ" hiện "25000000" không có dấu chấm; máy tính có cả khối kết luận lẫn bảng kết quả lặp cùng số |
| 8 | Trống, lỗi, ước tính | 2 | Sổ trống chỉ đường "Sổ doanh thu"; năm 2027 có nút "Xem năm 2026" |
| 9 | Hai khổ màn hình | 1 | 1280 px gần mockup: menu bên, cột phải có hạn và tính nhanh. 390 px phần sổ thô; trang S2 cao 22.123 px (`do-dai.tsv`) |
| 10 | Tin cậy | 1 | Có căn cứ từng bước, nhưng đoạn "Căn cứ" dưới biên lai và trong máy tính dài, chữ nhỏ, lẫn vào nội dung |

**Tổng: 11/20. Chưa đạt** (cần từ 16 và không tiêu chí nào 0 điểm).

## 3 chỗ nên sửa nhất
1. **Sổ dài 22.000 px vì mỗi kỳ thu là một form** (V1, V2, V4). Hiện kỳ thu thành dòng gọn "ngày · số tiền · sửa", chỉ mở form khi bấm sửa; hợp đồng gập lại được.
2. **Nút và ô kiểu mặc định** (mọi vai). Thêm kiểu nút phụ và nút nguy hiểm (xoá) theo token, ô chọn tệp có nhãn kiểu nút, ô tiền có dấu chấm khi gõ.
3. **Màn hình đầu trên điện thoại** (V1, V6). Rút đoạn giới thiệu, đưa dòng "Hạn 31/01/2027 · còn 21 ngày" vào khối tổng quan. Tiêu đề trang theo năm đang chọn.

## Chiều cao trang (px)
Xem `do-dai.tsv`. Mốc so sánh: S2 là 22.123 (390 px) và 19.461 (1280 px).
