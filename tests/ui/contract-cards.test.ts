// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
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
const root = () => document.querySelector<HTMLElement>("#ledger")!;

/** Mỗi phần tử: [căn, số tiền]; mỗi số tiền một hợp đồng, nhận 2026-03-01. */
function book(items: [number, number][]): Ledger {
  const l = emptyLedger();
  const props = new Set<number>();
  items.forEach(([p, amount], i) => {
    if (!props.has(p)) {
      props.add(p);
      l.properties.push({ id: `P${p}`, name: `Căn ${p}` });
    }
    l.contracts.push({ id: `C${i}`, propertyId: `P${p}`, tenant: `Người ${i}`, signedOn: "2026-01-01", startOn: "2026-01-01" });
    l.receipts.push({ id: `R${i}`, contractId: `C${i}`, receivedOn: "2026-03-01", amount });
  });
  return l;
}

function start(ledger: Ledger, rules?: TaxRules): void {
  saveLedger(storage, ledger);
  startApp(document, {
    today: "2026-10-26",
    storage,
    events: new EventTarget(),
    newId: () => "x" + Math.random(),
    confirm: () => true,
    download: () => {},
    ...(rules ? { rules: [rules] } : {}),
  });
}

/** Thẻ = bảng = formatVnd(summarizeYear().contracts) cho từng hợp đồng. */
function expectCardsMatch(ledger: Ledger, rules?: TaxRules): void {
  const s = summarizeYear(ledger, 2026, rules ?? rules2026);
  expect(s.contracts.length).toBe(ledger.contracts.length);
  for (const c of s.contracts) {
    const cardEl = root().querySelector(`.lg-card-contract[data-contract="${c.contractId}"]`);
    const row = root().querySelector(`.lg-by-contract tr[data-contract="${c.contractId}"]`)!;
    expect(cardEl, `thiếu thẻ hợp đồng ${c.contractId}`).not.toBeNull();
    const want: Record<string, string> = {
      revenue: formatVnd(c.revenue),
      deduction: formatVnd(c.deduction),
      pit: formatVnd(c.pit),
      vat: formatVnd(c.vat),
    };
    for (const col of ["revenue", "deduction", "pit", "vat"]) {
      const inCard = cardEl!.querySelector(`[data-col="${col}"]`);
      expect(inCard, `thẻ ${c.contractId} thiếu ${col}`).not.toBeNull();
      const inRow = row.querySelector(`[data-col="${col}"]`)!;
      expect(inCard!.textContent).toBe(inRow.textContent);
      expect(inCard!.textContent!.startsWith(want[col]!)).toBe(true);
    }
  }
}

beforeEach(() => {
  document.body.innerHTML =
    '<main id="app"></main><section id="overview"></section><section id="deadlines"></section><section id="ledger"></section>';
  storage = new FakeStorage();
});

describe("thẻ hợp đồng trên điện thoại (H-53)", () => {
  it("2 căn, 3 hợp đồng, vượt ngưỡng: thẻ = bảng = summarizeYear", () => {
    const l = book([[0, 700_000_000], [0, 450_000_000], [1, 380_000_007]]);
    start(l);
    expect(summarizeYear(l, 2026, rules2026).totalPit).toBeGreaterThan(0);
    expectCardsMatch(l);
  });

  it("2 hợp đồng 600.000.010 đ (số lẻ)", () => {
    const l = book([[0, 600_000_010], [1, 600_000_010]]);
    start(l);
    expectCardsMatch(l);
  });

  it("luật giả vat.base excess", () => {
    const fake: TaxRules = { ...rules2026, vat: { ...rules2026.vat, base: "excess", unconfirmed: false } };
    const l = book([[0, 600_000_010], [0, 600_000_010], [1, 300_000_001]]);
    start(l, fake);
    expectCardsMatch(l, fake);
  });

  it("dưới ngưỡng: thẻ hiện TNCN/GTGT 0 đ khớp bảng", () => {
    const l = book([[0, 100_000_000], [1, 50_000_000]]);
    start(l);
    expectCardsMatch(l);
    for (const col of ["pit", "vat"]) {
      expect(root().querySelector(`.lg-card-contract [data-col="${col}"]`)!.textContent!.startsWith("0 đ")).toBe(true);
    }
  });

  it("gắn lại nhiều lần không nhân đôi thẻ", () => {
    const l = book([[0, 700_000_000]]);
    start(l);
    start(l);
    expect(root().querySelectorAll(".lg-card-contract").length).toBe(1);
  });

  it("GTGT trong thẻ có (ước tính) khi vatEstimated, không có khi false", () => {
    const l = book([[0, 700_000_000]]);
    start(l);
    expect(summarizeYear(l, 2026, rules2026).vatEstimated).toBe(true);
    expect(root().querySelector('.lg-card-contract [data-col="vat"]')!.textContent).toContain("(ước tính)");
    expect(root().querySelector('.lg-card-contract [data-col="pit"]')!.textContent).not.toContain("ước tính");

    document.body.innerHTML =
      '<main id="app"></main><section id="overview"></section><section id="deadlines"></section><section id="ledger"></section>';
    storage = new FakeStorage();
    const fake: TaxRules = { ...rules2026, vat: { ...rules2026.vat, unconfirmed: false } };
    start(l, fake);
    expect(summarizeYear(l, 2026, fake).vatEstimated).toBe(false);
    expect(root().querySelector('.lg-card-contract [data-col="vat"]')!.textContent).not.toContain("ước tính");
  });

  it("tiêu đề 'Thuế theo hợp đồng' nằm trong khối bị ẩn ở màn hẹp cùng bảng; ngoài media không ẩn", () => {
    start(book([[0, 700_000_000]]));
    const h3 = Array.from(root().querySelectorAll("h3")).find((h) => h.textContent === "Thuế theo hợp đồng")!;
    expect(h3).toBeDefined();
    const table = root().querySelector(".lg-by-contract")!;
    const css = readFileSync(join(__dirname, "../../src/ui/style.css"), "utf8");
    const at = css.lastIndexOf("@media (max-width: 760px)");
    const start0 = css.indexOf("{", at);
    let depth = 0;
    let end = start0;
    for (let i = start0; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}" && --depth === 0) {
        end = i;
        break;
      }
    }
    const media = css.slice(start0, end);
    const outside = css.slice(0, at) + css.slice(end + 1);
    const hidden = Array.from(media.matchAll(/\.([\w-]+)\s*{\s*display:\s*none/g)).map((m) => m[1]!);
    expect(hidden.length).toBeGreaterThan(0);
    const holder = hidden.map((c) => h3.closest(`.${c}`)).find((x) => x !== null);
    expect(holder, "h3 phải nằm trong khối bị ẩn ở màn hẹp").toBeTruthy();
    expect(holder!.contains(table)).toBe(true);
    const cls = hidden.find((c) => h3.closest(`.${c}`) === holder)!;
    expect(outside).not.toMatch(new RegExp(`\\.${cls}\\s*{[^}]*display:\\s*none`));
  });
});
