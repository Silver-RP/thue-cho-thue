# Bàn giao giữa các phiên

## Trạng thái (2026-10-26)
- R1 (engine thuế + cấu hình luật 2026) đã merge (#5, ae827b3).
- R2 (máy tính thuế một căn) đã merge (#8, f80853f).
- R3 (sổ doanh thu nhiều căn, localStorage có schema, xuất/nhập JSON) đã merge (#11, 490a7cb).
- R4 (hạn khai, `.ics`, bảng 01/TTS + 01-1/BK-TTS, CSV, chép, hướng dẫn eTax) đã merge (#15, 88a31c2).
- R5 (trang công khai, SEO, workflow deploy Pages, `tests/build`) đã merge (#18, 0541381) sau khi supervisor duyệt. T8 đạt (build 0, gzip ~16 KB). **T9 chưa đạt**: run deploy 40230417942 đỏ ở `configure-pages` vì repo chưa bật Pages; trang 404. Goal `thue-cho-thue-v1` đặt R1–R5 `done`; T1–T8 đạt (~89%).
- Bảng duyệt, ước tính ↔ thực tế, pre-mortem: `docs/autodev/PROGRESS.md`.

## Việc mở
- **Cần leader ngay (H-08):** bật GitHub Pages: Settings → Pages → Source: GitHub Actions (hoặc `gh api -X POST repos/Silver-RP/thue-cho-thue/pages -f build_type=workflow`), rồi chạy lại workflow (`gh run rerun 40230417942` hoặc `gh workflow run deploy.yml`) và đo T9: `curl -fsS https://silver-rp.github.io/thue-cho-thue/ | grep -q 'Thuế cho thuê'`. Trước khi bật: đọc duyệt FAQ/Nguồn trong `index.html` (`human_only`); `robots.txt` đang cho lập chỉ mục.
- H-08 (phần config, leader): thêm `yarn -s build` vào verify và `smoke` (lệnh T9 + kiểm tài nguyên) trong `.autodev/config.json`.
- H-12 (vừa): `localStorage` ném lỗi → sổ trắng; nay lộ trên trang công khai. Nên vào mốc sửa trước khi quảng bá.
- H-04 (vừa, cần người): xác nhận mẫu 01/TTS và 01-1/BK-TTS (`src/export/forms.ts` `confirmed: false`), cơ sở GTGT (L5), làm tròn, dời hạn 31/01/2027 (Chủ Nhật), số liệu lần khai 31/07.
- H-14 (vừa), H-17 (thấp), H-18 (thấp, mới: ghi chú R5), H-01..H-03, H-05..H-07, H-09..H-13, H-15, H-16: theo audit 2026-10-26 và các lần duyệt; mốc sửa R3.1 chưa có trong goal.json.
- Chưa kiểm bố cục mobile thật, nhập `.ics` vào Calendar thật, CSV bằng Excel thật.

## Bước tiếp theo
- Leader bật Pages và đo T9 (trên). Sau đó: `/autodev:propose-next` (mốc sửa từ audit: H-12, H-14, H-09..H-11, H-17, H-18) hoặc `/autodev:audit R4 R5`.

## Quyền và quy tắc
- Theo bảng quyền trong `/autodev:supervise`: supervisor tự duyệt/merge mốc và PR hồ sơ; mọi thao tác xoá phải hỏi người dùng. Bật Pages (công khai trang) để leader làm.
