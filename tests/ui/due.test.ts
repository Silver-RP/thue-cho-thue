// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { deadlinesToIcs, icsFilename } from "../../src/export/ics";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { LEDGER_KEY, saveLedger, type StorageLike } from "../../src/ledger/storage";
import { summarizeYear } from "../../src/ledger/summary";
import { startApp } from "../../src/start";
import { daysUntil } from "../../src/ui/due";
import { formatVnd } from "../../src/ui/money";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

let storage: FakeStorage;
let events: EventTarget;
let downloads: [string, string, string][];
const due = () => document.querySelector<HTMLElement>("#deadlines")!;
const ledgerRoot = () => document.querySelector<HTMLElement>("#ledger")!;
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};

function book(amounts: number[], filing?: "once" | "twice"): Ledger {
  const l = emptyLedger();
  amounts.forEach((amount, i) => {
    l.properties.push({ id: `P${i}`, name: `Căn ${i}` });
    l.contracts.push({ id: `C${i}`, propertyId: `P${i}`, tenant: `Người ${i}`, signedOn: "2026-01-01", startOn: "2026-01-01" });
    l.receipts.push({ id: `R${i}`, contractId: `C${i}`, receivedOn: `2026-0${i + 1}-05`, amount });
  });
  if (filing) l.filingMode = { "2026": filing };
  return l;
}

function start(today: string, ledger: Ledger | null, extra: Record<string, unknown> = {}): void {
  if (ledger) saveLedger(storage, ledger);
  startApp(document, {
    today,
    storage,
    events,
    newId: () => "x" + Math.random(),
    confirm: () => true,
    download: (f, m, c) => downloads.push([f, m, c]),
    ...extra,
  });
}

beforeEach(() => {
  document.body.innerHTML =
    '<main id="app"></main><section id="overview"></section><section id="deadlines"></section><section id="ledger"></section>';
  storage = new FakeStorage();
  events = new EventTarget();
  downloads = [];
});

describe("daysUntil", () => {
  it.each([
    ["2027-01-10", "2027-01-31", 21],
    ["2027-01-31", "2027-01-31", 0],
    ["2027-02-01", "2027-01-31", -1],
    ["2026-12-31", "2027-01-01", 1],
    ["2028-02-28", "2028-03-01", 2],
  ])("%s đến %s là %i ngày", (a, b, n) => {
    expect(daysUntil(a, b)).toBe(n);
  });
});

describe("thẻ hạn qua startApp (A1.2)", () => {
  it("2027-01-10: hạn 31/01/2027, Còn 21 ngày", () => {
    start("2027-01-10", book([600_000_000, 600_000_000]));
    expect(due().textContent).toContain("31/01/2027");
    expect(due().querySelector(".due-left")!.textContent).toBe("Còn 21 ngày");
    expect(due().textContent).toContain("khai 1 lần");
  });

  it("2027-01-31: Hôm nay là hạn, không có Còn", () => {
    start("2027-01-31", book([600_000_000, 600_000_000]));
    expect(due().textContent).toContain("Hôm nay là hạn");
    expect(due().textContent).not.toContain("Còn");
  });

  it("2027-02-01 với năm 2026: mọi hạn đã qua", () => {
    start("2027-02-01", book([600_000_000, 600_000_000]));
    const sel = document.querySelector('select[name="tax-year"]') as HTMLSelectElement;
    sel.value = "2026";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(due().textContent).toContain("đã qua");
    expect(due().textContent).not.toContain("Còn");
    expect(due().textContent).not.toContain("Hôm nay");
    expect(due().querySelectorAll(".timeline .chip.ok")).toHaveLength(0);
  });

  it("khai 2 lần: 31/07/2026 đã qua, 31/01/2027 sắp tới và là hạn kế tiếp", () => {
    start("2027-01-10", book([600_000_000, 600_000_000], "twice"));
    const items = Array.from(due().querySelectorAll(".timeline li"));
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("31/07/2026");
    expect(items[0].querySelector(".chip")!.textContent).toBe("đã qua");
    expect(items[1].textContent).toContain("31/01/2027");
    expect(items[1].querySelector(".chip")!.textContent).toBe("sắp tới");
    expect(due().querySelector(".due-date")!.textContent).toBe("31/01/2027");
    expect(due().textContent).toContain("khai 2 lần");
  });

  it("dưới ngưỡng: hạn thông báo doanh thu từ summarizeYear", () => {
    const ledger = book([300_000_000]);
    start("2026-10-26", ledger);
    const s = summarizeYear(ledger, 2026);
    expect(s.deadlines[0].kind).toBe("revenue_notice");
    const [y, m, d] = s.deadlines[0].date.split("-");
    expect(due().querySelector(".due-date")!.textContent).toBe(`${d}/${m}/${y}`);
    expect(due().textContent).toContain("Hạn thông báo doanh thu");
  });

  it("thêm kỳ thu qua DOM thì thẻ hạn đổi theo", () => {
    start("2027-01-10", book([100_000_000]));
    expect(due().textContent).toContain("Hạn thông báo doanh thu");
    const f = ledgerRoot().querySelector("section.lg-contract .lg-receipt-add")!;
    fill(f, "receivedOn", "2026-06-01");
    fill(f, "amount", "1.200.000.000");
    submit(f);
    expect(due().textContent).toContain("Hạn khai và nộp thuế");
    expect(due().textContent).toContain("Còn 21 ngày");
  });

  it("sổ trống: câu chưa có kỳ thu", () => {
    start("2027-01-10", null);
    expect(due().textContent).toContain("Chưa có kỳ thu năm 2026, hạn sẽ hiện khi có doanh thu");
  });

  it("gọi startApp lần hai không nhân đôi khối", () => {
    start("2027-01-10", book([600_000_000, 600_000_000]));
    start("2027-01-10", null);
    expect(due().querySelectorAll(".due-next")).toHaveLength(1);
    expect(due().querySelectorAll("button[name='add-to-calendar']")).toHaveLength(1);
  });

  it("kho bị chặn: câu thay vì trống", () => {
    startApp(document, { today: "2027-01-10", storage: null });
    expect(due().textContent).not.toBe("");
    expect(due().querySelector("button")).toBeNull();
  });
});

describe(".ics", () => {
  it("nút tải đúng tên file và nội dung bằng nút của khối xuất", () => {
    const ledger = book([600_000_000, 600_000_000], "twice");
    start("2027-01-10", ledger);
    due().querySelector<HTMLButtonElement>("button[name='add-to-calendar']")!.click();
    ledgerRoot().querySelector<HTMLButtonElement>("button[name='download-ics']")!.click();
    expect(downloads).toHaveLength(2);
    expect(downloads[0][0]).toBe(icsFilename(2026));
    expect(downloads[0]).toEqual(downloads[1]);
    const s = summarizeYear(ledger, 2026);
    expect(downloads[0][2]).toBe(deadlinesToIcs(s.deadlines, { year: 2026, stamp: "20270110T000000Z", today: "2027-01-10" }));
  });

  it("sổ trống: không có nút, có câu chưa có kỳ thu", () => {
    start("2027-01-10", null);
    expect(due().querySelector("button")).toBeNull();
    expect(due().textContent).toContain("Chưa có kỳ thu năm 2026");
  });
});

describe("thẻ căn và bảng hợp đồng (A1.1, A1.3)", () => {
  it("3 thẻ căn bằng revenueByProperty, bằng hàng hợp đồng; tfoot bằng tổng; bảng trong .table-scroll", () => {
    const ledger = book([300_000_000, 540_000_000, 360_000_000]);
    start("2026-10-26", ledger);
    const s = summarizeYear(ledger, 2026);
    const cards = Array.from(ledgerRoot().querySelectorAll(".lg-cards .lg-card"));
    expect(cards).toHaveLength(3);
    s.revenueByProperty.forEach((p, i) => {
      expect(cards[i].querySelector('[data-col="revenue"]')!.textContent).toBe(formatVnd(p.revenue));
      expect(cards[i].textContent).toContain("1 kỳ thu");
    });
    for (const c of s.contracts) {
      const row = ledgerRoot().querySelector(`.lg-by-contract tr[data-contract="${c.contractId}"]`)!;
      const prop = ledger.contracts.find((x) => x.id === c.contractId)!.propertyId;
      const card = ledgerRoot().querySelector(`.lg-card[data-property="${prop}"]`)!;
      expect(row.querySelector('[data-col="revenue"]')!.textContent).toBe(card.querySelector('[data-col="revenue"]')!.textContent);
    }
    const foot = ledgerRoot().querySelector(".lg-by-contract tfoot")!;
    const cell = (k: string) => foot.querySelector(`[data-col="${k}"]`)!.textContent;
    expect(cell("revenue")).toBe(formatVnd(s.totalRevenue));
    expect(cell("deduction")).toBe(formatVnd(s.totalDeduction));
    expect(cell("pit")).toBe(formatVnd(s.totalPit));
    expect(cell("vat")).toBe(formatVnd(s.totalVat));
    expect(ledgerRoot().querySelector(".lg-by-contract")!.closest(".table-scroll")).not.toBeNull();
  });

  it("CSS: thẻ ẩn mặc định, hiện trong @media 760px; bảng ẩn ở màn hẹp", () => {
    const css = readFileSync(join(__dirname, "../../src/ui/style.css"), "utf8");
    expect(css).toMatch(/\.lg-cards\s*{\s*display:\s*none/);
    const media = css.slice(css.lastIndexOf("@media (max-width: 760px)"));
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/@media \(max-width: 760px\)\s*{\s*\.lg-cards\s*{\s*display:\s*grid/);
    expect(media.length).toBeGreaterThan(0);
    expect(css).toMatch(/\.lg-contract-wrap\s*{\s*display:\s*none/);
    // H-53: tiêu đề ẩn cùng bảng, không mồ côi
    start("2026-10-26", book([100_000_000]));
    const h3 = Array.from(ledgerRoot().querySelectorAll("h3")).find((h) => h.textContent === "Thuế theo hợp đồng")!;
    expect(h3.closest(".lg-contract-wrap")!.contains(ledgerRoot().querySelector(".lg-by-contract"))).toBe(true);
  });
});

describe("ô ngày type=date (H-13)", () => {
  it("bốn ô ngày có type=date, không inputmode; nhập 2026-03-01 lưu đúng", () => {
    start("2026-10-26", book([100_000_000]));
    const l = ledgerRoot();
    const contractForm = l.querySelector(".lg-contract-add") ?? l.querySelector("form");
    expect(contractForm).not.toBeNull();
    const rf = l.querySelector("section.lg-contract .lg-receipt-add")!;
    for (const [scope, name] of [[contractForm!, "signedOn"], [contractForm!, "startOn"], [contractForm!, "endOn"], [rf, "receivedOn"]] as const) {
      const input = scope.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
      expect(input.type).toBe("date");
      expect(input.hasAttribute("inputmode")).toBe(false);
      expect(input.labels?.[0]?.textContent).not.toContain("AAAA");
    }
    fill(rf, "receivedOn", "2026-03-01");
    fill(rf, "amount", "5.000.000");
    submit(rf);
    const saved = JSON.parse(storage.data.get(LEDGER_KEY)!) as Ledger;
    expect(saved.receipts.some((r) => r.receivedOn === "2026-03-01" && r.amount === 5_000_000)).toBe(true);
  });

  it("ô ngày trống: lỗi tiếng Việt tại ô, kho không đổi", () => {
    start("2026-10-26", book([100_000_000]));
    const before = storage.data.get(LEDGER_KEY);
    const rf = ledgerRoot().querySelector("section.lg-contract .lg-receipt-add")!;
    fill(rf, "receivedOn", "");
    fill(rf, "amount", "5.000.000");
    submit(rf);
    const input = rf.querySelector('[name="receivedOn"]') as HTMLElement;
    const err = rf.querySelector("#" + input.id + "-error") as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("ngày");
    expect(storage.data.get(LEDGER_KEY)).toBe(before);
  });
});
