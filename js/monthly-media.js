const config = window.APP_CONFIG || {};

const state = {
  supabase: null,
  session: null,
  rows: [],
  saveTimers: new Map()
};

const ROW_AUTOSAVE_DELAY_MS = 3000;

const MONTHLY_MEDIA_TABLE = 'monthly_media_schedule';

const els = {
  setupNotice: document.getElementById('setupNotice'),
  pageShell: document.getElementById('pageShell'),
  statusLine: document.getElementById('statusLine'),
  loginGitHubBtn: document.getElementById('loginGitHubBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authStateText: document.getElementById('authStateText'),
  pageFeedback: document.getElementById('pageFeedback'),
  addForm: document.getElementById('addForm'),
  addRowBtn: document.getElementById('addRowBtn'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  listSummary: document.getElementById('listSummary'),
  mediaTableBody: document.getElementById('mediaTableBody'),
  emptyState: document.getElementById('emptyState')
};

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasValidConfig() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
}

function setStatus(message) {
  if (els.statusLine) els.statusLine.textContent = message || '';
}

function setFeedback(message = '', tone = '') {
  if (!els.pageFeedback) return;
  els.pageFeedback.textContent = message || '';
  els.pageFeedback.className = 'feedback-line';
  if (tone) els.pageFeedback.classList.add(tone);
}

function canEdit() {
  return Boolean(state.session);
}

function formatDateForInput(value) {
  const parts = parseDateInputParts(value);
  if (!parts) return '';
  return `${parts.month}/${parts.day}/${parts.year}`;
}

function parseDateInputParts(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (isValidYMD(year, month, day)) return { year, month, day };
    return null;
  }
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = Number(match[3]);
    if (String(match[3]).length === 2) year += year >= 70 ? 1900 : 2000;
    if (isValidYMD(year, month, day)) return { year, month, day };
    return null;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    if (isValidYMD(year, month, day)) return { year, month, day };
  }
  return null;
}

function isValidYMD(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const test = new Date(Date.UTC(year, month - 1, day));
  return test.getUTCFullYear() === year && test.getUTCMonth() === month - 1 && test.getUTCDate() === day;
}

function normalizeDateForDb(value) {
  const parts = parseDateInputParts(value);
  if (!parts) return null;
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

function toIntegerOrNull(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
}

function sortRows(rows) {
  return [...rows].sort((a, b) => normalizeLower(a.series_title).localeCompare(normalizeLower(b.series_title)));
}

function getWriteErrorMessage(error) {
  const lowered = normalizeLower(error?.message || '');
  if (lowered.includes('row-level security')) {
    return 'Supabase blocked the write. Run the updated sql/monthly-media-and-holidays.sql so the monthly media table has write policies.';
  }
  return error?.message || 'Supabase write failed.';
}

function setFormEnabled(enabled) {
  els.addForm?.querySelectorAll('input, button').forEach((field) => {
    if (field === els.clearFormBtn) return;
    field.disabled = !enabled;
  });
}

function updateAuthUi() {
  const editing = canEdit();
  els.loginGitHubBtn?.classList.toggle('hidden', editing);
  els.logoutBtn?.classList.toggle('hidden', !editing);
  if (els.authStateText) {
    els.authStateText.textContent = editing
      ? 'Signed in. Add rows up top, then just edit inline below. Changes auto-save.'
      : 'Read-only. Sign in with GitHub to add, edit, or delete rows.';
  }
  setFormEnabled(editing);
  renderRows();
}

function clearProgressClasses(rowNode) {
  if (!rowNode) return;
  rowNode.querySelectorAll('.progress-fill').forEach((node) => node.classList.remove('progress-fill'));
  rowNode.classList.remove('progress-touch');
}

function applyTransientProgress(rowNode, triggerName = '') {
  if (!rowNode) return;
  clearProgressClasses(rowNode);
  rowNode.classList.add('progress-touch');
  const cells = Array.from(rowNode.children);
  const values = {
    series_title: normalizeText(rowNode.querySelector('[name="series_title"]')?.value),
    last_scheduled_date: normalizeText(rowNode.querySelector('[name="last_scheduled_date"]')?.value),
    record_time: normalizeText(rowNode.querySelector('[name="record_time"]')?.value),
    record_source: normalizeText(rowNode.querySelector('[name="record_source"]')?.value),
    last_episode_scheduled: normalizeText(rowNode.querySelector('[name="last_episode_scheduled"]')?.value),
    notes: normalizeText(rowNode.querySelector('[name="notes"]')?.value)
  };
  const order = ['series_title', 'record_time', 'record_source', 'last_scheduled_date', 'last_episode_scheduled', 'notes'];
  let upto = order.indexOf(triggerName);
  if (upto < 0) upto = 0;
  order.forEach((name, index) => {
    if (values[name]) upto = Math.max(upto, index);
  });
  if (values.last_episode_scheduled) upto = cells.length - 1;
  for (let i = 0; i <= upto && i < cells.length; i += 1) {
    cells[i].classList.add('progress-fill');
  }
}

function setRowState(tr, message = '', tone = '') {
  if (!tr) return;
  const node = tr.querySelector('[data-role="row-state"]');
  if (!node) return;
  node.textContent = message;
  node.className = 'row-state';
  if (tone) node.classList.add(tone);
}

function buildRowMarkup(row) {
  const editing = canEdit();
  const lockAttr = editing ? '' : 'disabled';
  return `
    <div class="media-row" data-row-id="${row.id}">
      <div class="media-cell"><input name="series_title" type="text" value="${escapeHtml(row.series_title || '')}" ${lockAttr} /></div>
      <div class="media-cell"><input name="record_time" type="text" value="${escapeHtml(row.record_time || '')}" ${lockAttr} /></div>
      <div class="media-cell"><input name="record_source" type="text" value="${escapeHtml(row.record_source || '')}" ${lockAttr} /></div>
      <div class="media-cell"><input name="last_scheduled_date" type="text" value="${escapeHtml(formatDateForInput(row.last_scheduled_date))}" placeholder="M/D/YYYY" ${lockAttr} /></div>
      <div class="media-cell"><input name="last_episode_scheduled" type="number" step="1" value="${escapeHtml(row.last_episode_scheduled ?? '')}" ${lockAttr} /></div>
      <div class="media-cell"><input name="notes" type="text" value="${escapeHtml(row.notes || '')}" ${lockAttr} /></div>
      <div class="row-actions">
        <span class="row-state" data-role="row-state"></span>
        ${editing ? '<button type="button" class="danger" data-action="delete">Delete</button>' : ''}
      </div>
    </div>
  `;
}

function renderRows() {
  const rows = sortRows(state.rows);
  if (els.mediaTableBody) {
    els.mediaTableBody.innerHTML = rows.map(buildRowMarkup).join('');
  }
  if (els.listSummary) {
    els.listSummary.textContent = `${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'} loaded.`;
  }
  els.emptyState?.classList.toggle('hidden', rows.length > 0);
}

async function loadRows() {
  setStatus('Loading monthly media list…');
  setFeedback('Loading rows…', 'info');
  const { data, error } = await state.supabase
    .from(MONTHLY_MEDIA_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('series_title', { ascending: true });
  if (error) throw error;
  state.rows = (data || []).map((row) => ({ ...row }));
  renderRows();
  setFeedback('', '');
  setStatus(`Loaded ${state.rows.length.toLocaleString()} monthly media rows.`);
}

function collectAddPayload() {
  const form = els.addForm;
  return {
    series_title: normalizeText(form.elements.series_title.value),
    last_scheduled_date: normalizeDateForDb(form.elements.last_scheduled_date.value),
    record_time: normalizeText(form.elements.record_time.value) || null,
    record_source: normalizeText(form.elements.record_source.value) || null,
    last_episode_scheduled: toIntegerOrNull(form.elements.last_episode_scheduled.value),
    notes: normalizeText(form.elements.notes.value) || null,
    is_active: true,
    updated_at: new Date().toISOString()
  };
}

function clearAddForm() {
  els.addForm?.reset();
}

async function createRow(event) {
  event.preventDefault();
  if (!canEdit()) {
    setFeedback('Sign in with GitHub to add rows.', 'warn');
    return;
  }
  const payload = collectAddPayload();
  if (!payload.series_title) {
    setFeedback('Series title is required.', 'warn');
    els.addForm?.elements?.series_title?.focus();
    return;
  }
  els.addRowBtn.disabled = true;
  setFeedback('Adding row…', 'info');
  setStatus('Adding row…');
  try {
    const { data, error } = await state.supabase
      .from(MONTHLY_MEDIA_TABLE)
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    state.rows.push(data);
    state.rows = sortRows(state.rows);
    renderRows();
    clearAddForm();
    els.addForm?.elements?.series_title?.focus();
    setFeedback(`Added ${payload.series_title}.`, 'success');
    setStatus(`Added ${payload.series_title}.`);
  } catch (error) {
    console.error(error);
    const message = getWriteErrorMessage(error);
    setFeedback(message, 'error');
    setStatus(message);
  } finally {
    els.addRowBtn.disabled = !canEdit();
  }
}

function collectRowPayload(rowNode) {
  return {
    series_title: normalizeText(rowNode.querySelector('[name="series_title"]')?.value),
    last_scheduled_date: normalizeDateForDb(rowNode.querySelector('[name="last_scheduled_date"]')?.value),
    record_time: normalizeText(rowNode.querySelector('[name="record_time"]')?.value) || null,
    record_source: normalizeText(rowNode.querySelector('[name="record_source"]')?.value) || null,
    last_episode_scheduled: toIntegerOrNull(rowNode.querySelector('[name="last_episode_scheduled"]')?.value),
    notes: normalizeText(rowNode.querySelector('[name="notes"]')?.value) || null,
    updated_at: new Date().toISOString()
  };
}

function cancelQueuedSave(id) {
  const existing = state.saveTimers.get(String(id));
  if (existing) {
    window.clearTimeout(existing);
    state.saveTimers.delete(String(id));
  }
}

async function persistRow(id, rowNode) {
  if (!canEdit() || !rowNode) return;
  cancelQueuedSave(id);
  const payload = collectRowPayload(rowNode);
  if (!payload.series_title) {
    setRowState(rowNode, 'Need title', 'error');
    rowNode.classList.add('save-error');
    return;
  }
  rowNode.classList.remove('save-error');
  rowNode.classList.add('is-saving');
  setRowState(rowNode, 'Saving…');
  try {
    const { data, error } = await state.supabase
      .from(MONTHLY_MEDIA_TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const idx = state.rows.findIndex((row) => String(row.id) === String(id));
    if (idx >= 0) state.rows[idx] = { ...state.rows[idx], ...data };
    const dateInput = rowNode.querySelector('[name="last_scheduled_date"]');
    if (dateInput) dateInput.value = formatDateForInput(data?.last_scheduled_date || payload.last_scheduled_date);
    rowNode.classList.remove('is-saving');
    setRowState(rowNode, 'Saved', 'success');
    window.setTimeout(() => {
      if (rowNode.isConnected) setRowState(rowNode, '');
    }, 1200);
    setStatus(`Saved ${payload.series_title}.`);
  } catch (error) {
    console.error(error);
    rowNode.classList.remove('is-saving');
    rowNode.classList.add('save-error');
    setRowState(rowNode, 'Error', 'error');
    const message = getWriteErrorMessage(error);
    setFeedback(message, 'error');
    setStatus(message);
  }
}

function queueRowSave(id, rowNode, delay = ROW_AUTOSAVE_DELAY_MS) {
  if (!canEdit() || !rowNode) return;
  cancelQueuedSave(id);
  const timer = window.setTimeout(() => {
    state.saveTimers.delete(String(id));
    void persistRow(id, rowNode);
  }, delay);
  state.saveTimers.set(String(id), timer);
  rowNode.classList.remove('save-error');
  rowNode.classList.add('is-saving');
  setRowState(rowNode, `Waiting ${Math.ceil(delay / 1000)}s`);
}


async function deleteRow(id, rowNode) {
  const existing = state.rows.find((row) => String(row.id) === String(id));
  const label = existing?.series_title || 'this row';
  if (!window.confirm(`Delete ${label}?`)) return;
  cancelQueuedSave(id);
  setRowState(rowNode, 'Deleting…');
  setStatus(`Deleting ${label}…`);
  try {
    const { error } = await state.supabase
      .from(MONTHLY_MEDIA_TABLE)
      .delete()
      .eq('id', id);
    if (error) throw error;
    state.rows = state.rows.filter((row) => String(row.id) !== String(id));
    renderRows();
    setFeedback(`Deleted ${label}.`, 'success');
    setStatus(`Deleted ${label}.`);
  } catch (error) {
    console.error(error);
    const message = getWriteErrorMessage(error);
    setFeedback(message, 'error');
    setStatus(message);
    setRowState(rowNode, 'Error', 'error');
  }
}

function focusNextRowStart(currentRowNode) {
  if (!currentRowNode) return;
  const rows = Array.from(els.mediaTableBody?.querySelectorAll('[data-row-id]') || []);
  const idx = rows.indexOf(currentRowNode);
  const nextRow = idx >= 0 ? rows[idx + 1] : null;
  if (nextRow) {
    nextRow.querySelector('[name="series_title"]')?.focus();
    nextRow.querySelector('[name="series_title"]')?.select?.();
    return;
  }
  els.addForm?.elements?.series_title?.focus();
  els.addForm?.elements?.series_title?.select?.();
}

function submitAddFormFromEntryField() {
  if (!canEdit()) return;
  if (typeof els.addForm?.requestSubmit === 'function') {
    els.addForm.requestSubmit();
  } else {
    els.addForm?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }
}

function bindEvents() {
  els.loginGitHubBtn?.addEventListener('click', async () => {
    setFeedback('Sending you to GitHub…', 'info');
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.href.split('#')[0] }
    });
    if (error) {
      setFeedback(error.message, 'error');
      setStatus(error.message);
    }
  });

  els.logoutBtn?.addEventListener('click', async () => {
    await state.supabase.auth.signOut();
    state.session = null;
    updateAuthUi();
    setStatus('Signed out. Read-only mode is active.');
  });

  els.addForm?.addEventListener('submit', createRow);
  els.clearFormBtn?.addEventListener('click', clearAddForm);

  els.addForm?.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (event.key !== 'Enter') return;
    if (!['last_episode_scheduled', 'notes'].includes(target.name)) return;
    event.preventDefault();
    submitAddFormFromEntryField();
  });

  els.mediaTableBody?.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (event.key !== 'Enter') return;
    if (!['last_episode_scheduled', 'notes'].includes(target.name)) return;
    const rowNode = target.closest('[data-row-id]');
    const id = rowNode?.dataset?.rowId;
    if (!id || !rowNode || !canEdit()) return;
    event.preventDefault();
    applyTransientProgress(rowNode, target.name);
    queueRowSave(id, rowNode, ROW_AUTOSAVE_DELAY_MS);
    focusNextRowStart(rowNode);
  });

  els.mediaTableBody?.addEventListener('input', (event) => {
    const rowNode = event.target.closest('[data-row-id]');
    const id = rowNode?.dataset?.rowId;
    if (!id || !rowNode || !canEdit()) return;
    applyTransientProgress(rowNode, event.target.name);
    queueRowSave(id, rowNode, ROW_AUTOSAVE_DELAY_MS);
  });

  els.mediaTableBody?.addEventListener('change', (event) => {
    const rowNode = event.target.closest('[data-row-id]');
    const id = rowNode?.dataset?.rowId;
    if (!id || !rowNode || !canEdit()) return;
    applyTransientProgress(rowNode, event.target.name);
    queueRowSave(id, rowNode, ROW_AUTOSAVE_DELAY_MS);
  });

  els.mediaTableBody?.addEventListener('focusout', (event) => {
    const rowNode = event.target.closest('[data-row-id]');
    const id = rowNode?.dataset?.rowId;
    if (!id || !rowNode || !canEdit()) return;
    applyTransientProgress(rowNode, event.target.name);
    const nextTarget = event.relatedTarget;
    if (nextTarget && rowNode.contains(nextTarget)) return;
    queueRowSave(id, rowNode, ROW_AUTOSAVE_DELAY_MS);
  });

  els.mediaTableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (!button || !canEdit()) return;
    const rowNode = button.closest('[data-row-id]');
    const id = rowNode?.dataset?.rowId;
    if (!id || !rowNode) return;
    void deleteRow(id, rowNode);
  });
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
  setStatus('Checking sign-in…');

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  updateAuthUi();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateAuthUi();
  });

  try {
    await loadRows();
  } catch (error) {
    console.error(error);
    const lowered = normalizeLower(error?.message);
    const message = lowered.includes('monthly_media_schedule')
      ? 'The monthly media table is missing. Run sql/monthly-media-and-holidays.sql first.'
      : error.message;
    setFeedback(message, 'error');
    setStatus(message);
  }
}

void init();
