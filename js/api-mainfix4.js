import { APP_VERSION, TABLE_NAME } from "./constants-mainfix.js?v=2026-04-17-37";
import { SPECIES_PATHS } from "../data/sources.js?v=2026-04-21-1";

const BAD_SOURCE_LINKS = new Set([
  'https://www.fda.gov/food/chemical-contaminants-pesticides/natural-toxins-food'
]);

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Load failed: ${path} ${response.status}`);
  return await response.json();
}
function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function sanitizeLinks(links = []) {
  return [...new Set((links || []).filter(Boolean).map((v) => String(v).trim()).filter((v) => !BAD_SOURCE_LINKS.has(v)))];
}
function sanitizeRecord(record) {
  return { ...record, links: sanitizeLinks(record?.links || []) };
}
const IMAGE_OVERRIDE_NAME_ALIASES = {
  'butyriboletus frostii': 'frosts-bolete',
  'frost s bolete': 'frosts-bolete',
  'frosts bolete': 'frosts-bolete',
  'suillus grevillei': 'larch-bolete',
  'larch bolete': 'larch-bolete',
  'strobilomyces strobilaceus': 'old-man-of-the-woods',
  'old man of the woods': 'old-man-of-the-woods',
  'leccinum versipelle': 'orange-birch-bolete',
  'orange birch bolete': 'orange-birch-bolete',
  'leccinum aurantiacum': 'orange-oak-bolete',
  'orange oak bolete': 'orange-oak-bolete',
  'suillus spraguei': 'painted-suillus',
  'painted suillus': 'painted-suillus',
  'xerocomellus chrysenteron': 'red-cracking-bolete',
  'red cracking bolete': 'red-cracking-bolete',
  'suillus punctipes': 'dotted-stem-suillus',
  'dotted stem suillus': 'dotted-stem-suillus',
  'leccinum pseudoinsigne': 'eastern-orange-bolete',
  'eastern orange bolete': 'eastern-orange-bolete',
  'aureoboletus projectellus': 'admirable-bolete',
  'admirable bolete': 'admirable-bolete'
};
function findOverrideForRecord(record, overrides = {}) {
  if (!record) return null;
  if (record.slug && overrides[record.slug]) return overrides[record.slug];
  const keys = [record.scientific_name, record.display_name, record.common_name].map(normalizeKey).filter(Boolean);
  for (const key of keys) {
    const alias = IMAGE_OVERRIDE_NAME_ALIASES[key];
    if (alias && overrides[alias]) return overrides[alias];
  }
  return null;
}
function mergeOverridePayloads(basePayload, extraPayload) {
  return {
    metadata: {
      version: extraPayload?.metadata?.version || basePayload?.metadata?.version || 'none',
      source: [basePayload?.metadata?.source, extraPayload?.metadata?.source].filter(Boolean).join(' + ') || 'none'
    },
    overrides: { ...(basePayload?.overrides || {}), ...(extraPayload?.overrides || {}) }
  };
}
function mergeCreditsPayloads(basePayload, extraPayload) {
  return {
    metadata: {
      version: extraPayload?.metadata?.version || basePayload?.metadata?.version || 'none',
      source: [basePayload?.metadata?.source, extraPayload?.metadata?.source].filter(Boolean).join(' + ') || 'none'
    },
    credits: { ...(basePayload?.credits || {}), ...(extraPayload?.credits || {}) }
  };
}
function mergeSpeciesPayloads(basePayload, extraPayload) {
  const bySlug = new Map();
  (basePayload?.records || []).forEach(record => bySlug.set(record.slug, sanitizeRecord(record)));
  (extraPayload?.records || []).forEach(record => bySlug.set(record.slug, sanitizeRecord({ ...(bySlug.get(record.slug) || {}), ...record })));
  return {
    metadata: {
      ...(basePayload?.metadata || {}),
      additions_version: extraPayload?.metadata?.version || 'none',
      additions_source: extraPayload?.metadata?.source || 'none'
    },
    records: [...bySlug.values()]
  };
}
async function loadOverrides() {
  try {
    const [basePayload, extraPayload] = await Promise.all([
      loadJson('data/wikimedia-image-overrides-wm4.json').catch(() => ({ metadata: { version: 'none', source: 'none' }, overrides: {} })),
      loadJson('data/wikimedia-image-overrides-mainfix4.json').catch(() => ({ metadata: { version: 'none', source: 'none' }, overrides: {} }))
    ]);
    return mergeOverridePayloads(basePayload, extraPayload);
  } catch {
    return { metadata: { version: 'none', source: 'none' }, overrides: {} };
  }
}
async function loadCredits() {
  try {
    const [basePayload, extraPayload] = await Promise.all([
      loadJson('data/wikimedia-image-credits.json').catch(() => ({ metadata: { version: 'none', source: 'none' }, credits: {} })),
      Promise.resolve({ metadata: { version: 'none', source: 'none' }, credits: {} })
    ]);
    return mergeCreditsPayloads(basePayload, extraPayload);
  } catch {
    return { metadata: { version: 'none', source: 'none' }, credits: {} };
  }
}
async function loadSpeciesLayers() {
  const payloads = await Promise.all(
    SPECIES_PATHS.map(async (path) => {
      try {
        return await loadJson(path);
      } catch (error) {
        throw new Error(`Core species layer failed: ${path} — ${error.message || error}`);
      }
    })
  );
  return payloads.reduce(
    (merged, payload) => mergeSpeciesPayloads(merged, payload),
    { metadata: { version: 'none', source: 'none' }, records: [] }
  );
}
async function loadReferences() {
  try { return await loadJson('data/references-mainfix15.json'); }
  catch { return []; }
}
function applyOverrides(payload, overridePayload) {
  const overrides = overridePayload?.overrides || {};
  const records = (payload.records || []).map(record => {
    const override = findOverrideForRecord(record, overrides);
    if (!override) return sanitizeRecord(record);
    return sanitizeRecord({ ...record, images: Array.isArray(override.images) ? override.images : (record.images || []) });
  });
  return {
    ...payload,
    metadata: {
      ...(payload.metadata || {}),
      app_version: APP_VERSION,
      image_override_layer: overridePayload?.metadata?.version || 'none',
      image_override_source: overridePayload?.metadata?.source || 'none'
    },
    records
  };
}
export async function loadLocalData() {
  const [speciesPayload, overridePayload, creditsPayload, references] = await Promise.all([
    loadSpeciesLayers(),
    loadOverrides(),
    loadCredits(),
    loadReferences()
  ]);
  const applied = applyOverrides(speciesPayload, overridePayload);
  return { ...applied, creditsPayload, references };
}
export async function loadSupabaseData() {
  const cfg = window.FORAGING_APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase?.createClient) throw new Error('Supabase config missing');
  const localPayload = await loadLocalData();
  const refBySlug = new Map((localPayload.records || []).map(record => [record.slug, record]));
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const { data, error } = await client.from(TABLE_NAME).select('species_slug,display_name,common_name,category,culinary_uses,medicinal_uses,notes,months_available,source_links,image_paths').order('display_name', { ascending: true });
  if (error) throw error;
  const seen = new Set();
  const supabaseRecords = (data || []).map(row => {
    const ref = refBySlug.get(row.species_slug) || {};
    seen.add(row.species_slug);
    const mergedImages = [...new Set([...(row.image_paths || []), ...(ref.images || [])])];
    const mergedLinks = sanitizeLinks([...(row.source_links || []), ...(ref.links || [])]);
    return sanitizeRecord({
      ...ref,
      slug: row.species_slug,
      display_name: row.display_name || ref.display_name || row.common_name || ref.common_name || row.species_slug,
      common_name: row.common_name || ref.common_name || row.display_name || ref.display_name || '',
      category: row.category || ref.category || '',
      scientific_name: ref.scientific_name || '',
      culinary_uses: row.culinary_uses || ref.culinary_uses || '',
      medicinal_uses: row.medicinal_uses || ref.medicinal_uses || '',
      notes: row.notes || ref.notes || '',
      months_available: row.months_available || ref.months_available || [],
      links: mergedLinks,
      images: mergedImages
    });
  });
  const localOnlyRecords = (localPayload.records || []).filter(record => !seen.has(record.slug)).map(sanitizeRecord);
  const payload = {
    metadata: {
      project: 'Upper Michigan Foraging Guide',
      version: APP_VERSION,
      source: 'Supabase + unified local species layers + Wikimedia override layer'
    },
    records: [...supabaseRecords, ...localOnlyRecords]
  };
  const applied = applyOverrides(payload, await loadOverrides());
  return { ...applied, creditsPayload: localPayload.creditsPayload, references: localPayload.references || [] };
}
export async function loadOverridePayload() {
  const [overridePayload, creditsPayload, references] = await Promise.all([loadOverrides(), loadCredits(), loadReferences()]);
  return { ...overridePayload, creditsPayload, references };
}
