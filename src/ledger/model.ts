export interface Property {
  id: string;
  name: string;
  address?: string;
}

export interface Contract {
  id: string;
  propertyId: string;
  tenant: string;
  /** Ngày ký, YYYY-MM-DD (chỉ để tra cứu, không dùng tính doanh thu) */
  signedOn: string;
  /** Ngày bắt đầu, YYYY-MM-DD (chỉ để tra cứu) */
  startOn: string;
  endOn?: string;
}

export interface Receipt {
  id: string;
  contractId: string;
  /** Ngày nhận tiền, YYYY-MM-DD */
  receivedOn: string;
  /** Đồng, số nguyên an toàn không âm */
  amount: number;
  prepaid?: { years: number; mode: "allocate" | "lump" };
}

export interface Ledger {
  schemaVersion: 1;
  properties: Property[];
  contracts: Contract[];
  receipts: Receipt[];
  /** Khoá là năm (chuỗi), giá trị là id hợp đồng được trừ ngưỡng trước */
  deductionChoice: Record<string, string>;
}

export interface LedgerError {
  error: string;
}

export type LedgerResult = Ledger | LedgerError;

export function emptyLedger(): Ledger {
  return { schemaVersion: 1, properties: [], contracts: [], receipts: [], deductionChoice: {} };
}

export function isLedgerError(r: LedgerResult): r is LedgerError {
  return typeof (r as LedgerError).error === "string";
}
