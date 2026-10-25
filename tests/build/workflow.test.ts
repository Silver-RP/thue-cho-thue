import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const WORKFLOW = resolve(ROOT, ".github/workflows/deploy.yml");
const ORIGIN = "https://silver-rp.github.io/thue-cho-thue/";

type Step = { name?: string; uses?: string; run?: string; with?: Record<string, unknown>; [k: string]: unknown };
type Wf = Record<string, any>;

function load(): Wf {
  return parse(readFileSync(WORKFLOW, "utf8")) as Wf;
}

function steps(wf: Wf, job: string): Step[] {
  return wf.jobs?.[job]?.steps ?? [];
}

const runs = (s: Step[]) => s.map((x) => (x.run ?? "").trim());

/** Kiểm mục 1: thứ tự test → deploy. Trả về danh sách lỗi. */
function checkOrder(wf: Wf): string[] {
  const errs: string[] = [];
  const needs = wf.jobs?.deploy?.needs;
  const list = Array.isArray(needs) ? needs : needs ? [needs] : [];
  if (!list.includes("test")) errs.push("deploy.needs thiếu test");
  const t = steps(wf, "test");
  const idx = [
    "yarn install --frozen-lockfile",
    "yarn -s lint",
    "yarn -s test",
    "yarn -s build",
  ].map((cmd) => runs(t).indexOf(cmd));
  if (idx.some((i) => i < 0)) errs.push("thiếu bước lint/test/build");
  else if (idx.some((v, i) => i > 0 && v <= idx[i - 1])) errs.push("sai thứ tự bước");
  const up = t.findIndex((s) => (s.uses ?? "").startsWith("actions/upload-pages-artifact"));
  if (up < 0) errs.push("job test thiếu upload-pages-artifact");
  else {
    if (up < Math.max(...idx)) errs.push("upload artifact trước khi build/test xong");
    if (t[up].with?.path !== "dist") errs.push("artifact path khác dist");
  }
  const d = steps(wf, "deploy");
  if (d.some((s) => (s.uses ?? "").startsWith("actions/upload-pages-artifact")))
    errs.push("deploy upload artifact");
  if (runs(d).some((r) => /yarn\s+(-s\s+)?(build|install)|npm\s/.test(r.split("\n")[0] ?? "")))
    errs.push("deploy tự build");
  return errs;
}

/** Kiểm mục 2: Pages, quyền, môi trường, nhánh. */
function checkPages(wf: Wf): string[] {
  const errs: string[] = [];
  const all = [...steps(wf, "test"), ...steps(wf, "deploy")];
  const cfg = all.find((s) => (s.uses ?? "").startsWith("actions/configure-pages"));
  if (!cfg || cfg.with?.enablement !== true) errs.push("configure-pages thiếu enablement: true");
  if (!all.some((s) => (s.uses ?? "").startsWith("actions/deploy-pages"))) errs.push("thiếu deploy-pages");
  if (wf.permissions?.pages !== "write") errs.push("thiếu pages: write");
  if (wf.permissions?.["id-token"] !== "write") errs.push("thiếu id-token: write");
  const env = wf.jobs?.deploy?.environment;
  if ((typeof env === "string" ? env : env?.name) !== "github-pages") errs.push("environment sai");
  if (JSON.stringify(wf.on?.push?.branches) !== JSON.stringify(["main"])) errs.push("on.push.branches khác [main]");
  return errs;
}

/** Kiểm mục 3: không có đường lách cổng. */
function checkNoBypass(wf: Wf): string[] {
  const errs: string[] = [];
  for (const [name, job] of Object.entries<any>(wf.jobs ?? {})) {
    const jobIf = String(job.if ?? "");
    if (job["continue-on-error"] !== undefined && job["continue-on-error"] !== false)
      errs.push(`${name}: continue-on-error`);
    if (/always\(\)|failure\(\)/.test(jobIf)) errs.push(`${name}: if always/failure`);
    for (const s of job.steps ?? []) {
      if (s["continue-on-error"] !== undefined && s["continue-on-error"] !== false)
        errs.push(`${name}: step continue-on-error`);
      if (/always\(\)|failure\(\)/.test(String(s.if ?? ""))) errs.push(`${name}: step if always/failure`);
      if (/\|\|\s*true/.test(s.run ?? "")) errs.push(`${name}: || true`);
    }
  }
  return errs;
}

describe("workflow deploy (file thật)", () => {
  it("tồn tại và parse được", () => {
    expect(existsSync(WORKFLOW)).toBe(true);
    expect(load().jobs).toBeTruthy();
  });
  it("mục 1: deploy needs test, thứ tự lint/test/build rồi artifact", () => {
    expect(checkOrder(load())).toEqual([]);
  });
  it("mục 2: Pages, quyền, môi trường, nhánh main", () => {
    expect(checkPages(load())).toEqual([]);
    const wf = load();
    expect(wf.on).toHaveProperty("workflow_dispatch");
    expect(wf.concurrency?.group).toBe("pages");
  });
  it("mục 3: không continue-on-error, always/failure, || true", () => {
    expect(checkNoBypass(load())).toEqual([]);
  });
});

describe("workflow deploy (YAML giả bị bắt)", () => {
  it("bỏ needs → đỏ", () => {
    const wf = load();
    delete wf.jobs.deploy.needs;
    expect(checkOrder(wf)).toContain("deploy.needs thiếu test");
  });
  it("continue-on-error ở bước/job → đỏ", () => {
    const wf = load();
    wf.jobs.test.steps.find((s: Step) => s.run === "yarn -s test")["continue-on-error"] = true;
    expect(checkNoBypass(wf).length).toBeGreaterThan(0);
    const wf2 = load();
    wf2.jobs.deploy["continue-on-error"] = true;
    expect(checkNoBypass(wf2).length).toBeGreaterThan(0);
  });
  it("|| true và if always() → đỏ", () => {
    const wf = load();
    wf.jobs.test.steps.find((s: Step) => s.run === "yarn -s lint").run = "yarn -s lint || true";
    expect(checkNoBypass(wf)).toContain("test: || true");
    const wf2 = load();
    wf2.jobs.deploy.if = "always()";
    expect(checkNoBypass(wf2).length).toBeGreaterThan(0);
  });
  it("upload artifact trước test, deploy tự build → đỏ", () => {
    const wf = load();
    const t = wf.jobs.test.steps as Step[];
    const i = t.findIndex((s) => (s.uses ?? "").startsWith("actions/upload-pages-artifact"));
    const [u] = t.splice(i, 1);
    t.splice(0, 0, u);
    expect(checkOrder(wf)).toContain("upload artifact trước khi build/test xong");
    const wf2 = load();
    wf2.jobs.deploy.steps.unshift({ run: "yarn -s build" });
    expect(checkOrder(wf2)).toContain("deploy tự build");
  });
  it("thiếu enablement hoặc quyền → đỏ", () => {
    const wf = load();
    const cfg = [...wf.jobs.test.steps, ...wf.jobs.deploy.steps].find((s: Step) =>
      (s.uses ?? "").startsWith("actions/configure-pages"),
    );
    cfg.with.enablement = false;
    delete wf.permissions["id-token"];
    expect(checkPages(wf).length).toBe(2);
  });
});

describe("bước smoke sau deploy", () => {
  const smoke = () => {
    const s = steps(load(), "deploy").find((x) => /curl/.test(x.run ?? ""));
    expect(s).toBeTruthy();
    return s!.run!;
  };
  it("chứa URL trang và kiểm tài nguyên /thue-cho-thue/assets/", () => {
    const run = smoke();
    expect(run).toContain(ORIGIN);
    expect(run).toContain("/thue-cho-thue/assets/");
    expect(run).toMatch(/curl -fsI/);
  });
  it("grep chuỗi có trong index.html (h1/FAQ) nhưng không có trong <title>", () => {
    const run = smoke();
    const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)![1];
    const m = /grep -q(?:[a-zA-Z]*)? ?-F ?(?:--)? ?'([^']+)'|grep -qF ?(?:--)? ?'([^']+)'/.exec(run);
    expect(m).toBeTruthy();
    const needle = (m![1] ?? m![2])!;
    expect(needle.length).toBeGreaterThan(10);
    expect(html).toContain(needle);
    expect(title).not.toContain(needle);
    expect(needle).not.toBe("Thuế cho thuê");
    const body = html.replace(/<title>[\s\S]*?<\/title>/, "");
    expect(body).toContain(needle);
  });
  it("thử lại vài lần", () => {
    expect(smoke()).toMatch(/for .* in|retry|until/);
  });
});

describe("devDependency yaml", () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  it("yaml ở devDependencies, không ở dependencies", () => {
    expect(pkg.devDependencies.yaml).toBeTruthy();
    expect(pkg.dependencies?.yaml).toBeUndefined();
  });
  it("yarn.lock có yaml", () => {
    expect(readFileSync(resolve(ROOT, "yarn.lock"), "utf8")).toMatch(/^yaml@/m);
  });
});
