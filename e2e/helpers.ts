import type { Page } from "@playwright/test";

export const LEDGER_KEY = "thue-cho-thue:ledger";

/** Hợp đồng gọn cho kịch bản: mỗi phần tử là một kỳ thu [ngày nhận, số tiền]. */
export interface SeedContract {
  property: string;
  receipts: [string, number][];
  prepaid?: { years: number; mode: "allocate" | "lump" };
  endOn?: string;
}

/** Sổ đúng schema v1 từ danh sách hợp đồng (một căn mỗi hợp đồng, trừ khi trùng tên căn). */
export function ledger(contracts: SeedContract[]) {
  const properties: { id: string; name: string }[] = [];
  const out = { schemaVersion: 1, properties, contracts: [] as object[], receipts: [] as object[], deductionChoice: {} };
  contracts.forEach((c, i) => {
    let prop = properties.find((p) => p.name === c.property);
    if (!prop) {
      prop = { id: `p${properties.length + 1}`, name: c.property };
      properties.push(prop);
    }
    const id = `c${i + 1}`;
    out.contracts.push({ id, propertyId: prop.id, tenant: `Người thuê ${i + 1}`, signedOn: "2026-01-01", startOn: "2026-01-01", ...(c.endOn ? { endOn: c.endOn } : {}) });
    c.receipts.forEach(([receivedOn, amount], j) =>
      out.receipts.push({ id: `${id}-r${j + 1}`, contractId: id, receivedOn, amount, ...(c.prepaid ? { prepaid: c.prepaid } : {}) }),
    );
  });
  return out;
}

/** 12 kỳ thu cùng số tiền, nhận ngày `day` mỗi tháng của `year`. */
export function monthly(amount: number, year = 2026, day = 5): [string, number][] {
  return Array.from({ length: 12 }, (_, i) => [`${year}-${String(i + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, amount]);
}

/** Mở trang với đồng hồ giả (giờ Việt Nam) và sổ đã nạp sẵn. */
export async function open(page: Page, today: string, book?: object) {
  await page.clock.setFixedTime(new Date(`${today}T10:00:00+07:00`));
  if (book) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [LEDGER_KEY, JSON.stringify(book)]);
  await page.goto("");
}

/** Mở trang với đồng hồ CHẠY từ `at` (ISO có +07:00): hẹn giờ trong trang tiến được bằng `page.clock.fastForward`. */
export async function openRunning(page: Page, at: string, book?: object) {
  await page.clock.install({ time: new Date(at) });
  if (book) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [LEDGER_KEY, JSON.stringify(book)]);
  await page.goto("");
}

/** "70.000.000 đ" → 70000000; lấy mọi số tiền trong một đoạn chữ. */
export function amounts(text: string): number[] {
  return [...text.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+)\s*đ/g)].map((m) => Number(m[1].replace(/\./g, "")));
}

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
