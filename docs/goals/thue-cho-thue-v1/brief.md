# Brief: thue-cho-thue-v1

## Mục tiêu
Web app giúp người cho thuê 1–5 căn nhà/căn hộ tự lo thuế cho thuê theo luật 2026: máy tính thuế miễn phí, sổ doanh thu theo hợp đồng, nhắc hạn, xuất số liệu để điền tờ khai trên eTax Mobile; dữ liệu nằm trên máy người dùng.

## Kết quả mong muốn (nguyên văn leader, qua `docs/GOAL_INPUT.md`)
Bản chạy thật trên GitHub Pages trước 05/12/2026 để kịp mùa khai 31/01/2027, công thức đúng luật có test, đo được người dùng thật.

## Cách hiểu đã chốt
- Người dùng: cá nhân cho thuê bất động sản (không phải kinh doanh lưu trú), 1–5 căn, tự khai thuế.
- Luật là đầu vào có căn cứ: `docs/research/2026-10-26-thi-truong-va-luat.md` (L1–L9, đọc từ NĐ 68/2026 bản ký và NĐ 141/2026). Ngưỡng 01 tỷ đồng/năm; TNCN = (doanh thu − ngưỡng) × 5%; ≤ ngưỡng vẫn thông báo doanh thu trước 31/01 năm sau; khai 2 lần (31/7, 31/01) hoặc 1 lần (31/01).
- Luật còn đổi → mọi con số luật (ngưỡng, thuế suất, hạn, căn cứ) nằm trong một file cấu hình theo năm (`src/rules/2026.ts` hoặc tương đương), engine không chứa số luật.
- L5 (cơ sở tính GTGT: toàn bộ doanh thu hay phần vượt) chưa xác nhận → cấu hình có cờ `unconfirmed`, giao diện ghi "ước tính" cho phần GTGT cho đến khi leader xác nhận.
- Chỉ trang tĩnh: không máy chủ, không tài khoản; dữ liệu ở `localStorage`; sao lưu bằng xuất/nhập file JSON.
- Đo người dùng: hook analytics/form theo cấu hình, tắt mặc định; leader chọn dịch vụ (việc người).

## Nhật ký hỏi đáp
Planner chạy trong phiên leader ngày 26/10/2026; leader uỷ quyền (chọn "lập mục tiêu, tự merge rồi chạy luôn"). Câu trả lời lấy từ `docs/GOAL_INPUT.md`:
- "Xong" đo bằng gì → test công thức L1–L7 có ca biên; lint + test xanh; build tĩnh; smoke URL Pages; đếm lượt dùng (hook).
- Không được cắt → máy tính đúng luật; cấu hình luật theo năm; dữ liệu chỉ ở trình duyệt; câu "không thay thế tư vấn thuế".
- Có thể cắt → đọc sao kê (để bản sau); `.ics`; nhiều căn.
- Ngoài phạm vi → lưu trú, hộ bán hàng, nộp thay, tài khoản, máy chủ.
- Chi phí → mỗi mốc ≤ 4 USD ước tính, cả mục tiêu chạy với trần runner 30 USD.

## Giả định còn lại
- Tỷ lệ GTGT cho thuê tài sản 5% (Luật GTGT 48/2024) — cấu hình, chờ xác nhận.
- Mẫu tờ khai: xuất số liệu theo trường của 01/TTS và phụ lục 01-1/BK-TTS; nếu Thông tư 18/2026 đổi mẫu thì chỉ đổi lớp xuất.
- Chưa có số đo chi phí của dự án này; ước tính lấy theo sandbox (2,0–3,5 USD/mốc ước tính, thực tế ~2,2×).
