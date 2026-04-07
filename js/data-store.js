// Supabase loading, lookups, and mutation refresh logic
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

async function loadEverything(options = {}) {
  const forceFresh = Boolean(options.forceFresh);
  let renderedFromCache = false;

  if (!forceFresh && hydrateProgramsFromCache()) {
    renderedFromCache = true;
    renderTable();
    renderStats();
    renderFilters();
    state.lastAppliedViewState = snapshotViewState();
    setLoading('');
    setStatus(`Showing cached library while refreshing… (${state.programs.length.toLocaleString()} programs cached)`);
  } else {
    setLoading(canEdit() ? 'Loading program library…' : 'Loading program library…');
  }

  try {
    if (canEdit()) {
      if (!renderedFromCache) setLoading('Checking archive status…');
      await attemptAutoArchiveOncePerDay();
    }

    if (!renderedFromCache) setLoading('Loading program library…');
    else setStatus('Refreshing library from server…');

    await loadPrograms({ background: renderedFromCache });
    persistProgramsCache();
    renderTable();
    renderStats();
    renderFilters();
    state.lastAppliedViewState = snapshotViewState();
    setLoading('');

    const activeCount = state.programs.filter((item) => !item.is_archived).length;
    const archivedCount = state.programs.filter((item) => item.is_archived).length;
    setStatus(`Loaded ${state.programs.length.toLocaleString()} total programs (${activeCount.toLocaleString()} active, ${archivedCount.toLocaleString()} archived).`);
  } catch (error) {
    console.error(error);
    setLoading('');
    const fallbackPrefix = renderedFromCache ? 'Showing cached library. ' : '';
    setStatus(`${fallbackPrefix}${error.message}`);
  }
}

function readProgramsCache() {
  try {
    const raw = window.localStorage?.getItem(PROGRAM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.programs)) return null;
    return parsed.programs;
  } catch {
    return null;
  }
}

function hydrateProgramsFromCache() {
  const cached = readProgramsCache();
  if (!cached?.length) return false;
  state.programs = cached;
  sortProgramsInPlace();
  state.templateSourceDirty = true;
  return true;
}

function persistProgramsCache() {
  try {
    window.localStorage?.setItem(PROGRAM_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), programs: state.programs }));
  } catch (error) {
    console.warn('Programs cache skipped:', error);
  }
}

async function ensureLookupsLoaded(background = false) {
  if (state.lookupsLoaded) return true;
  if (state.lookupsPromise) return state.lookupsPromise;

  state.lookupsPromise = (async () => {
    try {
      if (!background) setStatus('Loading lookup lists…');
      await loadLookups();
      state.lookupsLoaded = true;
      renderFilters();
      if (!background) setStatus('Lookup lists loaded.');
      return true;
    } finally {
      state.lookupsPromise = null;
    }
  })();

  return state.lookupsPromise;
}

function todayKeyValue() {
  return new Date().toISOString().slice(0, 10);
}

async function attemptAutoArchiveOncePerDay(force = false) {
  const todayKey = todayKeyValue();
  const alreadyRan = !force && window.localStorage?.getItem(AUTO_ARCHIVE_LAST_RUN_KEY) === todayKey;
  if (alreadyRan) return false;
  try {
    await state.supabase.rpc('auto_archive_due_programs', { days_ahead: Number(config.AUTO_ARCHIVE_DAYS || 90) });
    window.localStorage?.setItem(AUTO_ARCHIVE_LAST_RUN_KEY, todayKey);
    return true;
  } catch (error) {
    console.warn('Auto-archive RPC skipped:', error);
    return false;
  }
}

async function fetchAllRows(tableName, options = {}) {
  const showOverlay = options.showOverlay !== false;
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const progressMessage = `Loading ${tableName.replaceAll('_', ' ')}… ${allRows.length.toLocaleString()} rows so far`;
    if (showOverlay) setLoading(progressMessage);
    else setStatus(progressMessage);
    const { data, error } = await state.supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function loadPrograms(options = {}) {
  const showOverlay = !options.background;
  state.programs = await fetchAllRows('programs_enriched', { showOverlay });
  sortProgramsInPlace();
  state.templateSourceDirty = true;
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

async function saveInlineAirings(programId, values = {}) {
  if (!canEdit()) throw new Error('Read-only mode. Use Admin sign in with GitHub to make changes.');
  const payload = {
    aired_13_1: normalizeText(values.aired_13_1) || null,
    aired_13_3: normalizeText(values.aired_13_3) || null
  };
  const { error } = await state.supabase.from('programs').update(payload).eq('id', programId);
  if (error) throw error;
  const refreshedProgram = await fetchProgramById(programId);
  mergeProgramIntoState(refreshedProgram);
  refreshUiAfterProgramMutation('Saved airing fields.');
  return refreshedProgram;
}

function mergeProgramIntoState(program) {
  const index = state.programs.findIndex((item) => String(item.id) === String(program.id));
  if (index >= 0) state.programs[index] = program;
  else state.programs.push(program);
  sortProgramsInPlace();
  state.templateSourceDirty = true;
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
  persistProgramsCache();
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

