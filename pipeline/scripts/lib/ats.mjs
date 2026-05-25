// ATS adapters: detect provider, fetch jobs, normalize shape.

const FETCH_TIMEOUT_MS = 10_000;

export function detectAtsType(api) {
  if (!api || api === 'unknown') return null;
  if (api.includes('greenhouse.io')) return 'greenhouse';
  if (api.includes('ashbyhq.com')) return 'ashby';
  if (api.includes('lever.co')) return 'lever';
  if (api.includes('myworkdayjobs.com') || api.includes('myworkdaysite.com')) return 'workday';
  return null;
}

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: companyName,
    location: j.location?.name || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: companyName,
    location: j.location || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || '',
    company: companyName,
    location: j.categories?.location || '',
  }));
}

// Workday tenant URL pattern: https://{host}/wday/cxs/{tenant}/{site}
// e.g. https://troweprice.wd5.myworkdayjobs.com/wday/cxs/troweprice/TROWEPRICE
// Public URL pattern: https://{host}/en-US/{site}{externalPath}
function workdayApiParts(api) {
  // Accepts both the canonical base and the .../jobs form.
  const m = (api || '').match(/^(https:\/\/[^/]+)\/wday\/cxs\/([^/]+)\/([^/]+)(?:\/jobs)?\/?$/);
  if (!m) return null;
  return { host: m[1], tenant: m[2], site: m[3], apiBase: `${m[1]}/wday/cxs/${m[2]}/${m[3]}` };
}

export function workdayPublicUrl(api, externalPath) {
  const parts = workdayApiParts(api);
  if (!parts || !externalPath) return '';
  return `${parts.host}/en-US/${parts.site}${externalPath}`;
}

function parseWorkday(json, companyName, api) {
  const postings = json.jobPostings || [];
  return postings.map(p => ({
    title: p.title || '',
    url: workdayPublicUrl(api, p.externalPath),
    company: companyName,
    location: p.locationsText || '',
    // Workday-only extras carried through for step 02 detail-fetching.
    externalPath: p.externalPath || '',
    postedOn: p.postedOn || '',
  }));
}

const PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
  // workday is handled separately in fetchJobs (POST + pagination).
};

export async function fetchJson(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...(init || {}), signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const WORKDAY_PAGE_LIMIT = 20;
const WORKDAY_HARD_CAP = 5000; // safety cap on offset

export async function fetchWorkdayList(api) {
  const apiBase = api.replace(/\/jobs\/?$/, '');
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && offset < WORKDAY_HARD_CAP) {
    const json = await fetchJson(`${apiBase}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: WORKDAY_PAGE_LIMIT, offset, searchText: '' }),
    });
    const postings = json.jobPostings || [];
    all.push(...postings);
    // Workday only reports `total` on the first page; subsequent pages may have 0.
    if (offset === 0 && typeof json.total === 'number' && json.total > 0) total = json.total;
    if (postings.length < WORKDAY_PAGE_LIMIT) break;
    offset += WORKDAY_PAGE_LIMIT;
  }
  return { total, jobPostings: all };
}

export async function fetchWorkdayDetail(api, externalPath) {
  const apiBase = api.replace(/\/jobs\/?$/, '');
  // externalPath already begins with "/job/..." — concatenate directly.
  return fetchJson(`${apiBase}${externalPath}`, {
    headers: {
      'Accept': 'application/json',
    },
  });
}

export async function fetchJobs(company) {
  const type = detectAtsType(company.api);
  if (!type) return { jobs: [], type: null, error: 'no-api' };
  try {
    if (type === 'workday') {
      const json = await fetchWorkdayList(company.api);
      const jobs = parseWorkday(json, company.name, company.api);
      return { jobs, type, error: null };
    }
    const json = await fetchJson(company.api);
    const jobs = PARSERS[type](json, company.name);
    return { jobs, type, error: null };
  } catch (err) {
    return { jobs: [], type, error: err.message };
  }
}

export async function parallelMap(items, limit, worker) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => next()
  );
  await Promise.all(workers);
  return results;
}
