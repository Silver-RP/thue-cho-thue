# Trạng thái dự án (đọc trước plan mốc)

Cập nhật: 2026-10-27 · Nguồn: audit R8–R9 (`docs/audits/2026-10-27-3.md`), duyệt R9 (#38), duyệt R8 (#35), đóng H-38 (`2026-10-27-2`), audit R7 (`docs/audits/2026-10-27.md`), duyệt R7 (#29), audit R6 (`docs/audits/2026-10-26-4.md`), audit R4–R5 (`docs/audits/2026-10-26-2.md`), audit R1–R3 (`docs/audits/2026-10-26.md`), duyệt R4 (#15), duyệt R5 (#18), đóng H-08 (`2026-10-26-3`), duyệt R6 (#24)

## Mốc
| Mốc | Trạng thái | Ghi chú |
|---|---|---|
| R1 | merged (#5) | Engine thuế + cấu hình luật 2026; 4/4 task PASS vòng 1; T1–T4 đạt |
| R2 | merged (#8) | Máy tính thuế một căn; 4/4 task PASS vòng 1; T5 đạt |
| R3 | merged (#11) | Sổ doanh thu nhiều căn; 4/4 task PASS vòng 1; T6 đạt |
| R4 | merged (#15) | Hạn khai, `.ics`, bảng 01/TTS + 01-1/BK-TTS, CSV, chép, hướng dẫn eTax; 4/4 task PASS vòng 1; T7 đạt |
| R5 | merged (#18) | Trang công khai, SEO, workflow deploy Pages, `tests/build`; 4/4 task PASS vòng 1; T8 đạt; T9 đạt sau khi leader bật Pages (H-08 đóng) |
| R6 | merged (#24) | Vá trước khi quảng bá: kho hỏng khoá ghi, hai tab, `localStorage` bị chặn, nhãn "ước tính", lỗi tổng năm đúng nguyên nhân, hạn "đã qua", năm không kỳ thu; 4/4 task PASS vòng 1; đóng H-09..H-12, H-14, H-19 |
| R7 | merged (#29) | Qua mùa khai 2027: năm mặc định `filingYear(today)`, ô chọn năm, báo rõ năm chưa có luật; "đã qua" ở máy tính và FAQ; tổng năm không hạn khi không doanh thu; nhập lại bản sổ cũ; 4/4 task PASS vòng 1; đóng H-20, H-27, H-28; H-31 còn luật 2027 |
| R8 | merged (#35) | Giao diện theo mockup: token, khung (thanh trên + ô năm, menu bên, thanh dưới), tổng quan năm + thanh ngưỡng, biên lai "Cách tính", thẻ hạn đếm ngày, thẻ căn, tính nhanh; một nguồn số `onSummary`; ô ngày `type="date"`; 4/4 task PASS vòng 1; đóng H-13; thêm H-48 |
| R9 | merged (#38) | Không mất sổ, đúng ngày: đổi năm giữ chữ gõ dở + cờ stale, huỷ nhập file khi gỡ; `persist()`, "Lần sao lưu cuối", nhắc 30 ngày; ngày theo giờ VN, mốc đổi năm từ `deadlines.once`, đọc lại ngày khi quay lại tab; làm chặt ca R7; 4/4 task DONE (2 task 2 vòng); đóng H-39..H-42; H-43 hạ thấp; thêm H-49 |

## Mục tiêu và tiêu chí
Goal `thue-cho-thue-v1` (`docs/goals/thue-cho-thue-v1/goal.json`): web app tĩnh giúp người cho thuê 1–5 căn tự lo thuế cho thuê theo luật 2026. Đạt 100% theo chỉ số (9/9: T1–T9, 2026-10-26); theo khối lượng việc thật ~67% (audit R8–R9; supervisor ước ~68%). Ba điều (audit R8–R9): máy tính ~72%, sổ ~85% code / ~62% chứng minh, nhắc hạn + xuất + Pages ~55% gộp (`.ics` ~80%, xuất ~55%, Pages bật và kiểm tay một lần; mẫu tờ khai chưa xác nhận, H-04; đo người dùng/Lighthouse chưa làm, H-32).

| Chỉ số | Lệnh | Ngưỡng | Hiện tại |
|---|---|---|---|
| T1 | `yarn -s test tests/tax` | 0 failed, ≥ 15 passed | 25 passed |
| T2 | `yarn -s test tests/rules` | 0 failed, ≥ 4 passed | 7 passed |
| T3 | `yarn -s lint` | exit 0 | exit 0 |
| T4 | `yarn -s test` | 0 failed | 389 passed |
| T5 | `yarn -s test tests/ui` | 0 failed, ≥ 6 passed | 139 passed |
| T6 | `yarn -s test tests/ledger` | 0 failed, ≥ 8 passed | 61 passed |
| T7 | `yarn -s test tests/export` | 0 failed, ≥ 6 passed | 34 passed |
| T8 | `yarn -s build && yarn -s test tests/build` | build 0, 0 failed, gzip ≤ 100 KB | build 0, 73 passed, ~23 KB |
| T9 | `curl -fsS https://silver-rp.github.io/thue-cho-thue/ \| grep -q "Thuế cho thuê"` | exit 0 | exit 0 (Pages bật; smoke `scripts/smoke-pages.sh` sạch) |

## Kiến trúc hiện nay
- `src/rules/`: `types.ts` (`TaxRules`), `2026.ts` (mọi số luật + căn cứ L1–L7), `index.ts` (`getRules(year)`, năm chưa có thì ném lỗi).
- `src/tax/`: `money.ts` (tiền nguyên đồng, `applyRateBps` bằng BigInt, làm tròn xuống), `revenue.ts` (doanh thu năm theo ngày nhận, trả trước `lump`/`allocate`), `annual.ts` (`computeAnnual`: trừ ngưỡng theo `deductionOrder`, TNCN, GTGT, `status`, hạn, căn cứ), `deadlines.ts` (hạn khai 1/2 lần, hạn thông báo doanh thu).
- `src/ui/`: `money.ts` (`parseVnd`, `formatVnd` → `12.000.000 đ`), `calculator.ts` (`calculate`), `form.ts` (`mountCalculator`), `ledger.ts` (`mountLedger(root, { year, storage, rules?, newId?, today?, confirm? })`, DOM thuần), `style.css` (17 token mockup ở `:root`, mobile trước, `@media (max-width: 760px)`, bảng trong `.table-scroll`). R8: `overview.ts` (`renderOverview`: câu trả lời, `.meter`, biên lai `ol.receipt`), `due.ts` (`daysUntil`, `renderDue`: thẻ hạn + `.ics`); `mountLedger` gọi `onSummary(outcome)` sau mỗi lần vẽ, `startApp` vẽ `#overview`/`#deadlines` từ đó; thẻ căn `.lg-cards`, ô ngày `type="date"`; máy tính có radio `name="filing"`, thẻ `.mini`.
- `src/ledger/`: `model.ts` (kiểu sổ, `emptyLedger`), `ops.ts` (thêm/sửa/xoá thuần, `cascade`, `setDeductionChoice`), `summary.ts` (`ledgerToPayments`, `summarizeYear` gọi `computeAnnual`, ném lỗi khi `rules.year` khác `year`, `thresholdWarning`), `schema.ts` (`parseLedger` + `migrations`), `storage.ts` (khoá `thue-cho-thue:ledger`, dự phòng `thue-cho-thue:ledger:backup`), `backup.ts` (xuất/nhập JSON có `app: "thue-cho-thue"`).
- `src/export/` (R4, thuần): `ics.ts` (`deadlinesToIcs`, sự kiện cả ngày, `VALARM` -7/-1 ngày, gấp 75 octet, `nextDay` không dùng `Date`), `forms.ts` (`form01TTS`: cấu hình trường 01/TTS + cột 01-1/BK-TTS, `confirmed: false`, `code: null`), `declaration.ts` (`buildDeclaration` chỉ đọc `YearSummary`), `csv.ts` (BOM, CRLF, RFC 4180, tiền tố `'` chặn công thức). `src/ui/export.ts`: `mountExport` (chọn khai 1/2 lần, hạn, tải `.ics`/CSV, chép, hướng dẫn eTax), gắn từ `ledger.ts`. Sổ có `filingMode?` theo năm, `summarizeYear` truyền vào `computeAnnual`.
- R7: `src/main.ts` chỉ đọc `localStorage` trong `try` rồi gọi `startApp(document, { today: localToday(), storage })` (`src/start.ts`: `filingYear` — trước 01/02 là năm trước, `localToday` — nơi duy nhất đọc đồng hồ, ô chọn năm `select[name="tax-year"]` từ `availableYears()` của `src/rules/index.ts` cộng năm đang khai, gỡ rồi gắn lại máy tính/sổ khi đổi năm, gắn "đã qua" vào span `data-rule="deadline"` của FAQ); `mountCalculator`/`mountLedger` trả hàm gỡ, nhận `today`, `fallbackYear`, `onSwitchYear`. `startApp` gọi `analyticsFromEnv().track("pageview")` (`src/analytics.ts`, tắt khi không có `VITE_ANALYTICS_URL`; file duy nhất gọi mạng). Test UI dùng `happy-dom` (devDependency).
- R9: `localToday(now?)` theo `Asia/Ho_Chi_Minh`; `filingYear(today, rulesOf?)` đọc phần tử `deadlines.once` muộn nhất của luật năm trước (hoặc gần nhất); `startApp` nhận `clock`, nghe `visibilitychange`, chụp/trả giá trị ô theo vùng + form + `name` khi gắn lại, giữ cờ stale qua `mountLedger({ stale, onStale })`; `mountLedger` có `disposed`, gọi `persist()` một lần, khối sao lưu đọc/ghi `thue-cho-thue:last-backup` (`src/ledger/storage.ts`).
- R5: `vite.config.ts` `base: "/thue-cho-thue/"`, tắt polyfill modulepreload; `index.html` có h1/FAQ/nguồn/meta/OG tĩnh (số luật trong `data-rule`); `public/robots.txt`, `public/sitemap.xml`; `.github/workflows/deploy.yml` job `test` (lint, test, build, upload) → `deploy` + smoke.
- Hàm thuần, không đọc giờ hệ thống; `src/tax` nhận `rules` làm tham số; `src/ledger` nhận `newId`, `Storage`.

## Quy tắc → test bảo vệ
| Quy tắc | Test bảo vệ |
|---|---|
| Không số luật trong `src/tax` | `tests/rules/rules.test.ts` (quét `1000000000`, `1_000_000_000`, `0.05`, `07-31`, `01-31`) |
| Không số luật trong `src/ui` (R2) | `tests/ui/calculator.test.ts` (quét thêm `rateBps`, `/ 10000`) |
| Build dưới `/thue-cho-thue/`, bundle chạy được, gzip ≤ 100 KB, không gọi mạng (R5) | `tests/build/build.test.ts` (tự `vite build` vào thư mục tạm) |
| FAQ tĩnh khớp `getRules(2026)`; robots/sitemap/OG đúng URL (R5) | `tests/build/content.test.ts` |
| Deploy chỉ sau lint+test+build xanh (R5) | `tests/build/workflow.test.ts` |
| Không số luật trong `src/ledger`, `src/ui/ledger.ts` (R3) | `tests/ledger/ledger.test.ts`, `tests/ui/ledger.test.ts` (quét) |
| Tiền nguyên đồng, làm tròn xuống | `tests/tax/annual.test.ts`, `tests/tax/revenue.test.ts` |
| Trừ ngưỡng một lần cho tổng hợp đồng (L4) | `tests/tax/annual.test.ts`, `tests/ledger/ledger.test.ts`, `tests/ledger/ui-e2e.test.ts` |
| Doanh thu theo ngày nhận tiền (L6) trong sổ | `tests/ledger/ledger.test.ts` (hợp đồng vắt năm, trả trước `allocate`) |
| Hạn 31/01 năm sau (L7) | `tests/tax/deadlines.test.ts` |
| Đọc tiền VNĐ có dấu ngăn, từ chối mơ hồ (R2) | `tests/ui/money.test.ts`, `tests/ui/e2e.test.ts` (gõ `"100.000.000"`) |
| Ô lỗi không hiện số; miễn trừ luôn có; nhãn "ước tính" theo `vatEstimated` (R2) | `tests/ui/form.test.ts`, `tests/ui/e2e.test.ts` |
| JSON sai cấu trúc không ghi đè kho; kho hỏng chép dự phòng, không ghi khoá chính (R3) | `tests/ledger/schema-storage.test.ts`, `tests/ledger/ui-e2e.test.ts` |
| Kho hỏng/phiên bản lạ/đọc lỗi → sổ khoá ghi qua DOM, tải bản cũ, sổ mới chỉ sau khi giữ chuỗi cũ (R6) | `tests/ledger/safe-storage.test.ts` |
| `localStorage` bị chặn: máy tính vẫn chạy, sổ báo tiếng Việt (R6) | `tests/main.test.ts` |
| Hai tab: kiểm khoá chính trước mỗi lần ghi, nghe `storage` (R6) | `tests/ui/two-tabs.test.ts` |
| Dòng tổng mang "ước tính" theo `vatEstimated` ở máy tính, sổ, bảng/CSV; lỗi tổng năm phân biệt thiếu luật bằng `getRules` (R6) | `tests/ui/money-label.test.ts` |
| Hạn đã qua (`date < today`): nhãn, `.ics` không `VALARM`; năm không doanh thu không hiện hạn; `src/export` không đọc giờ hệ thống (R6) | `tests/export/deadlines-past.test.ts` |
| Năm mặc định theo năm đang khai, năm chưa có luật báo rõ, đổi năm không rò listener, không đọc đồng hồ ngoài `localToday` (R7) | `tests/start.test.ts` |
| Hạn đã qua ở máy tính và FAQ; không `dd/mm/yyyy` ngoài `data-rule` (R7) | `tests/ui/calc-past.test.ts`, `tests/build/faq-deadline.test.ts` |
| Tổng năm sổ không hạn khi không doanh thu; nhập bản sổ cũ không `app`, file lạ bị từ chối (R7) | `tests/ui/ledger-total.test.ts`, `tests/ui/import-old.test.ts` |
| Một nguồn số: tổng quan, biên lai, thẻ căn, bảng hợp đồng = `summarizeYear`; không số mẫu mockup; đếm ngày thuần; token đúng mockup, tương phản AA; không font/URL ngoài (R8) | `tests/ui/overview.test.ts`, `tests/ui/due.test.ts`, `tests/ui/calc-card.test.ts`, `tests/build/shell.test.ts` |
| Đổi năm/gọi lại `startApp` giữ chữ gõ dở, cờ stale; nhập file muộn sau gỡ không ghi; `persist()` một lần, nhắc sao lưu biên 30 ngày; ngày theo giờ VN, mốc đổi năm từ `deadlines.once`, đọc lại ngày khi tab hiện lại; test đọc đồng hồ phải ghim giờ (R9) | `tests/start-h41.test.ts`, `tests/start-date.test.ts`, `tests/ui/backup-reminder.test.ts` |
| File mẫu schema v1 đóng băng luôn nạp được; đổi schema phải thêm di chuyển (R3) | `tests/ledger/fixtures/ledger-v1.json` + `tests/ledger/schema-storage.test.ts` |

## Lỗ hổng mở
| Mã | Mức | Tóm tắt |
|---|---|---|
| H-01 | low | `computeAnnual` không đối chiếu `year` với `rules.year` (UI R2 và sổ R3 đã chặn phía mình; engine chưa sửa) |
| H-02 | medium | Tổng doanh thu không kiểm `Number.isSafeInteger`: 3 hợp đồng × 4e15 ra tổng sai im lặng (đã chạy); một hợp đồng thì ném lỗi |
| H-03 | low | Thiếu test `prepaid.mode` không hợp lệ và `years` lẻ ở engine (sổ R3 đã kiểm phía dữ liệu) |
| H-04 | medium | Cơ sở GTGT (L5), làm tròn (đã chạy: 2 hợp đồng 1.000.000.010 + 10 đ → PIT 0, làm tròn tổng ra 1), dời hạn ngày nghỉ (31/01/2027 là Chủ Nhật), số liệu khai 31/7, mẫu tờ khai R4: chờ leader/kế toán xác nhận |
| H-05 | low | Lỗi engine (ngày trả trước không có thật) hiện chuỗi kỹ thuật `receivedOn ...` trên máy tính R2 (sổ R3 đã chặn) |
| H-06 | low | Sổ R3: `render()` vẽ lại toàn bộ sau mỗi thay đổi, dữ liệu gõ dở ở form khác mất |
| H-07 | low | R6 thêm khoá dự phòng thứ hai; còn: khi cả `backup` và `backup:2` đã giữ chuỗi khác, `preserveRaw` ghi đè `backup:2` |
| H-15 | low | Test quét số luật yếu (không đệ quy, không `main.ts`) |
| H-16 | low | Cụm UX nhỏ (nhập lại cùng file, xoá không hỏi, revokeObjectURL, kết quả cũ…; R4: radio không hoàn lại khi `setFilingMode` lỗi, `DISCLAIMER` hai lần): xem audit |
| H-17 | low | Phụ lục 01-1/BK-TTS năm 2026 liệt kê cả hợp đồng không có doanh thu 2026 (dòng toàn 0); e2e R4 không có ca này |
| H-18 | low | Ghi chú R5: nguồn viết cứng "01 tỷ" ngoài `data-rule`; test bundle giả định một chunk; dự phòng `fetch` analytics không bắt lỗi (chỉ khi bật); action Node 20 deprecated |
| H-21 | medium | Đạt trên giấy: smoke/T9 chỉ grep chuỗi tĩnh, URL cứng, chưa có smoke trình duyệt thật, dữ liệu thử toàn số tròn |
| H-22 | medium | CSV phân tách `,` có thể vỡ cột trên Excel vi-VN (chưa xác nhận); tiền tố `'`, ô bắt đầu khoảng trắng/`\n` |
| H-23 | low | UX xuất: đổi cách khai mất focus, "Chép" không phản hồi gần nút, `aria-label` trùng |
| H-24 | low | `filingMode: null` làm từ chối cả file nhập |
| H-25 | low | robots/sitemap dưới thư mục con, thiếu favicon/og:image, không có `preview`, workflow không chạy trên PR |
| H-26 | low | `.ics`: tiêu đề 2 lần khai trùng, UID không `SEQUENCE` |
| H-29 | medium | Thông báo khoá cố định, nuốt nguyên nhân (phiên bản mới → nên cập nhật; kho bị chặn) |
| H-30 | medium | Nhập file khi khoá: `locked=false` trước `apply`; `apply` lỗi thì lệch trạng thái/màn hình |
| H-31 | medium | R7 thêm năm mặc định, chọn năm, báo rõ năm chưa có luật; còn: luật 2027 (`src/rules/2027.ts`) cần leader/kế toán xác nhận (`human_only`) |
| H-43 | low | R9 thêm `persist()`, "Lần sao lưu cuối", nhắc sau 30 ngày; còn: thử thật Safari/iOS xoá sau 7 ngày không dùng (việc người) |
| H-44 | low | FAQ hứa "đã qua" nhưng nhãn do JS; không-JS và ô chọn 2027 vẫn thấy ngày 2026 |
| H-45 | low | `importLedger` không `app` nhận mọi object đủ 5 khoá, bỏ im khoá lạ; thiếu test vòng xuất→nhập đầy đủ |
| H-46 | low | `BigInt`/`replaceChildren` không phát hiện: trình duyệt cũ chỉ thấy phần tĩnh |
| H-47 | low | "Chưa có kỳ thu năm N" hiện cả khi có kỳ thu tổng 0 đ |
| H-48 | low | R8: `overview.ts` đọc thuế suất qua `["rate","Bps"].join("")` để lách quét `rateBps` (`tests/ui/calculator.test.ts`); dòng "cách tính" tự dựng cơ sở × thuế suất (chữ; số tiền vẫn từ engine); `h1` cứng "2026"; lỗi ngày trống ở `src/ledger/ops.ts:48` còn "AAAA-MM-DD" |
| H-49 | low | R9: ghi `last-backup` lỗi (kho đầy/chặn) thì sau "Xuất JSON" vẫn nhắc; ảnh chụp ô gõ dở giữ khoá form đã mất, giá trị cũ có thể hiện lại; chưa quét chung lỗi gộp selector CSS |
| H-50 | medium | Khôi phục ô trả trước không phát `change`: khối ô con ẩn, máy tính bấm "Tính" không ra gì (đã chạy), sổ nộp `years`/`mode` ẩn |
| H-51 | medium | "Cách tính" tự dựng cơ sở × thuế suất, lệch 1 đ (2 × 600.000.010 đ → GTGT 60.000.001 vs 60.000.000), không test chữ `.how` |
| H-52 | medium | Remount do đổi ngày chép ảnh chụp đè dữ liệu tươi; tab bỏ lỡ `storage` không stale (chưa xác nhận) |
| H-53 | medium | ≤ 760 px ẩn bảng thuế theo hợp đồng, tiêu đề mồ côi; `due.test.ts:207` khẳng định việc ẩn |
| H-54 | low | Hai `h1` sau khi JS chạy (`index.html:42`, `form.ts:98,146`) |
| H-55 | low | Ô ngày kết thúc `type="date"` mất giá trị dở không báo; ca ngày không thật đã đổi đầu vào |
| H-56 | low | `last-backup` ghi vô điều kiện (khoá/stale/tải bị chặn/sổ mới/ngày tương lai); `persist()` bỏ kết quả (mở rộng H-49) |
| H-57 | low | `.hero.owe/.safe` không quy tắc, `aria-current` chết, 761–1090 px, `scroll-margin`, `:has()`, `aria-live`, hai chỗ chọn khai |
| H-58 | low | Tab hiện suốt đêm 31/01→01/02 không đổi; `main.ts:11` `localToday()` ngoài `try` |
| H-59 | low | Test theo cấu tạo: token so bản sao mockup, quét `setSystemTime` kể cả comment, hai smoke lệch nhau, thẻ căn đếm kỳ thu theo `receivedOn` |
| H-32 | medium | Chưa ai làm: đo người dùng thật (chỉ `pageview`), Lighthouse mobile ≥ 90, mốc 05/12/2026 |
| H-33 | low | `today` chốt lúc mount; `endOn < startOn` được nhận; kỳ thu năm khác không báo |
| H-34 | low | Stale `render()` xoá dữ liệu gõ, mất focus, radio lệch; sự kiện `storage` key/newValue null |
| H-35 | low | Xuất JSON khi khoá ra sổ rỗng; "Bắt đầu sổ mới" khi `getItem` ném bỏ giữ chuỗi cũ |
| H-36 | low | Test R6 rỗng (2 ca khoá), `events` mặc định `window` không test, `smoke-pages.sh` không test |
| H-37 | low | Dữ liệu thử toàn số tròn, thiếu ca lẻ/5 căn; `lint` chỉ là `tsc --noEmit` |

## Quyết định gần đây
- 2026-10-27: Audit R8–R9 (`docs/audits/2026-10-27-3.md`): thêm H-50..H-59 (4 vừa, 6 thấp), không đóng H-xx nào, không lỗ cao. H-50 đã chạy lại. % theo việc ~67%. H-32 (còn 39 ngày đến 05/12) chưa ai làm; luật 2027 còn 97 ngày. Đề xuất: mốc không kẹt/không mất (H-50, H-52, H-56, H-55, H-54, H-29, H-30, H-35), mốc điện thoại (H-53, H-57), tin cậy số (H-51, H-48, H-37), rồi H-32.
- 2026-10-27: Supervisor duyệt R9 (#38; PR đã merge trước bước duyệt, duyệt lại trên 502114d): verify/smoke sạch, T4 389, T5 139, T6 61, T7 34, `tests/build` 73, gzip ~23 KB; 24 ca mới đỏ trên `src` trước R9 (supervisor tự chạy); phép đảo FAQ `<` → `<=` làm đỏ 2 ca; 3 ca biên ngoài repo xanh; 4/4 task DONE (dev-01, dev-02 hai vòng). Không quyết định (c). Đóng H-39, H-40, H-41, H-42; H-43 hạ low; thêm H-49.
- 2026-10-27: Supervisor duyệt và merge R8 (#35, 4d9b5e8): verify/smoke sạch, T4 331, T5 119, T6 61, T7 34, `tests/build` 66, gzip ~23 KB; Chrome headless 390 px (iframe) và 1280 px không tràn ngang; 3 ca biên ngoài repo xanh; 4/4 task PASS vòng 1. Quyết định (c): cách lách `rateBps` ở `overview.ts` không chặn merge; hướng sửa là `src/rules` xuất sẵn nhãn thuế suất (giữ guard chặt), ghi H-48. Đóng H-13.
- 2026-10-27: Đóng H-38 (`docs/audits/2026-10-27-2.md`): leader sửa tay, ghim giờ `tests/main.test.ts` và `tests/build/build.test.ts`, thêm ca `main` ở 2027-03-01; dưới đồng hồ giả 2027 mã cũ 3 failed, mã mới 276 passed. Không còn lỗ cao mở.
- 2026-10-27: Audit R7 (`docs/audits/2026-10-27.md`): thêm H-38..H-47 (1 cao, 4 vừa, 5 thấp); đóng H-20, H-27, H-28 (auditor tự chạy 6 file test R7, 32 passed); H-31 còn luật 2027 và H-39. H-38 cao: test theo đồng hồ thật đỏ từ 01/02/2027. % theo việc ~65%. Đề xuất R8: H-38/H-39/H-40 trước 01/02/2027, rồi H-41/H-42/H-43 cùng H-13, H-29, H-30, H-35, rồi H-32.
- 2026-10-27: Supervisor duyệt và merge R7 (#29): verify/smoke sạch, build 0, T4 275, T5 82, T6 61, T7 34, `tests/build` 48, gzip ~18 KB; ca mới đỏ trên `src` cũ (supervisor tự chạy); 4/4 task PASS vòng 1; không quyết định (c). Đóng H-20, H-27, H-28; H-31 thu hẹp còn luật 2027. Câu FAQ mới cần leader đọc duyệt trước khi quảng bá.
- 2026-10-26: Audit R6 (`docs/audits/2026-10-26-4.md`): thêm H-27..H-37, không tự đóng H-xx; H-09..H-12, H-14, H-19 có test thật qua DOM. H-13 vẫn mở (ô ngày trên điện thoại). % theo việc ~64%. Đề xuất R7: H-13, H-27..H-30, H-35 trước (cùng `ledger.ts`), rồi H-32, H-31.
- 2026-10-26: Supervisor duyệt và merge R6 (#24): verify/smoke sạch, build 0, T4 245, T5 70, T6 61, T7 34; 26 ca mới đỏ trên `src` cũ (supervisor tự chạy); 4/4 task PASS vòng 1; không quyết định (c). Đóng H-09, H-10, H-11, H-12, H-14, H-19; thu hẹp H-20; cập nhật H-07.
- 2026-10-26: Đóng H-08 (`docs/audits/2026-10-26-3.md`): leader bật Pages; chạy lại deploy xanh; T9 exit 0; JS dựng form thật (Chrome headless); thêm `yarn -s build` vào verify và smoke `scripts/smoke-pages.sh`. Không còn lỗ cao mở.
- 2026-10-26: Audit R4–R5 (`docs/audits/2026-10-26-2.md`): thêm H-19..H-26, không đóng H-xx nào; H-08 vẫn mở (Pages 404). Đề xuất R6: mất dữ liệu (H-10/12/11), báo sai thuế (H-14/02/01/09), hạn và xuất (H-19/20/22), kiểm thật (H-21). Ghi nhận: agent góc (c) đã gọi `gh api` một lần (chỉ đọc, ngoài ràng buộc).
- 2026-10-26: Supervisor duyệt và merge R5 (#18): verify sạch, build 0, `tests/build` 45, T4 210 passed, gzip ~16 KB; 4/4 task PASS vòng 1; không quyết định (c). Run deploy đầu đỏ ở `configure-pages` (Pages chưa bật), T9 404 → H-08 thu hẹp, chờ leader bật Pages. Thêm H-18.
- 2026-10-26: Supervisor duyệt và merge R4 (#15): verify sạch, T7 28, T4 165 passed; 4/4 task PASS vòng 1; không quyết định (c); thêm H-17 (thấp), mở rộng H-14 sang bảng tờ khai. Mẫu tờ khai vẫn `confirmed: false` (H-04).
- 2026-10-26: Audit R1–R3 (`docs/audits/2026-10-26.md`): thêm H-08..H-16, nâng H-02 lên medium, không đóng H-xx nào. Đề xuất mốc sửa R3.1 trước R4; H-08 là task đầu R5; R4 chờ xác nhận mẫu tờ khai (H-04).
- 2026-10-26: Supervisor duyệt R3 (#11; PR đã merge trước bước duyệt, duyệt lại trên 490a7cb): đạt. Không có quyết định (c). Thêm H-06, H-07 (thấp). H-01..H-03 để một mốc sửa nhỏ hoặc phạm vi R4 (theo "Đề xuất chờ duyệt" của `plan/R3.md`).
- 2026-10-26: Supervisor duyệt và merge R2 (#8). Không có quyết định (c). Thêm H-05.
- 2026-10-26: Supervisor duyệt và merge R1 (#5). Không có quyết định (c).
