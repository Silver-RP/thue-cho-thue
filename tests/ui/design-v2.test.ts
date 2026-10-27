// @vitest-environment happy-dom
// Vòng làm đẹp v2 (docs/screens/v1/score.md): căn cứ gập lại, không tiêu đề trống.
import { beforeEach, describe, expect, it } from "vitest";
import type { StorageLike } from "../../src/ledger/storage";
import { startApp } from "../../src/start";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

beforeEach(() => {
  document.body.innerHTML = '<section id="overview"></section><section id="ledger"></section><section id="app"></section>';
  startApp(document, { today: "2027-01-10", storage: new FakeStorage(), events: new EventTarget(), newId: () => "x", confirm: () => true, download: () => {} });
});

describe("tính nhanh: giải thích và căn cứ gập lại", () => {
  it("các bước nằm trong details đóng, vẫn đủ chữ căn cứ", () => {
    $<HTMLInputElement>("#app [name=rent]").value = "100.000.000";
    $("#app form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const d = $<HTMLDetailsElement>("#app details.calc-steps");
    expect(d.open).toBe(false);
    expect(d.querySelector("summary")!.textContent).toContain("Giải thích từng bước");
    expect(d.querySelector("ol.steps .citation")).not.toBeNull();
  });
});

describe("sổ trống không có tiêu đề trống", () => {
  it("chưa có căn thì không có 'Doanh thu theo căn'", () => {
    const heads = Array.from(document.querySelectorAll("#ledger h3")).map((h) => h.textContent);
    expect(heads).not.toContain("Doanh thu theo căn");
    expect(heads).not.toContain("Thuế theo hợp đồng");
  });
});
