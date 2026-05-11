import { FORAGING_RARE_SIGHTINGS_TABLE } from "./constants-mainfix.js?v=v2.11-rare-detail";
import { state } from "./state.js?v=v2.11-rare-detail";

const LOCAL_KEY = "foraging_rare_sightings_local_v1";
let leafletReady = false;
let detailMap = null;
let detailMarker = null;

function esc(v) {
  return String(v ?? "").replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]
  ));
}

function rounded(lat, lng, precision) {
  if (precision === "hidden") {
    return { lat: null, lng: null, label: "Hidden" };
  }
  if (precision === "approximate") {
    return {
      lat: Number(Number(lat).toFixed(2)),
      lng: Number(Number(lng).toFixed(2)),
      label: `${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}`
    };
  }
  return {
    lat: Number(Number(lat).toFixed(5)),
    lng: Number(Number(lng).toFixed(5)),
    label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
  };
}

function localSightings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalSightings(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

async function getSupabaseClient() {
  const cfg = window.FORAGING_APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase?.createClient) {
    return null;
  }
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

export async function loadRareSpecies() {
  try {
    const response = await fetch("data/rare-species-v2.json", { cache: "no-store" });
    const payload = await response.json();
    return payload.records || [];
  } catch {
    return [];
  }
}

export async function loadRareSightings() {
  const client = await getSupabaseClient();
  if (!client) return localSightings();

  try {
    const { data, error } = await client
      .from(FORAGING_RARE_SIGHTINGS_TABLE)
      .select("*")
      .order("seen_on", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return localSightings();
  }
}

async function saveRareSighting(entry) {
  const client = await getSupabaseClient();
  const payload = {
    species_slug: entry.species_slug,
    species_name: entry.species_name,
    scientific_name: entry.scientific_name || "",
    seen_on: entry.seen_on,
    seen_time: entry.seen_time || "",
    latitude: entry.latitude,
    longitude: entry.longitude,
    notes: entry.notes || "",
    precision_mode: entry.precision_mode || "approximate",
    source_app: "foraging"
  };

  if (!client) {
    payload.id = crypto.randomUUID();
    const items = [payload, ...localSightings()];
    saveLocalSightings(items);
    return payload;
  }

  const { data, error } = await client
    .from(FORAGING_RARE_SIGHTINGS_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
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

function renderExportText() {
  return (state.rareSightings || []).map((item) => {
    const view = rounded(item.latitude, item.longitude, item.precision_mode || "approximate");
    const timePart = item.seen_time ? ` ${item.seen_time}` : "";
    return `${item.species_name || item.species_slug} — ${item.seen_on || ""}${timePart} — ${view.label}`;
  }).join("\n");
}

function renderSightingList() {
  if (!(state.rareSightings || []).length) {
    return '<p class="small-note">No sightings saved yet.</p>';
  }

  return (state.rareSightings || []).map((item) => {
    const view = rounded(item.latitude, item.longitude, item.precision_mode || "approximate");
    return `
      <article class="rare-sighting-item">
        <h4>${esc(item.species_name || item.species_slug)}</h4>
        <p class="rare-meta">${esc(item.seen_on || "")}${item.seen_time ? ` ${esc(item.seen_time)}` : ""}</p>
        <p>${view.label}</p>
        ${item.notes ? `<p>${esc(item.notes)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderRareCard(record) {
  return `
    <article class="rare-species-card">
      <h4>${esc(record.common_name)}</h4>
      <p class="rare-meta"><strong>${esc(record.scientific_name)}</strong></p>
      <p class="rare-meta">${esc(record.status)} · ${esc(record.legal_status)}</p>
      <p>${esc(record.short_reason || record.reason || "")}</p>
      <button class="buttonish rare-open-btn" type="button" data-rare-open="${esc(record.slug)}">Open details</button>
    </article>
  `;
}

export function renderRarePageHtml(records) {
  const plants = records.filter((r) => r.group === "plant");
  const fungi = records.filter((r) => r.group === "fungus");

  return `
    <section class="panel">
      <div class="result-header compact-result-header">
        <div class="result-title-row">
          <h3>Rare / endangered species</h3>
          <p class="results-meta">${records.length} entries</p>
        </div>
      </div>

      <div class="rare-page-actions">
        <button class="buttonish" type="button" id="rareBuildExportBtn">Export sightings text</button>
        <button class="buttonish" type="button" id="rareCopyExportBtn">Copy export</button>
      </div>

      <textarea id="rareDetailExportText" rows="8" placeholder="Species — date — time — location"></textarea>

      <div class="rare-columns" style="margin-top:14px">
        <section class="panel">
          <h3>Plants</h3>
          <div class="rare-species-list">
            ${plants.map(renderRareCard).join("")}
          </div>
        </section>

        <section class="panel">
          <h3>Fungi watchlist</h3>
          <p class="small-note">Non-legal watchlist entries with a reasonable rarity case or habitat-sensitivity case.</p>
          <div class="rare-species-list">
            ${fungi.map(renderRareCard).join("")}
          </div>
        </section>
      </div>

      <section class="panel" style="margin-top:14px">
        <div class="result-header compact-result-header">
          <div class="result-title-row">
            <h3>Saved sightings</h3>
            <p class="results-meta">${(state.rareSightings || []).length} saved</p>
          </div>
        </div>
        <div id="rareSightingList">${renderSightingList()}</div>
      </section>
    </section>
  `;
}

function rareDetailHtml(record) {
  const images = (record.images || []).map((img) => `
    <figure>
      <img src="${esc(img.url)}" alt="${esc(record.common_name)}">
      <figcaption class="rare-meta">${esc(img.caption || record.common_name)}</figcaption>
    </figure>
  `).join("");

  const lookalikes = (record.lookalikes || []).map((v) => `<span>${esc(v)}</span>`).join("");
  const keys = (record.key_features || []).map((v) => `<li>${esc(v)}</li>`).join("");
  const diffs = (record.distinguishing_features || []).map((v) => `<li>${esc(v)}</li>`).join("");
  const imgCredits = (record.images || []).map((img) => `
    <li><strong>${esc(img.creator || "Unknown creator")}</strong> — ${esc(img.caption || record.common_name)} — ${esc(img.license || "")}</li>
  `).join("");

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  return `
    <div class="rare-detail-layout">
      <section class="rare-detail-block">
        <span class="category-pill">${esc(record.group === "fungus" ? "Rare fungi watchlist" : "Rare / endangered plant")}</span>
        <h2 style="margin-top:10px">${esc(record.common_name)}</h2>
        <p class="rare-meta">
          <strong>${esc(record.scientific_name)}</strong>
          ${record.alt_scientific_names?.length ? ` · also listed as ${esc(record.alt_scientific_names.join(", "))}` : ""}
        </p>
        <p class="rare-meta">${esc(record.status)} · ${esc(record.legal_status)}</p>
        <p>${esc(record.reason || "")}</p>
        <p><strong>Habitat:</strong> ${esc(record.habitat || "—")}</p>
      </section>

      <section class="rare-detail-block">
        <h3>Images</h3>
        <div class="rare-detail-images">
          ${images || "<p>No images loaded.</p>"}
        </div>
      </section>

      <section class="rare-detail-block">
        <h3>How to tell it apart</h3>
        <ul>${keys}</ul>

        <h3>Common look-alikes</h3>
        <div class="rare-inline-tags">
          ${lookalikes || "<span>None noted</span>"}
        </div>

        <h3 style="margin-top:12px">Differences from common species</h3>
        <ul>${diffs}</ul>
      </section>

      <section class="rare-detail-block">
        <h3>Add sighting</h3>
        <div class="rare-sighting-grid">
          <div>
            <label class="compact-filter">
              <span>Species</span>
              <input id="rareDetailSpecies" value="${esc(record.common_name)}" disabled>
            </label>

            <label class="compact-filter">
              <span>Date seen</span>
              <input id="rareDetailDate" type="date" value="${dateStr}">
            </label>

            <label class="compact-filter">
              <span>Time seen</span>
              <input id="rareDetailTime" type="time" value="${timeStr}">
            </label>

            <label class="compact-filter">
              <span>Latitude</span>
              <input id="rareDetailLat" type="number" step="0.00001">
            </label>

            <label class="compact-filter">
              <span>Longitude</span>
              <input id="rareDetailLng" type="number" step="0.00001">
            </label>

            <label class="compact-filter">
              <span>Precision</span>
              <select id="rareDetailPrecision">
                <option value="approximate">Approximate</option>
                <option value="exact">Exact</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>

            <label class="compact-filter">
              <span>Notes</span>
              <textarea id="rareDetailNotes" rows="4" placeholder="Habitat, abundance, companions, weather, etc."></textarea>
            </label>

            <div class="rare-page-actions">
              <button class="buttonish" type="button" id="rareDetailGpsBtn">Use GPS</button>
              <button class="buttonish" type="button" id="rareDetailSaveBtn" data-rare-save="${esc(record.slug)}">Save sighting</button>
            </div>

            <p class="rare-meta">Map click will also fill latitude and longitude.</p>
          </div>

          <div>
            <button class="buttonish" type="button" id="rareOpenMapBtn">Open map</button>
            <div id="rareDetailMapWrap" style="display:none">
              <div id="rareDetailMap" class="rare-map"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="rare-detail-block">
        <h3>Image credits</h3>
        <ul>${imgCredits}</ul>
      </section>
    </div>
  `;
}

async function initDetailMap() {
  const mapEl = document.getElementById("rareDetailMap");
  if (!mapEl) return;

  await ensureLeaflet();

  if (detailMap) {
    detailMap.invalidateSize();
    return;
  }

  detailMap = window.L.map(mapEl).setView([46.5, -87.4], 6);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(detailMap);

  detailMap.on("click", (e) => {
    document.getElementById("rareDetailLat").value = e.latlng.lat.toFixed(5);
    document.getElementById("rareDetailLng").value = e.latlng.lng.toFixed(5);

    if (detailMarker) detailMarker.remove();
    detailMarker = window.L.marker(e.latlng).addTo(detailMap);
  });
}

function openRareDetail(slug) {
  const record = (state.rareSpecies || []).find((r) => r.slug === slug);
  if (!record) return;

  const dialog = document.getElementById("detailModal");
  const content = document.getElementById("modalContent");
  content.innerHTML = rareDetailHtml(record);

  if (typeof dialog.showModal === "function") {
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute("open", "open");
    }
  } else {
    dialog.setAttribute("open", "open");
  }

  document.getElementById("rareOpenMapBtn")?.addEventListener("click", async () => {
    const wrap = document.getElementById("rareDetailMapWrap");
    wrap.style.display = "block";
    await initDetailMap();
    detailMap.invalidateSize();
  });

  document.getElementById("rareDetailGpsBtn")?.addEventListener("click", () => {
    navigator.geolocation?.getCurrentPosition?.((pos) => {
      document.getElementById("rareDetailLat").value = pos.coords.latitude.toFixed(5);
      document.getElementById("rareDetailLng").value = pos.coords.longitude.toFixed(5);

      const wrap = document.getElementById("rareDetailMapWrap");
      wrap.style.display = "block";

      initDetailMap().then(() => {
        detailMap.setView([pos.coords.latitude, pos.coords.longitude], 12);
        if (detailMarker) detailMarker.remove();
        detailMarker = window.L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(detailMap);
      });
    });
  });

  document.getElementById("rareDetailSaveBtn")?.addEventListener("click", async () => {
    const latitude = document.getElementById("rareDetailLat").value;
    const longitude = document.getElementById("rareDetailLng").value;
    const seen_on = document.getElementById("rareDetailDate").value;
    const seen_time = document.getElementById("rareDetailTime").value;
    const precision_mode = document.getElementById("rareDetailPrecision").value;
    const notes = document.getElementById("rareDetailNotes").value;

    if (!latitude || !longitude || !seen_on) {
      alert("Date, latitude, and longitude are required.");
      return;
    }

    const saved = await saveRareSighting({
      species_slug: record.slug,
      species_name: record.common_name,
      scientific_name: record.scientific_name,
      seen_on,
      seen_time,
      latitude: Number(latitude),
      longitude: Number(longitude),
      notes,
      precision_mode
    });

    state.rareSightings = [saved, ...(state.rareSightings || [])];

    const list = document.getElementById("rareSightingList");
    if (list) list.innerHTML = renderSightingList();

    alert("Sighting saved.");
  });
}

export async function wireRarePage() {
  document.querySelectorAll("[data-rare-open]").forEach((btn) => {
    btn.addEventListener("click", () => openRareDetail(btn.dataset.rareOpen));
  });

  document.getElementById("rareBuildExportBtn")?.addEventListener("click", () => {
    document.getElementById("rareDetailExportText").value = renderExportText();
  });

  document.getElementById("rareCopyExportBtn")?.addEventListener("click", async () => {
    const box = document.getElementById("rareDetailExportText");
    if (!box.value) box.value = renderExportText();
    await navigator.clipboard.writeText(box.value);
  });
}
