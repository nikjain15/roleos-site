#!/usr/bin/env node
// RAG grounding eval: for each case in rag-cases.jsonl, run the retrieval
// path and check that the expected company slugs (or archetypes) appear in
// the top-K. Non-zero exit on failures so this can gate CI.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, OLLAMA_URL, EMBED_MODEL
// Run: node pipeline/eval/run-eval.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON         = process.env.SUPABASE_ANON_KEY;
const OLLAMA_URL   = process.env.OLLAMA_URL  || 'http://127.0.0.1:11434';
const EMBED_MODEL  = process.env.EMBED_MODEL || 'nomic-embed-text';

if (!SUPABASE_URL || !ANON) { console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY'); process.exit(1); }

async function embed(text) {
  const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}`);
  return (await r.json()).embedding;
}

async function retrieve(question, qEmbed) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_chunks`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query_embedding: qEmbed, query_text: question, match_count: 8 }),
  });
  if (!r.ok) throw new Error(`rpc ${r.status}: ${await r.text()}`);
  return r.json();
}

const cases = readFileSync(join(HERE, 'rag-cases.jsonl'), 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

let pass = 0, fail = 0;
for (const c of cases) {
  const qEmbed = await embed(c.q);
  const top = await retrieve(c.q, qEmbed);
  const slugs = top.map(t => t.company_slug);
  const arches = top.map(t => t.archetype).filter(Boolean);

  const slugOk = !c.expect_slugs_any || c.expect_slugs_any.some(s => slugs.includes(s));
  const archOk = !c.expect_archetype_any || c.expect_archetype_any.some(a => arches.includes(a));
  const ok = slugOk && archOk;

  if (ok) { pass++; console.log(`✓ ${c.q}`); }
  else {
    fail++;
    console.log(`✗ ${c.q}`);
    console.log(`    expected slugs: ${c.expect_slugs_any?.join(', ') || '—'}`);
    console.log(`    expected archetypes: ${c.expect_archetype_any?.join(', ') || '—'}`);
    console.log(`    got slugs: ${slugs.join(', ')}`);
  }
}
console.log(`\n${pass}/${pass+fail} passed`);
process.exit(fail ? 1 : 0);
