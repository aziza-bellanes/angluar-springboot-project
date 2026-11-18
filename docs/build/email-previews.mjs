import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backend = path.join(root, 'backend');
const source = path.join(backend, 'target/email-previews');
const output = path.join(root, 'docs/emails');
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
}
// Compile the renderer and synthetic preview authoring tool. Do not invoke any test goals.
run(path.join(backend, 'mvnw'), ['-q', '-DskipTests', 'compile', 'dependency:build-classpath', '-Dmdep.outputFile=target/mail-preview-classpath.txt'], backend);
const dependencies = (await fs.readFile(path.join(backend, 'target/mail-preview-classpath.txt'), 'utf8')).trim();
run('java', ['--class-path', path.join(backend, 'target/classes') + path.delimiter + dependencies,
  path.join(root, 'docs/build/EmailPreviews.java'), source], root);
await fs.mkdir(output, { recursive: true });
await fs.copyFile(path.join(backend, 'src/main/resources/mail/oleanders.jpg'), path.join(output, 'oleanders.jpg'));
for (const name of (await fs.readdir(source)).filter(name => name.endsWith('.html'))) {
  const html = (await fs.readFile(path.join(source, name), 'utf8')).replaceAll('cid:atelier-gallery-art', 'oleanders.jpg');
  await fs.writeFile(path.join(output, name), html);
}
const browser = await chromium.launch({ headless: true });
try {
  for (const name of ['welcome', 'winner', 'admin-result']) {
    for (const width of [760, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.goto('file://' + path.join(output, name + '.html'));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${name}: overflow at ${width}px`);
      if (await page.locator('img').evaluateAll(images => images.some(image => !image.complete || !image.naturalWidth))) throw new Error(`${name}: missing artwork`);
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      await page.close();
    }
  }
} finally { await browser.close(); }
console.log('Gallery correspondence rendered at desktop/mobile sizes, with framed artwork.');
