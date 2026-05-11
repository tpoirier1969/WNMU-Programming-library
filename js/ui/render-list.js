import { classifyRecord, cleanUserFacingText, isBuildNoteText } from "../lib/merge.js?v=v4.2.40-r2026-04-27-list-lookalike-cleanup1";
import { esc } from "../lib/escape.js";
import { renderImageSlot } from "../lib/image-slot.js";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const PLANT_FILTER_DEFS = [
  { key: "plantMonth", label: "Season", blankLabel: "Any season", valueKey: "month" },
  { key: "plantPart", label: "Part / clue", blankLabel: "Any part", valueKey: "plantPart" },
  { key: "plantHabitat", label: "Habitat", blankLabel: "Any habitat", valueKey: "plantHabitat" },
  { key: "plantSize", label: "Size", blankLabel: "Any size", valueKey: "plantSize" },
  { key: "plantTaste", label: "Taste", blankLabel: "Any taste", valueKey: "plantTaste" },
  { key: "plantFlowerColor", label: "Flower color", blankLabel: "Any flower color", valueKey: "plantFlowerColor" },
  { key: "plantFruitColor", label: "Fruit color", blankLabel: "Any fruit color", valueKey: "plantFruitColor" },
  { key: "plantLeafShape", label: "Leaf shape", blankLabel: "Any leaf shape", valueKey: "plantLeafShape" },
  { key: "plantLeafArrangement", label: "Leaf arrangement", blankLabel: "Any leaf arrangement", valueKey: "plantLeafArrangement" },
  { key: "plantStem", label: "Stem / surface", blankLabel: "Any stem clue", valueKey: "plantStem" }
];

const GILLED_MUSHROOM_FILTER_DEFS = [
  { key: "mushroomMonth", label: "Season", blankLabel: "Any season", valueKey: "month" },
  { key: "mushroomHabitat", label: "Habitat / setting", blankLabel: "Any habitat/setting", valueKey: "mushroomHabitat" },
  { key: "mushroomSubstrate", label: "Growing on / from", blankLabel: "Any growing context", valueKey: "mushroomSubstrate" },
  { key: "mushroomTreeType", label: "Tree type", blankLabel: "Any tree type", valueKey: "mushroomTreeType" },
  { key: "mushroomHost", label: "Host tree", blankLabel: "Any host tree", valueKey: "mushroomHost" },
  { key: "mushroomUnderside", label: "Gills / underside", blankLabel: "Any gill/underside clue", valueKey: "mushroomUnderside" },
  { key: "mushroomRing", label: "Ring", blankLabel: "Any ring", valueKey: "mushroomRing" },
  { key: "mushroomTexture", label: "Texture", blankLabel: "Any texture", valueKey: "mushroomTexture" },
  { key: "mushroomSmell", label: "Smell", blankLabel: "Any smell", valueKey: "mushroomSmell" },
  { key: "mushroomStaining", label: "Staining", blankLabel: "Any staining", valueKey: "mushroomStaining" },
  { key: "mushroomCapSurface", label: "Cap surface", blankLabel: "Any cap surface", valueKey: "mushroomCapSurface" },
  { key: "mushroomStemFeature", label: "Stem feature", blankLabel: "Any stem feature", valueKey: "mushroomStemFeature" }
];

const BOLETE_FILTER_DEFS = [
  { key: "mushroomReviewFlag", label: "Data review", blankLabel: "Any review state", valueKey: "mushroomReviewFlag" },
  { key: "mushroomBoleteGroup", label: "Quick ID group", blankLabel: "Any quick group", valueKey: "boleteQuickGroup" },
  { key: "mushroomHabitat", label: "Habitat / setting", blankLabel: "Any habitat/setting", valueKey: "mushroomHabitat" },
  { key: "mushroomTreeAssociation", label: "Tree association", blankLabel: "Any tree association", valueKey: "boleteTreeAssociation" },
  { key: "mushroomSubstrate", label: "Growing from", blankLabel: "Any growing context", valueKey: "mushroomSubstrate" },
  { key: "mushroomPoreColor", label: "Pore color", blankLabel: "Any pore color", valueKey: "boletePoreColor" },
  { key: "mushroomStaining", label: "Bruising / staining", blankLabel: "Any bruising/staining", valueKey: "boleteStaining" },
  { key: "mushroomTaste", label: "Taste clue (spit out)", blankLabel: "Any taste clue", valueKey: "boleteTaste" },
  { key: "mushroomCapSurface", label: "Cap feel / surface", blankLabel: "Any cap clue", valueKey: "boleteCapSurface" },
  { key: "mushroomStemFeature", label: "Stem clues", blankLabel: "Any stem clue", valueKey: "boleteStemFeature" }
];

const OTHER_MUSHROOM_FILTER_DEFS = [
  { key: "mushroomMonth", label: "Season", blankLabel: "Any season", valueKey: "month" },
  { key: "mushroomHabitat", label: "Habitat / setting", blankLabel: "Any habitat/setting", valueKey: "mushroomHabitat" },
  { key: "mushroomUnderside", label: "Form / underside", blankLabel: "Any form/underside", valueKey: "mushroomUnderside" },
  { key: "mushroomSubstrate", label: "Growing on / from", blankLabel: "Any growing context", valueKey: "mushroomSubstrate" },
  { key: "mushroomTreeType", label: "Tree type", blankLabel: "Any tree type", valueKey: "mushroomTreeType" },
  { key: "mushroomHost", label: "Host tree", blankLabel: "Any host tree", valueKey: "mushroomHost" },
  { key: "mushroomTexture", label: "Texture", blankLabel: "Any texture", valueKey: "mushroomTexture" },
  { key: "mushroomSmell", label: "Smell", blankLabel: "Any smell", valueKey: "mushroomSmell" },
  { key: "mushroomStaining", label: "Staining", blankLabel: "Any staining", valueKey: "mushroomStaining" },
  { key: "mushroomCapSurface", label: "Surface", blankLabel: "Any surface", valueKey: "mushroomCapSurface" }
];

const SKIP_OPTION_VALUES = new Set(["", "unknown", "needs-review", "needs review", "review_required", "n/a", "not sure"]);
const MISSING_FILTER_VALUE = "__missing__";
const MISSING_FILTER_LABEL = "Not recorded / needs review";
const REVIEW_FLAG_SEASON = "__review__:season";
const REVIEW_FLAG_SUBSTRATE = "__review__:substrate";
const REVIEW_FLAG_HOST = "__review__:host";
const REVIEW_FLAG_STAINING = "__review__:staining";
const REVIEW_FLAG_FOOD_QUALITY = "__review__:food_quality";
const REVIEW_FLAG_PHOTOS_SOURCES = "__review__:photos_sources";
const REVIEW_FLAG_LABELS = new Map([
  [REVIEW_FLAG_SEASON, "Needs season review"],
  [REVIEW_FLAG_SUBSTRATE, "Needs substrate review"],
  [REVIEW_FLAG_HOST, "Needs host/tree review"],
  [REVIEW_FLAG_STAINING, "Needs bruising/staining review"],
  [REVIEW_FLAG_FOOD_QUALITY, "Needs food-quality review"],
  [REVIEW_FLAG_PHOTOS_SOURCES, "Needs photos/sources"]
]);
const TREE_TYPE_RE = /\b(hardwood|softwood|conifer|coniferous|deciduous|broadleaf|mixed woods?)\b/i;

const MISSING_REVIEW_LABELS_BY_VALUE_KEY = new Map([
  ["mushroomSubstrate", "Needs substrate review"],
  ["mushroomTreeType", "Tree association not recorded / needs review"],
  ["mushroomHost", "Associated tree not recorded / needs review"],
  ["mushroomStaining", "Bruising/staining not recorded / needs review"],
  ["mushroomPoreColor", "Pore color not recorded / needs review"],
  ["month", "Season not recorded / needs review"]
]);

function missingLabelForFilter(fieldOrDef = {}) {
  return MISSING_REVIEW_LABELS_BY_VALUE_KEY.get(fieldOrDef.valueKey) || MISSING_FILTER_LABEL;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return [value];
}

function nestedValue(source, path) {
  return path.reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), source);
}

function collectValues(record, paths = []) {
  return paths.flatMap((path) => asList(nestedValue(record, path)));
}

function normalizeOption(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

function cleanOptionValues(values = []) {
  return values
    .flatMap((value) => asList(value))
    .map(normalizeOption)
    .filter((value) => value && !SKIP_OPTION_VALUES.has(value.toLowerCase()));
}

function hasLikelyDefaultSeason(record) {
  const precision = String(record.weekPrecision || record.week_precision || record.season_confidence || "").toLowerCase();
  if (precision.includes("needs-review") || precision.includes("needs review")) return true;

  const reviewReasons = [
    ...asList(record.reviewReasons),
    ...asList(record.review_reasons),
    ...asList(record.manual_review_reasons)
  ].join(" ").toLowerCase();
  if (reviewReasons.includes("needs species-level") || reviewReasons.includes("needs source links")) return true;

  const auditText = [
    record.notes,
    record.general_notes,
    record.culinary_uses,
    record.mushroom_profile?.summary,
    ...asList(record.mushroom_profile?.research_notes)
  ].join(" ");
  return isBuildNoteText(auditText);
}

function monthValues(record) {
  if (hasLikelyDefaultSeason(record)) return [];
  const names = cleanOptionValues(record.months_available);
  const fromSeasonMonths = asList(record.season_months)
    .map((value) => MONTHS[Number(value) - 1] || "")
    .filter(Boolean);
  const fromMonthNumbers = asList(record.month_numbers)
    .map((value) => MONTHS[Number(value) - 1] || "")
    .filter(Boolean);
  return cleanOptionValues([...names, ...fromSeasonMonths, ...fromMonthNumbers]);
}

function treeTypeValues(record) {
  const candidates = cleanOptionValues([
    ...collectValues(record, [["treeType"], ["wood_type"], ["mushroom_profile", "wood_type"]]),
    ...collectValues(record, [["host_filter_tokens"], ["mushroom_profile", "host_filter_tokens"]])
  ]);
  return candidates.filter((value) => TREE_TYPE_RE.test(value));
}

function hostTreeValues(record) {
  const candidates = cleanOptionValues([
    ...collectValues(record, [["hostTree"], ["host_trees"], ["mushroom_profile", "host_trees"]]),
    ...collectValues(record, [["host_filter_tokens"], ["mushroom_profile", "host_filter_tokens"]])
  ]);
  return candidates.filter((value) => !TREE_TYPE_RE.test(value));
}

const HARDWOOD_TREE_PATTERNS = [
  [/\bash\b/i, "Hardwood — Ash"],
  [/\baspen\b|\bpoplar\b/i, "Hardwood — Aspen / poplar"],
  [/\bbirch\b/i, "Hardwood — Birch"],
  [/\bbeech\b/i, "Hardwood — Beech"],
  [/\boak\b/i, "Hardwood — Oak"],
  [/\bmaple\b/i, "Hardwood — Maple"],
  [/\bhickory\b/i, "Hardwood — Hickory"]
];

const SOFTWOOD_TREE_PATTERNS = [
  [/\bpine\b/i, "Softwood / conifer — Pine"],
  [/\bhemlock\b/i, "Softwood / conifer — Hemlock"],
  [/\bspruce\b/i, "Softwood / conifer — Spruce"],
  [/\bfir\b/i, "Softwood / conifer — Fir"],
  [/\blarch\b|\btamarack\b/i, "Softwood / conifer — Larch / tamarack"]
];

function anyText(record = {}) {
  return [
    record.slug,
    record.display_name,
    record.common_name,
    record.scientific_name,
    record.mushroom_family,
    ...asList(record.boleteGroup),
    ...asList(record.boleteSubgroup),
    ...collectValues(record, [["pore_color"], ["mushroom_profile", "pore_color"]]),
    ...collectValues(record, [["staining"], ["mushroom_profile", "staining"]]),
    ...collectValues(record, [["cap_surface"], ["mushroom_profile", "cap_surface"]]),
    ...collectValues(record, [["stem_feature"], ["mushroom_profile", "stem_feature"]]),
    ...collectValues(record, [["substrate"], ["mushroom_profile", "substrate"]]),
    ...collectValues(record, [["host_filter_tokens"], ["mushroom_profile", "host_filter_tokens"]])
  ].join(" ").toLowerCase();
}

function hasAny(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function broadValuesFromText(values = [], rules = []) {
  const hay = cleanOptionValues(values).join(" | ").toLowerCase();
  const out = [];
  for (const [pattern, label] of rules) {
    if (pattern.test(hay)) out.push(label);
  }
  return [...new Set(out)];
}

function withoutGenericBoleteDefaults(values = []) {
  return cleanOptionValues(values).filter((value) => {
    const text = value.toLowerCase();
    return text !== "dry to slightly tacky"
      && text !== "smooth to netted stem"
      && text !== "smooth to finely reticulate stem"
      && text !== "whitish to yellow pores"
      && text !== "pores or odd pore surface";
  });
}

function boleteQuickGroupValues(record) {
  const text = anyText(record);
  const out = [];
  if (/suillus|slippery jack|butterball|chicken-fat|larch suillus|glandular dots/.test(text)) {
    out.push("Suillus / slippery jacks");
  }
  if (/leccinum|scaber/.test(text)) {
    out.push("Scaber-stalk boletes");
  }
  if (/porcini|king bolete|boletus separans|variipes|auripes|subcaerulescens|boletus atkinsonii/.test(text)) {
    out.push("King / porcini-type boletes");
  }
  if (/tylopilus|bitter|pink-pored|pinkish pores|caloboletus/.test(text)) {
    out.push("Bitter / pink-pored boletes");
  }
  if (/red-pored|red pores|orange-red|red\s*\/\s*orange|red-staining|red staining|lurid|frostii|sensibilis|subvelutipes|bicolor|baorangia|exsudoporus|butyriboletus|blue staining \/ caution/.test(text)) {
    out.push("Red/orange-pored caution boletes");
  }
  if (/parasitic|earthball|ash-tree|ash tree|boletinellus|buchwaldoboletus|wood-inhabiting|dead wood|fungus-associated|old man|strobilomyces|shaggy/.test(text)) {
    out.push("Oddballs / wood / parasitic boletes");
  }
  if (!out.length) out.push("Other brown/yellow-pored boletes");
  return [...new Set(out)];
}

function boleteTreeAssociationValues(record) {
  const values = cleanOptionValues([
    ...collectValues(record, [["wood_type"], ["mushroom_profile", "wood_type"]]),
    ...collectValues(record, [["host_trees"], ["mushroom_profile", "host_trees"]]),
    ...collectValues(record, [["host_filter_tokens"], ["mushroom_profile", "host_filter_tokens"]])
  ]);
  const hay = values.join(" | ").toLowerCase();
  const out = [];
  if (/hardwood|deciduous|broadleaf|ash|aspen|poplar|birch|beech|oak|maple|hickory/.test(hay)) out.push("Hardwood");
  if (/softwood|conifer|pine|hemlock|spruce|fir|larch|tamarack/.test(hay)) out.push("Softwood / conifer");
  for (const [pattern, label] of HARDWOOD_TREE_PATTERNS) {
    if (pattern.test(hay)) out.push(label);
  }
  for (const [pattern, label] of SOFTWOOD_TREE_PATTERNS) {
    if (pattern.test(hay)) out.push(label);
  }
  return [...new Set(out)];
}

function boletePoreColorValues(record) {
  return broadValuesFromText(withoutGenericBoleteDefaults(collectValues(record, [["poreColor"], ["pore_color"], ["mushroom_profile", "pore_color"]])), [
    [/pink|rose/, "Pinkish"],
    [/red|orange/, "Red / orange"],
    [/yellow|white|whitish|cream|pale/, "White / yellow"],
    [/brown|gray|grey|black|dark|olive/, "Gray / brown / dark"]
  ]);
}

function boleteStainingValues(record) {
  return broadValuesFromText(collectValues(record, [["staining"], ["mushroom_profile", "staining"]]), [
    [/blue/, "Blue bruising"],
    [/green/, "Green staining"],
    [/brown|gray|grey|black/, "Brown / gray / dark staining"],
    [/red|reddish|rose|pink/, "Red / pink staining"],
    [/none|not notable|no notable/, "No notable bruising"],
    [/yellow/, "Yellow staining"]
  ]);
}

function boleteCapSurfaceValues(record) {
  return broadValuesFromText(withoutGenericBoleteDefaults(collectValues(record, [["capSurface"], ["cap_surface"], ["mushroom_profile", "cap_surface"]])), [
    [/sticky|slimy|viscid|tacky|glutinous/, "Sticky / slimy"],
    [/dry/, "Dry"],
    [/crack|areolate/, "Cracked"],
    [/velvet|suede|tomentose|hairy/, "Velvety / suede"],
    [/scaly|shaggy|rough/, "Scaly / shaggy"],
    [/smooth/, "Smooth"]
  ]);
}

function boleteStemFeatureValues(record) {
  return broadValuesFromText(withoutGenericBoleteDefaults(collectValues(record, [["stemFeature"], ["stem_feature"], ["mushroom_profile", "stem_feature"]])), [
    [/scaber|rough dots/, "Scabers / rough dots"],
    [/netted|reticulate/, "Netting"],
    [/glandular/, "Glandular dots"],
    [/ring|annulus/, "Ring"],
    [/hollow|brittle/, "Hollow / brittle"],
    [/smooth/, "Smooth"],
    [/no real stem|sessile|no stem/, "No real stem"]
  ]);
}

function boleteTasteValues(record) {
  return broadValuesFromText(collectValues(record, [["taste"], ["mushroom_profile", "taste"]]), [
    [/bitter/, "Bitter"],
    [/mild|not distinctive|pleasant/, "Mild / not distinctive"],
    [/pepper|acrid|hot/, "Peppery / acrid"],
    [/sweet|nutty|rich/, "Pleasant / nutty"]
  ]);
}

function mushroomHabitatValues(record = {}) {
  const values = [
    ...collectValues(record, [["habitats"], ["habitat"], ["habitat_detail"]]),
    ...collectValues(record, [["mushroom_profile", "substrate"], ["mushroom_profile", "season_note"]]),
    record.notes,
    record.general_notes
  ];
  const hay = values.join(" | ").toLowerCase();
  const out = [];
  if (/forest|woods|woodland|hardwood|conifer|pine|oak|birch|aspen|hemlock|mixed woods?/.test(hay)) out.push("Forest / woods");
  if (/lawn|yard|grass|turf/.test(hay)) out.push("Lawn / yard");
  if (/meadow|field|pasture|prairie|open area/.test(hay)) out.push("Meadow / field");
  if (/swamp|bog|marsh|wetland|wet woods|sphagnum/.test(hay)) out.push("Swamp / wetland");
  if (/burn|fire|charred/.test(hay)) out.push("Burn area");
  if (/roadside|disturbed|mulch|wood chips|garden|compost/.test(hay)) out.push("Disturbed / human-influenced");
  if (/dead wood|log|stump|standing dead|wood|branch/.test(hay)) out.push("Dead wood / logs / stumps");
  if (/living tree|wounded|base of|trunk/.test(hay)) out.push("Living or wounded tree");
  return [...new Set(out)];
}

function hasImageCoverage(record = {}) {
  return asList(record.images_structured).length > 0
    || !!String(record.list_thumbnail || "").trim()
    || asList(record.detail_images).length > 0
    || asList(record.enlarge_images).length > 0
    || asList(record.images).length > 0;
}

function hasSourceLinks(record = {}) {
  return asList(record.links).length > 0 || asList(record.use_links).length > 0;
}

function reviewText(record = {}) {
  return [
    ...asList(record.reviewReasons),
    ...asList(record.review_reasons),
    ...asList(record.manual_review_reasons),
    record.notes,
    record.general_notes,
    record.culinary_uses,
    record.mushroom_profile?.summary,
    ...asList(record.mushroom_profile?.research_notes)
  ].join(" ").toLowerCase();
}

function hasBuildAuditSignals(record = {}) {
  const text = reviewText(record);
  return text.includes("needs species-level")
    || text.includes("needs source links")
    || text.includes("seed entry")
    || text.includes("audit pass")
    || text.includes("clean app")
    || isBuildNoteText(text);
}

function reviewFlagValues(record) {
  const flags = [];
  const substrateValues = cleanOptionValues(collectValues(record, [["substrate"], ["mushroom_profile", "substrate"]]));
  const treeType = treeTypeValues(record);
  const hostTree = hostTreeValues(record);
  const staining = cleanOptionValues(collectValues(record, [["staining"], ["mushroom_profile", "staining"]]));
  const foodQuality = String(record.food_quality || "").trim();

  if (hasLikelyDefaultSeason(record)) flags.push(REVIEW_FLAG_SEASON);
  if (substrateValues.length === 0) flags.push(REVIEW_FLAG_SUBSTRATE);
  if (treeType.length === 0 && hostTree.length === 0) flags.push(REVIEW_FLAG_HOST);
  if (staining.length === 0) flags.push(REVIEW_FLAG_STAINING);
  if (!foodQuality || hasBuildAuditSignals(record)) flags.push(REVIEW_FLAG_FOOD_QUALITY);
  if (!hasImageCoverage(record) || !hasSourceLinks(record) || reviewText(record).includes("needs image coverage")) flags.push(REVIEW_FLAG_PHOTOS_SOURCES);

  return flags;
}

function valuesForFilter(record, valueKey) {
  switch (valueKey) {
    case "month": return monthValues(record);
    case "plantPart": return cleanOptionValues(collectValues(record, [["observedPart"], ["parts_used"], ["plant_parts"], ["category"], ["foraging_class"]]));
    case "plantHabitat": return cleanOptionValues(collectValues(record, [["habitats"], ["habitat"]]));
    case "plantSize": return cleanOptionValues(collectValues(record, [["size"]]));
    case "plantTaste": return cleanOptionValues(collectValues(record, [["taste"]]));
    case "plantFlowerColor": return cleanOptionValues(collectValues(record, [["flowerColor"], ["flower_color"]]));
    case "plantFruitColor": return cleanOptionValues(collectValues(record, [["fruitColor"], ["fruit_color"], ["berryColor"], ["berry_color"]]));
    case "plantLeafShape": return cleanOptionValues(collectValues(record, [["leafShape"], ["leaf_shape"]]));
    case "plantLeafArrangement": return cleanOptionValues(collectValues(record, [["leafArrangement"], ["leaf_arrangement"]]));
    case "plantStem": return cleanOptionValues(collectValues(record, [["stemSurface"], ["stem_surface"], ["stemShape"], ["stem_shape"], ["leafPointCount"]]));
    case "mushroomReviewFlag": return reviewFlagValues(record);
    case "boleteQuickGroup": return boleteQuickGroupValues(record);
    case "boleteTreeAssociation": return boleteTreeAssociationValues(record);
    case "boletePoreColor": return boletePoreColorValues(record);
    case "boleteStaining": return boleteStainingValues(record);
    case "boleteCapSurface": return boleteCapSurfaceValues(record);
    case "boleteStemFeature": return boleteStemFeatureValues(record);
    case "boleteTaste": return boleteTasteValues(record);
    case "mushroomHabitat": return mushroomHabitatValues(record);
    case "mushroomSubstrate": return cleanOptionValues(collectValues(record, [["substrate"], ["mushroom_profile", "substrate"]]));
    case "mushroomTreeType": return treeTypeValues(record);
    case "mushroomHost": return hostTreeValues(record);
    case "mushroomUnderside": return cleanOptionValues(collectValues(record, [["underside"], ["mushroom_profile", "underside"], ["mushroom_profile", "underside_type"], ["mushroom_profile", "fertile_surface"]]));
    case "mushroomRing": return cleanOptionValues(collectValues(record, [["ring"], ["mushroom_profile", "ring"]]));
    case "mushroomTexture": return cleanOptionValues(collectValues(record, [["texture"], ["mushroom_profile", "texture"]]));
    case "mushroomSmell": return cleanOptionValues(collectValues(record, [["smell"], ["odor"], ["mushroom_profile", "smell"], ["mushroom_profile", "odor"]]));
    case "mushroomStaining": return cleanOptionValues(collectValues(record, [["staining"], ["mushroom_profile", "staining"]]));
    case "mushroomCapSurface": return cleanOptionValues(collectValues(record, [["capSurface"], ["cap_surface"], ["mushroom_profile", "cap_surface"]]));
    case "mushroomStemFeature": return cleanOptionValues(collectValues(record, [["stemFeature"], ["stem_feature"], ["mushroom_profile", "stem_feature"]]));
    case "mushroomBoleteGroup": return cleanOptionValues(collectValues(record, [["boleteGroup"], ["mushroom_family"]]));
    case "mushroomBoleteSubgroup": return cleanOptionValues(collectValues(record, [["boleteSubgroup"]]));
    case "mushroomPoreColor": return cleanOptionValues(collectValues(record, [["poreColor"], ["pore_color"], ["mushroom_profile", "pore_color"]]));
    default: return [];
  }
}

function filterDefinitionsForRoute(route) {
  if (route === "plants") return PLANT_FILTER_DEFS;
  if (route === "mushrooms-gilled") return GILLED_MUSHROOM_FILTER_DEFS;
  if (route === "boletes") return BOLETE_FILTER_DEFS;
  if (route === "mushrooms-other") return OTHER_MUSHROOM_FILTER_DEFS;
  return [];
}

function displayOptionValue(value, fieldOrDef = {}) {
  if (value === MISSING_FILTER_VALUE) return missingLabelForFilter(fieldOrDef);
  if (REVIEW_FLAG_LABELS.has(value)) return REVIEW_FLAG_LABELS.get(value);
  return value;
}

function sortOptions(values, valueKey = "") {
  const unique = [...new Set(cleanOptionValues(values))];
  return unique.sort((a, b) => {
    if (REVIEW_FLAG_LABELS.has(a) && !REVIEW_FLAG_LABELS.has(b)) return 1;
    if (REVIEW_FLAG_LABELS.has(b) && !REVIEW_FLAG_LABELS.has(a)) return -1;
    if (a === MISSING_FILTER_VALUE) return 1;
    if (b === MISSING_FILTER_VALUE) return -1;
    if (valueKey === "month") return MONTHS.indexOf(a) - MONTHS.indexOf(b);
    return displayOptionValue(a).localeCompare(displayOptionValue(b));
  });
}

function matchesTraitFiltersExcept(record, route, filters = {}, exceptKey = "") {
  const defs = filterDefinitionsForRoute(route);
  if (!defs.length) return true;
  return defs.every((def) => {
    if (def.key === exceptKey) return true;
    const selected = String(filters?.[def.key] || "").trim();
    if (!selected) return true;
    const values = valuesForFilter(record, def.valueKey);
    if (selected === MISSING_FILTER_VALUE) return values.length === 0;
    return values.includes(selected);
  });
}

export function getFilterFieldsForRoute(records, route, filters = {}) {
  const defs = filterDefinitionsForRoute(route);
  if (!defs.length) return [];
  const baseRecords = (records || []).filter((record) => !record?.hidden && routeMatch(record, route));
  return defs.map((def) => {
    const selected = String(filters?.[def.key] || "").trim();
    const recordsForThisField = baseRecords.filter((record) => matchesTraitFiltersExcept(record, route, filters, def.key));
    const counts = new Map();
    let missingCount = 0;

    for (const record of recordsForThisField) {
      const values = [...new Set(valuesForFilter(record, def.valueKey))];
      if (!values.length) {
        missingCount += 1;
        continue;
      }
      values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    }

    const values = sortOptions([...counts.keys()], def.valueKey);
    const options = values.map((value) => ({
      value,
      label: `${displayOptionValue(value, def)} (${counts.get(value) || 0})`
    }));

    if (missingCount > 0 && def.valueKey !== "mushroomReviewFlag") {
      options.push({ value: MISSING_FILTER_VALUE, label: `${missingLabelForFilter(def)} (${missingCount})` });
    }

    if (selected && !options.some((option) => option.value === selected)) {
      options.push({
        value: selected,
        label: `${displayOptionValue(selected, def)} (0)`
      });
    }

    return { ...def, options };
  }).filter((field) => field.options.length > 0 || String(filters?.[field.key] || "").trim());
}

export function hasActiveTraitFilters(route, filters = {}) {
  return filterDefinitionsForRoute(route).some((def) => !!filters?.[def.key]);
}

function hasFilterValueMissing(record, valueKey) {
  return valuesForFilter(record, valueKey).length === 0;
}

function hasSeasonReviewFlag(record) {
  return hasLikelyDefaultSeason(record);
}

function dataQualityTags(record, route = "general") {
  const tags = [];
  if (route === "boletes") {
    reviewFlagValues(record).forEach((flag) => {
      const label = REVIEW_FLAG_LABELS.get(flag);
      if (label) tags.push(label);
    });
    return tags;
  }
  if (["mushrooms-gilled", "mushrooms-other"].includes(route) && hasSeasonReviewFlag(record)) {
    tags.push("Season needs review");
  }
  return tags;
}

function labelTag(label, value, className = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  const cls = className ? `tag ${className}` : "tag";
  return `<span class="${cls}">${esc(label)}: ${esc(text)}</span>`;
}

function laneLabel(record = {}) {
  const lane = String(record.lane || "").toLowerCase();
  if (lane === "gilled") return "Gilled";
  if (lane === "bolete") return "Pores / spongy underside";
  if (lane === "other") return "Other form";
  return String(record.lane || "");
}

function seasonSummary(record = {}) {
  const months = monthValues(record);
  if (months.length) {
    if (months.length === 1) return months[0];
    return `${months[0]}–${months[months.length - 1]}`;
  }
  const note = String(record.mushroom_profile?.season_note || record.season_note || "").trim();
  if (/spring/i.test(note)) return "Spring";
  if (/summer.*fall|late summer.*fall/i.test(note)) return "Late summer–fall";
  if (/summer/i.test(note)) return "Summer";
  if (/fall|autumn/i.test(note)) return "Fall";
  if (/year-round|year round|perennial/i.test(note)) return "Year-round";
  return "Needs review";
}

function makeMeta(record, route = "general") {
  const info = classifyRecord(record);
  const edibleUse = record.edible_use || null;
  const bits = [];
  if (record.record_type === "mushroom") {
    bits.push(labelTag("Type", laneLabel(record)));
  } else if (record.foraging_class) {
    bits.push(labelTag("Type", String(record.foraging_class).replaceAll("_", " ")));
  } else if (record.category) {
    bits.push(labelTag("Type", record.category));
  }
  if (route === "other-uses" && info.otherUses) bits.push(`<span class="tag">Other use</span>`);
  if ((route === "lookalikes" || route === "caution") && info.caution) bits.push(`<span class="tag danger">Caution</span>`);
  if (record.commonness) bits.push(labelTag("Commonality", record.commonness));
  bits.push(labelTag("Season", seasonSummary(record)));
  if (record.food_quality) bits.push(labelTag("Food quality", record.food_quality, "good"));
  if (edibleUse?.has_ingestible_use && /tea|infusion|beverage/i.test(edibleUse.method || "")) {
    bits.push(`<span class="tag good">Tea / infusion</span>`);
  }
  if (record.non_edible_severity && !edibleUse?.has_ingestible_use) bits.push(`<span class="tag danger">${esc(record.non_edible_severity)}</span>`);
  dataQualityTags(record, route).forEach((label) => bits.push(`<span class="tag review">${esc(label)}</span>`));
  if (record.review_status === "needs_review") bits.push(`<span class="tag review">Needs review</span>`);
  return bits.filter(Boolean).join("");
}

function matchesSearch(record, q) {
  const rare = record.rare_profile || {};
  const medicinal = record.medicinal || {};
  const hay = [
    record.display_name,
    record.common_name,
    ...(record.common_names || []),
    record.scientific_name,
    record.slug,
    record.category,
    record.foraging_class,
    record.overview,
    record.field_identification,
    record.culinary_uses,
    record.medicinal_uses,
    medicinal.summary,
    record.other_uses,
    record.notes,
    record.general_notes,
    record.edibility_notes,
    record.edibility_detail,
    record.commonness,
    rare.reason,
    rare.field_marks,
    rare.care_note,
    record.danger_level,
    record.poisoning_effects,
    record.toxicity_notes,
    ...(record.search_aliases || []),
    ...(record.reviewReasons || []),
    ...(record.look_alikes || []),
    ...(record.confused_with || []),
    ...(record.medicinalAction || []),
    ...(record.medicinalSystem || []),
    ...(record.medicinalTerms || []),
    ...(record.affected_systems || []),
    ...(rare.key_features || [])
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function arrayHas(valueList, selected) {
  if (!selected) return true;
  return asList(valueList).includes(selected);
}

function normalizeFilters(filtersOrSearch) {
  if (typeof filtersOrSearch === "string") {
    return {
      search: filtersOrSearch,
      medicinalAction: "",
      medicinalSystem: "",
      medicinalTerm: ""
    };
  }
  return {
    search: filtersOrSearch?.search || "",
    medicinalAction: filtersOrSearch?.medicinalAction || "",
    medicinalSystem: filtersOrSearch?.medicinalSystem || "",
    medicinalTerm: filtersOrSearch?.medicinalTerm || "",
    plantMonth: filtersOrSearch?.plantMonth || "",
    plantPart: filtersOrSearch?.plantPart || "",
    plantHabitat: filtersOrSearch?.plantHabitat || "",
    plantSize: filtersOrSearch?.plantSize || "",
    plantTaste: filtersOrSearch?.plantTaste || "",
    plantFlowerColor: filtersOrSearch?.plantFlowerColor || "",
    plantFruitColor: filtersOrSearch?.plantFruitColor || "",
    plantLeafShape: filtersOrSearch?.plantLeafShape || "",
    plantLeafArrangement: filtersOrSearch?.plantLeafArrangement || "",
    plantStem: filtersOrSearch?.plantStem || "",
    mushroomMonth: filtersOrSearch?.mushroomMonth || "",
    mushroomHabitat: filtersOrSearch?.mushroomHabitat || "",
    mushroomSubstrate: filtersOrSearch?.mushroomSubstrate || "",
    mushroomTreeType: filtersOrSearch?.mushroomTreeType || "",
    mushroomHost: filtersOrSearch?.mushroomHost || "",
    mushroomUnderside: filtersOrSearch?.mushroomUnderside || "",
    mushroomRing: filtersOrSearch?.mushroomRing || "",
    mushroomTexture: filtersOrSearch?.mushroomTexture || "",
    mushroomSmell: filtersOrSearch?.mushroomSmell || "",
    mushroomStaining: filtersOrSearch?.mushroomStaining || "",
    mushroomCapSurface: filtersOrSearch?.mushroomCapSurface || "",
    mushroomStemFeature: filtersOrSearch?.mushroomStemFeature || "",
    mushroomBoleteGroup: filtersOrSearch?.mushroomBoleteGroup || "",
    mushroomBoleteSubgroup: filtersOrSearch?.mushroomBoleteSubgroup || "",
    mushroomPoreColor: filtersOrSearch?.mushroomPoreColor || "",
    mushroomReviewFlag: filtersOrSearch?.mushroomReviewFlag || "",
    mushroomTreeAssociation: filtersOrSearch?.mushroomTreeAssociation || "",
    mushroomTaste: filtersOrSearch?.mushroomTaste || "",
    sortSpecies: filtersOrSearch?.sortSpecies || "default"
  };
}

function matchesMedicinalFilters(record, filters) {
  return arrayHas(record.medicinalAction, filters.medicinalAction)
    && arrayHas(record.medicinalSystem, filters.medicinalSystem)
    && arrayHas(record.medicinalTerms, filters.medicinalTerm);
}

function matchesTraitFilters(record, route, filters) {
  const defs = filterDefinitionsForRoute(route);
  if (!defs.length) return true;
  return defs.every((def) => {
    const selected = String(filters?.[def.key] || "").trim();
    if (!selected) return true;
    const values = valuesForFilter(record, def.valueKey);
    if (selected === MISSING_FILTER_VALUE) return values.length === 0;
    return values.includes(selected);
  });
}

function routeMatch(record, route) {
  const info = classifyRecord(record);
  if (route === "plants") return info.isPlant && info.edible;
  if (route === "mushrooms-gilled") return info.isMushroom && info.edible && record.lane === "gilled";
  if (route === "boletes") return info.isMushroom && info.edible && record.lane === "bolete";
  if (route === "mushrooms-other") return info.isMushroom && info.edible && record.lane === "other";
  if (route === "medicinal") return info.medicinal;
  if (route === "lookalikes") return info.caution;
  if (route === "caution") return info.caution;
  if (route === "other-uses") return info.otherUses;
  if (route === "review") return record.review_status === "needs_review";
  return true;
}

export function filterRecords(records, route, filtersOrSearch = "") {
  const filters = normalizeFilters(filtersOrSearch);
  const q = String(filters.search || "").trim().toLowerCase();
  return (records || []).filter((record) => {
    if (record.hidden) return false;
    const matchRoute = route === "search" ? "general" : route;
    if (!routeMatch(record, matchRoute)) return false;
    if (route === "medicinal" && !matchesMedicinalFilters(record, filters)) return false;
    if (!matchesTraitFilters(record, matchRoute, filters)) return false;
    if (!q) return true;
    return matchesSearch(record, q);
  });
}

function cardSnippet(record) {
  const rare = record.rare_profile || {};
  const candidates = [
    record.overview,
    record.field_identification,
    record.culinary_uses,
    record.other_uses,
    record.poisoning_effects,
    record.toxicity_notes,
    record.edibility_notes,
    record.edibility_detail,
    rare.reason,
    record.notes,
    record.general_notes,
    record.habitat_detail
  ];
  for (const value of candidates) {
    const text = cleanUserFacingText(value);
    if (!text) continue;
    if (isBuildNoteText(text)) continue;
    if (/^(Food use|Food\/beverage use):\s*Food\.?\s*$/i.test(text)) continue;
    if (/^Food\.?\s*This entry carried caution/i.test(text)) continue;
    return text.replace(/^Food\/beverage use:\s*/i, "Food use: ");
  }
  return "";
}

function cardSnippetHtml(record) {
  const snippet = cardSnippet(record).slice(0, 260);
  return snippet ? `<p>${esc(snippet)}</p>` : "";
}

function displayName(record = {}) {
  return String(record.display_name || record.common_name || record.slug || "").toLowerCase();
}

function scoreFromText(value = "", map = new Map()) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  for (const [needle, score] of map.entries()) {
    if (text.includes(needle)) return score;
  }
  return null;
}

const COMMONNESS_TEXT_SCORES = new Map([
  ["abundant", 5],
  ["very common", 5],
  ["common", 4],
  ["occasional", 3],
  ["uncommon", 2],
  ["rare", 1],
  ["scattered", 2]
]);

const FOOD_QUALITY_TEXT_SCORES = new Map([
  ["choice", 5],
  ["excellent", 5],
  ["very good", 4],
  ["good", 4],
  ["fair", 3],
  ["okay", 3],
  ["poor", 2],
  ["not recommended", 1],
  ["questionable", 1]
]);

function numericScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function commonnessScore(record = {}) {
  return numericScore(record.commonness_score)
    ?? scoreFromText(record.commonness, COMMONNESS_TEXT_SCORES)
    ?? -1;
}

function foodQualityScore(record = {}) {
  const explicit = numericScore(record.food_quality_score)
    ?? scoreFromText(record.food_quality, FOOD_QUALITY_TEXT_SCORES);
  if (explicit !== null) return explicit;

  const tasteText = asList(record.taste).join(" ").toLowerCase();
  if (/sweet|rich|nutty|floral|minty|aromatic|pleasant|mild/.test(tasteText)) return 3;
  if (/bitter|astringent|acrid|mealy|bland|sour/.test(tasteText)) return 2;
  return -1;
}

function earliestSeasonIndex(record = {}) {
  const months = monthValues(record);
  if (!months.length) return 99;
  const positions = months
    .map((month) => MONTHS.indexOf(month))
    .filter((index) => index >= 0);
  return positions.length ? Math.min(...positions) : 99;
}

function seasonLabel(record = {}) {
  const months = monthValues(record);
  if (!months.length) return "zzz";
  return months.join(" ").toLowerCase();
}

function compareByName(a, b) {
  return displayName(a).localeCompare(displayName(b));
}

export function sortRecords(records = [], sortKey = "default") {
  const key = String(sortKey || "default");
  const list = [...records];
  if (key === "default") return list;

  return list.sort((a, b) => {
    if (key === "name") return compareByName(a, b);
    if (key === "commonness") {
      const diff = commonnessScore(b) - commonnessScore(a);
      return diff || compareByName(a, b);
    }
    if (key === "foodQuality") {
      const diff = foodQualityScore(b) - foodQualityScore(a);
      return diff || compareByName(a, b);
    }
    if (key === "season") {
      const diff = earliestSeasonIndex(a) - earliestSeasonIndex(b);
      return diff || seasonLabel(a).localeCompare(seasonLabel(b)) || compareByName(a, b);
    }
    return compareByName(a, b);
  });
}

export function renderRecordCards(records, route = "general") {
  if (!records.length) return `<section class="panel empty-state"><h3>No matches</h3></section>`;
  return `<section class="record-list">${records.map((record) => `
    <article class="record-card with-image">
      ${renderImageSlot(record, "card")}
      <div class="record-card-body">
        <h3><button class="record-title-button" type="button" data-detail="${esc(record.slug)}">${esc(record.display_name || record.common_name || record.slug || "Untitled")}</button></h3>
        <p class="muted small">${esc(record.scientific_name || "")}</p>
        <div class="record-meta">${makeMeta(record, route)}</div>
        ${cardSnippetHtml(record)}
        <div class="control-row">
          <button class="primary" type="button" data-detail="${esc(record.slug)}">Open details</button>
          ${record.review_status === "needs_review" ? `<button class="warn" type="button" data-review-action="mark-ok" data-slug="${esc(record.slug)}">Mark OK</button>` : ""}
          ${route !== "review" && record.review_status !== "needs_review" ? `<button class="subtle" type="button" data-review-action="send-review" data-slug="${esc(record.slug)}">Send to Needs Review</button>` : ""}
        </div>
      </div>
    </article>
  `).join("")}</section>`;
}
