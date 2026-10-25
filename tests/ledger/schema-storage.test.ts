import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { emptyLedger } from "../../src/ledger/model";
import { parseLedger } from "../../src/ledger/schema";
import { summarizeYear } from "../../src/ledger/summary";
import { BACKUP_KEY, LEDGER_KEY, loadLedger, saveLedger } from "../../src/ledger/storage";
import { exportLedger, importLedger } from "../../src/ledger/backup";

class MemStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? (this.data.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

const fixtureText = readFileSync(join(__dirname, "fixtures", "ledger-v1.json"), "utf8");
const fixture = () => JSON.parse(fixtureText);

const cases: [string, (d: any) => unknown][] = [
  ["thiếu schemaVersion", (d) => (delete d.schemaVersion, d)],
  ['amount "12.000.000"', (d) => ((d.receipts[0].amount = "12.000.000"), d)],
  ["amount 1.5", (d) => ((d.receipts[0].amount = 1.5), d)],
  ["receivedOn 2026-02-30", (d) => ((d.receipts[0].receivedOn = "2026-02-30"), d)],
  ["hợp đồng trỏ căn không có", (d) => ((d.contracts[0].propertyId = "PX"), d)],
  ["kỳ thu trỏ hợp đồng không có", (d) => ((d.receipts[0].contractId = "CX"), d)],
  ["id trùng", (d) => ((d.properties[1].id = "P1"), d)],
  ["id trùng giữa căn và hợp đồng", (d) => ((d.contracts[0].id = "P1"), d)],
  ["prepaid.mode x", (d) => ((d.receipts[2].prepaid.mode = "x"), d)],
  ["prepaid.years 0", (d) => ((d.receipts[2].prepaid.years = 0), d)],
  ["deductionChoice trỏ hợp đồng không có", (d) => ((d.deductionChoice["2026"] = "CX"), d)],
  ["null", () => null],
  ["mảng rỗng", () => []],
];

describe("schema", () => {
  it("1: ledger-v1.json nạp được; 2026: doanh thu 300tr + 400tr + 800tr/2 = 1.1 tỷ, vượt 100tr, TNCN 5% = 5.000.000", () => {
    const r = parseLedger(fixture());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = summarizeYear(r.ledger, 2026, rules2026);
    expect(s.totalRevenue).toBe(1_100_000_000);
    expect(s.contracts.reduce((a, c) => a + c.pit, 0)).toBe(5_000_000);
  });

  it("2: migrations giả v1 → v2 chạy đúng thứ tự, giữ đủ bản ghi", () => {
    const calls: number[] = [];
    const r = parseLedger(fixture(), {
      currentVersion: 3,
      migrations: {
        1: (d) => (calls.push(1), { ...d }),
        2: (d) => (calls.push(2), { ...d }),
      },
    });
    expect(calls).toEqual([1, 2]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ledger.receipts).toHaveLength(3);
      expect(r.ledger.contracts).toHaveLength(3);
      expect(r.ledger.schemaVersion).toBe(3);
    }
    expect(parseLedger(fixture(), { currentVersion: 2, migrations: {} }).ok).toBe(false);
  });

  it.each(cases)("3: sai cấu trúc %s → ok:false", (_n, mutate) => {
    const r = parseLedger(mutate(fixture()));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });

  it("5: schemaVersion 99 bị từ chối, nói phiên bản mới hơn", () => {
    const r = parseLedger({ ...fixture(), schemaVersion: 99 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("mới hơn");
  });
});

describe("lưu trữ và nhập", () => {
  function storeWithValid() {
    const s = new MemStorage();
    s.setItem(LEDGER_KEY, JSON.stringify(parseLedgerOrThrow()));
    return s;
  }
  function parseLedgerOrThrow() {
    const r = parseLedger(fixture());
    if (!r.ok) throw new Error(r.error);
    return r.ledger;
  }

  it("4: nhập chuỗi hỏng và từng ca sai → lỗi, khoá chính giữ nguyên từng byte", () => {
    const s = storeWithValid();
    const before = s.getItem(LEDGER_KEY);
    const texts = ["{", ...cases.map(([, m]) => JSON.stringify(m(fixture())))];
    texts.push(JSON.stringify({ ...fixture(), app: "khac" }));
    for (const t of texts) {
      const r = importLedger(t);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).not.toBe("");
    }
    expect(s.getItem(LEDGER_KEY)).toBe(before);
    expect(s.getItem(BACKUP_KEY)).toBeNull();
  });

  it("5: loadLedger gặp phiên bản 99 không ghi khoá chính", () => {
    const s = new MemStorage();
    const raw = JSON.stringify({ ...fixture(), schemaVersion: 99 });
    s.setItem(LEDGER_KEY, raw);
    const r = loadLedger(s);
    expect(r.error).toContain("mới hơn");
    expect(r.ledger).toEqual(emptyLedger());
    expect(s.getItem(LEDGER_KEY)).toBe(raw);
  });

  it("6: khoá chính hỏng → sổ rỗng + lỗi, dự phòng giữ chuỗi cũ, lần hai không ghi đè", () => {
    const s = new MemStorage();
    s.setItem(LEDGER_KEY, "{hỏng");
    const r = loadLedger(s);
    expect(r.ledger).toEqual(emptyLedger());
    expect(r.error).toBeTruthy();
    expect(s.getItem(BACKUP_KEY)).toBe("{hỏng");
    expect(s.getItem(LEDGER_KEY)).toBe("{hỏng");
    s.setItem(LEDGER_KEY, "{hỏng lần hai");
    loadLedger(s);
    expect(s.getItem(BACKUP_KEY)).toBe("{hỏng");
  });

  it("khoá rỗng → sổ rỗng không lỗi, không ghi gì; save rồi load trả lại đúng sổ", () => {
    const s = new MemStorage();
    expect(loadLedger(s)).toEqual({ ledger: emptyLedger() });
    expect(s.data.size).toBe(0);
    const l = parseLedgerOrThrow();
    expect(saveLedger(s, l)).toEqual({ ok: true });
    expect(loadLedger(s)).toEqual({ ledger: l });
  });

  it("saveLedger từ chối sổ sai, không ghi", () => {
    const s = new MemStorage();
    const l = parseLedgerOrThrow();
    l.receipts[0].amount = 1.5;
    expect(saveLedger(s, l).ok).toBe(false);
    expect(s.data.size).toBe(0);
  });

  it("7: xuất rồi nhập → toEqual; tên file và nội dung", () => {
    const l = parseLedgerOrThrow();
    const e = exportLedger(l, "2026-10-26");
    expect(e.filename).toBe("thue-cho-thue-2026-10-26.json");
    expect(e.text).toContain('"schemaVersion": 1');
    expect(e.text).toContain('"app": "thue-cho-thue"');
    const r = importLedger(e.text);
    expect(r).toEqual({ ok: true, ledger: l });
    const e2 = exportLedger(emptyLedger(), "2026-01-01");
    expect(importLedger(e2.text)).toEqual({ ok: true, ledger: emptyLedger() });
  });
});
