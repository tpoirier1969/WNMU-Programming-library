// WNMU Programming Library one-page workspace test
// Test-only add-on. It does not change schema/config and does not replace production pages.
(function () {
  'use strict';

  const WORKSPACE_KEY = 'wnmu-programming-workspace-left-width';
  const DEFAULT_LEFT_WIDTH = 58;
  let shellInstalled = false;
  let splitterInstalled = false;
  let suppressWorkspaceReopen = false;

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
      body.workspace-admin .programs-table th:nth-child(4), body.workspace-admin .programs-table td:nth-child(4),
      body.workspace-admin .programs-table th:nth-child(5), body.workspace-admin .programs-table td:nth-child(5),
      body.workspace-admin .programs-table th:nth-child(6), body.workspace-admin .programs-table td:nth-child(6),
      body.workspace-admin .programs-table th:nth-child(8), body.workspace-admin .programs-table td:nth-child(8),
      body.workspace-admin .programs-table th:nth-child(9), body.workspace-admin .programs-table td:nth-child(9) { display: none !important; }
      body.workspace-admin .programs-table .col-title { width: 30% !important; }
      body.workspace-admin .programs-table .col-notes { width: 36% !important; }
      body.workspace-admin .programs-table .col-details { width: 16% !important; }
      body.workspace-admin .programs-table .col-rights { width: 18% !important; }

      @media (max-width: 980px) {
        body.workspace-admin #appShell.workspace-layout { height: auto !important; min-height: 100dvh !important; overflow: visible !important; }
        body.workspace-admin #workspaceSplitGrid { grid-template-columns: 1fr !important; grid-template-rows: minmax(62vh, auto) 8px minmax(60vh, auto); overflow: visible !important; }
        body.workspace-admin #workspaceSplitter { display: block; height: 8px; width: auto; cursor: row-resize; }
        body.workspace-admin #workspaceSplitter::before { width: 48px; height: 3px; margin: 2px auto; }
        body.workspace-admin #workspaceEditorPane { border-radius: 16px !important; overflow: visible !important; }
        body.workspace-admin #editorDrawer { border-radius: 16px !important; height: auto !important; max-height: none !important; }
        body.workspace-admin #quickStrip.quick-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
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
    topbar.insertAdjacentElement('afterend', grid);
    appShell.classList.add('workspace-layout');
    shellInstalled = true;
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

  function syncWorkspaceMode() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    installWorkspaceShell();
    installSplitter();
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
      openEditor(null);
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
        }
        return result;
      };
    }

    if (typeof closeEditor === 'function' && !window.__wnmuWorkspaceClosePatched) {
      window.__wnmuWorkspaceClosePatched = true;
      const originalCloseEditor = closeEditor;
      closeEditor = function workspaceCloseEditor(...args) {
        const shouldReopen = isWorkspaceAdmin() && !suppressWorkspaceReopen;
        const result = originalCloseEditor.apply(this, args);
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
