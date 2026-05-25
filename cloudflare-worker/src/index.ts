// RoleOS chat Worker — RAG over the JD index, $0 stack.
//
// Pipeline per request:
//   1. Embed the user's question (Ollama nomic-embed-text via tunnel).
//   2. Hybrid retrieval (Supabase RPC match_chunks, cosine + tsvector).
//   3. Build a strict-but-best-guess system prompt with the chunks inline.
//   4. Generate via Ollama chat (qwen2.5:7b-instruct-q4_K_M).
//   5. Return { reply, citations } as JSON.
//
// Env (set via `wrangler secret put` or vars):
//   SUPABASE_URL              public Supabase URL
//   SUPABASE_ANON_KEY         anon key (RLS allows read + match_chunks RPC)
//   OLLAMA_URL                cloudflared tunnel URL fronting local Ollama
//   ALLOWED_ORIGIN            e.g. https://nikjain15.github.io
//   GEN_MODEL                 default: qwen2.5:7b-instruct-q4_K_M
//   EMBED_MODEL               default: nomic-embed-text

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OLLAMA_URL: string;
  ALLOWED_ORIGIN: string;
  GEN_MODEL?: string;
  EMBED_MODEL?: string;
}

interface Chunk {
  id: string;
  company_slug: string;
  company_name: string;
  role_title: string;
  archetype: string | null;
  seniority_level: string | null;
  location_type: string | null;
  source_url: string | null;
  content: string;
  score: number;
}

const SYSTEM_PROMPT = `You are RO — the assistant for the RoleOS Index, a database of senior AI-economy roles that Nikhil's pipeline has read and structured.

Grounding rules (NON-NEGOTIABLE):
- Answer ONLY using the SNIPPETS below. Each snippet is tagged with [company-slug] and the role title.
- After every factual claim, cite the source like [doordash] or [doordash, stripe]. Multiple citations are fine.
- If the snippets are partially relevant, you may synthesize a careful answer — but be explicit about what you're inferring vs. what's stated, and cite every claim.
- If the snippets do not contain the answer at all, reply EXACTLY: "RO hasn't read a posting that covers this. Try a different question, or drop your email on the waitlist for deeper analysis."
- Never invent companies, role titles, salaries, or requirements that are not in the snippets.

Voice:
- Warm, direct, plain English. Short sentences. One idea at a time.
- No exclamation marks. Never use "as an AI", "great question", "unfortunately".
- Em-dashes are fine.
- Keep replies under 140 words unless the user asks for depth.`;

async function embed(text: string, env: Env): Promise<number[]> {
  const r = await fetch(`${env.OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.EMBED_MODEL || 'nomic-embed-text', prompt: text }),
  });
  if (!r.ok) throw new Error(`ollama embed ${r.status}: ${await r.text()}`);
  const j = await r.json() as { embedding: number[] };
  return j.embedding;
}

async function retrieve(question: string, qEmbed: number[], env: Env): Promise<Chunk[]> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/match_chunks`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query_embedding: qEmbed, query_text: question, match_count: 8 }),
  });
  if (!r.ok) throw new Error(`supabase rpc ${r.status}: ${await r.text()}`);
  return r.json() as Promise<Chunk[]>;
}

function buildContext(chunks: Chunk[]): string {
  if (!chunks.length) return '(no snippets matched)';
  return chunks.map((c, i) =>
    `--- SNIPPET ${i + 1}  [${c.company_slug}]  ${c.role_title} ---\n${c.content}`
  ).join('\n\n');
}

async function generate(question: string, history: any[], chunks: Chunk[], env: Env): Promise<string> {
  const ctx = buildContext(chunks);
  const augmented = [
    ...history.slice(0, -1),
    {
      role: 'user',
      content: `SNIPPETS RO HAS READ (the only ground truth — cite by [slug]):\n\n${ctx}\n\n---\n\nUser question: ${question}`,
    },
  ];
  const r = await fetch(`${env.OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.GEN_MODEL || 'qwen2.5:7b-instruct-q4_K_M',
      stream: false,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...augmented],
      options: { temperature: 0.2, num_predict: 350 },
    }),
  });
  if (!r.ok) throw new Error(`ollama chat ${r.status}: ${await r.text()}`);
  const j = await r.json() as { message?: { content: string } };
  return j.message?.content?.trim() || "RO hasn't read a posting that covers this.";
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env.ALLOWED_ORIGIN || '*');
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST')    return new Response('method not allowed', { status: 405, headers: cors });

    try {
      const body = await req.json() as any;
      const history = Array.isArray(body?.messages) ? body.messages : [];
      const last = history[history.length - 1];
      if (!last || last.role !== 'user' || typeof last.content !== 'string' || !last.content.trim()) {
        return new Response(JSON.stringify({ error: 'last message must be a non-empty user turn' }), {
          status: 400, headers: { ...cors, 'content-type': 'application/json' },
        });
      }
      if (history.length > 20) {
        return new Response(JSON.stringify({ error: 'too many messages' }), {
          status: 400, headers: { ...cors, 'content-type': 'application/json' },
        });
      }
      const question = last.content.trim().slice(0, 500);

      const qEmbed = await embed(question, env);
      const chunks = await retrieve(question, qEmbed, env);
      const reply  = await generate(question, history, chunks, env);

      const citations = Array.from(new Map(chunks.map(c => [c.company_slug, {
        slug: c.company_slug, name: c.company_name, role: c.role_title, url: c.source_url,
      }])).values());

      return new Response(JSON.stringify({ reply, citations }), {
        headers: { ...cors, 'content-type': 'application/json' },
      });
    } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message || 'error' }), {
        status: 500, headers: { ...cors, 'content-type': 'application/json' },
      });
    }
  },
};
