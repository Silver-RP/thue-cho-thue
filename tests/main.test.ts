// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const original = Object.getOwnPropertyDescriptor(window, "localStorage");

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><section id="ledger"></section>';
  vi.resetModules();
});
afterEach(() => {
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
});
