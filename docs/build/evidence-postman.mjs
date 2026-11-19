// Postman evidence: (optionally) run Newman, then render screenshots from its output.
//   node docs/build/evidence-postman.mjs --run     run the collection first
//   node docs/build/evidence-postman.mjs           re-render from saved output
// Needs newman@6 + newman-reporter-htmlextra on NEWMAN_BIN (default: npx newman@6).
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shoot } from "./terminal-shot.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ev = `${root}/docs/evidence/postman`;
const shots = `${root}/docs/evidence/screenshots/postman`;
mkdirSync(ev, { recursive: true }); mkdirSync(shots, { recursive: true });
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:18081";
const extraEnv = (process.env.NEWMAN_ENV ?? "").split(",").filter(Boolean).flatMap((v) => ["--env-var", v]);

if (process.argv.includes("--run")) {
  const bin = process.env.NEWMAN_BIN ? [process.env.NEWMAN_BIN] : ["npx", "--yes", "newman@6"];
  const r = spawnSync(bin[0], [...bin.slice(1), "run", `${root}/postman/ATELIER.postman_collection.json`,
    "--env-var", `baseUrl=${baseUrl}`, ...extraEnv, "-r", "cli,htmlextra,json",
    "--reporter-htmlextra-export", `${ev}/newman-report.html`, "--reporter-htmlextra-title", "ATELIER API run",
    "--reporter-json-export", `${ev}/newman-report.json`, "--color", "off", "--disable-unicode"],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  writeFileSync(`${ev}/newman-cli.txt`, r.stdout + r.stderr);
}

const cli = readFileSync(`${ev}/newman-cli.txt`, "utf8").split("\n");
const report = JSON.parse(readFileSync(`${ev}/newman-report.json`, "utf8"));
const exe = report.run.executions;
const manifest = [];
const add = (file, title, caption) => manifest.push({ file, title, caption });
const tmp = (name, lines) => { const p = `${ev}/.${name}.txt`; writeFileSync(p, lines.join("\n")); return p; };
const CMD = "newman run postman/ATELIER.postman_collection.json --env-var baseUrl=http://127.0.0.1:18081";

// 1. summary table
const sIdx = cli.findIndex((l) => /\|\s+iterations/.test(l)) - 1;
await shoot({ out: `${shots}/newman-summary.png`, width: 1100,
  panes: [{ title: "Postman collection — run with Newman, summary", cmd: CMD, text: cli.slice(sIdx).join("\n") }] });
const st = report.run.stats;
add("newman-summary.png", "Postman collection — run with Newman: summary",
  `Newman executed ${st.requests.total} requests and ${st.assertions.total} assertions with ${st.assertions.failed} failures.`);

// 2. folder request lines (auth + a few security checks)
const f0 = cli.findIndex((l) => l.startsWith("Folder 0"));
const f1 = cli.findIndex((l) => l.startsWith("Folder 1"));
await shoot({ out: `${shots}/newman-folder-auth.png`, width: 1200,
  panes: [{ title: "Postman collection — run with Newman, folder 0 Auth", cmd: CMD, text: cli.slice(f0, f1).join("\n") }] });
add("newman-folder-auth.png", "Postman collection — run with Newman: Auth folder",
  "Console lines of the Auth folder: login for the three roles, wrong password (401), registration and duplicate email (409), each with its assertions.");
const secIdx = cli.findIndex((l) => /^Folder .*Security/i.test(l));
if (secIdx >= 0) {
  let end = cli.findIndex((l, i) => i > secIdx && l.startsWith("Folder "));
  if (end < 0) end = cli.findIndex((l) => /\|\s+iterations/.test(l)) - 2;
  await shoot({ out: `${shots}/newman-folder-security.png`, width: 1200,
    panes: [{ title: "Postman collection — run with Newman, security folder", cmd: CMD, text: cli.slice(secIdx, end).join("\n") }] });
  add("newman-folder-security.png", "Postman collection — run with Newman: access-control checks",
    "Console lines of the security folder: anonymous calls return 401 and calls with the wrong role return 403.");
}

// 3. request cards
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Secrets never appear in the cards: passwords are masked and tokens shortened.
const redact = (k, v) => /password/i.test(k) && typeof v === "string" ? "••••••••"
  : /token/i.test(k) && typeof v === "string" && v.startsWith("eyJ") ? v.slice(0, 8) + "…" : v;
const pretty = (t) => { try { return JSON.stringify(JSON.parse(t), redact, 2); } catch { return t; } };
const clip = (t, n) => { const l = t.split("\n"); return l.length > n ? l.slice(0, n).join("\n") + "\n  …" : t; };
const url = (u) => `${u.protocol}://${u.host.join(".")}${u.port ? ":" + u.port : ""}/${u.path.join("/")}` +
  (u.query?.length ? "?" + u.query.map((q) => `${q.key}=${q.value}`).join("&") : "");
const hdr = (h) => /^authorization$/i.test(h.key) ? `${h.key}: ${h.value.replace(/(Bearer\s+eyJhbGci).*/, "$1…")}` : `${h.key}: ${h.value}`;
const cards = [
  [0, "card-login", "Login as administrator"],
  [8, "card-create-artist", "Create artist (POST /api/studio/artists)"],
  [37, "card-place-bid", "Place a bid"],
  [70, "card-401-no-token", "Request without a token returns 401"],
  [12, "card-403-collaborateur-delete", "Collaborateur delete returns 403"],
  [21, "card-409-business-error", "Business rule conflict returns 409"],
];
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 2 });
for (const [i, name, label] of cards) {
  const e = exe[i], rq = e.request, rs = e.response;
  const body = rq.body?.raw ? clip(pretty(rq.body.raw), 14) : "";
  const resBody = clip(pretty(Buffer.from(rs.stream.data).toString("utf8")), 16) || "(empty body)";
  const heads = rq.header.filter((h) => !h.system || /authorization/i.test(h.key)).map(hdr);
  const ok = rs.code < 300;
  const tests = e.assertions.map((a) => `<li class="${a.error ? "bad" : "ok"}"><b>${a.error ? "FAIL" : "PASS"}</b> ${esc(a.assertion)}</li>`).join("");
  await pg.setContent(`<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:24px;background:#f4f5f7;font:14px 'Inter','Segoe UI',sans-serif;color:#212121;width:1052px}
  .tag{color:#6b6b6b;font-size:12px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
  .card{background:#fff;border:1px solid #dcdfe4;border-radius:8px;overflow:hidden}
  .top{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid #e6e8ec;background:#fafbfc}
  .m{font-weight:700;color:${rq.method === "POST" ? "#b8860b" : rq.method === "DELETE" ? "#c0392b" : rq.method === "PUT" ? "#1f6fb2" : "#1b8a4b"}}
  .u{font:13px 'JetBrains Mono',monospace}.n{margin-left:auto;color:#6b6b6b}
  h4{margin:0;padding:10px 16px 4px;font-size:12px;color:#6b6b6b;text-transform:uppercase;letter-spacing:.05em}
  pre{margin:0;padding:6px 16px 12px;font:12.5px/1.45 'JetBrains Mono',monospace;white-space:pre-wrap;word-break:break-all;background:#fff}
  .res{border-top:1px solid #e6e8ec}.st{padding:10px 16px;display:flex;gap:18px;font-weight:600;border-top:1px solid #e6e8ec;background:#fafbfc}
  .st .c{color:${ok ? "#1b8a4b" : "#c0392b"}}.st span:not(.c){font-weight:400;color:#555}
  ul{margin:0;padding:8px 16px 14px;list-style:none}li{padding:2px 0}.ok b{color:#1b8a4b}.bad b{color:#c0392b}</style>
  <div class="tag">Postman collection — run with Newman</div><div class="card">
  <div class="top"><span class="m">${rq.method}</span><span class="u">${esc(url(rq.url))}</span><span class="n">${esc(e.item.name)}</span></div>
  <h4>Request headers</h4><pre>${esc(heads.join("\n"))}</pre>
  ${body ? `<h4>Request body (JSON)</h4><pre>${esc(body)}</pre>` : ""}
  <div class="st"><span class="c">${rs.code} ${esc(rs.status)}</span><span>${rs.responseTime} ms</span><span>${rs.responseSize} B</span></div>
  <h4>Response body</h4><pre>${esc(resBody)}</pre>
  <div class="res"><h4>Test results</h4><ul>${tests}</ul></div></div>`);
  await pg.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  add(`${name}.png`, `Postman collection — run with Newman: ${label}`,
    `${rq.method} ${new URL(url(rq.url)).pathname} answered ${rs.code} ${rs.status} in ${rs.responseTime} ms and ${e.assertions.length} assertion(s) passed.`);
}

// 4. HTML report pages
const rp = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 });
await rp.goto(`file://${ev}/newman-report.html`);
await rp.waitForTimeout(1500);
await rp.screenshot({ path: `${shots}/report-summary.png` });
add("report-summary.png", "Postman collection — run with Newman: HTML report summary",
  "Top of the htmlextra report: totals for iterations, requests, assertions and failures of the run.");
await rp.click("text=Total Requests");
await rp.click("a:has-text('8 · Security checks')");
const reqLink = rp.locator("a:has-text('Anonymous studio artist list (401)')");
await reqLink.click();
await rp.waitForTimeout(600);
await rp.setViewportSize({ width: 1400, height: 1500 });
await rp.locator("a:has-text('8 · Security checks')").scrollIntoViewIfNeeded();
await rp.evaluate(() => window.scrollBy(0, 40));
await rp.screenshot({ path: `${shots}/report-requests.png` });
add("report-requests.png", "Postman collection — run with Newman: HTML report requests",
  "Report view of the security-checks folder with one request expanded to show its request, response and test information.");
await browser.close();
writeFileSync(`${shots}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
