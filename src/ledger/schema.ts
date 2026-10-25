import type { Contract, Ledger, Property, Receipt } from "./model";
import { isMoney, isRealDate } from "./ops";

export const CURRENT_VERSION = 1;

/** Nâng dữ liệu từ phiên bản n lên n + 1 (khoá của `Migrations` là n). */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
export type Migrations = Record<number, Migration>;

/** v1 là bản đầu nên chưa có bước nào. */
export const migrations: Migrations = {};

export interface ParseOptions {
  migrations?: Migrations;
  currentVersion?: number;
}

export type ParseResult = { ok: true; ledger: Ledger } | { ok: false; error: string };

const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

function migrate(
  data: Record<string, unknown>,
  steps: Migrations,
  current: number,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const v = data.schemaVersion;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1) {
    return bad("Dữ liệu thiếu hoặc sai số phiên bản của sổ.");
  }
  if (v > current) {
    return bad(`Dữ liệu thuộc phiên bản ${v} mới hơn phiên bản ${current} mà ứng dụng này hiểu. Hãy cập nhật ứng dụng.`);
  }
  let cur = data;
  for (let n = v; n < current; n++) {
    const step = steps[n];
    if (!step) return bad(`Không có cách nâng dữ liệu từ phiên bản ${n} lên ${n + 1}.`);
    try {
      cur = { ...step(cur), schemaVersion: n + 1 };
    } catch {
      return bad(`Nâng dữ liệu từ phiên bản ${n} lên ${n + 1} không thành công.`);
    }
  }
  return { ok: true, data: cur };
}

export function parseLedger(data: unknown, opts: ParseOptions = {}): ParseResult {
  try {
    return parseUnsafe(data, opts);
  } catch {
    return bad("Dữ liệu sổ không đọc được.");
  }
}

function parseUnsafe(data: unknown, opts: ParseOptions): ParseResult {
  if (!isObject(data)) return bad("Dữ liệu sổ phải là một đối tượng, không phải giá trị khác.");
  const current = opts.currentVersion ?? CURRENT_VERSION;
  const m = migrate(data, opts.migrations ?? migrations, current);
  if (!m.ok) return m;
  const d = m.data;

  for (const key of ["properties", "contracts", "receipts"] as const) {
    if (!Array.isArray(d[key])) return bad(`Dữ liệu sổ thiếu danh sách "${key}".`);
  }
  if (!isObject(d.deductionChoice)) return bad("Dữ liệu sổ thiếu phần chọn hợp đồng trừ ngưỡng.");

  const ids = new Set<string>();
  const claimId = (id: unknown, what: string): string | null => {
    if (!nonEmpty(id)) return `Có ${what} thiếu mã.`;
    if (ids.has(id)) return `Mã "${id}" bị trùng.`;
    ids.add(id);
    return null;
  };

  const properties: Property[] = [];
  for (const raw of d.properties as unknown[]) {
    if (!isObject(raw)) return bad("Có căn không đúng dạng.");
    const e = claimId(raw.id, "căn");
    if (e) return bad(e);
    if (!nonEmpty(raw.name)) return bad("Có căn thiếu tên.");
    if (raw.address !== undefined && typeof raw.address !== "string") return bad("Có căn có địa chỉ không hợp lệ.");
    properties.push({
      id: raw.id as string,
      name: raw.name,
      ...(raw.address !== undefined ? { address: raw.address as string } : {}),
    });
  }
  const propIds = new Set(properties.map((p) => p.id));

  const contracts: Contract[] = [];
  for (const raw of d.contracts as unknown[]) {
    if (!isObject(raw)) return bad("Có hợp đồng không đúng dạng.");
    const e = claimId(raw.id, "hợp đồng");
    if (e) return bad(e);
    if (!nonEmpty(raw.propertyId) || !propIds.has(raw.propertyId)) {
      return bad(`Hợp đồng "${String(raw.id)}" trỏ tới căn không có trong sổ.`);
    }
    if (!nonEmpty(raw.tenant)) return bad(`Hợp đồng "${String(raw.id)}" thiếu tên người thuê.`);
    if (!isRealDate(raw.signedOn)) return bad(`Hợp đồng "${String(raw.id)}" có ngày ký không có thật.`);
    if (!isRealDate(raw.startOn)) return bad(`Hợp đồng "${String(raw.id)}" có ngày bắt đầu không có thật.`);
    if (raw.endOn !== undefined && !isRealDate(raw.endOn)) {
      return bad(`Hợp đồng "${String(raw.id)}" có ngày kết thúc không có thật.`);
    }
    contracts.push({
      id: raw.id as string,
      propertyId: raw.propertyId,
      tenant: raw.tenant,
      signedOn: raw.signedOn,
      startOn: raw.startOn,
      ...(raw.endOn !== undefined ? { endOn: raw.endOn as string } : {}),
    });
  }
  const contractIds = new Set(contracts.map((c) => c.id));

  const receipts: Receipt[] = [];
  for (const raw of d.receipts as unknown[]) {
    if (!isObject(raw)) return bad("Có kỳ thu không đúng dạng.");
    const e = claimId(raw.id, "kỳ thu");
    if (e) return bad(e);
    const label = `Kỳ thu "${String(raw.id)}"`;
    if (!nonEmpty(raw.contractId) || !contractIds.has(raw.contractId)) {
      return bad(`${label} trỏ tới hợp đồng không có trong sổ.`);
    }
    if (!isRealDate(raw.receivedOn)) return bad(`${label} có ngày nhận không có thật.`);
    if (!isMoney(raw.amount)) return bad(`${label} có số tiền không phải số nguyên đồng không âm.`);
    let prepaid: Receipt["prepaid"];
    if (raw.prepaid !== undefined) {
      const pp = raw.prepaid;
      if (!isObject(pp) || (pp.mode !== "allocate" && pp.mode !== "lump")) {
        return bad(`${label} có kiểu trả trước không hợp lệ.`);
      }
      if (typeof pp.years !== "number" || !Number.isSafeInteger(pp.years) || pp.years < 1) {
        return bad(`${label} có số năm trả trước không phải số nguyên dương.`);
      }
      prepaid = { years: pp.years, mode: pp.mode };
    }
    receipts.push({
      id: raw.id as string,
      contractId: raw.contractId,
      receivedOn: raw.receivedOn,
      amount: raw.amount,
      ...(prepaid ? { prepaid } : {}),
    });
  }

  const deductionChoice: Record<string, string> = {};
  for (const [year, id] of Object.entries(d.deductionChoice)) {
    if (!/^\d{4}$/.test(year)) return bad(`Năm "${year}" trong phần chọn hợp đồng trừ ngưỡng không hợp lệ.`);
    if (typeof id !== "string" || !contractIds.has(id)) {
      return bad(`Lựa chọn trừ ngưỡng năm ${year} trỏ tới hợp đồng không có trong sổ.`);
    }
    deductionChoice[year] = id;
  }

  return {
    ok: true,
    ledger: { schemaVersion: d.schemaVersion as 1, properties, contracts, receipts, deductionChoice },
  };
}
