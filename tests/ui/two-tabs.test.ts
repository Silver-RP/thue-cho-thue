// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { BACKUP_KEY, LEDGER_KEY, type StorageLike } from "../../src/ledger/storage";
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

let storage: FakeStorage;
let seq: number;
let rootA: HTMLElement;
let rootB: HTMLElement;
let evB: EventTarget;

const mount = (root: HTMLElement, events?: EventTarget) =>
  mountLedger(root, { year: 2026, storage, newId: () => `id${++seq}`, today: "2026-10-26", confirm: () => true, download: () => {}, ...(events ? { events } : {}) });
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const addProperty = (root: HTMLElement, name: string) => {
  const f = root.querySelector(".lg-property-add")!;
  (f.querySelector('[name="name"]') as HTMLInputElement).value = name;
  submit(f);
};
const button = (root: HTMLElement, label: string) => Array.from(root.querySelectorAll("button")).find((b) => b.textContent === label) ?? null;
const stale = (root: HTMLElement) => Array.from(root.querySelectorAll('[role="alert"]')).some((a) => !(a as HTMLElement).hidden && (a.textContent ?? "").includes("Sổ đã được đổi ở tab khác"));
const names = () => (JSON.parse(storage.data.get(LEDGER_KEY) ?? "{}").properties ?? []).map((p: { name: string }) => p.name);

beforeEach(() => {
  document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
  rootA = document.getElementById("a")!;
  rootB = document.getElementById("b")!;
  storage = new FakeStorage();
  seq = 0;
  evB = new EventTarget();
});

describe("hai tab không ghi đè nhau (H-11)", () => {
  it("B mở từ trước không ghi đè căn của A; tải lại rồi thêm được", () => {
    mount(rootA);
    mount(rootB, evB);
    addProperty(rootA, "A");
    expect(names()).toEqual(["A"]);
    addProperty(rootB, "B");
    expect(names()).toEqual(["A"]);
    expect(stale(rootB)).toBe(true);
    button(rootB, "Tải lại sổ")!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(stale(rootB)).toBe(false);
    expect(rootB.textContent).toContain("A");
    addProperty(rootB, "B");
    expect(names()).toEqual(["A", "B"]);
  });

  it("sự kiện storage của khoá chính báo ngay; khoá khác thì không", () => {
    mount(rootA);
    mount(rootB, evB);
    addProperty(rootA, "A");
    evB.dispatchEvent(Object.assign(new Event("storage"), { key: BACKUP_KEY, newValue: "x", oldValue: null }));
    evB.dispatchEvent(Object.assign(new Event("storage"), { key: "khac", newValue: "x", oldValue: null }));
    expect(stale(rootB)).toBe(false);
    evB.dispatchEvent(Object.assign(new Event("storage"), { key: LEDGER_KEY, newValue: storage.data.get(LEDGER_KEY), oldValue: null }));
    expect(stale(rootB)).toBe(true);
    expect(rootB.textContent).not.toContain("Căn: A");
  });

  it("một tab thêm 3 căn liên tiếp: không tự chặn chính mình", () => {
    mount(rootA);
    for (const n of ["x", "y", "z"]) addProperty(rootA, n);
    expect(names()).toEqual(["x", "y", "z"]);
    expect(stale(rootA)).toBe(false);
  });

  it("tải lại khi kho vẫn hỏng thì vẫn khoá", () => {
    mount(rootA);
    mount(rootB, evB);
    storage.data.set(LEDGER_KEY, "{oops");
    addProperty(rootB, "B");
    expect(stale(rootB)).toBe(true);
    button(rootB, "Tải lại sổ")!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(rootB.querySelector(".lg-locked")).not.toBeNull();
    addProperty(rootB, "B");
    expect(storage.data.get(LEDGER_KEY)).toBe("{oops");
  });
});
