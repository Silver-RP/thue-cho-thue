// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEDGER_KEY, type StorageLike } from "../src/ledger/storage";
import { startApp } from "../src/start";

// R11 dev-03 mục 4 (S21, H-58): tab vẫn hiện qua 00:00 thì không có visibilitychange; hẹn giờ trong app đọc lại ngày.

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
const yearSel = () => document.querySelector<HTMLSelectElement>('select[name="tax-year"]')!;
const faq = () => document.querySelector<HTMLElement>('[data-rule="deadline"]')!;
const due = () => document.querySelector<HTMLElement>("#deadlines")!;
const setVisibility = (v: string) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
const book = JSON.stringify({
  schemaVersion: 1,
  properties: [{ id: "p1", name: "Căn A" }],
  contracts: [{ id: "c1", propertyId: "p1", tenant: "Bình", signedOn: "2026-01-01", startOn: "2026-01-01" }],
  receipts: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, contractId: "c1", receivedOn: `2026-${String(i + 1).padStart(2, "0")}-05`, amount: 100_000_000 })),
  deductionChoice: {},
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2027-01-31T16:50:00Z"));
  document.body.innerHTML =
    '<main id="app"></main><section id="ledger"></section><section id="deadlines"></section><p>Hạn <span data-rule="deadline">31/01/2027</span></p>';
  storage = new FakeStorage();
  storage.data.set(LEDGER_KEY, book);
  setVisibility("visible");
});
afterEach(() => {
  // Gỡ hẹn giờ của lần gắn cuối (không clock) rồi trả đồng hồ thật.
  startApp(document, { today: "2026-10-26", storage: null });
  vi.useRealTimers();
  delete (document as unknown as Record<string, unknown>).visibilityState;
});

const start = (now: () => string, extra: Record<string, unknown> = {}) =>
  startApp(document, { today: now(), storage, clock: now, download: () => {}, ...extra });

describe("hẹn giờ qua nửa đêm", () => {
  it("tab vẫn hiện, không có visibilitychange: qua 00:00 gắn lại theo ngày mới", () => {
    let now = "2027-01-31";
    start(() => now);
    expect(yearSel().value).toBe("2026");
    expect(due().textContent).toContain("Hôm nay là hạn");
    expect(faq().textContent).not.toContain("đã qua");
    now = "2027-02-01";
    vi.advanceTimersByTime(60_000);
    expect(yearSel().value).toBe("2027");
    expect(faq().textContent).toContain("đã qua");
    expect(due().textContent).not.toContain("Hôm nay là hạn");
  });

  it("ngày không đổi: không gắn lại (cùng nút DOM), hẹn giờ vẫn còn đúng một", () => {
    const now = "2027-01-31";
    start(() => now);
    const before = due().firstElementChild;
    vi.advanceTimersByTime(300_000);
    expect(due().firstElementChild).toBe(before);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("tab ẩn: hẹn giờ không gắn lại (đợi visibilitychange)", () => {
    let now = "2027-01-31";
    start(() => now);
    setVisibility("hidden");
    now = "2027-02-01";
    vi.advanceTimersByTime(120_000);
    expect(yearSel().value).toBe("2026");
    setVisibility("visible");
    vi.advanceTimersByTime(60_000);
    expect(yearSel().value).toBe("2027");
  });

  it("sau 3 lần đổi năm và 3 lần qua nửa đêm vẫn chỉ một hẹn giờ đang chờ", () => {
    let day = 0;
    const now = () => `2027-02-${String(1 + day).padStart(2, "0")}`;
    start(now);
    for (const y of ["2026", "2027", "2026"]) {
      yearSel().value = y;
      yearSel().dispatchEvent(new Event("change", { bubbles: true }));
      expect(vi.getTimerCount()).toBe(1);
    }
    for (let i = 0; i < 3; i++) {
      day++;
      vi.advanceTimersByTime(60_000);
      expect(vi.getTimerCount()).toBe(1);
    }
    start(now);
    start(now);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("gỡ khi gắn lại không clock hoặc khi người dùng gọi lại: không còn hẹn giờ nào", () => {
    start(() => "2027-01-31");
    expect(vi.getTimerCount()).toBe(1);
    startApp(document, { today: "2027-01-31", storage });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("không có clock: không đặt hẹn giờ", () => {
    startApp(document, { today: "2027-01-31", storage });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("qua 00:00 không ghi vào kho (bất biến R6)", () => {
    let now = "2027-01-31";
    start(() => now);
    const before = storage.sets;
    const raw = storage.data.get(LEDGER_KEY);
    now = "2027-02-01";
    vi.advanceTimersByTime(60_000);
    expect(yearSel().value).toBe("2027");
    expect(storage.sets).toBe(before);
    expect(storage.data.get(LEDGER_KEY)).toBe(raw);
  });

  it("clock ném lỗi: trang không hỏng, hẹn giờ vẫn chạy tiếp và bắt được ngày mới khi clock hết lỗi", () => {
    let broken = true;
    let now = "2027-01-31";
    startApp(document, {
      today: "2027-01-31",
      storage,
      clock: () => {
        if (broken) throw new Error("Intl hỏng");
        return now;
      },
    });
    now = "2027-02-01";
    vi.advanceTimersByTime(60_000);
    expect(yearSel().value).toBe("2026");
    broken = false;
    vi.advanceTimersByTime(60_000);
    expect(yearSel().value).toBe("2027");
    expect(vi.getTimerCount()).toBe(1);
  });
});
