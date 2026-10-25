import type { TaxRules } from "../rules";
import { exportLedger, importLedger } from "../ledger/backup";
import { isLedgerError, type Contract, type Ledger, type LedgerResult, type Receipt } from "../ledger/model";
import * as ops from "../ledger/ops";
import { loadLedger, saveLedger, type StorageLike } from "../ledger/storage";
import { summarizeYear, type YearSummary } from "../ledger/summary";
import { mountExport } from "./export";
import { DISCLAIMER } from "./form";
import { formatVnd, parseVnd } from "./money";

export interface LedgerMountOptions {
  year: number;
  storage: StorageLike;
  /** Chỉ dùng cho test: luật thay cho getRules(year). */
  rules?: TaxRules;
  newId?: () => string;
  /** Ngày hôm nay (YYYY-MM-DD) để đặt tên file xuất. */
  today?: string;
  confirm?: (message: string) => boolean;
}

type Props = Partial<Record<string, string>>;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultNewId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const plainMoney = (n: number): string => formatVnd(n).replace(/ đ$/u, "");

// ---- Dựng biểu mẫu nhỏ ----

interface FieldSpec {
  name: string;
  label: string;
  value?: string;
  kind?: "text" | "numeric" | "select" | "check";
  options?: [string, string][];
  placeholder?: string;
}

interface FormApi {
  form: HTMLFormElement;
  wraps: Record<string, HTMLElement>;
  controls: Record<string, HTMLInputElement | HTMLSelectElement>;
  actions: HTMLElement;
  setFieldError(name: string, message: string | null): void;
  setFormError(message: string | null): void;
  clearErrors(): void;
}

let counter = 0;

function buildForm(cls: string, specs: FieldSpec[], submitLabel: string): FormApi {
  const prefix = `lg${++counter}`;
  const form = el("form", { class: `lg-form ${cls}`, novalidate: "" });
  const wraps: Record<string, HTMLElement> = {};
  const controls: FormApi["controls"] = {};
  const errors: Record<string, HTMLElement> = {};

  for (const s of specs) {
    const id = `${prefix}-${s.name}`;
    let control: HTMLInputElement | HTMLSelectElement;
    if (s.kind === "select") {
      control = el("select", { name: s.name });
      for (const [v, t] of s.options ?? []) control.append(el("option", { value: v }, t));
      if (s.value !== undefined) control.value = s.value;
    } else if (s.kind === "check") {
      control = el("input", { type: "checkbox", name: s.name });
      (control as HTMLInputElement).checked = s.value === "1";
    } else {
      control = el("input", {
        type: "text",
        name: s.name,
        autocomplete: "off",
        ...(s.kind === "numeric" ? { inputmode: "numeric" } : {}),
        ...(s.placeholder ? { placeholder: s.placeholder } : {}),
      });
      (control as HTMLInputElement).value = s.value ?? "";
    }
    control.id = id;
    const wrap = el("div", { class: s.kind === "check" ? "field field-check" : "field" });
    const label = el("label", { for: id }, s.label);
    if (s.kind === "check") wrap.append(control, label);
    else wrap.append(label, control);
    const err = el("p", { class: "field-error", id: `${id}-error`, role: "alert" });
    err.hidden = true;
    wrap.append(err);
    form.append(wrap);
    wraps[s.name] = wrap;
    controls[s.name] = control;
    errors[s.name] = err;
  }

  const actions = el("div", { class: "lg-actions" });
  actions.append(el("button", { type: "submit", class: "primary" }, submitLabel));
  const formError = el("p", { class: "form-error", role: "alert" });
  formError.hidden = true;
  form.append(actions, formError);

  const setFieldError = (name: string, message: string | null): void => {
    const err = errors[name];
    const control = controls[name];
    if (!err || !control) return;
    err.textContent = message ?? "";
    err.hidden = message === null;
    if (message === null) {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
    } else {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", err.id);
    }
  };
  const setFormError = (message: string | null): void => {
    formError.textContent = message ?? "";
    formError.hidden = message === null;
  };
  const clearErrors = (): void => {
    for (const n of Object.keys(errors)) setFieldError(n, null);
    setFormError(null);
  };
  return { form, wraps, controls, actions, setFieldError, setFormError, clearErrors };
}

const val = (f: FormApi, name: string): string => {
  const c = f.controls[name];
  if (!c) return "";
  return c instanceof HTMLInputElement && c.type === "checkbox" ? (c.checked ? "1" : "") : c.value.trim();
};

/** Lỗi từ phép sửa sổ đặt vào đúng ô theo nội dung; không khớp thì đặt ở cuối biểu mẫu. */
function routeError(f: FormApi, message: string, routes: [string, string][]): void {
  for (const [prefix, field] of routes) {
    if (message.startsWith(prefix)) {
      f.setFieldError(field, message);
      return;
    }
  }
  f.setFormError(message);
}

const CONTRACT_ROUTES: [string, string][] = [
  ["Tên người thuê", "tenant"],
  ["Ngày ký", "signedOn"],
  ["Ngày bắt đầu", "startOn"],
  ["Ngày kết thúc", "endOn"],
];
const RECEIPT_ROUTES: [string, string][] = [
  ["Ngày nhận", "receivedOn"],
  ["Số tiền", "amount"],
  ["Số năm", "years"],
  ["Kiểu trả trước", "mode"],
];

// ---- Giao diện sổ ----

export function mountLedger(root: HTMLElement, options: LedgerMountOptions): void {
  const { year, storage, rules } = options;
  const newId = options.newId ?? defaultNewId;
  const today = options.today ?? localToday();
  const confirmFn = options.confirm ?? ((m: string) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(m) : false));

  const loaded = loadLedger(storage);
  let ledger: Ledger = loaded.ledger;
  /** Lỗi cấp trang (đọc hỏng, ghi lỗi, nhập lỗi) */
  let pageError: string | null = loaded.error ?? null;

  /** Áp một phép sửa sổ; hợp lệ thì lưu và vẽ lại. Trả lỗi nếu có. */
  const apply = (result: LedgerResult): string | null => {
    if (isLedgerError(result)) return result.error;
    const saved = saveLedger(storage, result);
    if (!saved.ok) return saved.error;
    ledger = result;
    pageError = null;
    render();
    return null;
  };

  const summaryOf = (): { summary?: YearSummary; error?: string } => {
    try {
      return { summary: summarizeYear(ledger, year, rules) };
    } catch {
      return { error: `Chưa có quy định thuế cho năm ${year}, nên chưa tính được thuế.` };
    }
  };

  const confirmRemove = (what: string, hasKids: boolean): boolean | "plain" => {
    if (!hasKids) return "plain";
    return confirmFn(`${what} còn dữ liệu bên trong. Xoá sẽ xoá luôn toàn bộ phần đó. Bạn có chắc không?`);
  };

  const removeButton = (label: string, onClick: () => string | null, errSlot: HTMLElement): HTMLButtonElement => {
    const b = el("button", { type: "button", class: "danger" }, label);
    b.addEventListener("click", () => {
      const e = onClick();
      errSlot.textContent = e ?? "";
      errSlot.hidden = e === null;
    });
    return b;
  };

  const errorSlot = (): HTMLElement => {
    const p = el("p", { class: "form-error", role: "alert" });
    p.hidden = true;
    return p;
  };

  // ---- Từng khối ----

  const propertyBlock = (p: Ledger["properties"][number]): HTMLElement => {
    const box = el("section", { class: "lg-property", "data-property": p.id });
    const f = buildForm("lg-property-form", [
      { name: "name", label: "Tên căn", value: p.name },
      { name: "address", label: "Địa chỉ", value: p.address ?? "" },
    ], "Lưu căn");
    f.form.addEventListener("submit", (e) => {
      e.preventDefault();
      f.clearErrors();
      const err = apply(ops.updateProperty(ledger, p.id, { name: val(f, "name"), address: val(f, "address") || undefined }));
      if (err) routeError(f, err, [["Tên căn", "name"], ["Địa chỉ", "address"]]);
    });
    const slot = errorSlot();
    f.actions.append(
      removeButton("Xoá căn", () => {
        const kids = ledger.contracts.some((c) => c.propertyId === p.id);
        const ok = confirmRemove(`Căn "${p.name}"`, kids);
        if (ok === false) return null;
        return apply(ops.removeProperty(ledger, p.id, { cascade: ok === true }));
      }, slot),
    );
    box.append(el("h3", {}, p.name), f.form, slot);

    box.append(el("h4", {}, "Hợp đồng"));
    for (const c of ledger.contracts.filter((c) => c.propertyId === p.id)) box.append(contractBlock(c));
    box.append(addContractForm(p.id));
    return box;
  };

  const contractFields = (c?: Contract): FieldSpec[] => [
    { name: "tenant", label: "Người thuê", value: c?.tenant ?? "" },
    { name: "signedOn", label: "Ngày ký (AAAA-MM-DD)", value: c?.signedOn ?? "", kind: "numeric", placeholder: "AAAA-MM-DD" },
    { name: "startOn", label: "Ngày bắt đầu (AAAA-MM-DD)", value: c?.startOn ?? "", kind: "numeric", placeholder: "AAAA-MM-DD" },
    { name: "endOn", label: "Ngày kết thúc (tuỳ chọn)", value: c?.endOn ?? "", kind: "numeric", placeholder: "AAAA-MM-DD" },
  ];

  const addContractForm = (propertyId: string): HTMLElement => {
    const f = buildForm("lg-contract-add", contractFields(), "Thêm hợp đồng");
    f.form.addEventListener("submit", (e) => {
      e.preventDefault();
      f.clearErrors();
      const err = apply(
        ops.addContract(ledger, {
          propertyId,
          tenant: val(f, "tenant"),
          signedOn: val(f, "signedOn"),
          startOn: val(f, "startOn"),
          ...(val(f, "endOn") ? { endOn: val(f, "endOn") } : {}),
        }, newId),
      );
      if (err) routeError(f, err, CONTRACT_ROUTES);
    });
    return f.form;
  };

  const contractBlock = (c: Contract): HTMLElement => {
    const box = el("section", { class: "lg-contract", "data-contract": c.id });
    const f = buildForm("lg-contract-form", contractFields(c), "Lưu hợp đồng");
    f.form.addEventListener("submit", (e) => {
      e.preventDefault();
      f.clearErrors();
      const err = apply(
        ops.updateContract(ledger, c.id, {
          tenant: val(f, "tenant"),
          signedOn: val(f, "signedOn"),
          startOn: val(f, "startOn"),
          endOn: val(f, "endOn") || undefined,
        }),
      );
      if (err) routeError(f, err, CONTRACT_ROUTES);
    });
    const slot = errorSlot();
    f.actions.append(
      removeButton("Xoá hợp đồng", () => {
        const kids = ledger.receipts.some((r) => r.contractId === c.id);
        const ok = confirmRemove(`Hợp đồng "${c.tenant}"`, kids);
        if (ok === false) return null;
        return apply(ops.removeContract(ledger, c.id, { cascade: ok === true }));
      }, slot),
    );
    box.append(el("h5", {}, `Hợp đồng: ${c.tenant}`), f.form, slot, el("h5", {}, "Kỳ thu"));
    for (const r of ledger.receipts.filter((r) => r.contractId === c.id)) box.append(receiptForm(c.id, r));
    box.append(receiptForm(c.id));
    return box;
  };

  /** Biểu mẫu kỳ thu: có `r` là sửa, không có là thêm. */
  const receiptForm = (contractId: string, r?: Receipt): HTMLElement => {
    const f = buildForm(r ? "lg-receipt-form" : "lg-receipt-add", [
      { name: "receivedOn", label: "Ngày nhận (AAAA-MM-DD)", value: r?.receivedOn ?? "", kind: "numeric", placeholder: "AAAA-MM-DD" },
      { name: "amount", label: "Số tiền (đồng)", value: r ? plainMoney(r.amount) : "", kind: "numeric", placeholder: "VD: 10.000.000" },
      { name: "prepaidOn", label: "Trả trước nhiều năm", kind: "check", value: r?.prepaid ? "1" : "" },
      { name: "years", label: "Số năm trả trước", value: String(r?.prepaid?.years ?? 2), kind: "numeric" },
      {
        name: "mode",
        label: "Cách tính doanh thu trả trước",
        kind: "select",
        value: r?.prepaid?.mode ?? "allocate",
        options: [["allocate", "Phân bổ theo số năm"], ["lump", "Tính một lần khi nhận"]],
      },
    ], r ? "Lưu kỳ thu" : "Thêm kỳ thu");
    const toggle = f.controls.prepaidOn as HTMLInputElement;
    const sync = (): void => {
      for (const n of ["years", "mode"]) {
        const w = f.wraps[n];
        if (w) w.hidden = !toggle.checked;
      }
    };
    toggle.addEventListener("change", sync);
    sync();
    if (r) f.form.setAttribute("data-receipt", r.id);

    f.form.addEventListener("submit", (e) => {
      e.preventDefault();
      f.clearErrors();
      const money = parseVnd(f.controls.amount ? (f.controls.amount as HTMLInputElement).value : "");
      if (!money.ok) {
        f.setFieldError("amount", money.error);
        return;
      }
      let prepaid: Receipt["prepaid"];
      if (toggle.checked) {
        const raw = val(f, "years");
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1) {
          f.setFieldError("years", "Số năm trả trước phải là số nguyên dương.");
          return;
        }
        prepaid = { years: Number(raw), mode: val(f, "mode") === "lump" ? "lump" : "allocate" };
      }
      const body = { contractId, receivedOn: val(f, "receivedOn"), amount: money.value, prepaid };
      const result = r
        ? ops.updateReceipt(ledger, r.id, body)
        : ops.addReceipt(ledger, { contractId, receivedOn: body.receivedOn, amount: body.amount, ...(prepaid ? { prepaid } : {}) }, newId);
      const err = apply(result);
      if (err) routeError(f, err, RECEIPT_ROUTES);
    });

    if (!r) return f.form;
    const slot = errorSlot();
    f.actions.append(removeButton("Xoá kỳ thu", () => apply(ops.removeReceipt(ledger, r.id)), slot));
    const wrap = el("div", { class: "lg-receipt" });
    wrap.append(f.form, slot);
    return wrap;
  };

  const choiceBlock = (): HTMLElement => {
    const box = el("section", { class: "lg-choice" });
    box.append(el("h2", {}, `Hợp đồng được trừ ngưỡng trước (năm ${year})`));
    const sel = el("select", { name: "deductionChoice", id: "lg-choice-select" });
    sel.append(el("option", { value: "" }, "Tự động (theo thứ tự hợp đồng)"));
    for (const c of ledger.contracts) {
      const prop = ledger.properties.find((p) => p.id === c.propertyId);
      sel.append(el("option", { value: c.id }, `${prop?.name ?? "?"} - ${c.tenant}`));
    }
    sel.value = ledger.deductionChoice[String(year)] ?? "";
    const slot = errorSlot();
    sel.addEventListener("change", () => {
      const err = apply(ops.setDeductionChoice(ledger, year, sel.value === "" ? null : sel.value));
      slot.textContent = err ?? "";
      slot.hidden = err === null;
    });
    box.append(el("label", { for: "lg-choice-select" }, "Chọn hợp đồng"), sel, slot);
    return box;
  };

  const summaryBlock = (): HTMLElement => {
    const box = el("section", { class: "lg-summary", "aria-live": "polite" });
    box.append(el("h2", {}, `Tổng năm ${year}`));
    const { summary: s, error } = summaryOf();
    if (!s) {
      box.append(el("p", { class: "form-error", role: "alert" }, error ?? "Không tính được thuế."));
      return box;
    }
    if (s.thresholdWarning) {
      box.append(
        el(
          "p",
          { class: "threshold-warning", role: "status" },
          `Doanh thu năm ${year} đã vượt ngưỡng chịu thuế từ ngày ${dmy(s.thresholdWarning.crossedOn)}.`,
        ),
      );
    }

    const rows: [string, string, string][] = [
      ["Doanh thu cho thuê", formatVnd(s.totalRevenue), ""],
      ["Thuế TNCN", formatVnd(s.totalPit), ""],
      ["Thuế GTGT", formatVnd(s.totalVat), s.vatEstimated ? "ước tính" : ""],
      ["Tổng thuế", formatVnd(s.totalTax), ""],
      ["Trạng thái", s.status === "taxable" ? "Phải nộp thuế" : "Chỉ thông báo doanh thu", ""],
    ];
    for (const d of s.deadlines) {
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
    const table = el("table", { class: "result-table lg-total" });
    table.append(tbody);
    const wrap = el("div", { class: "table-scroll" });
    wrap.append(table);
    box.append(wrap);

    // Doanh thu theo căn
    box.append(el("h3", {}, "Doanh thu theo căn"));
    const pt = el("table", { class: "result-table lg-by-property" });
    const pb = el("tbody");
    for (const p of s.revenueByProperty) {
      const tr = el("tr", { "data-property": p.propertyId });
      tr.append(el("th", { scope: "row" }, p.name), el("td", {}, formatVnd(p.revenue)));
      pb.append(tr);
    }
    pt.append(pb);
    const pw = el("div", { class: "table-scroll" });
    pw.append(pt);
    box.append(pw);

    // Theo hợp đồng
    box.append(el("h3", {}, "Thuế theo hợp đồng"));
    const ct = el("table", { class: "result-table lg-by-contract" });
    const head = el("thead");
    const hr = el("tr");
    for (const h of ["Hợp đồng", "Doanh thu", "Được trừ", "TNCN", "GTGT"]) hr.append(el("th", { scope: "col" }, h));
    head.append(hr);
    const cb = el("tbody");
    for (const c of s.contracts) {
      const meta = ledger.contracts.find((x) => x.id === c.contractId);
      const prop = ledger.properties.find((p) => p.id === meta?.propertyId);
      const tr = el("tr", { "data-contract": c.contractId });
      tr.append(el("th", { scope: "row" }, `${prop?.name ?? "?"} - ${meta?.tenant ?? c.contractId}`));
      const cells: [string, string][] = [
        ["revenue", formatVnd(c.revenue)],
        ["deduction", formatVnd(c.deduction)],
        ["pit", formatVnd(c.pit)],
        ["vat", formatVnd(c.vat)],
      ];
      for (const [k, v] of cells) {
        const td = el("td", { "data-col": k }, v);
        if (k === "vat" && s.vatEstimated) td.append(" ", el("span", { class: "badge" }, "(ước tính)"));
        tr.append(td);
      }
      cb.append(tr);
    }
    ct.append(head, cb);
    const cw = el("div", { class: "table-scroll" });
    cw.append(ct);
    box.append(cw);
    return box;
  };

  const backupBlock = (): HTMLElement => {
    const box = el("section", { class: "lg-backup" });
    box.append(el("h2", {}, "Sao lưu"));
    const slot = errorSlot();

    const exportBtn = el("button", { type: "button", name: "export" }, "Xuất JSON");
    exportBtn.addEventListener("click", () => {
      try {
        const out = exportLedger(ledger, today);
        const url = URL.createObjectURL(new Blob([out.text], { type: "application/json" }));
        const a = el("a", { href: url, download: out.filename });
        document.body.append(a);
        a.click();
        a.remove();
        URL.revokeObjectURL?.(url);
        slot.hidden = true;
      } catch {
        slot.textContent = "Không tạo được file để tải xuống.";
        slot.hidden = false;
      }
    });

    const fileId = "lg-import-file";
    const file = el("input", { type: "file", name: "import", id: fileId, accept: "application/json,.json" });
    file.addEventListener("change", () => {
      const f = file.files?.[0];
      if (!f) return;
      void f.text().then(
        (text) => {
          const parsed = importLedger(text);
          if (!parsed.ok) {
            slot.textContent = parsed.error;
            slot.hidden = false;
            return;
          }
          const nonEmpty = ledger.properties.length + ledger.contracts.length + ledger.receipts.length > 0;
          if (nonEmpty && !confirmFn("Nhập file sẽ thay toàn bộ sổ hiện tại. Bạn có chắc không?")) return;
          const err = apply(parsed.ledger);
          if (err) {
            slot.textContent = err;
            slot.hidden = false;
          }
        },
        () => {
          slot.textContent = "Không đọc được file đã chọn.";
          slot.hidden = false;
        },
      );
    });
    box.append(exportBtn, el("label", { for: fileId }, "Nhập JSON"), file, slot);
    return box;
  };

  const addPropertyForm = (): HTMLElement => {
    const f = buildForm("lg-property-add", [
      { name: "name", label: "Tên căn", placeholder: "VD: Căn hộ A" },
      { name: "address", label: "Địa chỉ (tuỳ chọn)" },
    ], "Thêm căn");
    f.form.addEventListener("submit", (e) => {
      e.preventDefault();
      f.clearErrors();
      const address = val(f, "address");
      const err = apply(ops.addProperty(ledger, { name: val(f, "name"), ...(address ? { address } : {}) }, newId));
      if (err) routeError(f, err, [["Tên căn", "name"], ["Địa chỉ", "address"]]);
    });
    return f.form;
  };

  function render(): void {
    root.replaceChildren();
    root.append(el("h2", { class: "lg-title" }, `Sổ doanh thu năm ${year}`));
    if (pageError) root.append(el("p", { class: "form-error ledger-error", role: "alert" }, pageError));
    root.append(el("h2", {}, "Các căn cho thuê"));
    for (const p of ledger.properties) root.append(propertyBlock(p));
    root.append(addPropertyForm());
    if (ledger.contracts.length > 0) root.append(choiceBlock());
    const exportRoot = el("div", { class: "lg-export-root" });
    root.append(summaryBlock(), exportRoot, backupBlock(), el("p", { class: "disclaimer" }, DISCLAIMER));
    mountExport(exportRoot, {
      year,
      today,
      getLedger: () => ledger,
      setFilingMode: (mode) => apply(ops.setFilingMode(ledger, year, mode)),
      ...(rules ? { rules } : {}),
    });
  }

  // Không ghi gì khi mở trang: chỉ ghi sau thao tác của người dùng.
  render();
}
