// v1.5.60 targeted workflow helpers
// Adds/keeps: visible main Library episode-count range filter, Add Program new-tab workflow,
// and one-time BroadcastChannel updates from the standalone Add Program page.

(function () {
  const CHANNEL_NAME = 'wnmu-program-library';
  const STORAGE_EVENT_KEY = 'wnmu-program-library-program-created';
  const PROGRAM_NEW_WINDOW_NAME = 'wnmu-program-new';

  function asNumber(value) {
    const text = (value ?? '').toString().trim();
    if (!text) return null;
    const number = Number(text);
    if (!Number.isFinite(number)) return null;
    const rounded = Math.floor(number);
    return rounded > 0 ? rounded : null;
  }

  function getEpisodeFields() {
    return {
      min: document.getElementById('episodeMinFilter'),
      max: document.getElementById('episodeMaxFilter')
    };
  }

  function getEpisodeBounds() {
    const fields = getEpisodeFields();
    return {
      min: asNumber(fields.min?.value),
      max: asNumber(fields.max?.value)
    };
  }

  function episodeFilterIsActive() {
    const bounds = getEpisodeBounds();
    return bounds.min != null || bounds.max != null;
  }

  function getEpisodeCountForProgram(program) {
    if (typeof extractEpisodeCount === 'function') return extractEpisodeCount(program);

    const raw = (program?.episode_season ?? '').toString().trim();
    if (!raw) return null;
    const slashMatch = raw.match(/\/\s*(\d{1,4})\b/);
    if (slashMatch) return Number(slashMatch[1]);
    const epsMatch = raw.match(/\b(\d{1,4})\s*(?:eps?|episodes?)\b/i);
    if (epsMatch) return Number(epsMatch[1]);
    return /^\d{1,4}$/.test(raw) ? Number(raw) : null;
  }

  function programLooksLikeSeries(program) {
    if (typeof isSeriesProgram === 'function') return isSeriesProgram(program);
    return (program?.program_type ?? '').toString().trim().toLowerCase().includes('series');
  }

  function applyEpisodeRangeFilter(items) {
    if (!episodeFilterIsActive()) return items;
    const bounds = getEpisodeBounds();
    return (items || []).filter((program) => {
      if (!programLooksLikeSeries(program)) return false;
      const count = getEpisodeCountForProgram(program);
      if (!Number.isFinite(count) || count <= 0) return false;
      if (bounds.min != null && count < bounds.min) return false;
      if (bounds.max != null && count > bounds.max) return false;
      return true;
    });
  }

  function triggerLibraryFilterUpdate() {
    if (typeof rememberViewState === 'function') rememberViewState();
    if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
    if (typeof updateQueryStatus === 'function') {
      updateQueryStatus();
      return;
    }
    if (typeof renderTable === 'function') renderTable();
  }

  function clearEpisodeFields(options = {}) {
    const fields = getEpisodeFields();
    if (fields.min) fields.min.value = '';
    if (fields.max) fields.max.value = '';
    if (!options.silent) triggerLibraryFilterUpdate();
  }

  function bindEpisodeFilterUi() {
    const box = document.getElementById('episodeFilterBox');
    if (!box || box.dataset.episodeFilterBound === 'true') return;
    box.dataset.episodeFilterBound = 'true';

    ['episodeMinFilter', 'episodeMaxFilter'].forEach((id) => {
      const input = document.getElementById(id);
      input?.addEventListener('input', triggerLibraryFilterUpdate);
      input?.addEventListener('change', triggerLibraryFilterUpdate);
      input?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        triggerLibraryFilterUpdate();
      });
    });

    document.getElementById('clearEpisodeFilter')?.addEventListener('click', () => clearEpisodeFields());
  }

  function installEpisodeFilterUi() {
    if (!document.getElementById('episodeFilterBox')) {
      const ratingBox = document.querySelector('.cluster-rating') || document.querySelector('.compact-search-cluster');
      if (!ratingBox?.parentElement) return;

      const box = document.createElement('div');
      box.id = 'episodeFilterBox';
      box.className = 'filter-box cluster-episodes';
      box.innerHTML = `
        <div class="filter-label-row">
          <label class="filter-label" for="episodeMinFilter">Episodes</label>
          <button type="button" id="clearEpisodeFilter" class="mini-clear">Clear</button>
        </div>
        <div class="episode-range-filter">
          <input id="episodeMinFilter" type="number" inputmode="numeric" min="1" step="1" placeholder="Min" aria-label="Minimum episode count" />
          <input id="episodeMaxFilter" type="number" inputmode="numeric" min="1" step="1" placeholder="Max" aria-label="Maximum episode count" />
        </div>
        <div class="filter-help">Series only · blank = no limit</div>
      `;

      ratingBox.insertAdjacentElement('afterend', box);
    }

    bindEpisodeFilterUi();
  }

  function openStandaloneAddProgram(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const opened = window.open('program-new.html', PROGRAM_NEW_WINDOW_NAME);
    if (opened) {
      try { opened.focus(); } catch {}
      return;
    }
    window.location.href = 'program-new.html';
  }

  async function fetchCreatedProgram(programId) {
    if (!programId || !state?.supabase) return null;
    const { data, error } = await state.supabase
      .from('programs_enriched')
      .select('*')
      .eq('id', programId)
      .single();
    if (error) throw error;
    return data || null;
  }

  function upsertProgramLocally(program) {
    if (!program?.id || !Array.isArray(state.programs)) return;
    if (typeof applyRatingOverlayToProgram === 'function') applyRatingOverlayToProgram(program);
    const existingIndex = state.programs.findIndex((item) => String(item.id) === String(program.id));
    if (existingIndex >= 0) state.programs[existingIndex] = program;
    else state.programs.unshift(program);

    if (typeof sortProgramsInPlace === 'function') sortProgramsInPlace();
    if (typeof updateProgramDerived === 'function') updateProgramDerived(program);
    else if (typeof recacheProgramDerived === 'function') recacheProgramDerived(state.programs);
    if (state) state.templateSourceDirty = true;
    if (typeof renderStats === 'function') renderStats();
    if (typeof renderFilters === 'function') renderFilters();
    if (typeof renderTable === 'function') renderTable();
    try { if (typeof persistProgramsCache === 'function') persistProgramsCache(); } catch {}
    try { if (typeof snapshotViewState === 'function') state.lastAppliedViewState = snapshotViewState(); } catch {}
  }

  async function handleProgramCreatedMessage(message) {
    if (!message || message.type !== 'program-created') return;
    const title = message.title || 'new program';
    try {
      const program = await fetchCreatedProgram(message.id);
      if (program) upsertProgramLocally(program);
      if (typeof setStatus === 'function') setStatus(`New program saved from Add Program tab: ${title}.`);
    } catch (error) {
      console.warn('Could not fetch new program after BroadcastChannel message:', error);
      if (typeof setStatus === 'function') setStatus(`New program saved: ${title}. Refresh if it does not appear in the list.`);
    }
  }

  function installProgramCreatedListeners() {
    if ('BroadcastChannel' in window && !window.__wnmuProgramLibraryChannel) {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.addEventListener('message', (event) => {
          void handleProgramCreatedMessage(event.data);
        });
        window.__wnmuProgramLibraryChannel = channel;
      } catch (error) {
        console.warn('BroadcastChannel unavailable:', error);
      }
    }

    if (!window.__wnmuProgramCreatedStorageListener) {
      window.__wnmuProgramCreatedStorageListener = true;
      window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
        try {
          const message = JSON.parse(event.newValue);
          void handleProgramCreatedMessage(message);
        } catch (error) {
          console.warn('Could not read Add Program storage notice:', error);
        }
      });
    }
  }

  function installBroadcastListener() {
    installProgramCreatedListeners();
  }

  function installNewProgramButtonOverride() {
    const button = document.getElementById('newProgramBtn');
    if (!button) return;
    button.addEventListener('click', openStandaloneAddProgram, true);
  }

  function installClearAllButtonInCluster() {
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

  function installCompactFilterLayout() {
    if (document.getElementById('wnmuCompactFilterLayoutV159')) return;
    const style = document.createElement('style');
    style.id = 'wnmuCompactFilterLayoutV159';
    style.textContent = `
      @media (min-width: 1180px) {
        #controlsPanel.controls.compact-controls {
          padding-bottom: 10px !important;
        }
        #controlsPanel .filters.filters-grid {
          display: grid !important;
          grid-template-columns:
            minmax(158px, .85fr)
            minmax(166px, .95fr)
            minmax(110px, .52fr)
            minmax(128px, .6fr)
            minmax(520px, 3fr) !important;
          gap: 8px 10px !important;
          align-items: start !important;
          align-content: start !important;
          grid-auto-flow: row !important;
        }
        #controlsPanel .filters.filters-grid > .filter-box,
        #controlsPanel .filters.filters-grid > .filters-cluster {
          min-width: 0 !important;
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
            minmax(100px, 1.2fr)
            minmax(75px, .75fr)
            minmax(78px, .75fr)
            minmax(68px, .58fr)
            minmax(78px, .72fr)
            minmax(72px, .62fr) !important;
          gap: 8px 10px !important;
          align-items: start !important;
          align-content: start !important;
        }
        #controlsPanel .cluster-search-text {
          grid-column: 1 / span 2 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .cluster-distributor {
          grid-column: 3 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .cluster-type {
          grid-column: 4 !important;
          grid-row: 1 !important;
        }
        #controlsPanel .cluster-episodes {
          grid-column: 5 / span 2 !important;
          grid-row: 1 !important;
          align-self: start !important;
          min-width: 0 !important;
        }
        #controlsPanel .cluster-search-in {
          grid-column: 1 / span 2 !important;
          grid-row: 2 !important;
        }
        #controlsPanel .cluster-status {
          grid-column: 3 !important;
          grid-row: 2 !important;
        }
        #controlsPanel .cluster-rating {
          grid-column: 4 !important;
          grid-row: 2 !important;
        }
        #controlsPanel .cluster-clear-all {
          grid-column: 5 / span 2 !important;
          grid-row: 2 !important;
          align-self: end !important;
          display: flex !important;
          justify-content: flex-end !important;
          align-items: end !important;
          min-width: 0 !important;
        }
        #controlsPanel .cluster-clear-all .reset-all {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: 160px !important;
          white-space: nowrap !important;
        }
        #controlsPanel .filter-box.wide,
        #controlsPanel .filters-cluster {
          grid-column: auto !important;
        }
        #controlsPanel .filter-label {
          margin-bottom: 4px !important;
        }
        #controlsPanel .filter-box select,
        #controlsPanel .filter-box input {
          min-width: 0 !important;
          width: 100% !important;
        }
        #controlsPanel .filter-box select[multiple] {
          height: 98px !important;
          min-height: 98px !important;
          max-height: 98px !important;
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
        #controlsPanel .episode-range-filter {
          display: grid !important;
          grid-template-columns: minmax(48px, 1fr) minmax(48px, 1fr) !important;
          gap: 6px !important;
          max-width: 138px !important;
        }
        #controlsPanel #episodeMinFilter,
        #controlsPanel #episodeMaxFilter {
          min-width: 0 !important;
          width: 100% !important;
          padding-left: 7px !important;
          padding-right: 7px !important;
        }
        #controlsPanel .filter-help {
          font-size: .76rem !important;
          color: #5d7184 !important;
          margin-top: 4px !important;
          line-height: 1.15 !important;
        }
        #controlsPanel .filter-foot.hidden {
          display: none !important;
        }
      }

      @media (min-width: 1550px) {
        #controlsPanel .filters.filters-grid {
          grid-template-columns:
            minmax(175px, .88fr)
            minmax(195px, .98fr)
            minmax(120px, .54fr)
            minmax(140px, .62fr)
            minmax(640px, 3.35fr) !important;
        }
        #controlsPanel .filters.filters-grid > .compact-search-cluster,
        #controlsPanel .filters.filters-grid > .filters-cluster.compact-search-cluster {
          grid-template-columns:
            minmax(120px, 1.2fr)
            minmax(88px, .75fr)
            minmax(88px, .75fr)
            minmax(78px, .58fr)
            minmax(92px, .72fr)
            minmax(84px, .62fr) !important;
        }
      }

      @media (max-width: 1179px) {
        #controlsPanel .episode-range-filter {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          gap: 6px !important;
        }
        #controlsPanel .filter-help {
          font-size: .76rem !important;
          color: #5d7184 !important;
          margin-top: 4px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enforceCompactFilterPlacement() {
    const grid = document.querySelector('#controlsPanel .filters.filters-grid');
    if (!grid) return;

    const desktop = window.matchMedia('(min-width: 1180px)').matches;
    const items = Array.from(grid.children);
    const cluster = grid.querySelector('.compact-search-cluster');

    if (!desktop) {
      grid.removeAttribute('style');
      items.forEach((item) => {
        item.style.removeProperty('grid-column');
        item.style.removeProperty('grid-row');
        item.style.removeProperty('width');
      });
      return;
    }

    grid.style.setProperty('display', 'grid', 'important');
    grid.style.setProperty('grid-template-columns', 'minmax(158px,.85fr) minmax(166px,.95fr) minmax(110px,.52fr) minmax(128px,.6fr) minmax(520px,3fr)', 'important');
    grid.style.setProperty('gap', '8px 10px', 'important');
    grid.style.setProperty('align-items', 'start', 'important');
    grid.style.setProperty('align-content', 'start', 'important');

    [[0, '1'], [1, '2'], [2, '3'], [3, '4']].forEach(([index, column]) => {
      if (!items[index]) return;
      items[index].style.setProperty('grid-column', column, 'important');
      items[index].style.setProperty('grid-row', '1', 'important');
      items[index].style.setProperty('min-width', '0', 'important');
    });

    if (cluster) {
      cluster.style.setProperty('grid-column', '5', 'important');
      cluster.style.setProperty('grid-row', '1', 'important');
      cluster.style.setProperty('width', '100%', 'important');
      cluster.style.setProperty('min-width', '0', 'important');
      cluster.style.setProperty('display', 'grid', 'important');
      cluster.style.setProperty('grid-template-columns', 'minmax(100px,1.2fr) minmax(75px,.75fr) minmax(78px,.75fr) minmax(68px,.58fr) minmax(78px,.72fr) minmax(72px,.62fr)', 'important');
      cluster.style.setProperty('gap', '8px 10px', 'important');
      cluster.style.setProperty('align-items', 'start', 'important');
    }
  }

  function patchFilterFunctions() {
    if (window.__wnmuEpisodeFilterPatched) return;
    window.__wnmuEpisodeFilterPatched = true;

    if (typeof activePrograms === 'function') {
      const originalActivePrograms = activePrograms;
      activePrograms = function patchedActivePrograms(...args) {
        return applyEpisodeRangeFilter(originalActivePrograms.apply(this, args));
      };
    }

    if (typeof snapshotViewState === 'function') {
      const originalSnapshotViewState = snapshotViewState;
      snapshotViewState = function patchedSnapshotViewState(...args) {
        const snapshot = originalSnapshotViewState.apply(this, args) || {};
        const fields = getEpisodeFields();
        snapshot.episodeMinFilter = fields.min?.value || '';
        snapshot.episodeMaxFilter = fields.max?.value || '';
        return snapshot;
      };
    }

    if (typeof applySnapshot === 'function') {
      const originalApplySnapshot = applySnapshot;
      applySnapshot = function patchedApplySnapshot(snapshot, ...args) {
        const result = originalApplySnapshot.call(this, snapshot, ...args);
        const fields = getEpisodeFields();
        if (fields.min) fields.min.value = snapshot?.episodeMinFilter || '';
        if (fields.max) fields.max.value = snapshot?.episodeMaxFilter || '';
        if (typeof resetVisibleRowWindow === 'function') resetVisibleRowWindow();
        if (typeof renderTable === 'function') renderTable();
        return result;
      };
    }

    if (typeof resetFilters === 'function') {
      const originalResetFilters = resetFilters;
      resetFilters = function patchedResetFilters(...args) {
        clearEpisodeFields({ silent: true });
        return originalResetFilters.apply(this, args);
      };
    }
  }

  patchFilterFunctions();

  document.addEventListener('DOMContentLoaded', () => {
    installCompactFilterLayout();
    installEpisodeFilterUi();
    installClearAllButtonInCluster();
    enforceCompactFilterPlacement();
    window.addEventListener('resize', enforceCompactFilterPlacement);
    installNewProgramButtonOverride();
    installBroadcastListener();
  });
})();

// v1.5.60 Schedule Planner test-page launcher
(function () {
  const PLANNER_PAGE = 'programming-calendar.html';
  const PLANNER_WINDOW_NAME = 'wnmu-programming-schedule-planner';

  function canShowPlannerButton() {
    try {
      if (typeof canEdit === 'function') return canEdit();
      return Boolean(window.state && window.state.session);
    } catch {
      return false;
    }
  }

  function ensurePlannerButton() {
    if (document.getElementById('schedulePlannerBtn')) return document.getElementById('schedulePlannerBtn');
    const reference = document.getElementById('newProgramBtn') || document.getElementById('monthlyMediaBtn') || document.getElementById('adminBtn');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'schedulePlannerBtn';
    button.className = 'primary hidden';
    button.textContent = 'Schedule planner';
    button.title = 'Open the login-only Schedule Planner test page in a separate tab.';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opened = window.open(PLANNER_PAGE, PLANNER_WINDOW_NAME);
      if (opened) {
        try { opened.focus(); } catch {}
        return;
      }
      window.location.href = PLANNER_PAGE;
    });
    if (reference?.parentElement) reference.insertAdjacentElement('afterend', button);
    else document.body.appendChild(button);
    return button;
  }

  function syncPlannerButton() {
    const button = ensurePlannerButton();
    button.classList.toggle('hidden', !canShowPlannerButton());
  }

  function patchModeUi() {
    if (window.__wnmuSchedulePlannerModePatch) return;
    window.__wnmuSchedulePlannerModePatch = true;
    if (typeof updateModeUI === 'function') {
      const originalUpdateModeUI = updateModeUI;
      updateModeUI = function patchedUpdateModeUI(...args) {
        const result = originalUpdateModeUI.apply(this, args);
        syncPlannerButton();
        return result;
      };
    }
  }

  function bootSchedulePlannerLauncher() {
    patchModeUi();
    syncPlannerButton();
    setTimeout(syncPlannerButton, 250);
    setTimeout(syncPlannerButton, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSchedulePlannerLauncher);
  else bootSchedulePlannerLauncher();
})();
