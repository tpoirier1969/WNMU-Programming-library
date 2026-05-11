import { MONTH_SHORT, MONTHS } from "../constants.js?v=v2.0";
import { escapeHtml } from "../utils.js?v=v2.0";

function seasonStrip(record) {
  const active = new Set(record.months_available || []);
  return MONTHS.map((month, index) => `<span class="month ${active.has(month) ? "on" : ""}">${MONTH_SHORT[index]}</span>`).join("");
}

function mushroomSummary(record) {
  const profile = record.mushroom_profile || {};
  const bits = [
    record.non_edible_severity ? `Risk: ${record.non_edible_severity}` : (profile.edibility_status ? `Edibility: ${profile.edibility_status.replaceAll("_", " ")}` : ""),
    record.substrate?.[0],
    record.treeType?.[0],
    record.hostTree?.[0],
    record.underside?.[0]
  ].filter(Boolean);
  return bits.join(" · ") || profile.summary || record.notes || record.culinary_uses;
}

function summaryForContext(record, context = "general") {
  if (context === "medicinal") return record.medicinal_uses || record.notes || record.culinary_uses;
  if (context === "mushrooms") return mushroomSummary(record);
  if (context === "lookalikes") return record.edibility_detail || record.effects_on_body || (record.look_alikes || []).join(" · ") || record.notes;
  if (context === "review") return (record.reviewReasons || []).join(" · ");
  const bits = [record.category, record.habitat?.[0], record.observedPart?.[0], record.taste?.[0]].filter(Boolean);
  return bits.join(" · ") || record.culinary_uses || record.notes || record.medicinal_uses;
}

export function renderResultCard(record, context = "general") {
  const thumb = record.images?.[0]
    ? `<div class="thumb" style="background-image:url('${encodeURI(record.images[0])}')"></div>`
    : `<div class="thumb placeholder">No image</div>`;

  const tags = [];
  if (context === "mushrooms") {
    if (record.mushroom_profile?.edibility_status) tags.push(record.mushroom_profile.edibility_status.replaceAll("_", " "));
    if (record.substrate?.[0]) tags.push(record.substrate[0]);
    if (record.treeType?.[0]) tags.push(record.treeType[0]);
    if (record.hostTree?.[0]) tags.push(record.hostTree[0]);
    if (record.underside?.[0]) tags.push(record.underside[0]);
  } else if (context === "medicinal") {
    if (record.medicinalAction?.[0]) tags.push(record.medicinalAction[0]);
    if (record.medicinalSystem?.[0]) tags.push(record.medicinalSystem[0]);
    if (record.medicinalTerms?.[0]) tags.push(record.medicinalTerms[0]);
  } else if (context === "lookalikes") {
    if (record.non_edible_severity) tags.push(record.non_edible_severity);
    if (record.affected_systems?.[0]) tags.push(record.affected_systems[0]);
    if ((record.look_alikes || []).length) tags.push(`${record.look_alikes.length} linked match${record.look_alikes.length===1?'':'es'}`);
  } else if (context === "review") {
    tags.push(...(record.reviewReasons || []).slice(0,3));
  } else {
    if (record.habitat?.[0]) tags.push(record.habitat[0]);
    if (record.observedPart?.[0]) tags.push(record.observedPart[0]);
    if (record.size?.[0]) tags.push(record.size[0]);
    if (record.taste?.[0]) tags.push(record.taste[0]);
  }

  if (!tags.length) {
    tags.push(record.months_available?.length ? `${record.months_available.length} mo.` : "No month data");
    if (record.images?.length) tags.push(`${record.images.length} img`);
  }

  return `
    <article class="result-card ${context === "review" ? "review-card" : ""}">
      ${thumb}
      <div class="card-main">
        <div class="card-topline">
          <a class="card-title-link" href="#detail/${encodeURIComponent(record.slug)}" data-detail-link="${escapeHtml(record.slug)}">${escapeHtml(record.display_name)}</a>
          <span class="category-pill">${escapeHtml(record.category)}</span>
        </div>
        <p class="one-line">${escapeHtml(summaryForContext(record, context) || "No summary imported yet.")}</p>
        <p class="one-line muted-line scientific-line">${escapeHtml(record.scientific_name || record.common_name || "")}</p>
        <div class="tag-row">${tags.filter(Boolean).slice(0,5).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="month-strip">${seasonStrip(record)}</div>
      </div>
    </article>
  `;
}
