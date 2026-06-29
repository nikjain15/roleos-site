# docs/scripts

## bump-asset-version.sh — automatic cache-busting

GitHub Pages serves our CSS/JS with no cache headers, so returning visitors used
to get a stale `site.js` / `site.css` after a deploy. To fix that, every local
`<link>`/`<script>` tag carries a `?v=<hash>` query, where `<hash>` is a short
hash of the asset contents. When an asset changes, the hash changes, the URL
changes, and browsers refetch. When nothing changed, the hash is identical and
the HTML doesn't churn.

`bump-asset-version.sh` recomputes that hash and rewrites the `?v=` on all six
pages (`index`, `faq`, `privacy`, `case-study`, `roles`, `dataviz-options` —
`confirmed/` has no local assets). The Google Fonts link is intentionally left
alone. The script is **idempotent**: safe to run anytime.

### How it runs automatically

A `pre-commit` git hook runs the script and re-stages the HTML, so the version
is bumped as part of every commit. No manual step.

### Reinstalling the hook (after a fresh clone)

Git hooks live in `.git/hooks/` and aren't tracked, so re-create it once per
clone:

```sh
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
ROOT=$(git rev-parse --show-toplevel)
SCRIPT="$ROOT/docs/scripts/bump-asset-version.sh"
[ -f "$SCRIPT" ] || exit 0
sh "$SCRIPT" >/dev/null 2>&1 || exit 0
cd "$ROOT/docs" || exit 0
git add index.html faq/index.html privacy/index.html case-study/index.html roles/index.html dataviz-options.html 2>/dev/null
exit 0
EOF
chmod +x .git/hooks/pre-commit
```

### Manual run (without committing)

```sh
sh docs/scripts/bump-asset-version.sh
```
