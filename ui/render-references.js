function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

export function renderReferencesPage(records, search = "") {
  const q = String(search || "").trim().toLowerCase();
  const filtered = (records || []).filter(item => {
    if (!q) return true;
    return [item.title, item.source, item.summary, ...(item.topics || [])].join(" ").toLowerCase().includes(q);
  });

  return `
    <section class="panel">
      <h2>References</h2>
      <div class="control-row">
        <input id="refSearch" type="search" value="${esc(search)}" placeholder="Search references" style="flex:1;min-width:280px">
        <button id="refSearchBtn" class="primary" type="button">Search</button>
      </div>
    </section>

    ${filtered.length ? `<section class="record-list">${filtered.map(item => `
      <article class="record-card">
        <h3>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.title || "Untitled reference")}</a>` : esc(item.title || "Untitled reference")}</h3>
        <p class="muted small">${esc([item.source, item.published, item.resourceType].filter(Boolean).join(" · "))}</p>
        ${item.summary ? `<p>${esc(item.summary)}</p>` : ""}
      </article>
    `).join("")}</section>` : `<section class="panel empty-state"><h3>No references found</h3></section>`}
  `;
}
