// PBS offer paste importer
// Adds an admin-only pasted-text parser that prefills a new program draft.

const PBS_IMPORT_KNOWN_LABELS = [
  'Release Title',
  'Content Identifier',
  'Episode Number(s)',
  'About this program',
  'Organization List',
  'Production Companies',
  'Distributor',
  'Schedule Notes',
  'DATES/TIMES',
  'REPEAT DT/TM',
  'Program Notes',
  'Dates, episodes #s & titles',
  'EMBEDDED PROMO',
  'Rights Notes',
  'Underwriting Notes'
];

const PBS_IMPORT_STOP_HEADINGS = [
  'Rights (Permissions)',
  'Media Context',
  'Prohibition',
  'Funding',
  'FUNDER'
];

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pbsImportVisibleText(text) {
  return normalizeText(String(text || '').replace(/\u00a0/g, ' ').replace(/\t+/g, ' ').replace(/[ ]{2,}/g, ' '));
}

function splitPbsOfferSections(rawText) {
  const sections = {};
  let current = null;
  const labelMatchers = PBS_IMPORT_KNOWN_LABELS.map((label) => ({ label, pattern: new RegExp(`^${escapeRegex(label)}:\\s*(.*)$`, 'i') }));

  String(rawText || '').replace(/\r/g, '').split('\n').forEach((line) => {
    const raw = line.trimEnd();
    const trimmed = raw.trim();
    if (!trimmed) {
      if (current) sections[current].push('');
      return;
    }
    if (PBS_IMPORT_STOP_HEADINGS.some((heading) => trimmed.toLowerCase() === heading.toLowerCase())) {
      current = null;
      return;
    }
    const matched = labelMatchers.find((entry) => entry.pattern.test(trimmed));
    if (matched) {
      const value = trimmed.replace(matched.pattern, '$1').trim();
      current = matched.label;
      sections[current] ||= [];
      sections[current].push(value);
      return;
    }
    if (current) sections[current].push(trimmed);
  });

  return Object.fromEntries(Object.entries(sections).map(([label, lines]) => [label, lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()]));
}

function parseNamedMonthDate(text) {
  const match = normalizeText(text).match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;
  const [_, monthName, day, year] = match;
  const probe = new Date(`${monthName} ${day}, ${year} 00:00:00`);
  if (Number.isNaN(probe.getTime())) return null;
  const month = String(probe.getMonth() + 1).padStart(2, '0');
  const iso = `${year}-${month}-${String(Number(day)).padStart(2, '0')}`;
  return normalizeIsoDate(iso);
}

function normalizeEpisodeCode(value) {
  const digits = String(value || '').match(/\d+/)?.[0] || '';
  if (!digits) return '';
  return String(Number(digits));
}

function parseEpisodeNumberList(value) {
  return Array.from(new Set((String(value || '').match(/\d{3,6}/g) || []).map(normalizeEpisodeCode).filter(Boolean)));
}

function buildEpisodeSeasonValue(episodeNumbers) {
  if (!episodeNumbers.length) return '';
  if (episodeNumbers.length === 1) return episodeNumbers[0];
  const numeric = episodeNumbers.map((value) => Number(value)).filter(Number.isFinite);
  const continuous = numeric.length === episodeNumbers.length && numeric.every((value, index) => index === 0 || value === numeric[index - 1] + 1);
  if (continuous) return `${numeric[0]}-${numeric[numeric.length - 1]} / ${episodeNumbers.length}`;
  return `${episodeNumbers.join(', ')} / ${episodeNumbers.length}`;
}

function inferChannelField(token) {
  const text = normalizeLower(token);
  if (!text) return null;
  if (text.includes('hd01') || text.includes('13.1')) return 'aired_13_1';
  if (text.includes('hd03') || text.includes('13.3')) return 'aired_13_3';
  return null;
}

function toDisplayTime(hhmm) {
  const digits = String(hhmm || '').replace(/\D/g, '');
  if (!digits) return '';
  let hours = 0;
  let minutes = 0;
  if (digits.length <= 2) {
    hours = Number(digits);
  } else if (digits.length === 3) {
    hours = Number(digits.slice(0, 1));
    minutes = Number(digits.slice(1));
  } else {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2, 4));
  }
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function extractPrimaryScheduleMeta(block) {
  const lines = String(block || '').replace(/\r/g, '').split('\n').map((line) => normalizeText(line)).filter(Boolean);
  const mappings = [];
  lines.forEach((line) => {
    const timeMatch = line.match(/(?:^|,\s*)(\d{3,4})\s*-\s*\d{3,4}\s*\/\s*([A-Z0-9.]+)/i);
    if (!timeMatch) return;
    const time = toDisplayTime(timeMatch[1]);
    const channel = timeMatch[2];
    const field = inferChannelField(channel);
    if (!field || !time) return;
    mappings.push({ field, time, channel, raw: line });
  });
  return mappings;
}

function defaultImportYear(sections, termStartIso) {
  const dateMatch = (sections['DATES/TIMES'] || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    let year = Number(dateMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return year;
  }
  if (termStartIso) return Number(termStartIso.slice(0, 4));
  return new Date().getFullYear();
}

function parseEpisodeListings(block, year) {
  const results = [];
  const lines = String(block || '').replace(/\r/g, '').split('\n').map((line) => normalizeText(line)).filter(Boolean);
  lines.forEach((line) => {
    const match = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+#?(\d{1,6})(?:\s+["“](.*?)["”])?(?:\s+(.*))?$/);
    if (!match) return;
    let [, month, day, explicitYear, episodeCode, quotedTitle, trailing] = match;
    let finalYear = explicitYear ? Number(explicitYear) : Number(year || new Date().getFullYear());
    if (finalYear < 100) finalYear += finalYear >= 70 ? 1900 : 2000;
    const date = `${Number(month)}/${Number(day)}/${String(finalYear).slice(-2)}`;
    const title = normalizeText(quotedTitle || trailing || '');
    results.push({
      month: Number(month),
      day: Number(day),
      year: finalYear,
      date,
      episodeCode: normalizeEpisodeCode(episodeCode),
      title
    });
  });
  return results;
}

function buildAiringFields(scheduleMeta, episodeListings) {
  const airings = { aired_13_1: [], aired_13_3: [] };
  scheduleMeta.forEach((meta, index) => {
    if (episodeListings.length) {
      episodeListings.forEach((episode) => {
        airings[meta.field].push(`${episode.date} ${meta.time}`);
      });
      return;
    }
    const dateMatches = (meta.raw.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g) || []).map((value) => normalizeText(value));
    dateMatches.forEach((dateValue) => airings[meta.field].push(`${dateValue} ${meta.time}`));
    if (!dateMatches.length && index === 0) airings[meta.field].push(meta.time);
  });
  return Object.fromEntries(Object.entries(airings).map(([field, values]) => [field, Array.from(new Set(values)).join('; ')]));
}

function parseTermDates(rawText) {
  const termMatch = String(rawText || '').match(/Term:\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\s*-\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);
  if (!termMatch) return { rightsBegin: '', rightsEnd: '' };
  return {
    rightsBegin: parseNamedMonthDate(termMatch[1]) || '',
    rightsEnd: parseNamedMonthDate(termMatch[2]) || ''
  };
}

function buildRightsNotes(parsed, sections) {
  const lines = [];
  if (parsed.productionCompanies) lines.push(`Production companies: ${parsed.productionCompanies}`);
  if (parsed.scheduleNotes) lines.push(`Schedule notes: ${parsed.scheduleNotes}`);
  if (parsed.programNotes) lines.push(`Program notes: ${parsed.programNotes}`);
  if (parsed.repeatSchedule) lines.push(`Repeat schedule: ${parsed.repeatSchedule.replace(/\n+/g, ' | ')}`);
  if (parsed.embeddedPromo) lines.push(`Embedded promo: ${parsed.embeddedPromo.replace(/\n+/g, ' | ')}`);
  if (parsed.episodeListings.length > 1) {
    lines.push(`Episodes: ${parsed.episodeListings.map((episode) => `#${episode.episodeCode}${episode.title ? ` ${episode.title}` : ''}`).join('; ')}`);
  }
  if (sections['Underwriting Notes']) lines.push(`Underwriting notes: ${sections['Underwriting Notes']}`);
  if (sections['Rights Notes']) lines.push(`Rights notes: ${sections['Rights Notes']}`);
  return lines.join('\n\n');
}

function parsePbsOffer(rawText, mode = 'series') {
  const visibleText = String(rawText || '').trim();
  if (!visibleText) throw new Error('Paste a PBS offer first.');
  const sections = splitPbsOfferSections(visibleText);
  const releaseTitle = pbsImportVisibleText(sections['Release Title']);
  if (!releaseTitle) throw new Error('Could not find “Release Title” in that PBS offer.');

  const { rightsBegin, rightsEnd } = parseTermDates(visibleText);
  const importYear = defaultImportYear(sections, rightsBegin);
  const episodeNumbers = parseEpisodeNumberList(sections['Episode Number(s)']);
  const episodeListings = parseEpisodeListings(sections['Dates, episodes #s & titles'], importYear);
  const scheduleMeta = extractPrimaryScheduleMeta(sections['DATES/TIMES']);
  const airingFields = buildAiringFields(scheduleMeta, episodeListings);
  const contentIdentifier = pbsImportVisibleText(sections['Content Identifier']);
  const distributor = pbsImportVisibleText(sections['Distributor']) || 'PBS';
  const source = /\bvia\s+sIX\b/i.test(visibleText) ? 'sIX' : DEFAULT_NEW_PROGRAM_VALUES.server_tape;
  const description = pbsImportVisibleText(sections['About this program']);
  const episodeSeasonSeries = buildEpisodeSeasonValue(episodeNumbers.length ? episodeNumbers : episodeListings.map((episode) => episode.episodeCode).filter(Boolean));
  const firstEpisode = episodeListings[0] || { episodeCode: episodeNumbers[0] || '', title: '' };
  const programType = mode === 'program' ? 'Program' : ((episodeNumbers.length > 1 || episodeListings.length > 1) ? 'Series' : 'Program');
  const title = mode === 'program'
    ? (firstEpisode.title ? `${releaseTitle}: ${firstEpisode.title}` : `${releaseTitle}${firstEpisode.episodeCode ? ` #${firstEpisode.episodeCode}` : ''}`)
    : releaseTitle;
  const episodeSeason = mode === 'program'
    ? normalizeText([firstEpisode.episodeCode ? `#${firstEpisode.episodeCode}` : '', firstEpisode.title || ''].filter(Boolean).join(' '))
    : episodeSeasonSeries;
  const rightsNotes = buildRightsNotes({
    productionCompanies: pbsImportVisibleText(sections['Production Companies']),
    scheduleNotes: pbsImportVisibleText(sections['Schedule Notes']),
    programNotes: pbsImportVisibleText(sections['Program Notes']),
    repeatSchedule: pbsImportVisibleText(sections['REPEAT DT/TM']),
    embeddedPromo: pbsImportVisibleText(sections['EMBEDDED PROMO']),
    episodeListings
  }, sections);

  const warnings = [];
  if (!scheduleMeta.length) warnings.push('No main HD01/HD03 schedule line was detected, so airing fields may need to be filled manually.');
  if (mode === 'program' && (episodeListings.length > 1 || episodeNumbers.length > 1)) warnings.push('Program draft mode only prefills the first listed episode in this first pass.');
  if (sections['REPEAT DT/TM']) warnings.push('Repeat schedule was copied into Rights Notes instead of the aired fields.');
  if (sections['EMBEDDED PROMO']) warnings.push('Embedded promo details were copied into Rights Notes, not separate structured fields.');

  return {
    mode,
    sections,
    releaseTitle,
    contentIdentifier,
    distributor,
    source,
    description,
    rightsBegin,
    rightsEnd,
    episodeNumbers,
    episodeListings,
    primaryScheduleLines: scheduleMeta,
    warnings,
    payload: {
      title,
      nola_eidr: contentIdentifier,
      notes: description,
      episode_season: episodeSeason,
      program_type: programType,
      rights_begin: rightsBegin,
      rights_end: rightsEnd,
      rights_notes: rightsNotes,
      package_type: DEFAULT_NEW_PROGRAM_VALUES.package_type,
      server_tape: source,
      distributor,
      aired_13_1: airingFields.aired_13_1,
      aired_13_3: airingFields.aired_13_3
    }
  };
}

function previewLine(label, value) {
  return `<div class="pbs-preview-line"><span class="pbs-preview-label">${escapeHtml(label)}</span><span class="pbs-preview-value">${escapeHtml(value || '—')}</span></div>`;
}

function renderPbsImportPreview(parsed) {
  if (!els.pbsImportPreview) return;
  if (!parsed) {
    els.pbsImportPreview.innerHTML = '';
    els.pbsImportPreview.classList.add('hidden');
    return;
  }
  const preview = [
    previewLine('Title', parsed.payload.title),
    previewLine('NOLA', parsed.payload.nola_eidr),
    previewLine('Type', parsed.payload.program_type),
    previewLine('Season / Episode', parsed.payload.episode_season),
    previewLine('Rights', [formatShortDateInput(parsed.payload.rights_begin), formatShortDateInput(parsed.payload.rights_end)].filter(Boolean).join(' → ')),
    previewLine('Distributor', parsed.payload.distributor),
    previewLine('Source', parsed.payload.server_tape),
    previewLine('Aired on 13.1', parsed.payload.aired_13_1),
    previewLine('Aired on 13.3', parsed.payload.aired_13_3)
  ].join('');
  const warnings = parsed.warnings.length
    ? `<div class="pbs-preview-warnings">${parsed.warnings.map((warning) => `<div>• ${escapeHtml(warning)}</div>`).join('')}</div>`
    : '';
  const episodeSummary = parsed.episodeListings.length
    ? `<div class="pbs-preview-episodes"><strong>Episodes found:</strong> ${parsed.episodeListings.map((episode) => `${escapeHtml(episode.date)} #${escapeHtml(episode.episodeCode)}${episode.title ? ` “${escapeHtml(episode.title)}”` : ''}`).join(' · ')}</div>`
    : '';
  els.pbsImportPreview.innerHTML = `
    <div class="pbs-preview-card">
      <div class="pbs-preview-title">PBS import preview</div>
      <div class="pbs-preview-grid">${preview}</div>
      ${episodeSummary}
      ${warnings}
      <div class="pbs-preview-actions">
        <button type="button" id="applyPbsImportBtn" class="primary">Fill new draft</button>
      </div>
    </div>
  `;
  els.pbsImportPreview.classList.remove('hidden');
}

function setSelectFieldValue(fieldName, value) {
  const field = els.programForm?.elements?.[fieldName];
  if (!field) return;
  if (field.tagName === 'SELECT') {
    const target = normalizeLower(value);
    let matched = Array.from(field.options).find((option) => normalizeLower(option.value) === target || normalizeLower(option.textContent) === target);
    if (!matched && value) {
      ensureEditorSelectOption(fieldName, value);
      matched = Array.from(field.options).find((option) => normalizeLower(option.value) === target || normalizeLower(option.textContent) === target);
    }
    field.value = matched ? matched.value : (value || '');
    return;
  }
  field.value = value || '';
}

function applyPbsImportToForm(parsed) {
  if (!parsed || !els.programForm) return;
  const form = els.programForm;
  const payload = parsed.payload || {};
  form.elements.title.value = payload.title || '';
  form.elements.nola_eidr.value = payload.nola_eidr || '';
  form.elements.notes.value = payload.notes || '';
  form.elements.episode_season.value = payload.episode_season || '';
  form.elements.rights_notes.value = payload.rights_notes || '';
  form.elements.aired_13_1.value = payload.aired_13_1 || '';
  form.elements.aired_13_3.value = payload.aired_13_3 || '';
  form.elements.rights_begin.value = formatShortDateInput(payload.rights_begin) || '';
  form.elements.rights_end.value = formatShortDateInput(payload.rights_end) || '';
  setSelectFieldValue('program_type', payload.program_type || '');
  setSelectFieldValue('package_type', payload.package_type || DEFAULT_NEW_PROGRAM_VALUES.package_type);
  setSelectFieldValue('server_tape', payload.server_tape || DEFAULT_NEW_PROGRAM_VALUES.server_tape);
  setSelectFieldValue('topic', '');
  form.elements.distributor.value = payload.distributor || '';
  ['rights_begin', 'rights_end'].forEach(syncDateProxyField);
  updateVoteVisibility();
  renderDuplicateCheck();
  updateLookupButtonState();
  renderFormFlags(null);
  state.pbsImportPanelOpen = false;
  updatePbsImportVisibility();
  setStatus('PBS offer parsed into a new draft. Review the fields, then save when ready.');
  requestAnimationFrame(() => form.elements.title.focus());
}

function resetPbsImportUi(options = {}) {
  state.pbsImportData = null;
  if (options.clearText && els.pbsOfferInput) els.pbsOfferInput.value = '';
  renderPbsImportPreview(null);
}

function togglePbsImportPanel(forceOpen = null) {
  state.pbsImportPanelOpen = forceOpen == null ? !state.pbsImportPanelOpen : Boolean(forceOpen);
  updatePbsImportVisibility();
  if (state.pbsImportPanelOpen) requestAnimationFrame(() => els.pbsOfferInput?.focus());
}
