#!/usr/bin/env node
// Uses the existing documentation toolchain; no duplicate npm installation.
import { chromium } from '../build/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const directory=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.goto(new URL('./database.html',import.meta.url).href,{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const layout=await page.locator('.page').evaluateAll(pages=>pages.map((p,i)=>({page:i+1,height:p.clientHeight,scrollHeight:p.scrollHeight,contentBottom:Math.max(...[...p.children].filter(x=>!['HEADER','FOOTER'].includes(x.tagName)&&!x.classList.contains('bars')).map(x=>x.getBoundingClientRect().bottom-p.getBoundingClientRect().top)),footerTop:p.querySelector('footer').getBoundingClientRect().top-p.getBoundingClientRect().top})));
 const collisions=layout.filter(x=>x.contentBottom>x.footerTop-5||x.scrollHeight>x.height);
 if(collisions.length) throw new Error(`Layout overflow: ${JSON.stringify(collisions)}`);
 await page.pdf({path:path.join(directory,'../database.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 console.log(`Rendered ${layout.length} A4 pages with fonts loaded; no content/footer collision.`);
} finally { await browser.close(); }
