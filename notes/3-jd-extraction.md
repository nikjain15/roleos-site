# JD Extraction — Schema and Pipeline

How each job description gets turned from raw text into structured, queryable data.

---

## Pipeline shape

```
[ scan.mjs ]            ── refreshes data/pipeline.md (titles + URLs only, free)
        │
        ▼
[ fetch-jds.mjs ]       ── pulls full JD text for every URL via the same ATS APIs
                            scan.mjs uses (Greenhouse / Ashby / Lever / Workday /
                            BambooHR / Teamtailor). Free — no LLM.
                            Saves clean markdown to jds-raw/{company}-{slug}.md
        │
        ▼
[ extract.mjs ]         ── for each new raw JD, calls Claude API to produce
                            a structured record (schema below).
                            Saves to jds-structured/{company}-{slug}.json
                            ALSO generates a human-readable view at
                            jds-structured/{company}-{slug}.view.md
        │
        ▼
[ enrich-meta.mjs ]     ── runs separately, monthly. Looks up funding /
                            headcount / news per company. Writes to
                            companies-meta.yml.
```

Cost: scan / fetch / enrich are free (no LLM). Only `extract.mjs` costs Claude tokens, ~$0.005 per JD. 500 JDs ≈ $2.50.

---

## Three artifacts per role

| File | Format | Reader | Purpose |
|---|---|---|---|
| `jds-raw/{company}-{slug}.md` | clean markdown | human | original JD, readable |
| `jds-structured/{company}-{slug}.json` | structured JSON | code (chat, gap analysis, filters) | makes the data queryable |
| `jds-structured/{company}-{slug}.view.md` | human markdown | human | per-role digest, easy to scan |

---

## Structured record schema — full field reference

Every field below is what `extract.mjs` produces per JD. All saved as `jds-structured/{company}-{slug}.json`.

### Identity & provenance (deterministic, no LLM needed)

| Field | Type | Source | Notes |
|---|---|---|---|
| `company` | string | from `portals.yml` | canonical company name |
| `role_title` | string | from JD | as posted, no normalization |
| `url` | string | from `pipeline.md` | original posting URL |
| `ats_provider` | enum | from `portals.yml` | greenhouse / ashby / lever / workday / bamboohr / teamtailor |
| `ats_job_id` | string | from URL or API response | so we can re-fetch later |
| `fetched_at` | date | system | when JD was last pulled |
| `posting_first_seen` | date | from `scan-history.tsv` | first time scanner saw this URL |
| `posting_last_updated` | date | from ATS API | when company last edited it |

### Location & work auth

| Field | Type | Notes |
|---|---|---|
| `location.type` | enum | `remote-us` / `remote-global` / `hybrid` / `onsite` / `unclear` |
| `location.cities_listed` | string[] | exact city strings from JD |
| `location.remote_us_eligible` | boolean | true if a US-based candidate can work fully remote |
| `location.office_time_required` | string | e.g. `"25% in office"`, `"3 days/week"`, `null` if not stated |
| `location.work_auth` | enum | `open` / `us-citizenship-required` / `us-person-required` / `no-sponsorship` / `unclear` |
| `location.visa_sponsorship` | enum | `yes` / `yes-conditional` / `no` / `unclear` |

### Role classification

| Field | Type | Notes |
|---|---|---|
| `archetype` | enum | one of: `AI Product Manager` / `Generalist PM` / `Growth PM` / `Technical PM` / `Program Manager` / `Technical Program Manager` / `Chief of Staff` / `BizOps / Strategy & Ops` / `Growth (non-PM)` / `Other` |
| `archetype_confidence` | enum | `high` / `medium` / `low` |
| `secondary_archetype` | enum or null | when role straddles two buckets |

### Seniority

| Field | Type | Notes |
|---|---|---|
| `seniority.level` | string | e.g. `IC4`, `IC5`, `Senior PM`, `Manager`, `Director`, `VP`, `unspecified` |
| `seniority.years_required_min` | int or null | from JD; null if not stated |
| `seniority.years_required_max` | int or null | rarely stated |
| `seniority.manages_people` | boolean | from "you will manage X engineers" or job-family signals |
| `seniority.level_signals` | string[] | the specific phrases in the JD that drove the level inference (audit trail) |

### Requirements (most important — drives gap analysis)

`must_haves` and `nice_to_haves` are NOT plain strings. They are arrays of structured records:

```yaml
must_haves:
  - id: stable_slug                  # e.g. years_as_engineer
    raw_text_from_jd: "verbatim phrase from the JD"
    skill_type: years_of_experience  # see allowed values below
    domain: software_engineering     # short domain tag
    minimum_value: 1                 # nullable
    unit: years                      # nullable; e.g. years, months, count
    qualifier: "professional"        # nullable; modifier on the requirement
    is_combined: false               # true if multi-domain (e.g. "PM + Eng combined")
    accepts_equivalent_experience: true   # only relevant for credentials
    tools_named: []                  # software / platforms named in this requirement (e.g. ["Jira", "Smartsheet"])
    technologies_named: []           # technical concepts named (e.g. ["LLMs", "ASR", "streaming"])
    industries_named: []             # industries / domains named (e.g. ["payments", "fintech"])
    geographies_named: []            # regions / markets named (e.g. ["MENA", "EMEA"])
    employer_types_named: []         # kinds of past employer named (e.g. ["PSP", "top-tier consulting firm"])
    credentials_named: []            # degrees / certs named (e.g. ["Bachelor's", "CS degree"])
    evidence_required: work_history  # see allowed values below
    bridgeable: false                # yes | maybe | no | n/a
    severity: hard                   # hard | soft
```

The six `*_named` arrays exist on every requirement (default `[]`) so downstream queries don't have to handle missing keys. They're populated only when the JD names something specific — most requirements have one or two populated, the rest stay empty. Their purpose is to make the records queryable without reparsing the verbatim quote (e.g. "show me every role wanting Smartsheet", "every hard MENA requirement", "every JD requiring an LLM hands-on").

`skill_type` allowed values:
- `years_of_experience` — quantified time in a domain
- `capability` — a skill you can demonstrate (e.g. "deep technical background")
- `outcome` — past results you've delivered (e.g. "shipped products with commercial success")
- `domain_knowledge` — familiarity with a topic / tool / industry
- `credential` — degree, certification, citizenship
- `tool_proficiency` — specific software / language / platform
- `cultural_fit` — soft signals (rare in `must_haves`, common in `nice_to_haves`)

`evidence_required` allowed values:
- `work_history` — needs to show in the resume's job timeline
- `project_examples` — portfolio / case studies / shipped products
- `shipped_products_with_metrics` — needs quantified outcomes
- `hands_on_use` — current/recent practical use
- `degree_or_work_history` — credential OR equivalent
- `verifiable_credential` — certification, citizenship, etc.

`bridgeable` allowed values:
- `yes` — closeable in < 1 month with focused effort
- `maybe` — depends on what's already on the CV; could be reframed
- `no` — can't be faked or quickly acquired (years of experience, citizenship)
- `n/a` — already a yes/no question with no middle ground

`severity` allowed values:
- `hard` — explicitly stated as required, blocks application
- `soft` — stated as flexible (e.g. "Bachelor's or equivalent experience")

`nice_to_haves` uses the same shape with `severity: soft` always.

`explicitly_excluded` stays as `string[]` — these are rare and don't need structuring.

**Why this structure matters:** the gap analysis (later phase) needs to query across all roles like *"show me hard requirements I don't meet that are not bridgeable"* or *"which `years_of_experience` thresholds appear most across my target roles?"*. Plain strings don't support that.

### Scope — what the job actually involves

| Field | Type | Notes |
|---|---|---|
| `scope.team_size_estimate` | string | e.g. `"3-5 engineers"`, `"unclear"` |
| `scope.surface` | string | the product / area being worked on |
| `scope.business_model` | string | `B2B SaaS`, `usage-based B2B`, `B2C subscription`, `marketplace`, etc. |
| `scope.primary_metrics_inferred` | string[] | metrics implied or stated; mark `_inferred` because rarely explicit |
| `scope.cross_functional_partners` | string[] | Eng, Design, DevRel, Sales, Marketing, Research, etc. |
| `scope.core_responsibilities` | string[] | the bullet list from the "What you'll do" section |

### Compensation

| Field | Type | Notes |
|---|---|---|
| `compensation.base_range_usd` | [int, int] or null | `[min, max]`. **Null if not stated** — do not invent. |
| `compensation.total_comp_estimate_usd` | [int, int] or null | only if JD explicitly states OTE / total comp |
| `compensation.equity_mentioned` | boolean | true if equity / RSUs / options mentioned |
| `compensation.equity_form` | string | `"RSUs"`, `"options"`, `"options + RSU mix"`, `null` |
| `compensation.location_pay_differential` | boolean | true if JD says comp varies by zone |
| `compensation.source` | enum | `stated` / `inferred` / `unknown` |

### Keywords & language signals

| Field | Type | Notes |
|---|---|---|
| `top_keywords` | string[] (5-10) | keywords likely to drive ATS keyword matching |
| `buzzword_density` | enum | `high` / `medium` / `low` — qualitative; high density is a weak red flag |

### Flags — qualitative signals

| Field | Type | Notes |
|---|---|---|
| `green_flags` | string[] | e.g. comp range disclosed, clear ownership, recent posting, sane scope |
| `red_flags` | string[] | e.g. "wears 5 hats", >50% travel, posted >90 days ago, vague scope |

### Audit trail (for tuning the extractor over time)

| Field | Type | Notes |
|---|---|---|
| `extraction_notes.fields_inferred_not_stated` | string[] | which fields are inferences, not direct quotes |
| `extraction_notes.ambiguities` | string[] | conflicts in the JD that the extractor noticed |

---

## Live sample — Anthropic, Product Manager, Claude Code

A real working sample is checked in. Look at all three to see how the format works:

- **Raw JD** (readable): [`samples/anthropic-product-manager-claude-code.md`](../samples/anthropic-product-manager-claude-code.md)
- **Structured JSON** (the canonical shape): [`samples/anthropic-product-manager-claude-code.json`](../samples/anthropic-product-manager-claude-code.json)
- **Human-readable view** (digest): [`samples/anthropic-product-manager-claude-code.view.md`](../samples/anthropic-product-manager-claude-code.view.md)

Notable details from the sample:
- Comp range was stated ($285K–$305K) — populated.
- `seniority.level` inferred from comp + years; flagged in `extraction_notes.fields_inferred_not_stated`.
- A real ambiguity flagged: the JD's metadata field says "On-Site" but body says hybrid 25%. Captured in `extraction_notes.ambiguities` rather than silently picking one.
- `must_haves` uses the structured shape — each requirement tagged with `skill_type`, `bridgeable`, `severity`, etc.

The sample's `must_haves` look like this (excerpt):

```json
{
  "id": "years_as_engineer",
  "raw_text_from_jd": "including at least 1 year as a professional engineer",
  "skill_type": "years_of_experience",
  "domain": "software_engineering",
  "minimum_value": 1,
  "unit": "years",
  "qualifier": "professional",
  "evidence_required": "work_history",
  "bridgeable": "no",
  "severity": "hard"
}
```

That's the shape the extractor should produce for every must-have across every role.

---

## Extraction rules (non-negotiable — zero hallucination policy)

The extractor's job is to digest what the JD says. Nothing more.

- **Never invent values.** Comp ranges, years required, team size, scope, metrics — if the JD doesn't state it, the field stays `null` or `"not stated"`. Never fill in a "reasonable guess."
- **Always include `raw_text_from_jd`** for every must-have and nice-to-have. This is the verbatim phrase from the JD that the structured record was derived from. Audit trail. No paraphrasing in this field.
- **Hard vs nice-to-have classification by JD language.** "Required", "must have", "you have", "X+ years of" → `must_haves`. "Preferred", "bonus", "nice to have", "is a plus" → `nice_to_haves`.
- **Always populate `extraction_notes.fields_inferred_not_stated`.** Any field the extractor inferred (rather than copied from the JD) gets listed here. The user must be able to see at a glance which numbers are facts and which are guesses.
- **Capture ambiguities, don't paper over them.** If the JD contradicts itself (e.g. metadata says On-Site but body says hybrid), both readings go into `extraction_notes.ambiguities`.
- **Use the canonical sample JSON as the reference shape.** New extractions match it exactly.

### What the extractor MUST NOT do

- **No commentary about the user.** No "you might struggle with this requirement", no "this matches your background", no "consider applying because...". The extractor knows nothing about the user. The view file is a pure digest of the JD, not advice.
- **No inferred gap analysis in the view file.** "Where you likely have a gap" sections do not belong in JD views. Gap analysis is a separate later pipeline that compares JDs to the user's CV — and it lives in its own files, not these.
- **No filler / aspirational content.** No "this would be a great fit because...", no encouragement, no padding.
- **No paraphrasing in `raw_text_from_jd`.** That field is verbatim. Other fields may rephrase for structure, but the raw quote must be exact.

### Validation step

After extracting a JD, the extractor should run a quick self-check:
1. Is every must-have backed by a `raw_text_from_jd` quote that actually appears in the source `.md` file?
2. Are all inferred fields listed in `extraction_notes.fields_inferred_not_stated`?
3. Is the view file free of any second-person language ("you", "your")?

If any check fails, flag it rather than ship the extraction.

---

## Calibration before bulk run

Before running `extract.mjs` across all ~500 JDs:

1. Run on **20 JDs** spanning 3-4 different role archetypes (PM, TPM, Chief of Staff, BizOps).
2. The user reviews each one — does the must-have / nice-to-have split feel right? Is anything mis-classified?
3. Adjust the prompt based on feedback.
4. Re-run on the same 20.
5. When the calibration set is clean, run bulk on the rest.

This keeps the cost low (~$0.10 for the calibration round) and avoids 500 bad extractions.
