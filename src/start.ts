import { analyticsFromEnv } from "./analytics";
import type { StorageLike } from "./ledger/storage";
import { availableYears, getRules, type TaxRules } from "./rules";
import { mountCalculator } from "./ui/form";
import { mountLedger } from "./ui/ledger";
import { renderDue } from "./ui/due";
import { renderOverview } from "./ui/overview";

const NEAREST_SCAN_YEARS = 50;
/** Chu kỳ hỏi lại đồng hồ khi tab đang hiện (mili giây); qua 00:00 trễ nhất chừng này. */
const CLOCK_CHECK_MS = 30_000;

interface Due {
  month: number;
  day: number;
  yearOffset: number;
}

/** Hạn khai cả năm: phần tử `once` muộn nhất (yearOffset, rồi tháng, rồi ngày lớn nhất). */
function latestOnce(rules: TaxRules): Due | null {
  let best: Due | null = null;
  for (const d of rules.deadlines.once) {
    if (
      !best ||
      d.yearOffset > best.yearOffset ||
      (d.yearOffset === best.yearOffset && (d.month > best.month || (d.month === best.month && d.day > best.day)))
    )
      best = d;
  }
  return best;
}

/**
 * Năm đang khai: đến hết hạn khai cả năm (đọc từ `deadlines.once` của luật năm trước, hoặc luật gần nhất có)
 * vẫn là năm trước. Không dời hạn vào ngày làm việc.
 */
export function filingYear(today: string, rulesOf?: (year: number) => TaxRules | undefined): number {
  const y = Number(today.slice(0, 4));
  const lookup = (year: number): TaxRules | undefined => {
    try {
      return (rulesOf ?? getRules)(year);
    } catch {
      return undefined;
    }
  };
  let rules = lookup(y - 1);
  for (let k = 2; !rules && k <= NEAREST_SCAN_YEARS; k++) rules = lookup(y - k);
  const due = rules ? latestOnce(rules) : null;
  if (due && due.yearOffset >= 1) {
    const p = (n: number) => String(n).padStart(2, "0");
    return today <= `${today.slice(0, 4)}-${p(due.month)}-${p(due.day)}` ? y - 1 : y;
  }
  // Không có luật nào (hoặc luật không có hạn sang năm sau): giữ quy tắc cũ, hạn khai là 31/01 nên hết ngày đó là năm mới.
  return today <= `${today.slice(0, 4)}-01-31` ? y - 1 : y;
}

/** Hàm duy nhất đọc đồng hồ; chỉ `src/main.ts` gọi. Ngày theo giờ Việt Nam, không phụ thuộc múi giờ máy. */
export function localToday(now?: Date): string {
  const d = now ?? new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
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
  /** Đọc ngày hôm nay; có thì khi quay lại tab mà ngày đã đổi, trang được gắn lại với ngày mới. */
  clock?: () => string;
}

const BLOCKED_MESSAGE =
  "Sổ doanh thu chưa dùng được vì trình duyệt đang chặn lưu dữ liệu của trang này. " +
  "Hãy bật lại việc lưu dữ liệu trang web (cookie và bộ nhớ trang) trong phần cài đặt quyền riêng tư của trình duyệt, " +
  "hoặc thoát chế độ ẩn danh, rồi tải lại trang. Máy tính thuế ở trên vẫn dùng bình thường.";

const PAST_SUFFIX = / \(đã qua\)$/;

type Snapshot = Map<string, string | boolean>;

/** Duyệt các ô nhập trong form của một vùng, khoá = vùng + form (class, thứ tự cùng class) + name + type. */
function eachField(root: HTMLElement | null, region: string, fn: (key: string, f: HTMLInputElement) => void): void {
  if (!root) return;
  const seen = new Map<string, number>();
  for (const form of Array.from(root.querySelectorAll("form"))) {
    const cls = form.className || form.getAttribute("name") || "form";
    const idx = seen.get(cls) ?? 0;
    seen.set(cls, idx + 1);
    for (const f of Array.from(form.querySelectorAll<HTMLInputElement>("input, select, textarea"))) {
      if (!f.name || f.type === "file" || f.closest("[data-year-picker]")) continue;
      const val = f.type === "radio" ? `|${f.value}` : "";
      fn(`${region}|${cls}#${idx}|${f.name}|${f.type}${val}`, f);
    }
  }
}

/** Giá trị mặc định lúc dựng ô (thuộc tính HTML), để biết người dùng đã sửa ô chưa. */
function defaultOf(f: HTMLInputElement): string | boolean {
  if (f.type === "checkbox" || f.type === "radio") return f.defaultChecked;
  if (f.tagName === "SELECT") {
    const opts = Array.from((f as unknown as HTMLSelectElement).options);
    return (opts.find((o) => o.defaultSelected) ?? opts[0])?.value ?? "";
  }
  return f.defaultValue;
}

/** Chỉ ghi ô đã sửa; ô trở về mặc định thì bỏ khỏi ảnh chụp để dữ liệu tươi của kho không bị đè. */
function capture(root: HTMLElement | null, region: string, into: Snapshot): void {
  eachField(root, region, (key, f) => {
    const v = f.type === "checkbox" || f.type === "radio" ? f.checked : f.value;
    if (v === defaultOf(f)) into.delete(key);
    else into.set(key, v);
  });
}

function restore(root: HTMLElement | null, region: string, from: Snapshot): void {
  if (from.size === 0) return;
  eachField(root, region, (key, f) => {
    if (!from.has(key)) return;
    const v = from.get(key)!;
    let changed = false;
    if (typeof v === "boolean") {
      changed = f.checked !== v;
      f.checked = v;
    } else if (f.tagName === "SELECT") {
      if (Array.from((f as unknown as HTMLSelectElement).options).some((o) => o.value === v)) {
        changed = f.value !== v;
        f.value = v;
      }
    } else {
      changed = f.value !== v;
      f.value = v;
    }
    // Các phụ thuộc (khối trả trước...) chạy lại theo ô vừa khôi phục; chỉ đổi giao diện, không lưu.
    if (changed) f.dispatchEvent(new Event("change", { bubbles: true }));
    // Ô sửa dở nằm trong phần gập của sổ: mở ra để người dùng thấy giá trị mình đang gõ.
    const fold = f.closest("details");
    if (fold) fold.open = true;
  });
}

interface Previous {
  teardown: () => void;
  capture: (into: Snapshot) => void;
  roots: [HTMLElement | null, HTMLElement | null];
  stale: () => boolean;
  /** Năm đang chọn và năm mặc định của lần gắn đó. */
  year: () => { chosen: number; dflt: number };
  /** Chuỗi khoá chính lần cuối sổ đọc hoặc ghi. */
  seen: SeenRaw;
}

/** Chuỗi khoá chính lần cuối tab này đọc hoặc ghi; sống qua các lần gắn lại do đổi ngày. */
export interface SeenRaw {
  known: boolean;
  raw: string | null | undefined;
}

/** Gỡ lần gắn trước (listener `storage`) khi `startApp` được gọi lại. */
let previous: Previous | null = null;

/** Gắn ô chọn năm, máy tính (#app) và sổ (#ledger). Gọi lại thì gắn lại từ đầu. */
export function startApp(doc: Document, options: StartOptions): void {
  run(doc, options, false);
}

/** `fromClock`: gắn lại do đổi ngày; giữ cờ stale và năm người dùng đã chọn khác mặc định. */
function run(doc: Document, options: StartOptions, fromClock: boolean): void {
  const carried: Snapshot = new Map();
  /** Sổ đã đổi ở tab khác: sống qua các lần gắn lại. */
  let stale = false;
  let keptYear: number | null = null;
  let seen: SeenRaw = { known: false, raw: undefined };
  if (
    previous &&
    previous.roots[0] === doc.querySelector<HTMLElement>("#app") &&
    previous.roots[1] === doc.querySelector<HTMLElement>("#ledger")
  ) {
    previous.capture(carried);
    if (fromClock) {
      seen = previous.seen;
      stale = previous.stale();
      const y = previous.year();
      if (y.chosen !== y.dflt) keptYear = y.chosen;
    }
  }
  previous?.teardown();
  const { today, storage } = options;
  const extra = new Map<number, TaxRules>((options.rules ?? []).map((r) => [r.year, r]));
  const withRules = [...new Set([...availableYears(), ...extra.keys()])].sort((a, b) => a - b);
  const current = filingYear(today, (y) => extra.get(y) ?? getRules(y));
  const years = withRules.includes(current) ? withRules : [...withRules, current].sort((a, b) => a - b);
  const fallbackYear = withRules.length > 0 ? withRules[withRules.length - 1] : undefined;

  const appRoot = doc.querySelector<HTMLElement>("#app");
  const ledgerRoot = doc.querySelector<HTMLElement>("#ledger");
  const overviewRoot = doc.querySelector<HTMLElement>("#overview");
  const dueRoot = doc.querySelector<HTMLElement>("#deadlines");

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
  /** Thêm vào ô chọn năm các năm sổ có doanh thu mà chưa có trong danh sách (giữ thứ tự tăng dần, không nhân đôi). */
  const addYears = (more: number[]): void => {
    for (const y of more) {
      const have = Array.from(select.options);
      if (have.some((o) => o.value === String(y))) continue;
      const o = doc.createElement("option");
      o.value = String(y);
      o.textContent = withRules.includes(y) ? String(y) : `${y} (chưa có quy định)`;
      const after = have.find((x) => Number(x.value) > y);
      if (after) after.before(o);
      else select.append(o);
    }
  };
  const slot = doc.querySelector<HTMLElement>("[data-year-slot]");
  if (slot) slot.replaceChildren(picker);
  else if (appRoot) appRoot.before(picker);
  else (ledgerRoot ?? doc.body).before(picker);

  let unmountCalc: (() => void) | null = null;
  let unmountLedger: (() => void) | null = null;

  const snapshot = (into: Snapshot): void => {
    if (unmountCalc) capture(appRoot, "app", into);
    if (unmountLedger) capture(ledgerRoot, "ledger", into);
  };

  const show = (year: number): void => {
    snapshot(carried);
    unmountCalc?.();
    unmountLedger?.();
    unmountCalc = null;
    unmountLedger = null;
    for (const t of Array.from(doc.querySelectorAll("[data-view-year]"))) t.textContent = String(year);
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
    if (dueRoot && !storage) renderDue(dueRoot, null, { year, today });
    if (overviewRoot) {
      // Kho bị chặn: không có sổ nên không có onSummary; vẫn phải có câu thay vì để trống.
      if (!storage) renderOverview(overviewRoot, null, { year });
    }
    const onSummary =
      overviewRoot || dueRoot
        ? (outcome: Parameters<typeof renderOverview>[1]): void => {
            if (overviewRoot) renderOverview(overviewRoot, outcome, { year, today, rules: rulesOf(), ...common });
            if (dueRoot) renderDue(dueRoot, outcome, { year, today, ...(options.download ? { download: options.download } : {}) });
          }
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
          stale,
          seen,
          onStale: (v: boolean) => {
            stale = v;
          },
          ...(onSummary ? { onSummary } : {}),
          onYears: addYears,
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
    restore(appRoot, "app", carried);
    restore(ledgerRoot, "ledger", carried);
  };
  select.addEventListener("change", () => show(Number(select.value)));
  show(keptYear !== null && years.includes(keptYear) ? keptYear : current);

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
  const onVisible = (): void => {
    if (doc.visibilityState !== "visible" || !options.clock) return;
    let now: string;
    try {
      now = options.clock();
    } catch {
      return;
    }
    if (now !== today) run(doc, { ...options, today: now }, true);
  };
  if (options.clock) doc.addEventListener("visibilitychange", onVisible);
  // Tab vẫn hiện qua nửa đêm thì không có visibilitychange: hỏi lại đồng hồ định kỳ. Luôn chỉ một hẹn giờ đang chờ.
  let dead = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (): void => {
    if (dead || !options.clock) return;
    timer = setTimeout(() => {
      timer = undefined;
      onVisible();
      arm();
    }, CLOCK_CHECK_MS);
  };
  arm();

  // Mục đang chọn ở menu bên và thanh dưới: aria-current="page" cho đúng một liên kết mỗi khối.
  const navLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>(".nav a[href^='#'], .tabbar a[href^='#']"));
  const markCurrent = (target: string): void => {
    const known = navLinks.some((a) => a.getAttribute("href") === target);
    const want = known ? target : "#overview";
    for (const a of navLinks) {
      if (a.getAttribute("href") === want) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  };
  const fromHash = (): void => markCurrent(doc.location?.hash ?? "");
  const clickHandlers = navLinks.map((a) => {
    const h = (): void => markCurrent(a.getAttribute("href") ?? "");
    a.addEventListener("click", h);
    return h;
  });
  const win = doc.defaultView;
  win?.addEventListener("hashchange", fromHash);
  doc.addEventListener("hashchange", fromHash);
  fromHash();

  const teardown = (): void => {
    dead = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    doc.removeEventListener("visibilitychange", onVisible);
    navLinks.forEach((a, i) => a.removeEventListener("click", clickHandlers[i]));
    win?.removeEventListener("hashchange", fromHash);
    doc.removeEventListener("hashchange", fromHash);
    for (const [s, t] of original) {
      s.textContent = t;
      s.removeAttribute("data-past");
    }
    unmountCalc?.();
    unmountLedger?.();
    overviewRoot?.replaceChildren();
    dueRoot?.replaceChildren();
    picker.remove();
  };
  previous = {
    teardown,
    capture: snapshot,
    roots: [appRoot, ledgerRoot],
    stale: () => stale,
    year: () => ({ chosen: Number(select.value), dflt: current }),
    seen,
  };

  try {
    analyticsFromEnv().track("pageview", doc.location?.pathname ?? "/");
  } catch {
    // analytics không được làm hỏng trang
  }
}
