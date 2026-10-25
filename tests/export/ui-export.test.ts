// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { deadlinesToIcs } from "../../src/export/ics";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { LEDGER_KEY, loadLedger, saveLedger, type StorageLike } from "../../src/ledger/storage";
import { summarizeYear } from "../../src/ledger/summary";
import { DISCLAIMER } from "../../src/ui/form";
import { mountLedger } from "../../src/ui/ledger";
import { formatVnd } from "../../src/ui/money";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const twelveMonths = (): Ledger => ({
  ...emptyLedger(),
  properties: [{ id: "P1", name: "Căn A" }],
  contracts: [{ id: "C1", propertyId: "P1", tenant: "An", signedOn: "2025-12-01", startOn: "2026-01-01" }],
  receipts: Array.from({ length: 12 }, (_, i) => ({
    id: `R${i + 1}`,
    contractId: "C1",
    receivedOn: `2026-${String(i + 1).padStart(2, "0")}-05`,
    amount: 100_000_000,
  })),
});

let root: HTMLElement;
let storage: FakeStorage;
let downloads: { filename: string; mime: string; content: string }[];

function mount(ledger: Ledger): void {
  if (!saveLedger(storage, ledger).ok) throw new Error("save");
  mountLedger(root, { year: 2026, storage, today: "2026-10-26", confirm: () => true });
}

/** Gắn riêng phần xuất với download/copy giả, dùng cùng kho. */
async function mountExportOnly(ledger: Ledger, copy?: (t: string) => Promise<void> | void): Promise<void> {
  const { mountExport } = await import("../../src/ui/export");
  const { setFilingMode } = await import("../../src/ledger/ops");
  const { isLedgerError } = await import("../../src/ledger/model");
  saveLedger(storage, ledger);
  let current = loadLedger(storage).ledger;
  mountExport(root, {
    year: 2026,
    today: "2026-10-26",
    stamp: "20261026T000000Z",
    getLedger: () => current,
    setFilingMode: (mode) => {
      const r = setFilingMode(current, 2026, mode);
      if (isLedgerError(r)) return r.error;
      const saved = saveLedger(storage, r);
      if (!saved.ok) return saved.error;
      current = r;
      return null;
    },
    download: (filename, mime, content) => void downloads.push({ filename, mime, content }),
    ...(copy ? { copy } : {}),
  });
}

const click = (el: Element | null) => (el as HTMLElement).click();
const btn = (name: string) => root.querySelector(`button[name="${name}"]`);
const radio = (value: string) => root.querySelector(`input[name="filingMode"][value="${value}"]`) as HTMLInputElement;
const dates = () => Array.from(root.querySelectorAll(".export-deadlines li")).map((li) => li.getAttribute("data-date"));

beforeEach(() => {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  storage = new FakeStorage();
  downloads = [];
});

describe("ui/export", () => {
  it("1: hạn 31/01/2027; chọn Khai 2 lần → thêm 31/07/2026 và lưu filingMode (qua mountLedger)", () => {
    mount(twelveMonths());
    expect(root.querySelector(".lg-export")?.textContent).toContain("31/01/2027");
    expect(root.querySelector(".lg-export")?.textContent).not.toContain("31/07/2026");
    radio("twice").checked = true;
    radio("twice").dispatchEvent(new Event("change", { bubbles: true }));
    const text = root.querySelector(".lg-export")?.textContent ?? "";
    expect(text).toContain("31/07/2026");
    expect(text).toContain("31/01/2027");
    expect(loadLedger(storage).ledger.filingMode?.["2026"]).toBe("twice");
    expect(radio("twice").checked).toBe(true);
  });

  it("2: tải .ics và CSV đúng tên, mime, nội dung (BOM)", async () => {
    await mountExportOnly(twelveMonths());
    click(btn("download-ics"));
    const s = summarizeYear(twelveMonths(), 2026);
    expect(downloads[0]).toEqual({
      filename: "thue-cho-thue-han-2026.ics",
      mime: "text/calendar",
      content: deadlinesToIcs(s.deadlines, { year: 2026, stamp: "20261026T000000Z" }),
    });
    click(btn("download-csv"));
    expect(downloads[1]?.filename).toBe("thue-cho-thue-01TTS-2026.csv");
    expect(downloads[1]?.mime).toBe("text/csv");
    expect(downloads[1]?.content.startsWith("﻿")).toBe(true);
    // gọi lặp lại không rò trạng thái
    click(btn("download-csv"));
    expect(downloads[2]?.content).toBe(downloads[1]?.content);
  });

  it("3: Chép TNCN nhận chữ số thuần; copy bị từ chối thì báo lỗi và vẫn thấy số", async () => {
    const pit = summarizeYear(twelveMonths(), 2026).totalPit;
    const got: string[] = [];
    await mountExportOnly(twelveMonths(), (t) => void got.push(t));
    click(root.querySelector('button[aria-label="Chép Thuế TNCN"]'));
    await Promise.resolve();
    expect(got).toEqual([String(pit)]);

    await mountExportOnly(twelveMonths(), () => Promise.reject(new Error("denied")));
    click(root.querySelector('button[aria-label="Chép Thuế TNCN"]'));
    await new Promise((r) => setTimeout(r, 0));
    const err = root.querySelector(".export-error") as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("Không chép được");
    expect(err.textContent).toContain(formatVnd(pit));
    expect(root.textContent).toContain(formatVnd(pit));

    await mountExportOnly(twelveMonths(), () => {
      throw new Error("sync");
    });
    click(root.querySelector('button[aria-label="Chép Thuế TNCN"]'));
    await new Promise((r) => setTimeout(r, 0));
    expect((root.querySelector(".export-error") as HTMLElement).hidden).toBe(false);
  });

  it("4: nhãn chưa xác nhận mẫu, ước tính; eTax ≥ 4 bước; miễn trừ trước và sau khi đổi lựa chọn", async () => {
    await mountExportOnly(twelveMonths());
    const text = () => root.textContent ?? "";
    expect(text()).toContain("chưa xác nhận mẫu");
    expect(text()).toContain("ước tính");
    expect(root.querySelectorAll(".export-etax li").length).toBeGreaterThanOrEqual(4);
    expect(text()).toContain("tham khảo");
    expect(text()).toContain(DISCLAIMER);
    radio("twice").checked = true;
    radio("twice").dispatchEvent(new Event("change", { bubbles: true }));
    expect(dates()).toEqual(["2026-07-31", "2027-01-31"]);
    expect(text()).toContain(DISCLAIMER);
  });

  it("5: sổ trống không có nút; notify_only hiện hạn thông báo, vẫn có .ics, không bảng thuế", async () => {
    await mountExportOnly(emptyLedger());
    expect(btn("download-csv")).toBeNull();
    expect(btn("download-ics")).toBeNull();
    expect(root.querySelector("button.copy")).toBeNull();
    expect(root.textContent).toContain("Chưa có kỳ thu năm 2026");

    const small = twelveMonths();
    small.receipts = [{ id: "R1", contractId: "C1", receivedOn: "2026-01-05", amount: 1_000_000 }];
    await mountExportOnly(small);
    expect(dates()).toEqual(["2027-01-31"]);
    expect(btn("download-ics")).not.toBeNull();
    expect(btn("download-csv")).toBeNull();
    expect(root.querySelector("button.copy")).toBeNull();
    expect(root.textContent).toContain("không phải nộp thuế");
    expect(root.querySelector("table")).toBeNull();
  });

  it("6: src/ui/export.ts không chứa số luật hay Date", () => {
    const src = readFileSync(join(__dirname, "../../src/ui/export.ts"), "utf8");
    for (const bad of ["new Date", "Date.now", "Math.random", "1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"]) {
      expect(src).not.toContain(bad);
    }
    expect(readdirSync(join(__dirname, "../../src/ui"))).toContain("export.ts");
  });
});
