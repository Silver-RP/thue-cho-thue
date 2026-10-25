import "./ui/style.css";
import { analyticsFromEnv } from "./analytics";
import { mountCalculator } from "./ui/form";
import { mountLedger } from "./ui/ledger";

const root = document.querySelector<HTMLElement>("#app");
if (root) mountCalculator(root, { year: 2026 });

const ledgerRoot = document.querySelector<HTMLElement>("#ledger");
if (ledgerRoot) mountLedger(ledgerRoot, { year: 2026, storage: window.localStorage });

try {
  analyticsFromEnv().track("pageview", location.pathname);
} catch {
  // analytics không được làm hỏng trang
}
