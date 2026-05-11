import { PLANT_CATEGORIES } from "./constants.js?v=v2.0";
import { compactText, hasMedicinal } from "./utils.js?v=v2.0";
import { inferTraits } from "./trait-inference.js?v=v2.0";

export function normalizeRecord(record) {
  const base = {
    ...record,
    display_name: compactText(record.display_name || record.common_name, "Untitled species"),
    common_name: compactText(record.common_name || record.display_name, ""),
    category: compactText(record.category, "Uncategorized"),
    scientific_name: compactText(record.scientific_name, ""),
    culinary_uses: compactText(record.culinary_uses, ""),
    medicinal_uses: compactText(record.medicinal_uses, ""),
    notes: compactText(record.notes, ""),
    months_available: Array.isArray(record.months_available) ? record.months_available : [],
    links: Array.isArray(record.links) ? record.links : [],
    images: Array.isArray(record.images) ? record.images : []
  };
  return { ...base, ...inferTraits(base) };
}
export function sortRecords(records) {
  return records.slice().sort((a,b) => a.display_name.localeCompare(b.display_name));
}
export function isPlant(record) {
  return PLANT_CATEGORIES.has(record.category);
}
export function isMushroom(record) {
  return record.category === "Mushroom";
}
export function medicinalRecords(records) {
  return records.filter(hasMedicinal);
}
export function reviewRecords(records) {
  return records.filter(r => (r.reviewReasons || []).length);
}

export function lookalikeRecords(records) {
  return records.filter(r => (r.look_alikes || []).length || !!r.non_edible_severity);
}
