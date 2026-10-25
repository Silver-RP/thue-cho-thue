import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { calculate, type CalcForm } from "../../src/ui/calculator";

const base: CalcForm = { year: 2026, rentPerPeriod: 100_000_000, periodsInYear: 12, filingMode: "once" };

describe("calculate", () => {
  it("năm chưa có luật: lỗi tiếng Việt chứa năm, không có result", () => {
    const r = calculate({ ...base, year: 2025 });
    expect(r.error).toContain("2025");
    expect(r.result).toBeUndefined();
    expect(r.steps).toEqual([]);
  });

  it("năm 2026 dùng luật 2026, gọi lặp lại không rò trạng thái", () => {
    const a = calculate(base);
    const b = calculate(base);
    expect(a.error).toBeUndefined();
    expect(a.result?.year).toBe(2026);
    expect(a.result?.citations.pit).toBe(rules2026.citations.pit);
    expect(b).toEqual(a);
  });

  it("L3/L4: 100tr x 12 -> taxable, TNCN 10tr, GTGT 60tr, hạn 2027-01-31", () => {
    const r = calculate(base).result!;
    expect(r.status).toBe("taxable");
    expect(r.totalPit).toBe(10_000_000);
    expect(r.totalVat).toBe(60_000_000);
    expect(r.deadlines.map((d) => d.date)).toEqual(["2027-01-31"]);
  });

  it("L2: 50tr x 12 -> notify_only, bước có căn cứ revenueNotice", () => {
    const { result, steps } = calculate({ ...base, rentPerPeriod: 50_000_000 });
    expect(result?.status).toBe("notify_only");
    const s = steps.find((x) => x.text.includes("chỉ thông báo doanh thu"));
    expect(s?.citation).toBe(rules2026.citations.revenueNotice);
  });

  it("L6: trả trước 1,2 tỷ allocate vs lump", () => {
    const prepaid = { amount: 1_200_000_000, years: 2, receivedOn: "2026-01-10" };
    const form = { ...base, rentPerPeriod: 0, periodsInYear: 0 };
    const a = calculate({ ...form, prepaid: { ...prepaid, mode: "allocate" } });
    expect(a.result?.totalRevenue).toBe(600_000_000);
    expect(a.result?.status).toBe("notify_only");
    expect(a.steps[0].text).toContain("600.000.000 đ");
    const l = calculate({ ...form, prepaid: { ...prepaid, mode: "lump" } });
    expect(l.result?.totalRevenue).toBe(1_200_000_000);
    expect(l.result?.totalPit).toBe(10_000_000);
  });

  it("ca 1.200.000.000 tính tay: phần vượt 200.000.000, TNCN 10.000.000 trong bước", () => {
    const { steps } = calculate({ ...base, rentPerPeriod: 100_000_000 });
    const text = steps.map((s) => s.text).join("\n");
    expect(text).toContain("1.200.000.000 đ");
    expect(text).toContain("200.000.000 đ");
    expect(text).toContain("10.000.000 đ");
    expect(text).toContain("60.000.000 đ");
    expect(steps.every((s) => s.citation.length > 0)).toBe(true);
  });

  it("đầu vào xấu trả lỗi chứ không ném", () => {
    expect(calculate({ ...base, periodsInYear: -1 }).error).toBeTruthy();
    expect(calculate({ ...base, periodsInYear: 1.5 }).error).toBeTruthy();
    expect(calculate({ ...base, rentPerPeriod: Number.MAX_SAFE_INTEGER }).error).toBeTruthy();
    expect(calculate({ ...base, rentPerPeriod: 0, periodsInYear: 0 }).result?.totalRevenue).toBe(0);
    const bad = calculate({ ...base, prepaid: { amount: 1, years: 0, mode: "allocate", receivedOn: "2026-01-10" } });
    expect(bad.error).toBeTruthy();
  });
});

describe("src/ui không chứa số luật", () => {
  const dir = join(__dirname, "../../src/ui");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("không có hằng số luật", () => {
    for (const f of files) {
      const t = readFileSync(join(dir, f), "utf8");
      for (const bad of ["1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"]) {
        expect(t.includes(bad), `${f} chứa ${bad}`).toBe(false);
      }
    }
  });
  it("calculator.ts import computeAnnual", () => {
    expect(readFileSync(join(dir, "calculator.ts"), "utf8")).toMatch(/import[^;]*computeAnnual/);
  });
});
