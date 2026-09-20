// Renders every tools/mockups/*.html with headless Chrome at the size declared in its
// <meta name="viewport-size" content="WxH[@scale]"> tag, to ../site/assets/img/mockups/<name>.png (+ .webp)
// and ../site/assets/og/<name>.png for files starting with "og-". Requires Google Chrome on macOS,
// or set CHROME=/path/to/chrome.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = path.join(import.meta.dirname, 'mockups');
const MOCK_OUT = path.join(import.meta.dirname, '..', 'site', 'assets', 'img', 'mockups');
const OG_OUT = path.join(import.meta.dirname, '..', 'site', 'assets', 'og');
fs.mkdirSync(MOCK_OUT, { recursive: true }); fs.mkdirSync(OG_OUT, { recursive: true });
const only = process.argv[2];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'))) {
  if (only && !f.includes(only)) continue;
  const html = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = html.match(/name="viewport-size"\s+content="(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?"/);
  if (!m) { console.warn('skip (no viewport-size meta):', f); continue; }
  const [w, h, scale] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
  const name = path.parse(f).name; const isOg = name.startsWith('og-');
  const outPng = path.join(isOg ? OG_OUT : MOCK_OUT, name + '.png');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--force-device-scale-factor=${scale}`,
    `--window-size=${w},${h}`, `--screenshot=${outPng}`, 'file://' + path.join(DIR, f)], { stdio: ['ignore', 'ignore', 'ignore'] });
  const meta = await sharp(outPng).metadata();
  if (!isOg) { await sharp(outPng).webp({ quality: 88 }).toFile(path.join(MOCK_OUT, name + '.webp')); await sharp(outPng).png({ compressionLevel: 9, palette: false }).toFile(outPng + '.tmp'); fs.renameSync(outPng + '.tmp', outPng); }
  console.log(name, `${meta.width}x${meta.height}`, isOg ? '(og)' : '');
}
