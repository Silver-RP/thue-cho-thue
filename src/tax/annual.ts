import type { CitationMap, TaxRules } from "../rules/types";
import { applyRateBps } from "./money";
import { annualRevenueByContract, type Payment } from "./revenue";

export interface ContractAnnual {
  contractId: string;
  revenue: number;
  /** Mức ngưỡng được trừ cho hợp đồng này */
  deduction: number;
  pit: number;
  vat: number;
}

export interface AnnualResult {
  year: number;
  status: "notify_only" | "taxable";
  contracts: ContractAnnual[];
  totalRevenue: number;
  totalDeduction: number;
  totalPit: number;
  totalVat: number;
  totalTax: number;
  vatEstimated: boolean;
  citations: Pick<CitationMap, "threshold" | "pit" | "vat" | "deduction" | "revenueNotice">;
}

export interface AnnualInput {
  year: number;
  payments: Payment[];
  deductionOrder?: string[];
  rules: TaxRules;
}

export function computeAnnual({ year, payments, deductionOrder, rules }: AnnualInput): AnnualResult {
  const revenue = annualRevenueByContract(payments ?? [], year);
  const ids = [...revenue.keys()];
  const order: string[] = [];
  for (const id of [...(deductionOrder ?? []), ...ids]) {
    if (revenue.has(id) && !order.includes(id)) order.push(id);
  }

  let totalRevenue = 0;
  for (const v of revenue.values()) totalRevenue += v;
  const taxable = totalRevenue > rules.threshold;

  let remaining = rules.threshold;
  const deductions = new Map<string, number>();
  for (const id of order) {
    const d = taxable ? Math.min(revenue.get(id) ?? 0, remaining) : 0;
    deductions.set(id, d);
    remaining -= d;
  }

  const contracts: ContractAnnual[] = ids.map((contractId) => {
    const rev = revenue.get(contractId) ?? 0;
    const deduction = deductions.get(contractId) ?? 0;
    let pit = 0;
    let vat = 0;
    if (taxable) {
      pit = applyRateBps(rev - deduction, rules.pit.rateBps, rules);
      vat = applyRateBps(rules.vat.base === "full" ? rev : rev - deduction, rules.vat.rateBps, rules);
    }
    return { contractId, revenue: rev, deduction, pit, vat };
  });

  const sum = (f: (c: ContractAnnual) => number) => contracts.reduce((s, c) => s + f(c), 0);
  const totalPit = sum((c) => c.pit);
  const totalVat = sum((c) => c.vat);
  const c = rules.citations;
  return {
    year,
    status: taxable ? "taxable" : "notify_only",
    contracts,
    totalRevenue,
    totalDeduction: sum((x) => x.deduction),
    totalPit,
    totalVat,
    totalTax: totalPit + totalVat,
    vatEstimated: rules.vat.unconfirmed,
    citations: {
      threshold: c.threshold,
      pit: c.pit,
      vat: c.vat,
      deduction: c.deduction,
      revenueNotice: c.revenueNotice,
    },
  };
}
