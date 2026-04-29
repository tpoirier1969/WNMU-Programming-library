const config = window.APP_CONFIG || {};
const $ = (selector) => document.querySelector(selector);

const state = {
  supabase: null,
  session: null,
  lookupsLoaded: false,
  templateResults: [],
  duplicateTimer: null,
  duplicateRequestToken: 0,
  templateRequestToken: 0,
  lastSavedId: null,
  ratingDbSupport: null,
  pbsImportData: null,
  pbsImportPanelOpen: false
};

const els = {
  setupNotice: $('#setupNotice'),
  pageShell: $('#pageShell'),
  statusLine: $('#statusLine'),
  authStateText: $('#authStateText'),
  authMessage: $('#authMessage'),
  loginGitHubBtn: $('#loginGitHubBtn'),
  logoutBtn: $('#logoutBtn'),
  programForm: $('#programForm'),
  duplicateCheck: $('#duplicateCheck'),
  templateSearchInput: $('#templateSearchInput'),
  templateSearchBtn: $('#templateSearchBtn'),
  templateResults: $('#templateResults'),
  templateFeedback: $('#templateFeedback'),
  formFeedback: $('#formFeedback'),
  successBox: $('#successBox'),
  clearFormBtn: $('#clearFormBtn'),
  saveBtn: $('#saveBtn'),
  saveAnotherBtn: $('#saveAnotherBtn'),
  editorRating: $('#editorRating'),
  voteFieldWrap: $('#voteFieldWrap'),
  pbsImportTools: true,
  togglePbsImportBtn: $('#togglePbsImportBtn'),
  pbsImportPanel: $('#pbsImportPanel'),
  pbsOfferInput: $('#pbsOfferInput'),
  pbsImportMode: $('#pbsImportMode'),
  parsePbsOfferBtn: $('#parsePbsOfferBtn'),
  clearPbsOfferBtn: $('#clearPbsOfferBtn'),
  pbsImportPreview: $('#pbsImportPreview')
};

const DEFAULT_NEW_PROGRAM_VALUES = Object.freeze({ package_type: 'HDBA', server_tape: 'sIX' });
const CURATED_SOURCE_OPTIONS = Object.freeze(['sIX', 'Server', 'Tape', 'FTP', 'Feed', 'Unavailable', "Don't Have", 'Other']);
const NOLA_PLACEHOLDERS = new Set(['nonola', 'no nola', 'no-nola', 'n/a', 'na', 'none', 'unknown']);

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
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

function normalizeRating(value) {
  if (value == null || value === '') return null;
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) return null;
  return numeric;
}

function hasValidConfig() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && String(config.SUPABASE_URL).startsWith('http'));
}

function canEdit() {
  return Boolean(state.session);
}

function setStatus(message) {
  if (els.statusLine) els.statusLine.textContent = message || '';
}

function setFeedback(target, message = '', tone = '') {
  if (!target) return;
  target.textContent = message || '';
  target.className = `standalone-feedback ${tone}`.trim();
}

function showSuccess(message = '') {
  if (!els.successBox) return;
  if (!message) {
    els.successBox.classList.add('hidden');
    els.successBox.innerHTML = '';
    return;
  }
  els.successBox.classList.remove('hidden');
  els.successBox.innerHTML = message;
}

function escapeHtml(text) {
  return (text ?? '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}


function ensureEditorSelectOption(fieldName, value) {
  const field = els.programForm?.elements?.[fieldName];
  const normalized = normalizeText(value);
  if (!field || !normalized || field.tagName !== 'SELECT') return;
  const exists = Array.from(field.options).some((option) => normalizeLower(option.value) === normalizeLower(normalized));
  if (exists) return;
  const option = document.createElement('option');
  option.value = normalized;
  option.textContent = normalized;
  field.appendChild(option);
}

function renderDuplicateCheck() {
  void refreshDuplicateMatches();
}

function renderFormFlags() {}
function updateLookupButtonState() {}

function updatePbsImportVisibility() {
  if (!els.togglePbsImportBtn || !els.pbsImportPanel) return;
  const allowImport = canEdit();
  els.togglePbsImportBtn.disabled = !allowImport;
  els.togglePbsImportBtn.classList.toggle('hidden', !allowImport);
  if (!allowImport) {
    state.pbsImportPanelOpen = false;
    state.pbsImportData = null;
    els.pbsImportPanel.classList.add('hidden');
    els.pbsImportPreview?.classList.add('hidden');
    els.togglePbsImportBtn.textContent = 'Paste PBS offer';
    return;
  }
  els.pbsImportPanel.classList.toggle('hidden', !state.pbsImportPanelOpen);
  els.togglePbsImportBtn.textContent = state.pbsImportPanelOpen ? 'Hide PBS import' : 'Paste PBS offer';
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
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

function updateVoteVisibility() {
  const isApt = normalizeLower(els.programForm.elements.distributor.value) === 'apt';
  els.voteFieldWrap?.classList.toggle('hidden-field', !isApt);
  els.programForm.elements.vote.disabled = !isApt;
  if (!isApt) els.programForm.elements.vote.value = '';
}

function isPlaceholderNola(value) {
  return NOLA_PLACEHOLDERS.has(normalizeLower(value));
}

function renderEditorRatingControl() {
  const container = els.editorRating;
  const input = els.programForm?.elements?.rating;
  if (!container || !input) return;
  const current = normalizeRating(input.value);
  const label = container.querySelector('.rating-value-label');
  if (label) label.textContent = current ? `${current} star${current === 1 ? '' : 's'}` : 'Not rated';
  container.dataset.rating = current || '';
  container.querySelectorAll('[data-editor-rating]').forEach((button) => {
    const value = normalizeRating(button.dataset.editorRating);
    const filled = current != null && value != null && value <= current;
    button.classList.toggle('filled', filled);
    button.classList.toggle('anchor', current != null && value === current);
    button.setAttribute('aria-checked', current != null && value === current ? 'true' : 'false');
    button.disabled = !canEdit();
  });
}

function setEditorRating(value) {
  const input = els.programForm?.elements?.rating;
  if (!input) return;
  const next = normalizeRating(value);
  const current = normalizeRating(input.value);
  input.value = current != null && current === next ? '' : String(next ?? '');
  renderEditorRatingControl();
}

async function loadLookupTable(tableName) {
  const { data, error } = await state.supabase
    .from(tableName)
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

function fillSelect(select, items = [], options = {}) {
  if (!select) return;
  const preserveValue = normalizeText(select.value);
  const placeholder = options.placeholder ?? '';
  const values = items.map((item) => normalizeText(item?.name ?? item)).filter(Boolean);
  const unique = Array.from(new Set(values));
  if (options.extraValues?.length) {
    for (const extra of options.extraValues) {
      const normalized = normalizeText(extra);
      if (normalized && !unique.some((item) => normalizeLower(item) === normalizeLower(normalized))) unique.push(normalized);
    }
  }
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = placeholder;
  select.appendChild(blank);
  unique.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (preserveValue) {
    const existing = Array.from(select.options).find((option) => normalizeLower(option.value) === normalizeLower(preserveValue));
    if (existing) select.value = existing.value;
    else {
      const option = document.createElement('option');
      option.value = preserveValue;
      option.textContent = preserveValue;
      select.appendChild(option);
      select.value = preserveValue;
    }
  }
}

function fillDatalist(datalist, items = []) {
  if (!datalist) return;
  const values = Array.from(new Set(items.map((item) => normalizeText(item?.name ?? item)).filter(Boolean)));
  values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  datalist.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('');
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

  fillSelect(els.programForm.elements.topic, topics, { placeholder: '' });
  fillSelect(els.programForm.elements.program_type, programTypes, { placeholder: '' });
  fillSelect(els.programForm.elements.package_type, packageTypes, { placeholder: '', extraValues: [DEFAULT_NEW_PROGRAM_VALUES.package_type] });
  fillSelect(els.programForm.elements.server_tape, serverLocations, { placeholder: '', extraValues: CURATED_SOURCE_OPTIONS });
  fillDatalist(document.getElementById('secondaryTopicList'), secondaryTopics);
  fillDatalist(document.getElementById('distributorList'), distributors);
  state.lookupsLoaded = true;
}

function applyDefaultValues() {
  for (const [field, value] of Object.entries(DEFAULT_NEW_PROGRAM_VALUES)) {
    if (els.programForm?.elements?.[field]) els.programForm.elements[field].value = value;
  }
  updateVoteVisibility();
  renderEditorRatingControl();
  ['rights_begin', 'rights_end'].forEach(syncDateProxyField);
}

function resetFormForNewEntry() {
  els.programForm.reset();
  els.duplicateCheck.innerHTML = '';
  els.duplicateCheck.classList.add('hidden');
  setFeedback(els.formFeedback, '', '');
  showSuccess('');
  applyDefaultValues();
  state.pbsImportData = null;
  state.pbsImportPanelOpen = false;
  if (typeof resetPbsImportUi === 'function') resetPbsImportUi({ clearText: true });
  updatePbsImportVisibility();
  requestAnimationFrame(() => els.programForm.elements.title?.focus());
}

async function findDuplicateMatches(titleValue, nolaValue) {
  const title = normalizeText(titleValue);
  const meaningfulNola = normalizeText(nolaValue);
  const matchesById = new Map();
  const queries = [];

  if (title) {
    queries.push(state.supabase
      .from('programs_enriched')
      .select('id,title,nola_eidr,is_archived')
      .ilike('title', title)
      .order('title', { ascending: true })
      .limit(8));
  }
  if (meaningfulNola && !isPlaceholderNola(meaningfulNola)) {
    queries.push(state.supabase
      .from('programs_enriched')
      .select('id,title,nola_eidr,is_archived')
      .ilike('nola_eidr', meaningfulNola)
      .order('title', { ascending: true })
      .limit(8));
  }

  if (!queries.length) return [];

  const responses = await Promise.all(queries);
  for (const response of responses) {
    if (response.error) throw response.error;
    (response.data || []).forEach((item) => matchesById.set(String(item.id), item));
  }

  return Array.from(matchesById.values()).sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title), undefined, { sensitivity: 'base' }));
}

function renderDuplicateMatches(matches, titleValue, nolaValue) {
  if (!matches.length) {
    els.duplicateCheck.innerHTML = '';
    els.duplicateCheck.classList.add('hidden');
    return;
  }
  const title = normalizeLower(titleValue);
  const meaningfulNola = !isPlaceholderNola(nolaValue) ? normalizeLower(nolaValue) : '';
  const archivedCount = matches.filter((item) => item.is_archived).length;
  const items = matches.map((item) => {
    const reasons = [];
    if (title && normalizeLower(item.title) === title) reasons.push('same title');
    if (meaningfulNola && normalizeLower(item.nola_eidr) === meaningfulNola) reasons.push('same NOLA');
    if (item.is_archived) reasons.push('archived');
    return `<li><strong>${escapeHtml(item.title || '(untitled)')}</strong>${item.nola_eidr ? ` <span class="dup-meta">· ${escapeHtml(item.nola_eidr)}</span>` : ''}${reasons.length ? ` <span class="dup-reason">(${reasons.join(', ')})</span>` : ''}</li>`;
  }).join('');
  const summaryParts = [];
  const activeCount = matches.length - archivedCount;
  if (activeCount) summaryParts.push(`${activeCount} active`);
  if (archivedCount) summaryParts.push(`${archivedCount} archived`);
  els.duplicateCheck.innerHTML = `
    <div class="duplicate-card warn">
      <div class="duplicate-title">Possible duplicate${matches.length === 1 ? '' : 's'} found${summaryParts.length ? ` <span class="dup-meta">· ${escapeHtml(summaryParts.join(', '))}</span>` : ''}</div>
      <ul class="duplicate-list">${items}</ul>
    </div>
  `;
  els.duplicateCheck.classList.remove('hidden');
}

function scheduleDuplicateCheck() {
  window.clearTimeout(state.duplicateTimer);
  const title = normalizeText(els.programForm.elements.title.value);
  const nola = normalizeText(els.programForm.elements.nola_eidr.value);
  if (!title && !nola) {
    renderDuplicateMatches([], '', '');
    return;
  }
  state.duplicateTimer = window.setTimeout(() => void refreshDuplicateMatches(), 280);
}

async function refreshDuplicateMatches() {
  const title = normalizeText(els.programForm.elements.title.value);
  const nola = normalizeText(els.programForm.elements.nola_eidr.value);
  if (!title && !nola) {
    renderDuplicateMatches([], '', '');
    return;
  }
  const token = ++state.duplicateRequestToken;
  try {
    const matches = await findDuplicateMatches(title, nola);
    if (token !== state.duplicateRequestToken) return;
    renderDuplicateMatches(matches, title, nola);
  } catch (error) {
    console.error(error);
    if (token !== state.duplicateRequestToken) return;
    setFeedback(els.formFeedback, error.message, 'warn');
  }
}

function renderTemplateResults(items = []) {
  state.templateResults = items;
  if (!items.length) {
    els.templateResults.innerHTML = '';
    return;
  }
  els.templateResults.innerHTML = items.map((item) => `
    <button type="button" class="template-result-btn" data-template-id="${item.id}">
      <div class="template-result-title">${escapeHtml(item.title || '(untitled)')}</div>
      <div class="template-result-meta">${item.nola_eidr ? escapeHtml(item.nola_eidr) : 'No NOLA'}${item.program_type ? ` · ${escapeHtml(item.program_type)}` : ''}${item.is_archived ? ' · archived' : ''}</div>
    </button>
  `).join('');
}

async function searchTemplates() {
  const term = normalizeText(els.templateSearchInput?.value);
  renderTemplateResults([]);
  if (term.length < 3) {
    setFeedback(els.templateFeedback, 'Type at least 3 characters to search.', 'warn');
    return;
  }
  setFeedback(els.templateFeedback, 'Searching titles…', 'info');
  const token = ++state.templateRequestToken;
  try {
    const { data, error } = await state.supabase
      .from('programs_enriched')
      .select('id,title,nola_eidr,is_archived,program_type,notes,length_minutes,topic,secondary_topic,distributor,vote,rights_begin,rights_end,rights_notes,package_type,server_tape')
      .ilike('title', `%${term}%`)
      .order('title', { ascending: true })
      .limit(12);
    if (error) throw error;
    if (token !== state.templateRequestToken) return;
    const items = data || [];
    renderTemplateResults(items);
    setFeedback(els.templateFeedback, items.length ? `Found ${items.length} match${items.length === 1 ? '' : 'es'}. Pick one to copy.` : 'No matching titles found.', items.length ? 'success' : 'warn');
  } catch (error) {
    console.error(error);
    if (token !== state.templateRequestToken) return;
    setFeedback(els.templateFeedback, error.message, 'error');
  }
}

function applyTemplateToForm(templateId) {
  const item = state.templateResults.find((entry) => String(entry.id) === String(templateId));
  if (!item) return;
  const form = els.programForm;
  const copyFields = ['notes','program_type','length_minutes','topic','distributor','vote','rights_begin','rights_end','rights_notes','package_type','server_tape'];
  copyFields.forEach((field) => {
    if (!form.elements[field]) return;
    form.elements[field].value = item[field] ?? '';
  });
  form.elements.secondary_topic.value = normalizeMultiValueInput(item.secondary_topic || '');
  form.elements.legacy_code.value = '';
  form.elements.episode_season.value = '';
  form.elements.nola_eidr.value = '';
  form.elements.aired_13_1.value = '';
  form.elements.aired_13_3.value = '';
  updateVoteVisibility();
  ['rights_begin', 'rights_end'].forEach((field) => {
    if (form.elements[field]) form.elements[field].value = formatShortDateInput(item[field]);
    syncDateProxyField(field);
  });
  setFeedback(els.formFeedback, `Copied shared fields from ${item.title}. Title, NOLA, episode, and airing fields were left blank on purpose.`, 'success');
  requestAnimationFrame(() => form.elements.title?.focus());
}

function collectPayload() {
  const form = els.programForm;
  return {
    legacy_code: normalizeText(form.elements.legacy_code.value) || null,
    title: normalizeText(form.elements.title.value),
    notes: normalizeText(form.elements.notes.value) || null,
    episode_season: normalizeText(form.elements.episode_season.value) || null,
    nola_eidr: normalizeText(form.elements.nola_eidr.value) || null,
    program_type: normalizeText(form.elements.program_type.value) || null,
    length_minutes: normalizeText(form.elements.length_minutes.value) || null,
    topic: normalizeText(form.elements.topic.value) || null,
    secondary_topic: normalizeMultiValueInput(form.elements.secondary_topic.value) || null,
    aired_13_1: normalizeText(form.elements.aired_13_1.value) || null,
    aired_13_3: normalizeText(form.elements.aired_13_3.value) || null,
    vote: normalizeLower(form.elements.distributor.value) === 'apt' ? (normalizeText(form.elements.vote.value) || null) : null,
    rights_begin: normalizeIsoDate(form.elements.rights_begin.value) || null,
    rights_end: normalizeIsoDate(form.elements.rights_end.value) || null,
    rights_notes: normalizeText(form.elements.rights_notes.value) || null,
    package_type: normalizeText(form.elements.package_type.value) || null,
    server_tape: normalizeText(form.elements.server_tape.value) || null,
    distributor: normalizeText(form.elements.distributor.value) || null,
    exclude_from_auto_archive: false,
    is_archived: false
  };
}

function isMissingRatingColumnError(error) {
  const haystack = normalizeLower(error?.message || error?.details || error?.hint || String(error || ''));
  return haystack.includes('rating') && (haystack.includes('column') || haystack.includes('schema cache') || haystack.includes('does not exist') || haystack.includes('could not find'));
}

function setSavingState(isSaving) {
  [els.saveBtn, els.saveAnotherBtn, els.clearFormBtn, els.templateSearchBtn].forEach((button) => {
    if (button) button.disabled = isSaving || (!canEdit() && button !== els.templateSearchBtn);
  });
}

async function saveProgram(event) {
  event.preventDefault();
  if (!canEdit()) {
    alert('Read-only mode. Sign in with GitHub to add programs.');
    return;
  }

  const submitter = event.submitter;
  const action = submitter?.dataset?.submitAction || 'save';
  const payload = collectPayload();
  const selectedRating = normalizeRating(els.programForm.elements.rating?.value);

  showSuccess('');
  setFeedback(els.formFeedback, '', '');

  if (!payload.title) {
    alert('Title is required.');
    els.programForm.elements.title.focus();
    return;
  }
  if (normalizeText(els.programForm.elements.rights_begin.value) && !payload.rights_begin) {
    alert('Rights begin must be a valid date. Use m/d/yy, m/d/yyyy, or yyyy-mm-dd. Two-digit years are saved as 20xx.');
    els.programForm.elements.rights_begin.focus();
    return;
  }
  if (normalizeText(els.programForm.elements.rights_end.value) && !payload.rights_end) {
    alert('Rights end must be a valid date. Use m/d/yy, m/d/yyyy, or yyyy-mm-dd. Two-digit years are saved as 20xx.');
    els.programForm.elements.rights_end.focus();
    return;
  }

  const dupes = await findDuplicateMatches(payload.title, payload.nola_eidr);
  if (dupes.length) {
    const archivedCount = dupes.filter((item) => item.is_archived).length;
    const archivedLine = archivedCount
      ? `
${archivedCount} matching archived program${archivedCount === 1 ? ' is' : 's are'} already in the archive.`
      : '';
    const proceed = window.confirm(`Possible duplicate found (${dupes.length}).${archivedLine}
Save anyway?`);
    if (!proceed) return;
  }

  setSavingState(true);
  setStatus('Creating program…');
  setFeedback(els.formFeedback, 'Saving new program…', 'info');

  try {
    const { data, error } = await state.supabase.from('programs').insert(payload).select('id').single();
    if (error) throw error;
    const programId = data?.id;
    state.lastSavedId = programId;

    let ratingNote = '';
    if (programId && selectedRating != null) {
      const ratingResponse = await state.supabase.from('programs').update({ rating: selectedRating }).eq('id', programId);
      if (ratingResponse.error) {
        if (isMissingRatingColumnError(ratingResponse.error)) {
          state.ratingDbSupport = false;
          ratingNote = ' Rating column is not available in the database yet.';
        } else {
          throw ratingResponse.error;
        }
      } else {
        state.ratingDbSupport = true;
      }
    }

    const successText = `Created <strong>${escapeHtml(payload.title)}</strong>.${ratingNote}`;
    showSuccess(`${successText} <a href="index.html" id="openLibraryAfterSave">Open library</a>`);
    setFeedback(els.formFeedback, `Created ${payload.title}.`, 'success');
    setStatus(`Created ${payload.title}.`);

    try {
      window.sessionStorage?.setItem('program-library-new-page-flash', JSON.stringify({
        message: `Created ${payload.title}.`
      }));
    } catch {}

    if (action === 'another') {
      resetFormForNewEntry();
      setFeedback(els.formFeedback, `Created ${payload.title}. Start the next one.`, 'success');
      showSuccess('');
      setStatus(`Created ${payload.title}. Ready for the next entry.`);
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
    setFeedback(els.formFeedback, error.message, 'error');
    setStatus(error.message);
  } finally {
    setSavingState(false);
  }
}

function updateAuthUi() {
  const editing = canEdit();
  els.loginGitHubBtn?.classList.toggle('hidden', editing);
  els.logoutBtn?.classList.toggle('hidden', !editing);
  if (els.programForm) {
    els.programForm.querySelectorAll('input, select, textarea, button').forEach((field) => {
      const type = field.type || '';
      if (['hidden'].includes(type)) return;
      if (field === els.templateSearchBtn || field === els.clearFormBtn) return;
      if (field.tagName === 'BUTTON' && !field.dataset.editorRating && field.type !== 'submit') return;
      if (field.tagName === 'INPUT' && type !== 'checkbox' && type !== 'hidden' && type !== 'button' && type !== 'submit') field.readOnly = !editing;
      if (field.tagName === 'TEXTAREA') field.readOnly = !editing;
      if (field.tagName === 'SELECT' || type === 'checkbox' || field.dataset.editorRating || field.type === 'submit') field.disabled = !editing;
    });
  }
  if (editing) {
    els.authStateText.textContent = 'Signed in. This page can create new records.';
    els.authMessage.textContent = '';
  } else {
    els.authStateText.textContent = 'Read-only. Sign in with GitHub to create programs from this page.';
  }
  renderEditorRatingControl();
  updateVoteVisibility();
  updatePbsImportVisibility();
}

function bindDatePickers() {
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
    proxy?.addEventListener('change', () => {
      if (proxy.value) input.value = formatShortDateInput(proxy.value);
      syncDateProxyField(field);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      requestAnimationFrame(() => input.focus());
    });
    pickerBtn?.addEventListener('click', () => {
      if (!canEdit()) return;
      syncDateProxyField(field);
      try { proxy?.showPicker?.(); }
      catch { proxy?.focus(); proxy?.click(); }
    });
  });
}

function bindEvents() {
  els.loginGitHubBtn?.addEventListener('click', async () => {
    els.authMessage.textContent = 'Sending you to GitHub…';
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.href.split('#')[0] }
    });
    if (error) {
      els.authMessage.textContent = error.message;
      setStatus(error.message);
    }
  });

  els.logoutBtn?.addEventListener('click', async () => {
    await state.supabase.auth.signOut();
    state.session = null;
    updateAuthUi();
    setStatus('Signed out. Read-only mode is active.');
  });

  els.programForm?.addEventListener('submit', saveProgram);
  els.programForm?.elements?.distributor?.addEventListener('input', updateVoteVisibility);
  els.programForm?.elements?.distributor?.addEventListener('change', updateVoteVisibility);
  els.programForm?.elements?.title?.addEventListener('input', scheduleDuplicateCheck);
  els.programForm?.elements?.title?.addEventListener('change', scheduleDuplicateCheck);
  els.programForm?.elements?.nola_eidr?.addEventListener('input', scheduleDuplicateCheck);
  els.programForm?.elements?.nola_eidr?.addEventListener('change', scheduleDuplicateCheck);
  els.editorRating?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-editor-rating]');
    if (!button || !canEdit()) return;
    event.preventDefault();
    setEditorRating(button.dataset.editorRating);
  });

  els.templateSearchBtn?.addEventListener('click', () => void searchTemplates());
  els.templateSearchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void searchTemplates();
  });
  els.templateResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-template-id]');
    if (!button) return;
    applyTemplateToForm(button.dataset.templateId);
  });
  els.clearFormBtn?.addEventListener('click', () => resetFormForNewEntry());


  els.togglePbsImportBtn?.addEventListener('click', () => {
    if (!canEdit()) return;
    togglePbsImportPanel();
  });
  els.parsePbsOfferBtn?.addEventListener('click', () => {
    try {
      const parsed = parsePbsOffer(els.pbsOfferInput?.value || '', els.pbsImportMode?.value || 'series');
      state.pbsImportData = parsed;
      renderPbsImportPreview(parsed);
      setStatus('PBS offer parsed. Review the preview, then fill the draft if it looks right.');
    } catch (error) {
      console.error(error);
      state.pbsImportData = null;
      renderPbsImportPreview(null);
      alert(error.message);
      setStatus(error.message);
    }
  });
  els.clearPbsOfferBtn?.addEventListener('click', () => {
    resetPbsImportUi({ clearText: true });
    setStatus('PBS import box cleared.');
    els.pbsOfferInput?.focus();
  });
  els.pbsOfferInput?.addEventListener('input', () => {
    if (!state.pbsImportData) return;
    state.pbsImportData = null;
    renderPbsImportPreview(null);
  });
  els.pbsImportMode?.addEventListener('change', () => {
    if (!state.pbsImportData) return;
    state.pbsImportData = null;
    renderPbsImportPreview(null);
  });
  els.pbsImportPreview?.addEventListener('click', (event) => {
    const applyBtn = event.target.closest('#applyPbsImportBtn');
    if (!applyBtn) return;
    event.preventDefault();
    if (!state.pbsImportData) return;
    applyPbsImportToForm(state.pbsImportData);
  });

  bindDatePickers();
}

async function init() {
  if (!hasValidConfig()) {
    els.setupNotice?.classList.remove('hidden');
    return;
  }

  const noStoreFetch = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' });
  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { fetch: noStoreFetch }
  });

  bindEvents();
  els.pageShell?.classList.remove('hidden');
  applyDefaultValues();
  renderEditorRatingControl();
  setStatus('Checking sign-in and loading lookup lists…');

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  updateAuthUi();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateAuthUi();
  });

  try {
    await loadLookups();
    applyDefaultValues();
    updateAuthUi();
    setStatus(canEdit() ? 'Ready for a new program.' : 'Lookups loaded. Sign in to create programs.');
  } catch (error) {
    console.error(error);
    setFeedback(els.formFeedback, error.message, 'error');
    setStatus(error.message);
  }
}

void init();
