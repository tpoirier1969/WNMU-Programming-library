// WNMU Programming Library one-page workspace test
// Test-only add-on. It does not change schema/config and does not replace production pages.
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
  let suppressWorkspaceReopen = false;
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
      body.workspace-admin #workspaceSplitGrid {
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
      body.workspace-admin #workspaceEditorPane { display: block; }
      body.workspace-test-page #workspaceSplitter {
        display: none;
        width: 8px;
        cursor: col-resize;
        background: linear-gradient(90deg, transparent, rgba(0,143,140,.22), transparent);
        border-top: 1px solid rgba(18,134,127,.18);
        border-bottom: 1px solid rgba(18,134,127,.18);
      }
      body.workspace-admin #workspaceSplitter { display: block; }
      body.workspace-test-page #workspaceSplitter::before {
        content: '';
        display: block;
        width: 3px;
        height: 48px;
        margin: calc(50vh - 92px) auto 0;
        border-radius: 5px;
        background: rgba(0,76,94,.35);
      }

      body.workspace-admin #drawerBackdrop { display: none !important; }
      body.workspace-admin #editorDrawer {
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
      body.workspace-admin #editorDrawer.hidden { display: none !important; }
      body.workspace-admin #editorDrawer .drawer-header {
        position: sticky !important;
        top: -10px !important;
        z-index: 3 !important;
        margin: 0 0 8px 0 !important;
        padding: 8px 8px 9px !important;
        border-bottom: 1px solid rgba(18,134,127,.16) !important;
        background: rgba(255,255,255,.98) !important;
      }
      body.workspace-admin #drawerTitle {
        font-size: 1.04rem !important;
        line-height: 1.05 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      body.workspace-admin #closeDrawerBtn { font-size: .76rem !important; padding: 6px 9px !important; }
      body.workspace-admin #editorDrawer .program-form { gap: 7px !important; }
      body.workspace-admin #editorDrawer .form-grid {
        grid-template-columns: minmax(0, 1.75fr) minmax(120px, .7fr) minmax(64px, .36fr) minmax(70px, .36fr) !important;
        gap: 7px 8px !important;
      }
      body.workspace-admin #editorDrawer .program-form label { gap: 3px !important; font-size: .78rem !important; }
      body.workspace-admin #editorDrawer .program-form input,
      body.workspace-admin #editorDrawer .program-form select,
      body.workspace-admin #editorDrawer .program-form textarea {
        padding: 6px 8px !important;
        min-height: 32px !important;
        border-radius: 9px !important;
        font-size: .84rem !important;
      }
      body.workspace-admin #editorDrawer textarea[name="notes"] { min-height: 58px !important; rows: 2; }
      body.workspace-admin #editorDrawer textarea[name="rights_notes"] { min-height: 32px !important; }
      body.workspace-admin #editorDrawer .lookup-tools,
      body.workspace-admin #editorDrawer .template-tools { grid-template-columns: minmax(0,1fr) auto !important; gap: 6px !important; }
      body.workspace-admin #editorDrawer .program-rights-row {
        grid-template-columns: minmax(110px, .8fr) minmax(92px, .64fr) minmax(86px,.52fr) minmax(86px,.52fr) !important;
        gap: 7px !important;
      }
      body.workspace-admin #editorDrawer .compact-form-row {
        grid-template-columns: minmax(80px,.6fr) minmax(122px,.95fr) minmax(54px,.35fr) minmax(74px,.5fr) minmax(74px,.5fr) minmax(76px,.55fr) minmax(76px,.55fr) !important;
        gap: 7px !important;
      }
      body.workspace-admin #editorDrawer .editor-rating-row { margin: 0 !important; }
      body.workspace-admin #editorDrawer .editor-star-rating { min-height: 32px !important; padding: 4px 8px !important; }
      body.workspace-admin #editorDrawer .star-rating-btn { font-size: 1.05rem !important; padding: 0 2px !important; }
      body.workspace-admin #editorDrawer .rating-help { display: none !important; }
      body.workspace-admin #editorDrawer .drawer-actions { margin-top: 8px !important; gap: 6px !important; }
      body.workspace-admin #editorDrawer .drawer-actions button { padding: 7px 10px !important; font-size: .82rem !important; }

      body.workspace-admin #controlsPanel {
        padding: 7px !important;
        overflow: visible !important;
      }
      body.workspace-admin #quickStrip.quick-strip {
        display: grid !important;
        grid-template-columns: repeat(11, minmax(0, 1fr)) !important;
        gap: 4px !important;
        margin: 0 0 5px 0 !important;
      }
      body.workspace-admin #quickStrip .quick-card,
      body.workspace-admin #quickStrip .stat-card {
        min-width: 0 !important;
        min-height: 44px !important;
        height: 44px !important;
        padding: 4px 5px !important;
        border-radius: 9px !important;
        overflow: hidden !important;
      }
      body.workspace-admin #quickStrip .stat-label { font-size: .55rem !important; line-height: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      body.workspace-admin #quickStrip .stat-value { font-size: .8rem !important; line-height: 1.05 !important; white-space: normal !important; }
      body.workspace-admin #quickStrip .stat-value.small { font-size: .68rem !important; }
      body.workspace-admin #controlsPanel .filters-grid {
        grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(78px,.42fr) minmax(78px,.42fr) !important;
        gap: 6px !important;
      }
      body.workspace-admin #controlsPanel select[multiple] { min-height: 70px !important; max-height: 70px !important; }
      body.workspace-admin #controlsPanel .filter-box { gap: 3px !important; }
      body.workspace-admin #controlsPanel .filter-label { font-size: .66rem !important; }
      body.workspace-admin #controlsPanel input,
      body.workspace-admin #controlsPanel select,
      body.workspace-admin #controlsPanel button { font-size: .74rem !important; min-height: 28px !important; padding: 4px 7px !important; }
      body.workspace-admin #controlsPanel .filters-cluster { gap: 6px !important; }
      body.workspace-admin #listPanel {
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        overflow: hidden !important;
      }
      body.workspace-admin #listPanel .table-wrap { height: 100% !important; overflow: auto !important; }
      body.workspace-admin .programs-table { min-width: 0 !important; width: 100% !important; table-layout: fixed !important; }
      body.workspace-admin .programs-table th,
      body.workspace-admin .programs-table td { padding: 6px 7px !important; font-size: .78rem !important; }
      body.workspace-admin .programs-table th:nth-child(6), body.workspace-admin .programs-table td:nth-child(6),
      body.workspace-admin .programs-table th:nth-child(8), body.workspace-admin .programs-table td:nth-child(8),
      body.workspace-admin .programs-table th:nth-child(9), body.workspace-admin .programs-table td:nth-child(9) { display: none !important; }
      body.workspace-admin .programs-table .col-title { width: 25% !important; }
      body.workspace-admin .programs-table .col-notes { width: 27% !important; }
      body.workspace-admin .programs-table .col-details { width: 12% !important; }
      body.workspace-admin .programs-table .col-airing { width: 12% !important; }
      body.workspace-admin .programs-table .col-rights { width: 12% !important; }
      body.workspace-admin .programs-table td:nth-child(4),
      body.workspace-admin .programs-table td:nth-child(5) {
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
      body.workspace-admin #quickStrip .admin-diagnostic-card { display: block !important; }
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
      body.workspace-test-page #controlsPanel .cluster-clear-all { padding-top: 0 !important; align-self: end !important; }
      body.workspace-test-page #controlsPanel .cluster-clear-all .reset-all { width: 100% !important; white-space: nowrap !important; }
      body.workspace-test-page #controlsPanel .filter-foot {
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        margin: 5px 0 0 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      body.workspace-test-page #controlsPanel .filter-foot .reset-all {
        width: auto !important;
        min-width: 98px !important;
        max-width: 100% !important;
        white-space: nowrap !important;
      }
      body.workspace-test-page #controlsPanel .compact-search-cluster {
        contain: layout style !important;
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

      @media (max-width: 1180px) {
        body.workspace-admin #appShell.workspace-layout {
          height: auto !important;
          min-height: 100dvh !important;
          overflow: visible !important;
          grid-template-rows: auto minmax(0, 1fr) !important;
        }
        body.workspace-admin #workspaceSplitGrid {
          grid-template-columns: 1fr !important;
          grid-template-rows: auto auto !important;
          gap: 8px !important;
          overflow: visible !important;
        }
        body.workspace-admin #workspaceSplitter { display: none !important; }
        body.workspace-admin #workspaceLibraryPane {
          min-height: 0 !important;
          overflow: visible !important;
          grid-template-rows: auto auto minmax(360px, 62vh) !important;
        }
        body.workspace-admin #workspaceEditorPane {
          border-radius: 16px !important;
          overflow: visible !important;
        }
        body.workspace-admin #editorDrawer {
          border-radius: 16px !important;
          height: auto !important;
          max-height: none !important;
        }
        body.workspace-admin #listPanel .table-wrap { max-height: 62vh !important; }
        body.workspace-admin #quickStrip.quick-strip { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
      }

      @media (max-width: 780px) {
        body.workspace-admin #appShell.workspace-layout {
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          grid-template-rows: auto auto minmax(0, 1fr) !important;
        }
        body.workspace-admin #workspaceResponsiveNav { display: flex !important; }
        body.workspace-admin #workspaceSplitGrid {
          grid-template-columns: 1fr !important;
          grid-template-rows: minmax(0, 1fr) !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        body.workspace-admin #workspaceLibraryPane,
        body.workspace-admin #workspaceEditorPane {
          min-height: 0 !important;
          overflow: hidden !important;
        }
        body.workspace-narrow.workspace-admin:not(.workspace-show-editor) #workspaceEditorPane { display: none !important; }
        body.workspace-narrow.workspace-admin.workspace-show-editor #workspaceLibraryPane { display: none !important; }
        body.workspace-admin #workspaceLibraryPane {
          grid-template-rows: auto auto minmax(0, 1fr) !important;
        }
        body.workspace-admin #listPanel .table-wrap {
          height: 100% !important;
          max-height: none !important;
        }
        body.workspace-admin #workspaceEditorPane {
          border-radius: 16px !important;
          height: 100% !important;
        }
        body.workspace-admin #editorDrawer {
          border-radius: 16px !important;
          height: 100% !important;
          max-height: none !important;
          overflow: auto !important;
        }
        body.workspace-admin #quickStrip.quick-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        body.workspace-admin #controlsPanel .filters-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
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
    editorPane.setAttribute('aria-label', 'Add or edit program');

    if (mobileNav) libraryPane.appendChild(mobileNav);
    libraryPane.appendChild(controls);
    libraryPane.appendChild(list);
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
      if (!document.body.classList.contains('workspace-admin')) return;
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
      : 'minmax(118px, .78fr) minmax(126px, .85fr) minmax(68px, .36fr) minmax(64px, .34fr)');

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
      : 'repeat(12, minmax(0, 1fr))');

    const placements = narrowCluster ? [
      ['.cluster-type', '1 / span 2', '1'],
      ['.cluster-search-text', '3 / span 4', '1'],
      ['.cluster-distributor', '1 / span 2', '2'],
      ['.cluster-episodes', '3 / span 2', '2'],
      ['.cluster-clear-all', '5 / span 2', '2'],
      ['.cluster-search-in', '1 / span 2', '3'],
      ['.cluster-rights-start', '3 / span 2', '3'],
      ['.cluster-rights-end', '5 / span 2', '3'],
      ['.cluster-status', '1 / span 3', '4'],
      ['.cluster-rating', '4 / span 3', '4']
    ] : [
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

    placements.forEach(([selector, column, row]) => placeGridItem(cluster.querySelector(selector), column, row));

    const clearHolder = cluster.querySelector('.cluster-clear-all');
    if (clearHolder) {
      setWorkspaceImportant(clearHolder, 'display', 'flex');
      setWorkspaceImportant(clearHolder, 'align-items', 'end');
      setWorkspaceImportant(clearHolder, 'justify-content', 'stretch');
      setWorkspaceImportant(clearHolder, 'padding-top', '0');
    }

    installSecondaryTopicChecklist();
  }

  function selectedValues(select) {
    return new Set(Array.from(select?.selectedOptions || []).map((option) => option.value));
  }

  function escapeTextForHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function installSecondaryTopicChecklist() {
    const select = document.getElementById('secondaryTopicFilter');
    if (!select) return;

    let checklist = document.getElementById('secondaryTopicChecklist');
    if (!checklist) {
      checklist = document.createElement('div');
      checklist.id = 'secondaryTopicChecklist';
      checklist.setAttribute('role', 'group');
      checklist.setAttribute('aria-label', 'Secondary topics');
      select.insertAdjacentElement('afterend', checklist);
    }
    select.classList.add('workspace-native-secondary-select');

    if (select.dataset.workspaceChecklistBound !== 'true') {
      select.dataset.workspaceChecklistBound = 'true';
      select.addEventListener('change', () => window.setTimeout(renderSecondaryTopicChecklist, 0));
      const observer = new MutationObserver(() => window.setTimeout(renderSecondaryTopicChecklist, 0));
      observer.observe(select, { childList: true, subtree: false, attributes: true, attributeFilter: ['selected'] });
    }

    if (checklist.dataset.workspaceChecklistBound !== 'true') {
      checklist.dataset.workspaceChecklistBound = 'true';
      checklist.addEventListener('change', (event) => {
        const input = event.target.closest('input[type="checkbox"][data-secondary-topic-value]');
        if (!input) return;
        const option = Array.from(select.options).find((item) => item.value === input.dataset.secondaryTopicValue);
        if (!option) return;
        option.selected = input.checked;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    renderSecondaryTopicChecklist();
  }

  function renderSecondaryTopicChecklist() {
    const select = document.getElementById('secondaryTopicFilter');
    const checklist = document.getElementById('secondaryTopicChecklist');
    if (!select || !checklist) return;
    const selected = selectedValues(select);
    const options = Array.from(select.options || []).filter((option) => option.value);
    if (!options.length) {
      checklist.innerHTML = '<div class="workspace-check-empty">No secondary topics</div>';
      return;
    }
    checklist.innerHTML = options.map((option, index) => {
      const id = `secondaryTopicCheck_${index}`;
      const value = option.value;
      const label = option.textContent || value;
      return `<label class="workspace-check-row" for="${id}"><input id="${id}" type="checkbox" data-secondary-topic-value="${escapeTextForHtml(value)}" ${selected.has(value) ? 'checked' : ''}><span class="workspace-check-text">${escapeTextForHtml(label)}</span></label>`;
    }).join('');
  }

  function updateWorkspaceDiagnosticStats() {
    const missingTarget = document.getElementById('statMissingInfo');
    if (!missingTarget || !Array.isArray(state?.programs)) return;
    const activePrograms = state.programs.filter((program) => !program.is_archived);
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

  function installWorkspaceFilterLayoutPatch() {
    if (window.__wnmuWorkspaceFilterLayoutPatched) return;
    window.__wnmuWorkspaceFilterLayoutPatched = true;
    const rerun = () => window.requestAnimationFrame(() => {
      installWorkspaceFilterToggle();
      applyWorkspaceFilterLayout();
      updateWorkspaceDiagnosticStats();
      updateWorkspaceFilterSummary();
    });
    [0, 80, 220, 500, 1000, 1800].forEach((delay) => window.setTimeout(rerun, delay));
    window.addEventListener('resize', rerun);
    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('#controlsPanel')) window.setTimeout(rerun, 0);
    }, true);
    // Deliberately do not recalculate the filter grid on search keystrokes.
    // The old production filter-layout helper did that, which made the buttons jump rows while typing.
    // This one-page test page owns its filter layout directly so typing only changes results, not geometry.
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
      active: 'Active',
      archived: 'Archived',
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
    const admin = isWorkspaceAdmin();
    document.body.classList.toggle('workspace-admin', admin);
    const pane = document.getElementById('workspaceEditorPane');
    if (pane) pane.setAttribute('aria-hidden', admin ? 'false' : 'true');
    if (!admin && typeof closeEditor === 'function') {
      const drawer = document.getElementById('editorDrawer');
      if (drawer && !drawer.classList.contains('hidden')) {
        suppressWorkspaceReopen = true;
        try { closeEditor(); } finally { suppressWorkspaceReopen = false; }
      }
    }
  }

  function ensureWorkspaceEditorOpen() {
    if (!isWorkspaceAdmin()) return;
    const drawer = document.getElementById('editorDrawer');
    if (!drawer) return;
    if (drawer.classList.contains('hidden') && typeof openEditor === 'function') {
      workspaceOpeningDefaultEditor = true;
      try {
        openEditor(null);
      } finally {
        window.setTimeout(() => { workspaceOpeningDefaultEditor = false; }, 0);
      }
    }
  }

  function deriveArchiveFlag(existingItem, rightsEndIso) {
    if (rightsEndIso) return rightsEndIso < isoTodayValue();
    if (existingItem && Object.prototype.hasOwnProperty.call(existingItem, 'is_archived')) return Boolean(existingItem.is_archived);
    return false;
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
        exclude_from_auto_archive: Boolean(existingItem?.exclude_from_auto_archive),
        is_archived: Boolean(existingItem?.is_archived)
      };

      const selectedRating = normalizeRating(form.elements.rating?.value);
      payload.is_archived = deriveArchiveFlag(existingItem, payload.rights_end);

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
          ? `\n${summary.archivedCount} matching archived program${summary.archivedCount === 1 ? ' is' : 's are'} already in the archive.`
          : '';
        const proceed = confirm(`Possible duplicate found (${dupes.length}).${archivedLine}\nSave anyway?`);
        if (!proceed) return;
      }

      const archiveChanged = existingItem && Boolean(existingItem.is_archived) !== Boolean(payload.is_archived);
      const saveMessage = !programId
        ? 'Creating program…'
        : (archiveChanged && payload.is_archived ? 'Saving changes and moving to archive…' : (archiveChanged ? 'Saving changes and restoring to active…' : 'Saving changes…'));
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

        const statusNote = archiveChanged
          ? (payload.is_archived ? ' Program moved to archive because rights are expired.' : ' Program restored to active because rights are current.')
          : '';
        const savedMessage = (!programId ? 'Created program.' : `Saved changes.${statusNote}`) + ratingWarning;
        refreshUiAfterProgramMutation(savedMessage, { renderFilters: lookupsChanged });
        setLoading('');
        closeEditor();
      } catch (error) {
        console.error(error);
        setLoading('');
        alert(error.message);
        setStatus(error.message);
      }
    };
  }

  function patchWorkspaceFunctions() {
    injectWorkspaceStyles();
    installWorkspaceShell();
    patchSaveProgram();
    patchRenderStats();
    installWorkspaceFilterToggle();
    installWorkspaceResponsiveMode();
    installWorkspaceFilterLayoutPatch();
    applyWorkspaceFilterLayout();
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
          if (!isWorkspaceAdmin()) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          closeEditor();
        }, true);
        document.addEventListener('keydown', (event) => {
          if (!isWorkspaceAdmin()) return;
          const formIsOpen = !els.drawer.classList.contains('hidden');
          if (event.key === 'Escape' && formIsOpen) {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeEditor();
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
        window.setTimeout(ensureWorkspaceEditorOpen, 60);
        return result;
      };
    }

    if (typeof loadEverything === 'function' && !window.__wnmuWorkspaceLoadPatched) {
      window.__wnmuWorkspaceLoadPatched = true;
      const originalLoadEverything = loadEverything;
      loadEverything = async function workspaceLoadEverything(...args) {
        const result = await originalLoadEverything.apply(this, args);
        syncWorkspaceMode();
        window.setTimeout(ensureWorkspaceEditorOpen, 80);
        return result;
      };
    }

    if (typeof openEditor === 'function' && !window.__wnmuWorkspaceOpenPatched) {
      window.__wnmuWorkspaceOpenPatched = true;
      const originalOpenEditor = openEditor;
      openEditor = function workspaceOpenEditor(id = null, duplicate = false) {
        syncWorkspaceMode();
        const result = originalOpenEditor.call(this, id, duplicate);
        if (isWorkspaceAdmin()) {
          els.drawerBackdrop?.classList.add('hidden');
          if (!id && els.drawerTitle) els.drawerTitle.textContent = 'Add New Program';
          if (isNarrowWorkspace() && !workspaceOpeningDefaultEditor) setWorkspaceActivePanel('editor');
        }
        return result;
      };
    }

    if (typeof closeEditor === 'function' && !window.__wnmuWorkspaceClosePatched) {
      window.__wnmuWorkspaceClosePatched = true;
      const originalCloseEditor = closeEditor;
      closeEditor = function workspaceCloseEditor(...args) {
        const shouldReopen = isWorkspaceAdmin() && !suppressWorkspaceReopen && !isNarrowWorkspace();
        const result = originalCloseEditor.apply(this, args);
        if (isWorkspaceAdmin() && isNarrowWorkspace()) setWorkspaceActivePanel('library');
        if (shouldReopen) window.setTimeout(() => openEditor(null), 30);
        return result;
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncWorkspaceMode();
      window.setTimeout(ensureWorkspaceEditorOpen, 200);
    });
  } else {
    syncWorkspaceMode();
    window.setTimeout(ensureWorkspaceEditorOpen, 200);
  }

  patchWorkspaceFunctions();
  [80, 220, 500, 1000, 1800].forEach((delay) => window.setTimeout(() => {
    syncWorkspaceMode();
    ensureWorkspaceEditorOpen();
  }, delay));
})();
