# Bàn giao giữa các phiên

## Trạng thái (2026-10-28)
- Sau R11: vòng làm đẹp v1–v3 (#53–#58), ui_check 19/20; T4 474, T10 41 passed.
- R1–R10 đã merge (#5, #8, #11, #15, #18, #24, #29, #35, #38, #44). H-08, H-13, H-38..H-42, H-50..H-54 đã đóng.
- R11 (test trình duyệt thật T10) đã duyệt và merge (#50, 6d56929): đạt 10/10, verify/smoke sạch, T10 `yarn -s e2e` 37 passed (lặp 3 lần 111), 0 `test.fail`, đủ 11 mã S; T4 459, T5 188, T6 61, T7 34, `tests/build` 73, gzip ~26 KB. Đóng H-58 (9 ca đỏ trên src trước R11); thu hẹp H-21, H-29, H-35; thêm H-60 (reflow 320 px).
- Goal `thue-cho-thue-v1`: R1–R11 đều `done`; T1–T10 đạt (100% theo chỉ số). Không còn mốc `planned` trong goal.
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- Cần leader: duyệt chữ giao diện R8 trước khi quảng bá (`human_only`: "mỗi kỳ/số kỳ"; tiêu đề trùng trên thẻ tính nhanh ở 1280 px); câu FAQ hạn khai và dòng Nguồn NĐ 141 (R7); câu nhắc sao lưu của R9. R10: "cách tính" nhiều hợp đồng in từng cụm `cơ sở × %` nối " + " (giả định làm tròn riêng từng hợp đồng như engine; cùng nhóm H-04). R11 thêm câu mới cần đọc: "không làm đổi tổng tiền thuế phải nộp" (S9), "Quá hạn N ngày" + "Việc cần làm ngay..." (S20), "Ứng dụng chỉ tính từ năm 2026..." (S22), câu hỏi nhập đè "có N kỳ thu không có trong file" (S23), "Không lưu được trên trình duyệt này..." (S24), "Số tiền kỳ thu phải lớn hơn 0".
- Cần người, có hạn: luật 2027 (H-31) — từ 01/02/2027 trang mặc định mở năm 2027 chưa có máy tính đến khi có `src/rules/2027.ts`; dời hạn 31/01/2027 (Chủ Nhật, H-04). Thử `persist()` trên Safari/iOS thật (H-43).
- Đề xuất chờ duyệt: từ `plan/R10.md` — mốc "không kẹt, không mất" phần còn lại (H-55, H-56, cùng H-29, H-30, H-35); phần H-57 còn lại; phần H-48 còn lại; smoke Chrome trong `smoke` (H-59, H-21). Từ `plan/R11.md` — ca e2e 320 px và chữ 300% (H-60); S12, S13, S14, S26 cho mốc sau; thêm T10 vào `criteria.md`. H-02 (vừa) cùng H-01, H-03 → mốc engine nhỏ.
- H-21, H-22, H-32 (vừa): smoke Pages vẫn grep tĩnh; CSV trên Excel vi-VN; đo người dùng/Lighthouse (mốc 05/12/2026).
- Plugin: `.autodev/reviews/dev-0N-r1.json` trùng tên giữa các mốc nên bị ghi đè (báo cáo R11).
- Chưa kiểm: điện thoại thật (bàn phím ô `type="date"`), đồng hồ thật tháng 1/2027, `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo (cập nhật 2026-10-28)
- Đã xong trong phiên: R11 merge (#50, ~11,49 USD); audit R10–R11 (#52, thêm H-61..H-76, không lỗ cao); bộ phản biện `docs/autodev/CRITICS.md` (V1–V6, S1–S28); 16 câu hỏi kế toán; vòng làm đẹp 0 USD v1 16 (#53) → v2 17 (#57) → v3 19/20 (#58), sửa chữ 200% font Linux (#54–#56), ảnh + bảng điểm `docs/screens/v1..v3`; đóng H-61, H-67. Main e49a1de, CI test + deploy xanh. Nhánh đã merge (design/v1..v3, fix/v1-linux-200, -b, -c) chưa xoá (chờ duyệt).
- Làm tiếp theo thứ tự:
  1. **Chờ leader**: gửi 16 câu hỏi kế toán (gấp trước hạn 31/01/2027, Chủ Nhật); xác nhận cơ sở GTGT (L5) và mẫu tờ khai; chọn dịch vụ đo/biểu mẫu (H-32, mốc 05/12/2026); duyệt chữ trang (mục Việc mở).
  2. v4 làm đẹp (0 USD): ô ngày dd/mm/yyyy tự viết (cần test logic), "Chưa có kỳ thu" lặp hai lần, nhãn bảng Kết quả xuống 3–4 dòng ở 1280 px (`docs/screens/v3/score.md`).
  3. Runner sửa lỗ vừa H-62..H-76 bằng `/autodev:propose-next` (ước 6–8 USD, cần leader duyệt ngân sách).
  4. Luật 2027 (H-31) trước 01/02/2027.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Nội dung trang công khai (`index.html`) để leader duyệt.
