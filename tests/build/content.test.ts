// @vitest-environment happy-dom
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getRules } from "../../src/rules";
import { formatVnd } from "../../src/ui/money";

const ROOT = resolve(__dirname, "../..");
const ORIGIN = "https://silver-rp.github.io/thue-cho-thue/";
const rules = getRules(2026);

let outDir: string;
const sources: Record<string, string> = {};

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "thue-content-"));
  await build({ root: ROOT, logLevel: "silent", build: { outDir, emptyOutDir: true } });
  sources.source = readFileSync(join(ROOT, "index.html"), "utf8");
  sources.built = readFileSync(join(outDir, "index.html"), "utf8");
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe.each(["source", "built"])("nội dung công khai (%s)", (which) => {
  const doc = () => parse(sources[which]);

  it("đúng một h1 có 'Thuế cho thuê'", () => {
    const h1s = doc().querySelectorAll("h1");
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toContain("Thuế cho thuê");
  });

  it("có >= 6 câu hỏi FAQ, mục Nguồn, câu miễn trừ, noscript", () => {
    const d = doc();
    expect(d.querySelectorAll("details").length).toBeGreaterThanOrEqual(6);
    const headings = Array.from(d.querySelectorAll("h2, h3")).map((h) => h.textContent?.trim());
    expect(headings).toContain("Nguồn");
    expect(d.body.textContent).toContain("không thay thế tư vấn thuế");
    expect(d.querySelector("noscript")).not.toBeNull();
    expect(d.querySelector("#app")).not.toBeNull();
    expect(d.querySelector("#ledger")).not.toBeNull();
  });

  it("meta description không rỗng, <= 160 ký tự", () => {
    const c = doc().querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(160);
  });

  it("data-rule khớp getRules(2026)", () => {
    const spans = Array.from(doc().querySelectorAll("[data-rule]"));
    const by = (k: string) => spans.filter((s) => s.getAttribute("data-rule") === k).map((s) => s.textContent?.trim());
    for (const k of ["threshold", "pitRate", "vatRate", "deadline"]) expect(by(k).length).toBeGreaterThan(0);
    for (const t of by("threshold")) expect(t).toBe(formatVnd(rules.threshold));
    for (const t of by("pitRate")) expect(t).toBe(`${rules.pit.rateBps / 100}%`);
    for (const t of by("vatRate")) expect(t).toBe(`${rules.vat.rateBps / 100}%`);
    const year = 2026 + rules.deadlines.once[0].yearOffset;
    const once = `${String(rules.deadlines.once[0].day).padStart(2, "0")}/${String(rules.deadlines.once[0].month).padStart(2, "0")}/${year}`;
    expect(by("deadline").some((t) => t?.includes(once))).toBe(true);
    expect(once).toBe("31/01/2027");
  });

  it("FAQ không có số luật ngoài span data-rule", () => {
    const info = doc().querySelector("#info")!.cloneNode(true) as HTMLElement;
    info.querySelectorAll("[data-rule]").forEach((s) => s.remove());
    const text = info.textContent ?? "";
    expect(text).not.toContain("1.000.000.000");
    expect(text).not.toMatch(/(^|\D)5\s?%/);
  });

  it("GTGT: 'ước tính' và 'chưa xác nhận' khi vat.unconfirmed", () => {
    expect(rules.vat.unconfirmed).toBe(true);
    const span = doc().querySelector('[data-rule="vatRate"]')!;
    const text = (span.closest("details")!.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain("ước tính");
    expect(text).toContain("chưa xác nhận");
  });

  it("canonical và og:url là URL dưới /thue-cho-thue/", () => {
    const d = doc();
    const canonical = d.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    const ogUrl = d.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? "";
    for (const u of [canonical, ogUrl]) {
      expect(u.startsWith(ORIGIN)).toBe(true);
    }
    expect(d.querySelector('meta[property="og:locale"]')?.getAttribute("content")).toBe("vi_VN");
    for (const p of ["og:title", "og:description", "og:type"]) {
      expect(d.querySelector(`meta[property="${p}"]`)?.getAttribute("content")).toBeTruthy();
    }
  });
});

describe("sitemap.xml và robots.txt", () => {
  for (const [name, read] of [
    ["public", (f: string) => join(ROOT, "public", f)],
    ["outDir", (f: string) => join(outDir, f)],
  ] as const) {
    it(`có trong ${name}`, () => {
      expect(existsSync(read("sitemap.xml"))).toBe(true);
      expect(existsSync(read("robots.txt"))).toBe(true);
    });
  }

  it("sitemap là XML hợp lệ, có namespace, <loc> dưới /thue-cho-thue/", () => {
    const xml = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror").length).toBe(0);
    expect(doc.documentElement.localName).toBe("urlset");
    expect(doc.documentElement.namespaceURI).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");
    const locs = Array.from(doc.getElementsByTagName("loc")).map((l) => l.textContent?.trim() ?? "");
    expect(locs.length).toBeGreaterThan(0);
    for (const l of locs) expect(l.startsWith(ORIGIN)).toBe(true);
  });

  it("sitemap hỏng bị parser phát hiện (kiểm có tác dụng)", () => {
    const bad = new DOMParser().parseFromString("<urlset><url></urlset>", "application/xml");
    expect(bad.getElementsByTagName("parsererror").length).toBeGreaterThan(0);
  });

  it("robots.txt cho phép, có dòng Sitemap dưới /thue-cho-thue/", () => {
    const txt = readFileSync(join(outDir, "robots.txt"), "utf8");
    expect(txt).not.toMatch(/^\s*Disallow:\s*\/\s*$/m);
    const lines = txt.split(/\r?\n/).filter((l) => l.startsWith("Sitemap:"));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.slice("Sitemap:".length).trim().startsWith(ORIGIN)).toBe(true);
  });
});
