import { esc } from "../lib/escape.js";
import { getMedicinalData, isBuildNoteText, cleanUserFacingText } from "../lib/merge.js?v=v4.2.40-r2026-04-27-list-lookalike-cleanup1";
import { renderImageSlot } from "../lib/image-slot.js";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function clean(value) {
  return cleanUserFacingText(value);
}

function slugifyLookup(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function lineIf(label, value) {
  const text = clean(value);
  if (!text) return "";
  return `<dt>${esc(label)}</dt><dd>${esc(text)}</dd>`;
}

function listBlock(title, values) {
  if (!Array.isArray(values) || !values.length) return "";
  const cleaned = values.map(clean).filter(Boolean);
  if (!cleaned.length) return "";
  return `<section class="detail-block"><h4>${esc(title)}</h4><ul class="list-tight">${cleaned.map(v => `<li>${esc(v)}</li>`).join("")}</ul></section>`;
}

function titleFromSlugOrName(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
    return raw.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
  }
  return raw;
}

function lookAlikeSeparationNote(record = {}, rawName = "") {
  const slug = slugifyLookup(rawName);
  const hay = `${slug} ${rawName}`.toLowerCase();
  const recordHay = `${record.slug || ""} ${record.display_name || ""} ${record.common_name || ""} ${record.scientific_name || ""}`.toLowerCase();

  if (/bitter|tylopilus|felleus|pink-pored/.test(hay)) {
    return "Check for pores that turn pinkish with age and use only a tiny nibble-and-spit taste test if you know the mushroom is safe to taste; bitter boletes taste distinctly bitter and can ruin the whole pan.";
  }
  if (/red-mouth|lurid|red-pored|blue-staining-red-pored|subvelutipes|sensibilis|frostii|bicolor|baorangia|exsudoporus|caloboletus/.test(hay)) {
    return "Focus on orange/red pore color and speed/strength of blue bruising. Red/orange-pored blue-staining boletes are a caution zone unless the ID is nailed down.";
  }
  if (/king|porcini|boletus-edulis|false-king/.test(hay) || /king|porcini/.test(recordHay)) {
    return "Compare pore color, stem netting, taste, and staining. Porcini-type edibles usually have white-to-yellow pores, firm flesh, mild taste, and no red/orange pore surface.";
  }
  if (/leccinum|scaber|birch-bolete|orange-bolete|aspen/.test(hay)) {
    return "Look for dark scabers on the stalk and match the nearby tree association, especially birch or aspen. Treat Leccinum-type mushrooms cautiously and do not use vague look-alike matches as food IDs.";
  }
  if (/suillus|slippery|butterball|larch|chicken-fat|painted/.test(hay)) {
    return "Look for Suillus traits: sticky or slimy cap, yellow pores, glandular dots or ring on the stalk, and a pine/larch/conifer association.";
  }
  if (/jack-o-lantern|omphalotus/.test(hay)) {
    return "Jack-o'-lanterns have true sharp gills and often grow in clusters from wood or buried wood; chanterelles have blunt ridges, not true gills.";
  }
  if (/false-morel|gyromitra|lorchel/.test(hay)) {
    return "Cut it lengthwise. True morels are hollow from cap through stem with the cap attached; false morels can be chambered, cottony, or irregularly lobed.";
  }
  if (/amanita|death-angel|destroying-angel|death-cap/.test(hay)) {
    return "Check the entire base for a cup/volva, plus free white gills and a ring. Do not identify Amanita look-alikes from cap color alone.";
  }
  if (/galerina/.test(hay)) {
    return "Galerina is a serious/deadly wood-growing look-alike group. Check spore color, ring, cap texture, and growth on wood; do not treat small brown mushrooms as interchangeable.";
  }
  if (/artist|tinder|hoof|birch-polypore|conk/.test(hay)) {
    return "Separate shelf fungi by host tree, bracket shape, pore surface, and texture. Birch polypore is strongly tied to birch; artist's conk and tinder conk have different bracket forms and surfaces.";
  }
  if (/oyster|angel-wing/.test(hay)) {
    return "Compare host wood, cap thickness, gill attachment, and overall form. Oyster-type mushrooms should not be identified from pale color alone.";
  }
  return "Compare the linked page against this one using the practical field marks: underside, pore/gill color, bruising, stem clues, host tree/substrate, season, and any taste warning.";
}

function lookAlikeBlock(record) {
  const cleaned = Array.isArray(record.look_alikes) ? record.look_alikes.map(clean).filter(Boolean) : [];
  const notes = clean(record.look_alike_notes);
  if (!cleaned.length && !notes) return "";
  const items = cleaned.map((name) => {
    const slug = slugifyLookup(name);
    const label = titleFromSlugOrName(name);
    const note = lookAlikeSeparationNote(record, name);
    return `<li><button class="subtle" type="button" data-detail="${esc(slug)}">${esc(label)}</button>${note ? `<div class="muted small">How to tell apart: ${esc(note)}</div>` : ""}</li>`;
  }).join("");
  return `
    <section class="detail-block">
      <h4>Look-alikes / easily confused</h4>
      ${notes ? `<p>${esc(notes)}</p>` : ""}
      ${items ? `<ul class="list-tight lookalike-cues">${items}</ul>` : ""}
    </section>
  `;
}

function seasonText(record) {
  if (Array.isArray(record.months_available) && record.months_available.length) return record.months_available.join(", ");
  if (Array.isArray(record.season_months) && record.season_months.length) {
    return record.season_months.map((n) => MONTHS[n - 1] || String(n)).join(", ");
  }
  return "";
}

function rareBlock(record) {
  const rare = record.rare_profile || {};
  const hasRare = rare.status || rare.legal_status || rare.up_relevance || rare.reason || rare.field_marks || rare.care_note || rare.sensitive_location || (rare.key_features || []).length;
  if (!hasRare) return "";
  return `
    <section class="detail-block">
      <h4>Rare / tracked status</h4>
      <dl class="kv">
        ${lineIf("Status", rare.status)}
        ${lineIf("Legal status", rare.legal_status)}
        ${lineIf("U.P. relevance", rare.up_relevance)}
        ${lineIf("Why tracked", rare.reason)}
        ${lineIf("Field marks", rare.field_marks)}
        ${lineIf("Care note", rare.care_note)}
        ${lineIf("Location caution", rare.sensitive_location ? "Keep exact locations private." : "")}
      </dl>
    </section>
    ${listBlock("Key features", rare.key_features)}
  `;
}

function isClearlyNonPoisonous(record, text = "") {
  const ed = String(record.edibility_status || "").trim().toLowerCase();
  const hay = `${record.non_edible_severity || ""} ${record.danger_level || ""} ${record.poisoning_effects || ""} ${record.toxicity_notes || ""} ${text}`.toLowerCase();
  if (ed === "poisonous" || ed === "deadly") return false;
  return /not poisonous|non[- ]poisonous|not treated here as poisonous|bitter[, ]+not poisonous|not toxic/.test(hay);
}

function dangerBlock(record) {
  const ed = String(record.edibility_status || "").trim().toLowerCase();
  const severity = clean(record.non_edible_severity);
  const level = clean(record.danger_level || (ed === "deadly" ? "Deadly" : ed === "poisonous" ? "Poisonous" : severity));
  const effects = clean(record.poisoning_effects || record.toxicity_notes || "");
  const affected = Array.isArray(record.affected_systems) ? record.affected_systems.map(clean).filter(Boolean) : [];
  const notes = clean(record.edibility_notes || record.edibility_detail || "");
  const dangerHay = `${ed} ${severity} ${level} ${effects} ${notes}`;
  const isDanger = ed === "poisonous"
    || ed === "deadly"
    || /poison|deadly|toxic|danger|fatal|liver|kidney|neurolog|gastrointestinal|gi distress|vomit|diarrhea/i.test(dangerHay);

  if (isClearlyNonPoisonous(record, dangerHay) && !/deadly|fatal|liver|kidney|neurolog/i.test(dangerHay)) return "";
  if (!isDanger && !effects && !affected.length) return "";

  const fallbackEffects = effects || (ed === "deadly"
    ? "Potentially life-threatening poisoning. Avoid entirely."
    : "Can cause poisoning or serious illness. Treat as unsafe to eat.");
  const seriousness = clean(record.danger_seriousness) || (ed === "deadly"
    ? "High seriousness: this entry should be treated as potentially life-threatening, not as a beginner mistake."
    : ed === "poisonous"
      ? "Seriousness varies by species and amount eaten, but this is not a casual caution entry. Avoid eating it."
      : "Unsafe or not recommended as food; review the caution notes before handling or comparing with edible species.");

  return `
    <section class="detail-block danger-detail-block">
      <h4>Danger / poisoning</h4>
      <dl class="kv">
        ${lineIf("Danger level", level || (ed === "deadly" ? "Deadly" : "Poisonous / unsafe"))}
        ${lineIf("Expected effects / symptoms", fallbackEffects)}
        ${lineIf("Seriousness", seriousness)}
        ${lineIf("Body systems affected", affected.join(", "))}
        ${lineIf("Notes", notes)}
      </dl>
    </section>
  `;
}

function linkBlock(record) {
  const links = Array.isArray(record.use_links) ? record.use_links : (Array.isArray(record.links) ? record.links.map((url) => ({ label: url, url })) : []);
  if (!links.length) return "";
  const items = links.map((item) => {
    const url = typeof item === "string" ? item : item.url;
    const label = clean(typeof item === "string" ? item : (item.label || item.url));
    if (!url || !label) return "";
    return `<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a></li>`;
  }).filter(Boolean);
  if (!items.length) return "";
  return `<section class="detail-block"><h4>Links</h4><ul class="list-tight">${items.join("")}</ul></section>`;
}

function joinClean(values = []) {
  return values.map(clean).filter(Boolean).join(", ");
}

function normalizeForDuplicateCheck(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueFoodLines(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = clean(value);
    if (!text) continue;
    const key = normalizeForDuplicateCheck(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function isFoodCautionText(value = "") {
  const text = String(value || "").toLowerCase();
  return /\b(caution|avoid|unsafe|poison|toxic|raw|uncooked|undercooked|cook thoroughly|must be cooked|only when|only if|confidently identified|correctly identified|properly identified|good condition|look[- ]?alike|bitter|not recommended|gi distress|stomach|nausea|vomit|diarrhea)\b/.test(text);
}

function foodUseBlock(record) {
  const edibleUse = record.edible_use || null;
  const profile = record.mushroom_profile || {};
  const culinaryUses = clean(record.culinary_uses);
  const edibilityNotes = clean(record.edibility_notes || record.edibility_detail);
  const taste = joinClean([
    ...asArray(record.taste),
    ...asArray(profile.taste)
  ]);
  const texture = joinClean([
    ...asArray(record.texture),
    ...asArray(profile.texture)
  ]);
  const processing = joinClean([
    ...asArray(record.processing_required),
    ...asArray(profile.processing_required)
  ]);
  const method = clean(edibleUse?.method || "");
  const edibleNotes = clean(edibleUse?.notes || "");
  const bestUses = isFoodCautionText(culinaryUses) ? "" : culinaryUses;
  const cautionLines = uniqueFoodLines([
    processing,
    edibilityNotes,
    edibleNotes,
    isFoodCautionText(culinaryUses) ? culinaryUses : ""
  ]);
  const lines = [
    lineIf("Food quality", record.food_quality),
    lineIf("Use form", method && method.toLowerCase() !== "food" ? method : ""),
    lineIf("Taste", taste),
    lineIf("Texture", texture),
    lineIf("Best uses / cooking notes", bestUses),
    lineIf("Preparation / caution", cautionLines.join(" "))
  ].join("");
  if (!lines.trim()) return "";
  return `
    <section class="detail-block food-use-block">
      <h4>Food-Use</h4>
      <dl class="kv">
        ${lines}
      </dl>
    </section>
  `;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function profileListValue(profile = {}, key) {
  const value = profile?.[key];
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(", ");
  return clean(value);
}

function boleteDetailBlock(record) {
  if (String(record?.lane || "").toLowerCase() !== "bolete") return "";
  const profile = record.mushroom_profile || {};
  const lines = [
    lineIf("Pore color", profileListValue(profile, "pore_color") || profileListValue(record, "poreColor")),
    lineIf("Bruising / staining", profileListValue(profile, "staining") || profileListValue(record, "staining")),
    lineIf("Stem features", profileListValue(profile, "stem_feature") || profileListValue(record, "stemFeature")),
    lineIf("Cap surface", profileListValue(profile, "cap_surface")),
    lineIf("Growing from / with", profileListValue(profile, "substrate") || profileListValue(record, "substrate")),
    lineIf("Associated trees", profileListValue(profile, "host_trees") || profileListValue(record, "hostTree")),
    lineIf("Tree association", profileListValue(profile, "host_filter_tokens") || profileListValue(record, "host_filter_tokens")),
    lineIf("Taste / warning clue", profileListValue(profile, "taste") || profileListValue(record, "taste")),
    lineIf("Season note", profile.season_note)
  ].join("");
  if (!lines.trim()) return "";
  return `
    <section class="detail-block bolete-id-block">
      <h4>Pored mushroom field marks</h4>
      <dl class="kv">
        ${lines}
      </dl>
    </section>
  `;
}

export function renderDetail(record) {
  const typeLabel = record.foraging_class ? String(record.foraging_class).replaceAll("_", " ") : (record.category || record.group || "");
  const medicinal = getMedicinalData(record);
  const medicinalUses = clean(medicinal.summary || "");
  const medicinalWarnings = clean(medicinal.warnings || "");
  const habitats = Array.isArray(record.habitats) && record.habitats.length ? record.habitats.join(", ") : (Array.isArray(record.habitat) ? record.habitat.join(", ") : (record.habitat_detail || ""));
  const culinaryUses = clean(record.culinary_uses);
  const otherUses = clean(record.other_uses);
  const edibilityNotes = clean(record.edibility_notes || record.edibility_detail);
  const notes = !isBuildNoteText(record.notes) ? clean(record.notes) : "";
  const generalNotes = !isBuildNoteText(record.general_notes) ? clean(record.general_notes) : "";
  const overview = clean(record.overview);
  const fieldIdentification = clean(record.field_identification);
  const edibleUse = record.edible_use || null;

  return `
    <article class="detail-grid">
      <section class="detail-block detail-hero">
        ${renderImageSlot(record, 'detail')}
        <div>
          <h3>${esc(record.display_name || record.common_name || record.slug || "Untitled")}</h3>
          <p class="muted">${esc(record.scientific_name || "")}</p>
          <div class="record-meta">
            ${record.lane ? `<span class="tag">Type: ${esc(record.lane === "bolete" ? "Pores / spongy underside" : record.lane)}</span>` : (typeLabel ? `<span class="tag">Type: ${esc(typeLabel)}</span>` : "")}
            ${record.commonness ? `<span class="tag">Commonality: ${esc(record.commonness)}</span>` : ""}
            ${seasonText(record) ? `<span class="tag">Season: ${esc(seasonText(record))}</span>` : ""}
            ${record.food_quality ? `<span class="tag good">Food quality: ${esc(record.food_quality)}</span>` : ""}
            ${record.non_edible_severity && !edibleUse?.has_ingestible_use ? `<span class="tag danger">${esc(record.non_edible_severity)}</span>` : ""}
            ${record.review_status === 'needs_review' ? `<span class="tag review">Needs review</span>` : ''}
          </div>
          <div class="quick-actions">
            ${record.review_status === 'needs_review'
              ? `<button class="warn" type="button" data-review-action="mark-ok" data-slug="${esc(record.slug)}">Mark OK</button>`
              : `<button class="subtle" type="button" data-review-action="send-review" data-slug="${esc(record.slug)}">Send to Needs Review</button>`}
          </div>
        </div>
      </section>

      <section class="detail-block">
        <h4>Overview</h4>
        <dl class="kv">
          ${lineIf("Common names", Array.isArray(record.common_names) ? record.common_names.join(", ") : record.common_name)}
          ${lineIf("Scientific name", record.scientific_name)}
          ${lineIf("Species scope", record.species_scope || record.entry_scope)}
          ${lineIf("Type", typeLabel)}
          ${lineIf("Habitat", habitats)}
          ${lineIf("Field identification", fieldIdentification)}
          ${lineIf("Commonness", record.commonness)}
          ${lineIf("Season", seasonText(record))}
          ${lineIf("Overview", overview)}
        </dl>
      </section>

      ${boleteDetailBlock(record)}
      ${foodUseBlock(record)}
      ${medicinalUses ? `<section class="detail-block"><h4>Medicinal uses</h4><p>${esc(medicinalUses)}</p></section>` : ""}
      ${medicinalWarnings ? `<section class="detail-block"><h4>Medicinal cautions</h4><p>${esc(medicinalWarnings)}</p></section>` : ""}
      ${otherUses ? `<section class="detail-block"><h4>Other uses</h4><p>${esc(otherUses)}</p></section>` : ""}
      ${dangerBlock(record)}
      ${rareBlock(record)}
      ${notes ? `<section class="detail-block"><h4>Notes</h4><p>${esc(notes)}</p></section>` : ""}
      ${generalNotes ? `<section class="detail-block"><h4>General notes</h4><p>${esc(generalNotes)}</p></section>` : ""}

      ${lookAlikeBlock(record)}
      ${listBlock("Medicinal actions", medicinal.actions)}
      ${listBlock("Medicinal systems", medicinal.body_systems)}
      ${listBlock("Medicinal terms", medicinal.medical_terms)}
      ${linkBlock(record)}
    </article>
  `;
}
