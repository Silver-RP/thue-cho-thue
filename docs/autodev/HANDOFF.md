# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1–R5 đã merge (#5, #8, #11, #15, #18). H-08 đã đóng (audit `2026-10-26-3`): Pages chạy thật, T9 exit 0, verify có `yarn -s build`, smoke `scripts/smoke-pages.sh`.
- R6 (vá trước khi quảng bá: kho hỏng, hai tab, `localStorage` bị chặn, nhãn "ước tính", lỗi tổng năm đúng nguyên nhân, hạn "đã qua", năm không có kỳ thu) đã merge (#24, b57d0df) sau khi supervisor duyệt: verify/smoke sạch, T4 245, T5 70, T6 61, T7 34; 26 ca mới đỏ trên `src` cũ. Đóng H-09, H-10, H-11, H-12, H-14, H-19; H-20 thu hẹp.
- Goal `thue-cho-thue-v1`: R1–R6 `done`; T1–T9 đạt (100% theo chỉ số; theo khối lượng supervisor ước ~68%).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- H-02 (vừa): tổng tràn số im lặng với nhiều hợp đồng (3 × 4e15); cùng H-01, H-03 → đề nghị một mốc engine nhỏ (Đề xuất chờ duyệt của `plan/R6.md`).
- H-04 (vừa, cần người): xác nhận mẫu 01/TTS và 01-1/BK-TTS (`confirmed: false`), cơ sở GTGT (L5), làm tròn, dời hạn 31/01/2027 (Chủ Nhật), số liệu lần khai 31/07; cảnh báo "Khai 2 lần" sau khi lỡ hạn lần 1.
- H-20 (thấp, cần leader): FAQ trong `index.html` viết cứng "lần đầu 31/07/2026" (duyệt nội dung trang, `human_only`); máy tính một căn chưa gắn "đã qua".
- H-21, H-22 (vừa): smoke trình duyệt thật; CSV trên Excel vi-VN (cần Excel thật). H-13 (vừa): ô ngày `inputmode=numeric`.
- Thấp: H-05, H-06, H-07 (cập nhật R6: `preserveRaw` ghi đè `backup:2` khi cả hai dự phòng đầy), H-15..H-18, H-23..H-26.
- Chưa kiểm bố cục mobile thật, nhập `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- `/autodev:propose-next` (mốc engine H-02/H-01/H-03, hoặc mốc UX H-13/H-16/H-23) hoặc `/autodev:audit R6`.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
