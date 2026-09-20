// Static checks for every HTML page in site/: SEO tags, structure, links, images. Exit 1 on errors.
import fs from 'node:fs'; import path from 'node:path';
const SITE = path.join(import.meta.dirname, '..', 'site');
const CANON = 'https://meetle.org/';
const pages = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) pages.push(p); } }; walk(SITE);
let errors = 0, warns = 0; const err = (p, m) => { errors++; console.log(`ERROR ${path.relative(SITE, p)}: ${m}`); }; const warn = (p, m) => { warns++; console.log(`warn  ${path.relative(SITE, p)}: ${m}`); };
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : null; };
const seenTitles = new Map(), seenDescs = new Map();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8'); const rel = path.relative(SITE, p); const dir = path.dirname(p); const is404 = rel === '404.html';
  if (!/^<!doctype html>/i.test(html.trim())) err(p, 'missing <!doctype html>');
  if (!/<html[^>]*\slang=/i.test(html)) err(p, 'missing lang on <html>');
  if (!/<head>/.test(html)) err(p, 'needs a literal <head> tag (deploy-prepare.sh injects after it)');
  if (!is404 && /name="robots" content="noindex"/.test(html)) err(p, 'noindex in source (staging noindex is added by deploy-prepare.sh)');
  if (is404 && !/name="robots" content="noindex"/.test(html)) err(p, '404.html must be noindex');
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]; if (!title) err(p, 'missing <title>'); else { if (title.length > 60) warn(p, `title is ${title.length} chars (>60): ${title}`); if (seenTitles.has(title)) err(p, `duplicate title with ${seenTitles.get(title)}`); seenTitles.set(title, rel); }
  const desc = attr(html.match(/<meta[^>]*name="description"[^>]*>/i)?.[0] || '', 'content'); if (!desc) { if (!is404) err(p, 'missing meta description'); } else { if (desc.length > 160) warn(p, `description is ${desc.length} chars (>160)`); if (desc.length < 70) warn(p, `description is short (${desc.length})`); if (seenDescs.has(desc)) err(p, `duplicate description with ${seenDescs.get(desc)}`); seenDescs.set(desc, rel); }
  if (!/<meta[^>]*name="viewport"/i.test(html)) err(p, 'missing viewport meta');
  const h1s = html.match(/<h1[\s>]/gi) || []; if (h1s.length !== 1) err(p, `${h1s.length} <h1> elements (need exactly 1)`);
  const canon = attr(html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0] || '', 'href');
  if (!is404) { if (!canon) err(p, 'missing canonical'); else if (!canon.startsWith(CANON)) err(p, `canonical must start with ${CANON}: ${canon}`); else if (!canon.endsWith('/') ) err(p, `canonical should end with / : ${canon}`); }
  for (const t of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) if (!is404 && !new RegExp(`<meta[^>]*property="${t}"`, 'i').test(html)) err(p, `missing ${t}`);
  if (!is404 && !/<meta[^>]*name="twitter:card"/i.test(html)) err(p, 'missing twitter:card');
  const ogImg = attr(html.match(/<meta[^>]*property="og:image"[^>]*>/i)?.[0] || '', 'content'); if (ogImg && !/^https:\/\/meetle\.org\//.test(ogImg)) err(p, `og:image must be absolute https://meetle.org/… : ${ogImg}`);
  // JSON-LD must parse
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) { try { JSON.parse(m[1]); } catch (e) { err(p, `JSON-LD does not parse: ${e.message}`); } }
  if (!is404 && !/application\/ld\+json/.test(html)) warn(p, 'no JSON-LD');
  // links: no root-absolute, relative targets must exist
  for (const m of html.matchAll(/<(a|link|script|img|source|use)\b[^>]*>/gi)) {
    const tag = m[0]; const v = attr(tag, 'href') ?? attr(tag, 'src') ?? attr(tag, 'srcset');
    if (!v) continue;
    for (const raw of v.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)) {
      if (/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(raw)) { if (/^https?:\/\/meetle\.org\//.test(raw) && /^<a/i.test(tag) && !is404) warn(p, `internal link uses absolute URL (breaks the github.io preview): ${raw}`); continue; }
      if (raw.startsWith('/')) { err(p, `root-absolute URL (breaks under /landing-page/): ${raw}`); continue; }
      if (is404) { err(p, `404.html must use absolute https://meetle.org/ links, found relative: ${raw}`); continue; }
      const target = path.join(dir, raw.split('#')[0].split('?')[0]); const t2 = target.endsWith('/') ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(t2) && !fs.existsSync(target)) err(p, `broken relative link: ${raw}`);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) { const t = m[0]; if (attr(t, 'alt') === null) err(p, `img without alt: ${t.slice(0, 80)}`); if (!attr(t, 'width') || !attr(t, 'height')) warn(p, `img without width/height: ${(attr(t, 'src') || '').slice(0, 60)}`); }
  if (/<a[^>]*href="#"[^>]*>/.test(html)) warn(p, 'anchor with href="#"');
  if (!/<a[^>]*class="[^"]*skip[^"]*"/i.test(html)) warn(p, 'no skip link');
  if (/\b(friend request|video chat|voice chat|video call)\b/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) { const hits = [...html.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/[^.]{0,60}\b(friend request|video chat|voice chat|video call)\b[^.]{0,60}/gi)].map(x => x[0].trim()); warn(p, `mentions a non-feature — verify context: ${hits.join(' | ')}`); }
}
// sitemap + robots
const sm = path.join(SITE, 'sitemap.xml'); if (!fs.existsSync(sm)) err(sm, 'missing sitemap.xml'); else { const x = fs.readFileSync(sm, 'utf8'); for (const loc of [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])) { if (!loc.startsWith(CANON)) err(sm, `loc not on ${CANON}: ${loc}`); const f = path.join(SITE, loc.slice(CANON.length), 'index.html'); if (!fs.existsSync(f)) err(sm, `loc has no page: ${loc}`); } for (const p of pages) { const rel = path.relative(SITE, p); if (rel === '404.html') continue; const url = CANON + rel.replace(/index\.html$/, ''); if (!x.includes(`<loc>${url}</loc>`)) err(sm, `page missing from sitemap: ${url}`); } }
const rb = path.join(SITE, 'robots.txt'); if (!fs.existsSync(rb)) err(rb, 'missing robots.txt'); else if (!/Sitemap: https:\/\/meetle\.org\/sitemap\.xml/.test(fs.readFileSync(rb, 'utf8'))) err(rb, 'robots.txt must reference https://meetle.org/sitemap.xml');
console.log(`\n${pages.length} pages checked — ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
