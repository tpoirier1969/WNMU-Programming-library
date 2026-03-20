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
  currentView: 'active'
};

const els = {
  setupNotice: $('#setupNotice'),
  authShell: $('#authShell'),
  appShell: $('#appShell'),
  authTitle: $('#authTitle'),
  authMessage: $('#authMessage'),
  loginForm: $('#loginForm'),
  loginEmail: $('#loginEmail'),
  loginPassword: $('#loginPassword'),
  appTitle: $('#appTitle'),
  appVersion: $('#appVersion'),
  statusLine: $('#statusLine'),
  logoutBtn: $('#logoutBtn'),
  newProgramBtn: $('#newProgramBtn'),
  exportBtn: $('#exportBtn'),
  refreshBtn: $('#refreshBtn'),
  searchInput: $('#searchInput'),
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
  showArchived: $('#showArchived'),
  listSummary: $('#listSummary'),
  tableBody: $('#programTableBody'),
  drawer: $('#editorDrawer'),
  drawerBackdrop: $('#drawerBackdrop'),
  drawerTitle: $('#drawerTitle'),
  closeDrawerBtn: $('#closeDrawerBtn'),
  programForm: $('#programForm'),
  duplicateBtn: $('#duplicateBtn'),
  deleteBtn: $('#deleteBtn'),
  formFlags: $('#formFlags'),
  statApt: $('#statApt'),
  statEnding: $('#statEnding'),
  statExpired: $('#statExpired'),
  statMissingRights: $('#statMissingRights'),
  statArchived: $('#statArchived')
};

function hasValidConfig() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && String(config.SUPABASE_URL).startsWith('http'));
}

function requireAuth() {
  return config.REQUIRE_AUTH !== false;
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

function updateListSummary(count, totalPool) {
  const noun = count === 1 ? 'program' : 'programs';
  els.listSummary.textContent = `Showing ${count.toLocaleString()} ${noun}${totalPool != null ? ` from ${totalPool.toLocaleString()} in view` : ''}.`;
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

  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  bindEvents();

  if (requireAuth()) {
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    if (!state.session) {
      els.authShell.classList.remove('hidden');
      return;
    }
    showApp();
  } else {
    showApp();
  }
}

function showApp() {
  els.authShell.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  els.logoutBtn.classList.toggle('hidden', !requireAuth());
  loadEverything();
}

async function loadEverything() {
  setStatus('Running auto-archive check…');
  await attemptAutoArchive();
  setStatus('Loading data…');
  await Promise.all([loadPrograms(), loadLookups()]);
  renderFilters();
  renderTable();
  renderStats();
  const activeCount = state.programs.filter((item) => !item.is_archived).length;
  const archivedCount = state.programs.filter((item) => item.is_archived).length;
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
    state.programs = await fetchAllRows('programs_enriched', 'title');
  } catch (error) {
    console.error(error);
    setStatus(error.message);
    return;
  }
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
  const values = Array.from(new Set(state.programs.map((p) => normalizeText(p[field])).filter(Boolean)));
  if (field === 'length_minutes') return sortLengthValues(values);
  return values.sort((a, b) => a.localeCompare(b));
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
  fillSelect(form.elements.secondary_topic, state.lookups.secondary_topics);
  fillSelect(form.elements.distributor, state.lookups.distributors);
  fillSelect(form.elements.package_type, state.lookups.package_types);
  fillSelect(form.elements.server_tape, state.lookups.server_locations);
}

function selectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions || []).map((opt) => opt.value).filter(Boolean);
}

function clearMultiSelect(selectEl) {
  Array.from(selectEl.options).forEach((opt) => { opt.selected = false; });
}

function resetFilters() {
  els.searchInput.value = '';
  clearMultiSelect(els.codeFilter);
  clearMultiSelect(els.topicFilter);
  clearMultiSelect(els.secondaryTopicFilter);
  clearMultiSelect(els.lengthFilter);
  els.distributorFilter.value = '';
  els.programTypeFilter.value = '';
  els.statusFilter.value = '';
  state.currentView = 'active';
  [...document.querySelectorAll('.view-chip')].forEach((chip) => chip.classList.toggle('active', chip.dataset.view === 'active'));
  els.showArchived.checked = false;
  renderTable();
  setStatus(`${activePrograms().length.toLocaleString()} matching programs.`);
}

function activePrograms() {
  let items = [...state.programs];
  const search = normalizeLower(els.searchInput.value);
  const codes = selectedValues(els.codeFilter).map((value) => normalizeText(value).toUpperCase());
  const topics = selectedValues(els.topicFilter);
  const secondaryTopics = selectedValues(els.secondaryTopicFilter);
  const lengths = selectedValues(els.lengthFilter);
  const distributor = els.distributorFilter.value;
  const programType = els.programTypeFilter.value;
  const status = els.statusFilter.value;
  const showArchived = els.showArchived.checked;

  if (!showArchived && state.currentView !== 'archived') {
    items = items.filter((item) => !item.is_archived);
  }

  if (state.currentView && state.currentView !== 'all') {
    items = items.filter((item) => matchesView(item, state.currentView));
  }

  if (search) {
    items = items.filter((item) =>
      [item.title, item.notes, item.legacy_code, item.nola_eidr, item.secondary_topic, item.topic].some((value) => normalizeLower(value).includes(search))
    );
  }
  if (codes.length) items = items.filter((item) => codes.includes(normalizeText(item.legacy_code).toUpperCase()));
  if (topics.length) items = items.filter((item) => topics.includes(item.topic));
  if (secondaryTopics.length) items = items.filter((item) => secondaryTopics.includes(item.secondary_topic));
  if (lengths.length) items = items.filter((item) => lengths.includes(String(item.length_minutes ?? '')));
  if (distributor) items = items.filter((item) => item.distributor === distributor);
  if (programType) items = items.filter((item) => item.program_type === programType);
  if (status) items = items.filter((item) => matchesView(item, status));

  return items;
}

function matchesView(program, view) {
  const flags = computeFlags(program);
  const michiganText = [program.title, program.notes, program.topic, program.secondary_topic].map(normalizeLower).join(' | ');
  switch (view) {
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
    case 'michigan':
      return michiganText.includes('michigan');
    default:
      return true;
  }
}

function topicColor(topicName) {
  const topic = state.lookups.topics.find((item) => item.name === topicName);
  return topic?.color_hex || '#dbeafe';
}

function badgesFor(program) {
  const flags = computeFlags(program);
  const badges = [];

  if (flags.needsAptCheck) badges.push({ label: 'APT check', cls: 'danger' });
  if (flags.rightsStatus === 'Ending soon') badges.push({ label: `Ends in ${flags.daysLeft}d`, cls: 'warn' });
  if (flags.rightsStatus === 'Expired') badges.push({ label: 'Expired', cls: 'danger' });
  if (flags.rightsStatus === 'No end date') badges.push({ label: 'No end date', cls: 'info' });
  if (flags.missingRights) badges.push({ label: 'Missing rights', cls: 'warn' });
  if (flags.newTo131) badges.push({ label: 'New to 13.1', cls: 'info' });
  if (flags.newTo133) badges.push({ label: 'New to 13.3', cls: 'info' });
  if (program.is_archived) badges.push({ label: 'Archived', cls: 'good' });
  return badges;
}

function formatAiringSegments(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const normalized = text.replace(/\r/g, '').replace(/\n+/g, '; ');
  const parts = normalized.split(/\s*;\s*|\s*,\s*(?=\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}:\d{2}|\d{1,2}\s*[ap]m)/i).filter(Boolean);
  if (parts.length <= 1) return `<div class="airing-item">${escapeHtml(text)}</div>`;
  return parts.map((part) => `<div class="airing-item">${escapeHtml(part)}</div>`).join('');
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

function renderTable() {
  const items = activePrograms();
  const selectedId = state.selectedId;
  const poolCount = state.currentView === 'archived'
    ? state.programs.filter((item) => item.is_archived).length
    : state.programs.filter((item) => !item.is_archived).length;

  updateListSummary(items.length, poolCount);

  els.tableBody.innerHTML = items.map((item) => {
    const badges = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
    const selectedClass = item.id === selectedId ? 'selected' : '';
    const archivedClass = item.is_archived ? 'archived-row' : '';
    return `
      <tr data-id="${item.id}" class="${selectedClass} ${archivedClass}">
        <td>
          <div class="program-title">${escapeHtml(item.title || '')}</div>
          <div class="program-sub">${escapeHtml(item.legacy_code || '')}${item.nola_eidr ? ' • ' + escapeHtml(item.nola_eidr) : ''}</div>
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
        <td class="vote-cell">${escapeHtml(item.vote || '')}</td>
        <td>${formatRightsWindow(item)}</td>
        <td>${escapeHtml(item.distributor || '')}</td>
        <td><div class="badges">${badges}</div></td>
      </tr>
    `;
  }).join('');

  [...els.tableBody.querySelectorAll('tr')].forEach((row) => {
    row.addEventListener('click', () => openEditor(row.dataset.id));
  });

  [...els.tableBody.querySelectorAll('[data-copy-note]')].forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const item = state.programs.find((program) => String(program.id) === String(btn.dataset.copyNote));
      const noteText = item?.notes || '';
      try {
        await navigator.clipboard.writeText(noteText);
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = original; }, 1200);
      } catch {
        alert('Clipboard copy failed.');
      }
    });
  });
}

function renderStats() {
  const flags = state.programs.map((program) => ({ program, flags: computeFlags(program) }));
  els.statApt.textContent = flags.filter((x) => !x.program.is_archived && x.flags.needsAptCheck).length.toLocaleString();
  els.statEnding.textContent = flags.filter((x) => !x.program.is_archived && x.flags.rightsStatus === 'Ending soon').length.toLocaleString();
  els.statExpired.textContent = flags.filter((x) => x.flags.rightsStatus === 'Expired').length.toLocaleString();
  els.statMissingRights.textContent = flags.filter((x) => !x.program.is_archived && x.flags.missingRights).length.toLocaleString();
  els.statArchived.textContent = state.programs.filter((item) => item.is_archived).length.toLocaleString();
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
  els.drawerTitle.textContent = item ? (duplicate ? 'Duplicate program' : item.title) : 'New program';
  form.dataset.programId = item?.id || '';

  const fields = ['legacy_code','title','notes','episode_season','nola_eidr','program_type','length_minutes','topic','secondary_topic','aired_13_1','aired_13_3','vote','rights_begin','rights_end','rights_notes','package_type','server_tape','distributor','six'];
  for (const field of fields) {
    form.elements[field].value = item?.[field] ?? '';
  }
  form.elements.exclude_from_auto_archive.checked = Boolean(item?.exclude_from_auto_archive);
  form.elements.is_archived.checked = Boolean(item?.is_archived);

  renderFormFlags(item);
  renderTable();

  requestAnimationFrame(() => form.elements.title.focus());
}

function renderFormFlags(item) {
  if (!item) {
    els.formFlags.innerHTML = '<span class="badge info">New record</span>';
    return;
  }
  els.formFlags.innerHTML = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
}

function closeEditor() {
  els.drawer.classList.add('hidden');
  els.drawerBackdrop.classList.add('hidden');
  document.body.classList.remove('modal-open');
  state.selectedId = null;
  renderTable();
}

async function saveProgram(event) {
  event.preventDefault();
  const form = els.programForm;
  const programId = form.dataset.programId || null;
  const payload = {
    legacy_code: form.elements.legacy_code.value || null,
    title: form.elements.title.value.trim(),
    notes: form.elements.notes.value || null,
    episode_season: form.elements.episode_season.value || null,
    nola_eidr: form.elements.nola_eidr.value || null,
    program_type: form.elements.program_type.value || null,
    length_minutes: form.elements.length_minutes.value || null,
    topic: form.elements.topic.value || null,
    secondary_topic: form.elements.secondary_topic.value || null,
    aired_13_1: form.elements.aired_13_1.value || null,
    aired_13_3: form.elements.aired_13_3.value || null,
    vote: form.elements.vote.value || null,
    rights_begin: form.elements.rights_begin.value || null,
    rights_end: form.elements.rights_end.value || null,
    rights_notes: form.elements.rights_notes.value || null,
    package_type: form.elements.package_type.value || null,
    server_tape: form.elements.server_tape.value || null,
    distributor: form.elements.distributor.value || null,
    six: form.elements.six.value || null,
    exclude_from_auto_archive: form.elements.exclude_from_auto_archive.checked,
    is_archived: form.elements.is_archived.checked
  };

  if (!payload.title) {
    alert('Title is required.');
    return;
  }

  setStatus(programId ? 'Saving changes…' : 'Creating program…');

  let response;
  if (programId) {
    response = await state.supabase.from('programs').update(payload).eq('id', programId).select().single();
  } else {
    response = await state.supabase.from('programs').insert(payload).select().single();
  }

  if (response.error) {
    console.error(response.error);
    alert(response.error.message);
    setStatus(response.error.message);
    return;
  }

  const savedId = response.data.id;
  await loadPrograms();
  renderTable();
  renderStats();
  openEditor(savedId);
  setStatus('Saved.');
}

async function deleteProgram() {
  const id = els.programForm.dataset.programId;
  if (!id) {
    closeEditor();
    return;
  }
  if (!confirm('Delete this program permanently? This is the real woodchipper option.')) return;

  const { error } = await state.supabase.from('programs').delete().eq('id', id);
  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  await loadPrograms();
  renderTable();
  renderStats();
  closeEditor();
  setStatus('Program deleted.');
}

function exportCurrentView() {
  const items = activePrograms();
  const columns = ['legacy_code','title','notes','episode_season','nola_eidr','program_type','length_minutes','topic','secondary_topic','aired_13_1','aired_13_3','vote','rights_begin','rights_end','rights_notes','package_type','server_tape','distributor','six','is_archived','exclude_from_auto_archive'];
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
  const count = activePrograms().length;
  renderTable();
  setStatus(`${count.toLocaleString()} matching programs.`);
}

function bindEvents() {
  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.authMessage.textContent = 'Signing in…';
    const { error } = await state.supabase.auth.signInWithPassword({
      email: els.loginEmail.value,
      password: els.loginPassword.value
    });
    if (error) {
      els.authMessage.textContent = error.message;
      return;
    }
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    els.authMessage.textContent = '';
    showApp();
  });

  els.logoutBtn.addEventListener('click', async () => {
    await state.supabase.auth.signOut();
    location.reload();
  });

  els.newProgramBtn.addEventListener('click', () => openEditor());
  els.closeDrawerBtn.addEventListener('click', closeEditor);
  els.drawerBackdrop.addEventListener('click', closeEditor);
  els.programForm.addEventListener('submit', saveProgram);
  els.deleteBtn.addEventListener('click', deleteProgram);
  els.duplicateBtn.addEventListener('click', () => {
    const id = els.programForm.dataset.programId;
    if (!id) return;
    openEditor(id, true);
  });

  [els.searchInput, els.distributorFilter, els.programTypeFilter, els.statusFilter, els.showArchived]
    .forEach((el) => el.addEventListener('input', updateQueryStatus));
  [els.codeFilter, els.topicFilter, els.secondaryTopicFilter, els.lengthFilter, els.distributorFilter, els.programTypeFilter, els.statusFilter, els.showArchived]
    .forEach((el) => el.addEventListener('change', updateQueryStatus));

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

  $('.saved-views').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view]');
    if (!btn) return;
    state.currentView = btn.dataset.view;
    [...document.querySelectorAll('.view-chip')].forEach((chip) => chip.classList.toggle('active', chip === btn));
    els.showArchived.checked = state.currentView === 'archived';
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
    if (event.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
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
