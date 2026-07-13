// WNMU Programming Library — workspace default main page cleanup
// Updated for v1.5.125
// Loaded by the promoted workspace default page. UI-only: no Supabase writes.

(function () {
  'use strict';

  const VERSION = String(window.WNMU_APP_VERSION || 'v1.5.125');

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureStyles() {
    if (byId('workspaceDefaultMainStyles')) return;
    const style = document.createElement('style');
    style.id = 'workspaceDefaultMainStyles';
    style.textContent = `
      body.workspace-test-page #newProgramBtn,
      body.workspace-test-page #newProgramBtn.removed-control {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      body.workspace-test-page #appTitle {
        white-space: nowrap !important;
      }
    `;
    document.head.appendChild(style);
  }

  function suppressNewProgramButton() {
    const btn = byId('newProgramBtn');
    if (!btn) return;
    btn.classList.add('hidden', 'removed-control');
    btn.setAttribute('aria-hidden', 'true');
    btn.setAttribute('tabindex', '-1');
    btn.disabled = true;
  }

  function normalizeLabels() {
    document.title = 'WNMU-TV PBS Programming Library';
    const title = byId('appTitle');
    if (title && /workspace test/i.test(title.textContent || '')) title.textContent = 'Programming Library';
    const version = byId('appVersion');
    if (version) version.textContent = VERSION;
  }

  function install() {
    ensureStyles();
    suppressNewProgramButton();
    normalizeLabels();

    [60, 180, 500, 1000, 1800, 3200].forEach((delay) => {
      window.setTimeout(() => {
        ensureStyles();
        suppressNewProgramButton();
        normalizeLabels();
      }, delay);
    });

    if (window.__wnmuWorkspaceDefaultMainObserver !== '1') {
      window.__wnmuWorkspaceDefaultMainObserver = '1';
      const observer = new MutationObserver(() => {
        window.setTimeout(() => {
          suppressNewProgramButton();
          normalizeLabels();
        }, 0);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-hidden'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUWorkspaceDefaultMain = {
    version: VERSION,
    suppressNewProgramButton
  };
})();
