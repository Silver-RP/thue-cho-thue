import type { Contract, Ledger, LedgerResult, Property, Receipt } from "./model";

type NewId = () => string;

export interface RemoveOptions {
  cascade?: boolean;
}

const fail = (error: string): { error: string } => ({ error });

/** Ngày YYYY-MM-DD có thật. */
export function isRealDate(value: unknown): value is string {
  const m = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function copy(ledger: Ledger): Ledger {
  return {
    schemaVersion: 1,
    properties: ledger.properties.map((p) => ({ ...p })),
    contracts: ledger.contracts.map((c) => ({ ...c })),
    receipts: ledger.receipts.map((r) => ({ ...r, ...(r.prepaid ? { prepaid: { ...r.prepaid } } : {}) })),
    deductionChoice: { ...ledger.deductionChoice },
    ...(ledger.filingMode ? { filingMode: { ...ledger.filingMode } } : {}),
  };
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function checkProperty(p: Omit<Property, "id">): string | null {
  if (!nonEmpty(p.name)) return "Tên căn không được để trống.";
  if (p.address !== undefined && typeof p.address !== "string") return "Địa chỉ không hợp lệ.";
  return null;
}

function checkContract(l: Ledger, c: Omit<Contract, "id">): string | null {
  if (!l.properties.some((p) => p.id === c.propertyId)) return "Không tìm thấy căn của hợp đồng.";
  if (!nonEmpty(c.tenant)) return "Tên người thuê không được để trống.";
  if (!isRealDate(c.signedOn)) return "Ngày ký không phải ngày có thật (dạng AAAA-MM-DD).";
  if (!isRealDate(c.startOn)) return "Ngày bắt đầu không phải ngày có thật (dạng AAAA-MM-DD).";
  if (c.endOn !== undefined && !isRealDate(c.endOn)) return "Ngày kết thúc không phải ngày có thật (dạng AAAA-MM-DD).";
  return null;
}

function checkReceipt(l: Ledger, r: Omit<Receipt, "id">): string | null {
  if (!l.contracts.some((c) => c.id === r.contractId)) return "Không tìm thấy hợp đồng của kỳ thu.";
  if (!isRealDate(r.receivedOn)) return "Ngày nhận không phải ngày có thật (dạng AAAA-MM-DD).";
  if (!isMoney(r.amount)) return "Số tiền phải là số nguyên đồng không âm.";
  if (r.prepaid !== undefined) {
    const pp = r.prepaid;
    if (!pp || (pp.mode !== "allocate" && pp.mode !== "lump")) return "Kiểu trả trước không hợp lệ.";
    if (!Number.isSafeInteger(pp.years) || pp.years < 1) return "Số năm trả trước phải là số nguyên dương.";
  }
  return null;
}

function dropContractChoices(l: Ledger, ids: Set<string>): void {
  for (const [year, id] of Object.entries(l.deductionChoice)) {
    if (ids.has(id)) delete l.deductionChoice[year];
  }
}

// ---- Căn ----

export function addProperty(ledger: Ledger, input: Omit<Property, "id">, newId: NewId): LedgerResult {
  const err = checkProperty(input);
  if (err) return fail(err);
  const next = copy(ledger);
  next.properties.push({ ...input, id: newId() });
  return next;
}

export function updateProperty(ledger: Ledger, id: string, patch: Partial<Omit<Property, "id">>): LedgerResult {
  const cur = ledger.properties.find((p) => p.id === id);
  if (!cur) return fail("Không tìm thấy căn.");
  const merged = { ...cur, ...patch, id };
  const err = checkProperty(merged);
  if (err) return fail(err);
  const next = copy(ledger);
  next.properties = next.properties.map((p) => (p.id === id ? merged : p));
  return next;
}

export function removeProperty(ledger: Ledger, id: string, opts: RemoveOptions = {}): LedgerResult {
  if (!ledger.properties.some((p) => p.id === id)) return fail("Không tìm thấy căn.");
  const kids = ledger.contracts.filter((c) => c.propertyId === id);
  if (kids.length > 0 && !opts.cascade) {
    return fail("Căn này còn hợp đồng. Xoá hợp đồng trước hoặc xoá kèm toàn bộ hợp đồng và kỳ thu.");
  }
  const next = copy(ledger);
  const gone = new Set(kids.map((c) => c.id));
  next.properties = next.properties.filter((p) => p.id !== id);
  next.contracts = next.contracts.filter((c) => !gone.has(c.id));
  next.receipts = next.receipts.filter((r) => !gone.has(r.contractId));
  dropContractChoices(next, gone);
  return next;
}

// ---- Hợp đồng ----

export function addContract(ledger: Ledger, input: Omit<Contract, "id">, newId: NewId): LedgerResult {
  const err = checkContract(ledger, input);
  if (err) return fail(err);
  const next = copy(ledger);
  next.contracts.push({ ...input, id: newId() });
  return next;
}

export function updateContract(ledger: Ledger, id: string, patch: Partial<Omit<Contract, "id">>): LedgerResult {
  const cur = ledger.contracts.find((c) => c.id === id);
  if (!cur) return fail("Không tìm thấy hợp đồng.");
  const merged: Contract = { ...cur, ...patch, id };
  const err = checkContract(ledger, merged);
  if (err) return fail(err);
  const next = copy(ledger);
  next.contracts = next.contracts.map((c) => (c.id === id ? merged : c));
  return next;
}

export function removeContract(ledger: Ledger, id: string, opts: RemoveOptions = {}): LedgerResult {
  if (!ledger.contracts.some((c) => c.id === id)) return fail("Không tìm thấy hợp đồng.");
  const hasKids = ledger.receipts.some((r) => r.contractId === id);
  if (hasKids && !opts.cascade) {
    return fail("Hợp đồng này còn kỳ thu. Xoá kỳ thu trước hoặc xoá kèm toàn bộ kỳ thu.");
  }
  const next = copy(ledger);
  next.contracts = next.contracts.filter((c) => c.id !== id);
  next.receipts = next.receipts.filter((r) => r.contractId !== id);
  dropContractChoices(next, new Set([id]));
  return next;
}

// ---- Kỳ thu ----

export function addReceipt(ledger: Ledger, input: Omit<Receipt, "id">, newId: NewId): LedgerResult {
  const err = checkReceipt(ledger, input);
  if (err) return fail(err);
  const next = copy(ledger);
  next.receipts.push({ ...input, id: newId() });
  return next;
}

export function updateReceipt(ledger: Ledger, id: string, patch: Partial<Omit<Receipt, "id">>): LedgerResult {
  const cur = ledger.receipts.find((r) => r.id === id);
  if (!cur) return fail("Không tìm thấy kỳ thu.");
  const merged: Receipt = { ...cur, ...patch, id };
  if (merged.prepaid === undefined) delete merged.prepaid;
  const err = checkReceipt(ledger, merged);
  if (err) return fail(err);
  const next = copy(ledger);
  next.receipts = next.receipts.map((r) => (r.id === id ? merged : r));
  return next;
}

export function removeReceipt(ledger: Ledger, id: string): LedgerResult {
  if (!ledger.receipts.some((r) => r.id === id)) return fail("Không tìm thấy kỳ thu.");
  const next = copy(ledger);
  next.receipts = next.receipts.filter((r) => r.id !== id);
  return next;
}

// ---- Chọn hợp đồng trừ ngưỡng ----

export function setDeductionChoice(ledger: Ledger, year: number, contractId: string | null): LedgerResult {
  if (!Number.isSafeInteger(year)) return fail("Năm không hợp lệ.");
  if (contractId !== null && !ledger.contracts.some((c) => c.id === contractId)) {
    return fail("Không tìm thấy hợp đồng được chọn.");
  }
  const next = copy(ledger);
  if (contractId === null) delete next.deductionChoice[String(year)];
  else next.deductionChoice[String(year)] = contractId;
  return next;
}

// ---- Chọn khai 1 lần hoặc 2 lần ----

export function setFilingMode(ledger: Ledger, year: number, mode: "once" | "twice"): LedgerResult {
  if (!Number.isSafeInteger(year) || year < 1000 || year > 9999) return fail("Năm không hợp lệ.");
  if (mode !== "once" && mode !== "twice") return fail("Cách khai phải là khai 1 lần hoặc khai 2 lần.");
  const next = copy(ledger);
  next.filingMode = { ...(next.filingMode ?? {}), [String(year)]: mode };
  return next;
}
