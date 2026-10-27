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

## Tình huống ràng buộc thực tế (S9–S28)

Mỗi tình huống ghi bốn phần:
- **Ràng buộc:** điều kiện đời thật.
- **Nhập:** cách nhập vào app.
- **Đúng:** kết quả tính tay theo engine hiện tại (làm tròn xuống từng hợp đồng, trừ ngưỡng theo thứ tự chọn, doanh thu theo ngày nhận tiền).
- **Soát:** chỗ dễ sai.

Chỗ ghi "(chờ Kn)" nghĩa là kết quả phụ thuộc câu hỏi kế toán số n trong `docs/human/hoi-ke-toan-2026-10.md`. Gặp chỗ đó, trang phải ghi "ước tính", nói rõ giả định, và không được trình bày như chắc chắn.

### Doanh thu: tính cái gì, vào năm nào

**S9: chọn hợp đồng trừ ngưỡng (V2, hôm nay 2027-01-10)**
- **Ràng buộc:** hai căn, hợp đồng A thu 700.000.000/năm, hợp đồng B thu 500.000.000/năm.
- **Nhập:** đổi lựa chọn "hợp đồng được trừ ngưỡng trước" từ B sang A.
- **Đúng:**
  - Chọn B trước: B được trừ 500.000.000, A được trừ 500.000.000; TNCN của A là 10.000.000, của B là 0.
  - Chọn A trước: A được trừ 700.000.000, B được trừ 300.000.000; TNCN của A là 0, của B là 10.000.000.
  - Tổng TNCN luôn là 10.000.000.
- **Soát:** bảng, thẻ căn và CSV 01-1/BK đổi theo lựa chọn. Tổng không đổi. Trang phải nói rõ lựa chọn này không làm đổi tổng tiền phải nộp.

**S10: làm tròn từng hợp đồng (V4, hôm nay 2027-01-10)**
- **Ràng buộc:** ba hợp đồng, mỗi hợp đồng thu 333.333.334; tổng 1.000.000.002.
- **Đúng:**
  - TNCN 0: phần vượt chỉ 2 đồng, nằm ở hợp đồng thứ ba.
  - GTGT tính toàn bộ: mỗi hợp đồng 16.666.666, tổng 49.999.998. Nếu làm tròn trên tổng thì ra 50.000.000.
- **Soát:** mọi chỗ trên trang cùng ra 49.999.998, và dòng "Cách tính" không tự nhân lại trên tổng (H-51). Làm tròn theo từng hợp đồng hay trên tổng (chờ K11).

**S11: tiền thuê tháng 12 nhận sang năm sau (V2, hôm nay 2027-01-10)**
- **Ràng buộc:** một căn 85.000.000/tháng. Tháng 1 đến 11 nhận đúng tháng; tiền tháng 12 nhận ngày 2027-01-03.
- **Đúng:**
  - Theo ngày nhận: năm 2026 có 935.000.000, dưới ngưỡng, chỉ thông báo; khoản 85.000.000 tính vào năm 2027.
  - Nếu tính theo kỳ thuê: năm 2026 có 1.020.000.000, TNCN 1.000.000, GTGT 51.000.000.
- **Soát:** một ngày nhận tiền đổi 52 triệu tiền thuế. Trang phải nói "doanh thu tính theo ngày nhận tiền" ngay tại ô ngày (chờ K12).

**S12: tiền cọc (V2, hôm nay 2027-01-10)**
- **Ràng buộc:** S2 cộng tiền cọc ba căn 50 + 90 + 60 = 200.000.000. Tiền cọc sẽ trả lại khi hết hợp đồng.
- **Nhập:** người dùng ghi tiền cọc thành một kỳ thu.
- **Đúng:**
  - Không tính cọc: TNCN 10.000.000, GTGT 60.000.000.
  - Ghi nhầm cọc vào: TNCN 20.000.000, GTGT 70.000.000.
- **Soát:** app chưa có loại "tiền cọc". Ít nhất phải có câu nhắc "không ghi tiền cọc, trừ khi bị giữ lại" (chờ K13).

**S13: điện nước thu hộ (V2, hôm nay 2027-01-10)**
- **Ràng buộc:** ba căn, mỗi căn thu 32.000.000 tiền thuê và 3.000.000 điện nước mỗi tháng.
- **Đúng:**
  - Chỉ tính tiền thuê: 1.152.000.000, TNCN 7.600.000, GTGT 57.600.000.
  - Gộp cả điện nước: 1.260.000.000, TNCN 13.000.000, GTGT 63.000.000.
- **Soát:** trang có cho tách hai khoản này không, hay có nói phải nhập khoản nào không (chờ K14).

**S14: người thuê bỏ đi, nợ tiền (V2, hôm nay 2027-01-10)**
- **Ràng buộc:** hợp đồng 12 tháng × 40.000.000, nhưng người thuê chỉ trả tháng 1 đến 7.
- **Đúng:** doanh thu 280.000.000, bằng số tiền thật sự đã nhận.
- **Soát:** app không được tự sinh doanh thu dự kiến từ ngày kết thúc hợp đồng. Dự báo, nếu có, phải tách riêng phần đã nhận và phần còn nợ.

**S15: một căn, hai người thuê, có tháng trống (V1, hôm nay 2027-01-10)**
- **Ràng buộc:** người thuê 1 từ tháng 1 đến 4, 20.000.000/tháng. Tháng 5, 6 bỏ trống. Người thuê 2 từ tháng 7 đến 12, 22.000.000/tháng.
- **Đúng:** 212.000.000 trong 10 kỳ thu; không phải nộp, chỉ thông báo.
- **Soát:** thẻ căn cộng đủ cả hai hợp đồng. Ô "Ngày kết thúc" của hợp đồng 1 không làm mất kỳ thu (H-55).

**S16: trả trước, phân bổ có số lẻ (V3, hôm nay 2026-06-20)**
- **Ràng buộc:** nhận 1.000.000.000 ngày 2026-06-15 cho 3 năm, chọn phân bổ.
- **Đúng:** 2026 có 333.333.334 (phần lẻ dồn vào năm đầu), 2027 và 2028 mỗi năm 333.333.333.
- **Soát:**
  - Đổi ô năm sang 2027 thì chưa có quy định, nhưng phải nói rõ phần doanh thu đã phân bổ cho 2027.
  - "3 năm" là năm dương lịch hay 36 tháng tính từ tháng 6 (chờ K15).

**S17: trả trước một lần, cộng một căn khác (V3, hôm nay 2027-01-10)**
- **Ràng buộc:** nhận 1.080.000.000 trả trước 3 năm, tính một lần, cộng một căn 10.000.000/tháng × 12.
- **Đúng:**
  - Tính một lần: 1.200.000.000, TNCN 10.000.000, GTGT 60.000.000.
  - Đổi sang phân bổ: 480.000.000, không phải nộp.
- **Soát:** lựa chọn này đáng 70 triệu. Trang phải hiện cả hai kết quả trước khi người dùng chọn (S3, chờ K8).

### Hạn khai và thời gian

**S18: khai 2 lần, vượt ngưỡng ở nửa cuối năm (V2, hôm nay 2026-07-20)**
- **Ràng buộc:** S2 chia đều, nửa đầu năm thu 600.000.000.
- **Đúng:** hạn kỳ 1 là 31/07/2026. App chưa tính số tiền riêng cho kỳ 1.
- **Soát:** trang không được nói "kỳ 1 không phải nộp" như chắc chắn. Phải nói "số kỳ 1 chờ xác nhận cách tính" (chờ K4).

**S19: hạn rơi vào Chủ nhật (V6, hôm nay 2027-02-01, thứ Hai)**
- **Ràng buộc:** 31/01/2027 là Chủ nhật.
- **Đúng:** app ghi năm 2026 "đã qua hạn", và năm mặc định đã chuyển sang 2027.
- **Soát:** nếu được dời hạn thì hôm nay mới là hạn cuối. Trang phải giữ được đường về năm 2026 và không làm người dùng hoảng (S6, chờ K6).

**S20: nộp muộn (V2, hôm nay 2027-03-15)**
- **Ràng buộc:** S2 phải nộp 70.000.000 mà chưa khai.
- **Đúng:**
  - Quá hạn 43 ngày.
  - Nếu tiền chậm nộp là 0,03%/ngày: 70.000.000 × 0,03% × 43 = 903.000.
- **Soát:**
  - Trang ghi rõ đã quá hạn bao nhiêu ngày và việc cần làm ngay.
  - Không tự tính tiền phạt khi chưa có căn cứ trong cấu hình luật (chờ K16).

**S21: tab mở qua đêm đổi năm (V5, đồng hồ 2027-01-31 23:50 → 2027-02-01 00:05)**
- **Ràng buộc:** tab vẫn mở, không chuyển đi tab khác.
- **Đúng:** sau 00:00, dòng đếm ngày phải đổi, không còn "hôm nay là hạn".
- **Soát:** app hiện chỉ đọc lại ngày khi quay lại tab (H-58). Đây là ca đúng thời điểm nhiều người khai nhất.

**S22: dữ liệu năm 2025 (V6, hôm nay 2026-11-01)**
- **Ràng buộc:** nhập các kỳ thu ngày 2025, ví dụ để khai bù năm cũ.
- **Đúng:** năm 2025 chưa có quy định trong app (năm đó áp quy định cũ, ngưỡng khác năm 2026; không ghi con số khi chưa có căn cứ).
- **Soát:**
  - Kỳ thu 2025 không bị cộng vào năm 2026.
  - Không áp luật 2026 cho năm 2025.
  - Trang nói rõ "app chỉ tính từ năm 2026".

### Dữ liệu và thiết bị

**S23: hai máy, nhập đè (V5, hôm nay 2026-11-10)**
- **Ràng buộc:**
  - Ngày 01/11: máy A xuất JSON.
  - Ngày 05/11: máy B thêm 2 kỳ thu.
  - Ngày 10/11: trên máy B, nhập file JSON từ máy A.
- **Đúng:** trước khi thay, app phải báo "sẽ thay sổ hiện tại (có 2 kỳ thu mới hơn file)" và gợi ý xuất bản sao lưu trước.
- **Soát:** không có đường nào làm mất 2 kỳ thu mà không hỏi.

**S24: Safari chế độ riêng tư hoặc bị chặn lưu (V6)**
- **Ràng buộc:** iPhone, chế độ riêng tư, hoặc `localStorage` ném lỗi.
- **Đúng:** máy tính nhanh vẫn chạy. Sổ báo rõ "không lưu được trên trình duyệt này" và chỉ cách xuất JSON.
- **Soát:** không có lỗi im lặng, và không có nút "Lưu" giả vờ thành công.

**S25: nhiều cách gõ số tiền (V1, V4)**
- **Nhập:** gõ lần lượt `25000000`, `25.000.000`, `25,000,000`, `25 000 000 đ`, `25tr`, `1,2 tỷ`, `-5000000`, `0`, `9007199254740993`.
- **Đúng:**
  - Các cách gõ hợp lệ đều ra 25.000.000, hoặc báo lỗi cụ thể.
  - `25,000,000` không bao giờ thành 25 đồng hay 25.000.
  - Số âm, số 0, số quá lớn bị từ chối, kèm câu giải thích.
- **Soát:** máy tính nhanh và ô kỳ thu trong sổ xử lý giống nhau.

### Xuất số liệu và tờ khai

**S26: kế toán làm hộ 5 khách (V4, hôm nay 2027-01-15)**
- **Ràng buộc:** 5 chủ nhà, mỗi người một sổ, làm trên cùng một máy.
- **Đúng:** hiện app chỉ có một sổ mỗi trình duyệt. File xuất phải có tên phân biệt được, ví dụ gồm tên căn đầu tiên và năm, để không nhập nhầm sổ của khách khác.
- **Soát:** tên file khi xuất. Đây là đề xuất cải thiện "nhiều hồ sơ".

**S27: chép số sang eTax và mở CSV bằng Excel (V4)**
- **Ràng buộc:** Excel trên Windows. Ô số trên eTax chỉ nhận chữ số.
- **Đúng:**
  - CSV mở bằng Excel không lỗi dấu tiếng Việt (cần UTF-8 có BOM).
  - Số trong CSV là số, không phải chuỗi có dấu chấm và "đ".
  - Nút "chép" cho số dán thẳng vào eTax được.
- **Soát:** mở file thật bằng Excel hoặc LibreOffice, rồi dán thử vào một ô chỉ nhận số.

**S28: chữ lớn, màn hẹp, đọc bằng trình đọc màn hình (V1)**
- **Ràng buộc:** màn hình 360 px, cỡ chữ hệ thống 200%, TalkBack.
- **Đúng:**
  - Không cuộn ngang.
  - Nút cao từ 44 px.
  - Khối tổng quan được đọc thành một câu trọn ý, ví dụ "Phải nộp khoảng 70 triệu, hạn 31/01/2027".
  - Bảng có tiêu đề cột đọc được.
- **Soát:** chụp ở 360 px với `font-size: 200%`, và kiểm thuộc tính `aria` của khối tổng quan.

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
