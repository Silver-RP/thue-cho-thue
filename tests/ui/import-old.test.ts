// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { exportLedger, importLedger } from "../../src/ledger/backup";
import { emptyLedger } from "../../src/ledger/model";
import { BACKUP_KEY, BACKUP_KEY_2, LEDGER_KEY, type StorageLike } from "../../src/ledger/storage";
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
    const NOT_APP = "không phải do ứng dụng";
    const bads: [string, string][] = [
      ["{}", NOT_APP],
      ["[]", "không đúng dạng dữ liệu"],
      ['{"schemaVersion":1}', NOT_APP],
      ['{"schemaVersion":1,"properties":[]}', NOT_APP],
      ['{"schemaVersion":1,"properties":[],"contracts":[],"receipts":[]}', NOT_APP],
      [`{"app":"khac","schemaVersion":1,"properties":[],${KEYS}}`, NOT_APP],
      ["{hong", "không phải JSON hợp lệ"],
    ];
    for (const [b, expected] of bads) {
      storage = new FakeStorage();
      storage.data.set(LEDGER_KEY, V2);
      mount();
      await fileInput(b);
      expect(errText(), b).toContain(expected);
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

  const FULL = {
    app: "thue-cho-thue",
    schemaVersion: 1,
    properties: [{ id: "p1", name: "Căn A", address: "1 Phố" }],
    contracts: [{ id: "c1", propertyId: "p1", tenant: "Lan", signedOn: "2025-12-01", startOn: "2026-01-01", endOn: "2026-12-31" }],
    receipts: [
      { id: "r1", contractId: "c1", receivedOn: "2026-02-01", amount: 123456789 },
      { id: "r2", contractId: "c1", receivedOn: "2026-03-01", amount: 5000000, prepaid: { years: 2, mode: "allocate" } },
    ],
    deductionChoice: { "2026": "c1" },
    filingMode: { "2026": "twice" },
  };

  it("mục 5: nhập sổ đầy đủ trên sổ khoá -> khoá chính bằng sổ nhập, V2 cũ còn ở khoá dự phòng", async () => {
    storage.data.set(LEDGER_KEY, V2);
    mount();
    await fileInput(JSON.stringify(FULL));
    expect(errText()).toBe("");
    const { app: _app, ...expected } = FULL;
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!)).toEqual(expected);
    expect(storage.data.get(BACKUP_KEY)).toBe(V2);
  });

  it("mục 5b: dự phòng đã giữ chuỗi khác -> V2 cũ sang backup:2, dự phòng cũ không bị đè", async () => {
    storage.data.set(LEDGER_KEY, V2);
    storage.data.set(BACKUP_KEY, "CHUOI-DU-PHONG-TRUOC");
    mount();
    await fileInput(JSON.stringify(FULL));
    expect(errText()).toBe("");
    expect(storage.data.get(BACKUP_KEY)).toBe("CHUOI-DU-PHONG-TRUOC");
    expect(storage.data.get(BACKUP_KEY_2)).toBe(V2);
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).receipts).toHaveLength(2);
  });

  it("mục 5c: mount lại sau nhập không ghi thêm gì vào kho", async () => {
    storage.data.set(LEDGER_KEY, V2);
    mount();
    await fileInput(JSON.stringify(FULL));
    const after = JSON.stringify([...storage.data]);
    mount();
    expect(JSON.stringify([...storage.data])).toBe(after);
    expect(storage.data.get(BACKUP_KEY_2)).toBeUndefined();
  });
});
