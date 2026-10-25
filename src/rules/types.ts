export interface Deadline {
  /** Tháng 1-12 */
  month: number;
  day: number;
  /** Độ lệch so với năm tính thuế (0 = chính năm đó, 1 = năm sau) */
  yearOffset: number;
}

export interface CitationMap {
  threshold: string;
  pit: string;
  vat: string;
  revenue: string;
  deduction: string;
  deadline: string;
  revenueNotice: string;
}

export interface TaxRules {
  year: number;
  /** Ngưỡng doanh thu năm, đồng */
  threshold: number;
  pit: { rateBps: number };
  vat: {
    rateBps: number;
    base: "full" | "excess";
    unconfirmed: boolean;
  };
  rounding: "floor";
  deadlines: {
    once: Deadline[];
    twice: Deadline[];
    revenueNotice: Deadline;
  };
  citations: CitationMap;
}
