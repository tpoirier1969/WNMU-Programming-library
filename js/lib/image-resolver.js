import { state, rememberImageCredit, rememberImageFailure, rememberImageResult } from "../state.js";
import { getCommonsSearchUrl, resolveCommonsImage } from "./commons.js";

function escAttr(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function firstLocalPath(record) {
  return Array.isArray(record?.images) && record.images.length ? String(record.images[0]) : "";
}

function placeholderSvg(label) {
  const text = String(label || 'No image').slice(0, 42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#eef3ef"/><rect x="40" y="40" width="1120" height="720" rx="28" ry="28" fill="#f8fbf8" stroke="#c9d5cd" stroke-width="6"/><circle cx="290" cy="300" r="70" fill="#dce9df"/><path d="M150 620l210-210 120 110 155-165 210 265H150z" fill="#dce9df"/><text x="600" y="690" text-anchor="middle" font-family="system-ui, sans-serif" font-size="46" fill="#5f6d63">${text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function setBadge(container, text) {
  const badge = container?.querySelector('[data-image-badge]');
  if (badge) badge.textContent = text;
}

function setSourceLink(container, href, label = 'source') {
  const link = container?.querySelector('[data-image-source-link]');
  if (!link) return;
  if (href) {
    link.href = href;
    link.textContent = label;
    link.hidden = false;
  } else {
    link.hidden = true;
    link.removeAttribute('href');
  }
}

function noteLocalCredit(record, localPath) {
  rememberImageCredit(record.slug, {
    slug: record.slug,
    species: record.display_name || record.common_name || record.slug,
    scientific_name: record.scientific_name || '',
    source: 'local',
    title: localPath.split('/').pop() || localPath,
    localPath,
    sourcePage: localPath,
    license: 'Local bundled image',
    author: ''
  });
}

async function applyCommonsFallback(img, record, container) {
  try {
    const cached = state.imageCache.get(record.slug);
    const resolved = cached?.source === 'wikimedia' ? cached : await resolveCommonsImage(record);
    if (!resolved) throw new Error('No Wikimedia image found');
    rememberImageResult(record.slug, resolved);
    rememberImageCredit(record.slug, {
      slug: record.slug,
      species: record.display_name || record.common_name || record.slug,
      scientific_name: record.scientific_name || '',
      source: 'wikimedia',
      title: resolved.title,
      author: resolved.author,
      credit: resolved.credit,
      license: resolved.license,
      licenseUrl: resolved.licenseUrl,
      sourcePage: resolved.sourcePage,
      query: resolved.query
    });
    img.src = resolved.src;
    img.dataset.resolvedSource = 'wikimedia';
    setBadge(container, 'Wikimedia');
    setSourceLink(container, resolved.sourcePage, 'Commons');
    return true;
  } catch (err) {
    rememberImageFailure(record.slug);
    img.src = placeholderSvg(record.display_name || record.common_name || record.slug || 'No image');
    img.dataset.resolvedSource = 'missing';
    setBadge(container, 'No photo');
    setSourceLink(container, getCommonsSearchUrl(record), 'Search Commons');
    return false;
  }
}

export function renderImageSlot(record, variant = 'card') {
  const localSrc = firstLocalPath(record);
  const alt = record.display_name || record.common_name || record.slug || 'Species photo';
  return `
    <figure class="record-image-slot ${escAttr(variant)}">
      <img
        class="record-image ${escAttr(variant)}"
        data-record-image
        data-slug="${escAttr(record.slug || '')}"
        data-local-src="${escAttr(localSrc)}"
        data-alt="${escAttr(alt)}"
        alt="${escAttr(alt)}"
        loading="lazy"
      >
      <figcaption class="image-meta-line">
        <span class="image-source-badge" data-image-badge>Photo</span>
        <a hidden data-image-source-link target="_blank" rel="noreferrer">source</a>
      </figcaption>
    </figure>
  `;
}

async function hydrateImage(img, record) {
  const container = img.closest('.record-image-slot');
  const localSrc = img.dataset.localSrc || firstLocalPath(record);
  img.alt = img.dataset.alt || img.alt || record.display_name || record.common_name || record.slug || 'Species photo';

  const cached = state.imageCache.get(record.slug);
  if (cached?.source === 'wikimedia' && cached.src) {
    img.src = cached.src;
    setBadge(container, 'Wikimedia');
    setSourceLink(container, cached.sourcePage, 'Commons');
    return;
  }
  if (cached?.source === 'local' && cached.src) {
    img.src = cached.src;
    setBadge(container, 'Local');
    setSourceLink(container, cached.sourcePage || cached.src, 'Local');
    return;
  }

  if (localSrc) {
    img.addEventListener('load', () => {
      const result = { source: 'local', src: localSrc, sourcePage: localSrc };
      rememberImageResult(record.slug, result);
      noteLocalCredit(record, localSrc);
      setBadge(container, 'Local');
      setSourceLink(container, localSrc, 'Local');
    }, { once: true });

    img.addEventListener('error', async () => {
      await applyCommonsFallback(img, record, container);
    }, { once: true });

    img.src = localSrc;
    return;
  }

  await applyCommonsFallback(img, record, container);
}

export function installLazyImages(root, getRecordBySlug) {
  const images = Array.from(root.querySelectorAll('img[data-record-image]'));
  if (!images.length) return;

  const hydrate = (img) => {
    if (img.dataset.hydrated === '1') return;
    img.dataset.hydrated = '1';
    const record = getRecordBySlug(img.dataset.slug || '');
    if (!record) return;
    hydrateImage(img, record);
  };

  if (typeof IntersectionObserver !== 'function') {
    images.forEach(hydrate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      hydrate(entry.target);
    });
  }, { rootMargin: '240px 0px' });

  images.forEach(img => observer.observe(img));
}
