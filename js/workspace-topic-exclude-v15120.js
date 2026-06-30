// WNMU Programming Workspace Test — Topic include/exclude filter
// v1.5.120
// Split-window test only. Adds a right-side Exclude checkbox to Topic and Secondary Topic dropdown rows.
// UI-only filter layer; does not write to Supabase or modify program records.

(function () {
  'use strict';

  const VERSION = 'v1.5.120';
  const TOPIC_SELECT_ID = 'topicFilter';
  const SECONDARY_SELECT_ID = 'secondaryTopicFilter';

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

  function token(value) {
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

  function getSelect(kind) {
    return byId(kind === 'secondary' ? SECONDARY_SELECT_ID : TOPIC_SELECT_ID);
  }

  function getDropdown(selectId) {
    return document.querySelector(`.workspace-multi-dropdown[data-select-id="${cssEscape(selectId)}"]`);
  }

  function getSet(kind) {
    return kind === 'secondary' ? topicExcludeState.secondary : topicExcludeState.topic;
  }

  function sortedLabels(set) {
    return Array.from(set || []).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  function invalidateFilteredCache() {
    try {
      if (typeof state === 'object' && state) {
        state.filteredCacheKey = '';
        state.filteredProgramIds = [];
      }
    } catch (_error) {}
  }

  function selectedValuesFromSelect(select) {
    return new Set(Array.from(select?.selectedOptions || []).map((option) => normalize(option.value)).filter(Boolean));
  }

  function setOptionSelected(select, value, selected) {
    if (!select) return;
    const wanted = normalize(value);
    Array.from(select.options || []).forEach((option) => {
      if (normalize(option.value) === wanted) option.selected = Boolean(selected);
    });
  }

  function dispatchChange(el) {
    if (!el) return;
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_error) {}
  }

  function refreshResults() {
    invalidateFilteredCache();
    try { if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow(); } catch (_error) {}
    try { if (typeof renderTable === 'function') renderTable(); } catch (_error) {}
    try { if (typeof renderStats === 'function') renderStats(); } catch (_error) {}
    window.setTimeout(updateExcludeSummary, 0);
    window.setTimeout(updateExcludeSummary, 80);
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
      if ((!topicSet || !topicSet.size) && (!secondarySet || !secondarySet.size)) return baseRows;

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
      window.setTimeout(() => {
        syncExcludeInputs();
        updateExcludeSummary();
      }, 0);
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

      body.workspace-test-page #controlsPanel .workspace-multi-row.workspace-topic-excluded::after {
        content: 'exclude';
        display: none;
      }

      body.workspace-test-page #workspaceActiveFilters .workspace-exclude-summary {
        color: #92400e !important;
        font-weight: 800 !important;
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

  function setExclude(kind, value, excluded) {
    const clean = normalize(value);
    if (!clean) return;

    const set = getSet(kind);
    const select = getSelect(kind);

    if (excluded) {
      set.add(clean);
      setOptionSelected(select, clean, false);
    } else {
      set.delete(clean);
    }

    syncExcludeInputs();
    dispatchChange(select);
    refreshResults();
  }

  function onExcludeChange(kind, input) {
    const value = input?.dataset?.workspaceExcludeValue || '';
    setExclude(kind, value, Boolean(input.checked));
  }

  function enhanceDropdown(kind) {
    const selectId = kind === 'secondary' ? SECONDARY_SELECT_ID : TOPIC_SELECT_ID;
    const select = byId(selectId);
    const dropdown = getDropdown(selectId);
    if (!select || !dropdown) return;

    ensureLegend(dropdown);

    const selected = selectedValuesFromSelect(select);
    const excludeSet = getSet(kind);

    dropdown.querySelectorAll('.workspace-multi-row').forEach((row) => {
      const includeInput = row.querySelector('input[type="checkbox"][data-workspace-multi-value]');
      if (!includeInput) return;

      const value = normalize(includeInput.dataset.workspaceMultiValue || includeInput.value || '');
      if (!value) return;

      row.classList.add('workspace-topic-exclude-row');
      row.classList.toggle('workspace-topic-excluded', excludeSet.has(value));

      let excludeInput = row.querySelector('input.workspace-topic-exclude-check');
      if (!excludeInput) {
        excludeInput = document.createElement('input');
        excludeInput.type = 'checkbox';
        excludeInput.className = 'workspace-topic-exclude-check';
        excludeInput.title = `Exclude ${value}`;
        excludeInput.setAttribute('aria-label', `Exclude ${value}`);
        excludeInput.dataset.workspaceExcludeKind = kind;
        excludeInput.dataset.workspaceExcludeValue = value;
        excludeInput.addEventListener('click', (event) => event.stopPropagation());
        excludeInput.addEventListener('change', (event) => {
          event.stopPropagation();
          onExcludeChange(kind, excludeInput);
        });
        row.appendChild(excludeInput);
      } else {
        excludeInput.dataset.workspaceExcludeKind = kind;
        excludeInput.dataset.workspaceExcludeValue = value;
        excludeInput.title = `Exclude ${value}`;
        excludeInput.setAttribute('aria-label', `Exclude ${value}`);
      }

      excludeInput.checked = excludeSet.has(value);

      if (includeInput.dataset.workspaceExcludeIncludeBound !== '1') {
        includeInput.dataset.workspaceExcludeIncludeBound = '1';
        includeInput.addEventListener('change', () => {
          const includeValue = normalize(includeInput.dataset.workspaceMultiValue || includeInput.value || '');
          if (includeInput.checked && includeValue) {
            getSet(kind).delete(includeValue);
            window.setTimeout(() => {
              syncExcludeInputs();
              refreshResults();
            }, 0);
          }
        });
      }

      if (selected.has(value) && excludeSet.has(value)) {
        excludeSet.delete(value);
        excludeInput.checked = false;
        row.classList.remove('workspace-topic-excluded');
      }
    });
  }

  function syncExcludeInputs() {
    ['topic', 'secondary'].forEach((kind) => {
      const selectId = kind === 'secondary' ? SECONDARY_SELECT_ID : TOPIC_SELECT_ID;
      const dropdown = getDropdown(selectId);
      if (!dropdown) return;

      const excludeSet = getSet(kind);
      dropdown.querySelectorAll('input.workspace-topic-exclude-check').forEach((input) => {
        const value = normalize(input.dataset.workspaceExcludeValue || '');
        input.checked = excludeSet.has(value);
        input.closest('.workspace-multi-row')?.classList.toggle('workspace-topic-excluded', input.checked);
      });
    });
  }

  function clearExclusions(kind) {
    getSet(kind).clear();
    syncExcludeInputs();
    refreshResults();
  }

  function bindClearAndSelectAllButtons() {
    const buttonMap = [
      ['clearTopicFilter', 'topic'],
      ['selectAllTopicFilter', 'topic'],
      ['clearSecondaryTopicFilter', 'secondary'],
      ['selectAllSecondaryTopicFilter', 'secondary']
    ];

    buttonMap.forEach(([id, kind]) => {
      const button = byId(id);
      if (!button || button.dataset.workspaceTopicExcludeBound === '1') return;
      button.dataset.workspaceTopicExcludeBound = '1';
      button.addEventListener('click', () => {
        window.setTimeout(() => clearExclusions(kind), 0);
      });
    });

    const reset = byId('resetFiltersBtn');
    if (reset && reset.dataset.workspaceTopicExcludeResetBound !== '1') {
      reset.dataset.workspaceTopicExcludeResetBound = '1';
      reset.addEventListener('click', () => {
        topicExcludeState.topic.clear();
        topicExcludeState.secondary.clear();
        window.setTimeout(() => {
          syncExcludeInputs();
          refreshResults();
        }, 0);
      });
    }
  }

  function updateExcludeSummary() {
    const target = byId('workspaceActiveFilters');
    if (!target) return;

    const topicLabels = sortedLabels(getSet('topic'));
    const secondaryLabels = sortedLabels(getSet('secondary'));
    const parts = [];

    if (topicLabels.length) {
      const text = topicLabels.slice(0, 3).join(', ') + (topicLabels.length > 3 ? ` +${topicLabels.length - 3}` : '');
      parts.push(`Exclude topics: ${text}`);
    }

    if (secondaryLabels.length) {
      const text = secondaryLabels.slice(0, 3).join(', ') + (secondaryLabels.length > 3 ? ` +${secondaryLabels.length - 3}` : '');
      parts.push(`Exclude secondary: ${text}`);
    }

    const current = String(target.textContent || '').replace(/\s·\sExclude topics:.*$/i, '').replace(/\s·\sExclude secondary:.*$/i, '');
    if (!parts.length) {
      if (/Exclude topics:|Exclude secondary:/i.test(target.textContent || '')) target.textContent = current || 'No filters in use';
      return;
    }

    const base = current && current !== 'No filters in use' ? current : '';
    target.textContent = [base, ...parts].filter(Boolean).join(' · ');
    target.title = target.textContent;
  }

  function enhanceAll() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    ensureStyles();
    patchActivePrograms();
    patchResetFilters();
    bindClearAndSelectAllButtons();
    enhanceDropdown('topic');
    enhanceDropdown('secondary');
    syncExcludeInputs();
    updateExcludeSummary();
  }

  function installObservers() {
    if (window.__wnmuWorkspaceTopicExcludeObservers === '1') return;
    window.__wnmuWorkspaceTopicExcludeObservers = '1';

    const rerun = () => window.setTimeout(enhanceAll, 0);

    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('#controlsPanel')) {
        window.setTimeout(enhanceAll, 0);
        window.setTimeout(updateExcludeSummary, 60);
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target?.closest?.('#controlsPanel')) {
        window.setTimeout(enhanceAll, 0);
        window.setTimeout(updateExcludeSummary, 60);
      }
    }, true);

    const observer = new MutationObserver(rerun);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function install() {
    enhanceAll();
    installObservers();
    [80, 220, 500, 1000, 1800, 3200].forEach((delay) => window.setTimeout(enhanceAll, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUWorkspaceTopicExclude = {
    version: VERSION,
    topicExcludeState,
    clearExclusions,
    refreshResults
  };
})();
