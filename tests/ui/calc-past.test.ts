// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { mountCalculator } from "../../src/ui/form";

let root: HTMLElement;

const type = (name: string, v: string) => {
  (root.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const calcTwice = (today?: string) => {
  mountCalculator(root, { year: 2026, ...(today ? { today } : {}) });
  type("rent", "100.000.000");
  type("periods", "12");
  (root.querySelector('input[name="filing"][value="twice"]') as HTMLInputElement).checked = true;
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const deadlineRow = (date: string) =>
  Array.from(root.querySelectorAll("tr")).find((r) => r.querySelector("td")?.textContent?.startsWith(date))!;

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.querySelector("#app")!;
});

describe("máy tính: hạn đã qua (H-20)", () => {
  it("today 2026-10-26: hạn 31/07/2026 đã qua, 31/01/2027 chưa", () => {
    calcTwice("2026-10-26");
    const past = deadlineRow("31/07/2026");
    expect(past.textContent).toContain("đã qua");
    expect(past.hasAttribute("data-past") || past.querySelector("[data-past]") !== null).toBe(true);
    const future = deadlineRow("31/01/2027");
    expect(future.textContent).not.toContain("đã qua");
    expect(future.hasAttribute("data-past") || future.querySelector("[data-past]") !== null).toBe(false);
  });

  it("today 2026-07-31: hạn đúng hôm nay chưa qua", () => {
    calcTwice("2026-07-31");
    expect(deadlineRow("31/07/2026").textContent).not.toContain("đã qua");
    expect(root.querySelector(".results")!.textContent).not.toContain("đã qua");
  });

  it("không truyền today: không nhãn đã qua, tính lại không rò nhãn", () => {
    calcTwice();
    expect(root.querySelector(".results")!.textContent).not.toContain("đã qua");
    calcTwice("2026-10-26");
    expect(root.querySelector(".results")!.textContent).toContain("đã qua");
    calcTwice();
    expect(root.querySelector(".results")!.textContent).not.toContain("đã qua");
  });
});
