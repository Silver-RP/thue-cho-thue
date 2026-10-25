import { declarationToCsv, csvFilename } from "../export/csv";
import { buildDeclaration, type Cell } from "../export/declaration";
import { form01TTS } from "../export/forms";
import { deadlinesToIcs, icsFilename } from "../export/ics";
import type { Ledger } from "../ledger/model";
import { summarizeYear } from "../ledger/summary";
import type { TaxRules } from "../rules";
import { DISCLAIMER } from "./form";
import { formatVnd } from "./money";

export type FilingChoice = "once" | "twice";

export interface ExportMountOptions {
  year: number;
  getLedger: () => Ledger;
  /** Lưu lựa chọn khai; trả thông báo lỗi tiếng Việt hoặc null khi lưu được. */
  setFilingMode: (mode: FilingChoice) => string | null | void;
  /** Ngày hôm nay (YYYY-MM-DD), dùng cho DTSTAMP mặc định. */
  today: string;
  /** DTSTAMP dạng YYYYMMDDTHHMMSSZ; mặc định lấy từ `today`. */
  stamp?: string;
  download?: (filename: string, mime: string, content: string) => void;
  copy?: (text: string) => Promise<void> | void;
  /** Chỉ dùng cho test: luật thay cho getRules(year). */
  rules?: TaxRules;
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

function defaultDownload(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL?.(url);
}

async function defaultCopy(text: string): Promise<void> {
  const clip = (globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }).navigator?.clipboard;
  if (!clip?.writeText) throw new Error("Trình duyệt không cho chép vào clipboard.");
  await clip.writeText(text);
}

const ETAX_STEPS = [
  "Mở ứng dụng eTax Mobile và đăng nhập bằng tài khoản thuế điện tử của bạn.",
  "Chọn mục khai thuế, rồi chọn tờ khai thuế đối với cá nhân cho thuê tài sản (mẫu 01/TTS).",
  "Chọn kỳ tính thuế là năm cần khai và nhập các số trong bảng ở trên vào đúng ô tương ứng.",
  "Nếu có nhiều hợp đồng thuê, nhập thêm từng dòng của phụ lục 01-1/BK-TTS.",
  "Đối chiếu lại từng số với bảng, kiểm tra thông tin rồi nộp tờ khai và nộp thuế trước hạn.",
];

export function mountExport(root: HTMLElement, options: ExportMountOptions): void {
  const { year, getLedger, setFilingMode, today, rules } = options;
  const download = options.download ?? defaultDownload;
  const copy = options.copy ?? defaultCopy;
  const stamp = options.stamp ?? `${today.replace(/-/g, "")}T000000Z`;

  const render = (): void => {
    root.replaceChildren();
    const box = el("section", { class: "lg-export" });
    root.append(box);
    box.append(el("h2", {}, `Hạn khai và tờ khai năm ${year}`));
    const note = (text: string, cls = "export-note", role = "status"): HTMLElement => {
      const p = el("p", { class: cls, role }, text);
      box.append(p);
      return p;
    };
    const disclaimer = (): void => {
      box.append(el("p", { class: "export-disclaimer" }, DISCLAIMER));
    };

    const ledger = getLedger();
    if (ledger.receipts.length === 0) {
      note(`Chưa có kỳ thu năm ${year}. Hãy nhập kỳ thu để xem hạn khai và bảng số liệu.`);
      disclaimer();
      return;
    }

    let summary;
    try {
      summary = summarizeYear(ledger, year, rules);
    } catch {
      note(`Chưa có quy định thuế cho năm ${year}, nên chưa lập được tờ khai.`, "form-error", "alert");
      disclaimer();
      return;
    }
    const taxable = summary.status === "taxable";
    const actionError = el("p", { class: "form-error export-error", role: "alert" });
    actionError.hidden = true;
    const fail = (msg: string): void => {
      actionError.textContent = msg;
      actionError.hidden = false;
    };

    // Lựa chọn khai 1/2 lần (chỉ có nghĩa khi phải nộp thuế)
    if (taxable) {
      const current: FilingChoice = ledger.filingMode?.[String(year)] === "twice" ? "twice" : "once";
      const fs = el("fieldset", { class: "export-mode" });
      fs.append(el("legend", {}, "Cách khai"));
      for (const [value, text] of [["once", "Khai 1 lần"], ["twice", "Khai 2 lần"]] as const) {
        const label = el("label", { class: "export-mode-option" });
        const input = el("input", { type: "radio", name: "filingMode", value });
        input.checked = current === value;
        input.addEventListener("change", () => {
          if (!input.checked) return;
          const err = setFilingMode(value);
          if (typeof err === "string") fail(err);
          else render();
        });
        label.append(input, " ", text);
        fs.append(label);
      }
      box.append(fs);
    }

    // Danh sách hạn
    const list = el("ul", { class: "export-deadlines" });
    for (const d of summary.deadlines) {
      const li = el("li", { "data-date": d.date });
      li.append(
        el("strong", {}, dmy(d.date)),
        ` - ${d.kind === "revenue_notice" ? "Hạn thông báo doanh thu" : "Hạn khai và nộp thuế"}. `,
        el("span", { class: "export-citation" }, d.citation),
      );
      list.append(li);
    }
    box.append(list);
    if (summary.deadlines.length > 0) {
      const ics = el("button", { type: "button", name: "download-ics" }, "Tải nhắc lịch (.ics)");
      ics.addEventListener("click", () => {
        try {
          download(icsFilename(year), "text/calendar", deadlinesToIcs(summary.deadlines, { year, stamp }));
          actionError.hidden = true;
        } catch {
          fail("Không tạo được file nhắc lịch để tải xuống.");
        }
      });
      box.append(ics);
    }

    if (!taxable) {
      note(`Doanh thu năm ${year} chưa vượt ngưỡng chịu thuế, nên không phải nộp thuế và không có tờ khai thuế. Chỉ cần thông báo doanh thu trước hạn trên.`, "export-note export-notax");
      box.append(actionError);
      disclaimer();
      return;
    }

    // Bảng tờ khai
    const decl = buildDeclaration(ledger, summary, form01TTS);
    box.append(el("h3", {}, decl.title));
    for (const n of decl.notes) box.append(el("p", { class: "export-warning", role: "note" }, n));
    if (!decl.confirmed) box.append(el("p", { class: "badge export-unconfirmed" }, "chưa xác nhận mẫu"));

    const copyButton = (label: string, value: number): HTMLButtonElement => {
      const b = el("button", { type: "button", class: "copy", "aria-label": `Chép ${label}`, "data-copy": String(value) }, "Chép");
      b.addEventListener("click", () => {
        const text = String(value);
        void (async () => {
          try {
            await copy(text);
            actionError.hidden = true;
          } catch {
            fail(`Không chép được vào clipboard. Hãy tự chép số ${formatVnd(value)}.`);
          }
        })();
      });
      return b;
    };
    const show = (c: Cell): string => (typeof c === "number" ? formatVnd(c) : c);

    const mainTable = el("table", { class: "result-table export-main" });
    const mb = el("tbody");
    for (const [code, label, value] of decl.main) {
      const tr = el("tr");
      tr.append(el("th", { scope: "row" }, `${code ? `${code} ` : ""}${label}`));
      const td = el("td", {}, show(value as Cell));
      if (typeof value === "number") td.append(" ", copyButton(String(label), value));
      tr.append(td);
      mb.append(tr);
    }
    mainTable.append(mb);
    const mw = el("div", { class: "table-scroll" });
    mw.append(mainTable);
    box.append(mw);

    box.append(el("h3", {}, decl.annexTitle));
    const annexTable = el("table", { class: "result-table export-annex" });
    const head = el("thead");
    const hr = el("tr");
    for (const h of decl.annexHeader) hr.append(el("th", { scope: "col" }, h));
    head.append(hr);
    const ab = el("tbody");
    for (const row of decl.annex) {
      const tr = el("tr");
      row.forEach((c, i) => {
        const td = el("td", {}, show(c));
        if (typeof c === "number") td.append(" ", copyButton(`${decl.annexHeader[i] ?? ""} (${String(row[0])})`, c));
        tr.append(td);
      });
      ab.append(tr);
    }
    annexTable.append(head, ab);
    const aw = el("div", { class: "table-scroll" });
    aw.append(annexTable);
    box.append(aw);

    const csv = el("button", { type: "button", name: "download-csv" }, "Tải CSV");
    csv.addEventListener("click", () => {
      try {
        download(csvFilename(year), "text/csv", declarationToCsv(decl));
        actionError.hidden = true;
      } catch {
        fail("Không tạo được file CSV để tải xuống.");
      }
    });
    box.append(csv, actionError);

    // Hướng dẫn eTax
    box.append(el("h3", {}, "Khai trên eTax Mobile"));
    box.append(el("p", {}, "Các bước dưới đây chỉ để tham khảo; giao diện eTax có thể khác tuỳ phiên bản."));
    const ol = el("ol", { class: "export-etax" });
    for (const s of ETAX_STEPS) ol.append(el("li", {}, s));
    box.append(ol);
    disclaimer();
  };

  render();
}
