// @vitest-environment happy-dom
// R11 dev-04: câu hỏi trước khi nhập đè nói số kỳ thu sẽ mất và gợi ý Xuất JSON (S23); kho ném lỗi thì sổ nói rõ không lưu được (S24).
import { beforeEach, describe, expect, it } from "vitest";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import type { StorageLike } from "../../src/ledger/storage";
import { mountLedger, replaceMessage } from "../../src/ui/ledger";

const book = (ids: string[]): Ledger => ({
  ...emptyLedger(),
  properties: [{ id: "p1", name: "Căn A" }],
  contracts: [{ id: "c1", propertyId: "p1", tenant: "B", signedOn: "2026-01-01", startOn: "2026-01-01" }],
  receipts: ids.map((id, i) => ({ id, contractId: "c1", receivedOn: `2026-0${i + 1}-05`, amount: 1_000_000 })),
});

describe("replaceMessage", () => {
  it("sổ hiện tại có 2 kỳ thu không có trong file: nêu số 2 và gợi ý Xuất JSON; gọi lặp lại vẫn đúng", () => {
    for (let i = 0; i < 2; i++) {
      const m = replaceMessage(book(["a", "b", "c", "d"]), book(["a", "b"]));
      expect(m).toMatch(/có 2 kỳ thu không có trong file/);
      expect(m).toContain("Xuất JSON");
    }
  });
  it("không kỳ thu nào sẽ mất: giữ câu cũ, không nhắc số kỳ thu", () => {
    const m = replaceMessage(book(["a"]), book(["a", "b"]));
    expect(m).toBe("Nhập file sẽ thay toàn bộ sổ hiện tại. Bạn có chắc không?");
  });
  it("file rỗng: toàn bộ kỳ thu của sổ hiện tại được tính là sẽ mất", () => {
    expect(replaceMessage(book(["a", "b", "c"]), emptyLedger())).toMatch(/có 3 kỳ thu/);
  });
});

describe("kho ném lỗi khi đọc (S24)", () => {
  let root: HTMLElement;
  const boom: StorageLike = {
    getItem() {
      throw new DOMException("blocked", "SecurityError");
    },
    setItem() {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  beforeEach(() => {
    document.body.innerHTML = '<section id="ledger"></section>';
    root = document.querySelector("#ledger")!;
  });
  it("báo không lưu được trên trình duyệt này, nhắc Xuất JSON, không nói sổ cũ hỏng, không có nút Bắt đầu sổ mới", () => {
    mountLedger(root, { year: 2026, today: "2026-11-10", storage: boom });
    const err = root.querySelector(".ledger-error")!.textContent!;
    expect(err).toMatch(/không lưu được trên trình duyệt này/i);
    expect(err).toContain("Xuất JSON");
    expect(root.textContent).not.toContain("Sổ cũ chưa đọc được");
    expect(root.querySelector("[name=start-new]")).toBeNull();
    expect(root.textContent).not.toMatch(/đã lưu/i);
  });
});
