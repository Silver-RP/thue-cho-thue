import { emptyLedger, type Ledger } from "./model";
import { parseLedger } from "./schema";

export const LEDGER_KEY = "thue-cho-thue:ledger";
export const BACKUP_KEY = "thue-cho-thue:ledger:backup";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  ledger: Ledger;
  error?: string;
}

/**
 * Đọc sổ. Khoá rỗng → sổ rỗng. Dữ liệu hỏng hoặc phiên bản lạ → sổ rỗng kèm lỗi,
 * chép nguyên chuỗi cũ sang khoá dự phòng (nếu chưa có) và KHÔNG ghi khoá chính.
 */
export function loadLedger(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(LEDGER_KEY);
  } catch {
    return { ledger: emptyLedger(), error: "Không đọc được kho lưu trữ của trình duyệt." };
  }
  if (raw === null) return { ledger: emptyLedger() };

  let error: string;
  try {
    const parsed = parseLedger(JSON.parse(raw));
    if (parsed.ok) return { ledger: parsed.ledger };
    error = parsed.error;
  } catch {
    error = "Dữ liệu sổ đã lưu bị hỏng, không đọc được.";
  }
  try {
    if (storage.getItem(BACKUP_KEY) === null) storage.setItem(BACKUP_KEY, raw);
  } catch {
    error += " Không chép được bản dự phòng.";
  }
  return { ledger: emptyLedger(), error };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Kiểm rồi mới ghi; sổ không hợp lệ thì không ghi gì. */
export function saveLedger(storage: StorageLike, ledger: Ledger): SaveResult {
  const parsed = parseLedger(ledger);
  if (!parsed.ok) return parsed;
  try {
    storage.setItem(LEDGER_KEY, JSON.stringify(parsed.ledger));
  } catch {
    return { ok: false, error: "Không ghi được vào kho lưu trữ của trình duyệt." };
  }
  return { ok: true };
}
