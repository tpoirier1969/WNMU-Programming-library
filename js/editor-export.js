// Editor interactions, save/delete, export, and query status
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

function openEditor(id = null, duplicate = false) {
  const form = els.programForm;
  let item = state.programs.find((program) => String(program.id) === String(id)) || null;

  if (duplicate && item) {
    item = { ...item, id: null, title: `${item.title} (copy)` };
  }

  const openToken = ++state.editorOpenToken;
  const fields = ['title','legacy_code','notes','episode_season','nola_eidr','program_type','length_minutes','topic','secondary_topic','aired_13_1','aired_13_3','distributor','vote','rights_begin','rights_end','rights_notes','package_type','server_tape'];

  state.selectedId = item?.id || null;
  els.drawer.classList.remove('hidden');
  els.drawer.classList.add('drawer-loading');
  els.drawerBackdrop.classList.remove('hidden');
  document.body.classList.add('modal-open');
  els.drawerTitle.textContent = item ? (duplicate ? 'Duplicate program' : (canEdit() ? item.title : `View: ${item.title}`)) : 'New program';
  form.dataset.programId = item?.id || '';
  form.reset();
  fields.forEach((field) => {
    if (!form.elements[field]) return;
    form.elements[field].value = '';
  });
  Object.entries(DEFAULT_NEW_PROGRAM_VALUES).forEach(([field, value]) => {
    if (!item?.id && form.elements[field]) form.elements[field].value = value;
  });
  ['rights_begin', 'rights_end'].forEach(syncDateProxyField);

  if (els.templateTools) els.templateTools.classList.toggle('hidden', Boolean(item?.id));
  if (els.templateSourceInput) els.templateSourceInput.value = '';
  els.duplicateCheck.innerHTML = '';
  els.duplicateCheck.classList.add('hidden');
  els.formFlags.innerHTML = '<span class="badge info">Loading…</span>';
  applyEditorMode();
  if (els.lookupBtn) els.lookupBtn.disabled = true;
  setLookupMessage('Loading program window…', 'info');
  setSelectedRowHighlight(state.selectedId);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (state.editorOpenToken !== openToken || els.drawer.classList.contains('hidden')) return;

      for (const field of fields) {
        let value = field === 'secondary_topic' ? normalizeMultiValueInput(item?.[field]) : (item?.[field] ?? '');
        if (field === 'rights_begin' || field === 'rights_end') value = formatShortDateInput(value);
        form.elements[field].value = value;
      }
      if (!item?.id) {
        Object.entries(DEFAULT_NEW_PROGRAM_VALUES).forEach(([field, value]) => {
          if (form.elements[field] && !normalizeText(form.elements[field].value)) form.elements[field].value = value;
        });
      }
      ['rights_begin', 'rights_end'].forEach(syncDateProxyField);

      if (!item?.id) renderTemplateSourceList();

      updateVoteVisibility();
      setLookupMessage(item ? 'Lookup can fill remaining blank fields from online sources.' : 'Enter a title, then click Lookup online to fill whatever can be found.');
      updateLookupButtonState();
      renderFormFlags(item);
      renderDuplicateCheck();
      applyEditorMode();
      els.drawer.classList.remove('drawer-loading');

      if (canEdit() && !state.lookupsLoaded) {
        ensureLookupsLoaded(true).catch((error) => console.warn('Lookup warm load skipped:', error));
      }

      requestAnimationFrame(() => form.elements.title.focus());
    });
  });
}

function renderFormFlags(item) {
  if (!item) {
    els.formFlags.innerHTML = '<span class="badge info">New record</span>';
    return;
  }
  els.formFlags.innerHTML = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
}

function updateVoteVisibility() {
  const isApt = normalizeLower(els.programForm.elements.distributor.value) === 'apt';
  els.voteFieldWrap.classList.toggle('hidden-field', !isApt);
  els.programForm.elements.vote.disabled = !isApt;
  if (!isApt) els.programForm.elements.vote.value = '';
}

function closeEditor() {
  state.editorOpenToken += 1;
  els.drawer.classList.add('hidden');
  els.drawer.classList.remove('drawer-loading');
  els.drawerBackdrop.classList.add('hidden');
  document.body.classList.remove('modal-open');
  state.selectedId = null;
  els.duplicateCheck.innerHTML = '';
  els.duplicateCheck.classList.add('hidden');
  state.lookupBusy = false;
  setLookupMessage('');
  updateLookupButtonState();
  setSelectedRowHighlight(null);
}

async function saveProgram(event) {
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
    const proceed = confirm(`Possible duplicate found (${dupes.length}). Save anyway?`);
    if (!proceed) return;
  }

  setLoading(programId ? 'Saving changes…' : 'Creating program…');

  try {
    let response;
    if (programId) {
      response = await state.supabase.from('programs').update(payload).eq('id', programId);
    } else {
      response = await state.supabase.from('programs').insert(payload);
    }
    if (response.error) throw response.error;

    const refreshedProgram = programId ? await fetchProgramById(programId) : await fetchInsertedProgram(payload);
    mergeProgramIntoState(refreshedProgram);
    syncLookupsFromProgram(refreshedProgram);
    refreshUiAfterProgramMutation(programId ? 'Saved changes.' : 'Created program.');
    setLoading('');
    closeEditor();
  } catch (error) {
    console.error(error);
    setLoading('');
    alert(error.message);
    setStatus(error.message);
  }
}

async function deleteProgram() {
  if (!canEdit()) return;
  const id = els.programForm.dataset.programId;
  if (!id) {
    closeEditor();
    return;
  }
  if (!confirm('Delete this program permanently? This is the real woodchipper option.')) return;

  setLoading('Deleting program…');
  const { error } = await state.supabase.from('programs').delete().eq('id', id);
  if (error) {
    console.error(error);
    setLoading('');
    alert(error.message);
    return;
  }

  state.programs = state.programs.filter((program) => String(program.id) !== String(id));
  state.templateSourceDirty = true;
  refreshUiAfterProgramMutation('Program deleted.');
  setLoading('');
  closeEditor();
}

function exportCurrentView() {
  const items = activePrograms();
  const columns = ['legacy_code','title','notes','episode_season','nola_eidr','program_type','length_minutes','topic','secondary_topic','aired_13_1','aired_13_3','vote','rights_begin','rights_end','rights_notes','package_type','server_tape','distributor','is_archived','exclude_from_auto_archive'];
  const lines = [columns.join(',')];
  for (const item of items) {
    lines.push(columns.map((col) => csvEscape(item[col])).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'program-library-export.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function escapeHtml(text) {
  return (text ?? '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function updateQueryStatus() {
  rememberViewState();
  const count = activePrograms().length;
  renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${count.toLocaleString()} matching programs.`);
}

