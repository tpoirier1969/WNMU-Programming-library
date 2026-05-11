const CORRECTION_FILES = [
  '../data/species-audit-corrections-v1.json',
  '../data/species-audit-corrections-v2.json',
  '../data/species-audit-corrections-v3.json',
  '../data/species-audit-corrections-v4.json',
  '../data/species-audit-corrections-v5.json'
];

async function loadCorrectionRecords() {
  const payloads = await Promise.all(
    CORRECTION_FILES.map(path =>
      fetch(path, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { records: [] })
        .catch(() => ({ records: [] }))
    )
  );
  return payloads.flatMap(payload => payload.records || []);
}

export async function applyAuditCorrections(records) {
  const fixes = await loadCorrectionRecords();
  const bySlug = new Map((records || []).map(record => [record.slug, record]));

  for (const fix of fixes) {
    if (!fix?.slug || !bySlug.has(fix.slug)) continue;
    const base = bySlug.get(fix.slug);
    bySlug.set(fix.slug, { ...base, ...fix });
  }

  return [...bySlug.values()];
}
