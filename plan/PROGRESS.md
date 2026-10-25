# Nhật ký mốc

## R1
- dev-01 DONE (1 vòng, commit 9c7dbd4). Ghi chú reviewer: test quét `src/tax` chạy rỗng đến khi dev-02 thêm file; dev-02 nên kiểm glob bắt được chuỗi cấm.
- dev-02 DONE (1 vòng, commit 1f72816). Ghi chú reviewer: gọn phần kiểm `years` trong `shareInYear`; thiếu test cho `mode` không hợp lệ và `years` lẻ.
- dev-03 DONE (1 vòng, commit 5436343). Ghi chú reviewer: test căn cứ chỉ kiểm pit/vat; `year` của computeAnnual chưa đối chiếu `rules.year`.
- dev-04 DONE (1 vòng, commit 1137776). 25 test trong tests/tax, 33 test toàn bộ.

## R2
- dev-01 DONE (1 vòng, commit b0d0e5c). Ghi chú reviewer: `parseVnd("0.000")` ra 0 và `"007"` ra 7 (đúng đặc tả); dev-03 nên cân nhắc cảnh báo khi doanh thu 0. `formatVnd` không xử lý NaN/số lẻ (ngoài tiêu chí).
- dev-02 DONE (1 vòng, commit 51d1676). Ghi chú reviewer: `periodsInYear` > 12 vẫn tính (dồn vào tháng 12), dev-03 nên giới hạn ở form; lỗi từ engine lẫn tên trường kỹ thuật.
- dev-03 DONE (1 vòng, commit e3c1d94). `calculate` nhận thêm tham số `rulesOverride` (cho test luật giả). Ghi chú reviewer: số kỳ 0 vẫn được chấp nhận.
- dev-04 DONE (1 vòng, commit 16cbe03). 7 test đầu-cuối, không lộ lệch UI ↔ engine; tests/ui 47 passed, toàn bộ 80 passed.

## Đề xuất chờ duyệt
