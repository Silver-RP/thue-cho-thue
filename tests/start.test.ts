// @vitest-environment happy-dom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { LEDGER_KEY, type StorageLike } from "../src/ledger/storage";
import { availableYears } from "../src/rules";
import { rules2026 } from "../src/rules/2026";
import { filingYear, startApp } from "../src/start";

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
let events: EventTarget;
let seq: number;
const app = () => document.querySelector<HTMLElement>("#app")!;
const ledger = () => document.querySelector<HTMLElement>("#ledger")!;
const yearSel = () => document.querySelector<HTMLSelectElement>('select[name="tax-year"]')!;
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const start = (today: string, extra: Record<string, unknown> = {}) =>
  startApp(document, { today, storage, events, newId: () => `id${++seq}`, confirm: () => true, download: () => {}, ...extra });
const button = (root: Element, label: string) => Array.from(root.querySelectorAll("button")).find((b) => b.textContent === label) ?? null;
const chooseYear = (y: string) => {
  yearSel().value = y;
  yearSel().dispatchEvent(new Event("change", { bubbles: true }));
};
const storageEvent = () => {
  const e = new Event("storage") as Event & { key: string; newValue: string | null };
  e.key = LEDGER_KEY;
  e.newValue = "{}";
  events.dispatchEvent(e);
};
const staleCount = () =>
  Array.from(ledger().querySelectorAll('[role="alert"]')).filter((a) => (a.textContent ?? "").includes("Sổ đã được đổi ở tab khác")).length;
const title = () => ledger().querySelector(".lg-title")!.textContent;

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main><section id="ledger"></section>';
  storage = new FakeStorage();
  events = new EventTarget();
  seq = 0;
});

describe("filingYear", () => {
  it.each([
    ["2027-01-15", 2026],
    ["2027-01-31", 2026],
    ["2027-02-01", 2027],
    ["2026-10-26", 2026],
    ["2027-03-01", 2027],
  ])("%s -> %i", (today, y) => {
    expect(filingYear(today)).toBe(y);
  });
});

describe("startApp (H-31)", () => {
  it("2027-01-15: năm mặc định 2026, tính được", () => {
    start("2027-01-15");
    expect(yearSel().value).toBe("2026");
    expect(yearSel().id).not.toBe("");
    expect(document.querySelector(`label[for="${yearSel().id}"]`)).not.toBeNull();
    expect(title()).toBe("Sổ doanh thu năm 2026");
    fill(app(), "rent", "10.000.000");
    submit(app().querySelector("form")!);
    expect(app().querySelector("table.result-table")).not.toBeNull();
  });

  it("2027-03-01: năm 2027 chưa có luật, báo rõ, sổ vẫn thêm kỳ thu, nút về 2026", () => {
    start("2027-03-01");
    expect(yearSel().value).toBe("2027");
    const opts = Array.from(yearSel().options).map((o) => [o.value, o.textContent ?? ""]);
    expect(opts.find(([v]) => v === "2027")![1]).toContain("chưa có quy định");
    expect(opts.find(([v]) => v === "2026")![1]).not.toContain("chưa có quy định");
    const note = app().querySelector('[role="status"], [role="alert"]')!;
    expect(note.textContent).toContain("Chưa có quy định thuế cho năm 2027");
    expect(app().querySelector("form")).toBeNull();

    const addP = ledger().querySelector(".lg-property-add")!;
    fill(addP, "name", "Căn A");
    submit(addP);
    const addC = ledger().querySelector(".lg-contract-add")!;
    fill(addC, "tenant", "T1");
    fill(addC, "signedOn", "2027-01-01");
    fill(addC, "startOn", "2027-01-01");
    submit(addC);
    const addR = ledger().querySelector(".lg-receipt-add")!;
    fill(addR, "receivedOn", "2027-02-10");
    fill(addR, "amount", "10.000.000");
    submit(addR);
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).receipts).toHaveLength(1);
    const summary = ledger().querySelector(".lg-summary")!;
    expect(summary.textContent).toContain("Chưa có quy định");
    expect(summary.textContent).not.toContain("Tổng thuế");

    // đi về 2026 bằng nút
    button(summary, "Xem năm 2026")!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(yearSel().value).toBe("2026");
    expect(app().querySelector("form")).not.toBeNull();
    expect(title()).toBe("Sổ doanh thu năm 2026");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).receipts).toHaveLength(1);
  });

  it("nút 'Xem năm 2026' ở máy tính, và chọn trong ô", () => {
    start("2027-03-01");
    button(app(), "Xem năm 2026")!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(yearSel().value).toBe("2026");
    expect(app().querySelector("form")).not.toBeNull();
    chooseYear("2027");
    expect(app().querySelector("form")).toBeNull();
    expect(title()).toBe("Sổ doanh thu năm 2027");
    chooseYear("2026");
    expect(app().querySelector("form")).not.toBeNull();
  });

  it("availableYears() là [2026]; thêm năm qua tham số thì ô chọn có năm đó, không ghi chưa có quy định", () => {
    expect(availableYears()).toEqual([2026]);
    start("2027-03-01", { rules: [{ ...rules2026, year: 2027 }] });
    const o = Array.from(yearSel().options).find((x) => x.value === "2027")!;
    expect(o.textContent).not.toContain("chưa có quy định");
    expect(app().querySelector("form")).not.toBeNull();
    expect(availableYears()).toEqual([2026]);
  });

  it("gọi lặp: không rò trạng thái giữa các lần", () => {
    start("2027-03-01");
    start("2027-01-15");
    expect(document.querySelectorAll('select[name="tax-year"]')).toHaveLength(1);
    expect(yearSel().value).toBe("2026");
  });

  it("đổi năm không để lại listener storage cũ (A1.2)", () => {
    start("2027-03-01");
    chooseYear("2026");
    storageEvent();
    expect(title()).toBe("Sổ doanh thu năm 2026");
    expect(staleCount()).toBe(1);
  });

  it("đổi năm 3 lần rồi bắn sự kiện: đúng một thông báo", () => {
    start("2027-03-01");
    chooseYear("2026");
    chooseYear("2027");
    chooseYear("2026");
    storageEvent();
    expect(title()).toBe("Sổ doanh thu năm 2026");
    expect(staleCount()).toBe(1);
  });

  it("không có storage: máy tính vẫn có, sổ báo tiếng Việt", () => {
    startApp(document, { today: "2026-10-26", storage: null });
    expect(app().querySelector("form")).not.toBeNull();
    expect(ledger().textContent).toMatch(/trình duyệt đang chặn lưu dữ liệu/);
  });
});

describe("quét đồng hồ và năm cứng", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
    });
  const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const files = [...walk("src/ui"), ...walk("src/rules"), "src/start.ts"];

  it("không new Date( / Date.now( ngoài thân localToday trong src/start.ts", () => {
    for (const f of files) {
      let text = strip(readFileSync(f, "utf8"));
      if (f === "src/start.ts") {
        const i = text.indexOf("export function localToday");
        expect(i).toBeGreaterThanOrEqual(0);
        let depth = 0;
        let j = text.indexOf("{", i);
        const begin = j;
        for (; j < text.length; j++) {
          if (text[j] === "{") depth++;
          if (text[j] === "}" && --depth === 0) break;
        }
        text = text.slice(0, begin) + text.slice(j + 1);
      }
      expect(text, f).not.toMatch(/new Date\(|Date\.now\(/);
    }
  });

  it("main.ts và start.ts không viết cứng 2026", () => {
    for (const f of ["src/main.ts", "src/start.ts"]) expect(strip(readFileSync(f, "utf8")), f).not.toContain("2026");
  });
});
