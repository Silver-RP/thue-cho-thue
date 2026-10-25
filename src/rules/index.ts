import { rules2026 } from "./2026";
import type { TaxRules } from "./types";

export type { TaxRules } from "./types";

const REGISTRY: Record<number, TaxRules> = {
  2026: rules2026,
};

export function getRules(year: number): TaxRules {
  const found = Object.prototype.hasOwnProperty.call(REGISTRY, year)
    ? REGISTRY[year]
    : undefined;
  if (!found) {
    throw new Error(`Chưa có cấu hình luật cho năm ${year}`);
  }
  return found;
}
