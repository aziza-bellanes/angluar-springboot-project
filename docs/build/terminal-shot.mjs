// Render text files as dark terminal windows and screenshot them.
// node docs/build/terminal-shot.mjs --out x.png --width 1200 \
//   --pane "file.txt|window title|command shown at the prompt" [--pane ...]
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

export function paneHtml({ text, title, cmd }) {
  const body = esc(strip(text).replace(/\s+$/, ""));
  return `<section class="win"><header><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>${esc(title)}</span></header>
<pre><span class="ps">$</span> <span class="cmd">${esc(cmd)}</span>\n${body}</pre></section>`;
}

export async function shoot({ panes, out, width = 1200 }) {
  const font = "'JetBrains Mono','DejaVu Sans Mono',monospace";
  const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:24px;background:#0b0e14;width:${width - 48}px}
  .row{display:flex;gap:20px;align-items:flex-start}
  .win{flex:1;min-width:0;background:#12161f;border:1px solid #2a3142;border-radius:10px;overflow:hidden}
  header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#1b2130;border-bottom:1px solid #2a3142}
  header i{width:12px;height:12px;border-radius:50%}
  header span{margin-left:10px;color:#9aa4b8;font:500 13px ${font}}
  pre{margin:0;padding:16px 18px;color:#d6deeb;font:13px/1.5 ${font};white-space:pre-wrap;word-break:break-all}
  .ps{color:#7fdbca}.cmd{color:#ffcb6b}</style><div class="row">${panes.map(paneHtml).join("")}</div>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 400 }, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), panes = []; let out, width = 1200;
  for (let i = 0; i < a.length; i += 2) {
    if (a[i] === "--out") out = a[i + 1];
    else if (a[i] === "--width") width = +a[i + 1];
    else if (a[i] === "--pane") {
      const [file, title, cmd] = a[i + 1].split("|");
      panes.push({ text: readFileSync(file, "utf8"), title, cmd });
    }
  }
  await shoot({ panes, out, width });
}
