// WNMU Programming Library Schedule Planner test helper v1.5.84
// Database-backed test planner: reads existing Library/Holiday data and writes only to wnmu_prog_sched_* test tables.
// Adds NOLA/topic candidate pools without writing to Library program, aired-history, holiday, pledge, monthly schedule, or ProTrack data.
(function () {
  'use strict';

  const VERSION = 'v1.5.84-weighted-compact-candidates';
  const TIME_MIN = 7 * 60;
  const TIME_MAX = 26 * 60;
  const STEP = 30;
  const DEFAULT_SELECTED_TIME = 14 * 60;
  const LOCAL_PREF_KEY = 'wnmu_prog_sched_test_preferences_v1';
  const TEMPLATE_TABLE = 'wnmu_prog_sched_slot_templates';
  const OVERRIDE_TABLE = 'wnmu_prog_sched_slot_overrides';
  const POOL_TABLE = 'wnmu_prog_sched_program_pools';
  const POOL_ITEM_TABLE = 'wnmu_prog_sched_program_pool_items';
  const SCHED_TABLE_PREFIX = 'wnmu_prog_sched_';

  const $ = (selector) => document.querySelector(selector);
  const state = {
    supabase: null,
    session: null,
    programs: [],
    holidays: [],
    templates: [],
    overrides: [],
    pools: [],
    poolItems: [],
    channel: '13.1',
    month: firstOfMonth(new Date()),
    selectedMinutes: DEFAULT_SELECTED_TIME,
    activeCell: null,
    loading: false,
    plannerDataReady: false,
    candidatePreview: { target: null, iso: '', singles: new Map(), pairs: new Map(), excluded: new Map() }
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
    await loadReadOnlyData();
    render();
  }

  function cacheEls() {
    [
      'plannerTopbar','lockedShell','plannerShell','lockedLibraryBtn','openLibraryBtn','refreshDataBtn','channelSelect','monthInput','timeDownBtn','timeUpBtn','timeDisplay','timeSelect','prevMonthBtn','thisMonthBtn','nextMonthBtn','monthGrid','sideTitle','sideSummary','metricPrograms','metricHolidays','metricTemplates','metricOverrides','metricPools','metricPoolItems','clearLocalPlannerBtn','slotModalBackdrop','slotModalTitle','slotModalSub','slotModalBody','closeSlotModalBtn'
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
    els.clearLocalPlannerBtn?.addEventListener('click', async () => {
      if (!confirm('Clear all Schedule Planner test templates and overrides from Supabase? This only affects wnmu_prog_sched_* planner test tables. Library program data will not be touched.')) return;
      await clearPlannerData();
    });
    els.closeSlotModalBtn?.addEventListener('click', closeModal);
    els.slotModalBackdrop?.addEventListener('click', (event) => { if (event.target === els.slotModalBackdrop) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  }

  function hasConfig() {
    return Boolean(window.APP_CONFIG?.SUPABASE_URL && window.APP_CONFIG?.SUPABASE_ANON_KEY && String(window.APP_CONFIG.SUPABASE_URL).startsWith('http'));
  }

  function showLocked(message) {
    els.plannerTopbar?.classList.add('hidden');
    els.lockedShell?.classList.remove('hidden');
    els.plannerShell?.classList.add('hidden');
    const p = els.lockedShell?.querySelector('p');
    if (p && message) p.textContent = message;
  }

  function showPlanner() {
    els.plannerTopbar?.classList.remove('hidden');
    els.lockedShell?.classList.add('hidden');
    els.plannerShell?.classList.remove('hidden');
  }

  async function loadReadOnlyData() {
    if (!state.supabase || !state.session) return;
    state.loading = true;
    updateSummary('Loading Library and planner data…');
    try {
      const [programResult, holidayResult, templateResult, overrideResult, poolResult, poolItemResult] = await Promise.all([
        selectPrograms(),
        state.supabase.from('holiday_observances').select('*'),
        state.supabase.from(TEMPLATE_TABLE).select('*').order('channel').order('day_of_week').order('start_minutes'),
        state.supabase.from(OVERRIDE_TABLE).select('*').order('start_date').order('start_minutes'),
        state.supabase.from(POOL_TABLE).select('*').order('pool_name'),
        state.supabase.from(POOL_ITEM_TABLE).select('*').order('item_label')
      ]);
      if (programResult.error) throw programResult.error;
      if (holidayResult.error) console.warn('Holiday/event read skipped:', holidayResult.error);
      if (templateResult.error) throw new Error(`Planner template table read failed: ${templateResult.error.message}. Run the v1.5.61 planner SQL, then the v1.5.62 and v1.5.63 migration SQL.`);
      if (overrideResult.error) throw new Error(`Planner override table read failed: ${overrideResult.error.message}. Run the v1.5.61 planner SQL, then the v1.5.62 and v1.5.63 migration SQL.`);
      if (poolResult.error) throw new Error(`Planner program-pool table read failed: ${poolResult.error.message}. Run the v1.5.62 and v1.5.63 migration SQL.`);
      if (poolItemResult.error) throw new Error(`Planner pool-item table read failed: ${poolItemResult.error.message}. Run the v1.5.62 and v1.5.63 migration SQL.`);
      state.programs = Array.isArray(programResult.data) ? programResult.data : [];
      state.holidays = Array.isArray(holidayResult.data) ? holidayResult.data : [];
      state.pools = (poolResult.data || []).map(poolFromDb);
      state.poolItems = (poolItemResult.data || []).map(poolItemFromDb);
      state.templates = (templateResult.data || []).map(templateFromDb);
      state.overrides = (overrideResult.data || []).map(overrideFromDb);
      state.plannerDataReady = true;
      updateSummary(`Loaded ${state.programs.length.toLocaleString()} programs, ${state.templates.length.toLocaleString()} planner templates, and ${state.pools.length.toLocaleString()} NOLA/topic pools. Planner writes only to wnmu_prog_sched_* test tables.`);
    } catch (error) {
      console.error(error);
      state.plannerDataReady = false;
      updateSummary(error.message || 'Planner data load failed.');
    } finally {
      state.loading = false;
      updateMetrics();
    }
  }

  async function selectPrograms() {
    const enriched = await selectAllProgramRows('programs_enriched');
    if (!enriched.error) return enriched;
    console.warn('programs_enriched read failed; falling back to programs:', enriched.error);
    return selectAllProgramRows('programs');
  }

  async function selectAllProgramRows(tableName) {
    const pageSize = 1000;
    const rows = [];
    let expectedCount = null;
    let from = 0;
    while (true) {
      const result = await selectProgramPage(tableName, from, from + pageSize - 1, expectedCount == null);
      const { data, error, count } = result;
      if (error) return { data: rows, error };
      if (expectedCount == null && Number.isFinite(Number(count))) expectedCount = Number(count);
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      from += pageSize;
      if (expectedCount != null) {
        if (rows.length >= expectedCount) break;
        if (!page.length) {
          console.warn(`${tableName} reported ${expectedCount} rows but only ${rows.length} could be paged from Supabase.`);
          break;
        }
      } else if (page.length < pageSize) {
        break;
      }
      if (from > 50000) {
        return { data: rows, error: new Error(`Stopped loading ${tableName} after 50,000 rows. Narrow the Library data source before using planner search.`) };
      }
    }
    return { data: dedupePrograms(rows), error: null, count: expectedCount };
  }

  async function selectProgramPage(tableName, from, to, withCount) {
    const countOpt = withCount ? { count: 'exact' } : undefined;
    let query = state.supabase.from(tableName).select('*', countOpt).range(from, to);
    let result = await query;
    // Keep this deliberately plain. Some views do not expose a stable sortable
    // column through PostgREST, and a failed order() would block the planner.
    // The range loop and exact count are the important parts: they prevent the
    // browser-side Library list from quietly stopping at the first A-F chunk.
    return result;
  }

  function dedupePrograms(rows) {
    const seen = new Set();
    const out = [];
    (Array.isArray(rows) ? rows : []).forEach((program) => {
      const key = programStableId(program) || `${programTitle(program).toLowerCase()}|${programNola(program).toLowerCase()}`;
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      out.push(program);
    });
    return out.sort((a, b) => programTitle(a).localeCompare(programTitle(b)) || programNola(a).localeCompare(programNola(b)));
  }


  function poolFromDb(row) {
    return {
      id: row.id,
      poolName: row.pool_name || '',
      poolType: row.pool_type || 'title_text',
      matchMode: row.match_mode || 'title_text',
      titleMatchText: row.title_match_text || '',
      nolaMatchText: row.nola_match_text || '',
      avoidBackToBack: row.avoid_back_to_back !== false,
      repeatGapDays: Number(row.repeat_gap_days || 0),
      rightsUrgencyMonths: Number(row.rights_urgency_months || 0),
      active: row.active !== false,
      notes: row.notes || ''
    };
  }

  function poolItemFromDb(row) {
    return {
      id: row.id,
      poolId: row.pool_id || '',
      itemLabel: row.item_label || '',
      titleMatchText: row.title_match_text || '',
      nolaMatchText: row.nola_match_text || '',
      programRecordId: row.program_record_id || '',
      programTitle: row.program_title || '',
      seasonLabel: row.season_label || '',
      priorityWeight: Number(row.priority_weight || 0),
      active: row.active !== false,
      notes: row.notes || ''
    };
  }

  function templateFromDb(row) {
    return {
      id: row.id,
      dbId: row.id,
      kind: 'template',
      channel: row.channel || '13.1',
      dayOfWeek: row.day_of_week,
      startMinutes: Number(row.start_minutes || 0),
      lengthMinutes: Number(row.length_minutes || 30),
      purpose: row.purpose || 'standalone',
      isPbsFeed: Boolean(row.is_pbs_feed),
      titleTopic: row.title_topic || '',
      fillStrategy: row.fill_strategy || 'single',
      seriesPattern: row.series_pattern || 'none',
      templateGroupName: row.template_group_name || '',
      episodeMin: row.episode_min,
      episodeMax: row.episode_max,
      ratingMode: row.rating_mode || 'boost',
      ratingMin: row.rating_min,
      freshnessMonths: Number(row.freshness_months || 0),
      eventMode: row.event_mode || 'none',
      eventWindowDays: Number(row.event_window_days || 5),
      slotBehavior: row.slot_behavior || (row.required_pool_id ? 'required_rotation' : 'open_search'),
      requiredPoolId: row.required_pool_id || '',
      avoidBackToBack: row.avoid_back_to_back !== false,
      repeatGapDays: Number(row.repeat_gap_days || 0),
      rightsUrgencyMonths: Number(row.rights_urgency_months || 0),
      priorityPoolMatch: priorityFromDb(row.priority_pool_match, 5),
      priorityRightsUrgency: priorityFromDb(row.priority_rights_urgency, 4),
      priorityRating: priorityFromDb(row.priority_rating, 3),
      priorityLengthFit: priorityFromDb(row.priority_length_fit, 2),
      priorityRepeatGap: priorityFromDb(row.priority_repeat_gap, 4),
      priorityEventMatch: priorityFromDb(row.priority_event_match, 4),
      startDate: row.active_start_date || '',
      endDate: row.active_end_date || '',
      notes: row.notes || '',
      selectedProgramRecordId: row.selected_program_record_id || '',
      selectedProgramTitle: row.selected_program_title || '',
      selectedProgramNola: row.selected_program_nola || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function overrideFromDb(row) {
    return {
      id: row.id,
      dbId: row.id,
      kind: 'override',
      channel: row.channel || '13.1',
      startDate: row.start_date || '',
      endDate: row.end_date || row.start_date || '',
      overrideTemplateId: row.override_template_id || '',
      pbsWasOverridden: Boolean(row.pbs_was_overridden),
      overrideReason: row.override_reason || 'manual',
      startMinutes: Number(row.start_minutes || 0),
      lengthMinutes: Number(row.length_minutes || 30),
      purpose: row.purpose || 'standalone',
      isPbsFeed: Boolean(row.is_pbs_feed),
      titleTopic: row.title_topic || '',
      fillStrategy: row.fill_strategy || 'single',
      seriesPattern: row.series_pattern || 'none',
      templateGroupName: row.template_group_name || '',
      episodeMin: row.episode_min,
      episodeMax: row.episode_max,
      ratingMode: row.rating_mode || 'boost',
      ratingMin: row.rating_min,
      freshnessMonths: Number(row.freshness_months || 0),
      eventMode: row.event_mode || 'none',
      eventWindowDays: Number(row.event_window_days || 5),
      slotBehavior: row.slot_behavior || (row.required_pool_id ? 'required_rotation' : 'open_search'),
      requiredPoolId: row.required_pool_id || '',
      avoidBackToBack: row.avoid_back_to_back !== false,
      repeatGapDays: Number(row.repeat_gap_days || 0),
      rightsUrgencyMonths: Number(row.rights_urgency_months || 0),
      priorityPoolMatch: priorityFromDb(row.priority_pool_match, 5),
      priorityRightsUrgency: priorityFromDb(row.priority_rights_urgency, 4),
      priorityRating: priorityFromDb(row.priority_rating, 3),
      priorityLengthFit: priorityFromDb(row.priority_length_fit, 2),
      priorityRepeatGap: priorityFromDb(row.priority_repeat_gap, 4),
      priorityEventMatch: priorityFromDb(row.priority_event_match, 4),
      notes: row.notes || '',
      selectedProgramRecordId: row.selected_program_record_id || '',
      selectedProgramTitle: row.selected_program_title || '',
      selectedProgramNola: row.selected_program_nola || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function templateToDb(item) {
    return {
      channel: item.channel || state.channel,
      day_of_week: Number(item.dayOfWeek ?? 0),
      start_minutes: Number(item.startMinutes ?? state.selectedMinutes),
      length_minutes: Number(item.lengthMinutes || 30),
      purpose: item.purpose || 'standalone',
      is_pbs_feed: Boolean(item.isPbsFeed || item.purpose === 'pbs_feed'),
      title_topic: item.titleTopic || '',
      fill_strategy: item.fillStrategy || 'single',
      series_pattern: item.seriesPattern || 'none',
      template_group_name: item.templateGroupName || '',
      episode_min: emptyToNull(item.episodeMin),
      episode_max: emptyToNull(item.episodeMax),
      rating_mode: item.ratingMode || 'boost',
      rating_min: emptyToNull(item.ratingMin),
      freshness_months: Number(item.freshnessMonths || 0),
      event_mode: item.eventMode || 'none',
      event_window_days: Number(item.eventWindowDays || 5),
      slot_behavior: item.slotBehavior || (item.requiredPoolId ? 'required_rotation' : 'open_search'),
      required_pool_id: (item.slotBehavior === 'required_rotation' || item.requiredPoolId) ? (item.requiredPoolId || null) : null,
      avoid_back_to_back: item.avoidBackToBack !== false,
      repeat_gap_days: Number(item.repeatGapDays || 0),
      rights_urgency_months: Number(item.rightsUrgencyMonths || 0),
      priority_pool_match: priorityForDb(item.priorityPoolMatch, 5),
      priority_rights_urgency: priorityForDb(item.priorityRightsUrgency, 4),
      priority_rating: priorityForDb(item.priorityRating, 3),
      priority_length_fit: priorityForDb(item.priorityLengthFit, 2),
      priority_repeat_gap: priorityForDb(item.priorityRepeatGap, 4),
      priority_event_match: priorityForDb(item.priorityEventMatch, 4),
      active_start_date: item.startDate || null,
      active_end_date: item.endDate || null,
      notes: item.notes || ''
    };
  }

  function overrideToDb(item) {
    return {
      channel: item.channel || state.channel,
      start_date: item.startDate,
      end_date: item.endDate || item.startDate,
      override_template_id: item.overrideTemplateId || null,
      pbs_was_overridden: Boolean(item.pbsWasOverridden),
      override_reason: item.overrideReason || 'manual',
      start_minutes: Number(item.startMinutes ?? state.selectedMinutes),
      length_minutes: Number(item.lengthMinutes || 30),
      purpose: item.purpose || 'standalone',
      is_pbs_feed: Boolean(item.isPbsFeed || item.purpose === 'pbs_feed'),
      title_topic: item.titleTopic || '',
      fill_strategy: item.fillStrategy || 'single',
      series_pattern: item.seriesPattern || 'none',
      template_group_name: item.templateGroupName || '',
      episode_min: emptyToNull(item.episodeMin),
      episode_max: emptyToNull(item.episodeMax),
      rating_mode: item.ratingMode || 'boost',
      rating_min: emptyToNull(item.ratingMin),
      freshness_months: Number(item.freshnessMonths || 0),
      event_mode: item.eventMode || 'none',
      event_window_days: Number(item.eventWindowDays || 5),
      slot_behavior: item.slotBehavior || (item.requiredPoolId ? 'required_rotation' : 'open_search'),
      required_pool_id: (item.slotBehavior === 'required_rotation' || item.requiredPoolId) ? (item.requiredPoolId || null) : null,
      avoid_back_to_back: item.avoidBackToBack !== false,
      repeat_gap_days: Number(item.repeatGapDays || 0),
      rights_urgency_months: Number(item.rightsUrgencyMonths || 0),
      priority_pool_match: priorityForDb(item.priorityPoolMatch, 5),
      priority_rights_urgency: priorityForDb(item.priorityRightsUrgency, 4),
      priority_rating: priorityForDb(item.priorityRating, 3),
      priority_length_fit: priorityForDb(item.priorityLengthFit, 2),
      priority_repeat_gap: priorityForDb(item.priorityRepeatGap, 4),
      priority_event_match: priorityForDb(item.priorityEventMatch, 4),
      notes: item.notes || '',
      selected_program_record_id: item.selectedProgramRecordId || null,
      selected_program_title: item.selectedProgramTitle || null,
      selected_program_nola: item.selectedProgramNola || null
    };
  }

  function emptyToNull(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function priorityFromDb(value, fallback) {
    return clampPriority(value, fallback);
  }

  function priorityForDb(value, fallback) {
    return clampPriority(value, fallback);
  }

  function clampPriority(value, fallback = 3) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(5, Math.round(n)));
  }

  function priorityOptions(current, fallback = 3) {
    const value = clampPriority(current, fallback);
    return [1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === value ? ' selected' : ''}>${n}</option>`).join('\n\n');
  }

  function priorityScale(value, fallback = 3) {
    return clampPriority(value, fallback) / 3;
  }

  function weightedScore(points, priority, fallback = 3) {
    return Math.round(Number(points || 0) * priorityScale(priority, fallback));
  }

  function priorityFieldsFromData(data) {
    return {
      priorityPoolMatch: clampPriority(data.priorityPoolMatch, 5),
      priorityRightsUrgency: clampPriority(data.priorityRightsUrgency, 4),
      priorityRating: clampPriority(data.priorityRating, 3),
      priorityLengthFit: clampPriority(data.priorityLengthFit, 2),
      priorityRepeatGap: clampPriority(data.priorityRepeatGap, 4),
      priorityEventMatch: clampPriority(data.priorityEventMatch, 4)
    };
  }

  function priorityPanelMarkup(current = {}) {
    return `
          <div class="span-4 priority-rule-panel">
            <div class="field-label">Candidate scoring priorities</div>
            <div class="small-note">1 = low importance, 5 = high importance. These weights change ranking, not Library records.</div>
            <div class="priority-rule-grid">
              <label>Pool / topic / NOLA match<select name="priorityPoolMatch">${priorityOptions(current.priorityPoolMatch, 5)}</select></label>
              <label>Rights urgency<select name="priorityRightsUrgency">${priorityOptions(current.priorityRightsUrgency, 4)}</select></label>
              <label>Rating<select name="priorityRating">${priorityOptions(current.priorityRating, 3)}</select></label>
              <label>Length fit<select name="priorityLengthFit">${priorityOptions(current.priorityLengthFit, 2)}</select></label>
              <label>Repeat gap<select name="priorityRepeatGap">${priorityOptions(current.priorityRepeatGap, 4)}</select></label>
              <label>Event / holiday match<select name="priorityEventMatch">${priorityOptions(current.priorityEventMatch, 4)}</select></label>
            </div>
          </div>`;
  }

  function ratingMinimumOptions(current) {
    const value = text(current);
    const options = ['<option value="">Off</option>'];
    [1, 2, 3, 4, 5].forEach((n) => options.push(`<option value="${n}"${String(n) === value ? ' selected' : ''}>${n}+</option>`));
    return options.join('\n\n');
  }

  function getPool(poolId) {
    if (!poolId) return null;
    return state.pools.find((pool) => String(pool.id) === String(poolId)) || null;
  }

  function poolLabel(poolId) {
    const pool = getPool(poolId);
    return pool?.poolName || '';
  }

  function poolItemsForPool(poolId) {
    if (!poolId) return [];
    return state.poolItems.filter((item) => item.active !== false && String(item.poolId) === String(poolId));
  }

  function poolOptions(currentPoolId) {
    const options = ['<option value="">Create/use pool by name below</option>'];
    state.pools.filter((pool) => pool.active !== false).forEach((pool) => {
      options.push(`<option value="${escapeHtml(pool.id)}"${String(pool.id) === String(currentPoolId || '') ? ' selected' : ''}>${escapeHtml(pool.poolName)}</option>`);
    });
    return options.join('\n\n');
  }

  function poolNameFromForm(data) {
    return text(data.templateGroupName || data.poolName || data.requiredPoolName || data.titleTopic);
  }

  function poolMatchFromForm(data) {
    return text(data.poolNolaText || data.poolSelectedProgramNola || data.poolMatchText || data.titleTopic || data.poolName || data.requiredPoolName);
  }

  function poolNolaFromForm(data) {
    return text(data.poolSelectedProgramNola || data.poolNolaText || '');
  }

  function poolItemLabelFromForm(data) {
    const selectedTitle = text(data.poolSelectedProgramTitle);
    const selectedNola = poolNolaFromForm(data);
    if (selectedTitle && selectedNola) return `${selectedTitle} · ${selectedNola}`;
    return selectedTitle || text(data.poolMatchText || data.poolNolaText || data.titleTopic || data.poolName || data.requiredPoolName);
  }

  function poolNolaTextForSlot(slot) {
    const items = poolItemsForPool(slot?.requiredPoolId);
    const nolas = items.map((item) => item.nolaMatchText).filter(Boolean);
    if (nolas.length) return nolas.join('; ');
    const pool = getPool(slot?.requiredPoolId);
    return pool?.nolaMatchText || '';
  }

  function poolMatchTextForSlot(slot) {
    const items = poolItemsForPool(slot?.requiredPoolId);
    if (items.length) return items.map((item) => item.nolaMatchText || item.titleMatchText || item.itemLabel).filter(Boolean).join('; ');
    const pool = getPool(slot?.requiredPoolId);
    return pool?.nolaMatchText || pool?.titleMatchText || slot?.titleTopic || '';
  }

  async function attachPoolToPlannerItem(item, data) {
    item.slotBehavior = data.slotBehavior || item.slotBehavior || 'open_search';
    item.avoidBackToBack = data.avoidBackToBack === 'on' || data.avoidBackToBack === true;
    item.repeatGapDays = saneNumber(data.repeatGapDays, 0);
    item.rightsUrgencyMonths = saneNumber(data.rightsUrgencyMonths, 0);

    if (item.slotBehavior !== 'required_rotation') {
      item.requiredPoolId = '';
      return item;
    }

    let poolId = text(data.requiredPoolId);
    const poolName = poolNameFromForm(data);
    let rules = parsePoolRulesFromFormData(data);

    if (!poolId && !poolName) throw new Error('Allowed-pool slots need a template/group name or existing pool.');

    if (!rules.length && poolId && poolItemsForPool(poolId).length) {
      item.requiredPoolId = poolId;
      return item;
    }

    if (!rules.length && poolId) {
      const existingPool = getPool(poolId);
      const nola = text(existingPool?.nolaMatchText || '');
      const matchText = text(existingPool?.titleMatchText || existingPool?.poolName || '');
      if (nola) rules.push({ type: 'nola', nola, label: matchText || nola });
      else if (matchText) rules.push({ type: 'text', title: matchText, label: matchText });
      rules = normalizePoolRules(rules);
    }

    if (!rules.length) throw new Error('Allowed-pool slots need at least one NOLA/program or topic.');

    if (!poolId) {
      const firstNola = rules.find((rule) => rule.type === 'nola')?.nola || '';
      const firstTopic = rules.find((rule) => rule.type === 'topic')?.topic || '';
      const hasTopicRule = rules.some((rule) => rule.type === 'topic');
      const hasNolaRule = rules.some((rule) => rule.type === 'nola');
      // Keep parent pool values inside the v1.5.63 database check constraint.
      // Topic-only and mixed topic/NOLA pools are stored as parent mode "mixed";
      // the actual topic matching lives in wnmu_prog_sched_program_pool_items as "topic: ..." rows.
      const parentPoolMode = hasTopicRule ? 'mixed' : (hasNolaRule ? 'nola_prefix' : 'title_text');
      const payload = {
        pool_name: poolName,
        pool_type: parentPoolMode,
        match_mode: parentPoolMode,
        title_match_text: firstTopic ? `topic: ${firstTopic}` : (firstNola || poolName),
        nola_match_text: firstNola || null,
        avoid_back_to_back: item.avoidBackToBack !== false,
        repeat_gap_days: Number(item.repeatGapDays || 0),
        rights_urgency_months: Number(item.rightsUrgencyMonths || 0),
        active: true
      };
      const { data: poolRow, error } = await state.supabase
        .from(POOL_TABLE)
        .upsert(payload, { onConflict: 'pool_name' })
        .select('*')
        .single();
      if (error) throw error;
      const pool = poolFromDb(poolRow);
      upsertInMemory(state.pools, pool);
      poolId = pool.id;
    }

    const desiredTitleMatches = new Set();
    for (const rule of rules) {
      const itemPayload = poolItemPayloadFromRule(poolId, rule);
      desiredTitleMatches.add(text(itemPayload.title_match_text));
      const { data: poolItemRow, error: itemError } = await state.supabase
        .from(POOL_ITEM_TABLE)
        .upsert(itemPayload, { onConflict: 'pool_id,title_match_text' })
        .select('*')
        .single();
      if (itemError) throw itemError;
      upsertInMemory(state.poolItems, poolItemFromDb(poolItemRow));
    }

    if (Object.prototype.hasOwnProperty.call(data, 'poolRulesJson')) {
      const staleItems = poolItemsForPool(poolId).filter((existing) => existing.id && !desiredTitleMatches.has(text(existing.titleMatchText)));
      if (staleItems.length) {
        const { error: deleteError } = await state.supabase
          .from(POOL_ITEM_TABLE)
          .delete()
          .in('id', staleItems.map((existing) => existing.id));
        if (deleteError) throw deleteError;
        const staleIds = new Set(staleItems.map((existing) => String(existing.id)));
        state.poolItems = state.poolItems.filter((existing) => !staleIds.has(String(existing.id)));
      }
    }

    item.requiredPoolId = poolId;
    return item;
  }

  function poolItemPayloadFromRule(poolId, rule) {
    if (rule.type === 'topic') {
      return {
        pool_id: poolId,
        item_label: rule.label || `Topic: ${rule.topic}`,
        title_match_text: `topic: ${rule.topic}`,
        nola_match_text: null,
        program_record_id: null,
        program_title: null,
        active: true
      };
    }
    if (rule.type === 'nola') {
      return {
        pool_id: poolId,
        item_label: rule.label || rule.title || rule.nola,
        title_match_text: rule.title && rule.nola ? `${rule.title} · ${rule.nola}` : rule.nola,
        nola_match_text: rule.nola,
        program_record_id: rule.programId || null,
        program_title: rule.title || null,
        active: true
      };
    }
    return {
      pool_id: poolId,
      item_label: rule.label || rule.title,
      title_match_text: rule.title,
      nola_match_text: null,
      program_record_id: null,
      program_title: null,
      active: true
    };
  }

  function upsertInMemory(list, item) {
    const idx = list.findIndex((existing) => String(existing.id) === String(item.id));
    if (idx >= 0) list[idx] = item;
    else list.push(item);
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
    els.monthGrid.innerHTML = days.map((date) => renderDayCell(date)).join('\n\n');
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
    const dayStatusClass = dayStatusClassForContext(context);
    return `
      <button type="button" class="day-cell${outside ? ' outside' : ''}${today ? ' today' : ''}${dayStatusClass ? ` ${dayStatusClass}` : ''}" data-date="${escapeHtml(iso)}" aria-label="${escapeHtml(formatLongDate(date))} ${escapeHtml(formatTime(state.selectedMinutes))}">
        <div class="day-num"><span>${date.getDate()}</span>${holiday ? `<span class="holiday-chip" title="${escapeHtml(eventName(holiday))}">${escapeHtml(eventName(holiday))}</span>` : ''}</div>
        ${renderContextRow(context.previous, 'faded')}
        ${renderContextRow(context.current, 'current')}
        ${renderContextRow(context.next, 'faded')}
      </button>
    `;
  }

  function dayStatusClassForContext(context) {
    const current = context?.current;
    // Color the whole day cell based on the selected time slot's real state.
    // PBS feed = light blue-gray. A selected/candidate title that the planner
    // has placed as an override = light green. Plain templates keep the base style.
    if (hasSelectedCandidateProgram(current)) return 'day-status-scheduled';
    if (current?.status === 'pbs' || current?.purpose === 'pbs_feed' || current?.isPbsFeed) return 'day-status-pbs';
    return '';
  }

  function renderContextRow(item, role) {
    if (!item) return `<div class="context-row faded"><div class="slot-line compact-title-only"><span class="slot-title">No nearby item</span></div></div>`;
    const empty = item.kind === 'empty';
    const manualCandidate = hasSelectedCandidateProgram(item);
    const statusClass = item.status ? ` status-${item.status}` : '';
    const classes = ['context-row', role, empty && role === 'current' ? 'empty-current' : '', statusClass, manualCandidate ? 'manual-candidate' : ''].filter(Boolean).join('\n\n');
    const title = item.title || item.label || 'Open slot';
    if (role !== 'current' && !empty) {
      return `
        <div class="${classes}">
          <div class="slot-line compact-title-only"><span class="slot-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span></div>
        </div>
      `;
    }
    const titleLine = manualCandidate
      ? `<div class="slot-line compact-title-only"><span class="slot-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span></div>`
      : `<div class="slot-line"><span class="slot-time">${escapeHtml(formatTime(item.startMinutes))}</span><span class="slot-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span></div>`;
    return `
      <div class="${classes}">
        ${titleLine}
        <div class="slot-meta">${escapeHtml(itemMeta(item))}</div>
      </div>
    `;
  }

  function itemMeta(item) {
    if (!item || item.kind === 'empty') return `Click to define · ${formatTime(state.selectedMinutes)}`;

    // When a candidate has been manually placed, the calendar should read like
    // a scheduled program, not like the generic allowed-pool template that
    // suggested it. Put episode/season clues first because that is what matters
    // when Tod is recreating a known schedule.
    if (hasSelectedCandidateProgram(item)) {
      const bits = [];
      if (item.selectedProgramNola) bits.push(item.selectedProgramNola);
      const episodeNumber = selectedProgramEpisodeNumber(item);
      if (episodeNumber) bits.push(`Ep ${episodeNumber}`);
      return bits.join(' · ') || 'manual pick';
    }

    const bits = [];
    if (item.lengthMinutes) bits.push(`${item.lengthMinutes}m`);
    if (item.purposeLabel) bits.push(item.purposeLabel);
    if (item.fillStrategy && item.fillStrategy !== 'single') bits.push(fillStrategyLabel(item.fillStrategy));
    if (item.slotBehavior === 'required_rotation') bits.push(item.poolName ? `pool: ${item.poolName}` : 'pool rule');
    if (item.selectedProgramNola) bits.push(item.selectedProgramNola);
    if (item.status === 'pbs') bits.push('locked');
    if (item.status === 'override') bits.push('temporary');
    return bits.join(' · ') || 'Template';
  }

  function resolveDayContext(date, selectedMinutes, channel) {
    const items = resolvedItemsForDay(date, channel).sort((a, b) => a.startMinutes - b.startMinutes || b.lengthMinutes - a.lengthMinutes || plannerItemPriority(b) - plannerItemPriority(a));
    const current = findCurrentItem(items, selectedMinutes) || emptyItem(selectedMinutes);
    const currentStart = current.kind === 'empty' ? selectedMinutes : current.startMinutes;
    const currentEnd = current.kind === 'empty' ? selectedMinutes + STEP : current.startMinutes + current.lengthMinutes;
    const previous = [...items].reverse().find((item) => !samePlannerItem(item, current) && item.startMinutes + item.lengthMinutes <= currentStart);
    const next = items.find((item) => !samePlannerItem(item, current) && item.startMinutes >= currentEnd);
    return { previous, current, next };
  }

  function findCurrentItem(items, minutes) {
    return items.find((item) => minutes >= item.startMinutes && minutes < item.startMinutes + item.lengthMinutes) || null;
  }

  function samePlannerItem(a, b) {
    if (!a || !b || a.kind === 'empty' || b.kind === 'empty') return false;
    if (a.id && b.id) return String(a.id) === String(b.id);
    return a.kind === b.kind && a.startMinutes === b.startMinutes && a.lengthMinutes === b.lengthMinutes && text(a.title) === text(b.title);
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
      // Templates are standing weekday/time rules. Do not constrain them by
      // retired active_start/end fields; only overrides are date-specific.
      .filter((item) => item.channel === channel && Number(item.dayOfWeek) === dow)
      .filter((item) => !overriddenKeys.has(`${item.id}|${item.startMinutes}`) && !overriddenKeys.has(`${item.startMinutes}`))
      .map((item) => normalizePlannerItem(item, 'template'));
    // Overrides must win over templates at the same day/time. This matters
    // after clicking a candidate: the manual pick should replace the generic
    // allowed-pool template in the visible calendar cell immediately.
    return [...overrideItems, ...templateItems];
  }

  function plannerItemPriority(item) {
    if (!item) return 0;
    if (item.kind === 'override' || item.status === 'override') return 3;
    if (item.kind === 'template') return 2;
    return 1;
  }

  function normalizePlannerItem(raw, kind) {
    const pbs = Boolean(raw.isPbsFeed || raw.purpose === 'pbs_feed');
    const override = kind === 'override';
    const rotation = !pbs && (raw.slotBehavior === 'required_rotation' || raw.requiredPoolId);
    const status = override ? 'override' : (pbs ? 'pbs' : (rotation ? 'rotation' : purposeStatus(raw.purpose)));
    const selectedProgram = findSelectedProgramForPlannerItem(raw);
    const selectedTitle = text(raw.selectedProgramTitle || raw.selected_program_title || (selectedProgram ? scheduledProgramTitle(selectedProgram) : ''));
    const selectedNola = text(raw.selectedProgramNola || raw.selected_program_nola || (selectedProgram ? programNola(selectedProgram) : ''));
    const selectedEpisode = text(raw.selectedProgramEpisode || raw.selected_program_episode || (selectedProgram ? programScheduleEpisodeLine(selectedProgram) : plannerItemEpisodeLine(raw)));
    const hasSelected = Boolean(selectedTitle || selectedNola || raw.overrideReason === 'candidate_pick');
    return {
      ...raw,
      kind,
      id: raw.id || raw.dbId || newId(),
      status,
      slotBehavior: rotation ? 'required_rotation' : (raw.slotBehavior || 'open_search'),
      poolName: poolLabel(raw.requiredPoolId),
      selectedProgramTitle: selectedTitle || raw.selectedProgramTitle || '',
      selectedProgramNola: selectedNola || raw.selectedProgramNola || '',
      selectedProgramEpisode: selectedEpisode,
      title: selectedTitle || raw.titleTopic || raw.title || purposeLabel(raw.purpose),
      purposeLabel: hasSelected ? 'Manual pick' : (rotation ? 'Allowed pool' : purposeLabel(raw.purpose)),
      startMinutes: Number(raw.startMinutes || 0),
      lengthMinutes: Number(raw.lengthMinutes || STEP),
      programmable: override ? true : (!pbs && raw.purpose !== 'hold' && raw.purpose !== 'fundraiser')
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
        <h3>Create database-backed test template</h3>
        <p class="small-note">Saved to Supabase table <strong>${TEMPLATE_TABLE}</strong> or <strong>${OVERRIDE_TABLE}</strong>. Library program records and aired-history fields are not changed.</p>
        <div class="form-grid">
          <label>Applies to
            <select name="scope">
              <option value="weekly">Selected weekdays every week</option>
              <option value="date">This date only as temporary override</option>
            </select>
          </label>
          <label>Length minutes
            <select name="lengthMinutes">${lengthOptions(60)}</select>
          </label>
          <label>Purpose
            <select name="purpose">
              <option value="standalone" selected>Program</option>
              <option value="series">Series</option>
              <option value="pbs_feed">PBS Feed</option>
            </select>
          </label>
          <label>Fill structure
            <select name="fillStrategy">
              <option value="single">Single program only</option>
              <option value="single_or_two">Multiple programs allowed</option>
            </select>
          </label>
          <div class="span-4">
            <div class="field-label">Weekdays for recurring template</div>
            <div class="weekday-picker">
              ${weekdayCheckboxes(date.getDay())}
            </div>
            <div class="small-note">Use this for standing schedule rules. The template applies every week to each checked weekday at this selected time; only overrides are date-specific.</div>
          </div>
          <label class="span-2">Template/group name
            <input name="templateGroupName" type="text" placeholder="Weekday Cooking, Wai Lana Yoga, Sit and Be Fit, PBS News, etc." />
          </label>
          <label>Candidate mode
            <select name="slotBehavior">
              <option value="open_search">Open search</option>
              <option value="required_rotation">Allowed NOLA/topic pool</option>
            </select>
          </label>
          <label>Existing pool
            <select name="requiredPoolId">${poolOptions('')}</select>
          </label>
          ${poolRuleBuilderMarkup([])}
          <label class="check-row span-2"><input name="avoidBackToBack" type="checkbox" checked /> Avoid same season back-to-back</label>
          <label>Repeat gap days
            <input name="repeatGapDays" type="number" min="0" max="365" step="1" value="120" />
          </label>
          <label>Rights urgency
            <select name="rightsUrgencyMonths">
              <option value="0">Off</option>
              <option value="3">Rights end in 3 months</option>
              <option value="6" selected>Rights end in 6 months</option>
              <option value="12">Rights end in 12 months</option>
            </select>
          </label>
          <label>Series episode min
            <input name="episodeMin" type="number" min="1" step="1" placeholder="optional" />
          </label>
          <label>Series episode max
            <input name="episodeMax" type="number" min="1" step="1" placeholder="optional" />
          </label>
          <input name="freshnessMonths" type="hidden" value="0" />
          <input name="ratingMode" type="hidden" value="boost" />
          <label>Minimum rating
            <select name="ratingMin">${ratingMinimumOptions('')}</select>
          </label>
          ${priorityPanelMarkup({})}
          <div class="span-4 special-rule-panel">
            <div class="field-label">Special / event / holiday behavior</div>
            <div class="small-note">Use this for holiday-aware slots, fundraiser windows, staff-off periods, local seasonal fall-throughs, or other date-sensitive behavior. Normal weekly templates can stay at None.</div>
            <div class="special-rule-grid">
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
              <label class="span-2">Notes / special handling notes
                <textarea name="notes" rows="2" placeholder="PBS feed name, fundraiser notes, staff-off holiday notes, local-season fall-through notes, etc."></textarea>
              </label>
            </div>
          </div>
        </div>
        <div class="action-row">
          <button type="submit" class="primary">Save recurring template</button>
        </div>
      </form>
    `;
  }


  function poolRuleBuilderMarkup(initialRules = []) {
    const initial = escapeHtml(JSON.stringify(normalizePoolRules(initialRules)));
    return `
          <div class="span-4 pool-rule-builder" data-pool-rule-builder>
            <div class="field-label">Allowed NOLA/programs and topics</div>
            <input name="poolRulesJson" type="hidden" value="${initial}" data-pool-rules-json />
            <input name="poolSelectedProgramId" type="hidden" />
            <input name="poolSelectedProgramTitle" type="hidden" />
            <input name="poolSelectedProgramNola" type="hidden" />
            <div class="pool-rule-grid">
              <label>NOLA / program
                <input name="poolNolaText" type="text" placeholder="Type 2+ NOLA chars, then pick or add" autocomplete="off" data-pool-nola-input />
              </label>
              <button type="button" data-add-nola-rule>Add NOLA/program</button>
              <label>Topic
                <select name="poolTopicSelect" data-pool-topic-select>
                  <option value="">Choose a primary Library topic…</option>
                  ${topicOptions('')}
                </select>
              </label>
              <button type="button" data-add-topic-rule>Add topic</button>
            </div>
            <div class="nola-match-results" data-pool-nola-results></div>
            <div class="pool-rule-list" data-pool-rule-list></div>
            <div class="small-note">You can add more than one NOLA/program and more than one primary topic. Candidate search treats this as an allowed pool: a program may match any listed NOLA/program or topic.</div>
          </div>
    `;
  }

  function topicOptions(current) {
    const topics = availableLibraryTopics();
    return topics.map((topic) => `<option value="${escapeHtml(topic)}"${topic === current ? ' selected' : ''}>${escapeHtml(topic)}</option>`).join('\n\n');
  }

  function availableLibraryTopics() {
    const set = new Set();
    state.programs.forEach((program) => {
      if (isArchivedProgram(program)) return;
      primaryProgramTopicValues(program).forEach((topic) => set.add(topic));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function splitTopicValues(value) {
    return text(value)
      .split(/[;,|]/)
      .map((topic) => topic.trim())
      .filter((topic) => topic.length > 1 && topic.length <= 80);
  }

  function poolRulesForSlot(slot) {
    const items = poolItemsForPool(slot?.requiredPoolId);
    if (items.length) return items.map(poolRuleFromItem).filter(Boolean);
    const nola = poolNolaTextForSlot(slot);
    const label = poolMatchTextForSlot(slot);
    if (nola) return [{ type: 'nola', nola, title: label || nola, label: label || nola }];
    return [];
  }

  function poolRuleFromItem(item) {
    if (!item) return null;
    const topic = topicFromPoolItem(item);
    if (topic) return { type: 'topic', topic, label: `Topic: ${topic}` };
    const nola = text(item.nolaMatchText);
    if (nola) return {
      type: 'nola',
      nola,
      programId: text(item.programRecordId),
      title: text(item.programTitle || item.itemLabel || item.titleMatchText),
      label: text(item.itemLabel || item.programTitle || item.titleMatchText || nola)
    };
    const title = text(item.titleMatchText || item.programTitle || item.itemLabel);
    return title ? { type: 'text', title, label: text(item.itemLabel || title) } : null;
  }

  function topicFromPoolItem(item) {
    const raw = text(item?.titleMatchText || item?.itemLabel);
    const match = raw.match(/^topic\s*:\s*(.+)$/i);
    return match ? text(match[1]) : '';
  }

  function normalizePoolRules(rules) {
    const out = [];
    const seen = new Set();
    (Array.isArray(rules) ? rules : []).forEach((rule) => {
      const type = ['topic', 'nola', 'text'].includes(rule?.type) ? rule.type : (rule?.topic ? 'topic' : (rule?.nola ? 'nola' : 'text'));
      const cleaned = {
        type,
        nola: text(rule?.nola),
        topic: text(rule?.topic),
        title: text(rule?.title),
        programId: text(rule?.programId),
        label: text(rule?.label)
      };
      if (cleaned.type === 'topic') {
        if (!cleaned.topic) return;
        cleaned.label = cleaned.label || `Topic: ${cleaned.topic}`;
      } else if (cleaned.type === 'nola') {
        cleaned.nola = normalizeNola(cleaned.nola).toUpperCase();
        if (!cleaned.nola || cleaned.nola.length < 2) return;
        cleaned.label = cleaned.label || cleaned.title || cleaned.nola;
      } else {
        if (!cleaned.title) return;
        cleaned.label = cleaned.label || cleaned.title;
      }
      const key = `${cleaned.type}:${cleaned.type === 'topic' ? cleaned.topic.toLowerCase() : cleaned.type === 'nola' ? cleaned.nola.toLowerCase() : cleaned.title.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(cleaned);
    });
    return out;
  }

  function parsePoolRulesFromFormData(data) {
    let rules = [];
    try {
      const parsed = JSON.parse(text(data.poolRulesJson) || '[]');
      if (Array.isArray(parsed)) rules = parsed;
    } catch {
      rules = [];
    }
    const selectedNola = poolNolaFromForm(data);
    const rawNola = text(data.poolNolaText);
    const selectedProgramId = text(data.poolSelectedProgramId);
    const selectedTitle = text(data.poolSelectedProgramTitle);
    if (selectedNola || rawNola) {
      rules.push({ type: 'nola', nola: selectedNola || rawNola, programId: selectedProgramId, title: selectedTitle, label: selectedTitle || selectedNola || rawNola });
    }
    return normalizePoolRules(rules);
  }

  function weekdayCheckboxes(selectedDay) {
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, index) => `
      <label class="weekday-check"><input type="checkbox" name="weekdays" value="${index}"${index === selectedDay ? ' checked' : ''} /> ${label}</label>
    `).join('\n\n');
  }


  function editWeekdayCheckboxes(current) {
    const activeDays = templateSiblingDays(current);
    activeDays.add(Number(current?.dayOfWeek ?? 0));
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, index) => `
      <label class="weekday-check"><input type="checkbox" name="weekdays" value="${index}"${activeDays.has(index) ? ' checked' : ''} /> ${label}</label>
    `).join('\n\n');
  }

  function templateSiblingDays(current) {
    const days = new Set();
    matchingTemplateSiblings(current).forEach((item) => {
      const day = Number(item.dayOfWeek);
      if (Number.isInteger(day) && day >= 0 && day <= 6) days.add(day);
    });
    return days;
  }

  function matchingTemplateSiblings(current) {
    if (!current) return [];
    return state.templates.filter((item) => sameTemplateFamily(item, current));
  }

  function sameTemplateFamily(a, b) {
    if (!a || !b) return false;
    const norm = (value) => text(value).toLowerCase();
    const channelA = text(a.channel || state.channel);
    const channelB = text(b.channel || state.channel);
    const groupA = norm(a.templateGroupName);
    const groupB = norm(b.templateGroupName);
    const titleA = norm(a.titleTopic || a.title);
    const titleB = norm(b.titleTopic || b.title);

    if (channelA !== channelB) return false;
    if (Number(a.startMinutes) !== Number(b.startMinutes)) return false;
    if (Number(a.lengthMinutes) !== Number(b.lengthMinutes)) return false;
    // Template start/end dates were retired. A recurring template family is
    // defined by its weekday/time rule, not by date-range fields that may
    // linger on older test rows.

    if (groupA || groupB) {
      if (groupA !== groupB) return false;
    } else if (titleA !== titleB) {
      return false;
    }

    if (text(a.purpose) !== text(b.purpose)) return false;
    if (text(a.fillStrategy) !== text(b.fillStrategy)) return false;
    // Series pattern is inferred from the checked weekdays. Do not use it to
    // split a recurring template family, or one field can fight another and
    // prevent M-F edits/cascades from behaving like one standing rule.
    if (text(a.slotBehavior || 'open_search') !== text(b.slotBehavior || 'open_search')) return false;
    if (text(a.requiredPoolId) !== text(b.requiredPoolId)) return false;
    return true;
  }

  function existingSlotMarkup(current, iso, flags) {
    const isPbs = flags.isPbs;
    const isOverride = flags.isOverride;
    const canFind = current.programmable || isOverride;
    return `
      <section class="candidate-section">
        <h3>Slot actions</h3>
        <p><strong>${escapeHtml(current.title || 'Slot')}</strong></p>
        <p class="small-note">${escapeHtml(itemMeta(current))}${current.templateGroupName ? ` · ${escapeHtml(current.templateGroupName)}` : ''}</p>
        <div class="action-row" style="justify-content:start;">
          ${canFind ? '<button type="button" id="findCandidatesBtn" class="primary">Preview matching programs</button>' : ''}
          ${isPbs ? '<button type="button" id="overridePbsBtn" class="primary">Override this date</button>' : ''}
          ${isOverride ? '<button type="button" id="removeOverrideBtn">Restore template/PBS feed</button>' : ''}
          ${current.kind === 'template' ? '<button type="button" id="editTemplateBtn">Edit template</button>' : ''}
          ${current.kind === 'template' ? '<button type="button" id="deleteTemplateBtn" class="danger">Delete template</button>' : ''}
        </div>
        ${!canFind && isPbs ? '<p class="small-note">PBS feed slots are ignored by the helper until you override them.</p>' : ''}
      </section>
    `;
  }

  function bindSlotModalEvents(context, iso) {
    const form = document.getElementById('slotTemplateForm');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      void saveTemplateFromForm(form, iso);
    });
    if (form) { bindPoolNolaSearch(form); bindPoolRuleBuilder(form); bindTemplateFormHelpers(form); }
    document.getElementById('findCandidatesBtn')?.addEventListener('click', () => renderCandidatePreview(context.current, iso));
    document.getElementById('overridePbsBtn')?.addEventListener('click', () => { void createPbsOverride(context.current, iso); });
    document.getElementById('removeOverrideBtn')?.addEventListener('click', () => { void removeOverride(context.current); });
    document.getElementById('editTemplateBtn')?.addEventListener('click', () => renderEditTemplateForm(context.current, iso));
    document.getElementById('deleteTemplateBtn')?.addEventListener('click', () => { void deleteTemplate(context.current); });
  }

  function bindTemplateFormHelpers(form) {
    const purpose = form.elements.purpose;
    const repeat = form.elements.repeatGapDays;
    if (!purpose || !repeat) return;
    repeat.addEventListener('input', () => { repeat.dataset.userEdited = 'true'; });
    purpose.addEventListener('change', () => {
      if (repeat.dataset.userEdited === 'true') return;
      repeat.value = String(defaultRepeatGapDays(purpose.value));
    });
  }

  function defaultRepeatGapDays(purpose) {
    return purpose === 'series' ? 24 : 120;
  }

  function inferSeriesPattern(purpose, selectedDays = []) {
    if (purpose !== 'series') return 'none';
    const uniqueDays = [...new Set((selectedDays || []).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
    return uniqueDays.length > 1 ? 'consecutive_across_days' : 'weekly_one_day';
  }

  function bindPoolNolaSearch(form) {
    const input = form.querySelector('[data-pool-nola-input]');
    const results = form.querySelector('[data-pool-nola-results]');
    if (!input || !results) return;
    const hiddenId = form.elements.poolSelectedProgramId;
    const hiddenTitle = form.elements.poolSelectedProgramTitle;
    const hiddenNola = form.elements.poolSelectedProgramNola;

    const renderForValue = () => {
      if (hiddenId) hiddenId.value = '';
      if (hiddenTitle) hiddenTitle.value = '';
      if (hiddenNola) hiddenNola.value = '';
      renderNolaMatchResults(input.value, results);
    };

    input.addEventListener('input', renderForValue);
    input.addEventListener('focus', () => renderNolaMatchResults(input.value, results));
    results.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pool-program-id]');
      if (!button) return;
      const program = findProgramByStableId(button.dataset.poolProgramId);
      if (!program) return;
      const title = programTitle(program);
      const nola = programNola(program);
      if (input) input.value = nola;
      if (hiddenId) hiddenId.value = programStableId(program);
      if (hiddenTitle) hiddenTitle.value = title;
      if (hiddenNola) hiddenNola.value = nola;
      results.innerHTML = `<div class="nola-match-empty">Selected: <strong>${escapeHtml(title)}</strong>${nola ? ` · ${escapeHtml(nola)}` : ''}</div>`;
      const poolNameInput = form.elements.poolName;
      if (poolNameInput && !text(poolNameInput.value)) poolNameInput.value = title;
    });
  }


  function bindPoolRuleBuilder(form) {
    const hidden = form.querySelector('[data-pool-rules-json]');
    const list = form.querySelector('[data-pool-rule-list]');
    if (!hidden || !list) return;
    const nolaInput = form.querySelector('[data-pool-nola-input]');
    const topicSelect = form.querySelector('[data-pool-topic-select]');
    const hiddenId = form.elements.poolSelectedProgramId;
    const hiddenTitle = form.elements.poolSelectedProgramTitle;
    const hiddenNola = form.elements.poolSelectedProgramNola;
    let rules = readPoolRulesHidden(hidden);

    const sync = () => {
      rules = normalizePoolRules(rules);
      hidden.value = JSON.stringify(rules);
      if (!rules.length) {
        list.innerHTML = '<div class="pool-rule-empty">No NOLA/programs or topics added yet.</div>';
        return;
      }
      list.innerHTML = rules.map((rule, index) => {
        const label = rule.type === 'topic' ? `Topic: ${rule.topic}` : (rule.label || rule.title || rule.nola);
        const prefix = rule.type === 'topic' ? 'Topic' : rule.type === 'nola' ? 'NOLA' : 'Text';
        return `<span class="pool-rule-chip"><strong>${escapeHtml(prefix)}</strong> ${escapeHtml(label)} <button type="button" class="pool-rule-remove" data-remove-pool-rule="${index}" title="Remove">×</button></span>`;
      }).join('\n\n');
    };

    list.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-remove-pool-rule]');
      if (!btn) return;
      const index = Number(btn.dataset.removePoolRule);
      rules.splice(index, 1);
      sync();
    });

    form.querySelector('[data-add-nola-rule]')?.addEventListener('click', () => {
      const nola = text(hiddenNola?.value || nolaInput?.value || '');
      if (!nola || normalizeNola(nola).length < 2) {
        alert('Type at least 2 NOLA characters or choose a program match first.');
        return;
      }
      const title = text(hiddenTitle?.value || '');
      rules.push({ type: 'nola', nola, title, programId: text(hiddenId?.value || ''), label: title ? `${title} · ${nola}` : nola });
      if (nolaInput) nolaInput.value = '';
      if (hiddenId) hiddenId.value = '';
      if (hiddenTitle) hiddenTitle.value = '';
      if (hiddenNola) hiddenNola.value = '';
      const results = form.querySelector('[data-pool-nola-results]');
      if (results) results.innerHTML = '';
      sync();
    });

    form.querySelector('[data-add-topic-rule]')?.addEventListener('click', () => {
      const topic = text(topicSelect?.value || '');
      if (!topic) {
        alert('Choose a topic first.');
        return;
      }
      rules.push({ type: 'topic', topic, label: `Topic: ${topic}` });
      if (topicSelect) topicSelect.value = '';
      sync();
    });

    form.elements.requiredPoolId?.addEventListener('change', () => {
      const poolId = text(form.elements.requiredPoolId.value);
      if (!poolId) return;
      rules = poolItemsForPool(poolId).map(poolRuleFromItem).filter(Boolean);
      sync();
    });

    sync();
  }

  function readPoolRulesHidden(hidden) {
    try {
      const parsed = JSON.parse(hidden.value || '[]');
      return normalizePoolRules(parsed);
    } catch {
      return [];
    }
  }

  function renderNolaMatchResults(rawQuery, results) {
    const query = normalizeNola(rawQuery);
    if (!query || query.length < 2) {
      results.innerHTML = '<div class="nola-match-empty">Type at least 2 NOLA characters to search all loaded Library programs.</div>';
      return;
    }
    const matches = findNolaMatches(query).slice(0, 20);
    if (!matches.length) {
      results.innerHTML = `<div class="nola-match-empty">No NOLA matches found in ${state.programs.length.toLocaleString()} loaded Library program records.</div>`;
      return;
    }
    results.innerHTML = `
      <div class="nola-match-list">
        ${matches.map(({ program }) => {
          const title = programTitle(program);
          const nola = programNola(program);
          const id = programStableId(program);
          const meta = [nola || 'No NOLA', parseLength(program.length_minutes) ? `${parseLength(program.length_minutes)}m` : '', program.program_type, program.rights_end ? `rights end ${normalizeDateish(program.rights_end) || program.rights_end}` : ''].filter(Boolean).join(' · ');
          return `<button type="button" class="nola-match-option" data-pool-program-id="${escapeHtml(id)}"><span><span class="nola-match-title">${escapeHtml(title)}</span><span class="nola-match-meta">${escapeHtml(meta)}</span></span><span class="nola-chip">${escapeHtml(nola || 'pick')}</span></button>`;
        }).join('\n\n')}
      </div>
    `;
  }

  function findNolaMatches(query) {
    const seen = new Set();
    return state.programs
      .map((program) => {
        const values = programNolaValues(program);
        const normalizedValues = values.map(normalizeNola).filter(Boolean);
        if (!normalizedValues.length) return null;
        const starts = normalizedValues.some((nola) => nola.startsWith(query));
        const includes = !starts && normalizedValues.some((nola) => nola.includes(query));
        if (!starts && !includes) return null;
        const id = programStableId(program);
        if (seen.has(id)) return null;
        seen.add(id);
        if (isArchivedProgram(program)) return null;
        const activeBonus = 0;
        const bestLength = Math.max(...normalizedValues.filter((nola) => nola.includes(query)).map((nola) => nola.length), query.length);
        return { program, score: (starts ? 70 : 25) + Math.min(bestLength, 16) + activeBonus };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || programNola(a.program).localeCompare(programNola(b.program)) || programTitle(a.program).localeCompare(programTitle(b.program)));
  }

  function findProgramByStableId(id) {
    const needle = text(id);
    return state.programs.find((program) => programRecordIds(program).has(needle)) || null;
  }

  function programStableId(program) {
    return text(program.id || program.program_id || program.record_id || program.nola_eidr || program.nola_code || program.nola || program.legacy_code || program.slug);
  }

  async function saveTemplateFromForm(form, iso) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const weekdays = formData.getAll('weekdays').map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    const date = fromIsoDate(iso);
    const base = plannerItemFromFormData(data, iso, weekdays);
    try {
      await attachPoolToPlannerItem(base, data);
      if (data.scope === 'date' || data.scope === 'range') {
        const start = data.scope === 'range' ? (data.startDate || iso) : iso;
        const end = data.scope === 'range' ? (data.endDate || start) : iso;
        const payload = overrideToDb({ ...base, startDate: start, endDate: end, channel: state.channel, overrideReason: data.scope === 'range' ? 'date_range' : 'one_date' });
        const { data: rows, error } = await state.supabase.from(OVERRIDE_TABLE).insert(payload).select('*').single();
        if (error) throw error;
        state.overrides.push(overrideFromDb(rows));
      } else {
        const selectedDays = weekdays.length ? weekdays : [date.getDay()];
        const rows = selectedDays.map((day) => templateToDb({ ...base, dayOfWeek: day, channel: state.channel }));
        const { data: inserted, error } = await state.supabase.from(TEMPLATE_TABLE).insert(rows).select('*');
        if (error) throw error;
        state.templates.push(...(inserted || []).map(templateFromDb));
      }
      closeModal();
      render();
      const savedKind = (data.scope === 'date' || data.scope === 'range') ? 'date-specific override' : 'recurring weekly template rule';
      updateSummary(`Saved ${savedKind} to Supabase scheduler test tables.`);
    } catch (error) {
      console.error(error);
      alert(`Planner save failed: ${error.message}`);
      updateSummary(`Planner save failed: ${error.message}`);
    }
  }

  function plannerItemFromFormData(data, iso, selectedDays = []) {
    const purpose = data.purpose || 'standalone';
    const groupName = text(data.templateGroupName || data.titleTopic || purposeLabel(purpose));
    return {
      startMinutes: state.selectedMinutes,
      lengthMinutes: saneLengthMinutes(data.lengthMinutes, 60),
      purpose,
      isPbsFeed: purpose === 'pbs_feed',
      titleTopic: groupName,
      fillStrategy: data.fillStrategy || 'single',
      seriesPattern: inferSeriesPattern(purpose, selectedDays),
      templateGroupName: groupName,
      episodeMin: saneNullableNumber(data.episodeMin),
      episodeMax: saneNullableNumber(data.episodeMax),
      ratingMode: 'boost',
      ratingMin: saneNullableNumber(data.ratingMin),
      freshnessMonths: 0,
      ...priorityFieldsFromData(data),
      eventMode: data.eventMode || 'none',
      eventWindowDays: saneNumber(data.eventWindowDays, 5),
      slotBehavior: data.slotBehavior || 'open_search',
      requiredPoolId: text(data.requiredPoolId),
      avoidBackToBack: data.avoidBackToBack === 'on' || data.avoidBackToBack === true,
      repeatGapDays: saneNumber(data.repeatGapDays, defaultRepeatGapDays(purpose)),
      rightsUrgencyMonths: saneNumber(data.rightsUrgencyMonths, 0),
      startDate: '',
      endDate: '',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
  }

  async function createPbsOverride(current, iso) {
    const override = {
      ...current,
      id: '',
      kind: 'override',
      status: 'override',
      isPbsFeed: false,
      pbsWasOverridden: true,
      overrideTemplateId: current.id || '',
      overrideReason: 'pbs_temporary_override',
      purpose: current.lengthMinutes === 60 ? 'flex' : 'standalone',
      fillStrategy: current.lengthMinutes === 60 ? 'single_or_two' : 'single',
      slotBehavior: 'open_search',
      requiredPoolId: '',
      avoidBackToBack: false,
      repeatGapDays: 0,
      rightsUrgencyMonths: 0,
      titleTopic: `Local override for ${current.title || 'PBS feed'}`,
      programmable: true,
      startDate: iso,
      endDate: iso,
      notes: `Original PBS feed: ${current.title || current.titleTopic || ''}`.trim(),
      createdAt: new Date().toISOString()
    };
    try {
      const { data, error } = await state.supabase.from(OVERRIDE_TABLE).insert(overrideToDb(override)).select('*').single();
      if (error) throw error;
      state.overrides.push(overrideFromDb(data));
      closeModal();
      render();
      updateSummary('Created temporary PBS override in scheduler test table.');
    } catch (error) {
      console.error(error);
      alert(`PBS override failed: ${error.message}`);
      updateSummary(`PBS override failed: ${error.message}`);
    }
  }

  async function removeOverride(current) {
    if (!current?.id) return;
    try {
      const { error } = await state.supabase.from(OVERRIDE_TABLE).delete().eq('id', current.id);
      if (error) throw error;
      state.overrides = state.overrides.filter((item) => String(item.id) !== String(current.id));
      closeModal();
      render();
      updateSummary('Removed planner override and restored the underlying template/PBS feed.');
    } catch (error) {
      console.error(error);
      alert(`Remove override failed: ${error.message}`);
      updateSummary(`Remove override failed: ${error.message}`);
    }
  }

  function renderEditTemplateForm(current, iso) {
    const body = document.getElementById('slotModalBody');
    if (!body || !current?.id) return;
    body.innerHTML = `
      <form id="editTemplateForm" class="candidate-section">
        <h3>Edit scheduler test template</h3>
        <p class="small-note">This edits Supabase table <strong>${TEMPLATE_TABLE}</strong> only. It does not alter Library program records.</p>
        <div class="form-grid">
          <label>Length minutes<select name="lengthMinutes">${lengthOptions(current.lengthMinutes)}</select></label>
          <label>Purpose
            <select name="purpose">${purposeOptions(current.purpose)}</select>
          </label>
          <label>Fill structure
            <select name="fillStrategy">${fillOptions(current.fillStrategy)}</select>
          </label>
          <div class="span-4">
            <div class="field-label">Apply same template edit to weekdays</div>
            <div class="weekday-picker">
              ${editWeekdayCheckboxes(current)}
            </div>
            <div class="small-note">Checked days define where this recurring template applies. Matching unchecked weekday rows are removed; date-specific overrides are left alone.</div>
          </div>
          <label class="span-2">Template/group name<input name="templateGroupName" type="text" value="${escapeHtml(current.templateGroupName || current.titleTopic || current.title || '')}" /></label>
          <label>Candidate mode<select name="slotBehavior"><option value="open_search"${current.slotBehavior!=='required_rotation'?' selected':''}>Open search</option><option value="required_rotation"${current.slotBehavior==='required_rotation'?' selected':''}>Allowed NOLA/topic pool</option></select></label>
          <label>Existing pool<select name="requiredPoolId">${poolOptions(current.requiredPoolId || '')}</select></label>
          ${poolRuleBuilderMarkup(poolRulesForSlot(current))}
          <label class="check-row span-2"><input name="avoidBackToBack" type="checkbox"${current.avoidBackToBack !== false ? ' checked' : ''} /> Avoid same season back-to-back</label>
          <label>Repeat gap days<input name="repeatGapDays" type="number" min="0" max="365" step="1" value="${escapeHtml(Number(current.repeatGapDays) || defaultRepeatGapDays(current.purpose))}" /></label>
          <label>Rights urgency<select name="rightsUrgencyMonths"><option value="0"${!Number(current.rightsUrgencyMonths)?' selected':''}>Off</option><option value="3"${Number(current.rightsUrgencyMonths)===3?' selected':''}>Rights end in 3 months</option><option value="6"${Number(current.rightsUrgencyMonths)===6?' selected':''}>Rights end in 6 months</option><option value="12"${Number(current.rightsUrgencyMonths)===12?' selected':''}>Rights end in 12 months</option></select></label>
          <label>Series episode min<input name="episodeMin" type="number" min="1" step="1" value="${escapeHtml(current.episodeMin || '')}" /></label>
          <label>Series episode max<input name="episodeMax" type="number" min="1" step="1" value="${escapeHtml(current.episodeMax || '')}" /></label>
          <input name="freshnessMonths" type="hidden" value="0" />
          <input name="ratingMode" type="hidden" value="boost" />
          <label>Minimum rating<select name="ratingMin">${ratingMinimumOptions(current.ratingMin)}</select></label>
          ${priorityPanelMarkup(current)}
          <div class="span-4 special-rule-panel">
            <div class="field-label">Special / event / holiday behavior</div>
            <div class="small-note">Use this for holiday-aware slots, fundraiser windows, staff-off periods, local seasonal fall-throughs, or other date-sensitive behavior. Normal weekly templates can stay at None.</div>
            <div class="special-rule-grid">
              <label>Holiday/event match<select name="eventMode"><option value="none">None</option><option value="prefer"${current.eventMode==='prefer'?' selected':''}>Prefer nearby event</option><option value="require"${current.eventMode==='require'?' selected':''}>Require nearby event</option></select></label>
              <label>Event window days<input name="eventWindowDays" type="number" min="0" max="30" step="1" value="${escapeHtml(current.eventWindowDays || 5)}" /></label>
              <label class="span-2">Notes / special handling notes<textarea name="notes" rows="2">${escapeHtml(current.notes || '')}</textarea></label>
            </div>
          </div>
        </div>
        <div class="action-row"><button type="submit" class="primary">Save recurring template edits</button></div>
      </form>
    `;
    const editForm = document.getElementById('editTemplateForm');
    editForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      void saveTemplateEdit(event.currentTarget, current, iso);
    });
    if (editForm) { bindPoolNolaSearch(editForm); bindPoolRuleBuilder(editForm); bindTemplateFormHelpers(editForm); }
  }

  async function saveTemplateEdit(form, current, iso) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const selectedDays = [...new Set(formData.getAll('weekdays')
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
      .sort((a, b) => a - b);
    if (!selectedDays.length) {
      alert('Choose at least one weekday for this recurring template.');
      return;
    }

    const updatedBase = {
      ...current,
      ...plannerItemFromFormData(data, iso, selectedDays),
      dayOfWeek: Number(current.dayOfWeek),
      startMinutes: saneNumber(data.startMinutes, current.startMinutes),
      channel: current.channel || state.channel
    };

    try {
      await attachPoolToPlannerItem(updatedBase, data);
      const siblings = matchingTemplateSiblings(current);
      const savedRows = [];

      for (const day of selectedDays) {
        const existing = siblings.find((item) => Number(item.dayOfWeek) === day) || (Number(current.dayOfWeek) === day ? current : null);
        const itemForDay = { ...updatedBase, id: existing?.id || '', dayOfWeek: day, channel: current.channel || state.channel };

        if (existing?.id) {
          const { data: row, error } = await state.supabase
            .from(TEMPLATE_TABLE)
            .update(templateToDb(itemForDay))
            .eq('id', existing.id)
            .select('*')
            .single();
          if (error) throw error;
          savedRows.push(row);
        } else {
          const { data: row, error } = await state.supabase
            .from(TEMPLATE_TABLE)
            .insert(templateToDb(itemForDay))
            .select('*')
            .single();
          if (error) throw error;
          savedRows.push(row);
        }
      }

      const selectedDaySet = new Set(selectedDays.map(Number));
      const rowsToRemove = siblings.filter((item) => !selectedDaySet.has(Number(item.dayOfWeek)) && item.id);
      if (rowsToRemove.length) {
        const { error: deleteError } = await state.supabase
          .from(TEMPLATE_TABLE)
          .delete()
          .in('id', rowsToRemove.map((item) => item.id));
        if (deleteError) throw deleteError;
        const removeIds = new Set(rowsToRemove.map((item) => String(item.id)));
        state.templates = state.templates.filter((item) => !removeIds.has(String(item.id)));
      }

      savedRows.map(templateFromDb).forEach((saved) => upsertInMemory(state.templates, saved));
      closeModal();
      render();
      const removedCount = rowsToRemove.length;
      updateSummary(`Saved recurring template rule for ${selectedDays.length} weekday${selectedDays.length === 1 ? '' : 's'}${removedCount ? ` and removed ${removedCount} unchecked weekday row${removedCount === 1 ? '' : 's'}` : ''}.`);
    } catch (error) {
      console.error(error);
      alert(`Template edit failed: ${error.message}`);
      updateSummary(`Template edit failed: ${error.message}`);
    }
  }

  async function deleteTemplate(current) {
    if (!current?.id) return;
    if (!confirm('Delete this scheduler test template? Matching planner overrides for this template will also be removed. Library program data will not be touched.')) return;
    try {
      const { error } = await state.supabase.from(TEMPLATE_TABLE).delete().eq('id', current.id);
      if (error) throw error;
      state.templates = state.templates.filter((item) => String(item.id) !== String(current.id));
      state.overrides = state.overrides.filter((item) => String(item.overrideTemplateId || '') !== String(current.id));
      closeModal();
      render();
      updateSummary('Deleted scheduler test template.');
    } catch (error) {
      console.error(error);
      alert(`Delete template failed: ${error.message}`);
      updateSummary(`Delete template failed: ${error.message}`);
    }
  }

  function renderCandidatePreview(slot, iso) {
    const target = normalizePlannerItem({ ...slot, channel: state.channel }, slot.kind || 'template');
    if (target.status === 'pbs') return;
    target._rotationContext = resolveDayContext(fromIsoDate(iso), target.startMinutes, target.channel || state.channel);
    const candidates = rankCandidates(target, iso);
    const excluded = slotUsesAllowedPool(target) ? rankExcludedPoolCandidates(target, iso, candidates) : [];
    const preview = document.getElementById('candidatePreview');
    if (!preview) return;
    const isPoolConstrained = slotUsesAllowedPool(target);
    state.candidatePreview = { target, iso, singles: new Map(), pairs: new Map(), excluded: new Map() };
    const displayCandidates = candidates;
    const candidateMarkup = displayCandidates.map((entry, index) => {
      const key = candidateKey(entry.program, index);
      state.candidatePreview.singles.set(key, entry);
      return candidateCard(entry, key, target, iso);
    }).join('\n\n');
    const excludedMarkup = excluded.map((entry, index) => {
      const key = `excluded_${candidateKey(entry.program, index)}`;
      state.candidatePreview.excluded.set(key, entry);
      return excludedCandidateCard(entry, key);
    }).join('\n\n');
    const poolName = target.poolName || poolLabel(target.requiredPoolId) || 'not selected';
    const prioritySummary = `priorities: pool ${clampPriority(target.priorityPoolMatch, 5)} · rights ${clampPriority(target.priorityRightsUrgency, 4)} · rating ${clampPriority(target.priorityRating, 3)} · length ${clampPriority(target.priorityLengthFit, 2)} · repeat ${clampPriority(target.priorityRepeatGap, 4)} · event ${clampPriority(target.priorityEventMatch, 4)}`;
    preview.innerHTML = `
      <div class="candidate-grid candidate-grid--single">
        <section class="candidate-section">
          <h3>${isPoolConstrained ? 'Allowed candidate programs' : 'Best candidate programs'}</h3>
          ${isPoolConstrained ? `<p class="small-note">Pool: ${escapeHtml(poolName)} · repeat gap ${Number(target.repeatGapDays || 0)} days · rights urgency ${Number(target.rightsUrgencyMonths || 0)} months · ${candidates.length.toLocaleString()} eligible match${candidates.length === 1 ? '' : 'es'} · showing all · ${escapeHtml(prioritySummary)}</p>` : `<p class="small-note">${candidates.length.toLocaleString()} eligible match${candidates.length === 1 ? '' : 'es'} · showing all · ${escapeHtml(prioritySummary)}</p>`}
          ${candidateMarkup || `<p class="small-note">${isPoolConstrained ? 'No allowed pool/topic/NOLA matches found. Check the selected allowed items.' : 'No single-program matches found.'}</p>`}
        </section>
      </div>
      ${isPoolConstrained && excluded.length ? `
        <section class="candidate-section">
          <h3>Pool matches not currently eligible</h3>
          <p class="small-note">These match the allowed pool but were not recommended by helper rules such as repeat gap, rights, length, rating, or nearby scheduling. Use anyway is for recreating a known/existing schedule. Showing all ${excluded.length.toLocaleString()}.</p>
          <div class="excluded-candidate-list">${excludedMarkup}</div>
        </section>` : ''}
    `;
    bindCandidatePreviewEvents(preview);
  }

  function rankCandidates(slot, iso) {
    return state.programs
      .map((program) => scoreProgram(program, slot, iso))
      .filter((entry) => entry.ok)
      .sort((a, b) => b.score - a.score || text(programTitle(a.program)).localeCompare(text(programTitle(b.program))));
  }

  function slotUsesAllowedPool(slot) {
    if (!slot) return false;
    if (slot.slotBehavior === 'required_rotation') return true;
    const poolId = text(slot.requiredPoolId);
    if (!poolId) return false;
    return Boolean(getPool(poolId) || poolItemsForPool(poolId).length);
  }


  function rankExcludedPoolCandidates(slot, iso, includedCandidates) {
    if (!slotUsesAllowedPool(slot)) return [];
    const includedIds = new Set((includedCandidates || []).map((entry) => programStableId(entry.program)));
    return state.programs
      .map((program) => {
        const poolMatch = rotationPoolMatch(program, slot);
        if (!poolMatch.ok) return null;
        if (includedIds.has(programStableId(program))) return null;
        const scored = scoreProgram(program, slot, iso);
        if (scored.ok) return null;
        return { ...scored, poolLabel: poolMatch.label || 'pool match' };
      })
      .filter(Boolean)
      .sort((a, b) => text(programTitle(a.program)).localeCompare(text(programTitle(b.program))));
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
    const rating = normalizeRating(program.rating ?? program.program_rating ?? program.scheduler_rating ?? program.priority_rating ?? program.user_rating);
    const isSeries = looksLikeSeries(program);
    const rights = rightsStatus(program, iso, slot);
    const priorityPool = clampPriority(slot.priorityPoolMatch, 5);
    const priorityRights = clampPriority(slot.priorityRightsUrgency, 4);
    const priorityRating = clampPriority(slot.priorityRating, 3);
    const priorityLength = clampPriority(slot.priorityLengthFit, 2);
    const priorityRepeat = clampPriority(slot.priorityRepeatGap, 4);
    const priorityEvent = clampPriority(slot.priorityEventMatch, 4);
    let score = 0;

    if (isArchivedProgram(program)) return { ok: false, program, score: -999, why: ['archived/unavailable'] };

    const enforceAllowedPool = slotUsesAllowedPool(slot);
    if (enforceAllowedPool) {
      const poolMatch = rotationPoolMatch(program, slot);
      if (!poolMatch.ok) return { ok: false, program, length, score: -250, why: ['outside allowed pool/topic/NOLA'] };
      score += weightedScore(45 + poolMatch.score, priorityPool, 5);
      why.push(poolMatch.label ? `pool match: ${poolMatch.label}` : 'allowed pool match');
    }

    if (slot.lengthMinutes && length && length !== Number(slot.lengthMinutes)) {
      if (slot.slotBehavior === 'required_rotation') {
        score -= weightedScore(60, priorityLength, 2);
        warnings.push(`${length}m program in ${slot.lengthMinutes}m slot`);
      } else {
        return { ok: false, program, length, score: -200, why: ['wrong length'] };
      }
    }
    if (slot.lengthMinutes && !length) warnings.push('missing length');
    if (slot.purpose === 'series' && !isSeries && slot.slotBehavior !== 'required_rotation') return { ok: false, program, length, score: -200, why: ['not series'] };
    if (slot.purpose === 'series' && !isSeries && slot.slotBehavior === 'required_rotation') { score += weightedScore(4, priorityPool, 5); warnings.push('not marked as series'); }
    if (slot.slotBehavior !== 'required_rotation' && ['standalone', 'holiday', 'local'].includes(slot.purpose) && isSeries) return { ok: false, program, length, score: -120, why: ['series excluded'] };
    if (slot.slotBehavior === 'required_rotation' && isSeries) { score += weightedScore(8, priorityPool, 5); why.push('series allowed by pool rule'); }

    if (rights.expired) return { ok: false, program, length, score: -300, why: ['expired rights'] };
    if (rights.missing) warnings.push('missing rights end');
    else score += weightedScore(15, priorityRights, 4);

    if (slot.slotBehavior === 'required_rotation') {
      const gapDays = Number(slot.repeatGapDays || 0);
      if (gapDays) {
        const recent = daysSinceLastAired(program, state.channel, iso);
        if (recent != null && recent < gapDays) return { ok: false, program, length, score: -weightedScore(180, priorityRepeat, 4), why: [`aired ${recent} days ago`] };
      }
      const urgency = rightsUrgencyInfo(program, iso, Number(slot.rightsUrgencyMonths || 0));
      if (urgency.urgent) { score += weightedScore(55, priorityRights, 4); why.push(`rights end in ${urgency.monthsUntil} months`); }
      else if (Number(slot.rightsUrgencyMonths || 0) && !rights.missing) { score += weightedScore(5, priorityRights, 4); }
      if (slot.avoidBackToBack !== false && nearbyTitleConflict(program, slot._rotationContext)) {
        score -= weightedScore(35, priorityRepeat, 4);
        warnings.push('nearby same title/season');
      }
    }

    if (length === Number(slot.lengthMinutes)) { score += weightedScore(25, priorityLength, 2); why.push(`${length}m length match`); }
    if (isSeries) {
      const count = extractEpisodeCount(program);
      if (slot.episodeMin && count != null && count < Number(slot.episodeMin)) return { ok: false, program, length, score: -100, why: ['too few episodes'] };
      if (slot.episodeMax && count != null && count > Number(slot.episodeMax)) return { ok: false, program, length, score: -100, why: ['too many episodes'] };
      if (count) { score += weightedScore(8, priorityLength, 2); why.push(`${count} episodes`); }
    }

    const fresh = freshnessInfo(program, state.channel, iso);
    const freshnessMonths = Number(slot.freshnessMonths || 0);
    if (freshnessMonths && fresh.monthsSince != null && fresh.monthsSince < freshnessMonths) return { ok: false, program, length, score: -100, why: [`aired ${fresh.monthsSince} months ago`] };
    if (fresh.neverAired) { score += weightedScore(25, priorityRepeat, 4); why.push(`new to ${state.channel}`); }
    else if (fresh.monthsSince != null) { score += weightedScore(Math.min(20, Math.floor(fresh.monthsSince / 3)), priorityRepeat, 4); why.push(`last aired ${fresh.monthsSince} months ago`); }

    if (slot.ratingMode !== 'ignore') {
      if (slot.ratingMin && (!rating || rating < Number(slot.ratingMin))) return { ok: false, program, length, score: -100, why: ['below rating minimum'] };
      if (rating) { score += weightedScore(rating * 5, priorityRating, 3); why.push(`${rating}/5 rating`); }
      else { score -= weightedScore(3, priorityRating, 3); warnings.push('unrated'); }
    }

    const event = relevantEventForSlot(iso, slot);
    if (event) {
      const match = eventMatch(program, event, slot);
      if (slot.eventMode === 'require' && !match) return { ok: false, program, length, score: -100, why: ['no event match'] };
      if (match) { score += weightedScore(22, priorityEvent, 4); why.push(`event match: ${event.name}`); }
    }

    const label = text(slot.titleTopic).toLowerCase();
    if (label && label.length > 2 && text(program.title + ' ' + program.notes + ' ' + program.topic + ' ' + program.secondary_topic).toLowerCase().includes(label)) {
      score += weightedScore(10, priorityPool, 5);
      why.push(`matches ${slot.titleTopic}`);
    }

    return { ok: true, program, length, rating, score, why, warnings };
  }

  function rotationPoolMatch(program, slot) {
    const pool = getPool(slot.requiredPoolId);
    const items = poolItemsForPool(slot.requiredPoolId);
    const fallbackTerm = text(pool?.nolaMatchText || pool?.titleMatchText || slot.titleTopic || slot.templateGroupName);
    const candidates = items.length ? items : (fallbackTerm ? [{ titleMatchText: fallbackTerm, nolaMatchText: pool?.nolaMatchText || '', itemLabel: fallbackTerm, priorityWeight: 0, active: true }] : []);
    let best = null;
    candidates.forEach((item) => {
      const match = programMatchesPoolItem(program, item);
      if (!match.ok) return;
      const score = match.score + Number(item.priorityWeight || 0);
      if (!best || score > best.score) best = { ...match, score, label: item.itemLabel || item.titleMatchText || item.programTitle || pool?.poolName || '' };
    });
    return best || { ok: false, score: 0, label: '' };
  }

  function programMatchesPoolItem(program, item) {
    const ids = programRecordIds(program);
    if (item.programRecordId && ids.has(text(item.programRecordId))) return { ok: true, score: 95, label: item.itemLabel || item.programTitle || 'selected record' };

    const topic = topicFromPoolItem(item);
    if (topic) {
      const topicMatch = programMatchesTopic(program, topic);
      return topicMatch.ok ? { ok: true, score: 68, label: `Topic: ${topic}` } : { ok: false, score: 0 };
    }

    const programNolaNorms = programNolaValues(program).map(normalizeNola).filter(Boolean);
    const nolaTerms = text(item.nolaMatchText).split(/[,;|\s]+/).map(normalizeNola).filter((term) => term.length >= 2);
    const nolaMatched = nolaTerms.find((term) => programNolaNorms.some((value) => value && (value.startsWith(term) || value.includes(term))));
    if (nolaMatched) return { ok: true, score: Math.min(88, 42 + nolaMatched.length * 3), label: item.itemLabel || item.nolaMatchText };

    const terms = text(item.titleMatchText || item.programTitle || item.itemLabel).toLowerCase().split(/[,;|]/).map((term) => term.trim()).filter(Boolean);
    if (!terms.length) return { ok: false, score: 0 };
    const haystack = text([program.title, program.program_title, program.series_title, program.notes, program.topic, program.secondary_topic].join('\n\n')).toLowerCase();
    const matched = terms.find((term) => haystack.includes(term));
    return matched ? { ok: true, score: Math.min(55, 20 + matched.length), label: item.itemLabel || matched } : { ok: false, score: 0 };
  }

  function programMatchesTopic(program, topic) {
    const wanted = normalizeTopic(topic);
    if (!wanted) return { ok: false };
    // Topic-pool rules are intentionally matched against primary Library topics only.
    // Secondary topic fields can be useful metadata, but they should not cause a program
    // to appear in a pool/dropdown meant to represent the main schedule category.
    const topics = primaryProgramTopicValues(program).map(normalizeTopic).filter(Boolean);
    if (topics.some((value) => value === wanted)) return { ok: true, exact: true };
    return { ok: false };
  }

  function normalizeTopic(value) {
    return text(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function primaryProgramTopicValues(program) {
    const values = [];
    [program.topic, program.primary_topic, program.program_topic].forEach((value) => {
      values.push(...splitTopicValues(value));
    });
    return [...new Set(values.map(text).filter(Boolean))];
  }

  function programTopicValues(program) {
    const values = [];
    [program.topic, program.primary_topic, program.program_topic, program.secondary_topic, program.category, program.subject].forEach((value) => {
      values.push(...splitTopicValues(value));
    });
    return [...new Set(values.map(text).filter(Boolean))];
  }

  function programRecordIds(program) {
    return new Set([program.id, program.program_id, program.record_id, ...programNolaValues(program), program.legacy_code, program.slug].map(text).filter(Boolean));
  }

  function daysSinceLastAired(program, channel, iso) {
    const field = channel === '13.3' ? program.aired_13_3 : program.aired_13_1;
    const target = fromIsoDate(iso).getTime();
    const dates = extractDates(field).filter((d) => d <= iso).sort();
    if (!dates.length) return null;
    const latest = fromIsoDate(dates[dates.length - 1]).getTime();
    return Math.max(0, Math.floor((target - latest) / 86400000));
  }

  function rightsUrgencyInfo(program, iso, months) {
    const end = rightsEnd(program);
    if (!end || !months) return { urgent: false, monthsUntil: null };
    const monthsUntil = (fromIsoDate(end).getFullYear() - fromIsoDate(iso).getFullYear()) * 12 + (fromIsoDate(end).getMonth() - fromIsoDate(iso).getMonth());
    return { urgent: monthsUntil >= 0 && monthsUntil <= months, monthsUntil };
  }

  function nearbyTitleConflict(program, context) {
    if (!context) return false;
    const title = programTitle(program).toLowerCase();
    if (!title) return false;
    return [context.previous, context.next].some((item) => {
      const nearby = text(item?.title || item?.titleTopic).toLowerCase();
      return nearby && (nearby === title || title.includes(nearby) || nearby.includes(title));
    });
  }

  function candidateKey(program, index) {
    return `${programStableId(program) || 'program'}_${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function formatCandidateScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'n/a';
    return String(Math.round(numeric));
  }

  function candidateCard(entry, key, slot, iso) {
    const p = entry.program;
    const title = programTitle(p);
    const description = programDescription(p);
    const details = candidateDetailRows(p, state.channel, iso);
    const why = [...(entry.why || []), ...(entry.warnings || []).map((w) => `warn: ${w}`)].slice(0, 8).join(' · ');
    return `
      <div class="candidate-card" title="${escapeHtml(description || title)}">
        <div class="candidate-card-main">
          <div class="candidate-title" title="${escapeHtml(description || title)}">${escapeHtml(title)}</div>
          <div class="candidate-score">Score: ${escapeHtml(formatCandidateScore(entry.score))}</div>
          <button type="button" class="candidate-use-btn primary" data-candidate-kind="single" data-candidate-key="${escapeHtml(key)}">Use</button>
        </div>
        <details class="candidate-more">
          <summary><span class="candidate-quick-meta">${escapeHtml(candidateQuickMeta(p, state.channel, iso))}</span><span class="candidate-expand-label">Details</span></summary>
          <div class="candidate-detail-grid">${details}</div>
          <div class="candidate-why">${escapeHtml(why || 'matched current template rules')}</div>
        </details>
      </div>
    `;
  }

  function pairCard(pair, key, slot, iso) {
    const aTitle = programTitle(pair.a.program);
    const bTitle = programTitle(pair.b.program);
    return `
      <div class="candidate-card" title="${escapeHtml([programDescription(pair.a.program), programDescription(pair.b.program)].filter(Boolean).join('\n\n'))}">
        <div class="candidate-card-main">
          <div class="candidate-title" title="${escapeHtml(programDescription(pair.a.program) || aTitle)}">${escapeHtml(aTitle)} + ${escapeHtml(bTitle)}</div>
          <div class="candidate-score">Score: ${escapeHtml(formatCandidateScore(pair.score))}</div>
          <button type="button" class="candidate-use-btn primary" data-candidate-kind="pair" data-candidate-key="${escapeHtml(key)}">Use pair</button>
        </div>
        <details class="candidate-more">
          <summary><span class="candidate-quick-meta">30 + 30 pair</span><span class="candidate-expand-label">Details</span></summary>
          <div class="candidate-detail-grid">
            ${candidateDetailRows(pair.a.program, state.channel, iso)}
            ${candidateDetailRows(pair.b.program, state.channel, iso)}
          </div>
          <div class="candidate-why">${escapeHtml(pair.why.join(' · '))}</div>
        </details>
      </div>
    `;
  }

  function excludedCandidateCard(entry, key) {
    const p = entry.program;
    const description = programDescription(p);
    const why = [...(entry.why || []), ...(entry.warnings || []).map((w) => `warn: ${w}`)].slice(0, 6).join(' · ');
    return `
      <div class="candidate-card candidate-card--blocked excluded-candidate" title="${escapeHtml(description || programTitle(p))}">
        <div class="candidate-card-main">
          <div class="candidate-title" title="${escapeHtml(description || programTitle(p))}">${escapeHtml(programTitle(p))}</div>
          <button type="button" class="candidate-use-btn" data-candidate-kind="excluded" data-candidate-key="${escapeHtml(key)}">Use anyway</button>
        </div>
        <details class="candidate-more">
          <summary><span class="candidate-quick-meta">${escapeHtml(candidateQuickMeta(p, state.channel, null))}</span><span class="candidate-expand-label">Details</span></summary>
          <div class="candidate-detail-grid">${candidateDetailRows(p, state.channel, null)}</div>
          <div class="candidate-why"><strong>Not recommended:</strong> ${escapeHtml(why || 'Not eligible under current slot rules')}</div>
        </details>
      </div>
    `;
  }

  function candidateQuickMeta(program, channel, iso) {
    const parts = [];
    const nola = programNola(program);
    const length = parseLength(program.length_minutes);
    const episode = programSingleEpisodeNumber(program) || programScheduleEpisodeLine(program).replace(/^Episode:\s*/i, '');
    if (nola) parts.push(nola);
    if (episode) parts.push(`Ep ${episode.replace(/^Episode\s*/i, '')}`);
    if (length) parts.push(`${length}m`);
    const rights = rightsEnd(program);
    if (rights) parts.push(`rights end ${rights}`);
    return parts.join(' · ');
  }

  function candidateDetailRows(program, channel, iso) {
    const length = parseLength(program.length_minutes);
    const nola = programNola(program) || 'none found';
    const rights = rightsParts(program);
    const episodeCount = extractEpisodeCount(program);
    const episodeSeason = text(program.episode_season);
    const history = channelHistoryText(program, channel, iso);
    const rows = [
      ['NOLA', nola],
      ['Length', length ? `${length}m` : 'unknown'],
      ['Type', [program.program_type, program.topic, program.distributor].filter(Boolean).join(' · ') || 'unknown'],
      ['Rights begin', rights.begin || 'unknown'],
      ['Rights end', rights.end || 'unknown'],
      [`${channel} history`, history],
      ['Episodes', episodeCount ? String(episodeCount) : (episodeSeason || 'unknown')],
      ['Episode/season field', episodeSeason || 'blank']
    ];
    return rows.map(([label, value]) => `<div class="candidate-detail-line"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join('\n\n');
  }

  function bindCandidatePreviewEvents(preview) {
    preview.querySelectorAll('[data-candidate-key]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void useCandidateFromPreview(button.dataset.candidateKind, button.dataset.candidateKey);
      });
    });
  }

  async function useCandidateFromPreview(kind, key) {
    const preview = state.candidatePreview || {};
    const target = preview.target;
    const iso = preview.iso;
    if (!target || !iso) return;
    try {
      if (kind === 'pair') {
        const pair = preview.pairs.get(key);
        if (!pair) throw new Error('Candidate pair is no longer available. Refresh the preview and try again.');
        await saveCandidateOverride(pair.a.program, target, iso, target.startMinutes, 30);
        await saveCandidateOverride(pair.b.program, target, iso, target.startMinutes + 30, 30);
        await refreshPlannerRowsAfterCandidateFill();
        closeModal();
        render();
        updateSummary(`Filled ${formatLongDate(fromIsoDate(iso))} at ${formatTime(target.startMinutes)} with a 30 + 30 planner override pair.`);
        return;
      }
      const isExcludedPick = kind === 'excluded';
      const entry = isExcludedPick ? preview.excluded.get(key) : preview.singles.get(key);
      if (!entry) throw new Error('Candidate is no longer available. Refresh the preview and try again.');
      const length = entry.length || parseLength(entry.program.length_minutes) || target.lengthMinutes || STEP;
      const seriesPlan = buildSeriesCascadePlan(entry.program, target, iso, length);
      if (seriesPlan.shouldCascade) {
        await saveCandidateSeriesCascade(entry.program, target, iso, length, isExcludedPick ? entry : null, seriesPlan);
        await refreshPlannerRowsAfterCandidateFill();
        closeModal();
        render();
        const suffix = isExcludedPick ? ' while bypassing helper eligibility warnings' : '';
        updateSummary(`Filled ${seriesPlan.count} ${seriesPlan.dayLabel} slot${seriesPlan.count === 1 ? '' : 's'} starting ${formatLongDate(fromIsoDate(iso))} with ${seriesPlan.displayTitle}${suffix}.`);
        return;
      }
      await saveCandidateOverride(entry.program, target, iso, target.startMinutes, length, isExcludedPick ? entry : null);
      await refreshPlannerRowsAfterCandidateFill();
      closeModal();
      render();
      const suffix = isExcludedPick ? ' as a manual exact-schedule override, bypassing helper eligibility warnings' : ' in the scheduler test override table';
      updateSummary(`Filled ${formatLongDate(fromIsoDate(iso))} at ${formatTime(target.startMinutes)} with ${programTitle(entry.program)}${suffix}.`);
    } catch (error) {
      console.error(error);
      alert(`Candidate fill failed: ${error.message}`);
      updateSummary(`Candidate fill failed: ${error.message}`);
    }
  }

  async function refreshPlannerRowsAfterCandidateFill() {
    // Re-read planner rows after a candidate save so the calendar renders the
    // actual database row, not a stale in-memory/template-only view. This also
    // makes manual picks update immediately after the modal closes.
    const [templateResult, overrideResult, poolResult, poolItemResult] = await Promise.all([
      state.supabase.from(TEMPLATE_TABLE).select('*').order('channel').order('day_of_week').order('start_minutes'),
      state.supabase.from(OVERRIDE_TABLE).select('*').order('start_date').order('start_minutes'),
      state.supabase.from(POOL_TABLE).select('*').order('pool_name'),
      state.supabase.from(POOL_ITEM_TABLE).select('*').order('item_label')
    ]);
    if (templateResult.error) throw templateResult.error;
    if (overrideResult.error) throw overrideResult.error;
    if (poolResult.error) throw poolResult.error;
    if (poolItemResult.error) throw poolItemResult.error;
    state.templates = (templateResult.data || []).map(templateFromDb);
    state.overrides = (overrideResult.data || []).map(overrideFromDb);
    state.pools = (poolResult.data || []).map(poolFromDb);
    state.poolItems = (poolItemResult.data || []).map(poolItemFromDb);
  }

  async function saveCandidateOverride(program, slot, iso, startMinutes, lengthMinutes, bypassEntry, options = {}) {
    const existing = findExistingOverrideForSlot(iso, slot.channel || state.channel, startMinutes);
    const pTitle = options.displayTitle || scheduledProgramTitle(program);
    const pNola = programNola(program);
    const pId = programStableId(program);
    const episodeNumber = options.episodeNumber || '';
    const override = {
      ...slot,
      id: existing?.id || '',
      kind: 'override',
      status: 'override',
      channel: slot.channel || state.channel,
      startDate: iso,
      endDate: iso,
      overrideTemplateId: options.templateId || (slot.kind === 'template' ? slot.id : (slot.overrideTemplateId || '')),
      pbsWasOverridden: Boolean(slot.status === 'pbs' || slot.pbsWasOverridden),
      overrideReason: options.overrideReason || 'candidate_pick',
      startMinutes,
      lengthMinutes: Number(lengthMinutes || slot.lengthMinutes || STEP),
      purpose: looksLikeSeries(program) ? 'series' : (slot.purpose === 'flex' ? 'flex' : 'standalone'),
      isPbsFeed: false,
      titleTopic: pTitle,
      fillStrategy: 'single',
      seriesPattern: looksLikeSeries(program) ? (slot.seriesPattern || 'weekly_one_day') : 'none',
      templateGroupName: slot.templateGroupName || slot.poolName || '',
      episodeMin: episodeNumber || slot.episodeMin || null,
      episodeMax: episodeNumber || slot.episodeMax || null,
      selectedProgramRecordId: pId,
      selectedProgramTitle: pTitle,
      selectedProgramNola: pNola,
      notes: candidateOverrideNotes(program, slot, bypassEntry, episodeNumber)
    };
    const payload = overrideToDb(override);
    if (existing?.id) {
      const { data, error } = await state.supabase.from(OVERRIDE_TABLE).update(payload).eq('id', existing.id).select('*').single();
      if (error) throw error;
      upsertInMemory(state.overrides, overrideFromDb(data));
    } else {
      const { data, error } = await state.supabase.from(OVERRIDE_TABLE).insert(payload).select('*').single();
      if (error) throw error;
      state.overrides.push(overrideFromDb(data));
    }
  }


  async function saveCandidateSeriesCascade(program, slot, iso, lengthMinutes, bypassEntry, plan) {
    const dates = buildSeriesCascadeDates(iso, plan);
    for (let i = 0; i < dates.length; i += 1) {
      const episodeNumber = plan.episodeNumbers[i] || '';
      const matchingTemplate = findTemplateForCascadeDate(dates[i], slot, plan);
      await saveCandidateOverride(program, matchingTemplate || slot, dates[i], slot.startMinutes, lengthMinutes, bypassEntry, {
        displayTitle: plan.displayTitle,
        episodeNumber,
        templateId: matchingTemplate?.id || (slot.kind === 'template' ? slot.id : (slot.overrideTemplateId || '')),
        overrideReason: 'candidate_series_cascade'
      });
    }
  }

  function buildSeriesCascadePlan(program, slot, iso, lengthMinutes) {
    const count = extractEpisodeCount(program) || 0;
    if (!looksLikeSeries(program) || count <= 1) {
      return { shouldCascade: false, count: 1, displayTitle: scheduledProgramTitle(program), episodeNumbers: [], weekdays: [], dayLabel: 'selected' };
    }
    const pattern = text(slot.seriesPattern || slot.series_pattern || '').toLowerCase();
    const startDow = fromIsoDate(iso).getDay();
    const siblingWeekdays = matchingTemplateWeekdays(slot);
    const hasConsecutivePattern = pattern.includes('consecutive') || pattern.includes('across');
    const hasIndependentPattern = pattern.includes('independent');
    const hasWeeklyOneDayPattern = pattern.includes('weekly_one_day') || pattern.includes('weekly one') || pattern === 'weekly';
    const hasNoSeriesPattern = !pattern || pattern === 'none' || pattern.includes('not a series') || pattern.includes('not');
    let weekdays = siblingWeekdays.length ? siblingWeekdays : [];

    if (hasIndependentPattern || hasWeeklyOneDayPattern) {
      // Explicit one-day or independent weekday lanes should stay on the clicked weekday.
      weekdays = [startDow];
    } else if (hasConsecutivePattern) {
      // Consecutive lanes fill the whole matching template family. If that family
      // cannot be found yet, fall back to the normal M-F programming pattern.
      weekdays = weekdays.length ? weekdays : [1, 2, 3, 4, 5];
    } else if (hasNoSeriesPattern && weekdays.length > 1) {
      // Real-world schedule entry: if the template edit has M-F/selected weekdays
      // checked, honor that checked family even when the Series Pattern dropdown
      // was left at "Not a series lane." The weekday picker is the user's clearest
      // instruction here.
      weekdays = weekdays;
    } else {
      weekdays = [startDow];
    }

    weekdays = Array.from(new Set(weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
    if (!weekdays.length) weekdays = [startDow];

    const seasonNumber = seriesSeasonNumber(program);
    const episodeNumbers = Array.from({ length: count }, (_, index) => seasonNumber ? String(seasonNumber * 100 + index + 1) : String(index + 1));
    const multiDay = weekdays.length > 1;
    return {
      shouldCascade: true,
      count,
      displayTitle: seriesDisplayTitle(program, seasonNumber),
      episodeNumbers,
      weekdays,
      dayLabel: multiDay ? 'selected weekdays' : 'weekly'
    };
  }

  function buildSeriesCascadeDates(startIso, plan) {
    const dates = [];
    let cursor = fromIsoDate(startIso);
    let guard = 0;
    const allowed = new Set((plan.weekdays || []).map(Number));
    while (dates.length < plan.count && guard < 500) {
      const iso = toIsoDate(cursor);
      const dow = cursor.getDay();
      if (iso >= startIso && allowed.has(dow)) dates.push(iso);
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    return dates;
  }

  function matchingTemplateWeekdays(slot) {
    const startMinutes = Number(slot.startMinutes || 0);
    const channel = slot.channel || state.channel;
    const poolId = text(slot.requiredPoolId || slot.required_pool_id);
    const group = text(slot.templateGroupName || slot.template_group_name);
    const candidates = state.templates.filter((item) => {
      if ((item.channel || state.channel) !== channel) return false;
      if (Number(item.startMinutes) !== startMinutes) return false;
      if (poolId && text(item.requiredPoolId) === poolId) return true;
      if (group && text(item.templateGroupName) === group) return true;
      if (slot.id && String(item.id) === String(slot.id)) return true;
      return false;
    });
    return candidates.map((item) => Number(item.dayOfWeek)).filter((dow) => Number.isInteger(dow) && dow >= 0 && dow <= 6);
  }

  function findTemplateForCascadeDate(iso, slot, plan) {
    const date = fromIsoDate(iso);
    const dow = date.getDay();
    const startMinutes = Number(slot.startMinutes || 0);
    const channel = slot.channel || state.channel;
    const poolId = text(slot.requiredPoolId || slot.required_pool_id);
    const group = text(slot.templateGroupName || slot.template_group_name);
    return state.templates.find((item) => {
      if ((item.channel || state.channel) !== channel) return false;
      if (Number(item.dayOfWeek) !== dow) return false;
      if (Number(item.startMinutes) !== startMinutes) return false;
      if (!dateInRange(iso, item.startDate, item.endDate)) return false;
      if (poolId && text(item.requiredPoolId) === poolId) return true;
      if (group && text(item.templateGroupName) === group) return true;
      return String(item.id) === String(slot.id);
    }) || null;
  }

  function seriesSeasonNumber(program) {
    const values = [programTitle(program), program?.season_label, program?.season, program?.episode_season, programNola(program)].map(text).filter(Boolean);
    for (const value of values) {
      const match = value.match(/(?:\bS\.?\s*|\bSeason\s*)(\d{1,2})\b/i) || value.match(/\bS(\d{1,2})\b/i);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function seriesDisplayTitle(program, seasonNumber) {
    const rawTitle = programTitle(program) || scheduledProgramTitle(program);
    if (!seasonNumber) return rawTitle;
    const base = rawTitle
      .replace(/\bS\.?\s*\d{1,2}\b/ig, '')
      .replace(/\bSeason\s*\d{1,2}\b/ig, '')
      .replace(/[-–—:]\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return `${base || rawTitle} ${seasonNumber}00s`;
  }

  function addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function findExistingOverrideForSlot(iso, channel, startMinutes) {
    return state.overrides.find((item) => {
      if (item.channel !== channel) return false;
      if (!dateInRange(iso, item.startDate, item.endDate)) return false;
      return Number(item.startMinutes) === Number(startMinutes);
    }) || null;
  }

  function candidateOverrideNotes(program, slot, bypassEntry, episodeNumber = '') {
    const parts = [bypassEntry ? 'Manual exact-schedule fill from a candidate that helper rules marked not recommended.' : 'Filled from Schedule Planner candidate preview.'];
    if (bypassEntry?.why?.length) parts.push(`Bypassed helper warning: ${bypassEntry.why.join(' · ')}.`);
    const nola = programNola(program);
    if (nola) parts.push(`NOLA: ${nola}.`);
    if (episodeNumber) parts.push(`Episode: ${episodeNumber}.`);
    const rights = rightsDisplay(program);
    if (rights) parts.push(`Rights: ${rights}.`);
    const existing = text(slot.notes);
    if (existing) parts.push(`Slot notes: ${existing}`);
    return parts.join('\n\n');
  }

  function purposeOptions(current) {
    const normalized = ['series','pbs_feed'].includes(current) ? current : 'standalone';
    return ['standalone','series','pbs_feed'].map((value) => `<option value="${value}"${value===normalized?' selected':''}>${purposeLabel(value)}</option>`).join('\n\n');
  }

  function fillOptions(current) {
    const normalized = current === 'single_or_two' || current === 'two_half_hours' ? 'single_or_two' : 'single';
    const opts = [['single','Single program only'],['single_or_two','Multiple programs allowed']];
    return opts.map(([value,label]) => `<option value="${value}"${value===normalized?' selected':''}>${label}</option>`).join('\n\n');
  }

  function lengthOptions(current) {
    const allowed = [30, 60, 90, 120, 150, 180, 210, 240];
    const normalized = Number(current) || 60;
    return allowed.map((value) => `<option value="${value}"${value === normalized ? ' selected' : ''}>${value}</option>`).join('\n\n');
  }

  function timeOptions(current) {
    const out = [];
    for (let minutes = TIME_MIN; minutes <= TIME_MAX; minutes += STEP) out.push(`<option value="${minutes}"${Number(current)===minutes?' selected':''}>${formatTime(minutes)}</option>`);
    return out.join('\n\n');
  }


  function weekdayOptions(current) {
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      .map((label, index) => `<option value="${index}"${Number(current)===index?' selected':''}>${label}</option>`)
      .join('\n\n');
  }

  function seriesPatternOptions(current) {
    const opts = [
      ['none', 'Not a series lane'],
      ['weekly_one_day', 'Weekly one-day series'],
      ['independent_by_weekday', 'M–F independent weekday series'],
      ['consecutive_across_days', 'M–F consecutive episodes across selected days']
    ];
    return opts.map(([value, label]) => `<option value="${value}"${value===current?' selected':''}>${label}</option>`).join('\n\n');
  }

  function purposeLabel(purpose) {
    return ({
      standalone: 'Program', series: 'Series', flex: 'Flexible block', local: 'Local program', pbs_feed: 'PBS Feed', fundraiser: 'Fundraiser', holiday: 'Holiday/event', hold: 'Manual hold', empty: 'Open slot'
    })[purpose] || 'Program';
  }

  function fillStrategyLabel(value) {
    return ({ single: 'single', two_half_hours: '30+30', single_or_two: '60 or 30+30' })[value] || value;
  }

  async function clearPlannerData() {
    try {
      const overrideResult = await state.supabase.from(OVERRIDE_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (overrideResult.error) throw overrideResult.error;
      const templateResult = await state.supabase.from(TEMPLATE_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (templateResult.error) throw templateResult.error;
      const poolItemResult = await state.supabase.from(POOL_ITEM_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (poolItemResult.error) throw poolItemResult.error;
      const poolResult = await state.supabase.from(POOL_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (poolResult.error) throw poolResult.error;
      state.templates = [];
      state.overrides = [];
      state.pools = [];
      state.poolItems = [];
      render();
      updateSummary('Cleared scheduler test templates, overrides, and NOLA/topic pool records from Supabase planner tables.');
    } catch (error) {
      console.error(error);
      alert(`Clear planner data failed: ${error.message}`);
      updateSummary(`Clear planner data failed: ${error.message}`);
    }
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
    if (els.metricPools) els.metricPools.textContent = state.pools.length.toLocaleString();
    if (els.metricPoolItems) els.metricPoolItems.textContent = state.poolItems.length.toLocaleString();
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
    const haystack = text([program.title, program.notes, program.topic, program.secondary_topic, program.rights_notes].join('\n\n')).toLowerCase();
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

  function isArchivedProgram(program) {
    const truthyKeys = ['is_archived', 'archived', 'isArchive', 'is_archive', 'program_archived', 'library_archived', 'inactive', 'is_inactive'];
    if (truthyKeys.some((key) => booleanish(program?.[key]))) return true;
    const statusText = text([program?.status, program?.library_status, program?.record_status, program?.availability, program?.archive_status].filter(Boolean).join('\n\n')).toLowerCase();
    if (/(archived|archive|inactive|unavailable|retired)/.test(statusText)) return true;
    return false;
  }

  function booleanish(value) {
    if (value === true) return true;
    const raw = text(value).toLowerCase();
    return ['true', 'yes', 'y', '1', 'archived', 'inactive', 'unavailable', 'retired'].includes(raw);
  }

  function rightsStatus(program, iso) {
    const end = rightsEnd(program);
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

  function rightsDisplay(program) {
    const parts = rightsParts(program);
    return `${parts.begin || 'unknown begin'} – ${parts.end || 'unknown end'}`;
  }

  function rightsParts(program) {
    return { begin: rightsBegin(program), end: rightsEnd(program) };
  }

  function rightsBegin(program) {
    return firstDateField(program, ['rights_begin', 'rights_start', 'rights_begins', 'rights_start_date', 'rights_begin_date', 'rights_from', 'rights_from_date', 'license_start', 'license_begin']);
  }

  function rightsEnd(program) {
    return firstDateField(program, ['rights_end', 'rights_ends', 'rights_end_date', 'rights_to', 'rights_to_date', 'license_end', 'license_expiration', 'expiration_date']);
  }

  function firstDateField(program, keys) {
    for (const key of keys) {
      const normalized = normalizeDateish(program?.[key]);
      if (normalized) return normalized;
    }
    return '';
  }

  function channelHistoryText(program, channel, iso) {
    const field = channel === '13.3' ? program.aired_13_3 : program.aired_13_1;
    const raw = text(field);
    const dates = extractDates(field).filter((d) => !iso || d <= iso).sort();
    if (!dates.length) {
      if (!raw || raw.toLowerCase() === 'no') return 'none found';
      return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
    }
    const latest = dates[dates.length - 1];
    const shown = dates.slice(-4).join(', ');
    const count = dates.length;
    return `${count} airing${count === 1 ? '' : 's'}; latest ${latest}${count > 1 ? `; recent ${shown}` : ''}`;
  }

  function programDescription(program) {
    const keys = ['description', 'program_description', 'short_description', 'long_description', 'synopsis', 'summary', 'episode_description', 'notes'];
    for (const key of keys) {
      const value = text(program?.[key]);
      if (value && value.length > 8) return value;
    }
    return '';
  }

  function hasSelectedCandidateProgram(item) {
    return Boolean(item && item.kind === 'override' && (item.selectedProgramTitle || item.selectedProgramNola || item.overrideReason === 'candidate_pick'));
  }

  function findSelectedProgramForPlannerItem(item) {
    if (!item) return null;
    const stableId = text(item.selectedProgramRecordId || item.selected_program_record_id);
    if (stableId) {
      const byId = state.programs.find((program) => programRecordIds(program).has(stableId));
      if (byId) return byId;
    }
    const nola = normalizeNola(item.selectedProgramNola || item.selected_program_nola || item.titleTopic || item.title_topic);
    if (nola) {
      const byNola = state.programs.find((program) => programNolaValues(program).some((value) => {
        const normalized = normalizeNola(value);
        return normalized && normalized === nola;
      }));
      if (byNola) return byNola;
    }
    const title = text(item.selectedProgramTitle || item.selected_program_title || item.titleTopic || item.title_topic).toLowerCase();
    if (title) {
      return state.programs.find((program) => programTitle(program).toLowerCase() === title) || null;
    }
    return null;
  }

  function scheduledProgramTitle(program) {
    const title = programTitle(program);
    const episode = programSingleEpisodeNumber(program);
    const nola = programNola(program);
    // If the Library record has an explicit episode number but the title does not,
    // add it to the display title. This avoids calendar cells that only say the
    // generic season/pool name after an exact candidate is placed.
    if (episode && title && !new RegExp(`\\b${escapeRegExp(String(episode))}\\b`).test(title)) {
      return `${title} ${episode}`.trim();
    }
    if (!title && nola) return nola;
    return title;
  }


  function selectedProgramEpisodeNumber(item) {
    const explicit = text(item?.selectedProgramEpisode || item?.selected_program_episode || item?.episodeLabel || item?.episode_label);
    const explicitNum = explicit.match(/\b\d{1,4}\b/);
    if (explicitNum) return explicitNum[0];
    const min = Number(item?.episodeMin ?? item?.episode_min);
    const max = Number(item?.episodeMax ?? item?.episode_max);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && min === max) return String(min);
    const selectedProgram = findSelectedProgramForPlannerItem(item);
    const programEpisode = selectedProgram ? programSingleEpisodeNumber(selectedProgram) : '';
    if (programEpisode) return programEpisode;
    const nola = text(item?.selectedProgramNola || item?.selected_program_nola);
    const nolaEpisode = nola.match(/(\d{3,4})\b/);
    if (nolaEpisode) return nolaEpisode[1];
    return '';
  }

  function selectedProgramEpisodeLine(item) {
    const selectedProgram = findSelectedProgramForPlannerItem(item);
    if (selectedProgram) return programScheduleEpisodeLine(selectedProgram);
    return plannerItemEpisodeLine(item);
  }

  function plannerItemEpisodeLine(item) {
    const explicit = text(item?.selectedProgramEpisode || item?.selected_program_episode || item?.episodeLabel || item?.episode_label);
    if (explicit) return explicit;
    const title = text(item?.selectedProgramTitle || item?.selected_program_title || item?.titleTopic || item?.title_topic || item?.title);
    const block = title.match(/\b(\d{3,4})'?s\b/i);
    if (block) return `Episode block: ${block[1]}s`;
    const nola = text(item?.selectedProgramNola || item?.selected_program_nola);
    const nolaEpisode = nola.match(/(\d{3,4})\b/);
    if (nolaEpisode) return `Episode: ${nolaEpisode[1]}`;
    const min = Number(item?.episodeMin ?? item?.episode_min);
    const max = Number(item?.episodeMax ?? item?.episode_max);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max === min) return `Episode: ${min}`;
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) return `Episodes ${min}–${max}`;
    if (Number.isFinite(min) && min > 0) return `Episode ${min}+`;
    return '';
  }

  function programScheduleEpisodeLine(program) {
    const episode = programSingleEpisodeNumber(program);
    if (episode) return `Episode: ${episode}`;
    const title = programTitle(program);
    const block = title.match(/\b(\d{3,4})'?s\b/i);
    if (block) return `Episode block: ${block[1]}s`;
    const nola = programNola(program);
    const nolaEpisode = nola.match(/(\d{3,4})\b/);
    if (nolaEpisode) return `Episode: ${nolaEpisode[1]}`;
    const tag = text(program.episode_season);
    if (tag && !looksLikeSeries(program)) return `Episode/season: ${tag}`;
    return '';
  }

  function programSingleEpisodeNumber(program) {
    const keys = ['episode_number','episode_no','episode_num','episode','episode_id','episode_code','program_episode','episode_label'];
    for (const key of keys) {
      const value = text(program?.[key]);
      const match = value.match(/\b\d{1,4}\b/);
      if (match) return match[0];
    }
    const tag = text(program?.episode_season);
    if (tag && !looksLikeSeries(program)) {
      const match = tag.match(/\b\d{1,4}\b/);
      if (match) return match[0];
    }
    return '';
  }

  function escapeRegExp(value) {
    return text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function programTitle(program) { return text(program.title || program.program_title || '(untitled)'); }
  function programNola(program) { return programNolaValues(program)[0] || ''; }
  function programNolaValues(program) {
    const values = [];
    const directKeys = ['nola_eidr','nola_code','nola','nola_id','nolaId','nolaCode','program_nola','programNola','content_identifier','contentIdentifier','eidr','eidr_code'];
    directKeys.forEach((key) => {
      const value = text(program?.[key]);
      if (value) values.push(value);
    });
    Object.keys(program || {}).forEach((key) => {
      if (!/(nola|eidr)/i.test(key)) return;
      const value = text(program[key]);
      if (value) values.push(value);
    });
    return [...new Set(values)];
  }
  function normalizeNola(value) { return text(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function text(value) { return (value ?? '').toString().trim(); }
  function saneNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function saneLengthMinutes(value, fallback = 60) {
    const allowed = [30, 60, 90, 120, 150, 180, 210, 240];
    const n = Number(value);
    return allowed.includes(n) ? n : fallback;
  }
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
