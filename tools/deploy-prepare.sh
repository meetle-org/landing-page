#!/usr/bin/env bash
# Runs in CI (see .github/workflows/pages.yml) right before the site is uploaded.
#
# The source in site/ is always launch-ready (indexable, canonicals on https://meetle.org/).
# Until meetle.org actually serves this site from GitHub Pages, we are "staging" at
# https://meetle-org.github.io/landing-page/ and must not get that URL indexed:
#   - add <meta name="robots" content="noindex"> to every page
#   - point 404.html's absolute links at the staging URL (404.html is served at any depth, so it can't use relative links)
# The workflow also runs on a daily schedule, so the first deploy after the DNS cutover flips
# the site to launch mode automatically. Nothing to remember.
set -euo pipefail
SITE="$(cd "$(dirname "$0")/../site" && pwd)"
STAGING_BASE="${STAGING_BASE:-https://meetle-org.github.io/landing-page/}"

# GNU sed (CI) vs BSD sed (macOS) in-place flag
if sed --version >/dev/null 2>&1; then SEDI=(sed -i); else SEDI=(sed -i ''); fi

live=false
if hdr="$(curl -sSI -m 15 https://meetle.org/ 2>/dev/null)"; then
  code="$(printf '%s\n' "$hdr" | head -1 | awk '{print $2}')"
  if [ "$code" = "200" ] && printf '%s\n' "$hdr" | grep -qi '^server: *github\.com'; then live=true; fi
fi

if [ "$live" = true ]; then
  echo "meetle.org is live on GitHub Pages -> publishing in LAUNCH mode (indexable)."
  exit 0
fi

echo "meetle.org is not serving this site yet -> publishing in STAGING mode (noindex; 404 links -> $STAGING_BASE)."
n=0
while IFS= read -r -d '' f; do
  if ! grep -q 'name="robots" content="noindex"' "$f"; then
    "${SEDI[@]}" 's#<head>#<head><meta name="robots" content="noindex">#' "$f"; n=$((n+1))
  fi
done < <(find "$SITE" -name '*.html' -print0)
"${SEDI[@]}" "s#https://meetle.org/#${STAGING_BASE}#g" "$SITE/404.html"
echo "noindex added to $n pages."
