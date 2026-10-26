// @vitest-environment happy-dom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { LEDGER_KEY, saveLedger, type StorageLike } from "../../src/ledger/storage";
import { summarizeYear } from "../../src/ledger/summary";
import type { TaxRules } from "../../src/rules";
import { rules2026 } from "../../src/rules/2026";
import { startApp } from "../../src/start";
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
const overview = () => document.querySelector<HTMLElement>("#overview")!;
const ledgerRoot = () => document.querySelector<HTMLElement>("#ledger")!;
const answer = () => overview().querySelector(".answer")?.textContent ?? "";
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const MONEY = /\d\s*đ/;

/** Sổ 3 căn, mỗi căn một hợp đồng, doanh thu năm 2026 theo `amounts`. */
function book(amounts: number[]): Ledger {
  const l = emptyLedger();
  amounts.forEach((amount, i) => {
    l.properties.push({ id: `P${i}`, name: `Căn ${i}` });
    l.contracts.push({ id: `C${i}`, propertyId: `P${i}`, tenant: `Người ${i}`, signedOn: "2026-01-01", startOn: "2026-01-01" });
    l.receipts.push({ id: `R${i}`, contractId: `C${i}`, receivedOn: `2026-0${i + 1}-05`, amount });
  });
  return l;
}

function start(today: string, ledger: Ledger | null, extra: Record<string, unknown> = {}): void {
  if (ledger) saveLedger(storage, ledger);
  startApp(document, { today, storage, events, newId: () => "x" + Math.random(), confirm: () => true, download: () => {}, ...extra });
}

const rowAmounts = () => Array.from(overview().querySelectorAll(".receipt .amt")).map((n) => n.textContent);

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main><section id="overview"></section><section id="ledger"></section>';
  storage = new FakeStorage();
  events = new EventTarget();
});

describe("tổng quan: ca vượt ngưỡng (A1.1)", () => {
  it("số ở câu lớn, biên lai, tổng bằng summarizeYear và bằng .lg-total của sổ", () => {
    const ledger = book([300_000_000, 540_000_000, 360_000_000]);
    start("2026-10-26", ledger);
    const s = summarizeYear(ledger, 2026);
    expect(s.totalRevenue).toBe(1_200_000_000);
    expect(answer()).toContain(`Phải nộp khoảng ${formatVnd(s.totalTax)}`);
    expect(rowAmounts()).toEqual([
      formatVnd(s.totalRevenue),
      `− ${formatVnd(s.totalDeduction)}`,
      formatVnd(s.totalRevenue - s.totalDeduction),
      formatVnd(s.totalPit),
      formatVnd(s.totalVat),
    ]);
    expect(overview().querySelector(".total .amt")!.textContent).toBe(formatVnd(s.totalTax));
    const lg = ledgerRoot().querySelector(".lg-total")!.textContent!;
    for (const v of [s.totalRevenue, s.totalPit, s.totalVat, s.totalTax]) expect(lg).toContain(formatVnd(v));
    expect(overview().textContent).toContain("ước tính");
    expect(overview().querySelector(".cite")!.textContent).toContain(s.citations.threshold);
  });

  it("thanh ngưỡng: aria-label theo luật, ngày vượt ngưỡng, có phần vượt", () => {
    const ledger = book([300_000_000, 540_000_000, 360_000_000]);
    start("2026-10-26", ledger);
    const s = summarizeYear(ledger, 2026);
    const meter = overview().querySelector(".meter")!;
    expect(meter.getAttribute("role")).toBe("img");
    expect(meter.getAttribute("aria-label")).toContain(formatVnd(s.totalRevenue));
    expect(meter.getAttribute("aria-label")).toContain(formatVnd(rules2026.threshold));
    expect(meter.querySelector(".meter-over")).not.toBeNull();
    const [y, m, d] = s.thresholdWarning!.crossedOn.split("-");
    expect(overview().textContent).toContain(`Đã vượt ngưỡng từ ngày ${d}/${m}/${y}`);
  });

  it("ngưỡng lấy từ luật thử, không chép số cứng", () => {
    const other: TaxRules = { ...rules2026, year: 2026, threshold: 400_000_000 };
    const ledger = book([300_000_000, 200_000_000]);
    start("2026-10-26", ledger, { rules: [other] });
    const label = overview().querySelector(".meter")!.getAttribute("aria-label")!;
    expect(label).toContain(formatVnd(400_000_000));
    expect(label).not.toContain(formatVnd(1_000_000_000));
    expect(answer()).toContain("Phải nộp khoảng");
  });

  it("gọi startApp lần hai không nhân đôi khối", () => {
    const ledger = book([600_000_000, 600_000_000]);
    start("2026-10-26", ledger);
    start("2026-10-26", null);
    expect(overview().querySelectorAll(".answer")).toHaveLength(1);
    expect(overview().querySelectorAll(".receipt")).toHaveLength(1);
  });
});

describe("tổng quan: dưới ngưỡng và sổ trống", () => {
  it("1 căn 300 triệu: chưa phải nộp thuế, tổng 0 đ", () => {
    start("2026-10-26", book([300_000_000]));
    expect(answer()).toContain("Chưa phải nộp thuế");
    expect(overview().textContent).not.toContain("Phải nộp khoảng");
    expect(overview().querySelector(".total .amt")!.textContent).toBe(formatVnd(0));
    expect(overview().querySelector(".meter-over")).toBeNull();
  });

  it("sổ trống: chưa có kỳ thu, liên kết về #ledger, không có phần vượt", () => {
    start("2026-10-26", null);
    expect(answer()).toContain("chưa có kỳ thu");
    expect(overview().querySelector('a[href="#ledger"]')).not.toBeNull();
    expect(overview().querySelector(".meter-over")).toBeNull();
    expect(overview().querySelector(".receipt")).toBeNull();
  });
});

describe("tổng quan: đổi theo sổ (A1.1)", () => {
  it("thêm kỳ thu qua DOM cho vượt ngưỡng thì đổi, xoá thì về như cũ", () => {
    start("2026-10-26", book([300_000_000]));
    expect(answer()).toContain("Chưa phải nộp thuế");
    const f = ledgerRoot().querySelector("section.lg-contract .lg-receipt-add")!;
    fill(f, "receivedOn", "2026-06-01");
    fill(f, "amount", "1.200.000.000");
    submit(f);
    const after = JSON.parse(storage.getItem(LEDGER_KEY)!) as Ledger;
    const s = summarizeYear(after, 2026);
    expect(answer()).toContain(`Phải nộp khoảng ${formatVnd(s.totalTax)}`);
    const added = Array.from(ledgerRoot().querySelectorAll(".lg-receipt")).find(
      (n) => (n.querySelector('[name="receivedOn"]') as HTMLInputElement).value === "2026-06-01",
    )!;
    const del = Array.from(added.querySelectorAll("button")).find((b) => b.textContent === "Xoá kỳ thu")!;
    del.click();
    expect(answer()).toContain("Chưa phải nộp thuế");
  });
});

describe("tổng quan: năm chưa có luật", () => {
  it("2027: hiện thông báo, nút Xem năm 2026 chuyển năm", () => {
    start("2027-03-01", book([600_000_000, 600_000_000]));
    expect(answer()).toBe("Chưa có quy định thuế cho năm 2027");
    expect(answer()).not.toMatch(MONEY);
    const go = Array.from(overview().querySelectorAll("button")).find((b) => b.textContent === "Xem năm 2026")!;
    go.click();
    expect((document.querySelector('select[name="tax-year"]') as HTMLSelectElement).value).toBe("2026");
    expect(answer()).toContain("Phải nộp khoảng");
    expect(overview().textContent).toContain("2026");
  });
});

describe("tổng quan: sổ khoá hoặc kho bị chặn", () => {
  it("sổ khoá (schemaVersion 2): câu role=status, không có số tiền", () => {
    storage.setItem(LEDGER_KEY, '{"schemaVersion":2,"properties":[],"contracts":[],"receipts":[],"deductionChoice":{}}');
    expect(() => start("2026-10-26", null)).not.toThrow();
    expect(overview().querySelector('[role="status"]')!.textContent).toContain("Chưa đọc được sổ");
    expect(overview().textContent).not.toMatch(MONEY);
  });

  it("storage null: câu role=status, không ném lỗi", () => {
    expect(() => startApp(document, { today: "2026-10-26", storage: null, events })).not.toThrow();
    expect(overview().querySelector('[role="status"]')!.textContent).toContain("Chưa đọc được sổ");
    expect(overview().textContent).not.toMatch(MONEY);
  });
});

describe("thanh ngưỡng", () => {
  const widthOf = () => (overview().querySelector(".meter-fill") as HTMLElement).style.width;
  it("500 triệu / 1 tỷ: đầy 50%, không phần vượt", () => {
    start("2026-10-26", book([500_000_000]));
    expect(widthOf()).toBe("50%");
    expect(overview().querySelector(".meter-over")).toBeNull();
  });
  it("3 tỷ: đầy không quá 100%, có phần vượt", () => {
    start("2026-10-26", book([1_500_000_000, 1_500_000_000]));
    expect(parseFloat(widthOf())).toBeLessThanOrEqual(100);
    expect(overview().querySelector(".meter-over")).not.toBeNull();
  });
});

describe("quét số mẫu của mockup (A1.1)", () => {
  it("src/ui/*.ts và src/start.ts không chép số mẫu hay số luật cứng", () => {
    const dir = join(__dirname, "../../src/ui");
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => join(dir, f));
    files.push(join(__dirname, "../../src/start.ts"));
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const bad of ["70.000.000", "1.200.000.000", "05/10/2026", "Còn 21 ngày", "1.000.000.000", "5%"]) {
        expect(text.includes(bad), `${f} chứa ${bad}`).toBe(false);
      }
    }
  });
});
