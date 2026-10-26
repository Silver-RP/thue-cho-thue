# Bàn giao giữa các phiên

## Trạng thái (2026-10-27)
- R1–R7 đã merge (#5, #8, #11, #15, #18, #24, #29). H-08, H-38 đã đóng.
- R8 (giao diện theo `docs/design/mockup-r8.html`: thanh trên + ô năm, menu bên/thanh dưới, tổng quan năm + thanh ngưỡng, biên lai "Cách tính", thẻ hạn đếm ngày, thẻ căn, tính nhanh; ô ngày `type="date"`) đã merge (#35, 4d9b5e8) sau khi supervisor duyệt: verify/smoke sạch, T4 331, T5 119, T6 61, T7 34, `tests/build` 66, gzip ~23 KB; Chrome headless 390/1280 px không tràn ngang. Đóng H-13; thêm H-48 (thấp).
- Goal `thue-cho-thue-v1`: R1–R8 `done`, R9 `planned`; T1–T9 đạt (100% theo chỉ số).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- Cần leader: duyệt chữ giao diện mới R8 trước khi quảng bá (`human_only`: "mỗi kỳ/số kỳ" thay "mỗi tháng" của mockup; tiêu đề "Thuế cho thuê nhà" trùng trên thẻ tính nhanh ở 1280 px); câu FAQ hạn khai và dòng Nguồn NĐ 141 (R7); luật 2027 (H-31).
- Quyết định (c) R8 đã tự chốt: lách quét `rateBps` ở `src/ui/overview.ts` không chặn merge; hướng sửa là `src/rules` xuất nhãn thuế suất (H-48), không allowlist.
- R9 (`goal.json`, `planned`): H-41, H-43, H-39, H-40, H-42. H-39 cần trước 01/02/2027.
- H-29, H-30 (vừa, khoá sổ), H-33, H-34: mốc UX kế. H-02 (vừa) cùng H-01, H-03 → mốc engine nhỏ.
- H-04 (vừa, cần người): mẫu tờ khai, cơ sở GTGT, làm tròn, dời hạn 31/01/2027 (Chủ Nhật).
- H-21, H-22, H-32 (vừa): smoke trình duyệt thật (R8 có ảnh chụp tay của supervisor, chưa vào `smoke`); CSV trên Excel vi-VN; đo người dùng/Lighthouse.
- Thấp: H-05..H-07, H-15..H-18, H-23..H-26, H-35..H-37, H-44..H-48.
- Chưa kiểm: điện thoại thật (bàn phím ô `type="date"`), đồng hồ thật tháng 1/2027, `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- `/autodev:plan-next R9` (plan R9 chưa có), rồi chạy R9; hoặc `/autodev:audit R8` trước nếu muốn đo lại % theo việc.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
