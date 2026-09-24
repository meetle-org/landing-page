// Full-page screenshots of every page in site/ at true phone/tablet/desktop widths -> tools/out/screens/<page>-<label>.png
// Chrome headless clamps --window-size below ~500px and only captures the window, so each page is rendered inside an
// <iframe> of the exact width in a very tall wrapper page (so lazy images load), the iframe is shrunk to the document's
// height once fonts are ready, and the capture is cropped to that height. Pages fill at least one screen (body min-height
// 100dvh), so the fit first drops the iframe to that width's real screen height (VH) and then grows it to the content.
// 404.html loads everything from https://meetle.org/ (it is served at any depth), so it is shot from a temporary copy
// whose links point at the local site/ folder. Requires Google Chrome on macOS, or set CHROME=/path/to/chrome.
// The site follows prefers-color-scheme, so the colour scheme is forced: light by default, --night renders the night palette
// to <page>-<label>-night.png. Usage: node tools/screenshot-pages.mjs [page-filter] [--slice] [--night]
// (--slice also writes 1600px-tall pieces, easier to read)
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE = path.join(import.meta.dirname, '..', 'site'); const OUT = path.join(import.meta.dirname, 'out', 'screens'); const WRAP = path.join(OUT, '_wrap');
fs.mkdirSync(WRAP, { recursive: true });
const args = process.argv.slice(2); const slice = args.includes('--slice'); const night = args.includes('--night'); const filter = args.find(a => !a.startsWith('--'));
const widths = { phone: 390, tablet: 820, desktop: 1440 }; const VH = { phone: 844, tablet: 1180, desktop: 900 }; const H = 16000; const BG = [136, 136, 136];
const pages = ['index.html', ...fs.readdirSync(SITE).filter(d => fs.existsSync(path.join(SITE, d, 'index.html'))).sort().map(d => d + '/index.html'), '404.html'];
const local404 = path.join(WRAP, '404.html');
fs.writeFileSync(local404, fs.readFileSync(path.join(SITE, '404.html'), 'utf8').replaceAll('https://meetle.org/', 'file://' + SITE + '/'));
for (const p of pages) {
  const name = p.replace(/\/?index\.html$/, '') || 'home'; if (filter && !name.includes(filter)) continue;
  const src = p === '404.html' ? local404 : path.join(SITE, p);
  for (const [label, w] of Object.entries(widths)) {
    const wrap = path.join(WRAP, `${name}-${label}.html`);
    fs.writeFileSync(wrap, `<!doctype html><html><body style="margin:0;background:rgb(${BG.join(',')})"><iframe id="f" src="file://${src}" style="border:0;display:block;width:${w}px;height:${H}px"></iframe>\n<script>const f=document.getElementById('f');const fit=()=>{const d=f.contentDocument;if(!d||!d.body)return;f.style.height='${VH[label]}px';f.style.height=Math.max(${VH[label]},d.documentElement.scrollHeight)+'px'};f.addEventListener('load',()=>{const d=f.contentDocument;(d&&d.fonts?d.fonts.ready:Promise.resolve()).then(()=>{fit();setTimeout(fit,100)})});</script></body></html>`);
    const raw = path.join(WRAP, `${name}-${label}.raw.png`); const out = path.join(OUT, `${name}-${label}${night ? '-night' : ''}.png`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', `--blink-settings=preferredColorScheme=${night ? 0 : 1}`, `--window-size=${Math.max(w, 600)},${H}`, '--virtual-time-budget=6000', `--screenshot=${raw}`, 'file://' + wrap], { stdio: 'ignore' });
    // crop to the iframe width, then to the page's real height (everything below it is wrapper background)
    const { data, info } = await sharp(raw).extract({ left: 0, top: 0, width: w, height: H }).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels; let h = H;
    for (let y = H - 1; y >= 0; y--) {
      let bg = true; for (let x = 0, o = y * w * ch; x < w; x++, o += ch) { if (data[o] !== BG[0] || data[o + 1] !== BG[1] || data[o + 2] !== BG[2]) { bg = false; break; } }
      if (!bg) { h = y + 1; break; }
    }
    await sharp(raw).extract({ left: 0, top: 0, width: w, height: h }).png().toFile(out); fs.unlinkSync(raw);
    console.log(`${path.relative(process.cwd(), out)}  ${w}x${h}${h === H ? '  (TRUNCATED — raise H)' : ''}`);
    if (slice) for (let i = 0, top = 0; top < h; i++, top += 1600) { const sh = Math.min(1600, h - top); await sharp(out).extract({ left: 0, top, width: w, height: sh }).png().toFile(out.replace(/\.png$/, `-${i}.png`)); }
  }
}
