import type { TaxRules } from "../rules/types";

/** Kiểm số tiền: nguyên, không âm, an toàn (đồng). Trả lại chính số đó. */
export function assertMoney(value: number, label = "số tiền"): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} phải là số nguyên đồng không âm: ${String(value)}`);
  }
  return value;
}

/** amount × rateBps / 10000, làm tròn theo rules.rounding; tính bằng BigInt để không lệch. */
export function applyRateBps(
  amount: number,
  rateBps: number,
  rules: Pick<TaxRules, "rounding">,
): number {
  assertMoney(amount);
  if (!Number.isSafeInteger(rateBps) || rateBps < 0) {
    throw new Error(`thuế suất phần vạn phải là số nguyên không âm: ${String(rateBps)}`);
  }
  if (rules.rounding !== "floor") {
    throw new Error(`kiểu làm tròn chưa hỗ trợ: ${String(rules.rounding)}`);
  }
  return Number((BigInt(amount) * BigInt(rateBps)) / 10000n);
}

/** Điểm cơ bản sang nhãn phần trăm kiểu Việt Nam, ví dụ 500 thành "5%", 50 thành "0,5%". */
export function percentLabel(rateBps: number): string {
  if (!Number.isSafeInteger(rateBps) || rateBps < 0) {
    throw new Error(`thuế suất phần vạn phải là số nguyên không âm: ${String(rateBps)}`);
  }
  const whole = Math.floor(rateBps / 100);
  const frac = String(rateBps % 100).padStart(2, "0").replace(/0+$/, "");
  return `${whole}${frac ? "," + frac : ""}%`;
}
