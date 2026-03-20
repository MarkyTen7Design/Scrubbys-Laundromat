import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Auto-increment filename
const existing = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] ?? '0')).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(dir, filename);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

// Force opaque background so transparent PNGs composite correctly in screenshot
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 26, g: 0, b: 51, a: 255 } });

await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 500)); // let initial render settle

// Scroll through page to trigger IntersectionObserver for all elements
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
const steps = Math.ceil(pageHeight / 600);
for (let i = 0; i <= steps; i++) {
  await page.evaluate((pos) => window.scrollTo(0, pos), i * 600);
  await new Promise(r => setTimeout(r, 80));
}
await page.evaluate(() => window.scrollTo(0, 0)); // scroll back to top
await new Promise(r => setTimeout(r, 1200)); // let canvas + animations finish

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved: ${outPath}`);
