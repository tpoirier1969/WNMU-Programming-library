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
  programRevision: 0,
  filteredCache: { key: '', value: null },
  statsCache: { key: '', value: null }
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
  statExpired: $('#statExpired'),
  statMissingRights: $('#statMissingRights'),
  statArchived: $('#statArchived'),
  voteFieldWrap: $('#voteFieldWrap'),
  templateTools: $('#templateTools'),
  templateSourceInput: $('#templateSourceInput'),
  templateSourceList: $('#templateSourceList'),
  loadTemplateBtn: $('#loadTemplateBtn'),
  duplicateCheck: $('#duplicateCheck'),
  secondaryTopicList: $('#secondaryTopicList'),
  distributorList: $('#distributorList')
};

const SEARCH_INPUT_DEBOUNCE_MS = 140;

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

function decorateProgram(program) {
  if (!program || typeof program !== 'object') return program;
  const flags = computeFlags(program);
  const searchFields = [
    program.title, program.notes, program.legacy_code, program.nola_eidr, program.secondary_topic, program.topic,
    program.aired_13_1, program.aired_13_3, program.distributor, program.rights_notes, program.package_type, program.program_type
  ];
  program.__meta = {
    flags,
    titleLower: normalizeLower(program.title),
    nolaLower: normalizeLower(program.nola_eidr),
    legacyCodeUpper: normalizeText(program.legacy_code).toUpperCase(),
    secondaryTopics: splitMultiValues(program.secondary_topic),
    searchBlob: searchFields.map(normalizeLower).join('\n'),
    michiganText: [program.title, program.notes, program.topic, program.secondary_topic].map(normalizeLower).join(' | '),
    distributorLower: normalizeLower(program.distributor),
    packageTypeLower: normalizeLower(program.package_type)
  };
  return program;
}

function decoratePrograms(programs) {
  return (programs || []).map(decorateProgram);
}

function invalidateProgramCaches(bumpRevision = false) {
  if (bumpRevision) state.programRevision += 1;
  state.filteredCache = { key: '', value: null };
  state.statsCache = { key: '', value: null };
}

function syncSelectedRow() {
  if (!els.tableBody) return;
  els.tableBody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.classList.toggle('selected', String(row.dataset.id) === String(state.selectedId ?? ''));
  });
}

function filteredCacheKey() {
  return `${state.programRevision}::${JSON.stringify(snapshotViewState())}`;
}

function statsCacheKey() {
  return String(state.programRevision);
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
    const meta = program.__meta || decorateProgram(program).__meta;
    const titleMatch = title && meta.titleLower === title;
    const programNola = meta.nolaLower;
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
}

function renderTemplateSourceList() {
  if (!els.templateSourceList) return;
  els.templateSourceList.innerHTML = state.programs
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

async function loadEverything() {
  setLoading(canEdit() ? 'Checking archive status…' : 'Loading program library…');
  if (canEdit()) await attemptAutoArchive();
  await loadPrograms();
  setLoading('Building filters and lookup lists…');
  await loadLookups();
  renderFilters();
  renderTable();
  renderStats();
  state.lastAppliedViewState = snapshotViewState();
  const activeCount = state.programs.filter((item) => !item.is_archived).length;
  const archivedCount = state.programs.filter((item) => item.is_archived).length;
  setLoading('');
  setStatus(`Loaded ${state.programs.length.toLocaleString()} total programs (${activeCount.toLocaleString()} active, ${archivedCount.toLocaleString()} archived).`);
}

async function attemptAutoArchive() {
  try {
    await state.supabase.rpc('auto_archive_due_programs', { days_ahead: Number(config.AUTO_ARCHIVE_DAYS || 90) });
  } catch (error) {
    console.warn('Auto-archive RPC skipped:', error);
  }
}


async function fetchAllRows(tableName, orderColumn = 'title') {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    setLoading(`Loading ${tableName.replaceAll('_', ' ')}… ${allRows.length.toLocaleString()} rows so far`);
    const { data, error } = await state.supabase
      .from(tableName)
      .select('*')
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function loadPrograms() {
  try {
    state.programs = decoratePrograms(await fetchAllRows('programs_enriched', 'title'));
    invalidateProgramCaches(true);
  } catch (error) {
    console.error(error);
    setLoading('');
    setStatus(error.message);
    return;
  }
}

function sortProgramsInPlace() {
  state.programs.sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title), undefined, { sensitivity: 'base' }));
}

async function fetchProgramById(id) {
  const { data, error } = await state.supabase
    .from('programs_enriched')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function fetchInsertedProgram(payload) {
  let query = state.supabase
    .from('programs_enriched')
    .select('*')
    .eq('title', payload.title)
    .order('id', { ascending: false })
    .limit(1);

  if (payload.nola_eidr && !isPlaceholderNola(payload.nola_eidr)) query = query.eq('nola_eidr', payload.nola_eidr);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || !data.length) throw new Error('Program saved, but the refreshed row could not be found.');
  return data[0];
}

function mergeProgramIntoState(program) {
  const index = state.programs.findIndex((item) => String(item.id) === String(program.id));
  const prepared = decorateProgram(program);
  if (index >= 0) state.programs[index] = prepared;
  else state.programs.push(prepared);
  sortProgramsInPlace();
  invalidateProgramCaches(true);
}

function ensureLookupValue(collectionName, value) {
  const collection = state.lookups[collectionName] || [];
  const values = collectionName === 'secondary_topics' ? splitMultiValues(value) : [normalizeText(value)];
  values.filter(Boolean).forEach((name) => {
    if (collection.some((item) => normalizeLower(item.name) === normalizeLower(name))) return;
    collection.push({ name, sort_order: collection.length + 1 });
  });
  collection.sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), undefined, { sensitivity: 'base' }));
}

function syncLookupsFromProgram(program) {
  ensureLookupValue('topics', program.topic);
  ensureLookupValue('secondary_topics', program.secondary_topic);
  ensureLookupValue('distributors', program.distributor);
  ensureLookupValue('package_types', program.package_type);
  ensureLookupValue('server_locations', program.server_tape);
  ensureLookupValue('program_types', program.program_type);
}

function refreshUiAfterProgramMutation(statusMessage) {
  renderFilters();
  renderTable();
  renderStats();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(statusMessage);
}

async function loadLookupTable(tableName) {
  const { data } = await state.supabase
    .from(tableName)
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  return data || [];
}

async function loadLookups() {
  const [topics, secondaryTopics, distributors, packageTypes, serverLocations, programTypes] = await Promise.all([
    loadLookupTable('topics'),
    loadLookupTable('secondary_topics'),
    loadLookupTable('distributors'),
    loadLookupTable('package_types'),
    loadLookupTable('server_locations'),
    loadLookupTable('program_types')
  ]);

  state.lookups.topics = topics.length ? topics : uniqueLookupFromPrograms('topic').map((name, index) => ({ name, color_hex: '#b8c7ff', sort_order: index + 1 }));
  state.lookups.secondary_topics = secondaryTopics.length ? secondaryTopics : uniqueLookupFromPrograms('secondary_topic').map((name, index) => ({ name, sort_order: index + 1 }));
  state.lookups.distributors = distributors.length ? distributors : uniqueLookupFromPrograms('distributor').map((name, index) => ({ name, sort_order: index + 1 }));
  state.lookups.package_types = packageTypes.length ? packageTypes : uniqueLookupFromPrograms('package_type').map((name, index) => ({ name, sort_order: index + 1 }));
  state.lookups.server_locations = serverLocations.length ? serverLocations : uniqueLookupFromPrograms('server_tape').map((name, index) => ({ name, sort_order: index + 1 }));
  state.lookups.program_types = programTypes.length ? programTypes : uniqueLookupFromPrograms('program_type').map((name, index) => ({ name, sort_order: index + 1 }));
}

function parseLeadingNumber(value) {
  const match = normalizeText(value).match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function sortLengthValues(values) {
  return [...values].sort((a, b) => {
    const aNum = parseLeadingNumber(a);
    const bNum = parseLeadingNumber(b);
    if (aNum !== bNum) return aNum - bNum;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  });
}

function sortCodeValues(values) {
  const priority = ['AM250', 'Y', 'N', 'M', 'YES', 'NO', '?', '13.3'];
  return [...values].sort((a, b) => {
    const aText = normalizeText(a).toUpperCase();
    const bText = normalizeText(b).toUpperCase();
    const aIdx = priority.indexOf(aText);
    const bIdx = priority.indexOf(bText);
    if (aIdx !== -1 || bIdx !== -1) {
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    }
    return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function uniqueCodeValues() {
  const normalized = Array.from(new Set(
    state.programs
      .map((p) => normalizeText(p.legacy_code))
      .filter(Boolean)
      .map((value) => value.toUpperCase())
  ));
  return sortCodeValues(normalized);
}


function uniqueLookupFromPrograms(field) {
  const values = field === 'secondary_topic'
    ? Array.from(new Set(state.programs.flatMap((p) => splitMultiValues(p[field]))))
    : Array.from(new Set(state.programs.map((p) => normalizeText(p[field])).filter(Boolean)));
  if (field === 'length_minutes') return sortLengthValues(values);
  return values.sort((a, b) => a.localeCompare(b));
}

function fillDatalist(listEl, items) {
  if (!listEl) return;
  listEl.innerHTML = '';
  for (const item of items) {
    const label = typeof item === 'string' ? item : item.name;
    const option = document.createElement('option');
    option.value = label;
    listEl.append(option);
  }
}

function fillSelect(selectEl, items, includeBlank = true) {
  const currentValues = selectEl.multiple ? selectedValues(selectEl) : [selectEl.value];
  selectEl.innerHTML = '';
  if (includeBlank) {
    selectEl.append(new Option('', ''));
  }
  for (const item of items) {
    const label = typeof item === 'string' ? item : item.name;
    const option = new Option(label, label);
    if (currentValues.includes(label)) option.selected = true;
    selectEl.add(option);
  }
  if (!selectEl.multiple && [...selectEl.options].some((opt) => opt.value === currentValues[0])) {
    selectEl.value = currentValues[0];
  }
}

function renderFilters() {
  fillSelect(els.topicFilter, state.lookups.topics, false);
  fillSelect(els.secondaryTopicFilter, state.lookups.secondary_topics, false);
  fillSelect(els.distributorFilter, state.lookups.distributors);
  fillSelect(els.programTypeFilter, state.lookups.program_types);
  fillSelect(els.lengthFilter, sortLengthValues(uniqueLookupFromPrograms('length_minutes')), false);
  fillSelect(els.codeFilter, uniqueCodeValues(), false);

  const form = els.programForm;
  fillSelect(form.elements.program_type, state.lookups.program_types);
  fillSelect(form.elements.topic, state.lookups.topics);
  fillDatalist(els.secondaryTopicList, state.lookups.secondary_topics);
  fillDatalist(els.distributorList, state.lookups.distributors);
  fillSelect(form.elements.package_type, state.lookups.package_types);
  fillSelect(form.elements.server_tape, state.lookups.server_locations);
  renderTemplateSourceList();
}

function snapshotViewState() {
  return {
    searchInput: els.searchInput.value,
    searchFieldSelect: els.searchFieldSelect.value,
    codeFilter: selectedValues(els.codeFilter),
    topicFilter: selectedValues(els.topicFilter),
    secondaryTopicFilter: selectedValues(els.secondaryTopicFilter),
    lengthFilter: selectedValues(els.lengthFilter),
    distributorFilter: els.distributorFilter.value,
    programTypeFilter: els.programTypeFilter.value,
    statusFilter: els.statusFilter.value,
    currentView: state.currentView
  };
}

function sameViewState(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

function rememberViewState() {
  const current = snapshotViewState();
  if (sameViewState(current, state.lastAppliedViewState)) return;
  if (state.lastAppliedViewState) state.viewHistory.push(JSON.parse(JSON.stringify(state.lastAppliedViewState)));
  if (state.viewHistory.length > 20) state.viewHistory.shift();
  state.lastAppliedViewState = current;
  syncUndoButton();
}

function applySnapshot(snapshot) {
  if (!snapshot) return;
  els.searchInput.value = snapshot.searchInput || '';
  els.searchFieldSelect.value = snapshot.searchFieldSelect || '';
  setMultiSelectValues(els.codeFilter, snapshot.codeFilter || []);
  setMultiSelectValues(els.topicFilter, snapshot.topicFilter || []);
  setMultiSelectValues(els.secondaryTopicFilter, snapshot.secondaryTopicFilter || []);
  setMultiSelectValues(els.lengthFilter, snapshot.lengthFilter || []);
  els.distributorFilter.value = snapshot.distributorFilter || '';
  els.programTypeFilter.value = snapshot.programTypeFilter || '';
  els.statusFilter.value = snapshot.statusFilter || '';
  state.currentView = snapshot.currentView || 'all';
  syncQuickViewState();
  const { count } = renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${count.toLocaleString()} matching programs.`);
}

function undoViewState() {
  const snapshot = state.viewHistory.pop();
  if (!snapshot) return;
  applySnapshot(snapshot);
}

function syncUndoButton() {
  if (!els.undoViewBtn) return;
  els.undoViewBtn.classList.toggle('hidden', !state.viewHistory.length);
}

function setMultiSelectValues(selectEl, values) {
  const set = new Set(values || []);
  Array.from(selectEl.options).forEach((opt) => { opt.selected = set.has(opt.value); });
}

function viewIncludesArchived(view) {
  return new Set(['archived', 'ending_soon', 'expired']).has(view);
}

function programsInCurrentViewPool() {
  return getFilteredProgramsResult().pool;
}

function getFilteredProgramsResult() {
  const key = filteredCacheKey();
  if (state.filteredCache.key === key && state.filteredCache.value) return state.filteredCache.value;

  let pool = state.programs;
  if (state.currentView !== 'archived') {
    pool = pool.filter((item) => !item.is_archived);
  }
  if (state.currentView && state.currentView !== 'all') {
    pool = pool.filter((item) => matchesView(item, state.currentView));
  }

  let items = pool;
  const search = normalizeLower(els.searchInput.value);
  const searchField = els.searchFieldSelect.value;
  const codes = selectedValues(els.codeFilter).map((value) => normalizeText(value).toUpperCase());
  const topics = selectedValues(els.topicFilter);
  const secondaryTopics = selectedValues(els.secondaryTopicFilter);
  const lengths = selectedValues(els.lengthFilter);
  const distributor = els.distributorFilter.value;
  const programType = els.programTypeFilter.value;
  const status = els.statusFilter.value;

  if (search) {
    items = items.filter((item) => {
      const meta = item.__meta || decorateProgram(item).__meta;
      if (searchField) return normalizeLower(item[searchField]).includes(search);
      return meta.searchBlob.includes(search);
    });
  }
  if (codes.length) items = items.filter((item) => (item.__meta || decorateProgram(item).__meta).legacyCodeUpper && codes.includes((item.__meta || decorateProgram(item).__meta).legacyCodeUpper));
  if (topics.length) items = items.filter((item) => topics.includes(item.topic));
  if (secondaryTopics.length) items = items.filter((item) => {
    const itemTopics = (item.__meta || decorateProgram(item).__meta).secondaryTopics;
    return secondaryTopics.some((topic) => itemTopics.includes(topic));
  });
  if (lengths.length) items = items.filter((item) => lengths.includes(String(item.length_minutes ?? '')));
  if (distributor) items = items.filter((item) => item.distributor === distributor);
  if (programType) items = items.filter((item) => item.program_type === programType);
  if (status) items = items.filter((item) => matchesView(item, status));

  const result = { items, pool, poolCount: pool.length };
  state.filteredCache = { key, value: result };
  return result;
}

function selectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions || []).map((opt) => opt.value).filter(Boolean);
}

function clearMultiSelect(selectEl) {
  Array.from(selectEl.options).forEach((opt) => { opt.selected = false; });
}

function resetFilters() {
  rememberViewState();
  els.searchInput.value = '';
  els.searchFieldSelect.value = '';
  clearMultiSelect(els.codeFilter);
  clearMultiSelect(els.topicFilter);
  clearMultiSelect(els.secondaryTopicFilter);
  clearMultiSelect(els.lengthFilter);
  els.distributorFilter.value = '';
  els.programTypeFilter.value = '';
  els.statusFilter.value = '';
  state.currentView = 'all';
  syncQuickViewState();
  const { count } = renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${count.toLocaleString()} matching programs.`);
}

function activePrograms() {
  return getFilteredProgramsResult().items;
}

function matchesView(program, view) {
  const meta = program.__meta || decorateProgram(program).__meta;
  const flags = meta.flags;
  const michiganText = meta.michiganText;
  switch (view) {
    case 'all':
      return true;
    case 'active':
      return !program.is_archived;
    case 'archived':
      return program.is_archived;
    case 'needs_apt_check':
      return flags.needsAptCheck;
    case 'ending_soon':
      return flags.rightsStatus === 'Ending soon';
    case 'expired':
      return flags.rightsStatus === 'Expired';
    case 'new_to_13_1':
      return flags.newTo131;
    case 'new_to_13_3':
      return flags.newTo133;
    case 'archive_candidate':
      return flags.archiveCandidate;
    case 'no_end_date':
      return flags.rightsStatus === 'No end date';
    case 'missing_rights':
      return flags.missingRights;
    case 'missing_info':
      return !normalizeText(program.notes) || !normalizeText(program.topic) || !normalizeText(program.length_minutes) || !normalizeText(program.program_type) || !normalizeText(program.aired_13_1) || !normalizeText(program.aired_13_3) || !normalizeText(program.distributor);
    case 'michigan':
      return michiganText.includes('michigan');
    case 'evergreens':
      return meta.packageTypeLower === 'hdever';
    default:
      return true;
  }
}

function topicColor(topicName) {
  const topic = state.lookups.topics.find((item) => item.name === topicName);
  return topic?.color_hex || '#dbeafe';
}

function badgesFor(program) {
  const flags = (program.__meta || decorateProgram(program).__meta).flags;
  const badges = [];

  if (flags.needsAptCheck) badges.push({ label: 'APT check', cls: 'danger' });
  if (flags.rightsStatus === 'Ending soon') badges.push({ label: `Ends in ${flags.daysLeft}d`, cls: 'warn' });
  if (flags.rightsStatus === 'Expired') badges.push({ label: 'Expired', cls: 'danger' });
  if (flags.missingRights) badges.push({ label: 'Missing rights', cls: 'warn' });
  if (flags.newTo131) badges.push({ label: 'New to 13.1', cls: 'info' });
  if (flags.newTo133) badges.push({ label: 'New to 13.3', cls: 'info' });
  if (program.is_archived) badges.push({ label: 'Archived', cls: 'good' });
  return badges;
}

function formatAiringTime(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/^(\d{1,2})(?:[:\s](\d{2}))?(?::\d{2})?\s*([ap]m)?$/i);
  if (!match) return text;
  let hours = Number(match[1]);
  const minutes = match[2] || '00';
  const meridiem = match[3] ? match[3].toLowerCase() : '';
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23) return text;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function formatAiringEntry(entry) {
  const text = normalizeText(entry);
  if (!text) return '';
  const dateMatch = text.match(/^(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(.*)$/);
  if (!dateMatch) return text;
  const datePart = dateMatch[1].replace(/-/g, '/');
  const rest = normalizeText(dateMatch[2]);
  if (!rest) return datePart;
  const timeMatch = rest.match(/^(\d{1,2}(?:[:\s]\d{2})?(?::\d{2})?\s*(?:[ap]m)?)\s*(.*)$/i);
  if (!timeMatch) return `${datePart} ${rest}`;
  const timePart = formatAiringTime(timeMatch[1]);
  const trailing = normalizeText(timeMatch[2]);
  return [datePart, timePart, trailing].filter(Boolean).join(' ');
}

function formatAiringSegments(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const normalized = text
    .replace(/\r/g, '')
    .replace(/\n+/g, ';')
    .replace(/\s*;\s*/g, ';')
    .replace(/,\s*(?=\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g, ';');
  const rawParts = normalized.split(';').map((part) => normalizeText(part)).filter(Boolean);
  const parts = rawParts.length ? rawParts : [text];
  return parts.map((part) => `<div class="airing-item">${escapeHtml(formatAiringEntry(part))}</div>`).join('');
}

function formatRightsWindow(program) {
  const begin = formatDate(program.rights_begin);
  const end = formatDate(program.rights_end);
  return `
    <div class="rights-stack">
      <div><span class="rights-label">Begin</span> <span>${begin || '—'}</span></div>
      <div><span class="rights-label">End</span> <span>${end || '—'}</span></div>
    </div>
  `;
}

function formatDetailsCell(program) {
  const topicMarkup = program.topic ? `<span class="topic-chip" style="background:${topicColor(program.topic)}">${escapeHtml(program.topic)}</span>` : '<span class="meta-muted">No topic</span>';
  const secondaryMarkup = program.secondary_topic ? `<div class="secondary-topic">${escapeHtml(program.secondary_topic)}</div>` : '';
  const metaBits = [program.length_minutes, program.program_type].filter(Boolean).map(escapeHtml);
  const metaMarkup = metaBits.length ? `<div class="details-meta">${metaBits.join(' · ')}</div>` : '<div class="details-meta meta-muted">—</div>';
  return `<div class="details-stack">${topicMarkup}${secondaryMarkup}${metaMarkup}</div>`;
}

async function handleCopyNote(programId, triggerButton) {
  const item = state.programs.find((program) => String(program.id) === String(programId));
  const noteText = item?.notes || '';
  try {
    await navigator.clipboard.writeText(noteText);
    if (triggerButton) {
      const original = triggerButton.textContent;
      triggerButton.textContent = 'Copied';
      setTimeout(() => { triggerButton.textContent = original; }, 1200);
    }
  } catch {
    alert('Clipboard copy failed.');
  }
}

function flushSearchUpdate() {
  if (state.searchDebounceTimer) {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = null;
  }
  updateQueryStatus();
}

function scheduleSearchUpdate() {
  if (state.searchDebounceTimer) clearTimeout(state.searchDebounceTimer);
  state.searchDebounceTimer = setTimeout(() => {
    state.searchDebounceTimer = null;
    updateQueryStatus();
  }, SEARCH_INPUT_DEBOUNCE_MS);
}

function renderTable() {
  const { items, poolCount } = getFilteredProgramsResult();
  const selectedId = state.selectedId;

  updateListSummary(items.length, poolCount);

  els.tableBody.innerHTML = items.map((item) => {
    const badges = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
    const selectedClass = item.id === selectedId ? 'selected' : '';
    const archivedClass = item.is_archived ? 'archived-row' : '';
    return `
      <tr data-id="${item.id}" class="${selectedClass} ${archivedClass}">
        <td>
          <div class="program-title">${escapeHtml(item.title || '')}</div>
          <div class="program-sub">${item.legacy_code ? `<span class="code-pill">${escapeHtml(item.legacy_code)}</span>` : ''}${item.nola_eidr ? `<span class="program-meta">${escapeHtml(item.nola_eidr)}</span>` : ''}</div>
        </td>
        <td>
          <div class="notes-cell">
            <div class="notes-text">${escapeHtml(item.notes || '')}</div>
            <button type="button" class="copy-note-btn" data-copy-note="${item.id}">Copy</button>
          </div>
        </td>
        <td>${formatDetailsCell(item)}</td>
        <td><div class="airing-stack">${formatAiringSegments(item.aired_13_1)}</div></td>
        <td><div class="airing-stack">${formatAiringSegments(item.aired_13_3)}</div></td>
        <td class="type-cell">${escapeHtml(item.package_type || '')}</td>
        <td>${formatRightsWindow(item)}</td>
        <td>${escapeHtml(item.distributor || '')}</td>
        <td><div class="badges">${badges}</div></td>
      </tr>
    `;
  }).join('');
  return { count: items.length, poolCount };
}

function getStatsSummary() {
  const key = statsCacheKey();
  if (state.statsCache.key === key && state.statsCache.value) return state.statsCache.value;
  const summary = { apt: 0, ending: 0, expired: 0, missingRights: 0, archived: 0 };
  state.programs.forEach((program) => {
    const flags = (program.__meta || decorateProgram(program).__meta).flags;
    if (program.is_archived) {
      summary.archived += 1;
      return;
    }
    if (flags.needsAptCheck) summary.apt += 1;
    if (flags.rightsStatus === 'Ending soon') summary.ending += 1;
    if (flags.rightsStatus === 'Expired') summary.expired += 1;
    if (flags.missingRights) summary.missingRights += 1;
  });
  state.statsCache = { key, value: summary };
  return summary;
}

function renderStats() {
  const summary = getStatsSummary();
  els.statApt.textContent = summary.apt.toLocaleString();
  els.statEnding.textContent = summary.ending.toLocaleString();
  els.statExpired.textContent = summary.expired.toLocaleString();
  els.statMissingRights.textContent = summary.missingRights.toLocaleString();
  els.statArchived.textContent = summary.archived.toLocaleString();
  syncQuickViewState();
}

function syncQuickViewState() {
  document.querySelectorAll('#quickStrip [data-view]').forEach((card) => card.classList.toggle('active', card.dataset.view === state.currentView));
}

function openEditor(id = null, duplicate = false) {
  const form = els.programForm;
  let item = state.programs.find((program) => String(program.id) === String(id)) || null;

  if (duplicate && item) {
    item = { ...item, id: null, title: `${item.title} (copy)` };
  }

  state.selectedId = item?.id || null;
  els.drawer.classList.remove('hidden');
  els.drawerBackdrop.classList.remove('hidden');
  document.body.classList.add('modal-open');
  els.drawerTitle.textContent = item ? (duplicate ? 'Duplicate program' : (canEdit() ? item.title : `View: ${item.title}`)) : 'New program';
  form.dataset.programId = item?.id || '';

  const fields = ['title','legacy_code','notes','episode_season','nola_eidr','program_type','length_minutes','topic','secondary_topic','aired_13_1','aired_13_3','distributor','vote','rights_begin','rights_end','rights_notes','package_type','server_tape'];
  for (const field of fields) {
    const value = field === 'secondary_topic' ? normalizeMultiValueInput(item?.[field]) : (item?.[field] ?? '');
    form.elements[field].value = value;
  }

  if (els.templateTools) els.templateTools.classList.toggle('hidden', Boolean(item?.id));
  if (els.templateSourceInput) els.templateSourceInput.value = '';

  updateVoteVisibility();
  renderFormFlags(item);
  renderDuplicateCheck();
  syncSelectedRow();
  applyEditorMode();

  requestAnimationFrame(() => form.elements.title.focus());
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
  els.drawer.classList.add('hidden');
  els.drawerBackdrop.classList.add('hidden');
  document.body.classList.remove('modal-open');
  state.selectedId = null;
  els.duplicateCheck.innerHTML = '';
  els.duplicateCheck.classList.add('hidden');
  syncSelectedRow();
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
    rights_begin: form.elements.rights_begin.value || null,
    rights_end: form.elements.rights_end.value || null,
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

    if (programId) openEditor(refreshedProgram.id);
    else closeEditor();
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
  invalidateProgramCaches(true);
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
  const { count } = renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${count.toLocaleString()} matching programs.`);
}

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

  els.duplicateCheck?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-open-program]');
    if (!btn) return;
    openEditor(btn.dataset.openProgram);
  });

  els.loginGitHubBtn?.addEventListener('click', async () => {
    els.authMessage.textContent = 'Sending you to GitHub…';
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: getAdminRedirectUrl()
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
    els.programForm.elements[field].addEventListener('input', renderDuplicateCheck);
    els.programForm.elements[field].addEventListener('change', renderDuplicateCheck);
  });
  els.duplicateBtn.addEventListener('click', () => {
    const id = els.programForm.dataset.programId;
    if (!id) return;
    openEditor(id, true);
  });

  els.tableBody?.addEventListener('click', async (event) => {
    const copyBtn = event.target.closest('[data-copy-note]');
    if (copyBtn) {
      event.stopPropagation();
      await handleCopyNote(copyBtn.dataset.copyNote, copyBtn);
      return;
    }
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
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

  els.quickStrip.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view]');
    if (!btn) return;
    state.currentView = btn.dataset.view;
    syncQuickViewState();
    els.statusFilter.value = '';
    updateQueryStatus();
  });

  els.exportBtn.addEventListener('click', exportCurrentView);
  els.refreshBtn.addEventListener('click', async () => {
    await loadEverything();
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