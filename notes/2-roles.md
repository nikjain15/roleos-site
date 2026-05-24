# Roles — What the Scanner Surfaces

The title filter the scanner uses to decide which jobs to keep from each company's full job board.

---

## Target role buckets

The user is targeting roles in:
- **Product Management** (any flavour, including AI/Technical PM)
- **Program Management** (including TPM)
- **Growth** (Growth PM, Growth Manager, Head of Growth)
- **Chief of Staff** (Office of CEO/CTO, Strategic Initiatives, Founder's Office)
- **Business Operations / Strategy & Operations** (BizOps, RevOps, Strategy and Ops)

Open to: **all work modes** (remote, hybrid, on-site, full-time, contract, intern, junior).

Location: **USA, anywhere** — any US city or US-remote.

---

## Title filter — POSITIVE keywords

A listing is kept if its title matches **any one** of these (case-insensitive substring match):

### Product
- Product Manager
- Senior Product Manager
- Group Product Manager
- Principal Product Manager
- Staff Product Manager
- AI Product Manager
- Product Lead
- Technical Product Manager

### Program Management
- Program Manager
- Senior Program Manager
- Technical Program Manager
- TPM
- Senior TPM
- Staff Program Manager
- Director of Program Management

### Growth
- Growth
- Head of Growth
- Growth Lead
- Growth Manager
- Growth Product Manager

### Chief of Staff / strategic ops
- Chief of Staff
- Founder's Office
- Office of the CEO
- Office of the CTO
- Strategic Initiatives
- Special Projects

### Business Operations / Strategy
- Business Operations
- BizOps
- Strategy & Operations
- Strategic Operations
- Strategy and Operations
- Revenue Operations
- RevOps

---

## Title filter — NEGATIVE keywords

A listing is dropped if its title matches **any one** of these:

- Software Engineer, ML Engineer, Data Engineer, Designer, Recruiter
- Account Executive, Sales Development Rep, SDR, BDR
- Customer Support, Customer Success Specialist (drop), but keep CSM if paired with Strategy
- Field Marketing, Event Marketing
- Tax, Legal, Compliance, Audit, Treasury

### Explicitly NOT in negative filter

The user wants these kept:
- Junior, Intern, Contractor — all in scope
- Manager / Director / VP variants of the positive titles (they pass via the positive filter)

---

## Location filter

A listing is kept if location includes **any one** of:
- "United States", "USA", "US-Remote", "Remote (US)", "Remote - US", "Remote, US"
- Any major US city: SF, NYC, Seattle, LA, Boston, Austin, Chicago, Denver, Miami, Atlanta, DC, etc.
- "Remote" with no country specified → kept but tagged `location_unclear: true` so the user can manually review

A listing is dropped if location is **exclusively** non-US (EU-only, APAC-only, "London only", "Berlin only", etc.).

---

## Work auth

The location filter doesn't check work authorization. That's captured per-JD in the structured extraction (`location.work_auth` and `location.visa_sponsorship`). The user is open to roles that sponsor visas as well as US-citizenship-required roles.

---

## What this looks like in practice

Last full scan (run on the upstream config, not this filter) returned ~987 listings across ~80 companies. Of those:

| Bucket | Listings |
|---|---|
| Product Manager (all flavours) | ~102 |
| Growth (PM + Manager + Marketing) | 8 |
| Chief of Staff / Strategic Initiatives | 2 |
| Business Operations / BizOps | 0 |
| Program Manager / TPM | not yet measured (filter wasn't in place) |

The new filter above will dramatically increase Program Management hits (since TPM was missing from the upstream config), while dropping the ~700 engineering / sales / support listings the user doesn't want.

Expected post-filter volume: **~150–250 relevant listings** at any given time across the full 210-company pool.
