import { classifyRecord } from "../lib/merge.js?v=v4.2.40-r2026-04-27-list-lookalike-cleanup1";
import { renderImageSlot } from "../lib/image-slot.js";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function currentMonthName() {
  return MONTHS[new Date().getMonth()] || MONTHS[0];
}

function isInSeason(record, month) {
  return Array.isArray(record?.months_available) && record.months_available.includes(month);
}

function hasAnyImageCandidate(record) {
  const structured = Array.isArray(record?.images_structured) ? record.images_structured : [];
  if (structured.length) return true;
  if (record?.list_thumbnail) return true;
  const detailImages = Array.isArray(record?.detail_images) ? record.detail_images : [];
  if (detailImages.length) return true;
  const enlargeImages = Array.isArray(record?.enlarge_images) ? record.enlarge_images : [];
  if (enlargeImages.length) return true;
  const images = Array.isArray(record?.images) ? record.images : [];
  if (!images.length) return false;
  const first = images[0];
  if (typeof first === "string") return !!first;
  if (first && typeof first === "object") return !!(first.thumb || first.src || first.detail || first.full);
  return false;
}

function shuffle(values) {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function isHighlightCandidate(record, month) {
  if (record?.hidden) return false;
  const info = classifyRecord(record);
  if (!info.edible) return false;
  if (!isInSeason(record, month)) return false;
  if (!hasAnyImageCandidate(record)) return false;
  return info.isPlant || info.isMushroom;
}

function pickHighlights(species, month) {
  return shuffle((species || []).filter((record) => isHighlightCandidate(record, month))).slice(0, 6);
}

function renderHomeImage(record) {
  return renderImageSlot(record, "card", { showMeta: false });
}

export function renderHome(species, errors = [], rareSpecies = []) {
  const month = currentMonthName();

  const plants = (species || []).filter((record) => {
    const info = classifyRecord(record);
    return !record?.hidden && info.isPlant && info.edible;
  });

  const mushrooms = (species || []).filter((record) => {
    const info = classifyRecord(record);
    return !record?.hidden && info.isMushroom && info.edible;
  });

  const plantsInSeason = plants.filter((record) => isInSeason(record, month));
  const mushroomsInSeason = mushrooms.filter((record) => isInSeason(record, month));

  const medicinal = (species || []).filter((record) => {
    if (record?.hidden) return false;
    return classifyRecord(record).medicinal;
  });

  const otherUses = (species || []).filter((record) => {
    if (record?.hidden) return false;
    return classifyRecord(record).otherUses;
  });

  const caution = (species || []).filter((record) => {
    if (record?.hidden) return false;
    return classifyRecord(record).caution;
  });

  const highlights = pickHighlights(species, month);

  return `
    <section class="panel home-focus-panel">
      <section class="home-safety-card">
        <h3>Use this guide carefully</h3>
        <p>This guide was put together by an amateur forager, not a scientist. I made it to be a reminder of things I've known, it is not intended to be a one-stop app for all things foraging.</p>
        <p>Treat all plants, especially mushrooms, as potentially inedible and dangerous. Do not eat anything until you know the species and know how to prepare it. Foraging can be a fun and rewarding way to make some great meals, just do it wisely.</p>
        <p>The guide includes sections on plants, mushrooms, medicinals, other uses, rare species, and cautionary look-alikes. There's a timeline that will show you the species you'll likely find in the woods each month, plus references and credits.</p>
      </section>

      <section class="panel">
        <div class="control-row">
          <input id="homeSearch" type="search" value="" placeholder="Search the guide" style="flex:1;min-width:280px">
          <button id="homeSearchBtn" class="primary" type="button">Search</button>
        </div>
      </section>

      <div class="home-focus-heading">
        <h2>In Focus Right Now</h2>
        <p class="results-meta">${esc(month)}</p>
      </div>

      <section class="panel">
        <div class="home-focus-stats">
          <div class="home-focus-stat-card"><strong>${plantsInSeason.length}</strong><span>plants in season</span></div>
          <div class="home-focus-stat-card"><strong>${mushroomsInSeason.length}</strong><span>mushrooms in season</span></div>
          <div class="home-focus-stat-card"><strong>${plants.length}</strong><span>edible plants</span></div>
          <div class="home-focus-stat-card"><strong>${mushrooms.length}</strong><span>edible mushrooms</span></div>
          <div class="home-focus-stat-card"><strong>${medicinal.length}</strong><span>medicinal species</span></div>
          <div class="home-focus-stat-card"><strong>${otherUses.length}</strong><span>other uses</span></div>
          <div class="home-focus-stat-card"><strong>${caution.length}</strong><span>caution species</span></div>
          <div class="home-focus-stat-card"><strong>${Array.isArray(rareSpecies) ? rareSpecies.length : 0}</strong><span>rare / endangered entries</span></div>
        </div>
      </section>

      <section class="panel">
        <h3>Some Species In Season</h3>
        <div class="home-focus-highlights">
          ${highlights.map((record) => `
            <button
              class="home-focus-card"
              type="button"
              data-detail="${esc(record.slug)}"
              aria-label="Open details for ${esc(record.display_name || record.common_name || record.slug || "Untitled")}" 
            >
              <div class="home-focus-caption"><strong>${esc(record.display_name || record.common_name || record.slug || "Untitled")}</strong></div>
              ${renderHomeImage(record)}
            </button>
          `).join("")}
        </div>
      </section>

      ${errors.length ? `
        <section class="error-box">
          <h3>Core load warnings</h3>
          <ul class="list-tight">
            ${errors.map((item) => `<li><span class="codeish">${esc(item.path)}</span> — ${esc(item.error)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}
    </section>
  `;
}
