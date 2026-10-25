import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deadlinesToIcs, icsFilename } from "../../src/export/ics";
import { rules2026 } from "../../src/rules/2026";
import { getDeadlines, type DeadlineItem } from "../../src/tax/deadlines";

const stamp = "20261026T000000Z";
const once = () => deadlinesToIcs(getDeadlines(2026, "once", rules2026), { year: 2026, stamp });
const fake = (date: string, citation = "căn cứ"): DeadlineItem => ({ date, kind: "filing", citation });
const lines = (s: string) => s.split("\r\n");
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("ics", () => {
  it("1: khai 1 lần có 1 VEVENT, khai 2 lần có 2 VEVENT theo thứ tự ngày", () => {
    expect(count(once(), "BEGIN:VEVENT")).toBe(1);
    const two = deadlinesToIcs(getDeadlines(2026, "twice", rules2026), { year: 2026, stamp });
    expect(count(two, "BEGIN:VEVENT")).toBe(2);
    expect(two.indexOf("DTSTART;VALUE=DATE:20260731")).toBeLessThan(two.indexOf("DTSTART;VALUE=DATE:20270131"));
    expect(icsFilename(2026)).toBe("thue-cho-thue-han-2026.ics");
  });

  it("2: năm tính thuế 2026 → hạn 31/01/2027 (L7), cả ngày, không T/Z", () => {
    const s = once();
    expect(s).toContain("DTSTART;VALUE=DATE:20270131\r\n");
    expect(s).toContain("DTEND;VALUE=DATE:20270201\r\n");
    expect(s).not.toContain("20260131");
    for (const l of lines(s).filter((x) => /^DT(START|END)/.test(x))) {
      expect(l.split(":")[1]).toMatch(/^\d{8}$/);
    }
  });

  it("3: DTEND ngày kế: 31/12 → 01/01, 28/02 nhuận → 29/02, 28/02 thường → 01/03", () => {
    const f = (d: string) => deadlinesToIcs([fake(d)], { year: 2026, stamp });
    expect(f("2026-12-31")).toContain("DTEND;VALUE=DATE:20270101");
    expect(f("2028-02-28")).toContain("DTEND;VALUE=DATE:20280229");
    expect(f("2027-02-28")).toContain("DTEND;VALUE=DATE:20270301");
    expect(f("2027-04-30")).toContain("DTEND;VALUE=DATE:20270501");
  });

  it("4: CRLF, gấp 75 octet, thoát , ; và đọc lại đúng căn cứ, VALARM, UID tất định", () => {
    const citation = "NĐ 68 Điều 8.3.d, 8.3.e (L7): khai 2 lần; hạn nộp \\ bằng hạn nộp hồ sơ, " + "dài ".repeat(40);
    const s = deadlinesToIcs([fake("2027-01-31", citation)], { year: 2026, stamp });
    expect(s.endsWith("\r\n")).toBe(true);
    expect(s.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const enc = new TextEncoder();
    for (const l of lines(s).slice(0, -1)) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(s).toContain("\\,");
    expect(s).toContain("\\;");
    const unfolded = s.replace(/\r\n /g, "");
    const d = lines(unfolded).find((l) => l.startsWith("DESCRIPTION:") && l.includes("NĐ 68"))!;
    const back = d
      .slice("DESCRIPTION:".length)
      .replace(/\\([\\;,n])/g, (_m, c: string) => (c === "n" ? "\n" : c));
    expect(back).toBe(citation);
    expect(s).toContain("TRIGGER:-P7D");
    expect(s).toContain("TRIGGER:-P1D");
    expect(once()).toBe(once());
    expect(once()).toContain("UID:2026-filing-20270131@thue-cho-thue");
    expect(once()).toContain("DTSTAMP:" + stamp);
  });

  it("4b: gọi lặp với đầu vào khác không rò trạng thái, danh sách rỗng vẫn là lịch hợp lệ", () => {
    const a = once();
    deadlinesToIcs([fake("2030-05-05")], { year: 2029, stamp });
    expect(once()).toBe(a);
    const empty = deadlinesToIcs([], { year: 2026, stamp });
    expect(empty).toContain("BEGIN:VCALENDAR");
    expect(empty).not.toContain("VEVENT");
  });

  it("5: src/export không có Date, ngẫu nhiên hay số luật viết cứng", () => {
    const dir = join(__dirname, "../../src/export");
    const banned = ["new Date", "Date.now", "Math.random", "1000000000", "1_000_000_000", "0.05", "rateBps", "/ 10000", "07-31", "01-31"];
    for (const f of readdirSync(dir)) {
      const text = readFileSync(join(dir, f), "utf8");
      for (const b of banned) expect(text, `${f} chứa ${b}`).not.toContain(b);
    }
  });
});
