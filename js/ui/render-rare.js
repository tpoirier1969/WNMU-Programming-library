import { esc } from "../lib/escape.js";
import { renderImageSlot } from "../lib/image-resolver.js";

export function renderRarePage(records, search = "") {
  const q = String(search || "").trim().toLowerCase();
  const filtered = (records || []).filter(record => {
    if (!q) return true;
    return [
      record.common_name, record.scientific_name, record.slug, record.status,
      record.reason, record.short_reason, ...(record.key_features || [])
    ].join(" ").toLowerCase().includes(q);
  });

  return `
    <section class="panel">
      <h2>Rare species</h2>
      <div class="control-row">
        <input id="rareSearch" type="search" value="${esc(search)}" placeholder="Search rare species" style="flex:1;min-width:280px">
        <button id="rareSearchBtn" class="primary" type="button">Search</button>
      </div>
    </section>

    ${filtered.length ? `<section class="record-list">${filtered.map(record => `
      <article class="record-card with-image">
        ${renderImageSlot(record, 'card')}
        <div class="record-card-body">
          <h3>${esc(record.common_name || record.display_name || record.slug)}</h3>
          <p class="muted small">${esc(record.scientific_name || "")}</p>
          <div class="record-meta">
            ${record.group ? `<span class="tag">${esc(record.group)}</span>` : ""}
            ${record.status ? `<span class="tag warn">${esc(record.status)}</span>` : ""}
          </div>
          <p>${esc(record.short_reason || record.reason || record.habitat || "")}</p>
        </div>
      </article>
    `).join("")}</section>` : `<section class="panel empty-state"><h3>No rare species found</h3></section>`}
  `;
}
