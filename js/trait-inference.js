import { VOCAB } from "./vocabulary.js";

function inferMulti(text, entries) {
  const out = [];
  const lower = text.toLowerCase();
  for (const entry of entries) {
    const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
    if (terms.some(term => lower.includes(term))) out.push(entry.label);
  }
  return [...new Set(out)];
}

function canonicalizeList(values, entries, { keepUnknown = false } = {}) {
  const out = [];
  for (const raw of values || []) {
    const lower = String(raw || '').trim().toLowerCase();
    if (!lower) continue;
    let matched = false;
    for (const entry of entries) {
      const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
      if (terms.some(term => lower === term || lower.includes(term) || term.includes(lower))) {
        out.push(entry.label);
        matched = true;
      }
    }
    if (!matched && keepUnknown) out.push(String(raw).trim());
  }
  return [...new Set(out)];
}

function inferHostTrees(text) {
  const lower = text.toLowerCase();
  const matches = VOCAB.mushrooms.hostTrees.filter(entry => {
    const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
    return terms.some(term => lower.includes(term));
  });
  return {
    labels: [...new Set(matches.map(entry => entry.label))],
    broadTypes: [...new Set(matches.map(entry => entry.broadType === "hardwood" ? "Hardwood" : entry.broadType === "conifer" ? "Conifer / softwood" : "Mixed / unknown wood").filter(Boolean))]
  };
}

function inferMedicinalTerms(text) {
  return inferMulti(text, VOCAB.medicinal.symptoms);
}

function mergeUnique(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

function explicitList(record, path, fallback = []) {
  const val = path.split(".").reduce((acc, key) => acc?.[key], record);
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return fallback;
}

export function inferTraits(record) {
  const text = [
    record.display_name,
    record.common_name,
    record.category,
    record.culinary_uses,
    record.medicinal_uses,
    record.notes,
    record.scientific_name,
    record.mushroom_profile?.summary,
    ...(record.mushroom_profile?.research_notes || [])
  ].join(" ").toLowerCase();

  const hostInfo = inferHostTrees(text);
  const explicitHabitat = canonicalizeList(explicitList(record, "habitat"), VOCAB.common.habitats, { keepUnknown: true });
  const explicitObservedPart = canonicalizeList(explicitList(record, "observedPart"), VOCAB.common.observedParts, { keepUnknown: true });
  const explicitSize = canonicalizeList(explicitList(record, "size"), VOCAB.common.sizes, { keepUnknown: true });
  const explicitTasteCommon = canonicalizeList(explicitList(record, "taste"), VOCAB.common.tastes, { keepUnknown: true });
  const explicitMedicinalAction = canonicalizeList(explicitList(record, "medicinalAction"), VOCAB.medicinal.actions, { keepUnknown: true });
  const explicitMedicinalSystem = canonicalizeList(explicitList(record, "medicinalSystem"), VOCAB.medicinal.bodySystems, { keepUnknown: true });
  const explicitMedicinalTerms = canonicalizeList(explicitList(record, "medicinalTerms"), VOCAB.medicinal.symptoms, { keepUnknown: true });

  const explicitHostTree = canonicalizeList(
    explicitList(record, "mushroom_profile.host_trees").filter(label => !["Hardwood (general)", "Conifer (general)", "Hardwood litter", "Conifer litter", "Roots of umbellifers in native Eurasian range"].includes(label)),
    VOCAB.mushrooms.hostTrees
  );
  const explicitWoodTypes = canonicalizeList(explicitList(record, "mushroom_profile.wood_type"), VOCAB.mushrooms.woodTypes);
  const explicitSubstrate = canonicalizeList(explicitList(record, "mushroom_profile.substrate"), VOCAB.mushrooms.substrates, { keepUnknown: false });
  const explicitRing = canonicalizeList(explicitList(record, "mushroom_profile.ring"), VOCAB.mushrooms.ringStates);
  const explicitUnderside = canonicalizeList(explicitList(record, "mushroom_profile.underside"), VOCAB.mushrooms.undersideTypes);
  const explicitTexture = canonicalizeList(explicitList(record, "mushroom_profile.texture"), VOCAB.mushrooms.textures);
  const explicitSmell = canonicalizeList(explicitList(record, "mushroom_profile.odor"), VOCAB.mushrooms.odors);
  const explicitStaining = canonicalizeList(explicitList(record, "mushroom_profile.staining"), VOCAB.mushrooms.stainingColors);
  const explicitTasteMushroom = canonicalizeList(explicitList(record, "mushroom_profile.taste"), VOCAB.common.tastes);

  const traits = {
    habitat: mergeUnique(explicitHabitat, inferMulti(text, VOCAB.common.habitats)),
    observedPart: mergeUnique(explicitObservedPart, inferMulti(text, VOCAB.common.observedParts)),
    size: mergeUnique(explicitSize, inferMulti(text, VOCAB.common.sizes)),
    taste: mergeUnique(explicitTasteCommon, explicitTasteMushroom, inferMulti(text, VOCAB.common.tastes)),
    substrate: [],
    treeType: [],
    hostTree: [],
    ring: [],
    underside: [],
    texture: [],
    smell: [],
    staining: [],
    medicinalAction: mergeUnique(explicitMedicinalAction, inferMulti(text, VOCAB.medicinal.actions)),
    medicinalSystem: mergeUnique(explicitMedicinalSystem, inferMulti(text, VOCAB.medicinal.bodySystems)),
    medicinalTerms: mergeUnique(explicitMedicinalTerms, inferMedicinalTerms(text))
  };

  if (record.category === "Mushroom") {
    traits.substrate = mergeUnique(explicitSubstrate, inferMulti(text, VOCAB.mushrooms.substrates));
    const broadWoodTypes = inferMulti(text, VOCAB.mushrooms.woodTypes);
    const explicitHostBroad = explicitHostTree.map(tree => {
      const found = VOCAB.mushrooms.hostTrees.find(entry => entry.label === tree);
      return found?.broadType === "hardwood" ? "Hardwood" : found?.broadType === "conifer" ? "Conifer / softwood" : "Mixed / unknown wood";
    }).filter(Boolean);
    traits.treeType = mergeUnique(explicitWoodTypes, broadWoodTypes, hostInfo.broadTypes);
    traits.hostTree = mergeUnique(explicitHostTree, hostInfo.labels);
    traits.ring = mergeUnique(explicitRing, inferMulti(text, VOCAB.mushrooms.ringStates));
    traits.underside = mergeUnique(explicitUnderside, inferMulti(text, VOCAB.mushrooms.undersideTypes));
    traits.texture = mergeUnique(explicitTexture, inferMulti(text, VOCAB.mushrooms.textures));
    traits.smell = mergeUnique(explicitSmell, inferMulti(text, VOCAB.mushrooms.odors));
    traits.staining = mergeUnique(explicitStaining, inferMulti(text, VOCAB.mushrooms.stainingColors));
  }

  const reviewReasons = [];
  if (!record.images?.length) reviewReasons.push("missing image");
  if (!traits.habitat.length && record.category !== "Mushroom") reviewReasons.push("habitat needs detail");
  if (record.category === "Mushroom" && !traits.substrate.length) reviewReasons.push("substrate needs detail");
  if ((record.medicinal_uses || "").trim() && !traits.medicinalTerms.length && !traits.medicinalAction.length) reviewReasons.push("medicinal tagging needs detail");
  if (record.weekPrecision === "needs_check" || record.timing_review_status === "needs_check") reviewReasons.push("week timing needs check");
  for (const reason of (record.manual_review_reasons || [])) reviewReasons.push(reason);

  return {
    ...traits,
    reviewReasons: [...new Set(reviewReasons)],
    weekPrecision: record.weekPrecision || "month-window-reviewed"
  };
}

export function uniqueTraitValues(records, key) {
  const vals = new Set();
  for (const rec of records) for (const item of rec[key] || []) vals.add(item);
  return [...vals].sort((a,b) => a.localeCompare(b));
}
