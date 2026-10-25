// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { getRules } from "../../src/rules";
import { computeAnnual } from "../../src/tax/annual";
import { ledgerToPayments } from "../../src/ledger/summary";
import { parseLedger } from "../../src/ledger/schema";
import { LEDGER_KEY, loadLedger, type StorageLike } from "../../src/ledger/storage";
import { formatVnd } from "../../src/ui/money";
import { mountLedger, type LedgerMountOptions } from "../../src/ui/ledger";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

let root: HTMLElement;
let storage: FakeStorage;
let seq: number;
let confirmCalls: number;
const newId = () => `id${++seq}`;

const mount = (extra: Partial<LedgerMountOptions> = {}) =>
  mountLedger(root, {
    year: 2026,
    storage,
    newId,
    today: "2026-10-26",
    confirm: () => (confirmCalls++, true),
    ...extra,
  });

const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const tick = () => new Promise((r) => setTimeout(r, 0));

function addProperty(name: string): void {
  const f = root.querySelector(".lg-property-add")!;
  fill(f, "name", name);
  submit(f);
}
const propSec = (name: string) =>
  Array.from(root.querySelectorAll("section.lg-property")).find((s) => s.querySelector("h3")?.textContent === name)!;
function addContract(propertyName: string, tenant: string, signedOn: string): void {
  const f = propSec(propertyName).querySelector(".lg-contract-add")!;
  fill(f, "tenant", tenant);
  fill(f, "signedOn", signedOn);
  fill(f, "startOn", signedOn);
  submit(f);
}
const contractSec = (tenant: string) =>
  Array.from(root.querySelectorAll("section.lg-contract")).find((s) => s.querySelector("h5")?.textContent === `Hợp đồng: ${tenant}`)!;
function addReceipt(tenant: string, date: string, amount: string, prepaid?: { years: number; mode: string }): void {
  const f = contractSec(tenant).querySelector(".lg-receipt-add")!;
  fill(f, "receivedOn", date);
  fill(f, "amount", amount);
  if (prepaid) {
    (f.querySelector('[name="prepaidOn"]') as HTMLInputElement).checked = true;
    fill(f, "years", String(prepaid.years));
    fill(f, "mode", prepaid.mode);
  }
  submit(f);
}
const total = (label: string): string => {
  const row = Array.from(root.querySelectorAll(".lg-total tr")).find((r) => r.querySelector("th")?.textContent === label)!;
  return row.querySelector("td")!.firstChild!.textContent!.trim();
};
const contractId = (tenant: string) => contractSec(tenant).getAttribute("data-contract")!;
const cell = (tenant: string, col: string): string => {
  const td = root.querySelector(`.lg-by-contract tr[data-contract="${contractId(tenant)}"] [data-col="${col}"]`)!;
  return td.firstChild!.textContent!.trim();
};
const choose = (tenantId: string) => {
  const sel = root.querySelector('[name="deductionChoice"]') as HTMLSelectElement;
  sel.value = tenantId;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
};
const fileInput = (text: string): void => {
  const input = root.querySelector('input[type="file"][name="import"]') as HTMLInputElement;
  const file = { text: () => Promise.resolve(text) } as unknown as File;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="ledger"></div>';
  root = document.querySelector("#ledger")!;
  storage = new FakeStorage();
  seq = 0;
  confirmCalls = 0;
});

describe("đối chiếu sổ trên DOM với số tính tay và engine", () => {
  it("3 căn, 4 hợp đồng, hợp đồng ký 2025, trả trước allocate: TNCN 7.500.000, GTGT 57.500.000, tổng 65.000.000", () => {
    mount();
    addProperty("Căn A");
    addProperty("Căn B");
    addProperty("Căn C");
    addContract("Căn A", "T1", "2025-11-01");
    addContract("Căn A", "T2", "2026-01-01");
    addContract("Căn B", "T3", "2025-12-01");
    addContract("Căn C", "T4", "2026-02-01");
    // T1: nhận 2025 và 2026; T3: trả trước 300tr / 3 năm nhận 2025-12-31 → 2026 được 100tr
    addReceipt("T1", "2025-12-01", "100.000.000");
    addReceipt("T1", "2026-01-05", "500.000.000");
    addReceipt("T2", "2026-03-05", "300.000.000");
    addReceipt("T3", "2025-12-31", "300.000.000", { years: 3, mode: "allocate" });
    addReceipt("T4", "2026-06-05", "250.000.000");
    // Doanh thu 2026 = 500 + 300 + 100 + 250 = 1.150tr; vượt ngưỡng 1.000tr
    // TNCN = 5% × (1.150tr − 1.000tr) = 7.500.000 (Thông tư 40/2021 / luật 2026 đã nạp)
    // GTGT = 5% × 1.150tr = 57.500.000 (ước tính)
    expect(total("Doanh thu cho thuê")).toBe("1.150.000.000 đ");
    expect(total("Thuế TNCN")).toBe("7.500.000 đ");
    expect(total("Thuế GTGT")).toBe("57.500.000 đ");
    expect(total("Tổng thuế")).toBe("65.000.000 đ");

    const ledger = loadLedger(storage).ledger;
    expect(ledger.properties).toHaveLength(3);
    expect(ledger.contracts).toHaveLength(4);
    const r = computeAnnual({ year: 2026, payments: ledgerToPayments(ledger), deductionOrder: undefined, rules: getRules(2026) });
    expect(total("Thuế TNCN")).toBe(formatVnd(r.totalPit));
    expect(total("Thuế GTGT")).toBe(formatVnd(r.totalVat));
    expect(total("Tổng thuế")).toBe(formatVnd(r.totalTax));
    expect(total("Doanh thu cho thuê")).toBe(formatVnd(r.totalRevenue));
  });

  it("L4: hai hợp đồng 700tr; chọn B → TNCN A 20.000.000; đổi sang A → B 20.000.000, A 0; tải lại giữ lựa chọn", () => {
    mount();
    addProperty("Căn A");
    addProperty("Căn B");
    addContract("Căn A", "A", "2026-01-01");
    addContract("Căn B", "B", "2026-01-01");
    addReceipt("A", "2026-02-05", "700.000.000");
    addReceipt("B", "2026-03-05", "700.000.000");
    choose(contractId("B"));
    // B trừ 700tr, A trừ 300tr → TNCN A = 5% × (700 − 300)tr = 20.000.000; B = 0
    expect(cell("A", "pit")).toBe("20.000.000 đ");
    expect(cell("B", "pit")).toBe("0 đ");
    choose(contractId("A"));
    expect(cell("B", "pit")).toBe("20.000.000 đ");
    expect(cell("A", "pit")).toBe("0 đ");

    document.body.innerHTML = '<div id="ledger"></div>';
    root = document.querySelector("#ledger")!;
    mount();
    expect((root.querySelector('[name="deductionChoice"]') as HTMLSelectElement).value).toBe(contractId("A"));
    expect(cell("B", "pit")).toBe("20.000.000 đ");
    expect(cell("A", "pit")).toBe("0 đ");
  });

  it("nhập file JSON hợp lệ nhưng sai cấu trúc (amount là chuỗi): báo lỗi tiếng Việt, màn hình và kho không đổi", async () => {
    mount();
    addProperty("Căn A");
    addContract("Căn A", "T", "2026-01-01");
    addReceipt("T", "2026-02-05", "100.000.000");
    const stored = storage.data.get(LEDGER_KEY)!;
    const html = root.querySelector(".lg-total")!.outerHTML;
    const bad = JSON.parse(stored);
    bad.receipts[0].amount = "12.000.000";
    fileInput(JSON.stringify({ app: "thue-cho-thue", ...bad }));
    await tick();
    const slot = Array.from(root.querySelectorAll(".lg-backup .form-error")).find((e) => !(e as HTMLElement).hidden)!;
    expect(slot.textContent).toMatch(/[ăâêôơưđ]|số|tiền|file|sổ/i);
    expect(slot.textContent).not.toBe("");
    expect(storage.data.get(LEDGER_KEY)).toBe(stored);
    expect(root.querySelector(".lg-total")!.outerHTML).toBe(html);
    expect(total("Doanh thu cho thuê")).toBe("100.000.000 đ");
  });

  it("nhập file không phải JSON và file thiếu schemaVersion: bị từ chối, kho không đổi", async () => {
    mount();
    addProperty("Căn A");
    const stored = storage.data.get(LEDGER_KEY)!;
    for (const text of ["{", JSON.stringify({ properties: [], contracts: [], receipts: [], deductionChoice: {} })]) {
      fileInput(text);
      await tick();
      expect(storage.data.get(LEDGER_KEY)).toBe(stored);
      expect(propSec("Căn A")).toBeTruthy();
    }
    expect(confirmCalls).toBe(0);
  });

  it("xuất JSON, xoá hết sổ, nhập lại file đó: sổ và TNCN như trước", async () => {
    let blob: Blob | undefined;
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b: Blob) => {
      blob = b;
      return "blob:x";
    };
    try {
      mount();
      addProperty("Căn A");
      addContract("Căn A", "T", "2026-01-01");
      addReceipt("T", "2026-02-05", "1.100.000.000");
      // TNCN = 5% × (1.100tr − 1.000tr) = 5.000.000
      expect(total("Thuế TNCN")).toBe("5.000.000 đ");
      const before = storage.data.get(LEDGER_KEY)!;
      (root.querySelector('button[name="export"]') as HTMLElement).click();
      expect(blob).toBeDefined();
      const text = await blob!.text();
      expect(JSON.parse(text).app).toBe("thue-cho-thue");

      // xoá hết: xoá căn kèm con (confirm đồng ý)
      (propSec("Căn A").querySelector("button.danger") as HTMLElement).click();
      expect(root.querySelectorAll("section.lg-property")).toHaveLength(0);
      expect(total("Thuế TNCN")).toBe("0 đ");

      fileInput(text);
      await tick();
      expect(total("Thuế TNCN")).toBe("5.000.000 đ");
      expect(total("Doanh thu cho thuê")).toBe("1.100.000.000 đ");
      const after = parseLedger(JSON.parse(storage.data.get(LEDGER_KEY)!));
      const orig0 = parseLedger(JSON.parse(before));
      expect(after.ok && orig0.ok && after.ledger).toEqual(orig0.ok && orig0.ledger);
    } finally {
      URL.createObjectURL = orig;
    }
  });

  it("gắn lại nhiều lần cùng Storage không rò trạng thái: số liệu giữ nguyên", () => {
    mount();
    addProperty("Căn A");
    addContract("Căn A", "T", "2026-01-01");
    addReceipt("T", "2026-02-05", "1.100.000.000");
    for (let i = 0; i < 3; i++) {
      document.body.innerHTML = '<div id="ledger"></div>';
      root = document.querySelector("#ledger")!;
      mount();
      expect(total("Thuế TNCN")).toBe("5.000.000 đ");
      expect(root.querySelectorAll("section.lg-property")).toHaveLength(1);
    }
  });
});
