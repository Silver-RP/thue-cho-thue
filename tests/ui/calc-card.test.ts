// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { computeAnnual } from "../../src/tax/annual";
import type { Payment } from "../../src/tax/revenue";
import { mountCalculator } from "../../src/ui/form";
import { formatVnd } from "../../src/ui/money";

let root: HTMLElement;

const input = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const radio = (value: string) => root.querySelector<HTMLInputElement>(`input[name="filing"][value="${value}"]`)!;
const calc = (rent: string, periods = "12") => {
  input("rent").value = rent;
  input("periods").value = periods;
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const monthly = (rent: number, n = 12): Payment[] =>
  Array.from({ length: n }, (_, i) => ({ contractId: "hop-dong", receivedOn: `2026-${String(i + 1).padStart(2, "0")}-01`, amount: rent }));

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.querySelector("#app")!;
  mountCalculator(root, { year: 2026 });
});

describe("tính nhanh một hợp đồng (thẻ)", () => {
  it("mục 1: tiêu đề thẻ, hậu tố đ/kỳ, hai radio once mặc định, đủ label/legend", () => {
    const card = root.querySelector(".card")!;
    expect(card.querySelector("h2")!.textContent).toBe("Tính nhanh một hợp đồng");
    const rentBox = input("rent").parentElement!;
    expect(rentBox.classList.contains("input")).toBe(true);
    expect(input("rent").nextElementSibling!.textContent).toBe("đ");
    expect(input("periods").nextElementSibling!.textContent).toBe("kỳ");
    const radios = root.querySelectorAll('input[name="filing"]');
    expect(radios.length).toBe(2);
    expect(radio("once").checked).toBe(true);
    expect(radio("twice").checked).toBe(false);
    expect(root.querySelector("fieldset.filing legend")!.textContent).toBe("Cách khai");
    for (const r of Array.from(radios)) expect(r.closest("label")?.textContent).toMatch(/Khai [12] lần/);
    for (const i of [input("rent"), input("periods")]) expect(i.labels?.length).toBe(1);
  });

  it("mục 2: twice -> hai hạn như computeAnnual; chọn lại once -> một hạn (gọi lặp không rò)", () => {
    radio("twice").checked = true;
    radio("once").checked = false;
    calc("100.000.000");
    const e = computeAnnual({ year: 2026, payments: monthly(100_000_000), filingMode: "twice", rules: rules2026 });
    const dates = (): string[] =>
      Array.from(root.querySelectorAll("tr"))
        .filter((r) => r.querySelector("th")?.textContent?.startsWith("Hạn"))
        .map((r) => r.querySelector("td")!.textContent!);
    expect(e.deadlines.length).toBe(2);
    expect(dates()).toEqual(["31/07/2026", "31/01/2027"]);
    radio("once").checked = true;
    radio("twice").checked = false;
    calc("100.000.000");
    expect(dates().length).toBe(1);
  });

  it("mục 3: dưới ngưỡng -> .mini 'Chưa phải nộp thuế' có doanh thu và ngưỡng; vượt -> 'Phải nộp khoảng'", () => {
    calc("25.000.000");
    const mini = root.querySelector(".mini")!;
    expect(mini.getAttribute("role")).toBe("status");
    expect(mini.textContent).toContain("Chưa phải nộp thuế");
    expect(mini.textContent).toContain(formatVnd(300_000_000));
    expect(mini.textContent).toContain(formatVnd(rules2026.threshold));
    expect(mini.textContent).not.toContain("Phải nộp khoảng");

    calc("100.000.000");
    const e = computeAnnual({ year: 2026, payments: monthly(100_000_000), filingMode: "once", rules: rules2026 });
    const m2 = root.querySelectorAll(".mini");
    expect(m2.length).toBe(1);
    expect(m2[0].textContent).toContain(`Phải nộp khoảng ${formatVnd(e.totalTax)}`);
    expect(m2[0].textContent).not.toContain("Chưa phải nộp thuế");
  });

  it("mục 4: ô tiền sai hoặc trống -> lỗi tại ô, không có .mini", () => {
    for (const bad of ["abc", ""]) {
      calc(bad);
      expect(root.querySelector(".mini")).toBeNull();
      const err = root.querySelector(`#${input("rent").id}-error`) as HTMLElement;
      expect(err.hidden).toBe(false);
      expect(err.textContent).not.toBe("");
    }
  });
});
