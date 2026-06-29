#!/bin/sh
# Bump the ?v= cache-busting query on every CSS/JS asset ref to a short hash of
# the current asset contents. Idempotent: the HTML only changes when an asset
# changed, and it changes whenever one does (so returning visitors never get a
# stale site.js / site.css after a deploy).
#
# Usage: docs/scripts/bump-asset-version.sh   (run from anywhere in the repo)
# Normally invoked automatically by the .git/hooks/pre-commit hook.
set -e

ROOT=$(git rev-parse --show-toplevel)
DOCS="$ROOT/docs"
cd "$DOCS"

# Assets that carry a ?v= query in the HTML. Missing files are skipped.
ASSETS="assets/site.js assets/site.css assets/tokens.css assets/config.js \
assets/components/typography.css assets/components/button.css assets/components/waitlist-form.css"

HASH=$(for f in $ASSETS; do [ -f "$f" ] && cat "$f"; done | shasum | cut -c1-8)
[ -n "$HASH" ] || { echo "bump-asset-version: could not compute hash" >&2; exit 1; }

# Every page that references local CSS/JS (confirmed/ has none).
PAGES="index.html faq/index.html privacy/index.html case-study/index.html roles/index.html dataviz-options.html"
for p in $PAGES; do
  [ -f "$p" ] && perl -0pi -e "s/(\?v=)[A-Za-z0-9]+/\${1}$HASH/g" "$p"
done

echo "asset version -> $HASH"
