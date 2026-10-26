# Trạng thái dự án (đọc trước plan mốc)

Cập nhật: 2026-10-26 · Nguồn: audit R4–R5 (`docs/audits/2026-10-26-2.md`), audit R1–R3 (`docs/audits/2026-10-26.md`), duyệt R4 (#15), duyệt R5 (#18), đóng H-08 (`2026-10-26-3`), duyệt R6 (#24)

## Mốc
| Mốc | Trạng thái | Ghi chú |
|---|---|---|
| R1 | merged (#5) | Engine thuế + cấu hình luật 2026; 4/4 task PASS vòng 1; T1–T4 đạt |
| R2 | merged (#8) | Máy tính thuế một căn; 4/4 task PASS vòng 1; T5 đạt |
| R3 | merged (#11) | Sổ doanh thu nhiều căn; 4/4 task PASS vòng 1; T6 đạt |
| R4 | merged (#15) | Hạn khai, `.ics`, bảng 01/TTS + 01-1/BK-TTS, CSV, chép, hướng dẫn eTax; 4/4 task PASS vòng 1; T7 đạt |
| R5 | merged (#18) | Trang công khai, SEO, workflow deploy Pages, `tests/build`; 4/4 task PASS vòng 1; T8 đạt; T9 đạt sau khi leader bật Pages (H-08 đóng) |
| R6 | merged (#24) | Vá trước khi quảng bá: kho hỏng khoá ghi, hai tab, `localStorage` bị chặn, nhãn "ước tính", lỗi tổng năm đúng nguyên nhân, hạn "đã qua", năm không kỳ thu; 4/4 task PASS vòng 1; đóng H-09..H-12, H-14, H-19 |

## Mục tiêu và tiêu chí
Goal `thue-cho-thue-v1` (`docs/goals/thue-cho-thue-v1/goal.json`): web app tĩnh giúp người cho thuê 1–5 căn tự lo thuế cho thuê theo luật 2026. Đạt 100% theo chỉ số (9/9: T1–T9, 2026-10-26); theo khối lượng việc thật ~60% (audit R4–R5), sau R6 supervisor ước ~68%. Ba điều (audit R4–R5): máy tính ~70%, sổ ~75% code / ~50% chứng minh, nhắc hạn + xuất + Pages ~40% gộp (`.ics` ~75%, xuất ~55%, Pages code ~85% nhưng chạy thật 0%; mẫu tờ khai chưa xác nhận, H-04).

| Chỉ số | Lệnh | Ngưỡng | Hiện tại |
|---|---|---|---|
| T1 | `yarn -s test tests/tax` | 0 failed, ≥ 15 passed | 25 passed |
| T2 | `yarn -s test tests/rules` | 0 failed, ≥ 4 passed | 7 passed |
| T3 | `yarn -s lint` | exit 0 | exit 0 |
| T4 | `yarn -s test` | 0 failed | 245 passed |
| T5 | `yarn -s test tests/ui` | 0 failed, ≥ 6 passed | 70 passed |
| T6 | `yarn -s test tests/ledger` | 0 failed, ≥ 8 passed | 61 passed |
| T7 | `yarn -s test tests/export` | 0 failed, ≥ 6 passed | 34 passed |
| T8 | `yarn -s build && yarn -s test tests/build` | build 0, 0 failed, gzip ≤ 100 KB | build 0, 45 passed, ~16 KB |
| T9 | `curl -fsS https://silver-rp.github.io/thue-cho-thue/ \| grep -q "Thuế cho thuê"` | exit 0 | exit 0 (Pages bật; smoke `scripts/smoke-pages.sh` sạch) |

## Kiến trúc hiện nay
- `src/rules/`: `types.ts` (`TaxRules`), `2026.ts` (mọi số luật + căn cứ L1–L7), `index.ts` (`getRules(year)`, năm chưa có thì ném lỗi).
- `src/tax/`: `money.ts` (tiền nguyên đồng, `applyRateBps` bằng BigInt, làm tròn xuống), `revenue.ts` (doanh thu năm theo ngày nhận, trả trước `lump`/`allocate`), `annual.ts` (`computeAnnual`: trừ ngưỡng theo `deductionOrder`, TNCN, GTGT, `status`, hạn, căn cứ), `deadlines.ts` (hạn khai 1/2 lần, hạn thông báo doanh thu).
- `src/ui/`: `money.ts` (`parseVnd`, `formatVnd` → `12.000.000 đ`), `calculator.ts` (`calculate`), `form.ts` (`mountCalculator`), `ledger.ts` (`mountLedger(root, { year, storage, rules?, newId?, today?, confirm? })`, DOM thuần), `style.css` (mobile trước, bảng trong `.table-scroll`).
- `src/ledger/`: `model.ts` (kiểu sổ, `emptyLedger`), `ops.ts` (thêm/sửa/xoá thuần, `cascade`, `setDeductionChoice`), `summary.ts` (`ledgerToPayments`, `summarizeYear` gọi `computeAnnual`, ném lỗi khi `rules.year` khác `year`, `thresholdWarning`), `schema.ts` (`parseLedger` + `migrations`), `storage.ts` (khoá `thue-cho-thue:ledger`, dự phòng `thue-cho-thue:ledger:backup`), `backup.ts` (xuất/nhập JSON có `app: "thue-cho-thue"`).
- `src/export/` (R4, thuần): `ics.ts` (`deadlinesToIcs`, sự kiện cả ngày, `VALARM` -7/-1 ngày, gấp 75 octet, `nextDay` không dùng `Date`), `forms.ts` (`form01TTS`: cấu hình trường 01/TTS + cột 01-1/BK-TTS, `confirmed: false`, `code: null`), `declaration.ts` (`buildDeclaration` chỉ đọc `YearSummary`), `csv.ts` (BOM, CRLF, RFC 4180, tiền tố `'` chặn công thức). `src/ui/export.ts`: `mountExport` (chọn khai 1/2 lần, hạn, tải `.ics`/CSV, chép, hướng dẫn eTax), gắn từ `ledger.ts`. Sổ có `filingMode?` theo năm, `summarizeYear` truyền vào `computeAnnual`.
- `src/main.ts` gắn máy tính vào `#app` và sổ phía dưới, năm 2026, `window.localStorage`, rồi `analyticsFromEnv().track("pageview")` (`src/analytics.ts`, tắt khi không có `VITE_ANALYTICS_URL`; file duy nhất gọi mạng). Test UI dùng `happy-dom` (devDependency).
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
| H-13 | medium | Ô ngày dùng `inputmode=numeric` (thiếu dấu "-" trên điện thoại) |
| H-15 | low | Test quét số luật yếu (không đệ quy, không `main.ts`) |
| H-16 | low | Cụm UX nhỏ (nhập lại cùng file, xoá không hỏi, revokeObjectURL, kết quả cũ…; R4: radio không hoàn lại khi `setFilingMode` lỗi, `DISCLAIMER` hai lần): xem audit |
| H-17 | low | Phụ lục 01-1/BK-TTS năm 2026 liệt kê cả hợp đồng không có doanh thu 2026 (dòng toàn 0); e2e R4 không có ca này |
| H-18 | low | Ghi chú R5: nguồn viết cứng "01 tỷ" ngoài `data-rule`; test bundle giả định một chunk; dự phòng `fetch` analytics không bắt lỗi (chỉ khi bật); action Node 20 deprecated |
| H-20 | low | R6 vá phần app; còn: FAQ `index.html` viết cứng "lần đầu 31/07/2026" (leader duyệt nội dung), máy tính một căn chưa gắn "đã qua" |
| H-21 | medium | Đạt trên giấy: smoke/T9 chỉ grep chuỗi tĩnh, URL cứng, chưa có smoke trình duyệt thật, dữ liệu thử toàn số tròn |
| H-22 | medium | CSV phân tách `,` có thể vỡ cột trên Excel vi-VN (chưa xác nhận); tiền tố `'`, ô bắt đầu khoảng trắng/`\n` |
| H-23 | low | UX xuất: đổi cách khai mất focus, "Chép" không phản hồi gần nút, `aria-label` trùng |
| H-24 | low | `filingMode: null` làm từ chối cả file nhập |
| H-25 | low | robots/sitemap dưới thư mục con, thiếu favicon/og:image, không có `preview`, workflow không chạy trên PR |
| H-26 | low | `.ics`: tiêu đề 2 lần khai trùng, UID không `SEQUENCE` |

## Quyết định gần đây
- 2026-10-26: Supervisor duyệt và merge R6 (#24): verify/smoke sạch, build 0, T4 245, T5 70, T6 61, T7 34; 26 ca mới đỏ trên `src` cũ (supervisor tự chạy); 4/4 task PASS vòng 1; không quyết định (c). Đóng H-09, H-10, H-11, H-12, H-14, H-19; thu hẹp H-20; cập nhật H-07.
- 2026-10-26: Đóng H-08 (`docs/audits/2026-10-26-3.md`): leader bật Pages; chạy lại deploy xanh; T9 exit 0; JS dựng form thật (Chrome headless); thêm `yarn -s build` vào verify và smoke `scripts/smoke-pages.sh`. Không còn lỗ cao mở.
- 2026-10-26: Audit R4–R5 (`docs/audits/2026-10-26-2.md`): thêm H-19..H-26, không đóng H-xx nào; H-08 vẫn mở (Pages 404). Đề xuất R6: mất dữ liệu (H-10/12/11), báo sai thuế (H-14/02/01/09), hạn và xuất (H-19/20/22), kiểm thật (H-21). Ghi nhận: agent góc (c) đã gọi `gh api` một lần (chỉ đọc, ngoài ràng buộc).
- 2026-10-26: Supervisor duyệt và merge R5 (#18): verify sạch, build 0, `tests/build` 45, T4 210 passed, gzip ~16 KB; 4/4 task PASS vòng 1; không quyết định (c). Run deploy đầu đỏ ở `configure-pages` (Pages chưa bật), T9 404 → H-08 thu hẹp, chờ leader bật Pages. Thêm H-18.
- 2026-10-26: Supervisor duyệt và merge R4 (#15): verify sạch, T7 28, T4 165 passed; 4/4 task PASS vòng 1; không quyết định (c); thêm H-17 (thấp), mở rộng H-14 sang bảng tờ khai. Mẫu tờ khai vẫn `confirmed: false` (H-04).
- 2026-10-26: Audit R1–R3 (`docs/audits/2026-10-26.md`): thêm H-08..H-16, nâng H-02 lên medium, không đóng H-xx nào. Đề xuất mốc sửa R3.1 trước R4; H-08 là task đầu R5; R4 chờ xác nhận mẫu tờ khai (H-04).
- 2026-10-26: Supervisor duyệt R3 (#11; PR đã merge trước bước duyệt, duyệt lại trên 490a7cb): đạt. Không có quyết định (c). Thêm H-06, H-07 (thấp). H-01..H-03 để một mốc sửa nhỏ hoặc phạm vi R4 (theo "Đề xuất chờ duyệt" của `plan/R3.md`).
- 2026-10-26: Supervisor duyệt và merge R2 (#8). Không có quyết định (c). Thêm H-05.
- 2026-10-26: Supervisor duyệt và merge R1 (#5). Không có quyết định (c).
