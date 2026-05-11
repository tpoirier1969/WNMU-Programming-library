import { APP_VERSION } from "./config.js";
import {
  state,
  setRoute,
  setSpecies,
  setRareSpecies,
  setReferences,
  logBoot
} from "./state.js";
import { loadAppData } from "./data/load-app-data.js";
import { renderPage, openModal, closeModal, els } from "./ui/dom.js";
import { markActiveNav } from "./ui/nav.js";
import { renderDetail } from "./ui/render-detail.js";
import { filterRecords, renderRecordCards } from "./ui/render-list.js";
import { renderHome } from "./ui/render-home.js";
import { renderRarePage } from "./ui/render-rare.js";
import { renderReferencesPage } from "./ui/render-references.js";
import { renderCreditsPage } from "./ui/render-credits.js";
import { installLazyImages } from "./lib/image-resolver.js";
import { esc } from "./lib/escape.js";

function parseRoute() {
  const raw = String(location.hash || "#/home").replace(/^#\/?/, "");
  return raw || "home";
}

function statusHtml(title = "Loading…", items = []) {
  return `
    <section class="panel">
      <h2>${esc(title)}</h2>
      <ul class="status-log">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function controlsHtml(route, placeholder = "Search species") {
  const search = state.filters.search || "";
  return `
    <section class="panel">
      <div class="control-row">
        <input id="speciesSearch" type="search" value="${esc(search)}" placeholder="${esc(placeholder)}" style="flex:1;min-width:280px">
        <button id="speciesSearchBtn" class="primary" type="button">Search</button>
        ${search ? `<button id="speciesClearBtn" type="button">Clear</button>` : ""}
      </div>
    </section>
  `;
}

function routeTitle(route) {
  return {
    home: "Home",
    plants: "Plants",
    mushrooms: "Mushrooms",
    medicinal: "Medicinal",
    rare: "Rare",
    lookalikes: "Non-edible",
    references: "References",
    credits: "Credits",
    search: "Search"
  }[route] || "Home";
}

function renderSpeciesRoute(route) {
  const filtered = filterRecords(state.species, route === "search" ? "home" : route, state.filters.search);
  const title = route === "search" ? `Search (${filtered.length})` : `${routeTitle(route)} (${filtered.length})`;
  renderPage(`
    ${controlsHtml(route, route === "search" ? "Search all species" : `Search ${routeTitle(route).toLowerCase()}`)}
    <section class="panel">
      <h2>${esc(title)}</h2>
    </section>
    ${renderRecordCards(filtered)}
  `);
  wirePageEvents(route);
}

function renderCurrentRoute() {
  const route = parseRoute();
  setRoute(route);
  markActiveNav(route === "search" ? "search" : route);

  if (state.loading) {
    renderPage(statusHtml("Loading…", state.bootLog));
    return;
  }

  if (route === "home") {
    renderPage(renderHome(state.species, state.rareSpecies, state.loadErrors || []));
    wirePageEvents(route);
    return;
  }

  if (route === "rare") {
    renderPage(renderRarePage(state.rareSpecies, state.filters.search));
    wirePageEvents(route);
    return;
  }

  if (route === "references") {
    renderPage(renderReferencesPage(state.references, state.filters.search));
    wirePageEvents(route);
    return;
  }

  if (route === "credits") {
    renderPage(renderCreditsPage(state.species, state.imageCredits, state.filters.search));
    wirePageEvents(route);
    return;
  }

  renderSpeciesRoute(route);
}

function getRecordBySlug(slug) {
  return state.species.find(record => record.slug === slug)
    || state.rareSpecies.find(record => record.slug === slug);
}

function wirePageEvents(route) {
  document.getElementById("homeSearchBtn")?.addEventListener("click", () => {
    const value = document.getElementById("homeSearch")?.value || "";
    state.filters.search = value;
    location.hash = "#/search";
  });

  const searchInput = document.getElementById("speciesSearch");
  document.getElementById("speciesSearchBtn")?.addEventListener("click", () => {
    state.filters.search = searchInput?.value || "";
    renderCurrentRoute();
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.filters.search = searchInput?.value || "";
      renderCurrentRoute();
    }
  });
  document.getElementById("speciesClearBtn")?.addEventListener("click", () => {
    state.filters.search = "";
    renderCurrentRoute();
  });

  const rareSearch = document.getElementById("rareSearch");
  document.getElementById("rareSearchBtn")?.addEventListener("click", () => {
    state.filters.search = rareSearch?.value || "";
    renderCurrentRoute();
  });
  rareSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.filters.search = rareSearch?.value || "";
      renderCurrentRoute();
    }
  });

  const refSearch = document.getElementById("refSearch");
  document.getElementById("refSearchBtn")?.addEventListener("click", () => {
    state.filters.search = refSearch?.value || "";
    renderCurrentRoute();
  });
  refSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.filters.search = refSearch?.value || "";
      renderCurrentRoute();
    }
  });

  const creditsSearch = document.getElementById("creditsSearch");
  document.getElementById("creditsSearchBtn")?.addEventListener("click", () => {
    state.filters.search = creditsSearch?.value || "";
    renderCurrentRoute();
  });
  creditsSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.filters.search = creditsSearch?.value || "";
      renderCurrentRoute();
    }
  });

  document.querySelectorAll("[data-detail]").forEach(btn => {
    btn.addEventListener("click", () => {
      const record = getRecordBySlug(btn.dataset.detail);
      if (!record) return;
      openModal(renderDetail(record));
      installLazyImages(els.modalContent, getRecordBySlug);
    });
  });

  installLazyImages(els.pageRoot, getRecordBySlug);
}

async function boot() {
  state.loading = true;
  renderPage(statusHtml("Loading…", state.bootLog));

  try {
    const result = await loadAppData((message) => {
      logBoot(message);
      renderPage(statusHtml("Loading…", state.bootLog));
    });

    setSpecies(result.species);
    setRareSpecies(result.rareSpecies);
    setReferences(result.references);
    state.loadErrors = result.errors;
    state.loading = false;
    renderCurrentRoute();
  } catch (err) {
    state.loading = false;
    renderPage(`
      <section class="error-box">
        <h2>Startup failed</h2>
        <p>The app did not just sit there and pretend. It failed loading repo data.</p>
        <p class="codeish">${esc(err.message || String(err))}</p>
        <p>Try serving this folder from a local web server, or upload it to GitHub Pages. The fetch targets are public repo files, not chat-only connector calls.</p>
        <div class="control-row">
          <button id="retryBoot" class="primary" type="button">Retry</button>
        </div>
      </section>
      ${statusHtml("Boot log", state.bootLog)}
    `);
    document.getElementById("retryBoot")?.addEventListener("click", boot);
  }
}

window.addEventListener("hashchange", renderCurrentRoute);
els.closeModalBtn?.addEventListener("click", closeModal);
els.modal?.addEventListener("click", (event) => {
  const card = els.modal.querySelector(".modal-card");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const inside = rect.left <= event.clientX && event.clientX <= rect.right && rect.top <= event.clientY && event.clientY <= rect.bottom;
  if (!inside) closeModal();
});

document.getElementById('versionBadge')?.replaceChildren(document.createTextNode(APP_VERSION));

boot();
