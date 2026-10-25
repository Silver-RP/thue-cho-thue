# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1 (engine thuế + cấu hình luật 2026) đã merge (#5, ae827b3).
- R2 (máy tính thuế một căn) đã merge (#8, f80853f).
- R3 (sổ doanh thu nhiều căn, localStorage có schema, xuất/nhập JSON) đã merge (#11, 490a7cb). PR được merge trước bước duyệt của supervisor; supervisor duyệt lại trên main: đạt. Goal `thue-cho-thue-v1` đặt R1–R3 `done`. T1–T6 đạt (~67%).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- H-01..H-03 (thấp, engine): đối chiếu `year`/`rules.year`, kiểm tổng an toàn (sổ R3 vẫn ra tổng không an toàn với số phi thực tế), test `mode`/`years` lẻ. Đề nghị một mốc sửa nhỏ (`/autodev:propose-next`) hoặc đưa vào phạm vi R4.
- H-05 (thấp, máy tính R2): lỗi engine hiện chuỗi kỹ thuật; sổ R3 đã chặn.
- H-06, H-07 (thấp, sổ R3): vẽ lại làm mất dữ liệu gõ dở; khoá dự phòng chỉ ghi lần đầu.
- H-04 (vừa, cần người): xác nhận cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7 (`human_only` trong goal.json).
- Chưa kiểm bố cục mobile thật và lưu/tải lại thật trên trình duyệt (happy-dom); nên mở `yarn dev` trên điện thoại một lần, thử xuất/nhập JSON.
- Quy trình: PR mốc R3 bị merge trước khi supervisor duyệt; nên xem lại ai/bước nào merge để lần sau supervisor merge sau khi duyệt.

## Bước tiếp theo
- `/autodev:plan-next R4` (hạn khai, `.ics`, số liệu 01/TTS, T7), rồi chạy R4.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng.
