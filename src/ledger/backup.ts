import type { Ledger } from "./model";
import { parseLedger, type ParseResult } from "./schema";

export const APP_ID = "thue-cho-thue";

const REQUIRED_KEYS = ["schemaVersion", "properties", "contracts", "receipts", "deductionChoice"];

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
  const obj = data as Record<string, unknown>;
  // Bản sổ cũ tải từ kho không có `app`: nhận khi đủ các khoá của chuỗi kho.
  const looksLikeLedger = REQUIRED_KEYS.every((k) => k in obj);
  if ("app" in obj ? obj.app !== APP_ID : !looksLikeLedger) {
    return { ok: false, error: "File này không phải do ứng dụng Thuế cho thuê xuất ra." };
  }
  return parseLedger(data);
}
