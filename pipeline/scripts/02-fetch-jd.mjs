#!/usr/bin/env node
/**
 * 02-fetch-jd.mjs — Fetch full JD content for every role in pipeline.md.
 *
 * Reads:  config/companies.yml, data/pipeline.md
 * Writes: jds-raw/{company-slug}-{role-slug}.md   (one per role)
 *
 * Idempotent: skips files that already exist on disk.
 *
 * Usage:
 *   node scripts/02-fetch-jd.mjs
 *   node scripts/02-fetch-jd.mjs --limit 5
 *   node scripts/02-fetch-jd.mjs --company Anthropic
 *   node scripts/02-fetch-jd.mjs --force      # re-fetch even if file exists
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { fetchJson, parallelMap, detectAtsType } from './lib/ats.mjs';
import { htmlToText, slugify } from './lib/html.mjs';

const COMPANIES_PATH = 'config/companies.yml';
const PIPELINE_PATH = 'data/pipeline.md';
const RAW_DIR = 'jds-raw';
const CONCURRENCY = 6;

mkdirSync(RAW_DIR, { recursive: true });

function parsePipeline(md) {
  // Format: - [ ] **{company}** — {title} ({location})[ ⚠️] — {url}
  // Location may contain nested parens; URL never contains spaces.
  const sectorRe = /^## ([\w-]+) \(\d+\)/;
  const out = [];
  let sector = '';
  for (const line of md.split('\n')) {
    const sm = line.match(sectorRe);
    if (sm) { sector = sm[1]; continue; }
    if (!line.startsWith('- [ ] ')) continue;

    // Split off URL (always last ` — ` followed by https://...)
    const sepIdx = line.lastIndexOf(' — https');
    if (sepIdx === -1) continue;
    const left = line.slice('- [ ] '.length, sepIdx);
    const url = line.slice(sepIdx + ' — '.length).trim();

    // Pull company from **...**
    const cm = left.match(/^\*\*(.+?)\*\*\s+—\s+(.+)$/);
    if (!cm) continue;
    const company = cm[1];
    let rest = cm[2].trim();

    // Trim optional " ⚠️"
    let unclear = false;
    if (rest.endsWith(' ⚠️')) { unclear = true; rest = rest.slice(0, -' ⚠️'.length).trimEnd(); }

    // rest should end with ")" — walk back to find matching "("
    if (!rest.endsWith(')')) continue;
    let depth = 0;
    let openIdx = -1;
    for (let i = rest.length - 1; i >= 0; i--) {
      const ch = rest[i];
      if (ch === ')') depth++;
      else if (ch === '(') {
        depth--;
        if (depth === 0) { openIdx = i; break; }
      }
    }
    if (openIdx === -1) continue;
    const title = rest.slice(0, openIdx).trimEnd();
    const location = rest.slice(openIdx + 1, -1).trim();

    out.push({ company, title, location, unclear, url, sector });
  }
  return out;
}

function greenhouseBoardWithContent(api) {
  // companies.yml api is .../boards/{slug}/jobs
  const sep = api.includes('?') ? '&' : '?';
  return api + sep + 'content=true';
}

async function fetchCompanyJobs(company) {
  const ats = detectAtsType(company.api);
  if (!ats) return null;
  let url = company.api;
  if (ats === 'greenhouse') url = greenhouseBoardWithContent(url);
  const json = await fetchJson(url);
  if (ats === 'greenhouse') return { ats, jobs: json.jobs || [] };
  if (ats === 'ashby') return { ats, jobs: json.jobs || [] };
  if (ats === 'lever') return { ats, jobs: Array.isArray(json) ? json : [] };
  return null;
}

function jobContentFor(ats, job) {
  if (ats === 'greenhouse') return job.content || '';
  if (ats === 'ashby') return job.descriptionHtml || job.description || '';
  if (ats === 'lever') {
    let html = job.descriptionHtml || job.description || '';
    for (const list of job.lists || []) {
      html += `<h3>${list.text || ''}</h3>${list.content || ''}`;
    }
    if (job.additional) html += `<h3>Additional</h3>${job.additional}`;
    return html;
  }
  return '';
}

function jobUrlFor(ats, job) {
  if (ats === 'greenhouse') return job.absolute_url || '';
  if (ats === 'ashby') return job.jobUrl || '';
  if (ats === 'lever') return job.hostedUrl || '';
  return '';
}

function jobLocationFor(ats, job) {
  if (ats === 'greenhouse') return job.location?.name || '';
  if (ats === 'ashby') return job.location || '';
  if (ats === 'lever') return job.categories?.location || '';
  return '';
}

function jobTitleFor(ats, job) {
  return ats === 'lever' ? (job.text || '') : (job.title || '');
}

function frontmatter(entry, content) {
  return [
    '---',
    `company: ${JSON.stringify(entry.company)}`,
    `title: ${JSON.stringify(entry.title)}`,
    `sector: ${entry.sector}`,
    `location: ${JSON.stringify(entry.location)}`,
    `location_unclear: ${entry.unclear}`,
    `ats: ${entry.ats}`,
    `url: ${entry.url}`,
    `fetched_at: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    `# ${entry.title} — ${entry.company}`,
    '',
    content,
    '',
  ].join('\n');
}

function fileFor(entry) {
  const c = slugify(entry.company);
  const t = slugify(entry.title);
  return join(RAW_DIR, c, `${t}.md`);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const companyIdx = args.indexOf('--company');
  const companyFilter = companyIdx !== -1 ? args[companyIdx + 1]?.toLowerCase() : null;
  const force = args.includes('--force');

  if (!existsSync(PIPELINE_PATH)) {
    console.error(`Missing ${PIPELINE_PATH}. Run scan first.`);
    process.exit(1);
  }

  const companies = yaml.load(readFileSync(COMPANIES_PATH, 'utf-8'))?.companies || [];
  const byName = new Map(companies.map(c => [c.name.toLowerCase(), c]));

  let entries = parsePipeline(readFileSync(PIPELINE_PATH, 'utf-8'))
    .map(e => ({ ...e, ats: byName.get(e.company.toLowerCase())?.ats || 'unknown' }));

  if (companyFilter) entries = entries.filter(e => e.company.toLowerCase().includes(companyFilter));

  // Skip already-fetched files unless --force
  const todo = entries.filter(e => force || !existsSync(fileFor(e))).slice(0, limit);
  const skipped = entries.length - todo.length;

  console.log(`Pipeline entries: ${entries.length}`);
  console.log(`Already on disk:  ${skipped}`);
  console.log(`To fetch:         ${todo.length}\n`);

  if (todo.length === 0) {
    console.log('Nothing to fetch — regenerating INDEX.md only.');
  }

  // Group todos by company
  const byCompany = new Map();
  for (const e of todo) {
    if (!byCompany.has(e.company)) byCompany.set(e.company, []);
    byCompany.get(e.company).push(e);
  }

  let written = 0;
  let notFound = 0;
  const errors = [];
  const targetCompanies = [...byCompany.keys()];

  await parallelMap(targetCompanies, CONCURRENCY, async (companyName) => {
    const company = byName.get(companyName.toLowerCase());
    if (!company) {
      errors.push({ company: companyName, error: 'not in companies.yml' });
      return;
    }
    let board;
    try {
      board = await fetchCompanyJobs(company);
    } catch (err) {
      errors.push({ company: companyName, error: err.message });
      return;
    }
    if (!board) {
      errors.push({ company: companyName, error: 'unsupported ATS' });
      return;
    }
    // Index jobs by url and lower-case title for matching
    const byUrl = new Map();
    const byTitle = new Map();
    for (const j of board.jobs) {
      const url = jobUrlFor(board.ats, j);
      const title = jobTitleFor(board.ats, j).toLowerCase();
      if (url) byUrl.set(url, j);
      if (title) byTitle.set(title, j);
    }

    for (const entry of byCompany.get(companyName)) {
      const job = byUrl.get(entry.url) || byTitle.get(entry.title.toLowerCase());
      if (!job) { notFound++; continue; }
      const content = htmlToText(jobContentFor(board.ats, job));
      // Patch up entry.location with the live value if available (cleaner)
      const liveLoc = jobLocationFor(board.ats, job);
      if (liveLoc) entry.location = liveLoc;
      const path = fileFor(entry);
      ensureDir(join(RAW_DIR, slugify(entry.company)));
      writeFileSync(path, frontmatter(entry, content));
      written++;
    }
  });

  // Write an INDEX.md so the folder is browseable
  const allByCompany = new Map();
  for (const e of entries) {
    if (!allByCompany.has(e.company)) allByCompany.set(e.company, []);
    allByCompany.get(e.company).push(e);
  }
  const sortedCompanies = [...allByCompany.keys()].sort();
  let idx = `# jds-raw/ — index\n\nGenerated ${new Date().toISOString().slice(0, 10)} · ${entries.length} roles across ${sortedCompanies.length} companies.\n\nEach company has its own folder; each role is one \`.md\` file with a YAML frontmatter (company, title, sector, location, url) followed by the JD body.\n\n`;
  for (const company of sortedCompanies) {
    const roles = allByCompany.get(company).sort((a, b) => a.title.localeCompare(b.title));
    idx += `## ${company} (${roles.length})\n\n`;
    for (const r of roles) {
      const file = `${slugify(company)}/${slugify(r.title)}.md`;
      idx += `- [${r.title}](${file}) — ${r.location}${r.unclear ? ' ⚠️' : ''}\n`;
    }
    idx += '\n';
  }
  writeFileSync(join(RAW_DIR, 'INDEX.md'), idx);

  console.log('─'.repeat(50));
  console.log(`Written:    ${written}`);
  console.log(`Index:      ${RAW_DIR}/INDEX.md`);
  console.log(`Not found:  ${notFound}  (URL/title mismatch — job may have been removed since scan)`);
  if (errors.length) {
    console.log(`Errors:     ${errors.length}`);
    for (const e of errors) console.log(`  ✗ ${e.company}: ${e.error}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
