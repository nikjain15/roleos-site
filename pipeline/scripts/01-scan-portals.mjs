#!/usr/bin/env node
/**
 * 01-scan-portals.mjs — Scan ATS APIs for open roles.
 *
 * Reads:  config/companies.yml, config/filters.yml
 * Writes: data/pipeline.md, data/scan-history.tsv
 *
 * Usage:
 *   node scripts/01-scan-portals.mjs
 *   node scripts/01-scan-portals.mjs --dry-run
 *   node scripts/01-scan-portals.mjs --company anthropic
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { fetchJobs, parallelMap } from './lib/ats.mjs';
import { buildTitleFilter, buildLocationFilter } from './lib/filters.mjs';

const COMPANIES_PATH = 'config/companies.yml';
const FILTERS_PATH = 'config/filters.yml';
const PIPELINE_PATH = 'data/pipeline.md';
const HISTORY_PATH = 'data/scan-history.tsv';
const CONCURRENCY = 10;

function loadSeenUrls() {
  const seen = new Set();
  if (existsSync(HISTORY_PATH)) {
    const lines = readFileSync(HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }
  return seen;
}

function appendHistory(offers, date) {
  if (offers.length === 0) return;
  if (!existsSync(HISTORY_PATH)) {
    writeFileSync(HISTORY_PATH, 'url\tfirst_seen\tats\tcompany\tsector\ttitle\tlocation\tunclear\n');
  }
  const lines = offers.map(o =>
    [o.url, date, o.ats, o.company, o.sector, o.title, o.location, o.unclear ? '1' : '0'].join('\t')
  ).join('\n') + '\n';
  appendFileSync(HISTORY_PATH, lines);
}

function writePipeline(allOffers, date) {
  const bySector = new Map();
  for (const o of allOffers) {
    if (!bySector.has(o.sector)) bySector.set(o.sector, []);
    bySector.get(o.sector).push(o);
  }
  const sectors = [...bySector.keys()].sort();

  let out = `# Job pipeline\n\nLast scan: ${date} — ${allOffers.length} open roles across ${sectors.length} sectors.\n`;
  for (const sector of sectors) {
    const offers = bySector.get(sector).sort((a, b) =>
      a.company.localeCompare(b.company) || a.title.localeCompare(b.title)
    );
    out += `\n## ${sector} (${offers.length})\n\n`;
    for (const o of offers) {
      const flag = o.unclear ? ' ⚠️' : '';
      out += `- [ ] **${o.company}** — ${o.title} (${o.location || 'N/A'})${flag} — ${o.url}\n`;
    }
  }
  writeFileSync(PIPELINE_PATH, out);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyIdx = args.indexOf('--company');
  const companyFilter = companyIdx !== -1 ? args[companyIdx + 1]?.toLowerCase() : null;

  if (!existsSync(COMPANIES_PATH) || !existsSync(FILTERS_PATH)) {
    console.error(`Missing config: ${COMPANIES_PATH} or ${FILTERS_PATH}`);
    process.exit(1);
  }
  const companies = yaml.load(readFileSync(COMPANIES_PATH, 'utf-8'))?.companies || [];
  const filtersCfg = yaml.load(readFileSync(FILTERS_PATH, 'utf-8'));
  const titleOk = buildTitleFilter(filtersCfg.title_filter);
  const locationOk = buildLocationFilter(filtersCfg.location_filter);

  const targets = companies
    .filter(c => c.enabled === true)
    .filter(c => !companyFilter || c.name.toLowerCase().includes(companyFilter));

  console.log(`Scanning ${targets.length} companies (concurrency ${CONCURRENCY})${dryRun ? ' [dry run]' : ''}\n`);

  const seen = loadSeenUrls();
  const date = new Date().toISOString().slice(0, 10);

  let totalJobs = 0;
  let titleFiltered = 0;
  let locationFiltered = 0;
  let dupes = 0;
  const newOffers = [];
  const errors = [];

  await parallelMap(targets, CONCURRENCY, async (company) => {
    const { jobs, error } = await fetchJobs(company);
    if (error) {
      errors.push({ company: company.name, ats: company.ats, error });
      return;
    }
    totalJobs += jobs.length;
    for (const job of jobs) {
      if (!titleOk(job.title)) { titleFiltered++; continue; }
      const loc = locationOk(job.location);
      if (!loc.keep) { locationFiltered++; continue; }
      if (seen.has(job.url)) { dupes++; continue; }
      seen.add(job.url);
      newOffers.push({
        ...job,
        ats: company.ats,
        sector: company.sector,
        unclear: loc.unclear,
      });
    }
  });

  // Sort and de-dupe per-company-role inside this run
  const byKey = new Map();
  for (const o of newOffers) {
    const key = `${o.company.toLowerCase()}::${o.title.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, o);
  }
  const offers = [...byKey.values()];

  if (!dryRun) {
    writePipeline(offers, date);
    appendHistory(offers, date);
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`Companies scanned:      ${targets.length}`);
  console.log(`Total jobs returned:    ${totalJobs}`);
  console.log(`Filtered (title):       ${titleFiltered}`);
  console.log(`Filtered (location):    ${locationFiltered}`);
  console.log(`Duplicates skipped:     ${dupes}`);
  console.log(`New offers:             ${offers.length}`);

  // By sector
  const bySector = new Map();
  for (const o of offers) bySector.set(o.sector, (bySector.get(o.sector) || 0) + 1);
  if (bySector.size) {
    console.log(`\nBy sector:`);
    for (const [s, n] of [...bySector.entries()].sort()) {
      console.log(`  ${s.padEnd(15)} ${n}`);
    }
  }

  if (errors.length) {
    console.log(`\nErrors (${errors.length}) — likely wrong slug or ATS not yet supported:`);
    for (const e of errors.slice(0, 20)) {
      console.log(`  ✗ ${e.company.padEnd(25)} [${e.ats}] ${e.error}`);
    }
    if (errors.length > 20) console.log(`  … ${errors.length - 20} more`);
    console.log(`\nTip: run \`node scripts/verify-companies.mjs\` for a full health report.`);
  }

  if (!dryRun && offers.length) {
    console.log(`\n→ Wrote ${PIPELINE_PATH} and appended to ${HISTORY_PATH}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
