// v1.5.51 targeted workflow helpers
// Adds: main Library episode-count range filter, Add Program new-tab workflow,
// and one-time BroadcastChannel updates from the standalone Add Program page.

(function () {
  const CHANNEL_NAME = 'wnmu-program-library';
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

  function installEpisodeFilterUi() {
    if (document.getElementById('episodeFilterBox')) return;
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
      <div class="episode-range-filter" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;">
        <input id="episodeMinFilter" type="number" inputmode="numeric" min="1" step="1" placeholder="Min" aria-label="Minimum episode count" />
        <input id="episodeMaxFilter" type="number" inputmode="numeric" min="1" step="1" placeholder="Max" aria-label="Maximum episode count" />
      </div>
      <div class="filter-help" style="font-size:.76rem;color:#5d7184;margin-top:4px;">Series only · blank = no limit</div>
    `;

    ratingBox.insertAdjacentElement('afterend', box);

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

    if (typeof updateProgramDerived === 'function') updateProgramDerived(program);
    else if (typeof recacheProgramDerived === 'function') recacheProgramDerived(state.programs);
    if (state) state.templateSourceDirty = true;
    if (typeof renderStats === 'function') renderStats();
    if (typeof renderFilters === 'function') renderFilters();
    if (typeof renderTable === 'function') renderTable();
    try { if (typeof persistProgramsCache === 'function') persistProgramsCache(); } catch {}
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

  function installBroadcastListener() {
    if (!('BroadcastChannel' in window)) return;
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

  function installNewProgramButtonOverride() {
    const button = document.getElementById('newProgramBtn');
    if (!button) return;
    button.addEventListener('click', openStandaloneAddProgram, true);
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
    installEpisodeFilterUi();
    installNewProgramButtonOverride();
    installBroadcastListener();
  });
})();
