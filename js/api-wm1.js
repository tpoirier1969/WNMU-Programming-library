import { APP_VERSION, TABLE_NAME } from "./constants-wm1.js";

async function loadOverrides() {
  try {
    const response = await fetch("data/wikimedia-image-overrides-wm1.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Override load failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.info("Wikimedia override layer unavailable for this run:", error?.message || error);
    return { overrides: {} };
  }
}

function applyOverrides(payload, overridePayload) {
  const overrides = overridePayload?.overrides || {};
  const records = (payload.records || []).map(record => {
    const override = overrides[record.slug];
    if (!override) return record;
    return {
      ...record,
      images: Array.isArray(override.images) ? override.images : (record.images || [])
    };
  });

  return {
    ...payload,
    metadata: {
      ...(payload.metadata || {}),
      app_version: APP_VERSION,
      image_override_layer: overridePayload?.metadata?.version || "none",
      image_override_source: overridePayload?.metadata?.source || "none"
    },
    records
  };
}

export async function loadLocalData() {
  const [response, overridePayload] = await Promise.all([
    fetch("data/species.json", { cache: "no-store" }),
    loadOverrides()
  ]);
  if (!response.ok) throw new Error(`Local JSON load failed: ${response.status}`);
  const payload = await response.json();
  return applyOverrides(payload, overridePayload);
}

export async function loadSupabaseData() {
  const cfg = window.FORAGING_APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase?.createClient) {
    throw new Error("Supabase config missing");
  }

  const [localPayload, overridePayload] = await Promise.all([
    loadLocalData(),
    loadOverrides()
  ]);
  const refBySlug = new Map((localPayload.records || []).map(record => [record.slug, record]));

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("species_slug,display_name,common_name,category,culinary_uses,medicinal_uses,notes,months_available,source_links,image_paths")
    .order("display_name", { ascending: true });
  if (error) throw error;

  const payload = {
    metadata: {
      project: "Upper Michigan Foraging Guide",
      version: APP_VERSION,
      source: "Supabase + local reference merge + Wikimedia override layer"
    },
    records: (data || []).map(row => {
      const ref = refBySlug.get(row.species_slug) || {};
      const mergedImages = [...new Set([...(row.image_paths || []), ...(ref.images || [])])];
      const mergedLinks = [...new Set([...(row.source_links || []), ...(ref.links || [])])];
      return {
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
      };
    })
  };

  return applyOverrides(payload, overridePayload);
}
