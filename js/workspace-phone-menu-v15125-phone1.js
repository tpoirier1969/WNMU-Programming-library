// WNMU Programming Library phone-only menu and details overlay.
// Activates only at 760px or narrower. Desktop and tablet DOM is restored unchanged.
(function () {
  'use strict';

  const PHONE_QUERY = '(max-width: 760px)';
  const phoneMedia = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;
  let installed = false;
  let active = false;
  let explicitAddRequest = false;
  let actionsMarker = null;
  let controlsMarker = null;
  let menuBackdrop = null;
  let menuSheet = null;
  let menuBody = null;
  let addProgramButton = null;
  let editorBackdrop = null;
  let logoBadge = null;
  let originalOpenEditor = null;
  let originalCloseEditor = null;

  function isPhone() {
    return phoneMedia ? phoneMedia.matches : window.innerWidth <= 760;
  }

  function canPhoneEdit() {
    try { return typeof window.canEdit === 'function' && window.canEdit(); }
    catch { return false; }
  }

  function injectStyles() {
    if (document.getElementById('wnmuPhoneMenuStyles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuPhoneMenuStyles';
    style.textContent = `
      .wnmu-phone-only { display: none !important; }

      @media (max-width: 760px) {
        body.wnmu-phone-ui { overflow: hidden !important; }
        body.wnmu-phone-ui #appShell.workspace-layout {
          height: 100dvh !important;
          min-height: 100dvh !important;
          grid-template-rows: auto minmax(0, 1fr) !important;
          gap: 6px !important;
          padding: 6px !important;
          overflow: hidden !important;
        }
        body.wnmu-phone-ui .topbar {
          min-height: 62px !important;
          padding: 6px 9px !important;
          flex-direction: row !important;
          align-items: center !important;
          border-radius: 14px !important;
        }
        body.wnmu-phone-ui .brand-wrap {
          width: 100% !important;
          align-items: center !important;
          gap: 9px !important;
        }
        body.wnmu-phone-ui .workspace-programming-icon {
          width: 52px !important;
          max-width: 52px !important;
          border-radius: 11px !important;
          cursor: pointer !important;
          touch-action: manipulation;
        }
        body.wnmu-phone-ui .workspace-programming-icon:focus-visible {
          outline: 3px solid rgba(18,134,127,.38);
          outline-offset: 3px;
        }
        body.wnmu-phone-ui .brand-name { font-size: .72rem !important; }
        body.wnmu-phone-ui #appTitle {
          font-size: 1rem !important;
          line-height: 1.05 !important;
          white-space: normal !important;
        }
        body.wnmu-phone-ui .compact-title-row { gap: 6px !important; }
        body.wnmu-phone-ui #appVersion { padding: 2px 7px !important; font-size: .68rem !important; }
        body.wnmu-phone-ui #statusLine { display: none !important; }
        body.wnmu-phone-ui .topbar > .topbar-actions { display: none !important; }
        body.wnmu-phone-ui #workspaceResponsiveNav,
        body.wnmu-phone-ui #mobileSectionNav { display: none !important; }
        body.wnmu-phone-ui #workspaceSplitGrid {
          min-height: 0 !important;
          height: 100% !important;
          grid-template-columns: 1fr !important;
          grid-template-rows: minmax(0, 1fr) !important;
          overflow: hidden !important;
        }
        body.wnmu-phone-ui #workspaceLibraryPane,
        body.wnmu-phone-ui.workspace-show-editor #workspaceLibraryPane,
        body.wnmu-phone-ui.workspace-show-library #workspaceLibraryPane {
          display: grid !important;
          grid-template-rows: minmax(0, 1fr) !important;
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        body.wnmu-phone-ui #listPanel {
          min-height: 0 !important;
          height: 100% !important;
          border-radius: 14px !important;
        }
        body.wnmu-phone-ui #listPanel .table-wrap {
          min-height: 0 !important;
          height: 100% !important;
          max-height: none !important;
          overflow: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        body.wnmu-phone-ui #workspaceEditorPane { display: none !important; }
        body.wnmu-phone-ui.phone-editor-modal-open #workspaceEditorPane {
          display: block !important;
          position: fixed !important;
          inset: 8px !important;
          z-index: 1302 !important;
          width: auto !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border-radius: 16px !important;
          background: #fff !important;
          box-shadow: 0 24px 70px rgba(9,29,48,.34) !important;
        }
        body.wnmu-phone-ui.phone-editor-modal-open #editorDrawer {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-height: none !important;
          overflow: auto !important;
          border-radius: 16px !important;
          -webkit-overflow-scrolling: touch;
        }
        body.wnmu-phone-ui #workspaceEditorEmpty { display: none !important; }

        .wnmu-phone-only { display: block !important; }
        #wnmuPhoneLogoBadge {
          position: absolute;
          left: 44px;
          top: 43px;
          z-index: 4;
          min-width: 25px;
          height: 25px;
          padding: 0 6px;
          display: grid !important;
          place-items: center;
          border: 2px solid #fff;
          border-radius: 999px;
          background: #0f8f89;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 4px 10px rgba(9,29,48,.22);
          cursor: pointer;
        }
        #wnmuPhoneMenuBackdrop,
        #wnmuPhoneEditorBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1298;
          background: rgba(9,29,48,.48);
          backdrop-filter: blur(2px);
        }
        #wnmuPhoneEditorBackdrop { z-index: 1300; }
        #wnmuPhoneMenuBackdrop.hidden,
        #wnmuPhoneEditorBackdrop.hidden,
        #wnmuPhoneMenuSheet.hidden { display: none !important; }
        #wnmuPhoneMenuSheet {
          position: fixed;
          inset: 8px;
          z-index: 1299;
          display: grid !important;
          grid-template-rows: auto minmax(0, 1fr);
          min-height: 0;
          border: 1px solid rgba(18,134,127,.28);
          border-radius: 18px;
          background: linear-gradient(180deg, #fff 0%, #eafaf8 100%);
          box-shadow: 0 24px 70px rgba(9,29,48,.34);
          overflow: hidden;
        }
        .wnmu-phone-menu-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(18,134,127,.18);
          background: rgba(255,255,255,.96);
        }
        .wnmu-phone-menu-title { color: var(--teal-dark); font-size: 1.04rem; font-weight: 900; }
        .wnmu-phone-menu-actions { display: flex; gap: 8px; align-items: center; }
        #wnmuPhoneAddProgramBtn.hidden { display: none !important; }
        #wnmuPhoneMenuClose { min-width: 42px; }
        #wnmuPhoneMenuBody {
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 12px;
          -webkit-overflow-scrolling: touch;
        }
        #wnmuPhoneMenuBody .topbar-actions {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 8px !important;
          width: 100% !important;
          margin-bottom: 12px;
        }
        #wnmuPhoneMenuBody .topbar-actions button {
          width: 100% !important;
          min-height: 44px;
          flex-basis: auto !important;
        }
        #wnmuPhoneMenuBody #controlsPanel {
          display: grid !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 10px !important;
        }
        #wnmuPhoneMenuBody #controlsPanel .filters-grid,
        #wnmuPhoneMenuBody #controlsPanel .compact-search-cluster {
          max-width: 100% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createPhoneUi() {
    if (menuSheet) return;

    menuBackdrop = document.createElement('div');
    menuBackdrop.id = 'wnmuPhoneMenuBackdrop';
    menuBackdrop.className = 'wnmu-phone-only hidden';
    menuBackdrop.setAttribute('aria-hidden', 'true');

    menuSheet = document.createElement('section');
    menuSheet.id = 'wnmuPhoneMenuSheet';
    menuSheet.className = 'wnmu-phone-only hidden';
    menuSheet.setAttribute('role', 'dialog');
    menuSheet.setAttribute('aria-modal', 'true');
    menuSheet.setAttribute('aria-label', 'Programming Library menu and filters');
    menuSheet.innerHTML = `
      <div class="wnmu-phone-menu-head">
        <div class="wnmu-phone-menu-title">Menu &amp; Filters</div>
        <div class="wnmu-phone-menu-actions">
          <button type="button" id="wnmuPhoneAddProgramBtn" class="primary hidden">Add Program</button>
          <button type="button" id="wnmuPhoneMenuClose" aria-label="Close menu">Close</button>
        </div>
      </div>
      <div id="wnmuPhoneMenuBody"></div>
    `;
    menuBody = menuSheet.querySelector('#wnmuPhoneMenuBody');
    addProgramButton = menuSheet.querySelector('#wnmuPhoneAddProgramBtn');

    editorBackdrop = document.createElement('div');
    editorBackdrop.id = 'wnmuPhoneEditorBackdrop';
    editorBackdrop.className = 'wnmu-phone-only hidden';
    editorBackdrop.setAttribute('aria-hidden', 'true');

    document.body.append(menuBackdrop, menuSheet, editorBackdrop);

    menuBackdrop.addEventListener('click', closeMenu);
    menuSheet.querySelector('#wnmuPhoneMenuClose')?.addEventListener('click', closeMenu);
    editorBackdrop.addEventListener('click', closePhoneEditor);
    addProgramButton?.addEventListener('click', () => {
      if (!canPhoneEdit() || typeof window.openEditor !== 'function') return;
      explicitAddRequest = true;
      closeMenu();
      window.openEditor(null);
    });
  }

  function installLogoTrigger() {
    const logo = document.querySelector('#appShell .workspace-programming-icon');
    const topbar = document.querySelector('#appShell .topbar');
    if (!logo || !topbar) return;

    logo.setAttribute('role', 'button');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', 'Open menu and filters');
    logo.setAttribute('aria-haspopup', 'dialog');
    logo.addEventListener('click', openMenu);
    logo.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu();
      }
    });

    logoBadge = document.createElement('button');
    logoBadge.type = 'button';
    logoBadge.id = 'wnmuPhoneLogoBadge';
    logoBadge.className = 'wnmu-phone-only';
    logoBadge.textContent = '☰';
    logoBadge.setAttribute('aria-label', 'Open menu and filters');
    logoBadge.addEventListener('click', openMenu);
    topbar.appendChild(logoBadge);
  }

  function showPhoneEditor() {
    if (!active) return;
    document.body.classList.add('phone-editor-modal-open');
    editorBackdrop?.classList.remove('hidden');
    editorBackdrop?.setAttribute('aria-hidden', 'false');
  }

  function hidePhoneEditor() {
    document.body.classList.remove('phone-editor-modal-open');
    editorBackdrop?.classList.add('hidden');
    editorBackdrop?.setAttribute('aria-hidden', 'true');
  }

  function closePhoneEditor() {
    hidePhoneEditor();
    explicitAddRequest = false;
    if (typeof window.closeEditor === 'function') window.closeEditor();
  }

  function syncAdminControls() {
    addProgramButton?.classList.toggle('hidden', !canPhoneEdit());
  }

  function openMenu() {
    if (!active) return;
    syncAdminControls();
    hidePhoneEditor();
    menuBackdrop?.classList.remove('hidden');
    menuSheet?.classList.remove('hidden');
    menuBackdrop?.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => menuSheet?.querySelector('#wnmuPhoneMenuClose')?.focus(), 0);
  }

  function closeMenu() {
    menuBackdrop?.classList.add('hidden');
    menuSheet?.classList.add('hidden');
    menuBackdrop?.setAttribute('aria-hidden', 'true');
  }

  function movePhoneControlsIntoMenu() {
    const topbarActions = document.querySelector('#appShell .topbar-actions');
    const controls = document.getElementById('controlsPanel');
    if (!topbarActions || !controls || !menuBody) return false;

    if (!actionsMarker) {
      actionsMarker = document.createComment('wnmu-phone-actions-home');
      topbarActions.parentNode?.insertBefore(actionsMarker, topbarActions);
    }
    if (!controlsMarker) {
      controlsMarker = document.createComment('wnmu-phone-controls-home');
      controls.parentNode?.insertBefore(controlsMarker, controls);
    }

    menuBody.appendChild(topbarActions);
    menuBody.appendChild(controls);
    return true;
  }

  function restoreDesktopDom() {
    const topbarActions = menuBody?.querySelector('.topbar-actions');
    const controls = menuBody?.querySelector('#controlsPanel');
    if (topbarActions && actionsMarker?.parentNode) actionsMarker.parentNode.insertBefore(topbarActions, actionsMarker.nextSibling);
    if (controls && controlsMarker?.parentNode) controlsMarker.parentNode.insertBefore(controls, controlsMarker.nextSibling);
  }

  function patchEditorFunctions() {
    if (!originalOpenEditor && typeof window.openEditor === 'function') {
      originalOpenEditor = window.openEditor;
      window.openEditor = function phoneAwareOpenEditor(id, ...args) {
        const openingExisting = id !== null && id !== undefined && id !== '';
        const result = originalOpenEditor.call(this, id, ...args);
        if (active && (openingExisting || explicitAddRequest)) {
          showPhoneEditor();
          explicitAddRequest = false;
        } else if (active) {
          hidePhoneEditor();
        }
        return result;
      };
    }

    if (!originalCloseEditor && typeof window.closeEditor === 'function') {
      originalCloseEditor = window.closeEditor;
      window.closeEditor = function phoneAwareCloseEditor(...args) {
        if (active) hidePhoneEditor();
        explicitAddRequest = false;
        return originalCloseEditor.apply(this, args);
      };
    }
  }

  function activatePhoneUi() {
    if (active || !isPhone()) return;
    if (!movePhoneControlsIntoMenu()) return;
    active = true;
    document.body.classList.add('wnmu-phone-ui');
    document.body.classList.remove('phone-editor-modal-open');
    closeMenu();
    hidePhoneEditor();
    syncAdminControls();
  }

  function deactivatePhoneUi() {
    if (!active) return;
    closeMenu();
    hidePhoneEditor();
    restoreDesktopDom();
    document.body.classList.remove('wnmu-phone-ui', 'phone-editor-modal-open');
    active = false;
  }

  function syncMode() {
    if (isPhone()) activatePhoneUi();
    else deactivatePhoneUi();
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    createPhoneUi();
    installLogoTrigger();
    patchEditorFunctions();

    phoneMedia?.addEventListener?.('change', syncMode);
    window.addEventListener('resize', syncMode, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(syncMode, 80));
    document.addEventListener('keydown', (event) => {
      if (!active || event.key !== 'Escape') return;
      if (!menuSheet?.classList.contains('hidden')) closeMenu();
      else if (document.body.classList.contains('phone-editor-modal-open')) closePhoneEditor();
    });

    document.getElementById('closeDrawerBtn')?.addEventListener('click', () => {
      if (active) hidePhoneEditor();
    }, true);

    document.getElementById('adminBtn')?.addEventListener('click', () => window.setTimeout(syncAdminControls, 300));
    document.getElementById('logoutBtn')?.addEventListener('click', () => window.setTimeout(syncAdminControls, 100));
    menuBody?.addEventListener('click', (event) => {
      const button = event.target.closest('.topbar-actions button');
      if (button) window.setTimeout(closeMenu, 0);
    });

    syncMode();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
