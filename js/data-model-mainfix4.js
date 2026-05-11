import { PLANT_CATEGORIES } from "./constants-mainfix.js?v=2026-04-17-34";
import { compactText, hasMedicinal } from "./utils.js?v=v3.2.0";
import { inferTraits } from "./trait-inference-mainfix4.js?v=v3.2.0";

const FORAGING_MUSHROOM_STATUSES = new Set(["choice","choice_cooked_only","edible","edible_with_caution","edible_when_young","edible_when_white_inside","edible_mediocre","choice_with_precision","good","edible_young_only"]);
const AVOID_MUSHROOM_STATUSES = new Set(["emergency_only","inedible_tough","inedible_bitter","nonculinary_tea","poisonous","deadly_poisonous","toxic_or_psychoactive","toxic_or_dangerous","review_required","questionable_or_mediocre"]);
const NON_FOOD_PLANT_PATTERNS = /(poison|toxic|deadly|inedible|do not eat|not edible|non-culinary|ornamental only)/;
const TEA_PATTERNS = /(tea|infusion|tisane|decoction|extract|tincture)/;
const IMAGE_REVIEW_PATTERNS = /(missing image|image needs|needs image|image import|needs to be imported|import image)/i;

function severityText(record) { return String(record?.non_edible_severity || '').trim().toLowerCase(); }
function edibleStatus(record) { return String(record?.mushroom_profile?.edibility_status || '').trim().toLowerCase(); }
function culinaryText(record) { return String(record?.culinary_uses || '').trim().toLowerCase(); }
function notesText(record) { return [record?.notes, record?.medicinal_uses, record?.edibility_detail, record?.other_uses].join(' ').trim().toLowerCase(); }
function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}
function mergedReviewReasons(base) {
  const manual = [...asList(base.manual_review_reasons), ...asList(base.manualReviewReasons), ...asList(base.review_reasons), ...asList(base.reviewReasons)];
  return [...new Set(manual)];
}
function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}
function hasRealLookalikes(record) {
  const lookalikes = asList(record?.look_alikes).map(v => String(v).trim().toLowerCase());
  return lookalikes.some(v => v && !v.includes('none documented') && !v.includes('none specifically documented'));
}
function normalizeFoodRole(value) {
  const text = String(value || '').trim().toLowerCase();
  if (["food","medicinal_only","tea_extract_only","emergency_only","avoid","unclear"].includes(text)) return text;
  return '';
}
function normalizePrimaryUse(value) {
  const text = String(value || '').trim().toLowerCase();
  if (["food","medicinal","tea_extract","emergency","avoid","mixed","unclear"].includes(text)) return text;
  return '';
}
function normalizeFoodQuality(value) {
  const text = String(value || '').trim().toLowerCase();
  if (["choice","good","fair","survival"].includes(text)) return text;
  return '';
}
function deriveFoodRole(record) {
  const explicit = normalizeFoodRole(record?.food_role);
  if (explicit) return explicit;
  const severity = severityText(record);
  const culinary = culinaryText(record);
  const notes = notesText(record);
  if (record?.category === 'Mushroom') {
    const status = edibleStatus(record);
    if (FORAGING_MUSHROOM_STATUSES.has(status)) return 'food';
    if (status === 'nonculinary_tea') return 'tea_extract_only';
    if (status === 'emergency_only') return 'emergency_only';
    if (AVOID_MUSHROOM_STATUSES.has(status)) return 'avoid';
    if (/poison|deadly|toxic|inedible|questionable/.test(severity)) return 'avoid';
    if (/tea|extract|tincture|decoction/.test(culinary + ' ' + notes) && !culinary) return 'tea_extract_only';
    if (hasMedicinal(record) && !culinary) return 'medicinal_only';
    return 'unclear';
  }
  if (NON_FOOD_PLANT_PATTERNS.test(severity)) return 'avoid';
  if (culinary && !NON_FOOD_PLANT_PATTERNS.test(culinary)) return 'food';
  if (TEA_PATTERNS.test(culinary + ' ' + notes) && !culinary) return 'tea_extract_only';
  if (hasMedicinal(record)) return 'medicinal_only';
  return 'unclear';
}
function derivePrimaryUse(record, foodRole) {
  const explicit = normalizePrimaryUse(record?.primary_use);
  if (explicit) return explicit;
  if (foodRole === 'food') return 'food';
  if (foodRole === 'medicinal_only') return 'medicinal';
  if (foodRole === 'tea_extract_only') return 'tea_extract';
  if (foodRole === 'emergency_only') return 'emergency';
  if (foodRole === 'avoid') return 'avoid';
  return 'unclear';
}
function deriveFoodQuality(record, foodRole) {
  const explicit = normalizeFoodQuality(record?.food_quality);
  if (explicit) return explicit;
  if (foodRole !== 'food') return '';
  const status = edibleStatus(record);
  if (/choice/.test(status)) return 'choice';
  if (['good','edible','edible_young_only','edible_when_young','edible_with_caution','edible_when_white_inside'].includes(status)) return 'good';
  if (status === 'edible_mediocre') return 'fair';
  return '';
}
function mushroomHasPores(record) {
  return asList(record?.underside || record?.mushroom_profile?.underside).some((value) => String(value).toLowerCase().includes('pore'));
}
function mushroomGenus(record) {
  return String(record?.scientific_name || '').trim().split(/\s+/)[0].toLowerCase();
}
function deriveBoleteGroup(record) {
  if (record?.category !== 'Mushroom' || !mushroomHasPores(record)) return [];
  const genus = mushroomGenus(record);
  const text = `${record?.display_name || ''} ${record?.common_name || ''} ${record?.notes || ''}`.toLowerCase();
  if (genus === 'suillus') return ['Suillus / slippery jacks'];
  if (genus === 'leccinum') return ['Leccinum / scaber stalks'];
  if (genus === 'tylopilus') return ['Tylopilus / bitter boletes'];
  if (genus === 'strobilomyces') return ['Oddballs / shaggy boletes'];
  if (['baorangia','butyriboletus','xerocomellus'].includes(genus) || /stain|blue|red|yellow/.test(text)) return ['Red & staining boletes'];
  if (['aureoboletus','hemileccinum','imleria'].includes(genus)) return ['Brown / king allies'];
  return ['Brown / king allies'];
}
function derivePoreColor(record) {
  if (record?.category !== 'Mushroom' || !mushroomHasPores(record)) return [];
  const genus = mushroomGenus(record);
  const slug = String(record?.slug || '').toLowerCase();
  if (genus === 'suillus') return ['Yellow'];
  if (genus === 'leccinum') return ['White / cream'];
  if (genus === 'tylopilus') return ['Pinkish'];
  if (genus === 'strobilomyces') return ['Gray / black'];
  if (['baorangia','butyriboletus'].includes(genus)) return ['Yellow', 'Red / orange'];
  if (genus === 'imleria' || genus === 'xerocomellus' || slug.includes('bay-bolete') || slug.includes('red-cracking')) return ['Yellow', 'Olive'];
  if (['aureoboletus','hemileccinum'].includes(genus)) return ['Yellow'];
  return [];
}
function deriveStemFeature(record) {
  if (record?.category !== 'Mushroom' || !mushroomHasPores(record)) return [];
  const genus = mushroomGenus(record);
  const slug = String(record?.slug || '').toLowerCase();
  if (genus === 'suillus') return ['Glandular dots'];
  if (genus === 'leccinum') return ['Scabers / rough dots'];
  if (genus === 'strobilomyces' || slug.includes('shaggy-stalked')) return ['Shaggy / scaly'];
  if (slug.includes('frosts-bolete') || slug.includes('admirable-bolete')) return ['Reticulate / netted'];
  if (genus === 'aureoboletus') return ['Reticulate / netted'];
  return ['Smooth'];
}
export function normalizeRecord(record) {
  const base = {
    ...record,
    display_name: compactText(record.display_name || record.common_name, 'Untitled species'),
    common_name: compactText(record.common_name || record.display_name, ''),
    category: compactText(record.category, 'Uncategorized'),
    scientific_name: compactText(record.scientific_name, ''),
    culinary_uses: compactText(record.culinary_uses, ''),
    medicinal_uses: compactText(record.medicinal_uses, ''),
    notes: compactText(record.notes, ''),
    months_available: Array.isArray(record.months_available) ? record.months_available : [],
    links: uniqueStrings(Array.isArray(record.links) ? record.links : []),
    images: uniqueStrings(Array.isArray(record.images) ? record.images : []),
    look_alikes: uniqueStrings(Array.isArray(record.look_alikes) ? record.look_alikes : [])
  };
  const inferred = inferTraits(base);
  let reviewReasons = [...new Set([...mergedReviewReasons(base), ...(inferred.reviewReasons || [])])];
  if (base.images.length) reviewReasons = reviewReasons.filter((reason) => !IMAGE_REVIEW_PATTERNS.test(String(reason || '')));
  const merged = { ...base, ...inferred, reviewReasons };
  const food_role = deriveFoodRole(merged);
  const primary_use = derivePrimaryUse(merged, food_role);
  const food_quality = deriveFoodQuality(merged, food_role);
  const boleteGroup = deriveBoleteGroup(merged);
  const poreColor = derivePoreColor(merged);
  const stemFeature = deriveStemFeature(merged);
  return { ...merged, food_role, primary_use, food_quality, boleteGroup, poreColor, stemFeature };
}
export function sortRecords(records) { return records.slice().sort((a,b) => a.display_name.localeCompare(b.display_name)); }
export function isPlant(record) { return PLANT_CATEGORIES.has(record.category); }
export function isMushroom(record) { return record.category === 'Mushroom'; }
export function isFoodSpecies(record) { return record?.food_role === 'food'; }
export function isEdiblePlant(record) { return isPlant(record) && isFoodSpecies(record); }
export function isForagingMushroom(record) { return isMushroom(record) && isFoodSpecies(record); }
export function medicinalRecords(records) { return records.filter(record => hasMedicinal(record) || record?.food_role === 'medicinal_only' || record?.primary_use === 'medicinal'); }
export function reviewRecords(records) { return records.filter(r => (r.reviewReasons || []).length); }
export function avoidRecords(records) {
  return records.filter(record => {
    if (record?.food_role === 'avoid' || record?.food_role === 'emergency_only' || record?.food_role === 'tea_extract_only' || record?.food_role === 'medicinal_only') return true;
    if (!isMushroom(record) && !!record.non_edible_severity) return true;
    return hasRealLookalikes(record) && (record?.food_role === 'avoid' || record?.primary_use === 'avoid' || !!record.non_edible_severity);
  });
}
