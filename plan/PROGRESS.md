# Nhật ký mốc

## R1
- dev-01 DONE (1 vòng, commit 9c7dbd4). Ghi chú reviewer: test quét `src/tax` chạy rỗng đến khi dev-02 thêm file; dev-02 nên kiểm glob bắt được chuỗi cấm.
- dev-02 DONE (1 vòng, commit 1f72816). Ghi chú reviewer: gọn phần kiểm `years` trong `shareInYear`; thiếu test cho `mode` không hợp lệ và `years` lẻ.
- dev-03 DONE (1 vòng, commit 5436343). Ghi chú reviewer: test căn cứ chỉ kiểm pit/vat; `year` của computeAnnual chưa đối chiếu `rules.year`.
- dev-04 DONE (1 vòng, commit 1137776). 25 test trong tests/tax, 33 test toàn bộ.

## R2
- dev-01 DONE (1 vòng, commit b0d0e5c). Ghi chú reviewer: `parseVnd("0.000")` ra 0 và `"007"` ra 7 (đúng đặc tả); dev-03 nên cân nhắc cảnh báo khi doanh thu 0. `formatVnd` không xử lý NaN/số lẻ (ngoài tiêu chí).

## Đề xuất chờ duyệt
