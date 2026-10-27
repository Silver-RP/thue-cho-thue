import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ledger, monthly, open } from "./helpers";

const S2 = ledger([
  { property: "Căn hộ tầng 12 chung cư Sông Hồng", receipts: monthly(25_000_000) },
  { property: "Căn B", receipts: monthly(45_000_000) },
  { property: "Căn C", receipts: monthly(30_000_000) },
]);

const overflow = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [360, 390, 820, 1280]) {
  test(`không cuộn ngang ở ${width}px, sổ trống và sổ S2`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "2027-01-10");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const p2 = await page.context().newPage();
    await p2.setViewportSize({ width, height: 900 });
    await open(p2, "2027-01-10", S2);
    expect(await overflow(p2)).toBeLessThanOrEqual(0);
  });
}

test("S28: 360px, chữ 200% vẫn không cuộn ngang", async ({ page }) => {
  // Lỗi thật lúc dựng khung (27/10): ô chọn năm ở thanh trên tràn 151 px. R11 sửa rồi bỏ dòng này.
  test.fail(true, "R11: .year-picker tràn ngang khi chữ 200%");
  await page.setViewportSize({ width: 360, height: 900 });
  await open(page, "2027-01-10", S2);
  await page.addStyleTag({ content: "html{font-size:200% !important}" });
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

for (const width of [390, 1280]) {
  test(`S28: không lỗi tiếp cận mức nghiêm trọng ở ${width}px`, async ({ page }) => {
    // Lỗi thật lúc dựng khung (27/10): ≤ 760 px nhãn của #tax-year bị display:none nên ô chọn năm không có tên.
    test.fail(width === 390, "R11: select-name, nhãn ô chọn năm bị ẩn hẳn trên điện thoại");
    await page.setViewportSize({ width, height: 900 });
    await open(page, "2027-01-10", S2);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} chỗ`)).toEqual([]);
  });
}
