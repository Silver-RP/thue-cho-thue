// @vitest-environment happy-dom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { deadlinesToIcs } from "../../src/export/ics";
import { emptyLedger, type Ledger, type Receipt } from "../../src/ledger/model";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
import { mountLedger } from "../../src/ui/ledger";
import type { DeadlineItem } from "../../src/tax/deadlines";

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
let downloads: { filename: string; mime: string; content: string }[];

function seed(receipts: Receipt[]): void {
  const l: Ledger = emptyLedger();
  l.properties.push({ id: "p1", name: "Căn A" });
  l.contracts.push({ id: "c1", propertyId: "p1", tenant: "T1", signedOn: "2025-01-01", startOn: "2025-01-01" });
  l.receipts.push(...receipts);
  saveLedger(storage, l);
}
const mount = (today = "2026-10-26") =>
  mountLedger(root, {
    year: 2026,
    storage,
    today,
    newId: () => "x",
    confirm: () => true,
    download: (filename, mime, content) => void downloads.push({ filename, mime, content }),
  });
const btn = (name: string) => root.querySelector(`button[name="${name}"]`) as HTMLElement | null;
const big: Receipt = { id: "r1", contractId: "c1", receivedOn: "2026-03-01", amount: 1_200_000_000 };

const unfold = (s: string) => s.replace(/\r\n /g, "");
function eventsOf(ics: string): string[] {
  return unfold(ics).split("BEGIN:VEVENT").slice(1).map((s) => s.split("END:VEVENT")[0]!);
}
const alarms = (ev: string) => ev.split("BEGIN:VALARM").length - 1;
const fake = (date: string): DeadlineItem => ({ date, kind: "filing", citation: "c" });

beforeEach(() => {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  storage = new FakeStorage();
  downloads = [];
});

describe("hạn đã qua (H-20)", () => {
  it("1-2: Khai 2 lần ngày 26/10/2026 → 31/07/2026 nhãn đã qua, 31/01/2027 không; .ics: hạn qua không báo thức, hạn sau có đúng 2", () => {
    seed([big]);
    mount();
    const twice = root.querySelector('input[name="filingMode"][value="twice"]') as HTMLInputElement;
    twice.checked = true;
    twice.dispatchEvent(new Event("change", { bubbles: true }));
    const past = root.querySelector('.export-deadlines li[data-date="2026-07-31"]')!;
    const future = root.querySelector('.export-deadlines li[data-date="2027-01-31"]')!;
    expect(past.hasAttribute("data-past")).toBe(true);
    expect(past.textContent).toContain("đã qua");
    expect(future.hasAttribute("data-past")).toBe(false);
    expect(future.textContent).not.toContain("đã qua");
    // khối tổng năm của sổ cũng gắn nhãn
    const totalText = root.querySelector(".lg-total")!.textContent!;
    expect(totalText).toContain("31/07/2026");
    expect(totalText).toContain("đã qua");
    expect(totalText.match(/đã qua/g)).toHaveLength(1);

    btn("download-ics")!.click();
    const evs = eventsOf(downloads[0]!.content);
    expect(evs).toHaveLength(2);
    const e0731 = evs.find((e) => e.includes("DTSTART;VALUE=DATE:20260731"))!;
    const e0131 = evs.find((e) => e.includes("DTSTART;VALUE=DATE:20270131"))!;
    expect(alarms(e0731)).toBe(0);
    expect(e0731).toContain("(đã qua)");
    expect(alarms(e0131)).toBe(2);
    expect(e0131).not.toContain("(đã qua)");
    // gọi lặp lại không rò trạng thái
    btn("download-ics")!.click();
    expect(downloads[1]!.content).toBe(downloads[0]!.content);
  });

  it("hạn đúng hôm nay chưa qua; hôm sau thì đã qua", () => {
    seed([big]);
    mount("2027-01-31");
    expect(root.querySelector('.export-deadlines li[data-date="2027-01-31"]')!.hasAttribute("data-past")).toBe(false);
    root.replaceChildren();
    mount("2027-02-01");
    expect(root.querySelector('.export-deadlines li[data-date="2027-01-31"]')!.hasAttribute("data-past")).toBe(true);
  });
});

describe("deadlinesToIcs với today (H-20)", () => {
  const stamp = "20261026T000000Z";
  it("3: today = ngày hạn còn báo thức, hôm sau không, không truyền thì như cũ", () => {
    const items = [fake("2026-07-31"), fake("2027-01-31")];
    const run = (today?: string) =>
      eventsOf(deadlinesToIcs(items, { year: 2026, stamp, ...(today ? { today } : {}) })).map(alarms);
    expect(run("2026-07-31")).toEqual([2, 2]);
    expect(run("2026-08-01")).toEqual([0, 2]);
    expect(run("2027-02-01")).toEqual([0, 0]);
    expect(run()).toEqual([2, 2]);
    expect(unfold(deadlinesToIcs(items, { year: 2026, stamp, today: "2026-08-01" }))).toContain("(đã qua)");
    expect(unfold(deadlinesToIcs(items, { year: 2026, stamp }))).not.toContain("(đã qua)");
  });

  it("4: mã nguồn xuất không đọc giờ hệ thống", () => {
    const files = [join("src", "ui", "export.ts")];
    for (const f of readdirSync(join("src", "export"))) {
      const p = join("src", "export", f);
      if (statSync(p).isFile()) files.push(p);
    }
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/new Date\(|Date\.now\(/);
    }
  });
});

describe("năm không có doanh thu (H-19)", () => {
  it("5: chỉ có kỳ thu 2025 → câu chưa có kỳ thu năm 2026, không hạn/bảng/nút", () => {
    seed([{ id: "r1", contractId: "c1", receivedOn: "2025-03-01", amount: 5 }]);
    mount();
    const exp = root.querySelector(".lg-export")!;
    expect(exp.textContent).toContain("Chưa có kỳ thu năm 2026");
    expect(btn("download-ics")).toBeNull();
    expect(btn("download-csv")).toBeNull();
    expect(root.querySelector(".export-main")).toBeNull();
    expect(root.querySelector(".export-deadlines")).toBeNull();
  });

  it("6: trả trước 2025-12-01 phân bổ 2 năm → 2026 vẫn có hạn và nút .ics", () => {
    seed([{ id: "r1", contractId: "c1", receivedOn: "2025-12-01", amount: 2_400_000_000, prepaid: { years: 2, mode: "allocate" } }]);
    mount();
    expect(root.querySelector(".export-deadlines li")).not.toBeNull();
    expect(btn("download-ics")).not.toBeNull();
  });
});
