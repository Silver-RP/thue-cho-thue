import type { DeadlineItem } from "../tax/deadlines";

export interface IcsOptions {
  /** Năm tính thuế */
  year: number;
  /** DTSTAMP, dạng YYYYMMDDTHHMMSSZ, do người gọi truyền vào */
  stamp: string;
  /** Hôm nay (YYYY-MM-DD). Có truyền thì hạn đã qua (date < today) không có báo thức. */
  today?: string;
}

const encoder = new TextEncoder();

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysIn(y: number, m: number): number {
  if (m === 2) return isLeap(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** Ngày kế tiếp của YYYY-MM-DD, tính trên lịch, không qua múi giờ. */
export function nextDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Ngày không hợp lệ: ${iso}`);
  let y = Number(m[1]);
  let mo = Number(m[2]);
  let d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) throw new Error(`Ngày không có thật: ${iso}`);
  d += 1;
  if (d > daysIn(y, mo)) {
    d = 1;
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const compact = (iso: string) => iso.replace(/-/g, "");

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Gấp dòng ở 75 octet (không cắt giữa ký tự UTF-8); dòng nối bắt đầu bằng một khoảng trắng. */
function fold(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (size + n > limit) {
      out.push(cur);
      cur = " ";
      size = 1;
      limit = 75;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out;
}

function title(item: DeadlineItem, year: number): string {
  return item.kind === "revenue_notice"
    ? `Hạn thông báo doanh thu cho thuê tài sản năm ${year}`
    : `Hạn khai và nộp thuế cho thuê tài sản năm ${year}`;
}

function alarm(trigger: string, text: string): string[] {
  return ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(text)}`, `TRIGGER:${trigger}`, "END:VALARM"];
}

export function icsFilename(year: number): string {
  return `thue-cho-thue-han-${year}.ics`;
}

/** Sinh file .ics: mỗi hạn một sự kiện cả ngày, nhắc trước 7 ngày và 1 ngày. */
export function deadlinesToIcs(items: DeadlineItem[], { year, stamp, today }: IcsOptions): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//thue-cho-thue//VI", "CALSCALE:GREGORIAN"];
  for (const item of items) {
    const start = compact(item.date);
    const end = compact(nextDay(item.date));
    const past = today !== undefined && item.date < today;
    const t = past ? `${title(item, year)} (đã qua)` : title(item, year);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${year}-${item.kind}-${start}@thue-cho-thue`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeText(t)}`,
      `DESCRIPTION:${escapeText(item.citation)}`,
      ...(past ? [] : [...alarm("-P7D", `${t} còn 7 ngày`), ...alarm("-P1D", `${t} còn 1 ngày`)]),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.flatMap(fold).join("\r\n") + "\r\n";
}
