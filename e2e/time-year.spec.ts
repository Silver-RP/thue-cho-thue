import { expect, test, type Page } from "@playwright/test";
import { ledger, monthly, open, openRunning, vnd } from "./helpers";

// Ca thời gian, năm, trả trước, hợp đồng (R11 dev-03). Số so là hằng tính tay từ docs/autodev/CRITICS.md (S15, S16, S18, S20, S21, S22).
// Mỗi ca đọc trong vùng có id/class riêng (#overview, .lg-summary, #deadlines), không đọc cả trang.

const S2 = ledger([
  { property: "Căn A", receipts: monthly(25_000_000) },
  { property: "Căn B", receipts: monthly(45_000_000) },
  { property: "Căn C", receipts: monthly(30_000_000) },
]);

const area = (page: Page) => ({
  overview: page.locator("#overview"),
  summary: page.locator(".lg-summary"),
  due: page.locator("#deadlines"),
});

test("S15: hai người thuê có tháng trống, hợp đồng 1 có ngày kết thúc vẫn đủ kỳ thu, tổng 212.000.000 đ", async ({ page }) => {
  const m = monthly(20_000_000).slice(0, 4);
  const n = monthly(22_000_000).slice(6);
  const book = ledger([
    { property: "Căn A", receipts: m, endOn: "2026-04-30" },
    { property: "Căn A", receipts: n },
  ]);
  await open(page, "2027-01-10", book);
  const { overview, summary } = area(page);
  await expect(summary).toContainText(vnd(212_000_000));
  await expect(summary).toContainText("Chỉ thông báo doanh thu");
  await expect(overview).not.toContainText("Phải nộp khoảng");
  // Một căn, hai hợp đồng: dòng căn và thẻ căn cộng đủ cả hai (80.000.000 + 132.000.000), 10 kỳ thu, không chỉ một nửa.
  await expect(summary.locator("tr[data-property]")).toHaveCount(1);
  await expect(summary.locator("tr[data-property]")).toContainText(vnd(212_000_000));
  await expect(summary.locator("article.lg-card")).toContainText(vnd(212_000_000));
  await expect(summary.locator("article.lg-card")).toContainText("10 kỳ thu");
  // Từng hợp đồng đủ kỳ thu: 4 × 20.000.000 và 6 × 22.000.000.
  await expect(summary.locator("td[data-col=revenue]").filter({ hasText: vnd(80_000_000) })).toHaveCount(1);
  await expect(summary.locator("td[data-col=revenue]").filter({ hasText: vnd(132_000_000) })).toHaveCount(1);
});

test("S16: trả trước 3 năm phân bổ: 2026 là 333.333.334 đ, năm 2027 nói chưa có quy định nhưng hiện phần đã phân bổ", async ({ page }) => {
  const book = ledger([{ property: "Văn phòng", receipts: [["2026-06-15", 1_000_000_000]], prepaid: { years: 3, mode: "allocate" } }]);
  await open(page, "2026-06-20", book);
  const { summary, overview } = area(page);
  await expect(summary).toContainText(vnd(333_333_334));
  await expect(summary).not.toContainText(vnd(333_333_333));
  await expect(summary).not.toContainText(vnd(1_000_000_000));

  await page.locator("#tax-year").selectOption("2027");
  await expect(page.locator("#tax-year")).toHaveValue("2027");
  await expect(overview).toContainText("Chưa có quy định thuế cho năm 2027");
  await expect(overview).toContainText(vnd(333_333_333));
  await expect(overview).not.toContainText(vnd(333_333_334));
  await expect(overview).not.toContainText("Phải nộp khoảng");
});

// S18: S2 chia đều (100.000.000 mỗi tháng), nửa đầu năm 600.000.000, khai 2 lần.
test("S18: khai 2 lần, hạn kỳ 1 là 31/07/2026 và trang không khẳng định kỳ 1 không phải nộp", async ({ page }) => {
  await open(page, "2026-07-20", { ...S2, filingMode: { "2026": "twice" } });
  const { due, overview, summary } = area(page);
  await expect(due).toContainText("31/07/2026");
  await expect(due).toContainText("Còn 11 ngày");
  const all = [await due.innerText(), await overview.innerText(), await summary.innerText()].join("\n");
  expect(all).not.toMatch(/kỳ 1 không phải nộp/i);
  expect(all).not.toMatch(/không phải nộp (thuế )?(ở |cho )?kỳ 1/i);
  // Có nói đến số kỳ 1 thì phải kèm "ước tính" hoặc "chờ xác nhận".
  if (/kỳ 1/i.test(all)) expect(all).toMatch(/ước tính|chờ xác nhận/i);
});

test("S20: nộp muộn 43 ngày: có dòng quá hạn và việc cần làm, không bịa tiền phạt", async ({ page }) => {
  await open(page, "2027-03-15", S2);
  await page.locator("#tax-year").selectOption("2026");
  const { due, overview } = area(page);
  await expect(due).toContainText("Quá hạn 43 ngày");
  await expect(due.locator(".due-todo")).toHaveCount(1);
  for (const box of [due, overview]) {
    await expect(box).not.toContainText("903.000");
    await expect(box).not.toContainText(/tiền phạt\s*[:\d]/i);
  }
  await expect(due).not.toContainText("Còn ");
});

// S21: đồng hồ CHẠY (page.clock.install), tab luôn hiện, không bắn visibilitychange. Chỉ hẹn giờ trong app mới cứu được ca này.
test("S21: tab mở qua 00:00 ngày 01/02/2027: hết 'Hôm nay là hạn' và năm 2026 đã qua hạn", async ({ page }) => {
  await openRunning(page, "2027-01-31T23:50:00+07:00", S2);
  const { due } = area(page);
  await expect(due).toContainText("Hôm nay là hạn");
  expect(await page.evaluate(() => document.visibilityState)).toBe("visible");

  await page.clock.fastForward("15:00");
  expect(await page.evaluate(() => document.visibilityState)).toBe("visible");
  await expect(due).not.toContainText("Hôm nay là hạn");
  await expect(page.locator("#tax-year")).toHaveValue("2027");
  await page.locator("#tax-year").selectOption("2026");
  await expect(due).toContainText(/Mọi hạn của năm 2026 đã qua|đã qua/);
  await expect(due).toContainText("Quá hạn 1 ngày");
});

// S22: kỳ thu 2025 và 2026 cùng trong sổ; tổng 2026 chỉ cộng kỳ 2026.
test("S22: kỳ thu năm 2025 không cộng vào 2026; trang nói app chỉ tính từ năm 2026", async ({ page }) => {
  const book = ledger([
    { property: "Căn A", receipts: [["2025-12-05", 300_000_000], ...monthly(10_000_000).slice(0, 6)] },
  ]);
  await open(page, "2026-11-01", book);
  const { summary, overview } = area(page);
  await expect(page.locator("#tax-year")).toHaveValue("2026");
  await expect(summary).toContainText(vnd(60_000_000));
  await expect(summary).not.toContainText(vnd(360_000_000));
  await expect(summary).not.toContainText(vnd(300_000_000));
  await expect(summary.locator(".since-note")).toContainText(/chỉ tính từ năm 2026/i);
  await expect(overview).not.toContainText("Phải nộp khoảng");
});
