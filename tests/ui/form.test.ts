// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { mountCalculator } from "../../src/ui/form";

const DISCLAIMER = "Kết quả chỉ để tham khảo, không thay thế tư vấn thuế";
let root: HTMLElement;

const input = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const type = (name: string, v: string) => {
  input(name).value = v;
};
const calc = () => {
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const results = () => root.querySelector(".results")!.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.querySelector("#app")!;
  mountCalculator(root, { year: 2026 });
});

describe("mountCalculator", () => {
  it("mục 1: nhãn tiếng Việt liên kết label[for] -> id, ô tiền inputmode numeric", () => {
    const labels = Array.from(root.querySelectorAll("label[for]"));
    expect(labels.length).toBeGreaterThanOrEqual(7);
    for (const l of labels) {
      const target = root.querySelector(`#${l.getAttribute("for")}`);
      expect(target, l.textContent ?? "").not.toBeNull();
    }
    expect(root.querySelector(`label[for="${input("rent").id}"]`)?.textContent).toContain("Tiền thuê");
    expect(input("rent").getAttribute("inputmode")).toBe("numeric");
    expect(root.querySelector("button[type=submit]")?.textContent).toBe("Tính thuế");
  });

  it("mục 2: câu miễn trừ có trước khi tính, sau khi tính, và sau lần hai", () => {
    expect(root.textContent).toContain(DISCLAIMER);
    type("rent", "100.000.000");
    calc();
    expect(root.textContent).toContain(DISCLAIMER);
    type("rent", "50.000.000");
    calc();
    expect(root.textContent).toContain(DISCLAIMER);
    expect(root.textContent!.split(DISCLAIMER).length).toBe(2);
  });

  it("mục 3: luật 2026 có chữ ước tính cạnh GTGT; luật giả unconfirmed:false thì không", () => {
    type("rent", "100.000.000");
    calc();
    const row = Array.from(root.querySelectorAll("tr")).find((r) => r.textContent!.includes("Thuế GTGT"))!;
    expect(row.textContent).toContain("ước tính");
    expect(row.textContent).toContain("60.000.000 đ");

    document.body.innerHTML = '<main id="app"></main>';
    root = document.querySelector("#app")!;
    mountCalculator(root, { year: 2026, rules: { ...rules2026, vat: { ...rules2026.vat, unconfirmed: false } } });
    type("rent", "100.000.000");
    calc();
    const row2 = Array.from(root.querySelectorAll("tr")).find((r) => r.textContent!.includes("Thuế GTGT"))!;
    expect(row2.textContent).not.toContain("ước tính");
    expect(root.querySelector(".results")!.textContent).not.toContain("ước tính");
  });

  it("mục 4: tiền thuê 'abc' -> lỗi gắn với ô, kết quả không có số thuế", () => {
    type("rent", "100.000.000");
    calc();
    expect(results()).toContain("10.000.000 đ");
    type("rent", "abc");
    calc();
    const err = root.querySelector(`#${input("rent").id}-error`)!;
    expect(err.textContent).not.toBe("");
    expect((err as HTMLElement).hidden).toBe(false);
    expect(input("rent").getAttribute("aria-describedby")).toBe(err.id);
    expect(results()).toBe("");
    expect(results()).not.toContain("0 đ");
  });

  it("ô rỗng, số kỳ > 12, số kỳ không phải số đều báo lỗi, không tính", () => {
    type("rent", "");
    calc();
    expect(results()).toBe("");
    type("rent", "1.000.000");
    type("periods", "13");
    calc();
    expect(results()).toBe("");
    expect(root.querySelector(`#${input("periods").id}-error`)!.textContent).toContain("12");
    type("periods", "1.5");
    calc();
    expect(results()).toBe("");
    type("periods", "12");
    calc();
    expect(results()).toContain("Doanh thu");
    expect(root.querySelector(`#${input("periods").id}-error`)!.textContent).toBe("");
  });

  it("mục 5: căn cứ TNCN đúng chuỗi luật và hạn 31/01/2027", () => {
    type("rent", "100.000.000");
    calc();
    expect(results()).toContain(rules2026.citations.pit);
    expect(results()).toContain("31/01/2027");
    expect(results()).toContain("10.000.000 đ");
  });

  it("trả trước: bật/tắt, phân bổ 1,2 tỷ 2 năm -> doanh thu 600.000.000 đ; số trả trước lỗi thì không tính", () => {
    const box = root.querySelector<HTMLElement>("fieldset.prepaid")!;
    expect(box.hidden).toBe(true);
    const t = input("prepaidOn");
    t.checked = true;
    t.dispatchEvent(new Event("change"));
    expect(box.hidden).toBe(false);
    type("rent", "0");
    type("periods", "0");
    type("prepaidAmount", "xyz");
    calc();
    expect(results()).toBe("");
    expect(root.querySelector(`#${input("prepaidAmount").id}-error`)!.textContent).not.toBe("");
    type("prepaidAmount", "1.200.000.000");
    type("prepaidYears", "2");
    type("prepaidDate", "2026-01-10");
    calc();
    expect(results()).toContain("600.000.000 đ");
  });

  it("gắn lại nhiều lần không nhân đôi nội dung", () => {
    mountCalculator(root, { year: 2026 });
    expect(root.querySelectorAll("form").length).toBe(1);
  });

  it("mục 6: viewport, CSS không width cố định > 360px, bảng trong khung overflow-x:auto", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/<meta name="viewport"[^>]*width=device-width/);
    expect(html).toContain("Thuế cho thuê");
    // Bỏ điều kiện @media (min-width ở đó là điểm ngắt, không phải bề rộng cố định).
    const css = readFileSync("src/ui/style.css", "utf8");
    const decls = css.replace(/@media[^{]*/g, "");
    for (const m of decls.matchAll(/(?<![a-z-])(?:min-)?width\s*:\s*([\d.]+)(px|rem|em)/g)) {
      const px = Number(m[1]) * (m[2] === "px" ? 1 : 16);
      expect(px, m[0]).toBeLessThanOrEqual(360);
    }
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
    type("rent", "100.000.000");
    calc();
    expect(root.querySelector(".table-scroll table")).not.toBeNull();
  });
});
