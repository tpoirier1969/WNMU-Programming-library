// v2.1-seasonfix
import { loadLocalData, loadSupabaseData } from "./api.js?v=v2.0";
import { sortRecords, normalizeRecord, isMushroom, isPlant, medicinalRecords, reviewRecords, lookalikeRecords } from "./data-model.js?v=v2.0";
import { state } from "./state.js?v=v2.0";
import { parseRoute } from "./router.js?v=v2.0";
import { MONTHS } from "./constants.js?v=v2.0";
import { renderDashboard } from "./pages-seasonfix.js?v=v2.1-seasonfix";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal, openDetail } from "./ui.js?v=v2.0";

const focusDate = new Date();
focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];

// FIX: no default month filter anywhere
const emptyFilter = () => ({ search: "", month: "", category: "", habitat: "", part: "", size: "", taste: "", substrate: "", treeType: "", hostTree: "", ring: "", texture: "", smell: "", staining: "", medicinalAction: "", medicinalSystem: "", medicinalTerm: "", reviewReason: "", severity: "" });

const filterState = { home: emptyFilter(), plants: emptyFilter(), mushrooms: emptyFilter(), medicinal: emptyFilter(), lookalikes: emptyFilter(), review: emptyFilter() };

const paneMode = { home: 'results', plants: 'results', mushrooms: 'results', medicinal: 'results', lookalikes: 'results', timeline: 'results', review: 'results' };
let selectedTimelineMonth = CURRENT_MONTH;
let selectedTimelineWeek = 1;

function arrayFilterMatch(record, key, value) {
  if (!value) return true;
  return (record[key] || []).includes(value);
}

function queryMatches(record, filters) {
  const query = (filters.search || "").trim().toLowerCase();
  const haystack = [record.display_name, record.common_name, record.scientific_name, record.category].join(" ").toLowerCase();
  const monthMatch = !filters.month || (record.months_available || []).includes(filters.month);
  return (!query || haystack.includes(query)) && monthMatch;
}

function filteredForPage(page) {
  if (page === 'plants') return state.allRecords.filter(isPlant).filter(r => queryMatches(r, filterState.plants));
  if (page === 'mushrooms') return state.allRecords.filter(isMushroom).filter(r => queryMatches(r, filterState.mushrooms));
  if (page === 'medicinal') return medicinalRecords(state.allRecords).filter(r => queryMatches(r, filterState.medicinal));
  if (page === 'lookalikes') return lookalikeRecords(state.allRecords).filter(r => queryMatches(r, filterState.lookalikes));
  if (page === 'review') return reviewRecords(state.allRecords).filter(r => queryMatches(r, filterState.review));
  return state.allRecords.filter(r => queryMatches(r, filterState.home));
}

function renderCurrentRoute() {
  const route = parseRoute(location.hash || "#/home");
  const activePage = route.page === 'detail' ? (state.route || 'home') : route.page;

  // ONLY apply month when explicitly using focus route
  if (route.focus && filterState[activePage]) {
    filterState[activePage] = { ...filterState[activePage], month: CURRENT_MONTH };
  }

  state.route = activePage;
  markActiveNav(activePage);

  renderPage(renderDashboard({
    page: activePage,
    allRecords: state.allRecords,
    currentRecords: filteredForPage(activePage),
    filters: filterState[activePage] || emptyFilter(),
    selectedMonth: selectedTimelineMonth,
    selectedWeek: selectedTimelineWeek,
    paneMode: paneMode[activePage] || 'results'
  }));

  bindDetailLinks();
  bindSharedActions({
    onFilterChange: event => {
      const page = state.route;
      filterState[page][event.currentTarget.dataset.filter] = event.currentTarget.value;
      renderCurrentRoute();
    },
    onClearFilters: () => {
      const page = state.route;
      filterState[page] = emptyFilter();
      renderCurrentRoute();
    }
  });
}

async function init() {
  wireModal();
  let payload;
  try { payload = await loadSupabaseData(); }
  catch { payload = await loadLocalData(); }
  state.allRecords = sortRecords((payload.records || []).map(normalizeRecord));
  updateHeaderStats(state.allRecords);
  renderCurrentRoute();
  window.addEventListener("hashchange", renderCurrentRoute);
}
init();