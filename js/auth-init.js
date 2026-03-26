// Bootstrap, session restore, and mode switching
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

async function init() {
  if (!hasValidConfig()) {
    els.setupNotice.classList.remove('hidden');
    return;
  }

  const appTitle = normalizeText(els.appTitle?.textContent) || document.title || 'Program Library';
  const staticVersion = normalizeText(els.appVersion?.textContent);
  document.title = staticVersion ? `${appTitle} ${staticVersion}` : appTitle;
  els.authTitle.textContent = appTitle;
  els.appTitle.textContent = appTitle;

  const noStoreFetch = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' });
  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { fetch: noStoreFetch }
  });
  bindEvents();

  const authHashError = parseAuthErrorFromHash();
  if (authHashError) {
    els.authMessage.textContent = authHashError;
    els.authShell.classList.remove('hidden');
    setStatus(authHashError);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  showApp();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    const wasEditing = canEdit();
    const drawerDraft = captureDrawerDraft();
    state.session = session;
    const isEditing = canEdit();
    updateModeUI();
    if (drawerDraft) restoreDrawerDraft(drawerDraft);
    if (wasEditing !== isEditing) {
      els.authShell.classList.add('hidden');
      els.authMessage.textContent = '';
      loadEverything();
    }
  });
}

function showApp() {
  updateModeUI();
  loadEverything();
}

