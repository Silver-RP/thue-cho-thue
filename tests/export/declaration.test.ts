import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { declarationToCsv, csvFilename, toCsv } from "../../src/export/csv";
import { buildDeclaration } from "../../src/export/declaration";
import { form01TTS, type FormConfig } from "../../src/export/forms";
import type { Ledger } from "../../src/ledger/model";
import { parseLedger } from "../../src/ledger/schema";
import { summarizeYear } from "../../src/ledger/summary";
import { rules2026 } from "../../src/rules/2026";

const M = 1_000_000;

/** Bộ đọc CSV RFC 4180 tối thiểu (bỏ BOM). */
function readCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\r" && t[i + 1] === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const ledger2 = (): Ledger => ({
  schemaVersion: 1,
  properties: [{ id: "P1", name: "Căn A", address: "1 Lê Lợi" }, { id: "P2", name: "Căn B" }],
  contracts: [
    { id: "A", propertyId: "P1", tenant: "Nguyễn, Văn \"A\"", signedOn: "2025-01-01", startOn: "2025-01-01", endOn: "2027-06-30" },
    { id: "B", propertyId: "P2", tenant: "=cmd", signedOn: "2026-01-01", startOn: "2026-01-01" },
  ],
  receipts: [
    { id: "R1", contractId: "A", receivedOn: "2026-02-01", amount: 700 * M },
    { id: "R2", contractId: "B", receivedOn: "2026-02-01", amount: 700 * M },
    { id: "R3", contractId: "A", receivedOn: "2025-12-15", amount: 50 * M },
  ],
  deductionChoice: { "2026": "B" },
});

const fixture = (): Ledger => {
  const r = parseLedger(JSON.parse(readFileSync(join(__dirname, "../ledger/fixtures/ledger-v1.json"), "utf8")));
  if (!r.ok) throw new Error(r.error);
  return r.ledger;
};

const build = (l: Ledger, f: FormConfig = form01TTS) => buildDeclaration(l, summarizeYear(l, 2026, rules2026), f);

describe("forms + declaration", () => {
  it("1: mẫu chưa xác nhận, code chuỗi không rỗng hoặc null; thêm trường vào cấu hình giả thì bảng có thêm", () => {
    expect(form01TTS.confirmed).toBe(false);
    for (const f of [...form01TTS.fields, ...form01TTS.annexColumns]) {
      expect(f.code === null || (typeof f.code === "string" && f.code.length > 0)).toBe(true);
    }
    const l = ledger2();
    const extra: FormConfig = { ...form01TTS, fields: [...form01TTS.fields, { code: "X1", label: "Trường thêm", value: () => 7 }] };
    const d = build(l, extra);
    expect(d.main.length).toBe(build(l).main.length + 1);
    expect(d.main[d.main.length - 1]).toEqual(["X1", "Trường thêm", 7]);
  });

  it("5 (L4, L6): 2 căn, B trừ ngưỡng, kỳ thu 2025 không tính", () => {
    const d = build(ledger2());
    const v = (label: string) => d.main.find((r) => r[1] === label)![2];
    expect(v("Tổng doanh thu")).toBe(1400 * M);
    expect(v("Mức doanh thu được trừ ngưỡng")).toBe(1000 * M);
    expect(v("Thuế TNCN")).toBe(20 * M);
    const rowOf = (tenant: string) => d.annex.find((r) => r[0] === tenant)!;
    const a = rowOf("Nguyễn, Văn \"A\"");
    const b = rowOf("=cmd");
    expect(a.slice(4, 6)).toEqual([700 * M, 300 * M]);
    expect(a[7]).toBe(20 * M);
    expect(b.slice(4, 6)).toEqual([700 * M, 700 * M]);
    expect(b[7]).toBe(0);
    expect(a[1]).toBe("Căn A - 1 Lê Lợi");
    expect(a[3]).toBe("2027-06-30");
  });

  it("6: đối chiếu summarizeYear với sổ mục 5 và fixture v1", () => {
    for (const l of [ledger2(), fixture()]) {
      const s = summarizeYear(l, 2026, rules2026);
      const d = buildDeclaration(l, s, form01TTS);
      expect(d.main.map((r) => r[2])).toEqual(["Năm 2026", s.totalRevenue, s.totalDeduction, s.totalVat, s.totalPit, s.totalTax]);
      expect(d.annex.reduce((t, r) => t + (r[7] as number), 0)).toBe(s.totalPit);
      expect(d.annex.length).toBe(s.contracts.length);
    }
  });

  it("7: ước tính GTGT và chưa xác nhận mẫu có trong bảng và CSV; gọi lặp lại giống nhau", () => {
    const l = ledger2();
    const d = build(l);
    expect(rules2026.vat.unconfirmed).toBe(true);
    expect(d.main.find((r) => String(r[1]).startsWith("Thuế GTGT"))![1]).toContain("ước tính");
    expect(d.annexHeader.join("|")).toContain("ước tính");
    expect(d.notes.join(" ")).toContain("chưa xác nhận mẫu");
    const csv = declarationToCsv(d);
    expect(csv).toContain("ước tính");
    expect(csv).toContain("chưa xác nhận mẫu");
    expect(declarationToCsv(build(l))).toBe(csv);
    expect(csvFilename(2026)).toBe("thue-cho-thue-01TTS-2026.csv");
  });

  it("7: sổ trống vẫn dựng được, không có phụ lục", () => {
    const l = ledger2();
    l.receipts = [];
    const d = build(l);
    expect(d.annex).toEqual([]);
    expect(d.main.map((r) => r[2]).slice(1)).toEqual([0, 0, 0, 0, 0]);
  });

  it("7: quét src/export không có số luật và không dùng Date", () => {
    const dir = join(__dirname, "../../src/export");
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), "utf8");
      for (const bad of ["new Date", "Date.now", "Math.random", "1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"]) {
        expect(src, `${f}: ${bad}`).not.toContain(bad);
      }
    }
  });
});

describe("csv", () => {
  it("2: BOM, CRLF, tiền là chữ số thuần", () => {
    const s = toCsv([["a", 1200000000], ["b", 0]]);
    expect(s.startsWith("﻿")).toBe(true);
    expect(s).toBe("﻿a,1200000000\r\nb,0\r\n");
    expect(s).not.toMatch(/\d\.\d|đ/);
  });

  it("3: dấu phẩy, nháy kép, xuống dòng được trích dẫn và đọc ngược đúng", () => {
    const rows = [["Nguyễn, Văn \"A\"", "dòng1\ndòng2", 5], ["", "x", 0], ["crlf\r\nz", "", 1]];
    const s = toCsv(rows);
    expect(s).toContain('"Nguyễn, Văn ""A"""');
    expect(readCsv(s)).toEqual(rows.map((r) => r.map(String)));
  });

  it("4: ô bắt đầu bằng = + - @ có tiền tố ', số không bị đổi", () => {
    const s = toCsv([["=SUM(A1)", "+1", "-1", "@x", 12, "bình thường"]]);
    expect(readCsv(s)[0]).toEqual(["'=SUM(A1)", "'+1", "'-1", "'@x", "12", "bình thường"]);
  });

  it("4: số âm, lẻ hoặc không an toàn bị từ chối", () => {
    expect(() => toCsv([[-1]])).toThrow();
    expect(() => toCsv([[1.5]])).toThrow();
    expect(() => toCsv([[2 ** 53]])).toThrow();
  });

  it("3/5: CSV khai báo từ sổ 2 căn đọc ngược ra đúng ô", () => {
    const rows = readCsv(declarationToCsv(build(ledger2())));
    const tncn = rows.find((r) => r[1] === "Thuế TNCN")!;
    expect(tncn[2]).toBe("20000000");
    const a = rows.find((r) => r[0] === "Nguyễn, Văn \"A\"")!;
    expect(a.length).toBe(form01TTS.annexColumns.length);
    expect(rows.find((r) => r[0] === "'=cmd")).toBeTruthy();
  });
});
