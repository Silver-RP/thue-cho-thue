// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { loadLedger, type StorageLike } from "../../src/ledger/storage";
import { summarizeYear } from "../../src/ledger/summary";
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

let root: HTMLElement;
let storage: FakeStorage;
let seq: number;
let downloads: { filename: string; mime: string; content: string }[];

const mount = (r: HTMLElement = root) =>
  mountLedger(r, {
    year: 2026,
    storage,
    newId: () => `id${++seq}`,
    today: "2026-10-26",
    confirm: () => true,
    download: (filename, mime, content) => void downloads.push({ filename, mime, content }),
  });

const submit = (form: Element) => form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const fill = (scope: Element, name: string, v: string) => {
  (scope.querySelector(`[name="${name}"]`) as HTMLInputElement).value = v;
};
const addProperty = (name: string) => {
  const f = root.querySelector(".lg-property-add")!;
  fill(f, "name", name);
  submit(f);
};
const propSec = (name: string) =>
  Array.from(root.querySelectorAll("section.lg-property")).find((s) => s.querySelector("h3")?.textContent === name)!;
const addContract = (prop: string, tenant: string, signedOn: string) => {
  const f = propSec(prop).querySelector(".lg-contract-add")!;
  fill(f, "tenant", tenant);
  fill(f, "signedOn", signedOn);
  fill(f, "startOn", signedOn);
  submit(f);
};
const contractSec = (tenant: string) =>
  Array.from(root.querySelectorAll("section.lg-contract")).find((s) => s.querySelector("h5")?.textContent === `Hợp đồng: ${tenant}`)!;
const addReceipt = (tenant: string, date: string, amount: string) => {
  const f = contractSec(tenant).querySelector(".lg-receipt-add")!;
  fill(f, "receivedOn", date);
  fill(f, "amount", amount);
  submit(f);
};
const editReceipt = (tenant: string, index: number, amount: string) => {
  const f = contractSec(tenant).querySelectorAll("form.lg-receipt-form")[index]!;
  fill(f, "amount", amount);
  submit(f);
};
const btn = (name: string) => root.querySelector(`button[name="${name}"]`) as HTMLElement;
const lastDownload = () => downloads[downloads.length - 1]!;

/** Bộ đọc CSV RFC 4180 (bỏ BOM). */
function parseCsv(text: string): string[][] {
  const s = text.startsWith("﻿") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (q) {
      if (ch === '"' && s[i + 1] === '"') (cur += '"', i++);
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") (row.push(cur), (cur = ""));
    else if (ch === "\r" && s[i + 1] === "\n") (row.push(cur), rows.push(row), (row = []), (cur = ""), i++);
    else cur += ch;
  }
  if (cur !== "" || row.length > 0) (row.push(cur), rows.push(row));
  return rows;
}

const digits = (t: string) => t.replace(/\D/g, "");
const mainCsv = (rows: string[][], label: string) => rows.find((r) => r.length === 3 && r[1]!.startsWith(label))![2]!;
const mainShown = (label: string): string => {
  const th = Array.from(root.querySelectorAll(".export-main th")).find((t) => t.textContent!.includes(label))!;
  return th.parentElement!.querySelector("td")!.firstChild!.textContent!.trim();
};
function annexRows(rows: string[][]): string[][] {
  const h = rows.findIndex((r) => r[0] === "Bên thuê");
  const out: string[][] = [];
  for (let i = h + 1; i < rows.length && rows[i]!.length === rows[h]!.length; i++) out.push(rows[i]!);
  return out;
}

/** 2 căn, 3 hợp đồng; doanh thu 2026 = 600 + 300 + 250 = 1.150tr; kỳ thu 2025 (100tr) không tính. */
function build(tenants: [string, string, string] = ["T1", "T2", "T3"]): void {
  addProperty("Căn A");
  addProperty("Căn B");
  addContract("Căn A", tenants[0], "2025-11-01");
  addContract("Căn A", tenants[1], "2026-01-01");
  addContract("Căn B", tenants[2], "2026-02-01");
  addReceipt(tenants[0], "2025-12-01", "100.000.000");
  addReceipt(tenants[0], "2026-01-05", "600.000.000");
  addReceipt(tenants[1], "2026-03-05", "300.000.000");
  addReceipt(tenants[2], "2026-06-05", "250.000.000");
}

beforeEach(() => {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  storage = new FakeStorage();
  seq = 0;
  downloads = [];
  mount();
});

describe("phần xuất đầu-cuối qua DOM", () => {
  it("1: năm 2026 → .ics DTSTART 20270131, không 20260131; Khai 2 lần → 2 VEVENT (20260731, 20270131); gắn lại cùng Storage vẫn Khai 2 lần", () => {
    build();
    btn("download-ics").click();
    const once = lastDownload();
    expect(once.filename).toBe("thue-cho-thue-han-2026.ics");
    expect(once.content).toContain("DTSTART;VALUE=DATE:20270131");
    expect(once.content).not.toContain("20260131");
    expect(once.content.match(/BEGIN:VEVENT/g)).toHaveLength(1);

    const twice = root.querySelector('input[name="filingMode"][value="twice"]') as HTMLInputElement;
    twice.checked = true;
    twice.dispatchEvent(new Event("change", { bubbles: true }));
    btn("download-ics").click();
    const ics = lastDownload().content;
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260731");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270131");
    // gọi lặp lại không rò trạng thái
    btn("download-ics").click();
    expect(lastDownload().content).toBe(ics);

    const root2 = document.createElement("div");
    document.body.replaceChildren(root2);
    mount(root2);
    const again = root2.querySelector('input[name="filingMode"][value="twice"]') as HTMLInputElement;
    expect(again.checked).toBe(true);
    expect(loadLedger(storage).ledger.filingMode?.["2026"]).toBe("twice");
  });

  it("2: CSV đọc ngược: doanh thu 1.150.000.000, trừ 1.000.000.000, TNCN 7.500.000 (5% x 150tr), GTGT 57.500.000 (5% x 1.150tr) = số hiển thị = summarizeYear; 3 dòng phụ lục", () => {
    build();
    btn("download-csv").click();
    const d = lastDownload();
    expect(d.filename).toBe("thue-cho-thue-01TTS-2026.csv");
    expect(d.content.startsWith("﻿")).toBe(true);
    const rows = parseCsv(d.content);
    const s = summarizeYear(loadLedger(storage).ledger, 2026);
    const cases: [string, string, number, string][] = [
      ["Tổng doanh thu", "Tổng doanh thu", 1_150_000_000, "totalRevenue"],
      ["Mức doanh thu được trừ ngưỡng", "Mức doanh thu được trừ ngưỡng", 1_000_000_000, "totalDeduction"],
      ["Thuế TNCN", "Thuế TNCN", 7_500_000, "totalPit"],
      ["Thuế GTGT", "Thuế GTGT", 57_500_000, "totalVat"],
    ];
    for (const [csvLabel, shownLabel, hand, field] of cases) {
      const v = mainCsv(rows, csvLabel);
      expect(v).toBe(String(hand));
      expect(v).toBe(digits(mainShown(shownLabel)));
      expect(mainShown(shownLabel)).toBe(formatVnd(hand));
      expect(Number(v)).toBe((s as unknown as Record<string, number>)[field]);
    }
    const annex = annexRows(rows);
    expect(annex).toHaveLength(s.contracts.filter((c) => c.revenue > 0).length);
    expect(annex).toHaveLength(3);
    // cột 4 doanh thu, 5 mức trừ: T1 600/600, T2 300/300, T3 250/100 (trừ theo thứ tự hợp đồng, L4)
    expect(annex.map((r) => [r[0], r[4], r[5]])).toEqual([
      ["T1", "600000000", "600000000"],
      ["T2", "300000000", "300000000"],
      ["T3", "250000000", "100000000"],
    ]);
    expect(annex.reduce((a, r) => a + Number(r[7]), 0)).toBe(7_500_000);
    const shownAnnex = Array.from(root.querySelectorAll(".export-annex tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => (td.firstChild?.textContent ?? "").trim()),
    );
    shownAnnex.forEach((tr, i) => {
      for (const c of [4, 5, 6, 7]) expect(digits(tr[c]!)).toBe(annex[i]![c]);
    });
  });

  it('3: tên bên thuê `Nguyễn, Văn "Á"` và `=1+1` → CSV đọc ngược đúng tên, công thức có tiền tố \', không lệch cột', () => {
    build(['Nguyễn, Văn "Á"', "=1+1", "T3"]);
    btn("download-csv").click();
    const rows = parseCsv(lastDownload().content);
    const annex = annexRows(rows);
    expect(annex).toHaveLength(3);
    expect(annex[0]![0]).toBe('Nguyễn, Văn "Á"');
    expect(annex[1]![0]).toBe("'=1+1");
    expect(annex[2]![0]).toBe("T3");
    for (const r of annex) expect(r).toHaveLength(8);
    expect(annex[0]![4]).toBe("600000000");
  });

  it("4: sửa một kỳ thu → bảng và CSV tải lại đổi theo số mới (T3 250tr → 350tr: TNCN 12.500.000, GTGT 62.500.000)", () => {
    build();
    btn("download-csv").click();
    expect(mainCsv(parseCsv(lastDownload().content), "Thuế TNCN")).toBe("7500000");
    editReceipt("T3", 0, "350.000.000");
    // 5% x (1.250tr - 1.000tr) = 12.500.000; GTGT 5% x 1.250tr = 62.500.000
    expect(mainShown("Thuế TNCN")).toBe(formatVnd(12_500_000));
    expect(mainShown("Thuế GTGT")).toBe(formatVnd(62_500_000));
    btn("download-csv").click();
    const rows = parseCsv(lastDownload().content);
    expect(mainCsv(rows, "Thuế TNCN")).toBe("12500000");
    expect(mainCsv(rows, "Thuế GTGT")).toBe("62500000");
    expect(mainCsv(rows, "Tổng doanh thu")).toBe("1250000000");
    expect(annexRows(rows).map((r) => r[4])).toEqual(["600000000", "300000000", "350000000"]);
  });

  it("5: hạn trên màn hình khớp .ics (31/01/2027) và nút chép TNCN mang chữ số thuần", () => {
    build();
    expect(root.querySelector('.export-deadlines li[data-date="2027-01-31"]')).not.toBeNull();
    const pit = root.querySelector('button[aria-label="Chép Thuế TNCN"]') as HTMLElement;
    expect(pit.getAttribute("data-copy")).toBe("7500000");
  });
});
