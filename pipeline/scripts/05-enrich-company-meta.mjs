#!/usr/bin/env node
/**
 * 05-enrich-company-meta.mjs — Pull company firmographics, funding, headcount,
 * and tech stack tags via Claude with web_search.
 *
 * Reads:  jds-structured/{company}/* (to enumerate companies that matter)
 *         config/companies.yml      (for canonical name + sector)
 * Writes: data/company-meta/{company}.json
 *
 * Idempotent: skips files that already exist on disk unless --force.
 *
 * Cost: ~$0.05–$0.10 per company (web_search is $10 per 1k searches; we cap at 5).
 *
 * Usage:
 *   node scripts/05-enrich-company-meta.mjs --limit 3
 *   node scripts/05-enrich-company-meta.mjs --company anthropic
 *   node scripts/05-enrich-company-meta.mjs --dry-run
 *   node scripts/05-enrich-company-meta.mjs                # full run (prompts to confirm)
 *   node scripts/05-enrich-company-meta.mjs --force        # re-enrich even if file exists
 *   node scripts/05-enrich-company-meta.mjs --yes          # skip cost-confirmation prompt
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import yaml from 'js-yaml';
import Anthropic from '@anthropic-ai/sdk';

const STRUCTURED_DIR = 'jds-structured';
const COMPANIES_PATH = 'config/companies.yml';
const META_DIR = 'data/company-meta';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;
const CONCURRENCY = 4;
const MAX_RETRIES = 6;
const MAX_WEB_SEARCHES = 5;

// Sonnet 4.6 pricing (USD per million tokens)
const PRICE_INPUT_PER_M = 3.00;
const PRICE_CACHED_READ_PER_M = 0.30;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_OUTPUT_PER_M = 15.00;
const PRICE_PER_WEB_SEARCH = 0.01; // $10 / 1k searches
const ROUGH_COST_PER_COMPANY = 0.08;

function dollarsForUsage(usage, webSearches) {
  const inTok = usage.input_tokens || 0;
  const cachedRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  const tokenCost = (
    inTok * PRICE_INPUT_PER_M +
    cachedRead * PRICE_CACHED_READ_PER_M +
    cacheWrite * PRICE_CACHE_WRITE_PER_M +
    outTok * PRICE_OUTPUT_PER_M
  ) / 1_000_000;
  return tokenCost + (webSearches || 0) * PRICE_PER_WEB_SEARCH;
}

mkdirSync(META_DIR, { recursive: true });

const SYSTEM_PROMPT = `You are a company-research engine. For a single company, you produce ONE JSON object summarizing firmographics, funding, headcount, and tech-stack tags. You follow these rules without exception:

1. **Use web_search.** Issue 2–5 targeted searches per company. Prefer official sources (company website, SEC filings, press releases), then Crunchbase/PitchBook/Wikipedia, then reputable news (Bloomberg, Reuters, TechCrunch, The Information). Avoid blog spam.
2. **No hallucination.** If a value is not found in your searches, set it to null. Do NOT guess funding rounds, headcount, or dates.
3. **Cite sources.** Every non-null factual claim must have a corresponding URL in the top-level \`sources\` array. Aim for 2–6 sources.
4. **Flag low confidence.** If a value is your best estimate from indirect signals (e.g. LinkedIn-employee-count proxy for headcount), include the field name in \`extraction_notes.low_confidence_fields\`.
5. **Currency: USD.** Convert if needed. Round to nearest million for totals; nearest thousand is fine for round amounts.
6. **Output strictly valid JSON.** No markdown fences. No commentary. No leading/trailing prose. Do NOT write preamble like "I'll research..." or "Let me search...". Your first action MUST be a web_search tool call, and your final message MUST be the JSON object alone.

**SCHEMA (output exactly this shape, with null where unknown):**

\`\`\`json
{
  "company": "<slug-from-input>",
  "name": "<canonical company name>",
  "website": "https://...",
  "hq": "<City, State/Country>",
  "founded_year": 2021,
  "one_liner": "<one short sentence on what they do>",
  "category": ["<2-4 short tags, e.g. 'LLM lab', 'developer tools', 'fintech infrastructure'>"],
  "business_model": "B2B SaaS" | "B2C marketplace" | "B2B2C" | "API platform" | "consumer fintech" | "enterprise software" | "other" | null,
  "stage": "seed" | "series-a" | "series-b" | "series-c" | "series-d" | "series-e-plus" | "growth" | "public" | "private-mature" | "subsidiary" | null,
  "headcount": {
    "current": 1200,
    "as_of": "2026-05",
    "growth_12mo_pct": 180,
    "source": "linkedin" | "press" | "company-page" | "estimate" | null
  },
  "funding": {
    "total_raised_usd": 12500000000,
    "last_round": {
      "stage": "Series F",
      "amount_usd": 4000000000,
      "date": "2025-12",
      "lead_investors": ["..."],
      "valuation_post_money_usd": null
    },
    "notable_investors": ["..."]
  },
  "public_listing": { "ticker": null, "exchange": null },
  "tech_stack": ["<inferred technologies/platforms if mentioned in eng blog or job posts>"],
  "key_products": ["<1-4 named products/services>"],
  "sources": ["https://..."],
  "extraction_notes": {
    "low_confidence_fields": [],
    "ambiguities": []
  }
}
\`\`\`

For private companies, \`public_listing\` is { "ticker": null, "exchange": null }. For public companies, \`funding.last_round\` is null (use \`public_listing\` instead).`;

function buildUserPrompt(slug, canonicalName, sector) {
  return `Research the following company and produce the JSON record described in the system prompt.

- Slug (use verbatim as "company"): ${JSON.stringify(slug)}
- Canonical name hint: ${JSON.stringify(canonicalName)}
- Sector hint: ${JSON.stringify(sector)}

Begin by issuing 2–5 web searches. Then output ONE JSON object. No prose, no fences.`;
}

function listExtractedCompanies() {
  if (!existsSync(STRUCTURED_DIR)) return [];
  return readdirSync(STRUCTURED_DIR)
    .filter(d => statSync(join(STRUCTURED_DIR, d)).isDirectory())
    .sort();
}

function loadCompaniesYaml() {
  if (!existsSync(COMPANIES_PATH)) return new Map();
  const cfg = yaml.load(readFileSync(COMPANIES_PATH, 'utf-8'));
  const map = new Map();
  for (const c of cfg?.companies || []) {
    const slug = (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (slug) map.set(slug, { name: c.name, sector: c.sector });
  }
  return map;
}

function metaPathFor(slug) {
  return join(META_DIR, `${slug}.json`);
}

async function confirm(prompt) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(prompt);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function callWithRetry(client, payload, attempt = 1) {
  try {
    return await client.messages.create(payload);
  } catch (err) {
    const status = err.status || err?.error?.status;
    const isRetryable = status === 429 || status === 529 || status === 503;
    if (isRetryable && attempt <= MAX_RETRIES) {
      const waitMs = Math.min(60000, 2000 * Math.pow(2, attempt - 1));
      await new Promise(r => setTimeout(r, waitMs));
      return callWithRetry(client, payload, attempt + 1);
    }
    throw err;
  }
}

async function enrichOne(client, slug, hint) {
  const userPrompt = buildUserPrompt(slug, hint?.name || slug, hint?.sector || null);

  const res = await callWithRetry(client, {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: MAX_WEB_SEARCHES },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Count server-tool uses for cost accounting.
  let webSearches = 0;
  for (const block of res.content || []) {
    if (block.type === 'server_tool_use' && block.name === 'web_search') webSearches++;
  }

  // Final text output is the last text block.
  const textBlocks = (res.content || []).filter(b => b.type === 'text');
  const text = textBlocks.map(b => b.text).join('').trim();
  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();

  let json;
  try {
    json = JSON.parse(cleaned);
  } catch (err) {
    // Fallback: try to extract the last {...} block from the text.
    const lastObj = cleaned.match(/\{[\s\S]*\}\s*$/);
    if (lastObj) {
      try { json = JSON.parse(lastObj[0]); }
      catch { /* fall through */ }
    }
    if (!json) {
      throw new Error(`Invalid JSON from model (stop_reason=${res.stop_reason}, blocks=${res.content?.map(b=>b.type).join(',')}): ${err.message}\n--- snippet ---\n${cleaned.slice(0, 600)}`);
    }
  }

  // Stamp metadata
  json.company = slug;
  json.fetched_at = new Date().toISOString();
  json.model = MODEL;

  return { json, usage: res.usage, webSearches };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const yes = args.includes('--yes');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const companyIdx = args.indexOf('--company');
  const companyFilter = companyIdx !== -1 ? args[companyIdx + 1]?.toLowerCase() : null;

  if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
    console.error('Missing ANTHROPIC_API_KEY in environment. Set it in pipeline/.env or skip with --dry-run.');
    process.exit(1);
  }

  const all = listExtractedCompanies();
  const hints = loadCompaniesYaml();

  const targets = all
    .filter(slug => !companyFilter || slug.includes(companyFilter))
    .filter(slug => force || !existsSync(metaPathFor(slug)))
    .slice(0, limit);

  const skipped = all.length - targets.length;
  console.log(`Companies with extracted JDs: ${all.length}`);
  console.log(`To enrich this run:           ${targets.length}`);
  console.log(`Skipped (exists/filtered):    ${skipped}`);
  console.log(`Estimated cost:               ~$${(targets.length * ROUGH_COST_PER_COMPANY).toFixed(2)} USD (rough)`);

  if (targets.length === 0) return;

  if (dryRun) {
    console.log('\n[dry-run] Showing prompt for first company only:\n');
    const slug = targets[0];
    const hint = hints.get(slug);
    console.log('--- system ---\n' + SYSTEM_PROMPT.slice(0, 600) + '...\n');
    console.log('--- user ---\n' + buildUserPrompt(slug, hint?.name || slug, hint?.sector || null));
    return;
  }

  if (!yes) {
    const ok = await confirm(`\nProceed and bill ~$${(targets.length * ROUGH_COST_PER_COMPANY).toFixed(2)} to your Anthropic account? [y/N] `);
    if (!ok) { console.log('Aborted.'); return; }
  }

  const client = new Anthropic();

  let succeeded = 0;
  let failed = 0;
  let totalInTokens = 0;
  let totalOutTokens = 0;
  let totalCachedRead = 0;
  let totalCacheWrite = 0;
  let totalWebSearches = 0;
  let totalCostUsd = 0;
  const errors = [];

  async function worker(items) {
    while (items.length) {
      const slug = items.shift();
      const hint = hints.get(slug);
      try {
        const { json, usage, webSearches } = await enrichOne(client, slug, hint);
        writeFileSync(metaPathFor(slug), JSON.stringify(json, null, 2));
        succeeded++;
        totalInTokens += usage.input_tokens || 0;
        totalOutTokens += usage.output_tokens || 0;
        totalCachedRead += usage.cache_read_input_tokens || 0;
        totalCacheWrite += usage.cache_creation_input_tokens || 0;
        totalWebSearches += webSearches;
        totalCostUsd += dollarsForUsage(usage, webSearches);
        const lowConf = json?.extraction_notes?.low_confidence_fields?.length || 0;
        const flag = lowConf ? ` ⚠️ ${lowConf} low-confidence fields` : '';
        console.log(`  ✓ [${succeeded + failed}/${targets.length}] ${slug} (${webSearches} searches)${flag}`);
      } catch (err) {
        failed++;
        errors.push({ slug, error: err.message });
        console.log(`  ✗ [${succeeded + failed}/${targets.length}] ${slug}: ${err.message.slice(0, 140)}`);
      }
    }
  }

  const queue = [...targets];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));

  console.log('─'.repeat(60));
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Web searches: ${totalWebSearches}`);
  console.log(`Tokens — input: ${totalInTokens.toLocaleString()} · cached read: ${totalCachedRead.toLocaleString()} · cache write: ${totalCacheWrite.toLocaleString()} · output: ${totalOutTokens.toLocaleString()}`);
  console.log(`Cost (actual): $${totalCostUsd.toFixed(2)} USD`);
  if (errors.length) {
    console.log(`\nErrors:`);
    for (const e of errors.slice(0, 10)) console.log(`  ✗ ${e.slug}: ${e.error.slice(0, 160)}`);
    if (errors.length > 10) console.log(`  ... ${errors.length - 10} more`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
