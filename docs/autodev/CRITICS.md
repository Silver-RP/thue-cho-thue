# Bộ phản biện thue-cho-thue

Bộ này dùng cho góc (d) của `/autodev:audit` (`paths.critics_file`). Mục đích là tìm lỗi **logic** (số sai so với luật), lỗi **trải nghiệm** (người dùng kẹt, hiểu sai, mất sổ) và đề xuất **cải thiện** chức năng, giao diện. Ba góc chung của audit đọc code; bộ này đóng vai người dùng thật.

Leader cũng chạy được bằng tay: mở `claude` ở thư mục dự án, gõ "đóng vai V2 trong docs/autodev/CRITICS.md, chạy tình huống S2 trên trang thật".

## Nguồn đúng (so với đây, không so với code)
- Luật: `docs/research/2026-10-26-thi-truong-va-luat.md` (L1–L9) và cấu hình `src/rules/2026.ts`. Điểm chưa xác nhận: `docs/human/hoi-ke-toan-2026-10.md`. Câu nào còn chờ kế toán thì số phải ghi "ước tính" và giải thích; không được trình bày như chắc chắn.
- Số tiền: tính tay theo luật trong bảng "Tình huống" dưới đây. Mọi chỗ trên trang (khối tổng quan, biên lai, bảng, thẻ căn, CSV, chép tờ khai) phải ra cùng số.
- Bố cục: `docs/design/mockup-r8.html` (khổ 390 px và 1280 px).
- Trang thật: https://silver-rp.github.io/thue-cho-thue/. Chụp khổ điện thoại: Chrome headless tối thiểu 500 px, nên nhúng trang vào `<iframe style="width:390px">` trong một file HTML tạm rồi chụp file đó.

## Vai

| Mã | Vai | Thiết bị, thói quen | Điều họ cần nhất | Điều làm họ bỏ đi |
|---|---|---|---|---|
| V1 | Chủ một căn, khoảng 60 tuổi, cho sinh viên thuê 8 triệu/tháng | Điện thoại Android rẻ, cỡ chữ lớn, không biết "TNCN", "GTGT" | Một câu: có phải nộp không, phải làm gì, trước ngày nào | Chữ nhỏ, thuật ngữ, form dài, phải cuộn ngang |
| V2 | Chủ ba căn, tổng khoảng 1,2 tỷ/năm, vượt ngưỡng giữa năm | iPhone Safari, mở trang vài lần mỗi quý | Biết khi nào vượt ngưỡng, nộp bao nhiêu, khai 1 hay 2 lần lợi hơn | Số ở hai chỗ khác nhau; không biết số nào để điền tờ khai |
| V3 | Cho công ty thuê văn phòng, trả trước 3 năm | Máy tính bàn | Biết chọn phân bổ hay tính một lần, công ty có khai thay không (L8) | App bắt khai cả phần công ty đã khai thay; không giải thích lựa chọn |
| V4 | Kế toán dịch vụ làm hộ 5 chủ nhà | Máy tính, nhiều tab, Excel | Xuất số đúng mẫu 01/TTS, tách sổ từng khách, nhập lại được | Phải gõ lại từ đầu; CSV lệch tờ khai; lẫn sổ hai khách |
| V5 | Con cái giúp bố mẹ khai | Máy tính ở nhà mình, điện thoại của bố mẹ | Chuyển sổ giữa hai máy, sao lưu, không mất dữ liệu | Mất sổ khi đổi máy hoặc Safari xoá dữ liệu |
| V6 | Người lạ vào từ Google tháng 01/2027 | Điện thoại, vội, nghi ngờ | Tin được: có căn cứ luật, có ngày cập nhật, không đòi tài khoản | Trang báo "chưa có quy định 2027"; con số không có căn cứ |

## Tình huống (số tính tay)

| Mã | Vai | Ngày "hôm nay" | Đầu vào | Kết quả đúng |
|---|---|---|---|---|
| S1 | V1 | 2027-01-10 | 1 căn, 12 kỳ × 8.000.000 nhận ngày 05 mỗi tháng năm 2026 | Doanh thu 96.000.000 ≤ ngưỡng: không nộp TNCN, GTGT; vẫn **thông báo doanh thu** trước 31/01/2027 (L2), còn 21 ngày |
| S2 | V2 | 2027-01-10 | 3 căn 25 + 45 + 30 triệu/tháng, 12 kỳ năm 2026 | 1.200.000.000; TNCN (1,2 tỷ − 1 tỷ) × 5% = 10.000.000; GTGT 5% × 1,2 tỷ = 60.000.000 nếu tính toàn bộ, 10.000.000 nếu phần vượt (chờ L5); hạn 31/01/2027 |
| S2b | V2 | 2026-10-20 | S2 nhưng mới nhận 10 kỳ | 1.000.000.000 **đúng ngưỡng, chưa vượt** (L1 "≤"); trang phải cảnh báo "kỳ sau sẽ vượt" và số dự kiến |
| S3 | V3 | 2026-03-15 | Trả trước 36 tháng × 30.000.000 = 1.080.000.000, nhận 2026-03-01 | Phân bổ: 360.000.000/năm, dưới ngưỡng mỗi năm. Tính một lần: năm 2026 vượt 80.000.000, TNCN 4.000.000, GTGT 54.000.000 (toàn bộ). Trang phải cho thấy cả hai để chọn |
| S4 | V2 | 2027-01-10 | Tổng 1.000.000.001 | TNCN 0 (làm tròn xuống); GTGT toàn bộ = 50.000.000. Một đồng vượt ngưỡng làm phát sinh 50 triệu: trang phải nói rõ "vách" này |
| S5 | V4 | 2027-01-10 | 2 hợp đồng × 600.000.010, nhận 2026-03-01 | Dòng "Cách tính" và số tiền trên biên lai khớp nhau, khớp bảng và CSV (H-51) |
| S6 | V6 | 2027-02-01 | Máy mới, sổ trống | Năm mặc định 2027 chưa có luật: không được thành ngõ cụt. Phải có đường về năm 2026 và câu giải thích |
| S7 | V5 | 2026-11-01 | Nhập S2 trên máy A, "Xuất JSON", mở máy B, nhập | Máy B ra đúng số S2; "Lần sao lưu cuối" ở máy A đúng ngày |
| S8 | V1 | 2026-07-25 | S1, chọn khai 2 lần | Hạn 31/07/2026 còn 6 ngày; dưới ngưỡng nên chỉ có nghĩa vụ thông báo; trang không được doạ phải nộp |

## Câu hỏi phản biện

### Logic (ghi mức như lỗ hổng)
1. Số ở mọi chỗ (tổng quan, biên lai, bảng, thẻ căn, CSV, chép tờ khai, máy tính nhanh) có bằng nhau và bằng bảng tình huống không?
2. Câu nào trình bày điều chưa xác nhận (L5, khai 2 lần, đồng sở hữu) như chắc chắn?
3. Biên "đúng ngưỡng", "vượt 1 đồng", "hôm nay là hạn", "qua hạn 1 ngày", "đổi năm 31/01 → 01/02" có đúng không?
4. Trả trước nhiều năm: đổi phân bổ ↔ một lần có đổi đúng mọi số và mọi năm liên quan không?

### Trải nghiệm (ghi mức như lỗ hổng)
1. V1 mở trang trên 390 px: trong màn hình đầu có biết "có phải nộp không, bao giờ" không? Có chữ nào phải phóng to mới đọc được không?
2. Có nút nào bấm mà không ra gì, hoặc báo lỗi ở chỗ bị ẩn hay ngoài màn hình không?
3. Có đường nào làm mất sổ mà không cảnh báo (đổi năm, hai tab, sổ mới, nhập file, Safari xoá)?
4. Thuật ngữ (TNCN, GTGT, ngưỡng, phân bổ, 01/TTS) có giải thích ngay tại chỗ không?
5. Sau khi biết số, người dùng có biết bước tiếp (vào eTax, điền ô nào, nộp tiền ở đâu) không?

### Cải thiện (bảng riêng, không đánh số H-xx)
Gợi ý để soát, không bắt buộc. Mỗi đề xuất phải nêu vai nào cần và vì sao:
- Dự báo cả năm từ hợp đồng (ngày vượt ngưỡng, số dự kiến) cho V2 (S2b).
- So sánh khai 1 lần với 2 lần, phân bổ với một lần (S3).
- Cảnh báo "vách" một đồng (S4).
- Đánh dấu hợp đồng có tổ chức khai thay (L8) cho V3.
- Nhiều sổ hoặc hồ sơ theo khách cho V4.
- Bản in hoặc PDF "tờ tóm tắt để đi nộp" cho V1, V5.
- Chế độ chữ lớn cho V1.

## Không làm
- Không thêm vai, tình huống mới vào bảng này khi audit; ghi gợi ý vào audit để leader duyệt.
- Không gọi mạng ngoài, không đọc `.env`, không sửa code.
