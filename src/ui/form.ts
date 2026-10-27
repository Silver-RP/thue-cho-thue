import { availableYears, getRules, type TaxRules } from "../rules";
import { calculate, type CalcForm, type PrepaidForm } from "./calculator";
import { formatVnd, parseVnd } from "./money";

export interface MountOptions {
  year: number;
  /** Ngày hôm nay (YYYY-MM-DD); có thì hạn đã qua mang nhãn "đã qua". */
  today?: string;
  /** Chỉ dùng cho test: luật thay cho getRules(year). */
  rules?: TaxRules;
  /** Năm gần nhất có luật; khi `year` chưa có luật thì hiện nút về năm này. */
  fallbackYear?: number;
  /** Được gọi khi người dùng bấm nút về năm có luật. */
  onSwitchYear?: (year: number) => void;
}

export const DISCLAIMER = "Kết quả chỉ để tham khảo, không thay thế tư vấn thuế.";

interface Field {
  id: string;
  label: string;
  el: HTMLElement;
  wrap: HTMLElement;
  error: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

let counter = 0;

function field(parent: HTMLElement, prefix: string, label: string, control: HTMLElement, suffix?: string): Field {
  const id = `${prefix}-${control.getAttribute("name")}`;
  control.id = id;
  const errId = `${id}-error`;
  const wrap = el("div", { class: "field" });
  if (suffix) {
    const box = el("div", { class: "input" });
    box.append(control, el("span", { class: "suffix" }, suffix));
    wrap.append(el("label", { for: id }, label), box);
  } else {
    wrap.append(el("label", { for: id }, label), control);
  }
  const error = el("p", { class: "field-error", id: errId, role: "alert" });
  error.hidden = true;
  wrap.append(error);
  parent.append(wrap);
  return { id, label, el: control, wrap, error };
}

function setError(f: Field, message: string | null): void {
  f.error.textContent = message ?? "";
  f.error.hidden = message === null;
  if (message === null) {
    f.el.removeAttribute("aria-invalid");
    f.el.removeAttribute("aria-describedby");
  } else {
    f.el.setAttribute("aria-invalid", "true");
    f.el.setAttribute("aria-describedby", f.error.id);
  }
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function mountCalculator(root: HTMLElement, options: MountOptions): () => void {
  const prefix = `tc${++counter}`;
  root.replaceChildren();
  const unmount = (): void => root.replaceChildren();

  const hasRules = options.rules ? options.rules.year === options.year : availableYears().includes(options.year);
  if (!hasRules) {
    const note = el("div", { class: "no-rules", role: "status" });
    note.append(
      el(
        "p",
        {},
        `Chưa có quy định thuế cho năm ${options.year}; ứng dụng không tự đoán luật nên chưa tính thuế cho năm này. ` +
          "Khi có văn bản chính thức, ứng dụng sẽ được cập nhật.",
      ),
    );
    const { fallbackYear, onSwitchYear } = options;
    if (fallbackYear !== undefined && onSwitchYear) {
      const go = el("button", { type: "button", name: "switch-year" }, `Xem năm ${fallbackYear}`);
      go.addEventListener("click", () => onSwitchYear(fallbackYear));
      note.append(go);
    }
    root.append(note,el("p", { class: "disclaimer" }, DISCLAIMER));
    return unmount;
  }

  const form = el("form", { class: "calc", novalidate: "" });
  const rent = field(form, prefix, "Tiền thuê mỗi kỳ (đồng)", el("input", { type: "text", name: "rent", inputmode: "numeric", autocomplete: "off", placeholder: "VD: 10.000.000" }), "đ");
  const periods = field(form, prefix, "Số kỳ nhận tiền trong năm", el("input", { type: "text", name: "periods", inputmode: "numeric", autocomplete: "off", value: "12" }), "kỳ");

  const prepaidToggleWrap = el("div", { class: "field field-check" });
  const toggle = el("input", { type: "checkbox", name: "prepaidOn", id: `${prefix}-prepaidOn` });
  prepaidToggleWrap.append(toggle, el("label", { for: toggle.id }, "Có nhận tiền trả trước nhiều năm"));
  form.append(prepaidToggleWrap);

  const prepaidBox = el("fieldset", { class: "prepaid" });
  prepaidBox.hidden = true;
  prepaidBox.append(el("legend", {}, "Trả trước nhiều năm"));
  const pAmount = field(prepaidBox, prefix, "Số tiền trả trước (đồng)", el("input", { type: "text", name: "prepaidAmount", inputmode: "numeric", autocomplete: "off" }));
  const pYears = field(prepaidBox, prefix, "Số năm trả trước", el("input", { type: "text", name: "prepaidYears", inputmode: "numeric", autocomplete: "off", value: "2" }));
  const modeSel = el("select", { name: "prepaidMode" });
  modeSel.append(el("option", { value: "allocate" }, "Phân bổ theo số năm"), el("option", { value: "lump" }, "Tính một lần khi nhận"));
  const pMode = field(prepaidBox, prefix, "Cách tính doanh thu trả trước", modeSel);
  const pDate = field(prepaidBox, prefix, "Ngày nhận tiền", el("input", { type: "date", name: "prepaidDate", value: `${options.year}-01-01` }));
  form.append(prepaidBox);
  toggle.addEventListener("change", () => {
    prepaidBox.hidden = !toggle.checked;
  });

  const filingBox = el("fieldset", { class: "field filing" });
  filingBox.append(el("legend", {}, "Cách khai"));
  const seg = el("div", { class: "seg" });
  const radios: HTMLInputElement[] = [];
  for (const [value, text] of [["once", "Khai 1 lần"], ["twice", "Khai 2 lần"]] as const) {
    const lab = el("label");
    const r = el("input", { type: "radio", name: "filing", value });
    if (value === "once") r.setAttribute("checked", "");
    r.checked = value === "once";
    radios.push(r);
    lab.append(r, text);
    seg.append(lab);
  }
  filingBox.append(seg);
  form.append(filingBox);

  form.append(el("button", { type: "submit", class: "primary" }, "Tính thuế"));

  const results = el("section", { class: "results", "aria-live": "polite" });
  const disclaimer = el("p", { class: "disclaimer" }, DISCLAIMER);
  const card = el("section", { class: "card calc-card", "aria-labelledby": `${prefix}-title` });
  card.append(el("h2", { id: `${prefix}-title` }, "Tính nhanh một hợp đồng"), form, results);
  root.append(card, disclaimer);

  const readInt = (f: Field, min: number, max: number, what: string): number | null => {
    const raw = (f.el as HTMLInputElement).value.trim();
    if (!/^\d+$/.test(raw)) {
      setError(f, `${what} phải là số nguyên.`);
      return null;
    }
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max) {
      setError(f, `${what} phải từ ${min} đến ${max}.`);
      return null;
    }
    return n;
  };

  const readMoney = (f: Field): number | null => {
    const r = parseVnd((f.el as HTMLInputElement).value);
    if (!r.ok) {
      setError(f, r.error);
      return null;
    }
    return r.value;
  };

  const run = (): void => {
    results.replaceChildren();
    for (const f of [rent, periods, pAmount, pYears, pDate]) setError(f, null);

    const rentV = readMoney(rent);
    const periodsV = readInt(periods, 0, 12, "Số kỳ nhận trong năm");
    let prepaid: PrepaidForm | undefined;
    let bad = rentV === null || periodsV === null;
    if (toggle.checked) {
      const amountV = readMoney(pAmount);
      const yearsV = readInt(pYears, 1, 100, "Số năm trả trước");
      const date = (pDate.el as HTMLInputElement).value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError(pDate, "Hãy chọn ngày nhận tiền.");
        bad = true;
      }
      if (amountV === null || yearsV === null) bad = true;
      else prepaid = { amount: amountV, years: yearsV, mode: modeSel.value as PrepaidForm["mode"], receivedOn: date };
    }
    if (rentV === 0 && periodsV !== null && periodsV > 0) {
      setError(rent, "Tiền thuê mỗi kỳ phải lớn hơn 0. Nếu chỉ có tiền trả trước thì nhập 0 ở số kỳ nhận tiền.");
      bad = true;
    }
    if (bad || rentV === null || periodsV === null) return;

    const input: CalcForm = {
      year: options.year,
      rentPerPeriod: rentV,
      periodsInYear: periodsV,
      prepaid,
      filingMode: radios.find((r) => r.checked)?.value === "twice" ? "twice" : "once",
    };
    const out = calculate(input, options.rules);
    if (out.error || !out.result) {
      results.append(el("p", { class: "form-error", role: "alert" }, out.error ?? "Không tính được thuế."));
      return;
    }
    const r = out.result;

    const mini = el("div", { class: "mini", role: "status" });
    const notice = r.deadlines.find((d) => d.kind === "revenue_notice");
    if (r.status === "taxable") {
      mini.classList.add("due");
      const sub = el("p", {}, `Thuế TNCN ${formatVnd(r.totalPit)}, thuế GTGT ${formatVnd(r.totalVat)}`);
      if (r.vatEstimated) sub.append(" ", el("span", { class: "chip est" }, "ước tính"));
      mini.append(el("b", {}, `Phải nộp khoảng ${formatVnd(r.totalTax)}`), sub);
    } else {
      const threshold = (options.rules ?? getRules(options.year)).threshold;
      mini.append(
        el("b", {}, "Chưa phải nộp thuế"),
        el(
          "p",
          {},
          `Doanh thu ${formatVnd(r.totalRevenue)} dưới ngưỡng ${formatVnd(threshold)}.` +
            (notice ? ` Chỉ cần thông báo doanh thu trước ${dmy(notice.date)}.` : ""),
        ),
      );
    }

    const wrap = el("div", { class: "table-scroll" });
    const table = el("table", { class: "result-table" });
    const rows: [string, string, string][] = [
      ["Doanh thu cho thuê", formatVnd(r.totalRevenue), ""],
      ["Thuế TNCN", formatVnd(r.totalPit), ""],
      ["Thuế GTGT", formatVnd(r.totalVat), r.vatEstimated ? "ước tính" : ""],
      ["Tổng thuế", formatVnd(r.totalTax), r.vatEstimated ? "ước tính" : ""],
      ["Trạng thái", r.status === "taxable" ? "Phải nộp thuế" : "Chỉ thông báo doanh thu", ""],
    ];
    for (const d of r.deadlines) {
      rows.push([d.kind === "revenue_notice" ? "Hạn thông báo doanh thu" : "Hạn khai và nộp thuế", dmy(d.date), options.today !== undefined && d.date < options.today ? "đã qua" : ""]);
    }
    const tbody = el("tbody");
    for (const [name, value, tag] of rows) {
      const tr = el("tr");
      tr.append(el("th", { scope: "row" }, name));
      const td = el("td", {}, value);
      if (tag) td.append(" ", el("span", { class: "badge", ...(tag === "đã qua" ? { "data-past": "" } : {}) }, `(${tag})`));
      tr.append(td);
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);

    const steps = el("ol", { class: "steps" });
    for (const s of out.steps) {
      const li = el("li", {}, s.text);
      li.append(el("br"), el("small", { class: "citation" }, `Căn cứ: ${s.citation}`));
      steps.append(li);
    }
    results.append(mini, el("h2", {}, "Kết quả"), wrap, el("h2", {}, "Giải thích từng bước"), steps);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  return unmount;
}
