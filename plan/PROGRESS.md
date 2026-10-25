# Nhật ký mốc

## R1
- dev-01 DONE (1 vòng, commit 9c7dbd4). Ghi chú reviewer: test quét `src/tax` chạy rỗng đến khi dev-02 thêm file; dev-02 nên kiểm glob bắt được chuỗi cấm.
- dev-02 DONE (1 vòng, commit 1f72816). Ghi chú reviewer: gọn phần kiểm `years` trong `shareInYear`; thiếu test cho `mode` không hợp lệ và `years` lẻ.
- dev-03 DONE (1 vòng, commit 5436343). Ghi chú reviewer: test căn cứ chỉ kiểm pit/vat; `year` của computeAnnual chưa đối chiếu `rules.year`.
- dev-04 DONE (1 vòng, commit 1137776). 25 test trong tests/tax, 33 test toàn bộ.

## R2
- dev-01 DONE (1 vòng, commit b0d0e5c). Ghi chú reviewer: `parseVnd("0.000")` ra 0 và `"007"` ra 7 (đúng đặc tả); dev-03 nên cân nhắc cảnh báo khi doanh thu 0. `formatVnd` không xử lý NaN/số lẻ (ngoài tiêu chí).
- dev-02 DONE (1 vòng, commit 51d1676). Ghi chú reviewer: `periodsInYear` > 12 vẫn tính (dồn vào tháng 12), dev-03 nên giới hạn ở form; lỗi từ engine lẫn tên trường kỹ thuật.
- dev-03 DONE (1 vòng, commit e3c1d94). `calculate` nhận thêm tham số `rulesOverride` (cho test luật giả). Ghi chú reviewer: số kỳ 0 vẫn được chấp nhận.
- dev-04 DONE (1 vòng, commit 16cbe03). 7 test đầu-cuối, không lộ lệch UI ↔ engine; tests/ui 47 passed, toàn bộ 80 passed.

## R3
- dev-01 DONE (1 vòng, commit 5718f61). Phép sửa sổ nằm ở `src/ledger/ops.ts`. `summarizeYear` ném lỗi khi `rules.year` khác `year` (UI dev-03 phải bắt). Ghi chú reviewer: `findCrossing` O(n²) không đáng kể.
- dev-02 DONE (1 vòng, commit b86f603). API: `parseLedger`, `loadLedger`, `saveLedger`, `exportLedger`, `importLedger`. Ghi chú reviewer: nếu `loadLedger` trả `error`, UI không tự ghi sổ rỗng khi mở trang; khoá dự phòng đã có thì lần hỏng sau không sao lưu thêm, UI nên báo rõ.
- dev-03 DONE (1 vòng, commit 01f1dd2). Sổ gắn vào `#ledger` trong `index.html`; `mountLedger` thêm tham số `confirm`. Ghi chú reviewer: `render()` vẽ lại toàn bộ sau mỗi thay đổi hợp lệ (mất dữ liệu gõ dở ở form khác); chưa có test UI cho trả trước.
- dev-04 DONE (1 vòng, commit 577b750). 6 ca đầu-cuối trong `tests/ledger/ui-e2e.test.ts`, không lộ lệch UI ↔ engine, không sửa `src/`. tests/ledger 41 passed, toàn bộ 134 passed. Ghi chú reviewer: regex thông báo lỗi ở ca nhập file sai quá rộng.

## R4
- dev-01 DONE (1 vòng, commit 7793c20). `src/export/ics.ts` (`deadlinesToIcs`, `icsFilename`, `nextDay`); `filingMode` trong sổ (model/ops/schema/summary/backup; `backup.ts` ngoài danh sách phạm vi nhưng cần để xuất giữ `filingMode`). Ghi chú reviewer: `deadlinesToIcs` danh sách rỗng vẫn sinh VCALENDAR không VEVENT, dev-03 không hiện nút tải khi không có hạn.
- dev-02 DONE (1 vòng, commit 7d69429). `src/export/forms.ts`, `declaration.ts`, `csv.ts`. Điều chỉnh (a): `Declaration.annex` là `Row[]` kèm `annexHeader`/`annexTitle` (không phải `Row[][]`), mỗi dòng `main` là `[mã hoặc "", tên trường, giá trị]`; mọi `code` của 01/TTS là `null`. Ghi chú reviewer: `toCsv` ném `RangeError` với số âm/lẻ, dev-03 bắt lỗi nếu có đường dẫn đưa số âm vào.
- dev-03 DONE (1 vòng, commit ca9c1ab). `src/ui/export.ts` (`mountExport`, thêm tham số `rules` cho test), gắn vào `src/ui/ledger.ts`. Ghi chú reviewer: `setFilingMode` lỗi thì radio không vẽ lại về lựa chọn cũ; `DISCLAIMER` hiện hai lần trên trang sổ; `DTSTAMP` mặc định là 00:00:00Z của `today`; `mountExport` độc lập chưa có test cho `setFilingMode` trả lỗi.
- dev-04 DONE (1 vòng, commit 37fc1f5). `tests/export/e2e.test.ts` 5 ca đầu-cuối qua DOM, không lộ lệch UI ↔ engine; `LedgerMountOptions` thêm `download?`/`copy?` chuyển tiếp xuống `mountExport`. tests/export 28 passed, toàn bộ 165 passed.

## R5
- dev-01 DONE (1 vòng, commit 494c018). `base: "/thue-cho-thue/"`, `tests/build/build.test.ts` (6 test, build vào thư mục tạm). Điều chỉnh (a): tắt `build.modulePreload.polyfill` vì polyfill chứa `fetch(`. Ghi chú reviewer: test happy-dom `eval` bundle nên chỉ đúng khi bundle một chunk không import/export.
- dev-02 DONE (1 vòng, commit 8c7afd8). `index.html` (h1, 8 FAQ `<details>`, Nguồn, meta/OG), `public/robots.txt`, `public/sitemap.xml`, `tests/build/content.test.ts` (nguồn + bản build). Ghi chú reviewer: mục Nguồn viết cứng "01 tỷ đồng" ngoài span `data-rule`; `data-rule=deadline` chỉ so hạn 31/01/2027, chưa so hạn 31/07/2026; câu "ước tính, chưa xác nhận" viết cứng nên test không đổi khi `vat.unconfirmed` thành false.

## Đề xuất chờ duyệt
