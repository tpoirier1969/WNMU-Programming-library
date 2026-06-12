// v1.5.95 Quick Air Dates save hardening
// Keeps the Quick Air Dates inline editor on the same programs table fields,
// but avoids the extra programs_enriched refresh fetch that could throw
// an unhelpful browser "TypeError: Failed to fetch" even after the detail editor worked.

(function () {
  const VERSION = 'v1.5.95 quick air dates save hardening';

  function text(value) {
    if (typeof normalizeText === 'function') return normalizeText(value);
    return (value ?? '').toString().trim();
  }

  function describeSaveError(error) {
    const raw = error || {};
    const message = raw.message || String(raw) || 'Unknown error';
    if (/failed to fetch/i.test(message)) {
      return [
        'Quick Air Dates save failed before the browser received a database response.',
        'This is usually a network/session/Supabase request hiccup, not bad air-date text.',
        'The full browser error was: TypeError: Failed to fetch.'
      ].join('\n');
    }

    const parts = [message];
    if (raw.details) parts.push(`Details: ${raw.details}`);
    if (raw.hint) parts.push(`Hint: ${raw.hint}`);
    if (raw.code) parts.push(`Code: ${raw.code}`);
    return parts.join('\n');
  }

  async function updateProgramsTableWithRetry(programId, payload) {
    let lastError = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const { error } = await state.supabase
          .from('programs')
          .update(payload)
          .eq('id', programId);

        if (error) throw error;
        return true;
      } catch (error) {
        lastError = error;
        const message = error?.message || String(error);
        const retryable = /failed to fetch|network|fetch/i.test(message);
        if (!retryable || attempt >= 2) break;
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }
    }

    throw new Error(describeSaveError(lastError));
  }

  function patchLocalProgram(programId, payload) {
    const program = Array.isArray(state?.programs)
      ? state.programs.find((item) => String(item.id) === String(programId))
      : null;

    if (!program) return null;

    program.aired_13_1 = payload.aired_13_1 || '';
    program.aired_13_3 = payload.aired_13_3 || '';

    if (typeof updateProgramDerived === 'function') updateProgramDerived(program);
    if (state) state.templateSourceDirty = true;
    return program;
  }

  async function hardenedSaveInlineAirings(programId, values = {}) {
    if (typeof canEdit === 'function' && !canEdit()) {
      throw new Error('Read-only mode. Use Admin sign in with GitHub to make changes.');
    }
    if (!state?.supabase) {
      throw new Error('Quick Air Dates save failed: Supabase is not initialized.');
    }
    if (!programId) {
      throw new Error('Quick Air Dates save failed: missing program id.');
    }

    const payload = {
      aired_13_1: text(values.aired_13_1) || null,
      aired_13_3: text(values.aired_13_3) || null
    };

    await updateProgramsTableWithRetry(programId, payload);

    const patched = patchLocalProgram(programId, payload);

    try {
      if (typeof persistProgramsCache === 'function') persistProgramsCache();
      if (typeof renderFilters === 'function') renderFilters();
      if (typeof renderTable === 'function') renderTable();
      if (typeof renderStats === 'function') renderStats();
      if (typeof snapshotViewState === 'function' && state) state.lastAppliedViewState = snapshotViewState();
      if (typeof syncUndoButton === 'function') syncUndoButton();
      if (typeof setStatus === 'function') setStatus('Saved airing fields.');
    } catch (uiError) {
      console.warn('Quick Air Dates saved, but UI refresh had a problem:', uiError);
      if (typeof setStatus === 'function') setStatus('Saved airing fields. Refresh if the row does not update.');
    }

    return patched || { id: programId, ...payload };
  }

  // Replace the original global function used by the existing Quick Air Dates button.
  try {
    window.saveInlineAirings = hardenedSaveInlineAirings;
    // In non-module browser scripts, global function bindings are also writable by name.
    saveInlineAirings = hardenedSaveInlineAirings; // eslint-disable-line no-global-assign
    window.__wnmuQuickAirDatesFixVersion = VERSION;
  } catch (error) {
    console.warn('Could not install Quick Air Dates fix:', error);
  }
})();
