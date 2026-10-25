// @vitest-environment happy-dom
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnalytics } from "../../src/analytics";

const ROOT = resolve(__dirname, "../..");
const NET = ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "new Image"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("analytics tắt mặc định", () => {
  it("không url / url rỗng: enabled false, không gọi gì", () => {
    const transport = vi.fn();
    const fetchMock = vi.fn();
    const beacon = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    for (const opts of [undefined, {}, { url: "" }, { url: "  " }, { transport }, { url: "", transport }]) {
      const a = createAnalytics(opts);
      expect(a.enabled).toBe(false);
      a.track("pageview", "/thue-cho-thue/");
      a.track("pageview", "/thue-cho-thue/");
    }
    expect(transport).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("có url: transport gọi đúng 1 lần, body chỉ có event và path", () => {
    const transport = vi.fn();
    const a = createAnalytics({ url: "https://a.example/e", transport });
    expect(a.enabled).toBe(true);
    a.track("pageview", "/thue-cho-thue/");
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, body] = transport.mock.calls[0];
    expect(url).toBe("https://a.example/e");
    expect(Object.keys(JSON.parse(body)).sort()).toEqual(["event", "path"]);
    expect(JSON.parse(body)).toEqual({ event: "pageview", path: "/thue-cho-thue/" });
  });

  it("transport mặc định dùng sendBeacon, dự phòng fetch keepalive", () => {
    const beacon = vi.fn((_u: string, _b: unknown) => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    createAnalytics({ url: "https://a.example/e" }).track("pageview", "/p");
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe("https://a.example/e");

    const fetchMock = vi.fn(() => Promise.resolve({}));
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", fetchMock);
    createAnalytics({ url: "https://a.example/e" }).track("pageview", "/p");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ keepalive: true });
  });

  it("payload không chứa dữ liệu sổ; transport ném lỗi thì track không ném; gọi lặp", () => {
    const transport = vi.fn();
    const a = createAnalytics({ url: "https://a.example/e", transport });
    a.track("pageview", "/p");
    a.track("pageview", "/p");
    expect(transport).toHaveBeenCalledTimes(2);
    for (const [, body] of transport.mock.calls) {
      expect(body).not.toContain("100000000");
      expect(body).not.toContain("thue-cho-thue:ledger");
    }
    const bad = createAnalytics({
      url: "https://a.example/e",
      transport: () => {
        throw new Error("boom");
      },
    });
    expect(() => bad.track("pageview", "/p")).not.toThrow();
    expect(() => bad.track({ amount: 100000000 } as unknown as string, "/p")).not.toThrow();
  });

  it("chỉ src/analytics.ts có API mạng trong src/", () => {
    const files = walk(join(ROOT, "src")).filter((f) => /\.(ts|js|css|html)$/.test(f));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      if (f.endsWith(join("src", "analytics.ts"))) continue;
      const src = readFileSync(f, "utf8");
      for (const w of NET) expect(src.includes(w), `${w} trong ${f}`).toBe(false);
    }
  });

  it("build không đặt VITE_ANALYTICS_URL: bundle không có sendBeacon/fetch(", async () => {
    const saved = process.env.VITE_ANALYTICS_URL;
    delete process.env.VITE_ANALYTICS_URL;
    const outDir = mkdtempSync(join(tmpdir(), "thue-analytics-"));
    try {
      await build({
        root: ROOT,
        logLevel: "silent",
        envFile: false,
        build: { outDir, emptyOutDir: true },
      } as Parameters<typeof build>[0]);
      const js = walk(outDir).filter((f) => f.endsWith(".js"));
      expect(js.length).toBeGreaterThan(0);
      for (const f of js) {
        const src = readFileSync(f, "utf8");
        for (const w of NET) expect(src.includes(w), `${w} trong ${f}`).toBe(false);
      }
    } finally {
      if (saved !== undefined) process.env.VITE_ANALYTICS_URL = saved;
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
