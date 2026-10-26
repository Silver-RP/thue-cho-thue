// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { computeAnnual } from "../../src/tax/annual";
import type { Payment } from "../../src/tax/revenue";
import { mountCalculator } from "../../src/ui/form";
import { formatVnd } from "../../src/ui/money";

let root: HTMLElement;

const input = (name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
const type = (name: string, v: string) => {
  input(name).value = v;
};
const calc = () => {
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const cell = (label: string): string => {
  const row = Array.from(root.querySelectorAll("tr")).find((r) => r.querySelector("th")?.textContent === label);
  expect(row, label).toBeDefined();
  // Bỏ nhãn "(ước tính)" để so số thuần.
  return row!.querySelector("td")!.firstChild!.textContent!.trim();
};
const results = () => root.querySelector(".results")!.textContent ?? "";
const enablePrepaid = () => {
  const t = input("prepaidOn") as HTMLInputElement;
  t.checked = true;
  t.dispatchEvent(new Event("change"));
};

const monthly = (rent: number): Payment[] =>
  Array.from({ length: 12 }, (_, i) => ({
    contractId: "hop-dong",
    receivedOn: `2026-${String(i + 1).padStart(2, "0")}-01`,
    amount: rent,
  }));

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.querySelector("#app")!;
  mountCalculator(root, { year: 2026 });
});

describe("đối chiếu UI với engine qua ô nhập thật", () => {
  it("mục 1 ca A: 100.000.000 × 12 khai 1 lần -> TNCN 10.000.000 đ, GTGT 60.000.000 đ, tổng 70.000.000 đ", () => {
    type("rent", "100.000.000");
    type("periods", "12");
    calc();
    const e = computeAnnual({ year: 2026, payments: monthly(100_000_000), filingMode: "once", rules: rules2026 });
    expect(cell("Thuế TNCN")).toBe("10.000.000 đ");
    expect(cell("Thuế GTGT")).toBe("60.000.000 đ");
    expect(cell("Tổng thuế")).toBe("70.000.000 đ");
    expect(cell("Thuế TNCN")).toBe(formatVnd(e.totalPit));
    expect(cell("Thuế GTGT")).toBe(formatVnd(e.totalVat));
    expect(cell("Tổng thuế")).toBe(formatVnd(e.totalTax));
  });

  it("mục 1 ca B: 50.000.000 × 12 = 600.000.000 dưới ngưỡng -> thuế 0 đ, chỉ thông báo doanh thu", () => {
    type("rent", "50.000.000");
    type("periods", "12");
    calc();
    const e = computeAnnual({ year: 2026, payments: monthly(50_000_000), filingMode: "once", rules: rules2026 });
    expect(cell("Doanh thu cho thuê")).toBe("600.000.000 đ");
    expect(cell("Thuế TNCN")).toBe("0 đ");
    expect(cell("Thuế GTGT")).toBe("0 đ");
    expect(cell("Tổng thuế")).toBe("0 đ");
    expect(cell("Trạng thái")).toBe("Chỉ thông báo doanh thu");
    expect(cell("Thuế TNCN")).toBe(formatVnd(e.totalPit));
    expect(cell("Thuế GTGT")).toBe(formatVnd(e.totalVat));
    expect(cell("Tổng thuế")).toBe(formatVnd(e.totalTax));
  });

  it("mục 1 ca C: trả trước 1.200.000.000 hai năm allocate -> doanh thu 600.000.000 đ, thuế 0 đ, khớp engine", () => {
    type("rent", "0");
    type("periods", "0");
    enablePrepaid();
    type("prepaidAmount", "1.200.000.000");
    type("prepaidYears", "2");
    type("prepaidMode", "allocate");
    type("prepaidDate", "2026-01-10");
    calc();
    const e = computeAnnual({
      year: 2026,
      payments: [
        { contractId: "hop-dong", receivedOn: "2026-01-10", amount: 1_200_000_000, prepaid: { years: 2, mode: "allocate" } },
      ],
      filingMode: "once",
      rules: rules2026,
    });
    expect(cell("Doanh thu cho thuê")).toBe("600.000.000 đ");
    expect(cell("Thuế TNCN")).toBe("0 đ");
    expect(cell("Thuế GTGT")).toBe("0 đ");
    expect(cell("Tổng thuế")).toBe("0 đ");
    expect(cell("Doanh thu cho thuê")).toBe(formatVnd(e.totalRevenue));
    expect(cell("Thuế TNCN")).toBe(formatVnd(e.totalPit));
    expect(cell("Thuế GTGT")).toBe(formatVnd(e.totalVat));
    expect(cell("Tổng thuế")).toBe(formatVnd(e.totalTax));
  });

  it("mục 1 ca D (khác phân bổ): cùng khoản 1,2 tỷ tính một lần -> TNCN 10.000.000 đ, khớp engine", () => {
    type("rent", "0");
    type("periods", "0");
    enablePrepaid();
    type("prepaidAmount", "1.200.000.000");
    type("prepaidYears", "2");
    type("prepaidMode", "lump");
    type("prepaidDate", "2026-01-10");
    calc();
    const e = computeAnnual({
      year: 2026,
      payments: [
        { contractId: "hop-dong", receivedOn: "2026-01-10", amount: 1_200_000_000, prepaid: { years: 2, mode: "lump" } },
      ],
      filingMode: "once",
      rules: rules2026,
    });
    expect(cell("Thuế TNCN")).toBe("10.000.000 đ");
    expect(cell("Thuế TNCN")).toBe(formatVnd(e.totalPit));
    expect(cell("Tổng thuế")).toBe(formatVnd(e.totalTax));
  });

  it("mục 2 (L3): gõ '100.000.000' có dấu chấm, số kỳ 12 -> TNCN 10.000.000 đ, không phải chỉ thông báo", () => {
    type("rent", "100.000.000");
    type("periods", "12");
    calc();
    expect(cell("Thuế TNCN")).toBe("10.000.000 đ");
    expect(cell("Trạng thái")).toBe("Phải nộp thuế");
    expect(results()).not.toContain("Chỉ thông báo doanh thu");
  });

  it("mục 3: khai 2 lần ca 100.000.000 × 12 -> hai hạn 31/07/2026 rồi 31/01/2027 theo thứ tự", () => {
    type("rent", "100.000.000");
    type("periods", "12");
    (root.querySelector('input[name="filing"][value="twice"]') as HTMLInputElement).checked = true;
    calc();
    const text = results();
    const a = text.indexOf("31/07/2026");
    const b = text.indexOf("31/01/2027");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
    const deadlineRows = Array.from(root.querySelectorAll("tr")).filter((r) => r.querySelector("th")?.textContent?.startsWith("Hạn"));
    expect(deadlineRows.map((r) => r.querySelector("td")!.textContent)).toEqual(["31/07/2026", "31/01/2027"]);
  });

  it("mục 4: tính ca 1 rồi sửa ô thành 'abc' và tính lại -> số cũ biến mất, có lỗi; sửa lại thì tính tiếp", () => {
    type("rent", "100.000.000");
    calc();
    expect(results()).toContain("10.000.000 đ");
    type("rent", "abc");
    calc();
    expect(results()).not.toContain("10.000.000");
    expect(results()).not.toContain("70.000.000");
    expect(results()).toBe("");
    const err = root.querySelector(`#${input("rent").id}-error`) as HTMLElement;
    expect(err.textContent).not.toBe("");
    expect(err.hidden).toBe(false);
    type("rent", "50.000.000");
    calc();
    expect(cell("Doanh thu cho thuê")).toBe("600.000.000 đ");
    expect((root.querySelector(`#${input("rent").id}-error`) as HTMLElement).hidden).toBe(true);
  });
});
