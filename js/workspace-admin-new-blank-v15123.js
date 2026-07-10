// WNMU Programming Library — admin return-to-new-blank form after create
// v1.5.123
// Workspace/default page only. UI workflow only: no Supabase writes.

(function () {
  'use strict';

  const VERSION = 'v1.5.123';
  let createSaveInProgress = false;
  let createSaveCloseSeen = false;
  let installAttempts = 0;

  function byId(id) {
    return document.getElementById(id);
  }

  function normalize(value) {
    try {
      if (typeof normalizeText === 'function') return normalizeText(value);
    } catch (_error) {}
    return String(value ?? '').trim();
  }

  function isAdmin() {
    try {
      return Boolean(window.WNMU_WORKSPACE_TEST && typeof canEdit === 'function' && canEdit());
    } catch (_error) {
      return false;
    }
  }

  function currentFormIsNewProgram() {
    const form = byId('programForm') || window.els?.programForm;
    if (!form) return false;
    return !normalize(form.dataset.programId);
  }

  function drawerIsHidden() {
    const drawer = byId('editorDrawer') || window.els?.drawer;
    return !drawer || drawer.classList.contains('hidden');
  }

  function forceBlankCreateForm() {
    if (!isAdmin()) return;
    if (typeof openEditor !== 'function') return;

    // Only reopen if the successful create save actually left the details pane empty.
    // If another program was selected immediately, do not override that selection.
    try {
      if (!drawerIsHidden() && !currentFormIsNewProgram()) return;
    } catch (_error) {}

    try {
      if (typeof state === 'object' && state) state.selectedId = null;
    } catch (_error) {}

    try {
      openEditor(null);
    } catch (error) {
      console.warn('Workspace admin blank-create reopen failed:', error);
      return;
    }

    try {
      if (typeof applyWorkspaceNewProgramDefaults === 'function') applyWorkspaceNewProgramDefaults();
    } catch (_error) {}

    try {
      document.body.classList.add('workspace-editor-open');
      document.body.classList.remove('workspace-show-library');
      if (document.body.classList.contains('workspace-narrow')) document.body.classList.add('workspace-show-editor');
    } catch (_error) {}

    try {
      const title = byId('drawerTitle');
      if (title) title.textContent = 'Add New Program';
    } catch (_error) {}
  }

  function scheduleBlankCreateForm() {
    if (!isAdmin()) return;

    [40, 140, 360, 800].forEach((delay) => {
      window.setTimeout(() => {
        if (!isAdmin()) return;
        forceBlankCreateForm();
      }, delay);
    });
  }

  function patchSaveProgram() {
    if (window.__wnmuWorkspaceAdminNewBlankSavePatched === '1') return false;
    if (typeof saveProgram !== 'function') return false;

    window.__wnmuWorkspaceAdminNewBlankSavePatched = '1';
    const originalSaveProgram = saveProgram;

    saveProgram = async function workspaceAdminNewBlankSaveProgram(event, ...args) {
      const wasNewProgramCreate = isAdmin() && currentFormIsNewProgram();
      if (wasNewProgramCreate) {
        createSaveInProgress = true;
        createSaveCloseSeen = false;
      }

      try {
        return await originalSaveProgram.call(this, event, ...args);
      } finally {
        if (wasNewProgramCreate) {
          // If validation failed, closeEditor will not have been called, so do not force a blank form.
          window.setTimeout(() => {
            if (createSaveCloseSeen) scheduleBlankCreateForm();
            createSaveInProgress = false;
            createSaveCloseSeen = false;
          }, 80);
        }
      }
    };

    return true;
  }

  function patchCloseEditor() {
    if (window.__wnmuWorkspaceAdminNewBlankClosePatched === '1') return false;
    if (typeof closeEditor !== 'function') return false;

    window.__wnmuWorkspaceAdminNewBlankClosePatched = '1';
    const originalCloseEditor = closeEditor;

    closeEditor = function workspaceAdminNewBlankCloseEditor(...args) {
      const shouldReturnToBlank = createSaveInProgress && isAdmin();
      const result = originalCloseEditor.apply(this, args);

      if (shouldReturnToBlank) {
        createSaveCloseSeen = true;
        scheduleBlankCreateForm();
      }

      return result;
    };

    return true;
  }

  function install() {
    installAttempts += 1;
    const savePatched = patchSaveProgram();
    const closePatched = patchCloseEditor();

    if ((!savePatched || !closePatched) && installAttempts < 40) {
      window.setTimeout(install, 120);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  [300, 800, 1600, 3200].forEach((delay) => window.setTimeout(install, delay));

  window.WNMUWorkspaceAdminNewBlank = {
    version: VERSION,
    forceBlankCreateForm
  };
})();
