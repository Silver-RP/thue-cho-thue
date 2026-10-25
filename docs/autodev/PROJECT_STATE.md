# Trạng thái dự án (đọc trước plan mốc)

Cập nhật: 2026-10-26 · Nguồn: duyệt mốc R2 (PR #8, merge f80853f)

## Mốc
| Mốc | Trạng thái | Ghi chú |
|---|---|---|
| R1 | merged (#5) | Engine thuế + cấu hình luật 2026; 4/4 task PASS vòng 1; T1–T4 đạt |
| R2 | merged (#8) | Máy tính thuế một căn; 4/4 task PASS vòng 1; T5 đạt |
| R3–R5 | chưa có plan | Theo `docs/goals/thue-cho-thue-v1/roadmap.md` |

## Mục tiêu và tiêu chí
Goal `thue-cho-thue-v1` (`docs/goals/thue-cho-thue-v1/goal.json`): web app tĩnh giúp người cho thuê 1–5 căn tự lo thuế cho thuê theo luật 2026. Đạt ~55% (5/9 chỉ số: T1–T5).

| Chỉ số | Lệnh | Ngưỡng | Hiện tại |
|---|---|---|---|
| T1 | `yarn -s test tests/tax` | 0 failed, ≥ 15 passed | 25 passed |
| T2 | `yarn -s test tests/rules` | 0 failed, ≥ 4 passed | 7 passed |
| T3 | `yarn -s lint` | exit 0 | exit 0 |
| T4 | `yarn -s test` | 0 failed | 80 passed |
| T5 | `yarn -s test tests/ui` | 0 failed, ≥ 6 passed | 47 passed |
| T6–T9 | xem goal.json | | chưa làm (R3–R5) |

## Kiến trúc hiện nay
- `src/rules/`: `types.ts` (`TaxRules`), `2026.ts` (mọi số luật + căn cứ L1–L7), `index.ts` (`getRules(year)`, năm chưa có thì ném lỗi).
- `src/tax/`: `money.ts` (tiền nguyên đồng, `applyRateBps` bằng BigInt, làm tròn xuống), `revenue.ts` (doanh thu năm theo ngày nhận, trả trước `lump`/`allocate`), `annual.ts` (`computeAnnual`: trừ ngưỡng theo `deductionOrder`, TNCN, GTGT, `status`, hạn, căn cứ), `deadlines.ts` (hạn khai 1/2 lần, hạn thông báo doanh thu).
- `src/ui/`: `money.ts` (`parseVnd` không ném lỗi, nhóm 3 chữ số cùng một dấu ngăn; `formatVnd` → `12.000.000 đ`), `calculator.ts` (`calculate(form, rulesOverride?)`: `getRules(year)`, dựng `Payment[]` một hợp đồng, gọi `computeAnnual`, trả `steps` có căn cứ), `form.ts` (`mountCalculator(root, { year, rules? })`, DOM thuần, lỗi gắn từng ô), `style.css` (mobile trước, bảng trong `.table-scroll`).
- `src/main.ts` gắn máy tính vào `#app` với năm 2026. Test UI dùng `happy-dom` (devDependency).
- Hàm thuần, không đọc giờ hệ thống; `src/tax` nhận `rules` làm tham số.

## Quy tắc → test bảo vệ
| Quy tắc | Test bảo vệ |
|---|---|
| Không số luật trong `src/tax` | `tests/rules/rules.test.ts` (quét `1000000000`, `1_000_000_000`, `0.05`, `07-31`, `01-31`) |
| Không số luật trong `src/ui` (R2) | `tests/ui/calculator.test.ts` (quét thêm `rateBps`, `/ 10000`) |
| Tiền nguyên đồng, làm tròn xuống | `tests/tax/annual.test.ts`, `tests/tax/revenue.test.ts` |
| Trừ ngưỡng một lần cho tổng hợp đồng (L4) | `tests/tax/annual.test.ts` (A/B đổi thứ tự) |
| Hạn 31/01 năm sau (L7) | `tests/tax/deadlines.test.ts` |
| Đọc tiền VNĐ có dấu ngăn, từ chối mơ hồ (R2) | `tests/ui/money.test.ts`, `tests/ui/e2e.test.ts` (gõ `"100.000.000"`) |
| Ô lỗi không hiện số; miễn trừ luôn có; nhãn "ước tính" theo `vatEstimated` (R2) | `tests/ui/form.test.ts`, `tests/ui/e2e.test.ts` |

## Lỗ hổng mở
| Mã | Mức | Tóm tắt |
|---|---|---|
| H-01 | low | `computeAnnual` không đối chiếu `year` với `rules.year` (UI R2 đã chặn phía giao diện; engine chưa sửa) |
| H-02 | low | Tổng doanh thu không kiểm `Number.isSafeInteger` (UI chặn một phần ở `parseVnd`/`calculate`) |
| H-03 | low | Thiếu test `prepaid.mode` không hợp lệ và `years` lẻ (ghi chú reviewer dev-02 R1) |
| H-04 | medium | Cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7: chờ leader/kế toán xác nhận |
| H-05 | low | Lỗi engine (ngày trả trước không có thật) hiện nguyên chuỗi kỹ thuật `receivedOn ...` trên UI |

## Quyết định gần đây
- 2026-10-26: Supervisor duyệt và merge R2 (#8). Không có quyết định (c). Thêm H-05. H-01..H-03 đề nghị gộp vào R3 (task nhỏ) theo "Đề xuất chờ duyệt" trong `plan/R2.md`.
- 2026-10-26: Supervisor duyệt và merge R1 (#5). Không có quyết định (c).
