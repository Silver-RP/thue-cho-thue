# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1 (engine thuế + cấu hình luật 2026) đã merge (#5, ae827b3).
- R2 (máy tính thuế một căn) đã merge (#8, f80853f); goal `thue-cho-thue-v1` đặt R1, R2 `done`. T1–T5 đạt (~55%).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- H-01..H-03 (thấp, engine): đối chiếu `year`/`rules.year`, kiểm tổng an toàn, test `mode`/`years` lẻ. Đề nghị một task nhỏ trong plan R3.
- H-05 (thấp, UI): lỗi engine hiện chuỗi kỹ thuật (`receivedOn ...`); nên dịch sang tiếng Việt khi R3 đụng form.
- H-04 (vừa, cần người): xác nhận cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7 (`human_only` trong goal.json).
- Chưa kiểm bố cục mobile thật (happy-dom không có layout); nên mở `yarn dev` trên điện thoại một lần.

## Bước tiếp theo
- `/autodev:plan-next R3` (sổ doanh thu nhiều căn, T6), rồi chạy R3.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng.
