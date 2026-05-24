// ATS adapters: detect provider, fetch jobs, normalize shape.

const FETCH_TIMEOUT_MS = 10_000;

export function detectAtsType(api) {
  if (!api || api === 'unknown') return null;
  if (api.includes('greenhouse.io')) return 'greenhouse';
  if (api.includes('ashbyhq.com')) return 'ashby';
  if (api.includes('lever.co')) return 'lever';
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

const PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

export async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
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

export async function fetchJobs(company) {
  const type = detectAtsType(company.api);
  if (!type) return { jobs: [], type: null, error: 'no-api' };
  try {
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
