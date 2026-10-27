export type ParseVndResult = { ok: true; value: number } | { ok: false; error: string };

const SUFFIX = /\s*(?:vnđ|vnd|đ|₫)$/iu;
const PLAIN = /^\d+$/;
// Nhóm 3 chữ số, cùng một ký tự ngăn (., hoặc khoảng trắng) xuyên suốt.
const GROUPED = /^\d{1,3}(?:([.,\s])\d{3}(?:\1\d{3})*)$/u;

const fail = (error: string): ParseVndResult => ({ ok: false, error });

/** Đọc tiền VNĐ theo kiểu Việt Nam; không ném lỗi. */
export function parseVnd(text: string): ParseVndResult {
  if (typeof text !== "string") return fail("Hãy nhập số tiền.");
  const s = text.trim().replace(SUFFIX, "").trim();
  if (s === "") return fail("Hãy nhập số tiền.");
  if (s.startsWith("-")) return fail("Số tiền không được âm.");
  if (!PLAIN.test(s) && !GROUPED.test(s)) {
    return fail(
      "Số tiền không hợp lệ: chỉ nhập chữ số, ngăn nghìn bằng dấu chấm, phẩy hoặc khoảng trắng (mỗi nhóm đủ 3 chữ số), không có phần thập phân.",
    );
  }
  const value = Number(s.replace(/[.,\s]/gu, ""));
  if (!Number.isSafeInteger(value)) return fail("Số tiền quá lớn.");
  return { ok: true, value };
}

/** 12000000 → "12.000.000 đ" */
export function formatVnd(n: number): string {
  const digits = String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${digits} đ`;
}

/** Rời ô tiền: số đọc được thì viết lại có dấu chấm ngăn nghìn ("25000000" → "25.000.000"); chữ sai để nguyên cho thông báo lỗi. */
export function groupOnBlur(input: HTMLInputElement): void {
  input.addEventListener("blur", () => {
    const r = parseVnd(input.value);
    if (r.ok) input.value = formatVnd(r.value).replace(/ đ$/u, "");
  });
}
