import { expect, test } from "@playwright/test";
import { amounts, ledger, monthly, open, vnd } from "./helpers";

// Kịch bản và số tính tay: docs/autodev/CRITICS.md. Mỗi ca so mọi chỗ hiện số (tổng quan, biên lai, tổng năm, thẻ căn).

const S2 = ledger([
  { property: "Căn A", receipts: monthly(25_000_000) },
  { property: "Căn B", receipts: monthly(45_000_000) },
  { property: "Căn C", receipts: monthly(30_000_000) },
]);

async function texts(page: import("@playwright/test").Page) {
  return {
    overview: await page.locator("#overview").innerText(),
    summary: await page.locator(".lg-summary").innerText(),
    due: await page.locator("#deadlines").innerText(),
  };
}

test("S1: một căn 96 triệu, chỉ thông báo doanh thu, còn 21 ngày", async ({ page }) => {
  await open(page, "2027-01-10", ledger([{ property: "Căn A", receipts: monthly(8_000_000) }]));
  const t = await texts(page);
  expect(t.overview).not.toContain("Phải nộp khoảng");
  expect(t.summary).toContain(vnd(96_000_000));
  expect(t.summary).toContain("Chỉ thông báo doanh thu");
  expect(t.due).toContain("31/01/2027");
  expect(t.due).toContain("Còn 21 ngày");
});

test("S2: ba căn 1,2 tỷ, mọi chỗ ra TNCN 10 triệu, GTGT 60 triệu, tổng 70 triệu", async ({ page }) => {
  await open(page, "2027-01-10", S2);
  const t = await texts(page);
  expect(t.overview).toContain(`Phải nộp khoảng ${vnd(70_000_000)}`);
  expect(t.overview).toContain(`Tổng thuế phải nộp\n${vnd(70_000_000)}`);
  expect(t.summary).toMatch(new RegExp(`Thuế TNCN\\s+${vnd(10_000_000)}`));
  expect(t.summary).toMatch(new RegExp(`Thuế GTGT\\s+${vnd(60_000_000)}`));
  expect(t.summary).toMatch(new RegExp(`Tổng thuế\\s+${vnd(70_000_000)}`));
  // Từng hợp đồng (trừ ngưỡng theo thứ tự A, B, C): GTGT 15 + 27 + 18 triệu, TNCN chỉ ở C.
  const perContract = amounts(t.summary.split("Thuế theo hợp đồng")[1] ?? "");
  for (const n of [15_000_000, 27_000_000, 18_000_000, 10_000_000, 160_000_000]) expect(perContract).toContain(n);
  expect(t.due).toContain("Còn 21 ngày");
});

test("S2b: đúng 1 tỷ sau 10 kỳ thì chưa vượt ngưỡng", async ({ page }) => {
  const ten = (amount: number) => monthly(amount).slice(0, 10);
  await open(page, "2026-10-20", ledger([
    { property: "Căn A", receipts: ten(25_000_000) },
    { property: "Căn B", receipts: ten(45_000_000) },
    { property: "Căn C", receipts: ten(30_000_000) },
  ]));
  const t = await texts(page);
  expect(t.summary).toContain(vnd(1_000_000_000));
  expect(t.summary).toContain("Chỉ thông báo doanh thu");
  expect(t.overview).not.toContain("Phải nộp khoảng");
});

test("S4: vượt 1 đồng thì TNCN 0, GTGT 50 triệu (vách ngưỡng)", async ({ page }) => {
  await open(page, "2027-01-10", ledger([{ property: "Căn A", receipts: [["2026-06-01", 1_000_000_001]] }]));
  const t = await texts(page);
  expect(t.summary).toMatch(new RegExp(`Thuế TNCN\\s+${vnd(0)}`));
  expect(t.summary).toMatch(new RegExp(`Thuế GTGT\\s+${vnd(50_000_000)}`));
  expect(t.overview).toContain(`Phải nộp khoảng ${vnd(50_000_000)}`);
});

test("S10: làm tròn từng hợp đồng, mọi chỗ cùng ra GTGT 49.999.998", async ({ page }) => {
  const c = (p: string) => ({ property: p, receipts: [["2026-03-01", 333_333_334]] as [string, number][] });
  await open(page, "2027-01-10", ledger([c("Căn A"), c("Căn B"), c("Căn C")]));
  const t = await texts(page);
  expect(t.summary).toMatch(new RegExp(`Thuế GTGT\\s+${vnd(49_999_998)}`));
  expect(t.overview).toContain(`Phải nộp khoảng ${vnd(49_999_998)}`);
  expect(t.overview).not.toContain(vnd(50_000_000));
});

test("S11: tiền tháng 12 nhận 03/01 năm sau không tính vào năm 2026", async ({ page }) => {
  const receipts = monthly(85_000_000).slice(0, 11);
  receipts.push(["2027-01-03", 85_000_000]);
  await open(page, "2027-01-10", ledger([{ property: "Căn A", receipts }]));
  const t = await texts(page);
  expect(t.summary).toContain(vnd(935_000_000));
  expect(t.summary).toContain("Chỉ thông báo doanh thu");
});

test("S17: trả trước 1,08 tỷ tính một lần thì nộp 70 triệu, phân bổ thì không phải nộp", async ({ page }) => {
  const other = { property: "Căn B", receipts: monthly(10_000_000) };
  const prepaid = (mode: "allocate" | "lump") => ({
    property: "Văn phòng", receipts: [["2026-03-01", 1_080_000_000]] as [string, number][], prepaid: { years: 3, mode },
  });
  await open(page, "2027-01-10", ledger([prepaid("lump"), other]));
  expect((await texts(page)).overview).toContain(`Phải nộp khoảng ${vnd(70_000_000)}`);

  const page2 = await page.context().newPage();
  await open(page2, "2027-01-10", ledger([prepaid("allocate"), other]));
  const t = await texts(page2);
  expect(t.summary).toContain(vnd(480_000_000));
  expect(t.summary).toContain("Chỉ thông báo doanh thu");
});

test("S19: 01/02/2027 mặc định năm 2027 nhưng vẫn về được 2026 và thấy đã qua hạn", async ({ page }) => {
  await open(page, "2027-02-01", S2);
  const year = page.locator("#tax-year");
  await expect(year).toHaveValue("2027");
  await year.selectOption("2026");
  const t = await texts(page);
  expect(t.summary).toMatch(new RegExp(`Tổng thuế\\s+${vnd(70_000_000)}`));
  expect(t.due).toMatch(/đã qua/i);
});
