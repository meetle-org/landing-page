#!/usr/bin/env bash
# Publishes site/ to GitHub Pages. Pages serves the gh-pages branch of meetle-org/landing-page exactly as it is
# (Settings → Pages: "Deploy from a branch", gh-pages, / (root), custom domain meetle.org). No Actions workflow and
# no build run on GitHub's side, so whatever sits on gh-pages is live, including files site/ no longer has.
#
#   tools/publish-ghpages.sh <gh-pages worktree> [--dry-run] [--commit] [--unmerged]
#
# One-time setup, next to this repo:  git worktree add ../landing-ghpages -b gh-pages-deploy origin/gh-pages
#
# It stops at the first failure:
#   1. Checks: check-site prints 0 errors. site/ has no uncommitted changes and HEAD is on origin/main (--unmerged
#      skips the second part). The target is a worktree whose branch tracks origin/gh-pages, holds CNAME and .nojekyll,
#      and has nothing uncommitted. --dry-run skips the source checks.
#   2. --dry-run: lists what would be added, changed and deleted, then stops without touching anything.
#   3. Mirrors site/ into the target with deletion (rsync --delete), keeping only .git, CNAME and .nojekyll. A page or
#      card removed from site/ is removed from gh-pages. Copying site/ over the old tree would leave the old one live.
#   4. Verifies that the target now equals site/ file for file, then runs deploy-prepare.sh on it (launch mode leaves
#      it untouched; staging mode adds noindex). Then it applies brand rule 2 to every file name and file content there.
#   5. Prints git status (deleted files show as D) and, for every page it removed, the checks to run after the push.
# --commit also commits on the target branch ("Publish <sha>: <subject>"). It never pushes; a person does that.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; SRC="$ROOT/site"
DEST=""; DRY=false; COMMIT=false; UNMERGED=false
for a in "$@"; do case "$a" in
  --dry-run) DRY=true ;; --commit) COMMIT=true ;; --unmerged) UNMERGED=true ;;
  -*) echo "unknown option: $a" >&2; exit 2 ;;
  *) DEST="$a" ;;
esac; done
[ -n "$DEST" ] || { sed -n '6p' "$0" | sed 's/^# *//' >&2; exit 2; }
DEST="$(cd "$DEST" && pwd)"
NEVER_NAMED='o[m]egle' # brand rule 2 (README); written with a character class so a grep for the name finds nothing
fail() { echo "publish: $*" >&2; exit 1; }
list() { (cd "$1" && find . \( -name .git -o -name node_modules \) -prune -o -type f ! -name .DS_Store ! -name CNAME ! -name .nojekyll -print | sed 's#^\./##' | LC_ALL=C sort); }

# 1. checks
node "$ROOT/tools/check-site.mjs" >/dev/null || fail "check-site reports errors; run node tools/check-site.mjs"
[ "$(git -C "$DEST" rev-parse --show-toplevel 2>/dev/null)" = "$DEST" ] || fail "$DEST is not the top of a git worktree"
[ "$DEST" != "$ROOT" ] || fail "the target is this worktree; give the gh-pages worktree"
[ "$(git -C "$DEST" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)" = "origin/gh-pages" ] || fail "$DEST's branch doesn't track origin/gh-pages"
[ -f "$DEST/CNAME" ] && [ -f "$DEST/.nojekyll" ] || fail "$DEST has no CNAME or .nojekyll; is it really the gh-pages branch?"
[ -z "$(git -C "$DEST" status --porcelain)" ] || fail "$DEST has uncommitted changes; commit or discard them first"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"; SUBJECT="$(git -C "$ROOT" log -1 --format=%s)"
if [ "$DRY" = false ]; then
  [ -z "$(git -C "$ROOT" status --porcelain -- site)" ] || fail "site/ has uncommitted changes; publish a commit, not a working copy"
  if [ "$UNMERGED" = false ]; then
    git -C "$ROOT" fetch -q origin main
    git -C "$ROOT" merge-base --is-ancestor HEAD origin/main || fail "HEAD ($SHA) isn't on origin/main; merge first, or pass --unmerged for a hotfix"
  fi
  if [ "$COMMIT" = true ] && printf '%s' "$SUBJECT" | grep -qiE "$NEVER_NAMED"; then fail "the commit subject breaks brand rule 2; publish without --commit and write the message yourself"; fi
fi

# 2. dry run: what the mirror would do
if [ "$DRY" = true ]; then
  S="$(list "$SRC")"; D="$(list "$DEST")"
  echo "Would add:";    comm -23 <(echo "$S") <(echo "$D") | sed 's/^/  + /'
  echo "Would change:"; comm -12 <(echo "$S") <(echo "$D") | while IFS= read -r f; do cmp -s "$SRC/$f" "$DEST/$f" || echo "  ~ $f"; done
  echo "Would delete:"; comm -13 <(echo "$S") <(echo "$D") | sed 's/^/  - /'
  echo "(dry run: nothing changed)"; exit 0
fi

# 3. mirror with deletion
rsync -a --checksum --delete --exclude .git --exclude CNAME --exclude .nojekyll --exclude .DS_Store "$SRC/" "$DEST/"

# 4. verify, stage/launch switch, brand rule 2
diff -rq -x .git -x CNAME -x .nojekyll -x .DS_Store "$SRC" "$DEST" >/dev/null || fail "after the mirror, $DEST still differs from site/ (diff -rq them)"
SITE_DIR="$DEST" "$ROOT/tools/deploy-prepare.sh"
hits="$( (cd "$DEST" && { find . -name .git -prune -o -iname "*$NEVER_NAMED*" -print; grep -rlia -E "$NEVER_NAMED" --exclude=.git --exclude-dir=.git . || true; }) )"
[ -z "$hits" ] || fail "brand rule 2 fails on gh-pages after the mirror: $hits"

# 5. report
echo; git -C "$DEST" status --short
removed="$(git -C "$DEST" status --porcelain | awk '$1 == "D" && $2 ~ /(^|\/)index\.html$/ { sub(/index\.html$/, "", $2); print "https://meetle.org/" $2 }')"
if [ "$COMMIT" = true ]; then
  git -C "$DEST" add -A && git -C "$DEST" commit -q -m "Publish $SHA: $SUBJECT" && echo "Committed on $(git -C "$DEST" rev-parse --abbrev-ref HEAD): Publish $SHA: $SUBJECT"
  echo "Push it: git -C \"$DEST\" push origin HEAD:gh-pages"
else
  echo "Commit and push it: git -C \"$DEST\" add -A && git -C \"$DEST\" commit -m \"Publish $SHA: <what changed, no service names>\" && git -C \"$DEST\" push origin HEAD:gh-pages"
fi
echo "After the push (Pages takes a minute): node tools/check-live.mjs"
if [ -n "$removed" ]; then
  echo "Removed pages. Each must answer 404; then ask Search Console to remove it (Indexing → Removals) and resubmit sitemap.xml:"
  printf '%s\n' "$removed" | while IFS= read -r u; do echo "  curl -sI $u | head -1"; done
fi
