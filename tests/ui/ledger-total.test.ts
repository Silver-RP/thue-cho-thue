// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import type { StorageLike } from "../../src/ledger/storage";
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

let root: HTMLElement;
let storage: FakeStorage;
let seq: number;

const mount = (today = "2026-10-26") =>
  mountLedger(root, { year: 2026, storage, newId: () => `id${++seq}`, today, confirm: () => true });
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
function setup(): void {
  const pf = root.querySelector(".lg-property-add")!;
  fill(pf, "name", "A");
  submit(pf);
  const cf = root.querySelector("section.lg-property .lg-contract-add")!;
  fill(cf, "tenant", "T");
  fill(cf, "signedOn", "2025-11-01");
  fill(cf, "startOn", "2025-11-01");
  submit(cf);
}
function addReceipt(date: string, amount: string, prepaid?: { years: number; mode: string }): void {
  const f = root.querySelector("section.lg-contract .lg-receipt-add")!;
  fill(f, "receivedOn", date);
  fill(f, "amount", amount);
  if (prepaid) {
    (f.querySelector('[name="prepaidOn"]') as HTMLInputElement).checked = true;
    fill(f, "years", String(prepaid.years));
    fill(f, "mode", prepaid.mode);
  }
  submit(f);
}
const totalText = () => root.querySelector(".lg-total")?.textContent ?? "";
const summaryText = () => root.querySelector(".lg-summary")!.textContent!;
const exportText = () => root.querySelector(".lg-export")!.textContent!;
const rowOf = (date: string) =>
  Array.from(root.querySelectorAll(".lg-total tr")).find((r) => r.querySelector("td")?.textContent?.startsWith(date))!;

beforeEach(() => {
  document.body.innerHTML = '<div id="ledger"></div>';
  root = document.querySelector("#ledger")!;
  storage = new FakeStorage();
  seq = 0;
});

describe("tổng năm: năm không doanh thu không hiện hạn (H-27)", () => {
  it("sổ trống: không hàng hạn, không 31/01/2027, có 'Chưa có kỳ thu năm 2026'", () => {
    mount();
    expect(totalText()).not.toContain("Hạn thông báo doanh thu");
    expect(totalText()).not.toContain("Hạn khai và nộp thuế");
    expect(root.textContent).not.toContain("31/01/2027");
    expect(summaryText()).toContain("Chưa có kỳ thu năm 2026");
  });

  it("sổ chỉ có kỳ thu 2025-03-01: cùng kết quả, khối xuất cũng nói chưa có kỳ thu", () => {
    mount();
    setup();
    addReceipt("2025-03-01", "10.000.000");
    expect(totalText()).not.toContain("Hạn thông báo doanh thu");
    expect(totalText()).not.toContain("Hạn khai và nộp thuế");
    expect(root.textContent).not.toContain("31/01/2027");
    expect(summaryText()).toContain("Chưa có kỳ thu năm 2026");
    expect(exportText()).toContain("Chưa có kỳ thu năm 2026");
  });

  it("có kỳ thu 2026 phải nộp thuế, khai 2 lần: nhãn đã qua theo today", () => {
    mount("2026-10-26");
    setup();
    addReceipt("2026-03-01", "1.200.000.000");
    const radio = root.querySelector('input[name="filingMode"][value="twice"]') as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    expect(rowOf("31/07/2026").textContent).toContain("đã qua");
    expect(rowOf("31/01/2027").textContent).not.toContain("đã qua");
    expect(summaryText()).not.toContain("Chưa có kỳ thu");
  });

  it("today 2026-07-31: hạn đúng hôm nay chưa qua", () => {
    mount("2026-07-31");
    setup();
    addReceipt("2026-03-01", "1.200.000.000");
    const radio = root.querySelector('input[name="filingMode"][value="twice"]') as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    expect(rowOf("31/07/2026")).toBeDefined();
    expect(totalText()).not.toContain("đã qua");
  });

  it("trả trước 2 năm allocate nhận 2025-12-01: năm 2026 vẫn có hàng hạn", () => {
    mount();
    setup();
    addReceipt("2025-12-01", "240.000.000", { years: 2, mode: "allocate" });
    expect(totalText()).toContain("Hạn");
    expect(summaryText()).not.toContain("Chưa có kỳ thu");
    expect(root.querySelector(".lg-total")).not.toBeNull();
  });
});
