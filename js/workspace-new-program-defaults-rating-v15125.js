// WNMU Programming Library — isolated editor defaults and compact rating control.
// Scope: workspace editor only. Does not alter program-list ratings or database schema.
(function () {
  'use strict';

  const LAST_DISTRIBUTOR_KEY = 'wnmu-programming-last-distributor';
  let installed = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function isNewProgramForm() {
    const form = byId('programForm');
    return Boolean(form && !String(form.dataset.programId || '').trim());
  }

  function readLastDistributor() {
    try {
      return String(window.localStorage?.getItem(LAST_DISTRIBUTOR_KEY) || '').trim();
    } catch {
      return '';
    }
  }

  function rememberDistributor(value) {
    const distributor = String(value || '').trim();
    if (!distributor) return;
    try {
      window.localStorage?.setItem(LAST_DISTRIBUTOR_KEY, distributor);
    } catch {}
  }

  function applyNewProgramDefaults() {
    if (!isNewProgramForm()) return;
    const form = byId('programForm');
    if (!form) return;

    const defaults = {
      aired_13_1: 'No',
      aired_13_3: 'No',
      rights_notes: 'Unlim',
      distributor: readLastDistributor()
    };

    Object.entries(defaults).forEach(([name, value]) => {
      const field = form.elements?.[name];
      if (!field || !value || String(field.value || '').trim()) return;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function scheduleNewProgramDefaults() {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(applyNewProgramDefaults);
      });
    }, 0);
  }

  function installOpenEditorDefaults() {
    if (window.__wnmuNewProgramDefaultsOpenPatched || typeof window.openEditor !== 'function') return false;
    window.__wnmuNewProgramDefaultsOpenPatched = true;
    const originalOpenEditor = window.openEditor;
    window.openEditor = function wnmuOpenEditorWithDefaults(id = null, duplicate = false) {
      const result = originalOpenEditor.apply(this, arguments);
      if (!id && !duplicate) scheduleNewProgramDefaults();
      return result;
    };
    return true;
  }

  function buildRatingDropdown() {
    const container = byId('editorRating');
    const form = byId('programForm');
    const hiddenInput = form?.elements?.rating;
    if (!container || !hiddenInput) return false;

    let select = container.querySelector('#editorRatingSelect');
    if (!select) {
      container.replaceChildren();
      select = document.createElement('select');
      select.id = 'editorRatingSelect';
      select.className = 'editor-rating-select';
      select.setAttribute('aria-label', 'Program rating');
      [
        ['', 'Not rated'],
        ['1', '1'],
        ['2', '2'],
        ['3', '3'],
        ['4', '4'],
        ['5', '5']
      ].forEach(([value, label]) => select.add(new Option(label, value)));
      container.appendChild(select);

      select.addEventListener('change', () => {
        hiddenInput.value = select.value;
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    const ratingRow = container.closest('.editor-rating-row');
    const rightsRow = form.querySelector('.program-rights-row');
    if (ratingRow && rightsRow && ratingRow.parentElement !== rightsRow) {
      ratingRow.classList.remove('span-full');
      ratingRow.classList.add('compact-rating-field');
      const rightsBegin = rightsRow.querySelector('.compact-rights');
      rightsRow.insertBefore(ratingRow, rightsBegin || null);
    }

    return true;
  }

  function installRatingRenderer() {
    if (window.__wnmuEditorRatingDropdownInstalled) return true;
    if (!buildRatingDropdown()) return false;
    window.__wnmuEditorRatingDropdownInstalled = true;

    window.renderEditorRatingControl = function renderEditorRatingDropdown() {
      const form = byId('programForm');
      const hiddenInput = form?.elements?.rating;
      const select = byId('editorRatingSelect');
      if (!hiddenInput || !select) return;
      const numeric = Math.round(Number(hiddenInput.value));
      select.value = Number.isFinite(numeric) && numeric >= 1 && numeric <= 5 ? String(numeric) : '';
      select.disabled = typeof window.canEdit === 'function' ? !window.canEdit() : false;
    };

    window.renderEditorRatingControl();
    return true;
  }

  function installDistributorMemory() {
    const form = byId('programForm');
    const field = form?.elements?.distributor;
    if (!field || field.dataset.rememberDistributor === '1') return Boolean(field);
    field.dataset.rememberDistributor = '1';
    field.addEventListener('change', () => rememberDistributor(field.value));
    return true;
  }


  function injectStyles() {
    if (byId('wnmuEditorDefaultsRatingStyles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuEditorDefaultsRatingStyles';
    style.textContent = `
      body.workspace-test-page #editorDrawer .program-rights-row {
        grid-template-columns: minmax(126px, 1.05fr) minmax(104px, .82fr) minmax(74px, .52fr) minmax(96px, .72fr) minmax(96px, .72fr) !important;
        align-items: end !important;
      }
      body.workspace-test-page #editorDrawer .compact-rating-field {
        min-width: 0 !important;
        margin: 0 !important;
      }
      body.workspace-test-page #editorDrawer .compact-rating-field .rating-field {
        display: grid !important;
        gap: 3px !important;
        min-width: 0 !important;
      }
      body.workspace-test-page #editorDrawer .compact-rating-field .rating-help {
        display: none !important;
      }
      body.workspace-test-page #editorDrawer #editorRating {
        display: block !important;
        min-height: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }
      body.workspace-test-page #editorDrawer #editorRatingSelect {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 32px !important;
        padding: 6px 24px 6px 8px !important;
        border: 1px solid var(--border) !important;
        border-radius: 9px !important;
        background: #fff !important;
        color: var(--text) !important;
        font-size: .84rem !important;
      }
      @media (max-width: 760px) {
        body.workspace-test-page #editorDrawer .program-rights-row {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    const ready = installOpenEditorDefaults()
      && installRatingRenderer()
      && installDistributorMemory();
    if (!ready) return false;
    scheduleNewProgramDefaults();
    installed = true;
    return true;
  }

  function start() {
    if (installed || install()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 40) window.clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
