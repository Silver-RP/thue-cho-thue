// @vitest-environment happy-dom
// Vòng làm đẹp v1 (docs/screens/v0/score.md): sổ gọn, hạn trong khối tổng quan, tiêu đề theo năm, ô tiền có dấu chấm.
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
import { startApp } from "../../src/start";

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
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const blur = (i: HTMLInputElement) => i.dispatchEvent(new Event("blur"));

function book(monthlyAmount: number, months = 12): Ledger {
  const l = emptyLedger();
  l.properties.push({ id: "P1", name: "Căn hộ Sông Hồng" });
  l.contracts.push({ id: "C1", propertyId: "P1", tenant: "Anh Minh", signedOn: "2026-01-01", startOn: "2026-01-01" });
  for (let m = 1; m <= months; m++) {
    l.receipts.push({ id: `R${m}`, contractId: "C1", receivedOn: `2026-${String(m).padStart(2, "0")}-05`, amount: monthlyAmount });
  }
  return l;
}

function start(today: string, ledger: Ledger | null): void {
  if (ledger) saveLedger(storage, ledger);
  startApp(document, { today, storage, events: new EventTarget(), newId: () => "x" + Math.random(), confirm: () => true, download: () => {} });
}

beforeEach(() => {
  document.body.innerHTML =
    '<header class="topbar"><span data-year-slot></span></header>' +
    '<header class="site-intro"><h1>Thuế cho thuê nhà: máy tính và sổ doanh thu <span data-view-year>2026</span></h1></header>' +
    '<section id="overview"></section><section id="ledger"></section><aside><section id="deadlines"></section><section id="app"></section></aside>';
  storage = new FakeStorage();
});

describe("khối tổng quan nêu hạn", () => {
  it("phải nộp: có ngày hạn và số ngày còn lại", () => {
    start("2027-01-10", book(100_000_000));
    const due = $("#overview .hero-due");
    expect(due.textContent).toContain("31/01/2027");
    expect(due.textContent).toContain("còn 21 ngày");
  });

  it("chưa vượt ngưỡng: hạn thông báo doanh thu", () => {
    start("2027-01-10", book(8_000_000));
    const due = $("#overview .hero-due");
    expect(due.textContent).toContain("Thông báo doanh thu");
    expect(due.textContent).toContain("31/01/2027");
  });

  it("đúng ngày hạn nói hôm nay", () => {
    start("2027-01-31", book(100_000_000));
    expect($("#overview .hero-due").textContent).toContain("hôm nay");
  });

  it("đã qua hạn cuối: nói quá hạn bao nhiêu ngày", () => {
    start("2027-02-05", book(100_000_000));
    const sel = $<HTMLSelectElement>("#tax-year");
    sel.value = "2026";
    sel.dispatchEvent(new Event("change"));
    expect($("#overview .hero-due").textContent).toContain("quá hạn 5 ngày");
  });
});

describe("tiêu đề trang theo năm đang xem", () => {
  it("đổi ô chọn năm thì tiêu đề đổi theo", () => {
    start("2027-02-01", book(100_000_000));
    const sel = $<HTMLSelectElement>("#tax-year");
    expect($("[data-view-year]").textContent).toBe(sel.value);
    sel.value = "2026";
    sel.dispatchEvent(new Event("change"));
    expect($("[data-view-year]").textContent).toBe("2026");
  });
});

describe("sổ gọn: kỳ thu đã lưu là một dòng", () => {
  it("mỗi kỳ thu đã lưu nằm trong details đóng, dòng tóm tắt có ngày và số tiền", () => {
    start("2027-01-10", book(25_000_000, 3));
    const rows = Array.from(document.querySelectorAll<HTMLDetailsElement>("#ledger details.lg-receipt"));
    expect(rows).toHaveLength(3);
    for (const d of rows) expect(d.open).toBe(false);
    const sum = rows[0]!.querySelector("summary")!.textContent!;
    expect(sum).toContain("05/01/2026");
    expect(sum).toContain("25.000.000 đ");
    expect(rows[0]!.querySelector("form.lg-receipt-form")).not.toBeNull();
  });

  it("sửa căn và sửa hợp đồng cũng gập lại", () => {
    start("2027-01-10", book(25_000_000, 1));
    expect($<HTMLDetailsElement>("#ledger details.lg-edit-property").open).toBe(false);
    expect($("#ledger details.lg-edit-property form.lg-property-form")).not.toBeNull();
    expect($<HTMLDetailsElement>("#ledger details.lg-edit-contract").open).toBe(false);
    expect($("#ledger details.lg-edit-contract form.lg-contract-form")).not.toBeNull();
  });

  it("thêm căn khác và thêm hợp đồng khác gập lại khi đã có; sổ trống thì để mở", () => {
    start("2027-01-10", book(25_000_000, 1));
    const addP = $("#ledger form.lg-property-add").closest("details")!;
    const addC = $("#ledger form.lg-contract-add").closest("details")!;
    expect(addP.open).toBe(false);
    expect(addC.open).toBe(false);
    document.body.innerHTML = '<section id="overview"></section><section id="ledger"></section>';
    storage = new FakeStorage();
    start("2027-01-10", null);
    expect($("#ledger form.lg-property-add").closest("details")).toBeNull();
  });

  it("ô đang sửa dở được giữ khi đổi năm thì dòng đó mở sẵn", () => {
    start("2027-01-10", book(25_000_000, 2));
    const row = $<HTMLDetailsElement>("#ledger details.lg-receipt");
    row.open = true;
    const amount = row.querySelector<HTMLInputElement>("[name=amount]")!;
    amount.value = "26.000.000";
    const sel = $<HTMLSelectElement>("#tax-year");
    sel.value = sel.value === "2026" ? "2027" : "2026";
    sel.dispatchEvent(new Event("change"));
    sel.value = "2026";
    sel.dispatchEvent(new Event("change"));
    const again = $<HTMLDetailsElement>("#ledger details.lg-receipt");
    expect(again.querySelector<HTMLInputElement>("[name=amount]")!.value).toBe("26.000.000");
    expect(again.open).toBe(true);
  });
});

describe("ô tiền có dấu chấm khi rời ô", () => {
  it("ô thêm kỳ thu", () => {
    start("2027-01-10", book(25_000_000, 1));
    const i = $<HTMLInputElement>("#ledger form.lg-receipt-add [name=amount]");
    i.value = "25000000";
    blur(i);
    expect(i.value).toBe("25.000.000");
  });

  it("ô tính nhanh; chữ sai thì để nguyên", () => {
    start("2027-01-10", null);
    const i = $<HTMLInputElement>("#app [name=rent]");
    i.value = "25000000";
    blur(i);
    expect(i.value).toBe("25.000.000");
    i.value = "25tr";
    blur(i);
    expect(i.value).toBe("25tr");
  });
});
