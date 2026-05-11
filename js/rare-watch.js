import { FORAGING_RARE_SIGHTINGS_TABLE } from "./constants-mainfix.js";
import { state } from "./state.js";
import { openHtmlModal } from "./ui-mainfix.js";

const LOCAL_KEY = "foraging_rare_sightings_local_v1";
const UP_CENTER = [46.5, -87.4];
let leafletReady = false;
let overviewMap = null;
let overviewMarkers = [];
let detailPickerMap = null;
let detailPickerMarker = null;

function byName(a, b) {
  return String(a.common_name || a.scientific_name || "").localeCompare(String(b.common_name || b.scientific_name || ""));
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function groupLabel(group) {
  return group === "fungus" ? "Fungus" : "Plant";
}
function sensitivityLabel(record) {
  return record.sensitive_location ? "Sensitive locations should stay vague." : "Location sensitivity not flagged in this record.";
}
function rounded(lat, lng, precision) {
  if (precision === "hidden") return { lat: null, lng: null, label: "Hidden" };
  if (precision === "approximate") {
    return { lat: Number(Number(lat).toFixed(2)), lng: Number(Number(lng).toFixed(2)), label: `${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}` };
  }
  return { lat: Number(Number(lat).toFixed(5)), lng: Number(Number(lng).toFixed(5)), label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` };
}
export async function loadRareSpecies() {
  try {
    const response = await fetch("data/rare-species-v1.json", { cache: "no-store" });
    const payload = await response.json();
    return payload.records || [];
  } catch {
    return [];
  }
}
function localSightings() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; }
}
function saveLocalSightings(items) { localStorage.setItem(LOCAL_KEY, JSON.stringify(items)); }
async function getSupabaseClient() {
  const cfg = window.FORAGING_APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase?.createClient) return null;
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}
export async function loadRareSightings() {
  const client = await getSupabaseClient();
  if (!client) return localSightings();
  try {
    const { data, error } = await client.from(FORAGING_RARE_SIGHTINGS_TABLE).select("*").order("seen_on", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return localSightings();
  }
}
export async function saveRareSighting(entry) {
  const client = await getSupabaseClient();
  const payload = {
    species_slug: entry.species_slug, species_name: entry.species_name, seen_on: entry.seen_on,
    latitude: entry.latitude, longitude: entry.longitude, notes: entry.notes || "",
    precision_mode: entry.precision_mode || "approximate", source_app: "foraging"
  };
  if (!client) {
    payload.id = crypto.randomUUID();
    const items = localSightings();
    items.unshift(payload);
    saveLocalSightings(items);
    return payload;
  }
  const { data, error } = await client.from(FORAGING_RARE_SIGHTINGS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}
function recentSightingsForSpecies(slug) { return (state.rareSightings || []).filter(item => item.species_slug === slug).slice(0, 5); }
function firstRareImage(record) { return Array.isArray(record.images) && record.images.length ? record.images[0] : ""; }
function renderRareThumb(record) {
  const image = firstRareImage(record);
  if (!image) return `<div class="rare-thumb placeholder">No image</div>`;
  return `<a href="#" class="rare-thumb-link" data-rare-detail="${esc(record.slug)}" aria-label="Open ${esc(record.common_name)} details"><img class="rare-thumb" src="${image}" alt="${esc(record.common_name)}"></a>`;
}
function renderRareGallery(record) {
  const images = Array.isArray(record.images) ? record.images.filter(Boolean) : [];
  if (!images.length) return `<div class="rare-thumb placeholder rare-detail-main-image">No image loaded</div>`;
  return `
    <div class="rare-detail-gallery">
      <img class="rare-detail-main-image" src="${images[0]}" alt="${esc(record.common_name)}">
      ${images.length > 1 ? `<div class="rare-detail-gallery-strip">${images.slice(1).map(src => `<img class="rare-detail-gallery-thumb" src="${src}" alt="${esc(record.common_name)} detail view">`).join("")}</div>` : ""}
    </div>
  `;
}
function renderSightingsList(sightings = []) {
  if (!sightings.length) return '<p class="small-note">No sightings saved yet.</p>';
  return sightings.map(item => {
    const view = rounded(item.latitude, item.longitude, item.precision_mode || "approximate");
    return `<article class="rare-sighting-item"><h4>${esc(item.species_name || item.species_slug)}</h4><p class="small-note">${esc(item.seen_on || "")}</p><p>${esc(view.label)}</p>${item.notes ? `<p>${esc(item.notes)}</p>` : ""}</article>`;
  }).join("");
}
function renderRareCard(record) {
  const sightings = recentSightingsForSpecies(record.slug);
  return `
    <article class="result-card rare-result-card">
      <div class="rare-thumb-wrap">${renderRareThumb(record)}</div>
      <div class="card-main">
        <div class="card-topline">
          <a href="#" class="card-title-link" data-rare-detail="${esc(record.slug)}">${esc(record.common_name)}</a>
          <span class="category-pill">${esc(record.status)}</span>
          <span class="tiny-pill">${esc(groupLabel(record.group))}</span>
        </div>
        <p class="one-line scientific-line">${esc(record.scientific_name)}</p>
        <p>${esc(record.reason || "")}</p>
        <div class="tag-row">
          <span class="tag">${esc(record.legal_status)}</span>
          <span class="tag">${esc(record.up_relevance || "UP relevance pending")}</span>
          ${record.sensitive_location ? '<span class="tag">Sensitive</span>' : ''}
          <span class="tag">${sightings.length} sighting${sightings.length === 1 ? '' : 's'}</span>
        </div>
        <p class="small-note">Habitat: ${esc(record.habitat || '—')}</p>
        <div class="button-row">
          <button type="button" class="buttonish" data-rare-detail="${esc(record.slug)}">Details</button>
          <button type="button" class="buttonish" data-rare-sighting="${esc(record.slug)}">Add sighting</button>
        </div>
      </div>
    </article>
  `;
}
function renderRareSummary(records = [], sightings = []) {
  const plants = records.filter(r => r.group === "plant").length;
  const fungi = records.filter(r => r.group === "fungus").length;
  return `
    <section class="panel rare-hero-panel">
      <div class="result-header compact-result-header">
        <div class="result-title-row">
          <h3>Rare / endangered tracker</h3>
          <p class="results-meta"><span id="rareSpeciesCount">${records.length}</span> species · <span id="rareSightingCount">${sightings.length}</span> saved sightings</p>
        </div>
      </div>
      <p>Open a species card for field marks, habitat context, location sensitivity, and an in-detail sighting tool.</p>
      <div class="tag-row">
        <span class="tag">${plants} plants</span>
        <span class="tag">${fungi} fungi</span>
        <span class="tag">Sensitive locations stay vague by default</span>
      </div>
    </section>
  `;
}
function renderRareSpeciesSection(records = []) {
  return `
    <section class="panel">
      <div class="result-header compact-result-header">
        <div class="result-title-row">
          <h3>Rare / endangered species</h3>
          <p class="results-meta">Open any entry for details and sighting tools</p>
        </div>
      </div>
      <div class="result-list rare-card-list">
        ${records.sort(byName).map(renderRareCard).join("")}
      </div>
    </section>
  `;
}
function renderOverviewPanel(sightings = []) {
  return `
    <section class="panel">
      <div class="result-header compact-result-header">
        <div class="result-title-row">
          <h3>Saved sightings overview</h3>
          <p class="results-meta">Approximate / exact only; hidden stays hidden</p>
        </div>
      </div>
      <div class="rare-sighting-grid">
        <div class="panel">
          <h3>Map</h3>
          <div id="rareOverviewMap" class="rare-map"></div>
        </div>
        <div class="panel">
          <h3>Saved sightings</h3>
          <div id="rareSightingList">${renderSightingsList(sightings)}</div>
        </div>
      </div>
    </section>
  `;
}
function renderSpeciesSightingsInline(record) {
  const sightings = recentSightingsForSpecies(record.slug);
  if (!sightings.length) return '<p class="small-note">No sightings saved for this species yet.</p>';
  return `<div class="rare-inline-sightings">${sightings.map(item => {
    const view = rounded(item.latitude, item.longitude, item.precision_mode || "approximate");
    return `<article class="rare-mini-sighting"><strong>${esc(item.seen_on || "")}</strong><span>${esc(view.label)}</span>${item.notes ? `<p>${esc(item.notes)}</p>` : ""}</article>`;
  }).join("")}</div>`;
}
function renderRareDetail(record, expandForm = false) {
  const detailOpenClass = expandForm ? "" : " rare-hidden";
  return `
    <section class="rare-detail-shell">
      <div class="rare-detail-head">
        <div>
          <p class="eyebrow subtle">Rare / Endangered</p>
          <h2>${esc(record.common_name)}</h2>
          <p class="scientific-line">${esc(record.scientific_name)}</p>
        </div>
        <div class="tag-row">
          <span class="tag">${esc(record.status)}</span>
          <span class="tag">${esc(record.legal_status)}</span>
          <span class="tag">${esc(groupLabel(record.group))}</span>
        </div>
      </div>
      <div class="rare-detail-top">
        ${renderRareGallery(record)}
        <section class="detail-card rare-detail-summary-card">
          <h3>At a glance</h3>
          <p>${esc(record.reason || "No summary loaded.")}</p>
          <div class="tag-row">
            <span class="tag">${esc(record.up_relevance || "UP relevance pending")}</span>
            ${record.sensitive_location ? '<span class="tag">Sensitive location</span>' : '<span class="tag">Location sensitivity not flagged</span>'}
          </div>
          <p class="small-note">${esc(sensitivityLabel(record))}</p>
        </section>
      </div>
      <div class="rare-detail-grid">
        <section class="detail-card"><h3>Habitat</h3><p>${esc(record.habitat || "No habitat note loaded.")}</p></section>
        <section class="detail-card"><h3>How to tell it apart</h3><p>${esc(record.field_marks || "Detailed compare note still needs source data.")}</p></section>
        <section class="detail-card"><h3>Watch for confusion with</h3><p>${esc(record.look_alikes || "No compare list loaded yet.")}</p></section>
        <section class="detail-card"><h3>Care note</h3><p>${esc(record.care_note || sensitivityLabel(record))}</p></section>
        <section class="detail-card"><h3>Location privacy</h3><p>${esc(sensitivityLabel(record))}</p></section>
      </div>
      <section class="detail-card" style="margin-top:14px">
        <div class="result-header compact-result-header"><div class="result-title-row"><h3>Recent sightings for this species</h3><p class="results-meta">Stored locally or in Supabase</p></div></div>
        ${renderSpeciesSightingsInline(record)}
      </section>
      <section class="detail-card" style="margin-top:14px">
        <div class="button-row"><button type="button" class="buttonish primary" data-action="open-rare-sighting-form" data-rare-species="${esc(record.slug)}">Add sighting</button></div>
        <div id="rareDetailSightingBox" class="rare-detail-sighting-box${detailOpenClass}">
          <div class="rare-modal-form-grid">
            <label class="compact-filter"><span>Date seen</span><input id="rareDetailSeenOn" type="date"></label>
            <label class="compact-filter"><span>Precision</span><select id="rareDetailPrecision"><option value="approximate">Approximate</option><option value="exact">Exact</option><option value="hidden">Hidden</option></select></label>
            <label class="compact-filter"><span>Latitude</span><input id="rareDetailLatitude" type="number" step="0.00001" placeholder="46.50000"></label>
            <label class="compact-filter"><span>Longitude</span><input id="rareDetailLongitude" type="number" step="0.00001" placeholder="-87.40000"></label>
          </div>
          <label class="compact-filter" style="margin-top:10px"><span>Notes</span><textarea id="rareDetailNotes" rows="4" placeholder="Habitat, abundance, weather, photo note, companions, access note, etc."></textarea></label>
          <div class="button-row" style="margin-top:10px">
            <button type="button" class="buttonish" id="rareDetailUseLocationBtn">Use current location</button>
            <button type="button" class="buttonish" id="rareDetailSaveBtn">Save sighting</button>
          </div>
          <p class="small-note">Click the map to place a point. Hidden precision stores the coordinates but keeps them off the overview map and text list.</p>
          <div id="rareDetailMap" class="rare-map rare-detail-picker-map"></div>
        </div>
      </section>
    </section>
  `;
}
async function ensureLeaflet() {
  if (leafletReady && window.L) return;
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  await new Promise((resolve, reject) => {
    if (window.L) return resolve();
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  leafletReady = true;
}
function drawOverviewMarkers() {
  if (!overviewMap || !window.L) return;
  overviewMarkers.forEach(marker => marker.remove());
  overviewMarkers = [];
  for (const item of state.rareSightings || []) {
    const view = rounded(item.latitude, item.longitude, item.precision_mode || "approximate");
    if (view.lat == null || view.lng == null) continue;
    const marker = window.L.marker([view.lat, view.lng]).addTo(overviewMap);
    marker.bindPopup(`<strong>${esc(item.species_name || item.species_slug)}</strong><br>${esc(item.seen_on || "")}<br>${esc(view.label)}`);
    overviewMarkers.push(marker);
  }
}
async function initOverviewMap() {
  const mapEl = document.getElementById("rareOverviewMap");
  if (!mapEl) return;
  await ensureLeaflet();
  if (overviewMap) {
    overviewMap.invalidateSize();
    drawOverviewMarkers();
    return;
  }
  overviewMap = window.L.map(mapEl).setView(UP_CENTER, 6);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(overviewMap);
  drawOverviewMarkers();
}
async function initDetailPickerMap() {
  const mapEl = document.getElementById("rareDetailMap");
  if (!mapEl) return;
  await ensureLeaflet();
  if (detailPickerMap) { detailPickerMap.remove(); detailPickerMap = null; detailPickerMarker = null; }
  detailPickerMap = window.L.map(mapEl).setView(UP_CENTER, 7);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(detailPickerMap);
  detailPickerMap.on("click", event => { setDetailCoords(event.latlng.lat, event.latlng.lng); });
  setTimeout(() => detailPickerMap?.invalidateSize(), 30);
}
function setDetailCoords(lat, lng) {
  const latInput = document.getElementById("rareDetailLatitude");
  const lngInput = document.getElementById("rareDetailLongitude");
  if (latInput) latInput.value = Number(lat).toFixed(5);
  if (lngInput) lngInput.value = Number(lng).toFixed(5);
  if (detailPickerMap && window.L) {
    const latlng = window.L.latLng(lat, lng);
    if (detailPickerMarker) detailPickerMarker.remove();
    detailPickerMarker = window.L.marker(latlng).addTo(detailPickerMap);
    detailPickerMap.setView(latlng, Math.max(detailPickerMap.getZoom(), 11));
  }
}
function refreshRarePageWidgets() {
  const list = document.getElementById("rareSightingList");
  if (list) list.innerHTML = renderSightingsList(state.rareSightings || []);
  const speciesCount = document.getElementById("rareSpeciesCount");
  if (speciesCount) speciesCount.textContent = String((state.rareSpecies || []).length);
  const sightingCount = document.getElementById("rareSightingCount");
  if (sightingCount) sightingCount.textContent = String((state.rareSightings || []).length);
  drawOverviewMarkers();
}
async function openRareDetail(slug, expandForm = false) {
  const record = (state.rareSpecies || []).find(item => item.slug === slug);
  if (!record) return;
  openHtmlModal(renderRareDetail(record, expandForm));
  await wireRareDetailModal(record, expandForm);
}
async function saveRareDetailForm(record) {
  const seenOn = document.getElementById("rareDetailSeenOn")?.value;
  const latitude = document.getElementById("rareDetailLatitude")?.value;
  const longitude = document.getElementById("rareDetailLongitude")?.value;
  const notes = document.getElementById("rareDetailNotes")?.value || "";
  const precisionMode = document.getElementById("rareDetailPrecision")?.value || "approximate";
  if (!seenOn || !latitude || !longitude) { alert("Date, latitude, and longitude are required."); return; }
  const saved = await saveRareSighting({
    species_slug: record.slug, species_name: record.common_name, seen_on: seenOn,
    latitude: Number(latitude), longitude: Number(longitude), notes, precision_mode: precisionMode
  });
  state.rareSightings = [saved, ...(state.rareSightings || [])];
  refreshRarePageWidgets();
  await openRareDetail(record.slug, false);
}
async function wireRareDetailModal(record, expandForm = false) {
  const openBtn = document.querySelector('[data-action="open-rare-sighting-form"]');
  const formBox = document.getElementById("rareDetailSightingBox");
  const useLocationBtn = document.getElementById("rareDetailUseLocationBtn");
  const saveBtn = document.getElementById("rareDetailSaveBtn");
  const openForm = async () => {
    if (!formBox) return;
    formBox.classList.remove("rare-hidden");
    if (!document.getElementById("rareDetailSeenOn")?.value) document.getElementById("rareDetailSeenOn").value = new Date().toISOString().slice(0, 10);
    await initDetailPickerMap();
  };
  if (openBtn) openBtn.onclick = openForm;
  if (expandForm) await openForm();
  if (useLocationBtn) useLocationBtn.onclick = () => { navigator.geolocation?.getCurrentPosition?.(position => { setDetailCoords(position.coords.latitude, position.coords.longitude); }); };
  if (saveBtn) saveBtn.onclick = () => saveRareDetailForm(record);
}
export function renderRarePageHtml(records = [], sightings = []) {
  return renderRareSummary(records, sightings) + renderRareSpeciesSection(records) + renderOverviewPanel(sightings);
}
export async function wireRarePage() {
  await initOverviewMap();
  document.querySelectorAll("[data-rare-detail]").forEach(btn => {
    btn.addEventListener("click", event => { event.preventDefault(); openRareDetail(btn.dataset.rareDetail, false); });
  });
  document.querySelectorAll("[data-rare-sighting]").forEach(btn => {
    btn.addEventListener("click", event => { event.preventDefault(); openRareDetail(btn.dataset.rareSighting, true); });
  });
  refreshRarePageWidgets();
}
