// @vitest-environment happy-dom
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE = "/thue-cho-thue/";
const ROOT = resolve(__dirname, "../..");

const tmpDirs: string[] = [];

async function buildTo(base?: string): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "thue-build-"));
  tmpDirs.push(outDir);
  await build({
    root: ROOT,
    ...(base === undefined ? {} : { base }),
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
  });
  return outDir;
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

/** Mọi giá trị src/href nội bộ (không phải http(s), mailto, #, data:) trong HTML. */
function internalRefs(html: string): string[] {
  const refs: string[] = [];
  for (const m of html.matchAll(/\s(?:src|href)="([^"]*)"/g)) {
    const v = m[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(v)) continue;
    refs.push(v);
  }
  return refs;
}

/** Trả danh sách lỗi đường dẫn; rỗng nghĩa là HTML đã build đúng với base Pages. */
function pathProblems(outDir: string): string[] {
  const html = readFileSync(join(outDir, "index.html"), "utf8");
  const problems: string[] = [];
  if (/(?:src|href)="\/assets\//.test(html)) problems.push("còn đường dẫn /assets/ gốc");
  const refs = internalRefs(html);
  if (refs.length === 0) problems.push("không có src/href nội bộ nào");
  for (const ref of refs) {
    if (!ref.startsWith(BASE)) {
      problems.push(`thiếu tiền tố ${BASE}: ${ref}`);
      continue;
    }
    const rel = ref.slice(BASE.length);
    if (rel !== "" && !existsSync(join(outDir, rel.split(/[?#]/)[0]))) problems.push(`file không có thật: ${ref}`);
  }
  return problems;
}

let outDir: string;
let badDir: string;

beforeAll(async () => {
  outDir = await buildTo();
  badDir = await buildTo("/");
}, 60_000);

afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

describe("build Pages (dev-01)", () => {
  it("build vào thư mục tạm mới, không phải dist/ của repo", () => {
    expect(outDir.startsWith(tmpdir())).toBe(true);
    expect(outDir).not.toBe(join(ROOT, "dist"));
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    expect(listFiles(outDir).some((f) => f.endsWith(".js"))).toBe(true);
  });

  it("mọi src/href nội bộ có tiền tố base và trỏ tới file có thật", () => {
    expect(pathProblems(outDir)).toEqual([]);
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    const refs = internalRefs(html);
    expect(refs.some((r) => r.endsWith(".js"))).toBe(true);
    for (const r of refs) {
      expect(r.startsWith(BASE)).toBe(true);
      expect(existsSync(join(outDir, r.slice(BASE.length)))).toBe(true);
    }
    expect(html).not.toMatch(/(?:src|href)="\/assets\//);
  });

  it("build với base '/' bị kiểm đường dẫn phát hiện sai", () => {
    const problems = pathProblems(badDir);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(/\/assets\//);
  });

  it("chạy bundle đã build trong happy-dom: máy tính và sổ hiện ra", () => {
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, "");
    document.body.innerHTML = body;

    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };
    Object.defineProperty(window, "localStorage", { value: fake, configurable: true });

    const scriptRef = internalRefs(html).find((r) => r.endsWith(".js"))!;
    const js = readFileSync(join(outDir, scriptRef.slice(BASE.length)), "utf8");
    expect(() => (0, eval)(js)).not.toThrow();

    const app = document.querySelector("#app")!;
    expect(app.querySelector('input[name="rent"]')).not.toBeNull();
    expect(app.querySelector("form")).not.toBeNull();
    const ledger = document.querySelector("#ledger")!;
    expect(ledger.children.length).toBeGreaterThan(0);
    expect((ledger.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("tổng gzip JS + CSS <= 100 KB", () => {
    const files = listFiles(outDir).filter((f) => /\.(js|css)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const total = files.reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0);
    expect(total).toBeLessThanOrEqual(102400);
  });

  it("bundle không có API mạng và không có URL lạ (analytics tắt)", () => {
    const files = listFiles(outDir).filter((f) => f.endsWith(".js"));
    const forbidden = ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "new Image"];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const word of forbidden) expect(src.includes(word), `${word} trong ${f}`).toBe(false);
      for (const m of src.matchAll(/https?:\/\/[^\s"'`)\\]+/g)) {
        expect(m[0].startsWith("https://silver-rp.github.io/thue-cho-thue/"), m[0]).toBe(true);
      }
    }
  });
});
