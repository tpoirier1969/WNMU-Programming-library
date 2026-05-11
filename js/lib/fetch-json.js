import { FETCH_TIMEOUT_MS, REPO_BASE_RAW, REPO_BASE_CDN } from "../config.js";

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      value => { clearTimeout(id); resolve(value); },
      err => { clearTimeout(id); reject(err); }
    );
  });
}

async function tryFetch(url, label) {
  const res = await withTimeout(fetch(url, { cache: "no-store" }), FETCH_TIMEOUT_MS, label);
  if (!res.ok) throw new Error(`${label} -> HTTP ${res.status}`);
  return res.json();
}

export async function fetchJsonFromRepo(path) {
  const rawUrl = `${REPO_BASE_RAW}/${path}`;
  const cdnUrl = `${REPO_BASE_CDN}/${path}`;
  let firstError = null;
  try {
    return await tryFetch(rawUrl, rawUrl);
  } catch (err) {
    firstError = err;
  }
  try {
    return await tryFetch(cdnUrl, cdnUrl);
  } catch (err) {
    throw new Error(`${firstError?.message || "raw fetch failed"} | fallback failed: ${err.message}`);
  }
}
