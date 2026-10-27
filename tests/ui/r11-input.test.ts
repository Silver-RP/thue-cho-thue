// @vitest-environment happy-dom
// R11 dev-02: số 0 bị từ chối kèm câu giải thích (S25) và câu nói lựa chọn trừ ngưỡng không đổi tổng thuế (S9).
import { beforeEach, describe, expect, it } from "vitest";
import type { StorageLike } from "../../src/ledger/storage";
import { mountCalculator } from "../../src/ui/form";
import { mountLedger } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};

describe("máy tính nhanh: tiền thuê 0", () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    root = document.querySelector("#app")!;
    mountCalculator(root, { year: 2026 });
  });
  const err = () => root.querySelector<HTMLElement>(".field-error:not([hidden])")?.textContent ?? "";

  it("0 với số kỳ ≥ 1 bị từ chối kèm câu giải thích, không ra kết quả; gọi lặp lại vẫn thế", () => {
    for (let i = 0; i < 2; i++) {
      fill(root, "rent", "0");
      submit(root.querySelector("form")!);
      expect(err()).toMatch(/lớn hơn 0/);
      expect(root.querySelector(".results")!.textContent).toBe("");
    }
  });

  it("0 với 0 kỳ (chỉ có tiền trả trước) vẫn hợp lệ; số hợp lệ xoá lỗi cũ", () => {
    fill(root, "rent", "0");
    submit(root.querySelector("form")!);
    expect(err()).not.toBe("");
    fill(root, "rent", "25.000.000");
    submit(root.querySelector("form")!);
    expect(err()).toBe("");
    fill(root, "rent", "0");
    fill(root, "periods", "0");
    submit(root.querySelector("form")!);
    expect(err()).toBe("");
  });
});

describe("sổ: kỳ thu 0 và câu giải thích lựa chọn trừ ngưỡng", () => {
  let root: HTMLElement;
  let storage: FakeStorage;
  beforeEach(() => {
    document.body.innerHTML = '<main id="ledger"></main>';
    root = document.querySelector("#ledger")!;
    storage = new FakeStorage();
    let n = 0;
    mountLedger(root, { year: 2026, storage, newId: () => `id${++n}`, today: "2026-10-26", confirm: () => true });
  });

  it("kỳ thu số tiền 0 bị từ chối, sổ không thêm kỳ thu", () => {
    const p = root.querySelector(".lg-property-add")!;
    fill(p, "name", "Căn A");
    submit(p);
    const c = root.querySelector(".lg-contract-add")!;
    fill(c, "tenant", "Bình");
    fill(c, "signedOn", "2026-01-01");
    fill(c, "startOn", "2026-01-01");
    submit(c);
    const r = root.querySelector(".lg-receipt-add")!;
    fill(r, "receivedOn", "2026-03-05");
    fill(r, "amount", "0");
    submit(r);
    const e = root.querySelector<HTMLElement>(".lg-receipt-add .field-error:not([hidden])");
    expect(e?.textContent).toMatch(/lớn hơn 0/);
    expect(root.querySelectorAll(".lg-receipt-add").length).toBe(1);
    expect(root.querySelectorAll("form[data-receipt]").length).toBe(0);
  });

  it("khu chọn hợp đồng được trừ ngưỡng nói lựa chọn không đổi tổng tiền phải nộp", () => {
    const p = root.querySelector(".lg-property-add")!;
    fill(p, "name", "Căn A");
    submit(p);
    const c = root.querySelector(".lg-contract-add")!;
    fill(c, "tenant", "Bình");
    fill(c, "signedOn", "2026-01-01");
    fill(c, "startOn", "2026-01-01");
    submit(c);
    const text = root.querySelector(".lg-choice")!.textContent!;
    expect(text).toMatch(/không (làm )?đổi tổng/);
  });
});
