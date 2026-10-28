# Tiến độ và số đo theo mốc

| Mốc | Thời gian | Chi phí | Ghi chú |
|---|---|---|---|
| R1 | 8 phút worker (ước tính 60) | 1,31 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,14, USD 0,33 |
| R2 | 11 phút worker (ước tính 20) | 1,49 + ~0,92 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,53, USD ~0,60 |
| R3 | 15 phút worker (ước tính 20) | 3,03 USD theo metrics.py (ước tính 3,7) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,76, USD 0,82 |
| R4 | 12 phút worker (ước tính 15) | 3,50 USD theo metrics.py (ước tính 3,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,83, USD 1,17 |
| R5 | 12 phút worker (ước tính 14) | 1,73 + ~1,33 USD (ước tính 3,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,87, USD ~1,02 |
| R6 | 18 phút worker (ước tính 16) | 2,25 + ~1,31 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–7), 0 lần dừng; B3 phút 1,16, USD ~0,89 |

## R1: duyệt của supervisor (2026-10-26, PR #5)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R1` d743098)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke "sạch" (danh sách rỗng) |
| 2 | T1 | `yarn -s test tests/tax` | 3 file, 25 passed, 0 failed |
| 3 | T2 | `yarn -s test tests/rules` | 7 passed; test quét có `1000000000`, `0.05`; `grep` tay trên `src/tax/*.ts` không thấy |
| 4 | T3 | `yarn -s lint` | exit 0 |
| 5 | T4 | `yarn -s test` | 5 file, 33 passed |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 60 | 8 | 0,14× |
| USD | 4,0 | 1,31 (metrics.py; chưa có số supervisor) | 0,33× |
| Vòng review | 4–6 | 4 | trong khoảng |

Lệch quá 2 lần (thấp hơn): mốc đầu ước tính dè dặt theo sandbox; R1 là hàm thuần chỉ Vitest, cả 4 task PASS vòng 1.

### Pre-mortem
1. Test tự tính bằng code → chặn: ca test ghi số tính tay (vd. `L3: 1.200.000.000 → TNCN 10.000.000`).
2. Làm tròn số thực → chặn: `applyRateBps` dùng BigInt; ca vượt 1 đồng; phân bổ 100.000.000/3 so `toBe`.
3. Số luật trong engine → chặn: test quét `src/tax` + grep supervisor.
4. Trừ ngưỡng sai (L4) → chặn: ca A/B đổi `deductionOrder`.
5. Dữ liệu tròn tỷ → chặn: ca đúng ngưỡng, vượt 1 đồng, 0 đồng, số không chia hết.
6. Trả trước chỉ kiểm năm nhận → chặn: kiểm 2027–2029.
7. Năm hạn 31/01 sai → chặn: `getDeadlines(2026, …)` → `2027-01-31`.

### Kiểm độc lập (vite-node, script ngoài repo)
- `deductionOrder: ["X","B"]` (X không tồn tại), A 700tr, B 700tr → B trừ 700tr, A 300tr, TNCN A 20tr: đúng.
- Gọi `computeAnnual` hai lần cùng đầu vào → kết quả giống nhau.
- Trả trước 300tr nhận `2025-12-31`, 3 năm, `allocate`, hỏi 2026 → 100tr: đúng.
- `receivedOn: "2026-02-30"` → ném lỗi: đúng.
- `year: 2027` với rules 2026 → không lỗi, hạn 2028-01-31 (H-01). Hai khoản MAX_SAFE_INTEGER → tổng không an toàn (H-02).

Quyết định: đạt, merge #5 (main không có check bắt buộc). Thí nghiệm superpowers: config không bật, bỏ qua.

## R2: duyệt của supervisor (2026-10-26, PR #8, merge f80853f)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R2`)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke "sạch" (danh sách rỗng) |
| 2 | T5 | `yarn -s test tests/ui` | 4 file, 47 passed, 0 failed |
| 3 | T3 | `yarn -s lint` | exit 0 |
| 4 | T4 | `yarn -s test` | 9 file, 80 passed, 0 failed |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 20 | 11 | 0,53× |
| USD | 4,0 | 1,49 + ~0,92 (metrics.py; supervisor tạm tính) | ~0,60× |
| Vòng review | 4–6 | 4 | trong khoảng |

### Pre-mortem
1. "12.000.000" hiểu thành 12 → chặn: `tests/ui/money.test.ts` (dấu chấm/phẩy/khoảng trắng/`đ`, ca sai), e2e gõ `"100.000.000"` → TNCN `10.000.000 đ`.
2. UI tự tính lại → chặn: test quét `src/ui`; supervisor `grep -rnE '1000000000|1_000_000_000|0\.05|rateBps|/ 10000|07-31|01-31' src/ui` không thấy; e2e đối chiếu `computeAnnual` 3 ca.
3. Ô lỗi coi là 0 → chặn: form/e2e `"abc"` → có lỗi, không hiện số.
4. Thiếu nhãn ước tính/miễn trừ → chặn: form test (miễn trừ trước/sau/tính lại; `unconfirmed: false` không nhãn).
5. Bước giải thích lệch bảng → chặn: calculator test (bước lấy từ `result`, căn cứ `rules2026.citations`, `600.000.000 đ`).
6. Tràn ngang mobile → chặn một phần: test viewport/CSS/`overflow-x: auto`; chưa kiểm bố cục thật (happy-dom).
7. Năm khác năm luật (H-01) → chặn phía UI: `year: 2025` → lỗi tiếng Việt.

### Kiểm độc lập (file test tạm, xoá sau khi chạy)
- `parseVnd` ngăn trộn `"12.000,000"`, `"12.000 000"`, `"1.000.00"`, `"12..000"`, chữ số Ả Rập → đều `ok: false`.
- Đúng ngưỡng 1.000.000.000 × 1 → `notify_only`, TNCN 0.
- Trả trước 2.400.000.000 nhận `2025-12-20`, 2 năm, `allocate`, năm 2026 → 1.200.000.000.
- Bật trả trước nhập `"abc"` → không hiện kết quả; tắt trả trước rồi `click` nút thật → tính lại đúng 70.000.000 đ.
- Ngày `2026-02-30` → lỗi `receivedOn không phải ngày có thật` (lộ tên trường kỹ thuật: H-05, thấp).

Quyết định: đạt, merge #8 (main không có check bắt buộc). Không quyết định (c). Thí nghiệm superpowers: config không bật, bỏ qua.

## R3: duyệt của supervisor (2026-10-26, PR #11, merge 490a7cb)

PR #11 đã được merge (16:39Z ngày 25/10, tài khoản Silver-RP) trước khi phiên duyệt này chạy; supervisor duyệt lại trên `origin/main` 490a7cb (bằng đầu nhánh `milestone/R3` cộng merge commit). Kết quả đạt nên không cần hoàn tác.

### Tiêu chí cấp mốc (supervisor tự chạy trên 490a7cb)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch (smoke rỗng) | `verify.py` | "sạch (không có lỗi mới so với baseline)" (gồm deps, lint `tsc --noEmit`, test) |
| 2 | T6 | `yarn -s test tests/ledger` | 3 file, 41 passed, 0 failed (≥ 8) |
| 3 | T4 | `yarn -s test` | 13 file, 134 passed, 0 failed |

Thêm: `grep -rnE '1000000000\|1_000_000_000\|0\.05\|rateBps\|/ 10000\|07-31\|01-31' src/ledger src/ui/ledger.ts` không thấy; `summary.ts` import `computeAnnual`.

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 20 | 15 | 0,76× |
| USD | 3,7 | 3,03 (metrics.py, không hiện `~`) | 0,82× |
| Vòng review | 4–6 | 4 | trong khoảng |

### Pre-mortem
1. Nhập JSON hỏng làm trắng sổ → chặn: `tests/ledger/schema-storage.test.ts` (12 ca JSON hợp lệ sai cấu trúc, kho giữ nguyên từng byte, kho hỏng chép dự phòng không ghi khoá chính), `tests/ledger/ui-e2e.test.ts` (nhập file `amount` chuỗi qua DOM).
2. Mất dữ liệu khi đổi schema → chặn: file mẫu `tests/ledger/fixtures/ledger-v1.json`, di chuyển giả v1 → v2; v99 bị từ chối (supervisor thử lại: khoá chính không đổi, dự phòng có bản sao).
3. Tổng theo ngày ký → chặn: `tests/ledger/ledger.test.ts` ca L6 vắt năm và trả trước `allocate`.
4. Chọn trừ ngưỡng không vào engine → chặn: ca A/B 700tr ở `ledger.test.ts` và `ui-e2e.test.ts` (gắn lại giữ lựa chọn).
5. Ngưỡng viết tay / `>=` → chặn: ca đúng 1 tỷ không cảnh báo, +1 đồng `crossedOn` 2026-09-15; test quét + grep supervisor.
6. Kỳ thu mồ côi → chặn: xoá còn con bị từ chối, `cascade` giảm tổng đúng.
7. Tải lại không đọc → chặn: `tests/ui/ledger.test.ts` gắn lại cùng `Storage`.
8. H-05 trong sổ → chặn phía sổ: ngày `2026-02-30` báo lỗi tiếng Việt không chứa `receivedOn`. Máy tính R2 vẫn còn H-05.

### Kiểm độc lập (vitest, file tạm ở `/tmp/r3edge`, ngoài repo)
- Kho chứa sổ `schemaVersion: 99` → `loadLedger` báo "phiên bản 99 mới hơn…", khoá chính giữ nguyên, khoá dự phòng chứa đúng chuỗi cũ: đúng.
- `importLedger` file thiếu `app` → từ chối; `deductionChoice` có khoá `"__proto__"` → từ chối bằng lỗi tiếng Việt: đúng.
- `saveLedger` → `loadLedger` → `saveLedger` cho cùng chuỗi (lưu lặp không đổi dữ liệu): đúng.
- 3 kỳ thu mỗi kỳ `Number.MAX_SAFE_INTEGER` → `parseLedger` nhận, `summarizeYear` trả `totalRevenue` 27021597764222972 (không an toàn): H-02 còn mở, giờ đi được qua sổ (thấp; số tiền phi thực tế).

### Ghi chú reviewer mới thành lỗ hổng
- H-06 (thấp): `render()` vẽ lại toàn sổ sau mỗi thay đổi hợp lệ, dữ liệu gõ dở ở form khác mất.
- H-07 (thấp): khoá dự phòng chỉ ghi khi trống; lần kho hỏng thứ hai không được sao lưu (UI có báo lỗi).

Quyết định: đạt (đã merge #11; main không có check bắt buộc). Không quyết định (c). Thí nghiệm superpowers: config không bật, bỏ qua.

## R4: Hạn khai, nhắc lịch .ics, số liệu 01/TTS, hướng dẫn eTax (duyệt 2026-10-26)
PR #15, supervisor duyệt trên đầu nhánh 36af6c3 rồi merge (88a31c2). 4/4 task PASS vòng 1 (dev-01 7793c20, dev-02 7d69429, dev-03 ca9c1ab, dev-04 37fc1f5). Lần này supervisor merge sau khi duyệt (khác R3).

### Tiêu chí cấp mốc (supervisor tự chạy trên 36af6c3)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch (smoke rỗng) | `verify.py` | "sạch (không có lỗi mới so với baseline)" |
| 2 | T7 | `yarn -s test tests/export` | 4 file, 28 passed, 0 failed (≥ 6) |
| 3 | T4 | `yarn -s test` | 18 file, 165 passed, 0 failed; tax 25, rules 7, ui 60, ledger 44 |

Thêm: `git diff origin/main -- src/tax src/rules tests/ledger/fixtures` rỗng (không sửa ngoài phạm vi cấm).

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 15 | 12 | 0,83× |
| USD | 3,0 | 2,09 + ~1,31 (supervisor tạm tính) | ~1,13× |
| Vòng review | 4–6 | 4 | trong khoảng |

### Pre-mortem
1. CSV dùng không được / lệch màn hình → chặn: `tests/export/declaration.test.ts` (BOM, CRLF, RFC 4180 đọc ngược, tiền tố `'`, đối chiếu `summarizeYear`), `tests/export/e2e.test.ts` mục 2–3.
2. `.ics` lệch múi giờ → chặn: `tests/export/ics.test.ts` (`DTSTART;VALUE=DATE`, không `T`/`Z`, quét `new Date`/`Date.now`).
3. Hạn 31/01 sai năm → chặn: ics.test (2026 → `20270131`, không `20260131`), e2e mục 1.
4. `.ics` không nhập được → chặn: CRLF, ≤ 75 octet, thoát `,;`, `DTEND` qua tháng/năm/nhuận. Supervisor thử thêm căn cứ dài có chữ Việt + emoji + `\`: gấp đúng, gỡ ra đúng chuỗi gốc.
5. Khai 2 lần không tới engine / mất khi tải lại → chặn: `tests/ledger/filing-mode.test.ts`, e2e mục 1 (gắn lại cùng `Storage`).
6. `filingMode` làm sổ cũ hỏng → chặn: fixture v1 không đổi vẫn nạp; xuất/nhập giữ trường. Supervisor thử `{"2026.5"}`, `{"abcd"}`, mảng, `"TWICE"`, `null` → đều bị từ chối bằng lỗi tiếng Việt.
7. Mẫu chưa xác nhận như chính thức → chặn: `confirmed: false`, mọi `code: null`, ghi chú "chưa xác nhận mẫu" trong bảng và CSV.
8. GTGT không nhãn → chặn ở dòng GTGT; **chưa chặn** ở dòng "Tổng số thuế phải nộp" (gồm GTGT ước tính, không nhãn): ghi vào H-14.
9. Chép lỗi im lặng → chặn: `tests/export/ui-export.test.ts` (Promise từ chối → lỗi tiếng Việt, số vẫn thấy).
10. Sổ trống / `notify_only` → chặn: ui-export.test mục 5.

### Kiểm độc lập (vitest, file tạm trong `tests/`, đã xoá sau khi chạy)
- `.ics` căn cứ ~400 octet có dấu, emoji, `,` `;` `\`: mọi dòng ≤ 75 octet, gỡ gấp + bỏ thoát ra đúng chuỗi gốc: đúng.
- `filingMode` giá trị/khoá lạ: từ chối đúng; `"twice"` → hạn 2026-07-31 và 2027-01-31: đúng.
- Hợp đồng chỉ có kỳ thu 2025 (kết thúc 2025-12-31) vẫn thành một dòng toàn số 0 trong phụ lục 2026; e2e mục 2 chỉ dùng dữ liệu mà mọi hợp đồng đều có doanh thu 2026 nên không bắt được. Tổng vẫn đúng. Thành H-17 (thấp).

### Ghi chú reviewer (không chặn)
`deadlinesToIcs([])` vẫn sinh lịch rỗng; radio không vẽ lại khi `setFilingMode` lỗi; `DISCLAIMER` hiện hai lần trên trang; `toCsv` ném `RangeError` với số âm/lẻ. Gộp vào H-16 (cụm UX nhỏ).

Quyết định: đạt, merge #15 (main không có check bắt buộc). Không quyết định (c). Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R4 `done`, T7 đạt (7/9).

## R5: duyệt của supervisor (2026-10-26, PR #18, merge 0541381)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R5` 15747f4)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke "sạch" (danh sách rỗng) |
| 2 | T8 | `yarn -s build && yarn -s test tests/build`; `gzip -c dist/assets/* \| wc -c`; `grep -oE "fetch\\(\|XMLHttpRequest\|sendBeacon\|WebSocket\|EventSource\|https?://" dist/assets/*.js`; `grep -rnE ... src` | build exit 0; 4 file, 45 passed; JS 14.923 + CSS 1.004 byte gzip (~16 KB ≤ 100 KB); bundle không có API mạng hay URL; trong `src/` chỉ `analytics.ts` |
| 3 | T9 | `curl -fsS https://silver-rp.github.io/thue-cho-thue/ \| grep -q "Thuế cho thuê"` (sau merge) | **chưa đạt**: 404. Run deploy 40230417942: install/lint/test/build xanh, đỏ ở `configure-pages` ("Resource not accessible by integration", Pages chưa bật); `deploy` không chạy. Đúng rủi ro đã ghi trong plan (Đề xuất chờ duyệt, pre-mortem 3); plan ghi "đỏ thì ghi H, không mở lại mốc" → H-08 thu hẹp |
| 4 | T4 | `yarn -s test`; `yarn -s lint` | 22 file, 210 passed, 0 failed; lint exit 0 |

Thêm: `grep -oE "(src\|href)=..." dist/index.html` → tài nguyên `/thue-cho-thue/assets/...`, canonical `https://silver-rp.github.io/thue-cho-thue/`; `dist/robots.txt` `Allow: /` + Sitemap đúng URL. Workflow đọc tay: `deploy.needs: test`, upload artifact sau lint/test/build, không `continue-on-error`/`|| true`, `on.push.branches: [main]`.

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 14 | 12 | 0,87× |
| USD | 3,0 | 1,73 + ~1,33 (metrics.py; supervisor tạm tính) | ~1,02× |
| Vòng review | 4–6 | 4 | trong khoảng |

### Pre-mortem
1. Trang trắng do đường dẫn tài nguyên sai → chặn: `tests/build/build.test.ts` (HTML đã build, tiền tố `/thue-cho-thue/`, file tồn tại, chạy bundle trong happy-dom); supervisor xem `dist/index.html`.
2. Deploy dù test đỏ → chặn: `tests/build/workflow.test.ts` (kể cả YAML giả bỏ `needs`/thêm `continue-on-error` → đỏ); CI thật: `configure-pages` đỏ thì `deploy` không chạy.
3. Pages chưa bật → **chưa chặn được bằng code** (quyền repo): đã xảy ra, run đầu đỏ. Chờ leader (H-08).
4. `tests/build` xanh mà không build → chặn: build vào thư mục tạm trong test; T4 210 có 45 ca build.
5. Gọi mạng lạ / analytics lộ dữ liệu → chặn: `tests/build/analytics.test.ts`, quét bundle; supervisor build có `VITE_ANALYTICS_URL` → bundle có `sendBeacon` và URL, không đặt → không có (loại nhánh thật).
6. Vượt 100 KB → chặn: đo gzip trong test; thực tế ~16 KB.
7. FAQ lệch luật → chặn phần lớn: `data-rule` so `getRules(2026)`; mục Nguồn vẫn viết cứng "01 tỷ đồng" (H-18).
8. SEO sai đường dẫn con → chặn: `tests/build/content.test.ts` (OG/canonical/sitemap, XML hợp lệ, robots).
9. Test build chập chờn → chặn: `tests/build` chạy ~2 giây, không mạng.

### Kiểm độc lập
- Build với `VITE_ANALYTICS_URL=https://a.example/e` (outDir `/tmp/r5an`) → bundle có `sendBeacon` ×2 và `a.example`; build mặc định không có: analytics thật sự bị loại khi tắt.
- Bỏ thẻ HTML của `dist/index.html` → vẫn thấy "Ngưỡng doanh thu là bao nhiêu?" (chuỗi smoke) và "Thuế cho thuê": đọc được không cần JS.
- T9 thật sau merge: 404 (xem trên).

### Ghi chú reviewer (không chặn)
Nguồn viết cứng "01 tỷ đồng"; `data-rule=deadline` chỉ so 31/01/2027; test happy-dom `eval` bundle chỉ đúng khi một chunk; chưa quét bundle không chứa `yaml`. Supervisor thêm: dự phòng `fetch` analytics không `.catch` (chỉ khi bật); action Node 20 bị cảnh báo deprecated. Gộp vào H-18.

Quyết định: đạt tiêu chí 1, 2, 4; tiêu chí 3 theo plan đo sau merge và chưa đạt vì Pages chưa bật (ngoài quyền supervisor: bật Pages là công khai trang, chờ leader). Merge #18 (main không có check bắt buộc). Không quyết định (c). Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R5 `done`, T8 đạt (8/9), T9 chờ.

## R6: duyệt của supervisor (2026-10-26, PR #24, merge b57d0df)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R6` 4be213a)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify sạch, build 0 | `verify.py`; `verify.py --smoke`; `yarn -s build` | "sạch (không có lỗi mới so với baseline)"; smoke `pages` ok; build exit 0 |
| 2 | T4 > 210 passed | `yarn -s test` | 27 file, 245 passed, 0 failed |
| 3 | T5 | `yarn -s test tests/ui` | 7 file, 70 passed (trước 60) |
| 4 | T6 | `yarn -s test tests/ledger` | 5 file, 61 passed (trước 44) |
| 5 | T7 | `yarn -s test tests/export` | 5 file, 34 passed (trước 28) |
| 6 | Mỗi lỗ có ca qua DOM, đỏ trước khi sửa | `git checkout origin/main -- src` rồi chạy 5 file test mới (`tests/main.test.ts`, `tests/ledger/safe-storage.test.ts`, `tests/ui/two-tabs.test.ts`, `tests/ui/money-label.test.ts`, `tests/export/deadlines-past.test.ts`), sau đó trả `src` về | 26 failed, 9 passed: H-12 (main SecurityError), H-10 (13 ca: thêm căn trên `{"schemaVersion":2…` và `{oops`, tải bản cũ, sổ mới, nhập JSON, getItem ném), H-11 (3 ca), H-14 (ca 1–3), H-09 (ca 5, 6b), H-20 (ca 1-2, biên hôm nay, `.ics` today), H-19 (ca 5). 9 ca xanh sẵn là ca chống hồi quy (3 căn liên tiếp, năm 2027, quét `new Date`, trả trước phân bổ…). Trên nhánh mốc: tất cả xanh. Khớp số đỏ worker ghi trong `plan/PROGRESS.md` |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 16 | 18 | 1,16× |
| USD | 4,0 | 2,25 + ~1,31 (metrics.py; supervisor tạm tính) | ~0,89× |
| Vòng review | 4–7 | 4 | trong khoảng |

### Pre-mortem
1. Test đi vòng hàm thuần → chặn: mọi ca lỗ đi qua `mountLedger`/`mountCalculator`/import `src/main.ts`; supervisor xác nhận đỏ trên `src` cũ (bảng trên).
2. Hai tab giả bằng một object → chặn: `two-tabs` dùng hai `mountLedger` trên cùng `FakeStorage`, ca không bắn sự kiện vẫn chặn.
3. "Hôm nay" từ `new Date()` → chặn: `deadlines-past` ca 4 quét `src/export`, `src/ui/export.ts`; ca biên hôm nay/hôm sau.
4. Kẹt ở sổ khoá / sổ mới ghi đè bản cũ → chặn: `safe-storage` (tải bản cũ, confirm false/true, dự phòng đã có chuỗi khác, không ghi được dự phòng thì vẫn khoá). Còn hở nhỏ: cả hai khoá dự phòng đầy thì ghi đè `backup:2` (H-07).
5. Nhập JSON khi kho hỏng → chặn: `safe-storage` ca nhập JSON (từ chối/đồng ý, dự phòng trước).
6. Getter `localStorage` ném → chặn: `tests/main.test.ts`.
7. Tab tự chặn chính mình → chặn: `two-tabs` ca 3 căn liên tiếp.
8. Nhãn "ước tính" chỉ ở một nơi → chặn: `money-label` ca 1–3 kèm luật đã xác nhận không có nhãn.
9. H-09 so chuỗi lỗi engine → chặn: `money-label` ca 6b (luật giả ném lỗi khác).
10. H-19 lọc `receivedOn` làm mất hạn phân bổ → chặn: `deadlines-past` ca 6.
11. `VALARM` sót/thừa theo sự kiện → chặn: đếm `BEGIN:VALARM` theo từng `VEVENT` (ca 1-2, 3).

### Kiểm độc lập (vitest, file tạm trong `tests/ui/`, đã xoá sau khi chạy)
- Hai tab cùng mở trên kho hỏng `{oops`: A "Bắt đầu sổ mới" + thêm "A"; B "Bắt đầu sổ mới" + thêm "B" → kho vẫn `["A"]` (B bị chặn vì khoá chính đã khác), `backup` vẫn `{oops`. Đạt.
- `StorageEvent` khoá chính với `newValue: null` (tab khác xoá) → B hiện "Sổ đã được đổi ở tab khác". Đạt (reviewer ghi thiếu ca này).
- Đường chạy thật: `mountLedger` lấy `today` bằng `localToday()` (chỉ trong UI) và truyền cho `mountExport`, nên trang thật gắn "đã qua" theo ngày máy người dùng.

### Ghi chú reviewer (không chặn)
`preserveRaw` ghi đè `backup:2` khi cả hai dự phòng đầy (gộp H-07); ca khoá cho "hợp đồng trừ ngưỡng"/"cách khai" chạy trên sổ rỗng (an toàn vì mọi ghi qua `apply()`); `summarizeYearSafe` gộp mọi lỗi tính (ngoài thiếu luật) thành thông báo về số tiền.

Quyết định: đạt 6/6 tiêu chí cấp mốc. Merge #24 (main không có check bắt buộc). Không quyết định (c); Đề xuất chờ duyệt giữ nguyên (mốc engine H-02/H-01/H-03; FAQ tĩnh cho leader; cảnh báo "Khai 2 lần" gắn H-04; máy tính chưa có `today`); đề xuất "thêm build vào verify" đã xong (H-08 đóng). Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R6 `done`.

## R7: duyệt của supervisor (2026-10-27, PR #29, merge aedd62f)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R7` 0244024)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify + smoke sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke `pages` ok |
| 2 | T4 > 245 | `yarn -s test` | 32 file, 275 passed, 0 failed |
| 3 | T5 ≥ 6, tăng | `yarn -s test tests/ui` | 10 file, 82 passed (trước 70) |
| 4 | T6 ≥ 8 | `yarn -s test tests/ledger` | 5 file, 61 passed (đạt ngưỡng; không tăng: ca H-28 qua DOM nằm ở `tests/ui/import-old.test.ts`) |
| 5 | T7 ≥ 6 | `yarn -s test tests/export` | 5 file, 34 passed (giữ) |
| 6 | T8: build + tests/build, gzip ≤ 100 KB, không gọi mạng | `yarn -s build && yarn -s test tests/build`; `gzip -c dist/assets/*`; `grep -rlE "fetch\(\|XMLHttpRequest" src` | build 0, 48 passed; JS 17.302 B + CSS 1.033 B gzip (~18 KB); chỉ `src/analytics.ts` |
| 7 | H-20, H-27, H-28, H-31 có ca qua DOM/`startApp`, đỏ trước khi sửa | `git checkout origin/main -- src index.html` (bỏ `src/start.ts`), chạy `tests/start.test.ts`, `tests/ui/calc-past.test.ts`, `tests/ui/import-old.test.ts`, `tests/ui/ledger-total.test.ts`, rồi trả `src` về | `tests/start.test.ts` đỏ (chưa có `startApp`, H-31); 6 ca đỏ: H-20 máy tính (2), H-28 (2), H-27 (2); 6 ca xanh sẵn là chống hồi quy (file lạ bị từ chối, trả trước phân bổ…). Trên nhánh mốc: tất cả xanh; `tests/build/faq-deadline.test.ts` 3 passed; `tests/main.test.ts` 2 passed |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 18 | 20 | 1,13× |
| USD | 4,0 | 2,58 + ~1,36 (metrics.py; supervisor tạm tính) | ~0,99× |
| Vòng review | 4–7 | 4 | trong khoảng |

### Pre-mortem
1. Test phụ thuộc ngày chạy → chặn: `tests/start.test.ts` (2027-01-15/01-31/02-01/03-01, quét `new Date(`/`Date.now(`); supervisor thêm biên 2027-01-31 trên HTML build.
2. FAQ ngày cứng → chặn: `tests/build/faq-deadline.test.ts`. Câu "1/1/2026" ở Nguồn đổi thành `<span data-rule="year">` (điều chỉnh (a) của worker).
3. Nới kiểm nhập → chặn: `import-old` mục 2–3; supervisor thêm `app: null`, `properties: "x"`, `__proto__` (đều bị từ chối).
4. Rò listener khi đổi năm → chặn: `tests/start.test.ts` mục 6.
5. Năm chưa có luật ném lỗi / không thấy 2027 → chặn: `tests/start.test.ts` mục 3–5; supervisor thêm 2027-02-01 trên HTML build.
6. H-27 lọc theo `receivedOn` → chặn: `ledger-total` ca trả trước `allocate`.
7. H-28 chỉ sửa hàm thuần → chặn: `import-old` mục 1 qua DOM.
8. Analytics/chặn `localStorage` hỏng → chặn: `tests/main.test.ts`; supervisor thêm `storage: null` + đổi năm.

### Kiểm độc lập (vitest, file ngoài repo `/tmp/r7probe/probe.test.ts`, 4/4 passed)
- `today` 2027-01-31, gọi `startApp` hai lần trên `dist/index.html`: một ô chọn năm, giá trị 2026; 31/01/2027 không "đã qua"; 31/07/2026 đúng một nhãn "đã qua".
- `today` 2027-02-01: không ném; `#app` báo "Chưa có quy định thuế cho năm 2027"; không lộ `getRules`/`REGISTRY`/`schemaVersion`.
- `storage: null`, đổi 2027 → 2026: đúng một `role=alert` ở `#ledger`, máy tính có form.
- `importLedger`: `app: null`, `properties` không phải mảng, `__proto__` thiếu khoá → từ chối; sổ đúng dạng không `app` → nhận.

### Ghi chú (không chặn)
`startApp` giữ hàm gỡ ở biến cấp module (`previous`): gọi trên hai `document` khác nhau sẽ gỡ nhầm (chỉ test gặp). Reviewer ghi probe vào `/tmp` (worker báo là lỗi plugin).

Quyết định: đạt 7/7 tiêu chí cấp mốc. Merge #29 (main không có check bắt buộc). Không quyết định (c). Đóng H-20, H-27, H-28; H-31 thu hẹp còn luật 2027 (`human_only`). Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R7 `done`.

## R8: duyệt của supervisor (2026-10-27, PR #35, merge 4d9b5e8)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R8` 6d857a2)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify + smoke sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke `pages` ok |
| 2 | T4 > 276 | `yarn -s test` | 36 file, 331 passed, 0 failed |
| 3 | T5 ≥ 82 + ca mới | `yarn -s test tests/ui` | 13 file, 119 passed (trước 82; không xoá ca, 3 ca cũ sửa theo DOM, ghi trong `plan/PROGRESS.md`) |
| 4 | T6 không giảm | `yarn -s test tests/ledger` | 5 file, 61 passed |
| 5 | T7 không giảm | `yarn -s test tests/export` | 5 file, 34 passed |
| 6 | T8: build + tests/build, gzip ≤ 100 KB, không font/URL ngoài | `yarn -s build && yarn -s test tests/build` | build 0; 6 file, 66 passed; JS 20,09 KB + CSS 2,63 KB gzip (~23 KB); `tests/build/shell.test.ts` quét `@import`/`@font-face`/`url(http` |
| 7 | Một sổ vượt ngưỡng qua `startApp`: tổng quan, biên lai, thẻ căn, bảng = `summarizeYear` | `tests/ui/overview.test.ts` "số ở câu lớn, biên lai…" + `tests/ui/due.test.ts` "3 thẻ căn bằng revenueByProperty…" (cùng sổ 3 căn, tách 2 ca); supervisor kiểm thêm trên bản build trong Chrome | xanh; Chrome: `.answer` "Phải nộp khoảng 70.000.000 đ" = `.total` = "Tổng thuế 70.000.000 đ" ở `.lg-total`; thẻ căn 300/540/360 triệu; `tfoot` 1.200.000.000 / 1.000.000.000 / 10.000.000 / 60.000.000 đ |
| 8 | Chrome headless 390 px và 1280 px, sổ mẫu vượt ngưỡng, `today` thật | bản `dist` chép ra `/tmp/r8shot-*`, `seed.js` ghi sổ 3 căn tên dài vào `localStorage`, `http.server`; 1280: `--window-size=1280`; 390: Chrome không thu dưới 500 px nên đo trong `iframe` rộng 390 | 390: `scrollWidth` 390 = `innerWidth`, `.tabbar` grid + `position: fixed` đáy, `.nav` none, `.lg-cards` grid (3 thẻ), `.lg-contract-wrap` none, không phần tử nào vượt mép ngoài `.table-scroll`. 1280: `scrollWidth` 1280, `.nav` flex, `.tabbar` none, bảng hiện, thẻ căn ẩn. Thẻ hạn "31/01/2027 · Còn 96 ngày" (today 2026-10-27) |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 24 | 22 | 0,92× |
| USD | 5,0 | 2,93 + ~1,40 (metrics.py; supervisor tạm tính) | ~0,86× |
| Vòng review | 4–8 | 4 | trong khoảng |

### Pre-mortem
1. Số lệch/chép mockup → chặn: `overview.test.ts` (bằng `summarizeYear`, đổi theo khi thêm/xoá kỳ thu qua DOM, quét số mẫu), `due.test.ts` (thẻ căn = bảng = tổng); supervisor thêm ca 1 căn 2 hợp đồng + trả trước `lump` + khai 2 lần.
2. Xoá test UI cũ → chặn: T5 82 → 119; 3 ca sửa theo DOM giữ khẳng định.
3. Tràn ngang điện thoại → chặn: test cấu trúc + supervisor đo Chrome 390 px (tiêu chí 8).
4. Đếm ngày sai biên/đọc đồng hồ → chặn: `due.test.ts` (`daysUntil` 5 ca, 2027-01-10/01-31/02-01), quét `new Date(` R7 xanh.
5. Ô `type="date"` mất lỗi → chặn: `due.test.ts` "ô ngày trống…"; `tests/ledger` ngày không có thật xanh.
6. Mất `name="tax-year"`/hai ô → chặn: `tests/build/shell.test.ts`, `tests/start.test.ts`; supervisor gọi `startApp` hai lần trên `dist/index.html`: một ô.
7. Tổng quan không vẽ lại / kho chặn → chặn: `overview.test.ts` (sổ khoá, `storage: null`).
8. Tương phản thấp → chặn: `shell.test.ts` (12 cặp ≥ 4,5).
9. Radio cách khai mất giá trị → chặn: `calc-card.test.ts` (twice → 2 hạn).
10. Font/mạng ngoài → chặn: `shell.test.ts`, `tests/build`.

### Kiểm độc lập (vitest, file ngoài repo `/tmp/r8shot-*/edge.test.ts`, 3/3 passed)
- 1 căn 2 hợp đồng + 1 căn trả trước `lump` 900.000.001 đ, khai 2 lần, `today` 2027-01-10: tổng quan = `summarizeYear`; thẻ căn = `revenueByProperty`; thẻ hạn "khai 2 lần", có 31/07/2026, "Còn 21 ngày".
- Sổ trống trên `dist/index.html`: tổng quan "chưa có kỳ thu", thẻ hạn "Chưa có kỳ thu năm 2026", không số tiền.
- `startApp` hai lần: một ô năm, một `.answer`; số = `summarizeYear` (ô năm hiện chỉ có 2026 nên nhánh đổi năm không chạy; R7 đã có test).

### Ghi chú (không chặn) → H-48
`overview.ts` đọc thuế suất qua `["rate","Bps"].join("")` để lách quét `rateBps`; dòng "cách tính" tự dựng cơ sở × thuế suất (chữ); `h1` cứng "2026"; lỗi ngày trống ở `src/ledger/ops.ts:48` còn "AAAA-MM-DD". Ở 1280 px máy tính bên phải còn tiêu đề cũ "Thuế cho thuê nhà" trên thẻ "Tính nhanh một hợp đồng" (trùng tên trang).

Quyết định: đạt 8/8 tiêu chí cấp mốc. Merge #35 (main không có check bắt buộc). Quyết định (c): lách `rateBps` không chặn merge (giá trị vẫn từ `TaxRules`); hướng sửa ở mốc sau là `src/rules` xuất nhãn thuế suất để guard giữ chặt, không allowlist. Đóng H-13 (ca `due.test.ts` "bốn ô ngày có type=date"; `main` trước đó không có `type="date"`). Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R8 `done`.

## R9: duyệt của supervisor (2026-10-27, PR #38, merge 502114d)

PR đã merge trước bước duyệt (runner, 00:02 UTC); supervisor duyệt lại trên `origin/main` 502114d (cây trùng `origin/milestone/R9`).

### Tiêu chí cấp mốc (supervisor tự chạy trên 502114d)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify + smoke sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke `pages` ok |
| 2 | T4 > 331 | `yarn -s test` | 39 file, 389 passed, 0 failed |
| 3 | T5 tăng | `yarn -s test tests/ui` | 14 file, 139 passed (trước 119) |
| 4 | T6 không giảm | `yarn -s test tests/ledger` | 5 file, 61 passed |
| 5 | T7 không giảm | `yarn -s test tests/export` | 5 file, 34 passed |
| 6 | T8: build + tests/build, gzip ≤ 100 KB, không `fetch`/XHR ngoài analytics | `yarn -s build && yarn -s test tests/build`; `gzip -c dist/assets/*`; `grep -rnE "fetch\(\|XMLHttpRequest" src` | build 0; 73 passed; JS 21.319 B + CSS 2.669 B gzip (~23 KB); grep chỉ ra `src/analytics.ts` |
| 7 | H-39/40/41/43 có ca tái hiện đỏ trước khi sửa; H-42 có phép đảo | `git checkout d6a8684 -- src` rồi chạy 7 file test R9, trả lại `src` | 24 failed / 65 passed trên `src` trước R9: H-40 (7 ca `localToday` theo TZ), H-39 (`filingYear` luật giả hạn 01/02, `once` muộn nhất, quét `02-01`), H-40 tab qua nửa đêm (2 ca), H-41 (5 ca: chữ gõ dở, radio, stale, nhập file muộn), H-43 (7 ca `persist`/nhắc). H-42: supervisor tự đảo `<` → `<=` ở so ngày FAQ `src/start.ts:275` → `faq-deadline` 2 failed (biên 31/07/2026, 31/01/2027), trả lại xanh; các phép đảo khác ghi trong `plan/PROGRESS.md` |
| 8 | Mọi test đọc đồng hồ ghim giờ | `tests/start-date.test.ts` nhóm "quét test đọc đồng hồ (mục 8)" | xanh trong T4 |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 20 | 29 | 1,43× |
| USD | 4,0 | 4,50 (metrics.py) | 1,13× |
| Vòng review | 4–7 | 6 (2+2+1+1) | trong khoảng |

Phút lệch do 2 task phải vòng 2 (reviewer tự probe ra lỗi radio `filing` và khối CSS chen giữa selector).

### Pre-mortem
1. Test múi giờ đúng tình cờ → chặn: `start-date.test.ts` TZ UTC/Tokyo/New York, biên 16:59:59Z/17:00:00Z (đỏ trên src cũ); supervisor thử thêm `Pacific/Kiritimati` (UTC+14), `Pacific/Pago_Pago` (UTC−11): đúng biên.
2. `persist()` không gọi trong happy-dom → chặn: `backup-reminder.test.ts` giả `navigator.storage`.
3. Ca H-42 xanh vô nghĩa → chặn: phép đảo (supervisor tự làm 1, đỏ 2 ca).
4. Mốc đổi năm vẫn cứng 02-01 → chặn: ca luật giả hạn 01/02 (đỏ trên src cũ), quét `02-01`.
5. Trả nhầm ô → chặn: `start-h41.test.ts` "mỗi ô giữ đúng giá trị", ca radio.
6. Mất cờ stale → chặn: `start-h41.test.ts` "cờ stale sống qua đổi năm".
7. Nhập file muộn ghi đè → chặn: `start-h41.test.ts` "nhập file đến muộn".
8. Nhắc ghi kho/sai biên → chặn: `backup-reminder.test.ts` biên 29/30 ngày, mount không `setItem`.
9. Quay lại tab mất chữ/năm đã chọn → chặn: `start-date.test.ts` 2 ca `startApp`.
10. Tự dời hạn Chủ Nhật → chặn: ca H-39 qua `startApp` `2027-02-01` → 2027.

### Kiểm độc lập (vite-node, file ngoài repo `/tmp/r9probe/probe.ts`)
- `localToday` ở UTC+14 và UTC−11: `2027-01-31T16:59:59.999Z` → `2027-01-31`, `17:00:00Z` → `2027-02-01`.
- `filingYear` luật thật: `2026-12-31` → 2026, `2027-01-01` → 2026; `rulesOf` ném lỗi → không vỡ, `2027-02-01` → 2027. `2026-01-15` → 2025 (không có luật 2025; quá khứ, không ảnh hưởng).
- Phép đảo FAQ (tiêu chí 7).

### Ghi chú (không chặn) → H-49
Từ báo cáo mốc: ghi `last-backup` lỗi thì sau xuất vẫn nhắc; ảnh chụp ô gõ dở giữ khoá form đã mất; chưa quét chung lỗi gộp selector CSS.

Quyết định: đạt 8/8 tiêu chí cấp mốc (PR đã merge trước, không cần merge lại; main không có check bắt buộc). Không quyết định (c). Đóng H-39, H-40, H-41, H-42; H-43 hạ low (còn thử Safari/iOS thật); thêm H-49. Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R9 `done`.

## R10: duyệt của supervisor (2026-10-28, PR #44, merge 3d576a9)

### Tiêu chí cấp mốc (supervisor tự chạy trên `origin/milestone/R10` 53bf22b)
| # | Tiêu chí | Lệnh | Kết quả |
|---|---|---|---|
| 1 | verify + smoke sạch | `verify.py`; `verify.py --smoke` | "sạch (không có lỗi mới so với baseline)"; smoke `pages` ok |
| 2 | T4 > 389 | `yarn -s test` | 43 file, 429 passed, 0 failed |
| 3 | T5 tăng | `yarn -s test tests/ui` | 17 file, 168 passed (trước 139) |
| 4 | T6 không giảm | `yarn -s test tests/ledger` | 5 file, 61 passed |
| 5 | T7 không giảm | `yarn -s test tests/export` | 5 file, 34 passed |
| 6 | T8: build + tests/build, gzip ≤ 100 KB, không `fetch`/XHR | `yarn -s build && yarn -s test tests/build`; `gzip -c dist/assets/*`; `grep -rlE "fetch\(\|XMLHttpRequest" dist/assets` | build 0; 73 passed; JS 22.035 B + CSS 2.878 B gzip (~24,9 KB, +0,9 KB so R9); grep không ra |
| 7 | H-50/51/53/54 có ca đỏ trước khi sửa; H-52 ca đỏ hoặc "không tái hiện" | `git checkout 5cde5fd -- src` rồi chạy 6 file test R10 (`tests/start-r10`, `tests/tax/annual`, `tests/ui/{receipt-how,contract-cards,page-shell,due}`), trả lại `src` | 31 failed: H-50 (2 ca: máy tính bấm Tính ra TNCN; sổ `years`/`mode`), H-52 (3 ca: tên mới sau đổi ngày, ca audit tab B, đúng một thông báo stale → tái hiện được), H-51 (5 ca `.how` + 4 ca engine), H-53 (6 ca thẻ = bảng = `summarizeYear` + 1 ca `due`), H-54 (2 ca `h1`), H-57 (8 ca hero/aria-current/CSS) |
| 8 | Chrome headless 390/820/1280: không tràn; 390 thẻ có TNCN/GTGT; 820 `.side` không rơi dưới toàn sổ | Chrome headless trên `dist` (phục vụ dưới `/thue-cho-thue/`), sổ seed 2 căn 3 hợp đồng số lẻ (412.345.678; 398.765.431; 250.000.007 đ); trang đo bằng iframe (390 px qua iframe vì headless tối thiểu 500 px) | 390: `scrollWidth` 390 = khổ, 3 thẻ hợp đồng hiện, mỗi thẻ có revenue/deduction/pit/vat (vd. "pit=3.055.555 đ; vat=12.500.000 đ (ước tính)"), bảng ẩn cùng tiêu đề; 820: không tràn, `.side` nằm **trên** `#ledger` cùng cột, bảng hợp đồng hiện; 1280: không tràn, `.side` cột phải. Cả ba: đúng 1 `h1`, `aria-current` theo `#ledger` ở cả `.nav` và `.tabbar` |

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 22 | 29 | 1,32× |
| USD | 4,5 | 3,18 + ~1,64 (metrics.py, supervisor tạm tính) | ~1,07× |
| Vòng review | 4–7 | 5 (1+2+1+1) | trong khoảng |

### Pre-mortem
1. Công thức lệch tiền mà test xanh → chặn: `tests/ui/receipt-how.test.ts` tách cụm `X đ × P%`, Σ làm tròn = `.amt` (600.000.010 × 2, 3 hợp đồng lẻ, `excess`); đỏ trên src cũ.
2. Thẻ lấy nguồn khác bảng → chặn: `tests/ui/contract-cards.test.ts` thẻ = bảng = `summarizeYear`; Chrome 390 px thấy đủ cột.
3. Ca trả trước chỉ kiểm `hidden` → chặn: `tests/start-r10.test.ts` bấm "Tính thuế" ra TNCN; nộp form lưu `years: 3, lump`.
4. Phát `change` làm lưu sổ/hiện lỗi → chặn: ca `setItem` = 0, không `.form-error` (start-r10).
5. So sai mặc định → chặn: ca tên căn mới + `amount` gõ dở giữ; `tests/start-h41`, `tests/start-date` xanh. Mặc định ô sổ đặt bằng thuộc tính HTML ở `buildForm`; sổ không có `textarea` (đã grep).
6. H-52 sửa không ca đỏ → chặn: 3 ca đỏ trên src cũ.
7. Hỏng xuất/CSV → chặn: `tests/export` 34, `tests/ledger` 61 không đổi.
8. Bố cục 761–1090 → test cấu trúc CSS + supervisor đo Chrome 820 px (tiêu chí 8).
9. `h1` ở nhánh chưa có luật → chặn: `page-shell` ca năm chưa có luật.
10. Tiêu đề xoá khỏi màn rộng → chặn: `contract-cards` ca ngoài media; Chrome 820/1280 bảng hiện.

### Kiểm độc lập (vite-node, file ngoài repo `/tmp/sv-r10/edge.ts`)
- `percentLabel`: 0, 5, 50, 100, 150, 500, 850, 1000, 1234 bps → `0%`, `0,05%`, `0,5%`, `1%`, `1,5%`, `5%`, `8,5%`, `10%`, `12,34%`.
- `computeAnnual` 3 hợp đồng lẻ (1.000.001; 700.000.003; 333.333.337 đ) với 3 thứ tự trừ ngưỡng (mặc định, `c1` trước, `c3` trước): không cơ sở âm; Σ `applyRateBps(pitBase)` = `totalPit`, Σ `applyRateBps(vatBase)` = `totalVat`; Σ `pitBase` = "Phần vượt ngưỡng".
- Chrome thật (tiêu chí 8).

### Ghi chú (không chặn) → H-49, H-57
Từ báo cáo mốc: form vẽ lại sau khi lưu mà gõ dở cùng ô với tab khác thì lần gắn lại sau có thể đè giá trị cũ (hiếm, gộp H-49); `scroll-margin-top` 5rem là hằng, không gắn chiều cao `.topbar` (H-57); `src/ui/form.ts:98` thiếu khoảng trắng sau dấu phẩy. Ở 390 px `.side` nằm dưới sổ (thiết kế điện thoại; ngoài tiêu chí).

Quyết định: đạt 8/8 tiêu chí cấp mốc; merge #44 (merge commit, không xoá nhánh; main không có check bắt buộc). Không quyết định (c). Đóng H-50, H-51, H-52, H-53, H-54; thu hẹp H-48, H-57. Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R10 `done`.

## R11: duyệt của supervisor (2026-10-28, PR #50, merge 6d56929)

Supervisor tự chạy trên `de79918` (đầu nhánh `milestone/R11`), worktree supervisor, chế độ B `--review-only`.

### Tiêu chí cấp mốc
| # | Tiêu chí | Lệnh supervisor tự chạy | Kết quả |
|---|---|---|---|
| 1 | verify + smoke sạch | `verify.py`; `verify.py --smoke` | "verify: sạch"; `[smoke] ok pages`, "smoke: sạch" |
| 2 | T10 0 failed, ≥ 25 passed | `yarn -s e2e`; thêm `--repeat-each=3 --workers=4` | 37 passed; 111 passed (không flaky) |
| 3 | 0 `test.fail/fixme/skip/.only` | `grep -rnE "test\.(fail\|fixme\|skip)\|\.only\(" e2e/` | không in gì (exit 1) |
| 4 | mỗi mã S có ca e2e | `yarn -s e2e --list` rồi `grep -cE "S<n>[^0-9]"` | S9 2, S15 1, S16 1, S18 1, S20 1, S21 1, S22 1, S23 1, S24 1, S25 9, S27 2 |
| 5 | T4 > 429 | `yarn -s test` | 48 file, 459 passed |
| 6 | T5 ≥ 168 | `yarn -s test tests/ui` | 188 passed |
| 7 | T6 ≥ 61 | `yarn -s test tests/ledger` | 61 passed |
| 8 | T7 ≥ 34 | `yarn -s test tests/export` | 34 passed |
| 9 | T8 | `yarn -s build && yarn -s test tests/build`; gzip `dist/assets/*.{js,css}` | exit 0, 73 passed; 26.052 byte (~26 KB ≤ 100 KB) |
| 10 | `plan/PROGRESS.md` có ca đỏ đầu tiên + sửa ở file nào | đọc `plan/PROGRESS.md` mục R11 | có cho dev-01..dev-04 (lệnh, dòng đỏ, file sửa; "xanh ngay" cho luồng sổ, S15, S18, S27) |

### H-xx đóng: test tái hiện
- H-58 (tab hiện qua 00:00; `localToday` ngoài `try`): lấy `src/start.ts` + `src/main.ts` của `50997a8` (trước R11), chạy `yarn -s vitest run tests/start-timer.test.ts tests/main-clock.test.ts` → 9 failed (vd "tab vẫn hiện, không có visibilitychange: qua 00:00 gắn lại theo ngày mới", "vẫn có máy tính và sổ, không ném ra ngoài"); trả src R11 → 10 passed. Đóng H-58.
- Thu hẹp (không đóng): H-21 (e2e Chromium trong verify/CI; smoke Pages vẫn grep tĩnh), H-29 (S24 kho bị chặn báo đúng; còn khoá phiên bản mới), H-35 (bỏ nút "Bắt đầu sổ mới" khi `getItem` ném; còn Xuất JSON khi khoá).

### Ước tính ↔ thực tế
| | Ước tính | Thực tế | Lệch |
|---|---|---|---|
| Task | 4 | 4 | 0 |
| Phút worker | 35 | 47 | 1,33× |
| USD | 5,5 | 3,94 + ~1,73 (metrics.py, supervisor tạm tính) | ~1,03× |
| Vòng review | 5–8 | 4 (1+1+1+1) | dưới khoảng (tốt) |

### Pre-mortem
1. Bộ chọn bắt nhầm vùng → chặn: ca đọc trong `#ledger`, `.lg-summary`, `td[data-col=pit]`, `#overview`, `#app .results`; S9 kiểm vắng `20.000.000 đ`.
2. `test.fail` giấu lỗi → chặn: tiêu chí 3 (grep sạch).
3. Ẩn ô năm / `overflow:hidden` → chặn: ca S28 360 px 200% kiểm `#tax-year` hiện, nằm trong khung, `overflowX` khác `hidden`, `selectOption("2026")`.
4. Tên ô năm lệch → chặn: `getByRole("combobox", { name: "Năm tính thuế" })` + axe 390/1280.
5. S21 xanh vì đồng hồ đứng → chặn: `page.clock.install` + phép đảo bỏ `arm()` làm đỏ (worker ghi); supervisor tái hiện 9 ca đỏ trên src cũ.
6. Hẹn giờ chồng/ghi kho → chặn: `tests/start-timer.test.ts` (một hẹn giờ sau N lần gắn, không `setItem`).
7. S23 chỉ kiểm có `confirm` → chặn: ca đòi "2 kỳ thu" + "Xuất JSON", Huỷ giữ sổ.
8. S27 chuỗi trong bộ nhớ → chặn: `waitForEvent("download")`, BOM `EF BB BF`.
9. S25 chỉ máy tính nhanh → chặn: 9 ca, mỗi ca gõ vào cả hai chỗ.
10. Luồng sổ bằng nạp sổ → chặn: ca "luồng sổ" chỉ `fill/click`, `reload`.
11. Thiếu Chromium → không xảy ra (worktree supervisor có Chromium; e2e xanh).

### Kiểm độc lập
- Lặp e2e 3 lần song song 4 worker: 111 passed (ca đồng hồ S20/S21 không flaky).
- Đọc `src/ui/due.ts:77-95`: "Quá hạn N ngày" chỉ khi không còn hạn ≥ hôm nay và `status === "taxable"`; N = `daysUntil(hạn khai cuối, hôm nay)` > 0; không tính phạt (đúng CRITICS "Soát").
- Đọc `src/start.ts`: hẹn giờ 30 giây gỡ ở teardown (`dead` + `clearTimeout`), gắn lại qua `run` mới nên không chồng.

### Ghi chú (không chặn)
- H-60 mới: 320 px chữ 200% tràn 1 px, 360 px chữ 300% tràn 95 px (ngoài tiêu chí; đề xuất (c) của worker → mốc sau).
- `main.ts` dùng ngày UTC tạm khi `localToday` lỗi (07:00 VN trở về trước có thể lệch một ngày, hẹn giờ đọc lại); `replaceMessage` đếm kỳ thu theo mã, không theo nội dung.
- Lỗi plugin: `.autodev/reviews/dev-0N-r1.json` trùng tên giữa các mốc nên bị ghi đè (bản cũ còn trong git) → việc của plugin.

Quyết định: đạt 10/10 tiêu chí cấp mốc; merge #50 (merge commit, không xoá nhánh; main không có check bắt buộc). Không quyết định (c). Đóng H-58; thu hẹp H-21, H-29, H-35; thêm H-60. Thí nghiệm superpowers: config không bật, bỏ qua. Goal `thue-cho-thue-v1`: R11 `done`, T10 đạt.

<!-- metrics:start (tự sinh bởi .autodev/metrics.py, đừng sửa tay) -->
## Số đo plugin B1–B5 (định nghĩa: ROADMAP bảng B)

### B1 Lỗi lọt qua review (lỗ hổng mới mức cao + vừa / task trong phạm vi audit; ngưỡng ≤ 0,5)

| Audit | Phạm vi | Lỗ hổng mới cao+vừa | Task | B1 |
|---|---|---|---|---|
| 2026-10-26.md | R1, R2, R3 | 8 | 12 | 0,67 |
| 2026-10-26-2.md | R4, R5 | 4 | 8 | 0,50 |
| 2026-10-26-3.md | – | 0 | 0 | – |
| 2026-10-26-4.md | R6 | 6 | 4 | 1,50 |
| 2026-10-27.md | R7 | 5 | 4 | 1,25 |
| 2026-10-27-2.md | – | 0 | 0 | – |
| 2026-10-27-3.md | R8, R9 | 4 | 8 | 0,50 |
| 2026-10-28.md | R10, R11 | 10 | 8 | 1,25 |

### B2 Độ chặt review: 3/44 task cần ≥ 2 vòng (7%). Đọc cùng B1: B2 thấp mà B1 cao là reviewer lỏng.

### B3–B5 theo mốc (B3: thực tế / ước tính, 1,0 = trong khoảng, ngưỡng 0,5–2; B4: số lần runner dừng, ngưỡng 0; B5: chi phí trên task)

| Mốc | Task | Phút worker | USD | Phút/task | USD/task | Lượt | B3 phút | B3 USD | B4 dừng |
|---|---|---|---|---|---|---|---|---|---|
| R1 | 4 | 8 | 2,23 | 2,1 | 0,56 | 75 | 0,14 | 0,56 | 0 |
| R10 | 4 | 29 | 5,75 | 7,2 | 1,44 | 124 | 1,30 | 1,28 | 0 |
| R11 | 4 | 47 | 5,66 | 11,7 | 1,42 | 111 | 1,33 | 1,03 | 0 |
| R2 | 4 | 11 | 2,53 | 2,7 | 0,63 | 76 | 0,53 | 0,63 | 0 |
| R3 | 4 | 15 | 4,21 | 3,8 | 1,05 | 92 | 0,76 | 1,14 | 0 |
| R4 | 4 | 12 | 3,50 | 3,1 | 0,88 | 86 | 0,83 | 1,17 | 0 |
| R5 | 4 | 12 | 2,95 | 3,1 | 0,74 | 70 | 0,87 | 0,98 | 1 |
| R6 | 4 | 18 | 3,88 | 4,6 | 0,97 | 97 | 1,16 | 0,97 | 0 |
| R7 | 4 | 20 | 4,16 | 5,1 | 1,04 | 108 | 1,13 | 1,04 | 1 |
| R8 | 4 | 22 | 5,08 | 5,5 | 1,27 | 117 | 0,92 | 1,02 | 0 |
| R9 | 4 | 29 | 6,10 | 7,1 | 1,53 | 139 | 1,43 | 1,53 | 0 |

– = mốc chưa chạy. Phút = giờ thật của worker trong `run.log` (ước tính chỉ tính worker); USD gồm worker + supervisor. `+ ~x`: chưa có `runs/*.json` của supervisor (nó đang chạy), cộng tạm chi phí supervisor trung bình; chạy lại `--write` sau khi mốc xong để có số thật. Mốc trước R4 chạy chế độ A (không có `runs/*.json`) nên hiện –.
<!-- metrics:end -->
