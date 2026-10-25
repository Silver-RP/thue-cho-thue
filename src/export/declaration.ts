import type { Ledger } from "../ledger/model";
import type { YearSummary } from "../ledger/summary";
import type { FormConfig } from "./forms";

export type Cell = string | number;
export type Row = Cell[];

export interface Declaration {
  title: string;
  confirmed: boolean;
  notes: string[];
  /** Mỗi dòng: [mã chỉ tiêu hoặc rỗng, tên trường, giá trị] */
  main: Row[];
  annexTitle: string;
  annexHeader: string[];
  annex: Row[];
}

const ESTIMATE = " (ước tính)";

export function buildDeclaration(ledger: Ledger, summary: YearSummary, form: FormConfig): Declaration {
  const ctx = { ledger };
  const est = (vat?: boolean) => (vat && summary.vatEstimated ? ESTIMATE : "");
  const main = form.fields.map((f): Row => [f.code ?? "", f.label + est(f.vat), f.value(summary, ctx)]);

  const contracts = new Map(ledger.contracts.map((c) => [c.id, c]));
  const properties = new Map(ledger.properties.map((p) => [p.id, p]));
  const annex = summary.contracts.map((c): Row => {
    const contract = contracts.get(c.contractId);
    const property = contract ? properties.get(contract.propertyId) : undefined;
    return form.annexColumns.map((col) => col.value(c, { ledger, contract, property, year: summary.year }));
  });

  const notes: string[] = [];
  if (!form.confirmed) {
    notes.push(`Lưu ý: chưa xác nhận mẫu ${form.id}, đối chiếu trên eTax trước khi nộp. Nguồn: ${form.source}.`);
  }
  if (summary.vatEstimated) {
    notes.push("Thuế GTGT là số ước tính vì quy định chưa được xác nhận.");
  }
  return {
    title: `${form.name} - năm ${summary.year}`,
    confirmed: form.confirmed,
    notes,
    main,
    annexTitle: form.annexName,
    annexHeader: form.annexColumns.map((c) => c.label + est(c.vat)),
    annex,
  };
}
