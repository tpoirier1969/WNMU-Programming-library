// WNMU Programming Workspace Test — explicit rights begin/end sorting
// v1.5.121
// Split-window test only. Makes the Rights column expose separate Begin and End sort controls.

(function () {
  'use strict';

  const VERSION = 'v1.5.121';

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureStyles() {
    if (byId('workspaceRightsSortStyles')) return;

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

  function replaceRightsHeaderIfNeeded() {
    const rightsHeader = document.querySelector('th.col-rights');
    if (!rightsHeader) return;

    const already = rightsHeader.querySelector('[data-sort-field="rights_begin"]')
      && rightsHeader.querySelector('[data-sort-field="rights_end"]');

    if (!already) {
      rightsHeader.classList.add('workspace-rights-sort-th');
      rightsHeader.innerHTML = `
        <div class="workspace-rights-sort-head">
          <span class="workspace-rights-sort-title">Rights</span>
          <span class="workspace-rights-sort-buttons">
            <button type="button" class="sort-header workspace-rights-sort-btn" data-sort-field="rights_begin">Begin <span class="sort-indicator" aria-hidden="true">↕</span></button>
            <button type="button" class="sort-header workspace-rights-sort-btn" data-sort-field="rights_end">End <span class="sort-indicator" aria-hidden="true">↕</span></button>
          </span>
        </div>
      `;
    } else {
      rightsHeader.classList.add('workspace-rights-sort-th');
      rightsHeader.querySelectorAll('[data-sort-field]').forEach((button) => {
        button.classList.add('workspace-rights-sort-btn');
      });
    }
  }

  function attachSortHandlers() {
    document.querySelectorAll('.workspace-rights-sort-btn[data-sort-field]').forEach((button) => {
      if (button.dataset.workspaceRightsSortBound === '1') return;
      button.dataset.workspaceRightsSortBound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const field = button.dataset.sortField;
        if (!field) return;

        if (typeof setSort === 'function') {
          setSort(field);
          return;
        }

        try {
          if (typeof state === 'object' && state?.currentSort) {
            const same = state.currentSort.field === field;
            state.currentSort.field = field;
            state.currentSort.direction = same && state.currentSort.direction === 'asc' ? 'desc' : 'asc';
            if (typeof renderTable === 'function') renderTable();
          }
        } catch (_error) {}
      });
    });
  }

  function refresh() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    ensureStyles();
    replaceRightsHeaderIfNeeded();
    attachSortHandlers();
  }

  function install() {
    refresh();
    [80, 220, 500, 1000, 1800].forEach((delay) => window.setTimeout(refresh, delay));

    if (window.__wnmuWorkspaceRightsSortObserver !== '1') {
      window.__wnmuWorkspaceRightsSortObserver = '1';
      const observer = new MutationObserver(() => window.setTimeout(refresh, 0));
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUWorkspaceRightsSort = {
    version: VERSION,
    refresh
  };
})();
