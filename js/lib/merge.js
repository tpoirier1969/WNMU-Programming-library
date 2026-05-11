function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [value];
}

function uniq(values) {
  return [...new Set(ensureArray(values).filter(v => v !== undefined && v !== null && String(v).trim() !== ""))];
}

function mergeArrays(a, b) {
  return uniq([...ensureArray(a), ...ensureArray(b)]);
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

function normalizeMedicinalText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PLACEHOLDER_MEDICINAL_PATTERNS = [
  /^primarily culinary\.?$/,
  /^mostly culinary\.?$/,
  /^mainly culinary\.?$/,
  /^primarily culinary curiosity\.?$/,
  /^minimal food-medicine importance(?: in this context)?\.?$/,
  /^mostly of curiosity or minor traditional interest rather than a major local food species\.?$/,
  /^mostly culinary, though related species are used in traditional food-medicine contexts\.?$/,
  /traditional interest still being compiled/,
  /detailed copyback is still pending/,
  /related use context/
];

const CURATION_NOTE_PATTERNS = [
  /original app (?:species|mushroom|plant)? ?(?:entry )?restored/i,
  /restored into the standalone/i,
  /standalone(?: modular)? build/i,
  /detailed .* still (?:being copied back|need(?:s)? copied back|pending)/i,
  /consolidated to one .* entry/i,
  /merged under .* current build/i,
  /seed entry only/i,
  /minimal species seed/i,
  /species seed added/i,
  /added during .* audit/i,
  /added during .* pass/i,
  /added from .* audit/i,
  /added in the .* pass/i,
  /added in .* pass/i,
  /plant expansion pass/i,
  /mushroom expansion pass/i,
  /edible and medicinal species/i,
  /added in .* upper michigan/i,
  /upper michigan edible and medicinal species/i,
  /plant expansion/i,
  /mushroom expansion/i,
  /expansion pass/i,
  /expansion pass for upper michigan/i,
  /added as .* clean app/i,
  /added as .* species page/i,
  /added as the true .* record/i,
  /audit pass/i,
  /audited batch/i,
  /baseline audit/i,
  /clean app/i,
  /copyback .* pending/i,
  /current build/i,
  /needs image coverage/i,
  /needs source links/i,
  /needs species-level/i,
  /still needs species-level/i,
  /still need(?:s)? (?:a )?later review/i,
  /still need(?:s)? review/i,
  /still need(?:s)? fuller/i,
  /details, seasonality, and images still need/i,
  /fuller id notes, sources, and images still need/i,
  /core field-guide traits are now scaffolded/i,
  /scaffolded for sorting/i,
  /placeholder/i,
  /review text/i,
  /being copied back/i,
  /true .* page rather than/i,
  /baseline .* commonness, food quality/i,
  /this entry carried caution, non[- ]edible, or safety significance/i,
  /this entry carried caution/i,
  /recreated locally/i,
  /baseline checklist/i,
  /(?:plant|mushroom|bolete|russula|suillus|leccinum|tylopilus|boletus)[- ]type entry/i,
  /entry[^.!?]{0,80}(?:restored|standalone|modular|baseline|checklist|copyback|review|audit)/i,
  /(?:large|small|short|long)[- ](?:stemmed|capped)[^.!?]{0,40}entry/i,
  /migration/i,
  /sidecar/i,
  /copyback/i,
  /curation/i,
  /build-process/i,
  /admin/i
];

const FORAGING_CLASS_MAP = new Map([
  ["fruit", "fruit"],
  ["green", "green"],
  ["flower", "flower"],
  ["root", "root"],
  ["seed", "seed"],
  ["tree product", "tree_product"],
  ["green / tubers", "green"],
  ["mushroom", "mushroom"]
]);

const OTHER_USE_KEYWORDS = /\b(artist|art|draw|drawing|scratch|scratched|tinder|fire ?starter|kindling|dye|dyestuff|pigment|ink|fiber|fibre|cordage|rope|twine|basket|weav|craft|tool|utility|polish|stain|smudge|resin|pitch|glue|adhesive|soap|container|whistle|broom|brush|mat|thatch|fungus paper|amadou)\b/i;

// Food-list eligibility is deliberately narrower than "can be ingested".
// Medicinal-only tinctures, extracts, and decoctions should stay medicinal, not edible.
const FOOD_USE_KEYWORDS = /\b(tea|infusion|beverage|drink|drunk|steep|steeped|brew|brewed|broth|soup|syrup|sap|edible|eat|eaten|food|culinary|consume|consumed|chew|chewed|cooked|cook|boiled|boil|fried|sautéed|sauteed|baked|roasted|prepared)\b/i;
const DIRECT_FOOD_USE_DANGER = /\b(do not|don't|never|avoid|unsafe|toxic|poisonous|poison|deadly|fatal|dangerous)\b[^.!?]{0,60}\b(consume|eat|drink|tea|infusion|chew|food)\b|\b(consume|eat|drink|tea|infusion|chew|food)\b[^.!?]{0,60}\b(do not|don't|never|avoid|unsafe|toxic|poisonous|poison|deadly|fatal|dangerous)\b/i;
const MEDICINAL_ONLY_PREPARATION_CONTEXT = /\b(medicinal|medicinally|medicine|remedy|therapeutic|tincture|extract|decoction|poultice|salve|tonic|dose|dosage|capsule|supplement|pharmacolog|clinical|anti-inflammatory|antimicrobial|antiviral|immune|urinary|respiratory|digestive support)\b/i;

const FOOD_USE_METHODS = [
  { label: "Tea / infusion", pattern: /\b(tea|infusion|steep|steeped|brew|brewed)\b/i },
  { label: "Cooked food", pattern: /\b(cooked|cook|boiled|boil|fried|sautéed|sauteed|baked|roasted|prepared)\b/i },
  { label: "Sap / syrup", pattern: /\b(sap|syrup)\b/i },
  { label: "Broth / soup", pattern: /\b(broth|soup|stock)\b/i },
  { label: "Beverage", pattern: /\b(beverage|drink|drunk)\b/i },
  { label: "Food", pattern: /\b(edible|eat|eaten|food|culinary|consume|consumed|chew|chewed)\b/i }
];

const PREPARATION_REQUIRED_PATTERN = /\b(cook|cooked|boil|boiled|bake|baked|roast|roasted|fry|fried|sauté|saute|steep|steeped|brew|brewed|tea|infusion|dry|dried|process|processed|prepare|prepared|only after|not raw|raw|uncooked)\b/i;
const CONDITIONAL_DANGER_PATTERN = /\b(raw|uncooked|under.?cooked|must be cooked|only cooked|cooked thoroughly|properly prepared|prepared correctly|after cooking|when cooked|boiled|parboiled|tea|infusion)\b/i;
const NEGATIVE_FOOD_CONTEXT = /\b(too tough to eat|not (?:used|eaten|treated) as (?:an )?(?:edible|food)|not (?:an )?edible(?: species| entry)?|not a food|not food|not recommended as food|not recommended as a substitute food|avoid eating|do not eat|don't eat|never eat|unsafe to eat|inedible)\b/i;

export function isPlaceholderMedicinalText(value) {
  const normalized = normalizeMedicinalText(value);
  return !!normalized && PLACEHOLDER_MEDICINAL_PATTERNS.some(pattern => pattern.test(normalized));
}

export function hasRealMedicinalText(value) {
  const normalized = normalizeMedicinalText(value);
  return !!normalized && !isPlaceholderMedicinalText(normalized);
}

export function isBuildNoteText(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return !!normalized && CURATION_NOTE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function splitIntoSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function cleanUserFacingText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (!isBuildNoteText(text)) return text;
  const cleaned = splitIntoSentences(text)
    .filter(sentence => !isBuildNoteText(sentence))
    .join(" ")
    .trim();
  return cleaned && !isBuildNoteText(cleaned) ? cleaned : "";
}

function firstUserFacingText(...values) {
  for (const value of values) {
    const text = cleanUserFacingText(value);
    if (text) return text;
  }
  return '';
}

function deriveKingdomType(record, category = "") {
  const explicit = String(record.kingdom_type || record.record_type || record.primary_type || "").trim().toLowerCase();
  if (explicit === "plant" || explicit === "mushroom") return explicit;
  return category.toLowerCase() === "mushroom" ? "mushroom" : "plant";
}

function deriveForagingClass(record, category = "") {
  const explicit = String(record.foraging_class || "").trim().toLowerCase();
  if (explicit) return explicit.replace(/\s+/g, "_");
  const mapped = FORAGING_CLASS_MAP.get(category.toLowerCase());
  return mapped || "";
}

function deriveCommonNames(record) {
  return uniq([
    ...ensureArray(record.common_names),
    ...ensureArray(record.common_name),
    ...ensureArray(record.display_name)
  ]);
}

function deriveSeasonMonths(record) {
  const explicit = uniq(record.season_months)
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 12);
  if (explicit.length) return explicit;

  const legacy = uniq(record.month_numbers)
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 12);
  if (legacy.length) return legacy;

  return [];
}

function deriveHabitats(record) {
  return uniq(record.habitats?.length ? record.habitats : record.habitat);
}

function deriveLookAlikes(record) {
  return uniq([
    ...ensureArray(record.look_alikes),
    ...ensureArray(record.lookalikes),
    ...ensureArray(record.confused_with)
  ]);
}

function deriveRareProfile(record) {
  if (record.rare_profile && typeof record.rare_profile === "object") {
    return {
      status: cleanUserFacingText(record.rare_profile.status),
      legal_status: cleanUserFacingText(record.rare_profile.legal_status),
      up_relevance: cleanUserFacingText(record.rare_profile.up_relevance),
      sensitive_location: record.rare_profile.sensitive_location === true,
      reason: cleanUserFacingText(record.rare_profile.reason),
      field_marks: cleanUserFacingText(record.rare_profile.field_marks),
      care_note: cleanUserFacingText(record.rare_profile.care_note),
      key_features: uniq(record.rare_profile.key_features).map(cleanUserFacingText).filter(Boolean)
    };
  }

  const profile = {
    status: cleanUserFacingText(record.status),
    legal_status: cleanUserFacingText(record.legal_status),
    up_relevance: cleanUserFacingText(record.up_relevance),
    sensitive_location: record.sensitive_location === true,
    reason: cleanUserFacingText(record.reason),
    field_marks: cleanUserFacingText(record.field_marks),
    care_note: cleanUserFacingText(record.care_note),
    key_features: uniq(record.key_features).map(cleanUserFacingText).filter(Boolean)
  };

  const hasAny = profile.status || profile.legal_status || profile.up_relevance || profile.sensitive_location
    || profile.reason || profile.field_marks || profile.care_note || profile.key_features.length;
  return hasAny ? profile : null;
}

function deriveMedicinal(record) {
  if (record.medicinal && typeof record.medicinal === "object") {
    const existing = record.medicinal;
    const actions = uniq(existing.actions);
    const bodySystems = uniq(existing.body_systems);
    const medicalTerms = uniq(existing.medical_terms);
    const claims = Array.isArray(existing.claims) ? existing.claims : [];
    const summary = hasRealMedicinalText(existing.summary) ? cleanUserFacingText(existing.summary) : "";
    const preparationNotes = cleanUserFacingText(existing.preparation_notes);
    const warnings = cleanUserFacingText(existing.warnings);
    const hasMeaningful = existing.has_meaningful_content === true
      || !!summary
      || actions.length > 0
      || bodySystems.length > 0
      || medicalTerms.length > 0
      || claims.length > 0
      || !!preparationNotes
      || !!warnings;

    return {
      has_meaningful_content: hasMeaningful,
      summary,
      evidence_tier: String(existing.evidence_tier || "").trim(),
      actions,
      body_systems: bodySystems,
      medical_terms: medicalTerms,
      parts_used: uniq(existing.parts_used),
      preparation_notes: preparationNotes,
      warnings,
      claims
    };
  }

  const actions = uniq(record.medicinalAction);
  const bodySystems = uniq(record.medicinalSystem);
  const medicalTerms = uniq(record.medicinalTerms);
  const summary = hasRealMedicinalText(record.medicinal_uses) ? cleanUserFacingText(record.medicinal_uses) : "";
  const hasMeaningful = !!summary
    || actions.length > 0
    || bodySystems.length > 0
    || medicalTerms.length > 0
    || record.primary_use === "medicinal"
    || record.food_role === "medicinal_only";

  return {
    has_meaningful_content: hasMeaningful,
    summary,
    evidence_tier: "",
    actions,
    body_systems: bodySystems,
    medical_terms: medicalTerms,
    parts_used: [],
    preparation_notes: "",
    warnings: "",
    claims: []
  };
}

function deriveUseLinks(record) {
  if (Array.isArray(record.use_links)) return record.use_links;
  const links = Array.isArray(record.links) ? record.links : [];
  return links
    .map((item) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url) return null;
        return {
          label: url,
          url,
          link_type: "general_reference",
          applies_to_part: "",
          source_quality: "",
          notes: ""
        };
      }
      if (!item || typeof item !== "object") return null;
      const url = String(item.url || item.href || "").trim();
      if (!url) return null;
      return {
        label: String(item.label || item.title || url).trim(),
        url,
        link_type: String(item.link_type || "general_reference").trim(),
        applies_to_part: String(item.applies_to_part || "").trim(),
        source_quality: String(item.source_quality || "").trim(),
        notes: String(item.notes || "").trim()
      };
    })
    .filter(Boolean);
}


function isFiddleheadFernRecord(record = {}) {
  const hay = [record.slug, record.display_name, record.common_name, record.scientific_name, ...(record.common_names || [])]
    .join(" ")
    .toLowerCase();
  return hay.includes("fiddlehead") || hay.includes("ostrich fern") || hay.includes("matteuccia struthiopteris");
}


function applyKnownRecordFixes(record = {}) {

  if (isFiddleheadFernRecord(record)) {
    const commonNames = uniq([
      "Fiddlehead Ferns",
      "Ostrich fern fiddleheads",
      "Ostrich Fern",
      ...(record.common_names || [])
    ]);
    const edibleNote = "Only ostrich fern fiddleheads are treated here as edible. Clean off the brown papery husk, wash well, then boil for about 15 minutes or steam for 10 to 12 minutes until tender. Discard the cooking water. Do not eat raw or undercooked fiddleheads.";
    const lookNote = "Nearly all ferns have fiddleheads, but not all fiddleheads are edible. Confirm ostrich fern by the smooth stem, deep U-shaped groove, and brown papery scales. Bracken fern is specifically unsafe/not recommended as food, and cinnamon/interrupted fern are common look-alikes that should not be substituted for ostrich fern.";
    return {
      ...record,
      display_name: record.display_name || "Fiddlehead Ferns",
      common_name: record.common_name || "Fiddlehead Ferns",
      common_names: commonNames,
      scientific_name: record.scientific_name || "Matteuccia struthiopteris",
      record_type: "plant",
      primary_type: "plant",
      category: record.category || "Green",
      food_role: "food",
      edibility_status: "edible_with_preparation",
      non_edible_severity: "",
      food_quality: record.food_quality || "Edible when properly cooked",
      culinary_uses: firstUserFacingText(record.culinary_uses, "Young ostrich fern fiddleheads are a spring vegetable after proper cleaning and thorough cooking."),
      edibility_detail: firstUserFacingText(record.edibility_detail, record.edibility_notes, edibleNote),
      field_identification: firstUserFacingText(
        record.field_identification,
        record.identification_tips,
        "Ostrich fern fiddleheads have a smooth green stem with a deep U-shaped groove on the inside and thin brown papery scales on the newly emerging coil. Avoid fuzzy fiddleheads or those without the U-shaped groove."
      ),
      look_alike_risk: "serious",
      look_alike_notes: firstUserFacingText(record.look_alike_notes, lookNote),
      look_alikes: mergeArrays(record.look_alikes, ["Bracken Fern", "Cinnamon Fern", "Interrupted Fern"]),
      use_links: mergeArrays(record.use_links, [
        {
          label: "Health Canada: Food safety tips for fiddleheads",
          url: "https://www.canada.ca/en/health-canada/services/food-safety-fruits-vegetables/fiddlehead-safety-tips.html",
          link_type: "food_safety",
          applies_to_part: "fiddlehead",
          source_quality: "government",
          notes: "Cooking and illness warning."
        },
        {
          label: "University of Maine Extension: Ostrich Fern Fiddleheads",
          url: "https://extension.umaine.edu/publications/2540e/",
          link_type: "identification",
          applies_to_part: "fiddlehead",
          source_quality: "extension",
          notes: "Identification traits and bracken comparison."
        }
      ]),
      edible_use: {
        has_ingestible_use: true,
        method: "Cooked vegetable",
        preparation_required: true,
        notes: edibleNote
      },
      danger_level: "Preparation and misidentification risk",
      poisoning_effects: "Raw or undercooked ostrich fern fiddleheads have been associated with foodborne illness symptoms including nausea, vomiting, diarrhea, abdominal cramps, and headache. Other fern fiddleheads may be unsafe, toxic, or carcinogenic.",
      affected_systems: mergeArrays(record.affected_systems, ["Digestive system"])
    };
  }


  return record;
}

export function getMedicinalData(record = {}) {
  return deriveMedicinal(record);
}

function isTeaOnlyUseText(value = "") {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z/ ]+/g, "");
  return ["tea", "tea only", "nonculinary/tea", "non culinary/tea", "beverage tea"].includes(normalized);
}

function foodUseSentencesFromText(value = "", { allowMedicinalLanguage = false } = {}) {
  const text = cleanUserFacingText(value);
  if (!text) return [];
  if (isTeaOnlyUseText(text)) return ["Usable as tea."];

  return splitIntoSentences(text).filter((sentence) => {
    if (!FOOD_USE_KEYWORDS.test(sentence)) return false;
    if (NEGATIVE_FOOD_CONTEXT.test(sentence) && !CONDITIONAL_DANGER_PATTERN.test(sentence)) return false;
    if (DIRECT_FOOD_USE_DANGER.test(sentence) && !CONDITIONAL_DANGER_PATTERN.test(sentence)) return false;
    // Tinctures/decoctions/extracts and explicitly medicinal phrasing are medicinal-use signals,
    // not edible-list signals. Culinary fields can still say "tea" or "cooked" and count.
    if (!allowMedicinalLanguage && MEDICINAL_ONLY_PREPARATION_CONTEXT.test(sentence)) return false;
    return true;
  });
}

function textHasFoodUse(value = "") {
  return foodUseSentencesFromText(value).length > 0;
}

function inferFoodUseMethod(text = "", useTags = []) {
  const hay = `${text} ${useTags.join(" ")}`;
  for (const method of FOOD_USE_METHODS) {
    if (method.pattern.test(hay)) return method.label;
  }
  return "Food / beverage use";
}

// Backward-compatible export name. Despite the older name, this now means FOOD/culinary
// ingestible use only. Medicinal-only ingestion stays in the medicinal section.
export function deriveIngestibleUse(record = {}) {
  const foodRole = normalizedFoodRole(record);
  const useTags = ensureArray(record.use_tags).map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean);

  const foodFieldTexts = [
    record.culinary_uses,
    record.edibility_notes,
    record.edibility_detail
  ];

  // Allow old data to mention tea in other_uses, but do not allow tincture/decoction/extract
  // language to pull medicinal preparations into the edible list.
  const otherUseFoodSentences = foodUseSentencesFromText(record.other_uses, { allowMedicinalLanguage: false });
  const sentences = uniq([
    ...foodFieldTexts.flatMap((text) => foodUseSentencesFromText(text, { allowMedicinalLanguage: true })),
    ...otherUseFoodSentences
  ]);

  const tagImpliesFoodUse = foodRole === "food"
    || foodRole === "tea_extract_only"
    || useTags.includes("E")
    || useTags.includes("TEA")
    || (useTags.includes("T") && !useTags.includes("M"));

  const hasUse = tagImpliesFoodUse || sentences.length > 0;
  const combined = sentences.join(" ");
  const method = hasUse ? inferFoodUseMethod(combined || foodRole, useTags) : "";
  const notes = combined || (foodRole === "tea_extract_only" ? "Usable as tea or food-style infusion when prepared as described for this species." : "");

  return {
    has_ingestible_use: hasUse,
    method,
    preparation_required: PREPARATION_REQUIRED_PATTERN.test(`${combined} ${foodRole}`),
    notes
  };
}

export function hasIngestibleUseContent(record = {}) {
  return deriveIngestibleUse(record).has_ingestible_use === true;
}

function hasAbsoluteDangerLabel(record = {}) {
  const edibility = normalizedEdibilityStatus(record);
  const severity = normalizedNonEdibleSeverity(record);
  const dangerText = [record.danger_level, record.poisoning_effects, record.toxicity_notes].join(" ");
  const dangerHay = `${edibility} ${severity} ${dangerText}`.toLowerCase();

  if (["poisonous", "deadly"].includes(edibility)) return true;
  if (/\b(deadly|fatal|lethal|poisonous)\b/.test(dangerHay)) return true;

  const ingestible = deriveIngestibleUse(record);
  if (ingestible.has_ingestible_use && CONDITIONAL_DANGER_PATTERN.test(`${dangerHay} ${ingestible.notes}`)) {
    return false;
  }

  return isDangerSeverity(`${severity} ${dangerText}`);
}

export function hasMeaningfulOtherUses(record = {}) {
  const direct = cleanUserFacingText(record.other_uses);
  if (direct && !isTeaOnlyUseText(direct)) return true;

  const explicit = [record.practical_uses, record.utility_uses, record.craft_uses, record.fiber_uses, record.tinder_uses]
    .map(cleanUserFacingText)
    .filter(Boolean)
    .join(" ");
  if (explicit && !isTeaOnlyUseText(explicit)) return true;

  const inferredText = [
    cleanUserFacingText(record.overview),
    cleanUserFacingText(record.notes),
    cleanUserFacingText(record.general_notes),
    cleanUserFacingText(record.edibility_notes),
    cleanUserFacingText(record.edibility_detail),
    cleanUserFacingText(record.habitat_detail)
  ].join(" ");

  return OTHER_USE_KEYWORDS.test(inferredText);
}

function normalizedEdibilityStatus(record = {}) {
  return String(record.edibility_status || record.mushroom_profile?.edibility_status || "").trim().toLowerCase();
}

function normalizedFoodRole(record = {}) {
  return String(record.food_role || "").trim().toLowerCase();
}

function normalizedNonEdibleSeverity(record = {}) {
  return String(record.non_edible_severity || "").trim().toLowerCase();
}

function isDangerSeverity(severity = "") {
  const value = String(severity || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("not poisonous") || value.includes("non-poisonous") || value.includes("nonpoisonous")) return false;
  return [
    "poisonous",
    "deadly",
    "toxic",
    "dangerous",
    "fatal",
    "harmful"
  ].some(token => value.includes(token));
}

function isBenignNonCulinarySeverity(severity = "") {
  const value = String(severity || "").trim().toLowerCase();
  if (!value) return false;
  return value.includes("tea") || value.includes("bitter") || value.includes("not poisonous") || value.includes("non-poisonous");
}

export function hasMeaningfulFoodContent(record = {}) {
  const culinary = cleanUserFacingText(record.culinary_uses);
  const notes = cleanUserFacingText(record.edibility_notes || record.edibility_detail);
  const foodQuality = String(record.food_quality || "").trim();
  return !!(culinary || foodQuality || notes || hasIngestibleUseContent(record));
}

export function isEdibleForSection(record = {}) {
  const edibility = normalizedEdibilityStatus(record);
  const foodRole = normalizedFoodRole(record);
  const severity = normalizedNonEdibleSeverity(record);

  // Absolute danger still wins: deadly/poisonous/all-forms-toxic entries are not edible.
  // Conditional danger does NOT win: raw-danger/cooked-safe or tea-only species stay edible
  // and carry preparation notes instead of being mislabeled avoid/inedible.
  if (hasAbsoluteDangerLabel(record)) return false;

  const ingestible = deriveIngestibleUse(record);
  if (ingestible.has_ingestible_use) return true;

  if (["not_edible"].includes(edibility)) return false;
  if (["avoid", "emergency_only", "medicinal_only"].includes(foodRole)) return false;

  if (["edible", "good", "choice", "edible_with_caution", "edible_with_preparation"].includes(edibility)) return true;

  if (isBenignNonCulinarySeverity(severity)) {
    return hasMeaningfulFoodContent(record);
  }

  return hasMeaningfulFoodContent(record);
}

export function isCautionRecord(record = {}) {
  const edibility = normalizedEdibilityStatus(record);
  const foodRole = normalizedFoodRole(record);
  const severity = normalizedNonEdibleSeverity(record);
  const risk = String(record.look_alike_risk || "").trim().toLowerCase();
  const dangerText = [record.danger_level, record.poisoning_effects, record.toxicity_notes].join(" ");

  // Serious look-alike risk belongs in Caution even when the species itself is edible
  // after proper preparation. Fiddleheads are the obvious example: ostrich fern is food,
  // but other fern fiddleheads can make people sick or carry worse risks.
  if (risk === "serious") return true;

  // Otherwise, the Caution page is for genuinely unsafe entries, not edible records with notes.
  if (isEdibleForSection(record)) return false;
  if (foodRole === "tea_extract_only") return false;
  if (isTeaOnlyUseText(record.other_uses)) return false;
  if (isBenignNonCulinarySeverity(severity) && !hasAbsoluteDangerLabel(record)) return false;

  if (hasAbsoluteDangerLabel(record)) return true;
  if (isDangerSeverity(dangerText)) return true;
  if (["poisonous", "deadly"].includes(edibility)) return true;
  if (["emergency_only"].includes(foodRole)) return true;

  return false;
}

function mergeOne(base, overlay) {
  const out = { ...base, ...overlay };
  const arrayKeys = [
    "months_available","links","images","look_alikes","lookalikes","habitat","observedPart","size","taste",
    "substrate","treeType","hostTree","host_filter_tokens","ring","texture","smell","staining","medicinalAction",
    "medicinalSystem","medicinalTerms","reviewReasons","review_reasons","manual_review_reasons","flowerColor","leafShape","leafArrangement",
    "stemSurface","leafPointCount","boleteGroup","boleteSubgroup","poreColor","stemFeature","affected_systems","search_aliases","underside",
    "key_features","common_names","season_months","habitats"
  ];
  for (const key of arrayKeys) {
    if (base[key] !== undefined || overlay[key] !== undefined) out[key] = mergeArrays(base[key], overlay[key]);
  }
  if (base.mushroom_profile || overlay.mushroom_profile) {
    const mergedProfile = { ...(base.mushroom_profile || {}), ...(overlay.mushroom_profile || {}) };
    if (base.mushroom_profile?.underside !== undefined || overlay.mushroom_profile?.underside !== undefined) {
      mergedProfile.underside = mergeArrays(base.mushroom_profile?.underside, overlay.mushroom_profile?.underside);
    }
    if (base.mushroom_profile?.host_filter_tokens !== undefined || overlay.mushroom_profile?.host_filter_tokens !== undefined) {
      mergedProfile.host_filter_tokens = mergeArrays(base.mushroom_profile?.host_filter_tokens, overlay.mushroom_profile?.host_filter_tokens);
    }
    out.mushroom_profile = mergedProfile;
  }
  if (base.bolete_profile || overlay.bolete_profile) {
    out.bolete_profile = { ...(base.bolete_profile || {}), ...(overlay.bolete_profile || {}) };
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

export function normalizeRecord(record) {
  const fixed = applyKnownRecordFixes(record || {});
  const reviewReasons = uniq([
    ...ensureArray(fixed.reviewReasons),
    ...ensureArray(fixed.review_reasons),
    ...ensureArray(fixed.manual_review_reasons)
  ]);
  const category = String(fixed.category || "").trim();
  const kingdom_type = deriveKingdomType(fixed, category);
  const record_type = kingdom_type;
  const underside = uniq([
    ...ensureArray(fixed.mushroom_profile?.underside_type),
    ...ensureArray(fixed.mushroom_profile?.underside),
    ...ensureArray(fixed.underside)
  ]);
  const lane = fixed.mushroom_profile?.lane
    || fixed.lane
    || (record_type === "mushroom"
      ? (underside.some(v => String(v).toLowerCase().includes("pore"))
        ? "bolete"
        : (underside.some(v => String(v).toLowerCase().includes("gill")) ? "gilled" : "other"))
      : "");
  const hostTokens = uniq([
    ...ensureArray(fixed.host_filter_tokens),
    ...ensureArray(fixed.mushroom_profile?.host_filter_tokens)
  ]);
  const commonNames = deriveCommonNames(fixed);
  const rareProfile = deriveRareProfile(fixed);
  const medicinal = deriveMedicinal(fixed);
  const cleanedNotes = cleanUserFacingText(fixed.notes);
  const cleanedGeneralNotes = cleanUserFacingText(fixed.general_notes);
  const cleanedCulinary = cleanUserFacingText(fixed.culinary_uses);
  const cleanedOtherUses = cleanUserFacingText(fixed.other_uses);
  const cleanedEdibility = cleanUserFacingText(fixed.edibility_notes || fixed.edibility_detail);
  const edibleUse = deriveIngestibleUse(fixed);
  const absoluteDanger = hasAbsoluteDangerLabel(fixed);
  const rawFoodRole = normalizedFoodRole(fixed);
  const rawEdibility = normalizedEdibilityStatus(fixed);
  const normalizedFoodRoleValue = edibleUse.has_ingestible_use && !absoluteDanger && ["", "avoid", "medicinal_only", "tea_extract_only"].includes(rawFoodRole)
    ? "ingestible_prepared"
    : (fixed.food_role || "");
  const normalizedEdibilityStatusValue = edibleUse.has_ingestible_use && !absoluteDanger && ["", "not_edible", "review_required"].includes(rawEdibility)
    ? "edible_with_preparation"
    : (fixed.edibility_status || fixed.mushroom_profile?.edibility_status || "");
  const normalizedNonEdibleSeverityValue = edibleUse.has_ingestible_use && !absoluteDanger
    ? ""
    : (fixed.non_edible_severity || "");
  const edibleUseNote = edibleUse.has_ingestible_use
    ? (/^food$/i.test(String(edibleUse.method || ""))
      ? (edibleUse.notes || "")
      : `${edibleUse.method}.${edibleUse.notes ? ` ${edibleUse.notes}` : ""}`)
    : "";
  const normalizedEdibilityNotes = edibleUse.has_ingestible_use && !absoluteDanger
    ? firstUserFacingText(edibleUseNote, cleanedEdibility)
    : cleanedEdibility;
  const edibleUseForDisplay = absoluteDanger
    ? { ...edibleUse, has_ingestible_use: false, method: "", notes: "", preparation_required: false }
    : edibleUse;

  return {
    ...fixed,
    common_names: commonNames,
    common_name: fixed.common_name || commonNames[0] || "",
    kingdom_type,
    record_type,
    species_scope: String(fixed.species_scope || fixed.entry_scope || "").trim() || "species",
    foraging_class: deriveForagingClass(fixed, category),
    field_identification: firstUserFacingText(fixed.field_identification, fixed.identification_tips, fixed.field_marks),
    season_months: deriveSeasonMonths(fixed),
    habitats: deriveHabitats(fixed),
    look_alikes: deriveLookAlikes(fixed),
    look_alike_risk: String(fixed.look_alike_risk || "").trim(),
    look_alike_notes: cleanUserFacingText(fixed.look_alike_notes),
    rare_profile: rareProfile,
    overview: firstUserFacingText(fixed.overview, fixed.short_reason, rareProfile?.reason),
    culinary_uses: cleanedCulinary,
    other_uses: cleanedOtherUses,
    edibility_notes: normalizedEdibilityNotes,
    curation_notes: uniq([
      isBuildNoteText(fixed.short_reason) ? fixed.short_reason : "",
      isBuildNoteText(fixed.notes) ? fixed.notes : "",
      isBuildNoteText(fixed.general_notes) ? fixed.general_notes : "",
      isBuildNoteText(fixed.culinary_uses) ? fixed.culinary_uses : "",
      isBuildNoteText(fixed.other_uses) ? fixed.other_uses : ""
    ]),
    general_notes: cleanedGeneralNotes,
    notes: cleanedNotes,
    lane,
    reviewReasons,
    review_reasons: reviewReasons,
    review_status: fixed.review_status || (reviewReasons.length ? "needs_review" : "ok"),
    search_aliases: uniq(fixed.search_aliases),
    host_filter_tokens: hostTokens,
    commonness: fixed.commonness || fixed.status || "",
    food_quality: edibleUse.has_ingestible_use && !absoluteDanger && (!fixed.food_quality || /not recommended|inedible|avoid/i.test(String(fixed.food_quality))) ? edibleUse.method : (fixed.food_quality || ""),
    food_role: normalizedFoodRoleValue,
    edibility_status: normalizedEdibilityStatusValue,
    non_edible_severity: normalizedNonEdibleSeverityValue,
    edible_use: edibleUseForDisplay,
    medicinal,
    medicinalAction: medicinal.actions,
    medicinalSystem: medicinal.body_systems,
    medicinalTerms: medicinal.medical_terms,
    use_links: deriveUseLinks(fixed),
    months_available: uniq(fixed.months_available),
    habitat: uniq(fixed.habitat)
  };
}

export function classifyRecord(record) {
  const category = String(record.category || "").trim();
  const type = String(record.kingdom_type || record.record_type || "").toLowerCase();
  const isMushroom = type === "mushroom" || category.toLowerCase() === "mushroom";
  const plantCategories = new Set(["Fruit","Green","Flower","Root","Tree Product","Green / Tubers","Seed"]);
  const isPlant = type === "plant" || plantCategories.has(category);
  const medicinalData = getMedicinalData(record);
  const medicinal = medicinalData.has_meaningful_content === true
    || !!String(medicinalData.summary || "").trim()
    || ensureArray(medicinalData.actions).length > 0
    || ensureArray(medicinalData.body_systems).length > 0
    || ensureArray(medicinalData.medical_terms).length > 0;

  const caution = isCautionRecord(record);
  const edible = isEdibleForSection(record);
  const otherUses = hasMeaningfulOtherUses(record);

  return { isMushroom, isPlant, medicinal, lookalike: caution, caution, edible, otherUses };
}
