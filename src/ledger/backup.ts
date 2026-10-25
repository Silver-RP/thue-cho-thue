import type { Ledger } from "./model";
import { parseLedger, type ParseResult } from "./schema";

export const APP_ID = "thue-cho-thue";

export function exportLedger(ledger: Ledger, today: string): { filename: string; text: string } {
  const body = {
    schemaVersion: ledger.schemaVersion,
    app: APP_ID,
    properties: ledger.properties,
    contracts: ledger.contracts,
    receipts: ledger.receipts,
    deductionChoice: ledger.deductionChoice,
    ...(ledger.filingMode ? { filingMode: ledger.filingMode } : {}),
  };
  return { filename: `${APP_ID}-${today}.json`, text: JSON.stringify(body, null, 2) };
}

/** Chỉ đọc và kiểm; không đụng kho. */
export function importLedger(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "File không phải JSON hợp lệ." };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "File không đúng dạng dữ liệu của ứng dụng." };
  }
  if ((data as { app?: unknown }).app !== APP_ID) {
    return { ok: false, error: "File này không phải do ứng dụng Thuế cho thuê xuất ra." };
  }
  return parseLedger(data);
}
