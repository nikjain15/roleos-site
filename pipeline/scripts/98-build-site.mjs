#!/usr/bin/env node
// Build the public showcase site under /docs (GitHub Pages-ready).
// Aggregate-only: no company names, no role titles, no URLs.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ROOT, '..');
const OUT = join(REPO, 'docs');

mkdirSync(OUT, { recursive: true });

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function countByCompany(dir, ext) {
  if (!existsSync(dir)) return {};
  const out = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out[e.name] = walk(join(dir, e.name), ext).length;
  }
  return out;
}

const rawFiles = walk(join(ROOT, 'jds-raw'), '.md');
const structuredFiles = walk(join(ROOT, 'jds-structured'), '.json');
const viewFiles = walk(join(ROOT, 'jds-views'), '.view.md');

const rawByCo = countByCompany(join(ROOT, 'jds-raw'), '.md');
const structByCo = countByCompany(join(ROOT, 'jds-structured'), '.json');

// Aggregate distributions from structured JSONs (no identifying fields)
const archetypes = {};
const seniority = {};
const locationTypes = {};
const visa = {};
let totalMustHaves = 0;
let withSalary = 0;
const yearsBuckets = { '0-2': 0, '3-5': 0, '6-9': 0, '10+': 0, 'unspecified': 0 };

for (const f of structuredFiles) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    if (j.archetype) archetypes[j.archetype] = (archetypes[j.archetype] || 0) + 1;
    if (j.seniority?.level) seniority[j.seniority.level] = (seniority[j.seniority.level] || 0) + 1;
    if (j.location?.type) locationTypes[j.location.type] = (locationTypes[j.location.type] || 0) + 1;
    if (j.location?.visa_sponsorship) visa[j.location.visa_sponsorship] = (visa[j.location.visa_sponsorship] || 0) + 1;
    if (Array.isArray(j.must_haves)) totalMustHaves += j.must_haves.length;
    if (j.compensation?.base_min || j.compensation?.base_max) withSalary++;
    const y = j.seniority?.years_required_min;
    if (y == null) yearsBuckets.unspecified++;
    else if (y <= 2) yearsBuckets['0-2']++;
    else if (y <= 5) yearsBuckets['3-5']++;
    else if (y <= 9) yearsBuckets['6-9']++;
    else yearsBuckets['10+']++;
  } catch {}
}

// Cost from overnight log
function sumCost() {
  const p = join(ROOT, 'data/overnight.log');
  if (!existsSync(p)) return { total: 0, runs: 0 };
  const re = /Cost \(actual\):\s*\$?([0-9.]+)/gi;
  const txt = readFileSync(p, 'utf8');
  let m, t = 0, n = 0;
  while ((m = re.exec(txt))) { t += Number(m[1]); n++; }
  return { total: t, runs: n };
}

const completeCompanies = Object.keys(rawByCo).filter(c => (structByCo[c] || 0) === rawByCo[c]).length;
const totalCompanies = Object.keys(rawByCo).length;

const data = {
  generatedAt: new Date().toISOString(),
  funnel: [
    { stage: 'Companies scoped', count: totalCompanies, status: 'done' },
    { stage: 'JDs fetched', count: rawFiles.length, status: 'done' },
    { stage: 'JDs structured (LLM-extracted)', count: structuredFiles.length, status: 'in-progress' },
    { stage: 'Roles shortlisted (fit-scored)', count: 0, status: 'next' },
    { stage: 'Applications submitted', count: 0, status: 'next' },
    { stage: 'First-round interviews', count: 0, status: 'next' },
    { stage: 'Final rounds', count: 0, status: 'next' },
    { stage: 'Offers', count: 0, status: 'next' },
  ],
  headline: {
    rawJDs: rawFiles.length,
    structured: structuredFiles.length,
    views: viewFiles.length,
    companies: totalCompanies,
    companiesComplete: completeCompanies,
    mustHavesExtracted: totalMustHaves,
    avgMustHavesPerJD: structuredFiles.length ? (totalMustHaves / structuredFiles.length).toFixed(1) : 0,
    withSalary,
    salaryDisclosureRate: structuredFiles.length ? (withSalary / structuredFiles.length * 100).toFixed(0) + '%' : '0%',
  },
  cost: sumCost(),
  distributions: {
    archetype: archetypes,
    seniority,
    locationType: locationTypes,
    visaSponsorship: visa,
    yearsRequired: yearsBuckets,
  },
  gaps: [
    { name: 'Company metadata (funding, headcount, news)', status: 'not-started', why: 'Need context to rank fit beyond JD text' },
    { name: 'Personal fit scoring', status: 'not-started', why: 'Map must_haves against my CV' },
    { name: 'Application tracking', status: 'not-started', why: 'No system yet for sent/responded/interview state' },
    { name: 'Outreach drafting', status: 'not-started', why: 'Per-role cover-letter and hiring-manager outreach' },
  ],
};

writeFileSync(join(OUT, 'data.json'), JSON.stringify(data, null, 2));
console.log(`Wrote ${join(OUT, 'data.json')}`);

// ── dataset.json: full company list + archetype breakdown for the Index UI ──
// Single source of truth for display names. Slugs without an entry fall back to
// title-case and get logged below so we know to review them.
const PRETTY_OVERRIDES = {
  'sofi': 'SoFi', 'doordash': 'DoorDash', 'stockx': 'StockX',
  'whatnot': 'Whatnot', 'klaviyo': 'Klaviyo', 'scale-ai': 'Scale AI', 'state-street': 'State Street',
  'icapital': 'iCapital', 'sumup': 'SumUp', 'workos': 'WorkOS',
  'hellofresh': 'HelloFresh', 'rothy-s': "Rothy's", 'safari-ai': 'Safari AI',
  'arize-ai': 'Arize AI', 'aleph-alpha': 'Aleph Alpha', 'bland-ai': 'Bland AI',
  'character-ai': 'Character.AI', 'clay-labs': 'Clay', 'deepgram': 'Deepgram',
  'elevenlabs': 'ElevenLabs', 'hume-ai': 'Hume AI', 'langchain': 'LangChain',
  'mistral-ai': 'Mistral AI', 'polyai': 'PolyAI', 'runpod': 'RunPod',
  't-rowe-price': 'T. Rowe Price', 'trade-republic': 'Trade Republic',
  'n8n': 'n8n',
};
function prettyCompanyName(slug) {
  if (PRETTY_OVERRIDES[slug]) return PRETTY_OVERRIDES[slug];
  return slug.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

const totalRoles = structuredFiles.length;
const allCompanies = Object.entries(structByCo)
  .map(([slug, count]) => ({ slug, name: prettyCompanyName(slug), count }))
  .filter(c => c.count > 0)
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

// Warn only on slugs the title-case fallback is likely to get wrong:
// hyphenated slugs (e.g. "scale-ai" → "Scale Ai"), slugs with digits, or
// slugs ending in known acronyms. Single-word slugs like "stripe" are fine.
const looksRisky = (slug) =>
  slug.includes('-') || /\d/.test(slug) || /(ai|os|hq|io|db|ml)$/i.test(slug);
const unmapped = allCompanies
  .filter(c => !(c.slug in PRETTY_OVERRIDES) && looksRisky(c.slug))
  .map(c => `${c.slug} → ${c.name}`);
if (unmapped.length) {
  console.warn(`\n⚠ ${unmapped.length} company slug(s) may need a manual display-name override.`);
  console.warn(`  Add to PRETTY_OVERRIDES in 98-build-site.mjs if the casing below is wrong:`);
  for (const u of unmapped) console.warn(`    ${u}`);
  console.warn('');
}

const archetypeList = Object.entries(archetypes)
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => ({
    name,
    count,
    pct: totalRoles ? +((count / totalRoles) * 100).toFixed(1) : 0,
  }));

const dataset = {
  generatedAt: data.generatedAt,
  totalCompanies: allCompanies.length,
  totalRoles,
  topCompanies: allCompanies.slice(0, 20),
  allCompanies,
  archetypes: archetypeList,
};
writeFileSync(join(OUT, 'dataset.json'), JSON.stringify(dataset, null, 2));
console.log(`Wrote ${join(OUT, 'dataset.json')} (${allCompanies.length} companies)`);
console.log(`Headline: ${data.headline.structured}/${data.headline.rawJDs} structured across ${totalCompanies} companies`);
