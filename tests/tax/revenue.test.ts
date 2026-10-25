import { annualRevenueByContract, type Payment } from "../../src/tax/revenue";
import { applyRateBps, assertMoney } from "../../src/tax/money";
import { getRules } from "../../src/rules";

const month = (m: number) => `2026-${String(m).padStart(2, "0")}-05`;

describe("doanh thu theo năm nhận tiền (L6)", () => {
  test("12 khoản 15 triệu trong 2026 = 180 triệu; khoản 2027-01-05 không tính", () => {
    const pays: Payment[] = Array.from({ length: 12 }, (_, i) => ({
      contractId: "A",
      receivedOn: month(i + 1),
      amount: 15_000_000,
    }));
    pays.push({ contractId: "A", receivedOn: "2027-01-05", amount: 15_000_000 });
    expect(annualRevenueByContract(pays, 2026).get("A")).toBe(180_000_000);
    expect(annualRevenueByContract(pays, 2027).get("A")).toBe(15_000_000);
  });

  test("trả trước lump: hết vào năm nhận", () => {
    const p: Payment[] = [
      { contractId: "A", receivedOn: "2026-03-01", amount: 600_000_000, prepaid: { years: 3, mode: "lump" } },
    ];
    expect(annualRevenueByContract(p, 2026).get("A")).toBe(600_000_000);
    expect(annualRevenueByContract(p, 2027).get("A")).toBe(0);
  });

  test("trả trước allocate: chia đều, ngoài khoảng là 0", () => {
    const p: Payment[] = [
      { contractId: "A", receivedOn: "2026-03-01", amount: 600_000_000, prepaid: { years: 3, mode: "allocate" } },
    ];
    for (const y of [2026, 2027, 2028]) expect(annualRevenueByContract(p, y).get("A")).toBe(200_000_000);
    expect(annualRevenueByContract(p, 2029).get("A")).toBe(0);
    expect(annualRevenueByContract(p, 2025).get("A")).toBe(0);
  });

  test("allocate không chia hết: dư vào năm đầu, tổng đúng", () => {
    const p: Payment[] = [
      { contractId: "A", receivedOn: "2026-03-01", amount: 100_000_000, prepaid: { years: 3, mode: "allocate" } },
    ];
    const r = [2026, 2027, 2028].map((y) => annualRevenueByContract(p, y).get("A"));
    expect(r).toEqual([33_333_334, 33_333_333, 33_333_333]);
    expect(r[0]! + r[1]! + r[2]!).toBe(100_000_000);
  });

  test("nhiều hợp đồng, rỗng, và gọi lặp không rò trạng thái", () => {
    expect(annualRevenueByContract([], 2026).size).toBe(0);
    const p: Payment[] = [
      { contractId: "B", receivedOn: "2026-01-01", amount: 5 },
      { contractId: "A", receivedOn: "2026-02-01", amount: 7 },
      { contractId: "B", receivedOn: "2026-02-01", amount: 1 },
    ];
    const a = annualRevenueByContract(p, 2026);
    expect([...a.keys()]).toEqual(["B", "A"]);
    expect(a.get("B")).toBe(6);
    expect(annualRevenueByContract(p, 2026).get("B")).toBe(6);
  });

  test("đầu vào sai ném lỗi", () => {
    const base = { contractId: "A", receivedOn: "2026-01-01", amount: 1 };
    expect(() => annualRevenueByContract([{ ...base, amount: -1 }], 2026)).toThrow();
    expect(() => annualRevenueByContract([{ ...base, amount: 1.5 }], 2026)).toThrow();
    expect(() => annualRevenueByContract([{ ...base, receivedOn: "01/01/2026" }], 2026)).toThrow();
    expect(() => annualRevenueByContract([{ ...base, receivedOn: "2026-02-30" }], 2026)).toThrow();
    expect(() =>
      annualRevenueByContract([{ ...base, prepaid: { years: 0, mode: "allocate" } }], 2026),
    ).toThrow();
  });
});

describe("tiền nguyên đồng", () => {
  const rules = getRules(2026);
  test("assertMoney", () => {
    expect(assertMoney(0)).toBe(0);
    expect(() => assertMoney(-1)).toThrow();
    expect(() => assertMoney(1.5)).toThrow();
    expect(() => assertMoney(Number.NaN)).toThrow();
    expect(() => assertMoney(2 ** 60)).toThrow();
  });
  test("applyRateBps làm tròn xuống", () => {
    expect(applyRateBps(1, 500, rules)).toBe(0);
    expect(applyRateBps(199, 500, rules)).toBe(9);
    expect(applyRateBps(200_000_000, 500, rules)).toBe(10_000_000);
    expect(applyRateBps(0, 500, rules)).toBe(0);
  });
});
