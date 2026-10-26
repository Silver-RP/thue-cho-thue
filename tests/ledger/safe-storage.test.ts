// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { BACKUP_KEY, BACKUP_KEY_2, LEDGER_KEY, loadLedger, type StorageLike } from "../../src/ledger/storage";
import { mountLedger, type LedgerMountOptions } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  sets: string[] = [];
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.sets.push(k);
    this.data.set(k, v);
  }
}

const FUTURE = '{"schemaVersion":2,"app":"thue-cho-thue","properties":[],"contracts":[],"receipts":[]}';
const GOOD = JSON.stringify({
  schemaVersion: 1,
  app: "thue-cho-thue",
  properties: [{ id: "p9", name: "Căn nhập" }],
  contracts: [],
  receipts: [],
  deductionChoice: {},
});

let root: HTMLElement;
let storage: FakeStorage;
let seq: number;
let downloads: { filename: string; mime: string; content: string }[];
let confirms: string[];
let confirmAnswer: boolean;

const mount = (extra: Partial<LedgerMountOptions> = {}) =>
  mountLedger(root, {
    year: 2026,
    storage,
    newId: () => `id${++seq}`,
    today: "2026-10-26",
    confirm: (m) => (confirms.push(m), confirmAnswer),
    download: (filename, mime, content) => void downloads.push({ filename, mime, content }),
    ...extra,
  });

const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const click = (el: Element | null) => (el as HTMLElement).dispatchEvent(new Event("click", { bubbles: true }));
const button = (label: string) => Array.from(root.querySelectorAll("button")).find((b) => b.textContent === label) ?? null;
const addProperty = (name: string) => {
  const f = root.querySelector(".lg-property-add")!;
  (f.querySelector('[name="name"]') as HTMLInputElement).value = name;
  submit(f);
};
const alerts = () => Array.from(root.querySelectorAll('[role="alert"]')).filter((a) => !(a as HTMLElement).hidden).map((a) => a.textContent ?? "");
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById("root")!;
  storage = new FakeStorage();
  seq = 0;
  downloads = [];
  confirms = [];
  confirmAnswer = true;
});

describe("loadLedger: cờ khoá", () => {
  it("kho trống hoặc hợp lệ: không khoá", () => {
    expect(loadLedger(storage).locked).toBeFalsy();
    storage.data.set(LEDGER_KEY, GOOD);
    expect(loadLedger(storage).locked).toBeFalsy();
  });
  it("kho hỏng / sai cấu trúc / phiên bản lạ: khoá và trả chuỗi gốc", () => {
    for (const raw of ["{oops", FUTURE, "[]"]) {
      const s = new FakeStorage();
      s.data.set(LEDGER_KEY, raw);
      const r = loadLedger(s);
      expect(r.locked).toBe(true);
      expect(r.raw).toBe(raw);
    }
  });
  it("getItem ném lỗi: khoá, không có chuỗi gốc", () => {
    const r = loadLedger({ getItem: () => { throw new Error("x"); }, setItem: () => {} });
    expect(r.locked).toBe(true);
    expect(r.raw).toBeUndefined();
  });
});

describe("H-10: kho hỏng không bị ghi đè qua giao diện", () => {
  for (const raw of [FUTURE, "{oops"]) {
    it(`thêm căn khi khoá chính là ${raw.slice(0, 12)}: giữ nguyên từng byte, có cảnh báo`, () => {
      storage.data.set(LEDGER_KEY, raw);
      mount();
      addProperty("Căn A");
      expect(storage.data.get(LEDGER_KEY)).toBe(raw);
      expect(storage.sets).not.toContain(LEDGER_KEY);
      expect(alerts().join(" ")).toMatch(/[Ss]ổ cũ chưa đọc được/);
      expect(root.textContent).not.toMatch(/schemaVersion|SyntaxError/);
    });
  }

  it("tải bản sổ cũ: download nhận đúng chuỗi cũ, tên .json", () => {
    storage.data.set(LEDGER_KEY, FUTURE);
    mount();
    click(button("Tải bản sổ cũ"));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]!.content).toBe(FUTURE);
    expect(downloads[0]!.filename).toMatch(/\.json$/);
  });

  it("bắt đầu sổ mới: từ chối thì vẫn khoá", () => {
    storage.data.set(LEDGER_KEY, "{oops");
    confirmAnswer = false;
    mount();
    click(button("Bắt đầu sổ mới"));
    expect(confirms).toHaveLength(1);
    addProperty("Căn A");
    expect(storage.data.get(LEDGER_KEY)).toBe("{oops");
  });

  it("bắt đầu sổ mới: đồng ý thì thêm căn được, chuỗi cũ nằm ở dự phòng", () => {
    storage.data.set(LEDGER_KEY, "{oops");
    mount();
    click(button("Bắt đầu sổ mới"));
    expect(storage.data.get(BACKUP_KEY)).toBe("{oops");
    addProperty("Căn A");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties[0].name).toBe("Căn A");
    expect(alerts().join(" ")).not.toMatch(/[Ss]ổ cũ chưa đọc được/);
  });

  it("bắt đầu sổ mới khi dự phòng đã giữ chuỗi khác: cả hai chuỗi cũ còn", () => {
    storage.data.set(LEDGER_KEY, "{oops");
    storage.data.set(BACKUP_KEY, "OLDER");
    mount();
    click(button("Bắt đầu sổ mới"));
    expect(storage.data.get(BACKUP_KEY)).toBe("OLDER");
    expect(storage.data.get(BACKUP_KEY_2)).toBe("{oops");
    addProperty("Căn A");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties).toHaveLength(1);
  });

  it("chuỗi cũ đã nằm sẵn ở dự phòng: không cần khoá thứ hai", () => {
    storage.data.set(LEDGER_KEY, "{oops");
    mount(); // loadLedger chép sang dự phòng
    click(button("Bắt đầu sổ mới"));
    expect(storage.data.has(BACKUP_KEY_2)).toBe(false);
  });

  it("không ghi được dự phòng: vẫn khoá, khoá chính không đổi", () => {
    storage.data.set(LEDGER_KEY, "{oops");
    storage.data.set(BACKUP_KEY, "OLDER");
    const real = storage.setItem.bind(storage);
    storage.setItem = (k, v) => {
      if (k === BACKUP_KEY_2) throw new Error("quota");
      real(k, v);
    };
    mount();
    click(button("Bắt đầu sổ mới"));
    addProperty("Căn A");
    expect(storage.data.get(LEDGER_KEY)).toBe("{oops");
  });

  it("khoá: đổi hợp đồng được trừ ngưỡng không ghi khoá chính", () => {
    storage.data.set(LEDGER_KEY, FUTURE);
    mount();
    // khối chọn chỉ hiện khi có hợp đồng; sổ khoá rỗng nên không hiện, và cũng không có cách ghi
    expect(root.querySelector('[name="deductionChoice"]')).toBeNull();
    expect(storage.sets).not.toContain(LEDGER_KEY);
  });

  it("khoá: chọn cách khai (nếu có) không ghi khoá chính", () => {
    storage.data.set(LEDGER_KEY, FUTURE);
    mount();
    for (const r of Array.from(root.querySelectorAll('input[type="radio"]'))) click(r);
    expect(storage.data.get(LEDGER_KEY)).toBe(FUTURE);
  });

  it("khoá: nhập JSON hợp lệ hỏi confirm; từ chối thì không đổi gì", async () => {
    storage.data.set(LEDGER_KEY, FUTURE);
    confirmAnswer = false;
    mount();
    fileInput(GOOD);
    await tick();
    expect(confirms).toHaveLength(1);
    expect(storage.data.get(LEDGER_KEY)).toBe(FUTURE);
    expect(storage.sets).not.toContain(LEDGER_KEY);
    expect(button("Bắt đầu sổ mới")).not.toBeNull();
  });

  it("khoá: nhập JSON hợp lệ, đồng ý: chuỗi cũ vào dự phòng trước khi khoá chính đổi", async () => {
    storage.data.set(LEDGER_KEY, FUTURE);
    mount();
    fileInput(GOOD);
    await tick();
    expect(confirms).toHaveLength(1);
    expect(storage.sets.indexOf(BACKUP_KEY)).toBeLessThan(storage.sets.indexOf(LEDGER_KEY));
    expect(storage.data.get(BACKUP_KEY)).toBe(FUTURE);
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties[0].name).toBe("Căn nhập");
  });

  it("getItem ném lỗi: khoá, thêm căn không gọi setItem khoá chính", () => {
    const st = new FakeStorage();
    st.getItem = () => {
      throw new Error("boom");
    };
    storage = st;
    mount();
    addProperty("Căn A");
    expect(st.sets).not.toContain(LEDGER_KEY);
    expect(alerts().length).toBeGreaterThan(0);
  });

  it("kho bình thường: không có nút khoá, thêm căn ghi bình thường, gọi lặp không rò", () => {
    mount();
    expect(button("Tải bản sổ cũ")).toBeNull();
    addProperty("Căn A");
    addProperty("Căn B");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties).toHaveLength(2);
    // mount lần hai trên kho tốt: không bị khoá do lần trước
    mount();
    expect(button("Bắt đầu sổ mới")).toBeNull();
  });
});

function fileInput(text: string): void {
  const input = root.querySelector('input[type="file"][name="import"]') as HTMLInputElement;
  const file = { text: () => Promise.resolve(text) } as unknown as File;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
