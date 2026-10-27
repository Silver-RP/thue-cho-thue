import { computeAnnual } from "../../src/tax/annual";
import type { Payment } from "../../src/tax/revenue";
import { getRules } from "../../src/rules";
import type { TaxRules } from "../../src/rules/types";

const rules = getRules(2026);
const pay = (contractId: string, amount: number): Payment => ({
  contractId,
  receivedOn: "2026-05-10",
  amount,
});
const get = (r: ReturnType<typeof computeAnnual>, id: string) => {
  const c = r.contracts.find((x) => x.contractId === id);
  if (!c) throw new Error(`thiếu hợp đồng ${id}`);
  return c;
};

describe("computeAnnual (L2-L5)", () => {
  test("L2 đúng ngưỡng: notify_only, thuế 0", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 1_000_000_000)], rules });
    expect(r.status).toBe("notify_only");
    expect(r.totalPit).toBe(0);
    expect(r.totalVat).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(get(r, "A").pit).toBe(0);
    expect(get(r, "A").vat).toBe(0);
  });

  test("L2/L3 vượt 1 đồng: taxable, TNCN 0, GTGT full 50.000.000", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 1_000_000_001)], rules });
    expect(r.status).toBe("taxable");
    expect(get(r, "A").deduction).toBe(1_000_000_000);
    expect(get(r, "A").pit).toBe(0);
    expect(get(r, "A").vat).toBe(50_000_000);
    expect(r.totalTax).toBe(50_000_000);
  });

  test("L3/L4 một hợp đồng 1,2 tỷ", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 1_200_000_000)], rules });
    expect(get(r, "A").deduction).toBe(1_000_000_000);
    expect(get(r, "A").pit).toBe(10_000_000);
    expect(get(r, "A").vat).toBe(60_000_000);
    expect(r.totalRevenue).toBe(1_200_000_000);
    expect(r.totalTax).toBe(70_000_000);
  });

  test("L4 hai hợp đồng, deductionOrder A", () => {
    const r = computeAnnual({
      year: 2026,
      payments: [pay("A", 400_000_000), pay("B", 800_000_000)],
      deductionOrder: ["A"],
      rules,
    });
    expect(get(r, "A").deduction).toBe(400_000_000);
    expect(get(r, "A").pit).toBe(0);
    expect(get(r, "B").deduction).toBe(600_000_000);
    expect(get(r, "B").pit).toBe(10_000_000);
    expect(r.totalDeduction).toBe(1_000_000_000);
    expect(r.totalPit).toBe(10_000_000);
  });

  test("L4 đổi thứ tự: B trước", () => {
    const r = computeAnnual({
      year: 2026,
      payments: [pay("A", 400_000_000), pay("B", 800_000_000)],
      deductionOrder: ["B"],
      rules,
    });
    expect(get(r, "B").deduction).toBe(800_000_000);
    expect(get(r, "A").deduction).toBe(200_000_000);
    expect(r.totalPit).toBe(10_000_000);
  });

  test("không deductionOrder: theo thứ tự xuất hiện; id lạ/lặp bị bỏ qua; gọi lặp không rò", () => {
    const input = {
      year: 2026,
      payments: [pay("A", 400_000_000), pay("B", 800_000_000)],
      rules,
    };
    const r1 = computeAnnual(input);
    expect(get(r1, "A").deduction).toBe(400_000_000);
    expect(get(r1, "B").deduction).toBe(600_000_000);
    const r2 = computeAnnual({ ...input, deductionOrder: ["Z", "B", "B"] });
    expect(get(r2, "B").deduction).toBe(800_000_000);
    expect(get(r2, "A").deduction).toBe(200_000_000);
    expect(computeAnnual(input)).toEqual(r1);
  });

  test("0 đồng: không khoản thu", () => {
    const r = computeAnnual({ year: 2026, payments: [], rules });
    expect(r.status).toBe("notify_only");
    expect(r.contracts).toEqual([]);
    expect(r.totalRevenue).toBe(0);
    expect(r.totalDeduction).toBe(0);
    expect(r.totalTax).toBe(0);
  });

  test("L5: vat.base excess cho 1,2 tỷ → GTGT 10.000.000; vatEstimated theo cấu hình", () => {
    const excess: TaxRules = { ...rules, vat: { ...rules.vat, base: "excess" } };
    const r = computeAnnual({ year: 2026, payments: [pay("A", 1_200_000_000)], rules: excess });
    expect(get(r, "A").vat).toBe(10_000_000);
    const base = computeAnnual({ year: 2026, payments: [pay("A", 1_200_000_000)], rules });
    expect(base.vatEstimated).toBe(true);
    const confirmed: TaxRules = { ...rules, vat: { ...rules.vat, unconfirmed: false } };
    expect(computeAnnual({ year: 2026, payments: [], rules: confirmed }).vatEstimated).toBe(false);
  });

  test("căn cứ lấy từ rules.citations", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 1)], rules });
    expect(r.citations.pit).toBe(rules.citations.pit);
    expect(r.citations.vat).toBe(rules.citations.vat);
  });

  test("chỉ tính doanh thu của năm được hỏi", () => {
    const r = computeAnnual({
      year: 2026,
      payments: [pay("A", 1_200_000_000), { contractId: "A", receivedOn: "2027-01-02", amount: 5 }],
      rules,
    });
    expect(r.totalRevenue).toBe(1_200_000_000);
  });
});

describe("computeAnnual: cơ sở tính và nhãn thuế suất (H-51)", () => {
  const p2 = [pay("A", 600_000_010), pay("B", 600_000_010)];

  test("2 hợp đồng 600.000.010 đ: pitBase, vatBase đúng, pit/vat/tổng không đổi", () => {
    const r = computeAnnual({ year: 2026, payments: p2, rules });
    expect(get(r, "A").deduction).toBe(600_000_010);
    expect(get(r, "B").deduction).toBe(399_999_990);
    expect(get(r, "A").pitBase).toBe(0);
    expect(get(r, "B").pitBase).toBe(200_000_020);
    expect(get(r, "A").vatBase).toBe(600_000_010);
    expect(get(r, "B").vatBase).toBe(600_000_010);
    expect(get(r, "A").vat).toBe(30_000_000);
    expect(get(r, "B").vat).toBe(30_000_000);
    expect(get(r, "B").pit).toBe(10_000_001);
    expect(r.totalVat).toBe(60_000_000);
    expect(r.totalPit).toBe(10_000_001);
  });

  test("luật giả vat.base excess: vatBase = doanh thu − được trừ", () => {
    const fake: TaxRules = { ...rules, vat: { ...rules.vat, base: "excess" } };
    const r = computeAnnual({ year: 2026, payments: p2, rules: fake });
    expect(get(r, "A").vatBase).toBe(0);
    expect(get(r, "B").vatBase).toBe(200_000_020);
  });

  test("chưa vượt ngưỡng: cơ sở 0; nhãn vẫn dựng từ cấu hình", () => {
    const r = computeAnnual({ year: 2026, payments: [pay("A", 500_000_000)], rules });
    expect(get(r, "A").pitBase).toBe(0);
    expect(get(r, "A").vatBase).toBe(0);
  });

  test("nhãn phần trăm kiểu Việt Nam dựng từ rateBps, gọi lặp lại như nhau", () => {
    const r = computeAnnual({ year: 2026, payments: p2, rules });
    expect(r.pitRateLabel).toBe("5%");
    expect(r.vatRateLabel).toBe("5%");
    const fake: TaxRules = { ...rules, pit: { rateBps: 850 }, vat: { ...rules.vat, rateBps: 50 } };
    const f = computeAnnual({ year: 2026, payments: p2, rules: fake });
    expect(f.pitRateLabel).toBe("8,5%");
    expect(f.vatRateLabel).toBe("0,5%");
    expect(computeAnnual({ year: 2026, payments: p2, rules }).vatRateLabel).toBe("5%");
  });
});
