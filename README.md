# thue-cho-thue
Thuế cho người cho thuê nhà ít căn (luật VN 2026)

## Trang công khai
https://silver-rp.github.io/thue-cho-thue/

Workflow `.github/workflows/deploy.yml` chạy khi push vào `main`: lint, test, build rồi mới deploy lên GitHub Pages, sau đó kiểm nhanh trang đã lên.

Bật Pages một lần: Settings → Pages → Source: GitHub Actions.

## Bật analytics (mặc định tắt)
Đặt biến repo (Settings → Secrets and variables → Actions → Variables) `VITE_ANALYTICS_URL` là địa chỉ nhận sự kiện. Khi để trống, bundle không có mã gọi mạng. Khi bật, chỉ gửi `{ event, path }`, không gửi số tiền hay dữ liệu sổ.
