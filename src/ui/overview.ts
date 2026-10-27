import type { TaxRules } from "../rules";
import { formatVnd } from "./money";
import type { YearSummaryOutcome } from "./year-summary";

export interface OverviewOptions {
  year: number;
  /** Luật của năm đang xem (chỉ cần khi có kết quả tính). */
  rules?: TaxRules;
  /** Năm gần nhất có luật; dùng cho nút "Xem năm Y" khi năm đang xem chưa có luật. */
  fallbackYear?: number;
  onSwitchYear?: (year: number) => void;
}

export const OVERVIEW_UNREADABLE = "Chưa đọc được sổ nên chưa có tổng quan. Xem thông báo ở phần Sổ doanh thu bên dưới.";

type Props = Partial<Record<string, string>>;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Chữ "cách tính" từ cơ sở và nhãn thuế suất do engine trả. Một hợp đồng có cơ sở thì
 * `cơ sở × %`; nhiều hợp đồng thì in từng cụm nối bằng "+", không đánh số (số sau khi lọc không khớp hợp đồng thật; engine làm tròn riêng từng hợp đồng).
 */
function howText(parts: { base: number }[], label: string): string {
  const live = parts.filter((p) => p.base > 0);
  const [only] = live;
  if (live.length === 1 && only) return `${formatVnd(only.base)} × ${label}`;
  return live.map((p) => `${formatVnd(p.base)} × ${label}`).join(" + ");
}

function money(amount: number): HTMLElement {
  return el("span", { class: "tnum" }, formatVnd(amount));
}

function card(year: number): HTMLElement {
  const sec = el("section", { class: "card hero", "aria-labelledby": "overview-title" });
  sec.append(el("p", { class: "eyebrow", id: "overview-title" }, `Thuế cho thuê năm ${year} của bạn`));
  return sec;
}

/** Vẽ khối tổng quan từ kết quả khối tổng năm của sổ; `null` = sổ khoá hoặc không đọc được. */
export function renderOverview(root: HTMLElement, outcome: YearSummaryOutcome | null, options: OverviewOptions): void {
  const { year, rules } = options;
  root.replaceChildren();

  if (!outcome) {
    const hero = card(year);
    hero.append(el("p", { class: "sub", role: "status" }, OVERVIEW_UNREADABLE));
    root.append(hero);
    return;
  }

  if (!("summary" in outcome)) {
    const hero = card(year);
    if (outcome.kind === "no-rules") {
      hero.append(el("p", { class: "answer" }, `Chưa có quy định thuế cho năm ${year}`));
      hero.append(el("p", { class: "sub", role: "status" }, outcome.error));
      const { fallbackYear, onSwitchYear } = options;
      if (fallbackYear !== undefined && onSwitchYear) {
        const go = el("button", { type: "button", name: "switch-year", class: "btn" }, `Xem năm ${fallbackYear}`);
        go.addEventListener("click", () => onSwitchYear(fallbackYear));
        hero.append(go);
      }
    } else {
      hero.append(el("p", { class: "form-error", role: "alert" }, outcome.error));
    }
    root.append(hero);
    return;
  }

  const s = outcome.summary;
  const taxable = s.status === "taxable";
  const hero = card(year);
  hero.classList.add(taxable ? "owe" : "safe");

  if (s.totalRevenue === 0) {
    hero.append(el("p", { class: "answer" }, `Sổ năm ${year} chưa có kỳ thu`));
    const sub = el("p", { class: "sub" }, "Hãy thêm kỳ thu ở ");
    sub.append(el("a", { href: "#ledger" }, "Sổ doanh thu"), ".");
    hero.append(sub);
    root.append(hero);
    return;
  }

  if (taxable) {
    const ans = el("p", { class: "answer" }, "Phải nộp khoảng ");
    ans.append(money(s.totalTax));
    hero.append(ans);
    const sub = el("p", { class: "sub" }, "Gồm thuế TNCN ");
    sub.append(money(s.totalPit), " và thuế GTGT ", money(s.totalVat));
    if (s.vatEstimated) sub.append(" ", el("span", { class: "chip est" }, "ước tính"));
    hero.append(sub);
  } else {
    hero.append(el("p", { class: "answer" }, "Chưa phải nộp thuế"));
    const sub = el("p", { class: "sub" }, `Doanh thu năm ${year} là `);
    sub.append(money(s.totalRevenue), " và chưa vượt ngưỡng. Bạn chỉ cần thông báo doanh thu.");
    hero.append(sub);
  }

  // Thanh ngưỡng
  if (rules) {
    const threshold = rules.threshold;
    const meter = el("div", {
      class: "meter",
      role: "img",
      "aria-label": `Doanh thu ${formatVnd(s.totalRevenue)}, ngưỡng ${formatVnd(threshold)}${taxable ? ", đã vượt ngưỡng" : ""}`,
    });
    const bar = el("div", { class: "meter-bar" });
    const ratio = taxable ? threshold / s.totalRevenue : s.totalRevenue / threshold;
    const fill = Math.max(0, Math.min(100, ratio * 100));
    const pct = `${Math.round(fill * 10) / 10}%`;
    bar.append(el("div", { class: "meter-fill", style: `width:${pct}` }));
    if (taxable) bar.append(el("div", { class: "meter-over", style: `left:${pct}` }));
    meter.append(bar);
    const legend = el("div", { class: "meter-legend" });
    const a = el("span", {}, "Doanh thu ");
    const b = el("b", { class: "tnum" }, formatVnd(s.totalRevenue));
    a.append(b);
    const c = el("span", {}, "Ngưỡng ");
    c.append(money(threshold));
    legend.append(a, c);
    meter.append(legend);
    hero.append(meter);
  }
  if (s.thresholdWarning) {
    hero.append(el("p", { class: "sub" }, `Đã vượt ngưỡng từ ngày ${dmy(s.thresholdWarning.crossedOn)}.`));
  }
  root.append(hero);

  // Biên lai "Cách tính"
  const props = s.revenueByProperty.filter((p) => p.revenue > 0).length;
  const box = el("section", { class: "card", "aria-labelledby": "receipt-title" });
  box.append(el("h2", { id: "receipt-title" }, "Cách tính"));
  const list = el("ol", { class: "receipt" });
  const row = (what: string, how: string | null, amount: string, est = false): void => {
    const li = el("li");
    const w = el("span", { class: "what" }, what);
    if (est) w.append(" ", el("span", { class: "chip est" }, "ước tính"));
    if (how) w.append(el("span", { class: "how" }, how));
    li.append(w, el("span", { class: "amt tnum" }, amount));
    list.append(li);
  };
  row(`Tổng doanh thu ${props} căn`, `Theo ngày nhận tiền trong năm ${year}`, formatVnd(s.totalRevenue));
  if (taxable) {
    const excess = s.totalRevenue - s.totalDeduction;
    row(`Trừ ngưỡng năm ${year}`, "Trừ một lần cho tổng các hợp đồng", `− ${formatVnd(s.totalDeduction)}`);
    row("Phần vượt ngưỡng", null, formatVnd(excess));
    row("Thuế TNCN", howText(s.contracts.map((c) => ({ base: c.pitBase })), s.pitRateLabel) || null, formatVnd(s.totalPit));
    const vatHow = howText(s.contracts.map((c) => ({ base: c.vatBase })), s.vatRateLabel);
    const note = s.vatEstimated ? "cơ sở tính chưa xác nhận" : "";
    row("Thuế GTGT", [vatHow, note].filter(Boolean).join(", ") || null, formatVnd(s.totalVat), s.vatEstimated);
  } else {
    row("Doanh thu chưa vượt ngưỡng", "Chưa phát sinh thuế TNCN và GTGT", formatVnd(0));
  }
  box.append(list);
  const total = el("div", { class: "total" });
  total.append(el("span", {}, "Tổng thuế phải nộp"), el("span", { class: "amt tnum" }, formatVnd(s.totalTax)));
  box.append(total);
  const c = s.citations;
  const cites = taxable ? [c.threshold, c.pit, c.vat, c.deduction] : [c.threshold, c.revenueNotice];
  box.append(el("p", { class: "cite" }, `Căn cứ: ${cites.filter(Boolean).join("; ")}.`));
  root.append(box);
}
