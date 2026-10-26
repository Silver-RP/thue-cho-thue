import { emptyLedger, type Ledger } from "./model";
import { parseLedger } from "./schema";

export const LEDGER_KEY = "thue-cho-thue:ledger";
export const BACKUP_KEY = "thue-cho-thue:ledger:backup";

export const BACKUP_KEY_2 = "thue-cho-thue:ledger:backup:2";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  ledger: Ledger;
  error?: string;
  /** Khoá chính có dữ liệu mà không đọc được (hỏng, sai cấu trúc, phiên bản lạ, hoặc đọc kho lỗi). */
  locked?: boolean;
  /** Chuỗi gốc của khoá chính khi `locked` (không có nếu đọc kho lỗi). */
  raw?: string;
}

/**
 * Bảo đảm `raw` còn đọc được ở khoá dự phòng trước khi khoá chính bị thay.
 * Dự phòng trống hoặc đã giữ đúng chuỗi → dùng nó; đang giữ chuỗi khác → dùng khoá dự phòng thứ hai.
 */
export function preserveRaw(storage: StorageLike, raw: string): boolean {
  try {
    for (const key of [BACKUP_KEY, BACKUP_KEY_2]) {
      const cur = storage.getItem(key);
      if (cur === raw) return true;
      if (cur === null || key === BACKUP_KEY_2) {
        storage.setItem(key, raw);
        return storage.getItem(key) === raw;
      }
    }
  } catch {
    return false;
  }
  return false;
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
    return { ledger: emptyLedger(), error: "Không đọc được kho lưu trữ của trình duyệt.", locked: true };
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
  return { ledger: emptyLedger(), error, locked: true, raw };
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
