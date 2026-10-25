import { assertMoney } from "./money";

export interface Prepaid {
  years: number;
  mode: "allocate" | "lump";
}

export interface Payment {
  contractId: string;
  /** Ngày nhận, YYYY-MM-DD */
  receivedOn: string;
  amount: number;
  prepaid?: Prepaid;
}

/** Trả về năm của ngày YYYY-MM-DD hợp lệ, nếu không thì ném lỗi. */
export function parseYear(receivedOn: string): number {
  const m = typeof receivedOn === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(receivedOn) : null;
  if (!m) throw new Error(`receivedOn phải có dạng YYYY-MM-DD: ${String(receivedOn)}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error(`receivedOn không phải ngày có thật: ${receivedOn}`);
  }
  return y;
}

/** Phần doanh thu của một khoản thu rơi vào `year`. */
function shareInYear(p: Payment, year: number): number {
  const startYear = parseYear(p.receivedOn);
  assertMoney(p.amount);
  const pre = p.prepaid;
  if (!pre || pre.mode === "lump") {
    if (pre && pre.mode !== "lump") throw new Error(`mode không hợp lệ: ${String(pre.mode)}`);
    if (pre && (!Number.isSafeInteger(pre.years) || pre.years < 1)) {
      throw new Error(`years phải là số nguyên dương: ${String(pre.years)}`);
    }
    return startYear === year ? p.amount : 0;
  }
  if (pre.mode !== "allocate") throw new Error(`mode không hợp lệ: ${String(pre.mode)}`);
  if (!Number.isSafeInteger(pre.years) || pre.years < 1) {
    throw new Error(`years phải là số nguyên dương: ${String(pre.years)}`);
  }
  if (year < startYear || year >= startYear + pre.years) return 0;
  const base = Math.floor(p.amount / pre.years);
  const remainder = p.amount - base * pre.years;
  return year === startYear ? base + remainder : base;
}

/**
 * Doanh thu của `year` cho từng hợp đồng (thứ tự xuất hiện được giữ;
 * hợp đồng không có doanh thu trong năm vẫn có mục với 0).
 */
export function annualRevenueByContract(payments: Payment[], year: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of payments ?? []) {
    const share = shareInYear(p, year);
    out.set(p.contractId, (out.get(p.contractId) ?? 0) + share);
  }
  return out;
}
