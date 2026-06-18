// v1.5.105 Main Library UI polish compatibility for v15103 path
// Refines the Program / Series toggle, uses the empty row space for Search Text,
// keeps Distributor readable, keeps Rating inside the panel, and removes description Copy buttons.

(function () {
  const VERSION = 'v1.5.105 main library UI polish compatibility';

  function setImportant(element, property, value) {
    if (!element) return;
    element.style.setProperty(property, value, 'important');
  }

  function injectStyles() {
    if (document.getElementById('wnmuMainLibraryUiV15105Styles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuMainLibraryUiV15105Styles';
    style.textContent = `
      #appShell .topbar {
        padding: 8px 12px !important;
        gap: 12px !important;
      }
      #appShell .brand-wrap {
        gap: 12px !important;
        min-width: 0 !important;
      }
      #appShell .program-brand-mark {
        width: 124px !important;
        border-radius: 12px !important;
      }
      #appShell .brand-name {
        font-size: .98rem !important;
        line-height: 1.05 !important;
      }
      #appShell #appTitle {
        margin: 0 !important;
        font-size: 1.28rem !important;
        line-height: 1 !important;
      }
      #appShell .compact-title-row {
        gap: 7px 9px !important;
        align-items: center !important;
      }
      #appShell .topbar-status-inline {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 0 !important;
        max-width: min(58vw, 740px) !important;
        padding: 3px 8px !important;
        border-radius: 999px !important;
        background: rgba(45, 199, 189, .10) !important;
        border: 1px solid rgba(18, 134, 127, .18) !important;
        color: var(--muted) !important;
        font-size: .76rem !important;
        line-height: 1.12 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      #appShell .topbar-actions {
        gap: 6px !important;
      }
      #appShell .topbar-actions button {
        padding: 7px 10px !important;
      }

      #controlsPanel .program-type-native-select {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
      #controlsPanel .program-type-toggle {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        width: min(100%, 148px) !important;
        min-width: 0 !important;
        height: 28px !important;
        overflow: hidden !important;
        border: 1px solid rgba(18, 134, 127, .22) !important;
        border-radius: 999px !important;
        background: #f9fdfe !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.75) !important;
      }
      #controlsPanel .program-type-toggle button {
        min-width: 0 !important;
        width: 100% !important;
        height: 100% !important;
        padding: 0 4px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--pbs-blue-dark) !important;
        font-size: .64rem !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-align: center !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }
      #controlsPanel .program-type-toggle button + button {
        border-left: 1px solid rgba(18, 134, 127, .16) !important;
      }
      #controlsPanel .program-type-toggle button.active {
        background: linear-gradient(180deg, #167f9e, #0f5b85) !important;
        color: #fff !important;
      }
      #controlsPanel .program-type-toggle button:first-child {
        border-radius: 999px 0 0 999px !important;
      }
      #controlsPanel .program-type-toggle button:last-child {
        border-radius: 0 999px 999px 0 !important;
      }
      #controlsPanel .program-type-toggle button:focus-visible {
        outline: 2px solid rgba(44, 163, 184, .38) !important;
        outline-offset: -2px !important;
      }

      #controlsPanel .cluster-distributor .filter-label {
        white-space: nowrap !important;
        letter-spacing: .015em !important;
      }
      #controlsPanel .cluster-distributor select {
        padding-left: 8px !important;
        padding-right: 24px !important;
        text-overflow: clip !important;
      }
      #controlsPanel .cluster-search-text input {
        min-width: 0 !important;
      }
      #controlsPanel .cluster-rating select {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      #controlsPanel .cluster-clear-all .reset-all {
        display: grid !important;
        place-items: center !important;
        gap: 2px !important;
        min-width: 0 !important;
        width: 78px !important;
        max-width: 78px !important;
        min-height: 42px !important;
        padding: 6px 8px !important;
        white-space: normal !important;
        text-align: center !important;
        font-size: .7rem !important;
        font-weight: 800 !important;
        line-height: 1.12 !important;
        letter-spacing: 0 !important;
        border-radius: 11px !important;
      }
      #controlsPanel .cluster-clear-all .reset-all span {
        display: block !important;
      }

      .program-rating-tools-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        margin-top: 5px !important;
      }
      .program-rating-tools-row .program-rating-row,
      .program-rating-tools-row .program-inline-tools {
        margin-top: 0 !important;
      }
      .program-rating-tools-row .program-rating-row {
        min-height: 20px !important;
        gap: 4px !important;
      }
      .program-rating-tools-row .star-rating-btn {
        font-size: 1.02rem !important;
        padding: 0 1px !important;
      }
      .program-rating-tools-row .rating-text {
        font-size: .7rem !important;
      }
      .program-rating-tools-row .inline-airing-toggle-btn {
        padding: 3px 7px !important;
        font-size: .68rem !important;
        line-height: 1.05 !important;
        white-space: nowrap !important;
      }
      .programs-table .program-title {
        font-size: .95rem !important;
        line-height: 1.1 !important;
      }
      .programs-table .program-sub {
        margin-top: 3px !important;
        gap: 4px !important;
        font-size: .74rem !important;
      }
      .programs-table .code-pill,
      .programs-table .series-count-pill,
      .programs-table .episode-tag-pill {
        padding-top: 1px !important;
        padding-bottom: 1px !important;
      }
      .programs-table tbody td {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
      }

      .programs-table .copy-note-btn {
        display: none !important;
      }
      .programs-table .notes-cell.copy-button-removed {
        gap: 0 !important;
      }

      @media (max-width: 1179px) {
        #controlsPanel .program-type-native-select {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          margin: 0 !important;
          padding: 8px 9px !important;
          border: 1px solid var(--border) !important;
        }
        #controlsPanel .program-type-toggle {
          display: none !important;
        }
        #controlsPanel .cluster-clear-all .reset-all {
          width: auto !important;
          max-width: none !important;
        }
      }

      @media (max-width: 980px) {
        #appShell .topbar-status-inline {
          max-width: 100% !important;
          white-space: normal !important;
        }
        #appShell .program-brand-mark {
          width: 112px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncVisibleVersionFlag() {
    const pill = document.getElementById('appVersion');
    if (pill) pill.textContent = 'v1.5.105';
  }

  function removeVisibleRefreshButton() {
    const refreshButton = document.getElementById('refreshBtn');
    if (!refreshButton) return;
    refreshButton.classList.add('hidden');
    refreshButton.setAttribute('aria-hidden', 'true');
    refreshButton.setAttribute('tabindex', '-1');

    window.setTimeout(() => {
      const currentRefreshButton = document.getElementById('refreshBtn');
      if (currentRefreshButton) currentRefreshButton.remove();
    }, 0);
  }

  function ensureStatusIsInline() {
    const statusLine = document.getElementById('statusLine');
    const versionPill = document.getElementById('appVersion');
    if (!statusLine || !versionPill) return;
    statusLine.classList.add('topbar-status-inline');
    if (statusLine.previousElementSibling !== versionPill) {
      versionPill.insertAdjacentElement('afterend', statusLine);
    }
  }

  function tightenTopbar() {
    removeVisibleRefreshButton();
    ensureStatusIsInline();
  }

  function cleanTypeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function classifyProgramType(value, label = '') {
    const text = `${cleanTypeText(value)} ${cleanTypeText(label)}`;
    if (!text.trim()) return 'all';
    if (text.includes('series')) return 'series';
    if (text.includes('program')) return 'program';
    return '';
  }

  function findProgramTypeValue(mode) {
    const select = document.getElementById('programTypeFilter');
    if (!select || mode === 'all') return '';
    const options = Array.from(select.options || []);
    const exact = options.find((option) => classifyProgramType(option.value, option.textContent) === mode);
    if (exact) return exact.value;
    return mode === 'series' ? 'Series' : 'Program';
  }

  function currentProgramTypeMode() {
    const select = document.getElementById('programTypeFilter');
    if (!select || !select.value) return 'all';
    const selected = select.options?.[select.selectedIndex];
    return classifyProgramType(select.value, selected?.textContent || '') || 'all';
  }

  function updateProgramTypeToggleState() {
    const box = document.querySelector('#controlsPanel .cluster-type');
    const toggle = box?.querySelector('.program-type-toggle');
    if (!toggle) return;
    const current = currentProgramTypeMode();
    toggle.querySelectorAll('[data-program-type-mode]').forEach((button) => {
      const active = button.dataset.programTypeMode === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function ensureProgramTypeToggle() {
    const select = document.getElementById('programTypeFilter');
    const box = document.querySelector('#controlsPanel .cluster-type');
    if (!select || !box) return;

    select.classList.add('program-type-native-select');

    let toggle = box.querySelector('.program-type-toggle');
    if (!toggle) {
      toggle = document.createElement('div');
      toggle.className = 'program-type-toggle';
      toggle.setAttribute('role', 'group');
      toggle.setAttribute('aria-label', 'Program type filter');
      toggle.innerHTML = `
        <button type="button" data-program-type-mode="series" aria-pressed="false">Series</button>
        <button type="button" data-program-type-mode="all" aria-pressed="true">All</button>
        <button type="button" data-program-type-mode="program" aria-pressed="false">Program</button>
      `;
      select.insertAdjacentElement('afterend', toggle);
    }

    if (!toggle.dataset.bound) {
      toggle.dataset.bound = '1';
      toggle.addEventListener('click', (event) => {
        const button = event.target.closest('[data-program-type-mode]');
        if (!button) return;
        const mode = button.dataset.programTypeMode || 'all';
        const nextValue = findProgramTypeValue(mode);
        if (select.value !== nextValue) {
          select.value = nextValue;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        updateProgramTypeToggleState();
      });
    }

    if (!select.dataset.programTypeToggleBound) {
      select.dataset.programTypeToggleBound = '1';
      select.addEventListener('change', updateProgramTypeToggleState);
    }

    updateProgramTypeToggleState();
  }

  function stackClearAllButton() {
    const button = document.getElementById('resetFiltersBtn');
    if (!button) return;
    button.setAttribute('aria-label', 'Clear all filters');
    if (button.dataset.stackedClearAll === '1') return;
    button.dataset.stackedClearAll = '1';
    button.innerHTML = '<span>Clear all</span><span>filters</span>';
  }

  function applyFilterSizingLayout() {
    const cluster = document.querySelector('#controlsPanel .compact-search-cluster');
    if (!cluster) return;

    stackClearAllButton();
    ensureProgramTypeToggle();

    if (!window.matchMedia('(min-width: 1180px)').matches) return;

    setImportant(cluster, 'grid-template-columns', 'minmax(132px,.78fr) minmax(96px,.74fr) minmax(96px,.74fr) minmax(96px,.74fr) minmax(86px,.55fr) minmax(122px,.72fr) minmax(58px,.36fr) minmax(78px,.44fr)');
    setImportant(cluster, 'column-gap', '7px');
    setImportant(cluster, 'row-gap', '8px');

    const placements = [
      ['.cluster-type', '1', '1'],
      ['.cluster-search-text', '2 / span 4', '1'],
      ['.cluster-distributor', '6', '1'],
      ['.cluster-episodes', '7', '1'],
      ['.cluster-clear-all', '8', '1'],
      ['.cluster-search-in', '1', '2'],
      ['.cluster-rights-start', '2 / span 2', '2'],
      ['.cluster-rights-end', '4 / span 2', '2'],
      ['.cluster-status', '6', '2'],
      ['.cluster-rating', '7 / span 2', '2']
    ];

    placements.forEach(([selector, column, row]) => {
      const item = cluster.querySelector(selector);
      if (!item) return;
      setImportant(item, 'grid-column', column);
      setImportant(item, 'grid-row', row);
      setImportant(item, 'min-width', '0');
      setImportant(item, 'max-width', 'none');
    });

    const searchText = cluster.querySelector('.cluster-search-text');
    if (searchText) {
      setImportant(searchText, 'max-width', 'none');
    }

    const distributor = cluster.querySelector('.cluster-distributor');
    if (distributor) {
      setImportant(distributor, 'max-width', '124px');
    }

    const rating = cluster.querySelector('.cluster-rating');
    if (rating) {
      setImportant(rating, 'max-width', 'none');
      setImportant(rating, 'overflow', 'hidden');
    }

    const typeHolder = cluster.querySelector('.cluster-type');
    if (typeHolder) {
      setImportant(typeHolder, 'max-width', '152px');
    }

    const clearHolder = cluster.querySelector('.cluster-clear-all');
    if (clearHolder) {
      setImportant(clearHolder, 'display', 'flex');
      setImportant(clearHolder, 'justify-content', 'center');
      setImportant(clearHolder, 'align-items', 'start');
      setImportant(clearHolder, 'padding-top', '12px');
      setImportant(clearHolder, 'max-width', '80px');
    }
  }

  function removeDescriptionCopyButtons() {
    document.querySelectorAll('#programTableBody .copy-note-btn').forEach((button) => {
      button.remove();
    });
    document.querySelectorAll('#programTableBody .notes-cell').forEach((cell) => {
      cell.classList.add('copy-button-removed');
    });
  }

  function moveQuickAirDatesAfterRating() {
    document.querySelectorAll('#programTableBody tr[data-id]').forEach((row) => {
      const firstCell = row.querySelector('td');
      if (!firstCell) return;
      const ratingRow = firstCell.querySelector(':scope > .program-rating-row, :scope > .program-rating-tools-row .program-rating-row');
      const quickTools = firstCell.querySelector(':scope > .program-inline-tools, :scope > .program-rating-tools-row .program-inline-tools');
      if (!ratingRow || !quickTools) return;

      let holder = firstCell.querySelector(':scope > .program-rating-tools-row');
      if (!holder) {
        holder = document.createElement('div');
        holder.className = 'program-rating-tools-row';
        firstCell.insertBefore(holder, ratingRow);
      }

      if (ratingRow.parentElement !== holder) holder.appendChild(ratingRow);
      if (quickTools.parentElement !== holder) holder.appendChild(quickTools);
    });
  }

  function patchRenderTable() {
    if (window.__wnmuMainUiV15105RenderPatch) return;
    window.__wnmuMainUiV15105RenderPatch = true;

    if (typeof renderTable === 'function') {
      const originalRenderTable = renderTable;
      renderTable = function patchedRenderTable(...args) {
        const result = originalRenderTable.apply(this, args);
        moveQuickAirDatesAfterRating();
        removeDescriptionCopyButtons();
        return result;
      };
    }
  }

  function patchRenderFilters() {
    if (window.__wnmuMainUiV15103FilterPatch) return;
    window.__wnmuMainUiV15103FilterPatch = true;

    if (typeof renderFilters === 'function') {
      const originalRenderFilters = renderFilters;
      renderFilters = function patchedRenderFilters(...args) {
        const result = originalRenderFilters.apply(this, args);
        ensureProgramTypeToggle();
        stackClearAllButton();
        applyFilterSizingLayout();
        return result;
      };
    }
  }

  function enforceUi() {
    syncVisibleVersionFlag();
    injectStyles();
    tightenTopbar();
    ensureProgramTypeToggle();
    stackClearAllButton();
    applyFilterSizingLayout();
    moveQuickAirDatesAfterRating();
    removeDescriptionCopyButtons();
  }

  injectStyles();
  patchRenderTable();
  patchRenderFilters();

  document.addEventListener('DOMContentLoaded', () => {
    enforceUi();
    window.addEventListener('resize', enforceUi);
  });

  if (document.readyState !== 'loading') enforceUi();
  [60, 160, 320, 700, 1300, 1800].forEach((delay) => window.setTimeout(enforceUi, delay));

  window.__wnmuMainLibraryUiVersion = VERSION;
})();
