// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportLedger } from "../src/ledger/backup";
import { emptyLedger } from "../src/ledger/model";
import { LEDGER_KEY, type StorageLike } from "../src/ledger/storage";
import { rules2026 } from "../src/rules/2026";
import { startApp } from "../src/start";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  sets = 0;
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.sets++;
    this.data.set(k, v);
  }
}

let storage: FakeStorage;
let events: EventTarget;
let seq: number;
const app = () => document.querySelector<HTMLElement>("#app")!;
const ledger = () => document.querySelector<HTMLElement>("#ledger")!;
const yearSel = () => document.querySelector<HTMLSelectElement>('select[name="tax-year"]')!;
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const field = (scope: Element, name: string) => scope.querySelector(`[name="${name}"]`) as HTMLInputElement;
const fill = (scope: Element, name: string, v: string) => {
  field(scope, name).value = v;
};
const confirmSpy = vi.fn(() => true);
const start = () =>
  startApp(document, {
    today: "2027-03-01",
    storage,
    events,
    newId: () => `id${++seq}`,
    confirm: confirmSpy,
    download: () => {},
    rules: [{ ...rules2026, year: 2027 }],
  });
const chooseYear = (y: string) => {
  yearSel().value = y;
  yearSel().dispatchEvent(new Event("change", { bubbles: true }));
};
const button = (root: Element, label: string) => Array.from(root.querySelectorAll("button")).find((b) => b.textContent === label) ?? null;
const staleCount = () =>
  Array.from(ledger().querySelectorAll('[role="alert"]')).filter((a) => (a.textContent ?? "").includes("Sổ đã được đổi ở tab khác")).length;
const storageEvent = () => {
  const e = new Event("storage") as Event & { key: string; newValue: string | null };
  e.key = LEDGER_KEY;
  e.newValue = "{}";
  events.dispatchEvent(e);
};
const addPropertyAndContract = () => {
  fill(ledger().querySelector(".lg-property-add")!, "name", "Căn A");
  submit(ledger().querySelector(".lg-property-add")!);
  const addC = ledger().querySelector(".lg-contract-add")!;
  fill(addC, "tenant", "T1");
  fill(addC, "signedOn", "2027-01-01");
  fill(addC, "startOn", "2027-01-01");
  submit(addC);
};

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main><section id="ledger"></section>';
  storage = new FakeStorage();
  events = new EventTarget();
  seq = 0;
  confirmSpy.mockClear();
});

describe("H-41: đổi năm giữ chữ gõ dở", () => {
  it("ô amount của form kỳ thu còn nguyên sau 2026 -> 2027 -> 2026", () => {
    start();
    chooseYear("2026");
    addPropertyAndContract();
    fill(ledger().querySelector(".lg-receipt-add")!, "amount", "10.000.000");
    chooseYear("2027");
    chooseYear("2026");
    expect(field(ledger().querySelector(".lg-receipt-add")!, "amount").value).toBe("10.000.000");
    expect(yearSel().value).toBe("2026");
  });

  it("mỗi ô giữ đúng giá trị của nó, ô chọn năm mang năm vừa chọn", () => {
    start();
    chooseYear("2026");
    addPropertyAndContract();
    fill(app(), "rent", "7.000.000");
    fill(ledger().querySelector(".lg-receipt-add")!, "amount", "10.000.000");
    fill(ledger().querySelector(".lg-property-add")!, "name", "Căn B dở");
    for (const y of ["2027", "2026", "2027", "2026"]) chooseYear(y);
    expect(field(app(), "rent").value).toBe("7.000.000");
    expect(field(ledger().querySelector(".lg-receipt-add")!, "amount").value).toBe("10.000.000");
    expect(field(ledger().querySelector(".lg-property-add")!, "name").value).toBe("Căn B dở");
    expect(yearSel().value).toBe("2026");
    chooseYear("2027");
    expect(yearSel().value).toBe("2027");
  });

  it("không có gì thay đổi thì đổi năm không ghi kho", () => {
    start();
    chooseYear("2026");
    chooseYear("2027");
    chooseYear("2026");
    expect(storage.sets).toBe(0);
  });

  it("radio cùng name: mặc định 'once' vẫn chọn sau đổi năm; chọn 'twice' giữ qua hai lần đổi", () => {
    const state = () => Array.from(app().querySelectorAll<HTMLInputElement>('input[name="filing"]')).map((r) => [r.value, r.checked]);
    start();
    chooseYear("2026");
    expect(state()).toEqual([["once", true], ["twice", false]]);
    chooseYear("2027");
    chooseYear("2026");
    expect(state()).toEqual([["once", true], ["twice", false]]);
    const twice = app().querySelector<HTMLInputElement>('input[name="filing"][value="twice"]')!;
    twice.checked = true;
    chooseYear("2027");
    chooseYear("2026");
    expect(state()).toEqual([["once", false], ["twice", true]]);
  });
});

describe("H-41: cờ stale sống qua đổi năm", () => {
  it("vẫn một thông báo, không ghi được, tải lại thì ghi được", () => {
    start();
    storageEvent();
    expect(staleCount()).toBe(1);
    chooseYear("2026");
    chooseYear("2027");
    expect(staleCount()).toBe(1);
    storage.data.set(LEDGER_KEY, "{}");
    const before = storage.sets;
    fill(ledger().querySelector(".lg-property-add")!, "name", "Căn A");
    submit(ledger().querySelector(".lg-property-add")!);
    expect(storage.sets).toBe(before);
    button(ledger(), "Tải lại sổ")!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(staleCount()).toBe(0);
    chooseYear("2026");
    expect(staleCount()).toBe(0);
  });
});

describe("H-41: nhập file đến muộn sau khi đổi năm", () => {
  it("không ghi kho, không confirm, một khối sao lưu, tiêu đề năm mới", async () => {
    start();
    chooseYear("2026");
    addPropertyAndContract();
    const stored = storage.data.get(LEDGER_KEY);
    const incoming = exportLedger(emptyLedger(), "2027-03-01").text;
    let release!: (t: string) => void;
    const pending = new Promise<string>((r) => (release = r));
    const input = ledger().querySelector<HTMLInputElement>('input[name="import"]')!;
    Object.defineProperty(input, "files", { value: [{ text: () => pending } as unknown as File] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    chooseYear("2027");
    const sets = storage.sets;
    release(incoming);
    await new Promise((r) => setTimeout(r, 0));
    expect(storage.data.get(LEDGER_KEY)).toBe(stored);
    expect(storage.sets).toBe(sets);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(ledger().querySelectorAll(".lg-backup")).toHaveLength(1);
    expect(ledger().querySelector(".lg-title")!.textContent).toBe("Sổ doanh thu năm 2027");
  });
});
