// @vitest-environment happy-dom
// Vòng v4: mỗi mục một màn hình, Sổ dạng danh sách rồi chi tiết, tờ khai nằm ở màn hình Hạn.
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const body = ((html.match(/<body[^>]*>([\s\S]*)<\/body>/) ?? [])[1] ?? "").replace(/<script[\s\S]*?<\/script>/g, "");

let storage: FakeStorage;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function book(): Ledger {
  const l = emptyLedger();
  for (const n of ["1", "2"]) {
    l.properties.push({ id: `P${n}`, name: `Căn ${n}` });
    l.contracts.push({ id: `C${n}`, propertyId: `P${n}`, tenant: `Người ${n}`, signedOn: "2026-01-01", startOn: "2026-01-01" });
    l.receipts.push({ id: `R${n}`, contractId: `C${n}`, receivedOn: "2026-02-05", amount: 1_200_000_000 });
  }
  return l;
}

function start(ledger: Ledger | null): void {
  if (ledger) saveLedger(storage, ledger);
  startApp(document, { today: "2027-01-10", storage, events: new EventTarget(), newId: () => `x${Math.random()}`, confirm: () => true, download: () => {} });
}

const property = (id: string) => $(`.lg-property[data-property="${id}"]`);

beforeEach(() => {
  document.body.innerHTML = body;
  window.location.hash = "";
  storage = new FakeStorage();
});

describe("màn hình theo mục", () => {
  it("mặc định Tổng quan; đổi hash thì đổi data-view", () => {
    start(null);
    expect(document.body.getAttribute("data-view")).toBe("overview");
    window.location.hash = "#deadlines";
    window.dispatchEvent(new Event("hashchange"));
    expect(document.body.getAttribute("data-view")).toBe("deadlines");
  });

  it("hash lạ (#info trong phần giải đáp) về Tổng quan", () => {
    start(null);
    window.location.hash = "#info";
    window.dispatchEvent(new Event("hashchange"));
    expect(document.body.getAttribute("data-view")).toBe("overview");
  });

  it("tờ khai nằm ở màn hình Hạn, không nằm trong sổ", () => {
    start(book());
    expect($("#export-slot .lg-export")).not.toBeNull();
    expect($("#ledger .lg-export")).toBeNull();
  });
});

describe("Sổ: danh sách rồi chi tiết", () => {
  it("mở đầu là danh sách, mọi căn gập, không căn nào chiếm trang", () => {
    start(book());
    expect(document.querySelectorAll(".lg-row")).toHaveLength(2);
    expect(property("P1").hidden).toBe(true);
    expect(property("P2").hidden).toBe(true);
    expect($(".lg-row").textContent).toContain("1.200.000.000 đ");
  });

  it("bấm căn thì chỉ căn đó hiện, nút quay lại về danh sách", () => {
    start(book());
    $(".lg-row[data-open-property='P2']").click();
    expect(property("P2").hidden).toBe(false);
    expect(property("P1").hidden).toBe(true);
    expect($<HTMLElement>(".lg-list").hidden).toBe(true);
    expect($<HTMLElement>(".lg-summary").hidden).toBe(true);
    property("P2").querySelector<HTMLButtonElement>(".lg-back")!.click();
    expect(property("P2").hidden).toBe(true);
    expect($<HTMLElement>(".lg-summary").hidden).toBe(false);
  });

  it("đổi năm vẫn giữ căn đang mở", () => {
    start(book());
    $(".lg-row[data-open-property='P2']").click();
    const sel = $<HTMLSelectElement>("#tax-year");
    sel.value = sel.options[sel.options.length - 1]!.value;
    sel.dispatchEvent(new Event("change"));
    expect(property("P2").hidden).toBe(false);
  });

  it("căn bị xoá ở bản lưu thì về danh sách, không trang trống", () => {
    start(book());
    $(".lg-row[data-open-property='P2']").click();
    property("P2").querySelector<HTMLButtonElement>(".lg-property-form .danger")!.click();
    expect($<HTMLElement>(".lg-list").hidden).toBe(false);
    expect(document.querySelectorAll(".lg-row")).toHaveLength(1);
  });

  it("thêm căn đầu tiên thì mở luôn căn đó để nhập hợp đồng", () => {
    start(null);
    const form = $("form.lg-property-add");
    form.querySelector<HTMLInputElement>("[name=name]")!.value = "Căn mới";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect($(".lg-property").hidden).toBe(false);
    expect($(".lg-property form.lg-contract-add")).not.toBeNull();
  });
});

describe("sổ trống", () => {
  it("một việc cần làm, nêu ngưỡng, ẩn bảng tổng toàn số 0, vẫn nhập được bản sao lưu", () => {
    start(null);
    const empty = $(".lg-empty");
    expect(empty.textContent).toContain("Chưa có căn nào");
    expect(empty.textContent).toContain("1.000.000.000 đ");
    expect($<HTMLElement>(".lg-summary").hidden).toBe(true);
    expect($<HTMLElement>(".lg-backup").hidden).toBe(false);
  });
});

describe("tổng quan: các căn chỉ có doanh thu", () => {
  it("không chia thuế theo căn", () => {
    start(book());
    const homes = $(".homes").textContent!;
    expect(homes).toContain("Căn 1");
    expect(homes).toContain("1.200.000.000 đ");
    expect(homes).not.toContain("Thuế");
  });
});
