// WNMU Programming Library split workspace
// v1.5.125 — deterministic workspace workflow and filter layout.
(function () {
  'use strict';

  const WORKSPACE_KEY = 'wnmu-programming-workspace-left-width';
  const FILTERS_COLLAPSED_KEY = 'wnmu-programming-workspace-filters-collapsed';
  const WORKSPACE_STACK_QUERY = '(max-width: 1180px)';
  const WORKSPACE_NARROW_QUERY = '(max-width: 780px)';
  const DEFAULT_LEFT_WIDTH = 58;
  let shellInstalled = false;
  let splitterInstalled = false;
  let responsiveModeInstalled = false;
  let workspaceOpeningDefaultEditor = false;

  function pct(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_LEFT_WIDTH;
    return Math.max(42, Math.min(74, n));
  }

  function getStoredLeftWidth() {
    try { return pct(window.localStorage?.getItem(WORKSPACE_KEY)); }
    catch { return DEFAULT_LEFT_WIDTH; }
  }

  function setLeftWidth(value) {
    const width = pct(value);
    document.documentElement.style.setProperty('--workspace-left-width', `${width}%`);
    try { window.localStorage?.setItem(WORKSPACE_KEY, String(width)); } catch {}
  }

  function mediaMatches(query, fallbackWidth) {
    try {
      if (window.matchMedia) return window.matchMedia(query).matches;
    } catch {}
    return Number(window.innerWidth || 0) <= fallbackWidth;
  }

  function isStackedWorkspace() {
    return mediaMatches(WORKSPACE_STACK_QUERY, 1180);
  }

  function isNarrowWorkspace() {
    return mediaMatches(WORKSPACE_NARROW_QUERY, 780);
  }

  function updateResponsiveNavButtons() {
    const showingEditor = document.body.classList.contains('workspace-show-editor');
    document.getElementById('workspaceShowLibraryBtn')?.classList.toggle('active', !showingEditor);
    document.getElementById('workspaceShowEditorBtn')?.classList.toggle('active', showingEditor);
  }

  function setWorkspaceActivePanel(panel) {
    const showEditor = panel === 'editor';
    document.body.classList.toggle('workspace-show-editor', showEditor);
    document.body.classList.toggle('workspace-show-library', !showEditor);
    updateResponsiveNavButtons();
  }

  function syncWorkspaceResponsiveMode() {
    const narrow = isNarrowWorkspace();
    document.body.classList.toggle('workspace-stacked', isStackedWorkspace());
    document.body.classList.toggle('workspace-narrow', narrow);
    if (!narrow) {
      document.body.classList.remove('workspace-show-editor', 'workspace-show-library');
    } else if (!document.body.classList.contains('workspace-show-editor') && !document.body.classList.contains('workspace-show-library')) {
      setWorkspaceActivePanel('library');
    }
    updateResponsiveNavButtons();
  }

  function installWorkspaceResponsiveMode() {
    if (responsiveModeInstalled) {
      syncWorkspaceResponsiveMode();
      return;
    }
    responsiveModeInstalled = true;
    window.addEventListener('resize', () => window.requestAnimationFrame(syncWorkspaceResponsiveMode));
    window.addEventListener('orientationchange', () => window.setTimeout(syncWorkspaceResponsiveMode, 80));
    syncWorkspaceResponsiveMode();
  }

  function isWorkspaceAdmin() {
    return Boolean(window.WNMU_WORKSPACE_TEST && typeof canEdit === 'function' && canEdit());
  }

  function injectWorkspaceStyles() {
    if (document.getElementById('wnmuWorkspaceTestStyles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuWorkspaceTestStyles';
    style.textContent = `
      :root { --workspace-left-width: ${getStoredLeftWidth()}%; }
      body.workspace-test-page { background: linear-gradient(180deg, #f1fdfb 0%, #daf6f3 48%, #edf5f7 100%); }
      body.workspace-test-page .workspace-programming-icon {
        width: 74px !important;
        max-width: 74px !important;
        aspect-ratio: 1 / 1 !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 18px rgba(9,29,48,.14) !important;
        object-fit: contain !important;
        background: #fff !important;
      }
      body.workspace-test-page .auth-logo.workspace-programming-icon {
        width: 132px !important;
        max-width: 132px !important;
      }
      body.workspace-test-page #appTitle { white-space: nowrap; }
      body.workspace-test-page .workspace-test-pill {
        background: rgba(255,255,255,.82) !important;
        color: #536d82 !important;
        border-color: rgba(18,134,127,.18) !important;
      }
      body.workspace-test-page .topbar {
        min-height: 78px !important;
        padding: 8px 12px !important;
        gap: 10px !important;
      }
      body.workspace-test-page .brand-wrap { min-width: 0 !important; gap: 10px !important; }
      body.workspace-test-page .brand-name { font-size: .92rem !important; line-height: 1.05 !important; }
      body.workspace-test-page #appTitle { font-size: 1.24rem !important; line-height: 1 !important; }
      body.workspace-test-page .topbar-status-inline {
        max-width: min(42vw, 640px) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      body.workspace-test-page #workspaceResponsiveNav {
        display: none;
        gap: 6px;
        align-items: center;
        padding: 0 2px;
        min-width: 0;
      }
      body.workspace-test-page #workspaceResponsiveNav .workspace-responsive-btn {
        flex: 1 1 0;
        min-width: 0;
        min-height: 34px;
        border-radius: 999px;
        font-size: .82rem;
        font-weight: 700;
      }
      body.workspace-test-page #workspaceResponsiveNav .workspace-responsive-btn.active {
        background: var(--teal, #008f8c);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 7px 16px rgba(0,143,140,.22);
      }

      body.workspace-test-page #appShell.workspace-layout {
        height: 100dvh !important;
        min-height: 100dvh !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        gap: 8px !important;
        overflow: hidden !important;
        padding: 8px !important;
      }
      body.workspace-test-page #workspaceSplitGrid {
        min-height: 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 0;
        overflow: hidden;
      }
      body.workspace-test-page #workspaceSplitGrid {
        grid-template-columns: minmax(420px, var(--workspace-left-width)) 8px minmax(360px, 1fr);
      }
      body.workspace-test-page #workspaceLibraryPane,
      body.workspace-test-page #workspaceEditorPane {
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }
      body.workspace-test-page #workspaceLibraryPane {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 6px;
      }
      body.workspace-test-page #workspaceEditorPane {
        display: none;
        background: rgba(255,255,255,.74);
        border: 1px solid rgba(18,134,127,.18);
        border-radius: 0 16px 16px 0;
        box-shadow: 0 10px 28px rgba(12,39,68,.10);
      }
      body.workspace-test-page #workspaceEditorPane { display: block; }
      body.workspace-test-page #workspaceSplitter {
        display: none;
        width: 8px;
        cursor: col-resize;
        background: linear-gradient(90deg, transparent, rgba(0,143,140,.22), transparent);
        border-top: 1px solid rgba(18,134,127,.18);
        border-bottom: 1px solid rgba(18,134,127,.18);
      }
      body.workspace-test-page #workspaceSplitter { display: block; }
      body.workspace-test-page #workspaceSplitter::before {
        content: '';
        display: block;
        width: 3px;
        height: 48px;
        margin: calc(50vh - 92px) auto 0;
        border-radius: 5px;
        background: rgba(0,76,94,.35);
      }

      body.workspace-test-page #drawerBackdrop { display: none !important; }
      body.workspace-test-page #editorDrawer {
        position: relative !important;
        inset: auto !important;
        left: auto !important;
        top: auto !important;
        transform: none !important;
        z-index: auto !important;
        display: block;
        width: 100% !important;
        max-width: none !important;
        height: 100% !important;
        max-height: none !important;
        padding: 10px !important;
        overflow: auto !important;
        border: 0 !important;
        border-radius: 0 16px 16px 0 !important;
        box-shadow: none !important;
        background: rgba(255,255,255,.96) !important;
      }
      body.workspace-test-page #editorDrawer.hidden { display: none !important; }
      body.workspace-test-page #editorDrawer .drawer-header {
        position: sticky !important;
        top: -10px !important;
        z-index: 3 !important;
        margin: 0 0 8px 0 !important;
        padding: 8px 8px 9px !important;
        border-bottom: 1px solid rgba(18,134,127,.16) !important;
        background: rgba(255,255,255,.98) !important;
      }
      body.workspace-test-page #drawerTitle {
        font-size: 1.04rem !important;
        line-height: 1.05 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      body.workspace-test-page #closeDrawerBtn { font-size: .76rem !important; padding: 6px 9px !important; }
      body.workspace-test-page #editorDrawer .program-form { gap: 7px !important; }
      body.workspace-test-page #editorDrawer .form-grid {
        grid-template-columns: minmax(0, 1.75fr) minmax(120px, .7fr) minmax(64px, .36fr) minmax(70px, .36fr) !important;
        gap: 7px 8px !important;
      }
      body.workspace-test-page #editorDrawer .program-form label { gap: 3px !important; font-size: .78rem !important; }
      body.workspace-test-page #editorDrawer .program-form input,
      body.workspace-test-page #editorDrawer .program-form select,
      body.workspace-test-page #editorDrawer .program-form textarea {
        padding: 6px 8px !important;
        min-height: 32px !important;
        border-radius: 9px !important;
        font-size: .84rem !important;
      }
      body.workspace-test-page #editorDrawer textarea[name="notes"] { min-height: 58px !important; rows: 2; }
      body.workspace-test-page #editorDrawer textarea[name="rights_notes"] { min-height: 32px !important; }
      body.workspace-test-page #editorDrawer .lookup-tools,
      body.workspace-test-page #editorDrawer .template-tools { grid-template-columns: minmax(0,1fr) auto !important; gap: 6px !important; }
      body.workspace-test-page #editorDrawer .program-rights-row {
        grid-template-columns: minmax(110px, .8fr) minmax(92px, .64fr) minmax(86px,.52fr) minmax(86px,.52fr) !important;
        gap: 7px !important;
      }
      body.workspace-test-page #editorDrawer .compact-form-row {
        grid-template-columns: minmax(80px,.6fr) minmax(122px,.95fr) minmax(54px,.35fr) minmax(74px,.5fr) minmax(74px,.5fr) minmax(76px,.55fr) minmax(76px,.55fr) !important;
        gap: 7px !important;
      }
      body.workspace-test-page #editorDrawer .editor-rating-row { margin: 0 !important; }
      body.workspace-test-page #editorDrawer .editor-star-rating { min-height: 32px !important; padding: 4px 8px !important; }
      body.workspace-test-page #editorDrawer .star-rating-btn { font-size: 1.05rem !important; padding: 0 2px !important; }
      body.workspace-test-page #editorDrawer .rating-help { display: none !important; }
      body.workspace-test-page #editorDrawer .drawer-actions { margin-top: 8px !important; gap: 6px !important; }
      body.workspace-test-page #editorDrawer .drawer-actions button { padding: 7px 10px !important; font-size: .82rem !important; }

      body.workspace-test-page #controlsPanel {
        padding: 7px !important;
        overflow: visible !important;
      }
      body.workspace-test-page #quickStrip.quick-strip {
        display: grid !important;
        grid-template-columns: repeat(11, minmax(0, 1fr)) !important;
        gap: 4px !important;
        margin: 0 0 5px 0 !important;
      }
      body.workspace-test-page #quickStrip .quick-card,
      body.workspace-test-page #quickStrip .stat-card {
        min-width: 0 !important;
        min-height: 44px !important;
        height: 44px !important;
        padding: 4px 5px !important;
        border-radius: 9px !important;
        overflow: hidden !important;
      }
      body.workspace-test-page #quickStrip .stat-label { font-size: .55rem !important; line-height: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      body.workspace-test-page #quickStrip .stat-value { font-size: .8rem !important; line-height: 1.05 !important; white-space: normal !important; }
      body.workspace-test-page #quickStrip .stat-value.small { font-size: .68rem !important; }
      body.workspace-test-page #controlsPanel .filters-grid {
        grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(78px,.42fr) minmax(78px,.42fr) !important;
        gap: 6px !important;
      }
      body.workspace-test-page #controlsPanel select[multiple] { min-height: 70px !important; max-height: 70px !important; }
      body.workspace-test-page #controlsPanel .filter-box { gap: 3px !important; }
      body.workspace-test-page #controlsPanel .filter-label { font-size: .66rem !important; }
      body.workspace-test-page #controlsPanel input,
      body.workspace-test-page #controlsPanel select,
      body.workspace-test-page #controlsPanel button { font-size: .74rem !important; min-height: 28px !important; padding: 4px 7px !important; }
      body.workspace-test-page #controlsPanel .filters-cluster { gap: 6px !important; }
      body.workspace-test-page #listPanel {
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        overflow: hidden !important;
      }
      body.workspace-test-page #listPanel .table-wrap { height: 100% !important; overflow: auto !important; }
      body.workspace-test-page .programs-table { min-width: 0 !important; width: 100% !important; table-layout: fixed !important; }
      body.workspace-test-page .programs-table th,
      body.workspace-test-page .programs-table td { padding: 6px 7px !important; font-size: .78rem !important; }
      body.workspace-test-page .programs-table th:nth-child(6), body.workspace-test-page .programs-table td:nth-child(6),
      body.workspace-test-page .programs-table th:nth-child(8), body.workspace-test-page .programs-table td:nth-child(8),
      body.workspace-test-page .programs-table th:nth-child(9), body.workspace-test-page .programs-table td:nth-child(9) { display: none !important; }
      body.workspace-test-page .programs-table .col-title { width: 25% !important; }
      body.workspace-test-page .programs-table .col-notes { width: 27% !important; }
      body.workspace-test-page .programs-table .col-details { width: 12% !important; }
      body.workspace-test-page .programs-table .col-airing { width: 12% !important; }
      body.workspace-test-page .programs-table .col-rights { width: 12% !important; }
      body.workspace-test-page .programs-table td:nth-child(4),
      body.workspace-test-page .programs-table td:nth-child(5) {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        line-height: 1.18 !important;
      }



      body.workspace-test-page #undoViewBtn.removed-control,
      body.workspace-test-page #undoViewBtn { display: none !important; }
      body.workspace-test-page #statusLine.topbar-status-inline {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      body.workspace-test-page .workspace-test-pill { display: none !important; }
      body.workspace-test-page #quickStrip.quick-strip {
        display: grid !important;
        grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
        gap: 4px !important;
        margin: 0 0 5px 0 !important;
        min-width: 0 !important;
      }
      body.workspace-test-page.workspace-admin #quickStrip.quick-strip {
        grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
      }
      body.workspace-test-page #quickStrip .quick-card,
      body.workspace-test-page #quickStrip .stat-card {
        min-width: 0 !important;
        min-height: 38px !important;
        height: 38px !important;
        padding: 3px 5px !important;
        border-radius: 9px !important;
        overflow: hidden !important;
      }
      body.workspace-test-page #quickStrip .stat-label { font-size: .54rem !important; line-height: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      body.workspace-test-page #quickStrip .stat-value { font-size: .78rem !important; line-height: 1.05 !important; white-space: normal !important; }
      body.workspace-test-page #quickStrip .stat-value.small { font-size: .68rem !important; }
      body.workspace-test-page #quickStrip .admin-diagnostic-card { display: none !important; }
      body.workspace-test-page.workspace-admin #quickStrip .admin-diagnostic-card { display: block !important; }
      body.workspace-test-page #quickStrip .stat-shadow { display: none !important; }

      body.workspace-test-page #controlsPanel {
        padding: 6px !important;
        overflow: visible !important;
      }
      body.workspace-test-page #controlsPanel .filters-grid,
      body.workspace-test-page #controlsPanel .compact-search-cluster {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      body.workspace-test-page #controlsPanel select[multiple] { min-height: 66px !important; max-height: 66px !important; height: 66px !important; }
      body.workspace-test-page #controlsPanel .filter-box { min-width: 0 !important; gap: 3px !important; }
      body.workspace-test-page #controlsPanel .filter-label { font-size: .65rem !important; }
      body.workspace-test-page #controlsPanel .filter-label-row { min-width: 0 !important; gap: 3px !important; align-items: center !important; }
      body.workspace-test-page #controlsPanel .mini-clear { padding: 2px 6px !important; font-size: .66rem !important; line-height: 1 !important; }
      body.workspace-test-page #controlsPanel input,
      body.workspace-test-page #controlsPanel select,
      body.workspace-test-page #controlsPanel button { font-size: .73rem !important; min-height: 27px !important; padding: 4px 7px !important; }
      body.workspace-test-page #controlsPanel input,
      body.workspace-test-page #controlsPanel select,
      body.workspace-test-page #controlsPanel .filter-box,
      body.workspace-test-page #controlsPanel .filters-cluster,
      body.workspace-test-page #controlsPanel .compact-search-cluster > .filter-box {
        min-width: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #searchInput {
        inline-size: 100% !important;
        min-inline-size: 0 !important;
        max-inline-size: 100% !important;
      }
      body.workspace-test-page #controlsPanel .cluster-search-text {
        min-width: 0 !important;
        overflow: hidden !important;
      }
      body.workspace-test-page #controlsPanel .cluster-clear-all {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        align-items: stretch !important;
        align-self: start !important;
        padding-top: 0 !important;
      }
      body.workspace-test-page #controlsPanel .cluster-clear-all-spacer {
        visibility: hidden !important;
        white-space: nowrap !important;
      }
      body.workspace-test-page #controlsPanel .cluster-clear-all .reset-all {
        width: 100% !important;
        min-width: 0 !important;
        white-space: nowrap !important;
      }
      body.workspace-test-page #controlsPanel .compact-search-cluster {
        contain: layout style !important;
      }

      /* v1.5.125 modular filter-control layout */
      body.workspace-test-page #controlsPanel .filters-grid > .filter-box:nth-child(-n+4) .filter-label-row {
        align-items: flex-start !important;
        margin-bottom: 2px !important;
      }
      body.workspace-test-page #controlsPanel .filters-grid > .filter-box:nth-child(-n+4) .filter-label-row > .filter-label {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      body.workspace-test-page #controlsPanel .filters-grid > .filter-box:nth-child(-n+4) .filter-label-actions {
        gap: 3px !important;
        transform: translateY(-2px) !important;
      }
      body.workspace-test-page #controlsPanel .filters-grid > .filter-box:nth-child(-n+4) .filter-label-actions .mini-clear {
        min-height: 22px !important;
        height: 22px !important;
        padding: 2px 4px !important;
        font-size: .61rem !important;
        line-height: 1 !important;
        border-radius: 8px !important;
      }
      body.workspace-test-page #controlsPanel .program-type-toggle {
        width: 100% !important;
        max-width: 100% !important;
        grid-template-columns: minmax(0, 1fr) minmax(26px, .5fr) minmax(34px, .72fr) !important;
      }
      body.workspace-test-page #controlsPanel .program-type-toggle button {
        padding-left: 2px !important;
        padding-right: 2px !important;
        font-size: .65rem !important;
        font-weight: 700 !important;
        letter-spacing: 0 !important;
      }
      body.workspace-test-page #controlsPanel .program-type-toggle button[data-program-type-mode="all"] {
        font-size: .62rem !important;
        font-weight: 650 !important;
      }
      body.workspace-test-page #controlsPanel .cluster-episodes .episode-range-filter,
      body.workspace-test-page #controlsPanel .cluster-rights-end .rights-end-filter {
        display: grid !important;
        grid-template-columns: minmax(46px, 1fr) minmax(46px, 1fr) auto !important;
        gap: 5px !important;
        align-items: stretch !important;
        min-width: 0 !important;
        width: 100% !important;
      }
      body.workspace-test-page #controlsPanel .cluster-rights-end .rights-end-filter {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }
      body.workspace-test-page #controlsPanel #clearEpisodeFilter,
      body.workspace-test-page #controlsPanel #clearRightsWindowFilter,
      body.workspace-test-page #controlsPanel .cluster-clear-all .reset-all {
        min-height: 27px !important;
        height: 27px !important;
        padding: 4px 7px !important;
        align-self: stretch !important;
        white-space: nowrap !important;
      }
      body.workspace-test-page #workspaceActiveScopeBox,
      body.workspace-test-page #workspaceActiveScopeFilter {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      body.workspace-test-page #secondaryTopicFilter.workspace-native-secondary-select { display: none !important; }
      body.workspace-test-page #secondaryTopicChecklist {
        height: 66px !important;
        max-height: 66px !important;
        overflow: auto !important;
        padding: 4px 5px !important;
        border: 1px solid rgba(12, 78, 97, .22) !important;
        border-radius: 9px !important;
        background: #fff !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #secondaryTopicChecklist .workspace-check-row {
        display: grid !important;
        grid-template-columns: 14px minmax(0, 1fr) !important;
        gap: 5px !important;
        align-items: start !important;
        margin: 0 0 3px 0 !important;
        font-size: .72rem !important;
        line-height: 1.12 !important;
        cursor: pointer !important;
      }
      body.workspace-test-page #secondaryTopicChecklist .workspace-check-row input {
        width: 13px !important;
        min-height: 13px !important;
        height: 13px !important;
        margin: 1px 0 0 0 !important;
        padding: 0 !important;
      }
      body.workspace-test-page #secondaryTopicChecklist .workspace-check-text {
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
        line-height: 1.12 !important;
      }

      body.workspace-test-page #controlsPanel .filter-label-actions {
        display: inline-flex !important;
        gap: 3px !important;
        align-items: center !important;
        margin-left: auto !important;
        min-width: 0 !important;
      }
      body.workspace-test-page #controlsPanel .workspace-select-all-filter {
        white-space: nowrap !important;
      }
      body.workspace-test-page #controlsPanel select.workspace-native-multi-select {
        display: none !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-dropdown {
        position: relative !important;
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-toggle {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 29px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 7px !important;
        padding: 4px 8px !important;
        border: 1px solid rgba(12, 78, 97, .24) !important;
        border-radius: 9px !important;
        background: #fff !important;
        color: #173646 !important;
        text-align: left !important;
        font-weight: 650 !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-toggle::after {
        content: '▾';
        flex: 0 0 auto;
        color: #58727d;
        font-size: .78rem;
        line-height: 1;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-toggle[aria-expanded="true"]::after { content: '▴'; }
      body.workspace-test-page #controlsPanel .workspace-multi-toggle-text {
        min-width: 0 !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-panel {
        position: absolute !important;
        top: calc(100% + 3px) !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 50 !important;
        max-height: min(240px, 42vh) !important;
        overflow: auto !important;
        padding: 6px !important;
        border: 1px solid rgba(12, 78, 97, .28) !important;
        border-radius: 10px !important;
        background: #fff !important;
        box-shadow: 0 14px 28px rgba(12, 39, 68, .18) !important;
        box-sizing: border-box !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-panel.hidden { display: none !important; }
      body.workspace-test-page #controlsPanel .workspace-multi-row {
        display: grid !important;
        grid-template-columns: 14px minmax(0, 1fr) !important;
        gap: 6px !important;
        align-items: start !important;
        margin: 0 0 4px 0 !important;
        padding: 2px 1px !important;
        border-radius: 6px !important;
        font-size: .73rem !important;
        line-height: 1.12 !important;
        cursor: pointer !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-row:hover {
        background: rgba(18, 134, 127, .08) !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-row input {
        width: 13px !important;
        min-height: 13px !important;
        height: 13px !important;
        margin: 1px 0 0 0 !important;
        padding: 0 !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-text {
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
        line-height: 1.12 !important;
      }
      body.workspace-test-page #controlsPanel .workspace-multi-empty {
        color: #667b86 !important;
        font-size: .74rem !important;
        padding: 4px 2px !important;
      }



      body.workspace-test-page #controlsPanel .workspace-filter-toggle-row {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        gap: 7px !important;
        align-items: center !important;
        margin: 0 0 5px 0 !important;
        min-width: 0 !important;
      }
      body.workspace-test-page #workspaceFilterToggleBtn {
        min-height: 28px !important;
        padding: 4px 9px !important;
        border-radius: 999px !important;
        font-size: .74rem !important;
        white-space: nowrap !important;
      }
      body.workspace-test-page #workspaceActiveFilters {
        min-width: 0 !important;
        max-width: 100% !important;
        height: 28px !important;
        line-height: 28px !important;
        padding: 0 9px !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        border: 1px solid rgba(18,134,127,.17) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,.72) !important;
        color: #335b67 !important;
        font-size: .73rem !important;
      }
      body.workspace-test-page #workspaceFilterBody {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed #workspaceFilterBody,
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed #quickStrip,
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed .filters-grid,
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed .filter-foot {
        display: none !important;
      }
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed {
        padding: 6px !important;
      }
      body.workspace-test-page #controlsPanel.workspace-filters-collapsed .workspace-filter-toggle-row {
        margin-bottom: 0 !important;
      }


      body.workspace-test-page #workspaceEditorEmpty {
        height: 100%;
        min-height: 220px;
        display: grid;
        place-items: center;
        padding: 18px;
        color: #365f6e;
        text-align: center;
        background: rgba(255,255,255,.82);
        border-radius: 0 16px 16px 0;
      }
      body.workspace-test-page.workspace-editor-open #workspaceEditorEmpty,
      body.workspace-test-page.workspace-admin #workspaceEditorEmpty { display: none !important; }
      body.workspace-test-page #workspaceEditorEmpty .workspace-empty-card {
        max-width: 360px;
        padding: 18px 20px;
        border: 1px solid rgba(18,134,127,.18);
        border-radius: 16px;
        background: rgba(255,255,255,.9);
        box-shadow: 0 10px 24px rgba(12,39,68,.09);
      }
      body.workspace-test-page #workspaceEditorEmpty .workspace-empty-title {
        font-weight: 800;
        font-size: 1rem;
        margin-bottom: 6px;
        color: #12384a;
      }
      body.workspace-test-page #workspaceEditorEmpty .workspace-empty-text {
        font-size: .86rem;
        line-height: 1.35;
      }

      @media (max-width: 1180px) {
        body.workspace-test-page #appShell.workspace-layout {
          height: auto !important;
          min-height: 100dvh !important;
          overflow: visible !important;
          grid-template-rows: auto minmax(0, 1fr) !important;
        }
        body.workspace-test-page #workspaceSplitGrid {
          grid-template-columns: 1fr !important;
          grid-template-rows: auto auto !important;
          gap: 8px !important;
          overflow: visible !important;
        }
        body.workspace-test-page #workspaceSplitter { display: none !important; }
        body.workspace-test-page #workspaceLibraryPane {
          min-height: 0 !important;
          overflow: visible !important;
          grid-template-rows: auto auto minmax(360px, 62vh) !important;
        }
        body.workspace-test-page #workspaceEditorPane {
          border-radius: 16px !important;
          overflow: visible !important;
        }
        body.workspace-test-page #editorDrawer {
          border-radius: 16px !important;
          height: auto !important;
          max-height: none !important;
        }
        body.workspace-test-page #listPanel .table-wrap { max-height: 62vh !important; }
        body.workspace-test-page #quickStrip.quick-strip { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
      }

      @media (max-width: 780px) {
        body.workspace-test-page #appShell.workspace-layout {
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          grid-template-rows: auto auto minmax(0, 1fr) !important;
        }
        body.workspace-test-page #workspaceResponsiveNav { display: flex !important; }
        body.workspace-test-page #workspaceSplitGrid {
          grid-template-columns: 1fr !important;
          grid-template-rows: minmax(0, 1fr) !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        body.workspace-test-page #workspaceLibraryPane,
        body.workspace-test-page #workspaceEditorPane {
          min-height: 0 !important;
          overflow: hidden !important;
        }
        body.workspace-narrow:not(.workspace-show-editor) #workspaceEditorPane { display: none !important; }
        body.workspace-narrow.workspace-show-editor #workspaceLibraryPane { display: none !important; }
        body.workspace-test-page #workspaceLibraryPane {
          grid-template-rows: auto auto minmax(0, 1fr) !important;
        }
        body.workspace-test-page #listPanel .table-wrap {
          height: 100% !important;
          max-height: none !important;
        }
        body.workspace-test-page #workspaceEditorPane {
          border-radius: 16px !important;
          height: 100% !important;
        }
        body.workspace-test-page #editorDrawer {
          border-radius: 16px !important;
          height: 100% !important;
          max-height: none !important;
          overflow: auto !important;
        }
        body.workspace-test-page #quickStrip.quick-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        body.workspace-test-page #controlsPanel .filters-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
      }
    `;
    document.head.appendChild(style);
    setLeftWidth(getStoredLeftWidth());
  }

  function installWorkspaceShell() {
    if (shellInstalled) return;
    const appShell = document.getElementById('appShell');
    const topbar = appShell?.querySelector('.topbar');
    const mobileNav = document.getElementById('mobileSectionNav');
    const controls = document.getElementById('controlsPanel');
    const list = document.getElementById('listPanel');
    const drawer = document.getElementById('editorDrawer');
    if (!appShell || !topbar || !controls || !list || !drawer) return;

    const grid = document.createElement('main');
    grid.id = 'workspaceSplitGrid';
    grid.setAttribute('aria-label', 'Programming workspace');

    const libraryPane = document.createElement('section');
    libraryPane.id = 'workspaceLibraryPane';
    libraryPane.setAttribute('aria-label', 'Program Library');

    const splitter = document.createElement('div');
    splitter.id = 'workspaceSplitter';
    splitter.setAttribute('aria-hidden', 'true');

    const editorPane = document.createElement('section');
    editorPane.id = 'workspaceEditorPane';
    editorPane.setAttribute('aria-label', 'Program details or add/edit form');

    const editorEmpty = document.createElement('div');
    editorEmpty.id = 'workspaceEditorEmpty';
    editorEmpty.innerHTML = '<div class="workspace-empty-card"><div class="workspace-empty-title">Select a program to see details</div><div class="workspace-empty-text">The Library list controls what appears here. Admin users can also add or edit programs in this panel.</div></div>';

    if (mobileNav) libraryPane.appendChild(mobileNav);
    libraryPane.appendChild(controls);
    libraryPane.appendChild(list);
    editorPane.appendChild(editorEmpty);
    editorPane.appendChild(drawer);
    grid.appendChild(libraryPane);
    grid.appendChild(splitter);
    grid.appendChild(editorPane);

    const responsiveNav = document.createElement('nav');
    responsiveNav.id = 'workspaceResponsiveNav';
    responsiveNav.setAttribute('aria-label', 'Workspace view');
    responsiveNav.innerHTML = '<button type="button" id="workspaceShowLibraryBtn" class="workspace-responsive-btn active">Library</button><button type="button" id="workspaceShowEditorBtn" class="workspace-responsive-btn">Details / Add</button>';

    topbar.insertAdjacentElement('afterend', responsiveNav);
    responsiveNav.insertAdjacentElement('afterend', grid);

    document.getElementById('workspaceShowLibraryBtn')?.addEventListener('click', () => setWorkspaceActivePanel('library'));
    document.getElementById('workspaceShowEditorBtn')?.addEventListener('click', () => setWorkspaceActivePanel('editor'));

    appShell.classList.add('workspace-layout');
    shellInstalled = true;
    installWorkspaceResponsiveMode();
  }

  function installSplitter() {
    if (splitterInstalled) return;
    const splitter = document.getElementById('workspaceSplitter');
    const grid = document.getElementById('workspaceSplitGrid');
    if (!splitter || !grid) return;
    splitterInstalled = true;

    let dragging = false;
    const start = (event) => {
      if (isStackedWorkspace()) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      splitter.setPointerCapture?.(event.pointerId);
      document.body.classList.add('workspace-dragging');
      event.preventDefault();
    };
    const move = (event) => {
      if (!dragging) return;
      const rect = grid.getBoundingClientRect();
      if (!rect.width) return;
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(next);
      event.preventDefault();
    };
    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      splitter.releasePointerCapture?.(event.pointerId);
      document.body.classList.remove('workspace-dragging');
    };
    splitter.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }



  function setWorkspaceImportant(el, property, value) {
    if (!el) return;
    el.style.setProperty(property, value, 'important');
  }

  function placeGridItem(el, column, row) {
    if (!el) return;
    setWorkspaceImportant(el, 'grid-column', column);
    setWorkspaceImportant(el, 'grid-row', row);
    setWorkspaceImportant(el, 'min-width', '0');
    setWorkspaceImportant(el, 'max-width', '100%');
    setWorkspaceImportant(el, 'width', '100%');
  }

  function applyWorkspaceFilterLayout() {
    const controls = document.getElementById('controlsPanel');
    const grid = controls?.querySelector('.filters.filters-grid');
    const cluster = controls?.querySelector('.compact-search-cluster');
    if (!controls || !grid || !cluster) return;

    const width = Math.max(0, Math.floor(controls.getBoundingClientRect().width || controls.clientWidth || 0));
    const gridChildren = Array.from(grid.children);
    const compact = width && width < 560;

    setWorkspaceImportant(controls, 'overflow', 'visible');
    setWorkspaceImportant(grid, 'display', 'grid');
    setWorkspaceImportant(grid, 'width', '100%');
    setWorkspaceImportant(grid, 'min-width', '0');
    setWorkspaceImportant(grid, 'gap', '5px 6px');
    setWorkspaceImportant(grid, 'align-items', 'start');
    setWorkspaceImportant(grid, 'align-content', 'start');
    setWorkspaceImportant(grid, 'grid-auto-flow', 'row');
    setWorkspaceImportant(grid, 'grid-template-columns', compact
      ? 'minmax(0, 1fr) minmax(0, 1fr)'
      : 'minmax(112px, .72fr) minmax(120px, .78fr) minmax(92px, .50fr) minmax(88px, .48fr)');

    if (compact) {
      placeGridItem(gridChildren[0], '1', '1');
      placeGridItem(gridChildren[1], '2', '1');
      placeGridItem(gridChildren[2], '1', '2');
      placeGridItem(gridChildren[3], '2', '2');
      placeGridItem(cluster, '1 / -1', '3');
    } else {
      placeGridItem(gridChildren[0], '1', '1');
      placeGridItem(gridChildren[1], '2', '1');
      placeGridItem(gridChildren[2], '3', '1');
      placeGridItem(gridChildren[3], '4', '1');
      placeGridItem(cluster, '1 / -1', '2');
    }

    const multiSelects = controls.querySelectorAll('.filters-grid > .filter-box select[multiple]');
    multiSelects.forEach((select) => {
      setWorkspaceImportant(select, 'height', '66px');
      setWorkspaceImportant(select, 'min-height', '66px');
      setWorkspaceImportant(select, 'max-height', '66px');
      setWorkspaceImportant(select, 'min-width', '0');
      setWorkspaceImportant(select, 'width', '100%');
    });

    setWorkspaceImportant(cluster, 'display', 'grid');
    setWorkspaceImportant(cluster, 'width', '100%');
    setWorkspaceImportant(cluster, 'min-width', '0');
    setWorkspaceImportant(cluster, 'column-gap', '6px');
    setWorkspaceImportant(cluster, 'row-gap', '6px');
    setWorkspaceImportant(cluster, 'align-items', 'start');
    setWorkspaceImportant(cluster, 'align-content', 'start');

    const narrowCluster = width && width < 720;
    setWorkspaceImportant(cluster, 'grid-template-columns', narrowCluster
      ? 'repeat(6, minmax(0, 1fr))'
      : 'repeat(16, minmax(0, 1fr))');

    const placements = narrowCluster ? [
      ['.cluster-type', '1 / span 2', '1'],
      ['.cluster-search-text', '3 / span 4', '1'],
      ['.cluster-distributor', '1 / span 2', '2'],
      ['.cluster-episodes', '3 / span 4', '2'],
      ['.cluster-search-in', '1 / span 2', '3'],
      ['.cluster-rights-start', '3 / span 2', '3'],
      ['.cluster-rights-end', '5 / span 2', '3'],
      ['.cluster-status', '1 / span 2', '4'],
      ['.cluster-rating', '3 / span 2', '4'],
      ['.cluster-active-scope', '5 / span 2', '4'],
      ['.cluster-clear-all', '5 / span 2', '5']
    ] : [
      ['.cluster-type', '1 / span 2', '1'],
      ['.cluster-search-text', '3 / span 6', '1'],
      ['.cluster-distributor', '9 / span 2', '1'],
      ['.cluster-episodes', '11 / span 6', '1'],
      ['.cluster-search-in', '1 / span 2', '2'],
      ['.cluster-rights-start', '3 / span 2', '2'],
      ['.cluster-rights-end', '5 / span 3', '2'],
      ['.cluster-status', '8 / span 2', '2'],
      ['.cluster-rating', '10 / span 2', '2'],
      ['.cluster-active-scope', '12 / span 2', '2'],
      ['.cluster-clear-all', '14 / span 3', '2']
    ];

    placements.forEach(([selector, column, row]) => placeGridItem(cluster.querySelector(selector), column, row));

    const clearHolder = cluster.querySelector('.cluster-clear-all');
    if (clearHolder) {
      setWorkspaceImportant(clearHolder, 'display', 'flex');
      setWorkspaceImportant(clearHolder, 'align-items', 'stretch');
      setWorkspaceImportant(clearHolder, 'justify-content', 'flex-start');
      setWorkspaceImportant(clearHolder, 'align-self', 'start');
      setWorkspaceImportant(clearHolder, 'padding-top', '0');
    }

    installWorkspaceMultiSelectDropdowns();
  }

  function workspaceMultiSelectConfigs() {
    return [
      { selectId: 'topicFilter', label: 'Topics', emptyLabel: 'All topics', allLabel: 'All topics selected', selectAllId: 'selectAllTopicFilter' },
      { selectId: 'secondaryTopicFilter', label: 'Secondary topics', emptyLabel: 'All secondary topics', allLabel: 'All secondary selected', selectAllId: 'selectAllSecondaryTopicFilter' },
      { selectId: 'lengthFilter', label: 'Lengths', emptyLabel: 'All lengths', allLabel: 'All lengths selected', selectAllId: 'selectAllLengthFilter' },
      { selectId: 'codeFilter', label: 'Uses', emptyLabel: 'All uses', allLabel: 'All uses selected', selectAllId: 'selectAllCodeFilter' }
    ];
  }

  function selectedValues(select) {
    return new Set(Array.from(select?.selectedOptions || []).map((option) => option.value));
  }

  function escapeTextForHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function optionValueCssToken(value) {
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    } catch {}
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function getWorkspaceMultiSelectConfig(selectId) {
    return workspaceMultiSelectConfigs().find((config) => config.selectId === selectId) || null;
  }

  function getWorkspaceMultiDropdown(selectId) {
    return document.querySelector(`.workspace-multi-dropdown[data-select-id="${optionValueCssToken(selectId)}"]`);
  }

  function closeWorkspaceMultiDropdowns(exceptSelectId) {
    document.querySelectorAll('.workspace-multi-dropdown').forEach((dropdown) => {
      if (exceptSelectId && dropdown.dataset.selectId === exceptSelectId) return;
      dropdown.querySelector('.workspace-multi-panel')?.classList.add('hidden');
      dropdown.querySelector('.workspace-multi-toggle')?.setAttribute('aria-expanded', 'false');
    });
  }

  function workspaceMultiSelectLabels(select) {
    return Array.from(select?.selectedOptions || [])
      .filter((option) => option.value)
      .map((option) => (option.textContent || option.value || '').trim())
      .filter(Boolean);
  }

  function workspaceMultiToggleText(select, config) {
    const options = Array.from(select?.options || []).filter((option) => option.value);
    const labels = workspaceMultiSelectLabels(select);
    if (!labels.length) return config.emptyLabel;
    if (options.length && labels.length === options.length) return config.allLabel;
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }

  function syncWorkspaceMultiToggle(selectId) {
    const select = document.getElementById(selectId);
    const config = getWorkspaceMultiSelectConfig(selectId);
    const dropdown = getWorkspaceMultiDropdown(selectId);
    if (!select || !config || !dropdown) return;
    const text = workspaceMultiToggleText(select, config);
    const textNode = dropdown.querySelector('.workspace-multi-toggle-text');
    if (textNode) {
      textNode.textContent = text;
      textNode.title = text;
    }
  }

  function installWorkspaceMultiSelectDropdowns() {
    workspaceMultiSelectConfigs().forEach(installWorkspaceMultiSelectDropdown);
    if (document.body.dataset.workspaceMultiCloseBound !== 'true') {
      document.body.dataset.workspaceMultiCloseBound = 'true';
      document.addEventListener('click', () => closeWorkspaceMultiDropdowns());
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeWorkspaceMultiDropdowns();
      });
    }
  }

  function installWorkspaceMultiSelectDropdown(config) {
    const select = document.getElementById(config.selectId);
    if (!select) return;

    let dropdown = getWorkspaceMultiDropdown(config.selectId);
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'workspace-multi-dropdown';
      dropdown.dataset.selectId = config.selectId;
      dropdown.innerHTML = `<button type="button" class="workspace-multi-toggle" aria-expanded="false"><span class="workspace-multi-toggle-text"></span></button><div class="workspace-multi-panel hidden" role="group" aria-label="${escapeTextForHtml(config.label)}"><div class="workspace-multi-list"></div></div>`;
      select.insertAdjacentElement('afterend', dropdown);
    }

    select.classList.add('workspace-native-multi-select');

    if (select.dataset.workspaceMultiBound !== 'true') {
      select.dataset.workspaceMultiBound = 'true';
      select.addEventListener('change', () => window.setTimeout(() => renderWorkspaceMultiSelectDropdown(config.selectId), 0));
      const observer = new MutationObserver(() => window.setTimeout(() => renderWorkspaceMultiSelectDropdown(config.selectId), 0));
      observer.observe(select, { childList: true, subtree: false, attributes: true, attributeFilter: ['selected', 'disabled', 'label'] });
    }

    const toggle = dropdown.querySelector('.workspace-multi-toggle');
    const panel = dropdown.querySelector('.workspace-multi-panel');
    if (toggle && toggle.dataset.workspaceMultiBound !== 'true') {
      toggle.dataset.workspaceMultiBound = 'true';
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = panel?.classList.contains('hidden');
        closeWorkspaceMultiDropdowns(config.selectId);
        panel?.classList.toggle('hidden', !willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }

    const list = dropdown.querySelector('.workspace-multi-list');
    if (list && list.dataset.workspaceMultiBound !== 'true') {
      list.dataset.workspaceMultiBound = 'true';
      list.addEventListener('change', (event) => {
        const input = event.target.closest('input[type="checkbox"][data-workspace-multi-value]');
        if (!input) return;
        const option = Array.from(select.options).find((item) => item.value === input.dataset.workspaceMultiValue);
        if (!option) return;
        option.selected = input.checked;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      list.addEventListener('click', (event) => event.stopPropagation());
    }

    const selectAllButton = document.getElementById(config.selectAllId);
    if (selectAllButton && selectAllButton.dataset.workspaceSelectAllBound !== 'true') {
      selectAllButton.dataset.workspaceSelectAllBound = 'true';
      selectAllButton.addEventListener('click', (event) => {
        event.preventDefault();
        Array.from(select.options || []).forEach((option) => {
          if (option.value && !option.disabled) option.selected = true;
        });
        select.dispatchEvent(new Event('change', { bubbles: true }));
        renderWorkspaceMultiSelectDropdown(config.selectId);
        updateWorkspaceFilterSummary();
      });
    }

    const clearButtonId = config.selectId === 'topicFilter' ? 'clearTopicFilter'
      : config.selectId === 'secondaryTopicFilter' ? 'clearSecondaryTopicFilter'
      : config.selectId === 'lengthFilter' ? 'clearLengthFilter'
      : config.selectId === 'codeFilter' ? 'clearCodeFilter'
      : '';
    const clearButton = clearButtonId ? document.getElementById(clearButtonId) : null;
    if (clearButton && clearButton.dataset.workspaceMultiClearBound !== 'true') {
      clearButton.dataset.workspaceMultiClearBound = 'true';
      clearButton.addEventListener('click', () => window.setTimeout(() => {
        renderWorkspaceMultiSelectDropdown(config.selectId);
        updateWorkspaceFilterSummary();
      }, 0));
    }

    renderWorkspaceMultiSelectDropdown(config.selectId);
  }

  function notifyWorkspaceMultiSelectRendered(selectId) {
    document.dispatchEvent(new CustomEvent('wnmu:workspace-multiselect-rendered', {
      detail: { selectId }
    }));
  }

  function renderWorkspaceMultiSelectDropdown(selectId) {
    const select = document.getElementById(selectId);
    const config = getWorkspaceMultiSelectConfig(selectId);
    const dropdown = getWorkspaceMultiDropdown(selectId);
    if (!select || !config || !dropdown) return;
    const list = dropdown.querySelector('.workspace-multi-list');
    if (!list) return;

    const selected = selectedValues(select);
    const options = Array.from(select.options || []).filter((option) => option.value);
    if (!options.length) {
      list.innerHTML = '<div class="workspace-multi-empty">No choices</div>';
      syncWorkspaceMultiToggle(selectId);
      notifyWorkspaceMultiSelectRendered(selectId);
      return;
    }

    list.innerHTML = options.map((option, index) => {
      const value = option.value;
      const label = option.textContent || value;
      const id = `${selectId}_workspaceMulti_${index}`;
      const checked = selected.has(value) ? 'checked' : '';
      const disabled = option.disabled ? 'disabled' : '';
      return `<label class="workspace-multi-row" for="${id}"><input id="${id}" type="checkbox" data-workspace-multi-value="${escapeTextForHtml(value)}" ${checked} ${disabled}><span class="workspace-multi-text">${escapeTextForHtml(label)}</span></label>`;
    }).join('');
    syncWorkspaceMultiToggle(selectId);
    notifyWorkspaceMultiSelectRendered(selectId);
  }

  function workspaceRightsEndIso(program) {
    try { return normalizeIsoDate(program?.rights_end); }
    catch { return ''; }
  }

  function workspaceProgramOutOfRights(program) {
    const end = workspaceRightsEndIso(program);
    return Boolean(end && end < isoTodayValue());
  }

  function workspaceProgramInRights(program) {
    const end = workspaceRightsEndIso(program);
    return Boolean(end && end >= isoTodayValue());
  }

  function workspaceRightsPoolForView(view) {
    const programs = Array.isArray(state?.programs) ? state.programs : [];
    switch (view) {
      case 'active':
        return programs.filter(workspaceProgramInRights);
      case 'archived':
      case 'expired':
      case 'archive_candidate':
        return programs.filter(workspaceProgramOutOfRights);
      case 'all':
      case '':
      case null:
      case undefined:
        return programs;
      default:
        return programs.filter(workspaceProgramInRights);
    }
  }

  function applyWorkspaceRightsArchiveOverlay() {
    if (!Array.isArray(state?.programs)) return;
    state.programs.forEach((program) => {
      if (!program || typeof program !== 'object') return;
      program.is_archived = workspaceProgramOutOfRights(program);
    });
  }

  function updateWorkspaceDiagnosticStats() {
    const missingTarget = document.getElementById('statMissingInfo');
    if (!missingTarget || !Array.isArray(state?.programs)) return;
    const activePrograms = state.programs.filter(workspaceProgramInRights);
    let missingCount = 0;
    activePrograms.forEach((program) => {
      try {
        if (typeof matchesView === 'function' && matchesView(program, 'missing_info')) missingCount += 1;
      } catch {}
    });
    missingTarget.textContent = missingCount.toLocaleString();
  }

  function patchRenderStats() {
    if (typeof renderStats !== 'function' || window.__wnmuWorkspaceStatsPatched) return;
    window.__wnmuWorkspaceStatsPatched = true;
    const originalRenderStats = renderStats;
    renderStats = function workspaceRenderStats(...args) {
      const result = originalRenderStats.apply(this, args);
      updateWorkspaceDiagnosticStats();
      updateWorkspaceFilterSummary();
      return result;
    };
  }

  let workspaceFilterResizeObserver = null;
  let workspaceFilterLayoutQueued = false;

  function installWorkspaceFilterLayoutPatch() {
    if (window.__wnmuWorkspaceFilterLayoutPatched) return;
    const controls = document.getElementById('controlsPanel');
    if (!controls) return;
    window.__wnmuWorkspaceFilterLayoutPatched = true;

    const apply = () => {
      if (workspaceFilterLayoutQueued) return;
      workspaceFilterLayoutQueued = true;
      window.requestAnimationFrame(() => {
        workspaceFilterLayoutQueued = false;
        installWorkspaceFilterToggle();
        applyWorkspaceFilterLayout();
        updateWorkspaceDiagnosticStats();
        updateWorkspaceFilterSummary();
      });
    };

    apply();
    if (typeof ResizeObserver === 'function') {
      workspaceFilterResizeObserver = new ResizeObserver(apply);
      workspaceFilterResizeObserver.observe(controls);
    } else {
      window.addEventListener('resize', apply);
    }
  }

  function readFiltersCollapsedPreference() {
    try { return window.localStorage?.getItem(FILTERS_COLLAPSED_KEY) === '1'; }
    catch { return false; }
  }

  function saveFiltersCollapsedPreference(collapsed) {
    try { window.localStorage?.setItem(FILTERS_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch {}
  }

  function labelForSelectedOption(select) {
    const option = select?.selectedOptions?.[0];
    if (!option) return '';
    return (option.textContent || option.value || '').trim();
  }

  function selectedOptionLabels(select) {
    return Array.from(select?.selectedOptions || [])
      .map((option) => (option.textContent || option.value || '').trim())
      .filter(Boolean);
  }

  function shortDateValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    return `${Number(m[2])}/${Number(m[3])}/${m[1].slice(2)}`;
  }

  function addFilterSummaryPart(parts, label, value) {
    const text = String(value || '').trim();
    if (!text) return;
    parts.push(`${label}: ${text}`);
  }

  function getWorkspaceFilterSummaryParts() {
    const parts = [];
    const viewLabels = {
      active: 'In rights',
      archived: 'Out of rights',
      new_to_13_1: 'New to 13.1',
      new_to_13_3: 'New to 13.3',
      evergreens: 'Evergreens',
      needs_apt_check: 'APT check',
      missing_info: 'Missing info',
      ending_soon: 'Ending within 90 days',
      missing_rights: 'Missing rights'
    };
    if (state?.currentView && state.currentView !== 'all') parts.push(viewLabels[state.currentView] || state.currentView);

    const search = document.getElementById('searchInput')?.value?.trim();
    if (search) {
      const clipped = search.length > 48 ? `${search.slice(0, 45)}...` : search;
      parts.push(`Search: “${clipped}”`);
      const searchField = labelForSelectedOption(document.getElementById('searchFieldSelect'));
      if (searchField && searchField !== 'All fields') addFilterSummaryPart(parts, 'In', searchField);
    }

    addFilterSummaryPart(parts, 'Type', labelForSelectedOption(document.getElementById('programTypeFilter')).replace(/^All types$/i, ''));
    addFilterSummaryPart(parts, 'Distributor', labelForSelectedOption(document.getElementById('distributorFilter')).replace(/^All distributors$/i, ''));

    const topics = selectedOptionLabels(document.getElementById('topicFilter'));
    if (topics.length) addFilterSummaryPart(parts, 'Topics', topics.slice(0, 3).join(', ') + (topics.length > 3 ? ` +${topics.length - 3}` : ''));
    const secondary = selectedOptionLabels(document.getElementById('secondaryTopicFilter'));
    if (secondary.length) addFilterSummaryPart(parts, 'Secondary', secondary.slice(0, 3).join(', ') + (secondary.length > 3 ? ` +${secondary.length - 3}` : ''));
    const lengths = selectedOptionLabels(document.getElementById('lengthFilter'));
    if (lengths.length) addFilterSummaryPart(parts, 'Lengths', lengths.slice(0, 4).join(', ') + (lengths.length > 4 ? ` +${lengths.length - 4}` : ''));
    const uses = selectedOptionLabels(document.getElementById('codeFilter'));
    if (uses.length) addFilterSummaryPart(parts, 'Uses', uses.slice(0, 4).join(', ') + (uses.length > 4 ? ` +${uses.length - 4}` : ''));

    const minEpisode = document.getElementById('episodeMinFilter')?.value?.trim();
    const maxEpisode = document.getElementById('episodeMaxFilter')?.value?.trim();
    if (minEpisode || maxEpisode) addFilterSummaryPart(parts, 'Episodes', `${minEpisode || 'any'}–${maxEpisode || 'any'}`);

    const rightsBegin = shortDateValue(document.getElementById('rightsWindowStartFilter')?.value);
    if (rightsBegin) addFilterSummaryPart(parts, 'Rights begin', rightsBegin);
    const rightsEnd = shortDateValue(document.getElementById('rightsWindowEndFilter')?.value);
    if (rightsEnd) addFilterSummaryPart(parts, 'Rights end', rightsEnd);

    const status = labelForSelectedOption(document.getElementById('statusFilter'));
    if (status && status !== 'All statuses') addFilterSummaryPart(parts, 'Status', status);
    const rating = labelForSelectedOption(document.getElementById('ratingFilter'));
    if (rating && rating !== 'All ratings') addFilterSummaryPart(parts, 'Rating', rating);

    try {
      const topicExcludeParts = window.WNMUWorkspaceTopicExclude?.summaryParts?.();
      if (Array.isArray(topicExcludeParts)) parts.push(...topicExcludeParts.filter(Boolean));
    } catch (_error) {}

    return parts;
  }

  function updateWorkspaceFilterSummary() {
    const target = document.getElementById('workspaceActiveFilters');
    if (!target) return;
    const parts = getWorkspaceFilterSummaryParts();
    target.textContent = parts.length ? parts.join(' · ') : 'No filters in use';
    target.title = target.textContent;
  }

  function setWorkspaceFiltersCollapsed(collapsed) {
    const controls = document.getElementById('controlsPanel');
    const button = document.getElementById('workspaceFilterToggleBtn');
    if (!controls || !button) return;
    controls.classList.toggle('workspace-filters-collapsed', Boolean(collapsed));
    button.textContent = collapsed ? 'Show filters' : 'Hide filters';
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    saveFiltersCollapsedPreference(Boolean(collapsed));
    updateWorkspaceFilterSummary();
  }

  function ensureWorkspaceFilterBody() {
    const controls = document.getElementById('controlsPanel');
    if (!controls) return null;

    let body = document.getElementById('workspaceFilterBody');
    if (!body) {
      body = document.createElement('div');
      body.id = 'workspaceFilterBody';
      body.className = 'workspace-filter-body';
      const row = document.getElementById('workspaceFilterToggleRow');
      if (row && row.parentElement === controls) {
        controls.insertBefore(body, row.nextSibling);
      } else {
        controls.appendChild(body);
      }
    }

    const pieces = [
      document.getElementById('quickStrip'),
      controls.querySelector('.filters.filters-grid'),
      controls.querySelector('.filter-foot')
    ].filter(Boolean);

    pieces.forEach((piece) => {
      if (piece.parentElement !== body) body.appendChild(piece);
    });

    return body;
  }

  function installWorkspaceFilterToggle() {
    const controls = document.getElementById('controlsPanel');
    const quickStrip = document.getElementById('quickStrip');
    if (!controls) return;

    let row = document.getElementById('workspaceFilterToggleRow');
    if (!row) {
      row = document.createElement('div');
      row.id = 'workspaceFilterToggleRow';
      row.className = 'workspace-filter-toggle-row';
      row.innerHTML = '<button type="button" id="workspaceFilterToggleBtn" class="mini-clear" aria-controls="controlsPanel" aria-expanded="true">Hide filters</button><div id="workspaceActiveFilters" class="workspace-active-filters" aria-live="polite">No filters in use</div>';
      if (quickStrip && quickStrip.parentElement === controls) controls.insertBefore(row, quickStrip);
      else controls.insertBefore(row, controls.firstChild);
    } else if (row.parentElement !== controls) {
      controls.insertBefore(row, controls.firstChild);
    }

    ensureWorkspaceFilterBody();

    const button = document.getElementById('workspaceFilterToggleBtn');
    if (button && button.dataset.workspaceToggleBound !== 'true') {
      button.dataset.workspaceToggleBound = 'true';
      button.addEventListener('click', () => setWorkspaceFiltersCollapsed(!controls.classList.contains('workspace-filters-collapsed')));
    }

    if (controls.dataset.workspaceFilterSummaryBound !== 'true') {
      controls.dataset.workspaceFilterSummaryBound = 'true';
      controls.addEventListener('input', () => window.requestAnimationFrame(updateWorkspaceFilterSummary), true);
      controls.addEventListener('change', () => window.requestAnimationFrame(updateWorkspaceFilterSummary), true);
      controls.addEventListener('click', () => window.setTimeout(updateWorkspaceFilterSummary, 0), true);
    }

    setWorkspaceFiltersCollapsed(readFiltersCollapsedPreference());
    updateWorkspaceFilterSummary();
  }

  function syncWorkspaceMode() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    installWorkspaceShell();
    installSplitter();
    installWorkspaceResponsiveMode();
    applyWorkspaceRightsArchiveOverlay();
    const admin = isWorkspaceAdmin();
    document.body.classList.toggle('workspace-admin', admin);
    const pane = document.getElementById('workspaceEditorPane');
    if (pane) pane.setAttribute('aria-hidden', 'false');
    const empty = document.getElementById('workspaceEditorEmpty');
    if (empty) empty.setAttribute('aria-hidden', admin ? 'true' : 'false');
    const drawer = document.getElementById('editorDrawer');
    document.body.classList.toggle('workspace-editor-open', Boolean(drawer && !drawer.classList.contains('hidden')));
  }

  function showWorkspaceNewProgramTemplate(options = {}) {
    if (!isWorkspaceAdmin() || typeof openEditor !== 'function') return false;
    const drawer = document.getElementById('editorDrawer');
    const form = els.programForm;
    if (!drawer || !form) return false;

    const force = Boolean(options.force);
    const selectedId = state?.selectedId == null ? '' : String(state.selectedId);
    const formId = String(form.dataset.programId || '');
    if (!force && selectedId && formId) return false;

    workspaceOpeningDefaultEditor = true;
    try {
      try { state.selectedId = null; } catch {}
      openEditor(null);
      applyWorkspaceNewProgramDefaults();
      document.body.classList.add('workspace-editor-open');
      if (isNarrowWorkspace()) setWorkspaceActivePanel('editor');
    } finally {
      window.setTimeout(() => { workspaceOpeningDefaultEditor = false; }, 0);
    }
    return true;
  }

  function ensureWorkspaceEditorOpen() {
    if (!isWorkspaceAdmin()) return;
    const drawer = document.getElementById('editorDrawer');
    const form = els.programForm;
    if (!drawer || !form) return;

    const selectedId = state?.selectedId == null ? '' : String(state.selectedId);
    const formId = String(form.dataset.programId || '');
    const hidden = drawer.classList.contains('hidden');

    // Admin mode has a standing invariant: when no existing title is selected,
    // the right pane is the Add New Program form, never the empty-state card.
    if (!selectedId && (!formId || hidden)) {
      if (hidden || formId) showWorkspaceNewProgramTemplate({ force: true });
      else {
        document.body.classList.add('workspace-editor-open');
        applyWorkspaceNewProgramDefaults();
      }
    }
  }


  function applyWorkspaceNewProgramDefaults() {
    const form = els.programForm;
    if (!form || normalizeText(form.dataset.programId)) return;
    ['aired_13_1', 'aired_13_3'].forEach((field) => {
      const input = form.elements[field];
      if (input && !normalizeText(input.value)) input.value = 'No';
    });
  }


  let workspaceFormBaseline = '';
  let workspaceFormDirty = false;
  let workspaceSuppressDirtyTracking = false;
  let workspaceDiscardPromptOpen = false;
  let workspaceHiddenSelectedAckId = null;
  let workspaceSelectionClearInProgress = false;

  function serializeWorkspaceProgramForm() {
    const form = els.programForm;
    if (!form) return '';
    const values = { programId: String(form.dataset.programId || '') };
    Array.from(form.elements || []).forEach((field) => {
      if (!field || !field.name) return;
      if (field.name.endsWith('_picker')) return;
      const type = String(field.type || '').toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset') return;
      if (type === 'checkbox' || type === 'radio') values[field.name] = Boolean(field.checked);
      else values[field.name] = field.value == null ? '' : String(field.value);
    });
    return JSON.stringify(values);
  }

  function setWorkspaceFormDirty(dirty) {
    workspaceFormDirty = Boolean(dirty && isWorkspaceAdmin());
    document.body.classList.toggle('workspace-editor-dirty', workspaceFormDirty);
  }

  function captureWorkspaceFormBaseline() {
    workspaceFormBaseline = serializeWorkspaceProgramForm();
    setWorkspaceFormDirty(false);
    workspaceSuppressDirtyTracking = false;
  }

  function updateWorkspaceFormDirtyState() {
    if (workspaceSuppressDirtyTracking) return;
    if (!isWorkspaceAdmin()) {
      setWorkspaceFormDirty(false);
      return;
    }
    const drawer = els.drawer;
    if (!drawer || drawer.classList.contains('hidden')) {
      setWorkspaceFormDirty(false);
      return;
    }
    if (!workspaceFormBaseline) {
      captureWorkspaceFormBaseline();
      return;
    }
    setWorkspaceFormDirty(serializeWorkspaceProgramForm() !== workspaceFormBaseline);
  }

  function scheduleWorkspaceFormBaselineCapture() {
    const drawer = els.drawer;
    if (!drawer) return;
    const token = state.editorOpenToken;
    workspaceSuppressDirtyTracking = true;
    setWorkspaceFormDirty(false);
    const attempt = () => {
      if (state.editorOpenToken !== token) return;
      if (drawer.classList.contains('hidden')) return;
      if (drawer.classList.contains('drawer-loading')) {
        window.setTimeout(attempt, 40);
        return;
      }
      captureWorkspaceFormBaseline();
    };
    window.setTimeout(attempt, 0);
  }

  function installWorkspaceDirtyGuardUi() {
    if (document.getElementById('workspaceDirtyGuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'workspaceDirtyGuardStyles';
    style.textContent = `
      body.workspace-test-page .workspace-discard-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(4, 20, 31, .42);
        backdrop-filter: blur(2px);
      }
      body.workspace-test-page .workspace-discard-backdrop.open { display: flex; }
      body.workspace-test-page .workspace-discard-dialog {
        width: min(420px, calc(100vw - 36px));
        border-radius: 18px;
        background: #fff;
        border: 1px solid rgba(18,134,127,.28);
        box-shadow: 0 24px 60px rgba(12,39,68,.25);
        padding: 18px;
        color: #163744;
      }
      body.workspace-test-page .workspace-discard-title {
        font-size: 1.02rem;
        font-weight: 850;
        margin: 0 0 6px;
      }
      body.workspace-test-page .workspace-discard-text {
        margin: 0 0 14px;
        color: #42616c;
        font-size: .9rem;
        line-height: 1.35;
      }
      body.workspace-test-page .workspace-discard-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      body.workspace-test-page .workspace-discard-actions button { min-height: 36px; }
      body.workspace-test-page .workspace-discard-actions .discard-danger {
        background: #b94a48 !important;
        border-color: #b94a48 !important;
        color: #fff !important;
      }
      body.workspace-test-page.workspace-editor-dirty #drawerTitle::after {
        content: ' • unsaved';
        color: #b05d00;
        font-size: .72em;
        font-weight: 800;
      }
      body.workspace-test-page .workspace-editor-utility-tools {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(18,134,127,.16);
        display: grid;
        gap: 8px;
      }
      body.workspace-test-page .workspace-editor-utility-tools .lookup-tools,
      body.workspace-test-page .workspace-editor-utility-tools .template-tools,
      body.workspace-test-page .workspace-editor-utility-tools .pbs-import-tools {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        grid-column: 1 / -1 !important;
      }
      body.workspace-test-page .workspace-editor-utility-tools .lookup-tools {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }
      body.workspace-test-page .workspace-editor-utility-tools .template-tools {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        gap: 8px !important;
        align-items: end !important;
      }
      body.workspace-test-page .workspace-editor-utility-tools .pbs-import-head {
        gap: 8px !important;
      }
      body.workspace-test-page .workspace-editor-utility-tools .template-field { min-width: 0 !important; }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = 'workspaceDiscardBackdrop';
    backdrop.className = 'workspace-discard-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.innerHTML = `
      <div class="workspace-discard-dialog" role="dialog" aria-modal="true" aria-labelledby="workspaceDiscardTitle" aria-describedby="workspaceDiscardText">
        <h3 id="workspaceDiscardTitle" class="workspace-discard-title">You have unsaved changes</h3>
        <p id="workspaceDiscardText" class="workspace-discard-text">Continue editing, or discard the edits and clear this program from the details panel.</p>
        <div class="workspace-discard-actions">
          <button type="button" id="workspaceContinueEditingBtn" class="secondary">Continue editing</button>
          <button type="button" id="workspaceDiscardEditsBtn" class="discard-danger">Discard edits</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
  }

  function promptDiscardWorkspaceEdits(message) {
    if (!workspaceFormDirty) return Promise.resolve(true);
    installWorkspaceDirtyGuardUi();
    if (workspaceDiscardPromptOpen) return Promise.resolve(false);
    workspaceDiscardPromptOpen = true;
    const backdrop = document.getElementById('workspaceDiscardBackdrop');
    const text = document.getElementById('workspaceDiscardText');
    const continueBtn = document.getElementById('workspaceContinueEditingBtn');
    const discardBtn = document.getElementById('workspaceDiscardEditsBtn');
    if (!backdrop || !continueBtn || !discardBtn) {
      workspaceDiscardPromptOpen = false;
      return Promise.resolve(window.confirm('You have unsaved changes. Click OK to discard edits, or Cancel to continue editing.'));
    }
    if (text) text.textContent = message || 'Continue editing, or discard the edits and clear this program from the details panel.';
    backdrop.classList.add('open');
    return new Promise((resolve) => {
      const finish = (discard) => {
        backdrop.classList.remove('open');
        workspaceDiscardPromptOpen = false;
        continueBtn.removeEventListener('click', onContinue);
        discardBtn.removeEventListener('click', onDiscard);
        document.removeEventListener('keydown', onKeydown, true);
        if (discard) {
          workspaceFormBaseline = serializeWorkspaceProgramForm();
          setWorkspaceFormDirty(false);
        }
        resolve(Boolean(discard));
      };
      const onContinue = () => finish(false);
      const onDiscard = () => finish(true);
      const onKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        }
      };
      continueBtn.addEventListener('click', onContinue);
      discardBtn.addEventListener('click', onDiscard);
      document.addEventListener('keydown', onKeydown, true);
      window.setTimeout(() => continueBtn.focus(), 0);
    });
  }

  async function requestWorkspaceClearSelection(reason) {
    if (workspaceSelectionClearInProgress) return false;
    const message = reason === 'clear-filters'
      ? 'Continue editing, or discard the edits and clear all filters.'
      : reason === 'filter-removed'
        ? 'The selected program no longer matches the current filters. Continue editing, or discard the edits and clear the details panel.'
        : 'Continue editing, or discard the edits and clear this program from the details panel.';
    const discardOrClean = await promptDiscardWorkspaceEdits(message);
    if (!discardOrClean) return false;
    workspaceSelectionClearInProgress = true;
    try {
      workspaceHiddenSelectedAckId = null;
      setWorkspaceFormDirty(false);
      workspaceFormBaseline = '';
      if (typeof closeEditor === 'function') closeEditor();
    } finally {
      window.setTimeout(() => { workspaceSelectionClearInProgress = false; }, 0);
    }
    return true;
  }

  async function workspaceOpenProgramWithGuard(id) {
    if (!id) return;
    const current = state?.selectedId == null ? '' : String(state.selectedId);
    const next = String(id);
    if (current && current === next) {
      await requestWorkspaceClearSelection('toggle');
      return;
    }
    if (workspaceFormDirty) {
      const discard = await promptDiscardWorkspaceEdits('Continue editing the current program, or discard edits and open the selected program.');
      if (!discard) return;
      setWorkspaceFormDirty(false);
    }
    workspaceHiddenSelectedAckId = null;
    openEditor(next);
  }

  function installWorkspaceDirtyTracking() {
    if (window.__wnmuWorkspaceDirtyTrackingInstalled) return;
    const form = els.programForm;
    if (!form) return;
    window.__wnmuWorkspaceDirtyTrackingInstalled = true;
    installWorkspaceDirtyGuardUi();
    form.addEventListener('input', () => window.setTimeout(updateWorkspaceFormDirtyState, 0), true);
    form.addEventListener('change', () => window.setTimeout(updateWorkspaceFormDirtyState, 0), true);
  }

  function installWorkspaceEditorToolsLayout() {
    const form = els.programForm;
    const actions = form?.querySelector('.drawer-actions');
    if (!form || !actions) return;
    let utility = document.getElementById('workspaceEditorUtilityTools');
    if (!utility) {
      utility = document.createElement('div');
      utility.id = 'workspaceEditorUtilityTools';
      utility.className = 'workspace-editor-utility-tools';
      actions.insertAdjacentElement('afterend', utility);
    }
    const lookupTools = document.getElementById('lookupBtn')?.closest('.lookup-tools');
    const pieces = [lookupTools, document.getElementById('templateTools'), document.getElementById('pbsImportTools')].filter(Boolean);
    pieces.forEach((piece) => {
      if (piece.parentElement !== utility) utility.appendChild(piece);
    });
  }

  function selectedProgramIsVisibleInCurrentFilters() {
    const id = state?.selectedId;
    if (!id) return true;
    try {
      return activePrograms().some((program) => String(program.id) === String(id));
    } catch {
      return true;
    }
  }

  function maybeClearSelectionAfterTableRender() {
    const id = state?.selectedId;
    if (!id || workspaceSelectionClearInProgress) return;
    if (selectedProgramIsVisibleInCurrentFilters()) {
      if (workspaceHiddenSelectedAckId === String(id)) workspaceHiddenSelectedAckId = null;
      return;
    }
    if (workspaceFormDirty) {
      if (workspaceHiddenSelectedAckId === String(id)) return;
      workspaceHiddenSelectedAckId = String(id);
      requestWorkspaceClearSelection('filter-removed');
      return;
    }
    requestWorkspaceClearSelection('filter-removed');
  }

  function patchWorkspaceRenderTableSelectionWatcher() {
    if (typeof renderTable !== 'function' || window.__wnmuWorkspaceTableSelectionWatcherPatched) return;
    window.__wnmuWorkspaceTableSelectionWatcherPatched = true;
    const originalRenderTable = renderTable;
    renderTable = function workspaceSelectionRenderTable(...args) {
      const result = originalRenderTable.apply(this, args);
      window.setTimeout(maybeClearSelectionAfterTableRender, 0);
      return result;
    };
  }

  function installWorkspaceResetFiltersInterceptor() {
    if (window.__wnmuWorkspaceResetFiltersInterceptorInstalled) return;
    const btn = els.resetFiltersBtn;
    if (!btn || typeof resetFilters !== 'function') return;
    window.__wnmuWorkspaceResetFiltersInterceptorInstalled = true;
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      const ok = await requestWorkspaceClearSelection('clear-filters');
      if (!ok) return;
      const scopeReset = window.WNMUWorkspaceScopeClearAllFix?.resetAllFilters;
      if (typeof scopeReset === 'function') scopeReset();
      else {
        resetFilters();
        try { state.currentView = 'active'; } catch {}
        try { renderTable(); renderStats(); } catch {}
      }
    }, true);
  }

  function deriveArchiveFlag(existingItem, rightsEndIso) {
    // Workspace test no longer stores archive state. This helper is kept only
    // so older patched calls do not fail while archive/out-of-rights is derived from Rights End.
    return Boolean(rightsEndIso && rightsEndIso < isoTodayValue());
  }

  function patchSaveProgram() {
    if (typeof saveProgram !== 'function' || window.__wnmuWorkspaceSavePatched) return;
    window.__wnmuWorkspaceSavePatched = true;
    saveProgram = async function workspaceSaveProgram(event) {
      event.preventDefault();
      if (!canEdit()) {
        alert('Read-only mode. Use Admin sign in with GitHub to make changes.');
        return;
      }
      const form = els.programForm;
      const programId = form.dataset.programId || null;
      const existingItem = programId ? state.programs.find((program) => String(program.id) === String(programId)) : null;
      const payload = {
        legacy_code: form.elements.legacy_code.value || null,
        title: form.elements.title.value.trim(),
        notes: form.elements.notes.value || null,
        episode_season: form.elements.episode_season.value || null,
        nola_eidr: form.elements.nola_eidr.value || null,
        program_type: form.elements.program_type.value || null,
        length_minutes: form.elements.length_minutes.value || null,
        topic: form.elements.topic.value || null,
        secondary_topic: normalizeMultiValueInput(form.elements.secondary_topic.value) || null,
        aired_13_1: form.elements.aired_13_1.value || null,
        aired_13_3: form.elements.aired_13_3.value || null,
        vote: normalizeLower(form.elements.distributor.value) === 'apt' ? (form.elements.vote.value || null) : null,
        rights_begin: normalizeIsoDate(form.elements.rights_begin.value) || null,
        rights_end: normalizeIsoDate(form.elements.rights_end.value) || null,
        rights_notes: form.elements.rights_notes.value || null,
        package_type: form.elements.package_type.value || null,
        server_tape: form.elements.server_tape.value || null,
        distributor: form.elements.distributor.value || null,
        exclude_from_auto_archive: Boolean(existingItem?.exclude_from_auto_archive)
      };

      const selectedRating = normalizeRating(form.elements.rating?.value);

      if (!payload.title) {
        alert('Title is required.');
        return;
      }
      if (normalizeText(form.elements.rights_begin.value) && !payload.rights_begin) {
        alert('Rights begin must be a valid date. Use m/d/yy, m/d/yyyy, or yyyy-mm-dd. Two-digit years are saved as 20xx.');
        form.elements.rights_begin.focus();
        return;
      }
      if (normalizeText(form.elements.rights_end.value) && !payload.rights_end) {
        alert('Rights end must be a valid date. Use m/d/yy, m/d/yyyy, or yyyy-mm-dd. Two-digit years are saved as 20xx.');
        form.elements.rights_end.focus();
        return;
      }

      const dupes = duplicateMatches(payload.title, payload.nola_eidr, programId);
      if (dupes.length) {
        const summary = duplicateSummary(dupes);
        const archivedLine = summary.archivedCount
          ? `\n${summary.archivedCount} matching program${summary.archivedCount === 1 ? ' is' : 's are'} out of rights.`
          : '';
        const proceed = confirm(`Possible duplicate found (${dupes.length}).${archivedLine}\nSave anyway?`);
        if (!proceed) return;
      }

      const saveMessage = !programId ? 'Creating program…' : 'Saving changes…';
      setLoading(saveMessage);

      try {
        let response;
        if (programId) response = await state.supabase.from('programs').update(payload).eq('id', programId).select('id').single();
        else response = await state.supabase.from('programs').insert(payload).select('id').single();
        if (response.error) throw response.error;

        const refreshedId = response.data?.id || programId;
        const refreshedProgram = await fetchProgramById(refreshedId);
        mergeProgramIntoState(refreshedProgram);
        const lookupsChanged = syncLookupsFromProgram(refreshedProgram);

        let ratingWarning = '';
        const existingRating = normalizeRating(existingItem?.rating);
        const shouldPersistRating = selectedRating !== existingRating;
        if (shouldPersistRating) {
          try {
            await persistProgramRating(refreshedProgram.id, selectedRating, { refreshUi: false, silentLocalFallback: true });
          } catch (ratingError) {
            console.error(ratingError);
            ratingWarning = ' Rating saved locally only; database sync failed.';
          }
        }

        applyWorkspaceRightsArchiveOverlay();
        const savedMessage = (!programId ? 'Created program.' : 'Saved changes.') + ratingWarning;
        refreshUiAfterProgramMutation(savedMessage, { renderFilters: lookupsChanged });
        setLoading('');
        setWorkspaceFormDirty(false);
        workspaceFormBaseline = '';

        // After any successful save—new or existing—return Admin mode to a
        // clean Add New Program form. This is done directly, then guarded by
        // the standing editor invariant so later render/update timing cannot
        // leave the empty-state card behind.
        showWorkspaceNewProgramTemplate({ force: true });
        ensureWorkspaceEditorOpen();
      } catch (error) {
        console.error(error);
        setLoading('');
        alert(error.message);
        setStatus(error.message);
      }
    };
  }


  function patchRightsDerivedArchiveModel() {
    if (window.__wnmuWorkspaceRightsDerivedPatched) return;
    window.__wnmuWorkspaceRightsDerivedPatched = true;

    if (typeof attemptAutoArchiveOncePerDay === 'function') {
      attemptAutoArchiveOncePerDay = async function workspaceNoStoredAutoArchive() { return false; };
    }

    if (typeof duplicateSummary === 'function') {
      duplicateSummary = function workspaceDuplicateSummary(matches) {
        const archivedCount = (matches || []).filter(workspaceProgramOutOfRights).length;
        const activeCount = (matches || []).length - archivedCount;
        const parts = [];
        if (activeCount) parts.push(`${activeCount} in/current or unknown rights`);
        if (archivedCount) parts.push(`${archivedCount} out of rights`);
        return { archivedCount, activeCount, summaryText: parts.join(', ') };
      };
    }


    if (typeof renderDuplicateCheck === 'function') {
      const originalRenderDuplicateCheck = renderDuplicateCheck;
      renderDuplicateCheck = function workspaceRightsRenderDuplicateCheck(...args) {
        applyWorkspaceRightsArchiveOverlay();
        const result = originalRenderDuplicateCheck.apply(this, args);
        try {
          els.duplicateCheck?.querySelectorAll('.dup-archived-note, .dup-reason, .dup-meta').forEach((node) => {
            node.textContent = node.textContent
              .replace(/currently archived/gi, 'out of rights')
              .replace(/archived/gi, 'out of rights');
          });
        } catch {}
        return result;
      };
    }

    if (typeof programCanAutoRestore === 'function') {
      programCanAutoRestore = function workspaceProgramCanAutoRestore() { return false; };
    }

    if (typeof updateRestoreButtonVisibility === 'function') {
      updateRestoreButtonVisibility = function workspaceHideRestoreButton() {
        els.restoreBtn?.classList.add('hidden');
      };
    }

    if (typeof matchesView === 'function') {
      const originalMatchesView = matchesView;
      matchesView = function workspaceRightsMatchesView(program, view) {
        switch (view) {
          case 'active':
            return workspaceProgramInRights(program);
          case 'archived':
          case 'expired':
          case 'archive_candidate':
            return workspaceProgramOutOfRights(program);
          default:
            return originalMatchesView.call(this, program, view);
        }
      };
    }

    if (typeof programsInCurrentViewPool === 'function') {
      programsInCurrentViewPool = function workspaceRightsProgramsInCurrentViewPool() {
        const cacheKey = `rights-derived:${isoTodayValue()}:${state.currentView}|${state.programs.length}`;
        if (state.poolCacheKey === cacheKey && Array.isArray(state.poolProgramIds)) return state.poolProgramIds;
        let items = workspaceRightsPoolForView(state.currentView);
        if (state.currentView && !['all', 'active', 'archived', 'expired', 'archive_candidate'].includes(state.currentView)) {
          items = items.filter((item) => matchesView(item, state.currentView));
        }
        state.poolCacheKey = cacheKey;
        state.poolProgramIds = items;
        return items;
      };
    }

    if (typeof badgesFor === 'function') {
      const originalBadgesFor = badgesFor;
      badgesFor = function workspaceRightsBadgesFor(program) {
        const badges = originalBadgesFor.call(this, program).filter((badge) => normalizeLower(badge.label) !== 'archived');
        return badges;
      };
    }

    if (typeof renderTable === 'function') {
      const originalRenderTable = renderTable;
      renderTable = function workspaceRightsRenderTable(...args) {
        applyWorkspaceRightsArchiveOverlay();
        return originalRenderTable.apply(this, args);
      };
    }

    if (typeof renderStats === 'function') {
      const originalRenderStatsForRights = renderStats;
      renderStats = function workspaceRightsRenderStats(...args) {
        applyWorkspaceRightsArchiveOverlay();
        const flags = state.programs.map((program) => ({ program, flags: computeFlags(program) }));
        const inRightsFlags = flags.filter((x) => workspaceProgramInRights(x.program));
        if (els.statApt) els.statApt.textContent = inRightsFlags.filter((x) => x.flags.needsAptCheck).length.toLocaleString();
        if (els.statEnding) els.statEnding.textContent = inRightsFlags.filter((x) => x.flags.rightsStatus === 'Ending soon').length.toLocaleString();
        if (els.statMissingRights) els.statMissingRights.textContent = flags.filter((x) => x.flags.missingRights).length.toLocaleString();
        if (els.statArchived) els.statArchived.textContent = state.programs.filter(workspaceProgramOutOfRights).length.toLocaleString();
        if (typeof syncQuickViewState === 'function') syncQuickViewState();
        updateWorkspaceDiagnosticStats();
        updateWorkspaceFilterSummary();
        return undefined;
      };
    }
  }

  function patchWorkspaceFunctions() {
    injectWorkspaceStyles();
    installWorkspaceShell();
    patchSaveProgram();
    patchRightsDerivedArchiveModel();
    patchWorkspaceRenderTableSelectionWatcher();
    installWorkspaceDirtyTracking();
    installWorkspaceEditorToolsLayout();
    installWorkspaceResetFiltersInterceptor();
    installWorkspaceFilterToggle();
    installWorkspaceResponsiveMode();
    installWorkspaceFilterLayoutPatch();
    updateWorkspaceFilterSummary();

    if (typeof bindEvents === 'function' && !window.__wnmuWorkspaceBindPatched) {
      window.__wnmuWorkspaceBindPatched = true;
      const originalBindEvents = bindEvents;
      bindEvents = function workspaceBindEvents(...args) {
        const result = originalBindEvents.apply(this, args);
        const newBtn = els.newProgramBtn;
        newBtn?.addEventListener('click', (event) => {
          if (!isWorkspaceAdmin()) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          openEditor(null);
        }, true);
        const closeBtn = els.closeDrawerBtn;
        closeBtn?.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          requestWorkspaceClearSelection('close-button');
        }, true);
        document.addEventListener('keydown', (event) => {
          if (!isWorkspaceAdmin()) return;
          const formIsOpen = !els.drawer.classList.contains('hidden');
          if (event.key === 'Escape' && formIsOpen) {
            event.preventDefault();
            event.stopImmediatePropagation();
            requestWorkspaceClearSelection('escape');
          }
          if (event.key.toLowerCase() === 'n' && !isInteractiveElement(document.activeElement) && canEdit()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openEditor(null);
          }
        }, true);
        return result;
      };
    }

    if (typeof updateModeUI === 'function' && !window.__wnmuWorkspaceModePatched) {
      window.__wnmuWorkspaceModePatched = true;
      const originalUpdateModeUI = updateModeUI;
      updateModeUI = function workspaceUpdateModeUI(...args) {
        const result = originalUpdateModeUI.apply(this, args);
        syncWorkspaceMode();
        ensureWorkspaceEditorOpen();
        return result;
      };
    }

    if (typeof loadEverything === 'function' && !window.__wnmuWorkspaceLoadPatched) {
      window.__wnmuWorkspaceLoadPatched = true;
      const originalLoadEverything = loadEverything;
      loadEverything = async function workspaceLoadEverything(...args) {
        const result = await originalLoadEverything.apply(this, args);
        applyWorkspaceRightsArchiveOverlay();
        syncWorkspaceMode();
        if (typeof renderTable === 'function') renderTable();
        if (typeof renderStats === 'function') renderStats();
        ensureWorkspaceEditorOpen();
        return result;
      };
    }

    if (typeof openEditor === 'function' && !window.__wnmuWorkspaceOpenPatched) {
      window.__wnmuWorkspaceOpenPatched = true;
      const originalOpenEditor = openEditor;
      openEditor = function workspaceOpenEditor(id = null, duplicate = false) {
        syncWorkspaceMode();
        const result = originalOpenEditor.call(this, id, duplicate);
        els.drawerBackdrop?.classList.add('hidden');
        document.body.classList.remove('modal-open');
        document.body.classList.add('workspace-editor-open');
        if (!id && els.drawerTitle) els.drawerTitle.textContent = 'Add New Program';
        if (!id) {
          applyWorkspaceNewProgramDefaults();
          window.requestAnimationFrame(applyWorkspaceNewProgramDefaults);
        }
        installWorkspaceEditorToolsLayout();
        scheduleWorkspaceFormBaselineCapture();
        if (isNarrowWorkspace() && !workspaceOpeningDefaultEditor) setWorkspaceActivePanel('editor');
        return result;
      };
    }

    if (typeof closeEditor === 'function' && !window.__wnmuWorkspaceClosePatched) {
      window.__wnmuWorkspaceClosePatched = true;
      const originalCloseEditor = closeEditor;
      closeEditor = function workspaceCloseEditor(...args) {
        setWorkspaceFormDirty(false);
        workspaceFormBaseline = '';
        workspaceHiddenSelectedAckId = null;
        const result = originalCloseEditor.apply(this, args);
        document.body.classList.remove('workspace-editor-open');
        if (isNarrowWorkspace()) setWorkspaceActivePanel('library');
        if (isWorkspaceAdmin()) ensureWorkspaceEditorOpen();
        return result;
      };
    }
  }

  function initializeWorkspaceEditorInvariant() {
    syncWorkspaceMode();
    ensureWorkspaceEditorOpen();
  }

  window.WNMUWorkspaceOpenProgram = workspaceOpenProgramWithGuard;
  window.WNMUWorkspaceFilterUi = {
    syncMultiDropdowns() {
      workspaceMultiSelectConfigs().forEach((config) => renderWorkspaceMultiSelectDropdown(config.selectId));
      updateWorkspaceFilterSummary();
    },
    updateSummary: updateWorkspaceFilterSummary
  };
  window.WNMU_WORKSPACE_BUILD_VERSION = 'v1.5.125';
  patchWorkspaceFunctions();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWorkspaceEditorInvariant);
  } else {
    initializeWorkspaceEditorInvariant();
  }
})();
