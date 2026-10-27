// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { BACKUP_KEY, LEDGER_KEY, type StorageLike } from "../../src/ledger/storage";
import { DISCLAIMER } from "../../src/ui/form";
import { mountLedger, type LedgerMountOptions } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  writes = 0;
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.writes++;
    this.data.set(k, v);
  }
}

let root: HTMLElement;
let storage: FakeStorage;
let seq: number;
const newId = () => `id${++seq}`;

const mount = (extra: Partial<LedgerMountOptions> = {}, r: HTMLElement = root) =>
  mountLedger(r, { year: 2026, storage, newId, today: "2026-10-26", confirm: () => true, ...extra });

const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const click = (el: Element | null) => (el as HTMLElement).click();

function addProperty(name: string): void {
  const f = root.querySelector(".lg-property-add")!;
  fill(f, "name", name);
  submit(f);
}
function addContract(propertyName: string, tenant: string, signedOn = "2025-11-01"): void {
  const sec = Array.from(root.querySelectorAll("section.lg-property")).find((s) => s.querySelector("h3")?.textContent === propertyName)!;
  const f = sec.querySelector(".lg-contract-add")!;
  fill(f, "tenant", tenant);
  fill(f, "signedOn", signedOn);
  fill(f, "startOn", signedOn);
  submit(f);
}
const contractSec = (tenant: string) =>
  Array.from(root.querySelectorAll("section.lg-contract")).find((s) => s.querySelector("h5")?.textContent === `Hợp đồng: ${tenant}`)!;
function addReceipt(tenant: string, date: string, amount: string): Element {
  const f = contractSec(tenant).querySelector(".lg-receipt-add")!;
  fill(f, "receivedOn", date);
  fill(f, "amount", amount);
  submit(f);
  return f;
}
const total = (label: string): string => {
  const row = Array.from(root.querySelectorAll(".lg-total tr")).find((r) => r.querySelector("th")?.textContent === label)!;
  return row.querySelector("td")!.firstChild!.textContent!.trim();
};
const totalCell = (label: string): string => {
  const row = Array.from(root.querySelectorAll(".lg-total tr")).find((r) => r.querySelector("th")?.textContent === label)!;
  return row.querySelector("td")!.textContent!;
};

function monthly(tenant: string, amount: string): void {
  for (let m = 1; m <= 12; m++) addReceipt(tenant, `2026-${String(m).padStart(2, "0")}-05`, amount);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="ledger"></div>';
  root = document.querySelector("#ledger")!;
  storage = new FakeStorage();
  seq = 0;
});

describe("sổ doanh thu trên giao diện", () => {
  it("thêm căn, hợp đồng, 12 kỳ thu: bảng tổng hiện doanh thu, TNCN, GTGT ước tính", () => {
    mount();
    addProperty("Căn A");
    addContract("Căn A", "Anh Bình");
    monthly("Anh Bình", "100.000.000");
    expect(total("Doanh thu cho thuê")).toBe("1.200.000.000 đ");
    expect(total("Thuế TNCN")).toBe("10.000.000 đ");
    expect(totalCell("Thuế GTGT")).toContain("ước tính");
    const saved = JSON.parse(storage.data.get(LEDGER_KEY)!);
    expect(saved.receipts).toHaveLength(12);
  });

  it("mở trang không ghi kho; sổ rỗng vẫn có bảng và miễn trừ", () => {
    mount();
    expect(storage.writes).toBe(0);
    expect(root.textContent).toContain(DISCLAIMER);
    expect(total("Doanh thu cho thuê")).toBe("0 đ");
  });

  it("số tiền có dấu chấm được đọc; 'abc' báo lỗi tại ô và kho không đổi", () => {
    mount();
    addProperty("A");
    addContract("A", "T");
    addReceipt("T", "2026-01-05", "100.000.000");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).receipts[0].amount).toBe(100000000);
    const before = storage.data.get(LEDGER_KEY);
    const writes = storage.writes;
    const f = addReceipt("T", "2026-02-05", "abc");
    const err = f.querySelector("#" + (f.querySelector('[name="amount"]') as HTMLElement).id + "-error") as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).not.toBe("");
    expect(storage.data.get(LEDGER_KEY)).toBe(before);
    expect(storage.writes).toBe(writes);
    expect(root.querySelectorAll("section.lg-contract form[data-receipt]")).toHaveLength(1);
  });

  it("ngày nhận không có thật: lỗi tiếng Việt tại ô ngày, không lộ tên trường", () => {
    mount();
    addProperty("A");
    addContract("A", "T");
    // Ô type="date" làm sạch ngày không có thật thành chuỗi rỗng (H-13); ngày không có thật kiểm ở tests/ledger.
    const f = addReceipt("T", "", "1.000.000");
    const dateInput = f.querySelector('[name="receivedOn"]') as HTMLElement;
    const err = f.querySelector("#" + dateInput.id + "-error") as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("ngày");
    expect(root.textContent).not.toContain("receivedOn");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).receipts).toHaveLength(0);
  });

  it("cảnh báo vượt ngưỡng có ngày; xoá kỳ thu làm vượt thì cảnh báo biến mất", () => {
    mount();
    addProperty("A");
    addContract("A", "T");
    addReceipt("T", "2026-01-05", "1.000.000.000");
    expect(root.querySelector(".threshold-warning")).toBeNull();
    addReceipt("T", "2026-09-15", "1");
    expect(root.querySelector(".threshold-warning")!.textContent).toContain("15/09/2026");
    const forms = contractSec("T").querySelectorAll("form[data-receipt]");
    click(forms[1]!.querySelector("button.danger"));
    expect(root.querySelector(".threshold-warning")).toBeNull();
  });

  it("gắn lại với cùng kho thấy đủ dữ liệu và cùng TNCN", () => {
    mount();
    addProperty("Căn A");
    addContract("Căn A", "Anh Bình");
    monthly("Anh Bình", "100.000.000");
    const pit = total("Thuế TNCN");
    document.body.innerHTML = '<div id="ledger2"></div>';
    const root2 = document.querySelector<HTMLElement>("#ledger2")!;
    mount({}, root2);
    expect(root2.querySelectorAll("section.lg-property")).toHaveLength(1);
    expect(root2.querySelectorAll("section.lg-contract")).toHaveLength(1);
    expect(root2.querySelectorAll("form[data-receipt]")).toHaveLength(12);
    const row = Array.from(root2.querySelectorAll(".lg-total tr")).find((r) => r.querySelector("th")?.textContent === "Thuế TNCN")!;
    expect(row.querySelector("td")!.textContent).toBe(pit);
  });

  it("miễn trừ có trước và sau mỗi lần sửa", () => {
    mount();
    expect(root.querySelectorAll(".disclaimer")).toHaveLength(1);
    addProperty("A");
    expect(root.querySelectorAll(".disclaimer")).toHaveLength(1);
    addContract("A", "T");
    addReceipt("T", "2026-01-05", "5.000.000");
    expect(root.querySelector(".disclaimer")!.textContent).toBe(DISCLAIMER);
  });

  it("xoá căn còn hợp đồng: hỏi xác nhận; từ chối thì giữ nguyên, đồng ý thì xoá cả con", () => {
    let answer = false;
    mount({ confirm: () => answer });
    addProperty("A");
    addContract("A", "T");
    addReceipt("T", "2026-01-05", "5.000.000");
    const del = () => click(root.querySelector("section.lg-property > .lg-head .lg-edit-property form .danger"));
    del();
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties).toHaveLength(1);
    answer = true;
    del();
    const saved = JSON.parse(storage.data.get(LEDGER_KEY)!);
    expect(saved.properties).toHaveLength(0);
    expect(saved.contracts).toHaveLength(0);
    expect(saved.receipts).toHaveLength(0);
  });

  it("chọn hợp đồng trừ ngưỡng trước được lưu và đổi TNCN từng hợp đồng", () => {
    mount();
    addProperty("A");
    addContract("A", "Ta");
    addContract("A", "Tb");
    addReceipt("Ta", "2026-01-05", "700.000.000");
    addReceipt("Tb", "2026-01-06", "700.000.000");
    const pitOf = (id: string) => root.querySelector(`.lg-by-contract tr[data-contract="${id}"] [data-col="pit"]`)!.textContent;
    const sel = root.querySelector<HTMLSelectElement>('[name="deductionChoice"]')!;
    const idB = Array.from(sel.options).find((o) => o.textContent?.includes("Tb"))!.value;
    sel.value = idB;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const ids = Array.from(root.querySelectorAll(".lg-by-contract tr[data-contract]")).map((r) => r.getAttribute("data-contract")!);
    const idA = ids.find((i) => i !== idB)!;
    expect(pitOf(idA)).toBe("20.000.000 đ");
    expect(pitOf(idB)).toBe("0 đ");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).deductionChoice["2026"]).toBe(idB);
  });

  it("sổ đã lưu bị hỏng: hiện lỗi, không ghi kho khi mở, chỉ ghi sau thao tác", () => {
    storage.data.set(LEDGER_KEY, "{hong");
    mount();
    expect(root.querySelector(".ledger-error")!.textContent).not.toBe("");
    expect(storage.data.get(LEDGER_KEY)).toBe("{hong");
    expect(storage.data.get(BACKUP_KEY)).toBe("{hong");
    expect(storage.writes).toBe(1); // chỉ bản dự phòng
    // H-10: kho hỏng thì khoá; phải chọn "Bắt đầu sổ mới" (confirm đồng ý) mới ghi khoá chính
    Array.from(root.querySelectorAll("button")).find((b) => b.textContent === "Bắt đầu sổ mới")!.click();
    addProperty("A");
    expect(JSON.parse(storage.data.get(LEDGER_KEY)!).properties).toHaveLength(1);
    expect(root.querySelector(".ledger-error")).toBeNull();
  });

  it("năm chưa có luật: hiện thông báo tiếng Việt thay vì ném lỗi", () => {
    mount({ year: 2030 });
    expect(root.textContent).toContain("2030");
    expect(root.textContent).toContain(DISCLAIMER);
  });

  it("nút Xuất JSON tạo Blob; ô Nhập JSON có tên", () => {
    const urls: Blob[] = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b: Blob) => {
      urls.push(b);
      return "blob:x";
    };
    try {
      mount();
      addProperty("A");
      click(root.querySelector('button[name="export"]'));
      expect(urls).toHaveLength(1);
      expect(root.querySelector('input[type="file"][name="import"]')).not.toBeNull();
    } finally {
      URL.createObjectURL = orig;
    }
  });
});

describe("src/ui/ledger.ts không chứa số luật", () => {
  it("quét hằng số luật", () => {
    const t = readFileSync(join(__dirname, "../../src/ui/ledger.ts"), "utf8");
    for (const bad of ["1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"]) {
      expect(t.includes(bad), bad).toBe(false);
    }
    expect(t).toMatch(/summarizeYear/);
  });
});
