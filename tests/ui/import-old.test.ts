// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { exportLedger, importLedger } from "../../src/ledger/backup";
import { emptyLedger } from "../../src/ledger/model";
import { LEDGER_KEY, type StorageLike } from "../../src/ledger/storage";
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
let downloads: string[];

const V2 = '{"schemaVersion":2,"properties":[],"contracts":[],"receipts":[],"deductionChoice":{}}';
const KEYS = '"contracts":[],"receipts":[],"deductionChoice":{}';

function mount(): void {
  root.replaceChildren();
  mountLedger(root, {
    year: 2026,
    storage,
    newId: () => "id1",
    today: "2026-10-26",
    confirm: () => true,
    download: (_f, _m, content) => void downloads.push(content),
  });
}
const flush = () => new Promise((r) => setTimeout(r, 0));
async function fileInput(text: string): Promise<void> {
  const input = root.querySelector('input[type="file"][name="import"]') as HTMLInputElement;
  const file = { text: () => Promise.resolve(text) } as unknown as File;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}
const errText = () =>
  Array.from(root.querySelectorAll("p.form-error"))
    .filter((p) => !(p as HTMLElement).hidden)
    .map((p) => p.textContent)
    .join(" ");

beforeEach(() => {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  storage = new FakeStorage();
  downloads = [];
});

describe("H-28: nhập lại bản sổ cũ đã tải", () => {
  it("mục 1: khoá -> Tải bản sổ cũ -> sửa phiên bản -> nhập qua ô file -> sổ hiện căn", async () => {
    storage.data.set(LEDGER_KEY, V2);
    mount();
    const dl = Array.from(root.querySelectorAll("button")).find((b) => b.textContent === "Tải bản sổ cũ")!;
    dl.click();
    expect(downloads).toEqual([V2]);
    const old = JSON.parse(downloads[0]!);
    old.schemaVersion = 1;
    old.properties = [{ id: "p1", name: "Căn cũ" }];
    await fileInput(JSON.stringify(old));
    expect(errText()).not.toContain("không phải do ứng dụng");
    expect(root.textContent).toContain("Căn cũ");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties).toHaveLength(1);
  });

  it("mục 2: file lạ bị từ chối, kho không đổi", async () => {
    const bads = [
      "{}",
      "[]",
      '{"schemaVersion":1}',
      '{"schemaVersion":1,"properties":[]}',
      `{"app":"khac","schemaVersion":1,"properties":[],${KEYS}}`,
      "{hong",
    ];
    for (const b of bads) {
      storage = new FakeStorage();
      storage.data.set(LEDGER_KEY, V2);
      mount();
      await fileInput(b);
      expect(errText(), b).not.toBe("");
      expect(storage.data.get(LEDGER_KEY), b).toBe(V2);
      expect(importLedger(b).ok, b).toBe(false);
    }
  });

  it("mục 3: không app, đúng dạng nhưng schemaVersion 2 -> báo phiên bản mới hơn", async () => {
    storage.data.set(LEDGER_KEY, V2);
    mount();
    await fileInput(V2);
    expect(errText()).toContain("mới hơn");
    expect(storage.data.get(LEDGER_KEY)).toBe(V2);
  });

  it("mục 4: file có app của exportLedger vẫn nhập được", () => {
    const out = exportLedger(emptyLedger(), "2026-10-26");
    expect(importLedger(out.text).ok).toBe(true);
  });
});
