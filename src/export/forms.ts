import type { ContractAnnual } from "../tax/annual";
import type { Contract, Ledger, Property } from "../ledger/model";
import type { YearSummary } from "../ledger/summary";

export interface FormContext {
  ledger: Ledger;
}

export interface AnnexContext extends FormContext {
  contract?: Contract;
  property?: Property;
  year: number;
}

export interface FormField {
  /** Mã chỉ tiêu; null khi chưa xác nhận (không bịa mã) */
  code: string | null;
  label: string;
  /** Dòng này gồm/là thuế GTGT: gắn nhãn "ước tính" khi luật GTGT chưa xác nhận */
  vat?: boolean;
  value: (s: YearSummary, ctx: FormContext) => number | string;
}

export interface AnnexColumn {
  code: string | null;
  label: string;
  vat?: boolean;
  value: (c: ContractAnnual, ctx: AnnexContext) => number | string;
}

export interface FormConfig {
  id: string;
  name: string;
  source: string;
  confirmed: boolean;
  fields: FormField[];
  annexName: string;
  annexColumns: AnnexColumn[];
}

const period = (s: YearSummary) => `Năm ${s.year}`;

export const form01TTS: FormConfig = {
  id: "01/TTS",
  name: "Tờ khai thuế đối với cá nhân cho thuê tài sản (mẫu 01/TTS)",
  source: "Mẫu 01/TTS và phụ lục 01-1/BK-TTS theo thông tư hướng dẫn quản lý thuế (chưa đối chiếu bản chính thức)",
  confirmed: false,
  fields: [
    { code: null, label: "Kỳ tính thuế", value: period },
    { code: null, label: "Tổng doanh thu", value: (s) => s.totalRevenue },
    { code: null, label: "Mức doanh thu được trừ ngưỡng", value: (s) => s.totalDeduction },
    { code: null, label: "Thuế GTGT", vat: true, value: (s) => s.totalVat },
    { code: null, label: "Thuế TNCN", value: (s) => s.totalPit },
    { code: null, label: "Tổng số thuế phải nộp", vat: true, value: (s) => s.totalTax },
  ],
  annexName: "Phụ lục 01-1/BK-TTS (mỗi hợp đồng một dòng)",
  annexColumns: [
    { code: null, label: "Bên thuê", value: (_c, x) => x.contract?.tenant ?? "" },
    { code: null, label: "Căn/địa chỉ", value: (_c, x) => [x.property?.name, x.property?.address].filter(Boolean).join(" - ") },
    { code: null, label: "Ngày bắt đầu", value: (_c, x) => x.contract?.startOn ?? "" },
    { code: null, label: "Ngày kết thúc", value: (_c, x) => x.contract?.endOn ?? "" },
    { code: null, label: "Doanh thu năm", value: (c) => c.revenue },
    { code: null, label: "Mức trừ ngưỡng", value: (c) => c.deduction },
    { code: null, label: "Thuế GTGT", vat: true, value: (c) => c.vat },
    { code: null, label: "Thuế TNCN", value: (c) => c.pit },
  ],
};
