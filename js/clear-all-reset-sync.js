// WNMU Programming Library Clear All reset sync
// Fixes the case where Clear All clears the actual filter results,
// but custom checkbox/dropdown filter UI still appears checked.
// Additive UI module only. Does not write to Supabase or modify program records.

(function () {
  'use strict';

  const VERSION = '1.0.1';
  const RESET_BUTTON_ID = 'resetFiltersBtn';

  const MULTI_SELECT_IDS = [
    'topicFilter',
    'secondaryTopicFilter',
    'lengthFilter',
    'codeFilter'
  ];

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

  function setStatusSafe(message) {
    try {
      if (typeof setStatus === 'function') setStatus(message);
    } catch (_error) {}
  }

  function isElement(value) {
    return value && value.nodeType === 1;
  }

  function clearNativeMultiSelect(select) {
    if (!select) return;
    Array.from(select.options || []).forEach((option) => {
      option.selected = false;
    });
    select.value = '';
  }

  function clearNativeValueControl(el, value = '') {
    if (!el) return;
    el.value = value;
  }

  function dispatchChange(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (_error) {}
  }

  function dispatchInput(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (_error) {}
  }

  function clearCheckboxLikeNode(node) {
    if (!isElement(node)) return;

    if (node.matches?.('input[type="checkbox"], input[type="radio"]')) {
      node.checked = false;
      node.removeAttribute('checked');
    }

    if (node.matches?.('[aria-checked]')) node.setAttribute('aria-checked', 'false');
    if (node.matches?.('[aria-selected]')) node.setAttribute('aria-selected', 'false');
    if (node.matches?.('[aria-pressed]')) node.setAttribute('aria-pressed', 'false');

    [
      'checked',
      'selected',
      'active',
      'is-checked',
      'is-selected',
      'is-active',
      'selected-option',
      'checked-option',
      'multi-selected'
    ].forEach((className) => node.classList?.remove(className));

    if (node.dataset) {
      if ('checked' in node.dataset) node.dataset.checked = 'false';
      if ('selected' in node.dataset) node.dataset.selected = 'false';
      if ('active' in node.dataset) node.dataset.active = 'false';
    }
  }

  function resetSummaryText(select, root) {
    if (!select || !root) return;

    const label = root.querySelector(`label[for="${select.id}"]`)?.textContent?.trim()
      || select.getAttribute('aria-label')
      || 'filter';

    const cleanLabel = label.replace(/\s*clear\s*$/i, '').trim();

    const candidates = root.querySelectorAll([
      '[data-selected-text]',
      '[data-summary]',
      '[data-multiselect-label]',
      '.selected-summary',
      '.selection-summary',
      '.multi-select-summary',
      '.multiselect-summary',
      '.dropdown-summary',
      '.checkbox-summary',
      '.dropdown-label',
      '.multi-select-label'
    ].join(','));

    candidates.forEach((candidate) => {
      if (!isElement(candidate)) return;
      if (candidate.matches('select, option, input, textarea')) return;
      candidate.textContent = cleanLabel ? `All ${cleanLabel.toLowerCase()}` : 'All';
    });
  }

  function clearVisualCheckboxLayerForSelect(select) {
    if (!select) return;

    const box = select.closest('.filter-box') || select.closest('.filters-cluster') || select.parentElement;
    if (!box) return;

    box.querySelectorAll([
      'input[type="checkbox"]',
      'input[type="radio"]',
      '[role="checkbox"]',
      '[role="option"]',
      '[aria-checked]',
      '[aria-selected]',
      '[aria-pressed]',
      '.checked',
      '.selected',
      '.active',
      '.is-checked',
      '.is-selected',
      '.is-active',
      '.selected-option',
      '.checked-option',
      '.multi-selected'
    ].join(',')).forEach(clearCheckboxLikeNode);

    resetSummaryText(select, box);
  }

  function closeOpenDropdowns() {
    document.querySelectorAll([
      '[aria-expanded="true"]',
      '.open',
      '.is-open',
      '.dropdown-open',
      '.menu-open'
    ].join(',')).forEach((node) => {
      if (!isElement(node)) return;
      if (node.matches('[aria-expanded]')) node.setAttribute('aria-expanded', 'false');
      ['open', 'is-open', 'dropdown-open', 'menu-open'].forEach((className) => node.classList.remove(className));
    });
  }

  function clearNativeFilters() {
    MULTI_SELECT_IDS.forEach((id) => {
      const select = byId(id);
      if (!select) return;
      clearNativeMultiSelect(select);
      clearVisualCheckboxLayerForSelect(select);
    });

    SINGLE_VALUE_IDS.forEach((id) => {
      const el = byId(id);
      if (!el) return;
      clearNativeValueControl(el, '');
    });

    const activeScope = byId('activeScopeFilter');
    if (activeScope) clearNativeValueControl(activeScope, 'active');

    try {
      if (typeof state === 'object' && state) {
        state.currentView = 'all';
        state.inlineAiringEditorId = null;
        state.filteredCacheKey = '';
        state.filteredProgramIds = [];
        state.poolCacheKey = '';
        state.poolProgramIds = [];
      }
    } catch (_error) {}
  }

  function notifyFiltersCleared() {
    MULTI_SELECT_IDS.forEach((id) => dispatchChange(byId(id)));
    SINGLE_VALUE_IDS.forEach((id) => {
      const el = byId(id);
      if (!el) return;
      dispatchInput(el);
      dispatchChange(el);
    });

    const activeScope = byId('activeScopeFilter');
    if (activeScope) dispatchChange(activeScope);
  }

  function refreshUiAfterClear() {
    try {
      if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
      if (typeof syncQuickViewState === 'function') syncQuickViewState();
      if (typeof renderFilters === 'function') renderFilters();
      if (typeof renderTable === 'function') renderTable();
      if (typeof renderStats === 'function') renderStats();
      if (typeof snapshotViewState === 'function' && typeof state === 'object') {
        state.lastAppliedViewState = snapshotViewState();
      }
      if (typeof syncUndoButton === 'function') syncUndoButton();
    } catch (error) {
      console.warn('Clear All reset sync UI refresh issue:', error);
    }
  }

  function forceClearAllFilters(options = {}) {
    clearNativeFilters();
    closeOpenDropdowns();

    [0, 40, 140].forEach((delay) => {
      window.setTimeout(() => {
        clearNativeFilters();
        refreshUiAfterClear();
        if (options.notify !== false) setStatusSafe('All filters cleared.');
      }, delay);
    });
  }

  function patchResetFilters() {
    if (window.__wnmuClearAllResetSyncPatch === '1') return;
    if (typeof resetFilters !== 'function') return;

    window.__wnmuClearAllResetSyncPatch = '1';
    const originalResetFilters = resetFilters;

    resetFilters = function clearAllResetSynced(...args) {
      const result = originalResetFilters.apply(this, args);
      forceClearAllFilters({ notify: true });
      return result;
    };
  }

  function bindResetButton() {
    const button = byId(RESET_BUTTON_ID);
    if (!button || button.dataset.clearAllResetSyncBound === '1') return;

    button.dataset.clearAllResetSyncBound = '1';

    button.addEventListener('click', () => {
      window.setTimeout(() => forceClearAllFilters({ notify: true }), 0);
    });
  }

  function patchRenderFilters() {
    if (window.__wnmuClearAllRenderFiltersPatch === '1') return;
    if (typeof renderFilters !== 'function') return;

    window.__wnmuClearAllRenderFiltersPatch = '1';
    const originalRenderFilters = renderFilters;

    renderFilters = function clearAllRenderFiltersPatched(...args) {
      const result = originalRenderFilters.apply(this, args);
      bindResetButton();
      return result;
    };
  }

  function install() {
    patchResetFilters();
    patchRenderFilters();
    bindResetButton();

    [100, 300, 800, 1600].forEach((delay) => {
      window.setTimeout(() => {
        patchResetFilters();
        patchRenderFilters();
        bindResetButton();
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUClearAllResetSync = {
    version: VERSION,
    forceClearAllFilters
  };
})();
