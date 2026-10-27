# Bàn giao giữa các phiên

## Trạng thái (2026-10-28)
- R1–R9 đã merge (#5, #8, #11, #15, #18, #24, #29, #35, #38). H-08, H-13, H-38..H-42 đã đóng.
- R10 (số khớp, điện thoại đủ thuế, không ngõ cụt) đã duyệt và merge (#44, 3d576a9): đạt 8/8, verify/smoke sạch, T4 429, T5 168, T6 61, T7 34, `tests/build` 73, gzip ~24,9 KB; 31 ca mới đỏ trên `src` trước R10; Chrome headless 390/820/1280 px không tràn, thẻ 390 px có TNCN/GTGT, `.side` 820 px nằm trên sổ. Đóng H-50, H-51, H-52, H-53, H-54; thu hẹp H-48, H-57.
- Goal `thue-cho-thue-v1`: R1–R10 đều `done`; T1–T9 đạt (100% theo chỉ số). Không còn mốc `planned` trong goal.
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- Cần leader: duyệt chữ giao diện R8 trước khi quảng bá (`human_only`: "mỗi kỳ/số kỳ"; tiêu đề trùng trên thẻ tính nhanh ở 1280 px); câu FAQ hạn khai và dòng Nguồn NĐ 141 (R7); câu nhắc sao lưu của R9. R10: "cách tính" nhiều hợp đồng in từng cụm `cơ sở × %` nối " + ", không tên hợp đồng (giả định làm tròn riêng từng hợp đồng như engine; nếu kế toán muốn làm tròn trên tổng thì phải đổi engine, cùng nhóm H-04).
- Cần người, có hạn: luật 2027 (H-31) — từ 01/02/2027 trang mặc định mở năm 2027 chưa có máy tính đến khi có `src/rules/2027.ts`; dời hạn 31/01/2027 (Chủ Nhật, H-04). Thử `persist()` trên Safari/iOS thật (H-43).
- Đề xuất chờ duyệt từ `plan/R10.md`: mốc "không kẹt, không mất" phần còn lại (H-55, H-56, H-58, cùng H-29, H-30, H-35); phần H-57 còn lại (`:has()`, `aria-live`, hai chỗ chọn khai, hai nút `.ics`); phần H-48 còn lại (`h1` tĩnh "2026", `ops.ts:48`); smoke Chrome 390/820/1280 px trong `smoke` của `.autodev/config.json` (leader sửa config; H-59, H-21). H-02 (vừa) cùng H-01, H-03 → mốc engine nhỏ.
- H-21, H-22, H-32 (vừa): smoke trình duyệt thật; CSV trên Excel vi-VN; đo người dùng/Lighthouse (mốc 05/12/2026).
- Chưa kiểm: điện thoại thật (bàn phím ô `type="date"`), đồng hồ thật tháng 1/2027, `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- `/autodev:propose-next` (dựa audit `2026-10-27-3` và đề xuất chờ duyệt của R10) để thêm mốc sửa vào goal; hoặc `/autodev:audit R10` trước nếu muốn đo lại % theo việc.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
