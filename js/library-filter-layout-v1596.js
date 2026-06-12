// v1.5.96 Library filter layout + secondary-topic narrowing
// Adds a late-loaded override after library-workflow.js, which had injected older
// compact-filter CSS with !important rules. Also narrows Secondary Topics based on
// selected primary Topics.

(function () {
  const VERSION = 'v1.5.96 library filter layout cleanup';

  function norm(value) {
    if (typeof normalizeText === 'function') return normalizeText(value);
    return (value ?? '').toString().trim();
  }

  function lower(value) {
    if (typeof normalizeLower === 'function') return normalizeLower(value);
    return norm(value).toLowerCase();
  }

  function splitValues(value) {
    if (typeof splitMultiValues === 'function') return splitMultiValues(value);
    return norm(value)
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function selectedValuesFrom(selectEl) {
    return Array.from(selectEl?.selectedOptions || [])
      .map((option) => option.value)
      .filter(Boolean);
  }

  function setLabelText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function optionSort(a, b) {
    return norm(a).localeCompare(norm(b), undefined, { sensitivity: 'base' });
  }

  function getSecondaryTopicsForSelectedPrimaryTopics() {
    const topicSelect = document.getElementById('topicFilter');
    const selectedTopics = selectedValuesFrom(topicSelect);
    const selectedSet = new Set(selectedTopics.map(lower));

    const fallback = (() => {
      if (typeof lookupItemsOrFallback === 'function') {
        return lookupItemsOrFallback('secondary_topics', 'secondary_topic')
          .map((item) => typeof item === 'string' ? item : item?.name)
          .filter(Boolean);
      }
      return [];
    })();

    if (!selectedSet.size) return Array.from(new Set(fallback.map(norm).filter(Boolean))).sort(optionSort);

    const matches = new Set();
    (state?.programs || []).forEach((program) => {
      const primaryValues = splitValues(program?.topic || program?.primary_topic || program?.program_topic);
      const hasSelectedPrimary = primaryValues.some((topic) => selectedSet.has(lower(topic)));
      if (!hasSelectedPrimary) return;
      splitValues(program?.secondary_topic).forEach((secondary) => {
        const clean = norm(secondary);
        if (clean) matches.add(clean);
      });
    });

    return Array.from(matches).sort(optionSort);
  }

  function refillSecondaryTopicFilter() {
    const select = document.getElementById('secondaryTopicFilter');
    if (!select) return false;

    const previous = new Set(selectedValuesFrom(select));
    const options = getSecondaryTopicsForSelectedPrimaryTopics();
    const valid = new Set(options);

    select.innerHTML = '';
    options.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = previous.has(value);
      select.appendChild(option);
    });

    const removedSelection = Array.from(previous).some((value) => !valid.has(value));
    if (removedSelection && typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
    return removedSelection;
  }

  function installSecondaryTopicPatch() {
    if (window.__wnmuSecondaryTopicFilterV1596) return;
    window.__wnmuSecondaryTopicFilterV1596 = true;

    if (typeof renderFilters === 'function') {
      const originalRenderFilters = renderFilters;
      renderFilters = function patchedRenderFilters(...args) {
        const result = originalRenderFilters.apply(this, args);
        refillSecondaryTopicFilter();
        setUiLabels();
        return result;
      };
    }

    const topicSelect = document.getElementById('topicFilter');
    if (topicSelect) {
      topicSelect.addEventListener('change', () => {
        const removed = refillSecondaryTopicFilter();
        if (removed || true) {
          if (typeof rememberViewState === 'function') rememberViewState();
          if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
          if (typeof updateQueryStatus === 'function') updateQueryStatus();
          else if (typeof renderTable === 'function') renderTable();
        }
      });
    }

    refillSecondaryTopicFilter();
  }

  function setUiLabels() {
    setLabelText('label[for="codeFilter"]', 'Uses');
    setLabelText('label[for="programTypeFilter"]', 'Program / Series');
  }

  function installLayoutStyle() {
    if (document.getElementById('wnmuLibraryFilterLayoutV1596')) return;
    const style = document.createElement('style');
    style.id = 'wnmuLibraryFilterLayoutV1596';
    style.textContent = `
      @media (min-width: 1180px) {
        #controlsPanel.controls.compact-controls {
          padding-bottom: 10px !important;
        }

        #controlsPanel .filters.filters-grid {
          display: grid !important;
          grid-template-columns:
            minmax(180px, .9fr)
            minmax(255px, 1.18fr)
            minmax(140px, .55fr)
            minmax(170px, .72fr)
            minmax(820px, 3.75fr) !important;
          gap: 8px 10px !important;
          align-items: start !important;
          align-content: start !important;
          grid-auto-flow: row !important;
        }

        #controlsPanel .filters.filters-grid > .filter-box:nth-child(1) {
          grid-column: 1 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(2) {
          grid-column: 2 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(3) {
          grid-column: 3 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .filters.filters-grid > .filter-box:nth-child(4) {
          grid-column: 4 !important;
          grid-row: 1 !important;
        }

        #controlsPanel .filters.filters-grid > .compact-search-cluster,
        #controlsPanel .filters.filters-grid > .filters-cluster.compact-search-cluster {
          grid-column: 5 !important;
          grid-row: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
          display: grid !important;
          grid-template-columns:
            minmax(108px, .7fr)
            minmax(260px, 1.85fr)
            minmax(124px, .78fr)
            minmax(142px, .85fr)
            minmax(124px, .75fr)
            minmax(126px, .75fr)
            minmax(112px, .68fr)
            minmax(112px, .68fr) !important;
          column-gap: 8px !important;
          row-gap: 8px !important;
          align-items: start !important;
          align-content: start !important;
        }

        #controlsPanel .cluster-type {
          grid-column: 1 !important;
          grid-row: 1 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-search-text {
          grid-column: 2 / span 2 !important;
          grid-row: 1 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-distributor {
          grid-column: 4 !important;
          grid-row: 1 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-episodes {
          grid-column: 5 !important;
          grid-row: 1 !important;
          align-self: start !important;
          min-width: 0 !important;
        }
        #controlsPanel .cluster-clear-all {
          grid-column: 6 / span 3 !important;
          grid-row: 1 !important;
          display: flex !important;
          justify-content: flex-end !important;
          align-items: start !important;
          align-self: start !important;
          min-width: 0 !important;
          padding-top: 15px !important;
        }

        #controlsPanel .cluster-search-in {
          grid-column: 1 !important;
          grid-row: 2 !important;
          max-width: 13.5ch !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-search-in select {
          width: 13.5ch !important;
          min-width: 13.5ch !important;
          max-width: 13.5ch !important;
        }
        #controlsPanel .cluster-rights-start {
          grid-column: 2 !important;
          grid-row: 2 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-rights-end {
          grid-column: 3 !important;
          grid-row: 2 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-status {
          grid-column: 4 !important;
          grid-row: 2 !important;
          align-self: start !important;
        }
        #controlsPanel .cluster-rating {
          grid-column: 5 !important;
          grid-row: 2 !important;
          align-self: start !important;
        }

        #controlsPanel .compact-search-cluster .filter-label,
        #controlsPanel .compact-search-cluster .filter-label-row .filter-label {
          display: block !important;
          min-height: 12px !important;
          line-height: 1 !important;
          margin: 0 0 4px 0 !important;
          white-space: nowrap !important;
          overflow: visible !important;
        }
        #controlsPanel .compact-search-cluster .filter-label-row {
          min-height: 12px !important;
          height: 12px !important;
          margin: 0 0 4px 0 !important;
          align-items: start !important;
          justify-content: space-between !important;
        }
        #controlsPanel .compact-search-cluster .mini-clear {
          padding: 2px 7px !important;
          line-height: 1 !important;
          font-size: .68rem !important;
          transform: translateY(-2px) !important;
        }
        #controlsPanel .compact-search-cluster input,
        #controlsPanel .compact-search-cluster select {
          width: 100% !important;
          min-width: 0 !important;
          height: 42px !important;
          box-sizing: border-box !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
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
        #controlsPanel .cluster-clear-all .reset-all {
          margin: 0 !important;
          width: auto !important;
          max-width: 170px !important;
          white-space: nowrap !important;
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
      }

      @media (min-width: 1550px) {
        #controlsPanel .filters.filters-grid {
          grid-template-columns:
            minmax(185px, .9fr)
            minmax(280px, 1.22fr)
            minmax(145px, .55fr)
            minmax(175px, .72fr)
            minmax(900px, 3.95fr) !important;
        }
        #controlsPanel .filters.filters-grid > .compact-search-cluster,
        #controlsPanel .filters.filters-grid > .filters-cluster.compact-search-cluster {
          grid-template-columns:
            minmax(112px, .7fr)
            minmax(300px, 1.95fr)
            minmax(132px, .78fr)
            minmax(150px, .86fr)
            minmax(132px, .76fr)
            minmax(132px, .76fr)
            minmax(118px, .68fr)
            minmax(118px, .68fr) !important;
        }
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
        #controlsPanel .cluster-search-in,
        #controlsPanel .cluster-search-in select {
          width: 100% !important;
          min-width: 0 !important;
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

    let holder = cluster.querySelector('.cluster-clear-all');
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'filter-box cluster-clear-all';
      cluster.appendChild(holder);
    }
    if (button.parentElement !== holder) holder.appendChild(button);

    const foot = document.querySelector('#controlsPanel .filter-foot');
    if (foot) foot.classList.add('hidden');
  }

  function enforceLayout() {
    setUiLabels();
    installLayoutStyle();
    moveClearAllIntoCluster();
  }

  document.addEventListener('DOMContentLoaded', () => {
    enforceLayout();
    installSecondaryTopicPatch();
    window.addEventListener('resize', enforceLayout);
  });

  // If this script loads after DOMContentLoaded because of cache weirdness, still apply.
  if (document.readyState !== 'loading') {
    enforceLayout();
    installSecondaryTopicPatch();
  }

  window.__wnmuLibraryFilterLayoutVersion = VERSION;
})();
