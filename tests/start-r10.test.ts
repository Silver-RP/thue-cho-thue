// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
let seq: number;
let now: string;
const app = () => document.querySelector<HTMLElement>("#app")!;
const ledger = () => document.querySelector<HTMLElement>("#ledger")!;
const yearSel = () => document.querySelector<HTMLSelectElement>('select[name="tax-year"]')!;
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const field = (scope: Element, name: string) => scope.querySelector(`[name="${name}"]`) as HTMLInputElement;
const fill = (scope: Element, name: string, v: string) => {
  field(scope, name).value = v;
};
const tick = (el: HTMLInputElement) => {
  el.checked = true;
  el.dispatchEvent(new Event("change", { bubbles: true }));
};
const chooseYear = (y: string) => {
  yearSel().value = y;
  yearSel().dispatchEvent(new Event("change", { bubbles: true }));
};
const setVisibility = (v: string) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
const fire = () => document.dispatchEvent(new Event("visibilitychange"));
const start = () =>
  startApp(document, {
    today: now,
    storage,
    newId: () => `id${++seq}`,
    confirm: () => true,
    download: () => {},
    clock: () => now,
    rules: [{ ...rules2026, year: 2027 }],
  });
const staleCount = () =>
  Array.from(ledger().querySelectorAll('[role="alert"]')).filter((a) => (a.textContent ?? "").includes("Sổ đã được đổi ở tab khác")).length;
const shownErrors = () => Array.from(document.querySelectorAll<HTMLElement>(".form-error")).filter((e) => !e.hidden && (e.textContent ?? "") !== "");
const addPropertyAndContract = () => {
  fill(ledger().querySelector(".lg-property-add")!, "name", "Căn A");
  submit(ledger().querySelector(".lg-property-add")!);
  const addC = ledger().querySelector(".lg-contract-add")!;
  fill(addC, "tenant", "T1");
  fill(addC, "signedOn", "2026-01-01");
  fill(addC, "startOn", "2026-01-01");
  submit(addC);
};

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main><section id="ledger"></section>';
  storage = new FakeStorage();
  seq = 0;
  now = "2027-03-01";
  setVisibility("visible");
});
afterEach(() => {
  delete (document as unknown as Record<string, unknown>).visibilityState;
});

describe("R10 dev-01: gắn lại không ngõ cụt (H-50)", () => {
  it("máy tính: tick trả trước, đổi năm đi về -> ô con hiện và bấm Tính thuế ra TNCN", () => {
    start();
    chooseYear("2026");
    tick(field(app(), "prepaidOn"));
    chooseYear("2027");
    chooseYear("2026");
    expect(field(app(), "prepaidOn").checked).toBe(true);
    expect(app().querySelector<HTMLElement>("fieldset.prepaid")!.hidden).toBe(false);
    fill(app(), "rent", "10.000.000");
    fill(app(), "prepaidAmount", "120.000.000");
    submit(app().querySelector("form")!);
    const res = app().querySelector(".results")!;
    expect(res.textContent).not.toBe("");
    expect(res.textContent).toContain("Thuế TNCN");
  });

  it("sổ: kỳ thu trả trước, đổi năm hai lần -> ô years/mode hiện và nộp lưu years 3, lump", () => {
    start();
    chooseYear("2026");
    addPropertyAndContract();
    const add = () => ledger().querySelector(".lg-receipt-add")!;
    tick(field(add(), "prepaidOn"));
    fill(add(), "years", "3");
    field(add(), "mode").value = "lump";
    chooseYear("2027");
    chooseYear("2026");
    expect(field(add(), "years").closest<HTMLElement>(".field")!.hidden).toBe(false);
    expect(field(add(), "mode").closest<HTMLElement>(".field")!.hidden).toBe(false);
    expect(field(add(), "years").value).toBe("3");
    expect(field(add(), "mode").value).toBe("lump");
    fill(add(), "receivedOn", "2026-02-01");
    fill(add(), "amount", "30.000.000");
    submit(add());
    const saved = JSON.parse(storage.data.get(LEDGER_KEY)!);
    expect(saved.receipts.at(-1).prepaid).toEqual({ years: 3, mode: "lump" });
  });

  it("đổi năm không sửa gì, hoặc chỉ tick trả trước: không setItem, không lỗi hiện", () => {
    start();
    chooseYear("2026");
    chooseYear("2027");
    chooseYear("2026");
    expect(storage.sets).toBe(0);
    expect(shownErrors()).toHaveLength(0);
    tick(field(app(), "prepaidOn"));
    chooseYear("2027");
    chooseYear("2026");
    expect(storage.sets).toBe(0);
    expect(shownErrors()).toHaveLength(0);
  });
});

describe("R10 dev-01: ô trở về mặc định không còn bị giữ", () => {
  it("gõ rồi xoá hết chữ ở ô tên căn: sau đổi năm vẫn rỗng, không đè lại chữ cũ", () => {
    start();
    chooseYear("2026");
    const name = () => field(ledger().querySelector(".lg-property-add")!, "name");
    fill(ledger().querySelector(".lg-property-add")!, "name", "dở");
    chooseYear("2027");
    chooseYear("2026");
    expect(name().value).toBe("dở");
    name().value = "";
    chooseYear("2027");
    chooseYear("2026");
    expect(name().value).toBe("");
  });
});

describe("R10 dev-01: chỉ giữ ô đã sửa, đọc lại kho khi đổi ngày (H-52)", () => {
  const seed = () => {
    now = "2027-01-31";
    start();
    addPropertyAndContract();
  };
  const renameInStore = (name: string) => {
    const raw = JSON.parse(storage.data.get(LEDGER_KEY)!);
    raw.properties[0].name = name;
    storage.data.set(LEDGER_KEY, JSON.stringify(raw));
  };

  it("ô tên căn chưa sửa hiện tên mới của kho sau khi đổi ngày; ô amount gõ dở giữ", () => {
    seed();
    fill(ledger().querySelector(".lg-receipt-add")!, "amount", "12.345");
    renameInStore("Căn Mới");
    now = "2027-02-01";
    fire();
    expect(field(ledger().querySelector(".lg-property-form")!, "name").value).toBe("Căn Mới");
    expect(field(ledger().querySelector(".lg-receipt-add")!, "amount").value).toBe("12.345");
  });

  it("H-52 ca audit: tab B sửa tên hợp đồng không phát storage; qua ngày thì thấy tên mới hoặc cờ stale, Lưu không ghi đè", () => {
    seed();
    const raw = JSON.parse(storage.data.get(LEDGER_KEY)!);
    raw.contracts[0].tenant = "Tab B";
    storage.data.set(LEDGER_KEY, JSON.stringify(raw));
    now = "2027-02-01";
    fire();
    const tenant = field(ledger().querySelector(".lg-contract-form")!, "tenant").value;
    const stale = staleCount() > 0;
    expect(tenant === "Tab B" || stale).toBe(true);
    const before = storage.data.get(LEDGER_KEY);
    submit(ledger().querySelector(".lg-contract-form")!);
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).contracts[0].tenant).toBe("Tab B");
    expect(storage.data.get(LEDGER_KEY)).toBe(before);
  });

  it("kho đổi không sự kiện rồi đổi ngày: đúng một thông báo stale; kho không đổi: không có", () => {
    seed();
    now = "2027-02-01";
    fire();
    expect(staleCount()).toBe(0);
    renameInStore("Căn Mới");
    now = "2027-02-02";
    fire();
    expect(staleCount()).toBe(1);
    now = "2027-02-03";
    fire();
    expect(staleCount()).toBe(1);
  });
});
