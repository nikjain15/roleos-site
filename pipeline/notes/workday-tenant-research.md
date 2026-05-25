# Workday tenant URL research

Workday-based ATS portals require an exact `{tenant}/{site}` URL pair, e.g.
`https://blackrock.wd5.myworkdayjobs.com/wday/cxs/blackrock/{SITE}/jobs`.

The `{SITE}` segment is not derivable from the careers landing page — it's loaded
by a JS-rendered SPA via XHR after page render. Brute-forcing common names
(`External`, `Careers`, `{Tenant}_External`, etc.) reliably returns HTTP 422
("tenant exists, site path wrong") rather than 404, but doesn't reveal the
correct value.

## Resolved (enabled in `config/companies.yml`)

| Company        | ATS        | API |
|----------------|------------|-----|
| T. Rowe Price  | Workday    | `https://troweprice.wd5.myworkdayjobs.com/wday/cxs/troweprice/TROWEPRICE/jobs` |
| State Street   | Workday    | `https://statestreet.wd1.myworkdayjobs.com/wday/cxs/statestreet/Global/jobs` |
| AQR            | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/aqr/jobs` (not Workday — careers page links to Greenhouse) |

## Unresolved — need browser-based discovery

For each of these, open the careers page in Chrome with DevTools → Network tab,
filter by `myworkdayjobs.com`, click "Search Jobs" or browse roles, and copy the
URL of the first XHR that hits `/wday/cxs/{tenant}/{site}/jobs`. Then drop the
URL into `config/companies.yml` and set `enabled: true`.

| Company         | Careers URL                         | Probe result          | Likely tenant root                                  |
|-----------------|-------------------------------------|------------------------|-----------------------------------------------------|
| BlackRock       | https://careers.blackrock.com       | 422 (tenant exists)    | `blackrock.wd5.myworkdayjobs.com/wday/cxs/blackrock/?` |
| Vanguard        | https://www.vanguardjobs.com        | 422 on wd1/wd3         | `vanguard.wd1.myworkdayjobs.com/wday/cxs/vanguard/?` |
| Fidelity        | https://jobs.fidelity.com           | not Workday in HTML    | unknown — may be Phenom People                       |
| Charles Schwab  | https://www.schwabjobs.com          | 401 (auth required?)   | `schwab.wd5.myworkdayjobs.com/wday/cxs/schwab/?`     |
| Bridgewater     | https://www.bridgewater.com/careers | 422 / 401              | `bwater.wd5.myworkdayjobs.com/wday/cxs/bwater/?`     |
| Two Sigma       | https://careers.twosigma.com        | 422 on wd1, 401 on wd5 | `twosigma.wd5.myworkdayjobs.com/wday/cxs/twosigma/?` |
| Citadel         | https://www.citadel.com/careers     | 422 (tenant exists)    | `citadel.wd5.myworkdayjobs.com/wday/cxs/citadel/?`   |

### How to resolve in a browser

1. Open the careers URL in Chrome.
2. Open DevTools → Network tab. Filter: `myworkdayjobs` or `wday/cxs`.
3. Click "Search Jobs" / "View all roles" or navigate to the jobs list.
4. Look for an XHR `POST` request matching the `/wday/cxs/{tenant}/{site}/jobs` shape.
5. Copy the full URL. That's your `api:` value (drop `?` query params).
6. Patch `config/companies.yml`, flip `enabled: true`, and run
   `node scripts/01-scan-portals.mjs --company "{Name}"` to verify.

If a tenant *isn't* on Workday (like Fidelity may be on Phenom, or BlackRock
might be on a different ATS entirely), document the actual ATS in the notes and
extend `scripts/lib/ats.mjs` accordingly.
