import { state, setRoute, setSpecies, setRareSpecies, setReferences, logBoot } from "./state.js";
import { MEDICINAL_VOCAB } from "./data/medicinal-vocabulary.js";
import { renderPage, openModal, closeModal, els } from "./ui/dom.js?v=v4.2.40-r2026-04-27-list-lookalike-cleanup1";
import { markActiveNav } from "./ui/nav.js";
import { esc } from "./lib/escape.js";

const APP_VERSION = "v4.2.40-r2026-04-27-list-lookalike-cleanup1";
const REVIEW_STORAGE_KEY = "foraging_review_overlay_v1";
const moduleCache = new Map();
let loadAppDataPromise = null;
let renderToken = 0;
let previousRoute = "";

function versionedPath(path) {
  return path.includes("?") ? path : `${path}?v=${encodeURIComponent(APP_VERSION)}`;
}

function parseRoute() {
  const raw = String(location.hash || "#/home").replace(/^#\/?/, "");
  return raw || "home";
}

function routeTitle(route) {
  return {
    home: "Home",
    plants: "Plants",
    mushrooms: "Mushrooms",
    "mushrooms-gilled": "Gilled mushrooms",
    boletes: "Pores / spongy underside",
    "mushrooms-other": "Other mushrooms",
    medicinal: "Medicinal",
    rare: "Rare",
    lookalikes: "Caution",
    "other-uses": "Other Uses",
    review: "Needs Review",
    references: "References",
    credits: "Credits",
    search: "Search"
  }[route] || "Home";
}

function importModule(path) {
  const key = versionedPath(path);
  if (!moduleCache.has(key)) moduleCache.set(key, import(key));
  return moduleCache.get(key);
}

async function loadAppDataModule() {
  if (!loadAppDataPromise) {
    loadAppDataPromise = importModule("./data/load-app-data.js");
  }
  return loadAppDataPromise;
}

function statusHtml(title = "Loading…", items = [], extra = "") {
  return `
    <section class="panel">
      <h2>${esc(title)}</h2>
      ${extra ? `<p>${esc(extra)}</p>` : ""}
      <ul class="status-log">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function routeErrorHtml(route, message) {
  return `
    <section class="error-box">
      <h2>${esc(routeTitle(route))} failed</h2>
      <p>This page module broke, but the rest of the app shell is still alive.</p>
      <p class="codeish">${esc(message)}</p>
      <div class="control-row"><button id="retryRoute" class="primary" type="button">Retry this page</button></div>
    </section>
  `;
}

function mushroomLaneLandingHtml() {
  return `
    <section class="panel">
      <h2>Mushrooms</h2>
      <p>Start with the underside. That gets most people to the right part of the guide faster than taxonomy ever will.</p>
      <div class="lane-grid">
        <a class="lane-card" href="#/mushrooms-gilled"><strong>Gilled</strong><span>Thin blade-like gills under the cap.</span></a>
        <a class="lane-card" href="#/boletes"><strong>Pores / spongy underside</strong><span>Pore surface or sponge-like underside. These are the boletes once you open the section.</span></a>
        <a class="lane-card" href="#/mushrooms-other"><strong>Other forms</strong><span>Teeth, ridges, shelves, coral, jelly, and oddballs.</span></a>
      </div>
    </section>
  `;
}

function mushroomLaneNavHtml(route = "") {
  if (!["mushrooms-gilled", "boletes", "mushrooms-other"].includes(route)) return "";
  const item = (href, key, label, note) => {
    const active = route === key ? " active" : "";
    return `<a class="lane-card${active}" href="${href}"><strong>${esc(label)}</strong><span>${esc(note)}</span></a>`;
  };
  return `
    <section class="panel mushroom-lane-switcher">
      <h3>Mushroom underside / form</h3>
      <div class="lane-grid">
        ${item("#/mushrooms-gilled", "mushrooms-gilled", "Gilled", "Thin blade-like gills under the cap.")}
        ${item("#/boletes", "boletes", "Pores / spongy underside", "Pore surface or sponge-like underside.")}
        ${item("#/mushrooms-other", "mushrooms-other", "Other forms", "Teeth, ridges, shelves, coral, jelly, and oddballs.")}
      </div>
    </section>
  `;
}

function optionHtml(values, current, blankLabel) {
  return [`<option value="">${esc(blankLabel)}</option>`]
    .concat((values || []).map((item) => {
      const value = item && typeof item === "object" ? String(item.value || "") : String(item || "");
      const label = item && typeof item === "object" ? String(item.label || item.value || "") : value;
      return `<option value="${esc(value)}" ${current === value ? "selected" : ""}>${esc(label)}</option>`;
    }))
    .join("");
}

const PLANT_TRAIT_FILTER_KEYS = [
  "plantMonth", "plantPart", "plantHabitat", "plantSize", "plantTaste",
  "plantFlowerColor", "plantFruitColor", "plantLeafShape", "plantLeafArrangement", "plantStem"
];

const MUSHROOM_TRAIT_FILTER_KEYS = [
  "mushroomMonth", "mushroomHabitat", "mushroomSubstrate", "mushroomTreeType", "mushroomHost", "mushroomUnderside",
  "mushroomRing", "mushroomTexture", "mushroomSmell", "mushroomStaining", "mushroomCapSurface",
  "mushroomStemFeature", "mushroomBoleteGroup", "mushroomBoleteSubgroup", "mushroomPoreColor",
  "mushroomReviewFlag", "mushroomTreeAssociation", "mushroomTaste"
];

const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "name", label: "Name A–Z" },
  { value: "commonness", label: "Commonality — common first" },
  { value: "foodQuality", label: "Food quality / taste — best first" },
  { value: "season", label: "Season — earliest first" }
];

function isSortableRoute(route) {
  return [
    "plants", "mushrooms-gilled", "boletes", "mushrooms-other",
    "medicinal", "lookalikes", "caution", "other-uses", "search", "review"
  ].includes(route);
}

function renderSortControls(route) {
  if (!isSortableRoute(route)) return "";
  const current = state.filters.sortSpecies || "default";
  return `
    <section class="panel">
      <div class="medicinal-filter-row" style="display:grid;grid-template-columns:minmax(220px,320px) minmax(260px,1fr);gap:12px;align-items:end;">
        <div class="medicinal-filter-cell">
          <label for="speciesSortSelect" class="muted small">Sort</label>
          <select id="speciesSortSelect" style="width:100%">${optionHtml(SORT_OPTIONS, current, "Default order")}</select>
        </div>
        <p class="muted small" style="margin:0;">Sorting applies after the current filters. Season sorting pushes records with missing or review-needed season data to the end.</p>
      </div>
    </section>
  `;
}

function isPlantFilterRoute(route) {
  return route === "plants";
}

function isMushroomFilterRoute(route) {
  return ["mushrooms-gilled", "boletes", "mushrooms-other"].includes(route);
}

function clearTraitFiltersForRoute(route) {
  const keys = isPlantFilterRoute(route)
    ? PLANT_TRAIT_FILTER_KEYS
    : (isMushroomFilterRoute(route) ? MUSHROOM_TRAIT_FILTER_KEYS : []);
  keys.forEach((key) => { state.filters[key] = ""; });
}

function renderTraitFilters(route, filterFields = [], activeTraitFilters = false) {
  if (!filterFields.length) return "";
  const title = isPlantFilterRoute(route) ? "Plant filters" : (route === "boletes" ? "Pored mushroom filters" : "Mushroom filters");
  const hasMissing = filterFields.some((field) => (field.options || []).some((option) => option?.value === "__missing__"));
  const hasReviewFlag = filterFields.some((field) => field.valueKey === "mushroomReviewFlag");
  const hasSubstrateReview = filterFields.some((field) => field.valueKey === "mushroomSubstrate" && (field.options || []).some((option) => option?.value === "__missing__"));
  const noteBits = [];
  if (hasReviewFlag) noteBits.push("Data review is an audit filter: it helps find boletes with inherited/default season data, missing substrate, missing host/tree clues, missing bruising notes, weak food-quality labels, or missing photo/source work.");
  if (hasSubstrateReview) noteBits.push("Needs substrate review marks boletes where growing context is missing and should be investigated.");
  else if (hasMissing) noteBits.push("Not recorded / needs review is selectable so records with missing filter data can be found and fixed.");
  return `
    <section class="panel">
      <div class="home-focus-heading">
        <h3>${esc(title)}</h3>
        ${activeTraitFilters ? `<button id="traitClearBtn" type="button">Clear filters</button>` : ""}
      </div>
      ${noteBits.length ? `<p class="muted small">${esc(noteBits.join(" "))}</p>` : ""}
      <div class="medicinal-filter-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end;">
        ${filterFields.map((field) => `
          <div class="medicinal-filter-cell">
            <label for="traitFilter_${esc(field.key)}" class="muted small">${esc(field.label)}</label>
            <select id="traitFilter_${esc(field.key)}" data-trait-filter="${esc(field.key)}" style="width:100%">
              ${optionHtml(field.options, state.filters[field.key] || "", field.blankLabel || "Any")}
            </select>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function controlsHtml(route = "general", placeholder = "Search species", filterFields = [], activeTraitFilters = false) {
  const search = state.filters.search || "";
  const sortControls = renderSortControls(route);
  if (route === "medicinal") {
    return `
      <section class="panel">
        <div class="medicinal-filter-row">
          <div class="medicinal-filter-cell">
            <label for="medicinalActionFilter" class="muted small">Action</label>
            <select id="medicinalActionFilter" style="width:100%">${optionHtml(MEDICINAL_VOCAB.actions, state.filters.medicinalAction, "Any action")}</select>
          </div>
          <div class="medicinal-filter-cell">
            <label for="medicinalSystemFilter" class="muted small">Body system</label>
            <select id="medicinalSystemFilter" style="width:100%">${optionHtml(MEDICINAL_VOCAB.bodySystems, state.filters.medicinalSystem, "Any body system")}</select>
          </div>
          <div class="medicinal-filter-cell">
            <label for="medicinalTermFilter" class="muted small">Medical term</label>
            <select id="medicinalTermFilter" style="width:100%">${optionHtml(MEDICINAL_VOCAB.symptoms, state.filters.medicinalTerm, "Any medical term")}</select>
          </div>
          <div class="medicinal-filter-actions">
            ${(state.filters.medicinalAction || state.filters.medicinalSystem || state.filters.medicinalTerm) ? `<button id="speciesClearBtn" type="button">Clear</button>` : ""}
          </div>
        </div>
      </section>
      ${sortControls}
    `;
  }
  if (route === "search") {
    return `
      <section class="panel">
        <div class="control-row">
          <input id="speciesSearch" type="search" value="${esc(search)}" placeholder="${esc(placeholder)}" style="flex:1;min-width:280px">
          <button id="speciesSearchBtn" class="primary" type="button">Search</button>
          ${search ? `<button id="speciesClearBtn" type="button">Clear</button>` : ""}
        </div>
      </section>
      ${sortControls}
    `;
  }
  if (isPlantFilterRoute(route) || isMushroomFilterRoute(route)) {
    return `${mushroomLaneNavHtml(route)}${renderTraitFilters(route, filterFields, activeTraitFilters)}${sortControls}`;
  }
  return sortControls;
}

const BUILT_IN_LOOKALIKE_STUBS = new Map([
  ["bracken-fern", {
    slug: "bracken-fern",
    display_name: "Bracken Fern",
    common_name: "Bracken Fern",
    common_names: ["Bracken", "Eastern bracken fern"],
    scientific_name: "Pteridium aquilinum",
    record_type: "plant",
    primary_type: "plant",
    category: "Green",
    food_role: "avoid",
    edibility_status: "not_edible",
    non_edible_severity: "Unsafe — toxic / carcinogenic concern",
    danger_level: "Unsafe look-alike for ostrich fern fiddleheads",
    poisoning_effects: "Do not substitute bracken fern for ostrich fern fiddleheads. Bracken has documented toxicity concerns and has been shown to cause cancer in animal studies; it is also a known livestock problem.",
    affected_systems: ["Digestive system", "Long-term cancer/toxicity concern"],
    field_identification: "Bracken fiddleheads are fuzzy, lack the brown papery covering of ostrich fern fiddleheads, and do not have the deep U-shaped groove on the inside of the stem.",
    edibility_detail: "Not treated as a food species in this guide. Included here as a look-alike warning for Fiddlehead Ferns.",
    look_alike_risk: "serious",
    look_alike_notes: "Can be confused by beginners with edible ostrich fern fiddleheads. Do not harvest fern fiddleheads unless the ostrich fern traits are confirmed.",
    look_alikes: ["Fiddlehead Ferns"],
    months_available: ["April", "May", "June"],
    month_numbers: [4, 5, 6],
    habitat: ["Forest edge / openings", "Upland / dry forest", "Roadside / disturbed"],
    links: [
      "https://extension.umaine.edu/publications/2540e/",
      "https://www.canada.ca/en/health-canada/services/food-safety-fruits-vegetables/fiddlehead-safety-tips.html"
    ],
    review_status: "ok"
  }],
  ["cinnamon-fern", {
    slug: "cinnamon-fern",
    display_name: "Cinnamon Fern",
    common_name: "Cinnamon Fern",
    scientific_name: "Osmundastrum cinnamomeum",
    record_type: "plant",
    primary_type: "plant",
    category: "Green",
    food_role: "avoid",
    edibility_status: "not_edible",
    non_edible_severity: "Not recommended as food",
    danger_level: "Look-alike / not a food entry",
    field_identification: "A common ostrich fern look-alike. Do not substitute it for edible ostrich fern fiddleheads; confirm the smooth stem, brown papery scales, and deep U-shaped groove of ostrich fern.",
    edibility_detail: "Not treated as an edible species in this guide. Included here as a look-alike warning for Fiddlehead Ferns.",
    look_alike_notes: "Commonly confused with ostrich fern by beginners; not recommended as a substitute food fiddlehead.",
    look_alikes: ["Fiddlehead Ferns"],
    months_available: ["April", "May", "June"],
    month_numbers: [4, 5, 6],
    habitat: ["Wetland / marsh", "Shoreline / riverbank", "Mixed woods"],
    links: ["https://extension.umaine.edu/publications/4198e/"],
    review_status: "ok"
  }],
  ["interrupted-fern", {
    slug: "interrupted-fern",
    display_name: "Interrupted Fern",
    common_name: "Interrupted Fern",
    scientific_name: "Claytosmunda claytoniana",
    record_type: "plant",
    primary_type: "plant",
    category: "Green",
    food_role: "avoid",
    edibility_status: "not_edible",
    non_edible_severity: "Not recommended as food",
    danger_level: "Look-alike / not a food entry",
    field_identification: "A common ostrich fern look-alike. Do not substitute it for edible ostrich fern fiddleheads; confirm the smooth stem, brown papery scales, and deep U-shaped groove of ostrich fern.",
    edibility_detail: "Not treated as an edible species in this guide. Included here as a look-alike warning for Fiddlehead Ferns.",
    look_alike_notes: "Commonly confused with ostrich fern by beginners; not recommended as a substitute food fiddlehead.",
    look_alikes: ["Fiddlehead Ferns"],
    months_available: ["April", "May", "June"],
    month_numbers: [4, 5, 6],
    habitat: ["Wetland / marsh", "Mixed woods", "Forest edge / openings"],
    links: ["https://extension.umaine.edu/publications/4198e/"],
    review_status: "ok"
  }]
]);

function makeBuiltInLookalikeStub(slug = "") {
  const record = BUILT_IN_LOOKALIKE_STUBS.get(slug);
  return record ? { ...record } : null;
}

function resolveCanonicalRecord(record) {
  if (!record?.duplicate_of) return record;
  const canonical = state.species.find(candidate => candidate.slug === record.duplicate_of)
    || state.rareSpecies.find(candidate => candidate.slug === record.duplicate_of);
  return canonical || record;
}

function getRecordBySlug(slug) {
  const record = state.species.find(candidate => candidate.slug === slug)
    || state.rareSpecies.find(candidate => candidate.slug === slug);
  return resolveCanonicalRecord(record) || makeBuiltInLookalikeStub(slug);
}

function loadReviewOverlay() {
  try {
    state.reviewOverlay = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
  } catch {
    state.reviewOverlay = {};
  }
}

function saveReviewOverlay() {
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state.reviewOverlay || {}));
}

function applyReviewOverlay(records) {
  return (records || []).map((record) => {
    const overlay = state.reviewOverlay?.[record.slug] || {};
    const reviewReasons = Array.from(new Set([...(record.reviewReasons || []), ...(overlay.review_reasons || [])].filter(Boolean)));
    const review_status = overlay.review_status || record.review_status || (reviewReasons.length ? "needs_review" : "ok");
    return {
      ...record,
      review_status,
      reviewReasons,
      review_notes: overlay.review_notes || record.review_notes || ""
    };
  });
}

function setReviewStatus(slug, status, extra = {}) {
  if (!slug) return;
  const current = state.reviewOverlay?.[slug] || {};
  const next = { ...current, ...extra, review_status: status };
  if (status === "ok") {
    next.review_status = "ok";
  }
  state.reviewOverlay = { ...(state.reviewOverlay || {}), [slug]: next };
  saveReviewOverlay();
  state.species = applyReviewOverlay(state.species);
}

async function enhanceImages(root) {
  if (!root?.querySelector?.("img[data-record-image]")) return;
  try {
    const { installLazyImages } = await importModule("./lib/image-resolver.js");
    installLazyImages(root, getRecordBySlug);
  } catch {}
}

function wireModalClose() {
  els.closeModalBtn?.addEventListener("click", closeModal);
  els.modal?.addEventListener("click", (event) => {
    const card = els.modal.querySelector(".modal-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const inside = rect.left <= event.clientX && event.clientX <= rect.right && rect.top <= event.clientY && event.clientY <= rect.bottom;
    if (!inside) closeModal();
  });
}

function labelFromSlug(slug = "") {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function openRecordDetail(slug) {
  const record = getRecordBySlug(slug);
  if (!record) {
    openModal(`<section class="detail-block"><h3>${esc(labelFromSlug(slug))}</h3><p>This look-alike or related species is named in the guide, but it does not have a full species page yet.</p><p class="muted">Treat unlinked look-alikes as a warning, not as a confirmed safe substitute.</p></section>`);
    return;
  }
  try {
    const { renderDetail } = await importModule("./ui/render-detail.js");
    openModal(renderDetail(record));
    wireActionButtons(els.modalContent);
    await enhanceImages(els.modalContent);
  } catch (err) {
    openModal(`<section class="error-box"><h3>Detail view failed</h3><p class="codeish">${esc(err?.message || String(err))}</p></section>`);
  }
}

function wireSearchBlock(inputId, buttonId, onSubmit) {
  const input = document.getElementById(inputId);
  document.getElementById(buttonId)?.addEventListener("click", () => onSubmit(input?.value || ""));
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") onSubmit(input?.value || "");
  });
}

function wireActionButtons(root = document) {
  root.querySelectorAll("[data-detail]").forEach((btn) => {
    btn.addEventListener("click", () => openRecordDetail(btn.dataset.detail));
  });
  root.querySelectorAll("[data-review-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.slug || "";
      const action = btn.dataset.reviewAction;
      if (!slug || !action) return;
      if (action === "mark-ok") {
        setReviewStatus(slug, "ok");
        closeModal();
        renderCurrentRoute();
        return;
      }
      if (action === "send-review") {
        setReviewStatus(slug, "needs_review");
        closeModal();
        location.hash = "#/review";
      }
    });
  });
}

function clearRouteFilters(route) {
  state.filters.search = "";
  if (route === "medicinal") {
    state.filters.medicinalAction = "";
    state.filters.medicinalSystem = "";
    state.filters.medicinalTerm = "";
  }
  clearTraitFiltersForRoute(route);
}

function wireCommonEvents(route) {
  wireSearchBlock("homeSearch", "homeSearchBtn", (value) => {
    state.filters.search = value;
    location.hash = "#/search";
  });
  wireSearchBlock("speciesSearch", "speciesSearchBtn", (value) => {
    state.filters.search = value;
    renderCurrentRoute();
  });
  document.getElementById("speciesClearBtn")?.addEventListener("click", () => {
    clearRouteFilters(route);
    renderCurrentRoute();
  });
  document.getElementById("medicinalActionFilter")?.addEventListener("change", (event) => {
    state.filters.medicinalAction = event.currentTarget.value || "";
    renderCurrentRoute();
  });
  document.getElementById("medicinalSystemFilter")?.addEventListener("change", (event) => {
    state.filters.medicinalSystem = event.currentTarget.value || "";
    renderCurrentRoute();
  });
  document.getElementById("medicinalTermFilter")?.addEventListener("change", (event) => {
    state.filters.medicinalTerm = event.currentTarget.value || "";
    renderCurrentRoute();
  });
  document.querySelectorAll("[data-trait-filter]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.currentTarget.dataset.traitFilter || "";
      if (!key) return;
      state.filters[key] = event.currentTarget.value || "";
      renderCurrentRoute();
    });
  });
  document.getElementById("speciesSortSelect")?.addEventListener("change", (event) => {
    state.filters.sortSpecies = event.currentTarget.value || "default";
    renderCurrentRoute();
  });
  document.getElementById("traitClearBtn")?.addEventListener("click", () => {
    clearTraitFiltersForRoute(route);
    renderCurrentRoute();
  });
  wireActionButtons(document);
  enhanceImages(els.pageRoot);
  document.getElementById("retryRoute")?.addEventListener("click", () => renderCurrentRoute());
}

async function ensureRareData() {
  if (state.rareReady) return state.rareSpecies;
  if (!state.rarePromise) {
    state.rarePromise = (async () => {
      const { loadRareSpecies } = await loadAppDataModule();
      const records = await loadRareSpecies((message) => logBoot(`[rare] ${message}`));
      setRareSpecies(records);
      return records;
    })();
  }
  return state.rarePromise;
}

async function ensureReferencesData() {
  if (state.referencesReady) return state.references;
  if (!state.referencesPromise) {
    state.referencesPromise = (async () => {
      const { loadReferences } = await loadAppDataModule();
      const records = await loadReferences((message) => logBoot(`[references] ${message}`));
      setReferences(records);
      return records;
    })();
  }
  return state.referencesPromise;
}

async function renderHomeRoute(token) {
  const { renderHome } = await importModule("./ui/render-home.js");
  if (token !== renderToken) return;
  renderPage(renderHome(state.species, state.loadErrors || [], state.rareSpecies || []));
  wireCommonEvents("home");
}

async function renderSpeciesRoute(route, token) {
  const { filterRecords, renderRecordCards, getFilterFieldsForRoute, hasActiveTraitFilters, sortRecords } = await importModule("./ui/render-list.js");
  if (token !== renderToken) return;
  const matchRoute = route === "search" ? "general" : route;
  const filterFields = getFilterFieldsForRoute(state.species, matchRoute, state.filters);
  const activeTraitFilters = hasActiveTraitFilters(matchRoute, state.filters);
  const filtered = filterRecords(state.species, matchRoute, state.filters);
  const sorted = sortRecords(filtered, state.filters.sortSpecies || "default");
  const title = `${routeTitle(route)} (${filtered.length})`;
  renderPage(`
    ${controlsHtml(route, route === "search" ? "Search all species" : `Search ${routeTitle(route).toLowerCase()}`, filterFields, activeTraitFilters)}
    <section class="panel"><h2>${esc(title)}</h2></section>
    ${renderRecordCards(sorted, route)}
  `);
  wireCommonEvents(route);
}

async function renderRareRoute(token) {
  if (!state.rareReady) {
    renderPage(statusHtml("Loading rare species…", ["Rare species are loading for this section."]));
    try {
      await ensureRareData();
    } catch (err) {
      if (token !== renderToken) return;
      renderPage(routeErrorHtml("rare", err?.message || String(err)));
      wireCommonEvents("rare");
      return;
    }
    if (token !== renderToken) return;
  }
  const { renderRarePage } = await importModule("./ui/render-rare.js");
  if (token !== renderToken) return;
  renderPage(renderRarePage(state.rareSpecies, state.filters.search));
  wireCommonEvents("rare");
}

async function renderReferencesRoute(token) {
  if (!state.referencesReady) {
    renderPage(statusHtml("Loading references…", ["References are lazy-loaded only when you open this section."]));
    try {
      await ensureReferencesData();
    } catch (err) {
      if (token !== renderToken) return;
      renderPage(routeErrorHtml("references", err?.message || String(err)));
      wireCommonEvents("references");
      return;
    }
    if (token !== renderToken) return;
  }
  const { renderReferencesPage } = await importModule("./ui/render-references.js");
  if (token !== renderToken) return;
  renderPage(renderReferencesPage(state.references, state.filters.search));
  wireCommonEvents("references");
}

async function renderCreditsRoute(token) {
  const { renderCreditsPage } = await importModule("./ui/render-credits.js");
  if (token !== renderToken) return;
  renderPage(renderCreditsPage(state.species, state.imageCredits, state.filters.search));
  wireCommonEvents("credits");
}

export async function renderCurrentRoute() {
  const token = ++renderToken;
  const route = parseRoute();
  if (previousRoute === "search" && route !== "search") {
    state.filters.search = "";
  }
  previousRoute = route;
  setRoute(route);
  markActiveNav(route === "search" ? "search" : (route.startsWith("mushrooms-") || route === "boletes" ? "mushrooms" : (route === "other-uses" ? "other-uses" : route)));

  if (state.loading && !state.coreReady) {
    renderPage(statusHtml("Loading app…", state.bootLog, "Plants, mushrooms, and the rare-species count are loading first."));
    return;
  }

  try {
    if (route === "home") return await renderHomeRoute(token);
    if (route === "mushrooms") {
      renderPage(mushroomLaneLandingHtml());
      wireCommonEvents("mushrooms");
      return;
    }
    if (route === "rare") return await renderRareRoute(token);
    if (route === "references") return await renderReferencesRoute(token);
    if (route === "credits") return await renderCreditsRoute(token);
    if (["plants", "mushrooms-gilled", "boletes", "mushrooms-other", "medicinal", "lookalikes", "other-uses", "review", "search"].includes(route)) {
      return await renderSpeciesRoute(route, token);
    }
    await renderHomeRoute(token);
  } catch (err) {
    if (token !== renderToken) return;
    renderPage(routeErrorHtml(route, err?.message || String(err)));
    wireCommonEvents(route);
  }
}

export async function startApp() {
  document.getElementById("versionBadge")?.replaceChildren(document.createTextNode(APP_VERSION));
  wireModalClose();
  loadReviewOverlay();
  window.addEventListener("hashchange", renderCurrentRoute);
  state.loading = true;
  renderPage(statusHtml("Loading app…", state.bootLog, "Plants, mushrooms, and the rare-species count are loading first."));
  try {
    const { loadCoreSpecies, loadRareSpecies } = await loadAppDataModule();
    const result = await loadCoreSpecies((message) => {
      logBoot(message);
      renderPage(statusHtml("Loading app…", state.bootLog, "Plants, mushrooms, and the rare-species count are loading first."));
    });
    setSpecies(applyReviewOverlay(result.species));
    state.loadErrors = result.errors;

    try {
      const rare = await loadRareSpecies((message) => {
        logBoot(`[rare] ${message}`);
      });
      setRareSpecies(rare);
    } catch (err) {
      logBoot(`[rare] ${err?.message || String(err)}`);
    }

    state.loading = false;
    await renderCurrentRoute();
    logBoot("[photos] Using local hardwired image manifest only. Runtime Commons search disabled.");
  } catch (err) {
    state.loading = false;
    renderPage(`<section class="error-box"><h2>Startup failed</h2><p>The shell loaded, but core species data did not.</p><p class="codeish">${esc(err?.message || String(err))}</p><div class="control-row"><button id="retryBoot" class="primary" type="button">Retry</button></div></section>${statusHtml("Boot log", state.bootLog)}`);
    document.getElementById("retryBoot")?.addEventListener("click", startApp);
  }
}
