# pipeline/

The job-search pipeline. Independent of `~/Documents/Applying for AI Roles/career-ops/` — that folder is read-only reference; nothing here imports from it.

## Layout

```
config/
  companies.yml           # target company list (edit to add/drop companies)
  filters.yml             # title filter (positive/negative) + location filter
scripts/
  01-scan-portals.mjs     # hit ATS APIs, filter roles, write data/pipeline.md
  02-fetch-jd.mjs         # fetch full JD text -> jds-raw/
  03-extract-jd.mjs       # Claude API: structured schema -> jds-structured/  [costs $$]
  04-render-view.mjs      # render human-readable digest -> jds-views/
  05-enrich-company-meta.mjs  # WebSearch: stage, raise, headcount, news
  lib/                    # shared helpers (ATS adapters etc.)
data/
  pipeline.md             # current job inbox (output of scan)
  companies-meta.yml      # enriched company info (output of enrich)
  scan-history.tsv        # dedupe history across runs
jds-raw/                  # one .md per role (raw JD)
jds-structured/           # one .json per role (structured)
jds-views/                # one .view.md per role (digest)
```

## Setup

```bash
cd pipeline
npm install
```

Create `.env` (gitignored) for the Claude API key — only needed for `extract`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
npm run scan       # free
npm run fetch      # free
npm run extract    # COSTS $$ — calibrate first
npm run render     # free
npm run enrich     # free (uses WebSearch)
npm run refresh    # scan + fetch + extract + render
```

## Rules

1. One job per `.mjs`. Numbered for ordering.
2. Zero hallucination in extraction — every requirement traces to a verbatim JD quote. See `../notes/3-jd-extraction.md`.
3. Never edit `../../career-ops/`. Borrow patterns, don't modify.
