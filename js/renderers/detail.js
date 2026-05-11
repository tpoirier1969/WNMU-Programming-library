import { TABLE_NAME } from "../constants-mainfix.js?v=2026-04-17-38";
import { escapeHtml } from "../utils.js?v=v2.0";
import { state } from "../state.js?v=v2.1-mainfix21";

function uniqueStrings(values = []) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}
function tagList(items, emptyText = "None noted") {
  return items?.length ? items.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("") : `<span class="tag">${escapeHtml(emptyText)}</span>`;
}
function line(label, value) {
  if (!value) return "";
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}
function paragraphSection(title, value, emptyText = "Not documented yet") {
  return `<section class="detail-card section-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(value || emptyText)}</p></section>`;
}
function tagSection(title, items, emptyText = "Not documented yet") {
  return `<section class="detail-card section-block"><h3>${escapeHtml(title)}</h3><div class="tag-row">${tagList(items, emptyText)}</div></section>`;
}
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
function resolvedImageUrl(url, width = 1200) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const decoded = decodeURIComponent(raw);
  const specialFile = decoded.match(/https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/(.+)$/i);
  if (specialFile?.[1]) {
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(specialFile[1])}?width=${width}`;
  }
  return raw;
}
function serializeDetailFallbackSources(images, width = 1200) {
  return uniqueImages(images).map((url) => encodeURIComponent(resolvedImageUrl(url, width))).join('|');
}
function normalizedMatchText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findLinkedRecord(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const needle = normalizedMatchText(raw);
  return (state.allRecords || []).find((item) => {
    const candidates = [item.display_name, item.common_name, item.slug, item.scientific_name].map(normalizedMatchText).filter(Boolean);
    if (candidates.includes(needle)) return true;
    if (needle.includes('galerina') && candidates.some((value) => value.includes('galerina'))) return true;
    if (needle.includes('jack o lantern') && candidates.some((value) => value.includes('jack o lantern'))) return true;
    if (needle.includes('destroying angel') && candidates.some((value) => value.includes('destroying angel'))) return true;
    if (needle.includes('green spored parasol') && candidates.some((value) => value.includes('green spored parasol'))) return true;
    return false;
  }) || null;
}
function prettyEdibilityStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  const map = {
    choice: 'Choice edible',
    good: 'Good edible',
    edible: 'Edible',
    edible_mediocre: 'Edible, but not especially worthwhile',
    edible_when_young: 'Edible only when young',
    edible_when_white_inside: 'Edible only while the interior is still solid white',
    choice_cooked_only: 'Not for beginners; exact identification matters and mistakes have consequences',
    edible_with_caution: 'Not recommended for beginners; misidentification or individual reactions are real concerns',
    review_required: 'Do not treat this as an edible target without deeper verification',
    inedible_bitter: 'Inedible because of bitterness or very poor food quality',
    poisonous: 'Poisonous',
    deadly_poisonous: 'Deadly poisonous',
    toxic_or_dangerous: 'Poisonous / dangerous',
    toxic_or_psychoactive: 'Toxic or otherwise unsafe for food use',
    emergency_only: 'Emergency use only',
    nonculinary_tea: 'Tea / extract use only'
  };
  return map[key] || String(status || '').replaceAll('_', ' ');
}
function stripCookingBoilerplate(value) {
  return String(value || '')
    .replace(/\bCook thoroughly\.?/gi, '')
    .replace(/\bProper cooking matters\.?/gi, '')
    .replace(/\bnot edible raw\.?/gi, '')
    .replace(/\bmust be cooked\.?/gi, '')
    .replace(/\bafter thorough cooking\b/gi, '')
    .replace(/\bwith proper handling\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}
function normalizeMushroomCulinaryText(record) {
  const status = String(record?.mushroom_profile?.edibility_status || '').toLowerCase();
  const original = stripCookingBoilerplate(record.culinary_uses || '');
  if (status === 'edible_with_caution') {
    if (/not recommended for foraging|not a good beginner/i.test(original)) return original;
    return original ? `${original} This is not a beginner mushroom.` : 'This is not a beginner mushroom.';
  }
  if (status === 'choice_cooked_only') {
    return original ? `${original} Exact identification matters; do not treat this as an easy edible.` : 'Exact identification matters; do not treat this as an easy edible.';
  }
  return original;
}
function renderImageCredits(record) {
  const credits = state.credits?.[record.slug] || [];
  if (!credits.length) return "";
  return `<section class="detail-card section-block image-credit-block"><h3>Image credits</h3><ul>${credits.map(item => `<li><strong>${escapeHtml(item.creator || 'Unknown creator')}</strong>${item.title ? ` — ${escapeHtml(item.title)}` : ''}${item.license ? ` — ${escapeHtml(item.license)}` : ''}</li>`).join('')}</ul></section>`;
}
function renderRelatedMushrooms(record) {
  if (record.category !== "Mushroom") return "";
  const related = (state.allRecords || []).filter(item => item.slug !== record.slug && item.mushroom_family && item.mushroom_family === record.mushroom_family);
  if (!related.length) return "";
  return `<section class="detail-card section-block"><h3>Related variants in this family</h3><div class="related-link-list">${related.map(item => `<a class="inline-chip-link" href="#detail/${encodeURIComponent(item.slug)}" data-detail-link="${escapeHtml(item.slug)}">${escapeHtml(item.display_name)}</a>`).join("")}</div></section>`;
}
function renderSafetyWarning(record) {
  const effects = String(record.effects_on_body || '').trim();
  const severity = String(record.non_edible_severity || '').trim();
  const toxic = /(poison|toxic|deadly)/i.test(severity) || /(poison|toxic|deadly|amatoxin)/i.test(effects);
  if (!toxic) return "";
  const body = effects || 'Treat this as a dangerous species, not a food mushroom.';
  return `<section class="detail-card section-block safety-callout danger"><h3>Safety warning</h3><p>${escapeHtml(body)}</p></section>`;
}
function mergedMedicinalText(record) {
  const tagText = uniqueStrings([...(record.medicinalAction || []), ...(record.medicinalSystem || []), ...(record.medicinalTerms || [])]);
  const parts = [];
  if (record.medicinal_uses) parts.push(record.medicinal_uses);
  if (tagText.length) parts.push(`Medicinal themes noted: ${tagText.join(', ')}.`);
  return parts.join(' ');
}
function mergedIdentificationTips(record) {
  const profile = record.mushroom_profile || {};
  return uniqueStrings([
    ...(record.habitat || []),
    ...(record.observedPart || []),
    ...(record.size || []),
    ...(record.taste || []),
    ...(record.substrate || []),
    ...(record.treeType || []),
    ...(record.hostTree || []),
    ...(record.ring || []),
    ...(record.underside || []),
    ...(record.texture || []),
    ...(record.smell || []),
    ...(record.staining || []),
    ...(profile.substrate || []),
    ...(profile.wood_type || []),
    ...(profile.host_trees || []),
    ...(profile.underside ? [profile.underside] : []),
    ...(profile.ring ? [profile.ring] : []),
    ...(profile.texture || []),
    ...(profile.odor ? [profile.odor] : []),
    ...(profile.staining ? [profile.staining] : []),
    ...(profile.taste || []),
    profile.host_certainty ? `Host certainty: ${String(profile.host_certainty).replaceAll('_', ' ')}` : '',
    profile.spore_print ? `Spore print: ${profile.spore_print}` : ''
  ]);
}
function combinedNotes(record) {
  const parts = [];
  if (record.notes) parts.push(stripCookingBoilerplate(record.notes));
  if (record.habitat_detail) parts.push(record.habitat_detail);
  if (record.commonness) parts.push(`Commonness: ${record.commonness}${record.commonness_basis ? ` — ${record.commonness_basis}` : ''}.`);
  if (record.other_uses) parts.push(`Other uses: ${record.other_uses}`);
  if (record.changes_over_time) parts.push(`Changes over time: ${record.changes_over_time}`);
  return parts.join(' ');
}
function renderLookAlikes(record) {
  const raw = uniqueStrings(record.look_alikes || []);
  const comparison = String(record.comparison_notes || '').trim();
  if (!raw.length && !comparison) return '';
  const rendered = raw.map((name) => {
    const linked = findLinkedRecord(name);
    const danger = linked ? /(poison|toxic|deadly)/i.test(String(linked.non_edible_severity || '')) : /(poison|toxic|deadly|galerina|hemlock)/i.test(String(name));
    if (linked) {
      return `<a class="inline-chip-link${danger ? ' danger' : ''}" href="#detail/${encodeURIComponent(linked.slug)}" data-detail-link="${escapeHtml(linked.slug)}">${escapeHtml(linked.display_name)}</a>`;
    }
    return `<span class="tag${danger ? ' danger' : ''}">${escapeHtml(name)}</span>`;
  }).join('');
  return `<section class="detail-card section-block"><h3>Looks-alikes / easily confused</h3>${raw.length ? `<div class="related-link-list">${rendered}</div>` : ''}${comparison ? `<p style="margin-top:10px;">${escapeHtml(comparison)}</p>` : ''}</section>`;
}
function renderMushroomOverview(record) {
  const profile = record.mushroom_profile || {};
  const caution = String(profile.caution_level || '').replaceAll('_', ' ');
  const edibility = prettyEdibilityStatus(profile.edibility_status || '');
  return `<section class="detail-card section-block"><h3>Mushroom</h3>${line('Scientific name', record.scientific_name || '')}${line('Family grouping', record.mushroom_family || '')}${line('Entry scope', String(profile.entry_scope || '').replaceAll('_', ' '))}${line('Edibility', edibility)}${line('Caution level', caution)}${line('Ecology', profile.ecology || '')}${line('Summary', profile.summary || '')}${line('Spore print', profile.spore_print || '')}${line('Season note', stripCookingBoilerplate(profile.season_note || ''))}${(record.non_edible_severity || record.effects_on_body) ? `${line('Severity', record.non_edible_severity || '')}${line('Affected systems', (record.affected_systems || []).join(', '))}${line('Effects', record.effects_on_body || '')}` : ''}</section>`;
}
function renderGeneralDetail(record, header, gallery, genericLinks) {
  return `<div class="detail-layout"><div class="detail-gallery">${gallery}${renderImageCredits(record)}</div><div class="detail-grid">${header}${paragraphSection('Culinary uses', stripCookingBoilerplate(record.culinary_uses), 'Not provided in the imported sheet.')}${paragraphSection('Medicinal uses', mergedMedicinalText(record), 'Not provided in the imported sheet.')}${tagSection('Identification tips', uniqueStrings([...(record.habitat || []), ...(record.observedPart || []), ...(record.size || []), ...(record.taste || [])]), 'No identification tips tagged yet')}${paragraphSection('Notes', combinedNotes(record), 'No extra notes imported.')}${tagSection('Seasonality', record.months_available, 'No month data')}${renderLookAlikes(record)}${genericLinks}<p class="small-note">Supabase table target: <strong>${TABLE_NAME}</strong></p></div></div>`;
}
export function renderDetail(record) {
  const images = uniqueImages(record.images || []);
  const fallbackSources = serializeDetailFallbackSources(images, 1200);
  const gallery = images.length ? images.map((path, index) => `<img src="${encodeURI(resolvedImageUrl(path, 1200))}" ${index === 0 ? `data-fallback-sources="${fallbackSources}" data-fallback-index="0"` : ''} alt="${escapeHtml(record.display_name)}">`).join("") : `<div class="thumb placeholder" style="width:100%;height:220px;">No image imported</div>`;
  const genericLinks = record.links?.length ? `<section class="detail-card section-block"><h3>Sources</h3><ul>${record.links.map(link => `<li><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></li>`).join("")}</ul></section>` : "";
  const header = `<section class="detail-card"><span class="category-pill">${escapeHtml(record.category)}</span><h2 style="margin-top:10px;">${escapeHtml(record.display_name)}</h2><p style="margin-top:8px;">${escapeHtml(record.common_name || "No alternate common name imported.")}</p>${record.scientific_name ? `<p class="small-note"><strong>${escapeHtml(record.scientific_name)}</strong></p>` : ""}</section>`;

  if (record.category !== 'Mushroom') return renderGeneralDetail(record, header, gallery, genericLinks);

  return `<div class="detail-layout"><div class="detail-gallery">${gallery}${renderImageCredits(record)}</div><div class="detail-grid">${header}${renderSafetyWarning(record)}${renderMushroomOverview(record)}${paragraphSection('Culinary uses', normalizeMushroomCulinaryText(record), 'Not provided in the imported sheet.')}${paragraphSection('Medicinal uses', mergedMedicinalText(record), 'Not provided in the imported sheet.')}${tagSection('Identification tips', mergedIdentificationTips(record), 'No identification tips tagged yet')}${paragraphSection('Notes', combinedNotes(record), 'No extra notes imported.')}${tagSection('Seasonality', record.months_available, 'No month data')}${renderLookAlikes(record)}${renderRelatedMushrooms(record)}${genericLinks}<p class="small-note">Supabase table target: <strong>${TABLE_NAME}</strong></p></div></div>`;
}
