# ROADMAP: thue-cho-thue-v1

Hướng đã chọn: **lõi đúng luật trước, giao diện sau, triển khai cuối**. Lý do: sai thuế là mất uy tín; engine + cấu hình có test là nền cho mọi màn hình. Ước tính theo số đo sandbox (chưa có số của dự án này); runner tự học hệ số thật sau mốc đầu.

## R1: Engine thuế và cấu hình luật 2026
- **Mục tiêu:** hàm thuần tính nghĩa vụ năm cho người cho thuê BĐS theo L1–L7, đọc luật từ cấu hình theo năm.
- **Phạm vi:** (1) `src/rules/2026.ts`: ngưỡng, thuế suất TNCN 5%, tỷ lệ GTGT 5% + cờ `unconfirmed`, hạn (31/7, 31/01 năm sau), căn cứ (số điều) cho từng mục; (2) `src/tax/`: doanh thu năm từ các kỳ thanh toán (L6, gồm trả trước nhiều năm: phân bổ hoặc một lần), mức trừ ngưỡng phân cho hợp đồng (L4), TNCN, GTGT, trạng thái "chỉ thông báo doanh thu" khi ≤ ngưỡng (L2); tiền là số nguyên đồng; (3) test ca biên.
- **Chỉ số:** T1, T2, T3, T4.
- **Ước tính:** 3,0 USD, 0,8 giờ máy (sandbox R1/R2 1,5 USD; engine nhiều ca hơn).
- **Xong khi:** `yarn -s test tests/tax` ≥ 15 passed, `yarn -s test tests/rules` ≥ 4 passed, `yarn -s lint` sạch.
- **Phụ thuộc:** không.
- **Pre-mortem:** (a) test tự tính lại bằng chính công thức của code → đúng trên giấy: ca test phải ghi số tiền cụ thể tính tay kèm điều luật; (b) làm tròn bằng số thực sai vài đồng: dùng số nguyên đồng, có ca 1 đồng; (c) số luật rải trong engine: test quét nguồn; (d) hiểu sai "trừ ngưỡng một lần cho tổng các hợp đồng": ca 2 hợp đồng, hợp đồng đầu chưa đủ ngưỡng.

## R2: Máy tính thuế (giao diện một căn)
- **Mục tiêu:** trang dùng được ngay không cần đăng nhập: nhập tiền thuê/kỳ, số kỳ, trả trước → thấy thuế, hạn, căn cứ.
- **Phạm vi:** form tiếng Việt định dạng tiền VNĐ; kết quả có giải thích từng bước và số điều luật; GTGT ghi "ước tính" khi `unconfirmed`; câu "không thay thế tư vấn thuế"; mobile trước; test UI bằng jsdom/happy-dom.
- **Chỉ số:** T5, T3, T4.
- **Ước tính:** 3,0 USD, 0,8 giờ máy.
- **Xong khi:** `yarn -s test tests/ui` ≥ 6 passed.
- **Phụ thuộc:** R1.
- **Pre-mortem:** (a) UI tự tính lại thay vì gọi engine → lệch: test so kết quả UI với engine; (b) nhập "12.000.000" bị hiểu thành 12: ca nhập có dấu chấm/phẩy; (c) chỉ đẹp trên desktop: test viewport hẹp không tràn ngang (kiểm class/bố cục tối thiểu).

## R3: Sổ doanh thu nhiều căn, nhiều hợp đồng
- **Mục tiêu:** người dùng ghi căn, hợp đồng, các lần nhận tiền trong năm; app cộng doanh thu và tính thuế cả năm.
- **Phạm vi:** mô hình căn/hợp đồng/kỳ thu; lưu `localStorage` có phiên bản schema; xuất/nhập JSON sao lưu; chọn hợp đồng được trừ ngưỡng (L4); cảnh báo vượt ngưỡng trong năm.
- **Chỉ số:** T6, T4.
- **Ước tính:** 3,5 USD, 1,0 giờ máy.
- **Xong khi:** `yarn -s test tests/ledger` ≥ 8 passed.
- **Phụ thuộc:** R2.
- **Pre-mortem:** (a) mất dữ liệu khi đổi schema: test nạp dữ liệu phiên bản cũ; (b) nhập JSON hỏng làm trắng sổ: test file hỏng giữ nguyên dữ liệu cũ; (c) tổng năm tính theo ngày ký thay vì ngày nhận tiền: ca hợp đồng vắt qua năm.

## R4: Hạn khai, nhắc lịch, xuất số liệu tờ khai
- **Mục tiêu:** người dùng biết khai khi nào, có nhắc trên lịch điện thoại, có sẵn số để điền trên eTax Mobile.
- **Phạm vi:** lịch hạn theo lựa chọn khai 1 lần/2 lần (L7); tải file `.ics`; bảng số liệu theo trường 01/TTS và phụ lục 01-1/BK-TTS (CSV + nút chép); hướng dẫn ngắn các bước trên eTax Mobile.
- **Chỉ số:** T7, T4.
- **Ước tính:** 2,5 USD, 0,7 giờ máy.
- **Xong khi:** `yarn -s test tests/export` ≥ 6 passed.
- **Phụ thuộc:** R3.
- **Pre-mortem:** (a) `.ics` sai múi giờ làm nhắc lệch ngày: ca kiểm `DTSTART` dạng ngày; (b) CSV tiếng Việt vỡ dấu khi mở bằng Excel: có BOM UTF-8; (c) hạn 31/01 rơi vào năm sai: ca năm tính thuế 2026 → 31/01/2027.

## R5: Trang công khai, SEO, triển khai GitHub Pages
- **Mục tiêu:** bản thật trên `https://silver-rp.github.io/thue-cho-thue/`, tìm được trên Google, deploy chỉ khi test xanh.
- **Phạm vi:** nội dung giải thích luật 2026 (FAQ, nguồn), meta/OG, `sitemap.xml`, `robots.txt`; `base` đúng cho Pages; workflow Actions: lint + test + build rồi deploy Pages; hook analytics theo cấu hình (tắt mặc định); test build (kích thước, không gọi mạng lạ).
- **Chỉ số:** T8, T9, T4.
- **Ước tính:** 3,0 USD, 0,8 giờ máy (sandbox R11 Pages 2,4 USD thực tế).
- **Xong khi:** `yarn -s build && yarn -s test tests/build` xanh; lệnh T9 exit 0.
- **Phụ thuộc:** R4.
- **Pre-mortem:** (a) đường dẫn tài nguyên sai dưới `/thue-cho-thue/` → trang trắng: smoke kiểm có nội dung, không chỉ 200; (b) deploy chạy dù test đỏ: workflow `needs: test`; (c) Pages chưa bật → smoke đỏ: workflow dùng `actions/configure-pages` với `enablement`, nếu vẫn lỗi thì dừng hỏi leader.

## R6: Vá trước khi quảng bá (thêm 2026-10-26, leader chọn)
- **Mục tiêu:** người dùng thật không mất sổ, không thấy con số thuế gây hiểu nhầm, không được nhắc hạn đã qua.
- **Phạm vi (4 task):** (1) kho an toàn: kho hỏng/phiên bản mới thì chặn ghi đè khoá chính và có nút lấy bản dự phòng (H-10); `localStorage` bị chặn thì báo tiếng Việt, có test `main.ts` (H-12); (2) hai tab: listener `storage` + kiểm phiên bản trước khi ghi, tab cũ báo "sổ đã đổi, tải lại" thay vì ghi đè (H-11); (3) tiền: dòng "Tổng thuế" ở máy tính, sổ, bảng xuất mang nhãn "ước tính" khi GTGT `unconfirmed` (H-14); thông báo lỗi sổ phân biệt lỗi số tiền với năm chưa có quy định (H-09); (4) hạn: so với hôm nay, hạn đã qua có nhãn "đã qua" và `.ics` bỏ báo thức của hạn đó (H-20); năm đang xem không có kỳ thu thì không hiện hạn/nút `.ics`/bảng (H-19).
- **Chỉ số:** T4, T5, T6, T7 (giữ xanh, số test tăng).
- **Ước tính:** 4,0 USD, 1,0 giờ máy (R3/R4 thật 5,1/4,6 USD; phạm vi nhỏ hơn, toàn sửa).
- **Xong khi:** `yarn -s lint`, `yarn -s build`, `yarn -s test` xanh; mỗi lỗ trên có ít nhất một test tái hiện đúng ca trong audit (đỏ trước khi sửa).
- **Phụ thuộc:** R5.
- **Pre-mortem:** (a) test gọi thẳng hàm lưu thay vì đi qua DOM → H-10 "đã sửa" trên giấy: ca phải dùng `mountLedger` rồi thao tác thêm căn và so chuỗi khoá chính; (b) hai tab giả lập bằng hai biến trỏ cùng object → không thấy ghi đè: hai `mountLedger` trên cùng `FakeStorage` và bắn sự kiện `storage`; (c) "hôm nay" lấy `new Date()` trong code → test lệch theo ngày chạy: `today` truyền vào, test cố định ngày.

- **Phản biện:** `proposals/R6.md` (A → A1 → A1.1).

## R7: Dùng được qua mùa khai 2027 (thêm 2026-10-26, leader duyệt ~7 USD)
- **Mục tiêu:** tháng 1/2027 người dùng mở trang vẫn khai được năm 2026, thấy đúng hạn còn lại, và giữ được sổ.
- **Phạm vi (4 task):** (1) năm: mặc định = năm đang khai (trước 01/02 là năm trước), ô chọn năm trong các năm có luật, năm chưa có luật thì báo rõ, không bịa luật 2027; `today` truyền vào `main.ts` (H-31); (2) hạn: máy tính một căn có nhãn "đã qua"; FAQ không viết cứng "31/07/2026" ngoài `data-rule` (H-20); (3) sổ: bảng "Tổng năm" không hiện hạn khi năm không có doanh thu, có test nhãn "đã qua" (H-27); (4) nhập lại được file "Tải bản sổ cũ" khi đúng schema sổ, file lạ vẫn bị từ chối (H-28).
- **Chỉ số:** T4, T5, T6, T7, T8 (giữ xanh).
- **Ước tính:** 4,0 USD, 1,0 giờ máy (R6 thật: worker 2,25 + supervisor 1,64 + plan 1,24).
- **Xong khi:** `yarn -s lint`, `yarn -s build`, `yarn -s test` xanh; mỗi lỗ có ca tái hiện đúng cột "tái hiện" của audit (đỏ trước khi sửa).
- **Phụ thuộc:** R6.
- **Pre-mortem:** (a) test phụ thuộc ngày chạy: ca cố định 2027-01-15 và 2027-03-01; (b) FAQ còn ngày cứng: test quét bản build; (c) nới kiểm nhập làm lọt file lạ: ca file lạ.
- **Phản biện:** `proposals/R7.md` (A → A1 → A1.1).

## Tổng

| # | Mốc | Phụ thuộc | Chỉ số | USD | Giờ máy |
|---|---|---|---|---|---|
| 1 | R1 | — | T1, T2, T3, T4 | 3,0 | 0,8 |
| 2 | R2 | R1 | T5, T3, T4 | 3,0 | 0,8 |
| 3 | R3 | R2 | T6, T4 | 3,5 | 1,0 |
| 4 | R4 | R3 | T7, T4 | 2,5 | 0,7 |
| 5 | R5 | R4 | T8, T9, T4 | 3,0 | 0,8 |
| 6 | R6 | R5 | T4, T5, T6, T7 | 4,0 | 1,0 |
| 7 | R7 | R6 | T4, T5, T6, T7, T8 | 4,0 | 1,0 |
| | | | | **23,0** | **6,1** |

## Thứ tự cắt
R4 phần `.ics` → R3 phần nhiều căn (giữ một căn) → R4 phần xuất CSV (giữ bảng số trên màn hình).

## Không cắt
Engine đúng luật + cấu hình theo năm (R1); máy tính (R2); dữ liệu chỉ ở trình duyệt; câu miễn trừ; triển khai (R5).

## Việc chỉ người làm
Xác nhận L5 (cơ sở tính GTGT) và mẫu tờ khai hiện hành với Cục Thuế/kế toán; chọn dịch vụ analytics/form và đưa mã; đọc duyệt nội dung trang trước khi quảng bá.

## Kế hoạch cũ được thay
Không có (dự án mới).
