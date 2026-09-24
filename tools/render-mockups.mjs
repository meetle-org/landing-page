// Renders every tools/mockups/*.html with headless Chrome at the size declared in its
// <meta name="viewport-size" content="WxH[@scale]"> tag, to ../site/assets/img/mockups/<name>.png (+ .webp)
// and ../site/assets/og/<name>.png for files starting with "og-". Requires Google Chrome on macOS,
// or set CHROME=/path/to/chrome.
// OG cards: a flat card (og-safety) is a 256-colour palette PNG. A card over a grained scene declares
// <meta name="og-format" content="jpeg"> and becomes <name>.jpg instead: film grain defeats PNG compression
// (the palette PNG of og-home was 340 KB, over the ~300 KB that WhatsApp link previews allow), while a
// 4:4:4 JPEG at q90 is ~60 KB and indistinguishable. Rendering deletes the card's file in the other format,
// so switching formats never leaves a stale card behind; check-site keeps every card under 300 KB.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = path.join(import.meta.dirname, 'mockups');
const MOCK_OUT = path.join(import.meta.dirname, '..', 'site', 'assets', 'img', 'mockups');
const OG_OUT = path.join(import.meta.dirname, '..', 'site', 'assets', 'og');
fs.mkdirSync(OG_OUT, { recursive: true }); // MOCK_OUT is created only when a non-OG wrapper exists (none do today)
const only = process.argv[2];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'))) {
  if (only && !f.includes(only)) continue;
  const html = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = html.match(/name="viewport-size"\s+content="(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?"/);
  if (!m) { console.warn('skip (no viewport-size meta):', f); continue; }
  const [w, h, scale] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
  const name = path.parse(f).name; const isOg = name.startsWith('og-');
  if (!isOg) fs.mkdirSync(MOCK_OUT, { recursive: true });
  const outPng = path.join(isOg ? OG_OUT : MOCK_OUT, name + '.png');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--force-device-scale-factor=${scale}`,
    `--window-size=${w},${h}`, `--screenshot=${outPng}`, 'file://' + path.join(DIR, f)], { stdio: ['ignore', 'ignore', 'ignore'] });
  const meta = await sharp(outPng).metadata();
  let out = outPng;
  if (isOg) {
    const jpeg = /name="og-format"\s+content="jpeg"/.test(html), outJpg = path.join(OG_OUT, name + '.jpg');
    if (jpeg) { await sharp(outPng).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(outJpg); fs.rmSync(outPng); out = outJpg; }
    else { await sharp(outPng).png({ palette: true, quality: 100, colors: 256, dither: 1, effort: 10 }).toFile(outPng + '.tmp'); fs.renameSync(outPng + '.tmp', outPng); fs.rmSync(outJpg, { force: true }); }
  }
  if (!isOg) { await sharp(outPng).webp({ quality: 88 }).toFile(path.join(MOCK_OUT, name + '.webp')); await sharp(outPng).png({ compressionLevel: 9, palette: false }).toFile(outPng + '.tmp'); fs.renameSync(outPng + '.tmp', outPng); }
  console.log(name, `${meta.width}x${meta.height}`, isOg ? `(og) ${path.basename(out)} ${fs.statSync(out).size} B` : '');
}
