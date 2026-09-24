// Read-only check of what https://meetle.org actually serves, against site/. Run it after every publish
// (tools/publish-ghpages.sh): check-site only sees site/, and a file left behind on the gh-pages branch stays live.
// It fetches the live sitemap, every page in it and every same-site file those pages reference (links, assets, og:image),
// and errors when
//   - the live sitemap or any live file differs from site/ (not published yet, or published from another commit),
//   - a live page references a file site/ doesn't have (a stale page or card still linked from somewhere),
//   - anything live breaks brand rule 1 (the home <title> and <h1>) or brand rule 2 (README "Brand rules").
// Pages removed from site/ aren't linked any more, so this can't see them: publish-ghpages.sh prints a curl check for each.
import fs from 'node:fs'; import path from 'node:path';
const CANON = 'https://meetle.org/', SITE = path.join(import.meta.dirname, '..', 'site'), BASE = process.env.LIVE_BASE || CANON; // LIVE_BASE: test a copy served elsewhere
const rebase = u => u.startsWith(CANON) ? BASE + u.slice(CANON.length) : u; // canonical, og and sitemap URLs are absolute meetle.org URLs
const TAGLINE = /talk first, match later/i, NEVER_NAMED = /o[m]egle/i; // the same patterns as check-site's brand rules
let errors = 0; const err = (u, m) => { errors++; console.log(`ERROR ${u}: ${m}`); };
const local = u => { const rel = decodeURIComponent(new URL(u).pathname.slice(new URL(BASE).pathname.length)); return path.join(SITE, rel === '' || rel.endsWith('/') ? path.join(rel, 'index.html') : rel); };
// deploy-prepare.sh adds noindex in staging mode; that is the one allowed difference
const norm = (buf, f) => f.endsWith('.html') && path.basename(f) !== '404.html' ? Buffer.from(buf.toString('utf8').replace('<head><meta name="robots" content="noindex">', '<head>')) : buf;
const get = async u => { const r = await fetch(u, { redirect: 'follow', headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(20000) }); return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) }; };

const sm = await get(BASE + 'sitemap.xml');
if (sm.status !== 200) err(BASE + 'sitemap.xml', `answers ${sm.status}`);
else if (!sm.buf.equals(fs.readFileSync(path.join(SITE, 'sitemap.xml')))) err(BASE + 'sitemap.xml', 'differs from site/sitemap.xml');
const queue = [...new Set([BASE, BASE + '404.html', BASE + 'robots.txt', ...[...sm.buf.toString('utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => rebase(m[1]))])], seen = new Set();
while (queue.length) {
  const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
  const f = local(u); let r; try { r = await get(u); } catch (e) { err(u, `unreachable (${e.cause?.code || e.name})`); continue; }
  if (r.status !== 200) { err(u, `answers ${r.status}`); continue; }
  if (!fs.existsSync(f)) { err(u, `live, but site/ has no ${path.relative(SITE, f)}: a stale file on gh-pages`); continue; }
  if (!norm(r.buf, f).equals(fs.readFileSync(f))) err(u, `differs from site/${path.relative(SITE, f)}`);
  if (!/\.(html|css|js|json|xml|txt|webmanifest|svg)$/.test(f)) continue;
  const s = r.buf.toString('utf8');
  if (NEVER_NAMED.test(s)) err(u, 'brand rule 2: names what Meetle never names');
  if (u === BASE) {
    if (!TAGLINE.test((s.match(/<title>([^<]*)<\/title>/i) || [])[1] || '')) err(u, 'brand rule 1: the home <title> lacks the tagline');
    if (!TAGLINE.test(((s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))) err(u, 'brand rule 1: the home <h1> lacks the tagline');
  }
  if (!f.endsWith('.html') && !f.endsWith('.webmanifest') && !f.endsWith('.css')) continue;
  // href/src anywhere, absolute URLs in meta content (og:image, og:url), url() in CSS, "src" in the manifest
  for (const m of s.matchAll(/\s(?:href|src)="([^"#?]+)|\scontent="(https?:\/\/[^"#?\s]+)"|url\(\s*['"]?([^)'"#?]+)|"src":\s*"([^"#?]+)"/g)) {
    const v = m[1] || m[2] || m[3] || m[4]; if (/^(mailto:|tel:|data:|javascript:)/i.test(v)) continue;
    let t; try { t = new URL(rebase(v), u); } catch { continue; }
    if (t.origin !== new URL(BASE).origin || !t.pathname.startsWith(new URL(BASE).pathname)) continue; // other sites aren't ours to compare
    if (!seen.has(t.href)) queue.push(t.href);
  }
}
console.log(`\n${seen.size} live URLs checked against site/ — ${errors} errors`);
process.exit(errors ? 1 : 0);
