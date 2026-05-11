import corrections from "../data/species-audit-corrections-v1.json";

export async function applyAuditCorrections(records){
  const bySlug = new Map(records.map(r => [r.slug, r]));

  for(const fix of corrections.records){
    if(!bySlug.has(fix.slug)) continue;
    const base = bySlug.get(fix.slug);

    const merged = {
      ...base,
      ...fix
    };

    bySlug.set(fix.slug, merged);
  }

  return [...bySlug.values()];
}
