// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// R11 dev-03 mục 4 (H-58): localToday ném lỗi trong main.ts thì trang vẫn mở được máy tính.

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><section id="ledger"></section>';
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T12:00:00"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../src/start");
});

describe("src/main.ts khi localToday ném lỗi", () => {
  it("vẫn có máy tính và sổ, không ném ra ngoài", async () => {
    vi.doMock("../src/start", async (orig) => ({
      ...(await orig<typeof import("../src/start")>()),
      localToday: () => {
        throw new RangeError("Intl hỏng");
      },
    }));
    await expect(import("../src/main")).resolves.toBeDefined();
    expect(document.querySelector("#app form")).not.toBeNull();
    expect(document.querySelector("#ledger .lg-property-add")).not.toBeNull();
  });

  it("gọi lặp (nạp lại module): vẫn mở được, không rò trạng thái", async () => {
    vi.doMock("../src/start", async (orig) => ({
      ...(await orig<typeof import("../src/start")>()),
      localToday: () => {
        throw new RangeError("Intl hỏng");
      },
    }));
    await import("../src/main");
    document.body.innerHTML = '<div id="app"></div><section id="ledger"></section>';
    vi.resetModules();
    await import("../src/main");
    expect(document.querySelectorAll("#app form")).toHaveLength(1);
  });
});
