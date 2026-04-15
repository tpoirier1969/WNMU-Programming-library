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
  lookupBusy: false,
  currentSort: { field: 'title', direction: 'asc' },
  lookupsLoaded: false,
  lookupsPromise: null,
  templateSourceDirty: true,
  editorOpenToken: 0,
  mobileSection: 'programs',
  programActivationGuardArmed: false,
  programActivationGuardTimer: null,
  suppressNextListWakeClick: false,
  ratingOverrides: {},
  ratingDbSupport: null,
  ratingWarmupPromise: null,
  programsExposeRating: false,
  inlineAiringEditorId: null,
  pbsImportData: null,
  pbsImportPanelOpen: false,
  programDerived: new Map(),
  filteredCacheKey: '',
  filteredProgramIds: [],
  poolCacheKey: '',
  poolProgramIds: [],
  visibleRowCount: 150
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
  ratingFilter: $('#ratingFilter'),
  clearTopicFilter: $('#clearTopicFilter'),
  clearSecondaryTopicFilter: $('#clearSecondaryTopicFilter'),
  clearLengthFilter: $('#clearLengthFilter'),
  resetFiltersBtn: $('#resetFiltersBtn'),
  listSummary: $('#listSummary'),
  listPerfPanel: $('#listPerfPanel'),
  listPerfText: $('#listPerfText'),
  showMoreRowsBtn: $('#showMoreRowsBtn'),
  showAllRowsBtn: $('#showAllRowsBtn'),
  showFastRowsBtn: $('#showFastRowsBtn'),
  tableBody: $('#programTableBody'),
  quickStrip: $('#quickStrip'),
  drawer: $('#editorDrawer'),
  drawerBackdrop: $('#drawerBackdrop'),
  drawerTitle: $('#drawerTitle'),
  closeDrawerBtn: $('#closeDrawerBtn'),
  programForm: $('#programForm'),
  saveBtn: $('#saveBtn'),
  duplicateBtn: $('#duplicateBtn'),
  restoreBtn: $('#restoreBtn'),
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
  lookupMessage: $('#lookupMessage'),
  mobileSectionNav: $('#mobileSectionNav'),
  showFiltersBtn: $('#showFiltersBtn'),
  showProgramsBtn: $('#showProgramsBtn'),
  controlsPanel: $('#controlsPanel'),
  listPanel: $('#listPanel'),
  windowReactivateShield: $('#windowReactivateShield'),
  editorRating: $('#editorRating'),
  pbsImportTools: $('#pbsImportTools'),
  togglePbsImportBtn: $('#togglePbsImportBtn'),
  pbsImportPanel: $('#pbsImportPanel'),
  pbsOfferInput: $('#pbsOfferInput'),
  pbsImportMode: $('#pbsImportMode'),
  parsePbsOfferBtn: $('#parsePbsOfferBtn'),
  clearPbsOfferBtn: $('#clearPbsOfferBtn'),
  pbsImportPreview: $('#pbsImportPreview')
};

const SEARCH_INPUT_DEBOUNCE_MS = 140;
const AUTO_ARCHIVE_LAST_RUN_KEY = 'program-library-auto-archive-last-run';
const PROGRAM_CACHE_KEY = 'program-library-programs-cache-v1';
const RATING_OVERLAY_KEY = 'program-library-rating-overrides-v1';
const DEFAULT_NEW_PROGRAM_VALUES = Object.freeze({ package_type: 'HDBA', server_tape: 'sIX' });
const CURATED_SOURCE_OPTIONS = Object.freeze(['sIX', 'Server', 'Tape', 'FTP', 'Feed', 'Unavailable', "Don't Have", 'Other']);
const DEFAULT_VISIBLE_ROWS = 150;
const VISIBLE_ROW_STEP = 150;

function normalizeRating(value) {
  if (value == null || value === '') return null;
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) return null;
  return numeric;
}

function readRatingOverrides() {
  try {
    const raw = window.localStorage?.getItem(RATING_OVERLAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed)
      .map(([id, value]) => [String(id), normalizeRating(value)])
      .filter(([, value]) => value != null));
  } catch {
    return {};
  }
}

function persistRatingOverrides() {
  try {
    const keys = Object.keys(state.ratingOverrides || {});
    if (!keys.length) {
      window.localStorage?.removeItem(RATING_OVERLAY_KEY);
      return;
    }
    window.localStorage?.setItem(RATING_OVERLAY_KEY, JSON.stringify(state.ratingOverrides));
  } catch (error) {
    console.warn('Rating overlay cache skipped:', error);
  }
}

function getProgramRating(program) {
  const id = program?.id == null ? '' : String(program.id);
  if (id && Object.prototype.hasOwnProperty.call(state.ratingOverrides, id)) {
    return normalizeRating(state.ratingOverrides[id]);
  }
  return normalizeRating(program?.rating);
}

function applyRatingOverlayToProgram(program) {
  if (!program || typeof program !== 'object') return program;
  program.rating = getProgramRating(program);
  return program;
}

function mergeDatabaseRatings(rows = []) {
  const byId = new Map(rows.map((row) => [String(row.id), normalizeRating(row.rating)]));
  state.programs.forEach((program) => {
    const id = String(program.id);
    if (byId.has(id)) program.rating = byId.get(id);
    else program.rating = normalizeRating(program.rating);
    applyRatingOverlayToProgram(program);
  });
  invalidateProgramViewCaches();
}

function setProgramRatingLocal(programId, rating) {
  const id = String(programId || '');
  if (!id) return;
  const normalized = normalizeRating(rating);
  if (normalized == null) delete state.ratingOverrides[id];
  else state.ratingOverrides[id] = normalized;
  const item = state.programs.find((program) => String(program.id) === id);
  if (item) item.rating = normalized;
  invalidateProgramViewCaches();
  persistRatingOverrides();
  try { persistProgramsCache(); } catch {}
}

function isMissingRatingColumnError(error) {
  const haystack = normalizeLower(error?.message || error?.details || error?.hint || String(error || ''));
  return haystack.includes('rating') && (haystack.includes('column') || haystack.includes('schema cache') || haystack.includes('does not exist') || haystack.includes('could not find'));
}

function renderEditorRatingControl() {
  const container = els.editorRating;
  const input = els.programForm?.elements?.rating;
  if (!container || !input) return;
  const current = normalizeRating(input.value);
  container.dataset.rating = current || '';
  container.querySelectorAll('[data-editor-rating]').forEach((button) => {
    const value = normalizeRating(button.dataset.editorRating);
    const filled = current != null && value != null && value <= current;
    button.classList.toggle('filled', filled);
    button.classList.toggle('anchor', current != null && value === current);
    button.setAttribute('aria-checked', current != null && value === current ? 'true' : 'false');
    button.disabled = !canEdit();
    button.title = canEdit()
      ? `${value} star${value === 1 ? '' : 's'}${current != null && value === current ? ' (click again to clear)' : ''}`
      : (current ? `${current} of 5` : 'Not rated');
  });
  const label = container.querySelector('.rating-value-label');
  if (label) label.textContent = current ? `${current}/5` : 'Not rated';
}

function setEditorRating(value) {
  const input = els.programForm?.elements?.rating;
  if (!input) return;
  const current = normalizeRating(input.value);
  const normalized = normalizeRating(value);
  input.value = current != null && current === normalized ? '' : (normalized ?? '');
  renderEditorRatingControl();
}

function renderInlineRatingEditorState(container, rating) {
  if (!container) return;
  const current = normalizeRating(rating);
  container.classList.remove('saving');
  container.dataset.rating = current || '';
  container.querySelectorAll('[data-inline-rating-value]').forEach((button) => {
    const value = normalizeRating(button.dataset.inlineRatingValue);
    const filled = current != null && value != null && value <= current;
    button.classList.toggle('filled', filled);
    button.classList.toggle('anchor', current != null && value === current);
    button.setAttribute('aria-pressed', current != null && value === current ? 'true' : 'false');
    button.title = current != null && value === current
      ? `${value} star${value === 1 ? '' : 's'} (click again to clear)`
      : `${value} star${value === 1 ? '' : 's'}`;
  });
  const text = container.querySelector('.rating-text');
  if (text) text.textContent = current ? `${current}/5` : '—';
  const ariaLabel = current ? `${current} out of 5 stars` : 'Not rated';
  container.setAttribute('aria-label', ariaLabel);
}

function syncInlineRatingEditors(programId) {
  const program = state.programs.find((item) => String(item.id) === String(programId));
  const rating = getProgramRating(program);
  document.querySelectorAll(`[data-inline-rating-editor="${CSS.escape(String(programId))}"]`).forEach((container) => {
    renderInlineRatingEditorState(container, rating);
  });
  if (String(state.selectedId) === String(programId)) {
    const input = els.programForm?.elements?.rating;
    if (input) {
      input.value = rating ?? '';
      renderEditorRatingControl();
    }
  }
}

state.ratingOverrides = readRatingOverrides();

function isoTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function programCanAutoRestore(program) {
  if (!program?.is_archived) return false;
  const rightsEnd = normalizeIsoDate(program.rights_end);
  return Boolean(rightsEnd && rightsEnd >= isoTodayValue());
}

function duplicateSummary(matches) {
  const archivedCount = matches.filter((item) => item.is_archived).length;
  const activeCount = matches.length - archivedCount;
  const parts = [];
  if (activeCount) parts.push(`${activeCount} active`);
  if (archivedCount) parts.push(`${archivedCount} archived`);
  return { archivedCount, activeCount, summaryText: parts.join(', ') };
}

function updateRestoreButtonVisibility() {
  const button = els.restoreBtn;
  if (!button || !els.programForm) return;
  const programId = els.programForm.dataset.programId || null;
  const item = programId ? state.programs.find((program) => String(program.id) === String(programId)) : null;
  const show = canEdit() && Boolean(item?.is_archived);
  button.classList.toggle('hidden', !show);
  if (!show) return;
  button.textContent = programCanAutoRestore(item) ? 'Restore to active now' : 'Restore to active';
  button.title = programCanAutoRestore(item)
    ? 'This archived program has current rights and can be moved back to the active library.'
    : 'Move this archived program back to the active library.';
}


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

function formatShortDateInput(value) {
  const iso = normalizeIsoDate(value);
  if (!iso) return normalizeText(value);
  const [year, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
}

function syncDateProxyField(fieldName) {
  const textInput = els.programForm?.elements?.[fieldName];
  const proxyInput = els.programForm?.elements?.[`${fieldName}_picker`];
  if (!textInput || !proxyInput) return '';
  const normalized = normalizeIsoDate(textInput.value);
  proxyInput.value = normalized || '';
  return normalized;
}

function normalizeIsoDate(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidDateParts(year, month, day)) return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return '';
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (!slashMatch) return '';
  const month = Number(slashMatch[1]);
  const day = Number(slashMatch[2]);
  const yearValue = slashMatch[3];
  const year = yearValue.length === 2 ? Number(`20${yearValue}`) : Number(yearValue);
  if (!isValidDateParts(year, month, day)) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
}

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function showProgramActivationShield() {
  if (!els.windowReactivateShield) return;
  els.windowReactivateShield.classList.remove('hidden');
  els.windowReactivateShield.setAttribute('aria-hidden', 'false');
}

function hideProgramActivationShield() {
  if (!els.windowReactivateShield) return;
  els.windowReactivateShield.classList.add('hidden');
  els.windowReactivateShield.setAttribute('aria-hidden', 'true');
}

function clearProgramActivationGuard() {
  if (state.programActivationGuardTimer) {
    clearTimeout(state.programActivationGuardTimer);
    state.programActivationGuardTimer = null;
  }
  state.programActivationGuardArmed = false;
  state.suppressNextListWakeClick = false;
  hideProgramActivationShield();
}

function armProgramActivationGuard() {
  if (!els.listPanel) return;
  if (state.programActivationGuardTimer) {
    clearTimeout(state.programActivationGuardTimer);
    state.programActivationGuardTimer = null;
  }
  state.programActivationGuardArmed = true;
  showProgramActivationShield();
}

function scheduleProgramActivationGuardRelease(delayMs = 420) {
  if (!state.programActivationGuardArmed) return;
  if (state.programActivationGuardTimer) clearTimeout(state.programActivationGuardTimer);
  state.programActivationGuardTimer = setTimeout(() => {
    clearProgramActivationGuard();
  }, delayMs);
}

function handleWakeActivationInteraction(target) {
  if (!state.programActivationGuardArmed) return false;
  const element = target instanceof Element ? target : null;
  if (!element) {
    clearProgramActivationGuard();
    return false;
  }
  if (element.closest('.drawer')) return false;
  const hitListPanel = Boolean(element.closest('#listPanel'));
  clearProgramActivationGuard();
  if (!hitListPanel) return false;
  state.suppressNextListWakeClick = true;
  return true;
}

function consumeSuppressedWakeClick(target) {
  if (!state.suppressNextListWakeClick) return false;
  const element = target instanceof Element ? target : null;
  const hitListPanel = Boolean(element && element.closest('#listPanel'));
  state.suppressNextListWakeClick = false;
  return hitListPanel;
}

function shouldSuppressProgramActivation(target = null) {
  if (consumeSuppressedWakeClick(target)) return true;
  if (!state.programActivationGuardArmed) return false;
  clearProgramActivationGuard();
  return true;
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
  const summary = duplicateSummary(matches);
  const archiveNote = summary.archivedCount
    ? `<div class="dup-archived-note">${summary.archivedCount} matching program${summary.archivedCount === 1 ? ' is' : 's are'} currently archived.</div>`
    : '';
  const items = matches.slice(0, 6).map((item) => {
    const reasons = [];
    if (titleValue && normalizeLower(item.title) === titleValue) reasons.push('same title');
    if (meaningfulNola && normalizeLower(item.nola_eidr) === meaningfulNola) reasons.push('same NOLA');
    if (item.is_archived) reasons.push('archived');
    return `<li><button type="button" class="linkish" data-open-program="${item.id}">${escapeHtml(item.title || '(untitled)')}</button>${item.nola_eidr ? ` <span class="dup-meta">· ${escapeHtml(item.nola_eidr)}</span>` : ''}${reasons.length ? ` <span class="dup-reason">(${reasons.join(', ')})</span>` : ''}</li>`;
  }).join('');
  const more = matches.length > 6 ? `<div class="dup-more">+${matches.length - 6} more match${matches.length - 6 === 1 ? '' : 'es'}</div>` : '';
  els.duplicateCheck.innerHTML = `
    <div class="duplicate-card warn">
      <div class="duplicate-title">Possible duplicate${matches.length === 1 ? '' : 's'} found${summary.summaryText ? ` <span class="dup-meta">· ${escapeHtml(summary.summaryText)}</span>` : ''}</div>
      ${archiveNote}
      <ul class="duplicate-list">${items}</ul>
      ${more}
    </div>
  `;
  els.duplicateCheck.classList.remove('hidden');
  els.duplicateCheck.querySelectorAll('[data-open-program]').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.openProgram));
  });
}

function renderTemplateSourceList(force = false) {
  if (!els.templateSourceList) return;
  if (!force && !state.templateSourceDirty) return;
  els.templateSourceList.innerHTML = state.programs
    .slice()
    .sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title), undefined, { sensitivity: 'base' }))
    .map((program) => `<option value="${escapeHtml(`${program.title || '(untitled)'}${program.nola_eidr ? ' — ' + program.nola_eidr : ''} [${program.id}]`)}"></option>`)
    .join('');
  state.templateSourceDirty = false;
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


function invalidateProgramViewCaches() {
  state.filteredCacheKey = '';
  state.filteredProgramIds = [];
  state.poolCacheKey = '';
  state.poolProgramIds = [];
}

function buildProgramDerived(program) {
  const title = normalizeText(program?.title);
  const notes = normalizeText(program?.notes);
  const legacyCode = normalizeText(program?.legacy_code).toUpperCase();
  const nola = normalizeText(program?.nola_eidr);
  const topic = normalizeText(program?.topic);
  const secondaryTopic = normalizeText(program?.secondary_topic);
  const rightsNotes = normalizeText(program?.rights_notes);
  const packageType = normalizeText(program?.package_type);
  const programType = normalizeText(program?.program_type);
  const distributor = normalizeText(program?.distributor);
  const aired131 = normalizeText(program?.aired_13_1);
  const aired133 = normalizeText(program?.aired_13_3);
  const rightsBegin = normalizeText(program?.rights_begin);
  const rightsEnd = normalizeText(program?.rights_end);
  const rightsEndDate = rightsEnd ? new Date(`${rightsEnd}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86400000;
  const daysLeft = rightsEndDate ? Math.floor((rightsEndDate - today) / msPerDay) : null;
  const threshold = Number(config.AUTO_ARCHIVE_DAYS || 90);
  const rightsStatus = !rightsEndDate ? 'No end date' : (daysLeft < 0 ? 'Expired' : (daysLeft < threshold ? 'Ending soon' : 'Active'));
  const flags = {
    daysLeft,
    rightsStatus,
    needsAptCheck: normalizeLower(distributor) === 'apt' && normalizeText(program?.vote).toUpperCase() !== 'Y',
    newTo131: ['', 'no'].includes(normalizeLower(aired131)),
    newTo133: ['', 'no'].includes(normalizeLower(aired133)),
    archiveCandidate: rightsEndDate ? daysLeft < threshold : false,
    missingRights: !rightsBegin || !rightsEnd
  };
  return {
    titleLower: normalizeLower(title),
    notesLower: normalizeLower(notes),
    legacyCode,
    nolaLower: normalizeLower(nola),
    topicValues: splitMultiValues(program?.topic),
    secondaryTopicValues: splitMultiValues(program?.secondary_topic),
    lengthValue: String(program?.length_minutes ?? ''),
    distributor,
    programType,
    searchAll: normalizeLower([
      title, notes, legacyCode, nola, topic, secondaryTopic,
      aired131, aired133, distributor, rightsNotes, packageType, programType
    ].filter(Boolean).join(' | ')),
    searchByField: {
      title: normalizeLower(title),
      notes: normalizeLower(notes),
      legacy_code: normalizeLower(legacyCode),
      nola_eidr: normalizeLower(nola),
      topic: normalizeLower(topic),
      secondary_topic: normalizeLower(secondaryTopic),
      aired_13_1: normalizeLower(aired131),
      aired_13_3: normalizeLower(aired133),
      distributor: normalizeLower(distributor),
      rights_notes: normalizeLower(rightsNotes),
      package_type: normalizeLower(packageType),
      program_type: normalizeLower(programType)
    },
    sortKeys: {
      title: normalizeLower(title),
      notes: normalizeLower(notes),
      topic: normalizeLower([topic, secondaryTopic].filter(Boolean).join(' | ')),
      details: normalizeLower([topic, secondaryTopic, String(program?.length_minutes ?? ''), programType].filter(Boolean).join(' | ')),
      aired_13_1: firstAiringSortKey(aired131),
      aired_13_3: firstAiringSortKey(aired133),
      package_type: normalizeLower(packageType),
      rights_end: rightsEnd || '9999-99-99',
      distributor: normalizeLower(distributor)
    },
    flags
  };
}

function recacheProgramDerived(programs = state.programs) {
  const next = new Map();
  (programs || []).forEach((program) => {
    if (!program) return;
    next.set(String(program.id), buildProgramDerived(program));
  });
  state.programDerived = next;
  invalidateProgramViewCaches();
}

function getProgramDerived(program) {
  if (!program) return buildProgramDerived(program);
  const key = String(program.id);
  if (!state.programDerived?.has(key)) {
    if (!state.programDerived) state.programDerived = new Map();
    state.programDerived.set(key, buildProgramDerived(program));
  }
  return state.programDerived.get(key);
}

function updateProgramDerived(program) {
  if (!program) return;
  if (!state.programDerived) state.programDerived = new Map();
  state.programDerived.set(String(program.id), buildProgramDerived(program));
  invalidateProgramViewCaches();
}

function removeProgramDerived(programId) {
  if (!state.programDerived) return;
  state.programDerived.delete(String(programId));
  invalidateProgramViewCaches();
}

function computeFlags(program) {
  return getProgramDerived(program).flags;
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

function updatePbsImportVisibility() {
  if (!els.pbsImportTools) return;
  const form = els.programForm;
  const isNewRecord = !normalizeText(form?.dataset?.programId);
  const allowImport = canEdit() && isNewRecord;
  els.pbsImportTools.classList.toggle('hidden', !allowImport);
  if (!allowImport) {
    state.pbsImportPanelOpen = false;
    state.pbsImportData = null;
    els.pbsImportPanel?.classList.add('hidden');
    els.pbsImportPreview?.classList.add('hidden');
    if (els.togglePbsImportBtn) els.togglePbsImportBtn.textContent = 'Paste PBS offer';
    return;
  }
  if (els.pbsImportPanel) els.pbsImportPanel.classList.toggle('hidden', !state.pbsImportPanelOpen);
  if (els.togglePbsImportBtn) els.togglePbsImportBtn.textContent = state.pbsImportPanelOpen ? 'Hide PBS import' : 'Paste PBS offer';
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
  updateRestoreButtonVisibility();
  updateLookupButtonState();
  renderEditorRatingControl();
  updatePbsImportVisibility();
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

function resetVisibleRowWindow() {
  state.visibleRowCount = DEFAULT_VISIBLE_ROWS;
}

function currentVisibleRowLimit(totalCount) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 0;
  const requested = Number(state.visibleRowCount || DEFAULT_VISIBLE_ROWS);
  return Math.min(totalCount, Math.max(DEFAULT_VISIBLE_ROWS, requested));
}

function updateRenderWindowControls(totalCount, renderedCount) {
  if (!els.listPerfPanel || !els.listPerfText) return;
  const hiddenCount = Math.max(0, Number(totalCount || 0) - Number(renderedCount || 0));
  const isLimited = hiddenCount > 0;
  els.listPerfPanel.classList.toggle('hidden', !isLimited && totalCount > 0 ? false : totalCount <= DEFAULT_VISIBLE_ROWS);
  if (totalCount <= DEFAULT_VISIBLE_ROWS) {
    els.listPerfText.textContent = 'Fast view is not trimming rows right now.';
    if (els.showMoreRowsBtn) els.showMoreRowsBtn.classList.add('hidden');
    if (els.showAllRowsBtn) els.showAllRowsBtn.classList.add('hidden');
    if (els.showFastRowsBtn) els.showFastRowsBtn.classList.add('hidden');
    return;
  }
  if (isLimited) {
    els.listPerfText.textContent = `Fast view is showing ${renderedCount.toLocaleString()} of ${totalCount.toLocaleString()} rows to keep the page snappy.`;
  } else {
    els.listPerfText.textContent = `All ${totalCount.toLocaleString()} rows are showing. If it gets swampy, reset to the fast view.`;
  }
  if (els.showMoreRowsBtn) {
    els.showMoreRowsBtn.classList.toggle('hidden', !isLimited);
    const nextCount = Math.min(totalCount, renderedCount + VISIBLE_ROW_STEP);
    els.showMoreRowsBtn.textContent = `Show ${Math.max(0, nextCount - renderedCount).toLocaleString()} more`;
    els.showMoreRowsBtn.disabled = !isLimited;
  }
  if (els.showAllRowsBtn) {
    els.showAllRowsBtn.classList.toggle('hidden', !isLimited);
    els.showAllRowsBtn.disabled = !isLimited;
  }
  if (els.showFastRowsBtn) {
    els.showFastRowsBtn.classList.toggle('hidden', isLimited);
    els.showFastRowsBtn.disabled = isLimited;
  }
}

function updateListSummary(renderedCount, totalPool, totalMatches = renderedCount) {
  const noun = totalMatches === 1 ? 'program' : 'programs';
  const visibleNote = totalMatches > renderedCount ? ` (showing ${renderedCount.toLocaleString()} right now)` : '';
  els.listSummary.textContent = `Showing ${totalMatches.toLocaleString()} ${noun}${totalPool != null ? ` from ${totalPool.toLocaleString()} in view` : ''}${visibleNote}.`;
}

function setSelectedRowHighlight(selectedId = null) {
  if (!els.tableBody) return;
  els.tableBody.querySelectorAll('tr.selected').forEach((row) => row.classList.remove('selected'));
  if (selectedId == null) return;
  const targetId = String(selectedId);
  const row = Array.from(els.tableBody.querySelectorAll('tr[data-id]')).find((item) => item.dataset.id === targetId);
  if (row) row.classList.add('selected');
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



const SORTABLE_FIELDS = new Set(['title','notes','topic','details','aired_13_1','aired_13_3','package_type','rights_end','distributor']);

function firstAiringSortKey(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const normalized = text
    .replace(/\r/g, '')
    .replace(/\n+/g, ';')
    .replace(/\s*;\s*/g, ';')
    .replace(/,\s*(?=\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g, ';');
  const first = normalized.split(';').map((part) => normalizeText(part)).find(Boolean) || text;
  const match = first.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(.*))?$/);
  if (!match) return normalizeLower(first);
  let month = Number(match[1]);
  let day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const timePart = normalizeText(match[4] || '');
  let hours = 0, minutes = 0;
  const timeMatch = timePart.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i);
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2] || '0');
    const mer = (timeMatch[3] || '').toLowerCase();
    if (mer === 'pm' && hours < 12) hours += 12;
    if (mer === 'am' && hours === 12) hours = 0;
  }
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

function sortValueForProgram(program, field) {
  const derived = getProgramDerived(program);
  if (Object.prototype.hasOwnProperty.call(derived.sortKeys, field)) return derived.sortKeys[field];
  return normalizeLower(program?.[field]);
}

function comparePrograms(left, right, field, direction) {
  const leftValue = sortValueForProgram(left, field);
  const rightValue = sortValueForProgram(right, field);
  let result = 0;
  if (field === 'rights_end') {
    result = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
  } else if (field.startsWith('aired_13_')) {
    result = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
  } else {
    result = String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base', numeric: true });
  }
  if (result === 0) {
    result = normalizeLower(left.title).localeCompare(normalizeLower(right.title), undefined, { sensitivity: 'base', numeric: true });
  }
  if (result === 0) {
    result = Number(left.id || 0) - Number(right.id || 0);
  }
  return direction === 'desc' ? -result : result;
}

function sortProgramsForDisplay(items) {
  const { field, direction } = state.currentSort || { field: 'title', direction: 'asc' };
  return [...items].sort((a, b) => comparePrograms(a, b, field, direction));
}

function setSort(field) {
  if (!SORTABLE_FIELDS.has(field)) return;
  if (state.currentSort.field === field) {
    state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.currentSort = { field, direction: field === 'rights_end' ? 'asc' : 'asc' };
  }
  renderTable();
}

function sortIndicator(field) {
  if (!state.currentSort || state.currentSort.field !== field) return '↕';
  return state.currentSort.direction === 'asc' ? '▲' : '▼';
}

function renderSortHeaders() {
  document.querySelectorAll('[data-sort-field]').forEach((button) => {
    const field = button.dataset.sortField;
    const indicator = button.querySelector('.sort-indicator');
    const active = state.currentSort.field === field;
    const ariaValue = !active ? 'none' : (state.currentSort.direction === 'asc' ? 'ascending' : 'descending');
    button.classList.toggle('active', active);
    button.setAttribute('aria-sort', ariaValue);
    const headerCell = button.closest('th');
    if (headerCell) headerCell.setAttribute('aria-sort', ariaValue);
    if (indicator) indicator.textContent = sortIndicator(field);
  });
}


const MOBILE_SECTION_MEDIA = window.matchMedia('(max-width: 760px)');

function isPhoneLayout() {
  return MOBILE_SECTION_MEDIA.matches;
}

function syncMobileSectionUI() {
  if (!els.appShell) return;
  const section = state.mobileSection === 'filters' ? 'filters' : 'programs';
  els.appShell.dataset.mobileSection = section;
  els.showFiltersBtn?.classList.toggle('active', section === 'filters');
  els.showProgramsBtn?.classList.toggle('active', section === 'programs');
  els.showFiltersBtn?.setAttribute('aria-pressed', section === 'filters' ? 'true' : 'false');
  els.showProgramsBtn?.setAttribute('aria-pressed', section === 'programs' ? 'true' : 'false');
}

function setMobileSection(section) {
  state.mobileSection = section === 'filters' ? 'filters' : 'programs';
  syncMobileSectionUI();
}

function handleMobileLayoutChange() {
  if (!isPhoneLayout()) {
    state.mobileSection = 'programs';
  }
  syncMobileSectionUI();
}
