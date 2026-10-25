import { describe, expect, it } from "vitest";
import { formatVnd, parseVnd } from "../../src/ui/money";

describe("parseVnd", () => {
  it.each(["12.000.000", "12,000,000", "12 000 000", "12000000", " 12.000.000 đ ", "12.000.000₫", "12.000.000 VNĐ", "12000000đ"])(
    "đọc %j ra 12000000",
    (text) => {
      expect(parseVnd(text)).toEqual({ ok: true, value: 12000000 });
    },
  );

  it("1.000.000.001 ra 1000000001; 0 ra 0", () => {
    expect(parseVnd("1.000.000.001")).toEqual({ ok: true, value: 1000000001 });
    expect(parseVnd("0")).toEqual({ ok: true, value: 0 });
  });

  it.each(["", "   ", "abc", "-5.000", "12.5", "1.2345", "12.000,5", "99999999999999999", "1.000,000", "đ", "12..000"])(
    "từ chối %j có thông báo, không ra 0 hay 12",
    (text) => {
      const r = parseVnd(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
      expect(r).not.toHaveProperty("value");
    },
  );

  it("gọi lặp lại cho cùng kết quả, không ném lỗi với đầu vào lạ", () => {
    expect(parseVnd("12.000.000")).toEqual(parseVnd("12.000.000"));
    expect(() => parseVnd(undefined as unknown as string)).not.toThrow();
    expect(parseVnd(undefined as unknown as string).ok).toBe(false);
  });
});

describe("formatVnd", () => {
  it("định dạng có dấu chấm và đ", () => {
    expect(formatVnd(10000000)).toBe("10.000.000 đ");
    expect(formatVnd(0)).toBe("0 đ");
    expect(formatVnd(1000000001)).toBe("1.000.000.001 đ");
    expect(formatVnd(999)).toBe("999 đ");
  });
});
