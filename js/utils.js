export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function compactText(value = "", fallback = "Not listed") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}
export function slugifyHash(hashValue = "") {
  return hashValue.replace(/^#\/?/, "").replace(/^\//, "").trim() || "home";
}
export function monthSet(record) {
  return new Set(record.months_available || []);
}

const GENERIC_MEDICINAL_ACTIONS = new Set([
  'antioxidant',
  'nutritive / nutrient-dense',
  'tonic / restorative',
  'immune support',
  'circulatory support'
]);

const GENERIC_MEDICINAL_SYSTEMS = new Set([
  'immune system',
  'general nutritive',
  'circulatory / cardiovascular'
]);

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normText(value = '') {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasSpecificMedicinalLanguage(text) {
  return /(anti[- ]?inflammatory|analgesic|pain relief|antimicrobial|antiviral|antibacterial|astringent|carminative|demulcent|digestive|diuretic|expectorant|decongestant|fever|flu|cold|cough|wound|vulnerary|rash|skin|liver|urinary|menstrual|reproductive|nervous system|sedative|calming|anxiety|stress|nausea|sore throat|mouth sores|arthritis|joint pain|cramps|prebiotic|gut support)/.test(text);
}

function isNutritionOnlyText(text) {
  return /(high in vitamin|rich in vitamin|rich in vitamins|rich in healthy fats|energy source|supports overall health|supports immune health|supports cardiovascular health|antioxidant support)/.test(text);
}

export function hasMedicinal(record) {
  const usesText = normText(record?.medicinal_uses || '');
  const actions = asList(record?.medicinalAction).map(normText);
  const systems = asList(record?.medicinalSystem).map(normText);
  const terms = asList(record?.medicinalTerms).map(normText);

  if (terms.length > 0) return true;
  if (actions.some(action => action && !GENERIC_MEDICINAL_ACTIONS.has(action))) return true;
  if (systems.some(system => system && !GENERIC_MEDICINAL_SYSTEMS.has(system))) return true;
  if (hasSpecificMedicinalLanguage(usesText)) return true;

  if (!usesText) return false;
  if (isNutritionOnlyText(usesText)) return false;

  const hasOnlyGenericActions = actions.length > 0 && actions.every(action => GENERIC_MEDICINAL_ACTIONS.has(action));
  const hasOnlyGenericSystems = systems.length === 0 || systems.every(system => GENERIC_MEDICINAL_SYSTEMS.has(system));
  if (hasOnlyGenericActions && hasOnlyGenericSystems) return false;

  return false;
}
