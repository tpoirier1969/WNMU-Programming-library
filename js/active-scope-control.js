// WNMU Programming Library Active Scope Control
// Adds an end-of-filter-row Active / All Records / Archived selector.
// Additive UI module only. Does not write to Supabase and does not change program records.

(function () {
  'use strict';

  const VERSION = '1.0.0';
  const CONTROL_ID = 'activeScopeFilterBox';
  const SELECT_ID = 'activeScopeFilter';

  function canUseAppState() {
    try {
      return typeof state === 'object' && Array.isArray(state.programs);
    } catch (_error) {
      return false;
    }
  }

  function setStatusSafe(message) {
    try {
      if (typeof setStatus === 'function') setStatus(message);
    } catch (_error) {}
  }

  function invalidateCaches() {
    try {
      if (!canUseAppState()) return;
      state.poolCacheKey = '';
      state.poolProgramIds = [];
      state.filteredCacheKey = '';
      state.filteredProgramIds = [];
    } catch (_error) {}
  }

  function patchProgramsInCurrentViewPool() {
    if (window.__wnmuActiveScopeProgramsPoolPatch === '1') return;
    if (typeof programsInCurrentViewPool !== 'function') return;

    window.__wnmuActiveScopeProgramsPoolPatch = '1';
    const originalProgramsInCurrentViewPool = programsInCurrentViewPool;

    programsInCurrentViewPool = function activeScopePatchedProgramsInCurrentViewPool(...args) {
      if (canUseAppState() && state.currentView === 'all_records') {
        const cacheKey = `all_records|${state.programs.length}`;
        if (state.poolCacheKey === cacheKey && Array.isArray(state.poolProgramIds)) return state.poolProgramIds;

        state.poolCacheKey = cacheKey;
        state.poolProgramIds = state.programs;
        return state.programs;
      }

      return originalProgramsInCurrentViewPool.apply(this, args);
    };
  }

  function selectedScopeFromState() {
    try {
      if (state.currentView === 'archived') return 'archived';
      if (state.currentView === 'all_records') return 'all_records';
    } catch (_error) {}
    return 'active';
  }

  function applyScope(value) {
    if (!canUseAppState()) return;

    const next = value === 'all_records'
      ? 'all_records'
      : (value === 'archived' ? 'archived' : 'all');

    try {
      if (typeof rememberViewState === 'function') rememberViewState();
    } catch (_error) {}

    state.currentView = next;
    invalidateCaches();

    try {
      if (typeof syncQuickViewState === 'function') syncQuickViewState();
      if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
      if (typeof renderTable === 'function') renderTable();
      if (typeof renderStats === 'function') renderStats();
      if (typeof snapshotViewState === 'function') state.lastAppliedViewState = snapshotViewState();
      if (typeof syncUndoButton === 'function') syncUndoButton();
    } catch (error) {
      console.warn('Active Scope UI refresh issue:', error);
    }

    const label = value === 'all_records'
      ? 'Showing all records, including archived.'
      : (value === 'archived' ? 'Showing archived titles.' : 'Showing active titles only.');

    setStatusSafe(label);
    syncControlToState();
  }

  function ensureStyles() {
    if (document.getElementById('activeScopeControlStyles')) return;

    const style = document.createElement('style');
    style.id = 'activeScopeControlStyles';
    style.textContent = `
      #${CONTROL_ID} {
        min-width: 110px !important;
        max-width: 132px !important;
      }

      #${CONTROL_ID} .filter-label {
        white-space: nowrap !important;
      }

      #${SELECT_ID} {
        min-width: 0 !important;
        width: 100% !important;
        padding-left: 7px !important;
        padding-right: 22px !important;
        font-size: .76rem !important;
      }

      @media (min-width: 1180px) {
        #controlsPanel .compact-search-cluster {
          grid-template-columns:
            minmax(122px, .95fr)
            minmax(74px, .72fr)
            minmax(74px, .72fr)
            minmax(74px, .72fr)
            66px
            110px
            94px
            104px
            78px !important;
        }

        #controlsPanel .cluster-type { grid-column: 1 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-search-text { grid-column: 2 / span 4 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-distributor { grid-column: 6 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-episodes { grid-column: 7 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-status { grid-column: 8 !important; grid-row: 1 !important; max-width: 104px !important; }
        #controlsPanel .cluster-rating { grid-column: 9 !important; grid-row: 1 !important; max-width: 78px !important; }

        #controlsPanel .cluster-search-in { grid-column: 1 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-start { grid-column: 2 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-end { grid-column: 4 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel #${CONTROL_ID} { grid-column: 6 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-clear-all { grid-column: 8 / span 2 !important; grid-row: 2 !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureControl() {
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    if (!cluster) return null;

    let box = document.getElementById(CONTROL_ID);
    if (!box) {
      box = document.createElement('div');
      box.id = CONTROL_ID;
      box.className = 'filter-box cluster-active-scope';
      box.innerHTML = `
        <label class="filter-label" for="${SELECT_ID}">Titles</label>
        <select id="${SELECT_ID}" aria-label="Title scope">
          <option value="active">Active only</option>
          <option value="all_records">All records</option>
          <option value="archived">Archived</option>
        </select>
      `;

      const clearHolder = cluster.querySelector('.cluster-clear-all');
      if (clearHolder) cluster.insertBefore(box, clearHolder);
      else cluster.appendChild(box);
    }

    const select = document.getElementById(SELECT_ID);
    if (select && select.dataset.activeScopeBound !== '1') {
      select.dataset.activeScopeBound = '1';
      select.addEventListener('change', () => applyScope(select.value));
    }

    return box;
  }

  function syncControlToState() {
    const select = document.getElementById(SELECT_ID);
    if (!select) return;
    const value = selectedScopeFromState();
    if (select.value !== value) select.value = value;
  }

  function patchRenderFilters() {
    if (window.__wnmuActiveScopeRenderFiltersPatch === '1') return;
    if (typeof renderFilters !== 'function') return;

    window.__wnmuActiveScopeRenderFiltersPatch = '1';
    const originalRenderFilters = renderFilters;

    renderFilters = function activeScopePatchedRenderFilters(...args) {
      const result = originalRenderFilters.apply(this, args);
      installUi();
      return result;
    };
  }

  function patchResetFilters() {
    if (window.__wnmuActiveScopeResetPatch === '1') return;
    if (typeof resetFilters !== 'function') return;

    window.__wnmuActiveScopeResetPatch = '1';
    const originalResetFilters = resetFilters;

    resetFilters = function activeScopePatchedResetFilters(...args) {
      const result = originalResetFilters.apply(this, args);
      // Existing reset goes to state.currentView = 'all', which is active-only.
      syncControlToState();
      return result;
    };
  }

  function installUi() {
    ensureStyles();
    ensureControl();
    syncControlToState();
  }

  function install() {
    patchProgramsInCurrentViewPool();
    patchRenderFilters();
    patchResetFilters();
    installUi();

    [100, 300, 800, 1600].forEach((delay) => window.setTimeout(() => {
      patchProgramsInCurrentViewPool();
      patchRenderFilters();
      patchResetFilters();
      installUi();
    }, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUActiveScopeControl = {
    version: VERSION,
    applyScope,
    syncControlToState
  };
})();
