import { getRules } from "../rules";
import { computeAnnual, type AnnualResult } from "../tax/annual";
import type { FilingMode } from "../tax/deadlines";
import type { Payment } from "../tax/revenue";
import { formatVnd } from "./money";

export interface PrepaidForm {
  amount: number;
  years: number;
  mode: "allocate" | "lump";
  /** YYYY-MM-DD */
  receivedOn: string;
}

export interface CalcForm {
  year: number;
  rentPerPeriod: number;
  periodsInYear: number;
  prepaid?: PrepaidForm;
  filingMode: FilingMode;
}

export interface Step {
  key: "revenue" | "threshold" | "excess" | "pit" | "vat" | "deadline";
  text: string;
  citation: string;
}

export interface CalcOutput {
  result?: AnnualResult;
  steps: Step[];
  error?: string;
}

const CONTRACT_ID = "hop-dong";
const fail = (error: string): CalcOutput => ({ steps: [], error });

function buildPayments(form: CalcForm): Payment[] | string {
  const { rentPerPeriod, periodsInYear, prepaid, year } = form;
  if (!Number.isSafeInteger(periodsInYear) || periodsInYear < 0) {
    return "Số kỳ nhận trong năm phải là số nguyên không âm.";
  }
  if (!Number.isSafeInteger(rentPerPeriod) || rentPerPeriod < 0) {
    return "Tiền thuê mỗi kỳ phải là số nguyên đồng không âm.";
  }
  if (!Number.isSafeInteger(rentPerPeriod * periodsInYear)) {
    return "Tổng tiền thuê trong năm quá lớn.";
  }
  const payments: Payment[] = [];
  for (let i = 0; i < periodsInYear; i++) {
    const month = String(Math.min(i, 11) + 1).padStart(2, "0");
    payments.push({ contractId: CONTRACT_ID, receivedOn: `${year}-${month}-01`, amount: rentPerPeriod });
  }
  if (prepaid) {
    if (!Number.isSafeInteger(prepaid.years) || prepaid.years < 1) {
      return "Số năm trả trước phải là số nguyên dương.";
    }
    if (!Number.isSafeInteger(prepaid.amount) || prepaid.amount < 0) {
      return "Số tiền trả trước phải là số nguyên đồng không âm.";
    }
    payments.push({
      contractId: CONTRACT_ID,
      receivedOn: prepaid.receivedOn,
      amount: prepaid.amount,
      prepaid: { years: prepaid.years, mode: prepaid.mode },
    });
  }
  return payments;
}

function buildSteps(result: AnnualResult, threshold: number, revenueCitation: string): Step[] {
  const c = result.citations;
  const steps: Step[] = [
    { key: "revenue", text: `Doanh thu cho thuê năm ${result.year}: ${formatVnd(result.totalRevenue)}.`, citation: revenueCitation },
  ];
  if (result.status === "notify_only") {
    steps.push({
      key: "threshold",
      text: `Doanh thu ${formatVnd(result.totalRevenue)} không vượt ngưỡng ${formatVnd(threshold)}: chỉ thông báo doanh thu, chưa phải nộp thuế.`,
      citation: c.revenueNotice,
    });
  } else {
    steps.push({
      key: "threshold",
      text: `Doanh thu ${formatVnd(result.totalRevenue)} vượt ngưỡng ${formatVnd(threshold)}.`,
      citation: c.threshold,
    });
    steps.push({
      key: "excess",
      text: `Phần doanh thu vượt ngưỡng (đã trừ ${formatVnd(result.totalDeduction)}): ${formatVnd(result.totalRevenue - result.totalDeduction)}.`,
      citation: c.deduction,
    });
    steps.push({ key: "pit", text: `Thuế TNCN: ${formatVnd(result.totalPit)}.`, citation: c.pit });
    steps.push({
      key: "vat",
      text: `Thuế GTGT${result.vatEstimated ? " (ước tính)" : ""}: ${formatVnd(result.totalVat)}.`,
      citation: c.vat,
    });
  }
  for (const d of result.deadlines) {
    const [y, m, day] = d.date.split("-");
    const label = d.kind === "revenue_notice" ? "Hạn thông báo doanh thu" : "Hạn khai và nộp thuế";
    steps.push({ key: "deadline", text: `${label}: ${day}/${m}/${y}.`, citation: d.citation });
  }
  return steps;
}

/** Dựng đầu vào cho engine, gọi computeAnnual và giải thích từng bước. Không ném lỗi. */
export function calculate(form: CalcForm): CalcOutput {
  try {
    const rules = getRules(form.year);
    const payments = buildPayments(form);
    if (typeof payments === "string") return fail(payments);
    const result = computeAnnual({ year: form.year, payments, filingMode: form.filingMode, rules });
    return { result, steps: buildSteps(result, rules.threshold, rules.citations.revenue) };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Không tính được thuế.");
  }
}
