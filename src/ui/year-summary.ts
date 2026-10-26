import type { Ledger } from "../ledger/model";
import { summarizeYear, type YearSummary } from "../ledger/summary";
import { getRules, type TaxRules } from "../rules";

export type YearSummaryOutcome = { summary: YearSummary } | { error: string; kind: "no-rules" | "amount" };

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
    return { kind: "no-rules", error: `Chưa có quy định thuế cho năm ${year}, nên chưa ${action}.` };
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
