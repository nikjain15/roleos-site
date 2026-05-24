# Cursor — Product Manager, Agent Harness
**Skills view** (rendered from the structured JSON)

Source JD: [raw](../../jds-raw/cursor/product-manager-agent-harness.md) · Posting URL: https://jobs.ashbyhq.com/cursor/69abc2ba-2823-40c3-9b86-94ab63859649
Fetched: 2026-05-10

---

## Quick read

- **Role type:** AI Product Manager (high confidence) · secondary: Technical PM
- **Seniority:** Senior IC (implied by scope and technical depth required) · years not stated · individual contributor
- **Comp:** not stated
- **Location:** unclear
- **Work auth:** unclear · **Visa sponsorship:** unclear

---

## Must-haves (stated as required by the JD)

| # | Requirement (id) | Type | Verbatim | Bridgeable |
|---|---|---|---|---|
| 1 | `ai_agent_experience` | domain_knowledge | You have built or evaluated AI agents, LLM applications, or ML-powered developer tools. | maybe |
| 2 | `deep_technical_capability` | capability | You're deeply technical. You're comfortable reading code, analyzing traces, and reasoning about system behavior at a low level. | maybe |
| 3 | `evaluation_and_measurement_intuition` | capability | You have strong intuition for evaluation and measurement. You know how to define metrics that capture quality, not just activity. | maybe |
| 4 | `big_picture_and_detail_navigation` | capability | You can move between the big picture and the details—from "what should agents be capable of in six months?" to "why did this agent fail on this specific task?" | yes |
| 5 | `research_adjacent_environment` | cultural_fit | You're comfortable in a research-adjacent environment where the roadmap is shaped by empirical results, not just customer requests. | maybe |
| 6 | `ambiguity_and_fast_moving` | cultural_fit | You thrive in ambiguous, fast-moving environments and enjoy making hard tradeoffs with incomplete information. | yes |

**Atomized fields:**
1. `ai_agent_experience` — <sub>Technologies: AI agents, LLM applications, ML-powered developer tools</sub>


## Nice-to-haves (stated as preferred but not required)

| # | Requirement (id) | Type | Verbatim |
|---|---|---|---|
| 1 | `rl_agent_frameworks_experience` | domain_knowledge | You have experience with reinforcement learning, agent frameworks, or AI evaluation—either as a practitioner or working closely with researchers. |

**Atomized fields:**
1. `rl_agent_frameworks_experience` — <sub>Technologies: reinforcement learning, agent frameworks, AI evaluation</sub>


## Explicitly excluded by the JD

_None stated._

---

## What the role involves

**Surface:** Agent Harness — the framework governing how Cursor agents decompose tasks, interact with file system and terminal, handle failures, and allow developer observation and steering

**Business model:** B2B/B2C developer tool (AI-powered coding assistant)

**Team size:** unclear

**Cross-functional partners:** Engineering, Research

**Primary metrics (inferred):** Task completion rate; Error recovery rate; Hallucination frequency; Agent quality benchmarks
**Core responsibilities:**

- Owning the agent planning and execution framework: how agents decompose tasks, decide what tools to use, and recover when a step fails
- Designing how developers observe and steer agents: real-time progress, guardrails, the ability to redirect mid-task
- Building evaluation and benchmarking systems: defining what 'good' means for agent quality—task completion rate, error recovery, hallucination frequency
- Analyzing agent traces at scale: identifying where agents get stuck, loop, hallucinate, or take unproductive paths
- Defining the primitives for agent extensibility: how agents use tools, access codebase context, call external services via MCPs and plugins on the Cursor Marketplace
- Improving the default Cursor agent experience (the 'Auto' model setting)
- Shaping multi-agent coordination: how subagents share context and avoid conflicts when executing in parallel

---

## Compensation

- **Base:** not stated
- **Equity:** not mentioned
- **Total comp:** not stated
- **Location-based differential:** no
- **Source:** unknown

---

## Top keywords (likely to drive ATS matching)

`Agent Harness` · `AI agents` · `LLM` · `reinforcement learning` · `agent evaluation` · `agent traces` · `developer tools` · `multi-agent coordination` · `MCP` · `Cursor Marketplace` · `benchmarking` · `task completion` · `agentic coding`

**Buzzword density:** medium

---

## Signals from the posting

### Green flags
- Highly specific and well-defined product surface — not a generic PM role
- JD shows deep internal knowledge of the product area (Composer 2, frontier coding model, real-time RL)
- Clear ownership framing: 'you will own this framework'
- Explicit acknowledgment that this is a research-adjacent, empirically driven environment — signals intellectually rigorous culture
- Company mission and product are coherent and focused

### Red flags
- No compensation range disclosed
- No location or remote policy stated — candidates cannot assess logistics
- No visa/sponsorship information provided
- No years of experience explicitly required — makes it difficult to calibrate seniority expectations
- High technical bar with limited signals on what 'deeply technical' means in practice for PMs

---

## Extraction audit

**Fields inferred (not stated verbatim in JD):**
- seniority.level (inferred from scope, ownership framing, and technical expectations; not explicitly stated)
- scope.business_model (inferred from product description as developer-facing AI coding tool)
- scope.primary_metrics_inferred (inferred from responsibilities; partially quoted from JD but assembled as a list)
- location.type (no location or remote policy stated; marked as 'unclear')
- nice_to_haves classification for rl_agent_frameworks_experience (JD language 'You have experience with...' is ambiguous between must-have and nice-to-have; placed in nice-to-haves because it appears later in the list alongside softer signals and uses 'either as a practitioner or working closely with researchers' framing suggesting flexibility)

**Ambiguities flagged:**
- The requirement 'You have experience with reinforcement learning, agent frameworks, or AI evaluation' uses similar unconditional phrasing to the must-haves but appears in a list with softer cultural-fit items and allows for non-practitioner exposure ('working closely with researchers'). Classified as nice-to-have but could reasonably be a hard requirement given the role's research-adjacent nature.
- All 'You may be a fit if' bullets use the same conditional framing, making it difficult to distinguish hard requirements from strong preferences. Treated bullets describing clearly technical/functional requirements as hard must-haves and those describing practitioner depth or cultural attributes as softer.
- No location, remote eligibility, or visa/sponsorship information is stated anywhere in the JD.

> Per extraction rules: where the JD doesn't state something, the field stays blank or "not stated." This view is a digest of the JD only — no commentary about the candidate, no advice, no inferred gap analysis.
