const config = window.APP_CONFIG || {};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BUILT_IN_OBSERVANCES = Object.freeze([
  { title: "New Year's Day", rule_type: 'fixed_date', month: 1, day: 1, category: 'date' },
  { title: 'Science Fiction Day', rule_type: 'fixed_date', month: 1, day: 2, category: 'date' },
  { title: 'Technology Day', rule_type: 'fixed_date', month: 1, day: 6, category: 'date' },
  { title: 'Epiphany', rule_type: 'fixed_date', month: 1, day: 6, category: 'date' },
  { title: 'Human Trafficking Awareness Day', rule_type: 'fixed_date', month: 1, day: 11, category: 'date' },
  { title: 'Religious Freedom Day', rule_type: 'fixed_date', month: 1, day: 16, category: 'date' },
  { title: 'Martin Luther King Jr. Day', rule_type: 'nth_weekday', month: 1, nth: 3, weekday: 1, category: 'date' },
  { title: 'National Mentoring Month', rule_type: 'month_scope', month: 1, category: 'month' },
  { title: 'Slavery and Human Trafficking Prevention Month', rule_type: 'month_scope', month: 1, category: 'month' },

  { title: 'Groundhog Day', rule_type: 'fixed_date', month: 2, day: 2, category: 'date' },
  { title: 'World Wetlands Day', rule_type: 'fixed_date', month: 2, day: 2, category: 'date' },
  { title: 'World Cancer Day', rule_type: 'fixed_date', month: 2, day: 4, category: 'date' },
  { title: 'Sami National Day', rule_type: 'fixed_date', month: 2, day: 6, category: 'date' },
  { title: 'Safer Internet Day', rule_type: 'nth_weekday', month: 2, nth: 2, weekday: 2, category: 'date', notes: '2nd Tuesday in February' },
  { title: 'World Day of the Sick', rule_type: 'fixed_date', month: 2, day: 11, category: 'date' },
  { title: 'Women & Girls in Science Day', rule_type: 'fixed_date', month: 2, day: 11, category: 'date' },
  { title: 'Valentine\'s Day', rule_type: 'fixed_date', month: 2, day: 14, category: 'date' },
  { title: "Presidents' Day", rule_type: 'nth_weekday', month: 2, nth: 3, weekday: 1, category: 'date' },
  { title: 'Random Acts of Kindness Day', rule_type: 'fixed_date', month: 2, day: 17, category: 'date' },
  { title: 'World Day of Social Justice', rule_type: 'fixed_date', month: 2, day: 20, category: 'date' },
  { title: 'American Heart Month', rule_type: 'month_scope', month: 2, category: 'month' },
  { title: 'Black History Month', rule_type: 'month_scope', month: 2, category: 'month' },
  { title: 'Bird-Feeding Month', rule_type: 'month_scope', month: 2, category: 'month' },

  { title: 'Employee Appreciation Day', rule_type: 'nth_weekday', month: 3, nth: 1, weekday: 5, category: 'date' },
  { title: 'World Wildlife Day', rule_type: 'fixed_date', month: 3, day: 3, category: 'date' },
  { title: 'International Women\'s Day', rule_type: 'fixed_date', month: 3, day: 8, category: 'date' },
  { title: 'St. Urho Day', rule_type: 'fixed_date', month: 3, day: 16, category: 'date' },
  { title: "St. Patrick's Day", rule_type: 'fixed_date', month: 3, day: 17, category: 'date' },
  { title: 'World Poetry Day', rule_type: 'fixed_date', month: 3, day: 21, category: 'date' },
  { title: 'World Down Syndrome Day', rule_type: 'fixed_date', month: 3, day: 21, category: 'date' },
  { title: 'International Day of Forests', rule_type: 'fixed_date', month: 3, day: 21, category: 'date' },
  { title: 'World Water Day', rule_type: 'fixed_date', month: 3, day: 22, category: 'date' },
  { title: 'Women\'s History Month', rule_type: 'month_scope', month: 3, category: 'month' },

  { title: 'Earth Day', rule_type: 'fixed_date', month: 4, day: 22, category: 'date' },
  { title: 'Arbor Day', rule_type: 'last_weekday', month: 4, weekday: 5, category: 'date' },

  { title: 'Mother\'s Day', rule_type: 'nth_weekday', month: 5, nth: 2, weekday: 0, category: 'date' },
  { title: 'Memorial Day', rule_type: 'last_weekday', month: 5, weekday: 1, category: 'date' },

  { title: 'Juneteenth', rule_type: 'fixed_date', month: 6, day: 19, category: 'date' },
  { title: 'Father\'s Day', rule_type: 'nth_weekday', month: 6, nth: 3, weekday: 0, category: 'date' },

  { title: 'Independence Day', rule_type: 'fixed_date', month: 7, day: 4, category: 'date' },

  { title: 'Labor Day', rule_type: 'nth_weekday', month: 9, nth: 1, weekday: 1, category: 'date' },

  { title: 'Halloween', rule_type: 'fixed_date', month: 10, day: 31, category: 'date' },

  { title: 'Veterans Day', rule_type: 'fixed_date', month: 11, day: 11, category: 'date' },
  { title: 'Thanksgiving', rule_type: 'nth_weekday', month: 11, nth: 4, weekday: 4, category: 'date' },
  { title: 'Native American Heritage Month', rule_type: 'month_scope', month: 11, category: 'month' },

  { title: 'Christmas Eve', rule_type: 'fixed_date', month: 12, day: 24, category: 'date' },
  { title: 'Christmas Day', rule_type: 'fixed_date', month: 12, day: 25, category: 'date' },
  { title: 'New Year\'s Eve', rule_type: 'fixed_date', month: 12, day: 31, category: 'date' }
]);

const HOLIDAY_OBSERVANCES_TABLE = 'holiday_observances';

const state = {
  supabase: null,
  session: null,
  customObservances: [],
  selectedYear: new Date().getFullYear(),
  editingId: null
};

const els = {
  setupNotice: document.getElementById('setupNotice'),
  pageShell: document.getElementById('pageShell'),
  statusLine: document.getElementById('statusLine'),
  loginGitHubBtn: document.getElementById('loginGitHubBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authStateText: document.getElementById('authStateText'),
  pageFeedback: document.getElementById('pageFeedback'),
  yearSelect: document.getElementById('yearSelect'),
  refreshBtn: document.getElementById('refreshBtn'),
  monthsGrid: document.getElementById('monthsGrid'),
  customForm: document.getElementById('customForm'),
  saveCustomBtn: document.getElementById('saveCustomBtn'),
  resetCustomBtn: document.getElementById('resetCustomBtn'),
  customList: document.getElementById('customList'),
  ruleTypeSelect: document.getElementById('ruleTypeSelect'),
  monthSelect: document.getElementById('monthSelect'),
  ruleMonthSelect: document.getElementById('ruleMonthSelect'),
  startMonthSelect: document.getElementById('startMonthSelect'),
  endMonthSelect: document.getElementById('endMonthSelect'),
  weekdaySelect: document.getElementById('weekdaySelect')
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

function getWriteErrorMessage(error, fallbackTableName) {
  const lowered = normalizeLower(error?.message || '');
  if (lowered.includes('row-level security')) {
    return `Supabase blocked the write. Run sql/monthly-media-and-holidays.sql so ${fallbackTableName} has write policies.`;
  }
  return error?.message || 'Supabase write failed.';
}

function fillSelect(select, values, labeler) {
  if (!select) return;
  const existing = normalizeText(select.value);
  select.innerHTML = values.map((value) => `<option value="${value}">${escapeHtml(labeler ? labeler(value) : value)}</option>`).join('');
  if (existing) select.value = existing;
}

function populateStaticSelects() {
  const years = [];
  for (let year = state.selectedYear - 2; year <= state.selectedYear + 5; year += 1) years.push(year);
  fillSelect(els.yearSelect, years, (value) => String(value));
  els.yearSelect.value = String(state.selectedYear);
  fillSelect(els.monthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.ruleMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.startMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.endMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.weekdaySelect, WEEKDAY_NAMES.map((_, idx) => idx), (value) => WEEKDAY_NAMES[value]);
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + ((nth - 1) * 7);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1) return null;
  return candidate;
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - offset);
}

function monthDayText(month, day) {
  return `${MONTH_NAMES[month - 1]} ${Number(day)}`;
}

function formatEventDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function summarizeRule(item) {
  switch (item.rule_type) {
    case 'fixed_date': return `${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]} ${item.day}`;
    case 'nth_weekday': return `${ordinalLabel(item.nth)} ${WEEKDAY_NAMES[item.weekday]} in ${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]}`;
    case 'last_weekday': return `Last ${WEEKDAY_NAMES[item.weekday]} in ${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]}`;
    case 'month_scope': return `${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]} (month-long)`;
    case 'date_range_fixed': return `${monthDayText(item.start_month, item.start_day)}–${monthDayText(item.end_month, item.end_day)}`;
    case 'manual_text': return item.manual_date_text || 'Manual date text';
    default: return item.rule_type || '';
  }
}

function ordinalLabel(value) {
  const numeric = Number(value);
  if (numeric === 1) return '1st';
  if (numeric === 2) return '2nd';
  if (numeric === 3) return '3rd';
  return `${numeric}th`;
}

function computeOccurrence(item, year) {
  const ruleMonth = Number(item.rule_month || item.month || 0);
  switch (item.rule_type) {
    case 'fixed_date': {
      const month = ruleMonth;
      const date = new Date(year, month - 1, Number(item.day));
      if (date.getMonth() !== month - 1) return null;
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'nth_weekday': {
      const month = ruleMonth;
      const date = nthWeekdayOfMonth(year, month, Number(item.weekday), Number(item.nth));
      if (!date) return null;
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'last_weekday': {
      const month = ruleMonth;
      const date = lastWeekdayOfMonth(year, month, Number(item.weekday));
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'month_scope': {
      const month = ruleMonth;
      return { month, dateText: 'All month', sortDay: 0, monthScope: true };
    }
    case 'date_range_fixed': {
      const month = Number(item.month || item.start_month || 0);
      return {
        month,
        dateText: `${monthDayText(Number(item.start_month), Number(item.start_day))}–${monthDayText(Number(item.end_month), Number(item.end_day))}`,
        sortDay: Number(item.start_day || 0)
      };
    }
    case 'manual_text': {
      const month = Number(item.month || 0);
      return { month, dateText: normalizeText(item.manual_date_text) || 'Custom date', sortDay: 99 };
    }
    default:
      return null;
  }
}

function buildMonthBuckets(year) {
  const buckets = Array.from({ length: 12 }, () => ({ monthItems: [], datedItems: [] }));
  const combined = [...BUILT_IN_OBSERVANCES, ...state.customObservances.filter((item) => item.is_active !== false)];
  combined.forEach((item) => {
    const occurrence = computeOccurrence(item, year);
    if (!occurrence || !occurrence.month || occurrence.month < 1 || occurrence.month > 12) return;
    const target = buckets[occurrence.month - 1];
    const entry = {
      title: item.title,
      note: item.notes || '',
      dateText: occurrence.dateText,
      sortDay: occurrence.sortDay,
      builtIn: !item.id
    };
    if (occurrence.monthScope) target.monthItems.push(entry);
    else target.datedItems.push(entry);
  });
  buckets.forEach((bucket) => {
    bucket.monthItems.sort((a, b) => normalizeLower(a.title).localeCompare(normalizeLower(b.title)));
    bucket.datedItems.sort((a, b) => (a.sortDay - b.sortDay) || normalizeLower(a.title).localeCompare(normalizeLower(b.title)));
  });
  return buckets;
}

function renderCalendar() {
  const buckets = buildMonthBuckets(state.selectedYear);
  els.monthsGrid.innerHTML = buckets.map((bucket, idx) => `
    <section class="month-card">
      <div class="month-head"><h3>${MONTH_NAMES[idx]} ${state.selectedYear}</h3></div>
      <div class="month-body">
        <div>
          <div class="section-label">Month-long observances</div>
          ${bucket.monthItems.length ? `<div class="chip-list">${bucket.monthItems.map((item) => `<span class="month-chip">${escapeHtml(item.title)}</span>`).join('')}</div>` : '<div class="muted-empty">Nothing loaded for the whole month.</div>'}
        </div>
        <div>
          <div class="section-label">Dated events</div>
          ${bucket.datedItems.length ? `<div class="month-event-list">${bucket.datedItems.map((item) => `
            <div class="month-event">
              <div class="event-date">${escapeHtml(item.dateText)}</div>
              <div>
                <div class="event-title">${escapeHtml(item.title)}</div>
                ${item.note ? `<div class="event-note">${escapeHtml(item.note)}</div>` : ''}
              </div>
            </div>`).join('')}</div>` : '<div class="muted-empty">No dated entries for this month.</div>'}
        </div>
      </div>
    </section>`).join('');
}

function updateAuthUi() {
  const editing = canEdit();
  els.loginGitHubBtn?.classList.toggle('hidden', editing);
  els.logoutBtn?.classList.toggle('hidden', !editing);
  if (els.authStateText) {
    els.authStateText.textContent = editing
      ? 'Signed in. You can add, edit, and delete custom observances.'
      : 'Read-only. Sign in with GitHub to change the custom list.';
  }
  els.customForm?.querySelectorAll('input, select, textarea, button').forEach((field) => {
    if (field === els.resetCustomBtn) return;
    field.disabled = !editing;
  });
  renderCustomList();
}

function collectCustomPayload() {
  const form = els.customForm;
  const ruleType = normalizeText(form.elements.rule_type.value);
  const base = {
    title: normalizeText(form.elements.title.value),
    rule_type: ruleType,
    month: Number(form.elements.month.value || 0) || null,
    rule_month: Number(form.elements.rule_month.value || 0) || null,
    day: Number(form.elements.day.value || 0) || null,
    nth: Number(form.elements.nth.value || 0) || null,
    weekday: normalizeText(form.elements.weekday.value) === '' ? null : Number(form.elements.weekday.value),
    start_month: Number(form.elements.start_month.value || 0) || null,
    start_day: Number(form.elements.start_day.value || 0) || null,
    end_month: Number(form.elements.end_month.value || 0) || null,
    end_day: Number(form.elements.end_day.value || 0) || null,
    manual_date_text: normalizeText(form.elements.manual_date_text.value) || null,
    notes: normalizeText(form.elements.notes.value) || null,
    is_active: Boolean(form.elements.is_active.checked),
    updated_at: new Date().toISOString()
  };
  if (ruleType === 'fixed_date') {
    base.rule_month = base.rule_month || base.month;
  }
  return base;
}

function validateCustomPayload(payload) {
  if (!payload.title) return 'Title is required.';
  switch (payload.rule_type) {
    case 'fixed_date':
      if (!payload.rule_month || !payload.day) return 'Fixed date needs a month and day.';
      break;
    case 'nth_weekday':
      if (!payload.rule_month || !payload.nth || payload.weekday == null) return 'Nth weekday needs month, nth value, and weekday.';
      break;
    case 'last_weekday':
      if (!payload.rule_month || payload.weekday == null) return 'Last weekday needs month and weekday.';
      break;
    case 'month_scope':
      if (!payload.rule_month) return 'Month-long observance needs a month.';
      break;
    case 'date_range_fixed':
      if (!payload.start_month || !payload.start_day || !payload.end_month || !payload.end_day) return 'Date range needs start and end month/day.';
      break;
    case 'manual_text':
      if (!payload.month || !payload.manual_date_text) return 'Manual text needs a display month and date text.';
      break;
    default:
      return 'Unknown rule type.';
  }
  return '';
}

function resetCustomForm() {
  els.customForm?.reset();
  state.editingId = null;
  if (els.customForm?.elements?.is_active) els.customForm.elements.is_active.checked = true;
  els.customForm.elements.id.value = '';
  els.saveCustomBtn.textContent = 'Save observance';
  updateRuleFieldVisibility();
}

function loadCustomIntoForm(id) {
  const item = state.customObservances.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  state.editingId = item.id;
  const form = els.customForm;
  form.elements.id.value = item.id;
  form.elements.title.value = item.title || '';
  form.elements.rule_type.value = item.rule_type || 'fixed_date';
  form.elements.month.value = item.month || item.rule_month || item.start_month || 1;
  form.elements.rule_month.value = item.rule_month || item.month || 1;
  form.elements.day.value = item.day || '';
  form.elements.nth.value = item.nth || 1;
  form.elements.weekday.value = item.weekday ?? '';
  form.elements.start_month.value = item.start_month || item.month || 1;
  form.elements.start_day.value = item.start_day || '';
  form.elements.end_month.value = item.end_month || item.month || 1;
  form.elements.end_day.value = item.end_day || '';
  form.elements.manual_date_text.value = item.manual_date_text || '';
  form.elements.notes.value = item.notes || '';
  form.elements.is_active.checked = item.is_active !== false;
  els.saveCustomBtn.textContent = 'Update observance';
  updateRuleFieldVisibility();
  window.scrollTo({ top: els.customForm.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
}

function renderCustomList() {
  els.customList.innerHTML = state.customObservances.length ? state.customObservances.map((item) => `
    <article class="custom-item">
      <div class="custom-item-top">
        <div>
          <div class="custom-item-title">${escapeHtml(item.title)}</div>
          <div class="custom-item-meta">${escapeHtml(summarizeRule(item))}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}${item.is_active === false ? ' · inactive' : ''}</div>
        </div>
        <div class="custom-actions">
          ${canEdit() ? `<button type="button" data-action="edit" data-id="${item.id}">Edit</button>` : ''}
          ${canEdit() ? `<button type="button" class="danger" data-action="delete" data-id="${item.id}">Delete</button>` : ''}
        </div>
      </div>
    </article>
  `).join('') : '<div class="muted-empty">No custom observances yet.</div>';
}

function updateRuleFieldVisibility() {
  const selected = normalizeText(els.ruleTypeSelect?.value || 'fixed_date');
  document.querySelectorAll('[data-rule]').forEach((field) => {
    const allowed = normalizeText(field.dataset.rule).split(/\s+/).filter(Boolean);
    field.classList.toggle('hidden', !allowed.includes(selected));
  });
}

async function loadCustomObservances() {
  setStatus('Loading custom observances…');
  const { data, error } = await state.supabase
    .from(HOLIDAY_OBSERVANCES_TABLE)
    .select('*')
    .order('month', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });
  if (error) throw error;
  state.customObservances = data || [];
  renderCustomList();
  renderCalendar();
  setStatus(`Loaded ${state.customObservances.length.toLocaleString()} custom observance${state.customObservances.length === 1 ? '' : 's'}.`);
}

async function saveCustomObservance(event) {
  event.preventDefault();
  if (!canEdit()) {
    setFeedback('Sign in with GitHub to change the custom list.', 'warn');
    return;
  }
  const payload = collectCustomPayload();
  const validationMessage = validateCustomPayload(payload);
  if (validationMessage) {
    setFeedback(validationMessage, 'warn');
    return;
  }
  setFeedback(`${state.editingId ? 'Updating' : 'Saving'} ${payload.title}…`, 'info');
  setStatus(`${state.editingId ? 'Updating' : 'Saving'} ${payload.title}…`);
  try {
    let response;
    if (state.editingId) {
      response = await state.supabase.from(HOLIDAY_OBSERVANCES_TABLE).update(payload).eq('id', state.editingId).select('*').single();
    } else {
      response = await state.supabase.from(HOLIDAY_OBSERVANCES_TABLE).insert(payload).select('*').single();
    }
    if (response.error) throw response.error;
    const saved = response.data;
    await loadCustomObservances();
    resetCustomForm();
    setFeedback(`Saved ${saved.title}.`, 'success');
    setStatus(`Saved ${saved.title}.`);
  } catch (error) {
    console.error(error);
    const message = getWriteErrorMessage(error, 'the holiday observances table');
    setFeedback(message, 'error');
    setStatus(message);
  }
}

async function deleteCustomObservance(id) {
  const existing = state.customObservances.find((item) => String(item.id) === String(id));
  const label = existing?.title || 'this observance';
  if (!window.confirm(`Delete ${label}?`)) return;
  setFeedback(`Deleting ${label}…`, 'info');
  setStatus(`Deleting ${label}…`);
  try {
    const { error } = await state.supabase.from(HOLIDAY_OBSERVANCES_TABLE).delete().eq('id', id);
    if (error) throw error;
    await loadCustomObservances();
    resetCustomForm();
    setFeedback(`Deleted ${label}.`, 'success');
    setStatus(`Deleted ${label}.`);
  } catch (error) {
    console.error(error);
    const message = getWriteErrorMessage(error, 'the holiday observances table');
    setFeedback(message, 'error');
    setStatus(message);
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

  els.yearSelect?.addEventListener('change', () => {
    state.selectedYear = Number(els.yearSelect.value) || new Date().getFullYear();
    renderCalendar();
    setStatus(`Showing holidays and observances for ${state.selectedYear}.`);
  });

  els.refreshBtn?.addEventListener('click', () => {
    void loadCustomObservances().catch((error) => {
      console.error(error);
      setFeedback(error.message, 'error');
      setStatus(error.message);
    });
  });

  els.ruleTypeSelect?.addEventListener('change', updateRuleFieldVisibility);
  els.customForm?.addEventListener('submit', saveCustomObservance);
  els.resetCustomBtn?.addEventListener('click', resetCustomForm);
  els.customList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-id]');
    if (!button || !canEdit()) return;
    const { action, id } = button.dataset;
    if (action === 'edit') loadCustomIntoForm(id);
    if (action === 'delete') void deleteCustomObservance(id);
  });
}

async function init() {
  if (!hasValidConfig()) {
    els.setupNotice?.classList.remove('hidden');
    return;
  }

  populateStaticSelects();
  bindEvents();
  updateRuleFieldVisibility();
  resetCustomForm();
  els.pageShell?.classList.remove('hidden');

  const noStoreFetch = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' });
  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { fetch: noStoreFetch }
  });

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  updateAuthUi();
  renderCalendar();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateAuthUi();
  });

  try {
    await loadCustomObservances();
    setFeedback('', '');
  } catch (error) {
    console.error(error);
    const message = normalizeLower(error?.message).includes('holiday_observances')
      ? 'The holiday observances table is missing. Run sql/monthly-media-and-holidays.sql first.'
      : error.message;
    setFeedback(message, 'error');
    setStatus(message);
  }
}

void init();
