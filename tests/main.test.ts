// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const original = Object.getOwnPropertyDescriptor(window, "localStorage");

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><section id="ledger"></section>';
  vi.resetModules();
  // H-38: ghim giờ, test không phụ thuộc đồng hồ máy (từ 01/02/2027 là năm chưa có luật).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T12:00:00"));
});
afterEach(() => {
  vi.useRealTimers();
  if (original) Object.defineProperty(window, "localStorage", original);
});

describe("src/main.ts (H-12)", () => {
  it("localStorage bình thường: có máy tính và sổ", async () => {
    await import("../src/main");
    expect(document.querySelector("#app form")).not.toBeNull();
    expect(document.querySelector("#ledger .lg-property-add")).not.toBeNull();
  });

  it("getter localStorage ném SecurityError: máy tính vẫn có, sổ báo tiếng Việt", async () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("x", "SecurityError");
      },
    });
    await expect(import("../src/main")).resolves.toBeDefined();
    expect(document.querySelector("#app form")).not.toBeNull();
    const ledger = document.querySelector("#ledger")!;
    expect(ledger.textContent).toMatch(/trình duyệt đang chặn lưu dữ liệu/);
    expect(ledger.querySelector('[role="alert"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain("SecurityError");
  });

  it("2027-03-01 (H-38): năm chưa có luật, không có máy tính, báo rõ, sổ vẫn có", async () => {
    vi.setSystemTime(new Date("2027-03-01T12:00:00"));
    await import("../src/main");
    expect(document.querySelector("#app form")).toBeNull();
    expect(document.querySelector("#app")!.textContent).toContain("Chưa có quy định thuế cho năm 2027");
    expect(document.querySelector("#ledger .lg-property-add")).not.toBeNull();
  });
});
