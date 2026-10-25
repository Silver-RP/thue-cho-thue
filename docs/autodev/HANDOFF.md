# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1 (engine thuế + cấu hình luật 2026) đã merge (#5, ae827b3).
- R2 (máy tính thuế một căn) đã merge (#8, f80853f).
- R3 (sổ doanh thu nhiều căn, localStorage có schema, xuất/nhập JSON) đã merge (#11, 490a7cb).
- R4 (hạn khai, `.ics`, bảng 01/TTS + 01-1/BK-TTS, CSV, chép, hướng dẫn eTax) đã merge (#15, 88a31c2) sau khi supervisor duyệt. Goal `thue-cho-thue-v1` đặt R1–R4 `done`. T1–T7 đạt (~78%).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- H-04 (vừa, cần người): xác nhận mẫu 01/TTS và 01-1/BK-TTS (hiện `src/export/forms.ts` có `confirmed: false`, mọi mã chỉ tiêu `null`), cơ sở GTGT (L5), làm tròn, dời hạn 31/01/2027 (Chủ Nhật), số liệu lần khai 31/07 (`human_only` trong goal.json). Xác nhận xong chỉ cần sửa `forms.ts`.
- H-14 (vừa): dòng "Tổng số thuế phải nộp" trong bảng/CSV 01/TTS gồm GTGT ước tính nhưng không có nhãn (cùng lỗi ở máy tính và sổ).
- H-17 (thấp, mới): phụ lục 01-1/BK-TTS năm 2026 liệt kê cả hợp đồng không có doanh thu 2026 (dòng toàn 0).
- H-01..H-03, H-05..H-07, H-09..H-13, H-15, H-16: theo audit 2026-10-26; mốc sửa R3.1 audit đề xuất chưa có trong goal.json.
- H-08 (cao): chưa build/deploy thật; là task đầu R5.
- Chưa kiểm bố cục mobile thật, lưu/tải lại thật, nhập `.ics` vào Google/Apple Calendar và mở CSV bằng Excel thật (test dùng happy-dom). Nên mở `yarn dev` trên điện thoại một lần.

## Bước tiếp theo
- Leader chọn: `/autodev:propose-next` (mốc sửa R3.1 từ audit, gồm H-14, H-17) hoặc `/autodev:plan-next R5` (trang công khai, deploy Pages, H-08).

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng.
