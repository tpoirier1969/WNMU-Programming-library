const config = window.APP_CONFIG || {};

const state = {
  supabase: null,
  session: null,
  rows: [],
  filteredRows: []
};

const els = {
  setupNotice: document.getElementById('setupNotice'),
  pageShell: document.getElementById('pageShell'),
  statusLine: document.getElementById('statusLine'),
  loginGitHubBtn: document.getElementById('loginGitHubBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authStateText: document.getElementById('authStateText'),
  pageFeedback: document.getElementById('pageFeedback'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  refreshBtn: document.getElementById('refreshBtn'),
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
  return (value ?? '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

function setFeedback(message = '', tone = '') {
  if (!els.pageFeedback) return;
  els.pageFeedback.textContent = message || '';
  els.pageFeedback.className = `feedback-line ${tone}`.trim();
}

function formatDateForInput(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  const iso = formatDateForInput(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}/${year}`;
}

function toIntegerOrNull(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
}

function setFormEnabled(enabled) {
  els.addForm?.querySelectorAll('input, textarea, button').forEach((field) => {
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
      ? 'Signed in. You can add, update, and delete rows here.'
      : 'Read-only. Sign in with GitHub to change this list.';
  }
  setFormEnabled(editing);
  renderRows();
}

function getFilteredRows() {
  const search = normalizeLower(els.searchInput?.value);
  const mode = normalizeLower(els.statusFilter?.value || 'active');
  return state.rows.filter((row) => {
    const active = row.is_active !== false;
    if (mode === 'active' && !active) return false;
    if (mode === 'inactive' && active) return false;
    if (!search) return true;
    const haystack = [
      row.series_title,
      row.record_source,
      row.record_time,
      row.schedule_pattern,
      row.notes,
      row.last_episode_scheduled,
      row.last_scheduled_date
    ].map(normalizeLower).join(' ');
    return haystack.includes(search);
  });
}

function buildRowMarkup(row) {
  const editing = canEdit();
  const active = row.is_active !== false;
  const lockAttr = editing ? '' : 'disabled';
  return `
    <tr data-row-id="${row.id}">
      <td><input name="series_title" type="text" value="${escapeHtml(row.series_title || '')}" ${lockAttr} /></td>
      <td><input name="last_scheduled_date" type="date" value="${escapeHtml(formatDateForInput(row.last_scheduled_date))}" ${lockAttr} /></td>
      <td><input name="record_time" type="text" value="${escapeHtml(row.record_time || '')}" ${lockAttr} /></td>
      <td><input name="record_source" type="text" value="${escapeHtml(row.record_source || '')}" ${lockAttr} /></td>
      <td><input name="schedule_pattern" type="text" value="${escapeHtml(row.schedule_pattern || '')}" ${lockAttr} /></td>
      <td><input name="last_episode_scheduled" type="number" step="1" value="${escapeHtml(row.last_episode_scheduled ?? '')}" ${lockAttr} /></td>
      <td><textarea name="notes" rows="2" ${lockAttr}>${escapeHtml(row.notes || '')}</textarea></td>
      <td>
        <label style="display:flex; flex-direction:column; gap:8px; align-items:flex-start;">
          <span class="row-status-pill ${active ? '' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span>
          <input name="is_active" type="checkbox" ${active ? 'checked' : ''} ${lockAttr} />
        </label>
      </td>
      <td>
        <div class="row-actions">
          ${editing ? '<button type="button" data-action="save">Save</button>' : ''}
          ${editing ? '<button type="button" class="danger" data-action="delete">Delete</button>' : ''}
        </div>
      </td>
    </tr>
  `;
}

function renderRows() {
  state.filteredRows = getFilteredRows();
  if (els.mediaTableBody) {
    els.mediaTableBody.innerHTML = state.filteredRows.map(buildRowMarkup).join('');
  }
  if (els.listSummary) {
    const total = state.rows.length;
    const shown = state.filteredRows.length;
    const activeCount = state.rows.filter((row) => row.is_active !== false).length;
    els.listSummary.textContent = `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} rows (${activeCount.toLocaleString()} active).`;
  }
  els.emptyState?.classList.toggle('hidden', state.filteredRows.length > 0);
}

async function loadRows() {
  setStatus('Loading monthly media list…');
  setFeedback('Loading rows…', 'info');
  const { data, error } = await state.supabase
    .from('monthly_media_schedule')
    .select('*')
    .order('is_active', { ascending: false })
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
    last_scheduled_date: normalizeText(form.elements.last_scheduled_date.value) || null,
    record_time: normalizeText(form.elements.record_time.value) || null,
    record_source: normalizeText(form.elements.record_source.value) || null,
    schedule_pattern: normalizeText(form.elements.schedule_pattern.value) || null,
    last_episode_scheduled: toIntegerOrNull(form.elements.last_episode_scheduled.value),
    notes: normalizeText(form.elements.notes.value) || null,
    is_active: Boolean(form.elements.is_active.checked),
    updated_at: new Date().toISOString()
  };
}

function clearAddForm() {
  els.addForm?.reset();
  if (els.addForm?.elements?.is_active) els.addForm.elements.is_active.checked = true;
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
  setFeedback('Saving new row…', 'info');
  setStatus('Saving new row…');
  try {
    const { data, error } = await state.supabase
      .from('monthly_media_schedule')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    state.rows.unshift(data);
    state.rows.sort((a, b) => normalizeLower(a.series_title).localeCompare(normalizeLower(b.series_title)));
    renderRows();
    clearAddForm();
    setFeedback(`Added ${payload.series_title}.`, 'success');
    setStatus(`Added ${payload.series_title}.`);
  } catch (error) {
    console.error(error);
    setFeedback(error.message, 'error');
    setStatus(error.message);
  } finally {
    els.addRowBtn.disabled = !canEdit();
  }
}

function collectRowPayload(tr) {
  return {
    series_title: normalizeText(tr.querySelector('[name="series_title"]')?.value),
    last_scheduled_date: normalizeText(tr.querySelector('[name="last_scheduled_date"]')?.value) || null,
    record_time: normalizeText(tr.querySelector('[name="record_time"]')?.value) || null,
    record_source: normalizeText(tr.querySelector('[name="record_source"]')?.value) || null,
    schedule_pattern: normalizeText(tr.querySelector('[name="schedule_pattern"]')?.value) || null,
    last_episode_scheduled: toIntegerOrNull(tr.querySelector('[name="last_episode_scheduled"]')?.value),
    notes: normalizeText(tr.querySelector('[name="notes"]')?.value) || null,
    is_active: Boolean(tr.querySelector('[name="is_active"]')?.checked),
    updated_at: new Date().toISOString()
  };
}

async function saveRow(id, tr) {
  const payload = collectRowPayload(tr);
  if (!payload.series_title) {
    setFeedback('Series title cannot be blank.', 'warn');
    tr.querySelector('[name="series_title"]')?.focus();
    return;
  }
  setFeedback(`Saving ${payload.series_title}…`, 'info');
  setStatus(`Saving ${payload.series_title}…`);
  try {
    const { data, error } = await state.supabase
      .from('monthly_media_schedule')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const idx = state.rows.findIndex((row) => String(row.id) === String(id));
    if (idx >= 0) state.rows[idx] = data;
    renderRows();
    setFeedback(`Saved ${payload.series_title}.`, 'success');
    setStatus(`Saved ${payload.series_title}.`);
  } catch (error) {
    console.error(error);
    setFeedback(error.message, 'error');
    setStatus(error.message);
  }
}

async function deleteRow(id) {
  const existing = state.rows.find((row) => String(row.id) === String(id));
  const label = existing?.series_title || 'this row';
  if (!window.confirm(`Delete ${label}?`)) return;
  setFeedback(`Deleting ${label}…`, 'info');
  setStatus(`Deleting ${label}…`);
  try {
    const { error } = await state.supabase
      .from('monthly_media_schedule')
      .delete()
      .eq('id', id);
    if (error) throw error;
    state.rows = state.rows.filter((row) => String(row.id) !== String(id));
    renderRows();
    setFeedback(`Deleted ${label}.`, 'success');
    setStatus(`Deleted ${label}.`);
  } catch (error) {
    console.error(error);
    setFeedback(error.message, 'error');
    setStatus(error.message);
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

  els.refreshBtn?.addEventListener('click', () => {
    void loadRows().catch((error) => {
      console.error(error);
      setFeedback(error.message, 'error');
      setStatus(error.message);
    });
  });

  els.searchInput?.addEventListener('input', renderRows);
  els.statusFilter?.addEventListener('change', renderRows);
  els.addForm?.addEventListener('submit', createRow);
  els.clearFormBtn?.addEventListener('click', clearAddForm);

  els.mediaTableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !canEdit()) return;
    const tr = event.target.closest('tr[data-row-id]');
    const id = tr?.dataset?.rowId;
    if (!id || !tr) return;
    const action = button.dataset.action;
    if (action === 'save') void saveRow(id, tr);
    if (action === 'delete') void deleteRow(id);
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
    const message = normalizeLower(error?.message).includes('monthly_media_schedule')
      ? 'The monthly media table is missing. Run sql/monthly-media-and-holidays.sql first.'
      : error.message;
    setFeedback(message, 'error');
    setStatus(message);
  }
}

void init();
