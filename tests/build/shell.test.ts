// @vitest-environment happy-dom
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startApp } from "../../src/start";

const ROOT = resolve(__dirname, "../..");
const CSS = readFileSync(join(ROOT, "src/ui/style.css"), "utf8");
const MOCKUP = readFileSync(join(ROOT, "docs/design/mockup-r8.html"), "utf8");

function tokens(css: string, from = 0): Record<string, string> {
  const start = css.indexOf(":root", from);
  const block = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function lum(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

let built = "";
let outDir = "";
beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "thue-shell-"));
  await build({ root: ROOT, logLevel: "silent", build: { outDir, emptyOutDir: true } });
  built = readFileSync(join(outDir, "index.html"), "utf8");
}, 60_000);
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("token (dev-01 mục 1)", () => {
  it("cùng tên và cùng giá trị với mockup, đủ 17", () => {
    const mine = tokens(CSS);
    const theirs = tokens(MOCKUP);
    expect(Object.keys(theirs).length).toBe(17);
    expect(mine).toEqual(theirs);
  });
});

describe("khung trang đã build (mục 2)", () => {
  const doc = () => new DOMParser().parseFromString(built, "text/html");
  it("có topbar, nav, tabbar mỗi cái 4 liên kết trỏ tới id có thật", () => {
    const d = doc();
    expect(d.querySelectorAll("header.topbar").length).toBe(1);
    for (const sel of ["nav.nav", "nav.tabbar"]) {
      const links = Array.from(d.querySelectorAll(`${sel} a`));
      expect(links.length).toBe(4);
      for (const a of links) {
        const id = a.getAttribute("href")!.slice(1);
        expect(d.getElementById(id), id).not.toBeNull();
      }
    }
    for (const id of ["app", "ledger", "info", "overview", "deadlines"]) expect(d.getElementById(id), id).not.toBeNull();
    expect(d.querySelectorAll("h1").length).toBe(1);
    expect(d.querySelector(".privacy")!.textContent).toContain("Dữ liệu chỉ nằm trên máy bạn");
  });
});

describe("ô chọn năm trên thanh trên (mục 3)", () => {
  it("đúng một ô trong .topbar, có label, giá trị 2026, gọi lại vẫn một ô", () => {
    document.documentElement.innerHTML = new DOMParser().parseFromString(built, "text/html").documentElement.innerHTML;
    const store = { getItem: () => null, setItem: () => {} };
    for (let i = 0; i < 2; i++) {
      startApp(document, { today: "2027-01-15", storage: store });
      const sels = document.querySelectorAll('select[name="tax-year"]');
      expect(sels.length).toBe(1);
      const sel = sels[0] as HTMLSelectElement;
      expect(sel.closest(".topbar")).not.toBeNull();
      expect(document.querySelector(`label[for="${sel.id}"]`)).not.toBeNull();
      expect(sel.value).toBe("2026");
    }
  });
});

describe("tương phản (mục 4)", () => {
  const t = tokens(CSS);
  it("hàm tương phản đúng ở hai đầu", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#123456", "#123456")).toBe(1);
  });
  it.each([
    ["--text", "--bg"],
    ["--text", "--surface"],
    ["--muted", "--surface"],
    ["--muted", "--bg"],
    ["--muted", "--line"],
    ["--muted", "--primary-soft"],
    ["--primary", "--surface"],
    ["--primary", "--primary-soft"],
    ["#fff", "--primary"],
    ["--ok", "--ok-soft"],
    ["--due", "--due-soft"],
    ["--warn", "--warn-soft"],
  ])("%s trên %s >= 4,5", (fg, bg) => {
    const v = (k: string) => (k.startsWith("--") ? t[k] : k);
    const full = (c: string) => (c.length === 4 ? "#" + [...c.slice(1)].map((x) => x + x).join("") : c);
    expect(contrast(full(v(fg)), full(v(bg)))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("CSS và HTML (mục 5, 6)", () => {
  it("@media 760px ẩn .nav, hiện .tabbar; .table-scroll cuộn ngang", () => {
    const i = CSS.indexOf("@media (max-width: 760px)");
    expect(i).toBeGreaterThan(0);
    const media = CSS.slice(i);
    expect(media).toMatch(/\.nav\s*\{[^}]*display:\s*none/);
    expect(media).toMatch(/\.tabbar\s*\{[^}]*display:\s*grid/);
    expect(CSS).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });
  it("không @import, @font-face, url(http, fonts.googleapis", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    for (const bad of ["@import", "@font-face", "url(http", "fonts.googleapis"]) {
      expect(CSS).not.toContain(bad);
      expect(html).not.toContain(bad);
    }
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
  });
});
