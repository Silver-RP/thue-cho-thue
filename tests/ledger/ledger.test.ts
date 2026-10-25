import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules2026 } from "../../src/rules/2026";
import { emptyLedger, isLedgerError, type Ledger } from "../../src/ledger/model";
import {
  addContract,
  addProperty,
  addReceipt,
  removeContract,
  removeProperty,
  removeReceipt,
  setDeductionChoice,
  updateReceipt,
} from "../../src/ledger/ops";
import { ledgerToPayments, summarizeYear } from "../../src/ledger/summary";

function idGen(prefix = "id") {
  let n = 0;
  return () => `${prefix}${++n}`;
}

function ok(r: ReturnType<typeof addProperty>): Ledger {
  if (isLedgerError(r)) throw new Error(r.error);
  return r;
}

const M = 1_000_000;

/** Dựng sổ: căn P1 (hợp đồng C1, C2), căn P2 (hợp đồng C3); id cố định. */
function build(): Ledger {
  const newId = idGen();
  let l = ok(addProperty(emptyLedger(), { name: "Căn 1" }, () => "P1"));
  l = ok(addProperty(l, { name: "Căn 2", address: "Q1" }, () => "P2"));
  const c = { signedOn: "2026-01-01", startOn: "2026-01-01", tenant: "A" };
  l = ok(addContract(l, { ...c, propertyId: "P1" }, () => "C1"));
  l = ok(addContract(l, { ...c, propertyId: "P1", tenant: "B" }, () => "C2"));
  l = ok(addContract(l, { ...c, propertyId: "P2", tenant: "C" }, () => "C3"));
  void newId;
  return l;
}

describe("phép sửa sổ", () => {
  it("1: 2 căn, 3 hợp đồng, 5 kỳ thu; sổ cũ không đổi; sửa tiền đúng bản ghi", () => {
    const base = build();
    const snapshot = structuredClone(base);
    const newId = idGen("R");
    let l = base;
    for (const [cid, amt] of [["C1", 1], ["C1", 2], ["C2", 3], ["C3", 4], ["C3", 5]] as const) {
      l = ok(addReceipt(l, { contractId: cid, receivedOn: "2026-03-01", amount: amt * M }, newId));
    }
    expect(base).toEqual(snapshot);
    expect(l.properties).toHaveLength(2);
    expect(l.contracts).toHaveLength(3);
    expect(l.receipts).toHaveLength(5);

    const before = structuredClone(l);
    const l2 = ok(updateReceipt(l, "R2", { amount: 9 * M }));
    expect(l).toEqual(before);
    expect(l2.receipts.map((r) => r.amount)).toEqual([1 * M, 9 * M, 3 * M, 4 * M, 5 * M]);
    expect(l2.receipts[1].id).toBe("R2");
  });

  it("kiểm đầu vào kỳ thu: tiền lẻ/âm/không an toàn, ngày không có thật, hợp đồng không có, trả trước sai", () => {
    const l = build();
    const bad = [
      { contractId: "C1", receivedOn: "2026-03-01", amount: 1.5 },
      { contractId: "C1", receivedOn: "2026-03-01", amount: -1 },
      { contractId: "C1", receivedOn: "2026-03-01", amount: 2 ** 53 },
      { contractId: "C1", receivedOn: "2026-02-30", amount: 1 },
      { contractId: "C1", receivedOn: "03/01/2026", amount: 1 },
      { contractId: "NOPE", receivedOn: "2026-03-01", amount: 1 },
      { contractId: "C1", receivedOn: "2026-03-01", amount: 1, prepaid: { years: 0, mode: "lump" as const } },
      { contractId: "C1", receivedOn: "2026-03-01", amount: 1, prepaid: { years: 1.5, mode: "lump" as const } },
      { contractId: "C1", receivedOn: "2026-03-01", amount: 1, prepaid: { years: 2, mode: "x" as "lump" } },
    ];
    for (const b of bad) {
      const r = addReceipt(l, b, idGen());
      expect(isLedgerError(r), JSON.stringify(b)).toBe(true);
      if (isLedgerError(r)) expect(r.error).not.toMatch(/receivedOn|amount|contractId/);
    }
    expect(l.receipts).toEqual([]);
  });

  it("đầu vào rỗng: tên căn trống bị từ chối; hợp đồng trỏ căn không có bị từ chối", () => {
    expect(isLedgerError(addProperty(emptyLedger(), { name: "  " }, idGen()))).toBe(true);
    const r = addContract(emptyLedger(), { propertyId: "x", tenant: "a", signedOn: "2026-01-01", startOn: "2026-01-01" }, idGen());
    expect(isLedgerError(r)).toBe(true);
  });

  it("2: xoá căn còn hợp đồng -> lỗi, sổ không đổi; cascade xoá con, bỏ lựa chọn, tổng giảm", () => {
    let l = build();
    l = ok(addReceipt(l, { contractId: "C1", receivedOn: "2026-02-01", amount: 700 * M }, () => "R1"));
    l = ok(addReceipt(l, { contractId: "C3", receivedOn: "2026-02-01", amount: 700 * M }, () => "R2"));
    l = ok(setDeductionChoice(l, 2026, "C1"));
    const snap = structuredClone(l);

    const e = removeProperty(l, "P1");
    expect(isLedgerError(e)).toBe(true);
    if (isLedgerError(e)) expect(e.error).toMatch(/hợp đồng/);
    expect(l).toEqual(snap);

    // trước: 1,4 tỷ, trừ 1 tỷ, 400tr x 5% = 20tr
    expect(summarizeYear(l, 2026, rules2026).totalPit).toBe(20 * M);
    const after = ok(removeProperty(l, "P1", { cascade: true }));
    expect(after.properties.map((p) => p.id)).toEqual(["P2"]);
    expect(after.contracts.map((c) => c.id)).toEqual(["C3"]);
    expect(after.receipts.map((r) => r.id)).toEqual(["R2"]);
    expect(after.deductionChoice).toEqual({});
    // sau: chỉ 700tr <= ngưỡng
    const s = summarizeYear(after, 2026, rules2026);
    expect(s.totalRevenue).toBe(700 * M);
    expect(s.status).toBe("notify_only");
    expect(l).toEqual(snap);
  });

  it("hợp đồng còn kỳ thu: từ chối, cascade xoá kỳ thu; xoá kỳ thu đơn lẻ", () => {
    let l = build();
    l = ok(addReceipt(l, { contractId: "C1", receivedOn: "2026-02-01", amount: 1 }, () => "R1"));
    expect(isLedgerError(removeContract(l, "C1"))).toBe(true);
    expect(ok(removeContract(l, "C1", { cascade: true })).receipts).toEqual([]);
    expect(ok(removeReceipt(l, "R1")).receipts).toEqual([]);
    expect(isLedgerError(removeReceipt(l, "none"))).toBe(true);
  });

  it("5: xoá hợp đồng đang được chọn (cascade) -> lựa chọn bị bỏ; id không có -> error", () => {
    let l = build();
    l = ok(addReceipt(l, { contractId: "C2", receivedOn: "2026-02-01", amount: 5 }, () => "R1"));
    l = ok(setDeductionChoice(l, 2026, "C2"));
    expect(l.deductionChoice["2026"]).toBe("C2");
    const after = ok(removeContract(l, "C2", { cascade: true }));
    expect(after.deductionChoice["2026"]).toBeUndefined();
    expect(isLedgerError(setDeductionChoice(l, 2026, "none"))).toBe(true);
    expect(ok(setDeductionChoice(l, 2026, null)).deductionChoice).toEqual({});
  });
});

describe("tổng năm", () => {
  it("3 (L6): ký 2025-11-01, nhận 100tr 2025-12-01 + 12 x 100tr trong 2026 -> 2026: 1,2 tỷ, TNCN 10tr; 2025 notify_only", () => {
    let l = build();
    const newId = idGen("R");
    l = ok(addReceipt(l, { contractId: "C1", receivedOn: "2025-12-01", amount: 100 * M }, newId));
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      l = ok(addReceipt(l, { contractId: "C1", receivedOn: `2026-${mm}-05`, amount: 100 * M }, newId));
    }
    const s = summarizeYear(l, 2026, rules2026);
    expect(s.totalRevenue).toBe(1_200 * M);
    expect(s.totalPit).toBe(10 * M);
    expect(s.revenueByProperty).toEqual([
      { propertyId: "P1", name: "Căn 1", revenue: 1_200 * M },
      { propertyId: "P2", name: "Căn 2", revenue: 0 },
    ]);
    // 2025 không có luật trong repo: truyền luật năm 2026 bị từ chối, không tính nhầm
    expect(() => summarizeYear(l, 2025, rules2026)).toThrow();
    const s25 = summarizeYear(l, 2025, { ...rules2026, year: 2025 });
    expect(s25.totalRevenue).toBe(100 * M);
    expect(s25.status).toBe("notify_only");
  });

  it("4 (L4): A 700tr + B 700tr, chọn B -> TNCN A 20tr, B 0; chọn A -> A 0, B 20tr", () => {
    let l = build();
    l = ok(addReceipt(l, { contractId: "C1", receivedOn: "2026-02-01", amount: 700 * M }, () => "R1"));
    l = ok(addReceipt(l, { contractId: "C2", receivedOn: "2026-03-01", amount: 700 * M }, () => "R2"));
    const get = (s: ReturnType<typeof summarizeYear>, id: string) => s.contracts.find((c) => c.contractId === id)!;

    const b = summarizeYear(ok(setDeductionChoice(l, 2026, "C2")), 2026, rules2026);
    expect(get(b, "C2").deduction).toBe(700 * M);
    expect(get(b, "C1").deduction).toBe(300 * M);
    expect(get(b, "C1").pit).toBe(20 * M);
    expect(get(b, "C2").pit).toBe(0);

    const a = summarizeYear(ok(setDeductionChoice(l, 2026, "C1")), 2026, rules2026);
    expect(get(a, "C1").pit).toBe(0);
    expect(get(a, "C2").pit).toBe(20 * M);
  });

  it("6 (L6): trả trước 300tr nhận 2025-12-31, 3 năm, allocate -> 2026 là 100tr", () => {
    let l = build();
    l = ok(
      addReceipt(l, { contractId: "C1", receivedOn: "2025-12-31", amount: 300 * M, prepaid: { years: 3, mode: "allocate" } }, () => "R1"),
    );
    expect(summarizeYear(l, 2026, rules2026).totalRevenue).toBe(100 * M);
  });

  it("7 (L2): đúng 1 tỷ không cảnh báo; thêm 1 đồng ngày 2026-09-15 -> crossedOn 2026-09-15", () => {
    let l = build();
    const newId = idGen("R");
    for (let m = 1; m <= 9; m++) {
      l = ok(addReceipt(l, { contractId: "C1", receivedOn: `2026-0${m}-01`, amount: 100 * M }, newId));
    }
    l = ok(addReceipt(l, { contractId: "C2", receivedOn: "2026-09-10", amount: 100 * M }, newId));
    const exact = summarizeYear(l, 2026, rules2026);
    expect(exact.totalRevenue).toBe(1_000 * M);
    expect(exact.status).toBe("notify_only");
    expect(exact.thresholdWarning).toBeNull();

    const over = summarizeYear(ok(addReceipt(l, { contractId: "C1", receivedOn: "2026-09-15", amount: 1 }, newId)), 2026, rules2026);
    expect(over.thresholdWarning).toEqual({ crossedOn: "2026-09-15" });
    // gọi lặp lại: không rò trạng thái
    expect(summarizeYear(l, 2026, rules2026).thresholdWarning).toBeNull();
  });

  it("sổ rỗng: không lỗi, không cảnh báo; rules mặc định lấy theo năm", () => {
    const s = summarizeYear(emptyLedger(), 2026);
    expect(s.totalRevenue).toBe(0);
    expect(s.thresholdWarning).toBeNull();
    expect(ledgerToPayments(emptyLedger())).toEqual([]);
  });

  it("lựa chọn trỏ hợp đồng đã mất (sổ sửa tay) không làm hỏng tính toán", () => {
    let l = build();
    l = ok(addReceipt(l, { contractId: "C1", receivedOn: "2026-02-01", amount: 1_100 * M }, () => "R1"));
    l = { ...l, deductionChoice: { "2026": "ghost" } };
    expect(summarizeYear(l, 2026, rules2026).totalPit).toBe(5 * M);
  });
});

describe("quét số luật trong src/ledger", () => {
  const dir = join(__dirname, "../../src/ledger");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("8: không chứa số luật; summary.ts import computeAnnual", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      for (const bad of ["1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"]) {
        expect(text.includes(bad), `${f} chứa ${bad}`).toBe(false);
      }
    }
    expect(readFileSync(join(dir, "summary.ts"), "utf8")).toMatch(/import[^;]*computeAnnual/);
  });
});
