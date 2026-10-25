# Tiêu chí: thue-cho-thue-v1

Nền (26/10/2026): khung TS/Vite/Vitest, 1 test, chưa có tính năng. % đạt = số chỉ số đạt / 9.

| Mã | Định nghĩa | Lệnh đo | Nền | Ngưỡng |
|---|---|---|---|---|
| T1 | Engine thuế đúng L1–L7, có ca biên (đúng ngưỡng, vượt 1 đồng, 0 đồng, nhiều hợp đồng chọn trừ ngưỡng, trả trước nhiều năm, khai 1 lần / 2 lần) | `yarn -s test tests/tax` | 0 | == 0 failed, >= 15 passed |
| T2 | Luật nằm trong cấu hình theo năm có căn cứ; engine không chứa số luật | `yarn -s test tests/rules` | 0 | == 0 failed, >= 4 passed (gồm test quét `src/tax` không có `1000000000`, `0.05`) |
| T3 | Kiểm kiểu sạch | `yarn -s lint` | sạch | exit 0 |
| T4 | Toàn bộ test xanh | `yarn -s test` | 1 passed | == 0 failed |
| T5 | Máy tính (UI): nhập tiền thuê, kỳ trả, số tháng → thuế TNCN, GTGT (ghi "ước tính" khi L5 chưa xác nhận), hạn khai, căn cứ, câu miễn trừ | `yarn -s test tests/ui` | 0 | == 0 failed, >= 6 passed |
| T6 | Sổ doanh thu: thêm/sửa/xoá căn và hợp đồng, lưu `localStorage`, xuất/nhập JSON, tổng năm theo L4/L6 | `yarn -s test tests/ledger` | 0 | == 0 failed, >= 8 passed |
| T7 | Hạn và xuất: lịch hạn theo lựa chọn 1/2 lần, file `.ics`, bảng số liệu theo trường tờ khai (CSV + chép) | `yarn -s test tests/export` | 0 | == 0 failed, >= 6 passed |
| T8 | Build tĩnh nhỏ, không gọi mạng ngoài danh sách cho phép | `yarn -s build && yarn -s test tests/build` | — | build exit 0; JS+CSS gzip ≤ 100 KB; không `fetch`/`XMLHttpRequest` ngoài module analytics |
| T9 | Chạy thật trên GitHub Pages, deploy chỉ sau khi test xanh | `curl -fsS https://silver-rp.github.io/thue-cho-thue/ \| grep -q 'Thuế cho thuê'` | — | exit 0 |

Ghi chú: các script `test`, `lint`, `build` là của `package.json`; mốc được thêm script (ví dụ `size`) nếu cần nhưng không đổi nghĩa lệnh đo ở trên.
