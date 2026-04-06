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

  els.tableBody?.addEventListener('click', async (event) => {
    const openBtn = event.target.closest('[data-open-program]');
    if (openBtn) {
      event.stopPropagation();
      if (shouldSuppressProgramActivation()) return;
      openEditor(openBtn.dataset.openProgram);
      return;
    }
    const copyBtn = event.target.closest('[data-copy-note]');
    if (copyBtn) {
      event.stopPropagation();
      await handleCopyNote(copyBtn.dataset.copyNote, copyBtn);
      return;
    }
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    if (shouldSuppressProgramActivation()) return;
    openEditor(row.dataset.id);
  });

  els.searchInput?.addEventListener('input', scheduleSearchUpdate);
  els.searchInput?.addEventListener('blur', flushSearchUpdate);
  els.searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      flushSearchUpdate();
    }
  });

  [els.searchFieldSelect, els.distributorFilter, els.programTypeFilter, els.statusFilter]
    .forEach((el) => el.addEventListener('input', updateQueryStatus));
  [els.codeFilter, els.topicFilter, els.secondaryTopicFilter, els.lengthFilter, els.distributorFilter, els.programTypeFilter, els.statusFilter, els.searchFieldSelect]
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