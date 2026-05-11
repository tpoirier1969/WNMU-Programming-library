import { TABLE_NAME } from "../constants-mainfix.js?v=v2.1-mainfix22";
import { escapeHtml } from "../utils.js?v=v2.1-medfix1";
import { state } from "../state.js?v=v2.1-mainfix21";

const LOOKALIKE_ALIASES = {
  'red bracket fungi': 'red-belted-conk',
  'red bracket fungus': 'red-belted-conk',
  'red-belted conk': 'red-belted-conk',
  'false morel / gyromitra group': 'false-morel-gyromitra-group',
  'jack-o-lantern': 'jack-o-lantern',
  "jack o lantern": 'jack-o-lantern',
  "jack-o'-lantern": 'jack-o-lantern',
  'destroying angel': 'destroying-angel',
  'field mushroom': 'field-mushroom',
  'meadow mushroom': 'meadow-mushroom',
  'black morels': 'black-morels',
  'half-free morels': 'half-free-morels',
  'smooth chanterelles': 'smooth-chanterelles',
  'honey mushrooms': 'honey-mushrooms'
};

const ALT_NAMES_BY_SLUG = {
  'red-belted-conk': ['Red Bracket Fungi', 'Red-belted bracket', 'Red-banded polypore']
};

const USDA_PLANT_PROFILE_BY_SLUG = {
  'birch-sap': 'https://plants.sc.egov.usda.gov/plant-profile/BEPE3',
  'wild-strawberries': 'https://plants.sc.egov.usda.gov/home/plantProfile?symbol=FRVI',
  'cattail-pollen': 'https://plants.sc.egov.usda.gov/home/plantProfile?symbol=TYLA',
  'cattail-shoots': 'https://plants.sc.egov.usda.gov/home/plantProfile?symbol=TYLA',
  'cattail-rhizomes': 'https://plants.sc.egov.usda.gov/home/plantProfile?symbol=TYLA'
};

function cleanText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (/not provided in the imported sheet/i.test(text)) return '';
  if (/no extra notes imported/i.test(text)) return '';
  if (/no summary imported yet/i.test(text)) return '';
  return text;
}
function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(fungi|fungus|mushrooms|mushroom|plants|plant|species|group)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function resolveLinkedRecord(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const bySlug = (state.allRecords || []).find(item => item.slug === raw);
  if (bySlug) return bySlug;
  const normalized = normalizeName(raw);
  const aliasSlug = LOOKALIKE_ALIASES[normalized];
  if (aliasSlug) return (state.allRecords || []).find(item => item.slug === aliasSlug) || null;
  return (state.allRecords || []).find(item => {
    const candidates = [item.display_name, item.common_name, item.slug, item.scientific_name, ...((ALT_NAMES_BY_SLUG[item.slug] || []))]
      .map(normalizeName)
      .filter(Boolean);
    return candidates.includes(normalized);
  }) || null;
}
function isGenericCaution(text) {
  return /^edible with caution[.! ]*$/i.test(String(text || '').trim());
}
function uniqueStrings(items = []) {
  return [...new Set((items || []).map(item => String(item || '').trim()).filter(Boolean))];
}
function tagList(items, emptyText = "None noted") {
  return items?.length ? items.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("") : `<span class="tag">${escapeHtml(emptyText)}</span>`;
}
function line(label, value) { const clean = cleanText(value); if (!clean) return ""; return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(clean)}</p>`; }
function listSection(title, items, emptyText = "Not documented yet") { return `<section class="detail-card section-block"><h3>${escapeHtml(title)}</h3><div class="tag-row">${tagList(items, emptyText)}</div></section>`; }
function canonicalImageKey(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const noQuery = raw.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(noQuery);
  const specialFile = decoded.match(/Special:FilePath\/(.+)$/i);
  const tail = specialFile ? specialFile[1] : decoded.split('/').pop();
  return String(tail || decoded).trim().toLowerCase();
}
function uniqueImages(images) {
  const seen = new Set();
  const out = [];
  for (const image of images || []) {
    const key = canonicalImageKey(image);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(image);
  }
  return out;
}
function renderRelatedMushrooms(record) {
  if (record.category !== "Mushroom") return "";
  const related = (state.allRecords || []).filter(item => item.slug !== record.slug && item.mushroom_family && item.mushroom_family === record.mushroom_family);
  if (!related.length) return "";
  return `<section class="detail-card section-block"><h3>Related variants in this family</h3><div class="related-link-list">${related.map(item => `<a class="inline-chip-link" href="#detail/${encodeURIComponent(item.slug)}" data-detail-link="${escapeHtml(item.slug)}">${escapeHtml(item.display_name)}</a>`).join("")}</div></section>`;
}
function renderLookAlikes(record) {
  const raw = (record.look_alikes || []).filter(Boolean);
  if (!raw.length) return '';
  const rendered = raw.map(name => {
    const linked = resolveLinkedRecord(name);
    return linked ? `<a class="inline-chip-link" href="#detail/${encodeURIComponent(linked.slug)}" data-detail-link="${escapeHtml(linked.slug)}">${escapeHtml(linked.display_name)}</a>` : `<span class="tag">${escapeHtml(name)}</span>`;
  }).join('');
  return `<section class="detail-card section-block"><h3>Look-alikes / species to avoid</h3><div class="related-link-list">${rendered}</div></section>`;
}
function renderImageCredits(record) {
  const credits = state.credits?.[record.slug] || [];
  if (!credits.length) return "";
  return `<section class="detail-card section-block image-credit-block"><h3>Image credits</h3><ul>${credits.map(item => `<li><strong>${escapeHtml(item.creator || 'Unknown creator')}</strong>${item.title ? ` — ${escapeHtml(item.title)}` : ''}${item.license ? ` — ${escapeHtml(item.license)}` : ''}</li>`).join('')}</ul></section>`;
}
function renderEdibilityWarning(record) {
  const detail = cleanText(record.edibility_detail).toLowerCase();
  const effects = cleanText(record.effects_on_body).toLowerCase();
  const severity = cleanText(record.non_edible_severity).toLowerCase();
  const needsCooking = /(must be cooked|not edible raw|cook thoroughly|raw .*irrit|proper boiling|boiled|processed before eating|parboil|leach|leached)/.test(detail);
  const toxic = /(poison|toxic|deadly)/.test(severity) || /(poison|toxic|deadly)/.test(effects);
  if (!needsCooking && !toxic) return '';
  const message = toxic
    ? cleanText(record.effects_on_body) || cleanText(record.edibility_detail) || cleanText(record.non_edible_severity) || 'This species has significant safety concerns.'
    : cleanText(record.edibility_detail) || 'Proper preparation is required before eating.';
  return `<section class="detail-card section-block safety-callout ${toxic ? 'danger' : 'warning'}"><h3>${toxic ? 'Safety warning' : 'Preparation warning'}</h3><p>${escapeHtml(message)}</p></section>`;
}
function renderIdentificationClues(record) {
  const base = [
    ...(record.habitat || []),
    ...(record.observedPart || []),
    ...(record.size || []),
    ...(record.taste || [])
  ];
  const specific = record.category === 'Mushroom'
    ? [
        ...(record.substrate || []),
        ...(record.treeType || []),
        ...(record.hostTree || []),
        ...(record.ring || []),
        ...(record.underside || []),
        ...(record.texture || []),
        ...(record.smell || []),
        ...(record.staining || [])
      ]
    : [
        ...(record.flowerColor || []),
        ...(record.leafShape || []),
        ...(record.leafArrangement || []),
        ...(record.stemSurface || []),
        ...(record.leafPointCount || [])
      ];
  const items = uniqueStrings([...base, ...specific]);
  if (!items.length) return '';
  return `<section class="detail-card section-block"><h3>Identification clues</h3><div class="tag-row">${tagList(items, "No identification clues tagged yet")}</div></section>`;
}
function combinedCulinaryText(record) {
  const parts = [];
  const culinary = cleanText(record.culinary_uses);
  const edibility = cleanText(record.edibility_detail);
  if (culinary) parts.push(culinary);
  if (edibility && !isGenericCaution(edibility) && !parts.some(p => p.toLowerCase() === edibility.toLowerCase())) parts.push(edibility);
  return parts.join(' ');
}
function renderCulinarySection(record) {
  const text = combinedCulinaryText(record);
  if (!text) return '';
  return `<section class="detail-card section-block"><h3>Culinary uses</h3><p>${escapeHtml(text)}</p></section>`;
}
function renderMedicinalSection(record) {
  const text = cleanText(record.medicinal_uses);
  if (!text) return '';
  return `<section class="detail-card section-block"><h3>Medicinal uses</h3><p>${escapeHtml(text)}</p></section>`;
}
function renderOtherSections(record) {
  const blocks = [];
  const otherUses = cleanText(record.other_uses);
  const changes = cleanText(record.changes_over_time);
  const notes = cleanText(record.notes);
  if (otherUses) blocks.push(`<section class="detail-card section-block"><h3>Other uses</h3><p>${escapeHtml(otherUses)}</p></section>`);
  if (changes) blocks.push(`<section class="detail-card section-block"><h3>Changes over time</h3><p>${escapeHtml(changes)}</p></section>`);
  if (notes) blocks.push(`<section class="detail-card section-block"><h3>Notes</h3><p>${escapeHtml(notes)}</p></section>`);
  return blocks.join('');
}
function renderSafetyEffects(record) {
  const severity = cleanText(record.non_edible_severity);
  const effects = cleanText(record.effects_on_body);
  const affected = uniqueStrings(record.affected_systems || []);
  if (!severity && !effects && !affected.length) return '';
  return `<section class="detail-card section-block"><h3>Safety / body effects</h3>${line('Severity', severity)}${affected.length ? line('Affected systems', affected.join(', ')) : ''}${line('Effects', effects)}</section>`;
}
function renderMedicinalTags(record) {
  const items = uniqueStrings([...(record.medicinalAction || []), ...(record.medicinalSystem || []), ...(record.medicinalTerms || [])]);
  if (!items.length) return '';
  return `<section class="detail-card section-block"><h3>Medicinal tags</h3><div class="tag-row">${tagList(items, "No medicinal tags yet")}</div></section>`;
}
function renderSeasonality(record) {
  const items = uniqueStrings(record.months_available || []);
  if (!items.length) return '';
  return `<section class="detail-card section-block"><h3>Seasonality</h3><div class="tag-row">${tagList(items, "No month data")}</div></section>`;
}
function renderMushroomResearch(record) {
  const profile = record.mushroom_profile;
  if (!profile) return "";
  const summaryParts = [cleanText(profile.summary), cleanText(profile.ecology), cleanText(profile.season_note)].filter(Boolean);
  const sourceLinks = uniqueStrings(record.links || []).map(link => `<li><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></li>`).join("");
  const details = [line("Scientific name", record.scientific_name || ""), line("Family grouping", record.mushroom_family || ""), line("Entry scope", cleanText((profile.entry_scope || "").replaceAll("_", " "))), line("Edibility", cleanText((profile.edibility_status || "").replaceAll("_", " "))), line("Caution level", cleanText((profile.caution_level || "").replaceAll("_", " "))), line("Spore print", profile.spore_print || "")].join('');
  const substrate = uniqueStrings([...(profile.substrate || []), ...(profile.wood_type || []), ...(profile.host_trees || []), profile.host_certainty ? `Host certainty: ${String(profile.host_certainty).replaceAll('_', ' ')}` : '']);
  const structure = uniqueStrings([...(profile.underside ? [profile.underside] : []), ...(profile.ring ? [profile.ring] : []), ...(profile.texture || []), ...(profile.odor ? [profile.odor] : []), ...(profile.staining ? [profile.staining] : []), ...(profile.taste || [])]);
  return `<section class="detail-card section-block"><h3>Mushroom research</h3>${summaryParts.length ? summaryParts.map(p => `<p>${escapeHtml(p)}</p>`).join('') : ''}${details}</section>${substrate.length ? listSection("Substrate and host clues", substrate, "No substrate or host clues added yet") : ''}${structure.length ? listSection("Structure clues", structure, "No structure clues added yet") : ''}${profile.processing_required?.length ? listSection("Processing / handling", uniqueStrings(profile.processing_required)) : ""}${sourceLinks ? `<section class="detail-card section-block"><h3>Sources</h3><ul>${sourceLinks}</ul></section>` : ''}`;
}
function renderExternalReferenceLinks(record) {
  if (record.category === 'Mushroom') {
    return `<section class="detail-card section-block"><h3>More references</h3><ul><li><a href="https://www.fs.usda.gov/wildflowers/features/fungi/index.shtml" target="_blank" rel="noreferrer">U.S. Forest Service fungi resources</a></li></ul></section>`;
  }
  const exactPlantLink = USDA_PLANT_PROFILE_BY_SLUG[record.slug];
  if (!exactPlantLink) return '';
  return `<section class="detail-card section-block"><h3>More references</h3><ul><li><a href="${escapeHtml(exactPlantLink)}" target="_blank" rel="noreferrer">USDA PLANTS profile for this species</a></li></ul></section>`;
}
export function renderDetail(record) {
  const images = uniqueImages(record.images || []);
  const altNames = ALT_NAMES_BY_SLUG[record.slug] || [];
  const gallery = images.length ? images.map(path => `<img src="${encodeURI(path)}" alt="${escapeHtml(record.display_name)}">`).join("") : `<div class="thumb placeholder" style="width:100%;height:220px;">No image imported</div>`;
  const genericLinks = !record.mushroom_profile && record.links?.length ? `<section class="detail-card section-block"><h3>Source links</h3><ul>${uniqueStrings(record.links).map(link => `<li><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></li>`).join("")}</ul></section>` : "";
  return `<div class="detail-layout"><div class="detail-gallery">${gallery}${renderImageCredits(record)}</div><div class="detail-grid"><section class="detail-card"><span class="category-pill">${escapeHtml(record.category)}</span><h2 style="margin-top:10px;">${escapeHtml(record.display_name)}</h2><p style="margin-top:8px;">${escapeHtml(cleanText(record.common_name) || "")}</p>${altNames.length ? `<p class="small-note"><strong>Also called:</strong> ${escapeHtml(altNames.join(', '))}</p>` : ''}${record.scientific_name ? `<p class="small-note"><strong>${escapeHtml(record.scientific_name)}</strong></p>` : ""}</section>${record.category === 'Mushroom' ? renderMushroomResearch(record) : ''}${renderEdibilityWarning(record)}${renderCulinarySection(record)}${renderMedicinalSection(record)}${renderSafetyEffects(record)}${renderIdentificationClues(record)}${renderMedicinalTags(record)}${renderSeasonality(record)}${renderOtherSections(record)}${renderLookAlikes(record)}${renderRelatedMushrooms(record)}${renderExternalReferenceLinks(record)}${genericLinks}<p class="small-note">Supabase table target: <strong>${TABLE_NAME}</strong></p></div></div>`;
}
