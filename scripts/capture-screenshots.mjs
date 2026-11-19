// Captures the landing-page screenshots and catalog card images from the hosted example.
//
//   npm run build:example        # refresh docs/try/ first if the UI changed
//   npm run capture              # writes docs/images/*.jpg and docs/catalog/*.jpg
//
// Runs headless Chromium at a fixed 16:10 viewport with a fresh, signed-out browser, so only
// synthetic Sample-mode data can appear. Review every image before publishing anyway.
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const DOCS = join(ROOT, 'docs');
const BASE = '/sfguide-auto-finance-portfolio-analytics/try'; // must match basePath in next.config.ts
const CARD_ID = 'auto-finance-portfolio-analytics';
const VIEWPORT = { width: 1600, height: 1000 };
const PAGE_SCALE = 1.0;  // 1600x1000 PNGs for the landing page
const CARD_SCALE = 0.6;  // 960x600 catalog cards

// Wait for scripted (Sample) AI answers: they take 4 to 8 seconds by design.
const AI = { timeout: 20000 };
const SHOTS = [
  { name: '01-overview', card: 1, path: '/', wait: 'text=What stands out' },
  { name: '02-credit-risk', card: 2, path: '/risk/', wait: 'text=Roll rates',
    async act(page) { await page.evaluate(() => { const h = document.getElementById('vintage'); window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 76); }); } },
  { name: '03-collections-queue', card: 3, path: '/collections/', wait: 'text=Daniel Baker' },
  {
    name: '04-account-summary', card: 4, path: '/collections/view/?id=53529',
    async act(page) {
      await page.getByRole('button', { name: 'Summarize account' }).click();
      await page.locator('.sample-label').waitFor(AI);
      await page.evaluate(() => window.scrollBy(0, 150));
    },
  },
  {
    name: '05-dealer-fpd', card: 5, path: '/dealers/view/?id=23',
    async act(page) {
      await page.getByRole('button', { name: 'Explain this dealer' }).click();
      await page.locator('.sample-label').waitFor(AI);
      await page.evaluate(() => window.scrollBy(0, 420));
    },
  },
  {
    name: '06-ask', card: 6, path: '/ask/',
    async act(page) {
      await page.getByRole('button', { name: 'Which dealers have the highest first-payment default rate in 2026?' }).first().click();
      await page.locator('.sample-label').waitFor(AI);
      await page.evaluate(() => window.scrollBy(0, 120));
    },
  },
  {
    name: '07-ask-reasoning', path: '/ask/',
    async act(page) {
      await page.getByRole('button', { name: 'Show the 30+ DPD rate by month for the 580-619 FICO band' }).first().click();
      await page.waitForTimeout(2600);
    },
  },
  { name: '08-dealers', card: 7, path: '/dealers/', wait: 'text=Harbor Pre-Owned' },
  { name: '09-overview-dark', path: '/', scheme: 'dark', wait: 'text=What stands out' },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

// Serves docs/try/ at the GitHub Pages path, the way the hosted example is published.
function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(BASE)) { res.writeHead(404).end(); return; }
    let file = normalize(join(DOCS, 'try', decodeURIComponent(url.pathname.slice(BASE.length))));
    if (!file.startsWith(join(DOCS, 'try'))) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(1590, 990); // park the pointer so no tooltip shows
  await page.waitForTimeout(900);
}

async function main() {
  if (!existsSync(join(DOCS, 'try', 'index.html'))) throw new Error('docs/try/ is missing. Run `npm run build:example` first.');
  mkdirSync(join(DOCS, 'images'), { recursive: true });
  mkdirSync(join(DOCS, 'catalog'), { recursive: true });
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}${BASE}`;
  const browser = await chromium.launch();
  const only = process.argv[2];
  try {
    for (const shot of SHOTS.filter((s) => !only || s.name.startsWith(only))) {
      for (const [scale, out] of [
        [PAGE_SCALE, join(DOCS, 'images', `${shot.name}.jpg`)],
        ...(shot.card ? [[CARD_SCALE, join(DOCS, 'catalog', `${CARD_ID}-${shot.card}.jpg`)]] : []),
      ]) {
        const scheme = shot.scheme ?? 'light';
        const context = await browser.newContext({
          viewport: VIEWPORT, deviceScaleFactor: scale, colorScheme: scheme, reducedMotion: 'reduce',
          locale: 'en-US', timezoneId: 'America/New_York',
        });
        await context.addInitScript((s) => { localStorage.setItem('afpa-theme', s); }, scheme);
        const page = await context.newPage();
        await page.goto(origin + shot.path);
        if (shot.wait) await page.locator(shot.wait).first().waitFor();
        await settle(page);
        if (shot.act) { await shot.act(page); await settle(page); }
        await page.screenshot({ path: out, type: 'jpeg', quality: out.includes('/catalog/') ? 72 : 84 });
        await context.close();
        console.log(`${out.replace(ROOT + '/', '')}  ${Math.round(statSync(out).size / 1024)} KB`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((failure) => { console.error(failure.message); process.exit(1); });
