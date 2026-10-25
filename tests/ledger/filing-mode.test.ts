import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { isLedgerError, type Ledger } from "../../src/ledger/model";
import { setFilingMode } from "../../src/ledger/ops";
import { parseLedger } from "../../src/ledger/schema";
import { summarizeYear } from "../../src/ledger/summary";
import { exportLedger, importLedger } from "../../src/ledger/backup";
import { LEDGER_KEY, loadLedger, saveLedger } from "../../src/ledger/storage";

const fixture = () => JSON.parse(readFileSync(join(__dirname, "fixtures", "ledger-v1.json"), "utf8"));
const base = (): Ledger => {
  const r = parseLedger(fixture());
  if (!r.ok) throw new Error(r.error);
  return r.ledger;
};
const must = (r: ReturnType<typeof setFilingMode>): Ledger => {
  if (isLedgerError(r)) throw new Error(r.error);
  return r;
};

describe("filingMode", () => {
  it("6: twice → hạn 31/07/2026 và 31/01/2027 (L7); không đặt → chỉ 31/01/2027", () => {
    const l = base();
    expect(summarizeYear(l, 2026, rules2026).deadlines.map((d) => d.date)).toEqual(["2027-01-31"]);
    const t = must(setFilingMode(l, 2026, "twice"));
    expect(summarizeYear(t, 2026, rules2026).deadlines.map((d) => d.date)).toEqual(["2026-07-31", "2027-01-31"]);
    const back = must(setFilingMode(t, 2026, "once"));
    expect(summarizeYear(back, 2026, rules2026).deadlines.map((d) => d.date)).toEqual(["2027-01-31"]);
  });

  it("7: sổ v1 cũ nạp được; setFilingMode không đổi sổ gốc; xuất rồi nhập giữ nguyên", () => {
    const l = base();
    expect(l.filingMode).toBeUndefined();
    const t = must(setFilingMode(l, 2026, "twice"));
    expect(l.filingMode).toBeUndefined();
    const out = exportLedger(t, "2026-10-26");
    const back = importLedger(out.text);
    expect(back.ok && back.ledger.filingMode).toEqual({ "2026": "twice" });
    expect(exportLedger(l, "2026-10-26").text).not.toContain("filingMode");
  });

  it("7b: giá trị lạ bị từ chối, kho giữ nguyên từng byte; setFilingMode báo lỗi tiếng Việt", () => {
    const d = fixture();
    d.filingMode = { "2026": "x" };
    const r = parseLedger(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/khai/);
    expect(parseLedger({ ...fixture(), filingMode: { abc: "once" } }).ok).toBe(false);
    expect(parseLedger({ ...fixture(), filingMode: [] }).ok).toBe(false);

    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(saveLedger(storage, base()).ok).toBe(true);
    const before = store.get(LEDGER_KEY);
    const bad = importLedger(JSON.stringify({ ...d, app: "thue-cho-thue" }));
    expect(bad.ok).toBe(false);
    expect(store.get(LEDGER_KEY)).toBe(before);
    expect(loadLedger(storage).error).toBeUndefined();

    const e = setFilingMode(base(), 2026, "x" as never);
    expect(isLedgerError(e) && e.error).toMatch(/khai/);
    expect(isLedgerError(setFilingMode(base(), 1.5, "once"))).toBe(true);
  });
});
