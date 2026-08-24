// WNMU Programming Workspace — Topic include/exclude filter
// v1.5.125
// Behavior-only module. It augments Topic and Secondary Topic dropdown rows,
// filters excluded topics, keeps Secondary Topic choices dependent on selected
// Main Topics, and exposes summary data to the workspace UI owner.
// It does not position controls, redraw the outer filter layout, observe the
// entire document, or write program records.

(function () {
  'use strict';

  const VERSION = 'v1.5.125';
  const TOPIC_SELECT_ID = 'topicFilter';
  const SECONDARY_SELECT_ID = 'secondaryTopicFilter';
  const RENDER_EVENT = 'wnmu:workspace-multiselect-rendered';

  const stateKey = '__wnmuWorkspaceTopicExcludeState';
  const topicExcludeState = window[stateKey] || {
    topic: new Set(),
    secondary: new Set()
  };
  window[stateKey] = topicExcludeState;

  function normalize(value) {
    try {
      if (typeof normalizeText === 'function') return normalizeText(value);
    } catch (_error) {}
    return String(value ?? '').trim();
  }

  function normalizeKey(value) {
    return normalize(value).toLowerCase();
  }

  function cssEscape(value) {
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    } catch (_error) {}
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function kindForSelectId(selectId) {
    if (selectId === TOPIC_SELECT_ID) return 'topic';
    if (selectId === SECONDARY_SELECT_ID) return 'secondary';
    return '';
  }

  function selectIdForKind(kind) {
    return kind === 'secondary' ? SECONDARY_SELECT_ID : TOPIC_SELECT_ID;
  }

  function getSelect(kind) {
    return byId(selectIdForKind(kind));
  }

  function getDropdown(selectId) {
    return document.querySelector(`.workspace-multi-dropdown[data-select-id="${cssEscape(selectId)}"]`);
  }

  function getSet(kind) {
    return kind === 'secondary' ? topicExcludeState.secondary : topicExcludeState.topic;
  }

  function selectedValuesFromSelect(select) {
    return new Set(Array.from(select?.selectedOptions || [])
      .map((option) => normalize(option.value))
      .filter(Boolean));
  }

  function setOptionSelected(select, value, selected) {
    if (!select) return;
    const wanted = normalize(value);
    Array.from(select.options || []).forEach((option) => {
      if (normalize(option.value) === wanted) option.selected = Boolean(selected);
    });
  }

  function selectedMainTopicKeys() {
    return new Set(Array.from(getSelect('topic')?.selectedOptions || [])
      .map((option) => normalizeKey(option.value))
      .filter(Boolean));
  }

  function allowedSecondaryTopicKeys() {
    const selectedTopics = selectedMainTopicKeys();
    if (!selectedTopics.size) return null;

    const allowed = new Set();
    const programs = Array.isArray(window.state?.programs)
      ? window.state.programs
      : (typeof state === 'object' && Array.isArray(state?.programs) ? state.programs : []);

    programs.forEach((program) => {
      let derived = null;
      try {
        if (typeof getProgramDerived === 'function') derived = getProgramDerived(program);
      } catch (_error) {}

      const topicValues = derived?.topicValues || String(program?.topic || '')
        .split(',')
        .map(normalize)
        .filter(Boolean);
      if (!topicValues.some((topic) => selectedTopics.has(normalizeKey(topic)))) return;

      const secondaryValues = derived?.secondaryTopicValues || String(program?.secondary_topic || '')
        .split(',')
        .map(normalize)
        .filter(Boolean);
      secondaryValues.forEach((value) => allowed.add(normalizeKey(value)));
    });

    return allowed;
  }

  function syncDependentSecondaryFacet() {
    const select = getSelect('secondary');
    const allowed = allowedSecondaryTopicKeys();
    if (!select) return;

    let selectionChanged = false;
    if (allowed) {
      Array.from(select.options || []).forEach((option) => {
        if (!option.selected) return;
        if (allowed.has(normalizeKey(option.value))) return;
        option.selected = false;
        selectionChanged = true;
      });

      const exclusionSet = getSet('secondary');
      Array.from(exclusionSet).forEach((value) => {
        if (!allowed.has(normalizeKey(value))) exclusionSet.delete(value);
      });
    }

    enhanceDropdown('secondary');
    invalidateFilteredCache();
    requestSummaryRefresh();

    return selectionChanged;
  }

  function invalidateFilteredCache() {
    try {
      if (typeof state === 'object' && state) {
        state.filteredCacheKey = '';
        state.filteredProgramIds = [];
      }
    } catch (_error) {}
  }

  function dispatchChange(el) {
    if (!el) return;
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_error) {}
  }

  function requestSummaryRefresh() {
    try { window.WNMUWorkspaceFilterUi?.updateSummary?.(); } catch (_error) {}
  }

  function refreshResults() {
    invalidateFilteredCache();
    try { if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow(); } catch (_error) {}
    try { if (typeof renderTable === 'function') renderTable(); } catch (_error) {}
    try { if (typeof renderStats === 'function') renderStats(); } catch (_error) {}
    requestSummaryRefresh();
  }

  function matchesAnyExclusion(values, exclusionSet) {
    if (!exclusionSet || !exclusionSet.size) return false;
    return (values || []).some((value) => exclusionSet.has(normalize(value)));
  }

  function patchActivePrograms() {
    if (window.__wnmuWorkspaceTopicExcludeActiveProgramsPatched === '1') return;
    if (typeof activePrograms !== 'function') return;

    window.__wnmuWorkspaceTopicExcludeActiveProgramsPatched = '1';
    const originalActivePrograms = activePrograms;

    activePrograms = function workspaceTopicExcludeActivePrograms(...args) {
      const baseRows = originalActivePrograms.apply(this, args);
      const topicSet = getSet('topic');
      const secondarySet = getSet('secondary');
      if (!topicSet.size && !secondarySet.size) return baseRows;

      return (baseRows || []).filter((program) => {
        let derived = null;
        try {
          if (typeof getProgramDerived === 'function') derived = getProgramDerived(program);
        } catch (_error) {}

        const topicValues = derived?.topicValues || [normalize(program?.topic)].filter(Boolean);
        const secondaryValues = derived?.secondaryTopicValues || String(program?.secondary_topic || '')
          .split(',')
          .map(normalize)
          .filter(Boolean);

        if (matchesAnyExclusion(topicValues, topicSet)) return false;
        if (matchesAnyExclusion(secondaryValues, secondarySet)) return false;
        return true;
      });
    };
  }

  function patchResetFilters() {
    if (window.__wnmuWorkspaceTopicExcludeResetPatched === '1') return;
    if (typeof resetFilters !== 'function') return;

    window.__wnmuWorkspaceTopicExcludeResetPatched = '1';
    const originalResetFilters = resetFilters;

    resetFilters = function workspaceTopicExcludeResetFilters(...args) {
      topicExcludeState.topic.clear();
      topicExcludeState.secondary.clear();
      const result = originalResetFilters.apply(this, args);
      syncExcludeInputs();
      requestSummaryRefresh();
      return result;
    };
  }

  function ensureStyles() {
    if (byId('workspaceTopicExcludeStyles')) return;

    const style = document.createElement('style');
    style.id = 'workspaceTopicExcludeStyles';
    style.textContent = `
      body.workspace-test-page #controlsPanel .workspace-multi-panel {
        min-width: 240px !important;
      }

      body.workspace-test-page #controlsPanel .workspace-topic-exclude-legend {
        display: grid !important;
        grid-template-columns: 34px minmax(0, 1fr) 44px !important;
        gap: 6px !important;
        align-items: center !important;
        margin: 0 0 5px 0 !important;
        padding: 0 1px 4px 1px !important;
        border-bottom: 1px solid rgba(12, 78, 97, .12) !important;
        color: #58727d !important;
        font-size: .61rem !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: .02em !important;
      }

      body.workspace-test-page #controlsPanel .workspace-multi-row.workspace-topic-exclude-row {
        grid-template-columns: 14px minmax(0, 1fr) 34px !important;
      }

      body.workspace-test-page #controlsPanel .workspace-topic-exclude-check {
        justify-self: end !important;
        width: 14px !important;
        height: 14px !important;
        min-height: 14px !important;
        margin: 1px 3px 0 0 !important;
        accent-color: #b45309;
      }

      body.workspace-test-page #controlsPanel .workspace-multi-row.workspace-topic-excluded {
        background: rgba(180, 83, 9, .10) !important;
      }

      body.workspace-test-page #controlsPanel .workspace-multi-row.workspace-topic-excluded .workspace-multi-text {
        color: #92400e !important;
        font-weight: 800 !important;
        text-decoration: line-through;
        text-decoration-thickness: 1px;
        text-decoration-color: rgba(146, 64, 14, .45);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLegend(dropdown) {
    if (!dropdown) return;
    const panel = dropdown.querySelector('.workspace-multi-panel');
    const list = dropdown.querySelector('.workspace-multi-list');
    if (!panel || !list) return;

    let legend = panel.querySelector('.workspace-topic-exclude-legend');
    if (!legend) {
      legend = document.createElement('div');
      legend.className = 'workspace-topic-exclude-legend';
      legend.innerHTML = '<span>In</span><span>Topic</span><span>Out</span>';
      panel.insertBefore(legend, list);
    }
  }

  function syncExcludeInputs() {
    ['topic', 'secondary'].forEach((kind) => {
      const dropdown = getDropdown(selectIdForKind(kind));
      if (!dropdown) return;
      const excludeSet = getSet(kind);
      dropdown.querySelectorAll('input.workspace-topic-exclude-check').forEach((input) => {
        const value = normalize(input.dataset.workspaceExcludeValue || '');
        const excluded = excludeSet.has(value);
        input.checked = excluded;
        input.closest('.workspace-multi-row')?.classList.toggle('workspace-topic-excluded', excluded);
      });
    });
  }

  function setExclude(kind, value, excluded) {
    const clean = normalize(value);
    if (!clean) return;

    const exclusionSet = getSet(kind);
    const select = getSelect(kind);
    if (excluded) {
      exclusionSet.add(clean);
      setOptionSelected(select, clean, false);
    } else {
      exclusionSet.delete(clean);
    }

    invalidateFilteredCache();
    syncExcludeInputs();
    // Standard filter change handling owns the table redraw.
    dispatchChange(select);
    requestSummaryRefresh();
  }

  function enhanceDropdown(kind) {
    const selectId = selectIdForKind(kind);
    const select = byId(selectId);
    const dropdown = getDropdown(selectId);
    if (!select || !dropdown) return;

    ensureLegend(dropdown);
    const selected = selectedValuesFromSelect(select);
    const exclusionSet = getSet(kind);
    const allowedSecondary = kind === 'secondary' ? allowedSecondaryTopicKeys() : null;

    dropdown.querySelectorAll('.workspace-multi-row').forEach((row) => {
      const includeInput = row.querySelector('input[type="checkbox"][data-workspace-multi-value]');
      if (!includeInput) return;
      const value = normalize(includeInput.dataset.workspaceMultiValue || includeInput.value || '');
      if (!value) return;

      const available = !allowedSecondary || allowedSecondary.has(normalizeKey(value));
      row.hidden = !available;
      if (!available) {
        setOptionSelected(select, value, false);
        exclusionSet.delete(value);
      }

      row.classList.add('workspace-topic-exclude-row');
      if (selected.has(value) && exclusionSet.has(value)) exclusionSet.delete(value);

      let excludeInput = row.querySelector('input.workspace-topic-exclude-check');
      if (!excludeInput) {
        excludeInput = document.createElement('input');
        excludeInput.type = 'checkbox';
        excludeInput.className = 'workspace-topic-exclude-check';
        excludeInput.addEventListener('click', (event) => event.stopPropagation());
        excludeInput.addEventListener('change', (event) => {
          event.stopPropagation();
          setExclude(kind, excludeInput.dataset.workspaceExcludeValue || '', Boolean(excludeInput.checked));
        });
        row.appendChild(excludeInput);
      }

      excludeInput.dataset.workspaceExcludeKind = kind;
      excludeInput.dataset.workspaceExcludeValue = value;
      excludeInput.title = `Exclude ${value}`;
      excludeInput.setAttribute('aria-label', `Exclude ${value}`);

      if (includeInput.dataset.workspaceExcludeIncludeBound !== '1') {
        includeInput.dataset.workspaceExcludeIncludeBound = '1';
        // Capture phase removes an exclusion before the workspace's normal
        // include-checkbox handler dispatches the select change.
        includeInput.addEventListener('change', () => {
          if (!includeInput.checked) return;
          const includeValue = normalize(includeInput.dataset.workspaceMultiValue || includeInput.value || '');
          if (!includeValue) return;
          getSet(kind).delete(includeValue);
          invalidateFilteredCache();
          syncExcludeInputs();
          requestSummaryRefresh();
        }, true);
      }
    });

    syncExcludeInputs();
  }

  function enhanceSelectId(selectId) {
    const kind = kindForSelectId(selectId);
    if (kind) enhanceDropdown(kind);
  }

  function clearExclusions(kind, options = {}) {
    const exclusionSet = getSet(kind);
    if (!exclusionSet.size) return;
    exclusionSet.clear();
    invalidateFilteredCache();
    syncExcludeInputs();
    if (options.refresh !== false) refreshResults();
    else requestSummaryRefresh();
  }

  function bindFilterButtons() {
    const map = [
      ['clearTopicFilter', 'topic'],
      ['selectAllTopicFilter', 'topic'],
      ['clearSecondaryTopicFilter', 'secondary'],
      ['selectAllSecondaryTopicFilter', 'secondary']
    ];

    map.forEach(([id, kind]) => {
      const button = byId(id);
      if (!button || button.dataset.workspaceTopicExcludeBound === '1') return;
      button.dataset.workspaceTopicExcludeBound = '1';
      button.addEventListener('click', () => {
        // The regular button handler owns include selection and table refresh.
        // This module only clears its own exclusion state first.
        clearExclusions(kind, { refresh: false });
      }, true);
    });
  }

  function bindDependentSecondaryFacet() {
    const topicSelect = getSelect('topic');
    if (!topicSelect || topicSelect.dataset.workspaceDependentSecondaryBound === '1') return;
    topicSelect.dataset.workspaceDependentSecondaryBound = '1';
    topicSelect.addEventListener('change', () => {
      // Capture phase runs before the normal filter-change handler so an old,
      // now-impossible Secondary Topic cannot suppress valid results.
      syncDependentSecondaryFacet();
    }, true);
  }

  function summaryParts() {
    const parts = [];
    const topicLabels = Array.from(getSet('topic')).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const secondaryLabels = Array.from(getSet('secondary')).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (topicLabels.length) {
      parts.push(`Exclude topics: ${topicLabels.slice(0, 3).join(', ')}${topicLabels.length > 3 ? ` +${topicLabels.length - 3}` : ''}`);
    }
    if (secondaryLabels.length) {
      parts.push(`Exclude secondary: ${secondaryLabels.slice(0, 3).join(', ')}${secondaryLabels.length > 3 ? ` +${secondaryLabels.length - 3}` : ''}`);
    }
    return parts;
  }

  function install() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    ensureStyles();
    patchActivePrograms();
    patchResetFilters();
    bindFilterButtons();
    bindDependentSecondaryFacet();
    enhanceDropdown('topic');
    enhanceDropdown('secondary');
    syncDependentSecondaryFacet();
    requestSummaryRefresh();

    if (document.documentElement.dataset.workspaceTopicExcludeEventBound !== '1') {
      document.documentElement.dataset.workspaceTopicExcludeEventBound = '1';
      document.addEventListener(RENDER_EVENT, (event) => enhanceSelectId(event.detail?.selectId || ''));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.WNMUWorkspaceTopicExclude = {
    version: VERSION,
    topicExcludeState,
    clearExclusions,
    enhanceSelectId,
    refreshResults,
    summaryParts,
    syncDependentSecondaryFacet
  };
})();
