import { classifyRecord } from "../lib/merge.js";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function makeMeta(record) {
  const bits = [];
  if (record.category) bits.push(`<span class="tag">${esc(record.category)}</span>`);
  if (record.commonness) bits.push(`<span class="tag">${esc(record.commonness)}</span>`);
  if (record.food_quality) bits.push(`<span class="tag good">${esc(record.food_quality)}</span>`);
  if (record.non_edible_severity) bits.push(`<span class="tag danger">${esc(record.non_edible_severity)}</span>`);
  if (record.status) bits.push(`<span class="tag warn">${esc(record.status)}</span>`);
  return bits.join("");
}

export function filterRecords(records, route, search = "") {
  const q = String(search || "").trim().toLowerCase();
  return (records || []).filter(record => {
    const { isPlant, isMushroom, medicinal, lookalike } = classifyRecord(record);
    if (route === "plants" && !isPlant) return false;
    if (route === "mushrooms" && !isMushroom) return false;
    if (route === "medicinal" && !medicinal) return false;
    if (route === "lookalikes" && !lookalike) return false;
    if (!q) return true;
    const hay = [
      record.display_name, record.common_name, record.scientific_name, record.slug,
      record.category, record.culinary_uses, record.medicinal_uses,
      record.notes, record.edibility_detail, record.commonness, record.habitat_detail
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function renderRecordCards(records) {
  if (!records.length) return `<section class="panel empty-state"><h3>No matches</h3></section>`;
  return `<section class="record-list">${records.map(record => `
    <article class="record-card">
      <h3>${esc(record.display_name || record.common_name || record.slug || "Untitled")}</h3>
      <p class="muted small">${esc(record.scientific_name || "")}</p>
      <div class="record-meta">${makeMeta(record)}</div>
      <p>${esc(record.short_reason || record.classification_note || record.notes || record.habitat_detail || "").slice(0, 240)}</p>
      <div class="control-row">
        <button class="primary" type="button" data-detail="${esc(record.slug)}">Open details</button>
      </div>
    </article>
  `).join("")}</section>`;
}
