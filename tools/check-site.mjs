// Static checks for every HTML page in site/: SEO tags, structure, links (incl. #fragment targets), images, truth rules.
// Exit 1 on errors. `--external` also requests every outbound link (needs network; failures are warnings).
import fs from 'node:fs'; import path from 'node:path';
const SITE = path.join(import.meta.dirname, '..', 'site');
const EXTERNAL = process.argv.includes('--external'); const outbound = new Map(); // url -> first page that links it
const idsCache = new Map(); const idsOf = f => { if (!idsCache.has(f)) idsCache.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))); return idsCache.get(f); };
const CANON = 'https://meetle.org/';
const pages = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) pages.push(p); } }; walk(SITE);
let errors = 0, warns = 0; const err = (p, m) => { errors++; console.log(`ERROR ${path.relative(SITE, p)}: ${m}`); }; const warn = (p, m) => { warns++; console.log(`warn  ${path.relative(SITE, p)}: ${m}`); };
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : null; };
const seenTitles = new Map(), seenDescs = new Map();
const OG_MAX = 300 * 1024, ogUsed = new Set(); // share cards: size budget, and every card in assets/og must be some page's og:image
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
  // the share card must exist in site/ and stay under 300 KB (WhatsApp drops link previews with a bigger image); twitter:image is the same card
  if (ogImg && /^https:\/\/meetle\.org\//.test(ogImg)) { const f = path.join(SITE, ogImg.slice(CANON.length)); ogUsed.add(f); if (!fs.existsSync(f)) err(p, `og:image doesn't exist in site/: ${ogImg}`); else if (fs.statSync(f).size > OG_MAX) err(p, `og:image is ${fs.statSync(f).size} bytes, over the ${OG_MAX}-byte share-card budget: ${ogImg}`); }
  const twImg = attr(html.match(/<meta[^>]*name="twitter:image"[^>]*>/i)?.[0] || '', 'content'); if (!is404 && twImg !== ogImg) err(p, `twitter:image must be the og:image: ${twImg}`);
  // JSON-LD must parse
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) { try { JSON.parse(m[1]); } catch (e) { err(p, `JSON-LD does not parse: ${e.message}`); } }
  if (!is404 && !/application\/ld\+json/.test(html)) warn(p, 'no JSON-LD');
  // links: no root-absolute, relative targets must exist
  for (const m of html.matchAll(/<(a|link|script|img|source|use)\b[^>]*>/gi)) {
    const tag = m[0]; const v = attr(tag, 'href') ?? attr(tag, 'src') ?? attr(tag, 'srcset');
    if (!v) continue;
    for (const raw of v.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)) {
      const frag = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
      if (/^https?:\/\/meetle\.org\//.test(raw)) { // absolute internal (404.html): the target and its #fragment must exist in site/
        if (/^<a/i.test(tag) && !is404) warn(p, `internal link uses absolute URL (breaks the github.io preview): ${raw}`);
        const rel = raw.slice('https://meetle.org/'.length).split(/[?#]/)[0]; const f = path.join(SITE, rel, rel === '' || rel.endsWith('/') ? 'index.html' : '');
        if (/^<a/i.test(tag)) { if (!fs.existsSync(f)) err(p, `link to a page that doesn't exist in site/: ${raw}`); else if (frag && !idsOf(f).has(frag)) err(p, `#${frag} doesn't exist on ${rel || 'the home page'}: ${raw}`); }
        continue;
      }
      if (/^https?:/i.test(raw)) { if (/^<a/i.test(tag) && !outbound.has(raw)) outbound.set(raw, p); continue; }
      if (raw.startsWith('#')) { if (frag && !idsOf(p).has(frag)) err(p, `in-page link to a missing id: ${raw}`); continue; }
      if (/^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
      if (raw.startsWith('/')) { err(p, `root-absolute URL (breaks under /landing-page/): ${raw}`); continue; }
      if (is404) { err(p, `404.html must use absolute https://meetle.org/ links, found relative: ${raw}`); continue; }
      const target = path.join(dir, raw.split('#')[0].split('?')[0]); const t2 = target.endsWith('/') ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(t2) && !fs.existsSync(target)) err(p, `broken relative link: ${raw}`);
      else if (frag && fs.existsSync(t2) && t2.endsWith('.html') && !idsOf(t2).has(frag)) err(p, `#${frag} doesn't exist on the target page: ${raw}`);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) { const t = m[0]; if (attr(t, 'alt') === null) err(p, `img without alt: ${t.slice(0, 80)}`); if (!attr(t, 'width') || !attr(t, 'height')) warn(p, `img without width/height: ${(attr(t, 'src') || '').slice(0, 60)}`); }
  if (/<a[^>]*href="#"[^>]*>/.test(html)) warn(p, 'anchor with href="#"');
  if (!/<a[^>]*class="[^"]*skip[^"]*"/i.test(html)) warn(p, 'no skip link');
  if (Buffer.byteLength(html) > 60 * 1024) err(p, `${Buffer.byteLength(html)} bytes, over the 60 KB page budget`);
  faqMirror(p, html);
  truth(p, html);
}
// Truth rules (meetle-app/design/DEPENDENCIES.md): claims the product can't back. Checked against what a reader gets —
// visible text, alt/aria-label/title/meta content, and JSON-LD string values — never class names or scripts.
// FORBIDDEN are the design boards' own claims, verbatim: they can't appear even as a denial → error.
// SUSPECT patterns are warnings: a denial ("we don't check IDs") is fine, a promise is not — read the context.
// An element carrying data-truth-ok="<reason>" (a quoted source, say) is skipped for the SUSPECT
// warnings only, never for FORBIDDEN; it must not contain a nested element with the same tag name.
// FAQPage questions in JSON-LD are skipped because faqMirror() has already proved they match the visible answers.
function collect(v, out) { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(x => collect(x, out)); else if (v && typeof v === 'object' && v['@type'] !== 'Question') for (const [k, x] of Object.entries(v)) if (!k.startsWith('@')) collect(x, out); }
function lds(html) { return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean); }
function reader(html) { return html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, t => { const a = [...t.matchAll(/\s(?:alt|aria-label|title|content|placeholder)="([^"]*)"/gi)].map(m => m[1]); return a.length ? '. ' + a.join('. ') + '. ' : ' '; })
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|’/g, "'").replace(/\s+/g, ' '); }
function truth(p, html) {
  const ld = []; for (const d of lds(html)) collect(d, ld);
  scan(p, reader(html) + ' ' + ld.join('. '), reader(html.replace(/<(\w+)\b[^>]*\sdata-truth-ok="[^"]+"[^>]*>[\s\S]*?<\/\1>/g, ' ')) + ' ' + ld.join('. '));
}
function scan(p, text, lenient = text) {
  const hits = (re, t = text) => [...new Set([...t.matchAll(new RegExp(`[^.!?]{0,50}(?:${re.source})[^.!?]{0,40}`, re.flags.includes('i') ? 'gi' : 'g'))].map(m => m[0].trim()))];
  const FORBIDDEN = [/women[- ]only matching/i, /everyone is ID[- ]checked/i, /\bkeep her\b/i, /reports? get answered/i, /an ID check happens once/i, /moderators? in the room/i];
  for (const re of FORBIDDEN) for (const h of hits(re)) err(p, `forbidden claim (DEPENDENCIES.md): "${h}"`);
  const SUSPECT = {
    'gendered matching (matching has no gender)': /\b(?:women|woman|she|her|hers)\b/i,
    'ID / age verification (18+ is a stated rule, not a check)': /\bIDs?\b|\b(?:[Vv]erif(?:y|ied|ies|ying|ication)|age (?:check|verification|assurance))\b/,
    'age "confirmed" (18+ is self-declared: say "you tick", "you say", never "confirmed")': /\bconfirm(?:s|ed|ing|ation)?\b[^.]{0,40}\b(?:18|age)\b|\b(?:18|age)\b[^.]{0,40}\bconfirm(?:s|ed|ing|ation)?\b/i,
    'report receipts (none exist)': /\b(?:report (?:number|receipt|reference)|what happened to (?:the|their) account|tell you what we did)\b/i,
    'blocking (does not exist)': /\b(?:block(?:ed|ing|s)?|never (?:be )?matched(?: with you)? again)\b/i,
    'moderation / scanning (not built)': /\b(?:moderat\w*|scan(?:s|ned|ning)?|nud(?:e|es|ity)|AI)\b/i,
    'obsolete denial (voice and video now exist, opt-in)': /\b(?:text[- ]only|text chat only|no (?:camera|video|voice|microphone|webcam)s?|not a video chat|there isn't any)\b/i,
    'request wording (Keep in touch is a blind mutual match)': /\bfriend requests?\b/i,
  };
  for (const [what, re] of Object.entries(SUSPECT)) { const h = hits(re, lenient); if (h.length) warn(p, `${what} — verify context: ${h.slice(0, 6).join(' | ')}${h.length > 6 ? ` | …${h.length - 6} more` : ''}`); }
}
// FAQPage JSON-LD must say exactly what the page says: every question and answer mirrors one visible
// <div class="faq-item"><h3>…</h3><p>…</p></div> (tags stripped, entities decoded, whitespace collapsed), and back.
function plain(s) { return s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function faqMirror(p, html) {
  const items = [...html.matchAll(/<div class="faq-item"[^>]*>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g)];
  const all = (html.match(/class="faq-item"/g) || []).length;
  if (items.length !== all) err(p, `${all - items.length} .faq-item block(s) aren't one <h3> + one <p> — the FAQPage check can't read them`);
  const visible = new Map(items.map(m => [plain(m[1]), plain(m[2])]));
  const qs = []; for (const d of lds(html)) for (const n of [d, ...(d['@graph'] || [])]) if (n['@type'] === 'FAQPage') qs.push(...(n.mainEntity || []));
  if (!qs.length) { if (visible.size) warn(p, `${visible.size} visible FAQ items but no FAQPage JSON-LD`); return; }
  for (const q of qs) { const a = visible.get(q.name); if (a === undefined) err(p, `FAQPage JSON-LD question has no visible .faq-item: "${q.name}"`); else if (a !== q.acceptedAnswer?.text) err(p, `FAQPage JSON-LD answer differs from the visible one: "${q.name}"`); }
  const names = new Set(qs.map(q => q.name)); for (const n of visible.keys()) if (!names.has(n)) err(p, `visible FAQ item missing from FAQPage JSON-LD: "${n}"`);
}
// the truth rules also cover what a share or an install shows: the OG card sources and the web manifest
const MOCKS = path.join(import.meta.dirname, 'mockups');
for (const f of fs.readdirSync(MOCKS).filter(f => /^og-.*\.html$/.test(f))) truth(path.join(MOCKS, f), fs.readFileSync(path.join(MOCKS, f), 'utf8'));
{ const mf = path.join(SITE, 'site.webmanifest'); const strs = []; collect(JSON.parse(fs.readFileSync(mf, 'utf8')), strs); scan(mf, strs.join('. ')); }
// Brand rules (README "Brand rules"), both errors.
// 1. "Talk first, match later." is the tagline and it leads: the home <title> and <h1>, the Organization JSON-LD slogan,
//    the footer lockup on every page, the web manifest description and the home share card (tools/mockups/og-home.html).
//    A title that ends in the brand ("Privacy Policy | Meetle") carries the tagline too: "… | Meetle: talk first, match later".
// 2. Never name another service or compare Meetle with one. NEVER_NAMED is checked everywhere: every file in site/ (visible
//    text, attributes, URLs, JSON-LD, sitemap — any file's content, binaries included — and every file or folder name), every
//    source in tools/ (mockups, snippets, scripts) and README.md. The pattern has a character class so that grepping the
//    repo for the name finds nothing, this file included.
{
  const TAGLINE = /talk first, match later/i, NEVER_NAMED = /o[m]egle/i;
  const ROOT = path.join(import.meta.dirname, '..'), TOOLS = import.meta.dirname, README = path.join(ROOT, 'README.md');
  const text = s => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const home = path.join(SITE, 'index.html'), hh = fs.readFileSync(home, 'utf8');
  const title = (hh.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''; if (!TAGLINE.test(title)) err(home, `brand rule 1: the home <title> must carry "Talk first, match later": "${title}"`);
  const h1 = text((hh.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ''); if (!TAGLINE.test(h1)) err(home, `brand rule 1: the home <h1> must be "Talk first, match later.": "${h1}"`);
  const slogans = []; const findSlogans = v => { if (Array.isArray(v)) v.forEach(findSlogans); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'slogan') slogans.push(String(x)); else findSlogans(x); } };
  lds(hh).forEach(findSlogans);
  for (const p of pages) { const t = (fs.readFileSync(p, 'utf8').match(/<title>([^<]*)<\/title>/i) || [])[1] || ''; if (/\|\s*Meetle\s*$/i.test(t)) err(p, `brand rule 1: a title that ends in the brand ends "| Meetle: talk first, match later": "${t}"`); }
  if (!slogans.length) err(home, 'brand rule 1: no "slogan" in the home JSON-LD'); for (const s of slogans) if (!TAGLINE.test(s)) err(home, `brand rule 1: JSON-LD slogan must be "Talk first, match later.": "${s}"`);
  for (const p of pages) { const tag = fs.readFileSync(p, 'utf8').match(/<p class="site-footer__tag">([\s\S]*?)<\/p>/); if (!tag || !TAGLINE.test(text(tag[1]))) err(p, `brand rule 1: the footer lockup must read "talk first, match later"${tag ? `: "${text(tag[1])}"` : ' (no .site-footer__tag)'}`); }
  const mfDesc = JSON.parse(fs.readFileSync(path.join(SITE, 'site.webmanifest'), 'utf8')).description || ''; if (!TAGLINE.test(mfDesc)) err(path.join(SITE, 'site.webmanifest'), `brand rule 1: the manifest description must carry the tagline: "${mfDesc}"`);
  const ogHome = path.join(MOCKS, 'og-home.html'), ogH1 = text((fs.readFileSync(ogHome, 'utf8').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ''); if (!TAGLINE.test(ogH1)) err(ogHome, `brand rule 1: the home share card must lead with the tagline: "${ogH1}"`);
  const files = [README]; const walkAll = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.DS_Store' || e.name === 'node_modules' || (d === TOOLS && e.name === 'out')) continue; // out/ is generated and git-ignored
    const f = path.join(d, e.name); if (NEVER_NAMED.test(e.name)) err(f, 'brand rule 2: a file or folder name uses a name Meetle never uses');
    if (e.isDirectory()) walkAll(f); else files.push(f);
  } };
  walkAll(SITE); walkAll(TOOLS);
  for (const f of files) {
    const buf = fs.readFileSync(f); const s = /\.(html|css|m?js|json|xml|txt|webmanifest|svg|md|sh)$/i.test(f) ? buf.toString('utf8') : buf.toString('latin1');
    const hits = [...s.matchAll(new RegExp(`[^\\n<>"]{0,40}${NEVER_NAMED.source}[^\\n<>"]{0,40}`, 'gi'))].map(m => m[0].trim());
    if (hits.length) err(f, `brand rule 2: uses a name Meetle never uses (${hits.length}×): "${hits.slice(0, 3).join('" | "')}"${hits.length > 3 ? ' …' : ''}`);
  }
}
// --external: every outbound <a href> must answer 2xx/3xx (HEAD, then GET for servers that refuse HEAD)
if (EXTERNAL) {
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
  const probe = async (u, method) => { const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) }); return r.status; };
  await Promise.all([...outbound].map(async ([u, p]) => {
    let status; try { status = await probe(u, 'HEAD'); if (status >= 400) status = await probe(u, 'GET'); } catch (e) { warn(p, `outbound link unreachable from here (${e.cause?.code || e.name}): ${u}`); return; }
    if (status >= 400) warn(p, `outbound link answers ${status}: ${u}`);
  }));
  console.log(`${outbound.size} outbound links requested`);
}
// share cards nobody references would still ship (and be crawled): every file in assets/og must be some page's og:image
{ const OG = path.join(SITE, 'assets', 'og'); for (const f of fs.readdirSync(OG).filter(f => f !== '.DS_Store')) if (!ogUsed.has(path.join(OG, f))) err(path.join(OG, f), 'share card no page uses as og:image (delete it)'); }
// budgets (README "Accessibility and performance gates")
const sizes = {}; for (const [rel, max] of [['assets/css/site.css', 40 * 1024], ['assets/js/site.js', 8 * 1024]]) { const f = path.join(SITE, rel); sizes[rel] = fs.statSync(f).size; if (sizes[rel] > max) err(f, `${sizes[rel]} bytes, over the ${max}-byte budget`); }
// sitemap + robots
const sm = path.join(SITE, 'sitemap.xml'); if (!fs.existsSync(sm)) err(sm, 'missing sitemap.xml'); else { const x = fs.readFileSync(sm, 'utf8'); for (const loc of [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])) { if (!loc.startsWith(CANON)) err(sm, `loc not on ${CANON}: ${loc}`); const f = path.join(SITE, loc.slice(CANON.length), 'index.html'); if (!fs.existsSync(f)) err(sm, `loc has no page: ${loc}`); } for (const p of pages) { const rel = path.relative(SITE, p); if (rel === '404.html') continue; const url = CANON + rel.replace(/index\.html$/, ''); if (!x.includes(`<loc>${url}</loc>`)) err(sm, `page missing from sitemap: ${url}`); } }
const rb = path.join(SITE, 'robots.txt'); if (!fs.existsSync(rb)) err(rb, 'missing robots.txt'); else if (!/Sitemap: https:\/\/meetle\.org\/sitemap\.xml/.test(fs.readFileSync(rb, 'utf8'))) err(rb, 'robots.txt must reference https://meetle.org/sitemap.xml');
console.log(`\n${pages.length} pages checked — ${errors} errors, ${warns} warnings · site.css ${sizes['assets/css/site.css']} B, site.js ${sizes['assets/js/site.js']} B`);
process.exit(errors ? 1 : 0);
