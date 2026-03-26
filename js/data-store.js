// Supabase loading, lookups, and mutation refresh logic
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

async function loadEverything() {
  setLoading(canEdit() ? 'Checking archive status…' : 'Loading program library…');
  if (canEdit()) await attemptAutoArchiveOncePerDay();
  await loadPrograms();
  renderTable();
  renderStats();
  state.lastAppliedViewState = snapshotViewState();
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

async function fetchAllRows(tableName) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    setLoading(`Loading ${tableName.replaceAll('_', ' ')}… ${allRows.length.toLocaleString()} rows so far`);
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

async function loadPrograms() {
  try {
    state.programs = await fetchAllRows('programs_enriched');
    sortProgramsInPlace();
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
  if (index >= 0) state.programs[index] = program;
  else state.programs.push(program);
  sortProgramsInPlace();
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

