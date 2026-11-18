import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { guide, report } from './content.mjs';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
async function font(pkg, file, family, weight) {
  const bytes = await fs.readFile(path.join(path.dirname(require.resolve(pkg + '/package.json')), 'files', file));
  return `@font-face {font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');}`;
}
const fonts = (await Promise.all([
  font('@fontsource-variable/archivo', 'archivo-latin-standard-normal.woff2', 'Archivo', '100 900'),
  font('@fontsource/poppins', 'poppins-latin-400-normal.woff2', 'Poppins', '400'),
  font('@fontsource/poppins', 'poppins-latin-600-normal.woff2', 'Poppins', '600'),
])).join('\n');
const css = `
@page {size:A4; margin:0} * {box-sizing:border-box} html {-webkit-print-color-adjust:exact;print-color-adjust:exact}
body {margin:0;color:#101d35;font:10.3pt Poppins,sans-serif} .page {width:210mm;height:297mm;position:relative;break-after:page;background:#fff;overflow:hidden} .page:last-child{break-after:auto}
.bars {height:7mm;display:grid;grid-template-columns:repeat(6,1fr);position:absolute;left:0;right:0;top:0}.bars span:nth-child(odd){background:#101d35}.bars span:nth-child(even){background:#e7b84b}
.content {position:absolute;inset:23mm 19mm 24mm;display:flex;flex-direction:column;gap:4mm}.content>h2{font:800 22pt Archivo,sans-serif;line-height:1.05;margin:0 0 3mm;max-width:165mm}
h3 {margin:2mm 0 0;font:700 12pt Archivo,sans-serif;color:#315c91} p{margin:0;line-height:1.58} strong{font-weight:600} code{font:9pt monospace;background:#f4edde;padding:0 1mm} pre{font:9pt/1.6 monospace;background:#101d35;color:#f4edde;padding:4mm;border-radius:2mm;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.steps {margin:0;padding-left:6mm}.steps li{padding-left:1mm;margin-bottom:2mm;line-height:1.55}
table.data {width:100%;border-collapse:collapse;font-size:9pt;line-height:1.5;table-layout:auto} .data th{background:#101d35;color:#f4edde;text-align:left;font-weight:600;padding:2.2mm;border:1px solid #d9d9d9}.data td{border:1px solid #d9d9d9;padding:2.1mm;vertical-align:top;overflow-wrap:anywhere}.data tr:nth-child(even) td{background:#f4edde}
figure {margin:0;display:flex;flex-direction:column;align-items:center;gap:2mm;min-height:0} figure img{width:100%;max-height:108mm;object-fit:contain;object-position:top center;border:1px solid #d9d9d9}figure.diagram img{max-height:105mm;border:0}figcaption{font-size:7.6pt;color:#52627b;line-height:1.45;width:100%}
.footer{position:absolute;bottom:11mm;left:19mm;right:19mm;border-top:1px solid #d9d9d9;padding-top:2mm;display:flex;justify-content:space-between;gap:5mm;font-size:7pt;color:#52627b}.footer .source{max-width:146mm;overflow-wrap:anywhere}.footer .num{white-space:nowrap}
.cover {background:#f4edde}.cover .inner{position:absolute;inset:47mm 21mm 37mm;display:flex;flex-direction:column;gap:7mm}.brand{font:700 12pt Archivo,sans-serif;letter-spacing:.18em;color:#315c91}.cover h1{font:800 40pt/.98 Archivo,sans-serif;margin:15mm 0 0;letter-spacing:-.02em}.cover .subtitle{font-size:13pt;max-width:155mm;line-height:1.5}.cover .team{margin-top:7mm;font-weight:600}.cover .meta{font-size:10pt;line-height:1.8}.cover .note{margin-top:auto;font-size:10pt;max-width:150mm;border-left:3mm solid #e7b84b;padding-left:4mm}
.toc-entry{display:grid;grid-template-columns:8mm 1fr 10mm;gap:4mm;border-bottom:1px solid #d9d9d9;padding:2.2mm 0;font-size:9.3pt}.toc-entry .section-no{color:#315c91;font-weight:600}.toc-entry .page-no{text-align:right}
`;
const bars = '<div class="bars">' + '<span></span>'.repeat(6) + '</div>';
function cover(name) {
  const reportMode = name === 'report';
  return `<section class="page cover">${bars}<div class="inner"><div class="brand">SMARTSOFT SOLUTIONS</div><h1>ATELIER<br>${reportMode ? 'Project report' : 'Project guide'}</h1><p class="subtitle">${reportMode ? 'Implementation, database relationships and CDC verification' : 'The application, every tool and each role explained simply'}</p><p class="team">Aymen Jedidi and Aziza Bellanes</p><p class="meta">Formation FullStack Spring Boot and Angular<br>Dr Hanen Harbaoui<br>November 2026</p><p class="note">${reportMode ? 'Core application verified locally. Live VPS deployment remains pending.' : 'Start the application, use the Studio and understand how its database works.'}</p></div></section>`;
}
function footer(source, number) {return `<footer class="footer"><span class="source">${source}</span><span class="num">ATELIER &nbsp; ${String(number).padStart(2,'0')}</span></footer>`;}
function html(name, pages) {
  const toc = `<section class="page">${bars}<div class="content"><h2>Contents</h2>${pages.map((p,i) => `<div class="toc-entry"><span class="section-no">${String(i+1).padStart(2,'0')}</span><span>${p.title}</span><span class="page-no">${i+3}</span></div>`).join('')}</div>${footer('Edition verified on 18 November 2026',2)}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ATELIER ${name}</title><style>${fonts}${css}</style></head><body>${cover(name)}${toc}${pages.map((p,i) => `<section class="page">${bars}<article class="content"><h2>${p.title}</h2>${p.html}</article>${footer(p.source,i+3)}</section>`).join('')}</body></html>`;
}
const browser = await chromium.launch({ headless:true });
try {
  for (const [name,pages] of [['guide',guide],['report',report]]) {
    const dir = path.join(docs,name);
    await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,name+'.html'),html(name,pages));
    const page = await browser.newPage();
    await page.goto('file://'+path.join(dir,name+'.html'), {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.evaluate(() => [...document.querySelectorAll('.content')].flatMap((el,index) => {
      const rect = el.getBoundingClientRect();
      const bottom = Math.max(...[...el.children].map(c => c.getBoundingClientRect().bottom));
      return el.scrollWidth > el.clientWidth+2 || bottom > rect.bottom+2 ? [{page:index+2,title:el.querySelector('h2').textContent,overflow:Math.ceil(bottom-rect.bottom),width:el.scrollWidth-el.clientWidth}] : [];
    }));
    const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
    if(problems.length || broken.length) throw new Error(JSON.stringify({name,problems,broken}));
    await page.pdf({path:path.join(docs,name+'.pdf'),preferCSSPageSize:true,printBackground:true});
    console.log(`${name}: ${pages.length+2} pages, no overflow or missing images`);
    await page.close();
  }
} finally {await browser.close();}
