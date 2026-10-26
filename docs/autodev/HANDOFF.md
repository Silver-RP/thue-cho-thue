# Bàn giao giữa các phiên

## Trạng thái (2026-10-27)
- R1–R6 đã merge (#5, #8, #11, #15, #18, #24). H-08 đã đóng (audit `2026-10-26-3`): Pages chạy thật, T9 exit 0.
- R7 (qua mùa khai 2027: năm mặc định theo năm đang khai, ô chọn năm, báo rõ năm chưa có luật; "đã qua" ở máy tính và FAQ; tổng năm sổ không hạn khi không doanh thu; nhập lại bản sổ cũ) đã merge (#29, aedd62f) sau khi supervisor duyệt: verify/smoke sạch, T4 275, T5 82, T6 61, T7 34, `tests/build` 48; ca mới đỏ trên `src` cũ. Đóng H-20, H-27, H-28; H-31 còn luật 2027.
- Goal `thue-cho-thue-v1`: R1–R7 `done`; T1–T9 đạt (100% theo chỉ số).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- Cần leader: đọc duyệt câu FAQ "Hạn khai thuế là khi nào?" và dòng Nguồn NĐ 141 mới trong `index.html` (R7, `human_only`) trước khi quảng bá; luật 2027 (`src/rules/2027.ts`, H-31) khi có văn bản.
- H-29, H-30 (vừa, khoá sổ), H-33, H-13, H-34: mốc UX kế (Đề xuất chờ duyệt của `plan/R7.md`).
- H-02 (vừa): tổng tràn số im lặng với nhiều hợp đồng; cùng H-01, H-03 → mốc engine nhỏ (`plan/R6.md`).
- H-04 (vừa, cần người): mẫu 01/TTS, 01-1/BK-TTS (`confirmed: false`), cơ sở GTGT (L5), làm tròn, dời hạn 31/01/2027 (Chủ Nhật).
- H-21, H-22, H-32 (vừa): smoke trình duyệt thật; CSV trên Excel vi-VN; đo người dùng/Lighthouse.
- Thấp: H-05..H-07, H-15..H-18, H-23..H-26, H-35..H-37. Ghi chú R7: `startApp` giữ hàm gỡ ở biến cấp module (chỉ ảnh hưởng test nhiều `document`).
- Chưa kiểm bằng đồng hồ thật tháng 1/2027 (chỉ `today` cố định), bố cục mobile thật, `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- `/autodev:audit R7`, rồi `/autodev:propose-next` (mốc UX khoá sổ H-29/H-30/H-33/H-13, hoặc mốc engine H-02/H-01/H-03).

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
