// v1.5.100 Main Library UI polish
// Keeps the version-check rollup, fixes the visible version flag,
// moves Quick Air Dates beside the rating stars, and removes description Copy buttons.

(function () {
  const VERSION = 'v1.5.100 main library UI polish';

  function injectStyles() {
    if (document.getElementById('wnmuMainLibraryUiV15100Styles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuMainLibraryUiV15100Styles';
    style.textContent = `
      #appShell .topbar {
        padding: 8px 12px !important;
        gap: 12px !important;
      }
      #appShell .brand-wrap {
        gap: 12px !important;
        min-width: 0 !important;
      }
      #appShell .program-brand-mark {
        width: 124px !important;
        border-radius: 12px !important;
      }
      #appShell .brand-name {
        font-size: .98rem !important;
        line-height: 1.05 !important;
      }
      #appShell #appTitle {
        margin: 0 !important;
        font-size: 1.28rem !important;
        line-height: 1 !important;
      }
      #appShell .compact-title-row {
        gap: 7px 9px !important;
        align-items: center !important;
      }
      #appShell .topbar-status-inline {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 0 !important;
        max-width: min(58vw, 740px) !important;
        padding: 3px 8px !important;
        border-radius: 999px !important;
        background: rgba(45, 199, 189, .10) !important;
        border: 1px solid rgba(18, 134, 127, .18) !important;
        color: var(--muted) !important;
        font-size: .76rem !important;
        line-height: 1.12 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      #appShell .topbar-actions {
        gap: 6px !important;
      }
      #appShell .topbar-actions button {
        padding: 7px 10px !important;
      }

      .program-rating-tools-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        margin-top: 5px !important;
      }
      .program-rating-tools-row .program-rating-row,
      .program-rating-tools-row .program-inline-tools {
        margin-top: 0 !important;
      }
      .program-rating-tools-row .program-rating-row {
        min-height: 20px !important;
        gap: 4px !important;
      }
      .program-rating-tools-row .star-rating-btn {
        font-size: 1.02rem !important;
        padding: 0 1px !important;
      }
      .program-rating-tools-row .rating-text {
        font-size: .7rem !important;
      }
      .program-rating-tools-row .inline-airing-toggle-btn {
        padding: 3px 7px !important;
        font-size: .68rem !important;
        line-height: 1.05 !important;
        white-space: nowrap !important;
      }
      .programs-table .program-title {
        font-size: .95rem !important;
        line-height: 1.1 !important;
      }
      .programs-table .program-sub {
        margin-top: 3px !important;
        gap: 4px !important;
        font-size: .74rem !important;
      }
      .programs-table .code-pill,
      .programs-table .series-count-pill,
      .programs-table .episode-tag-pill {
        padding-top: 1px !important;
        padding-bottom: 1px !important;
      }
      .programs-table tbody td {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
      }

      .programs-table .copy-note-btn {
        display: none !important;
      }
      .programs-table .notes-cell.copy-button-removed {
        gap: 0 !important;
      }

      @media (max-width: 980px) {
        #appShell .topbar-status-inline {
          max-width: 100% !important;
          white-space: normal !important;
        }
        #appShell .program-brand-mark {
          width: 112px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }


  function syncVisibleVersionFlag() {
    const pill = document.getElementById('appVersion');
    if (pill) pill.textContent = 'v1.5.100';
  }

  function removeVisibleRefreshButton() {
    const refreshButton = document.getElementById('refreshBtn');
    if (!refreshButton) return;
    refreshButton.classList.add('hidden');
    refreshButton.setAttribute('aria-hidden', 'true');
    refreshButton.setAttribute('tabindex', '-1');

    // Let the original events.js listener attach first, then remove the visible control.
    window.setTimeout(() => {
      const currentRefreshButton = document.getElementById('refreshBtn');
      if (currentRefreshButton) currentRefreshButton.remove();
    }, 0);
  }

  function ensureStatusIsInline() {
    const statusLine = document.getElementById('statusLine');
    const versionPill = document.getElementById('appVersion');
    if (!statusLine || !versionPill) return;
    statusLine.classList.add('topbar-status-inline');
    if (statusLine.previousElementSibling !== versionPill) {
      versionPill.insertAdjacentElement('afterend', statusLine);
    }
  }

  function tightenTopbar() {
    removeVisibleRefreshButton();
    ensureStatusIsInline();
  }

  function removeDescriptionCopyButtons() {
    document.querySelectorAll('#programTableBody .copy-note-btn').forEach((button) => {
      button.remove();
    });
    document.querySelectorAll('#programTableBody .notes-cell').forEach((cell) => {
      cell.classList.add('copy-button-removed');
    });
  }

  function moveQuickAirDatesAfterRating() {
    document.querySelectorAll('#programTableBody tr[data-id]').forEach((row) => {
      const firstCell = row.querySelector('td');
      if (!firstCell) return;
      const ratingRow = firstCell.querySelector(':scope > .program-rating-row, :scope > .program-rating-tools-row .program-rating-row');
      const quickTools = firstCell.querySelector(':scope > .program-inline-tools, :scope > .program-rating-tools-row .program-inline-tools');
      if (!ratingRow || !quickTools) return;

      let holder = firstCell.querySelector(':scope > .program-rating-tools-row');
      if (!holder) {
        holder = document.createElement('div');
        holder.className = 'program-rating-tools-row';
        firstCell.insertBefore(holder, ratingRow);
      }

      if (ratingRow.parentElement !== holder) holder.appendChild(ratingRow);
      if (quickTools.parentElement !== holder) holder.appendChild(quickTools);
    });
  }

  function patchRenderTable() {
    if (window.__wnmuMainUiV15100RenderPatch) return;
    window.__wnmuMainUiV15100RenderPatch = true;

    if (typeof renderTable === 'function') {
      const originalRenderTable = renderTable;
      renderTable = function patchedRenderTable(...args) {
        const result = originalRenderTable.apply(this, args);
        moveQuickAirDatesAfterRating();
        removeDescriptionCopyButtons();
        return result;
      };
    }
  }

  function enforceUi() {
    syncVisibleVersionFlag();
    injectStyles();
    tightenTopbar();
    moveQuickAirDatesAfterRating();
    removeDescriptionCopyButtons();
  }

  injectStyles();
  patchRenderTable();

  document.addEventListener('DOMContentLoaded', () => {
    enforceUi();
    window.addEventListener('resize', enforceUi);
  });

  if (document.readyState !== 'loading') enforceUi();
  window.setTimeout(enforceUi, 60);
  window.setTimeout(enforceUi, 300);
  window.setTimeout(enforceUi, 1200);

  window.__wnmuMainLibraryUiVersion = VERSION;
})();
