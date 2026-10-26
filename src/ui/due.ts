import { deadlinesToIcs, icsFilename } from "../export/ics";
import type { YearSummaryOutcome } from "./year-summary";

export interface DueOptions {
  year: number;
  /** Ngày hôm nay, YYYY-MM-DD. */
  today: string;
  download?: (filename: string, mime: string, content: string) => void;
  /** DTSTAMP dạng YYYYMMDDTHHMMSSZ; mặc định lấy từ `today` (giống khối xuất). */
  stamp?: string;
}

export const DUE_UNREADABLE = "Chưa đọc được sổ nên chưa có hạn khai. Xem thông báo ở phần Sổ doanh thu.";

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Ngày không hợp lệ: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

/** Số ngày từ `today` đến `date` (YYYY-MM-DD); âm khi `date` đã qua. Tính trên lịch, không qua múi giờ. */
export function daysUntil(today: string, date: string): number {
  return utcDay(date) - utcDay(today);
}

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

function defaultDownload(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL?.(url);
}

const kindText = (kind: string): string => (kind === "revenue_notice" ? "Hạn thông báo doanh thu" : "Hạn khai và nộp thuế");

/** Vẽ khối "Hạn và tờ khai" từ `YearSummary.deadlines`; `null` = sổ khoá hoặc không đọc được. */
export function renderDue(root: HTMLElement, outcome: YearSummaryOutcome | null, options: DueOptions): void {
  const { year, today } = options;
  const download = options.download ?? defaultDownload;
  const stamp = options.stamp ?? `${today.replace(/-/g, "")}T000000Z`;
  root.replaceChildren();
  const card = el("section", { class: "card due", "aria-labelledby": "due-title" });
  card.append(el("h2", { id: "due-title" }, `Hạn và tờ khai năm ${year}`));
  root.append(card);

  if (!outcome) {
    card.append(el("p", { class: "sub", role: "status" }, DUE_UNREADABLE));
    return;
  }
  if (!("summary" in outcome)) {
    card.append(el("p", { class: outcome.kind === "no-rules" ? "sub" : "form-error", role: outcome.kind === "no-rules" ? "status" : "alert" }, outcome.error));
    return;
  }
  const s = outcome.summary;
  if (s.totalRevenue === 0 || s.deadlines.length === 0) {
    card.append(el("p", { class: "sub", role: "status" }, `Chưa có kỳ thu năm ${year}, hạn sẽ hiện khi có doanh thu.`));
    return;
  }

  const next = s.deadlines.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const big = el("div", { class: "due-next" });
  if (next) {
    const n = daysUntil(today, next.date);
    big.append(el("p", { class: "due-date" }, dmy(next.date)));
    big.append(el("p", { class: "due-left" }, n === 0 ? "Hôm nay là hạn" : `Còn ${n} ngày`));
    big.append(el("p", { class: "sub" }, kindText(next.kind)));
  } else {
    big.append(el("p", { class: "due-left" }, `Mọi hạn của năm ${year} đã qua`));
  }
  card.append(big);

  const filings = s.deadlines.filter((d) => d.kind === "filing").length;
  if (s.status === "taxable") {
    card.append(el("p", { class: "sub due-mode" }, `Cách khai: ${filings > 1 ? "khai 2 lần" : "khai 1 lần"}`));
  }

  const list = el("ul", { class: "timeline" });
  for (const d of [...s.deadlines].sort((a, b) => a.date.localeCompare(b.date))) {
    const past = d.date < today;
    const li = el("li", { "data-date": d.date });
    li.append(
      el("strong", {}, dmy(d.date)),
      ` ${kindText(d.kind)} `,
      el("span", { class: past ? "chip past" : "chip ok" }, past ? "đã qua" : "sắp tới"),
    );
    list.append(li);
  }
  card.append(list);

  const err = el("p", { class: "form-error", role: "alert" });
  err.hidden = true;
  const ics = el("button", { type: "button", name: "add-to-calendar", class: "btn" }, "Thêm vào lịch (.ics)");
  ics.addEventListener("click", () => {
    try {
      download(icsFilename(year), "text/calendar", deadlinesToIcs(s.deadlines, { year, stamp, today }));
      err.hidden = true;
    } catch {
      err.textContent = "Không tạo được file nhắc lịch để tải xuống.";
      err.hidden = false;
    }
  });
  card.append(ics, err);
}
