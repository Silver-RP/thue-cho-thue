// @vitest-environment happy-dom
// Mẫu hiện hành là 01/BĐS (01/TTS đã bị thay); dưới ngưỡng vẫn phải thông báo doanh thu.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { csvFilename } from "../../src/export/csv";
import { buildDeclaration } from "../../src/export/declaration";
import { form01BDS } from "../../src/export/forms";
import { summarizeYear } from "../../src/ledger/summary";
import { rules2026 } from "../../src/rules/2026";
import { emptyLedger, type Ledger } from "../../src/ledger/model";
import { saveLedger, type StorageLike } from "../../src/ledger/storage";
import { startApp } from "../../src/start";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const body = ((html.match(/<body[^>]*>([\s\S]*)<\/body>/) ?? [])[1] ?? "").replace(/<script[\s\S]*?<\/script>/g, "");

function book(amount: number): Ledger {
  const l = emptyLedger();
  l.properties.push({ id: "P1", name: "Căn 1" });
  l.contracts.push({ id: "C1", propertyId: "P1", tenant: "Người 1", signedOn: "2026-01-01", startOn: "2026-01-01" });
  l.receipts.push({ id: "R1", contractId: "C1", receivedOn: "2026-02-05", amount });
  return l;
}

function exportText(amount: number): string {
  const storage = new FakeStorage();
  saveLedger(storage, book(amount));
  startApp(document, { today: "2027-01-10", storage, events: new EventTarget(), newId: () => "x", confirm: () => true, download: () => {} });
  return document.querySelector("#export-slot")!.textContent!;
}

beforeEach(() => {
  document.body.innerHTML = body;
  window.location.hash = "";
});

describe("tờ khai dùng mẫu 01/BĐS", () => {
  it("phải nộp thuế: nêu 01/BĐS và 01/BK-BĐS, không còn mẫu cũ, vẫn ghi chưa xác nhận", () => {
    const text = exportText(1_200_000_000);
    expect(text).toContain("01/BĐS");
    expect(text).toContain("01/BK-BĐS");
    expect(text).not.toContain("TTS");
    expect(text).toContain("chưa xác nhận mẫu");
  });

  it("tên file CSV theo mẫu mới", () => {
    expect(csvFilename(2026)).toBe("thue-cho-thue-01BDS-2026.csv");
  });
});

describe("dưới ngưỡng", () => {
  it("nói rõ mẫu thông báo và cách xử lý khi eTax vẫn tính thuế", () => {
    const text = exportText(700_000_000);
    expect(text).toContain("01/BĐS");
    expect(text).toContain("eTax vẫn tính thuế");
    expect(text).toContain("cơ quan thuế");
  });

  it("phần giải đáp có câu hỏi riêng cho người dưới ngưỡng", () => {
    const info = document.querySelector("#info")!.textContent!;
    expect(info).toContain("Không phải nộp thuế thì có cần làm gì không?");
    expect(info).toContain("01/BĐS");
  });
});

describe("cột theo mẫu 01/BĐS và 01/BK-BĐS", () => {
  const decl = () => {
    const l = book(1_200_000_000);
    return buildDeclaration(l, summarizeYear(l, 2026, rules2026), form01BDS);
  };

  it("tờ khai: đúng mã chỉ tiêu trên mẫu", () => {
    expect(decl().main.map((r) => r[0])).toEqual(["[01c]", "[09]", "[10]", "[11]", "[12]", "[18]"]);
  });

  it("bảng kê: có mã cột; bên thuê ghi rõ không có trên mẫu", () => {
    const h = decl().annexHeader;
    for (const code of ["[04]", "[08]", "[09]", "[10]", "[12]", "[13]"]) expect(h.join("|")).toContain(code);
    expect(h[0]).toContain("không có trên mẫu");
  });

  it("nêu rõ phần app chưa có: tách 6 tháng, tiền phạt, tổng giá trị hợp đồng", () => {
    const notes = decl().notes.join(" ");
    for (const s of ["[01a]", "[01b]", "tiền phạt", "tổng giá trị hợp đồng", "Thông tư 18/2026", "500 triệu"]) expect(notes).toContain(s);
  });
});
