// WNMU Workspace test active-scope and Clear All sync
// v1.5.119 test-page add-on. Loaded only by program-workspace-test.html.
// UI-only: does not write to Supabase or modify program records.

(function () {
  'use strict';

  const VERSION = 'v1.5.119';
  const BOX_ID = 'workspaceActiveScopeBox';
  const SELECT_ID = 'workspaceActiveScopeFilter';
  const RESET_ID = 'resetFiltersBtn';

  const MULTI_SELECT_IDS = ['topicFilter', 'secondaryTopicFilter', 'lengthFilter', 'codeFilter'];
  const SINGLE_VALUE_IDS = [
    'searchInput',
    'searchFieldSelect',
    'distributorFilter',
    'programTypeFilter',
    'statusFilter',
    'ratingFilter',
    'rightsWindowStartFilter',
    'rightsWindowEndFilter',
    'episodeMinFilter',
    'episodeMaxFilter'
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function setImportant(el, property, value) {
    if (!el) return;
    el.style.setProperty(property, value, 'important');
  }

  function safeStatus(message) {
    try {
      if (typeof setStatus === 'function') setStatus(message || '');
    } catch (_error) {}
  }

  function resetCaches() {
    try {
      if (!state || typeof state !== 'object') return;
      state.poolCacheKey = '';
      state.poolProgramIds = [];
      state.filteredCacheKey = '';
      state.filteredProgramIds = [];
    } catch (_error) {}
  }

  function refreshResults() {
    resetCaches();
    try { if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow(); } catch (_error) {}
    try { if (typeof syncQuickViewState === 'function') syncQuickViewState(); } catch (_error) {}
    try { if (typeof renderTable === 'function') renderTable(); } catch (_error) {}
    try { if (typeof renderStats === 'function') renderStats(); } catch (_error) {}
    try {
      if (typeof snapshotViewState === 'function' && typeof state === 'object') {
        state.lastAppliedViewState = snapshotViewState();
      }
    } catch (_error) {}
    try { if (typeof syncUndoButton === 'function') syncUndoButton(); } catch (_error) {}
  }

  function scopeFromState() {
    try {
      if (state?.currentView === 'active') return 'active';
      if (state?.currentView === 'archived' || state?.currentView === 'expired' || state?.currentView === 'archive_candidate') return 'archived';
      return 'all';
    } catch (_error) {
      return 'all';
    }
  }

  function setScope(value, options = {}) {
    const next = value === 'active' ? 'active' : (value === 'archived' ? 'archived' : 'all');
    try {
      if (typeof rememberViewState === 'function') rememberViewState();
    } catch (_error) {}
    try {
      if (state && typeof state === 'object') state.currentView = next;
    } catch (_error) {}

    const select = byId(SELECT_ID);
    if (select && select.value !== next) select.value = next;

    refreshResults();

    if (options.message !== false) {
      safeStatus(next === 'active'
        ? 'Showing active / in-rights titles only.'
        : (next === 'archived' ? 'Showing archived / out-of-rights titles.' : 'Showing all records.'));
    }

    window.setTimeout(syncScopeControl, 0);
  }

  function syncScopeControl() {
    const select = byId(SELECT_ID);
    if (!select) return;
    const next = scopeFromState();
    if (select.value !== next) select.value = next;
  }

  function installScopeControl() {
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    if (!cluster) return;

    let box = byId(BOX_ID);
    if (!box) {
      box = document.createElement('div');
      box.id = BOX_ID;
      box.className = 'filter-box cluster-active-scope';
      box.innerHTML = `
        <label class="filter-label" for="${SELECT_ID}">Active/Archived</label>
        <select id="${SELECT_ID}" aria-label="Active and archived title scope">
          <option value="active">Active only</option>
          <option value="all">All records</option>
          <option value="archived">Archived</option>
        </select>
      `;

      const rating = cluster.querySelector('.cluster-rating');
      if (rating?.nextSibling) cluster.insertBefore(box, rating.nextSibling);
      else cluster.appendChild(box);
    }

    const select = byId(SELECT_ID);
    if (select && select.dataset.workspaceScopeBound !== '1') {
      select.dataset.workspaceScopeBound = '1';
      select.addEventListener('change', () => setScope(select.value));
    }

    syncScopeControl();
  }

  function installStyles() {
    if (byId('workspaceScopeClearAllStyles')) return;

    const style = document.createElement('style');
    style.id = 'workspaceScopeClearAllStyles';
    style.textContent = `
      body.workspace-test-page #${BOX_ID} {
        min-width: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #${SELECT_ID} {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: 27px !important;
        min-height: 27px !important;
        padding-left: 6px !important;
        padding-right: 18px !important;
        font-size: .72rem !important;
      }
      body.workspace-test-page #controlsPanel .cluster-status select,
      body.workspace-test-page #controlsPanel .cluster-rating select {
        padding-left: 6px !important;
        padding-right: 18px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyScopeLayout() {
    const controls = byId('controlsPanel');
    const cluster = controls?.querySelector('.compact-search-cluster');
    if (!controls || !cluster) return;

    installScopeControl();

    const width = Math.max(0, Math.floor(controls.getBoundingClientRect().width || controls.clientWidth || 0));
    const narrow = width && width < 720;

    const status = cluster.querySelector('.cluster-status');
    const rating = cluster.querySelector('.cluster-rating');
    const active = cluster.querySelector('.cluster-active-scope');

    if (narrow) {
      place(status, '1 / span 2', '4');
      place(rating, '3 / span 2', '4');
      place(active, '5 / span 2', '4');
    } else {
      place(status, '7 / span 2', '2');
      place(rating, '9 / span 2', '2');
      place(active, '11 / span 2', '2');
    }
  }

  function place(el, column, row) {
    setImportant(el, 'grid-column', column);
    setImportant(el, 'grid-row', row);
    setImportant(el, 'min-width', '0');
    setImportant(el, 'max-width', '100%');
    setImportant(el, 'width', '100%');
  }

  function clearNativeMultiSelect(select) {
    if (!select) return;
    Array.from(select.options || []).forEach((option) => { option.selected = false; });
    select.value = '';
  }

  function clearWorkspaceDropdownVisuals(selectId) {
    const dropdown = document.querySelector(`.workspace-multi-dropdown[data-select-id="${String(selectId).replace(/"/g, '\\"')}"]`);
    if (!dropdown) return;

    dropdown.querySelectorAll('input[type="checkbox"][data-workspace-multi-value]').forEach((input) => {
      input.checked = false;
      input.removeAttribute('checked');
    });

    const toggleText = dropdown.querySelector('.workspace-multi-toggle-text');
    if (toggleText) {
      const labels = {
        topicFilter: 'All topics',
        secondaryTopicFilter: 'All secondary topics',
        lengthFilter: 'All lengths',
        codeFilter: 'All uses'
      };
      toggleText.textContent = labels[selectId] || 'All';
      toggleText.title = toggleText.textContent;
    }

    dropdown.querySelector('.workspace-multi-panel')?.classList.add('hidden');
    dropdown.querySelector('.workspace-multi-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function dispatchChange(el) {
    if (!el) return;
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_error) {}
  }

  function dispatchInput(el) {
    if (!el) return;
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_error) {}
  }

  function forceClearAllFilters() {
    MULTI_SELECT_IDS.forEach((id) => {
      const select = byId(id);
      clearNativeMultiSelect(select);
      clearWorkspaceDropdownVisuals(id);
      dispatchChange(select);
    });

    SINGLE_VALUE_IDS.forEach((id) => {
      const el = byId(id);
      if (!el) return;
      el.value = '';
      dispatchInput(el);
      dispatchChange(el);
    });

    // Clear All should leave the test page in the useful default:
    // active / in-rights titles only.
    setScope('active', { message: false });

    refreshResults();
    applyScopeLayout();
    safeStatus('All filters cleared. Showing active / in-rights titles only.');
  }

  function bindClearAll() {
    const button = byId(RESET_ID);
    if (!button || button.dataset.workspaceClearAllScopeBound === '1') return;
    button.dataset.workspaceClearAllScopeBound = '1';
    button.addEventListener('click', () => {
      [0, 60, 180].forEach((delay) => window.setTimeout(forceClearAllFilters, delay));
    });
  }

  function patchResetFilters() {
    if (window.__wnmuWorkspaceScopeResetPatch === '1') return;
    if (typeof resetFilters !== 'function') return;

    window.__wnmuWorkspaceScopeResetPatch = '1';
    const original = resetFilters;

    resetFilters = function workspaceScopeResetFiltersPatched(...args) {
      const result = original.apply(this, args);
      [0, 60, 180].forEach((delay) => window.setTimeout(forceClearAllFilters, delay));
      return result;
    };
  }

  function patchQuickStrip() {
    const quickStrip = byId('quickStrip');
    if (!quickStrip || quickStrip.dataset.workspaceScopeQuickBound === '1') return;
    quickStrip.dataset.workspaceScopeQuickBound = '1';

    quickStrip.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-view]');
      if (!button) return;
      window.setTimeout(syncScopeControl, 0);
      window.setTimeout(applyScopeLayout, 0);
    }, true);
  }

  function install() {
    if (!window.WNMU_WORKSPACE_TEST) return;

    installStyles();
    installScopeControl();
    applyScopeLayout();
    bindClearAll();
    patchResetFilters();
    patchQuickStrip();

    [80, 220, 500, 1000, 1800, 3000].forEach((delay) => window.setTimeout(() => {
      installScopeControl();
      applyScopeLayout();
      bindClearAll();
      patchResetFilters();
      syncScopeControl();
    }, delay));

    window.addEventListener('resize', () => window.requestAnimationFrame(applyScopeLayout));
    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('#controlsPanel')) window.setTimeout(() => {
        syncScopeControl();
        applyScopeLayout();
      }, 0);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUWorkspaceScopeClearAllFix = {
    version: VERSION,
    setScope,
    forceClearAllFilters,
    applyScopeLayout
  };
})();
