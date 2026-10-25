import type { Deadline, TaxRules } from "../rules/types";

export type FilingMode = "once" | "twice";

export interface DeadlineItem {
  /** Ngày hạn, YYYY-MM-DD */
  date: string;
  kind: "filing" | "revenue_notice";
  citation: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function toIso(year: number, d: Deadline): string {
  return `${year + d.yearOffset}-${pad(d.month)}-${pad(d.day)}`;
}

function assertYear(year: number): void {
  if (!Number.isSafeInteger(year)) throw new Error(`year không hợp lệ: ${String(year)}`);
}

/** Hạn khai và nộp tiền (cùng ngày) theo lựa chọn khai 1 lần hoặc 2 lần, xếp theo ngày. */
export function getDeadlines(year: number, mode: FilingMode, rules: TaxRules): DeadlineItem[] {
  assertYear(year);
  if (mode !== "once" && mode !== "twice") throw new Error(`filingMode không hợp lệ: ${String(mode)}`);
  return rules.deadlines[mode]
    .map((d) => ({ date: toIso(year, d), kind: "filing" as const, citation: rules.citations.deadline }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Hạn thông báo doanh thu thực tế khi doanh thu không vượt ngưỡng. */
export function getRevenueNoticeDeadline(year: number, rules: TaxRules): DeadlineItem {
  assertYear(year);
  return {
    date: toIso(year, rules.deadlines.revenueNotice),
    kind: "revenue_notice",
    citation: rules.citations.revenueNotice,
  };
}
