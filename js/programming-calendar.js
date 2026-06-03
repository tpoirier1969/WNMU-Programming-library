// WNMU Programming Library Schedule Planner test helper v1.5.60
// Read-only Supabase use: this file only SELECTs existing data. Test planner templates/overrides are localStorage-only.
(function () {
  'use strict';

  const VERSION = 'v1.5.60-test';
  const TIME_MIN = 7 * 60;
  const TIME_MAX = 26 * 60;
  const STEP = 30;
  const DEFAULT_SELECTED_TIME = 14 * 60;
  const LOCAL_TEMPLATE_KEY = 'wnmu_prog_sched_test_slot_templates_v1';
  const LOCAL_OVERRIDE_KEY = 'wnmu_prog_sched_test_slot_overrides_v1';
  const LOCAL_PREF_KEY = 'wnmu_prog_sched_test_preferences_v1';
  const SCHED_TABLE_PREFIX = 'wnmu_prog_sched_';

  const $ = (selector) => document.querySelector(selector);
  const state = {
    supabase: null,
    session: null,
    programs: [],
    holidays: [],
    templates: [],
    overrides: [],
    channel: '13.1',
    month: firstOfMonth(new Date()),
    selectedMinutes: DEFAULT_SELECTED_TIME,
    activeCell: null,
    loading: false
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheEls();
    bindEvents();
    restorePreferences();
    renderTimeOptions();
    syncControls();

    if (!hasConfig()) {
      showLocked('Missing config.js. Open the Library after config.js is available.');
      return;
    }

    state.supabase = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
    const { data, error } = await state.supabase.auth.getSession();
    if (error || !data?.session) {
      showLocked('Sign in through the Library to use the Schedule Planner test page.');
      return;
    }

    state.session = data.session;
    showPlanner();
    loadLocalPlannerData();
    await loadReadOnlyData();
    render();
  }

  function cacheEls() {
    [
      'lockedShell','plannerShell','lockedLibraryBtn','openLibraryBtn','refreshDataBtn','channelSelect','monthInput','timeDownBtn','timeUpBtn','timeDisplay','timeSelect','prevMonthBtn','thisMonthBtn','nextMonthBtn','monthGrid','sideTitle','sideSummary','metricPrograms','metricHolidays','metricTemplates','metricOverrides','clearLocalPlannerBtn','slotModalBackdrop','slotModalTitle','slotModalSub','slotModalBody','closeSlotModalBtn'
    ].forEach((id) => { els[id] = document.getElementById(id); });
  }

  function bindEvents() {
    els.openLibraryBtn?.addEventListener('click', () => { window.open('index.html', 'wnmu-programming-library')?.focus(); });
    els.lockedLibraryBtn?.addEventListener('click', () => { window.location.href = 'index.html'; });
    els.refreshDataBtn?.addEventListener('click', async () => { await loadReadOnlyData(); render(); });
    els.channelSelect?.addEventListener('change', () => { state.channel = els.channelSelect.value; persistPreferences(); render(); });
    els.monthInput?.addEventListener('change', () => {
      const value = els.monthInput.value;
      if (!value) return;
      const [year, month] = value.split('-').map(Number);
      state.month = new Date(year, month - 1, 1);
      persistPreferences();
      render();
    });
    els.timeDownBtn?.addEventListener('click', () => adjustTime(-STEP));
    els.timeUpBtn?.addEventListener('click', () => adjustTime(STEP));
    els.timeSelect?.addEventListener('change', () => {
      state.selectedMinutes = clampTime(Number(els.timeSelect.value));
      persistPreferences();
      syncControls();
      render();
    });
    els.prevMonthBtn?.addEventListener('click', () => { state.month = addMonths(state.month, -1); persistPreferences(); syncControls(); render(); });
    els.nextMonthBtn?.addEventListener('click', () => { state.month = addMonths(state.month, 1); persistPreferences(); syncControls(); render(); });
    els.thisMonthBtn?.addEventListener('click', () => { state.month = firstOfMonth(new Date()); persistPreferences(); syncControls(); render(); });
    els.clearLocalPlannerBtn?.addEventListener('click', () => {
      if (!confirm('Clear local Schedule Planner test templates and overrides from this browser? Supabase data will not be touched.')) return;
      state.templates = [];
      state.overrides = [];
      persistLocalPlannerData();
      render();
    });
    els.closeSlotModalBtn?.addEventListener('click', closeModal);
    els.slotModalBackdrop?.addEventListener('click', (event) => { if (event.target === els.slotModalBackdrop) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  }

  function hasConfig() {
    return Boolean(window.APP_CONFIG?.SUPABASE_URL && window.APP_CONFIG?.SUPABASE_ANON_KEY && String(window.APP_CONFIG.SUPABASE_URL).startsWith('http'));
  }

  function showLocked(message) {
    els.lockedShell?.classList.remove('hidden');
    els.plannerShell?.classList.add('hidden');
    const p = els.lockedShell?.querySelector('p');
    if (p && message) p.textContent = message;
  }

  function showPlanner() {
    els.lockedShell?.classList.add('hidden');
    els.plannerShell?.classList.remove('hidden');
  }

  async function loadReadOnlyData() {
    if (!state.supabase || !state.session) return;
    state.loading = true;
    updateSummary('Loading Library data…');
    try {
      const [programResult, holidayResult] = await Promise.all([
        selectPrograms(),
        state.supabase.from('holiday_observances').select('*')
      ]);
      if (programResult.error) throw programResult.error;
      if (holidayResult.error) console.warn('Holiday/event read skipped:', holidayResult.error);
      state.programs = Array.isArray(programResult.data) ? programResult.data : [];
      state.holidays = Array.isArray(holidayResult.data) ? holidayResult.data : [];
      updateSummary(`Loaded ${state.programs.length.toLocaleString()} programs. Scheduler remains read-only.`);
    } catch (error) {
      console.error(error);
      updateSummary(`Read-only data load failed: ${error.message}`);
    } finally {
      state.loading = false;
      updateMetrics();
    }
  }

  async function selectPrograms() {
    const enriched = await state.supabase.from('programs_enriched').select('*');
    if (!enriched.error) return enriched;
    console.warn('programs_enriched read failed; falling back to programs:', enriched.error);
    return state.supabase.from('programs').select('*');
  }

  function render() {
    syncControls();
    renderMonthGrid();
    updateMetrics();
  }

  function renderTimeOptions() {
    if (!els.timeSelect) return;
    els.timeSelect.innerHTML = '';
    for (let minutes = TIME_MIN; minutes <= TIME_MAX; minutes += STEP) {
      const option = new Option(formatTime(minutes), String(minutes));
      els.timeSelect.add(option);
    }
  }

  function syncControls() {
    if (els.channelSelect) els.channelSelect.value = state.channel;
    if (els.monthInput) els.monthInput.value = formatMonthValue(state.month);
    if (els.timeDisplay) els.timeDisplay.textContent = formatTime(state.selectedMinutes);
    if (els.timeSelect) els.timeSelect.value = String(state.selectedMinutes);
  }

  function renderMonthGrid() {
    if (!els.monthGrid) return;
    const days = buildCalendarDays(state.month);
    els.monthGrid.innerHTML = days.map((date) => renderDayCell(date)).join('');
    els.monthGrid.querySelectorAll('[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => openSlotModal(cell.dataset.date));
    });
  }

  function renderDayCell(date) {
    const iso = toIsoDate(date);
    const outside = date.getMonth() !== state.month.getMonth();
    const today = iso === toIsoDate(new Date());
    const context = resolveDayContext(date, state.selectedMinutes, state.channel);
    const holiday = holidaysForDate(iso)[0];
    return `
      <button type="button" class="day-cell${outside ? ' outside' : ''}${today ? ' today' : ''}" data-date="${escapeHtml(iso)}" aria-label="${escapeHtml(formatLongDate(date))} ${escapeHtml(formatTime(state.selectedMinutes))}">
        <div class="day-num"><span>${date.getDate()}</span>${holiday ? `<span class="holiday-chip" title="${escapeHtml(eventName(holiday))}">${escapeHtml(eventName(holiday))}</span>` : ''}</div>
        ${renderContextRow(context.previous, 'faded')}
        ${renderContextRow(context.current, 'current')}
        ${renderContextRow(context.next, 'faded')}
      </button>
    `;
  }

  function renderContextRow(item, role) {
    if (!item) return `<div class="context-row faded"><div class="slot-line"><span class="slot-time">—</span><span class="slot-title">No nearby item</span></div></div>`;
    const empty = item.kind === 'empty';
    const statusClass = item.status ? ` status-${item.status}` : '';
    const classes = ['context-row', role, empty && role === 'current' ? 'empty-current' : '', statusClass].filter(Boolean).join(' ');
    return `
      <div class="${classes}">
        <div class="slot-line"><span class="slot-time">${escapeHtml(formatTime(item.startMinutes))}</span><span class="slot-title">${escapeHtml(item.title || item.label || 'Open slot')}</span></div>
        <div class="slot-meta">${escapeHtml(itemMeta(item))}</div>
      </div>
    `;
  }

  function itemMeta(item) {
    if (!item || item.kind === 'empty') return `Click to define · ${formatTime(state.selectedMinutes)}`;
    const bits = [];
    if (item.lengthMinutes) bits.push(`${item.lengthMinutes}m`);
    if (item.purposeLabel) bits.push(item.purposeLabel);
    if (item.fillStrategy && item.fillStrategy !== 'single') bits.push(fillStrategyLabel(item.fillStrategy));
    if (item.status === 'pbs') bits.push('locked');
    if (item.status === 'override') bits.push('temporary');
    return bits.join(' · ') || 'Template';
  }

  function resolveDayContext(date, selectedMinutes, channel) {
    const items = resolvedItemsForDay(date, channel).sort((a, b) => a.startMinutes - b.startMinutes || b.lengthMinutes - a.lengthMinutes);
    const current = findCurrentItem(items, selectedMinutes) || emptyItem(selectedMinutes);
    const currentStart = current.kind === 'empty' ? selectedMinutes : current.startMinutes;
    const currentEnd = current.kind === 'empty' ? selectedMinutes + STEP : current.startMinutes + current.lengthMinutes;
    const previous = [...items].reverse().find((item) => item.startMinutes + item.lengthMinutes <= currentStart || item.startMinutes < currentStart);
    const next = items.find((item) => item.startMinutes >= currentEnd);
    return { previous, current, next };
  }

  function findCurrentItem(items, minutes) {
    return items.find((item) => minutes >= item.startMinutes && minutes < item.startMinutes + item.lengthMinutes) || null;
  }

  function emptyItem(minutes) {
    return { kind: 'empty', startMinutes: minutes, lengthMinutes: STEP, title: 'Open / no template', purpose: 'empty', purposeLabel: 'needs template', status: 'empty' };
  }

  function resolvedItemsForDay(date, channel) {
    const iso = toIsoDate(date);
    const dow = date.getDay();
    const overrideItems = state.overrides
      .filter((item) => item.channel === channel && dateInRange(iso, item.startDate, item.endDate))
      .map((item) => normalizePlannerItem(item, 'override'));
    const overriddenKeys = new Set(overrideItems.map((item) => item.overrideTemplateId ? `${item.overrideTemplateId}|${item.startMinutes}` : `${item.startMinutes}`));
    const templateItems = state.templates
      .filter((item) => item.channel === channel && Number(item.dayOfWeek) === dow && dateInRange(iso, item.startDate, item.endDate))
      .filter((item) => !overriddenKeys.has(`${item.id}|${item.startMinutes}`) && !overriddenKeys.has(`${item.startMinutes}`))
      .map((item) => normalizePlannerItem(item, 'template'));
    return [...templateItems, ...overrideItems];
  }

  function normalizePlannerItem(raw, kind) {
    const pbs = Boolean(raw.isPbsFeed || raw.purpose === 'pbs_feed');
    const override = kind === 'override';
    const status = override ? 'override' : (pbs ? 'pbs' : purposeStatus(raw.purpose));
    return {
      ...raw,
      kind,
      status,
      title: raw.titleTopic || raw.title || purposeLabel(raw.purpose),
      purposeLabel: purposeLabel(raw.purpose),
      lengthMinutes: Number(raw.lengthMinutes || 30),
      startMinutes: Number(raw.startMinutes || 0),
      programmable: override ? true : !pbs && raw.purpose !== 'hold' && raw.purpose !== 'fundraiser'
    };
  }

  function purposeStatus(purpose) {
    if (purpose === 'fundraiser') return 'fundraiser';
    if (purpose === 'local') return 'local';
    return '';
  }

  function openSlotModal(iso) {
    const date = fromIsoDate(iso);
    const context = resolveDayContext(date, state.selectedMinutes, state.channel);
    state.activeCell = { iso, date, context };
    els.slotModalTitle.textContent = `${formatLongDate(date)} · ${formatTime(state.selectedMinutes)}`;
    els.slotModalSub.textContent = `${state.channel} · selected month view time slot`;
    els.slotModalBody.innerHTML = slotModalMarkup(context, iso);
    bindSlotModalEvents(context, iso);
    els.slotModalBackdrop.classList.remove('hidden');
  }

  function closeModal() {
    els.slotModalBackdrop?.classList.add('hidden');
    state.activeCell = null;
  }

  function slotModalMarkup(context, iso) {
    const current = context.current;
    const isEmpty = current.kind === 'empty';
    const isPbs = current.status === 'pbs';
    const isOverride = current.status === 'override';
    return `
      <div class="candidate-section">
        <h3>Context</h3>
        <div>${renderContextRow(context.previous, 'faded')}</div>
        <div style="margin-top:8px;">${renderContextRow(current, 'current')}</div>
        <div style="margin-top:8px;">${renderContextRow(context.next, 'faded')}</div>
      </div>

      ${isEmpty ? createTemplateMarkup(iso) : existingSlotMarkup(current, iso, { isPbs, isOverride })}
      <div id="candidatePreview"></div>
    `;
  }

  function createTemplateMarkup(iso) {
    const date = fromIsoDate(iso);
    return `
      <form id="slotTemplateForm" class="candidate-section">
        <h3>Create local test template</h3>
        <p class="small-note">Stored only in this browser under ${SCHED_TABLE_PREFIX} test keys. No Supabase write.</p>
        <div class="form-grid">
          <label>Applies to
            <select name="scope">
              <option value="weekly">Every ${weekdayName(date.getDay())} at this time</option>
              <option value="date">This date only as temporary override</option>
            </select>
          </label>
          <label>Length minutes
            <input name="lengthMinutes" type="number" min="5" step="5" value="60" required />
          </label>
          <label>Purpose
            <select name="purpose">
              <option value="standalone">Standalone</option>
              <option value="series">Series run</option>
              <option value="flex">Flexible block</option>
              <option value="local">Local program</option>
              <option value="pbs_feed">PBS feed / locked</option>
              <option value="fundraiser">Fundraiser placeholder</option>
              <option value="holiday">Holiday/event block</option>
              <option value="hold">Manual hold</option>
            </select>
          </label>
          <label>Fill structure
            <select name="fillStrategy">
              <option value="single">Single program only</option>
              <option value="two_half_hours">Two half-hours allowed</option>
              <option value="single_or_two">Either single or two half-hours</option>
            </select>
          </label>
          <label class="span-2">Title/topic label
            <input name="titleTopic" type="text" placeholder="Gardening, News, Nature, Local, etc." />
          </label>
          <label>Series episode min
            <input name="episodeMin" type="number" min="1" step="1" placeholder="optional" />
          </label>
          <label>Series episode max
            <input name="episodeMax" type="number" min="1" step="1" placeholder="optional" />
          </label>
          <label>Rating use
            <select name="ratingMode">
              <option value="boost">Prefer higher-rated</option>
              <option value="ignore">Ignore ratings</option>
              <option value="minimum">Require minimum</option>
            </select>
          </label>
          <label>Minimum rating
            <select name="ratingMin">
              <option value="">Any</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </label>
          <label>Freshness
            <select name="freshnessMonths">
              <option value="0">Any</option>
              <option value="12">Not aired in 12 months</option>
              <option value="24" selected>Not aired in 24 months</option>
            </select>
          </label>
          <label>Holiday/event match
            <select name="eventMode">
              <option value="none">None</option>
              <option value="prefer">Prefer nearby event</option>
              <option value="require">Require nearby event</option>
            </select>
          </label>
          <label>Event window days
            <input name="eventWindowDays" type="number" min="0" max="30" step="1" value="5" />
          </label>
          <label class="span-4">Notes
            <textarea name="notes" rows="2" placeholder="Test notes, PBS feed name, fundraiser notes, staff-off holiday notes, etc."></textarea>
          </label>
        </div>
        <div class="action-row">
          <button type="submit" class="primary">Save local test template</button>
        </div>
      </form>
    `;
  }

  function existingSlotMarkup(current, iso, flags) {
    const isPbs = flags.isPbs;
    const isOverride = flags.isOverride;
    const canFind = current.programmable || isOverride;
    return `
      <section class="candidate-section">
        <h3>Slot actions</h3>
        <p><strong>${escapeHtml(current.title || 'Slot')}</strong></p>
        <p class="small-note">${escapeHtml(itemMeta(current))}</p>
        <div class="action-row" style="justify-content:start;">
          ${canFind ? '<button type="button" id="findCandidatesBtn" class="primary">Preview matching programs</button>' : ''}
          ${isPbs ? '<button type="button" id="overridePbsBtn" class="primary">Override this date</button>' : ''}
          ${isOverride ? '<button type="button" id="removeOverrideBtn">Restore template/PBS feed</button>' : ''}
          ${current.kind === 'template' ? '<button type="button" id="editTemplateBtn">Edit local template</button>' : ''}
          ${current.kind === 'template' ? '<button type="button" id="deleteTemplateBtn" class="danger">Delete local template</button>' : ''}
        </div>
        ${!canFind && isPbs ? '<p class="small-note">PBS feed slots are ignored by the helper until you override them.</p>' : ''}
      </section>
    `;
  }

  function bindSlotModalEvents(context, iso) {
    const form = document.getElementById('slotTemplateForm');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      saveTemplateFromForm(form, iso);
    });
    document.getElementById('findCandidatesBtn')?.addEventListener('click', () => renderCandidatePreview(context.current, iso));
    document.getElementById('overridePbsBtn')?.addEventListener('click', () => createPbsOverride(context.current, iso));
    document.getElementById('removeOverrideBtn')?.addEventListener('click', () => removeOverride(context.current));
    document.getElementById('editTemplateBtn')?.addEventListener('click', () => renderEditTemplateForm(context.current, iso));
    document.getElementById('deleteTemplateBtn')?.addEventListener('click', () => deleteTemplate(context.current));
  }

  function saveTemplateFromForm(form, iso) {
    const data = Object.fromEntries(new FormData(form).entries());
    const date = fromIsoDate(iso);
    const base = plannerItemFromFormData(data, iso);
    if (data.scope === 'date') {
      state.overrides.push({ ...base, id: newId(), kind: 'override', startDate: iso, endDate: iso, dayOfWeek: date.getDay(), channel: state.channel });
    } else {
      state.templates.push({ ...base, id: newId(), kind: 'template', startDate: '', endDate: '', dayOfWeek: date.getDay(), channel: state.channel });
    }
    persistLocalPlannerData();
    closeModal();
    render();
  }

  function plannerItemFromFormData(data, iso) {
    const purpose = data.purpose || 'standalone';
    return {
      startMinutes: state.selectedMinutes,
      lengthMinutes: saneNumber(data.lengthMinutes, 60),
      purpose,
      isPbsFeed: purpose === 'pbs_feed',
      titleTopic: data.titleTopic || purposeLabel(purpose),
      fillStrategy: data.fillStrategy || 'single',
      episodeMin: saneNullableNumber(data.episodeMin),
      episodeMax: saneNullableNumber(data.episodeMax),
      ratingMode: data.ratingMode || 'boost',
      ratingMin: saneNullableNumber(data.ratingMin),
      freshnessMonths: saneNumber(data.freshnessMonths, 0),
      eventMode: data.eventMode || 'none',
      eventWindowDays: saneNumber(data.eventWindowDays, 5),
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
  }

  function createPbsOverride(current, iso) {
    const override = {
      ...current,
      id: newId(),
      kind: 'override',
      status: 'override',
      isPbsFeed: false,
      pbsWasOverridden: true,
      overrideTemplateId: current.id || '',
      purpose: current.lengthMinutes === 60 ? 'flex' : 'standalone',
      titleTopic: `Local override for ${current.title || 'PBS feed'}`,
      programmable: true,
      startDate: iso,
      endDate: iso,
      notes: `Original PBS feed: ${current.title || current.titleTopic || ''}`.trim(),
      createdAt: new Date().toISOString()
    };
    state.overrides.push(override);
    persistLocalPlannerData();
    closeModal();
    render();
  }

  function removeOverride(current) {
    if (!current?.id) return;
    state.overrides = state.overrides.filter((item) => String(item.id) !== String(current.id));
    persistLocalPlannerData();
    closeModal();
    render();
  }

  function renderEditTemplateForm(current, iso) {
    const body = document.getElementById('slotModalBody');
    if (!body || !current?.id) return;
    body.innerHTML = `
      <form id="editTemplateForm" class="candidate-section">
        <h3>Edit local recurring template</h3>
        <p class="small-note">This edits the local browser-only test template. No Supabase write.</p>
        <div class="form-grid">
          <label>Length minutes<input name="lengthMinutes" type="number" min="5" step="5" value="${escapeHtml(current.lengthMinutes)}" required /></label>
          <label>Purpose
            <select name="purpose">${purposeOptions(current.purpose)}</select>
          </label>
          <label>Fill structure
            <select name="fillStrategy">${fillOptions(current.fillStrategy)}</select>
          </label>
          <label>Start time
            <select name="startMinutes">${timeOptions(current.startMinutes)}</select>
          </label>
          <label class="span-2">Title/topic label<input name="titleTopic" type="text" value="${escapeHtml(current.titleTopic || current.title || '')}" /></label>
          <label>Series episode min<input name="episodeMin" type="number" min="1" step="1" value="${escapeHtml(current.episodeMin || '')}" /></label>
          <label>Series episode max<input name="episodeMax" type="number" min="1" step="1" value="${escapeHtml(current.episodeMax || '')}" /></label>
          <label>Freshness<select name="freshnessMonths"><option value="0">Any</option><option value="12"${Number(current.freshnessMonths)===12?' selected':''}>Not aired in 12 months</option><option value="24"${Number(current.freshnessMonths)===24?' selected':''}>Not aired in 24 months</option></select></label>
          <label>Event match<select name="eventMode"><option value="none">None</option><option value="prefer"${current.eventMode==='prefer'?' selected':''}>Prefer nearby event</option><option value="require"${current.eventMode==='require'?' selected':''}>Require nearby event</option></select></label>
          <label>Event window days<input name="eventWindowDays" type="number" min="0" max="30" step="1" value="${escapeHtml(current.eventWindowDays || 5)}" /></label>
          <label class="span-4">Notes<textarea name="notes" rows="2">${escapeHtml(current.notes || '')}</textarea></label>
        </div>
        <div class="action-row"><button type="submit" class="primary">Save local template edits</button></div>
      </form>
    `;
    document.getElementById('editTemplateForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const idx = state.templates.findIndex((item) => String(item.id) === String(current.id));
      if (idx < 0) return;
      state.templates[idx] = {
        ...state.templates[idx],
        ...plannerItemFromFormData({ ...data, ratingMode: current.ratingMode || 'boost', ratingMin: current.ratingMin || '' }, iso),
        startMinutes: saneNumber(data.startMinutes, current.startMinutes)
      };
      persistLocalPlannerData();
      closeModal();
      render();
    });
  }

  function deleteTemplate(current) {
    if (!current?.id) return;
    if (!confirm('Delete this local recurring test template? Supabase data will not be touched.')) return;
    state.templates = state.templates.filter((item) => String(item.id) !== String(current.id));
    state.overrides = state.overrides.filter((item) => String(item.overrideTemplateId || '') !== String(current.id));
    persistLocalPlannerData();
    closeModal();
    render();
  }

  function renderCandidatePreview(slot, iso) {
    const target = normalizePlannerItem({ ...slot, channel: state.channel }, slot.kind || 'template');
    if (target.status === 'pbs') return;
    const candidates = rankCandidates(target, iso);
    const pairs = target.lengthMinutes === 60 && ['two_half_hours', 'single_or_two', 'flex'].includes(target.fillStrategy || target.purpose)
      ? rankPairs(target, iso)
      : [];
    const preview = document.getElementById('candidatePreview');
    if (!preview) return;
    preview.innerHTML = `
      <div class="candidate-grid">
        <section class="candidate-section">
          <h3>Best single-program fits</h3>
          ${candidates.slice(0, 10).map(candidateCard).join('') || '<p class="small-note">No single-program matches found.</p>'}
        </section>
        <section class="candidate-section">
          <h3>Best 30 + 30 fits</h3>
          ${pairs.slice(0, 8).map(pairCard).join('') || '<p class="small-note">No 30 + 30 pairs for this slot.</p>'}
        </section>
      </div>
    `;
  }

  function rankCandidates(slot, iso) {
    return state.programs
      .map((program) => scoreProgram(program, slot, iso))
      .filter((entry) => entry.ok)
      .sort((a, b) => b.score - a.score || text(programTitle(a.program)).localeCompare(text(programTitle(b.program))))
      .slice(0, 80);
  }

  function rankPairs(slot, iso) {
    const halfSlot = { ...slot, lengthMinutes: 30, purpose: slot.purpose === 'series' ? 'standalone' : slot.purpose };
    const halfs = rankCandidates(halfSlot, iso).filter((entry) => entry.length === 30).slice(0, 60);
    const pairs = [];
    for (let i = 0; i < halfs.length; i += 1) {
      for (let j = i + 1; j < halfs.length; j += 1) {
        const a = halfs[i];
        const b = halfs[j];
        const topicBonus = sharedTopic(a.program, b.program) ? 8 : 0;
        const score = Math.round((a.score + b.score) / 2 + topicBonus);
        pairs.push({ a, b, score, why: [`30 + 30 = 60 minutes`, topicBonus ? 'shared topic' : 'mixed block'] });
      }
    }
    return pairs.sort((a, b) => b.score - a.score).slice(0, 40);
  }

  function scoreProgram(program, slot, iso) {
    const why = [];
    const warnings = [];
    const length = parseLength(program.length_minutes);
    const rating = normalizeRating(program.rating);
    const isSeries = looksLikeSeries(program);
    const rights = rightsStatus(program, iso, slot);
    let score = 0;

    if (program.is_archived) return { ok: false, program, score: -999, why: ['archived'] };
    if (slot.lengthMinutes && length && length !== Number(slot.lengthMinutes)) return { ok: false, program, length, score: -200, why: ['wrong length'] };
    if (slot.lengthMinutes && !length) warnings.push('missing length');
    if (slot.purpose === 'series' && !isSeries) return { ok: false, program, length, score: -200, why: ['not series'] };
    if (['standalone', 'holiday', 'local'].includes(slot.purpose) && isSeries) return { ok: false, program, length, score: -120, why: ['series excluded'] };

    if (rights.expired) return { ok: false, program, length, score: -300, why: ['expired rights'] };
    if (rights.missing) warnings.push('missing rights end');
    else score += 15;

    if (length === Number(slot.lengthMinutes)) { score += 25; why.push(`${length}m length match`); }
    if (isSeries) {
      const count = extractEpisodeCount(program);
      if (slot.episodeMin && count != null && count < Number(slot.episodeMin)) return { ok: false, program, length, score: -100, why: ['too few episodes'] };
      if (slot.episodeMax && count != null && count > Number(slot.episodeMax)) return { ok: false, program, length, score: -100, why: ['too many episodes'] };
      if (count) { score += 8; why.push(`${count} episodes`); }
    }

    const fresh = freshnessInfo(program, state.channel, iso);
    const freshnessMonths = Number(slot.freshnessMonths || 0);
    if (freshnessMonths && fresh.monthsSince != null && fresh.monthsSince < freshnessMonths) return { ok: false, program, length, score: -100, why: [`aired ${fresh.monthsSince} months ago`] };
    if (fresh.neverAired) { score += 25; why.push(`new to ${state.channel}`); }
    else if (fresh.monthsSince != null) { score += Math.min(20, Math.floor(fresh.monthsSince / 3)); why.push(`last aired ${fresh.monthsSince} months ago`); }

    if (slot.ratingMode !== 'ignore') {
      if (slot.ratingMin && (!rating || rating < Number(slot.ratingMin))) return { ok: false, program, length, score: -100, why: ['below rating minimum'] };
      if (rating) { score += rating * 5; why.push(`${rating}/5 rating`); }
      else { score -= 3; warnings.push('unrated'); }
    }

    const event = relevantEventForSlot(iso, slot);
    if (event) {
      const match = eventMatch(program, event, slot);
      if (slot.eventMode === 'require' && !match) return { ok: false, program, length, score: -100, why: ['no event match'] };
      if (match) { score += 22; why.push(`event match: ${event.name}`); }
    }

    const label = text(slot.titleTopic).toLowerCase();
    if (label && label.length > 2 && text(program.title + ' ' + program.notes + ' ' + program.topic + ' ' + program.secondary_topic).toLowerCase().includes(label)) {
      score += 10;
      why.push(`matches ${slot.titleTopic}`);
    }

    return { ok: true, program, length, rating, score, why, warnings };
  }

  function candidateCard(entry) {
    const p = entry.program;
    const title = programTitle(p);
    const meta = [entry.length ? `${entry.length}m` : 'length?', p.program_type, p.topic, p.distributor].filter(Boolean).join(' · ');
    return `
      <div class="candidate-card">
        <div class="candidate-title"><span class="candidate-score">${entry.score}</span>${escapeHtml(title)}</div>
        <div class="candidate-meta">${escapeHtml(meta)}</div>
        <div class="candidate-why">${escapeHtml([...entry.why, ...entry.warnings.map((w) => `warn: ${w}`)].slice(0, 5).join(' · '))}</div>
      </div>
    `;
  }

  function pairCard(pair) {
    return `
      <div class="candidate-card">
        <div class="candidate-title"><span class="candidate-score">${pair.score}</span>${escapeHtml(programTitle(pair.a.program))}</div>
        <div class="candidate-title" style="margin-top:4px;">+ ${escapeHtml(programTitle(pair.b.program))}</div>
        <div class="candidate-meta">30m + 30m</div>
        <div class="candidate-why">${escapeHtml(pair.why.join(' · '))}</div>
      </div>
    `;
  }

  function purposeOptions(current) {
    return ['standalone','series','flex','local','pbs_feed','fundraiser','holiday','hold'].map((value) => `<option value="${value}"${value===current?' selected':''}>${purposeLabel(value)}</option>`).join('');
  }

  function fillOptions(current) {
    const opts = [['single','Single program only'],['two_half_hours','Two half-hours allowed'],['single_or_two','Either single or two half-hours']];
    return opts.map(([value,label]) => `<option value="${value}"${value===current?' selected':''}>${label}</option>`).join('');
  }

  function timeOptions(current) {
    const out = [];
    for (let minutes = TIME_MIN; minutes <= TIME_MAX; minutes += STEP) out.push(`<option value="${minutes}"${Number(current)===minutes?' selected':''}>${formatTime(minutes)}</option>`);
    return out.join('');
  }

  function purposeLabel(purpose) {
    return ({
      standalone: 'Standalone', series: 'Series run', flex: 'Flexible block', local: 'Local program', pbs_feed: 'PBS feed', fundraiser: 'Fundraiser', holiday: 'Holiday/event', hold: 'Manual hold', empty: 'Open slot'
    })[purpose] || 'Programmable';
  }

  function fillStrategyLabel(value) {
    return ({ single: 'single', two_half_hours: '30+30', single_or_two: '60 or 30+30' })[value] || value;
  }

  function loadLocalPlannerData() {
    state.templates = readJson(LOCAL_TEMPLATE_KEY, []);
    state.overrides = readJson(LOCAL_OVERRIDE_KEY, []);
  }

  function persistLocalPlannerData() {
    window.localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(state.templates));
    window.localStorage.setItem(LOCAL_OVERRIDE_KEY, JSON.stringify(state.overrides));
    updateMetrics();
  }

  function restorePreferences() {
    const prefs = readJson(LOCAL_PREF_KEY, {});
    if (prefs.channel) state.channel = prefs.channel;
    if (prefs.month && /^\d{4}-\d{2}$/.test(prefs.month)) {
      const [year, month] = prefs.month.split('-').map(Number);
      state.month = new Date(year, month - 1, 1);
    }
    if (prefs.selectedMinutes != null) state.selectedMinutes = clampTime(Number(prefs.selectedMinutes));
  }

  function persistPreferences() {
    window.localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify({ channel: state.channel, month: formatMonthValue(state.month), selectedMinutes: state.selectedMinutes }));
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function updateSummary(message) {
    if (els.sideSummary) els.sideSummary.textContent = message;
  }

  function updateMetrics() {
    if (els.metricPrograms) els.metricPrograms.textContent = state.programs.length.toLocaleString();
    if (els.metricHolidays) els.metricHolidays.textContent = state.holidays.length.toLocaleString();
    if (els.metricTemplates) els.metricTemplates.textContent = state.templates.length.toLocaleString();
    if (els.metricOverrides) els.metricOverrides.textContent = state.overrides.length.toLocaleString();
  }

  function adjustTime(delta) {
    state.selectedMinutes = clampTime(state.selectedMinutes + delta);
    persistPreferences();
    syncControls();
    render();
  }

  function clampTime(minutes) {
    if (!Number.isFinite(minutes)) return DEFAULT_SELECTED_TIME;
    return Math.min(TIME_MAX, Math.max(TIME_MIN, minutes));
  }

  function buildCalendarDays(monthDate) {
    const first = firstOfMonth(monthDate);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  }

  function holidaysForDate(iso) {
    return state.holidays.filter((event) => normalizeDateish(event.observed_date || event.date || event.event_date || event.holiday_date) === iso);
  }

  function relevantEventForSlot(iso, slot) {
    if (!slot || slot.eventMode === 'none') return null;
    const days = Number(slot.eventWindowDays || 5);
    const target = fromIsoDate(iso).getTime();
    const ms = 86400000;
    const events = state.holidays
      .map((event) => ({ raw: event, name: eventName(event), iso: normalizeDateish(event.observed_date || event.date || event.event_date || event.holiday_date) }))
      .filter((event) => event.iso && Math.abs((fromIsoDate(event.iso).getTime() - target) / ms) <= days)
      .sort((a, b) => Math.abs(fromIsoDate(a.iso).getTime() - target) - Math.abs(fromIsoDate(b.iso).getTime() - target));
    return events[0] || null;
  }

  function eventMatch(program, event, slot) {
    const name = text(event?.name);
    if (!name) return false;
    const terms = new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3));
    text(slot.titleTopic).toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3).forEach((term) => terms.add(term));
    const haystack = text([program.title, program.notes, program.topic, program.secondary_topic, program.rights_notes].join(' ')).toLowerCase();
    return [...terms].some((term) => haystack.includes(term));
  }

  function eventName(event) {
    return text(event?.name || event?.holiday_name || event?.title || event?.event_name || 'Event');
  }

  function dateInRange(iso, start, end) {
    if (start && iso < start) return false;
    if (end && iso > end) return false;
    return true;
  }

  function rightsStatus(program, iso) {
    const end = normalizeDateish(program.rights_end);
    if (!end) return { missing: true, expired: false };
    return { missing: false, expired: end < iso };
  }

  function freshnessInfo(program, channel, iso) {
    const field = channel === '13.3' ? program.aired_13_3 : program.aired_13_1;
    const dates = extractDates(field).filter((d) => d <= iso).sort();
    if (!dates.length) return { neverAired: true, monthsSince: null };
    const latest = dates[dates.length - 1];
    return { neverAired: false, latest, monthsSince: monthsBetween(fromIsoDate(latest), fromIsoDate(iso)) };
  }

  function extractDates(value) {
    const raw = text(value);
    const matches = raw.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g) || [];
    return matches.map(normalizeDateish).filter(Boolean);
  }

  function parseLength(value) {
    const raw = text(value);
    const match = raw.match(/\d+/);
    if (!match) return null;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : null;
  }

  function looksLikeSeries(program) {
    return text(program.program_type).toLowerCase().includes('series');
  }

  function extractEpisodeCount(program) {
    const raw = text(program.episode_season);
    if (!raw) return null;
    const slash = raw.match(/\/\s*(\d{1,4})\b/);
    if (slash) return Number(slash[1]);
    const eps = raw.match(/\b(\d{1,4})\s*(?:eps?|episodes?)\b/i);
    if (eps) return Number(eps[1]);
    if (looksLikeSeries(program) && /^\d{1,4}$/.test(raw)) return Number(raw);
    return null;
  }

  function normalizeRating(value) {
    if (value == null || value === '') return null;
    const num = Math.round(Number(value));
    return Number.isFinite(num) && num >= 1 && num <= 5 ? num : null;
  }

  function sharedTopic(a, b) {
    const aTopics = new Set(text([a.topic, a.secondary_topic].join(',')).toLowerCase().split(/[;,|]/).map((x) => x.trim()).filter(Boolean));
    const bTopics = text([b.topic, b.secondary_topic].join(',')).toLowerCase().split(/[;,|]/).map((x) => x.trim()).filter(Boolean);
    return bTopics.some((topic) => aTopics.has(topic));
  }

  function programTitle(program) { return text(program.title || program.program_title || '(untitled)'); }
  function text(value) { return (value ?? '').toString().trim(); }
  function saneNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function saneNullableNumber(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
  function newId() { return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
  function firstOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  function addMonths(date, amount) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
  function formatMonthValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  function toIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function fromIsoDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function formatLongDate(date) { return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  function weekdayName(index) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index] || 'weekday'; }
  function monthsBetween(a, b) { return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())); }

  function formatTime(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    let hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`;
  }

  function normalizeDateish(value) {
    const raw = text(value);
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
    const slash = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})/);
    if (!slash) return '';
    const year = slash[3].length === 2 ? Number(`20${slash[3]}`) : Number(slash[3]);
    return `${year}-${String(Number(slash[1])).padStart(2, '0')}-${String(Number(slash[2])).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }
})();
