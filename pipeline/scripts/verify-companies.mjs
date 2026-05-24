#!/usr/bin/env node
/**
 * verify-companies.mjs — Health-check every company API in companies.yml.
 *
 * Hits each company's `api` URL once and reports status. For 404s on
 * Greenhouse / Ashby / Lever, also tries common slug variants and
 * suggests a fix.
 *
 * Usage:
 *   node scripts/verify-companies.mjs              # check all
 *   node scripts/verify-companies.mjs --all        # also retry disabled ones
 *   node scripts/verify-companies.mjs --fix        # rewrite companies.yml with confirmed-broken set to enabled:false
 *
 * Writes:  data/verify-report.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { fetchJson, parallelMap, detectAtsType } from './lib/ats.mjs';

const COMPANIES_PATH = 'config/companies.yml';
const REPORT_PATH = 'data/verify-report.md';
const CONCURRENCY = 10;

function slugVariants(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const dashed = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const cased = name.replace(/\s+/g, '');
  return [...new Set([base, dashed, cased, name.toLowerCase()])];
}

function apiFromSlug(ats, slug) {
  if (ats === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  if (ats === 'ashby') return `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;
  if (ats === 'lever') return `https://api.lever.co/v0/postings/${slug}`;
  return null;
}

async function tryAlternates(company) {
  if (!['greenhouse', 'ashby', 'lever'].includes(company.ats)) return null;
  for (const slug of slugVariants(company.name)) {
    const url = apiFromSlug(company.ats, slug);
    try {
      const json = await fetchJson(url);
      const count = company.ats === 'lever'
        ? (Array.isArray(json) ? json.length : 0)
        : (json.jobs?.length || 0);
      if (count > 0 || json.jobs !== undefined || Array.isArray(json)) {
        return { slug, url, count };
      }
    } catch { /* try next */ }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const includeDisabled = args.includes('--all');

  const companies = yaml.load(readFileSync(COMPANIES_PATH, 'utf-8'))?.companies || [];
  const targets = companies.filter(c =>
    (includeDisabled || c.enabled === true) && c.api && c.api !== 'unknown'
  );

  console.log(`Checking ${targets.length} companies (concurrency ${CONCURRENCY})\n`);

  const results = [];
  await parallelMap(targets, CONCURRENCY, async (company) => {
    const ats = detectAtsType(company.api);
    try {
      const json = await fetchJson(company.api);
      const count = ats === 'lever'
        ? (Array.isArray(json) ? json.length : 0)
        : (json.jobs?.length || 0);
      results.push({ company, status: 'ok', count });
    } catch (err) {
      const alt = err.status === 404 ? await tryAlternates(company) : null;
      results.push({ company, status: 'error', error: err.message, alt });
    }
  });

  // Sort: errors first, then ok
  results.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'error' ? -1 : 1;
    return a.company.name.localeCompare(b.company.name);
  });

  const ok = results.filter(r => r.status === 'ok');
  const broken = results.filter(r => r.status === 'error');
  const fixable = broken.filter(r => r.alt);

  // Console summary
  console.log('─'.repeat(70));
  console.log(`OK:        ${ok.length}`);
  console.log(`Broken:    ${broken.length}  (of which ${fixable.length} have a suggested fix)`);
  console.log(`Disabled (skipped): ${companies.filter(c => c.enabled !== true).length}`);
  console.log('─'.repeat(70));

  if (broken.length) {
    console.log(`\nBroken APIs:\n`);
    for (const r of broken) {
      const c = r.company;
      const line = `  ✗ ${c.name.padEnd(25)} [${c.ats}]  ${r.error}`;
      console.log(line);
      if (r.alt) console.log(`     → try slug "${r.alt.slug}"  (${r.alt.count} jobs)`);
    }
  }

  // Markdown report
  let md = `# Verify report\n\nRun: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\n`;
  md += `- OK: **${ok.length}**\n- Broken: **${broken.length}** (${fixable.length} have a suggested fix)\n\n`;

  if (broken.length) {
    md += `## Broken — needs attention\n\n| Company | ATS | Error | Suggested slug | Jobs |\n|---|---|---|---|---|\n`;
    for (const r of broken) {
      const alt = r.alt ? `\`${r.alt.slug}\`` : '—';
      const altCount = r.alt ? r.alt.count : '';
      md += `| ${r.company.name} | ${r.company.ats} | ${r.error} | ${alt} | ${altCount} |\n`;
    }
    md += '\n';
  }

  md += `## OK\n\n| Company | ATS | Jobs |\n|---|---|---|\n`;
  for (const r of ok) {
    md += `| ${r.company.name} | ${r.company.ats} | ${r.count} |\n`;
  }
  writeFileSync(REPORT_PATH, md);
  console.log(`\n→ Wrote ${REPORT_PATH}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
