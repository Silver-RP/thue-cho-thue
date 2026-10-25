<!-- autodev:start -->
## Auto-dev (plugin `autodev`)
- Plan mốc: `plan/<mốc>.md` (task dev-xx, tiêu chí chấp nhận cấp mốc, ước tính, pre-mortem). Nhật ký: `plan/PROGRESS.md`.
- Trạng thái dự án cho mọi vai: `docs/autodev/PROJECT_STATE.md`.
- Chạy một mốc: `/autodev:run-milestone <mốc>`; chạy không người: `/autodev:run <mốc>` (hoặc `<plugin>/scripts/autodev-run.sh <mốc>` từ thư mục dự án).
- Kiểm tra cứng: `python3 "/Users/ishopjapan/dev/autodev/scripts/verify.py"` (lệnh trong `.autodev/config.json`).
- developer không sửa tiêu chí chấp nhận hay phạm vi mốc; chỉ ghi "Đề xuất chờ duyệt" trong `plan/PROGRESS.md`. Không sửa `.autodev/config.json`, `.autodev/baseline.json`, `docs/autodev/`.
<!-- autodev:end -->
