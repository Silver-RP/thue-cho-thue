import "./ui/style.css";
import { analyticsFromEnv } from "./analytics";
import { mountCalculator } from "./ui/form";
import { mountLedger } from "./ui/ledger";

const root = document.querySelector<HTMLElement>("#app");
if (root) mountCalculator(root, { year: 2026 });

const ledgerRoot = document.querySelector<HTMLElement>("#ledger");
if (ledgerRoot) {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  if (storage) {
    mountLedger(ledgerRoot, { year: 2026, storage });
  } else {
    const msg = document.createElement("p");
    msg.className = "form-error ledger-error";
    msg.setAttribute("role", "alert");
    msg.textContent =
      "Sổ doanh thu chưa dùng được vì trình duyệt đang chặn lưu dữ liệu của trang này. " +
      "Hãy bật lại việc lưu dữ liệu trang web (cookie và bộ nhớ trang) trong phần cài đặt quyền riêng tư của trình duyệt, " +
      "hoặc thoát chế độ ẩn danh, rồi tải lại trang. Máy tính thuế ở trên vẫn dùng bình thường.";
    ledgerRoot.replaceChildren(msg);
  }
}

try {
  analyticsFromEnv().track("pageview", location.pathname);
} catch {
  // analytics không được làm hỏng trang
}
