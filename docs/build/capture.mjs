import { chromium, expect } from 'playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.ATELIER_URL || 'http://127.0.0.1:18081';
const output = path.join(docs, 'evidence/screenshots');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const errors = [];
const contexts = [];
async function pageFor() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function go(page, route) {
  await page.goto(base + route);
  await page.locator('h1').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
}
async function login(email, password) {
  const page = await pageFor();
  await go(page, '/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'));
  return page;
}
function field(page, label, type = 'input') {
  return page.locator('at-form-field').filter({ hasText: new RegExp(label.source.replace('^', '')) }).locator(type);
}
async function check(name, fn) {
  await fn();
  checks.push({ name, status: 'passed' });
  console.log('PASS', name);
}
try {
  const visitor = await pageFor();
  await check('Public gallery and anonymous guard', async () => {
    await go(visitor, '/artworks');
    await expect(visitor.locator('a[href^="/artworks/"]').first()).toBeVisible();
    await shot(visitor, 'gallery');
    await go(visitor, '/studio');
    await expect(visitor).toHaveURL(/\/login/);
  });
  const admin = await login('admin@atelier.local', 'Admin123!');
  await check('Admin login and dashboard data', async () => {
    await expect(admin).toHaveURL(/\/studio/);
    await expect(admin.locator('canvas').first()).toBeVisible();
    await shot(admin, 'studio-overview');
  });
  const artistName = 'Audit artist ' + Date.now();
  const exhibitionName = 'Audit exhibition ' + Date.now();
  await check('Admin creates a client and its project through the UI', async () => {
    await go(admin, '/studio/artists');
    await admin.getByRole('button', { name: 'New artist', exact: true }).click();
    await field(admin, /^Name/).fill(artistName);
    await field(admin, /^Email/).fill('audit-artist@test.local');
    await shot(admin, 'artist-form');
    await admin.getByRole('button', { name: 'Create artist', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Create artist', exact: true })).toBeHidden();
    await admin.getByRole('searchbox', { name: 'Search', exact: true }).fill(artistName);
    await expect(admin.getByText(artistName, { exact: true })).toBeVisible();
    await shot(admin, 'studio-artists');
    await go(admin, '/studio/exhibitions');
    await admin.getByRole('button', { name: 'New exhibition', exact: true }).click();
    await field(admin, /^Title/).fill(exhibitionName);
    await field(admin, /^Artist/, 'select').selectOption({ label: artistName });
    await field(admin, /^Budget/).fill('12500');
    await field(admin, /^Duration/).fill('30');
    await admin.getByRole('button', { name: 'Create exhibition', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Create exhibition', exact: true })).toBeHidden();
    await admin.getByRole('searchbox', { name: 'Search', exact: true }).fill(exhibitionName);
    await expect(admin.getByText(exhibitionName, { exact: true })).toBeVisible();
    await expect(admin.getByText(artistName, { exact: true })).toBeVisible();
    await shot(admin, 'studio-exhibitions');
  });
  await check('Admin updates and deletes its project then client', async () => {
    await admin.getByRole('button', { name: 'Edit ' + exhibitionName, exact: true }).click();
    await field(admin, /^Budget/).fill('15000');
    await admin.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Save changes', exact: true })).toBeHidden();
    await admin.getByRole('button', { name: 'Delete ' + exhibitionName, exact: true }).click();
    await admin.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(admin.getByText(exhibitionName, { exact: true })).toBeHidden();
    await go(admin, '/studio/artists');
    await admin.getByRole('searchbox', { name: 'Search', exact: true }).fill(artistName);
    await admin.getByRole('button', { name: 'Delete ' + artistName, exact: true }).click();
    await admin.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(admin.getByText(artistName, { exact: true })).toBeHidden();
  });
  await check('Admin user management screen', async () => {
    await go(admin, '/studio/users');
    await expect(admin.getByRole('button', { name: 'New user', exact: true })).toBeVisible();
    await expect(admin.getByText('admin@atelier.local', { exact: true })).toBeVisible();
    await shot(admin, 'studio-users');
  });
  const curator = await login('curator@atelier.demo', 'Atelier2026!');
  await check('Collaborateur create access and hidden edit delete actions', async () => {
    await go(curator, '/studio/artists');
    await expect(curator.getByRole('button', { name: 'New artist', exact: true })).toBeVisible();
    await expect(curator.getByRole('button', { name: /^Edit / })).toHaveCount(0);
    await expect(curator.getByRole('button', { name: /^Delete / })).toHaveCount(0);
    await shot(curator, 'collaborateur');
    await go(curator, '/studio/users');
    await expect(curator).toHaveURL(/\/forbidden/);
    await shot(curator, 'forbidden');
  });
  const bidder = await login('collector@atelier.demo', 'Atelier2026!');
  await check('Bidder account and studio guard', async () => {
    await expect(bidder).toHaveURL(/\/account/);
    await shot(bidder, 'account');
    await go(bidder, '/studio');
    await expect(bidder).toHaveURL(/\/forbidden/);
  });
  await check('Live bid arrives over WebSocket in another browser', async () => {
    const patronLogin = await visitor.request.post(base + '/api/auth/login', { data: { email: 'patron@atelier.demo', password: 'Atelier2026!' } });
    const patron = await patronLogin.json();
    const auctions = await (await visitor.request.get(base + '/api/auctions?status=OPEN&size=100')).json();
    const auction = auctions.content.find(a => a.leadingBidderId !== patron.user.id);
    if (!auction) throw new Error('No usable demo auction');
    const subscribed = bidder.waitForEvent('websocket').then(socket =>
      socket.waitForEvent('framesent', { predicate: event => String(event.payload).includes('SUBSCRIBE') }));
    await go(bidder, '/auctions/' + auction.id);
    await subscribed;
    // The displayed bid count changes without a navigation or reload after another account bids.
    const response = await visitor.request.post(base + '/api/auctions/' + auction.id + '/bids', {
      headers: { Authorization: 'Bearer ' + patron.token }, data: { amount: auction.minimumNextBid }
    });
    if (response.status() !== 201) throw new Error('Bid refused: ' + await response.text());
    await expect(bidder.locator('dl').getByText(String(auction.bidCount + 1), { exact: true })).toBeVisible();
    await shot(bidder, 'auction-live');
  });
  await check('Mobile gallery and studio remain within viewport', async () => {
    await visitor.setViewportSize({ width: 390, height: 844 });
    await go(visitor, '/artworks');
    await shot(visitor, 'mobile-gallery');
    await admin.setViewportSize({ width: 390, height: 844 });
    await go(admin, '/studio');
    await shot(admin, 'mobile-studio');
    for (const p of [visitor, admin]) {
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Horizontal page overflow');
    }
  });
  if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
} finally {
  await fs.writeFile(path.join(docs, 'evidence/browser-checks.json'), JSON.stringify({ baseUrl: base, date: new Date().toISOString(), checks, pageErrors: errors }, null, 2));
  await browser.close();
}
