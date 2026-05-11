import { loadLocalData, loadSupabaseData } from "./api-mainfix4.js";
import { loadLocalDataWithMasterV5 } from "./api-masterlist-v5.js";
import { applyAuditCorrections } from "./api-masterlist-v7.js";
import { sortRecords, normalizeRecord } from "./data-model-mainfix4.js";
import { state } from "./state.js";
import { parseRoute } from "./router.js";
import { renderDashboard } from "./pages-mainfix4-commonness-v1.js";
import { renderPage, bindDetailLinks, bindSharedActions, wireModal } from "./ui-mainfix-v2.js";

const COMMONNESS_ORDER = {
  "very common": 5,
  "common": 4,
  "occasional": 3,
  "uncommon": 2,
  "rare": 1
};

function sortByCommonness(records, direction = 'desc') {
  return [...records].sort((a, b) => {
    const aVal = COMMONNESS_ORDER[a.commonness] || 0;
    const bVal = COMMONNESS_ORDER[b.commonness] || 0;
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

function applySort(records, filters) {
  if (!filters.sort) return records;
  if (filters.sort === 'common-desc') return sortByCommonness(records, 'desc');
  if (filters.sort === 'common-asc') return sortByCommonness(records, 'asc');
  return records;
}

function renderCurrentRoute() {
  const route = parseRoute(location.hash || '#/home');
  const page = route.page || 'home';
  state.route = page;

  const filters = state.filters?.[page] || { sort: '' };

  let records = state.allRecords;

  records = applySort(records, filters);

  renderPage(renderDashboard({ page, allRecords: state.allRecords, currentRecords: records, filters }));

  bindDetailLinks();

  bindSharedActions({
    onFilterChange: e => {
      const key = e.currentTarget.dataset.filter;
      if (!state.filters) state.filters = {};
      if (!state.filters[page]) state.filters[page] = {};
      state.filters[page][key] = e.currentTarget.value;
      renderCurrentRoute();
    },
    onClearFilters: () => {
      if (state.filters && state.filters[page]) state.filters[page] = {};
      renderCurrentRoute();
    }
  });
}

async function init() {
  wireModal();

  let payload;
  try {
    payload = await loadSupabaseData();
    payload = await loadLocalDataWithMasterV5(async () => payload);
  } catch {
    payload = await loadLocalDataWithMasterV5(loadLocalData);
  }

  let records = (payload.records || []).map(normalizeRecord);
  records = await applyAuditCorrections(records);

  state.allRecords = sortRecords(records);

  renderCurrentRoute();
  window.addEventListener('hashchange', renderCurrentRoute);
}

init();
