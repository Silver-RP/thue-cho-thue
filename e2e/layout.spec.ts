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
  await page.setViewportSize({ width: 360, height: 900 });
  await open(page, "2027-01-10", S2);
  await page.addStyleTag({ content: "html{font-size:200% !important}" });
  // Đỏ thì nêu phần tử tràn (font Linux của CI rộng hơn máy dev, khó tái hiện tại chỗ).
  const wide = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .filter((e) => !e.parentElement?.closest(".table-scroll") && (e.getBoundingClientRect().right > innerWidth + 0.5 || (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === "visible")))
      .reverse()
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${e.getAttribute("class") ?? ""} "${(e.textContent ?? "").trim().slice(0, 30)}"`),
  );
  expect(await overflow(page), wide.join(" | ")).toBeLessThanOrEqual(0);
  const sel = page.locator("#tax-year");
  await expect(sel).toBeVisible();
  const box = await sel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  const ox = await page.evaluate(() => [document.documentElement, document.body].map((e) => getComputedStyle(e).overflowX));
  expect(ox).not.toContain("hidden");
  await sel.selectOption("2026");
  await expect(page.locator("#overview")).toContainText("năm 2026");
});

for (const width of [390, 1280]) {
  test(`S28: không lỗi tiếp cận mức nghiêm trọng ở ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "2027-01-10", S2);
    await expect(page.getByRole("combobox", { name: "Năm tính thuế" })).toHaveCount(1);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} chỗ`)).toEqual([]);
  });
}

test("H-67: ở 390px mọi nút đang hiện cao từ 44px, kể cả nhãn chọn tệp", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, "2027-01-10", S2);
  const short = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('button, summary, label[for="lg-import-file"]'))
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ t: (e.textContent ?? "").trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44),
  );
  expect(short).toEqual([]);
});

test("H-61: ở 390px màn hình đầu có số phải nộp và hạn còn bao nhiêu ngày", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, "2027-01-10", S2);
  const due = page.locator("#overview .hero-due");
  await expect(due).toContainText("31/01/2027");
  await expect(due).toContainText("còn 21 ngày");
  const box = await due.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(800);
});

test("S28: 360px, chữ 200% và font rộng (giống CI Linux) vẫn không cuộn ngang", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await open(page, "2027-01-10", S2);
  await page.addStyleTag({ content: "html{font-size:200% !important} *{font-family:Verdana,'DejaVu Sans',sans-serif !important}" });
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("v2: ở 390px ô chọn năm hiện đủ chữ năm chưa có quy định, thanh trên một hàng", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, "2027-02-01", S2);
  const sel = page.locator("#tax-year");
  const fits = await sel.evaluate((s: HTMLSelectElement) => {
    const c = document.createElement("canvas").getContext("2d")!;
    const st = getComputedStyle(s);
    c.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    return c.measureText(s.selectedOptions[0]!.text).width + 24 <= s.clientWidth;
  });
  expect(fits).toBe(true);
  const bar = await page.locator(".topbar").boundingBox();
  expect(bar!.height).toBeLessThanOrEqual(80);
});
