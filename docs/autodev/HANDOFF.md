# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1 (engine thuế + cấu hình luật 2026) đã merge (#5, ae827b3); goal `thue-cho-thue-v1` đặt R1 `done`. T1–T4 đạt.
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- H-01..H-03 (thấp): đối chiếu `year`/`rules.year`, kiểm tổng an toàn, test `mode`/`years` lẻ. Nên gộp vào plan R2.
- H-04 (vừa, cần người): xác nhận cơ sở GTGT (L5), làm tròn, dời hạn ngày nghỉ, số liệu khai 31/7 (xem "Đề xuất chờ duyệt" trong `plan/R1.md`; `human_only` trong goal.json).

## Bước tiếp theo
- `/autodev:plan-next R2` (máy tính thuế một căn, T5), rồi chạy R2.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng.
