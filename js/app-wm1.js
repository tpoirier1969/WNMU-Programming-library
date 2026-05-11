import { loadLocalData, loadSupabaseData } from "./api-wm1.js?v=v2.0-wm1";
import { sortRecords, normalizeRecord, isMushroom, isPlant, medicinalRecords, reviewRecords, lookalikeRecords } from "./data-model.js?v=v2.0";
import { state } from "./state.js?v=v2.0";
import { parseRoute } from "./router.js?v=v2.0";
import { MONTHS } from "./constants-wm1.js?v=v2.0-wm1";
import { renderDashboard } from "./pages.js?v=v2.0";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal, openDetail } from "./ui.js?v=v2.0";

const focusDate = new Date();
focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];
const emptyFilter = (page = '') => ({ search: "", month: page === 'home' ? CURRENT_MONTH : "", category: "", habitat: "", part: "", size: "", taste: "", substrate: "", treeType: "", hostTree: "", ring: "", texture: "", smell: "", staining: "", medicinalAction: "", medicinalSystem: "", medicinalTerm: "", reviewReason: "", severity: "" });
const filterState = { home: emptyFilter('home'), plants: emptyFilter(), mushrooms: emptyFilter(), medicinal: emptyFilter(), lookalikes: emptyFilter(), review: emptyFilter() };
const paneMode = { home: 'results', plants: 'results', mushrooms: 'results', medicinal: 'results', lookalikes: 'results', timeline: 'results', review: 'results' };
let selectedTimelineMonth = CURRENT_MONTH;
let selectedTimelineWeek = 1;

function arrayFilterMatch(record, key, value) {
  if (!value) return true;
  return (record[key] || []).includes(value);
}

function queryMatches(record, filters) {
  const query = (filters.search || "").trim().toLowerCase();
  const haystack = [
    record.display_name, record.common_name, record.scientific_name, record.category,
    record.culinary_uses, record.medicinal_uses, record.notes, record.other_uses,
    record.changes_over_time, record.edibility_detail, record.effects_on_body,
    ...(record.links || []), ...(record.reviewReasons || []), ...(record.affected_systems || []), ...(record.look_alikes || []),
    ...(record.mushroom_profile?.research_notes || []), record.mushroom_profile?.summary, record.mushroom_profile?.ecology, record.mushroom_profile?.season_note
  ].join(" ").toLowerCase();
  const monthMatch = !filters.month || (record.months_available || []).includes(filters.month);
  const searchMatch = !query || haystack.includes(query);
  const categoryMatch = !filters.category || record.category === filters.category;
  const severityMatch = !filters.severity || (record.non_edible_severity || '') === filters.severity;
  return searchMatch && monthMatch && categoryMatch && severityMatch
    && arrayFilterMatch(record, 'habitat', filters.habitat)
    && arrayFilterMatch(record, 'observedPart', filters.part)
    && arrayFilterMatch(record, 'size', filters.size)
    && arrayFilterMatch(record, 'taste', filters.taste)
    && arrayFilterMatch(record, 'substrate', filters.substrate)
    && arrayFilterMatch(record, 'treeType', filters.treeType)
    && arrayFilterMatch(record, 'hostTree', filters.hostTree)
    && arrayFilterMatch(record, 'ring', filters.ring)
    && arrayFilterMatch(record, 'texture', filters.texture)
    && arrayFilterMatch(record, 'smell', filters.smell)
    && arrayFilterMatch(record, 'staining', filters.staining)
    && arrayFilterMatch(record, 'medicinalAction', filters.medicinalAction)
    && arrayFilterMatch(record, 'medicinalSystem', filters.medicinalSystem)
    && arrayFilterMatch(record, 'medicinalTerms', filters.medicinalTerm)
    && (!filters.reviewReason || (record.reviewReasons || []).includes(filters.reviewReason));
}

function filteredForPage(page) {
  if (page === 'home') return state.allRecords.filter(record => queryMatches(record, filterState.home));
  if (page === 'plants') return state.allRecords.filter(isPlant).filter(record => queryMatches(record, filterState.plants));
  if (page === 'mushrooms') return state.allRecords.filter(isMushroom).filter(record => queryMatches(record, filterState.mushrooms));
  if (page === 'medicinal') return medicinalRecords(state.allRecords).filter(record => queryMatches(record, filterState.medicinal));
  if (page === 'lookalikes') return lookalikeRecords(state.allRecords).filter(record => queryMatches(record, filterState.lookalikes));
  if (page === 'review') return reviewRecords(state.allRecords).filter(record => queryMatches(record, filterState.review));
  return state.allRecords;
}

function renderCurrentRoute() {
  const route = parseRoute(location.hash || "#/home");
  const allowedPages = ['home','plants','mushrooms','medicinal','lookalikes','timeline','review'];
  const activePage = route.page === 'detail' ? (state.route || 'home') : (allowedPages.includes(route.page) ? route.page : 'home');
  if (route.focus && filterState[activePage]) {
    filterState[activePage] = { ...filterState[activePage], month: CURRENT_MONTH };
    if (activePage === "timeline") selectedTimelineMonth = CURRENT_MONTH;
  }
  state.route = activePage;
  markActiveNav(activePage);

  if (route.page === "detail" && route.slug) {
    if (!document.getElementById("pageRoot").innerHTML.trim()) {
      renderPage(renderDashboard({
        page: activePage,
        allRecords: state.allRecords,
        currentRecords: filteredForPage(activePage),
        filters: filterState[activePage] || emptyFilter(activePage),
        selectedMonth: selectedTimelineMonth,
        selectedWeek: selectedTimelineWeek,
        paneMode: paneMode[activePage] || 'results'
      }));
    }
    bindDetailLinks();
    openDetail(route.slug);
    return;
  }

  renderPage(renderDashboard({
    page: activePage,
    allRecords: state.allRecords,
    currentRecords: filteredForPage(activePage),
    filters: filterState[activePage] || emptyFilter(activePage),
    selectedMonth: selectedTimelineMonth,
    selectedWeek: selectedTimelineWeek,
    paneMode: paneMode[activePage] || 'results'
  }));

  bindDetailLinks();
  bindSharedActions({
    onFilterChange: event => {
      const target = event.currentTarget;
      const page = state.route;
      if (!filterState[page]) return;
      filterState[page][target.dataset.filter] = target.value;
      if (target.dataset.filter === 'treeType') filterState[page].hostTree = '';
      renderCurrentRoute();
    },
    onClearFilters: () => {
      const page = state.route;
      if (!filterState[page]) return;
      filterState[page] = emptyFilter(page);
      renderCurrentRoute();
    },
    onTimelineMonthChange: (month, week) => {
      if (!month) return;
      selectedTimelineMonth = month;
      selectedTimelineWeek = Number(week || 1);
      renderCurrentRoute();
    },
    onPaneModeChange: (page, nextPaneMode) => {
      if (!page || !paneMode[page] || !nextPaneMode) return;
      paneMode[page] = nextPaneMode;
      renderCurrentRoute();
    },
    onTimelineShift: direction => {
      const index = MONTHS.indexOf(selectedTimelineMonth);
      if (index < 0) return;
      const delta = direction === 'prev' ? -1 : 1;
      const nextIndex = (index + delta + MONTHS.length) % MONTHS.length;
      selectedTimelineMonth = MONTHS[nextIndex];
      renderCurrentRoute();
    }
  });
}

async function init() {
  wireModal();
  try {
    let payload;
    try { payload = await loadSupabaseData(); state.dataSource = "Supabase live data + Wikimedia override"; }
    catch (supabaseError) { payload = await loadLocalData(); state.dataSource = "Local JSON fallback + Wikimedia override"; console.info("Supabase not used for this run:", supabaseError?.message || supabaseError); }
    state.allRecords = sortRecords((payload.records || []).map(normalizeRecord));
    updateHeaderStats(state.allRecords);
    renderCurrentRoute();
    window.addEventListener("hashchange", renderCurrentRoute);
  } catch (error) {
    console.error(error);
    renderPage(`<section class="panel empty-state"><h2>Data load failed</h2><p>${String(error.message || error)}</p></section>`);
  }
}
init();
