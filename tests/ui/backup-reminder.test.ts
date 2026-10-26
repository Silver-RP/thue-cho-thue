// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_BACKUP_KEY, LEDGER_KEY, type StorageLike } from "../../src/ledger/storage";
import { mountLedger } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  sets: string[] = [];
  throwGet = false;
  getItem(k: string): string | null {
    if (this.throwGet) throw new Error("blocked");
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.sets.push(k);
    this.data.set(k, v);
  }
}

const TODAY = "2026-10-27";
let storage: FakeStorage;
let root: HTMLElement;
let seq: number;
let unmounts: Array<() => void>;

const seed = () => {
  storage.data.set(
    LEDGER_KEY,
    JSON.stringify({ schemaVersion: 1, properties: [{ id: "p1", name: "Căn A" }], contracts: [], receipts: [], deductionChoice: {} }),
  );
};
const mount = () => {
  const un = mountLedger(root, { year: 2026, storage, newId: () => `id${++seq}`, today: TODAY, confirm: () => true, download: () => {} });
  unmounts.push(un);
  return un;
};
const addProperty = (name: string) => {
  const f = root.querySelector(".lg-property-add")!;
  (f.querySelector('[name="name"]') as HTMLInputElement).value = name;
  f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const flush = () => new Promise((r) => setTimeout(r, 0));
const backupText = () => root.querySelector(".lg-backup")?.textContent ?? "";
const reminder = () => root.querySelector('.lg-backup [role="status"]');
const setPersist = (persist: unknown) => Object.defineProperty(navigator, "storage", { value: persist === undefined ? undefined : { persist }, configurable: true });

let origStorage: PropertyDescriptor | undefined;
beforeEach(() => {
  document.body.innerHTML = '<div id="r"></div>';
  root = document.getElementById("r")!;
  storage = new FakeStorage();
  seq = 0;
  unmounts = [];
  origStorage = Object.getOwnPropertyDescriptor(navigator, "storage");
});
afterEach(() => {
  for (const u of unmounts) u();
  if (origStorage) Object.defineProperty(navigator, "storage", origStorage);
  else delete (navigator as unknown as Record<string, unknown>).storage;
});

describe("persist() qua navigator.storage (A1.2)", () => {
  it("gọi 1 lần khi sổ có dữ liệu; 0 khi trống; sau căn đầu 1 lần; căn thứ hai vẫn 1", async () => {
    const persist = vi.fn(async () => true);
    setPersist(persist);
    mount();
    expect(persist).toHaveBeenCalledTimes(0);
    addProperty("A");
    expect(persist).toHaveBeenCalledTimes(1);
    addProperty("B");
    expect(persist).toHaveBeenCalledTimes(1);
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("kho đã có dữ liệu thì gọi ngay lúc gắn, đúng một lần; gắn lại gọi thêm một lần", () => {
    const persist = vi.fn(async () => true);
    setPersist(persist);
    seed();
    const un = mount();
    expect(persist).toHaveBeenCalledTimes(1);
    un();
    mount();
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("navigator.storage vắng: không ném, vẫn thêm căn được", () => {
    setPersist(undefined);
    expect(() => mount()).not.toThrow();
    addProperty("A");
    expect(root.textContent).toContain("A");
  });

  it("persist ném đồng bộ: không ném", () => {
    setPersist(() => {
      throw new Error("x");
    });
    seed();
    expect(() => mount()).not.toThrow();
  });

  it("persist bị từ chối: không unhandled rejection, sổ dùng bình thường", async () => {
    const seen: unknown[] = [];
    const h = (r: unknown) => seen.push(r);
    process.on("unhandledRejection", h);
    try {
      setPersist(vi.fn(() => Promise.reject(new Error("no"))));
      seed();
      mount();
      addProperty("B");
      await flush();
      await flush();
      expect(seen).toEqual([]);
      expect(root.textContent).toContain("B");
    } finally {
      process.off("unhandledRejection", h);
    }
  });

  it("kho bị khoá (dữ liệu hỏng) thì không gọi", () => {
    const persist = vi.fn(async () => true);
    setPersist(persist);
    storage.data.set(LEDGER_KEY, "{hỏng");
    mount();
    expect(persist).toHaveBeenCalledTimes(0);
  });
});

describe("Lần sao lưu cuối và nhắc (H-43)", () => {
  it("chưa sao lưu: nhắc; bấm Xuất JSON ghi last-backup = today, hết nhắc, hiện dd/mm/yyyy", () => {
    seed();
    mount();
    expect(backupText()).toContain("Chưa sao lưu lần nào");
    expect(reminder()).not.toBeNull();
    expect(reminder()!.textContent).toContain("Xuất JSON");
    expect(reminder()!.textContent).toContain("trình duyệt");
    (root.querySelector('button[name="export"]') as HTMLButtonElement).click();
    expect(storage.data.get(LAST_BACKUP_KEY)).toBe(TODAY);
    expect(reminder()).toBeNull();
    expect(backupText()).toContain("Lần sao lưu cuối: 27/10/2026");
    expect(backupText()).not.toContain("Chưa sao lưu lần nào");
  });

  it("biên 30 ngày: 29 ngày không nhắc, 30 ngày nhắc", () => {
    seed();
    storage.data.set(LAST_BACKUP_KEY, "2026-09-28");
    mount();
    expect(reminder()).toBeNull();
    expect(backupText()).toContain("Lần sao lưu cuối: 28/09/2026");
    unmounts.pop()!();
    storage.data.set(LAST_BACKUP_KEY, "2026-09-27");
    mount();
    expect(reminder()).not.toBeNull();
    expect(backupText()).toContain("27/09/2026");
  });

  it("sổ trống: không nhắc; mount không ghi gì (có hay không có dữ liệu)", () => {
    mount();
    expect(reminder()).toBeNull();
    expect(storage.sets).toEqual([]);
    unmounts.pop()!();
    seed();
    storage.sets = [];
    mount();
    expect(storage.sets).toEqual([]);
  });

  it("khoá last-backup hỏng: coi như chưa sao lưu, không ném", () => {
    seed();
    storage.data.set(LAST_BACKUP_KEY, "hôm qua");
    expect(() => mount()).not.toThrow();
    expect(backupText()).toContain("Chưa sao lưu lần nào");
    expect(reminder()).not.toBeNull();
  });

  it("getItem ném: sổ vẫn hiện", () => {
    seed();
    storage.throwGet = true;
    expect(() => mount()).not.toThrow();
    expect(root.querySelector(".lg-backup")).not.toBeNull();
  });

  it("xuất lỗi thì không ghi last-backup", () => {
    seed();
    mount();
    const orig = URL.createObjectURL;
    URL.createObjectURL = () => {
      throw new Error("x");
    };
    try {
      (root.querySelector('button[name="export"]') as HTMLButtonElement).click();
    } finally {
      URL.createObjectURL = orig;
    }
    expect(storage.data.has(LAST_BACKUP_KEY)).toBe(false);
    expect(reminder()).not.toBeNull();
  });

  it("thêm căn đầu tiên vào sổ trống thì hiện nhắc", () => {
    mount();
    addProperty("A");
    expect(reminder()).not.toBeNull();
  });
});
