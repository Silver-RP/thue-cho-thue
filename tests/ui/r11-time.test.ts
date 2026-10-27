// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { LEDGER_KEY, saveLedger, type StorageLike } from "../../src/ledger/storage";
import { startApp } from "../../src/start";

// R11 dev-03: S20 (quá hạn), S16 (năm chưa có luật vẫn thấy phần phân bổ), S22 (kỳ thu trước năm đầu có luật).

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
const due = () => document.querySelector<HTMLElement>("#deadlines")!;
const overview = () => document.querySelector<HTMLElement>("#overview")!;
const summary = () => document.querySelector<HTMLElement>(".lg-summary")!;
const yearSel = () => document.querySelector<HTMLSelectElement>("#tax-year")!;
const choose = (y: string) => {
  yearSel().value = y;
  yearSel().dispatchEvent(new Event("change", { bubbles: true }));
};

function book(receipts: { on: string; amount: number; prepaid?: { years: number; mode: "allocate" | "lump" } }[], filing?: "once" | "twice"): Ledger {
  const l = emptyLedger();
  l.properties.push({ id: "P", name: "Căn A" });
  l.contracts.push({ id: "C", propertyId: "P", tenant: "Bình", signedOn: "2025-01-01", startOn: "2025-01-01" });
  receipts.forEach((r, i) =>
    l.receipts.push({ id: `R${i}`, contractId: "C", receivedOn: r.on, amount: r.amount, ...(r.prepaid ? { prepaid: r.prepaid } : {}) }),
  );
  if (filing) l.filingMode = { "2026": filing };
  return l;
}
const monthly2026 = (amount: number) =>
  Array.from({ length: 12 }, (_, i) => ({ on: `2026-${String(i + 1).padStart(2, "0")}-05`, amount }));

function run(l: Ledger, today: string) {
  saveLedger(storage, l);
  startApp(document, { today, storage, download: () => {} });
}

beforeEach(() => {
  document.body.innerHTML = '<div id="overview"></div><div id="deadlines"></div><main id="app"></main><section id="ledger"></section>';
  storage = new FakeStorage();
});

describe("S20: quá hạn", () => {
  it("2027-03-15, phải nộp: Quá hạn 43 ngày, một câu việc cần làm, không số tiền phạt, không 'Còn'", () => {
    run(book(monthly2026(100_000_000)), "2027-03-15");
    choose("2026");
    expect(due().textContent).toContain("Quá hạn 43 ngày");
    expect(due().querySelectorAll(".due-todo")).toHaveLength(1);
    expect(due().textContent).not.toContain("903.000");
    expect(due().textContent).not.toMatch(/tiền phạt\s*[:\d]/i);
    expect(overview().textContent).not.toContain("903.000");
    expect(due().textContent).not.toContain("Còn ");
  });

  it("ngày sau hạn một ngày: Quá hạn 1 ngày; đúng hạn thì chưa quá hạn", () => {
    run(book(monthly2026(100_000_000)), "2027-02-01");
    choose("2026");
    expect(due().textContent).toContain("Quá hạn 1 ngày");
    run(book(monthly2026(100_000_000)), "2027-01-31");
    expect(due().textContent).toContain("Hôm nay là hạn");
    expect(due().textContent).not.toContain("Quá hạn");
    expect(due().querySelector(".due-todo")).toBeNull();
  });

  it("khai 2 lần: N tính từ hạn khai cả năm (31/01/2027), không phải hạn kỳ 1", () => {
    run(book(monthly2026(100_000_000), "twice"), "2027-03-15");
    choose("2026");
    expect(due().textContent).toContain("Quá hạn 43 ngày");
  });

  it("chỉ thông báo doanh thu (không phải nộp): không có 'Quá hạn' và việc cần làm", () => {
    run(book(monthly2026(8_000_000)), "2027-03-15");
    choose("2026");
    expect(due().textContent).not.toContain("Quá hạn");
    expect(due().querySelector(".due-todo")).toBeNull();
    expect(due().textContent).toContain("đã qua");
  });

  it("gọi lặp (đổi năm qua lại): vẫn đúng một câu việc cần làm", () => {
    run(book(monthly2026(100_000_000)), "2027-03-15");
    choose("2027");
    choose("2026");
    choose("2027");
    choose("2026");
    expect(due().querySelectorAll(".due-todo")).toHaveLength(1);
  });
});

describe("S16: trả trước phân bổ qua năm chưa có luật", () => {
  const prepaid = [{ on: "2026-06-15", amount: 1_000_000_000, prepaid: { years: 3, mode: "allocate" as const } }];

  it("ô chọn năm có 2027 và 2028 (chưa có quy định), không nhân đôi khi vẽ lại", () => {
    run(book(prepaid), "2026-06-20");
    const values = () => Array.from(yearSel().options).map((o) => o.value);
    expect(values()).toEqual(["2026", "2027", "2028"]);
    choose("2027");
    choose("2026");
    expect(values()).toEqual(["2026", "2027", "2028"]);
    expect(yearSel().options[1].textContent).toContain("chưa có quy định");
  });

  it("2026 là 333.333.334 đ, năm 2027 nói chưa có quy định và hiện 333.333.333 đ, không có số thuế", () => {
    run(book(prepaid), "2026-06-20");
    expect(summary().textContent).toContain("333.333.334 đ");
    expect(summary().textContent).not.toContain("333.333.333 đ");
    choose("2027");
    expect(overview().textContent).toContain("Chưa có quy định thuế cho năm 2027");
    expect(overview().textContent).toContain("333.333.333 đ");
    expect(overview().textContent).not.toContain("333.333.334 đ");
    expect(overview().textContent).not.toContain("Phải nộp khoảng");
  });

  it("năm chưa có luật mà sổ không có doanh thu năm đó: không có dòng phân bổ", () => {
    run(book(monthly2026(8_000_000)), "2027-02-01");
    expect(yearSel().value).toBe("2027");
    expect(overview().querySelector(".allocated")).toBeNull();
  });

  it("sổ trống: ô chọn năm không có thêm năm nào", () => {
    run(emptyLedger(), "2026-06-20");
    expect(Array.from(yearSel().options).map((o) => o.value)).toEqual(["2026"]);
  });
});

describe("S22: kỳ thu trước năm đầu có luật", () => {
  it("tổng 2026 chỉ cộng kỳ 2026; có câu 'chỉ tính từ năm 2026'; 2025 chọn được nhưng không áp luật 2026", () => {
    run(book([{ on: "2025-12-05", amount: 300_000_000 }, ...monthly2026(10_000_000).slice(0, 6)]), "2026-11-01");
    expect(summary().textContent).toContain("60.000.000 đ");
    expect(summary().textContent).not.toContain("360.000.000 đ");
    expect(summary().querySelector(".since-note")!.textContent).toContain("chỉ tính từ năm 2026");
    choose("2025");
    expect(overview().textContent).toContain("Chưa có quy định thuế cho năm 2025");
    expect(overview().textContent).toContain("300.000.000 đ");
    expect(overview().textContent).not.toContain("Phải nộp khoảng");
  });

  it("không có kỳ thu cũ thì không có câu ghi chú", () => {
    run(book(monthly2026(10_000_000)), "2026-11-01");
    expect(summary().querySelector(".since-note")).toBeNull();
  });
});
