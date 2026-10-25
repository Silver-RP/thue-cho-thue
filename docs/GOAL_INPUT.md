# Đầu vào cho `/autodev:autodev-goal` (soạn sẵn 26/10/2026)

Leader chạy trong terminal, mở `claude` ở gốc repo này:

```
/autodev:autodev-goal Web app giúp người cho thuê 1–5 căn nhà/căn hộ tự lo thuế cho thuê theo luật 2026: máy tính thuế miễn phí, sổ doanh thu theo hợp đồng, nhắc hạn, xuất số liệu để điền tờ khai trên eTax Mobile; dữ liệu nằm trên máy người dùng. Kết quả mong muốn: bản chạy thật trên GitHub Pages trước 05/12/2026 để kịp mùa khai 31/01/2027, công thức đúng luật có test, đo được người dùng thật.
```

Đọc trước: `docs/research/2026-10-26-thi-truong-va-luat.md` (luật L1–L9 có căn cứ).

## Trả lời sẵn cho các câu planner hay hỏi
- **"Xong" đo bằng gì:** (1) test công thức: mỗi quy định L1–L7 có ca test với số tiền cụ thể, kể cả ca biên (đúng ngưỡng, vượt 1 đồng, nhiều hợp đồng, trả trước nhiều năm); (2) `yarn -s lint`, `yarn -s test` xanh; (3) build ra trang tĩnh, smoke URL GitHub Pages trả 200; (4) Lighthouse mobile ≥ 90; (5) có đếm lượt dùng máy tính và form để lại email (không cần backend: dùng dịch vụ form/analytics không cookie).
- **Không được cắt:** máy tính thuế đúng luật; cấu hình luật theo năm (ngưỡng, thuế suất, hạn, căn cứ) tách khỏi code; dữ liệu người dùng chỉ ở trình duyệt; câu "không thay thế tư vấn thuế" rõ ràng.
- **Có thể cắt (theo thứ tự):** đọc sao kê ngân hàng (để bản sau); xuất file `.ics` nhắc hạn; nhiều căn/nhiều hợp đồng (giữ 1 căn trước).
- **Ngoài phạm vi:** kinh doanh lưu trú (homestay, nhà nghỉ: luật khác); hộ kinh doanh bán hàng; nộp tờ khai thay người dùng; tài khoản, đăng nhập, máy chủ.
- **Công nghệ (đã có khung):** TypeScript + Vite + Vitest, yarn; trang tĩnh trên GitHub Pages; lưu `localStorage`/IndexedDB.
- **Giới hạn chi phí:** mỗi mốc ≤ 4 USD; cả mục tiêu ≤ 30 USD.
- **Việc chỉ người làm:** xác nhận L5 (cơ sở tính GTGT) và mẫu tờ khai hiện hành với Cục Thuế hoặc kế toán; duyệt nội dung trang; bật GitHub Pages; chọn dịch vụ form/analytics.
