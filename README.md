# Meetle marketing site

The public website for **Meetle** — *talk first, match later* — a random one-on-one conversation with a stranger: text first, voice and video only when both people choose them (video starts covered), and keeping in touch is a blind mutual match. Lives at **https://meetle.org**.

- **Static.** Plain HTML + one CSS file + one small JS file. No framework, no build step for HTML, no third-party requests of any kind (fonts, icons and scripts are all self-hosted).
- **Hosted on GitHub Pages** from this repo (`meetle-org/landing-page`, public), which serves the **`gh-pages` branch** as is: Settings → Pages is "Deploy from a branch", `gh-pages`, `/` (root), custom domain `meetle.org`, HTTPS enforced. There is no Actions workflow. `site/` is what gets published, and `tools/publish-ghpages.sh` mirrors it onto `gh-pages` with deletion — see [Publishing](#publishing).
- **Launch-ready in source.** `site/` is always authored as the live site (indexable, canonicals on `https://meetle.org/…`). The publish step would add `noindex` if meetle.org ever stopped serving Pages; it does serve them, so today nothing is added.

## Folder layout

```
site/                       ← the published root (what GitHub Pages serves)
  index.html                  /               home
  how-it-works/index.html     /how-it-works/
  safety/index.html           /safety/
  faq/index.html              /faq/
  privacy/index.html          /privacy/       draft, needs legal review
  terms/index.html            /terms/         draft, needs legal review
  404.html                    served at any depth → its links are absolute
  robots.txt · sitemap.xml · site.webmanifest · favicon.* · apple-touch-icon.png · icon-192/512.png
  assets/css/site.css         the whole design system (≈37 KB, budget 40 KB — the checker enforces it)
  assets/js/site.js           nav toggle + waitlist form + live-app switch (≈5 KB, budget 8 KB)
  assets/fonts/               Nunito (normal + italic, variable), Instrument Serif (normal + italic), DM Mono 400 — latin woff2, all SIL OFL 1.1 (OFL.txt: notices + licence)
  assets/brand/               mark B (mark-coral / mark-black) — the only brand files; the lockup is live text
  assets/og/                  1200×630 Open Graph cards (home, how-it-works, safety)
tools/                      ← node scripts (never shipped). `cd tools && npm install` once (sharp).
  check-site.mjs              static checks: SEO tags, links + #fragment targets, images, JSON-LD, sitemap, truth rules, brand rules → must print 0 errors
  screenshot-pages.mjs        every page at 390 / 820 / 1440 → tools/out/screens/*.png
  render-mockups.mjs          tools/mockups/og-*.html → OG cards
  build-photos.mjs            source photos → responsive sets + manifest.json (LQIP) — unused today, see Images
  build-favicons.mjs          brand mark → favicon.svg/.ico/.png, apple-touch-icon, icon-192/512
  publish-ghpages.sh          site/ → the gh-pages worktree: mirror with deletion, verify, optional local commit (never pushes)
  deploy-prepare.sh           staging/launch switch; publish-ghpages.sh runs it on the gh-pages copy
  check-live.mjs              read-only: what meetle.org serves vs site/ (stale files, unpublished changes, brand rules)
  snippets/                   the shared partials every page is built from (see below)
  mockups/                    standalone wrappers for the three OG cards (+ _og.css)
```

The `gh-pages` branch is `site/` plus `CNAME` (`meetle.org`) and `.nojekyll`, and nothing else. Keep it checked out in a second worktree next to this one (`git worktree add ../landing-ghpages -b gh-pages-deploy origin/gh-pages`); never edit it by hand.

## Everyday commands

```bash
node tools/check-site.mjs          # 0 errors required before a commit; 0 warnings today (see below)
node tools/check-site.mjs --external   # also requests every outbound link (sources, GitHub); failures are warnings
node tools/screenshot-pages.mjs    # then look at tools/out/screens/<page>-{phone,tablet,desktop}.png
node tools/screenshot-pages.mjs faq --slice   # one page only, plus 1600px-tall slices for easier reading
node tools/screenshot-pages.mjs home --night  # the night palette (the site follows prefers-color-scheme); light is forced otherwise
node tools/render-mockups.mjs      # regenerate the share cards in site/assets/og/ (or: node tools/render-mockups.mjs og-safety)
tools/publish-ghpages.sh ../landing-ghpages --dry-run   # what publishing would add, change and delete on gh-pages
node tools/check-live.mjs          # after a publish: does meetle.org serve exactly site/?
```

`check-site` enforces the **brand rules** (below, all errors) and the **truth rules** (`meetle-app/design/DEPENDENCIES.md`) on everything a reader gets — visible text, alt / aria-label / meta content and JSON-LD on every page, plus the OG card sources (`tools/mockups/og-*.html`) and `site.webmanifest`; never class names or scripts:

- **Error** on the design boards' own claims, verbatim: *Women-only matching*, *Everyone is ID checked*, *Keep her*, *Reports get answered*, *An ID check happens once*, *moderators in the room*. They can't ship even as a denial.
- **Warning** (read the context — a denial is fine, a promise is not) on: gendered matching (*she / her / woman*: matching has no gender), ID or age verification (18+ is a stated rule, never "verified"), *confirm(ed)* within a sentence of *18* or *age* (the 18+ box is self-declared: write "you tick", "you say", never "confirmed"), report receipts, blocking / "never matched again" (no Block exists), moderation, scanning or AI (not built), request wording (*friend request*), and **obsolete denials** — *text only, no camera, no video, no voice, not a video chat* — which stopped being true when opt-in voice and video shipped.

Every page produces none today, so any new warning is worth reading. Two escape hatches, both deliberate:

- `data-truth-ok="<reason>"` on an element skips it for the **warnings only** (never the errors) — unused today; it is meant for a quoted source. It must not contain a nested element with the same tag name.
- FAQPage questions in JSON-LD aren't scanned twice: the checker first proves every JSON-LD question and answer equals a visible `<div class="faq-item"><h3>…</h3><p>…</p></div>` (tags stripped, entities decoded) and vice versa, and errors if they drift. Keep each FAQ item to one `<h3>` and one `<p>`.

It also errors when a page is over 60 KB, `site.css` over 40 KB or `site.js` over 8 KB, and prints both sizes on the summary line. Share cards: every `og:image` must exist in `site/` and stay under 300 KB (WhatsApp drops link previews with a bigger image), `twitter:image` must be the same card, and every file in `assets/og/` must be some page's `og:image`, so a retired card can't ship. Links: every relative target must exist, and so must every `#fragment` — in-page, on a relative page (`../faq/#anonymous`) and on the 404's absolute `https://meetle.org/…#…` links. Outbound links are only requested with `--external` (it needs the network; a moved source URL once shipped as a 404 for this reason).

## Brand rules

Two rules from the owner (2026-09-23). They outrank the boards and the content spec, and `check-site` errors on both.

1. **The tagline is "Talk first, match later."** It leads the brand: the home hero `<h1>` ("Talk first," with *match later.* as the board's italic coral second line), the home `<title>` (*Meetle: talk first, match later*) and its meta / OG / Twitter descriptions, the Organization JSON-LD `slogan`, the footer lockup on every page, `site.webmanifest`, and the share cards (`og-home` leads with it; `og-how-it-works` and `og-safety` carry it in the foot). "Match" is the blind mutual Keep in touch, not the pairing — the home steps say one button *pairs* you with someone. The older board lines (*Keep your face to yourself*, *just talk*) may only ever be supporting copy, never a headline or slogan. Titles: the home is *Meetle: talk first, match later*, and a title that ends in the brand ends in the tagline too — *Privacy Policy | Meetle: talk first, match later*, likewise Terms and the 404. How it works, Safety and the FAQ keep their descriptive spec titles (with the suffix they would run past 60 characters); their share cards carry the tagline instead. Inner pages keep their own H1s and meta descriptions. The checker errors if the home `<title>`, the home `<h1>`, the JSON-LD slogan, any page's footer lockup, the manifest description or the `og-home` source stops carrying the tagline (case-insensitive), or if any title ends in a bare `| Meetle`.
2. **Never name another service or compare Meetle with one** — no page, comparison table, FAQ answer, source citation, alt text, URL slug, JSON-LD, sitemap entry, meta keyword, OG card or README pitch. Say what Meetle does as plain statements about Meetle. The repo is public, so this covers git too: branch names, commit messages, tags, PR titles and PR bodies (GitHub's default merge message quotes the branch name). The checker errors on the name it guards, in any case, in the content of every file and in every file or folder name under `site/` and `tools/` (skipping `node_modules/` and the git-ignored `out/`), and in this README; its own pattern is written so that a grep for the name finds nothing. `publish-ghpages.sh` applies the same pattern to everything on `gh-pages` after the mirror, and `check-live.mjs` to what meetle.org serves.

## Editing copy

The copy is implemented **verbatim** from the content spec (`content-spec.md`, v1.0, 2026-09-19 — kept with the project notes, not in this repo). Each page maps to one spec section:

| Page | File | Spec | Notes |
| --- | --- | --- | --- |
| Home | `site/index.html` | **Web-Landing board** (`meetle-app/design/boards/04-web/`); spec §3.1 is retired | hero (the tagline as H1: "Talk first, *match later.*") · three steps · text → voice → video · dark safety band · waitlist band (pre-launch only). Board claims that aren't true were replaced (truth rules below). Drawings are inline SVG lifted from the board sources; JSON-LD WebSite/Organization/WebApplication |
| How it works | `site/how-it-works/index.html` | §3.2, rewritten for the v1 client | kitchen scene · 7 steps (sign in, start, talk + Leave/Report, games, voice and video on the dark band, Keep in touch, both of you) · the people you kept · the tagline, explained ("Talk first, match later") · what Meetle isn't · roadmap · join. Mockups M1–M10 |
| Safety | `site/safety/index.html` | §3.3, rewritten | walking scene · signed in + 18+ · what strangers see (M12) · covered video on the dark band (M7) · Leave and Report (M11, M3R) · nothing saved · six "built in" cards · six things worth remembering · the gaps · join |
| FAQ | `site/faq/index.html` | §3.4 + §4.1, rewritten | bench scene · 21 Q&As (new: "Are there games?", "Who is Meetle for?", "Why does every conversation start in text?"); FAQPage JSON-LD mirrors the visible answers (the checker enforces it) |
| Privacy / Terms | `site/privacy/`, `site/terms/` | §3.6 / §3.7 | every H2 has a stable `id` for deep links. The 2026-09-23 edits for voice/video and Keep in touch are marked `<!-- EDIT 2026-09-23 (legal review): … -->` in the source |
| 404 | `site/404.html` | §3.8, rewritten | "This page headed off" + M13; absolute links only, `noindex`, no description/canonical/OG/JSON-LD |

House rules that the checker cannot fully enforce — please keep them:

- **Product truth first** (`meetle-app/design/DEPENDENCIES.md` — until a thing is built, its copy comes out). True: one person at a time; no profile, photo or real name (username only); nothing in a stranger conversation is saved; Leave is one tap in the same corner, no confirmation, no reason; *Keep in touch* is blind and mutual; question cards and small games (Four in a Row, In Sync, One Word Story, tic-tac-toe) sit beside the chat; a report ends the conversation and looks like a plain leave to the other person; 18+ is a stated rule; free, in the browser, installable. Voice and video are opt-in escalations from text — both people choose them, video starts covered for both and uncovers only when both tap, either can cover again instantly. Never: women-only / gendered matching, ID or age verification, report receipts, Block, moderators in the room, video scanning or AI moderation. Voice: a friend who has done this before; no exclamation marks near leaving, reporting or safety. Roadmap items are "on the roadmap", at most once per page, no dates.
- **Never write "friend request"**, "accept", "decline", "pending", "who liked you", "verified", "coming soon" in a friending context. Keeping in touch is *Keep in touch → blind → mutual match*. (The spec contains a few of these words inside denials — "There's nothing to accept", "Not a 'who liked you' list" — flagged for the editor in the review list below.)
- Product buttons are named exactly as the app names them (`meetle-app/client/src/lib/copy.js`): **Start talking, Keep in touch, Leave, Report, Talk to someone new, Play something, Continue with Google / Discord / GitHub, Continue**. The mockups show the v1 client (see Mockup library).
- One `<h1>` per page, headings in order, italic word in a headline is `<em>`, `*word*` in the spec = `<em>word</em>`.
- **Paths are relative** (`./` on the home page, `../` on sub-pages). Only `404.html` uses absolute `https://meetle.org/…` URLs. Canonical, OG and sitemap URLs are absolute with trailing slashes.
- `<head>` must start with the literal string `<head>` (no attributes) — `deploy-prepare.sh` injects after it.
- No `<style>` blocks, no inline event handlers, no external requests.

### Shared partials (`tools/snippets/`)

`head.html`, `nav.html`, `footer.html`, `waitlist-form.html`, `breadcrumb.html`, `mockups.html`. Every page reproduces nav, footer and the waitlist block **byte-for-byte** apart from the `{{PREFIX}}`, `aria-current="page"` on the current nav link (How it works / Safety — the only two nav links), the nav CTA href (`#waitlist`, or `../#waitlist` on privacy/terms, `https://meetle.org/#waitlist` on 404) and, for a second form on the same page, the `-2` id suffix. If you change a partial, change it in the snippet **and** in all seven pages (a search-and-replace does it), then run the checker.

On the inner pages the closing "join" section wraps the waitlist block in `<div class="js-waitlist-note">` and follows it with a `hidden` `.js-live-note` holding a `.js-primary-cta` — see *Going live*.

The header and footer carry the design system's lockup: mark B (the mark without the mouth, `Logo` board) as inline SVG with `fill="currentColor"` so it follows the night palette, and "meetle**.org**" set live in Nunito 900. The footer adds the tagline *talk first, match later* (sky, Nunito 900, the second half in italic), the page links, *Contact a human* (`mailto:hello@meetle.org`) and "18+".

## Design tokens (`site/assets/css/site.css` §1)

Values are copied from `meetle-app/design/tokens/tokens.css` (v1.0, 2026-09-23), except where the Web-Landing board measures differently (noted below) — the site can't import across repos, so re-copy when the tokens change. Palette tokens are fixed; **semantic** tokens flip at night (`prefers-color-scheme: dark`, the tokens' night set). Product mockups (`.device`) and OG cards (`.og`) redeclare the light semantic set, so pictures of the app stay light on a night page.

| Token | Light → night | Use |
| --- | --- | --- |
| `--bg` / `--raised` / `--surface` | linen `#F5EFEC` / paper `#FBF8F6` / `#FFF` → night 900 / 800 / 800 | page ground / bands, tiles, text fields (paper, as on the Components board) / cards, pills |
| `--ink` / `--body` / `--muted` | `#22201F` / `#3E3936` / `#6B615C` → `#EFE7E3` / `#EFE7E3` / `#A99D98` | headlines / body / captions (ink-500 is the lightest grey allowed for text) |
| `--rule` / `--rule-2` | clay `#E8D8D0` / `#D9C6BC` → night 700 / 600 | hairlines / input borders |
| `--brand` | coral-500 `#E8513D` → `#F2705C` | the mark and wordmark only — never under small text |
| `--accent` | coral-700 `#B0321F` → `#F2705C` | coral as text: links, eyebrows, the italic word in a headline |
| `--coral-600` / `-700` / `-900` | `#D23A26` / `#B0321F` / `#8C2418` | primary button fill (white text 4.8:1) / hover / pressed |
| `--verified` | moss `#2F6B4F` → `#6FC397` | only for things the product actually does (hero proof pills) |
| `--protect` | mulberry `#6D2A46` → `#E08BAB` | Report, form errors — never coral, never red |
| `--focus` / `--halo` | sky-700 `#126A92` / `#DFF2FB` → sky-400 / night 700 | 3px focus ring / input focus halo |
| `--sky` | `#4EC2EF` | the footer tagline (*talk first, match later*), the partner; takes ink text, never white |
| `--n950` … `--n600`, `--n-text`, `--n-muted` | `#151110` … `#4A403C`, `#EFE7E3`, `#A99D98` | the dark safety band (`--ink-900` ground by day, night-950 with night-700 edges at night so it stays the darkest thing on the page; night-900 cards) and the footer (night-950) |
| `--serif` / `--sans` / `--mono` | Instrument Serif / Nunito / DM Mono | display ≥ 24px only / everything you read or tap / eyebrows and numbers, never sentences |
| `--r-input` / `--r-tile` / `--r-card` / `--r-art` / `--r-pill` | 14 / 22 / 24 / 30 / 999px | fields / step tiles, band cards / cards / hero art, photo frames / buttons, pills. `--r-tile` 22 is the Web-Landing board's value; tokens.css `radius-tile` is 20 |
| `--container` / `--gutter` | 1328px / 16 → 32 (≥ 600) → 56px (≥ 1200) | layout (the board's 56px margins at 1440) |
| `--space` | `clamp(40px, 4.5vw, 56px)` | section padding |

Type scale (board values at 1440): H1 Instrument Serif `clamp(2.75rem, 2.25rem + 3.62vw, 5.5rem)` (88px) / 0.95, −0.02em; H2 up to 44px / 1.02 (−0.01em, except the home's steps and band headings, which the board sets at 0); H3 Nunito 800 22px (line-height normal in the home steps and band cards, as on the board); body Nunito 17px / 1.55; eyebrows DM Mono 11px uppercase, 0.16em tracking, `--accent`. Breakpoints: 600 (gutter, form label, band cards 2-up), 720 (desktop nav, `.show-wide`, steps as rows), 1024 (hero and band side by side, steps 3-up, ladder art beside the list — the tokens' desktop; the hero art keeps a 1.15 ratio up to 470px tall, so it is the board's 612×470 at 1440 and never crops the moon on narrower desktops), 1200 (56px gutter); inner-page parts keep 600 (`.grid--3` 2-up, one phone per `.stage` below it) / 700 / 760 (Keep in touch pair side by side, both phones stretched to the same height) / 880 / 900 (`.split` two columns; from 900 to 1329px a `.stage` shows one phone again, because two only fit side by side in a half-width column from 1330). Below 720px, `.section-head--prose` keeps a centred head's eyebrow and heading centred but left-aligns its paragraphs. `prefers-reduced-motion` is respected. The old Gotham Rounded wordmark, tagline and icon SVGs were removed; the lockup is live text everywhere, including the mockups.

## Images

**No photos ship.** The Photography board's hard rule is that no face appears in a Meetle asset unless that person was cast, paid and signed, and "if there is no budget yet, ship on drawings alone". The old film photos (faces, several smiling at the camera, rights unknown) were removed from `site/` in the redesign. When cast photography exists, `node tools/build-photos.mjs <dir>` still writes 480/960/1440 WebP + JPEG sets and a `manifest.json` with LQIPs to `site/assets/img/photos/`; the frame component for them has to be designed again (the old `.photo-frame` CSS is gone).

**Scenes and drawings** are inline SVG. Page heroes use the Photography board's shot-list scenes as `.art` (the home's stoop; how-it-works' kitchen, safety's walk home, the FAQ's bench), each with film grain and a DM Mono slug; `.art__slug--ink` is the slug on a light scene. Line drawings from Mkt-Drawings sit in `.draw` tiles (`.draw--dark` for the "one line" drawing) and recolour at night through `.d-ink / .d-acc / .d-wash / .d-clay`.

**Favicons / app icons**: `node tools/build-favicons.mjs` regenerates every icon from `assets/brand/mark-coral.svg` (mark B, the recommended mark on the `Logo` board — the same path the app ships).

**OG cards**: product screens are not images — they are HTML/CSS components (below). `node tools/render-mockups.mjs` screenshots `tools/mockups/og-*.html` (1200×630, declared in `<meta name="viewport-size" content="WxH[@scale]">`) to `site/assets/og/`: a flat card (`og-safety`) as a 256-colour palette PNG (≈50 KB), a card over a grained scene (`og-home`, `og-how-it-works`, which declare `<meta name="og-format" content="jpeg">`) as a 4:4:4 JPEG at q90 (≈60 KB; as palette PNGs they were 340 and 359 KB, because grain defeats PNG compression). Rendering a card deletes its file in the other format. All three follow the Mkt-Ads set: `og-home` (the stoop share card, led by the tagline "Talk first, *match later.*" in 104px display type, then *No profile, no photo, no real name — just a conversation with one stranger, text first…*), `og-how-it-works` (the same card over the kitchen), `og-safety` (the ink unit: "Nobody sees your face until you say so." beside a covered picture, proof line *Video starts covered · Leave in one tap · 18+*); the last two carry *talk first, match later* in the foot. FAQ, Privacy and Terms reuse `og-home.jpg`, so their `og:image:alt` is the home card's.

## Mockup library (M1–M13)

The v1 client as the `Dev-Anatomy-*` and `Dev-States` boards draw it, in HTML/CSS (`site.css` §13, ≈ 9 KB). Canonical markup lives in `tools/snippets/mockups.html`, generated from the same source as the pages; paste a block verbatim and change only `{{PREFIX}}`. Every wrapper is `<figure class="mock …" role="img" aria-label="…">` with everything inside `aria-hidden`. Sizes are in `em` off `.ui`, which follows the frame width (container units), so one markup works from 240 to 1100px. Frames: `.device--phone` (ink bezel, 390:844 screen), `.device--base` (a phone cut off at the top), `.device--browser` (16:9 window), `.device--zoom` (a bare card). Phones in a column sit in `.stage` (a rounded paper tile; below 600px, and from 900 to 1329px, only its first phone shows). Mockups keep the light palette at night.

| Id | Screen | Used on |
| --- | --- | --- |
| M1 | Sign in to keep the people you meet (Google / Discord / GitHub) | how-it-works |
| M2 | Choose a username (`riley_m`, *Not your real name.*, **Continue**) | how-it-works |
| M3 / M3R | Start: *Talk to someone new.*, *I'm 18 or over*, **Start talking** / the same after a report, with *Reported. Thank you for telling us.* | how-it-works / safety |
| M4 | Finding someone who wants to talk + **Stop looking** | how-it-works |
| M5 | Conversation with maya_reads (header with Report + Leave, *Nothing here is saved.*, **Play something**, **Keep in touch**) | how-it-works |
| M6 / M6D | Four in a Row docked above the chat (phone) / in the panel beside it (desktop browser) | how-it-works |
| M7 | Video, covered for both of you, with **Uncover**; Report and Leave in the top corner, mute and cover at the bottom | how-it-works, safety |
| M8 | Keep in touch is blind: *Keeping in touch* on yours, *Keep in touch* unchanged on theirs — *They're told nothing.* | how-it-works |
| M9 | *You and maya_reads kept each other — you can talk again any time.* + **In touch** | how-it-works |
| M10 | The people you kept (usernames only) | how-it-works |
| M11 | Report sheet: *What happened?*, **Just get me out** first, five one-tap reasons | safety |
| M12 | What strangers see (zoomed header + strike-through list) | safety |
| M13 | *this_page headed off.* + **Talk to someone new** / Back to start | 404 |

UI strings are the client's own (`meetle-app/client/src/lib/copy.js`) except the chat lines, the usernames, the M8 captions, the M12 callouts and **all of M7**: the client has no video screen yet, so M7 follows the `V1-Video` concept board with marketing copy — replace it when the real screen ships. One deliberate difference: the board puts Leave in the bottom controls, M7 keeps Report and Leave in the top corner, because four lines on the site promise Leave is "always in the same corner" (home band, how-it-works step 3, Safety twice). The video build has to keep it there (review item 16), or that copy changes. Never draw Block, an ID check, women-only matching or a report receipt.

## Waitlist form

Every marketing page has the block from `tools/snippets/waitlist-form.html` (`<form class="js-waitlist" method="post" data-endpoint="">`). Every closing join section uses the same pattern: a centred `.section-head--center` (eyebrow, H2, one line in `.js-waitlist-note` and its `.js-live-note` twin), then the form as `.waitlist--center` (label, helper and error centred too), then the `hidden` live CTA. `site.js` handles validation, honeypot, sending, and every message from spec §6. **Until `data-endpoint` is set the form fails honestly** ("The waitlist isn't taking sign-ups right now. Email hello@meetle.org…") — there is no fake success.

The endpoint is configured in exactly one place per form: the `data-endpoint` attribute. There are 4 forms (home, how-it-works, safety, faq); set them all at once:

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

Every `.js-primary-cta` (the nav button on every page, the home hero button and each inner page's live CTA) becomes **Start talking** linking there — the board's button — and every `.js-waitlist-note` is hidden: on the home page that is the whole "Not open yet" waitlist band, so the page ends on the safety band and footer exactly like the board. Until then the same buttons read **Join the waitlist** and jump to `#waitlist`. The inner pages work the same way: each waitlist block sits in a `.js-waitlist-note` and is followed by a `hidden` `.js-live-note` (a line of copy and a **Start talking** `.js-primary-cta`), which `site.js` un-hides; the 404's "Join the waitlist" pill hides too. The switch is JavaScript only, so crawlers and no-JS visitors keep the waitlist version until the HTML changes too. **Launch checklist** (one commit, after the constant is set and tested):

1. FAQ "Is Meetle free?" (*Joining the waitlist is free too*) and "When can I use Meetle?" (*Not quite yet…*): rewrite both, drop their `#join` links, and edit the FAQPage JSON-LD twins in the same edit (the checker fails if they drift). Until then those links point at `#join`, which stays visible in both states.
2. Privacy "The waitlist" and "How long we keep it", Terms §6: rewrite or remove.
3. In the HTML itself: every `.js-primary-cta` → *Start talking* + the app URL; delete the `.js-waitlist-note` blocks (the home's whole "Not open yet" band) and un-hide the `.js-live-note` ones; the 404's waitlist pill goes.
4. Home JSON-LD: `WebApplication.url` → the app URL.
5. Run `node tools/check-site.mjs --external`.

## Publishing

GitHub Pages serves the `gh-pages` branch exactly as it is: nothing on GitHub builds it, and nothing removes a file from it. Copying `site/` over it would add and change files but never delete one, so a page or share card removed from `site/` would stay live and indexable. Always publish with the script, which mirrors with deletion:

```bash
node tools/check-site.mjs                                   # 0 errors
tools/publish-ghpages.sh ../landing-ghpages --dry-run       # read the "Would delete" list
tools/publish-ghpages.sh ../landing-ghpages --commit        # mirror, verify, commit locally ("Publish <sha>: <subject>")
git -C ../landing-ghpages push origin HEAD:gh-pages         # the one step that goes live
node tools/check-live.mjs                                   # a minute later: 0 errors = meetle.org serves exactly site/
```

What the script does, and refuses:

1. **Checks first.** `check-site` must print 0 errors. `site/` must have no uncommitted changes, and HEAD must be on `origin/main` (publish what's merged; `--unmerged` is for a hotfix). The target must be a worktree whose branch tracks `origin/gh-pages`, holding `CNAME` and `.nojekyll`, with nothing uncommitted. `--commit` refuses a commit subject that breaks brand rule 2.
2. **Mirrors with deletion**: `rsync -a --checksum --delete` from `site/`, keeping only `.git`, `CNAME` and `.nojekyll`. Then it proves the target equals `site/` file for file.
3. **Runs `deploy-prepare.sh` on the copy** (never on `site/`). It requests `https://meetle.org/`. **200 with `server: github.com`** means launch mode, and the copy stays untouched: indexable, canonicals on meetle.org. That is the case today. Anything else means staging mode: it injects `<meta name="robots" content="noindex">` right after `<head>` on every page and points `404.html`'s absolute links at `https://meetle-org.github.io/landing-page/` (override with `STAGING_BASE`). Never commit `noindex` into `site/`; the checker fails on it.
4. **Applies brand rule 2** to every file name and file content on the target.
5. **Prints `git status`**. A deleted page or card shows as `D`, so check it. For every page it deleted, it prints a `curl -sI` check. After the push that URL must answer 404. Then remove it in Search Console (Indexing → Removals) and resubmit `sitemap.xml`.

`check-live.mjs` is read-only. It fetches the live sitemap, every page in it, and every same-site file those pages reference, then errors on any file that differs from `site/`, anything live that `site/` doesn't have, and brand-rule breaks. A removed page that nothing links any more is invisible to it, which is why the script prints the 404 checks.

The alternative is to switch Settings → Pages to "GitHub Actions" and add a workflow that uploads `site/` with `actions/upload-pages-artifact`. Each deploy then replaces the whole site, so a removed file disappears on its own. That is the owner's call. It needs `.github/workflows/pages.yml` in this repo and `deploy-prepare.sh` run in the job.

## DNS cutover (Cloudflare → GitHub Pages) — done

meetle.org serves this repo's Pages (checked 2026-09-23: certificate approved for `meetle.org` and `www.meetle.org`, HTTPS enforced). The steps stay here for reference and for the checks in step 5.

1. **Repo → Settings → Pages**: source "Deploy from a branch", `gh-pages`, `/` (root); **Custom domain** `meetle.org` → Save. GitHub starts a DNS check.
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
   curl -sI https://meetle-org.github.io/landing-page/ | head -3   # 301 → https://meetle.org/
   curl -sI https://meetle.org/faq | head -3                       # 301 → /faq/
   curl -sI https://meetle.org/nope | head -1                      # 404 (styled page)
   ```
6. Publish (see [Publishing](#publishing)) → launch mode. Confirm with `curl -s https://meetle.org/ | grep -c noindex` → `0`.

## Search Console (after the site serves from meetle.org)

1. Add a **Domain property** `meetle.org` (DNS TXT verification in Cloudflare).
2. **Sitemaps** → submit `https://meetle.org/sitemap.xml` (`robots.txt` already names it).
3. **URL inspection** → Request indexing for `https://meetle.org/`.
4. **Removals** → for every page a publish deleted (the script prints them), once it answers 404: *Temporarily remove URL*, then resubmit the sitemap. The 404 is what keeps it out for good.
5. After a few days check *Pages* (indexing) and *Enhancements → FAQ* for `/faq/`; no rich result is expected for FAQ any more, but the markup must stay valid.
6. **Bing Webmaster Tools**: import the property from Search Console, and put an IndexNow key file (`<key>.txt`) in `site/` if you want instant pings.
7. Later: point the GitHub org README at meetle.org with the tagline; a Product Hunt listing (lead with the tagline, and no comparisons — brand rule 2); register the `meetle` handle wherever it is actually used, bio "talk first, match later · meetle.org".

## Founder review list

Everything marked `[REVIEW]` in the content spec (§0.2, §0.4 and inline) was dropped from the HTML and collected here. Items 1–2 of §0.2 that need **code changes in the client/server** are marked ⚙️.

1. **Pricing — "free".** Said in §0.3, FAQ Q3 ("Is Meetle free?") and the home JSON-LD (`isAccessibleForFree: true`, `offers.price: "0"`). Confirm no paid tier is planned before launch.
2. **`hello@meetle.org` — launch blocker.** It is the single contact address on every page (mailto links, Organization JSON-LD `email`), the Safety page promises "a person reads it", Privacy routes deletion, waitlist removal and under-18 reports through it, the Terms route appeals through it, and the waitlist's own fallback message tells people to email it. On 2026-09-23 **meetle.org had no MX record** (`dig MX meetle.org` → nothing from 1.1.1.1 and 8.8.8.8; the A records are GitHub Pages, which takes no mail), so mail to it bounces. Before publishing: turn on mail for meetle.org (e.g. Cloudflare Email Routing, which adds the MX and SPF records) forwarding to a monitored inbox, send a test message, and name who reads it.
3. **Privacy Policy and Terms of Service are drafts** ("Draft — needs legal review before launch" callouts are visible on purpose). Still blank: governing law — Terms §9 literally renders `[jurisdiction]`; legal name and postal address (Privacy "Contact"); the waitlist provider (Privacy "The waitlist" says "the provider we use to hold the list" and "Who we share it with" says "the waitlist provider named above" — name it once chosen); technical-log retention ("a short, fixed period", e.g. 30 days). Also confirm the outbound link to GitHub's general privacy statement.
4. **Roadmap mentions** ("on the roadmap", no dates, one per page): `/how-it-works/` "What's next" (bans for repeatedly reported accounts, then interest rooms); `/safety/` "Being honest about the gaps" (bans); FAQ "What happens when I report someone?" (bans). Games left the roadmap (they shipped); automatic moderation was removed from it (truth rules: nothing about scanning or AI until it exists).
5. ⚙️ **Report → account claim** (also needed for the under-18 promise, item 19). `server/src/chat.ts` `handleReport` logs the ephemeral session ids (`reporterId`, `reportedId`) plus `matchId` and `reason`, not the account id. Add `accountId` (one-line change) before the site says reports stick to an account. The site no longer says so: it says there's "a real account behind every username" (true: sign-in is required) and that a report "is recorded" (true: the server logs it). Privacy "Reports" still describes the intended record.
6. ~~Client string renames~~ — resolved: the v1 client says **Keep in touch / Keeping in touch / In touch** and "It's what the people you talk to see.", and the mockups now show exactly that.
7. Resolved (brand rule 2).
8. **Instagram `@meetle_`** — if it is ours, add it to `sameAs` in the home JSON-LD and update its bio; if not, ignore.
9. ~~Portrait strip~~ — resolved: no photos ship any more (see Images).
10. **Launch sequence and DNS timing** — overtaken by events. DNS has moved (2026-09-23: `curl -sI https://meetle.org/` answers 200 with `server: GitHub.com`), so `deploy-prepare.sh` runs in launch mode and whatever is on `gh-pages` is live and indexable at once. The redesign is already live: `gh-pages` holds main at 6934fe1. Items 2, 16 and 19 are therefore open against the live site, not gates on the next publish. A publish that only makes the live site more accurate, or removes something from it, shouldn't wait for them.
11. **Report reasons** — the v1 client sends the HANDOFF §3.8 slugs and M11 shows the sheet. Privacy "Reports" says "the reason if you gave one", which still holds.
12. **Organization JSON-LD `foundingDate`** is `"2024"` — confirm the year.
13. **Denials that contain banned words**: "There's nothing to accept" (how-it-works, Keep in touch), 'Not a "who liked you" list' (What Meetle isn't), "There's no accepting or declining" (FAQ "How do I keep in touch…"), "you accept the new terms" (Terms §10). Confirm denials are exempt from the never-write list.
14. ~~Wording glance~~ — resolved: Safety now says "There's no guest mode" (true) instead of "no throwaway accounts" (you can make throwaway Google accounts), and the throwaway session id is gone (the v1 client doesn't show one).
15. **Small additions not in the spec**, easy to strip: the FAQ page's "jump to" pill nav (sticky sidebar on desktop); the "Terms of Service →" line under Privacy "Deleting your data"; the "The long version is in the Terms." sentence in Safety "Your part".
16. **Voice and video are described as shipped** on every page (they're being built; publish only once they are, and only once every condition below is verified in the build — `meetle-app/design/VIDEO-SAFETY.md` recommends all of them). If only one ships, edit: home pill + ladder + band card; how-it-works steps 5 and "What Meetle isn't"; Safety "Nobody sees you first", "Your part" item 3 and the Leave-and-report aside; FAQ "What is Meetle?", "Is Meetle anonymous?", "Does Meetle save my chats?", "Is Meetle safe?", "Does Meetle have video or voice chat?", "Who is Meetle for?", "Why does every conversation start in text?", the Google Play answer; Privacy and Terms EDIT blocks; OG cards og-home, og-how-it-works, og-safety. Details stated as fact that the build must match: both people choose voice and video; video starts covered **for both**; it uncovers only when **both** tap; **either** can cover again instantly; nothing is recorded. M7 is a concept drawing. Conditions the copy depends on, each of which must be verified before publishing:
    - **(a) Relay-only calls.** Stranger calls use `iceTransportPolicy: 'relay'` through our own TURN server, so neither device learns the other's IP address. Plain peer-to-peer WebRTC hands each side the other's public IP (an approximate location) — which would make Safety's M12 ("location" struck through), "No trail back" and Privacy "What strangers can see" untrue. If calls won't be relay-only: take "location" out of M12 and its aria-label, qualify "No trail back", and add to Privacy "On a call, the other person's device can see your IP address."
    - **(b) The cover is applied on the sender's device, before encoding** (DEPENDENCIES #10), not only as a blur on the viewer's screen — otherwise "Nobody sees you first", "All either of you sees is a blur" and og-safety's "Nobody sees your face until you say so." fail against a modified client.
    - **(c) No microphone or camera before a choice, no media before both.** The app never calls `getUserMedia` on page load or before the person chooses voice or video, and sends nothing until both have chosen (Privacy: "asks … only when you choose voice or video, never before, and sends nothing until you and the other person have both chosen it"; home: "Until then, nobody hears a thing").
    - **(d) One tap covers it for both.** Either person's cover tap covers the video on both screens at once, and uncovering needs both taps again.
    - **(e) Leave stays in the same top corner during video** (the V1-Video board puts it in the bottom controls; see M7). If it can't, change the four "same corner" lines.
    - **(f) Calls leave logs.** Signalling and TURN logs record who called, when, for how long and from which IP. Privacy "Technical logs" covers that; the site no longer claims "nothing about them is kept", only that voice and video aren't recorded.
    - VIDEO-SAFETY.md's own launch gates (Block, the reports/bans tables, an age-assurance or geo decision) would change site copy too: the site says there is no Block and that 18+ is a stated rule. Revisit both when those ship.
17. **Privacy: who carries voice and video.** If calls go through a relay (TURN) or any third-party media service, name it in Privacy "Who we share it with". The draft doesn't, because none is chosen.
18. **Terms §3 has one new rule** (no pressuring anyone into voice or video; no recording or sharing someone's voice, video or face without their say-so). It's an addition, not a correction — legal's call.
19. **"Accounts found to belong to someone under 18 will be removed"** (Safety, FAQ, Terms §1, Privacy "Under 18") is a promise of manual action; there's no ban mechanism yet. Kept from the spec because a person can delete an account by hand — confirm someone owns that. Reports can be tied to an account only through the separate `[auth] <conn> -> account <uuid>` log line, and only while logs are kept (item 5). Terms §3 also says "anything sexual involving minors — ever. We'll report it": that needs a named owner and a CSAM reporting process (NCMEC registration in the US) **before launch**, more so with stranger video; DEPENDENCIES also recommends a footer-linked child-safety (CSAE) policy page, which doesn't exist yet. The copy is kept because reporting is a legal duty, not a nice-to-have.
20. **Sign-in data: confirm against a real row.** Privacy "Your account" and the FAQ "Do I need an account…?" now say the provider also passes along what it shares by default (usually a name and a profile-picture link) and that Meetle never shows or uses it: `signInWithOAuth` uses default scopes and nothing in meetle-app reads or strips `raw_user_meta_data`. Check one row of `auth.users.raw_user_meta_data` in the Supabase dashboard. If it's stripped later (a trigger or minimal scopes), put the old wording back in both places (and the FAQ's JSON-LD twin).
21. **App string, not site copy:** M10 shows the app's `kept.body` ("You both said yes at the end of a conversation"), but Keep in touch works any time during a conversation, as the site says. The fix belongs in `copy.js`; M10 follows it.

## Accessibility and performance gates

Skip link, landmarks, one H1, visible focus rings (3px `--focus`: sky-700 by day, sky-400 at night and on the dark band), 4.5:1 body contrast (coral-500 only for the mark and wordmark, coral-700 for coral text, coral-600 under white button text), `role="img"` + `aria-label` on every mockup, `prefers-reduced-motion` is respected (the mockups don't animate). Budgets: HTML ≤ 60 KB per page, CSS ≤ 40 KB, JS ≤ 8 KB, fonts ≈ 140 KB total (Nunito ×2 81 KB, Instrument Serif ×2 43 KB, DM Mono 15 KB; Nunito + both serif faces are preloaded), no third-party requests. Lighthouse targets after launch: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
