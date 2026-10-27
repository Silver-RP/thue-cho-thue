import { test } from "@playwright/test";
import { ledger, monthly, open } from "./helpers";

// ui_check (docs/design/RUBRIC.md): chụp 5 trạng thái × 2 khổ vào $SCREENS_DIR. Không đặt biến thì bỏ qua,
// để `yarn -s e2e` thường không ghi file.
const dir = process.env.SCREENS_DIR;

const S2 = ledger([
  { property: "Căn hộ Sông Hồng", receipts: monthly(25_000_000) },
  { property: "Nhà phố Lê Lợi", receipts: monthly(45_000_000) },
  { property: "Phòng trọ Cầu Giấy", receipts: monthly(30_000_000) },
]);
const S1 = ledger([{ property: "Căn hộ Sông Hồng", receipts: monthly(8_000_000) }]);

const states: { name: string; today: string; book?: object; act?: (p: import("@playwright/test").Page) => Promise<void> }[] = [
  { name: "01-so-trong", today: "2027-01-10" },
  { name: "02-vuot-nguong", today: "2027-01-10", book: S2 },
  { name: "03-duoi-nguong", today: "2027-01-10", book: S1 },
  {
    name: "04-tinh-nhanh",
    today: "2027-01-10",
    act: async (p) => {
      await p.locator("#tc1-rent").fill("25000000");
      await p.locator("#tc1-periods").fill("12");
      await p.getByRole("button", { name: "Tính thuế" }).click();
      await p.locator(".calc-card").scrollIntoViewIfNeeded();
    },
  },
  { name: "05-sang-nam-2027", today: "2027-02-01", book: S2 },
];

test.describe("ảnh ui_check", () => {
  test.skip(!dir, "đặt SCREENS_DIR để chụp");
  for (const s of states) {
    for (const width of [390, 1280]) {
      test(`${s.name} ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 800 : 900 });
        await open(page, s.today, s.book);
        if (s.act) await s.act(page);
        // JPEG 70, màn hình đầu + từng khối chính (cả trang cao ~20.000 px, không chấm được bằng mắt);
        // chiều cao trang ghi vào số đo để thấy trang dài ra hay ngắn lại giữa các vòng.
        const shot = { type: "jpeg" as const, quality: 70 };
        const base = `${dir}/${s.name}-${width}`;
        await page.screenshot({ ...shot, path: `${base}-0-dau.jpg` });
        for (const [part, sel] of [["1-tong-quan", "#overview"], ["2-so", "#ledger"], ["3-han", "#deadlines"], ["4-tinh", ".calc-card"]]) {
          const el = page.locator(sel).first();
          if (!(await el.count()) || !(await el.isVisible())) continue;
          // Toạ độ theo trang (boundingBox theo khung nhìn sai khi trang đã cuộn).
          const box = await el.evaluate((e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
          });
          // Khối dài (sổ 36 kỳ thu) chỉ lấy 2.400 px đầu: đủ thấy kiểu trình bày, chiều dài thật đã ở do-dai.tsv.
          const clip = { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 2400) };
          await page.screenshot({ ...shot, path: `${base}-${part}.jpg`, clip, fullPage: true });
        }
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await test.info().attach("height", { body: String(height) });
        const fs = await import("node:fs");
        fs.appendFileSync(`${dir}/do-dai.tsv`, `${s.name}\t${width}\t${height}\n`);
      });
    }
  }
});
