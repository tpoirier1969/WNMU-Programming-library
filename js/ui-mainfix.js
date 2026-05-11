import { APP_VERSION } from "./constants-mainfix.js?v=2026-04-17-38";
import { state } from "./state.js";
import { renderDetail } from "./renderers/detail.js?v=2026-04-17-38";

const els = {
  pageRoot: document.getElementById("pageRoot"),
  versionBadge: document.getElementById("versionBadge"),
  detailModal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
  closeModalBtn: document.getElementById("closeModalBtn")
};
let detailDelegationBound = false;

function parseFallbackSources(img) {
  const raw = String(img.dataset.fallbackSources || '').trim();
  if (!raw) return [];
  return raw.split('|').map((part) => decodeURIComponent(part)).filter(Boolean);
}
function applyImageFailureFallback(img) {
  const sources = parseFallbackSources(img);
  const currentIndex = Number(img.dataset.fallbackIndex || '0');
  if (currentIndex + 1 < sources.length) {
    img.dataset.fallbackIndex = String(currentIndex + 1);
    img.src = sources[currentIndex + 1];
    return;
  }
  if (img.classList.contains('thumb-img')) {
    const wrapper = img.closest('.thumb-link');
    if (wrapper) {
      wrapper.innerHTML = '<div class="thumb placeholder">No image</div>';
      return;
    }
  }
  if (img.closest('.in-focus-card')) {
    img.style.display = 'none';
    return;
  }
  if (img.closest('.detail-gallery')) {
    const gallery = img.closest('.detail-gallery');
    img.remove();
    if (gallery && !gallery.querySelector('img')) {
      gallery.insertAdjacentHTML('afterbegin', '<div class="thumb placeholder" style="width:100%;height:220px;">No image imported</div>');
    }
    return;
  }
  img.style.display = 'none';
}
function wireImageFallbacks(root = document) {
  root.querySelectorAll('img[data-fallback-sources], .detail-gallery img').forEach((img) => {
    if (img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';
    if (img.dataset.fallbackSources && !img.dataset.fallbackIndex) img.dataset.fallbackIndex = '0';
    img.addEventListener('error', () => applyImageFailureFallback(img), { once: false });
  });
}

export function updateHeaderStats() {
  if (els.versionBadge) els.versionBadge.textContent = APP_VERSION;
}

export function renderPage(html) {
  els.pageRoot.innerHTML = html;
  wireImageFallbacks(els.pageRoot);
}

export function markActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach(link => link.classList.toggle("active", link.dataset.nav === route));
}

export function bindDetailLinks() {
  if (detailDelegationBound) return;
  document.addEventListener("click", event => {
    const link = event.target?.closest?.("[data-detail-link]");
    if (!link) return;
    event.preventDefault();
    openDetail(link.dataset.detailLink);
  });
  detailDelegationBound = true;
}

export function bindSharedActions({ onFilterChange, onClearFilters, onTimelineMonthChange, onPaneModeChange, onTimelineShift, onToggleInSeason }) {
  document.querySelectorAll("[data-filter]").forEach(el => {
    const isSearch = el.tagName === "INPUT" && el.getAttribute("type") === "search";
    if (el.tagName === "SELECT") {
      el.addEventListener("change", onFilterChange);
    } else if (isSearch) {
      el.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          onFilterChange?.({ currentTarget: el });
        }
      });
    } else {
      el.addEventListener("change", onFilterChange);
    }
  });
  document.querySelectorAll('[data-action="clear-filters"]').forEach(btn => btn.addEventListener("click", onClearFilters));
  document.querySelectorAll("[data-timeline-month]").forEach(btn => btn.addEventListener("click", () => onTimelineMonthChange?.(btn.dataset.timelineMonth)));
  document.querySelectorAll('[data-action="set-pane-mode"]').forEach(btn => btn.addEventListener("click", () => onPaneModeChange?.(btn.dataset.page, btn.dataset.paneMode)));
  document.querySelectorAll('[data-action="timeline-shift"]').forEach(btn => btn.addEventListener("click", () => onTimelineShift?.(btn.dataset.direction)));
  document.querySelectorAll('[data-action="toggle-in-season"]').forEach(btn => btn.addEventListener("click", () => onToggleInSeason?.(btn.dataset.page)));
  const activeTimeline = document.querySelector('.timeline-pill.active');
  if (activeTimeline) activeTimeline.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function showDetailModal() {
  if (!els.detailModal) return;
  if (typeof els.detailModal.showModal === 'function') {
    try { els.detailModal.showModal(); return; } catch {}
  }
  els.detailModal.setAttribute('open', 'open');
  els.detailModal.classList.add('dialog-open-fallback');
}

export function openHtmlModal(html) {
  if (!els.modalContent) return;
  els.modalContent.innerHTML = html;
  wireImageFallbacks(els.modalContent);
  showDetailModal();
}

export function openDetail(slug) {
  const record = state.allRecords.find(item => item.slug === slug);
  if (!record || !els.modalContent) return;
  els.modalContent.innerHTML = renderDetail(record);
  wireImageFallbacks(els.modalContent);
  showDetailModal();
}

export function closeDetail() {
  if (!els.detailModal) return;
  if (typeof els.detailModal.close === 'function') {
    try { els.detailModal.close(); } catch {}
  }
  els.detailModal.classList.remove('dialog-open-fallback');
  els.detailModal.removeAttribute('open');
}

export function wireModal() {
  if (!els.detailModal || !els.closeModalBtn) return;
  els.closeModalBtn.addEventListener("click", closeDetail);
  els.detailModal.addEventListener("click", event => {
    const card = els.detailModal.querySelector('.modal-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const clickedInside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
    if (!clickedInside) closeDetail();
  });
}
