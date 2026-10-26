// @vitest-environment happy-dom
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StorageLike } from "../../src/ledger/storage";
import { startApp } from "../../src/start";

const ROOT = resolve(__dirname, "../..");
let outDir: string;
let built = "";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "thue-faq-"));
  await build({ root: ROOT, logLevel: "silent", build: { outDir, emptyOutDir: true } });
  built = readFileSync(join(outDir, "index.html"), "utf8");
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

beforeEach(() => {
  document.body.innerHTML = new DOMParser().parseFromString(built, "text/html").body.innerHTML;
});

const deadlineSpans = () => Array.from(document.querySelectorAll<HTMLElement>('#info [data-rule="deadline"]'));
const span = (text: string) => deadlineSpans().filter((s) => s.textContent!.includes(text));

describe("FAQ hạn khai thuế (H-20)", () => {
  it("bản build: ngoài [data-rule] không còn ngày dd/mm/yyyy", () => {
    const info = document.querySelector("#info")!.cloneNode(true) as HTMLElement;
    info.querySelectorAll("[data-rule]").forEach((s) => s.remove());
    expect(info.textContent).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it("today 2027-01-15: span 31/07/2026 đã qua, span 31/01/2027 chưa", () => {
    startApp(document, { today: "2027-01-15", storage: new FakeStorage() });
    const past = span("31/07/2026");
    expect(past.length).toBeGreaterThan(0);
    for (const s of past) {
      expect(s.textContent).toContain("đã qua");
      expect(s.hasAttribute("data-past")).toBe(true);
    }
    const future = span("31/01/2027");
    expect(future.length).toBeGreaterThan(0);
    for (const s of future) {
      expect(s.textContent).not.toContain("đã qua");
      expect(s.hasAttribute("data-past")).toBe(false);
    }
  });

  it("today 2026-05-01: không span nào đã qua; gọi lại startApp không nhân đôi nhãn", () => {
    startApp(document, { today: "2026-05-01", storage: new FakeStorage() });
    expect(deadlineSpans().some((s) => s.textContent!.includes("đã qua"))).toBe(false);
    startApp(document, { today: "2027-01-15", storage: new FakeStorage() });
    startApp(document, { today: "2027-01-15", storage: new FakeStorage() });
    for (const s of span("31/07/2026")) expect(s.textContent!.match(/đã qua/g)!.length).toBe(1);
    startApp(document, { today: "2026-05-01", storage: new FakeStorage() });
    expect(deadlineSpans().some((s) => s.textContent!.includes("đã qua") || s.hasAttribute("data-past"))).toBe(false);
  });
});
