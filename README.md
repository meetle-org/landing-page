# Meetle marketing site

The public website for **Meetle** — *talk first, match later* — a random 1-on-1 text chat with strangers where friending is a blind mutual match. Lives at **https://meetle.org** (until DNS moves: https://meetle-org.github.io/marketing-site/).

- **Static.** Plain HTML + one CSS file + one small JS file. No framework, no build step for HTML, no third-party requests of any kind (fonts, icons and scripts are all self-hosted).
- **Hosted on GitHub Pages** from this repo (`meetle-org/marketing-site`) via the Actions workflow in `.github/workflows/pages.yml`. The published folder is `site/`.
- **Launch-ready in source.** `site/` is always authored as the live site (indexable, canonicals on `https://meetle.org/…`). A deploy step adds `noindex` while we are still on the github.io staging URL — see [Staging → launch](#staging--launch).

## Folder layout

```
site/                       ← the published root (what GitHub Pages serves)
  index.html                  /               home
  how-it-works/index.html     /how-it-works/
  safety/index.html           /safety/
  faq/index.html              /faq/
  omegle-alternative/index.html
  privacy/index.html          /privacy/       draft, needs legal review
  terms/index.html            /terms/         draft, needs legal review
  404.html                    served at any depth → its links are absolute
  robots.txt · sitemap.xml · site.webmanifest · favicon.* · apple-touch-icon.png · icon-192/512.png
  assets/css/site.css         the whole design system (≈38 KB, budget 40 KB)
  assets/js/site.js           nav toggle + waitlist form + live-app switch (≈5 KB, budget 8 KB)
  assets/fonts/               Nunito (normal + italic) and Inter, latin subset, woff2
  assets/brand/               wordmark / tagline / mark SVGs (outlined Gotham Rounded), 68px icon circles
  assets/img/photos/          responsive film photos (480/960/1440, webp + jpg) + manifest.json
  assets/img/mockups/         m5-phone.png/.webp — PNG fallback of the hero mockup
  assets/og/                  1200×630 Open Graph cards
tools/                      ← node scripts (never shipped). `cd tools && npm install` once (sharp).
  check-site.mjs              static checks: SEO tags, links, images, JSON-LD, sitemap → must print 0 errors
  screenshot-pages.mjs        every page at 390 / 820 / 1440 → tools/out/screens/*.png
  render-mockups.mjs          tools/mockups/*.html → OG cards + mockup PNG/WebP
  build-photos.mjs            source photos → responsive sets + manifest.json (LQIP)
  build-favicons.mjs          brand mark → favicon.svg/.ico/.png, apple-touch-icon, icon-192/512
  deploy-prepare.sh           staging/launch switch, run by CI right before upload
  snippets/                   the shared partials every page is built from (see below)
  mockups/                    standalone wrappers for the OG cards and the m5 fallback PNG
.github/workflows/pages.yml ← deploy on push to main, on demand, and daily at 05:23 UTC
```

## Everyday commands

```bash
node tools/check-site.mjs          # 0 errors required before a commit; 3 warnings are expected (see below)
node tools/screenshot-pages.mjs    # then look at tools/out/screens/<page>-{phone,tablet,desktop}.png
node tools/screenshot-pages.mjs faq --slice   # one page only, plus 1600px-tall slices for easier reading
node tools/render-mockups.mjs      # regenerate site/assets/og/*.png and site/assets/img/mockups/*
node tools/build-photos.mjs tools/source-photos   # regenerate the responsive photos + manifest
```

`check-site` warns on the phrases *video chat / voice chat / friend request* wherever they appear. The three current warnings are the spec's own **denials** ("Not a video chat", "you want video or voice chat. There isn't any.", the eSafety quote and the unrelated "Meetle: Video Chat & Meet" Google Play app) — verify the context is still a denial and move on.

## Editing copy

The copy is implemented **verbatim** from the content spec (`content-spec.md`, v1.0, 2026-09-19 — kept with the project notes, not in this repo). Each page maps to one spec section:

| Page | File | Spec | Notes |
| --- | --- | --- | --- |
| Home | `site/index.html` | §3.1 H0–H9 | H1 is the wordmark + tagline SVGs; JSON-LD WebSite/Organization/WebApplication |
| How it works | `site/how-it-works/index.html` | §3.2 W0–W10 | mockups M1–M8 |
| Safety | `site/safety/index.html` | §3.3 S0–S9 | M9, M10 |
| FAQ | `site/faq/index.html` | §3.4 + §4.1 | 19 Q&As, FAQPage JSON-LD must mirror the visible answers |
| Omegle alternative | `site/omegle-alternative/index.html` | §3.5 + §4.2 | 7 Omegle Q&As, FAQPage JSON-LD |
| Privacy / Terms | `site/privacy/`, `site/terms/` | §3.6 / §3.7 | every H2 has a stable `id` for deep links |
| 404 | `site/404.html` | §3.8 | absolute links only, `noindex`, no description/canonical/OG/JSON-LD |

House rules that the checker cannot fully enforce — please keep them:

- **Product truth first.** Text chat only. Never promise video, voice, calls, ID verification, AI/24-7 moderation, bans, lobbies or games as features. Roadmap items are "on the roadmap", at most once per page, no dates.
- **Never write "friend request"**, "accept", "decline", "pending", "who liked you", "verified", "coming soon" in a friending context. Friending is *Add friend → blind → mutual match*. (The spec contains a few of these words inside denials — "There's nothing to accept", "Not a 'who liked you' list" — flagged for the editor in the review list below.)
- Product buttons are named exactly as the app names them: **Start Chat, Next, Stop, Report, Add friend, Added, Friends, Remove friend, Send, Save, Continue with Google / Discord / GitHub**. "Meetle Magic", "Vibe", "Peace out" live only in prose.
- One `<h1>` per page, headings in order, italic word in a headline is `<em>`, `*word*` in the spec = `<em>word</em>`.
- **Paths are relative** (`./` on the home page, `../` on sub-pages). Only `404.html` uses absolute `https://meetle.org/…` URLs. Canonical, OG and sitemap URLs are absolute with trailing slashes.
- `<head>` must start with the literal string `<head>` (no attributes) — `deploy-prepare.sh` injects after it.
- No `<style>` blocks, no inline event handlers, no external requests.

### Shared partials (`tools/snippets/`)

`head.html`, `nav.html`, `footer.html`, `waitlist-form.html`, `breadcrumb.html`, `mockups.html`, `photo.html`. Every page reproduces nav, footer and the waitlist block **byte-for-byte** apart from the `{{PREFIX}}`, `aria-current="page"` on the current nav link, the nav CTA href (`#waitlist`, or `../#waitlist` on privacy/terms, `https://meetle.org/#waitlist` on 404) and, for a second form on the same page, the `-2` id suffix. If you change a partial, change it in the snippet **and** in all eight pages (a search-and-replace does it), then run the checker.

## Design tokens (`site/assets/css/site.css` §1)

| Token | Value | Use |
| --- | --- | --- |
| `--coral` | `#E8513D` | primary: headlines ≥ 24px, filled buttons, your chat bubbles |
| `--coral-dark` | `#D6462F` | button hover |
| `--coral-deep` | `#CF3F2A` | small filled elements with white text at 14px (`.key`) — 4.5:1 |
| `--salmon` | `#EF8269` | rare accent |
| `--sky` / `--sky-ink` | `#4EC2EF` / `#1B87B8` | secondary (Add friend pill, focus ring) / its AA text colour |
| `--bg` | `#F5EFEC` | page background (warm off-white) |
| `--beige` | `#E8D8D0` | offset photo/device frames, callouts |
| `--neutral` | `#EEEEEE` | their chat bubbles, DM rail |
| `--ink` / `--body` / `--muted` | `#262427` / `#3B3B3B` / `#515151` | headlines / body text / eyebrows, captions |
| `--rule` | `#D8D8D8` | hairlines |
| `--green` / `--red` | `#2E9E5B` / `#C8321C` | Friends pill / Report, errors |
| `--font-head` | Nunito 400–1000 (variable, + italic) | headlines, UI, buttons |
| `--font-body` | Inter 400–700 (variable) | body copy, chat messages |
| `--r-sm` / `--r-md` / `--r-lg` / `--r-pill` | 12 / 24 / 32 / 999px | inputs / cards & photos / frames / buttons |
| `--container` / `--gutter` | 1120px / 20px (32px ≥ 600px) | layout |
| `--space` | `clamp(36px, 4.6vw, 68px)` | half the gap between sections |

Type scale: H1 `clamp(2.5rem, 5.5vw, 4rem)`, H2 `clamp(2rem, 4.2vw, 3.25rem)` Nunito 800, line-height 1.05; body Inter 1.0625rem / 1.6. Breakpoints: 600 (gutter, form label), 700 (`.grid--2`, `.kv`), 720 (`.show-wide`/`.show-narrow`), 880 (desktop nav, `.grid--3`, steps), 900 (`.split`, hero grid, FAQ sidebar). No dark mode (`color-scheme: light`); `prefers-reduced-motion` is respected. Brand type is Gotham Rounded, which we cannot ship: the wordmark and tagline are pre-rendered SVG outlines in `assets/brand/`, everything else is Nunito.

## Images

**Photos** (`site/assets/img/photos/`). Masters are the images inside `Meetle.sketch` (a `.sketch` file is a zip: `unzip Meetle.sketch 'images/*'`), renamed to the names in `manifest.json` and dropped in the git-ignored `tools/source-photos/`. `node tools/build-photos.mjs` writes 480/960/1440-wide WebP + progressive JPEG for each, plus `manifest.json` with the exact rendered sizes and a 24px blurred LQIP data URI. Pages use `<picture>` with the WebP `srcset`, JPEG fallback, `sizes`, `width`/`height` from the manifest's 1440 entry, `loading="lazy"` on everything except the first visual (`fetchpriority="high"` there), `decoding="async"`, and the LQIP as an inline `background-image`. Copy the pattern from `tools/snippets/photo.html`; alt text is in spec §7.2.

Two portraits are **deliberately excluded** and must never be referenced: `portrait-guy-smile` contains a picture-in-picture inset of a second face (it reads as a video call, which Meetle does not have) and `portrait-woman-redhair` has a small inset in its top-right corner (usable only if cropped — founder's call). `portrait-woman-side` is in the manifest but unused (reserve).

**Favicons / app icons**: `node tools/build-favicons.mjs` regenerates every icon from `assets/brand/mark-coral.svg`.

**Mockups and OG cards**: product screens are not images — they are HTML/CSS components (below). `node tools/render-mockups.mjs` screenshots `tools/mockups/og-*.html` (1200×630) to `site/assets/og/` and `tools/mockups/m5-phone.html` (390×844 @2×) to `site/assets/img/mockups/`. Each wrapper declares its size in `<meta name="viewport-size" content="WxH[@scale]">`. FAQ, Privacy and Terms reuse `og-home.png`.

## Mockup library (M1–M11)

Canonical markup lives in `tools/snippets/mockups.html`; pages paste it verbatim and change only the asset prefix (plus layout classes such as `mock--center` on the `<figure>`). Every wrapper is `<figure class="mock …" role="img" aria-label="…">` (labels in spec §7.3) with `aria-hidden="true"` inside. Frames: `.device--phone` (bezel `--ink`, 44px radius, 356:800 screen; 300px on phones, up to 390px on desktop), `.device--browser` (1100×640 window with three dots), `.device--crop` (phone cut off at the bottom). The beige offset frame comes from `.device::before`.

| Id | Screen | Used on |
| --- | --- | --- |
| M1 | Sign in to continue (Google / Discord / GitHub) | how-it-works |
| M2 | Choose a username (`riley_m`, rule text, **Save**) | home, how-it-works |
| M3 | Start screen: 18+ tick + **Start Chat** | how-it-works |
| M4 | Looking for someone… + **Stop** | home, how-it-works, safety (in M9) |
| M5 / M5D | Stranger chat with QuietStorm (`user_a83f91`), phone / desktop | home hero, omegle, how-it-works, OG cards |
| M6 | "You and QuietStorm matched as friends!" | home, how-it-works, omegle |
| M7 | Two phones: **Added** vs untouched **Add friend** — *They're told nothing.* | home, how-it-works |
| M8 / M8P | Direct Messages, desktop rail / phone list | home, how-it-works |
| M9 | Report confirm → Looking for someone… | safety |
| M10 | What strangers see (zoomed partner row + strike-through list) | safety |
| M11 | "QuietStorm disconnected…" + **Next** | 404 |

All UI strings inside mockups are the real client strings (spec §6). "Added" is a marketing rendering until the client is renamed (review item 6).

## Waitlist form

Every marketing page has the block from `tools/snippets/waitlist-form.html` (`<form class="js-waitlist" method="post" data-endpoint="">`). `site.js` handles validation, honeypot, sending, and every message from spec §6. **Until `data-endpoint` is set the form fails honestly** ("The waitlist isn't taking sign-ups right now. Email hello@meetle.org…") — there is no fake success.

The endpoint is configured in exactly one place per form: the `data-endpoint` attribute. There are 7 forms (home ×2, how-it-works, safety, faq, omegle-alternative ×2); set them all at once:

```bash
grep -rl 'data-endpoint=""' site | xargs sed -i '' 's#data-endpoint=""#data-endpoint="https://YOUR-ENDPOINT"#'
```

**Request contract** (fixed by `site.js`, so the endpoint must accept exactly this):

```
POST <data-endpoint>
Content-Type: application/json
Accept: application/json

{"email":"you@example.com","source":"/how-it-works/"}
```

`source` is the page path the sign-up came from. The honeypot field (`name="website"`) is never sent — a filled honeypot shows the success state and posts nothing. Response handling: **2xx** → success box; **409** → "You're already on the list"; **429** → "one sign-up is plenty"; anything else or a network error → "Couldn't reach the waitlist". The endpoint must answer CORS for `https://meetle.org` (and the github.io origin while staging).

### Option A — Formspree-style JSON endpoint

Create a form at formspree.io, then:

```html
<form class="js-waitlist" method="post" data-endpoint="https://formspree.io/f/XXXXXXXX">
```

Formspree accepts the JSON body as-is (the `Accept: application/json` header makes it answer with JSON instead of a redirect) and stores `email` and `source` with each submission; its own spam filtering and rate limiting apply (a 429 maps to our rate-limit message). Any Web3Forms-style service that needs a key **in the body** would need a small change to `site.js`.

### Option B — Supabase REST insert (no server code)

The site already uses Supabase for accounts; a table with an insert-only policy for the anonymous role works with the contract above. Run this in the SQL editor:

```sql
create table public.waitlist (
  id          bigint generated always as identity primary key,
  email       text        not null,
  source      text,
  created_at  timestamptz not null default now(),
  constraint waitlist_email_key unique (email)          -- duplicate → 409 → "You're already on the list."
);

-- store emails trimmed and lower-cased so the unique constraint means what you think
create or replace function public.waitlist_normalise() returns trigger language plpgsql as $$
begin new.email := lower(trim(new.email)); return new; end $$;
create trigger waitlist_normalise before insert on public.waitlist
  for each row execute function public.waitlist_normalise();

alter table public.waitlist enable row level security;

-- the browser may only INSERT, and only something that looks like an email; it can never read the list
create policy "anon can join the waitlist" on public.waitlist
  for insert to anon
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and length(email) <= 254);
revoke select, update, delete on public.waitlist from anon;
```

Then point the forms at the table's REST endpoint, passing the **anon** key (public by design; RLS is what protects the data) as a query parameter, because `site.js` sends no custom headers:

```html
<form class="js-waitlist" method="post"
      data-endpoint="https://YOUR-PROJECT.supabase.co/rest/v1/waitlist?apikey=YOUR-ANON-KEY">
```

PostgREST answers `201` on success, `409` on the unique-constraint violation, `401/403` if the policy rejects the row. Read the list in the dashboard or with the service-role key from a server. Whichever option you pick, **name the provider in the Privacy Policy** ("The waitlist" and "Who we share it with" sections — review item 3).

## Going live: the `LIVE_APP_URL` switch

When the app is public, set the constant at the top of `site/assets/js/site.js`:

```js
const LIVE_APP_URL = 'https://app.meetle.org/';
```

Every `.js-primary-cta` (the nav button on all pages) becomes **Start talking** linking there, and the hero's `.js-waitlist-note` ("We're not open yet…") is hidden. The waitlist forms stay as they are; remove or repoint them when the queue is no longer needed.

## Staging → launch

`tools/deploy-prepare.sh` runs in CI before every upload:

1. It requests `https://meetle.org/`. If that returns **200 with `server: github.com`**, the site is live on Pages → **launch mode**: `site/` is uploaded untouched (indexable, canonicals on meetle.org).
2. Otherwise → **staging mode**: it injects `<meta name="robots" content="noindex">` right after `<head>` on every page and rewrites `404.html`'s absolute links from `https://meetle.org/` to `https://meetle-org.github.io/marketing-site/` (override with `STAGING_BASE`).

The workflow also runs **daily at 05:23 UTC**, so the first run after the DNS cutover flips the site to launch mode by itself; you can also trigger it from Actions → "Deploy site to GitHub Pages" → Run workflow. Delete the `schedule:` block after launch if you like. Never commit `noindex` into `site/` (the checker fails on it) and never run `deploy-prepare.sh` against your working copy — test it on a copy of the repo if you need to.

## DNS cutover (Cloudflare → GitHub Pages)

1. **Repo → Settings → Pages**: source "GitHub Actions" (already), **Custom domain** `meetle.org` → Save. GitHub starts a DNS check.
2. **Org → Settings → Pages → Verified domains**: add `meetle.org` and create the `_github-pages-challenge-meetle-org` TXT record it shows (prevents domain takeover; do this before the A records).
3. **Cloudflare DNS for meetle.org** — delete every Framer record (the A/CNAME on `@` and `www` pointing at Framer), then add, all **DNS only (grey cloud, not proxied)**:

   | Type | Name | Content |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `meetle-org.github.io` |

   Keep the cloud grey: proxying breaks GitHub's certificate issuance and causes redirect loops. Leave Cloudflare's SSL mode on "Full" in case it is ever proxied by mistake.
4. Back in **Settings → Pages**, wait for the DNS check to pass, then tick **Enforce HTTPS** (the certificate can take up to an hour after DNS resolves).
5. Verify:
   ```bash
   dig +short meetle.org A ; dig +short www.meetle.org CNAME
   curl -sI https://meetle.org/ | head -5                          # 200, server: GitHub.com
   curl -sI https://www.meetle.org/ | head -3                      # 301 → https://meetle.org/
   curl -sI https://meetle-org.github.io/marketing-site/ | head -3 # 301 → https://meetle.org/
   curl -sI https://meetle.org/faq | head -3                       # 301 → /faq/
   curl -sI https://meetle.org/nope | head -1                      # 404 (styled page)
   ```
6. Run the workflow (or wait for the 05:23 UTC run) → launch mode. Confirm with `curl -s https://meetle.org/ | grep -c noindex` → `0`.

If DNS cannot move on launch day, the canonicals must temporarily self-reference the github.io URL (review item 10); otherwise leave everything as is.

## Search Console (after the site serves from meetle.org)

1. Add a **Domain property** `meetle.org` (DNS TXT verification in Cloudflare). Optionally add a URL-prefix property for `https://meetle-org.github.io/marketing-site/` so you can watch the staging URL drop out.
2. **Sitemaps** → submit `https://meetle.org/sitemap.xml` (`robots.txt` already names it).
3. **URL inspection** → Request indexing for `https://meetle.org/` and `https://meetle.org/omegle-alternative/`.
4. After a few days check *Pages* (indexing) and *Enhancements → FAQ* for `/faq/` and `/omegle-alternative/`; no rich result is expected for FAQ any more, but the markup must stay valid.
5. **Bing Webmaster Tools**: import the property from Search Console, and put an IndexNow key file (`<key>.txt`) in `site/` if you want instant pings.
6. Later: point the GitHub org README at meetle.org with the tagline; AlternativeTo (Omegle) and Product Hunt listings; register the `meetle` handle wherever it is actually used, bio "talk first, match later · meetle.org".

## Founder review list

Everything marked `[REVIEW]` in the content spec (§0.2, §0.4 and inline) was dropped from the HTML and collected here. Items 1–2 of §0.2 that need **code changes in the client/server** are marked ⚙️.

1. **Pricing — "free".** Said in §0.3, FAQ Q3 ("Is Meetle free?"), the Omegle table's *Price* row, and the home JSON-LD (`isAccessibleForFree: true`, `offers.price: "0"`). Confirm no paid tier is planned before launch.
2. **`hello@meetle.org`** is the single contact address on every page (mailto links, Organization JSON-LD `email`). Confirm the mailbox exists.
3. **Privacy Policy and Terms of Service are drafts** ("Draft — needs legal review before launch" callouts are visible on purpose). Still blank: governing law — Terms §9 literally renders `[jurisdiction]`; legal name and postal address (Privacy "Contact"); the waitlist provider (Privacy "The waitlist" says "the provider we use to hold the list" and "Who we share it with" says "the waitlist provider named above" — name it once chosen); technical-log retention ("a short, fixed period", e.g. 30 days). Also confirm the outbound link to GitHub's general privacy statement.
4. **Roadmap mentions** ("on the roadmap", no dates): `/how-it-works/` "What's next" (W9); `/safety/` "One tap ends it" (S4) **and** "Being honest about the gaps" (S8) — two on one page although the rule says at most one; FAQ Q13. Editor's call.
5. ⚙️ **Report → account claim.** `server/src/chat.ts` `handleReport` logs the ephemeral session ids (`reporterId`, `reportedId`) plus `matchId` and `reason`, not the account id. Add `accountId` (one-line change) before the site says more than "a report has somewhere to stick". Privacy "Reports" currently describes the intended record.
6. ⚙️ **Client string renames** (one line each): the Add friend button state "Request sent" and the status line "Friend … sent to X." must become **Added** (CONTRACT §4 forbids request wording; the site's mockups already show "Added"); the username hint "can't be seen by the strangers you chat with" is wrong — strangers *do* see the username — the site uses "This is what strangers will see."
7. **Omegle "new owner teaser"** — `/omegle-alternative/` FAQ "Is Omegle coming back in 2026?" rests on a single unverified source; also the eSafety moderator figures in "Why Omegle shut down" and the three source links (Wikipedia, eSafety, NPR).
8. **Instagram `@meetle_`** — if it is ours, add it to `sameAs` in the home JSON-LD and update its bio; if not, ignore.
9. **Portrait strip** on the home "No catfish allowed" section shows three faces (`portrait-woman-calm`, `portrait-guy-selfie`, `portrait-woman-laugh`) under the caption "There are no photos on Meetle." Confirm you are comfortable with that; `portrait-woman-redhair` stays excluded unless cropped.
10. **Launch sequence and DNS timing** — publish with `noindex` (automatic) → move DNS → `noindex` drops on the next deploy. If DNS cannot move on launch day, canonicals must temporarily self-reference the github.io URL.
11. **Report reason field** — the protocol accepts an optional reason, the client sends none; M9 shows the plain confirm. If a reason field ships, update M9 and Privacy "Reports".
12. **Organization JSON-LD `foundingDate`** is `"2024"` — confirm the year.
13. **Denials that contain banned words** (kept verbatim from the spec): "There's nothing to accept" (how-it-works W4), 'Not a "who liked you" list' (W8), "There's no accepting or declining" (FAQ Q9), "you accept the new terms" (Terms §10). Confirm denials are exempt from the never-write list.
14. **Wording glance**: Safety S1 "no throwaway accounts" sits near S3 "a throwaway id" — both verbatim, reads fine in context.
15. **Small additions not in the spec**, easy to strip: the FAQ page's "jump to" pill nav (sticky sidebar on desktop); the "Terms of Service →" line under Privacy "Deleting your data"; the "The long version is in the Terms." sentence in Safety S7 (optional in §5).

## Accessibility and performance gates

Skip link, landmarks, one H1, visible focus rings (3px sky), 4.5:1 body contrast (coral only for ≥24px headlines and the deeper `--coral-deep` for small filled keys), `role="img"` + `aria-label` on every mockup, `prefers-reduced-motion` stops the pulsing dots and match-line slide-in. Budgets: HTML ≤ 60 KB per page, CSS ≤ 40 KB, JS ≤ 8 KB, fonts ≈ 130 KB total, no third-party requests. Lighthouse targets after launch: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
