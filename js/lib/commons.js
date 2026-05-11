import { COMMONS_API, COMMONS_MEDIASEARCH, FETCH_TIMEOUT_MS, IMAGE_SEARCH_LIMIT } from "../config.js";

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      value => { clearTimeout(id); resolve(value); },
      err => { clearTimeout(id); reject(err); }
    );
  });
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/(?:spp?|group|complex|allies|entry|field|concept|var|cf|aff)\.?/gi, " ")
    .replace(/[|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function basenameHint(record) {
  const first = Array.isArray(record?.images) ? record.images[0] : "";
  const name = String(first || "").split('/').pop() || "";
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-[a-f0-9]{6,}$/i, "")
    .replace(/-v\d+(?:-\d+)?$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCommonsQueries(record) {
  const queries = [];
  const push = (value) => {
    const cleaned = cleanName(value);
    if (!cleaned) return;
    if (!queries.includes(cleaned)) queries.push(cleaned);
  };

  push(record?.scientific_name);
  push(record?.display_name);
  push(record?.common_name);
  push(basenameHint(record));

  return queries.slice(0, 4);
}

function scoreCandidate(page, queries) {
  const title = String(page?.title || "").toLowerCase();
  let score = 0;
  for (const q of queries) {
    const query = q.toLowerCase();
    if (!query) continue;
    if (title.includes(query)) score += 5;
    for (const token of query.split(/\s+/).filter(Boolean)) {
      if (title.includes(token)) score += 1;
    }
  }
  if (/illustration|drawing|icon|logo|map|diagram/i.test(title)) score -= 3;
  return score;
}

async function mediaWikiSearch(query) {
  const url = new URL(COMMONS_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('origin', '*');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrlimit', String(IMAGE_SEARCH_LIMIT));
  url.searchParams.set('prop', 'imageinfo|info');
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('iiurlwidth', '900');
  url.searchParams.set('inprop', 'url');

  const res = await withTimeout(fetch(url.toString(), { cache: 'no-store' }), FETCH_TIMEOUT_MS, query);
  if (!res.ok) throw new Error(`Commons search failed: HTTP ${res.status}`);
  const payload = await res.json();
  return Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
}

function makeSearchUrl(query) {
  const url = new URL(COMMONS_MEDIASEARCH);
  url.searchParams.set('type', 'image');
  url.searchParams.set('search', query);
  return url.toString();
}

export async function resolveCommonsImage(record) {
  const queries = buildCommonsQueries(record);
  for (const query of queries) {
    const pages = await mediaWikiSearch(query);
    const filtered = pages
      .filter(page => Array.isArray(page?.imageinfo) && page.imageinfo[0]?.thumburl)
      .sort((a, b) => scoreCandidate(b, queries) - scoreCandidate(a, queries));
    const page = filtered[0];
    if (!page) continue;
    const info = page.imageinfo[0] || {};
    const meta = info.extmetadata || {};
    return {
      source: 'wikimedia',
      src: info.thumburl || info.url || '',
      fullImageUrl: info.url || '',
      sourcePage: page.fullurl || makeSearchUrl(query),
      title: String(page.title || '').replace(/^File:/i, ''),
      author: stripHtml(meta.Artist?.value || meta.Credit?.value || ''),
      credit: stripHtml(meta.Credit?.value || ''),
      license: stripHtml(meta.LicenseShortName?.value || meta.License?.value || ''),
      licenseUrl: stripHtml(meta.LicenseUrl?.value || ''),
      query
    };
  }
  return null;
}

export function getCommonsSearchUrl(record) {
  const query = buildCommonsQueries(record)[0] || record?.slug || 'Upper Michigan foraging';
  return makeSearchUrl(query);
}
