// WNMU Programming Library — contextual counts for existing filter choices.
// Read-only: does not change filter selections, program records or the database.
(() => {
  'use strict';
  if (!window.WNMU_WORKSPACE_TEST || window.__wnmuFacetCountsInstalled) return;
  window.__wnmuFacetCountsInstalled = true;

  const FACETS = [
    { id: 'topicFilter', kind: 'topic' },
    { id: 'secondaryTopicFilter', kind: 'secondary' },
    { id: 'lengthFilter', kind: 'length' },
    { id: 'codeFilter', kind: 'code' },
    { id: 'distributorFilter', kind: 'distributor' },
    { id: 'programTypeFilter', kind: 'type' },
    { id: 'statusFilter', kind: 'status' },
    { id: 'ratingFilter', kind: 'rating' }
  ];
  const SCOPE_ID = 'workspaceActiveScopeFilter';
  const FACET_IDS = new Set([...FACETS.map((facet) => facet.id), SCOPE_ID]);
  const MULTI_IDS = new Set(['topicFilter', 'secondaryTopicFilter', 'lengthFilter', 'codeFilter']);
  let updateTimer = null;
  let lastCounts = null;

  const byId = (id) => document.getElementById(id);
  const text = (value) => String(value ?? '').trim();
  const selected = (id) => new Set(Array.from(byId(id)?.selectedOptions || [])
    .map((option) => option.value).filter(Boolean));
  const current = (id) => byId(id)?.value || '';
  const exclusionSets = () => window.__wnmuWorkspaceTopicExcludeState || {};

  function ratingMatches(program, value) {
    if (!value) return true;
    const rating = getProgramRating(program);
    if (value === 'unrated') return rating == null;
    if (value === '4plus') return rating != null && rating >= 4;
    if (value === '3plus') return rating != null && rating >= 3;
    const exact = normalizeRating(value);
    return exact != null && rating === exact;
  }

  function episodeMatches(program, min, max) {
    if (min == null && max == null) return true;
    if (!isSeriesProgram(program)) return false;
    const count = extractEpisodeCount(program);
    if (!Number.isFinite(count) || count <= 0) return false;
    return (min == null || count >= min) && (max == null || count <= max);
  }

  function episodeBound(id) {
    const value = text(byId(id)?.value);
    const n = Number(value);
    return value && Number.isFinite(n) && Math.floor(n) > 0 ? Math.floor(n) : null;
  }

  function context() {
    return {
      search: effectiveProgramSearchValue(),
      searchField: current('searchFieldSelect'),
      codes: new Set([...selected('codeFilter')].map((v) => text(v).toUpperCase())),
      topics: selected('topicFilter'),
      secondary: selected('secondaryTopicFilter'),
      lengths: selected('lengthFilter'),
      distributor: current('distributorFilter'),
      type: current('programTypeFilter'),
      status: current('statusFilter'),
      rating: current('ratingFilter'),
      rightsBegin: current('rightsWindowStartFilter'),
      rightsEnd: current('rightsWindowEndFilter'),
      episodeMin: episodeBound('episodeMinFilter'),
      episodeMax: episodeBound('episodeMaxFilter'),
      excludedTopic: exclusionSets().topic || new Set(),
      excludedSecondary: exclusionSets().secondary || new Set()
    };
  }

  function globalMatch(program, derived, c) {
    if (c.search) {
      const haystack = c.searchField
        ? (derived.searchByField[c.searchField] ?? normalizeLower(program?.[c.searchField]))
        : derived.searchAll;
      if (!haystack.includes(c.search)) return false;
    }
    if ((c.rightsBegin || c.rightsEnd) &&
        !programRightsCoverDateRange(program, c.rightsBegin, c.rightsEnd)) return false;
    return episodeMatches(program, c.episodeMin, c.episodeMax);
  }

  function facetMatches(program, derived, c) {
    return [
      (!c.topics.size || derived.topicValues.some((value) => c.topics.has(value))) &&
        !derived.topicValues.some((value) => c.excludedTopic.has(value)),
      (!c.secondary.size || derived.secondaryTopicValues.some((value) => c.secondary.has(value))) &&
        !derived.secondaryTopicValues.some((value) => c.excludedSecondary.has(value)),
      !c.lengths.size || c.lengths.has(derived.lengthValue),
      !c.codes.size || c.codes.has(derived.legacyCode),
      !c.distributor || program.distributor === c.distributor,
      !c.type || program.program_type === c.type,
      !c.status || c.status === 'expired' || matchesView(program, c.status),
      ratingMatches(program, c.rating)
    ];
  }

  function bump(map, value) {
    if (!value) return;
    map.set(value, (map.get(value) || 0) + 1);
  }

  function createCounts() {
    const started = performance.now();
    const counts = Object.fromEntries([...FACET_IDS].map((id) => [id, new Map()]));
    const totals = Object.fromEntries([...FACET_IDS].map((id) => [id, 0]));
    if (!Array.isArray(state?.programs)) return { counts, totals, duration: 0 };

    const c = context();
    let baseMatches = 0;
    // This pool includes the actual selected quick view / in-rights scope.
    // Only the current dropdown's own criterion is ignored for its counts.
    const pool = programsInCurrentViewPool();
    for (const program of pool) {
      const derived = getProgramDerived(program);
      if (!globalMatch(program, derived, c)) continue;
      const passes = facetMatches(program, derived, c);
      let failureIndex = -1;
      let failures = 0;
      for (let i = 0; i < passes.length; i += 1) {
        if (!passes[i]) { failures += 1; failureIndex = i; }
        if (failures > 1) break;
      }
      if (failures > 1) continue;
      if (!failures) baseMatches += 1;

      // At most one active facet can fail for a record to count toward
      // a candidate from any one facet. One pass covers all eight facets.
      for (let i = 0; i < FACETS.length; i += 1) {
        if (failures === 1 && failureIndex !== i) continue;
        const id = FACETS[i].id;
        totals[id] += 1;
        const map = counts[id];
        switch (FACETS[i].kind) {
          case 'topic':
            new Set(derived.topicValues).forEach((value) => bump(map, value));
            break;
          case 'secondary':
            new Set(derived.secondaryTopicValues).forEach((value) => bump(map, value));
            break;
          case 'length': bump(map, derived.lengthValue); break;
          case 'code': bump(map, derived.legacyCode); break;
          case 'distributor': bump(map, derived.distributor); break;
          case 'type': bump(map, derived.programType); break;
          case 'status':
            Array.from(byId(id)?.options || []).forEach((option) => {
              if (option.value && matchesView(program, option.value)) bump(map, option.value);
            });
            break;
          case 'rating':
            Array.from(byId(id)?.options || []).forEach((option) => {
              if (option.value && ratingMatches(program, option.value)) bump(map, option.value);
            });
            break;
        }
      }
    }

    // Scope replaces the current quick view when selected, so its numbers
    // are calculated across all records with the other filters still applied.
    const scope = counts[SCOPE_ID];
    for (const program of state.programs) {
      const derived = getProgramDerived(program);
      if (!globalMatch(program, derived, c) ||
          facetMatches(program, derived, c).some((passed) => !passed)) continue;
      totals[SCOPE_ID] += 1;
      bump(scope, 'all');
      if (matchesView(program, 'active')) bump(scope, 'active');
      if (matchesView(program, 'archived')) bump(scope, 'archived');
    }

    // If another filter extension changes the actual result set later, don't
    // display misleading counts until this module is updated to match it.
    const actualMatches = activePrograms().length;
    if (baseMatches !== actualMatches) {
      console.warn('Filter counts withheld: matching rules differ from the program list.',
        { baseMatches, actualMatches });
      return null;
    }
    const duration = performance.now() - started;
    if (duration > 100) console.info('WNMU filter count calculation:', duration.toFixed(1), 'ms');
    return { counts, totals, duration };
  }

  function updateSelectLabels(data) {
    FACET_IDS.forEach((id) => {
      const select = byId(id);
      if (!select) return;
      const map = data?.counts[id] || new Map();
      const total = data?.totals[id] ?? 0;
      for (const option of select.options) {
        // Option.label is only the browser-facing text. Its value and
        // textContent remain unchanged for saved state and filter summaries.
        const base = option.textContent;
        const count = option.value ? (map.get(option.value) || 0) : total;
        const next = data ? base + ' (' + count.toLocaleString() + ')' : base;
        if (option.label !== next) option.label = next;
      }
    });
  }

  function updateCustomDropdowns(data) {
    for (const id of MULTI_IDS) {
      const dropdown = document.querySelector('.workspace-multi-dropdown[data-select-id="' + id + '"]');
      if (!dropdown) continue;
      const map = data?.counts[id] || new Map();
      dropdown.querySelectorAll('[data-workspace-multi-value]').forEach((checkbox) => {
        const row = checkbox.closest('.workspace-multi-row');
        const label = row?.querySelector('.workspace-multi-text');
        if (!label) return;
        let badge = label.querySelector('.wnmu-facet-count');
        if (!data) {
          badge?.remove();
          return;
        }
        if (!badge) {
          badge = document.createElement('small');
          badge.className = 'wnmu-facet-count';
          label.appendChild(badge);
        }
        const value = checkbox.dataset.workspaceMultiValue;
        badge.textContent = '(' + (map.get(value) || 0).toLocaleString() + ')';
      });
    }
  }

  function updateProgramTypeToggle(data) {
    const group = document.querySelector('.program-type-toggle');
    if (!group) return;
    const map = data?.counts.programTypeFilter || new Map();
    const total = data?.totals.programTypeFilter ?? 0;
    group.querySelectorAll('[data-program-type-mode]').forEach((button) => {
      const mode = button.dataset.programTypeMode;
      const option = Array.from(byId('programTypeFilter')?.options || [])
        .find((item) => item.value.toLowerCase() === mode);
      const count = mode === 'all' ? total : (map.get(option?.value || '') || 0);
      button.title = mode === 'all' ? 'All types: ' + count + ' matching titles'
        : (mode === 'series' ? 'Series: ' : 'Programs: ') + count + ' matching titles';
    });
  }

  function paint(data) {
    updateSelectLabels(data);
    updateCustomDropdowns(data);
    updateProgramTypeToggle(data);
  }

  function calculate() {
    updateTimer = null;
    try {
      lastCounts = createCounts();
      paint(lastCounts);
    } catch (error) {
      console.warn('Could not update contextual filter counts.', error);
      lastCounts = null;
      paint(null);
    }
  }

  function schedule(delay = 75) {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(calculate, delay);
  }

  function install() {
    if (typeof renderTable !== 'function' || typeof renderFilters !== 'function') return;
    const originalRenderTable = renderTable;
    renderTable = function facetCountRenderTable(...args) {
      const result = originalRenderTable.apply(this, args);
      schedule();
      return result;
    };
    const originalRenderFilters = renderFilters;
    renderFilters = function facetCountRenderFilters(...args) {
      const result = originalRenderFilters.apply(this, args);
      schedule();
      return result;
    };

    document.addEventListener('wnmu:workspace-multiselect-rendered', () => {
      // The main workspace rebuilds checkbox rows when selections change.
      // Reapply already-calculated counts, without starting a new scan.
      if (lastCounts) updateCustomDropdowns(lastCounts);
    });
    document.addEventListener('change', (event) => {
      if (FACET_IDS.has(event.target?.id) || event.target?.id === 'searchFieldSelect') schedule();
    }, true);
    document.getElementById('controlsPanel')?.addEventListener('input', (event) => {
      const id = event.target?.id;
      if (id === 'episodeMinFilter' || id === 'episodeMaxFilter') schedule(180);
      if (id === 'searchInput') schedule(750);
    });

    const styles = document.createElement('style');
    styles.id = 'wnmu-facet-count-styles';
    styles.textContent = [
      '.workspace-multi-text .wnmu-facet-count{display:inline-block;margin-left:6px;',
      'font-size:.87em;font-weight:700;white-space:nowrap;color:#356b79;}',
      '.workspace-topic-excluded .wnmu-facet-count{color:#94601f;}'
    ].join('');
    document.head.appendChild(styles);
    schedule(200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else install();
})();
