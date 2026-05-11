import { APP_VERSION } from "./constants-wm4.js?v=v2.0-wm4";
import { state } from "./state.js?v=v2.0";
import { renderDetail } from "./renderers/detail.js?v=v2.0";

const els = {
  pageRoot: document.getElementById("pageRoot"),
  versionBadge: document.getElementById("versionBadge"),
  detailModal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

export function updateHeaderStats() {
  if (els.versionBadge) els.versionBadge.textContent = APP_VERSION;
}
export function renderPage(html) { els.pageRoot.innerHTML = html; }
export function markActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach(link => link.classList.toggle("active", link.dataset.nav === route));
}
export function bindDetailLinks() {
  document.querySelectorAll("[data-detail-link]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      openDetail(link.dataset.detailLink);
    });
  });
}
export function bindSharedActions({ onFilterChange, onClearFilters, onTimelineMonthChange, onPaneModeChange, onTimelineShift }) {
  document.querySelectorAll("[data-filter]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", onFilterChange));
  document.querySelectorAll('[data-action="clear-filters"]').forEach(btn => btn.addEventListener("click", onClearFilters));
  document.querySelectorAll("[data-timeline-month]").forEach(btn => btn.addEventListener("click", () => onTimelineMonthChange?.(btn.dataset.timelineMonth, btn.dataset.timelineWeek)));
  document.querySelectorAll('[data-action="set-pane-mode"]').forEach(btn => btn.addEventListener("click", () => onPaneModeChange?.(btn.dataset.page, btn.dataset.paneMode)));
  document.querySelectorAll('[data-action="timeline-shift"]').forEach(btn => btn.addEventListener("click", () => onTimelineShift?.(btn.dataset.direction)));
  const activeTimeline = document.querySelector('.timeline-pill.active');
  if (activeTimeline) activeTimeline.scrollIntoView({ inline: 'center', block: 'nearest' });
}
export function openDetail(slug) {
  const record = state.allRecords.find(item => item.slug === slug);
  if (!record || !els.detailModal || !els.modalContent) return;
  els.modalContent.innerHTML = renderDetail(record);
  if (typeof els.detailModal.showModal === "function") els.detailModal.showModal();
}
export function closeDetail() {
  if (els.detailModal?.open) els.detailModal.close();
}
export function wireModal() {
  els.closeModalBtn?.addEventListener("click", closeDetail);
  els.detailModal?.addEventListener("click", event => {
    const card = els.detailModal.querySelector('.modal-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const clickedInside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
    if (!clickedInside) closeDetail();
  });
}
