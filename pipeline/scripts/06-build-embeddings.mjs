#!/usr/bin/env node
// Build RAG index: read jds-structured/*.json, embed via local Ollama
// (nomic-embed-text, 768d), upsert to Supabase jd_chunks.
//
// Env required:
//   SUPABASE_URL                 e.g. https://xyz.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service-role key (NOT the anon key)
//   OLLAMA_URL                   default: http://127.0.0.1:11434
//   EMBED_MODEL                  default: nomic-embed-text
//
// Run: node pipeline/scripts/06-build-embeddings.mjs
// Re-runnable: rows are upserted by id (company-slug:ats_job_id).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JDS_DIR = join(ROOT, 'jds-structured');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLLAMA_URL   = process.env.OLLAMA_URL  || 'http://127.0.0.1:11434';
const EMBED_MODEL  = process.env.EMBED_MODEL || 'nomic-embed-text';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

// ── Load every JD ───────────────────────────────────────────────────────────
function loadAllJDs() {
  const out = [];
  for (const slug of readdirSync(JDS_DIR)) {
    const dir = join(JDS_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const jd = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        jd.__slug = slug;
        out.push(jd);
      } catch (e) {
        console.warn(`skip ${slug}/${file}: ${e.message}`);
      }
    }
  }
  return out;
}

// ── Build a single retrieval chunk per JD ───────────────────────────────────
// We index one chunk per role for now. If quality is weak on must-have-level
// queries, split must_haves into their own chunks (each verbatim quote).
function buildChunk(jd) {
  const mh = Array.isArray(jd.must_haves) ? jd.must_haves : [];
  const mhText = mh.map(m => `• ${m.raw_text_from_jd}`).join('\n');
  const loc = jd.location || {};
  const sen = jd.seniority || {};
  const comp = jd.compensation || {};
  const lines = [
    `Company: ${jd.company}`,
    `Role: ${jd.role_title}`,
    `Archetype: ${jd.archetype}${jd.secondary_archetype ? ` / ${jd.secondary_archetype}` : ''}`,
    `Seniority: ${sen.level || '—'} (${sen.years_required_min ?? '?'}–${sen.years_required_max ?? '?'} yrs)`,
    `Location: ${loc.type || '—'}${loc.cities_listed?.length ? ` · ${loc.cities_listed.join(', ')}` : ''}`,
    `Visa sponsorship: ${loc.visa_sponsorship || '—'}`,
    (comp.base_min || comp.base_max) ? `Base salary: ${comp.base_min ?? '?'}–${comp.base_max ?? '?'} ${comp.currency || 'USD'}` : null,
    '',
    'Must-haves (verbatim from JD):',
    mhText || '(none extracted)',
  ].filter(Boolean);
  return lines.join('\n');
}

function rowFromJD(jd) {
  const id = `${jd.__slug}:${jd.ats_job_id || jd.url || jd.role_title}`;
  return {
    id,
    company_slug:    jd.__slug,
    company_name:    jd.company || jd.__slug,
    role_title:      jd.role_title || '',
    archetype:       jd.archetype || null,
    seniority_level: jd.seniority?.level || null,
    location_type:   jd.location?.type || null,
    source_url:      jd.url || null,
    content:         buildChunk(jd),
  };
}

// ── Ollama embed ────────────────────────────────────────────────────────────
async function embed(text) {
  const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!r.ok) throw new Error(`ollama embed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  if (!Array.isArray(j.embedding)) throw new Error('no embedding in response');
  return j.embedding;
}

// ── Supabase upsert (batched) ───────────────────────────────────────────────
async function upsertBatch(rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/jd_chunks?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`supabase upsert ${r.status}: ${await r.text()}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
const jds = loadAllJDs();
console.log(`Found ${jds.length} structured JDs. Embedding via ${EMBED_MODEL} @ ${OLLAMA_URL}`);

const BATCH = 25;
let buffer = [], done = 0, t0 = Date.now();
for (const jd of jds) {
  const row = rowFromJD(jd);
  try {
    row.embedding = await embed(row.content);
  } catch (e) {
    console.warn(`embed failed for ${row.id}: ${e.message}`);
    continue;
  }
  buffer.push(row);
  done++;
  if (buffer.length >= BATCH) {
    await upsertBatch(buffer); buffer = [];
    process.stdout.write(`\r  ${done}/${jds.length}  (${Math.round(done / ((Date.now()-t0)/1000))}/s)   `);
  }
}
if (buffer.length) await upsertBatch(buffer);
console.log(`\nDone. Indexed ${done} JDs in ${((Date.now()-t0)/1000).toFixed(1)}s.`);
