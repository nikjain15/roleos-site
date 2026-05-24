# Nik_Applying for AI roles

Personal job-search system. Built on top of `santifer/career-ops` (kept clean as upstream reference) but everything we build lives here.

---

## Folder structure

```
Nik_Applying for AI roles/
├── README.md                # this file
├── notes/                   # the brief — read these to understand what we're building
│   ├── 1-companies.md       # the 210-company target pool, by sector
│   ├── 2-roles.md           # title filter (positive + negative), location filter
│   └── 3-jd-extraction.md   # JD extraction pipeline, schema, zero-hallucination rules
├── samples/                 # one fully worked sample to anchor the format
│   ├── anthropic-product-manager-claude-code.md          # raw JD (clean markdown)
│   ├── anthropic-product-manager-claude-code.api-response.json   # original API JSON, kept for reference
│   ├── anthropic-product-manager-claude-code.json        # structured extraction (canonical shape)
│   └── anthropic-product-manager-claude-code.view.md     # human-readable digest
└── pipeline/                # the system being built — see notes/
    ├── package.json
    ├── scripts/             # one .mjs per job (no monolithic scripts)
    │   ├── 01-scan-portals.mjs
    │   ├── 02-fetch-jd.mjs
    │   ├── 03-extract-jd.mjs
    │   ├── 04-render-view.mjs
    │   ├── 05-enrich-company-meta.mjs
    │   └── lib/             # shared helpers (ATS adapters, etc.)
    ├── config/
    │   ├── portals.yml      # OUR company + filter config
    │   └── filters.yml
    ├── data/                # outputs that change often
    │   ├── pipeline.md      # current job inbox
    │   ├── companies-meta.yml
    │   └── scan-history.tsv
    ├── jds-raw/             # one .md per role, full JD text
    ├── jds-structured/      # one .json per role, structured schema
    └── jds-views/           # one .view.md per role, human-readable digest
```

## Rules

1. **Never modify `~/Documents/Applying for AI Roles/career-ops/`.** That's the pristine upstream clone. We borrow patterns and config templates from it but we do not edit it.
2. **All builds happen in `pipeline/`.** Independent system, independent `package.json`, independent dependencies.
3. **One job per `.mjs` script.** Numbered (`01-`, `02-`, …) for ordering. No monolithic scripts that do six things.
4. **Zero hallucination in JD extraction.** Every requirement we record must trace back to verbatim text in the JD. Anything inferred gets flagged in `extraction_notes`. No commentary about the user — that's a separate pipeline.
5. **Stay inside `~/Documents/Applying for AI Roles/Nik_Applying for AI roles/`.** Don't write files anywhere else.

## What's here today

- The brief in `notes/` is locked in.
- One fully-worked sample in `samples/` (Anthropic Product Manager, Claude Code).
- `pipeline/` is empty — that's what the next chat builds.

## What the next chat builds

See the prompt at the bottom of this README, or open it in a fresh Claude Code chat with that prompt.

The next chat:
1. Sets up `pipeline/` with `package.json` and dependencies
2. Writes `config/portals.yml` per `notes/1-companies.md` and `notes/2-roles.md`
3. Builds the 5 numbered scripts (scan, fetch-jd, extract-jd, render-view, enrich-meta)
4. Runs them in calibration mode (20 JDs) before any bulk run
5. Stops and asks before any step that costs Claude API credits

## What's NOT in scope yet

- Skill-gap analysis (CV vs JDs)
- Resume tailoring / tailored PDFs
- Application tracker
- Chat UI / Streamlit / Next.js / Supabase / hosting
- Auth / multi-user
- Notifications

These come later. Phase 1 is just companies, roles, and JD extraction.

---

## The prompt to paste into a fresh Claude Code chat

Open a new Claude Code session in this folder:

```bash
cd "~/Documents/Applying for AI Roles/Nik_Applying for AI roles"
claude
```

Then paste:

> I'm building a personal job-search system. The full Phase 1 brief is in
> `notes/`. Read these in order:
>
> 1. `notes/1-companies.md` — the ~210 target companies in 5 sector blocks
> 2. `notes/2-roles.md` — title filter (positive + negative), location filter
> 3. `notes/3-jd-extraction.md` — the JD extraction pipeline, full structured schema, zero-hallucination rules
>
> Then look at the canonical sample so you have the exact shape the extractor must produce:
> - `samples/anthropic-product-manager-claude-code.md` (raw JD)
> - `samples/anthropic-product-manager-claude-code.json` (structured — match this exactly)
> - `samples/anthropic-product-manager-claude-code.view.md` (human-readable digest)
>
> CRITICAL FOLDER RULES:
> - Never modify `~/Documents/Applying for AI Roles/career-ops/`. That's the pristine upstream clone — borrow ideas but never edit.
> - Everything you build lives inside `pipeline/` in this folder. Independent `package.json`, independent dependencies.
> - One `.mjs` script per job. Numbered (`01-`, `02-`, …) so the order is obvious. No monolithic scripts that do many things.
> - Stay inside this folder. Don't write files anywhere else.
>
> EXTRACTION RULE (the one that matters most):
> The JD extractor must be zero-hallucination. Every must-have and nice-to-have must include a verbatim `raw_text_from_jd` quote. Inferred fields go into `extraction_notes.fields_inferred_not_stated`. The view file is a pure digest of the JD — no commentary about the user, no "where you have gaps", no advice. Gap analysis is a separate pipeline for later.
>
> What to build, in order. Stop after each step and show me the result before moving on:
>
> STEP 1 — Set up `pipeline/`
> - Create `pipeline/package.json` with the dependencies needed (playwright optional for now, mainly node-fetch / cheerio / yaml / dotenv / @anthropic-ai/sdk)
> - Create the folder skeleton: `scripts/`, `scripts/lib/`, `config/`, `data/`, `jds-raw/`, `jds-structured/`, `jds-views/`
> - Add a top-level `pipeline/README.md` documenting the script numbering and how to run things
>
> STEP 2 — Write `pipeline/config/portals.yml`
> - Companies from `notes/1-companies.md` sectors 1-4 (e-commerce, asset mgmt, finance, AI/dev tools), plus sector 5 (existing AI pool)
> - For each company: figure out the ATS provider (greenhouse / ashby / lever / workday / bamboohr / teamtailor) and the careers_url. Branded URL preferred, ATS URL as fallback.
> - Per-company metadata fields per `notes/1-companies.md`: sector, stage, last_raise_date, headcount_estimate, recent_news, enabled. Mark unknowns as "unknown".
> - Title filter (positive + negative) per `notes/2-roles.md`. Keep Junior, Intern, Contractor IN.
> - US location filter per `notes/2-roles.md`.
> - Show me the diff before saving.
>
> STEP 3 — Write `pipeline/scripts/01-scan-portals.mjs`
> - Reads `pipeline/config/portals.yml`
> - Hits ATS APIs to discover open roles per company (free, no LLM)
> - Applies the title filter and location filter
> - Writes `pipeline/data/pipeline.md` (the job inbox)
> - Idempotent — uses `pipeline/data/scan-history.tsv` to dedupe across runs
> - Run it. Report counts per sector and per role bucket so I can sanity-check.
>
> STEP 4 — Write `pipeline/scripts/02-fetch-jd.mjs`
> - Reads URLs from `pipeline/data/pipeline.md`
> - Fetches full JD content via the appropriate ATS API per company
> - Decodes the HTML-in-JSON and writes clean readable markdown to `pipeline/jds-raw/{company}-{slug}.md`
> - Skips files already on disk (idempotent)
> - Free — no LLM. Test on 5 URLs first, then run on all.
>
> STEP 5 — Write `pipeline/scripts/03-extract-jd.mjs`
> - Reads `pipeline/jds-raw/*.md`
> - Calls Claude API to produce the structured schema specified in `notes/3-jd-extraction.md`
> - Use `samples/anthropic-product-manager-claude-code.json` as the reference shape — match it exactly
> - Writes `pipeline/jds-structured/{company}-{slug}.json`
> - Skips files already structured (idempotent)
> - Includes the validation step from `notes/3-jd-extraction.md` (verbatim quotes match raw, no second-person language, all inferred fields flagged)
> - CALIBRATION FIRST: extract 20 JDs spanning 3-4 archetypes (PM, TPM, CoS, BizOps), show them to me, let me check classification, then we tune the prompt before going wide.
> - Confirm with me which Claude API key to use and a monthly budget cap before running anything that bills.
>
> STEP 6 — Write `pipeline/scripts/04-render-view.mjs`
> - Reads `pipeline/jds-structured/*.json`
> - Generates `pipeline/jds-views/{company}-{slug}.view.md` per the format in `samples/anthropic-product-manager-claude-code.view.md`
> - Pure rendering, no LLM, no commentary, no inferred gap analysis
>
> STEP 7 — Write `pipeline/scripts/05-enrich-company-meta.mjs`
> - Reads company list from `pipeline/config/portals.yml`
> - Uses WebSearch to fill stage, last_raise_date, headcount_estimate, recent_news per company
> - Writes `pipeline/data/companies-meta.yml`
> - Marks unknowns explicitly — never guess
> - Designed to run monthly via cron (don't set up the cron yet)
>
> STEP 8 — Wire it up
> - Add npm scripts to `pipeline/package.json`: `scan`, `fetch`, `extract`, `render`, `enrich`, plus a `refresh` that chains scan → fetch → extract → render
> - Update `pipeline/README.md` to document each command
> - Don't push to GitHub. We'll fork manually once Phase 1 is solid.
>
> Constraints:
> - Read-only on `~/Documents/Applying for AI Roles/career-ops/`
> - Stop and ask before any step that costs money
> - If a step needs an API key I haven't given you, stop and say so
> - Use the Anthropic sample as the reference shape for every JD extraction
>
> Open items I haven't decided yet (ask me before assuming):
> 1. Healthtech (~13 companies) and B2B SaaS (~5 companies) — in or out for Phase 1? Brief lists candidates.
> 2. Calibrate `03-extract-jd.mjs` on 20 JDs first, or bulk-extract all? (I want calibration first.)
>
> Start with Step 1. Show me the proposed `pipeline/package.json` and folder skeleton before creating anything.
