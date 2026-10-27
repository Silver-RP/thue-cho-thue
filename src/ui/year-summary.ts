import type { Ledger } from "../ledger/model";
import { ledgerToPayments, summarizeYear, type YearSummary } from "../ledger/summary";
import { annualRevenueByContract } from "../tax/revenue";
import { getRules, type TaxRules } from "../rules";

export type YearSummaryOutcome =
  | { summary: YearSummary }
  /** `allocated`: doanh thu sổ đã phân bổ cho năm chưa có quy định (chỉ có khi lớn hơn 0); chưa tính thuế. */
  | { error: string; kind: "no-rules" | "amount"; allocated?: number };

/** Doanh thu của năm theo sổ, không cần luật; 0 nếu số tiền không đọc được. */
function allocatedRevenue(ledger: Ledger, year: number): number {
  try {
    let sum = 0;
    for (const v of annualRevenueByContract(ledgerToPayments(ledger), year).values()) sum += v;
    return Number.isSafeInteger(sum) ? sum : 0;
  } catch {
    return 0;
  }
}

/**
 * Tính tổng năm và phân biệt hai loại lỗi bằng cách hỏi luật trước,
 * không dựa vào nội dung câu lỗi của engine thuế.
 */
export function summarizeYearSafe(ledger: Ledger, year: number, rules?: TaxRules, action = "tính được thuế"): YearSummaryOutcome {
  let resolved: TaxRules;
  try {
    resolved = rules ?? getRules(year);
    if (resolved.year !== year) throw new Error("year");
  } catch {
    const allocated = allocatedRevenue(ledger, year);
    return {
      kind: "no-rules",
      error: `Chưa có quy định thuế cho năm ${year}, nên chưa ${action}.`,
      ...(allocated > 0 ? { allocated } : {}),
    };
  }
  try {
    return { summary: summarizeYear(ledger, year, resolved) };
  } catch {
    return {
      kind: "amount",
      error: `Số tiền trong sổ năm ${year} quá lớn hoặc không hợp lệ nên chưa ${action}. Hãy xem lại các kỳ thu và sửa số tiền.`,
    };
  }
}
