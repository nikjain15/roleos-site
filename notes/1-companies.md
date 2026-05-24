# Companies — Target Pool

The full list of companies the scanner tracks, organized by sector. Includes everything we discussed across the conversation.

**Total: ~210 companies** across 5 sector blocks + the existing AI pool from upstream.

---

## Sector 1 — E-commerce / consumer marketplaces (25)

Big platforms + DTC + B2B commerce. Includes both giants (Amazon, Uber-class) and Series B+ startups.

Amazon, Uber, Lyft, Airbnb, DoorDash, Instacart, Shopify, Etsy, Wayfair, Chewy, Faire, Whatnot, StockX, GOAT, Poshmark, Mercari, ThredUp, Glossier, Warby Parker, Allbirds, Rothy's, Outdoor Voices, Klaviyo, Bolt, Shippo

---

## Sector 2 — Asset management / wealth (20)

Mixed: traditional asset managers (public), hedge funds, and wealthtech startups (Series B+). User explicitly wants both traditional firms and startups in the pool.

BlackRock, Vanguard, Fidelity, State Street, T. Rowe Price, Charles Schwab, Bridgewater, AQR, Two Sigma, Citadel, Wealthfront, Betterment, Robinhood, Public, SoFi, Acorns, Stash, Carta, Addepar, iCapital

---

## Sector 3 — Finance / fintech infra / banks (25)

Fintech infrastructure, neobanks, lending, crypto, plus the major investment banks (which hire heavily for AI / strategy / Chief of Staff roles).

Stripe, Plaid, Ramp, Brex, Mercury, Modern Treasury, Unit, Alloy, Affirm, Klarna, Upstart, Chime, Varo, Coinbase, Kraken, Lemonade, Coalition, Anrok, Pylon, Beam Benefits, Capital One, JPMorgan Chase, Goldman Sachs, Morgan Stanley, American Express

---

## Sector 4 — Series B+ AI / dev tools / vertical AI (20)

The non-foundation-model startups. Foundation-model labs (Anthropic, OpenAI, Mistral, Cohere, etc.) are already in the existing pool below.

Cursor, Replit, Linear, Notion, Figma, Asana, Loom, Harvey, Writer, Adept, Character AI, Inflection, xAI, Scale AI, Surge AI, Labelbox, Abridge, Hippocratic AI, EvenUp, Crosby

---

## Sector 5 — Existing pool (kept from upstream `portals.yml`) (~96)

Already configured in the upstream `career-ops/portals.yml`. Trimmed only of obvious off-target entries (German vocational training queries, EU-only roles).

**AI Labs / model companies:** Anthropic, OpenAI, Mistral AI, Cohere, Aleph Alpha, Hugging Face, Stability AI, Black Forest Labs, Perplexity, Runway, Synthesia, Photoroom

**Voice / Conversational AI:** ElevenLabs, Deepgram, PolyAI, Hume AI, Vapi, Bland AI, Speechmatics, Parloa

**Agent / Customer-AI:** Sierra, Decagon, Ada, LivePerson, Dialpad, Cognigy, Glean, Lindy, Gong, Talkdesk, Genesys

**AI infra / dev tools:** LangChain, Langfuse, Pinecone, Weights & Biases, Arize AI, Lakera, Maxim AI, Zep AI, Inngest, Temporal, RunPod, Hightouch

**Robotics / applied:** Wayve, Sanctuary AI, Helsing, Cradle, Isomorphic Labs, PhysicsX, Faculty, Causaly, Glacis AI, Safari AI, Semios

**General tech / SaaS:** Airtable, Vercel, Retool, Supabase, PlanetScale, Resend, WorkOS, Clerk, Tinybird, Attio, Pigment, Hootsuite, Klue, Legora, Lovable

**Automation:** n8n, Zapier, Make.com, Boomi

**Enterprise / contact center:** Salesforce, Twilio, Celonis, Intercom, Contentful, Scandit, Amplemarket, Clay Labs, Later

**EU consumer / fintech:** Spotify, HelloFresh, Vinted, GetYourGuide, Travelperk, N26, Qonto, Trade Republic, Factorial, SumUp, DeepL, Forto, Clarity AI, Palantir

---

## Per-company metadata to maintain

For each company in `portals.yml` (or a parallel `companies-meta.yml`):

| Field | Source | Notes |
|---|---|---|
| `careers_url` | manual / lookup | branded URL preferred, ATS URL as fallback |
| `ats_provider` | derived from URL | `greenhouse` / `ashby` / `lever` / `workday` / `bamboohr` / `teamtailor` |
| `api_endpoint` | derived | constructed per provider |
| `sector` | manual | `e-commerce` / `asset-mgmt` / `fintech` / `ai-startup` / `ai-lab` / `voice-ai` / etc. |
| `stage` | WebSearch | `seed` / `A` / `B` / `C` / `D+` / `public` / `unknown` |
| `last_raise_date` | WebSearch | `YYYY-MM` |
| `headcount_estimate` | WebSearch | rounded bucket: <50 / 50-200 / 200-1000 / 1000-5000 / 5000+ |
| `recent_news` | WebSearch | one-liner; e.g. "raised $200M Series D, 2025-Q4" or "announced 10% layoff, 2026-Q1" |
| `enabled` | manual | boolean — toggle off without deleting |

**Refresh cadence:** company metadata refreshed **monthly** by `enrich-meta.mjs`. Sourced via WebSearch from Crunchbase / news / Wikipedia. Where data is missing, mark `unknown` rather than guess.

---


