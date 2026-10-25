/// <reference types="vite/client" />
import { getRules } from "../../src/rules";

describe("getRules", () => {
  test("2026: ngưỡng 1 tỷ, TNCN 500, GTGT 500 chưa xác nhận", () => {
    const r = getRules(2026);
    expect(r.threshold).toBe(1000000000);
    expect(r.pit.rateBps).toBe(500);
    expect(r.vat.rateBps).toBe(500);
    expect(r.vat.unconfirmed).toBe(true);
    expect(r.vat.base).toBe("full");
  });

  test("2026: hạn 31/7 năm tính thuế và 31/01 năm sau", () => {
    const d = getRules(2026).deadlines;
    expect(d.once).toEqual([{ month: 1, day: 31, yearOffset: 1 }]);
    expect(d.twice).toEqual([
      { month: 7, day: 31, yearOffset: 0 },
      { month: 1, day: 31, yearOffset: 1 },
    ]);
  });

  test("năm chưa có ném lỗi nêu năm; gọi lặp vẫn ổn", () => {
    expect(() => getRules(2025)).toThrow(/2025/);
    expect(() => getRules(2025)).toThrow(/2025/);
    expect(getRules(2026)).toBe(getRules(2026));
  });

  test("tên thuộc tính kế thừa không phải năm hợp lệ", () => {
    expect(() => getRules(NaN)).toThrow(/NaN/);
  });

  test("rateBps và threshold là số nguyên dương", () => {
    const r = getRules(2026);
    for (const v of [r.threshold, r.pit.rateBps, r.vat.rateBps]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  test("mỗi căn cứ không rỗng và nêu tên văn bản", () => {
    const c = getRules(2026).citations;
    const keys = Object.keys(c);
    expect(keys.sort()).toEqual(
      ["deadline", "deduction", "pit", "revenue", "revenueNotice", "threshold", "vat"].sort(),
    );
    for (const k of keys) {
      const s = (c as unknown as Record<string, string>)[k];
      expect(s.trim().length).toBeGreaterThan(0);
      expect(/NĐ|Luật/.test(s)).toBe(true);
    }
  });
});

describe("src/tax không chứa số luật", () => {
  const forbidden = ["1000000000", "1_000_000_000", "0.05", "07-31", "01-31"];
  const files = import.meta.glob("../../src/tax/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  test("quét mọi file .ts (chạy được cả khi thư mục trống)", () => {
    for (const [f, text] of Object.entries(files)) {
      for (const bad of forbidden) {
        expect(text.includes(bad), `${f} chứa ${bad}`).toBe(false);
      }
    }
  });
});
