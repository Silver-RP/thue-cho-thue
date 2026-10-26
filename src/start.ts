import { analyticsFromEnv } from "./analytics";
import type { StorageLike } from "./ledger/storage";
import { availableYears, getRules, type TaxRules } from "./rules";
import { mountCalculator } from "./ui/form";
import { mountLedger } from "./ui/ledger";
import { renderOverview } from "./ui/overview";

/** Năm đang khai: trước 01/02 vẫn là năm trước (hạn khai 31/01). */
export function filingYear(today: string): number {
  const y = Number(today.slice(0, 4));
  return today < `${today.slice(0, 4)}-02-01` ? y - 1 : y;
}

/** Hàm duy nhất đọc đồng hồ; chỉ `src/main.ts` gọi. */
export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface StartOptions {
  /** Ngày hôm nay, YYYY-MM-DD. */
  today: string;
  /** null = trình duyệt chặn lưu dữ liệu. */
  storage: StorageLike | null;
  /** Chỉ dùng cho test: luật thêm cho các năm ngoài cấu hình. */
  rules?: TaxRules[];
  events?: EventTarget;
  newId?: () => string;
  confirm?: (message: string) => boolean;
  download?: (filename: string, mime: string, content: string) => void;
  copy?: (text: string) => Promise<void> | void;
}

const BLOCKED_MESSAGE =
  "Sổ doanh thu chưa dùng được vì trình duyệt đang chặn lưu dữ liệu của trang này. " +
  "Hãy bật lại việc lưu dữ liệu trang web (cookie và bộ nhớ trang) trong phần cài đặt quyền riêng tư của trình duyệt, " +
  "hoặc thoát chế độ ẩn danh, rồi tải lại trang. Máy tính thuế ở trên vẫn dùng bình thường.";

const PAST_SUFFIX = / \(đã qua\)$/;

/** Gỡ lần gắn trước (listener `storage`) khi `startApp` được gọi lại. */
let previous: (() => void) | null = null;

/** Gắn ô chọn năm, máy tính (#app) và sổ (#ledger). Gọi lại thì gắn lại từ đầu. */
export function startApp(doc: Document, options: StartOptions): void {
  previous?.();
  const { today, storage } = options;
  const extra = new Map<number, TaxRules>((options.rules ?? []).map((r) => [r.year, r]));
  const withRules = [...new Set([...availableYears(), ...extra.keys()])].sort((a, b) => a - b);
  const current = filingYear(today);
  const years = withRules.includes(current) ? withRules : [...withRules, current].sort((a, b) => a - b);
  const fallbackYear = withRules.length > 0 ? withRules[withRules.length - 1] : undefined;

  const appRoot = doc.querySelector<HTMLElement>("#app");
  const ledgerRoot = doc.querySelector<HTMLElement>("#ledger");
  const overviewRoot = doc.querySelector<HTMLElement>("#overview");

  doc.querySelectorAll('[data-year-picker]').forEach((n) => n.remove());
  const picker = doc.createElement("div");
  picker.className = "year-picker field";
  picker.setAttribute("data-year-picker", "");
  const label = doc.createElement("label");
  label.htmlFor = "tax-year";
  label.textContent = "Năm tính thuế";
  const select = doc.createElement("select");
  select.id = "tax-year";
  select.name = "tax-year";
  for (const y of years) {
    const o = doc.createElement("option");
    o.value = String(y);
    o.textContent = withRules.includes(y) ? String(y) : `${y} (chưa có quy định)`;
    select.append(o);
  }
  picker.append(label, select);
  const slot = doc.querySelector<HTMLElement>("[data-year-slot]");
  if (slot) slot.replaceChildren(picker);
  else if (appRoot) appRoot.before(picker);
  else (ledgerRoot ?? doc.body).before(picker);

  let unmountCalc: (() => void) | null = null;
  let unmountLedger: (() => void) | null = null;

  const show = (year: number): void => {
    unmountCalc?.();
    unmountLedger?.();
    unmountCalc = null;
    unmountLedger = null;
    select.value = String(year);
    const rules = extra.get(year);
    const common = { fallbackYear, onSwitchYear: show };
    const rulesOf = (): TaxRules | undefined => {
      try {
        return rules ?? getRules(year);
      } catch {
        return undefined;
      }
    };
    if (overviewRoot) {
      // Kho bị chặn: không có sổ nên không có onSummary; vẫn phải có câu thay vì để trống.
      if (!storage) renderOverview(overviewRoot, null, { year });
    }
    const onSummary = overviewRoot
      ? (outcome: Parameters<typeof renderOverview>[1]): void =>
          renderOverview(overviewRoot, outcome, { year, rules: rulesOf(), ...common })
      : undefined;
    if (appRoot) unmountCalc = mountCalculator(appRoot, { year, today, ...(rules ? { rules } : {}), ...common });
    if (ledgerRoot) {
      if (storage) {
        unmountLedger = mountLedger(ledgerRoot, {
          year,
          today,
          storage,
          ...(rules ? { rules } : {}),
          ...common,
          ...(onSummary ? { onSummary } : {}),
          ...(options.events ? { events: options.events } : {}),
          ...(options.newId ? { newId: options.newId } : {}),
          ...(options.confirm ? { confirm: options.confirm } : {}),
          ...(options.download ? { download: options.download } : {}),
          ...(options.copy ? { copy: options.copy } : {}),
        });
      } else {
        const msg = doc.createElement("p");
        msg.className = "form-error ledger-error";
        msg.setAttribute("role", "alert");
        msg.textContent = BLOCKED_MESSAGE;
        ledgerRoot.replaceChildren(msg);
        unmountLedger = () => ledgerRoot.replaceChildren();
      }
    }
  };
  select.addEventListener("change", () => show(Number(select.value)));
  show(current);

  // FAQ: gắn "đã qua" vào span hạn có ngày < today (gỡ nhãn cũ trước để gọi lại không nhân đôi).
  const spans = Array.from(doc.querySelectorAll<HTMLElement>('[data-rule="deadline"]'));
  const original = new Map<HTMLElement, string>();
  for (const s of spans) {
    const text = s.textContent ?? "";
    original.set(s, text.replace(PAST_SUFFIX, ""));
    s.removeAttribute("data-past");
    s.textContent = original.get(s)!;
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s.textContent);
    if (m && `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` < today) {
      s.textContent = `${original.get(s)} (đã qua)`;
      s.setAttribute("data-past", "");
    }
  }
  previous = () => {
    for (const [s, t] of original) {
      s.textContent = t;
      s.removeAttribute("data-past");
    }
    unmountCalc?.();
    unmountLedger?.();
    overviewRoot?.replaceChildren();
    picker.remove();
  };

  try {
    analyticsFromEnv().track("pageview", doc.location?.pathname ?? "/");
  } catch {
    // analytics không được làm hỏng trang
  }
}
