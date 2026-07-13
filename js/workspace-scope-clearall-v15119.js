// WNMU Programming Workspace — active/archive scope and Clear All behavior
// v1.5.125: behavior only. Filter geometry is owned by program-workspace-test.js.

(function () {
  'use strict';

  const VERSION = 'v1.5.125';
  const SELECT_ID = 'workspaceActiveScopeFilter';

  function byId(id) {
    return document.getElementById(id);
  }

  function safeStatus(message) {
    try {
      if (typeof setStatus === 'function') setStatus(message || '');
    } catch {}
  }

  function invalidateCaches() {
    try {
      state.poolCacheKey = '';
      state.poolProgramIds = [];
      state.filteredCacheKey = '';
      state.filteredProgramIds = [];
    } catch {}
  }

  function scopeFromState() {
    try {
      if (state?.currentView === 'active') return 'active';
      if (['archived', 'expired', 'archive_candidate'].includes(state?.currentView)) return 'archived';
    } catch {}
    return 'all';
  }

  function syncScopeControl() {
    const select = byId(SELECT_ID);
    if (!select) return;
    const value = scopeFromState();
    if (select.value !== value) select.value = value;
  }

  function refreshResults() {
    invalidateCaches();
    try { if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow(); } catch {}
    try { if (typeof syncQuickViewState === 'function') syncQuickViewState(); } catch {}
    try { if (typeof renderTable === 'function') renderTable(); } catch {}
    try { if (typeof renderStats === 'function') renderStats(); } catch {}
    try {
      if (typeof snapshotViewState === 'function') state.lastAppliedViewState = snapshotViewState();
    } catch {}
    try { if (typeof syncUndoButton === 'function') syncUndoButton(); } catch {}
    syncScopeControl();
  }

  function setScope(value, options = {}) {
    const next = value === 'active' ? 'active' : value === 'archived' ? 'archived' : 'all';
    try { if (typeof rememberViewState === 'function') rememberViewState(); } catch {}
    try { state.currentView = next; } catch {}
    refreshResults();

    if (options.message !== false) {
      safeStatus(next === 'active'
        ? 'Showing active / in-rights titles only.'
        : next === 'archived'
          ? 'Showing archived / out-of-rights titles.'
          : 'Showing all records.');
    }
  }

  function resetAllFilters() {
    // Call the current resetFilters wrapper so episode limits and topic exclusions
    // are cleared by their own modules. Then set the workspace default scope.
    try { if (typeof resetFilters === 'function') resetFilters(); } catch (error) { console.error(error); }
    try { state.currentView = 'active'; } catch {}

    try { window.WNMUWorkspaceFilterUi?.syncMultiDropdowns?.(); } catch {}
    refreshResults();
    safeStatus('All filters cleared. Showing active / in-rights titles only.');
  }

  function install() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    const select = byId(SELECT_ID);
    if (select && select.dataset.workspaceScopeBound !== '1') {
      select.dataset.workspaceScopeBound = '1';
      select.addEventListener('change', () => setScope(select.value));
    }

    const quickStrip = byId('quickStrip');
    if (quickStrip && quickStrip.dataset.workspaceScopeBound !== '1') {
      quickStrip.dataset.workspaceScopeBound = '1';
      quickStrip.addEventListener('click', (event) => {
        if (!event.target?.closest?.('[data-view]')) return;
        window.requestAnimationFrame(syncScopeControl);
      });
    }

    syncScopeControl();
  }

  window.WNMUWorkspaceScopeClearAllFix = {
    version: VERSION,
    setScope,
    resetAllFilters,
    syncScopeControl
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
