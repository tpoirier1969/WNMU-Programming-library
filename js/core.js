// Core state, DOM refs, shared helpers, and auth-draft preservation
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

const config = window.APP_CONFIG || {};
const $ = (selector) => document.querySelector(selector);

const state = {
  supabase: null,
  session: null,
  programs: [],
  lookups: {
    topics: [],
    secondary_topics: [],
    distributors: [],
    package_types: [],
    server_locations: [],
    program_types: []
  },
  selectedId: null,
  currentView: 'all',
  viewHistory: [],
  lastAppliedViewState: null,
  isLoading: false,
  searchDebounceTimer: null,
  lookupBusy: false
};

const els = {
  setupNotice: $('#setupNotice'),
  authShell: $('#authShell'),
  appShell: $('#appShell'),
  authTitle: $('#authTitle'),
  authMessage: $('#authMessage'),
  loginGitHubBtn: $('#loginGitHubBtn'),
  appTitle: $('#appTitle'),
  appVersion: $('#appVersion'),
  statusLine: $('#statusLine'),
  adminBtn: $('#adminBtn'),
  undoViewBtn: $('#undoViewBtn'),
  logoutBtn: $('#logoutBtn'),
  cancelLoginBtn: $('#cancelLoginBtn'),
  newProgramBtn: $('#newProgramBtn'),
  exportBtn: $('#exportBtn'),
  refreshBtn: $('#refreshBtn'),
  searchInput: $('#searchInput'),
  searchFieldSelect: $('#searchFieldSelect'),
  topicFilter: $('#topicFilter'),
  secondaryTopicFilter: $('#secondaryTopicFilter'),
  distributorFilter: $('#distributorFilter'),
  programTypeFilter: $('#programTypeFilter'),
  lengthFilter: $('#lengthFilter'),
  codeFilter: $('#codeFilter'),
  clearCodeFilter: $('#clearCodeFilter'),
  statusFilter: $('#statusFilter'),
  clearTopicFilter: $('#clearTopicFilter'),
  clearSecondaryTopicFilter: $('#clearSecondaryTopicFilter'),
  clearLengthFilter: $('#clearLengthFilter'),
  resetFiltersBtn: $('#resetFiltersBtn'),
  listSummary: $('#listSummary'),
  tableBody: $('#programTableBody'),
  quickStrip: $('#quickStrip'),
  drawer: $('#editorDrawer'),
  drawerBackdrop: $('#drawerBackdrop'),
  drawerTitle: $('#drawerTitle'),
  closeDrawerBtn: $('#closeDrawerBtn'),
  programForm: $('#programForm'),
  saveBtn: $('#saveBtn'),
  duplicateBtn: $('#duplicateBtn'),
  deleteBtn: $('#deleteBtn'),
  readOnlyNote: $('#readOnlyNote'),
  drawerModeBadge: $('#drawerModeBadge'),
  formFlags: $('#formFlags'),
  statApt: $('#statApt'),
  statEnding: $('#statEnding'),
  statMissingRights: $('#statMissingRights'),
  statArchived: $('#statArchived'),
  voteFieldWrap: $('#voteFieldWrap'),
  templateTools: $('#templateTools'),
  templateSourceInput: $('#templateSourceInput'),
  templateSourceList: $('#templateSourceList'),
  loadTemplateBtn: $('#loadTemplateBtn'),
  duplicateCheck: $('#duplicateCheck'),
  secondaryTopicList: $('#secondaryTopicList'),
  distributorList: $('#distributorList'),
  lookupBtn: $('#lookupBtn'),
  lookupMessage: $('#lookupMessage')
};

const SEARCH_INPUT_DEBOUNCE_MS = 140;
const AUTO_ARCHIVE_LAST_RUN_KEY = 'program-library-auto-archive-last-run';

function hasValidConfig() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && String(config.SUPABASE_URL).startsWith('http'));
}

function canEdit() {
  return Boolean(state.session);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

const NOLA_PLACEHOLDERS = new Set(['nonola', 'no nola', 'no-nola', 'n/a', 'na', 'none', 'unknown']);

function isPlaceholderNola(value) {
  return NOLA_PLACEHOLDERS.has(normalizeLower(value));
}

function splitMultiValues(value) {
  return Array.from(new Set(
    normalizeText(value)
      .split(/[;,|]/)
      .map((part) => part.trim())
      .filter(Boolean)
  ));
}

function normalizeMultiValueInput(value) {
  return splitMultiValues(value).join(', ');
}

function isInteractiveElement(element) {
  return Boolean(element && (element.closest('input, textarea, select, button, label, [contenteditable="true"], .drawer') || element.isContentEditable));
}

function duplicateMatches(titleValue, nolaValue, currentId = null) {
  const title = normalizeLower(titleValue);
  const normalizedNola = normalizeLower(nolaValue);
  const nola = normalizedNola && !isPlaceholderNola(normalizedNola) ? normalizedNola : '';
  const current = currentId == null ? null : String(currentId);
  return state.programs.filter((program) => {
    if (current && String(program.id) === current) return false;
    const titleMatch = title && normalizeLower(program.title) === title;
    const programNola = normalizeLower(program.nola_eidr);
    const nolaMatch = nola && programNola === nola && !isPlaceholderNola(programNola);
    return titleMatch || nolaMatch;
  });
}

function renderDuplicateCheck() {
  const form = els.programForm;
  if (!form) return;
  const currentId = form.dataset.programId || null;
  const matches = duplicateMatches(form.elements.title.value, form.elements.nola_eidr.value, currentId);
  if (!matches.length) {
    els.duplicateCheck.innerHTML = '';
    els.duplicateCheck.classList.add('hidden');
    return;
  }
  const titleValue = normalizeLower(form.elements.title.value);
  const nolaValue = normalizeLower(form.elements.nola_eidr.value);
  const meaningfulNola = nolaValue && !isPlaceholderNola(nolaValue) ? nolaValue : '';
  const items = matches.slice(0, 6).map((item) => {
    const reasons = [];
    if (titleValue && normalizeLower(item.title) === titleValue) reasons.push('same title');
    if (meaningfulNola && normalizeLower(item.nola_eidr) === meaningfulNola) reasons.push('same NOLA');
    return `<li><button type="button" class="linkish" data-open-program="${item.id}">${escapeHtml(item.title || '(untitled)')}</button>${item.nola_eidr ? ` <span class="dup-meta">· ${escapeHtml(item.nola_eidr)}</span>` : ''}${reasons.length ? ` <span class="dup-reason">(${reasons.join(', ')})</span>` : ''}</li>`;
  }).join('');
  const more = matches.length > 6 ? `<div class="dup-more">+${matches.length - 6} more match${matches.length - 6 === 1 ? '' : 'es'}</div>` : '';
  els.duplicateCheck.innerHTML = `
    <div class="duplicate-card warn">
      <div class="duplicate-title">Possible duplicate${matches.length === 1 ? '' : 's'} found</div>
      <ul class="duplicate-list">${items}</ul>
      ${more}
    </div>
  `;
  els.duplicateCheck.classList.remove('hidden');
  els.duplicateCheck.querySelectorAll('[data-open-program]').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.openProgram));
  });
}

function renderTemplateSourceList() {
  if (!els.templateSourceList) return;
  els.templateSourceList.innerHTML = state.programs
    .slice()
    .sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title), undefined, { sensitivity: 'base' }))
    .map((program) => `<option value="${escapeHtml(`${program.title || '(untitled)'}${program.nola_eidr ? ' — ' + program.nola_eidr : ''} [${program.id}]`)}"></option>`)
    .join('');
}

function parseTemplateProgramId(value) {
  const match = normalizeText(value).match(/\[(\d+)\]\s*$/);
  return match ? match[1] : null;
}

function loadTemplateIntoForm() {
  const id = parseTemplateProgramId(els.templateSourceInput.value);
  if (!id) {
    alert('Choose a program from the list first.');
    return;
  }
  const item = state.programs.find((program) => String(program.id) === String(id));
  if (!item) {
    alert('That source program could not be found.');
    return;
  }
  const form = els.programForm;
  const copyFields = ['title','notes','program_type','length_minutes','topic','distributor','vote','rights_begin','rights_end','rights_notes','package_type','server_tape'];
  copyFields.forEach((field) => {
    form.elements[field].value = item[field] ?? '';
  });
  if (form.elements.secondary_topic) {
    form.elements.secondary_topic.value = normalizeMultiValueInput(item.secondary_topic);
  }
  ['legacy_code','episode_season','nola_eidr','aired_13_1','aired_13_3'].forEach((field) => {
    form.elements[field].value = '';
  });
  updateVoteVisibility();
  renderDuplicateCheck();
  updateLookupButtonState();
  setStatus(`Copied template details from ${item.title}.`);
  requestAnimationFrame(() => form.elements.title.focus());
}

function computeFlags(program) {
  const rightsEnd = program.rights_end ? new Date(`${program.rights_end}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86400000;
  const daysLeft = rightsEnd ? Math.floor((rightsEnd - today) / msPerDay) : null;
  const threshold = Number(config.AUTO_ARCHIVE_DAYS || 90);
  const rightsStatus = !rightsEnd ? 'No end date' : (daysLeft < 0 ? 'Expired' : (daysLeft < threshold ? 'Ending soon' : 'Active'));
  const needsAptCheck = normalizeLower(program.distributor) === 'apt' && normalizeText(program.vote).toUpperCase() !== 'Y';
  const newTo131 = ['', 'no'].includes(normalizeLower(program.aired_13_1));
  const newTo133 = ['', 'no'].includes(normalizeLower(program.aired_13_3));
  const archiveCandidate = rightsEnd ? daysLeft < threshold : false;
  const missingRights = !normalizeText(program.rights_begin) || !normalizeText(program.rights_end);

  return { daysLeft, rightsStatus, needsAptCheck, newTo131, newTo133, archiveCandidate, missingRights };
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

function setLoading(message = '') {
  state.isLoading = Boolean(message);
  document.body.classList.toggle('loading-active', state.isLoading);
  const overlay = document.getElementById('loadingOverlay');
  const detail = document.getElementById('loadingDetail');
  if (overlay) overlay.classList.toggle('hidden', !state.isLoading);
  if (detail) detail.textContent = message || '';
  if (message) setStatus(message);
}

function updateModeUI() {
  const editing = canEdit();
  els.appShell.classList.remove('hidden');
  els.authShell.classList.add('hidden');
  els.adminBtn.textContent = editing ? 'Admin mode' : 'Admin sign in';
  els.adminBtn.classList.toggle('secondary', editing);
  els.adminBtn.classList.toggle('primary', !editing);
  els.newProgramBtn.classList.toggle('hidden', !editing);
  els.logoutBtn.classList.toggle('hidden', !editing);
  if (els.readOnlyNote) els.readOnlyNote.classList.toggle('hidden', editing);
  if (els.drawerModeBadge) {
    els.drawerModeBadge.textContent = editing ? 'Admin mode' : 'Read only';
    els.drawerModeBadge.classList.toggle('admin', editing);
  }
  applyEditorMode();
}

function applyEditorMode() {
  if (!els.programForm) return;
  const editing = canEdit();
  const fields = Array.from(els.programForm.querySelectorAll('input, select, textarea'));
  fields.forEach((field) => {
    const type = field.type || '';
    if (['submit','button','hidden'].includes(type)) return;
    if (field.tagName === 'INPUT' && type !== 'checkbox') field.readOnly = !editing;
    if (field.tagName === 'TEXTAREA') field.readOnly = !editing;
    if (field.tagName === 'SELECT' || type === 'checkbox') field.disabled = !editing;
  });
  if (els.saveBtn) els.saveBtn.classList.toggle('hidden', !editing);
  if (els.duplicateBtn) els.duplicateBtn.classList.toggle('hidden', !editing);
  if (els.deleteBtn) els.deleteBtn.classList.toggle('hidden', !editing);
  if (els.lookupBtn) els.lookupBtn.classList.toggle('hidden', !editing);
  updateLookupButtonState();
}

function ensureEditorSelectOption(fieldName, value) {
  const select = els.programForm?.elements?.[fieldName];
  const normalized = normalizeText(value);
  if (!select || !normalized || select.tagName !== 'SELECT') return;
  const exists = Array.from(select.options).some((option) => normalizeLower(option.value) === normalizeLower(normalized));
  if (exists) return;
  const option = document.createElement('option');
  option.value = normalized;
  option.textContent = normalized;
  select.appendChild(option);
}

function setLookupMessage(message, tone = 'muted') {
  if (!els.lookupMessage) return;
  els.lookupMessage.textContent = message || '';
  els.lookupMessage.className = `lookup-message ${tone}`.trim();
}

function updateLookupButtonState() {
  if (!els.lookupBtn || !els.programForm) return;
  const hasTitle = normalizeText(els.programForm.elements.title?.value).length > 0;
  const enabled = canEdit() && hasTitle && !state.lookupBusy;
  els.lookupBtn.disabled = !enabled;
  if (state.lookupBusy) {
    els.lookupBtn.textContent = 'Looking up…';
    setLookupMessage('Checking PBS and NETA for matching metadata…', 'info');
    return;
  }
  els.lookupBtn.textContent = 'Lookup online';
  if (!canEdit()) {
    setLookupMessage('Sign in as admin to use online lookup.', 'muted');
  } else if (!hasTitle) {
    setLookupMessage('Enter a title to enable lookup.', 'muted');
  } else if (!normalizeText(els.lookupMessage?.textContent)) {
    setLookupMessage('Lookup will fill blank fields it can verify from online sources.', 'muted');
  }
}

function updateListSummary(count, totalPool) {
  const noun = count === 1 ? 'program' : 'programs';
  els.listSummary.textContent = `Showing ${count.toLocaleString()} ${noun}${totalPool != null ? ` from ${totalPool.toLocaleString()} in view` : ''}.`;
}

function getAdminRedirectUrl() {
  const configured = normalizeText(config.ADMIN_REDIRECT_URL);
  if (configured) return configured;
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
}

function parseAuthErrorFromHash() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  const errorCode = params.get('error_code') || '';
  const description = params.get('error_description') || params.get('error') || '';
  if (!errorCode && !description) return '';
  return decodeURIComponent(description.replace(/\+/g, ' ')) || errorCode;
}

function captureDrawerDraft() {
  if (!els.programForm || !els.drawer || els.drawer.classList.contains('hidden')) return null;
  const fields = Array.from(els.programForm.querySelectorAll('input, select, textarea')).filter((field) => field.name);
  const values = {};
  fields.forEach((field) => {
    values[field.name] = field.type === 'checkbox' ? field.checked : field.value;
  });
  return {
    programId: els.programForm.dataset.programId || '',
    title: els.drawerTitle?.textContent || '',
    values
  };
}

function restoreDrawerDraft(draft) {
  if (!draft || !els.programForm) return;
  els.programForm.dataset.programId = draft.programId || '';
  if (els.drawerTitle && draft.title) els.drawerTitle.textContent = draft.title;
  Object.entries(draft.values || {}).forEach(([name, value]) => {
    const field = els.programForm.elements[name];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
  });
  updateVoteVisibility();
  renderDuplicateCheck();
  applyEditorMode();
}

