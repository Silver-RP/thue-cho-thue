# Tiến độ và số đo theo mốc

| Mốc | Thời gian | Chi phí | Ghi chú |
|---|---|---|---|
| R1 | 8 phút worker (ước tính 60) | 1,31 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,14, USD 0,33 |
| R2 | 11 phút worker (ước tính 20) | 1,49 + ~0,92 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,53, USD ~0,60 |
| R3 | 15 phút worker (ước tính 20) | 3,03 USD theo metrics.py (ước tính 3,7) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,76, USD 0,82 |
| R4 | 12 phút worker (ước tính 15) | 3,50 USD theo metrics.py (ước tính 3,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,83, USD 1,17 |
| R5 | 12 phút worker (ước tính 14) | 1,73 + ~1,33 USD (ước tính 3,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,87, USD ~1,02 |

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
