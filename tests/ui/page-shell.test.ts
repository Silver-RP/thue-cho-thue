// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
import { rules2026 } from "../../src/rules/2026";
import { startApp } from "../../src/start";
import { emptyLedger } from "../../src/ledger/model";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const css = readFileSync(join(process.cwd(), "src/ui/style.css"), "utf8");

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const start = (extra: Record<string, unknown> = {}) =>
  startApp(document, {
    today: "2026-03-01",
    storage: new FakeStorage(),
    newId: () => "id",
    confirm: () => true,
    download: () => {},
    clock: () => "2026-03-01",
    rules: [{ ...rules2026, year: 2027 }],
    ...extra,
  });

const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) ?? [])[1] ?? "";
const current = (sel: string) => Array.from(document.querySelectorAll<HTMLAnchorElement>(`${sel} a[aria-current="page"]`));
const hashTo = (h: string) => {
  window.location.hash = h;
  window.dispatchEvent(new Event("hashchange"));
};

beforeEach(() => {
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
  window.location.hash = "";
});
afterEach(() => {
  window.location.hash = "";
});

describe("R10 dev-04: một h1 (H-54)", () => {
  it("năm có luật: đúng một h1", () => {
    start();
    expect(document.querySelectorAll("h1").length).toBe(1);
  });

  it("năm chưa có luật (nút Xem năm): vẫn đúng một h1", () => {
    start({ today: "2028-03-01", clock: () => "2028-03-01" });
    expect(document.querySelector('[name="switch-year"]')).not.toBeNull();
    expect(document.querySelectorAll("h1").length).toBe(1);
  });
});

describe("R10 dev-04: hero.owe / hero.safe", () => {
  it("style.css có quy tắc dùng var(-- cho mỗi lớp", () => {
    for (const cls of [".hero.owe", ".hero.safe"]) {
      const rule = new RegExp(`${cls.replace(/\./g, "\\.")}[^{}]*\\{([^}]*)\\}`).exec(css);
      expect(rule, cls).not.toBeNull();
      expect(rule![1]).toContain("var(--");
    }
  });

  it("vượt ngưỡng -> .hero.owe, dưới ngưỡng -> .hero.safe", () => {
    const book = (amount: number) => {
      const l = emptyLedger();
      l.properties.push({ id: "P", name: "A" });
      l.contracts.push({ id: "C", propertyId: "P", tenant: "T", signedOn: "2026-01-01", startOn: "2026-01-01" });
      l.receipts.push({ id: "R", contractId: "C", receivedOn: "2026-02-05", amount });
      return l;
    };
    for (const [amount, cls] of [[1_200_000_000, "owe"], [1_000_000, "safe"]] as const) {
      document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
      const storage = new FakeStorage();
      saveLedger(storage, book(amount));
      start({ storage });
      expect(document.querySelector(`#overview .hero.${cls}`), cls).not.toBeNull();
    }
  });
});

describe("R10 dev-04: aria-current", () => {
  it("mặc định Tổng quan, đúng một liên kết mỗi khối", () => {
    start();
    for (const sel of [".nav", ".tabbar"]) {
      const c = current(sel);
      expect(c.length, sel).toBe(1);
      expect(c[0].getAttribute("href")).toBe("#overview");
    }
  });

  it("hashchange chuyển sang #ledger", () => {
    start();
    hashTo("#ledger");
    for (const sel of [".nav", ".tabbar"]) {
      const c = current(sel);
      expect(c.length, sel).toBe(1);
      expect(c[0].getAttribute("href")).toBe("#ledger");
    }
  });

  it("bấm liên kết chuyển aria-current", () => {
    start();
    document.querySelector<HTMLAnchorElement>('.tabbar a[href="#deadlines"]')!.click();
    expect(current(".tabbar")[0].getAttribute("href")).toBe("#deadlines");
    expect(current(".nav")[0].getAttribute("href")).toBe("#deadlines");
  });

  it("gọi startApp lần hai rồi hashchange: vẫn đúng một liên kết mỗi khối, listener cũ đã gỡ", () => {
    start();
    start();
    hashTo("#deadlines");
    for (const sel of [".nav", ".tabbar"]) {
      const c = current(sel);
      expect(c.length, sel).toBe(1);
      expect(c[0].getAttribute("href")).toBe("#deadlines");
    }
  });

  it("hash lạ -> về Tổng quan", () => {
    start();
    hashTo("#nope");
    expect(current(".nav")[0].getAttribute("href")).toBe("#overview");
  });
});

describe("R10 dev-04: CSS cấu trúc (A1.3)", () => {
  const mediaBlocks = (): { query: string; body: string }[] => {
    const out: { query: string; body: string }[] = [];
    const re = /@media\s*([^{]+)\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      let depth = 1;
      let i = re.lastIndex;
      while (depth > 0 && i < css.length) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
      }
      out.push({ query: m[1].trim(), body: css.slice(re.lastIndex, i - 1) });
    }
    return out;
  };

  it("có @media phủ 761-1090 px với quy tắc cho .side", () => {
    const hit = mediaBlocks().find((b) => /min-width:\s*761px/.test(b.query) && /max-width:\s*1090px/.test(b.query));
    expect(hit).toBeDefined();
    expect(hit!.body).toMatch(/\.side\b/);
  });

  it("mục neo có scroll-margin-top", () => {
    for (const id of ["overview", "ledger", "deadlines", "app"]) {
      expect(css, id).toMatch(new RegExp(`#${id}\\b[^{}]*\\{[^}]*scroll-margin-top`));
    }
  });

  it("R11 dev-01: khối ≤ 760px không display:none cho .year-picker label; nhãn for=tax-year có trong DOM", () => {
    const hit = mediaBlocks().find((b) => /max-width:\s*760px/.test(b.query));
    expect(hit).toBeDefined();
    const rule = /\.year-picker label\s*\{([^}]*)\}/.exec(hit!.body);
    expect(rule).not.toBeNull();
    expect(rule![1]).not.toMatch(/display:\s*none/);
    start();
    const label = document.querySelector('label[for="tax-year"]');
    expect(label?.textContent).toBe("Năm tính thuế");
  });

  it("khối .lg-backup* không có màu cứng", () => {
    const re = /([^{}]*\.lg-backup[^{}]*)\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(css))) {
      n++;
      expect(m[2], m[1]).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(/);
    }
    expect(n).toBeGreaterThan(0);
  });
});
