// Renders the Markdown documents in docs/pack/*.md to A4 PDFs in the report template layout.
// Usage: node docs/build/pack.mjs [name ...]   (default: every file in docs/pack)
//
// Markdown conventions on top of standard Markdown:
//   front matter      title, cover (lines separated by |), subtitle, header, date, cover_image
//   # Heading         starts a numbered section on a new page
//   > text            large quotation band
//   ![caption](path "strip")   tall cropped image strip floated beside the text
//   ```dot```         Graphviz source, rendered to inline SVG
//   ```chart```       JSON {title, labels, values, unit} rendered as a bar chart
//   ```stats```       JSON [{value, label}] rendered as figure tiles
//   ```cols```        two columns separated by a line containing only ---
//   ```donut```/```hbar``` JSON {title, labels, values} ring chart / horizontal bars
//   ```cards```       JSON [{title, text}] tiles;  ```note``` first line = label, rest = Markdown box
//   ![caption](path "browser:/route")   screenshot inside a browser frame
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { Marked } from 'marked';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const C = { ink: '#101d35', cobalt: '#315c91', sun: '#e7b84b', ivory: '#f4edde', tint: '#dfe6ef', line: '#d5d9df', muted: '#5b6678' };

async function font(pkg, file, family, weight, style = 'normal') {
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  const data = (await fs.readFile(path.join(dir, 'files', file))).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
}
const fonts = (await Promise.all([
  font('@fontsource/bebas-neue', 'bebas-neue-latin-400-normal.woff2', 'Bebas', 400),
  ...[300, 400, 500, 600].map(w => font('@fontsource/montserrat', `montserrat-latin-${w}-normal.woff2`, 'Montserrat', w)),
  font('@fontsource/montserrat', 'montserrat-latin-300-italic.woff2', 'Montserrat', 300, 'italic'),
  font('@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2', 'Mono', '100 800').catch(() => ''),
])).join('');

const css = `
@page{size:A4;margin:30mm 22mm 20mm 24mm}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:${C.ink};font:300 9.6pt/1.62 Montserrat,sans-serif;letter-spacing:.01em}
p{margin:0 0 3.2mm}strong{font-weight:600}a{color:${C.cobalt};text-decoration:none}
h1,h2{font-family:Bebas,sans-serif;font-weight:400;letter-spacing:.08em;line-height:1;margin:0}
section.sec{break-before:page;position:relative}
section.sec>h1{position:relative;display:inline-block;font-size:30pt;padding:0 6mm 0 0;margin:2mm 0 7mm}
section.sec>h1 .no{color:${C.cobalt};margin-right:4mm}
section.sec>h1::before{content:'';position:absolute;z-index:-1;left:-12mm;right:0;bottom:-.5mm;height:42%;background:${C.tint}}
section.sec.alt>h1::before{background:${C.ivory}}
h2{font-size:17pt;margin:6mm 0 3mm;break-after:avoid}
h3{font:600 8pt/1.4 Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.14em;color:${C.cobalt};margin:5mm 0 2mm;break-after:avoid}
ul,ol{margin:0 0 3.2mm;padding-left:5.5mm}li{margin:0 0 1.2mm}li::marker{color:${C.cobalt}}
code{font:400 8.2pt Mono,monospace;background:${C.ivory};padding:.2mm 1mm;border-radius:.6mm}
pre{font:400 7.8pt/1.55 Mono,monospace;background:${C.ink};color:${C.ivory};padding:4mm 5mm;margin:0 0 4mm;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid;border-left:2mm solid ${C.sun}}
pre code{background:none;padding:0;font:inherit;color:inherit}
table{width:100%;border-collapse:collapse;font-size:8.2pt;line-height:1.45;margin:1mm 0 4.5mm;break-inside:auto}
thead{display:table-header-group}tr{break-inside:avoid}
th{font:600 7.4pt Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.1em;text-align:left;padding:2.2mm 2.4mm;border-bottom:.5mm solid ${C.ink}}
td{padding:2mm 2.4mm;border-bottom:.2mm solid ${C.line};vertical-align:top;overflow-wrap:break-word}td:first-child code{white-space:nowrap}
tbody tr:nth-child(even) td{background:#f8f6f1}
blockquote{clear:both;position:relative;margin:4mm 0 6mm -24mm;padding:8mm 14mm 7mm 34mm;background:${C.tint};break-inside:avoid}
blockquote p{font:300 italic 14pt/1.5 Montserrat,sans-serif;margin:0;color:${C.ink}}
blockquote::before,blockquote::after{font:400 54pt/1 Bebas,sans-serif;color:${C.cobalt};opacity:.35;position:absolute}
blockquote::before{content:'\\201C';left:20mm;top:5mm}blockquote::after{content:'\\201D';right:8mm;bottom:-6mm}
figure{margin:2mm 0 5mm;break-inside:avoid}figure img{display:block;width:100%;border:.2mm solid ${C.line}}
figure img.tall{max-height:150mm;width:auto;max-width:100%;margin:0 auto}
figcaption{font:400 7.4pt/1.45 Montserrat,sans-serif;color:${C.muted};margin-top:1.8mm}
figcaption b{font-weight:600;color:${C.ink}}
figure.strip{float:left;shape-outside:none;width:30mm;height:118mm;margin:0 7mm 4mm -24mm}
figure.strip img{height:100%;width:100%;object-fit:cover;object-position:center;filter:grayscale(1) contrast(1.05);border:0}
figure.diagram{text-align:center}figure.diagram svg{max-width:100%;height:auto;max-height:200mm}
.chart{margin:2mm 0 5mm;break-inside:avoid}.chart .t{font:600 7.4pt Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.12em;margin-bottom:2mm}
.stats{clear:both;display:grid;grid-template-columns:repeat(auto-fit,minmax(30mm,1fr));gap:3mm;margin:2mm 0 5mm;break-inside:avoid}
.stats div{background:${C.ivory};padding:4mm 4mm 3mm;border-top:1mm solid ${C.cobalt}}
.stats b{display:block;font:400 25pt/1 Bebas,sans-serif;letter-spacing:.04em}.stats span{font-size:7.4pt;line-height:1.35;display:block;margin-top:1.5mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:2mm}.cols>div>:first-child{margin-top:0}
.toc h1{font-size:30pt;margin:2mm 0 8mm}
.toc a{display:grid;grid-template-columns:12mm 1fr 10mm;border-bottom:.2mm solid ${C.line};padding:2.6mm 0;color:${C.ink};font-weight:400}
.toc a span:first-child{font:400 13pt/1 Bebas,sans-serif;color:${C.cobalt};letter-spacing:.06em}.toc a span:last-child{text-align:right}
section.sec>h1+p,section.sec>h1+h3+p{font-size:10.6pt;line-height:1.6;font-weight:400}
figure.browser{border:.3mm solid ${C.line};border-radius:2mm;overflow:hidden;box-shadow:0 1.5mm 4mm rgba(16,29,53,.12);background:#fff}
figure.browser .bar{display:flex;align-items:center;gap:1.4mm;background:#eef0f3;padding:1.6mm 3mm;border-bottom:.3mm solid ${C.line}}
figure.browser .bar i{width:2.2mm;height:2.2mm;border-radius:50%;background:#d4d8de}
figure.browser .bar i:nth-child(1){background:#e8776b}figure.browser .bar i:nth-child(2){background:#e7b84b}figure.browser .bar i:nth-child(3){background:#7bbf7a}
figure.browser .bar span{margin-left:3mm;font:400 6.8pt Montserrat;color:${C.muted};background:#fff;border-radius:1mm;padding:.6mm 3mm;flex:1}
figure.browser img{border:0}figure.browser figcaption{padding:2mm 3mm 2.4mm;margin:0;background:#fafbfc;border-top:.3mm solid ${C.line}}
.donut .row{display:flex;align-items:center;gap:8mm}.donut .legend{flex:1}
.donut .legend div{display:grid;grid-template-columns:4mm 1fr auto;align-items:center;gap:2mm;padding:1.5mm 0;border-bottom:.2mm solid ${C.line};font-size:8.4pt}
.donut .legend i{width:3mm;height:3mm;border-radius:.6mm}.donut .legend b{font:400 14pt Bebas;letter-spacing:.04em}
.hbar .hrow{display:grid;grid-template-columns:38mm 1fr 14mm;align-items:center;gap:3mm;margin:1.6mm 0;font-size:8.2pt}
.hbar .track{background:${C.ivory};height:4.2mm;border-radius:.8mm;overflow:hidden}.hbar .track div{height:100%}
.hbar .hrow b{font:400 13pt Bebas;letter-spacing:.04em;text-align:right}
aside.note{break-inside:avoid;margin:2mm 0 5mm;padding:4mm 5mm 1.5mm;background:${C.ivory};border-left:1.6mm solid ${C.sun}}
aside.note>b{display:block;font:600 7.4pt Montserrat;text-transform:uppercase;letter-spacing:.14em;color:${C.cobalt};margin-bottom:1.6mm}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(48mm,1fr));gap:3.5mm;margin:2mm 0 5mm;break-inside:avoid}
.cards div{border:.3mm solid ${C.line};border-top:1.2mm solid ${C.cobalt};padding:3.5mm 4mm 1mm;background:#fff}
.cards div:nth-child(even){border-top-color:${C.sun}}
.cards b{display:block;font:400 15pt/1.05 Bebas;letter-spacing:.06em;margin-bottom:1.5mm}.cards p{font-size:8.3pt;line-height:1.5}
.clear{clear:both}
`;

const coverCss = `
@page{size:A4;margin:0}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:300 9.6pt/1.6 Montserrat,sans-serif;color:${C.ink}}
.cover{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff}
.band{position:absolute;left:0;top:118mm;width:122mm;height:178mm;background:${C.tint}}
.band2{position:absolute;right:0;top:0;width:14mm;height:297mm;background:${C.ink}}
.date{position:absolute;top:13mm;right:26mm;font:500 7pt Montserrat;letter-spacing:.14em;text-transform:uppercase}
.brand{position:absolute;top:13mm;left:18mm;font:600 7pt Montserrat;letter-spacing:.24em;color:${C.cobalt}}
h1{position:absolute;top:28mm;left:18mm;margin:0;font:400 74pt/.92 Bebas,sans-serif;letter-spacing:.09em;color:#3d4550}
.sub{position:absolute;top:186mm;left:18mm;width:104mm;font:400 13pt/1.45 Montserrat;text-transform:uppercase;letter-spacing:.06em}
.shot{position:absolute;left:128mm;top:136mm;width:64mm;height:122mm;object-fit:cover;object-position:left top;filter:grayscale(1);border:0}
.by{position:absolute;bottom:20mm;left:18mm;width:104mm;font:400 7.6pt/1.6 Montserrat;text-align:left}
.by b{font-weight:600}
`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function barChart({ title, labels, values, unit = '' }) {
  const w = 640, h = 250, left = 46, bottom = 34, top = 14, max = Math.max(...values) * 1.12;
  const step = (w - left - 10) / values.length, bw = Math.min(70, step * 0.55);
  const ticks = [0, .25, .5, .75, 1].map(f => Math.round(max * f));
  const y = v => h - bottom - (v / max) * (h - bottom - top);
  const grid = ticks.map(t => `<line x1="${left}" x2="${w}" y1="${y(t)}" y2="${y(t)}" stroke="${C.line}" stroke-width="1"/><text x="${left - 8}" y="${y(t) + 3}" text-anchor="end" font-size="9" fill="${C.muted}">${t}</text>`).join('');
  const bars = values.map((v, i) => {
    const x = left + step * i + (step - bw) / 2;
    return `<rect x="${x}" y="${y(v)}" width="${bw}" height="${h - bottom - y(v)}" fill="${i % 2 ? C.cobalt : '#3d4550'}"/>`
      + `<text x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="${C.ink}">${v}${unit}</text>`
      + `<text x="${x + bw / 2}" y="${h - bottom + 15}" text-anchor="middle" font-size="9" fill="${C.ink}">${esc(labels[i])}</text>`;
  }).join('');
  return `<div class="chart"><div class="t">${esc(title)}</div><svg viewBox="0 0 ${w} ${h}" width="100%" font-family="Montserrat">${grid}${bars}</svg></div>`;
}

const palette = ['#315c91', '#e7b84b', '#101d35', '#8aa4c8', '#c9a24a', '#5b6678', '#b9c7da'];

function donutChart({ title, labels, values, center = '', unit = '' }) {
  const total = values.reduce((a, b) => a + b, 0), r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = values.map((v, i) => {
    const len = (v / total) * c;
    const arc = `<circle r="${r}" cx="110" cy="110" fill="none" stroke="${palette[i % palette.length]}" stroke-width="34" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;
    offset += len;
    return arc;
  }).join('');
  const legend = labels.map((l, i) => `<div><i style="background:${palette[i % palette.length]}"></i><span>${esc(l)}</span><b>${values[i]}${unit}</b></div>`).join('');
  return `<div class="chart donut"><div class="t">${esc(title)}</div><div class="row"><svg viewBox="0 0 220 220" width="46mm">${arcs}<text x="110" y="106" text-anchor="middle" font-family="Bebas" font-size="38" fill="${C.ink}">${esc(center || total)}</text><text x="110" y="128" text-anchor="middle" font-family="Montserrat" font-size="10" fill="${C.muted}">TOTAL</text></svg><div class="legend">${legend}</div></div></div>`;
}

function hbarChart({ title, labels, values, unit = '' }) {
  const max = Math.max(...values);
  const rows = labels.map((l, i) => `<div class="hrow"><span>${esc(l)}</span><div class="track"><div style="width:${(values[i] / max) * 100}%;background:${i % 2 ? C.sun : C.cobalt}"></div></div><b>${values[i]}${unit}</b></div>`).join('');
  return `<div class="chart hbar"><div class="t">${esc(title)}</div>${rows}</div>`;
}

function dot(source) {
  const defaults = `graph[fontname="Helvetica",fontsize=11,bgcolor="transparent",pad=0.1];node[fontname="Helvetica",fontsize=10,shape=box,style="filled",fillcolor="${C.ivory}",color="${C.ink}",penwidth=0.8,margin="0.14,0.06"];edge[fontname="Helvetica",fontsize=8.5,color="${C.cobalt}",fontcolor="${C.muted}",arrowsize=0.7];`;
  const svg = execFileSync('dot', ['-Tsvg'], { input: source.replace('{', '{' + defaults) }).toString();
  return `<figure class="diagram">${svg.slice(svg.indexOf('<svg'))}</figure>`;
}

// Large screenshots are embedded as resized JPEG copies (cached by size and date) to keep the PDFs small.
const cacheDir = path.join(docs, 'pack', '.cache');
function sized(file) {
  const width = Number(execFileSync('magick', ['identify', '-format', '%w', file]).toString());
  const { mtimeMs, size } = statSync(file);
  if (width <= 1600 && size < 400_000) return file;
  const out = path.join(cacheDir, `${path.basename(file, path.extname(file))}-${size}-${Math.round(mtimeMs)}.jpg`);
  if (!existsSync(out)) {
    mkdirSync(cacheDir, { recursive: true });
    execFileSync('magick', [file, '-resize', '1600x>', '-background', 'white', '-flatten', '-quality', '90', out]);
  }
  return out;
}

function makeMarked() {
  const marked = new Marked();
  marked.use({
    renderer: {
      code({ text, lang }) {
        if (lang === 'dot') return dot(text);
        if (lang === 'chart') return barChart(JSON.parse(text));
        if (lang === 'stats') return `<div class="stats">${JSON.parse(text).map(s => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>`;
        if (lang === 'donut') return donutChart(JSON.parse(text));
        if (lang === 'hbar') return hbarChart(JSON.parse(text));
        if (lang === 'cards') return `<div class="cards" style="grid-template-columns:repeat(${(n => n <= 2 ? n : n === 4 ? 2 : 3)(JSON.parse(text).length)},1fr)">${JSON.parse(text).map(c => `<div><b>${esc(c.title)}</b><p>${esc(c.text)}</p></div>`).join('')}</div>`;
        if (lang === 'note') {
          const [first, ...rest] = text.split('\n');
          return `<aside class="note"><b>${esc(first)}</b>${marked.parse(rest.join('\n'))}</aside>`;
        }
        if (lang === 'cols') return `<div class="cols">${text.split(/^---$/m).map(part => `<div>${marked.parse(part)}</div>`).join('')}</div>`;
        return `<pre><code>${esc(text)}</code></pre>`;
      },
      paragraph({ tokens }) {
        if (tokens.length === 1 && tokens[0].type === 'image') return this.parser.parseInline(tokens);
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      image({ href, title, text }) {
        const src = 'file://' + sized(path.join(docs, href));
        if (title === 'strip') return `<figure class="strip"><img src="${src}" alt=""></figure>`;
        const [head, ...rest] = text.split(' — ');
        const caption = rest.length ? `<b>${esc(head)}.</b> ${esc(rest.join(' — '))}` : esc(text);
        if (title?.startsWith('browser')) {
          const where = title.slice('browser'.length).replace(/^:/, '') || '/';
          return `<figure class="browser"><div class="bar"><i></i><i></i><i></i><span>atelier · ${esc(where)}</span></div><img src="${src}" alt="${esc(head)}"><figcaption>${caption}</figcaption></figure>`;
        }
        return `<figure><img src="${src}"${title === 'tall' ? ' class="tall"' : ''} alt="${esc(head)}"><figcaption>${caption}</figcaption></figure>`;
      },
    },
  });
  return marked;
}

function parse(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = Object.fromEntries((match ? match[1] : '').split('\n').filter(Boolean).map(l => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
  const body = match ? source.slice(match[0].length) : source;
  const marked = makeMarked();
  // Split on top-level headings only, never on '# ' lines inside fenced code.
  const chunks = [{ title: null, lines: [] }];
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line)) fenced = !fenced;
    if (!fenced && line.startsWith('# ')) chunks.push({ title: line.slice(2).trim(), lines: [] });
    else chunks.at(-1).lines.push(line);
  }
  const sections = chunks.slice(1).map(c => ({ title: c.title, html: marked.parse(c.lines.join('\n')) }));
  const intro = marked.parse(chunks[0].lines.join('\n'));
  return { meta, sections, intro };
}

function bodyHtml({ meta, sections, intro }, pages) {
  const toc = `<div class="toc"><h1>Contents</h1>${sections.map((s, i) => `<a><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(s.title)}</span><span>${pages ? String(pages[i]).padStart(2, '0') : '00'}</span></a>`).join('')}${intro}</div>`;
  const secs = sections.map((s, i) => `<section class="sec${i % 2 ? ' alt' : ''}"><h1><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h1>${s.html}</section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(meta.title)}</title><style>${fonts}${css}</style></head><body>${toc}${secs}</body></html>`;
}

function coverHtml(meta) {
  const lines = (meta.cover || meta.title).split('|').map(esc).join('<br>');
  const shot = meta.cover_image ? `<img class="shot" src="file://${sized(path.join(docs, meta.cover_image))}" alt="">` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fonts}${coverCss}</style></head><body><div class="cover">
<div class="band"></div><div class="band2"></div>${shot}<div class="brand">ATELIER · SMARTSOFT SOLUTIONS</div><div class="date">${esc(meta.date)}</div>
<h1>${lines}</h1><div class="sub">${esc(meta.subtitle || '')}</div>
<div class="by">Prepared by: <b>Aziza Bellanes</b><br>Formation FullStack Spring Boot and Angular<br>Instructor: Dr Hanen Harbaoui</div></div></body></html>`;
}

const headerFont = fonts.split('}@font-face').find(f => f.includes("'Bebas'")).replace(/^@font-face/, '');
function header(meta) {
  const s = 'font-family:Montserrat,sans-serif;font-size:6.6pt;letter-spacing:1.3px;text-transform:uppercase;color:#101d35';
  return `<style>@font-face${headerFont}}</style><div style="width:100%;padding:0 22mm 0 24mm;-webkit-print-color-adjust:exact"><div style="display:flex;justify-content:space-between;${s}"><span>ATELIER — ${esc(meta.header || meta.title)}</span><span>//</span><span>${esc(meta.date)}</span></div>
<div style="font-family:Bebas,sans-serif;font-size:17pt;letter-spacing:3px;color:#101d35;margin-top:2.5mm"><span class="pageNumber"></span></div></div>`;
}

async function sectionPages(pdf, sections) {
  const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString().split('\f');
  const norm = s => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
  let from = 1;
  return sections.map((s, i) => {
    const key = norm(String(i + 1).padStart(2, '0') + s.title);
    const found = text.findIndex((page, p) => p >= from && norm(page).includes(key));
    if (found < 0) throw new Error(`Section not found in PDF: ${s.title}`);
    from = found + 1;
    return found + 1;
  });
}

async function render(browser, name) {
  const doc = parse(await fs.readFile(path.join(docs, 'pack', `${name}.md`), 'utf8'));
  const outDir = path.join(docs, 'pack', 'html');
  await fs.mkdir(outDir, { recursive: true });
  const tmp = path.join(outDir, `.${name}`);
  const page = await browser.newPage();
  const print = async (html, file, withHeader) => {
    await fs.writeFile(file + '.html', html);
    await page.goto('file://' + file + '.html', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
    if (broken.length) throw new Error(`${name}: missing images ${broken.join(', ')}`);
    const wide = await page.evaluate(() => [...document.querySelectorAll('pre,table,figure')].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.textContent.slice(0, 60)));
    if (wide.length) throw new Error(`${name}: horizontal overflow in ${JSON.stringify(wide)}`);
    await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: withHeader,
      headerTemplate: withHeader ? header(doc.meta) : '<span></span>', footerTemplate: '<span></span>' });
  };
  await print(bodyHtml(doc), tmp + '-body.pdf', true);
  const pages = await sectionPages(tmp + '-body.pdf', doc.sections);
  await print(bodyHtml(doc, pages), tmp + '-body.pdf', true);
  await print(coverHtml(doc.meta), tmp + '-cover.pdf', false);
  const out = path.join(docs, `${name}.pdf`);
  execFileSync('pdfunite', [tmp + '-cover.pdf', tmp + '-body.pdf', out]);
  await fs.rename(tmp + '-body.pdf.html', path.join(outDir, `${name}.html`));
  await fs.rename(tmp + '-cover.pdf.html', path.join(outDir, `${name}-cover.html`));
  for (const f of ['-body.pdf', '-cover.pdf']) await fs.rm(tmp + f);
  await page.close();
  const count = execFileSync('pdfinfo', [out]).toString().match(/Pages:\s+(\d+)/)[1];
  console.log(`${name}.pdf: ${count} pages, ${doc.sections.length} sections`);
}

const names = process.argv.slice(2).length ? process.argv.slice(2)
  : (await fs.readdir(path.join(docs, 'pack'))).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
const browser = await chromium.launch({ headless: true });
try { for (const name of names) await render(browser, name); } finally { await browser.close(); }
