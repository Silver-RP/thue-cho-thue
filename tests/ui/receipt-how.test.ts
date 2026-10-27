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
const overview = () => document.querySelector<HTMLElement>("#overview")!;

/** Mỗi số tiền một hợp đồng riêng, nhận 2026-03-01. */
function book(amounts: number[]): Ledger {
  const l = emptyLedger();
  amounts.forEach((amount, i) => {
    l.properties.push({ id: `P${i}`, name: `Căn ${i}` });
    l.contracts.push({ id: `C${i}`, propertyId: `P${i}`, tenant: `Người ${i}`, signedOn: "2026-01-01", startOn: "2026-01-01" });
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

function line(prefix: string): { how: string; amt: string } {
  const li = Array.from(overview().querySelectorAll(".receipt li")).find((n) => n.querySelector(".what")!.textContent!.startsWith(prefix));
  if (!li) throw new Error(`thiếu dòng ${prefix}`);
  return { how: li.querySelector(".how")?.textContent ?? "", amt: li.querySelector(".amt")!.textContent! };
}

const CLAUSE = /(\d[\d.]*) đ × (\d+(?:,\d+)?)%/g;

/** Tách mọi cụm `X đ × P%`, cộng floor(X × P) từng cụm (làm tròn như engine). */
function clauses(how: string): { base: number; pct: string }[] {
  return Array.from(how.matchAll(CLAUSE)).map((m) => ({ base: Number(m[1]!.replace(/\./g, "")), pct: m[2]! }));
}
function sumRounded(how: string): number {
  return clauses(how).reduce((s, c) => {
    const bps = BigInt(Math.round(Number(c.pct.replace(",", ".")) * 100));
    return s + Number((BigInt(c.base) * bps) / 10000n);
  }, 0);
}

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main><section id="overview"></section><section id="ledger"></section>';
  storage = new FakeStorage();
});

describe("biên lai: cách tính khớp tiền (H-51, H-48)", () => {
  const cases: [string, number[]][] = [
    ["2 hợp đồng 600.000.010 đ (ca audit)", [600_000_010, 600_000_010]],
    ["3 hợp đồng số lẻ", [412_345_678, 398_765_431, 250_000_007]],
  ];
  for (const [name, amounts] of cases) {
    it(`${name}: Σ round(X × P) từng cụm bằng .amt của TNCN và GTGT`, () => {
      const ledger = book(amounts);
      start(ledger);
      const s = summarizeYear(ledger, 2026);
      for (const [prefix, total] of [["Thuế TNCN", s.totalPit], ["Thuế GTGT", s.totalVat]] as const) {
        const { how, amt } = line(prefix);
        expect(amt).toBe(formatVnd(total));
        expect(clauses(how).length).toBeGreaterThan(0);
        expect(formatVnd(sumRounded(how))).toBe(amt);
      }
    });
  }

  it("ca audit: GTGT in từng hợp đồng, không gộp (60.000.001 ≠ 60.000.000)", () => {
    start(book([600_000_010, 600_000_010]));
    const { how } = line("Thuế GTGT");
    expect(clauses(how)).toHaveLength(2);
    expect(how).not.toContain("1.200.000.020 đ ×");
  });

  it("một hợp đồng chịu thuế: .how đúng một cụm, cơ sở = doanh thu (vat.base full)", () => {
    start(book([1_200_000_000]));
    expect(clauses(line("Thuế TNCN").how)).toEqual([{ base: 200_000_000, pct: "5" }]);
    expect(clauses(line("Thuế GTGT").how)).toEqual([{ base: 1_200_000_000, pct: "5" }]);
  });

  it("hợp đồng dưới ngưỡng riêng (cơ sở 0) không thành cụm thừa", () => {
    start(book([1_000_000_000, 100_000_000]));
    expect(clauses(line("Thuế TNCN").how)).toEqual([{ base: 100_000_000, pct: "5" }]);
  });

  it("luật giả vat.base excess: cơ sở GTGT là phần vượt; vat.unconfirmed false thì không chữ chưa xác nhận", () => {
    const fake: TaxRules = { ...rules2026, vat: { ...rules2026.vat, base: "excess", unconfirmed: false } };
    start(book([600_000_010, 600_000_010]), fake);
    const vat = line("Thuế GTGT");
    const s = summarizeYear(book([600_000_010, 600_000_010]), 2026, fake);
    expect(formatVnd(sumRounded(vat.how))).toBe(vat.amt);
    expect(vat.amt).toBe(formatVnd(s.totalVat));
    expect(clauses(vat.how).reduce((a, c) => a + c.base, 0)).toBe(s.totalRevenue - s.totalDeduction);
    expect(vat.how).not.toContain("chưa xác nhận");
    expect(overview().querySelector(".receipt")!.textContent).not.toContain("chưa xác nhận");
  });

  it("luật 2026 (unconfirmed true): có chữ chưa xác nhận ở dòng GTGT, nhãn % theo cấu hình", () => {
    start(book([1_200_000_000]));
    expect(line("Thuế GTGT").how).toContain("cơ sở tính chưa xác nhận");
    expect(line("Thuế TNCN").how).not.toContain("chưa xác nhận");
  });

  it("thuế suất đổi theo luật giả (0,5% GTGT, 8,5% TNCN), gọi lặp lại không rò", () => {
    const fake: TaxRules = { ...rules2026, pit: { rateBps: 850 }, vat: { ...rules2026.vat, rateBps: 50 } };
    start(book([1_200_000_000]), fake);
    expect(line("Thuế GTGT").how).toContain("× 0,5%");
    expect(line("Thuế TNCN").how).toContain("× 8,5%");
    start(book([1_200_000_000]));
    expect(line("Thuế GTGT").how).toContain("× 5%");
    expect(line("Thuế GTGT").how).not.toContain("0,5%");
  });

  it("src/ui/overview.ts không còn tự đọc thuế suất hay cơ sở luật", () => {
    const text = readFileSync(join(__dirname, "../../src/ui/overview.ts"), "utf8");
    for (const bad of ["Bps", 'join("")', "rateOf", "vat.base", "RATE_KEY", "vat.unconfirmed"]) {
      expect(text, bad).not.toContain(bad);
    }
  });
});
