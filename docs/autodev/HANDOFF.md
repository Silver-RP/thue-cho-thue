# Bàn giao giữa các phiên

## Trạng thái (2026-10-27)
- R1–R8 đã merge (#5, #8, #11, #15, #18, #24, #29, #35). H-08, H-13, H-38 đã đóng.
- R9 (không mất sổ, đúng ngày: đổi năm giữ chữ gõ dở + cờ stale, huỷ nhập file khi gỡ; `persist()` + "Lần sao lưu cuối" + nhắc 30 ngày; ngày theo giờ VN, mốc đổi năm từ `deadlines.once`, đọc lại ngày khi quay lại tab; làm chặt ca R7) đã merge (#38, 502114d) trước bước duyệt; supervisor duyệt lại trên 502114d: đạt 8/8, verify/smoke sạch, T4 389, T5 139, T6 61, T7 34, `tests/build` 73, gzip ~23 KB; 24 ca mới đỏ trên `src` trước R9. Đóng H-39, H-40, H-41, H-42; H-43 hạ low; thêm H-49 (thấp).
- Goal `thue-cho-thue-v1`: R1–R9 đều `done`; T1–T9 đạt (100% theo chỉ số). Không còn mốc `planned` trong goal.
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- Cần leader: duyệt chữ giao diện R8 trước khi quảng bá (`human_only`: "mỗi kỳ/số kỳ"; tiêu đề trùng trên thẻ tính nhanh ở 1280 px); câu FAQ hạn khai và dòng Nguồn NĐ 141 (R7); câu nhắc sao lưu mới của R9 (giả định: chưa sao lưu lần nào cũng nhắc, nhập file không tính là sao lưu, ngưỡng 30 ngày).
- Cần người, có hạn: luật 2027 (H-31) — từ 01/02/2027 trang mặc định mở năm 2027 chưa có máy tính đến khi có `src/rules/2027.ts`; dời hạn 31/01/2027 (Chủ Nhật, H-04) — nếu xác nhận dời thì chỉ sửa `src/rules/2026.ts`, mốc đổi năm tự theo. Thử `persist()` trên Safari/iOS thật (H-43).
- Mốc kế (cùng `src/ui/ledger.ts`): H-29, H-30 (khoá sổ), H-35, H-48, H-49, phần UX H-41 (`aria-live` ô năm, hai `h1`), H-33, H-34. H-02 (vừa) cùng H-01, H-03 → mốc engine nhỏ.
- H-21, H-22, H-32 (vừa): smoke trình duyệt thật; CSV trên Excel vi-VN; đo người dùng/Lighthouse.
- Thấp: H-05..H-07, H-15..H-18, H-23..H-26, H-35..H-37, H-43..H-49.
- Chưa kiểm: điện thoại thật (bàn phím ô `type="date"`), đồng hồ thật tháng 1/2027, `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- `/autodev:audit R8 R9` để đo lại % theo việc, rồi `/autodev:propose-next` thêm mốc sửa vào goal (goal hiện không còn mốc `planned`).

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
