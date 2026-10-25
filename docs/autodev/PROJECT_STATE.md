# Trạng thái dự án (đọc trước plan mốc)

Cập nhật: 2026-10-26 · Nguồn: duyệt mốc R3 (PR #11, merge 490a7cb)

## Mốc
| Mốc | Trạng thái | Ghi chú |
|---|---|---|
| R1 | merged (#5) | Engine thuế + cấu hình luật 2026; 4/4 task PASS vòng 1; T1–T4 đạt |
| R2 | merged (#8) | Máy tính thuế một căn; 4/4 task PASS vòng 1; T5 đạt |
| R3 | merged (#11) | Sổ doanh thu nhiều căn; 4/4 task PASS vòng 1; T6 đạt |
| R4–R5 | chưa có plan | Theo `docs/goals/thue-cho-thue-v1/roadmap.md` |

## Mục tiêu và tiêu chí
Goal `thue-cho-thue-v1` (`docs/goals/thue-cho-thue-v1/goal.json`): web app tĩnh giúp người cho thuê 1–5 căn tự lo thuế cho thuê theo luật 2026. Đạt ~67% (6/9 chỉ số: T1–T6).

| Chỉ số | Lệnh | Ngưỡng | Hiện tại |
|---|---|---|---|
| T1 | `yarn -s test tests/tax` | 0 failed, ≥ 15 passed | 25 passed |
| T2 | `yarn -s test tests/rules` | 0 failed, ≥ 4 passed | 7 passed |
| T3 | `yarn -s lint` | exit 0 | exit 0 |
| T4 | `yarn -s test` | 0 failed | 134 passed |
| T5 | `yarn -s test tests/ui` | 0 failed, ≥ 6 passed | 60 passed |
| T6 | `yarn -s test tests/ledger` | 0 failed, ≥ 8 passed | 41 passed |
| T7–T9 | xem goal.json | | chưa làm (R4–R5) |

## Kiến trúc hiện nay
- `src/rules/`: `types.ts` (`TaxRules`), `2026.ts` (mọi số luật + căn cứ L1–L7), `index.ts` (`getRules(year)`, năm chưa có thì ném lỗi).
- `src/tax/`: `money.ts` (tiền nguyên đồng, `applyRateBps` bằng BigInt, làm tròn xuống), `revenue.ts` (doanh thu năm theo ngày nhận, trả trước `lump`/`allocate`), `annual.ts` (`computeAnnual`: trừ ngưỡng theo `deductionOrder`, TNCN, GTGT, `status`, hạn, căn cứ), `deadlines.ts` (hạn khai 1/2 lần, hạn thông báo doanh thu).
- `src/ui/`: `money.ts` (`parseVnd`, `formatVnd` → `12.000.000 đ`), `calculator.ts` (`calculate`), `form.ts` (`mountCalculator`), `ledger.ts` (`mountLedger(root, { year, storage, rules?, newId?, today?, confirm? })`, DOM thuần), `style.css` (mobile trước, bảng trong `.table-scroll`).
- `src/ledger/`: `model.ts` (kiểu sổ, `emptyLedger`), `ops.ts` (thêm/sửa/xoá thuần, `cascade`, `setDeductionChoice`), `summary.ts` (`ledgerToPayments`, `summarizeYear` gọi `computeAnnual`, ném lỗi khi `rules.year` khác `year`, `thresholdWarning`), `schema.ts` (`parseLedger` + `migrations`), `storage.ts` (khoá `thue-cho-thue:ledger`, dự phòng `thue-cho-thue:ledger:backup`), `backup.ts` (xuất/nhập JSON có `app: "thue-cho-thue"`).
- `src/main.ts` gắn máy tính vào `#app` và sổ phía dưới, năm 2026, `window.localStorage`. Test UI dùng `happy-dom` (devDependency).
- Hàm thuần, không đọc giờ hệ thống; `src/tax` nhận `rules` làm tham số; `src/ledger` nhận `newId`, `Storage`.

## Quy tắc → test bảo vệ
| Quy tắc | Test bảo vệ |
|---|---|
| Không số luật trong `src/tax` | `tests/rules/rules.test.ts` (quét `1000000000`, `1_000_000_000`, `0.05`, `07-31`, `01-31`) |
| Không số luật trong `src/ui` (R2) | `tests/ui/calculator.test.ts` (quét thêm `rateBps`, `/ 10000`) |
| Không số luật trong `src/ledger`, `src/ui/ledger.ts` (R3) | `tests/ledger/ledger.test.ts`, `tests/ui/ledger.test.ts` (quét) |
| Tiền nguyên đồng, làm tròn xuống | `tests/tax/annual.test.ts`, `tests/tax/revenue.test.ts` |
| Trừ ngưỡng một lần cho tổng hợp đồng (L4) | `tests/tax/annual.test.ts`, `tests/ledger/ledger.test.ts`, `tests/ledger/ui-e2e.test.ts` |
| Doanh thu theo ngày nhận tiền (L6) trong sổ | `tests/ledger/ledger.test.ts` (hợp đồng vắt năm, trả trước `allocate`) |
| Hạn 31/01 năm sau (L7) | `tests/tax/deadlines.test.ts` |
| Đọc tiền VNĐ có dấu ngăn, từ chối mơ hồ (R2) | `tests/ui/money.test.ts`, `tests/ui/e2e.test.ts` (gõ `"100.000.000"`) |
| Ô lỗi không hiện số; miễn trừ luôn có; nhãn "ước tính" theo `vatEstimated` (R2) | `tests/ui/form.test.ts`, `tests/ui/e2e.test.ts` |
| JSON sai cấu trúc không ghi đè kho; kho hỏng chép dự phòng, không ghi khoá chính (R3) | `tests/ledger/schema-storage.test.ts`, `tests/ledger/ui-e2e.test.ts` |
| File mẫu schema v1 đóng băng luôn nạp được; đổi schema phải thêm di chuyển (R3) | `tests/ledger/fixtures/ledger-v1.json` + `tests/ledger/schema-storage.test.ts` |

## Lỗ hổng mở
| Mã | Mức | Tóm tắt |
|---|---|---|
| H-01 | low | `computeAnnual` không đối chiếu `year` với `rules.year` (UI R2 và sổ R3 đã chặn phía mình; engine chưa sửa) |
| H-02 | low | Tổng doanh thu không kiểm `Number.isSafeInteger` (UI R2 chặn một phần; sổ R3 nhiều kỳ thu rất lớn vẫn ra tổng không an toàn) |
| H-03 | low | Thiếu test `prepaid.mode` không hợp lệ và `years` lẻ ở engine (sổ R3 đã kiểm phía dữ liệu) |
| H-04 | medium | Cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7: chờ leader/kế toán xác nhận |
| H-05 | low | Lỗi engine (ngày trả trước không có thật) hiện chuỗi kỹ thuật `receivedOn ...` trên máy tính R2 (sổ R3 đã chặn) |
| H-06 | low | Sổ R3: `render()` vẽ lại toàn bộ sau mỗi thay đổi, dữ liệu gõ dở ở form khác mất |
| H-07 | low | Sổ R3: khoá dự phòng chỉ ghi khi trống; lần kho hỏng thứ hai không được sao lưu (UI có báo lỗi) |

## Quyết định gần đây
- 2026-10-26: Supervisor duyệt R3 (#11; PR đã merge trước bước duyệt, duyệt lại trên 490a7cb): đạt. Không có quyết định (c). Thêm H-06, H-07 (thấp). H-01..H-03 để một mốc sửa nhỏ hoặc phạm vi R4 (theo "Đề xuất chờ duyệt" của `plan/R3.md`).
- 2026-10-26: Supervisor duyệt và merge R2 (#8). Không có quyết định (c). Thêm H-05.
- 2026-10-26: Supervisor duyệt và merge R1 (#5). Không có quyết định (c).
