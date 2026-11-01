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
  /** Phần mẫu có mà app chưa tính, luôn hiện cùng bảng */
  notes: string[];
  fields: FormField[];
  annexName: string;
  annexColumns: AnnexColumn[];
}

const period = (s: YearSummary) => `Năm ${s.year}`;

export const form01BDS: FormConfig = {
  id: "01/BĐS",
  name: "Thông báo doanh thu/Tờ khai thuế đối với hoạt động cho thuê bất động sản (mẫu 01/BĐS)",
  source: "Đối chiếu mẫu 01/BĐS kèm Thông tư 50/2026/TT-BTC và bảng kê 01/BK-BĐS kèm Thông tư 18/2026/TT-BTC; chưa có kế toán xác nhận",
  confirmed: false,
  notes: [
    "Mẫu này không dùng cho kinh doanh lưu trú. Mẫu có ô số tài khoản hoặc ví điện tử [06], khai khi chưa thông báo với cơ quan thuế.",
    "Đây là số cả năm. Khai 2 lần thì tờ khai tách 6 tháng đầu [01a] và 6 tháng cuối [01b]; app chưa tách.",
    "App chưa có tiền phạt, bồi thường bên cho thuê nhận được (mẫu tính thêm TNCN), tổng giá trị hợp đồng [07] và số thuế TNCN được miễn; có các khoản này thì tự điền thêm.",
  ],
  fields: [
    { code: "[01c]", label: "Kỳ tính thuế", value: period },
    { code: "[10]", label: "Tổng doanh thu phát sinh trong kỳ", value: (s) => s.totalRevenue },
    { code: "[11]", label: "Doanh thu tính thuế TNCN được trừ", value: (s) => s.totalDeduction },
    { code: "[12]", label: "Tổng số thuế GTGT phải nộp", vat: true, value: (s) => s.totalVat },
    { code: "[13]", label: "Tổng số thuế TNCN phát sinh trong kỳ", value: (s) => s.totalPit },
    { code: "[19]", label: "Tổng số thuế còn phải nộp", vat: true, value: (s) => s.totalTax },
  ],
  annexName: "Bảng kê 01/BK-BĐS (mỗi hợp đồng một dòng)",
  annexColumns: [
    { code: null, label: "Bên thuê (để đối chiếu, không có trên mẫu)", value: (_c, x) => x.contract?.tenant ?? "" },
    { code: "[04]", label: "Địa chỉ (xã/phường [05], tỉnh/TP [06] điền riêng)", value: (_c, x) => [x.property?.name, x.property?.address].filter(Boolean).join(" - ") },
    { code: "[08]", label: "Thuê từ ngày", value: (_c, x) => x.contract?.startOn ?? "" },
    { code: "[08]", label: "Thuê đến ngày", value: (_c, x) => x.contract?.endOn ?? "" },
    { code: "[09]", label: "Tổng doanh thu phát sinh trong kỳ", value: (c) => c.revenue },
    { code: "[10]", label: "Doanh thu được trừ", value: (c) => c.deduction },
    { code: "[12]", label: "Số thuế GTGT phải nộp", vat: true, value: (c) => c.vat },
    { code: "[13]", label: "Số thuế TNCN phải nộp", value: (c) => c.pit },
  ],
};
