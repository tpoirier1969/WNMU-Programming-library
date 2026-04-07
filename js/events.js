// Event wiring and keyboard shortcuts
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

function bindEvents() {
  els.adminBtn.addEventListener('click', () => {
    if (canEdit()) {
      setStatus('Admin mode is already active.');
      return;
    }
    els.authMessage.textContent = '';
    els.authShell.classList.remove('hidden');
    requestAnimationFrame(() => els.loginGitHubBtn?.focus());
  });

  els.loginGitHubBtn?.addEventListener('click', async () => {
    els.authMessage.textContent = 'Sending you to GitHub…';
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'https://tpoirier1969.github.io/WNMU-Programming-library/'
      }
    });
    if (error) {
      els.authMessage.textContent = error.message;
      setStatus(error.message);
    }
  });

  els.cancelLoginBtn?.addEventListener('click', () => {
    els.authShell.classList.add('hidden');
    els.authMessage.textContent = '';
  });

  els.logoutBtn.addEventListener('click', async () => {
    await state.supabase.auth.signOut();
    state.session = null;
    updateModeUI();
    setStatus('Signed out. Read-only mode is active.');
  });

  els.newProgramBtn.addEventListener('click', () => openEditor());
  els.undoViewBtn?.addEventListener('click', undoViewState);
  els.closeDrawerBtn.addEventListener('click', closeEditor);
  els.drawerBackdrop.addEventListener('click', closeEditor);
  els.programForm.addEventListener('submit', saveProgram);
  els.deleteBtn.addEventListener('click', deleteProgram);
  els.restoreBtn?.addEventListener('click', restoreArchivedProgram);
  els.loadTemplateBtn?.addEventListener('click', loadTemplateIntoForm);
  ['title', 'nola_eidr'].forEach((field) => {
    els.programForm.elements[field].addEventListener('input', () => {
      renderDuplicateCheck();
      if (field === 'title') updateLookupButtonState();
    });
    els.programForm.elements[field].addEventListener('change', () => {
      renderDuplicateCheck();
      if (field === 'title') updateLookupButtonState();
    });
  });
  els.lookupBtn?.addEventListener('click', performMetadataLookup);
  els.duplicateBtn.addEventListener('click', () => {
    const id = els.programForm.dataset.programId;
    if (!id) return;
    openEditor(id, true);
  });
  els.editorRating?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-editor-rating]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit()) return;
    setEditorRating(button.dataset.editorRating);
  });


  els.windowReactivateShield?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearProgramActivationGuard();
  });
  els.windowReactivateShield?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearProgramActivationGuard();
  });

  window.addEventListener('blur', () => {
    armProgramActivationGuard();
  });
  window.addEventListener('focus', () => {
    scheduleProgramActivationGuardRelease();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      armProgramActivationGuard();
      return;
    }
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      scheduleProgramActivationGuardRelease();
    }
  });

  const swallowWakeActivationClick = (event) => {
    if (!handleWakeActivationInteraction(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  };

  document.addEventListener('pointerdown', swallowWakeActivationClick, true);
  document.addEventListener('mousedown', swallowWakeActivationClick, true);
  document.addEventListener('click', (event) => {
    if (!state.suppressNextListWakeClick) return;
    const hitListPanel = Boolean(event.target instanceof Element && event.target.closest('#listPanel'));
    if (!hitListPanel) return;
    state.suppressNextListWakeClick = false;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }, true);

  els.tableBody?.addEventListener('click', async (event) => {
    const openBtn = event.target.closest('[data-open-program]');
    if (openBtn) {
      event.stopPropagation();
      if (shouldSuppressProgramActivation(event.target)) return;
      openEditor(openBtn.dataset.openProgram);
      return;
    }

    const inlineAiringToggleBtn = event.target.closest('[data-inline-airing-toggle]');
    if (inlineAiringToggleBtn) {
      event.preventDefault();
      event.stopPropagation();
      const nextId = inlineAiringToggleBtn.dataset.inlineAiringToggle;
      state.inlineAiringEditorId = String(state.inlineAiringEditorId || '') === String(nextId) ? null : nextId;
      renderTable();
      return;
    }

    const inlineRatingBtn = event.target.closest('[data-inline-rating-value]');
    if (inlineRatingBtn) {
      event.preventDefault();
      event.stopPropagation();
      if (!canEdit()) return;
      const programId = inlineRatingBtn.dataset.inlineRatingProgram;
      const program = state.programs.find((item) => String(item.id) === String(programId));
      const current = getProgramRating(program);
      const chosen = normalizeRating(inlineRatingBtn.dataset.inlineRatingValue);
      const nextRating = current != null && current === chosen ? null : chosen;
      const editor = inlineRatingBtn.closest('[data-inline-rating-editor]');

      setProgramRatingLocal(programId, nextRating);
      if (editor) {
        renderInlineRatingEditorState(editor, nextRating);
        editor.classList.add('saving');
      }
      syncInlineRatingEditors(programId);
      setStatus('Saving rating…');

      try {
        await persistProgramRating(programId, nextRating, { refreshUi: false, statusMessage: 'Saved rating.' });
        if (els.ratingFilter?.value) renderTable();
        persistProgramsCache();
        state.lastAppliedViewState = snapshotViewState();
        syncUndoButton();
        setStatus('Saved rating.');
      } catch (error) {
        console.error(error);
        syncInlineRatingEditors(programId);
        alert(`${error.message}

The rating is still shown locally in this browser, but it may not have synced to the database.`);
        setStatus(error.message);
      } finally {
        if (editor) editor.classList.remove('saving');
      }
      return;
    }

    const inlineSaveBtn = event.target.closest('[data-inline-airing-save]');
    if (inlineSaveBtn) {
      event.preventDefault();
      event.stopPropagation();
      if (!canEdit()) {
        alert('Read-only mode. Use Admin sign in with GitHub to make changes.');
        return;
      }
      const editor = inlineSaveBtn.closest('[data-inline-airing-editor]');
      if (!editor) return;
      const programId = inlineSaveBtn.dataset.inlineAiringSave;
      const aired131 = editor.querySelector('[data-inline-airing-field="aired_13_1"]')?.value || '';
      const aired133 = editor.querySelector('[data-inline-airing-field="aired_13_3"]')?.value || '';
      const originalLabel = inlineSaveBtn.textContent;
      inlineSaveBtn.disabled = true;
      inlineSaveBtn.textContent = 'Saving…';
      try {
        await saveInlineAirings(programId, { aired_13_1: aired131, aired_13_3: aired133 });
      } catch (error) {
        console.error(error);
        alert(error.message);
        setStatus(error.message);
      } finally {
        inlineSaveBtn.disabled = false;
        inlineSaveBtn.textContent = originalLabel;
      }
      return;
    }

    const copyBtn = event.target.closest('[data-copy-note]');
    if (copyBtn) {
      event.stopPropagation();
      await handleCopyNote(copyBtn.dataset.copyNote, copyBtn);
      return;
    }
    if (event.target.closest('.inline-airing-editor') || isInteractiveElement(event.target)) return;
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    if (shouldSuppressProgramActivation(event.target)) return;
    openEditor(row.dataset.id);
  });

  els.tableBody?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const input = event.target.closest('[data-inline-airing-field]');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    const editor = input.closest('[data-inline-airing-editor]');
    const saveBtn = editor?.querySelector('[data-inline-airing-save]');
    if (saveBtn) saveBtn.click();
  });

  ['focusin', 'pointerdown', 'mousedown'].forEach((eventName) => {
    els.tableBody?.addEventListener(eventName, (event) => {
      if (!event.target.closest('.inline-airing-editor')) return;
      event.stopPropagation();
    }, true);
  });

  els.searchInput?.addEventListener('input', scheduleSearchUpdate);
  els.searchInput?.addEventListener('blur', flushSearchUpdate);
  els.searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      flushSearchUpdate();
    }
  });

  [els.searchFieldSelect, els.distributorFilter, els.programTypeFilter, els.statusFilter, els.ratingFilter]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('input', updateQueryStatus));
  [els.codeFilter, els.topicFilter, els.secondaryTopicFilter, els.lengthFilter, els.distributorFilter, els.programTypeFilter, els.statusFilter, els.searchFieldSelect, els.ratingFilter]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('change', updateQueryStatus));

  els.programForm.elements.distributor.addEventListener('change', updateVoteVisibility);
  els.programForm.elements.distributor.addEventListener('input', updateVoteVisibility);

  ['rights_begin', 'rights_end'].forEach((field) => {
    const input = els.programForm.elements[field];
    const proxy = els.programForm.elements[`${field}_picker`];
    const pickerBtn = els.programForm.querySelector(`[data-date-picker="${field}"]`);
    if (!input) return;
    const normalizeDateField = () => {
      const normalized = normalizeIsoDate(input.value);
      if (normalized) input.value = formatShortDateInput(normalized);
      syncDateProxyField(field);
    };
    input.addEventListener('blur', normalizeDateField);
    input.addEventListener('change', normalizeDateField);
    if (proxy) {
      proxy.addEventListener('change', () => {
        if (proxy.value) input.value = formatShortDateInput(proxy.value);
        syncDateProxyField(field);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        requestAnimationFrame(() => input.focus());
      });
    }
    if (pickerBtn && proxy) {
      pickerBtn.addEventListener('click', () => {
        syncDateProxyField(field);
        if (typeof proxy.showPicker === 'function') {
          proxy.showPicker();
          return;
        }
        proxy.focus();
        proxy.click();
      });
    }
  });

  els.clearCodeFilter?.addEventListener('click', () => {
    clearMultiSelect(els.codeFilter);
    updateQueryStatus();
  });
  els.clearTopicFilter?.addEventListener('click', () => {
    clearMultiSelect(els.topicFilter);
    updateQueryStatus();
  });
  els.clearSecondaryTopicFilter?.addEventListener('click', () => {
    clearMultiSelect(els.secondaryTopicFilter);
    updateQueryStatus();
  });
  els.clearLengthFilter?.addEventListener('click', () => {
    clearMultiSelect(els.lengthFilter);
    updateQueryStatus();
  });
  els.resetFiltersBtn?.addEventListener('click', resetFilters);


  document.querySelectorAll('[data-sort-field]').forEach((button) => {
    button.addEventListener('click', () => setSort(button.dataset.sortField));
  });

  els.showFiltersBtn?.addEventListener('click', () => setMobileSection('filters'));
  els.showProgramsBtn?.addEventListener('click', () => setMobileSection('programs'));
  MOBILE_SECTION_MEDIA.addEventListener?.('change', handleMobileLayoutChange);

  els.quickStrip.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view]');
    if (!btn) return;
    state.currentView = btn.dataset.view === 'expired' ? 'archived' : btn.dataset.view;
    syncQuickViewState();
    els.statusFilter.value = '';
    updateQueryStatus();
  });

  els.exportBtn.addEventListener('click', exportCurrentView);
  els.refreshBtn.addEventListener('click', async () => {
    await loadEverything({ forceFresh: true });
  });

  document.addEventListener('keydown', (event) => {
    const formIsOpen = !els.drawer.classList.contains('hidden');
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && formIsOpen) {
      event.preventDefault();
      els.programForm.requestSubmit();
    }
    if (event.key === 'Escape' && formIsOpen) {
      closeEditor();
    }
    if (event.key.toLowerCase() === 'n' && !isInteractiveElement(document.activeElement) && canEdit()) {
      event.preventDefault();
      openEditor();
    }
  });

  els.programForm.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA' || event.target.type === 'submit' || event.target.type === 'button') return;
    event.preventDefault();
    const fields = Array.from(els.programForm.querySelectorAll('input, select, textarea, button')).filter((el) => !el.disabled && el.type !== 'hidden');
    const index = fields.indexOf(event.target);
    if (index >= 0 && index < fields.length - 1) fields[index + 1].focus();
  });
}

document.addEventListener('DOMContentLoaded', init);