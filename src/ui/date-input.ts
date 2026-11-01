/** "2026-01-05" → "05/01/2026"; chuỗi không đúng dạng thì giữ nguyên. */
export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Chữ trong ô ngày → YYYY-MM-DD. Nhận "5/1/2026", "05-01-2026", "05012026" và cả dạng ISO.
 * Không đọc được thì trả nguyên chữ đã bỏ khoảng trắng: phép kiểm ngày của sổ sẽ báo lỗi đúng ô.
 */
export function dmyToIso(text: string): string {
  const s = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (!m) return s;
  return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

const CALENDAR =
  '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>';

/**
 * Bọc ô chữ ngày dd/mm/yyyy với nút lịch. Ô chữ giữ `name` để biểu mẫu đọc; ô lịch gốc của trình duyệt
 * không có `name` nên không bị coi là dữ liệu, chỉ dùng để bật bảng chọn ngày.
 */
export function dateField(input: HTMLInputElement): HTMLElement {
  input.setAttribute("placeholder", "dd/mm/yyyy");
  input.setAttribute("inputmode", "numeric");
  input.addEventListener("blur", () => {
    const iso = dmyToIso(input.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) input.value = isoToDmy(iso);
  });

  const native = document.createElement("input");
  native.type = "date";
  native.tabIndex = -1;
  native.className = "date-native";
  native.setAttribute("aria-hidden", "true");
  native.addEventListener("change", () => {
    if (!native.value) return;
    input.value = isoToDmy(native.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "date-pick";
  btn.setAttribute("aria-label", "Chọn ngày trên lịch");
  btn.innerHTML = CALENDAR;
  btn.addEventListener("click", () => {
    const iso = dmyToIso(input.value);
    native.value = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
    try {
      native.showPicker();
    } catch {
      // Trình duyệt cũ không có bảng chọn: vẫn gõ tay được.
      input.focus();
    }
  });

  const box = document.createElement("div");
  box.className = "date-field";
  box.append(input, native, btn);
  return box;
}
