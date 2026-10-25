import type { TaxRules } from "../rules";
import { calculate, type CalcForm, type PrepaidForm } from "./calculator";
import { formatVnd, parseVnd } from "./money";

export interface MountOptions {
  year: number;
  /** Chỉ dùng cho test: luật thay cho getRules(year). */
  rules?: TaxRules;
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

function field(parent: HTMLElement, prefix: string, label: string, control: HTMLElement): Field {
  const id = `${prefix}-${control.getAttribute("name")}`;
  control.id = id;
  const errId = `${id}-error`;
  const wrap = el("div", { class: "field" });
  wrap.append(el("label", { for: id }, label), control);
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

export function mountCalculator(root: HTMLElement, options: MountOptions): void {
  const prefix = `tc${++counter}`;
  root.replaceChildren();

  const form = el("form", { class: "calc", novalidate: "" });
  const rent = field(form, prefix, "Tiền thuê mỗi kỳ (đồng)", el("input", { type: "text", name: "rent", inputmode: "numeric", autocomplete: "off", placeholder: "VD: 10.000.000" }));
  const periods = field(form, prefix, "Số kỳ nhận tiền trong năm", el("input", { type: "text", name: "periods", inputmode: "numeric", autocomplete: "off", value: "12" }));

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

  const filingSel = el("select", { name: "filing" });
  filingSel.append(el("option", { value: "once" }, "Khai 1 lần (cả năm)"), el("option", { value: "twice" }, "Khai 2 lần (theo kỳ)"));
  field(form, prefix, "Cách khai thuế", filingSel);

  form.append(el("button", { type: "submit", class: "primary" }, "Tính thuế"));

  const results = el("section", { class: "results", "aria-live": "polite" });
  const disclaimer = el("p", { class: "disclaimer" }, DISCLAIMER);
  root.append(el("h1", {}, "Thuế cho thuê nhà"), form, results, disclaimer);

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
    if (bad || rentV === null || periodsV === null) return;

    const input: CalcForm = {
      year: options.year,
      rentPerPeriod: rentV,
      periodsInYear: periodsV,
      prepaid,
      filingMode: filingSel.value === "twice" ? "twice" : "once",
    };
    const out = calculate(input, options.rules);
    if (out.error || !out.result) {
      results.append(el("p", { class: "form-error", role: "alert" }, out.error ?? "Không tính được thuế."));
      return;
    }
    const r = out.result;

    const wrap = el("div", { class: "table-scroll" });
    const table = el("table", { class: "result-table" });
    const rows: [string, string, string][] = [
      ["Doanh thu cho thuê", formatVnd(r.totalRevenue), ""],
      ["Thuế TNCN", formatVnd(r.totalPit), ""],
      ["Thuế GTGT", formatVnd(r.totalVat), r.vatEstimated ? "ước tính" : ""],
      ["Tổng thuế", formatVnd(r.totalTax), ""],
      ["Trạng thái", r.status === "taxable" ? "Phải nộp thuế" : "Chỉ thông báo doanh thu", ""],
    ];
    for (const d of r.deadlines) {
      rows.push([d.kind === "revenue_notice" ? "Hạn thông báo doanh thu" : "Hạn khai và nộp thuế", dmy(d.date), ""]);
    }
    const tbody = el("tbody");
    for (const [name, value, tag] of rows) {
      const tr = el("tr");
      tr.append(el("th", { scope: "row" }, name));
      const td = el("td", {}, value);
      if (tag) td.append(" ", el("span", { class: "badge" }, `(${tag})`));
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
    results.append(el("h2", {}, "Kết quả"), wrap, el("h2", {}, "Giải thích từng bước"), steps);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
}
