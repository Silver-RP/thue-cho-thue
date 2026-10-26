// @vitest-environment happy-dom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEDGER_KEY, type StorageLike } from "../src/ledger/storage";
import { rules2026 } from "../src/rules/2026";
import type { TaxRules } from "../src/rules";
import { filingYear, localToday, startApp } from "../src/start";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const savedTz = process.env.TZ;
afterEach(() => {
  if (savedTz === undefined) delete process.env.TZ;
  else process.env.TZ = savedTz;
  vi.useRealTimers();
});

const pin = (iso: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
};

describe("localToday theo giờ Việt Nam (H-40)", () => {
  it("ca audit: máy ở Tokyo, 2027-01-31T16:00:00Z -> 2027-01-31", () => {
    process.env.TZ = "Asia/Tokyo";
    pin("2027-01-31T16:00:00Z");
    expect(localToday()).toBe("2027-01-31");
  });

  describe.each(["UTC", "Asia/Tokyo", "America/New_York"])("TZ %s", (tz) => {
    it.each([
      ["2027-01-31T16:59:59Z", "2027-01-31"],
      ["2027-01-31T17:00:00Z", "2027-02-01"],
      ["2026-12-31T17:00:00Z", "2027-01-01"],
    ])("%s -> %s", (iso, want) => {
      process.env.TZ = tz;
      pin(iso);
      expect(localToday()).toBe(want);
      // gọi lặp không rò trạng thái
      expect(localToday()).toBe(want);
    });
  });

  it("tham số: 2026-02-28T17:30:00Z -> 2026-03-01", () => {
    expect(localToday(new Date("2026-02-28T17:30:00Z"))).toBe("2026-03-01");
  });
});

describe("filingYear đọc hạn từ luật (pre-mortem 4)", () => {
  const fake: TaxRules = { ...rules2026, deadlines: { ...rules2026.deadlines, once: [{ month: 2, day: 1, yearOffset: 1 }] } };
  const only2026 = (y: number): TaxRules | undefined => (y === 2026 ? fake : undefined);

  it("luật giả hạn 01/02: 2027-02-01 còn là 2026, 2027-02-02 là 2027", () => {
    expect(filingYear("2027-02-01", only2026)).toBe(2026);
    expect(filingYear("2027-02-02", only2026)).toBe(2027);
  });

  it("luật thật: 2027-01-31 -> 2026, 2027-02-01 -> 2027", () => {
    expect(filingYear("2027-01-31")).toBe(2026);
    expect(filingYear("2027-02-01")).toBe(2027);
  });

  it("năm trước không có luật: dùng luật gần nhất", () => {
    expect(filingYear("2029-01-15")).toBe(2028);
    expect(filingYear("2029-02-01")).toBe(2029);
  });

  it("lấy phần tử once muộn nhất", () => {
    const multi: TaxRules = {
      ...rules2026,
      deadlines: {
        ...rules2026.deadlines,
        once: [
          { month: 1, day: 31, yearOffset: 1 },
          { month: 3, day: 15, yearOffset: 1 },
        ],
      },
    };
    expect(filingYear("2027-03-15", () => multi)).toBe(2026);
    expect(filingYear("2027-03-16", () => multi)).toBe(2027);
  });

  it("không có luật nào (rulesOf ném hoặc trống): quy tắc cũ, không ném", () => {
    expect(filingYear("2027-01-31", () => undefined)).toBe(2026);
    expect(filingYear("2027-02-01", () => undefined)).toBe(2027);
    expect(
      filingYear("2027-01-31", () => {
        throw new Error("x");
      }),
    ).toBe(2026);
  });
});

describe("startApp: ngày và tab qua nửa đêm", () => {
  let storage: FakeStorage;
  let seq: number;
  const app = () => document.querySelector<HTMLElement>("#app")!;
  const ledger = () => document.querySelector<HTMLElement>("#ledger")!;
  const yearSel = () => document.querySelector<HTMLSelectElement>('select[name="tax-year"]')!;
  const faq = () => document.querySelector<HTMLElement>('[data-rule="deadline"]')!;
  const start = (today: string, extra: Record<string, unknown> = {}) =>
    startApp(document, { today, storage, newId: () => `id${++seq}`, confirm: () => true, download: () => {}, ...extra });
  const setVisibility = (v: string) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
  const fire = () => document.dispatchEvent(new Event("visibilitychange"));
  const chooseYear = (y: string) => {
    yearSel().value = y;
    yearSel().dispatchEvent(new Event("change", { bubbles: true }));
  };
  const amount = () => ledger().querySelector<HTMLInputElement>('.lg-receipt-add [name="amount"]')!;

  beforeEach(() => {
    document.body.innerHTML =
      '<main id="app"></main><section id="ledger"></section><p>Hạn <span data-rule="deadline">31/01/2027</span></p>';
    storage = new FakeStorage();
    seq = 0;
    setVisibility("visible");
  });
  afterEach(() => {
    // trả document.visibilityState về prototype
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it("H-39: 2027-01-31 -> năm 2026 có máy tính; 2027-02-01 -> 2027, báo chưa có quy định, nút về 2026", () => {
    start("2027-01-31");
    expect(yearSel().value).toBe("2026");
    expect(app().querySelector("form")).not.toBeNull();
    expect(faq().textContent).not.toContain("đã qua");
    start("2027-02-01");
    expect(yearSel().value).toBe("2027");
    expect(app().textContent).toContain("Chưa có quy định");
    expect(Array.from(app().querySelectorAll("button")).some((b) => b.textContent === "Xem năm 2026")).toBe(true);
    expect(faq().textContent).toContain("đã qua");
  });

  it("H-40: quay lại tab sau nửa đêm: năm mới, FAQ đã qua, giữ chữ gõ dở; clock không đổi thì không gắn lại", () => {
    let now = "2027-01-31";
    start(now, { clock: () => now });
    expect(yearSel().value).toBe("2026");
    const submit = (f: Element) => f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const put = (s: Element, n: string, v: string) => ((s.querySelector(`[name="${n}"]`) as HTMLInputElement).value = v);
    put(ledger().querySelector(".lg-property-add")!, "name", "Căn A");
    submit(ledger().querySelector(".lg-property-add")!);
    const addC = ledger().querySelector(".lg-contract-add")!;
    put(addC, "tenant", "T1");
    put(addC, "signedOn", "2026-01-01");
    put(addC, "startOn", "2026-01-01");
    submit(addC);
    amount().value = "12.345";
    const before = ledger().firstElementChild;
    fire();
    expect(ledger().firstElementChild).toBe(before);

    now = "2027-02-01";
    fire();
    expect(yearSel().value).toBe("2027");
    expect(faq().textContent).toContain("đã qua");
    expect(document.querySelectorAll('select[name="tax-year"]')).toHaveLength(1);
    expect(amount().value).toBe("12.345");

    const after = ledger().firstElementChild;
    fire();
    expect(ledger().firstElementChild).toBe(after);
  });

  it("tab ẩn (hidden) thì không gắn lại", () => {
    let now = "2027-01-31";
    start(now, { clock: () => now });
    const before = ledger().firstElementChild;
    now = "2027-02-01";
    setVisibility("hidden");
    fire();
    expect(ledger().firstElementChild).toBe(before);
    expect(yearSel().value).toBe("2026");
  });

  it("giữ năm người dùng đã chọn khác mặc định; gọi startApp lần hai: chỉ một lần gắn lại", () => {
    let now = "2027-01-31";
    start(now, { clock: () => now, rules: [{ ...rules2026, year: 2027 }] });
    // mặc định 2026 (2027-01-31); người dùng chọn 2027 rồi... chọn lại 2026 vẫn là mặc định, nên chọn 2027
    chooseYear("2027");
    now = "2027-02-01"; // mặc định mới 2027, người dùng chọn 2027 trùng: đổi cách thử bên dưới
    fire();
    expect(yearSel().value).toBe("2027");

    // ca chính: mặc định 2027, người dùng chọn 2026, ngày đổi tiếp theo
    chooseYear("2026");
    now = "2027-02-02";
    fire();
    expect(yearSel().value).toBe("2026");

    // gọi startApp lần hai (listener cũ phải gỡ): đếm số lần gắn lại bằng số ô chọn năm tạo mới
    const spy = vi.spyOn(document, "createElement");
    start(now, { clock: () => now });
    spy.mockClear();
    now = "2027-02-03";
    fire();
    const selects = spy.mock.calls.filter((c) => c[0] === "select").length;
    expect(selects).toBe(1);
    spy.mockRestore();
  });

  it("giữ cờ stale qua lần gắn lại do đổi ngày", () => {
    let now = "2027-01-31";
    const events = new EventTarget();
    start(now, { clock: () => now, events });
    const e = new Event("storage") as Event & { key: string; newValue: string | null };
    e.key = LEDGER_KEY;
    e.newValue = "{}";
    events.dispatchEvent(e);
    now = "2027-02-01";
    fire();
    const alerts = Array.from(ledger().querySelectorAll('[role="alert"]')).filter((a) => (a.textContent ?? "").includes("Sổ đã được đổi ở tab khác"));
    expect(alerts).toHaveLength(1);
  });

  it("không có clock: visibilitychange không làm gì", () => {
    start("2027-01-31");
    const before = ledger().firstElementChild;
    fire();
    expect(ledger().firstElementChild).toBe(before);
  });
});

describe("quét test đọc đồng hồ (mục 8)", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
    });
  const files = walk("tests").filter((f) => !f.endsWith("start-date.test.ts"));

  it("file gọi localToday() không tham số hoặc import src/main phải có setSystemTime", () => {
    for (const f of files) {
      const t = readFileSync(f, "utf8");
      const reads = /localToday\(\s*\)/.test(t) || /(["'])\.\.?(\/\.\.)*\/src\/main\1/.test(t) || /["'][./]*src\/main["']/.test(t);
      if (reads) expect(t, f).toContain("setSystemTime");
    }
  });

  it("file đổi process.env.TZ phải trả lại trong afterEach", () => {
    for (const f of walk("tests")) {
      const t = readFileSync(f, "utf8");
      if (/process\.env\.TZ\s*=/.test(t)) expect(t, f).toMatch(/afterEach[\s\S]*process\.env\.TZ/);
    }
  });

  it("src/start.ts không viết cứng ngày đổi năm 02-01", () => {
    expect(readFileSync("src/start.ts", "utf8")).not.toContain("02-01");
  });
});
