// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { dateField, dmyToIso, isoToDmy } from "../../src/ui/date-input";

describe("đổi dạng ngày", () => {
  it.each([
    ["05/01/2026", "2026-01-05"],
    ["5/1/2026", "2026-01-05"],
    ["05-01-2026", "2026-01-05"],
    ["05.01.2026", "2026-01-05"],
    ["05012026", "2026-01-05"],
    [" 2026-01-05 ", "2026-01-05"],
  ])("%s → %s", (text, iso) => {
    expect(dmyToIso(text)).toBe(iso);
  });

  it("chữ không đọc được thì giữ nguyên để sổ báo lỗi", () => {
    expect(dmyToIso("ngày mai")).toBe("ngày mai");
    expect(dmyToIso("")).toBe("");
  });

  it("ngày không có thật vẫn ra dạng ISO, phép kiểm của sổ sẽ từ chối", () => {
    expect(dmyToIso("31/02/2026")).toBe("2026-02-31");
  });

  it("isoToDmy", () => {
    expect(isoToDmy("2026-01-05")).toBe("05/01/2026");
    expect(isoToDmy("")).toBe("");
  });
});

describe("ô ngày", () => {
  const make = () => {
    const input = document.createElement("input");
    input.type = "text";
    const box = dateField(input);
    return { input, box, native: box.querySelector<HTMLInputElement>(".date-native")! };
  };

  it("rời ô thì viết lại dd/mm/yyyy, chữ sai để nguyên", () => {
    const { input } = make();
    input.value = "5/1/2026";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("05/01/2026");
    input.value = "abc";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("abc");
  });

  it("chọn trên lịch thì ô chữ nhận dd/mm/yyyy; ô lịch không có name", () => {
    const { input, native } = make();
    expect(native.name).toBe("");
    native.value = "2026-03-09";
    native.dispatchEvent(new Event("change"));
    expect(input.value).toBe("09/03/2026");
  });

  it("nút lịch có tên cho trình đọc màn hình", () => {
    expect(make().box.querySelector("button")!.getAttribute("aria-label")).toBe("Chọn ngày trên lịch");
  });
});
