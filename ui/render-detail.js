function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function lineIf(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}

function listBlock(title, values) {
  if (!Array.isArray(values) || !values.length) return "";
  return `<section class="detail-block"><h4>${esc(title)}</h4><ul class="list-tight">${values.map(v => `<li>${esc(v)}</li>`).join("")}</ul></section>`;
}

export function renderDetail(record) {
  const typeLabel = record.category || record.group || "";
  const months = Array.isArray(record.months_available) ? record.months_available.join(", ") : "";
  const links = Array.isArray(record.links) ? record.links : [];
  return `
    <article class="detail-grid">
      <section class="detail-block">
        <h3>${esc(record.display_name || record.common_name || record.slug || "Untitled")}</h3>
        <p class="muted">${esc(record.scientific_name || "")}</p>
        <div class="record-meta">
          ${typeLabel ? `<span class="tag">${esc(typeLabel)}</span>` : ""}
          ${record.commonness ? `<span class="tag">${esc(record.commonness)}</span>` : ""}
          ${record.non_edible_severity ? `<span class="tag danger">${esc(record.non_edible_severity)}</span>` : ""}
          ${record.status ? `<span class="tag warn">${esc(record.status)}</span>` : ""}
        </div>
      </section>

      <section class="detail-block">
        <h4>Overview</h4>
        <dl class="kv">
          ${lineIf("Common name", record.common_name)}
          ${lineIf("Scientific name", record.scientific_name)}
          ${lineIf("Category", record.category || record.group)}
          ${lineIf("Season", months)}
          ${lineIf("Primary use", record.primary_use)}
          ${lineIf("Food role", record.food_role)}
          ${lineIf("Food quality", record.food_quality)}
          ${lineIf("Commonness", record.commonness)}
          ${lineIf("Habitat", Array.isArray(record.habitat) ? record.habitat.join(", ") : (record.habitat_detail || record.habitat))}
          ${lineIf("Short reason", record.short_reason)}
          ${lineIf("Reason", record.reason)}
        </dl>
      </section>

      ${record.culinary_uses ? `<section class="detail-block"><h4>Culinary uses</h4><p>${esc(record.culinary_uses)}</p></section>` : ""}
      ${record.medicinal_uses ? `<section class="detail-block"><h4>Medicinal uses</h4><p>${esc(record.medicinal_uses)}</p></section>` : ""}
      ${record.edibility_detail ? `<section class="detail-block"><h4>Edibility / caution</h4><p>${esc(record.edibility_detail)}</p></section>` : ""}
      ${record.notes ? `<section class="detail-block"><h4>Notes</h4><p>${esc(record.notes)}</p></section>` : ""}
      ${record.comparison_notes ? `<section class="detail-block"><h4>Comparison notes</h4><p>${esc(record.comparison_notes)}</p></section>` : ""}

      ${listBlock("Look-alikes", record.look_alikes || record.lookalikes)}
      ${listBlock("Review reasons", record.reviewReasons)}
      ${listBlock("Key features", record.key_features)}
      ${listBlock("Distinguishing features", record.distinguishing_features)}
      ${listBlock("Medicinal actions", record.medicinalAction)}
      ${listBlock("Medicinal systems", record.medicinalSystem)}
      ${listBlock("Medicinal terms", record.medicinalTerms)}

      ${links.length ? `<section class="detail-block"><h4>Links</h4><ul class="list-tight">${links.map(url => `<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a></li>`).join("")}</ul></section>` : ""}
    </article>
  `;
}
