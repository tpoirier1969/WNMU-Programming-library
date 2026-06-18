// v1.5.107 Library filter layout hardening + secondary-topic narrowing
// Replaces the earlier helper in the same file path and pairs with the v1.5.107 cache-buster.
// This intentionally overrides older CSS and inline grid styles injected by library-workflow.js.

(function () {
  const VERSION = 'v1.5.107 library filter layout hardening';
  const LAYOUT_STYLE_ID = 'wnmuLibraryFilterLayoutV15100';
  const OLD_LAYOUT_STYLE_IDS = ['wnmuCompactFilterLayoutV159', 'wnmuLibraryFilterLayoutV1596', 'wnmuLibraryFilterLayoutV1597'];

  function norm(value) {
    try {
      if (typeof normalizeText === 'function') return normalizeText(value);
    } catch {}
    return (value ?? '').toString().trim();
  }

  function lower(value) {
    try {
      if (typeof normalizeLower === 'function') return normalizeLower(value);
    } catch {}
    return norm(value).toLowerCase();
  }

  function splitValues(value) {
    try {
      if (typeof splitMultiValues === 'function') return splitMultiValues(value);
    } catch {}
    return norm(value)
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function safePrograms() {
    try {
      return Array.isArray(state?.programs) ? state.programs : [];
    } catch {
      return [];
    }
  }

  function selectedValuesFrom(selectEl) {
    return Array.from(selectEl?.selectedOptions || [])
      .map((option) => option.value)
      .filter(Boolean);
  }

  function setImportant(el, property, value) {
    if (!el) return;
    el.style.setProperty(property, value, 'important');
  }

  function clearInlineGrid(el) {
    if (!el) return;
    ['grid-column', 'grid-row', 'width', 'max-width', 'min-width', 'align-self'].forEach((prop) => {
      el.style.removeProperty(prop);
    });
  }

  function setLabelText(selector, text) {
    const el = document.querySelector(selector);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function optionSort(a, b) {
    return norm(a).localeCompare(norm(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  function readSelectValues(id) {
    return selectedValuesFrom(document.getElementById(id));
  }

  function readFieldValue(id) {
    return norm(document.getElementById(id)?.value || '');
  }

  function getDerived(program) {
    try {
      if (typeof getProgramDerived === 'function') return getProgramDerived(program) || {};
    } catch {}
    return {};
  }

  function searchableTextForProgram(program, derived, fieldName = '') {
    if (fieldName) {
      const fromDerived = derived?.searchByField?.[fieldName];
      if (fromDerived != null) return lower(fromDerived);
      return lower(program?.[fieldName]);
    }
    if (derived?.searchAll != null) return lower(derived.searchAll);
    return lower(Object.values(program || {}).join(' '));
  }

  function primaryTopicValues(program, derived = {}) {
    const values = [
      ...(Array.isArray(derived.topicValues) ? derived.topicValues : []),
      ...splitValues(program?.topic),
      ...splitValues(program?.primary_topic),
      ...splitValues(program?.program_topic)
    ];
    return Array.from(new Set(values.map(norm).filter(Boolean)));
  }

  function secondaryTopicValues(program, derived = {}) {
    const values = [
      ...(Array.isArray(derived.secondaryTopicValues) ? derived.secondaryTopicValues : []),
      ...splitValues(program?.secondary_topic)
    ];
    const byKey = new Map();
    values.forEach((value) => {
      const clean = norm(value);
      const key = lower(clean);
      if (clean && !byKey.has(key)) byKey.set(key, clean);
    });
    return Array.from(byKey.values());
  }

  function programRating(program) {
    try {
      if (typeof getProgramRating === 'function') return getProgramRating(program);
    } catch {}
    const raw = program?.rating;
    if (raw == null || raw === '') return null;
    const numeric = Math.round(Number(raw));
    return Number.isFinite(numeric) ? numeric : null;
  }

  function matchesRatingFilter(program, ratingFilter) {
    if (!ratingFilter) return true;
    const rating = programRating(program);
    switch (ratingFilter) {
      case 'unrated':
        return rating == null;
      case '4plus':
        return rating != null && rating >= 4;
      case '3plus':
        return rating != null && rating >= 3;
      default: {
        const exact = Math.round(Number(ratingFilter));
        return Number.isFinite(exact) && rating === exact;
      }
    }
  }

  function countEpisodes(program) {
    try {
      if (typeof extractEpisodeCount === 'function') return extractEpisodeCount(program);
    } catch {}
    const raw = norm(program?.episode_season);
    if (!raw) return null;
    const slashMatch = raw.match(/\/\s*(\d{1,4})\b/);
    if (slashMatch) return Number(slashMatch[1]);
    const epsMatch = raw.match(/\b(\d{1,4})\s*(?:eps?|episodes?)\b/i);
    if (epsMatch) return Number(epsMatch[1]);
    if (/series/i.test(norm(program?.program_type)) && /^\d{1,4}$/.test(raw)) return Number(raw);
    return null;
  }

  function matchesEpisodeRange(program) {
    const minRaw = readFieldValue('episodeMinFilter');
    const maxRaw = readFieldValue('episodeMaxFilter');
    if (!minRaw && !maxRaw) return true;
    const count = countEpisodes(program);
    if (!Number.isFinite(count)) return false;
    const min = minRaw ? Number(minRaw) : null;
    const max = maxRaw ? Number(maxRaw) : null;
    if (Number.isFinite(min) && count < min) return false;
    if (Number.isFinite(max) && count > max) return false;
    return true;
  }

  function programMatchesCurrentFiltersExceptSecondary(program) {
    const derived = getDerived(program);

    try {
      if (typeof matchesView === 'function' && state?.currentView && !matchesView(program, state.currentView)) return false;
    } catch {}

    const search = lower(readFieldValue('searchInput'));
    if (search) {
      const searchField = readFieldValue('searchFieldSelect');
      if (!searchableTextForProgram(program, derived, searchField).includes(search)) return false;
    }

    const codeSet = new Set(readSelectValues('codeFilter').map((value) => norm(value).toUpperCase()).filter(Boolean));
    const legacyCode = norm(derived.legacyCode || program?.legacy_code).toUpperCase();
    if (codeSet.size && !codeSet.has(legacyCode)) return false;

    const topicSet = new Set(readSelectValues('topicFilter').map(lower).filter(Boolean));
    if (topicSet.size && !primaryTopicValues(program, derived).some((topic) => topicSet.has(lower(topic)))) return false;

    const lengthSet = new Set(readSelectValues('lengthFilter').map(norm).filter(Boolean));
    const lengthValue = norm(derived.lengthValue || program?.length_minutes);
    if (lengthSet.size && !lengthSet.has(lengthValue)) return false;

    const distributor = readFieldValue('distributorFilter');
    if (distributor && norm(program?.distributor) !== distributor) return false;

    const programType = readFieldValue('programTypeFilter');
    if (programType && norm(program?.program_type) !== programType) return false;

    const statusFilter = readFieldValue('statusFilter');
    if (statusFilter && statusFilter !== 'expired') {
      try {
        if (typeof matchesView === 'function' && !matchesView(program, statusFilter)) return false;
      } catch {}
    }

    if (!matchesRatingFilter(program, readFieldValue('ratingFilter'))) return false;

    const rightsStart = readFieldValue('rightsWindowStartFilter');
    const rightsEnd = readFieldValue('rightsWindowEndFilter');
    if (rightsStart || rightsEnd) {
      try {
        if (typeof programRightsCoverDateRange === 'function' && !programRightsCoverDateRange(program, rightsStart, rightsEnd)) return false;
      } catch {}
    }

    if (!matchesEpisodeRange(program)) return false;

    return true;
  }

  function getSecondaryTopicsForCurrentFilterState() {
    const matches = new Map();

    safePrograms().forEach((program) => {
      if (!programMatchesCurrentFiltersExceptSecondary(program)) return;
      const derived = getDerived(program);
      secondaryTopicValues(program, derived).forEach((secondary) => {
        const key = lower(secondary);
        if (key && !matches.has(key)) matches.set(key, norm(secondary));
      });
    });

    return Array.from(matches.values()).sort(optionSort);
  }

  function refillSecondaryTopicFilter() {
    const select = document.getElementById('secondaryTopicFilter');
    if (!select) return false;

    const previousValues = selectedValuesFrom(select);
    const previousKeys = new Set(previousValues.map(lower).filter(Boolean));
    const options = getSecondaryTopicsForCurrentFilterState();
    const validKeys = new Set(options.map(lower));

    select.innerHTML = '';
    options.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = previousKeys.has(lower(value));
      select.appendChild(option);
    });

    const removedSelection = previousValues.some((value) => !validKeys.has(lower(value)));
    if (removedSelection) {
      if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
      if (typeof updateQueryStatus === 'function') updateQueryStatus();
      else if (typeof renderTable === 'function') renderTable();
    }
    return removedSelection;
  }

  function setUiLabels() {
    setLabelText('label[for="codeFilter"]', 'Uses');
    setLabelText('label[for="programTypeFilter"]', 'Program / Series');

    const legacyCodeOption = document.querySelector('#searchFieldSelect option[value="legacy_code"]');
    if (legacyCodeOption && legacyCodeOption.textContent !== 'Uses') legacyCodeOption.textContent = 'Uses';
  }

  function installSecondaryTopicPatch() {
    if (!window.__wnmuSecondaryTopicFilterV1597) {
      window.__wnmuSecondaryTopicFilterV1597 = true;

      if (typeof renderFilters === 'function') {
        const originalRenderFilters = renderFilters;
        renderFilters = function patchedRenderFilters(...args) {
          const result = originalRenderFilters.apply(this, args);
          setUiLabels();
          refillSecondaryTopicFilter();
          enforceLayout();
          return result;
        };
      }

      if (typeof resetFilters === 'function') {
        const originalResetFilters = resetFilters;
        resetFilters = function patchedResetFilters(...args) {
          const result = originalResetFilters.apply(this, args);
          refillSecondaryTopicFilter();
          enforceLayout();
          return result;
        };
      }
    }

    const topicSelect = document.getElementById('topicFilter');
    if (topicSelect && topicSelect.dataset.secondaryNarrowingBound !== 'true') {
      topicSelect.dataset.secondaryNarrowingBound = 'true';
      topicSelect.addEventListener('change', () => {
        refillSecondaryTopicFilter();
        if (typeof rememberViewState === 'function') rememberViewState();
        if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
        if (typeof updateQueryStatus === 'function') updateQueryStatus();
        else if (typeof renderTable === 'function') renderTable();
      });
    }

    const clearTopicButton = document.getElementById('clearTopicFilter');
    if (clearTopicButton && clearTopicButton.dataset.secondaryNarrowingBound !== 'true') {
      clearTopicButton.dataset.secondaryNarrowingBound = 'true';
      clearTopicButton.addEventListener('click', () => {
        setTimeout(() => {
          refillSecondaryTopicFilter();
          enforceLayout();
        }, 0);
      });
    }

    const resetButton = document.getElementById('resetFiltersBtn');
    if (resetButton && resetButton.dataset.secondaryNarrowingBound !== 'true') {
      resetButton.dataset.secondaryNarrowingBound = 'true';
      resetButton.addEventListener('click', () => {
        setTimeout(() => {
          refillSecondaryTopicFilter();
          enforceLayout();
        }, 0);
      });
    }

    const refreshDrivers = [
      'codeFilter',
      'lengthFilter',
      'distributorFilter',
      'programTypeFilter',
      'searchInput',
      'searchFieldSelect',
      'statusFilter',
      'ratingFilter',
      'rightsWindowStartFilter',
      'rightsWindowEndFilter',
      'episodeMinFilter',
      'episodeMaxFilter'
    ];

    refreshDrivers.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.secondaryNarrowingDriver === 'true') return;
      el.dataset.secondaryNarrowingDriver = 'true';
      el.addEventListener('change', () => {
        refillSecondaryTopicFilter();
        enforceLayout();
      });
      el.addEventListener('input', () => {
        window.clearTimeout(el.__secondaryNarrowingTimer);
        el.__secondaryNarrowingTimer = window.setTimeout(() => {
          refillSecondaryTopicFilter();
          enforceLayout();
        }, 80);
      });
    });

    const quickStrip = document.getElementById('quickStrip');
    if (quickStrip && quickStrip.dataset.secondaryNarrowingDriver !== 'true') {
      quickStrip.dataset.secondaryNarrowingDriver = 'true';
      quickStrip.addEventListener('click', (event) => {
        if (!event.target.closest('[data-view]')) return;
        window.setTimeout(() => {
          refillSecondaryTopicFilter();
          enforceLayout();
        }, 0);
      });
    }

    refillSecondaryTopicFilter();
  }

  function installLayoutStyle() {
    OLD_LAYOUT_STYLE_IDS.forEach((id) => document.getElementById(id)?.remove());
    document.getElementById(LAYOUT_STYLE_ID)?.remove();

    const style = document.createElement('style');
    style.id = LAYOUT_STYLE_ID;
    style.textContent = `
      #controlsPanel .filters-grid > .filter-box,
      #controlsPanel .filters-grid > .filters-cluster,
      #controlsPanel .compact-search-cluster > .filter-box {
        min-width: 0 !important;
      }

      #controlsPanel .compact-search-cluster input,
      #controlsPanel .compact-search-cluster select {
        width: 100% !important;
        min-width: 0 !important;
        height: 42px !important;
        box-sizing: border-box !important;
      }

      #controlsPanel .compact-search-cluster .filter-label,
      #controlsPanel .compact-search-cluster .filter-label-row .filter-label {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
        min-height: 13px !important;
        line-height: 1 !important;
        margin: 0 0 5px 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: clip !important;
      }

      #controlsPanel .compact-search-cluster .filter-label-row {
        min-height: 13px !important;
        height: 13px !important;
        margin: 0 0 5px 0 !important;
        align-items: start !important;
        justify-content: space-between !important;
        gap: 4px !important;
        overflow: visible !important;
      }

      #controlsPanel .compact-search-cluster .mini-clear {
        flex: 0 0 auto !important;
        padding: 2px 7px !important;
        line-height: 1 !important;
        font-size: .68rem !important;
        transform: translateY(-2px) !important;
      }

      #controlsPanel .episode-range-filter {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 6px !important;
        max-width: none !important;
      }

      #controlsPanel .episode-range-filter input {
        min-width: 0 !important;
        width: 100% !important;
        padding-left: 7px !important;
        padding-right: 7px !important;
      }

      #controlsPanel .cluster-clear-all {
        min-width: 0 !important;
      }

      #controlsPanel .cluster-clear-all .reset-all {
        margin: 0 !important;
        width: 100% !important;
        max-width: none !important;
        white-space: nowrap !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
      }

      #controlsPanel .filter-foot.hidden {
        display: none !important;
      }

      #controlsPanel .filters-grid > .filter-box:not(.filters-cluster) > select[multiple],
      #controlsPanel .filter-box select[multiple] {
        min-height: 98px !important;
        height: 98px !important;
        max-height: 98px !important;
        padding-top: 5px !important;
        padding-bottom: 5px !important;
      }

      @media (min-width: 1450px) {
        #controlsPanel.controls.compact-controls {
          padding-bottom: 10px !important;
        }

        #controlsPanel .filters.filters-grid {
          display: grid !important;
          grid-template-columns:
            minmax(210px, 1.05fr)
            minmax(245px, 1.22fr)
            minmax(128px, .58fr)
            minmax(150px, .68fr)
            minmax(0, 3.75fr) !important;
          gap: 8px 10px !important;
          align-items: start !important;
          align-content: start !important;
          grid-auto-flow: row !important;
        }

        #controlsPanel .filters.filters-grid > .filter-box:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(4) { grid-column: 4 !important; grid-row: 1 !important; }

        #controlsPanel .filters.filters-grid > .compact-search-cluster,
        #controlsPanel .filters.filters-grid > .filters-cluster.compact-search-cluster {
          grid-column: 5 !important;
          grid-row: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
          display: grid !important;
          grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          column-gap: 8px !important;
          row-gap: 8px !important;
          align-items: start !important;
          align-content: start !important;
        }

        #controlsPanel .cluster-type { grid-column: 1 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-search-text { grid-column: 3 / span 4 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-distributor { grid-column: 7 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-episodes { grid-column: 9 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-clear-all { grid-column: 11 / span 2 !important; grid-row: 1 !important; display: flex !important; justify-content: flex-end !important; align-items: start !important; padding-top: 18px !important; }

        #controlsPanel .cluster-search-in { grid-column: 1 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-start { grid-column: 3 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-end { grid-column: 5 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-status { grid-column: 7 / span 3 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rating { grid-column: 10 / span 3 !important; grid-row: 2 !important; }
      }

      @media (min-width: 1180px) and (max-width: 1449px) {
        #controlsPanel .filters.filters-grid {
          display: grid !important;
          grid-template-columns:
            minmax(180px, 1fr)
            minmax(220px, 1.2fr)
            minmax(118px, .58fr)
            minmax(140px, .7fr) !important;
          gap: 8px 10px !important;
          align-items: start !important;
          align-content: start !important;
        }

        #controlsPanel .filters.filters-grid > .filter-box:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(4) { grid-column: 4 !important; grid-row: 1 !important; }

        #controlsPanel .filters.filters-grid > .compact-search-cluster,
        #controlsPanel .filters.filters-grid > .filters-cluster.compact-search-cluster {
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          width: 100% !important;
          min-width: 0 !important;
          display: grid !important;
          grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          column-gap: 8px !important;
          row-gap: 8px !important;
          align-items: start !important;
          align-content: start !important;
        }

        #controlsPanel .cluster-type { grid-column: 1 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-search-text { grid-column: 3 / span 4 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-distributor { grid-column: 7 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-episodes { grid-column: 9 / span 2 !important; grid-row: 1 !important; }
        #controlsPanel .cluster-clear-all { grid-column: 11 / span 2 !important; grid-row: 1 !important; display: flex !important; justify-content: flex-end !important; align-items: start !important; padding-top: 18px !important; }

        #controlsPanel .cluster-search-in { grid-column: 1 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-start { grid-column: 3 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rights-end { grid-column: 5 / span 2 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-status { grid-column: 7 / span 3 !important; grid-row: 2 !important; }
        #controlsPanel .cluster-rating { grid-column: 10 / span 3 !important; grid-row: 2 !important; }
      }

      @media (max-width: 1179px) {
        #controlsPanel .compact-search-cluster {
          grid-template-columns: 1fr 1fr !important;
        }
        #controlsPanel .cluster-search-text,
        #controlsPanel .cluster-rights-start,
        #controlsPanel .cluster-distributor,
        #controlsPanel .cluster-type,
        #controlsPanel .cluster-episodes,
        #controlsPanel .cluster-search-in,
        #controlsPanel .cluster-rights-end,
        #controlsPanel .cluster-status,
        #controlsPanel .cluster-rating,
        #controlsPanel .cluster-clear-all {
          grid-column: auto !important;
          grid-row: auto !important;
          max-width: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function moveClearAllIntoCluster() {
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    const button = document.getElementById('resetFiltersBtn');
    if (!cluster || !button) return;

    const episodeBox = document.getElementById('episodeFilterBox') || cluster.querySelector('.cluster-episodes');
    let holder = cluster.querySelector('.cluster-clear-all');
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'filter-box cluster-clear-all';
      if (episodeBox?.nextSibling) cluster.insertBefore(holder, episodeBox.nextSibling);
      else cluster.appendChild(holder);
    }
    if (button.parentElement !== holder) holder.appendChild(button);

    const foot = document.querySelector('#controlsPanel .filter-foot');
    if (foot) foot.classList.add('hidden');
  }

  function reorderClusterDom() {
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    if (!cluster) return;

    const typeBox = cluster.querySelector('.cluster-type');
    const searchBox = cluster.querySelector('.cluster-search-text');
    if (typeBox && searchBox && typeBox.nextElementSibling !== searchBox) {
      cluster.insertBefore(typeBox, searchBox);
    }

    const rightsStart = cluster.querySelector('.cluster-rights-start');
    const distributor = cluster.querySelector('.cluster-distributor');
    if (distributor && rightsStart && distributor.previousElementSibling === rightsStart) {
      cluster.insertBefore(distributor, rightsStart);
    }
  }

  function applyInlineDesktopLayout() {
    const grid = document.querySelector('#controlsPanel .filters.filters-grid');
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    if (!grid || !cluster) return;

    const desktop = window.matchMedia('(min-width: 1180px)').matches;
    if (!desktop) {
      grid.removeAttribute('style');
      Array.from(grid.children).forEach(clearInlineGrid);
      cluster.removeAttribute('style');
      Array.from(cluster.children).forEach(clearInlineGrid);
      return;
    }

    const roomy = window.matchMedia('(min-width: 1450px)').matches;

    setImportant(grid, 'display', 'grid');
    setImportant(grid, 'gap', '8px 10px');
    setImportant(grid, 'align-items', 'start');
    setImportant(grid, 'align-content', 'start');
    setImportant(grid, 'grid-auto-flow', 'row');
    setImportant(grid, 'grid-template-columns', roomy
      ? 'minmax(210px,1.05fr) minmax(245px,1.22fr) minmax(128px,.58fr) minmax(150px,.68fr) minmax(0,3.75fr)'
      : 'minmax(180px,1fr) minmax(220px,1.2fr) minmax(118px,.58fr) minmax(140px,.7fr)');

    const gridChildren = Array.from(grid.children);
    [[0, '1'], [1, '2'], [2, '3'], [3, '4']].forEach(([index, column]) => {
      const item = gridChildren[index];
      if (!item) return;
      setImportant(item, 'grid-column', column);
      setImportant(item, 'grid-row', '1');
      setImportant(item, 'min-width', '0');
    });

    setImportant(cluster, 'grid-column', roomy ? '5' : '1 / -1');
    setImportant(cluster, 'grid-row', roomy ? '1' : '2');
    setImportant(cluster, 'width', '100%');
    setImportant(cluster, 'min-width', '0');
    setImportant(cluster, 'display', 'grid');
    setImportant(cluster, 'grid-template-columns', 'repeat(12, minmax(0, 1fr))');
    setImportant(cluster, 'column-gap', '8px');
    setImportant(cluster, 'row-gap', '8px');
    setImportant(cluster, 'align-items', 'start');
    setImportant(cluster, 'align-content', 'start');

    const placements = [
      ['.cluster-type', '1 / span 2', '1'],
      ['.cluster-search-text', '3 / span 4', '1'],
      ['.cluster-distributor', '7 / span 2', '1'],
      ['.cluster-episodes', '9 / span 2', '1'],
      ['.cluster-clear-all', '11 / span 2', '1'],
      ['.cluster-search-in', '1 / span 2', '2'],
      ['.cluster-rights-start', '3 / span 2', '2'],
      ['.cluster-rights-end', '5 / span 2', '2'],
      ['.cluster-status', '7 / span 3', '2'],
      ['.cluster-rating', '10 / span 3', '2']
    ];

    placements.forEach(([selector, column, row]) => {
      const item = cluster.querySelector(selector);
      if (!item) return;
      setImportant(item, 'grid-column', column);
      setImportant(item, 'grid-row', row);
      setImportant(item, 'min-width', '0');
      setImportant(item, 'max-width', 'none');
      setImportant(item, 'align-self', 'start');
    });

    const clearHolder = cluster.querySelector('.cluster-clear-all');
    if (clearHolder) {
      setImportant(clearHolder, 'display', 'flex');
      setImportant(clearHolder, 'justify-content', 'flex-end');
      setImportant(clearHolder, 'align-items', 'start');
      setImportant(clearHolder, 'padding-top', '18px');
    }
  }

  function enforceLayout() {
    setUiLabels();
    installLayoutStyle();
    reorderClusterDom();
    moveClearAllIntoCluster();
    applyInlineDesktopLayout();
  }

  function boot() {
    enforceLayout();
    installSecondaryTopicPatch();
    requestAnimationFrame(enforceLayout);
    setTimeout(enforceLayout, 50);
    setTimeout(enforceLayout, 250);
    setTimeout(enforceLayout, 1200);
    if (!window.__wnmuLibraryFilterLayoutResizeV1597) {
      window.__wnmuLibraryFilterLayoutResizeV1597 = true;
      window.addEventListener('resize', () => {
        enforceLayout();
        setTimeout(enforceLayout, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__wnmuLibraryFilterLayoutVersion = VERSION;
})();
