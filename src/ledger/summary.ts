import { computeAnnual, type AnnualResult } from "../tax/annual";
import type { Payment } from "../tax/revenue";
import { getRules } from "../rules";
import type { TaxRules } from "../rules/types";
import type { Ledger } from "./model";

export interface PropertyRevenue {
  propertyId: string;
  name: string;
  revenue: number;
}

export interface YearSummary extends AnnualResult {
  revenueByProperty: PropertyRevenue[];
  /** Ngày nhận sớm nhất mà tổng các kỳ thu tới ngày đó đã vượt ngưỡng, hoặc null */
  thresholdWarning: { crossedOn: string } | null;
}

export function ledgerToPayments(ledger: Ledger): Payment[] {
  return ledger.receipts.map((r) => ({
    contractId: r.contractId,
    receivedOn: r.receivedOn,
    amount: r.amount,
    ...(r.prepaid ? { prepaid: { ...r.prepaid } } : {}),
  }));
}

function findCrossing(payments: Payment[], year: number, rules: TaxRules, order?: string[]): string | null {
  const dates = new Set<string>([`${year}-01-01`]);
  for (const p of payments) if (p.receivedOn >= `${year}-01-01`) dates.add(p.receivedOn);
  for (const date of [...dates].sort()) {
    const upTo = payments.filter((p) => p.receivedOn <= date);
    if (computeAnnual({ year, payments: upTo, deductionOrder: order, rules }).status === "taxable") return date;
  }
  return null;
}

export function summarizeYear(ledger: Ledger, year: number, rules: TaxRules = getRules(year)): YearSummary {
  if (rules.year !== year) {
    throw new Error(`Luật năm ${rules.year} không dùng để tính năm ${year}`);
  }
  const payments = ledgerToPayments(ledger);
  const choice = ledger.deductionChoice[String(year)];
  const order = choice ? [choice] : undefined;
  const result = computeAnnual({ year, payments, deductionOrder: order, rules });

  const propertyOf = new Map(ledger.contracts.map((c) => [c.id, c.propertyId]));
  const byProp = new Map<string, number>();
  for (const c of result.contracts) {
    const pid = propertyOf.get(c.contractId);
    if (pid === undefined) continue;
    byProp.set(pid, (byProp.get(pid) ?? 0) + c.revenue);
  }
  const revenueByProperty = ledger.properties.map((p) => ({
    propertyId: p.id,
    name: p.name,
    revenue: byProp.get(p.id) ?? 0,
  }));

  const crossedOn = result.status === "taxable" ? findCrossing(payments, year, rules, order) : null;
  return { ...result, revenueByProperty, thresholdWarning: crossedOn ? { crossedOn } : null };
}
