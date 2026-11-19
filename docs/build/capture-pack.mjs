import { chromium } from 'playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'evidence/screenshots/app');
const LIVE = process.env.LIVE_URL || 'https://fruits-libraries-strand-scenic.trycloudflare.com';
const BASE = process.env.BASE || 'http://127.0.0.1:18081';
const MAIL = process.env.MAILPIT || 'http://127.0.0.1:18025';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const manifest = [];

async function pageFor({ mobile = false, motion = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1, reducedMotion: motion ? 'no-preference' : 'reduce'
  });
  return context.newPage();
}
async function settle(page, ms = 600) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}
async function go(page, url) {
  await page.goto(url);
  await page.locator('h1, h2').first().waitFor();
  await settle(page);
}
async function shot(page, source, name, title, caption, route, { full = false, wait } = {}) {
  const file = `${source}-${name}.png`;
  if (wait) await page.waitForTimeout(wait);
  await settle(page, 200);
  await page.screenshot({ path: path.join(out, file), fullPage: full, animations: wait ? 'allow' : 'disabled' });
  manifest.push({ file, title, caption, source, route });
  console.log('OK  ', file);
}
async function step(title, fn) {
  try { await fn(); } catch (e) {
    const error = String(e).split('\n').slice(0, 3).join(' ').slice(0, 300);
    manifest.push({ file: null, title, error });
    console.log('FAIL', title, '-', error);
  }
}
async function login(email, password) {
  const page = await pageFor();
  await go(page, BASE + '/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 8000 });
  await settle(page);
  return page;
}
const field = (page, label, type = 'input') =>
  page.locator('at-form-field').filter({ hasText: new RegExp(label) }).locator(type).first();
const href = (page, sel) => page.locator(sel).first().getAttribute('href');

// ---------- LIVE (read-only) ----------
const L = (r) => LIVE + r;
await step('Live public pages', async () => {
  const p = await pageFor({ motion: true });
  await go(p, L('/'));
  await shot(p, 'live', 'home', 'Home page', 'The landing page with the introduction animation settled.', '/', { wait: 4000 });
  await p.evaluate(() => window.scrollTo(0, Math.round(innerHeight * 1.1)));
  await shot(p, 'live', 'home-featured', 'Home page, featured section', 'The home page scrolled to the featured artworks and auctions.', '/', { wait: 1500 });
  await p.close();
});
const pub = await pageFor();
const pages = [
  ['artworks', 'Artwork gallery', 'The public gallery listing artworks with filters.', '/artworks'],
  ['artists', 'Artists', 'The list of artists represented by the gallery.', '/artists'],
  ['exhibitions', 'Exhibitions', 'The public list of exhibitions.', '/exhibitions'],
  ['auctions', 'Auctions', 'The list of auctions with their status and current price.', '/auctions'],
  ['login', 'Sign in', 'The sign-in form, shown without submitting.', '/login'],
  ['register', 'Register', 'The account registration form, shown without submitting.', '/register'],
  ['404', 'Not found', 'The page displayed for an unknown route.', '/this-does-not-exist']
];
for (const [n, t, c, r] of pages) await step('Live ' + t, async () => { await go(pub, L(r)); await shot(pub, 'live', n, t, c, r); });
let liveAuction;
for (const [n, sel, t, c, from] of [
  ['artwork-detail', 'a[href^="/artworks/"]', 'Artwork detail', 'The detail page of the first artwork in the gallery.', '/artworks'],
  ['artist-profile', 'a[href^="/artists/"]', 'Artist profile', 'The profile page of the first listed artist.', '/artists'],
  ['auction-room', 'a[href^="/auctions/"]', 'Auction page', 'The page of the first listed auction.', '/auctions']
]) await step('Live ' + t, async () => {
  await go(pub, L(from));
  await pub.locator(sel).first().waitFor();
  const h = await href(pub, sel);
  if (n === 'auction-room') liveAuction = h;
  await go(pub, L(h));
  await shot(pub, 'live', n, t, c, h);
});
const mob = await pageFor({ mobile: true });
await step('Live mobile home', async () => { await go(mob, L('/')); await shot(mob, 'live', 'mobile-home', 'Home page on mobile', 'The home page at 390 by 844 pixels.', '/', { wait: 3000 }); });
await step('Live mobile gallery', async () => { await go(mob, L('/artworks')); await shot(mob, 'live', 'mobile-artworks', 'Gallery on mobile', 'The artwork gallery at 390 by 844 pixels.', '/artworks'); });
await step('Live mobile auction', async () => { await go(mob, L(liveAuction)); await shot(mob, 'live', 'mobile-auction', 'Auction page on mobile', 'An auction page at 390 by 844 pixels.', liveAuction); });

// ---------- LOCAL ----------
const B = (r) => BASE + r;
const ADMIN = [process.env.ADMIN_EMAIL || 'admin@atelier.local', process.env.ADMIN_PASSWORD || 'Admin123!'];
const admin = await login(...ADMIN).catch(() => null) ?? new Proxy({}, { get() { throw new Error('admin login refused by the instance'); } });
await step('Studio overview', async () => {
  await admin.locator('canvas').first().waitFor();
  await shot(admin, 'local', 'studio-overview', 'Studio overview', 'The studio dashboard for the administrator.', '/studio');
  await shot(admin, 'local', 'studio-overview-full', 'Studio overview, full page', 'The full-length studio dashboard.', '/studio', { full: true });
});
const name = 'Sample artist ' + Date.now().toString().slice(-5);
await step('Artists list and create', async () => {
  await go(admin, B('/studio/artists'));
  await shot(admin, 'local', 'studio-artists', 'Studio artists list', 'The artists list in the studio (Clients).', '/studio/artists');
  await admin.getByRole('button', { name: 'New artist', exact: true }).click();
  // The sheet's inputs in order: name, email, phone, country, address, biography.
  const inputs = admin.locator('input:visible:not([type=checkbox]):not([placeholder^="Search"]), textarea:visible');
  const values = [name, 'b.morisot@atelier.demo', '+33 1 42 00 00 00', 'France', '12 rue de Passy, Paris', 'French painter, member of the Impressionist group.'];
  for (const [i, value] of values.entries()) await inputs.nth(i).fill(value);
  await shot(admin, 'local', 'artist-form', 'Artist form filled', 'The new artist form filled with sample data and not yet submitted.', '/studio/artists');
  await admin.getByRole('button', { name: 'Create artist', exact: true }).click();
  await admin.getByRole('button', { name: 'Create artist', exact: true }).waitFor({ state: 'hidden' });
  await admin.getByRole('searchbox', { name: 'Search', exact: true }).fill(name);
  await admin.getByText(name, { exact: true }).waitFor();
  await shot(admin, 'local', 'artist-created', 'Artist created', 'The artists list showing the newly created row.', '/studio/artists');
  await admin.getByRole('button', { name: 'Delete ' + name, exact: true }).click();
  await admin.getByRole('button', { name: 'Delete', exact: true }).click();
  await admin.getByText(name, { exact: true }).waitFor({ state: 'hidden' });
});
for (const [slug, label, list, newBtn, t] of [
  ['exhibitions', 'exhibition', 'Studio exhibitions list', 'New exhibition', 'exhibitions (Projets)'],
  ['artworks', 'artwork', 'Studio artworks list', 'New artwork', 'artworks'],
  ['auctions', 'auction', 'Studio auctions list', 'New auction', 'auctions'],
  ['users', 'user', 'Studio users list', 'New user', 'users'],
  ['roles', 'role', 'Studio roles list', 'New role', 'roles']
]) await step(list, async () => {
  const r = '/studio/' + slug;
  await go(admin, B(r));
  await shot(admin, 'local', 'studio-' + slug, list, `The ${t} list in the studio.`, r);
  await admin.getByRole('button', { name: newBtn, exact: true }).click();
  await admin.getByRole('dialog').first().waitFor().catch(() => {});
  await shot(admin, 'local', `${label}-form`, `Studio ${label} form`, `The empty form to create a ${label}.`, r);
});
await step('Profile', async () => { await go(admin, B('/studio/profile')); await shot(admin, 'local', 'profile', 'Studio profile', 'The profile page of the signed-in administrator.', '/studio/profile'); });
await step('User form with roles', async () => {
  await go(admin, B('/studio/users'));
  await admin.getByRole('button', { name: 'New user', exact: true }).click();
  await admin.getByRole('checkbox').first().waitFor();
  await shot(admin, 'local', 'user-roles', 'User form with roles', 'The user form listing the assignable roles as checkboxes.', '/studio/users');
});

const curator = await login('curator@atelier.demo', 'Atelier2026!');
await step('Collaborateur views', async () => {
  await go(curator, B('/studio/artists'));
  await curator.getByRole('button', { name: 'New artist', exact: true }).waitFor();
  const n = await curator.getByRole('button', { name: /^(Edit|Delete) / }).count();
  if (n) throw new Error('edit/delete buttons visible: ' + n);
  await shot(curator, 'local', 'collaborateur', 'Collaborateur studio view', 'The artists list for a Collaborateur account, without edit or delete actions.', '/studio/artists');
  await go(curator, B('/studio/users'));
  await curator.waitForURL(/forbidden/);
  await shot(curator, 'local', 'forbidden', 'Access denied', 'The forbidden page shown when a Collaborateur opens the users screen.', '/forbidden');
});

const anon = await pageFor();
await step('Login error', async () => {
  await go(anon, B('/login'));
  await anon.getByLabel('Email', { exact: true }).fill('collector@atelier.demo');
  await anon.getByLabel('Password', { exact: true }).fill('wrong-password');
  await anon.getByRole('button', { name: 'Sign in', exact: true }).click();
  await anon.getByRole('alert').first().waitFor();
  await shot(anon, 'local', 'login-error', 'Login error', 'The message displayed after signing in with a wrong password.', '/login');
});
await step('Register validation', async () => {
  await go(anon, B('/register'));
  await anon.getByLabel('Email', { exact: true }).fill('not-an-email');
  await anon.getByLabel('Password', { exact: true }).fill('short');
  await anon.getByRole('button', { name: 'Create account', exact: true }).click();
  await anon.getByRole('alert').first().waitFor();
  await shot(anon, 'local', 'register-errors', 'Register validation errors', 'The registration form with validation messages after an invalid submission.', '/register');
});

const bidder = await login('collector@atelier.demo', 'Atelier2026!');
await step('Bidder account', async () => {
  await go(bidder, B('/account'));
  await shot(bidder, 'local', 'account', 'Bidder account', 'The account page of a bidder with bids and wins.', '/account', { full: true });
});
await step('Auction room before and after bid', async () => {
  const me = await (await anon.request.post(B('/api/auth/login'), { data: { email: 'collector@atelier.demo', password: 'Atelier2026!' } })).json();
  const open = await (await anon.request.get(B('/api/auctions?status=OPEN&size=100'))).json();
  const auction = open.content.find(a => a.leadingBidderId !== me.user.id);
  if (!auction) throw new Error('no OPEN auction available');
  const route = '/auctions/' + auction.id;
  const viewer = await login(...ADMIN).catch(() => login('patron@atelier.demo', 'Atelier2026!'));
  await go(viewer, B(route));
  await go(bidder, B(route));
  await shot(bidder, 'local', 'auction-before', 'Auction room before bidding', 'An open auction room as a bidder, before a bid is placed.', route);
  await bidder.getByLabel('Your bid (EUR)').fill(String(auction.minimumNextBid));
  await bidder.getByRole('button', { name: 'Place a bid', exact: true }).click();
  await bidder.getByRole('button', { name: 'Confirm bid', exact: true }).click();
  await bidder.getByText('You are the highest bidder').first().waitFor();
  await shot(bidder, 'local', 'auction-after', 'Auction room after bidding', 'The same auction room after the minimum next bid was accepted.', route);
  await viewer.locator('dl').getByText(String(auction.bidCount + 1), { exact: true }).waitFor();
  await shot(viewer, 'local', 'auction-live-viewer', 'Live update in a second browser', 'A second browser session on the same auction showing the new bid without reloading.', route);
});

await step('Mailpit', async () => {
  const mail = await pageFor();
  await mail.goto(MAIL);
  await mail.locator('.message, a.message, [role="listitem"], tbody tr').first().waitFor();
  await settle(mail);
  await shot(mail, 'local', 'mailpit-inbox', 'Mailpit inbox', 'The local mail catcher listing messages sent by the application.', '/ (Mailpit)');
  await mail.locator('.message, a.message, [role="listitem"], tbody tr').first().click();
  await mail.locator('iframe').first().waitFor();
  await shot(mail, 'local', 'mailpit-message', 'Mailpit message', 'One opened gallery email in the local mail catcher.', '/ (Mailpit)', { wait: 800 });
});

await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
await browser.close();
console.log(manifest.filter(m => !m.file).length + ' failures');
