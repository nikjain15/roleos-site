#!/usr/bin/env node
/**
 * 04-render-view.mjs — Render human-readable digests from structured JSON.
 *
 * Reads:  jds-structured/{company}/{role}.json
 * Writes: jds-views/{company}/{role}.view.md
 *         jds-views/INDEX.md
 *
 * Pure rendering — no LLM, no commentary, no inferred gap analysis.
 *
 * Usage:
 *   node scripts/04-render-view.mjs
 *   node scripts/04-render-view.mjs --force  # overwrite existing views
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { slugify } from './lib/html.mjs';

const STRUCTURED_DIR = 'jds-structured';
const VIEWS_DIR = 'jds-views';
const RAW_DIR = 'jds-raw';

mkdirSync(VIEWS_DIR, { recursive: true });

function listJsonFiles(dir) {
  const out = [];
  for (const company of readdirSync(dir)) {
    const cdir = join(dir, company);
    if (!statSync(cdir).isDirectory()) continue;
    for (const f of readdirSync(cdir)) {
      if (f.endsWith('.json')) out.push({ company, file: f, path: join(cdir, f) });
    }
  }
  return out;
}

function fmt(v) {
  return (v == null || v === '') ? 'not stated' : v;
}

function nonEmpty(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

function compactNamed(req) {
  const lines = [];
  if (nonEmpty(req.tools_named)) lines.push(`Tools: ${req.tools_named.join(', ')}`);
  if (nonEmpty(req.technologies_named)) lines.push(`Technologies: ${req.technologies_named.join(', ')}`);
  if (nonEmpty(req.industries_named)) lines.push(`Industries: ${req.industries_named.join(', ')}`);
  if (nonEmpty(req.geographies_named)) lines.push(`Geographies: ${req.geographies_named.join(', ')}`);
  if (nonEmpty(req.employer_types_named)) lines.push(`Employer types: ${req.employer_types_named.join(', ')}`);
  if (nonEmpty(req.credentials_named)) lines.push(`Credentials: ${req.credentials_named.join(', ')}`);
  return lines.length ? `<sub>${lines.join(' · ')}</sub>` : '';
}

function escapeMd(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderQuickRead(j) {
  const lines = [];
  lines.push(`- **Role type:** ${j.archetype} (${j.archetype_confidence} confidence)${j.secondary_archetype ? ` · secondary: ${j.secondary_archetype}` : ''}`);

  const s = j.seniority || {};
  const yrs = s.years_required_min != null
    ? `${s.years_required_min}+${s.years_required_max ? `–${s.years_required_max}` : ''} years`
    : 'years not stated';
  lines.push(`- **Seniority:** ${fmt(s.level)} · ${yrs} · ${s.manages_people ? 'manages people' : 'individual contributor'}`);

  const c = j.compensation || {};
  let comp = 'not stated';
  if (c.base_range_usd) {
    const [lo, hi] = c.base_range_usd;
    comp = `$${lo.toLocaleString()}–$${hi.toLocaleString()} base`;
  }
  if (c.equity_mentioned) comp += ` · equity ${c.equity_form ? `(${c.equity_form})` : 'mentioned'}`;
  if (c.location_pay_differential) comp += ` · location-based differential`;
  lines.push(`- **Comp:** ${comp}`);

  const loc = j.location || {};
  let locLine = `${fmt(loc.type)}`;
  if (nonEmpty(loc.cities_listed)) locLine += ` · ${loc.cities_listed.join(' / ')}`;
  if (loc.office_time_required) locLine += ` · ${loc.office_time_required}`;
  if (loc.remote_us_eligible) locLine += ' · remote-US eligible';
  lines.push(`- **Location:** ${locLine}`);

  lines.push(`- **Work auth:** ${fmt(loc.work_auth)} · **Visa sponsorship:** ${fmt(loc.visa_sponsorship)}`);

  return lines.join('\n');
}

function renderRequirementsTable(reqs, includeBridgeable) {
  if (!reqs || reqs.length === 0) return '_None._\n';
  const headers = includeBridgeable
    ? '| # | Requirement (id) | Type | Verbatim | Bridgeable |'
    : '| # | Requirement (id) | Type | Verbatim |';
  const sep = includeBridgeable
    ? '|---|---|---|---|---|'
    : '|---|---|---|---|';
  const rows = reqs.map((r, i) => {
    const cells = [
      i + 1,
      `\`${r.id}\``,
      r.skill_type || '',
      escapeMd(r.raw_text_from_jd || ''),
    ];
    if (includeBridgeable) cells.push(r.bridgeable || '');
    return `| ${cells.join(' | ')} |`;
  }).join('\n');

  // Atomized field detail block, only for requirements that have any
  let detail = '';
  for (let i = 0; i < reqs.length; i++) {
    const named = compactNamed(reqs[i]);
    if (named) {
      detail += `\n${i + 1}. \`${reqs[i].id}\` — ${named}`;
    }
  }

  return `${headers}\n${sep}\n${rows}\n${detail ? `\n**Atomized fields:**${detail}\n` : ''}`;
}

function renderScope(s) {
  if (!s) return '';
  const lines = [];
  lines.push(`**Surface:** ${fmt(s.surface)}`);
  lines.push(`**Business model:** ${fmt(s.business_model)}`);
  lines.push(`**Team size:** ${fmt(s.team_size_estimate)}`);
  if (nonEmpty(s.cross_functional_partners)) {
    lines.push(`**Cross-functional partners:** ${s.cross_functional_partners.join(', ')}`);
  }
  if (nonEmpty(s.primary_metrics_inferred)) {
    lines.push(`**Primary metrics (inferred):** ${s.primary_metrics_inferred.join('; ')}`);
  }
  let resp = '';
  if (nonEmpty(s.core_responsibilities)) {
    resp = '\n**Core responsibilities:**\n\n' + s.core_responsibilities.map(r => `- ${r}`).join('\n');
  }
  return lines.join('\n\n') + resp;
}

function renderCompensation(c) {
  if (!c) return '_Not stated._';
  const lines = [];
  if (c.base_range_usd) {
    const [lo, hi] = c.base_range_usd;
    lines.push(`- **Base:** $${lo.toLocaleString()}–$${hi.toLocaleString()} USD`);
  } else {
    lines.push(`- **Base:** not stated`);
  }
  lines.push(`- **Equity:** ${c.equity_mentioned ? c.equity_form || 'mentioned (form unspecified)' : 'not mentioned'}`);
  lines.push(`- **Total comp:** ${c.total_comp_estimate_usd ? `$${c.total_comp_estimate_usd[0].toLocaleString()}–$${c.total_comp_estimate_usd[1].toLocaleString()}` : 'not stated'}`);
  lines.push(`- **Location-based differential:** ${c.location_pay_differential ? 'yes' : 'no'}`);
  lines.push(`- **Source:** ${c.source || 'unknown'}`);
  return lines.join('\n');
}

function renderView(j) {
  const rawLink = `../../${RAW_DIR}/${slugify(j.company)}/${slugify(j.role_title)}.md`;

  const sections = [];

  sections.push(`# ${j.company} — ${j.role_title}\n**Skills view** (rendered from the structured JSON)\n\nSource JD: [raw](${rawLink}) · Posting URL: ${j.url}\nFetched: ${j.fetched_at}${j.posting_last_updated ? ` · Last updated: ${j.posting_last_updated}` : ''}`);

  sections.push(`---\n\n## Quick read\n\n${renderQuickRead(j)}`);

  sections.push(`---\n\n## Must-haves (stated as required by the JD)\n\n${renderRequirementsTable(j.must_haves, true)}`);

  sections.push(`## Nice-to-haves (stated as preferred but not required)\n\n${renderRequirementsTable(j.nice_to_haves, false)}`);

  const exc = j.explicitly_excluded;
  let excSection;
  if (Array.isArray(exc) && exc.length > 0) {
    excSection = '## Explicitly excluded by the JD\n\n' + exc.map(e => `- ${e}`).join('\n');
  } else {
    excSection = '## Explicitly excluded by the JD\n\n_None stated._';
  }
  sections.push(excSection);

  sections.push(`---\n\n## What the role involves\n\n${renderScope(j.scope)}`);

  sections.push(`---\n\n## Compensation\n\n${renderCompensation(j.compensation)}`);

  if (nonEmpty(j.top_keywords)) {
    sections.push(`---\n\n## Top keywords (likely to drive ATS matching)\n\n${j.top_keywords.map(k => `\`${k}\``).join(' · ')}\n\n**Buzzword density:** ${j.buzzword_density || 'unknown'}`);
  }

  let signals = '---\n\n## Signals from the posting\n';
  if (nonEmpty(j.green_flags)) signals += '\n### Green flags\n' + j.green_flags.map(f => `- ${f}`).join('\n');
  if (nonEmpty(j.red_flags)) signals += '\n\n### Red flags\n' + j.red_flags.map(f => `- ${f}`).join('\n');
  sections.push(signals);

  let audit = '---\n\n## Extraction audit\n';
  const en = j.extraction_notes || {};
  if (nonEmpty(en.fields_inferred_not_stated)) {
    audit += '\n**Fields inferred (not stated verbatim in JD):**\n' + en.fields_inferred_not_stated.map(f => `- ${f}`).join('\n');
  }
  if (nonEmpty(en.ambiguities)) {
    audit += '\n\n**Ambiguities flagged:**\n' + en.ambiguities.map(f => `- ${f}`).join('\n');
  }
  audit += '\n\n> Per extraction rules: where the JD doesn\'t state something, the field stays blank or "not stated." This view is a digest of the JD only — no commentary about the candidate, no advice, no inferred gap analysis.';
  sections.push(audit);

  return sections.join('\n\n') + '\n';
}

function main() {
  const force = process.argv.includes('--force');
  const files = listJsonFiles(STRUCTURED_DIR);

  let written = 0;
  let skipped = 0;
  const errors = [];
  const written_records = [];

  for (const { company, file, path } of files) {
    let json;
    try {
      json = JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      errors.push({ path, error: `JSON parse: ${err.message}` });
      continue;
    }
    const outDir = join(VIEWS_DIR, company);
    const outPath = join(outDir, file.replace(/\.json$/, '.view.md'));
    if (!force && existsSync(outPath)) { skipped++; continue; }
    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outPath, renderView(json));
      written++;
      written_records.push({ company: json.company, title: json.role_title, sector: 'unknown', file: outPath });
    } catch (err) {
      errors.push({ path: outPath, error: err.message });
    }
  }

  // Generate index
  const all = files.map(({ path }) => {
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
  }).filter(Boolean);

  const byCompany = new Map();
  for (const j of all) {
    const c = j.company;
    if (!byCompany.has(c)) byCompany.set(c, []);
    byCompany.get(c).push(j);
  }
  const sortedCompanies = [...byCompany.keys()].sort();
  let idx = `# jds-views/ — index\n\nGenerated ${new Date().toISOString().slice(0, 10)} · ${all.length} structured digests across ${sortedCompanies.length} companies.\n\nEach view file is rendered from the canonical \`.json\` and is purely a digest of the JD — no commentary, no advice.\n\n`;
  for (const company of sortedCompanies) {
    const roles = byCompany.get(company).sort((a, b) => a.role_title.localeCompare(b.role_title));
    idx += `## ${company} (${roles.length})\n\n`;
    for (const r of roles) {
      const file = `${slugify(company)}/${slugify(r.role_title)}.view.md`;
      idx += `- [${r.role_title}](${file}) — ${r.archetype}\n`;
    }
    idx += '\n';
  }
  writeFileSync(join(VIEWS_DIR, 'INDEX.md'), idx);

  console.log('─'.repeat(50));
  console.log(`Views written:    ${written}`);
  console.log(`Skipped (exists): ${skipped} (use --force to overwrite)`);
  console.log(`Index:            ${VIEWS_DIR}/INDEX.md`);
  if (errors.length) {
    console.log(`Errors:           ${errors.length}`);
    for (const e of errors) console.log(`  ✗ ${e.path}: ${e.error}`);
  }
}

main();
