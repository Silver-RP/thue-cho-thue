import { expect, test, type Page } from "@playwright/test";
import { LEDGER_KEY, ledger, open } from "./helpers";

// Ca thao tác qua giao diện (R11 dev-02). Số so là hằng tính tay từ docs/autodev/CRITICS.md (S9, S25).
// Mỗi ca đọc trong vùng có id/class riêng (#overview, .lg-summary, #app .results), không đọc cả trang.

const storedReceipts = (page: Page) =>
  page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? "null")?.receipts ?? []).length as number, LEDGER_KEY);

test("luồng sổ: thêm căn, hợp đồng, kỳ thu bằng giao diện, tải lại vẫn còn", async ({ page }) => {
  // Không addInitScript sổ: sổ trống, mọi thứ nhập bằng fill/click.
  await open(page, "2027-01-10");
  const ledgerBox = page.locator("#ledger");
  await ledgerBox.locator("form.lg-property-add [name=name]").fill("Căn A");
  await ledgerBox.getByRole("button", { name: "Thêm căn" }).click();

  const prop = ledgerBox.locator("section.lg-property");
  await expect(prop).toHaveCount(1);
  await prop.locator("form.lg-contract-add [name=tenant]").fill("Anh Bình");
  await prop.locator("form.lg-contract-add [name=signedOn]").fill("2026-01-01");
  await prop.locator("form.lg-contract-add [name=startOn]").fill("2026-01-01");
  await prop.getByRole("button", { name: "Thêm hợp đồng" }).click();

  const contract = ledgerBox.locator("section.lg-contract");
  await expect(contract).toHaveCount(1);
  await contract.locator("form.lg-receipt-add [name=receivedOn]").fill("2026-03-05");
  await contract.locator("form.lg-receipt-add [name=amount]").fill("8000000");
  await contract.getByRole("button", { name: "Thêm kỳ thu" }).click();

  const summary = page.locator(".lg-summary");
  await expect(summary).toContainText("8.000.000 đ");
  expect(await storedReceipts(page)).toBe(1);

  await page.reload();
  await expect(page.locator(".lg-summary")).toContainText("8.000.000 đ");
  expect(await storedReceipts(page)).toBe(1);
});

// S9: A 700.000.000, B 500.000.000. Chọn B trước: TNCN A 10.000.000, B 0. Chọn A: A 0, B 10.000.000.
test("S9: đổi hợp đồng được trừ ngưỡng từ B sang A, tổng TNCN vẫn 10.000.000", async ({ page }) => {
  const book = ledger([
    { property: "Căn A", receipts: [["2026-06-01", 700_000_000]] },
    { property: "Căn B", receipts: [["2026-06-01", 500_000_000]] },
  ]);
  await open(page, "2027-01-10", book);
  const select = page.locator("#lg-choice-select");
  const pit = (id: string) => page.locator(`.lg-summary .lg-by-contract tbody tr[data-contract="${id}"] td[data-col="pit"]`);

  await select.selectOption({ label: "Căn B - Người thuê 2" });
  await expect(pit("c1")).toHaveText("10.000.000 đ");
  await expect(pit("c2")).toHaveText("0 đ");
  for (const area of [page.locator(".lg-summary"), page.locator("#overview")]) {
    await expect(area).not.toContainText("20.000.000 đ");
  }
  await expect(page.locator(".lg-summary tr", { has: page.locator('th:text-is("Thuế TNCN")') })).toContainText("10.000.000 đ");
  await expect(page.locator(".lg-summary .lg-total-row td[data-col=pit]")).toHaveText("10.000.000 đ");
  await expect(page.locator("#overview")).toContainText("10.000.000 đ");

  await select.selectOption({ label: "Căn A - Người thuê 1" });
  await expect(pit("c1")).toHaveText("0 đ");
  await expect(pit("c2")).toHaveText("10.000.000 đ");
  await expect(page.locator(".lg-summary .lg-total-row td[data-col=pit]")).toHaveText("10.000.000 đ");
  await expect(page.locator("#overview")).toContainText("10.000.000 đ");
  for (const area of [page.locator(".lg-summary"), page.locator("#overview")]) {
    await expect(area).not.toContainText("20.000.000 đ");
  }
});

test("S9: khu chọn trừ ngưỡng nói rõ lựa chọn không đổi tổng tiền phải nộp", async ({ page }) => {
  await open(page, "2027-01-10", ledger([{ property: "Căn A", receipts: [["2026-06-01", 700_000_000]] }]));
  await expect(page.locator(".lg-choice")).toContainText(/không (làm )?đổi tổng/i);
});

// S25: chín chuỗi gõ vào cả máy tính nhanh và ô kỳ thu của sổ; hai chỗ phải cho cùng kết quả.
const STRINGS = [
  { text: "25000000", kind: "ok" },
  { text: "25.000.000", kind: "ok" },
  { text: "25,000,000", kind: "ok" },
  { text: "25 000 000 đ", kind: "ok" },
  { text: "25tr", kind: "either" },
  { text: "1,2 tỷ", kind: "either" },
  { text: "-5000000", kind: "reject" },
  { text: "0", kind: "reject" },
  { text: "9007199254740993", kind: "reject" },
] as const;

type Outcome = { ok: boolean; error: string; shown: string };

async function typeInCalculator(page: Page, text: string): Promise<Outcome> {
  const card = page.locator("#app");
  await card.locator('input[name="rent"]').fill(text);
  await card.locator('input[name="periods"]').fill("1");
  await card.getByRole("button", { name: "Tính thuế" }).click();
  const err = card.locator(".field", { has: page.locator('input[name="rent"]') }).locator(".field-error");
  const hasErr = await err.isVisible();
  return { ok: !hasErr, error: hasErr ? ((await err.textContent()) ?? "") : "", shown: await card.locator(".results").innerText() };
}

async function typeInLedger(page: Page, text: string): Promise<Outcome> {
  const form = page.locator("#ledger form.lg-receipt-add");
  await form.locator("[name=receivedOn]").fill("2026-03-05");
  await form.locator("[name=amount]").fill(text);
  await form.getByRole("button", { name: "Thêm kỳ thu" }).click();
  const err = form.locator(".field", { has: page.locator("[name=amount]") }).locator(".field-error");
  const hasErr = await err.isVisible();
  return { ok: !hasErr, error: hasErr ? ((await err.textContent()) ?? "") : "", shown: await page.locator(".lg-summary").innerText() };
}

for (const { text, kind } of STRINGS) {
  test(`S25: gõ "${text}" vào máy tính nhanh và ô kỳ thu cho cùng kết quả`, async ({ page }) => {
    await open(page, "2027-01-10", ledger([{ property: "Căn A", receipts: [] }]));
    const calc = await typeInCalculator(page, text);
    const led = await typeInLedger(page, text);

    expect(led.ok, `ô kỳ thu: ${led.error}`).toBe(calc.ok);
    for (const o of [calc, led]) {
      // Không lúc nào 25.000.000 thành 25 hay 25.000 đồng ở vùng kết quả.
      expect(o.shown).not.toMatch(/(^|[^\d.,])25(\.000)? đ/);
      if (!o.ok) expect(o.error.length).toBeGreaterThan(10);
    }
    const saved = await storedReceipts(page);
    if (kind === "reject" || !led.ok) {
      expect(led.ok).toBe(false);
      expect(saved).toBe(0);
    } else {
      expect(saved).toBe(1);
    }
    if (kind === "ok") {
      expect(led.ok).toBe(true);
      await expect(page.locator(".lg-summary")).toContainText("25.000.000 đ");
      expect(calc.shown).toContain("25.000.000 đ");
    }
    if (kind === "either" && led.ok) {
      const expected = text === "25tr" ? "25.000.000 đ" : "1.200.000.000 đ";
      await expect(page.locator(".lg-summary")).toContainText(expected);
    }
  });
}
