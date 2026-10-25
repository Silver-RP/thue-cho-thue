import { getDeadlines } from "../../src/tax/deadlines";
import { computeAnnual } from "../../src/tax/annual";
import { getRules } from "../../src/rules";

const rules = getRules(2026);

describe("getDeadlines (L7)", () => {
  test("khai 1 lần: một hạn 2027-01-31, không phải 2026-01-31", () => {
    const d = getDeadlines(2026, "once", rules);
    expect(d.map((x) => x.date)).toEqual(["2027-01-31"]);
    expect(d[0].citation).toContain("L7");
  });

  test("khai 2 lần: 2026-07-31 rồi 2027-01-31", () => {
    expect(getDeadlines(2026, "twice", rules).map((x) => x.date)).toEqual(["2026-07-31", "2027-01-31"]);
  });

  test("gọi lặp lại cho kết quả như nhau, năm khác đổi theo năm", () => {
    expect(getDeadlines(2026, "twice", rules)).toEqual(getDeadlines(2026, "twice", rules));
    expect(getDeadlines(2030, "once", rules).map((x) => x.date)).toEqual(["2031-01-31"]);
  });

  test("chế độ không hợp lệ ném lỗi", () => {
    expect(() => getDeadlines(2026, "x" as never, rules)).toThrow();
  });
});

describe("computeAnnual với hạn khai", () => {
  const pay = (contractId: string, amount: number) => ({ contractId, receivedOn: "2026-05-10", amount });

  test("notify_only + twice: chỉ một hạn thông báo doanh thu 2027-01-31 (L2)", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 500_000_000)], filingMode: "twice", rules });
    expect(r.status).toBe("notify_only");
    expect(r.deadlines).toHaveLength(1);
    expect(r.deadlines[0].date).toBe("2027-01-31");
    expect(r.deadlines[0].kind).toBe("revenue_notice");
    expect(r.deadlines[0].citation).toContain("L2");
  });

  test("thiếu filingMode: mặc định khai 1 lần; taxable + twice có hai hạn", () => {
    const once = computeAnnual({ year: 2026, payments: [pay("A", 1_200_000_000)], rules });
    expect(once.deadlines.map((x) => x.date)).toEqual(["2027-01-31"]);
    const twice = computeAnnual({ year: 2026, payments: [pay("A", 1_200_000_000)], filingMode: "twice", rules });
    expect(twice.deadlines.map((x) => x.date)).toEqual(["2026-07-31", "2027-01-31"]);
  });

  test("ca tổng hợp: A 12 × 50tr, B trả trước 1,2 tỷ allocate 2 năm", () => {
    const payments = [
      ...Array.from({ length: 12 }, (_, i) => ({
        contractId: "A",
        receivedOn: `2026-${String(i + 1).padStart(2, "0")}-05`,
        amount: 50_000_000,
      })),
      {
        contractId: "B",
        receivedOn: "2026-01-10",
        amount: 1_200_000_000,
        prepaid: { years: 2, mode: "allocate" as const },
      },
    ];
    const r = computeAnnual({ year: 2026, payments, deductionOrder: ["B"], filingMode: "once", rules });
    const c = (id: string) => r.contracts.find((x) => x.contractId === id)!;
    expect(c("A").revenue).toBe(600_000_000);
    expect(c("B").revenue).toBe(600_000_000);
    expect(c("B").deduction).toBe(600_000_000);
    expect(c("A").deduction).toBe(400_000_000);
    expect(r.totalPit).toBe(10_000_000);
    expect(r.totalVat).toBe(60_000_000);
    expect(r.deadlines.map((x) => x.date)).toEqual(["2027-01-31"]);
  });
});
