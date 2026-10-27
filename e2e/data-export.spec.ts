import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { LEDGER_KEY, ledger, monthly, open } from "./helpers";

// Ca dữ liệu và xuất (R11 dev-04): S23, S24, S27. Số so là hằng tính tay từ docs/autodev/CRITICS.md.

const storedRaw = (page: import("@playwright/test").Page) => page.evaluate((k) => localStorage.getItem(k), LEDGER_KEY);

test("S23: nhập file cũ đè sổ có 2 kỳ thu mới hơn: hỏi nói rõ 2 kỳ thu và Xuất JSON; Huỷ giữ nguyên; Chấp nhận thì thay", async ({ page }) => {
  const fileBook = ledger([{ property: "Căn A", receipts: [["2026-09-05", 10_000_000], ["2026-10-05", 10_000_000]] }]);
  const current = ledger([{ property: "Căn A", receipts: [["2026-09-05", 10_000_000], ["2026-10-05", 10_000_000], ["2026-11-05", 10_000_000], ["2026-11-06", 7_000_000]] }]);
  await open(page, "2026-11-10", current);
  const summary = page.locator(".lg-summary");
  await expect(summary).toContainText("4 kỳ thu");
  const before = await storedRaw(page);

  const messages: string[] = [];
  let answer: "dismiss" | "accept" = "dismiss";
  page.on("dialog", (d) => {
    messages.push(d.message());
    void (answer === "accept" ? d.accept() : d.dismiss());
  });
  const file = { name: "may-a.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fileBook)) };
  await page.locator("#ledger input[name=import]").setInputFiles(file);
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toMatch(/\b2 kỳ thu\b/);
  expect(messages[0]).toContain("Xuất JSON");

  // Huỷ: sổ và kho không đổi.
  await expect(summary).toContainText("4 kỳ thu");
  await expect(summary).not.toContainText("2 kỳ thu");
  expect(await storedRaw(page)).toBe(before);

  // Chấp nhận: sổ thành số của file (2 kỳ thu, 20.000.000 đ).
  answer = "accept";
  await page.locator("#ledger input[name=import]").setInputFiles({ ...file, name: "may-a-2.json" });
  await expect(summary).toContainText("2 kỳ thu");
  await expect(summary).not.toContainText("4 kỳ thu");
  expect(JSON.parse((await storedRaw(page)) ?? "null").receipts).toHaveLength(2);
});

test("S24: localStorage ném lỗi: máy tính nhanh vẫn tính; sổ nói không lưu được và nhắc Xuất JSON; không lỗi trang", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.getItem = boom;
    Storage.prototype.setItem = boom;
  });
  await open(page, "2026-11-10");
  const results = page.locator("#app .results");
  await page.locator('#app input[name="rent"]').fill("25000000");
  await page.locator('#app input[name="periods"]').fill("12");
  await page.locator("#app").getByRole("button", { name: "Tính thuế" }).click();
  await expect(results).toContainText("300.000.000 đ");

  const ledgerBox = page.locator("#ledger");
  await expect(ledgerBox).toContainText(/không lưu được trên trình duyệt này/i);
  await expect(ledgerBox).toContainText("Xuất JSON");
  await expect(ledgerBox).not.toContainText(/đã lưu/i);
  expect(errors).toEqual([]);
});

const S2 = ledger([
  { property: "Căn A", receipts: monthly(25_000_000) },
  { property: "Căn B", receipts: monthly(45_000_000) },
  { property: "Căn C", receipts: monthly(30_000_000) },
]);

test("S27: tải CSV thật: BOM, UTF-8, ô số chỉ chữ số, có 1200000000 và 70000000", async ({ page }) => {
  await open(page, "2027-01-10", S2);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(".lg-export button[name=download-csv]").click()]);
  const bytes = readFileSync((await download.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
  expect(text).toMatch(/[ăâđêôơưáàạ]/i);
  expect(text).not.toContain("�");
  const cells = text.split(/\r\n/).flatMap((l) => l.split(","));
  expect(cells).toContain("1200000000");
  expect(cells).toContain("70000000");
  for (const c of cells) if (/^[\d.,\s]+(đ)?$/.test(c) && c.trim() !== "") expect(c).toMatch(/^\d+$/);
  expect(text).not.toMatch(/\d\.\d{3}/);
  expect(text).not.toMatch(/\d\s*đ/);
});

test("S27: nút Chép dòng tổng thuế: clipboard chỉ chữ số, bằng 70000000, không báo lỗi", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "2027-01-10", S2);
  const exp = page.locator(".lg-export");
  const row = exp.locator("table.export-main tr").filter({ has: page.locator("td button.copy[data-copy='70000000']") });
  await expect(row).toHaveCount(1);
  await row.locator("button.copy").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("70000000");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^\d+$/);
  await expect(exp.locator(".export-error")).toBeHidden();
});
