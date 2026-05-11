function uniq(values) {
  return [...new Set((values || []).filter(v => v !== undefined && v !== null && String(v).trim() !== ""))];
}

function mergeArrays(a, b) {
  return uniq([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
}

function slugifyFallback(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function derivedName(record) {
  return record.display_name || record.common_name || record.title || record.name || slugifyFallback(record.slug).replace(/-/g, " ");
}

function mergeOne(base, overlay) {
  const out = { ...base, ...overlay };
  const arrayKeys = [
    "months_available","links","images","look_alikes","lookalikes","habitat","observedPart","size","taste",
    "substrate","treeType","hostTree","ring","texture","smell","staining","medicinalAction",
    "medicinalSystem","medicinalTerms","reviewReasons","flowerColor","leafShape","leafArrangement",
    "stemSurface","leafPointCount","boleteGroup","boleteSubgroup","poreColor","stemFeature","affected_systems"
  ];
  for (const key of arrayKeys) {
    if (base[key] || overlay[key]) out[key] = mergeArrays(base[key], overlay[key]);
  }
  if (base.mushroom_profile || overlay.mushroom_profile) {
    out.mushroom_profile = { ...(base.mushroom_profile || {}), ...(overlay.mushroom_profile || {}) };
  }
  if (!out.slug) {
    out.slug = slugifyFallback(out.display_name || out.common_name || out.scientific_name || out.title || out.name);
  }
  if (!out.display_name) {
    out.display_name = derivedName(out)
      .split(" ")
      .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
      .join(" ");
  }
  return out;
}

export function mergeRecordLayers(...payloads) {
  const bySlug = new Map();
  for (const payload of payloads) {
    const records = Array.isArray(payload?.records) ? payload.records : [];
    for (const record of records) {
      const slug = record.slug || slugifyFallback(record.display_name || record.common_name || record.scientific_name);
      const existing = bySlug.get(slug) || {};
      bySlug.set(slug, mergeOne(existing, { ...record, slug }));
    }
  }
  return [...bySlug.values()].sort((a, b) => String(a.display_name || "").localeCompare(String(b.display_name || "")));
}

export function classifyRecord(record) {
  const category = String(record.category || "").trim();
  const isMushroom = category.toLowerCase() === "mushroom";
  const plantCategories = new Set(["Fruit","Green","Flower","Root","Tree Product","Green / Tubers"]);
  const isPlant = plantCategories.has(category);
  const medicinal = !!String(record.medicinal_uses || "").trim()
    || record.primary_use === "medicinal"
    || record.food_role === "medicinal_only";
  const lookalike = !!String(record.non_edible_severity || "").trim()
    || ["avoid","emergency_only","tea_extract_only"].includes(String(record.food_role || "").trim());
  return { isMushroom, isPlant, medicinal, lookalike };
}
