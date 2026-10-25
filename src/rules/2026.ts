import type { TaxRules } from "./types";

export const rules2026: TaxRules = {
  year: 2026,
  threshold: 1_000_000_000,
  pit: { rateBps: 500 },
  vat: { rateBps: 500, base: "full", unconfirmed: true },
  rounding: "floor",
  deadlines: {
    once: [{ month: 1, day: 31, yearOffset: 1 }],
    twice: [
      { month: 7, day: 31, yearOffset: 0 },
      { month: 1, day: 31, yearOffset: 1 },
    ],
    revenueNotice: { month: 1, day: 31, yearOffset: 1 },
  },
  citations: {
    threshold: "NĐ 141 Điều 1 (L1): ngưỡng doanh thu năm 01 tỷ đồng, áp dụng từ 1/1/2026",
    pit: "Luật TNCN 109/2025 Điều 7.4; NĐ 68 Điều 4.4 (L3): TNCN = (doanh thu − ngưỡng) × 5%",
    vat: "NĐ 68 Điều 3.2 (L5); Luật GTGT 48/2024: tỷ lệ 5%, cơ sở tính chưa xác nhận",
    revenue: "NĐ 68 Điều 5.2.đ (L6): doanh thu là tiền thuê trả từng kỳ; trả trước nhiều năm phân bổ hoặc tính một lần",
    deduction: "NĐ 68 Điều 4.4.a (L4): trừ ngưỡng cho một hoặc vài hợp đồng, tổng mức trừ không quá ngưỡng/năm",
    deadline: "NĐ 68 Điều 8.3.d, 8.3.e (L7): khai 2 lần (31/7 và 31/01 năm sau) hoặc 1 lần (31/01 năm sau); hạn nộp tiền bằng hạn nộp hồ sơ",
    revenueNotice: "NĐ 68 Điều 3.1, 4.1, 8.1.a (L2): doanh thu ≤ ngưỡng thì thông báo doanh thu thực tế chậm nhất 31/01 năm sau",
  },
};
