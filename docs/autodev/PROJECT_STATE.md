# Trạng thái dự án (đọc trước plan mốc)

Cập nhật: 2026-10-26 · Nguồn: duyệt mốc R1 (PR #5, merge ae827b3)

## Mốc
| Mốc | Trạng thái | Ghi chú |
|---|---|---|
| R1 | merged (#5) | Engine thuế + cấu hình luật 2026; 4/4 task PASS vòng 1; T1–T4 đạt |
| R2 | chưa có plan | Máy tính thuế một căn (T5) |
| R3–R5 | chưa có plan | Theo `docs/goals/thue-cho-thue-v1/roadmap.md` |

## Mục tiêu và tiêu chí
Goal `thue-cho-thue-v1` (`docs/goals/thue-cho-thue-v1/goal.json`): web app tĩnh giúp người cho thuê 1–5 căn tự lo thuế cho thuê theo luật 2026. Đạt ~40% (4/9 chỉ số: T1–T4).

| Chỉ số | Lệnh | Ngưỡng | Hiện tại |
|---|---|---|---|
| T1 | `yarn -s test tests/tax` | 0 failed, ≥ 15 passed | 25 passed |
| T2 | `yarn -s test tests/rules` | 0 failed, ≥ 4 passed | 7 passed |
| T3 | `yarn -s lint` | exit 0 | exit 0 |
| T4 | `yarn -s test` | 0 failed | 33 passed |
| T5–T9 | xem goal.json | | chưa làm (R2–R5) |

## Kiến trúc hiện nay
- `src/rules/`: `types.ts` (`TaxRules`), `2026.ts` (mọi số luật + căn cứ L1–L7), `index.ts` (`getRules(year)`, năm chưa có thì ném lỗi).
- `src/tax/`: `money.ts` (tiền nguyên đồng, `applyRateBps` bằng BigInt, làm tròn xuống), `revenue.ts` (doanh thu năm theo ngày nhận, trả trước `lump`/`allocate`), `annual.ts` (`computeAnnual`: trừ ngưỡng theo `deductionOrder`, TNCN, GTGT, `status`, hạn, căn cứ), `deadlines.ts` (hạn khai 1/2 lần, hạn thông báo doanh thu).
- Hàm thuần, không đọc giờ hệ thống; `src/tax` nhận `rules` làm tham số.

## Quy tắc → test bảo vệ
| Quy tắc (plan R1) | Test bảo vệ |
|---|---|
| Không số luật trong `src/tax` | `tests/rules/rules.test.ts` (quét `1000000000`, `1_000_000_000`, `0.05`, `07-31`, `01-31`) |
| Tiền nguyên đồng, làm tròn xuống | `tests/tax/annual.test.ts` (vượt ngưỡng 1 đồng), `tests/tax/revenue.test.ts` (phân bổ dư đồng) |
| Trừ ngưỡng một lần cho tổng hợp đồng (L4) | `tests/tax/annual.test.ts` (A/B đổi thứ tự) |
| Hạn 31/01 năm sau (L7) | `tests/tax/deadlines.test.ts` |

## Lỗ hổng mở
| Mã | Mức | Tóm tắt |
|---|---|---|
| H-01 | low | `computeAnnual` không đối chiếu `year` với `rules.year` (year 2027 + rules 2026 vẫn tính, không lỗi) |
| H-02 | low | Tổng doanh thu không kiểm `Number.isSafeInteger` (2 khoản MAX_SAFE_INTEGER → tổng mất chính xác) |
| H-03 | low | Thiếu test `prepaid.mode` không hợp lệ và `years` lẻ (ghi chú reviewer dev-02) |
| H-04 | medium | Cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7: chờ leader/kế toán xác nhận (Đề xuất chờ duyệt trong `plan/R1.md`) |

## Quyết định gần đây
- 2026-10-26: Supervisor duyệt và merge R1 (#5). Không có quyết định (c). H-01..H-03 ghi lỗ hổng mức thấp, nên đóng ở R2 (UI gọi `getRules(year)`).
