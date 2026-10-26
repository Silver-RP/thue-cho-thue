// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
import { rules2026 } from "../../src/rules/2026";
import type { TaxRules } from "../../src/rules";
import { mountCalculator } from "../../src/ui/form";
import { mountLedger } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const confirmedRules: TaxRules = { ...rules2026, vat: { ...rules2026.vat, unconfirmed: false } };

const oneContract = (amounts: number[], year = 2026): Ledger => ({
  ...emptyLedger(),
  properties: [{ id: "P1", name: "Căn A" }],
  contracts: [{ id: "C1", propertyId: "P1", tenant: "An", signedOn: `${year}-01-01`, startOn: `${year}-01-01` }],
  receipts: amounts.map((amount, i) => ({ id: `R${i + 1}`, contractId: "C1", receivedOn: `${year}-0${i + 1}-05`, amount })),
});

let root: HTMLElement;
let storage: FakeStorage;
let downloads: { filename: string; content: string }[];

function mount(ledger: Ledger, year = 2026, rules?: TaxRules): void {
  saveLedger(storage, ledger);
  mountLedger(root, {
    year,
    storage,
    today: "2026-10-26",
    confirm: () => true,
    download: (filename, _mime, content) => void downloads.push({ filename, content }),
    ...(rules ? { rules } : {}),
  });
}

const row = (scope: ParentNode, label: string) =>
  Array.from(scope.querySelectorAll("tr")).find((r) => r.querySelector("th")?.textContent?.startsWith(label));
const totalRow = (scope: ParentNode) => row(scope, "Tổng thuế")!;
const declRow = (scope: ParentNode) => row(scope, "Tổng số thuế phải nộp")!;
const csvTotalLabel = (csv: string) =>
  csv.split(/\r?\n/).map((l) => l.split(",")[1] ?? "").find((c) => c.startsWith("Tổng số thuế phải nộp"));

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.querySelector("#app")!;
  storage = new FakeStorage();
  downloads = [];
});

describe("nhãn ước tính ở dòng tổng (H-14)", () => {
  const calcRevenue = (r: HTMLElement, v: string) => {
    (r.querySelector('[name="rent"]') as HTMLInputElement).value = v;
    (r.querySelector('[name="periods"]') as HTMLInputElement).value = "1";
    r.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  };

  it("1: máy tính 1.200.000.000 → Tổng thuế có 'ước tính'; luật đã xác nhận thì không", () => {
    mountCalculator(root, { year: 2026 });
    calcRevenue(root, "1.200.000.000");
    expect(totalRow(root).textContent).toContain("ước tính");

    document.body.innerHTML = '<main id="app"></main>';
    root = document.querySelector("#app")!;
    mountCalculator(root, { year: 2026, rules: confirmedRules });
    calcRevenue(root, "1.200.000.000");
    expect(totalRow(root).textContent).not.toContain("ước tính");
  });

  it("2: sổ → khối tổng năm Tổng thuế có 'ước tính'; luật đã xác nhận thì không", () => {
    mount(oneContract([1_200_000_000]));
    expect(totalRow(root.querySelector(".lg-total")!).textContent).toContain("ước tính");
    mount(oneContract([1_200_000_000]), 2026, confirmedRules);
    expect(totalRow(root.querySelector(".lg-total")!).textContent).not.toContain("ước tính");
  });

  it("3: bảng tờ khai và CSV có 'ước tính' ở dòng tổng; luật đã xác nhận thì không", () => {
    mount(oneContract([1_200_000_000]));
    const exp = root.querySelector(".lg-export")!;
    expect(declRow(exp).textContent).toContain("ước tính");
    (root.querySelector('button[name="download-csv"]') as HTMLElement).click();
    expect(csvTotalLabel(downloads[0]!.content)).toContain("ước tính");

    downloads = [];
    mount(oneContract([1_200_000_000]), 2026, confirmedRules);
    expect(declRow(root.querySelector(".lg-export")!).textContent).not.toContain("ước tính");
    (root.querySelector('button[name="download-csv"]') as HTMLElement).click();
    expect(csvTotalLabel(downloads[0]!.content)).toBe("Tổng số thuế phải nộp");
  });
});

describe("lỗi tổng năm nói đúng nguyên nhân (H-09)", () => {
  const alerts = () => Array.from(root.querySelectorAll('[role="alert"]')).map((a) => a.textContent ?? "").join("\n");

  it("5: hai kỳ thu 9.000.000.000.000.000 đ → báo về số tiền, không nhắc quy định hay chuỗi kỹ thuật", () => {
    mount(oneContract([9_000_000_000_000_000, 9_000_000_000_000_000]));
    const all = root.textContent ?? "";
    expect(all).toContain("số tiền");
    expect(all).not.toContain("quy định");
    expect(all).not.toContain("phải là số nguyên");
    expect(alerts()).not.toContain("quy định");
  });

  it("6: năm 2027 chưa có luật → vẫn 'Chưa có quy định thuế cho năm 2027', cả sổ và xuất", () => {
    mount(oneContract([100_000_000], 2027), 2027);
    expect(root.textContent).toContain("Chưa có quy định thuế cho năm 2027");
    expect(root.querySelector(".lg-export")?.textContent).toContain("Chưa có quy định thuế cho năm 2027");
  });

  it("6b: luật đúng năm nhưng engine ném lỗi khác (luật giả) → báo số tiền, không báo thiếu quy định", () => {
    const broken = { ...rules2026, pit: { get rateBps(): number { throw new Error("lỗi lạ trong engine"); } } } as unknown as TaxRules;
    mount(oneContract([1_200_000_000]), 2026, broken);
    expect(root.textContent).not.toContain("Chưa có quy định");
    expect(root.textContent).not.toContain("lỗi lạ trong engine");
    expect(root.textContent).toContain("số tiền");
  });
});
