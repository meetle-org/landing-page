// Photos -> responsive WebP + JPEG (480/960/1440 wide) + manifest.json with LQIP placeholders.
// Usage: node build-photos.mjs <source-dir>   (defaults to ./source-photos, which is git-ignored;
// the masters live in Meetle.sketch → images/). Output: ../site/assets/img/photos
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const SRC = process.argv[2] || path.join(import.meta.dirname, 'source-photos');
const OUT = path.join(import.meta.dirname, '..', 'site', 'assets', 'img', 'photos');
fs.mkdirSync(OUT, { recursive: true });
const widths = [480, 960, 1440];
const manifest = {};
for (const f of fs.readdirSync(SRC).filter(f => /\.(png|jpe?g|webp)$/i.test(f))) {
  const name = path.parse(f).name; const img = sharp(path.join(SRC, f)).rotate(); const meta = await img.metadata();
  manifest[name] = { width: meta.width, height: meta.height, sizes: {} };
  for (const w of widths) {
    if (w > meta.width * 1.05) continue;
    const base = `${name}-${w}`;
    await img.clone().resize({ width: w }).webp({ quality: 78, effort: 5 }).toFile(path.join(OUT, base + '.webp'));
    await img.clone().resize({ width: w }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(OUT, base + '.jpg'));
    const m = await sharp(path.join(OUT, base + '.webp')).metadata(); manifest[name].sizes[w] = { w: m.width, h: m.height };
  }
  const buf = await img.clone().resize({ width: 24 }).blur(2).webp({ quality: 40 }).toBuffer();
  manifest[name].lqip = 'data:image/webp;base64,' + buf.toString('base64');
  console.log(name, meta.width + 'x' + meta.height, Object.keys(manifest[name].sizes).join('/'));
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
