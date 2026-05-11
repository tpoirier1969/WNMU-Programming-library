function escAttr(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function buildImageCell(record, variant, index) {
  const alt = `${record.display_name || record.common_name || record.slug || "Species photo"} photo ${index + 1}`;
  return `
    <figure class="record-image-cell ${escAttr(variant)}">
      <img
        class="record-image ${escAttr(variant)}"
        data-record-image
        data-slug="${escAttr(record.slug || "") }"
        data-image-index="${index}"
        data-alt="${escAttr(alt)}"
        alt="${escAttr(alt)}"
        src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
        loading="lazy"
        decoding="async"
      >
      <figcaption class="image-meta-line">
        <span class="image-source-badge" data-image-badge>Photo</span>
        <a hidden data-image-source-link target="_blank" rel="noreferrer">source</a>
      </figcaption>
    </figure>
  `;
}

export function renderImageSlot(record, variant = "card") {
  const count = variant === 'detail' ? 3 : 1;
  return `
    <section class="record-image-slot ${escAttr(variant)} ${count > 1 ? 'gallery' : 'single'}" data-image-count="${count}">
      ${Array.from({ length: count }, (_, i) => buildImageCell(record, variant, i)).join('')}
    </section>
  `;
}
