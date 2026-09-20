// Favicon + app icons from the brand mark (../site/assets/brand/mark-coral.svg).
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const OUT = path.join(import.meta.dirname, '..', 'site');
const mark = fs.readFileSync(path.join(OUT, 'assets', 'brand', 'mark-coral.svg'), 'utf8');
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 189.72 189.72">${mark.replace(/<\?xml[^>]*>/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '')}</svg>`;
fs.writeFileSync(path.join(OUT, 'favicon.svg'), fav);
const d = mark.match(/\sd="([^"]+)"/)[1];
const svgOnBg = (size, pad, bg) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/><g transform="translate(${pad},${pad}) scale(${(size - 2 * pad) / 165.72})"><path fill="#FFFFFF" d="${d}"/></g></svg>`);
await sharp(Buffer.from(fav)).resize(32, 32).png().toFile(path.join(OUT, 'favicon-32.png'));
await sharp(Buffer.from(fav)).resize(16, 16).png().toFile(path.join(OUT, 'favicon-16.png'));
await sharp(svgOnBg(180, 34, '#E8513D')).png().toFile(path.join(OUT, 'apple-touch-icon.png'));
await sharp(svgOnBg(192, 38, '#E8513D')).png().toFile(path.join(OUT, 'icon-192.png'));
await sharp(svgOnBg(512, 100, '#E8513D')).png().toFile(path.join(OUT, 'icon-512.png'));
const png32 = await sharp(Buffer.from(fav)).resize(32, 32).png().toBuffer();
const hdr = Buffer.alloc(6); hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(1, 4);
const ent = Buffer.alloc(16); ent[0] = 32; ent[1] = 32; ent.writeUInt16LE(1, 4); ent.writeUInt16LE(32, 6); ent.writeUInt32LE(png32.length, 8); ent.writeUInt32LE(22, 12);
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([hdr, ent, png32]));
console.log('favicons written to', OUT);
