// Filter building, view logic, table rendering, and stats
// Extracted from the former monolithic app.js during the v1.5.10 structural refactor.

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


function lookupItemsOrFallback(key, fieldName) {
  const items = state.lookups[key] || [];
  if (items.length) return items;
  return uniqueLookupFromPrograms(fieldName).map((name, index) => ({ name, sort_order: index + 1 }));
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

function mergeOptionLabels(preferredValues, items) {
  const merged = [];
  const seen = new Set();
  [...preferredValues, ...items.map((item) => (typeof item === 'string' ? item : item.name))].forEach((label) => {
    const value = normalizeText(label);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(value);
  });
  return merged;
}

function renderFilters() {
  fillSelect(els.topicFilter, lookupItemsOrFallback('topics', 'topic'), false);
  fillSelect(els.secondaryTopicFilter, lookupItemsOrFallback('secondary_topics', 'secondary_topic'), false);
  fillSelect(els.distributorFilter, lookupItemsOrFallback('distributors', 'distributor'));
  fillSelect(els.programTypeFilter, lookupItemsOrFallback('program_types', 'program_type'));
  fillSelect(els.lengthFilter, sortLengthValues(uniqueLookupFromPrograms('length_minutes')), false);
  fillSelect(els.codeFilter, uniqueCodeValues(), false);

  const form = els.programForm;
  fillSelect(form.elements.program_type, lookupItemsOrFallback('program_types', 'program_type'));
  fillSelect(form.elements.topic, lookupItemsOrFallback('topics', 'topic'));
  fillDatalist(els.secondaryTopicList, lookupItemsOrFallback('secondary_topics', 'secondary_topic'));
  fillDatalist(els.distributorList, lookupItemsOrFallback('distributors', 'distributor'));
  fillSelect(form.elements.package_type, mergeOptionLabels([DEFAULT_NEW_PROGRAM_VALUES.package_type], lookupItemsOrFallback('package_types', 'package_type')));
  fillSelect(form.elements.server_tape, mergeOptionLabels(CURATED_SOURCE_OPTIONS, lookupItemsOrFallback('server_locations', 'server_tape')));
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
    ratingFilter: els.ratingFilter?.value || '',
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
  els.statusFilter.value = snapshot.statusFilter === 'expired' ? '' : (snapshot.statusFilter || '');
  if (els.ratingFilter) els.ratingFilter.value = snapshot.ratingFilter || '';
  state.currentView = snapshot.currentView === 'expired' ? 'archived' : (snapshot.currentView || 'all');
  syncQuickViewState();
  renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${activePrograms().length.toLocaleString()} matching programs.`);
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
  let items = [...state.programs];
  if (state.currentView === 'archived') {
    return items.filter((item) => item.is_archived);
  }
  items = items.filter((item) => !item.is_archived);
  if (state.currentView && state.currentView !== 'all') {
    items = items.filter((item) => matchesView(item, state.currentView));
  }
  return items;
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
  if (els.ratingFilter) els.ratingFilter.value = '';
  state.currentView = 'all';
  syncQuickViewState();
  renderTable();
  state.lastAppliedViewState = snapshotViewState();
  syncUndoButton();
  setStatus(`${activePrograms().length.toLocaleString()} matching programs.`);
}

function activePrograms() {
  let items = programsInCurrentViewPool();
  const search = normalizeLower(els.searchInput.value);
  const searchField = els.searchFieldSelect.value;
  const codes = selectedValues(els.codeFilter).map((value) => normalizeText(value).toUpperCase());
  const topics = selectedValues(els.topicFilter);
  const secondaryTopics = selectedValues(els.secondaryTopicFilter);
  const lengths = selectedValues(els.lengthFilter);
  const distributor = els.distributorFilter.value;
  const programType = els.programTypeFilter.value;
  const status = els.statusFilter.value;
  const ratingFilter = els.ratingFilter?.value || '';

  if (search) {
    items = items.filter((item) => {
      if (searchField) return normalizeLower(item[searchField]).includes(search);
      return [
        item.title, item.notes, item.legacy_code, item.nola_eidr, item.secondary_topic, item.topic,
        item.aired_13_1, item.aired_13_3, item.distributor, item.rights_notes, item.package_type, item.program_type
      ].some((value) => normalizeLower(value).includes(search));
    });
  }
  if (codes.length) items = items.filter((item) => codes.includes(normalizeText(item.legacy_code).toUpperCase()));
  if (topics.length) items = items.filter((item) => {
    const itemTopics = splitMultiValues(item.topic);
    return topics.some((topic) => itemTopics.includes(topic));
  });
  if (secondaryTopics.length) items = items.filter((item) => {
    const itemTopics = splitMultiValues(item.secondary_topic);
    return secondaryTopics.some((topic) => itemTopics.includes(topic));
  });
  if (lengths.length) items = items.filter((item) => lengths.includes(String(item.length_minutes ?? '')));
  if (distributor) items = items.filter((item) => item.distributor === distributor);
  if (programType) items = items.filter((item) => item.program_type === programType);
  if (status && status !== 'expired') items = items.filter((item) => matchesView(item, status));
  if (ratingFilter) {
    items = items.filter((item) => {
      const rating = getProgramRating(item);
      switch (ratingFilter) {
        case 'unrated':
          return rating == null;
        case '4plus':
          return rating != null && rating >= 4;
        case '3plus':
          return rating != null && rating >= 3;
        default: {
          const exact = normalizeRating(ratingFilter);
          return exact != null && rating === exact;
        }
      }
    });
  }

  return items;
}

function matchesView(program, view) {
  const flags = computeFlags(program);
  const michiganText = [program.title, program.notes, program.topic, program.secondary_topic].map(normalizeLower).join(' | ');
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
      return false;
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
      return normalizeLower(program.package_type) === 'hdever';
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

function isSeriesProgram(program) {
  const value = normalizeLower(program?.program_type);
  return value.includes('series');
}

function extractEpisodeCount(program) {
  const raw = normalizeText(program?.episode_season);
  if (!raw) return null;

  const slashMatch = raw.match(/\/\s*(\d{1,4})\b/);
  if (slashMatch) return Number(slashMatch[1]);

  const epsMatch = raw.match(/\b(\d{1,4})\s*(?:eps?|episodes?)\b/i);
  if (epsMatch) return Number(epsMatch[1]);

  if (isSeriesProgram(program) && /^\d{1,4}$/.test(raw)) return Number(raw);

  return null;
}

function formatSeriesCountBadge(program) {
  if (!isSeriesProgram(program)) return '';
  const count = extractEpisodeCount(program);
  if (!Number.isFinite(count) || count <= 0) return '';
  return `<span class="series-count-pill" title="${count} episode${count === 1 ? '' : 's'}">${count} ep${count === 1 ? '' : 's'}</span>`;
}

function formatEpisodeTagBadge(program) {
  if (isSeriesProgram(program)) return '';
  const raw = normalizeText(program?.episode_season);
  if (!raw) return '';
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return `<span class="episode-tag-pill" title="Season / episode">${escapeHtml(cleaned)}</span>`;
}

function renderRatingStarsMarkup(program, options = {}) {
  const current = getProgramRating(program);
  const editable = Boolean(options.editable);
  const programId = program?.id ?? '';
  const label = current ? `${current} out of 5 stars` : 'Not rated';
  const stars = Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    const filled = current != null && value <= current;
    if (!editable) return `<span class="star-rating-btn static${filled ? ' filled' : ''}" aria-hidden="true">★</span>`;
    return `<button type="button" class="star-rating-btn${filled ? ' filled' : ''}${current === value ? ' anchor' : ''}" data-inline-rating-value="${value}" data-inline-rating-program="${programId}" aria-label="${value} star${value === 1 ? '' : 's'}" aria-pressed="${current === value ? 'true' : 'false'}">★</button>`;
  }).join('');
  return `<div class="program-rating-row${editable ? ' editable' : ' readonly'}" data-inline-rating-editor="${programId}" aria-label="${escapeHtml(label)}"><span class="rating-caption">Rating</span><div class="star-rating inline-star-rating">${stars}</div><span class="rating-text">${current ? `${current}/5` : '—'}</span></div>`;
}

function renderInlineAiringEditor(program) {
  if (!canEdit()) return '';
  return `
    <div class="inline-airing-editor" data-inline-airing-editor="${program.id}">
      <label class="inline-airing-field">
        <span class="inline-airing-label">Aired on 13.1</span>
        <input
          type="text"
          class="inline-airing-input"
          data-inline-airing-field="aired_13_1"
          value="${escapeHtml(normalizeText(program.aired_13_1))}"
          placeholder="Add 13.1 date(s)"
          aria-label="Aired on 13.1"
        />
      </label>
      <label class="inline-airing-field">
        <span class="inline-airing-label">Aired on 13.3</span>
        <input
          type="text"
          class="inline-airing-input"
          data-inline-airing-field="aired_13_3"
          value="${escapeHtml(normalizeText(program.aired_13_3))}"
          placeholder="Add 13.3 date(s)"
          aria-label="Aired on 13.3"
        />
      </label>
      <button type="button" class="inline-airing-save-btn" data-inline-airing-save="${program.id}">Save</button>
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
  const items = sortProgramsForDisplay(activePrograms());
  const selectedId = state.selectedId;
  const poolCount = programsInCurrentViewPool().length;

  updateListSummary(items.length, poolCount);

  renderSortHeaders();

  els.tableBody.innerHTML = items.map((item) => {
    const badges = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
    const selectedClass = item.id === selectedId ? 'selected' : '';
    const archivedClass = item.is_archived ? 'archived-row' : '';
    return `
      <tr data-id="${item.id}" class="${selectedClass} ${archivedClass}">
        <td>
          <button type="button" class="program-title-button" data-open-program="${item.id}"><span class="program-title">${escapeHtml(item.title || '')}</span></button>
          <div class="program-sub">${item.legacy_code ? `<span class="code-pill">${escapeHtml(item.legacy_code)}</span>` : ''}${item.nola_eidr ? `<span class="program-meta">${escapeHtml(item.nola_eidr)}</span>` : ''}${formatEpisodeTagBadge(item)}${formatSeriesCountBadge(item)}</div>
          ${renderRatingStarsMarkup(item, { editable: canEdit() })}
          ${renderInlineAiringEditor(item)}
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
  setSelectedRowHighlight(selectedId);
}

function renderStats() {
  const flags = state.programs.map((program) => ({ program, flags: computeFlags(program) }));
  const activeFlags = flags.filter((x) => !x.program.is_archived);
  els.statApt.textContent = activeFlags.filter((x) => x.flags.needsAptCheck).length.toLocaleString();
  els.statEnding.textContent = activeFlags.filter((x) => x.flags.rightsStatus === 'Ending soon').length.toLocaleString();
  els.statMissingRights.textContent = activeFlags.filter((x) => x.flags.missingRights).length.toLocaleString();
  els.statArchived.textContent = state.programs.filter((item) => item.is_archived).length.toLocaleString();
  syncQuickViewState();
}

function syncQuickViewState() {
  document.querySelectorAll('#quickStrip [data-view]').forEach((card) => card.classList.toggle('active', card.dataset.view === state.currentView));
}

