import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Unit tests write synthetic bodies; never capture a real mailbox or environment file here.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'backend/target/email-previews');
const output = path.join(root, 'docs/emails');
await fs.mkdir(output, { recursive: true });
for (const name of (await fs.readdir(source)).filter(name => name.endsWith('.html'))) {
  await fs.copyFile(path.join(source, name), path.join(output, name));
}
const browser = await chromium.launch({ headless: true });
try {
  for (const name of ['welcome', 'winner', 'admin-result']) {
    for (const width of [760, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.goto('file://' + path.join(output, name + '.html'));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`${name}: overflow at ${width}px`);
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log('Synthetic HTML messages copied; welcome, winner and admin previews rendered at desktop/mobile sizes.');
