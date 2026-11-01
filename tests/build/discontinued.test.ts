import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("thông báo ngừng cập nhật", () => {
  it("đứng đầu trang, trước thanh trên, nhắc đối chiếu trên eTax", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    const notice = html.indexOf('class="discontinued"');
    expect(notice).toBeGreaterThan(html.indexOf("<body"));
    expect(notice).toBeLessThan(html.indexOf('<header class="topbar"'));
    expect(html).toContain("Dự án đã ngừng cập nhật");
    expect(html.slice(notice, html.indexOf("</p>", notice))).toContain("eTax");
  });
});
