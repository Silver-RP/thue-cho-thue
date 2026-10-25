# Tiến độ và số đo theo mốc

| Mốc | Thời gian | Chi phí | Ghi chú |
|---|---|---|---|
| R1 | 8 phút worker (ước tính 60) | 1,31 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,14, USD 0,33 |
| R2 | 11 phút worker (ước tính 20) | 1,49 + ~0,92 USD (ước tính 4,0) | 4 task, 4 vòng review (ước tính 4–6), 0 lần dừng; B3 phút 0,53, USD ~0,60 |

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
