// WNMU Programming Workspace — Rights Begin/End header styles
// v1.5.125
// Style-only module. The header markup is static in the workspace HTML and
// the shared sort system handles both buttons. No DOM redraws, observers,
// retry timers, or duplicate click handlers live here.

(function () {
  'use strict';

  const VERSION = 'v1.5.125';

  function installStyles() {
    if (!window.WNMU_WORKSPACE_TEST || document.getElementById('workspaceRightsSortStyles')) return;
    const style = document.createElement('style');
    style.id = 'workspaceRightsSortStyles';
    style.textContent = `
      body.workspace-test-page .workspace-rights-sort-th {
        min-width: 0 !important;
      }

      body.workspace-test-page .workspace-rights-sort-head {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 3px !important;
        align-items: stretch !important;
        min-width: 0 !important;
      }

      body.workspace-test-page .workspace-rights-sort-title {
        display: block !important;
        font-size: .68rem !important;
        line-height: 1 !important;
        font-weight: 900 !important;
        color: inherit !important;
        text-transform: uppercase !important;
        letter-spacing: .02em !important;
        opacity: .82 !important;
      }

      body.workspace-test-page .workspace-rights-sort-buttons {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 3px !important;
        min-width: 0 !important;
      }

      body.workspace-test-page .workspace-rights-sort-btn {
        min-width: 0 !important;
        width: 100% !important;
        padding: 3px 4px !important;
        min-height: 23px !important;
        border-radius: 7px !important;
        font-size: .65rem !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        justify-content: center !important;
      }

      body.workspace-test-page .workspace-rights-sort-btn .sort-indicator {
        margin-left: 2px !important;
        font-size: .63rem !important;
      }

      body.workspace-test-page .rights-stack {
        font-size: .75rem !important;
        line-height: 1.15 !important;
      }

      body.workspace-test-page .rights-stack .rights-label {
        min-width: 32px !important;
        display: inline-block !important;
        font-weight: 800 !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installStyles, { once: true });
  else installStyles();

  window.WNMUWorkspaceRightsSort = { version: VERSION };
})();
