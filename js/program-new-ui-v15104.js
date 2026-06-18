// v1.5.104 Add New Program UI fixes
// Removes date-picker controls, defaults Aired On fields to No, and skips rating stars in Tab order.

(function () {
  const VERSION = 'v1.5.104 add program ui fixes';
  const AIRING_FIELDS = ['aired_13_1', 'aired_13_3'];

  function form() {
    return document.getElementById('programForm');
  }

  function field(name) {
    return form()?.elements?.[name] || null;
  }

  function text(value) {
    return String(value ?? '').trim();
  }

  function defaultAiredOnFields(options = {}) {
    const overwriteBlankOnly = options.overwriteBlankOnly !== false;
    AIRING_FIELDS.forEach((name) => {
      const input = field(name);
      if (!input) return;
      if (!overwriteBlankOnly || !text(input.value)) input.value = 'No';
      input.placeholder = 'No';
    });
  }

  function removeDatePickerControls() {
    document.querySelectorAll('.date-picker-btn, .date-picker-proxy, [data-date-picker]').forEach((node) => node.remove());
    document.querySelectorAll('.date-entry-wrap').forEach((wrap) => {
      wrap.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
      wrap.style.setProperty('gap', '0', 'important');
    });
  }

  function removeRatingFromTabOrder() {
    document.querySelectorAll('#editorRating [data-editor-rating]').forEach((button) => {
      button.tabIndex = -1;
    });
  }

  function normalizeImportedBlankAirings() {
    AIRING_FIELDS.forEach((name) => {
      const input = field(name);
      if (!input) return;
      if (!text(input.value)) input.value = 'No';
    });
  }

  function patchFunction(name, after) {
    const original = window[name];
    if (typeof original !== 'function' || original.__wnmuAddProgramUiPatched) return;
    const patched = function patchedAddProgramUiFunction(...args) {
      const result = original.apply(this, args);
      after(...args);
      return result;
    };
    patched.__wnmuAddProgramUiPatched = true;
    try { window[name] = patched; }
    catch (error) { console.warn(`Could not patch ${name}:`, error); }
  }

  function patchExistingBehavior() {
    patchFunction('applyDefaultValues', () => {
      defaultAiredOnFields({ overwriteBlankOnly: true });
      removeRatingFromTabOrder();
    });

    patchFunction('resetFormForNewEntry', () => {
      defaultAiredOnFields({ overwriteBlankOnly: false });
      removeRatingFromTabOrder();
    });

    patchFunction('applyTemplateToForm', () => {
      defaultAiredOnFields({ overwriteBlankOnly: false });
      removeRatingFromTabOrder();
    });

    patchFunction('applyPbsImportToForm', () => {
      normalizeImportedBlankAirings();
      removeRatingFromTabOrder();
    });

    patchFunction('renderEditorRatingControl', () => {
      removeRatingFromTabOrder();
    });
  }

  function enforce() {
    removeDatePickerControls();
    defaultAiredOnFields({ overwriteBlankOnly: true });
    removeRatingFromTabOrder();
  }

  patchExistingBehavior();

  document.addEventListener('DOMContentLoaded', () => {
    patchExistingBehavior();
    enforce();
    window.setTimeout(enforce, 0);
    window.setTimeout(enforce, 250);
    window.setTimeout(enforce, 900);
  });

  if (document.readyState !== 'loading') {
    patchExistingBehavior();
    enforce();
  }

  const observer = new MutationObserver(() => {
    removeDatePickerControls();
    removeRatingFromTabOrder();
  });

  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {}

  window.__wnmuAddProgramUiVersion = VERSION;
})();
