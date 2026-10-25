import type { Cell, Declaration, Row } from "./declaration";

const BOM = "﻿";

function cell(v: Cell): string {
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`Số không hợp lệ để xuất CSV: ${v}`);
    return String(v);
  }
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Row[]): string {
  return BOM + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function declarationToCsv(d: Declaration): string {
  const rows: Row[] = [[d.title], ...d.main, [], [d.annexTitle], d.annexHeader, ...d.annex];
  if (d.notes.length > 0) rows.push([], ...d.notes.map((n): Row => [n]));
  return toCsv(rows);
}

export function csvFilename(year: number): string {
  return `thue-cho-thue-01TTS-${year}.csv`;
}
