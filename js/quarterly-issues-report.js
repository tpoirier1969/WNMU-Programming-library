// Quarterly Issues & Programming Report Builder
// Proper standalone feature page. Read-only against Supabase/current program data.
// Category suggestions are based on description text, not title keywords.

(function () {
  'use strict';

  const VERSION = '1.0.0';

  const CATEGORY_DEFINITIONS = [
    {
      key: 'children_education_programming',
      label: 'Children’s Education / Programming',
      terms: [
        'children', 'child', 'kids', 'youth', 'young people', 'preschool', 'pre-school',
        'early learning', 'kindergarten', 'school readiness', 'caregiver', 'family learning',
        'pbs kids', 'children’s programming', "children's programming"
      ]
    },
    {
      key: 'educational_issues',
      label: 'Educational Issues',
      terms: [
        'education', 'educational', 'school', 'schools', 'student', 'students', 'teacher',
        'teachers', 'college', 'university', 'learning', 'literacy', 'classroom',
        'academic', 'workforce training', 'career technical', 'apprenticeship'
      ]
    },
    {
      key: 'economy_business',
      label: 'Economy and Business',
      terms: [
        'economy', 'economic', 'business', 'businesses', 'jobs', 'job', 'workforce',
        'employment', 'industry', 'industries', 'tourism', 'mining', 'manufacturing',
        'market', 'financial', 'finance', 'development', 'redevelopment', 'housing',
        'small business', 'labor', 'entrepreneur'
      ]
    },
    {
      key: 'health_issues',
      label: 'Health Issues',
      terms: [
        'health', 'medical', 'medicine', 'hospital', 'doctor', 'nurse', 'disease',
        'cancer', 'mental health', 'addiction', 'substance use', 'opioid', 'disability',
        'rehabilitation', 'wellness', 'aging', 'elder care', 'caregiving',
        'public health', 'nutrition', 'suicide', 'dementia', 'alzheimer'
      ]
    },
    {
      key: 'environmental_issues',
      label: 'Environmental Issues',
      terms: [
        'environment', 'environmental', 'climate', 'conservation', 'water', 'watershed',
        'great lakes', 'lake superior', 'shoreline', 'forest', 'wildlife', 'pollution',
        'sustainability', 'renewable', 'energy', 'invasive species', 'ecology',
        'habitat', 'fisheries', 'wetland', 'mining', 'contamination'
      ]
    },
    {
      key: 'legal_civil_rights',
      label: 'Legal / Civil Rights',
      terms: [
        'legal', 'law', 'court', 'justice', 'civil rights', 'rights', 'accessibility',
        'discrimination', 'equity', 'treaty', 'sovereignty', 'voting rights',
        'public safety', 'criminal justice', 'policing', 'constitutional', 'advocacy'
      ]
    },
    {
      key: 'political_government',
      label: 'Political / Government Issues',
      terms: [
        'government', 'political', 'politics', 'policy', 'public policy', 'election',
        'elections', 'legislature', 'legislative', 'governor', 'congress', 'senate',
        'representative', 'state budget', 'city council', 'county board',
        'public officials', 'municipal', 'county', 'statehouse', 'campaign'
      ]
    },
    {
      key: 'arts_humanities_cultural',
      label: 'Arts / Humanities / Cultural Issues',
      terms: [
        'art', 'arts', 'artist', 'artists', 'music', 'musical', 'theatre', 'theater',
        'history', 'historic', 'humanities', 'culture', 'cultural', 'heritage',
        'tradition', 'storytelling', 'literature', 'museum', 'documentary',
        'performance', 'poetry', 'film', 'craft'
      ]
    },
    {
      key: 'historically_underrepresented',
      label: 'Historically Underrepresented',
      terms: [
        'indigenous', 'native american', 'ojibwe', 'anishinaabe', 'tribal', 'tribe',
        'black', 'african american', 'latino', 'latina', 'hispanic', 'women',
        'disability community', 'disabled', 'veterans', 'immigrant', 'refugee',
        'underserved', 'underrepresented', 'lgbtq', 'rural poor'
      ]
    }
  ];

  const REVIEW_STATUSES = [
    'Needs Review',
    'Approved',
    'Exclude',
    'Needs Better Description',
    'Category Changed'
  ];

  const REQUIRED_CONFIG_MESSAGE = 'Missing Supabase config. Check config.js.';

  const app = {
    supabase: null,
    session: null,
    programs: [],
    rows: [],
    filteredRows: []
  };

  const els = {};

  function $(selector) {
    return document.querySelector(selector);
  }

  function text(value) {
    return String(value ?? '').trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function csvEscape(value) {
    const out = String(value ?? '');
    if (/[",\n\r]/.test(out)) return `"${out.replaceAll('"', '""')}"`;
    return out;
  }

  function setStatus(message) {
    if (els.status) els.status.textContent = message || '';
  }

  function showOnly(section) {
    [els.setupNotice, els.adminRequired, els.builder].forEach((el) => el?.classList.add('hidden'));
    section?.classList.remove('hidden');
  }

  function hasValidConfig() {
    const config = window.APP_CONFIG || {};
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && String(config.SUPABASE_URL).startsWith('http'));
  }

  function noStoreFetch(input, init = {}) {
    return fetch(input, { ...init, cache: 'no-store' });
  }

  async function initSupabase() {
    const config = window.APP_CONFIG || {};
    app.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      global: { fetch: noStoreFetch }
    });

    const { data, error } = await app.supabase.auth.getSession();
    if (error) throw error;
    app.session = data?.session || null;
  }

  async function signOut() {
    if (!app.supabase) return;
    await app.supabase.auth.signOut();
    app.session = null;
    app.programs = [];
    app.rows = [];
    app.filteredRows = [];
    els.signOutBtn?.classList.add('hidden');
    showOnly(els.adminRequired);
    setStatus('Signed out. Admin mode is required.');
  }

  async function fetchAllPrograms() {
    const pageSize = 1000;
    let from = 0;
    const rows = [];
    const selectFields = [
      'id',
      'title',
      'nola_eidr',
      'notes',
      'episode_season',
      'program_type',
      'length_minutes',
      'topic',
      'secondary_topic',
      'aired_13_1',
      'aired_13_3',
      'distributor',
      'is_archived'
    ].join(',');

    while (true) {
      setStatus(`Loading program data… ${rows.length.toLocaleString()} rows so far`);
      const { data, error } = await app.supabase
        .from('programs_enriched')
        .select(selectFields)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    app.programs = rows;
    setStatus(`Loaded ${rows.length.toLocaleString()} program records. Ready to build a draft.`);
    populateQuarterOptions();
  }

  function twoDigitYearToFour(yearText) {
    const year = Number(yearText);
    if (String(yearText).length === 2) return year >= 70 ? 1900 + year : 2000 + year;
    return year;
  }

  function validIso(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return '';
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function parseIsoFromAiringEntry(entry) {
    const raw = text(entry);
    if (!raw) return '';

    const iso = raw.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

    const slash = raw.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})\b/);
    if (slash) return validIso(twoDigitYearToFour(slash[3]), Number(slash[1]), Number(slash[2]));

    return '';
  }

  function quarterForIso(isoDate) {
    const month = Number(String(isoDate || '').slice(5, 7));
    if (!month) return '';
    return `Q${Math.floor((month - 1) / 3) + 1}`;
  }

  function yearForIso(isoDate) {
    return String(isoDate || '').slice(0, 4);
  }

  function quarterMonths(quarter) {
    return {
      Q1: 'Jan–Mar',
      Q2: 'Apr–Jun',
      Q3: 'Jul–Sep',
      Q4: 'Oct–Dec'
    }[quarter] || '';
  }

  function splitAiringText(value) {
    const normalized = text(value)
      .replace(/\r/g, '')
      .replace(/\n+/g, ';')
      .replace(/\s*;\s*/g, ';')
      .replace(/,\s*(?=\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|20\d{2}-\d{1,2}-\d{1,2})/g, ';');

    if (!normalized) return [];
    return normalized.split(';').map(text).filter(Boolean);
  }

  function airingsForProgram(program, channelMode) {
    const fields = channelMode === 'both'
      ? [['13.1', 'aired_13_1'], ['13.3', 'aired_13_3']]
      : [[channelMode, channelMode === '13.3' ? 'aired_13_3' : 'aired_13_1']];

    const airings = [];

    fields.forEach(([channel, field]) => {
      splitAiringText(program[field]).forEach((entry) => {
        const iso = parseIsoFromAiringEntry(entry);
        if (!iso) return;
        airings.push({
          channel,
          entry,
          iso,
          year: yearForIso(iso),
          quarter: quarterForIso(iso)
        });
      });
    });

    return airings.sort((a, b) => a.iso.localeCompare(b.iso) || a.channel.localeCompare(b.channel));
  }

  function quarterKey(airing) {
    return `${airing.year}-${airing.quarter}`;
  }

  function availableQuarters() {
    const keys = new Set();

    app.programs.forEach((program) => {
      airingsForProgram(program, 'both').forEach((airing) => {
        if (airing.year && airing.quarter) keys.add(quarterKey(airing));
      });
    });

    return Array.from(keys).sort().reverse();
  }

  function populateQuarterOptions() {
    if (!els.quarterSelect) return;
    const previous = els.quarterSelect.value;
    const keys = availableQuarters();

    if (!keys.length) {
      const now = new Date();
      keys.push(`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`);
    }

    els.quarterSelect.innerHTML = keys.map((key) => {
      const [year, quarter] = key.split('-');
      return `<option value="${escapeHtml(key)}">${escapeHtml(year)} ${escapeHtml(quarter)} · ${escapeHtml(quarterMonths(quarter))}</option>`;
    }).join('');

    if (previous && keys.includes(previous)) els.quarterSelect.value = previous;
  }

  function findDescriptionMatches(descriptionLower, terms) {
    return terms.filter((term) => descriptionLower.includes(term));
  }

  function categorizeFromDescription(program) {
    const description = text(program.notes);
    const descriptionLower = lower(description);

    if (!descriptionLower) {
      return {
        categories: [],
        confidence: 'Needs description',
        reason: 'No description is available, so categories were not guessed from the title.'
      };
    }

    const matches = CATEGORY_DEFINITIONS
      .map((definition) => ({
        key: definition.key,
        label: definition.label,
        terms: findDescriptionMatches(descriptionLower, definition.terms)
      }))
      .filter((match) => match.terms.length);

    if (!matches.length) {
      return {
        categories: [],
        confidence: 'Needs review',
        reason: 'Description did not clearly match the standing issue categories.'
      };
    }

    const strongest = Math.max(...matches.map((match) => match.terms.length));
    const confidence = strongest >= 3 || matches.length >= 3
      ? 'High'
      : (strongest >= 2 || matches.length >= 2 ? 'Medium' : 'Low');

    const reason = matches
      .slice(0, 5)
      .map((match) => `${match.label}: ${match.terms.slice(0, 4).join(', ')}`)
      .join(' | ');

    return {
      categories: matches.map((match) => match.key),
      confidence,
      reason: `Matched description terms — ${reason}`
    };
  }

  function formatAirings(airings) {
    return airings.map((airing) => `${airing.channel} ${airing.entry}`).join('; ');
  }

  function buildRows() {
    const quarterKeyValue = els.quarterSelect.value;
    const channelMode = els.channelSelect.value || '13.1';
    const archivedMode = els.archivedModeSelect.value || 'active';
    const [year, quarter] = String(quarterKeyValue || '').split('-');

    const rows = app.programs
      .filter((program) => archivedMode === 'all' || !program.is_archived)
      .map((program) => {
        const matchingAirings = airingsForProgram(program, channelMode)
          .filter((airing) => airing.year === year && airing.quarter === quarter);

        if (!matchingAirings.length) return null;

        const categoryInfo = categorizeFromDescription(program);
        const reviewStatus = categoryInfo.categories.length
          ? 'Needs Review'
          : (text(program.notes) ? 'Needs Review' : 'Needs Better Description');

        return {
          id: String(program.id),
          title: text(program.title),
          nola: text(program.nola_eidr),
          duration: text(program.length_minutes),
          programType: text(program.program_type),
          distributor: text(program.distributor),
          topic: text(program.topic),
          secondaryTopic: text(program.secondary_topic),
          description: text(program.notes),
          airings: matchingAirings,
          airingsText: formatAirings(matchingAirings),
          categories: categoryInfo.categories,
          confidence: categoryInfo.confidence,
          reason: categoryInfo.reason,
          reviewStatus
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const firstAiringA = a.airings[0]?.iso || '';
        const firstAiringB = b.airings[0]?.iso || '';
        return firstAiringA.localeCompare(firstAiringB) || a.title.localeCompare(b.title);
      });

    app.rows = rows;
    applySearchFilter();
    setStatus(`Built draft with ${rows.length.toLocaleString()} candidate rows.`);
  }

  function renderSummary(rows) {
    if (!els.summary) return;

    if (!rows.length) {
      els.summary.classList.add('hidden');
      els.exportCsvBtn.disabled = true;
      els.printBtn.disabled = true;
      return;
    }

    const missingDescriptions = rows.filter((row) => !row.description).length;
    const noCategory = rows.filter((row) => !row.categories.length).length;
    const highConfidence = rows.filter((row) => row.confidence === 'High').length;
    const mediumConfidence = rows.filter((row) => row.confidence === 'Medium').length;

    els.summary.classList.remove('hidden');
    els.summary.innerHTML = `
      <div class="qir-summary-grid">
        <div class="qir-summary-item">
          <div class="qir-summary-label">Candidates</div>
          <div class="qir-summary-value">${rows.length.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Missing descriptions</div>
          <div class="qir-summary-value">${missingDescriptions.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Need category review</div>
          <div class="qir-summary-value">${noCategory.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">High confidence</div>
          <div class="qir-summary-value">${highConfidence.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Medium confidence</div>
          <div class="qir-summary-value">${mediumConfidence.toLocaleString()}</div>
        </div>
      </div>
    `;

    els.exportCsvBtn.disabled = !rows.length;
    els.printBtn.disabled = !rows.length;
  }

  function categoryCheckboxes(row) {
    return `<div class="qir-category-list">${CATEGORY_DEFINITIONS.map((definition) => {
      const checked = row.categories.includes(definition.key) ? 'checked' : '';
      return `
        <label class="qir-category-check">
          <input type="checkbox" data-category-key="${escapeHtml(definition.key)}" ${checked} />
          <span>${escapeHtml(definition.label)}</span>
        </label>
      `;
    }).join('')}</div>`;
  }

  function reviewStatusSelect(row) {
    return `
      <select class="qir-review-select" data-review-status>
        ${REVIEW_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${status === row.reviewStatus ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
      </select>
      <div class="qir-confidence" data-level="${escapeHtml(row.confidence)}">${escapeHtml(row.confidence)}</div>
    `;
  }

  function renderRows(rows) {
    renderSummary(app.rows);

    if (!rows.length) {
      els.output.innerHTML = '<div class="qir-empty">No matching draft rows. Check quarter/channel, or clear the search box.</div>';
      return;
    }

    els.output.innerHTML = `
      <div class="qir-table-wrap">
        <table class="qir-table">
          <thead>
            <tr>
              <th>Review</th>
              <th>Program / Airings</th>
              <th>Description</th>
              <th>Categories</th>
              <th>Reason</th>
              <th>Local note</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr data-row-id="${escapeHtml(row.id)}">
                <td>${reviewStatusSelect(row)}</td>
                <td>
                  <div class="qir-program-title">${escapeHtml(row.title || 'Untitled')}</div>
                  ${row.nola ? `<div class="qir-muted">${escapeHtml(row.nola)}</div>` : ''}
                  <div class="qir-airings">${escapeHtml(row.airingsText)}</div>
                  ${row.duration ? `<div class="qir-muted">Duration: ${escapeHtml(row.duration)}</div>` : ''}
                  ${row.programType ? `<div class="qir-muted">Type: ${escapeHtml(row.programType)}</div>` : ''}
                </td>
                <td>
                  <div class="qir-description">
                    ${row.description ? escapeHtml(row.description) : '<span class="qir-warning">No description available.</span>'}
                  </div>
                </td>
                <td>${categoryCheckboxes(row)}</td>
                <td><div class="qir-reason">${escapeHtml(row.reason)}</div></td>
                <td><textarea class="qir-local-note" data-local-note placeholder="Optional report note"></textarea></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function applySearchFilter() {
    const query = lower(els.searchInput?.value || '');
    if (!query) {
      app.filteredRows = [...app.rows];
    } else {
      app.filteredRows = app.rows.filter((row) => {
        const haystack = [
          row.title,
          row.nola,
          row.airingsText,
          row.duration,
          row.programType,
          row.distributor,
          row.topic,
          row.secondaryTopic,
          row.description,
          row.reason,
          row.reviewStatus,
          ...row.categories.map((key) => CATEGORY_DEFINITIONS.find((definition) => definition.key === key)?.label || key)
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }
    renderRows(app.filteredRows);
  }

  function collectVisibleExportRows() {
    const tableRows = Array.from(document.querySelectorAll('[data-row-id]'));
    return tableRows.map((tr) => {
      const id = tr.dataset.rowId;
      const source = app.rows.find((row) => row.id === id);
      const categories = Array.from(tr.querySelectorAll('[data-category-key]:checked')).map((input) => input.dataset.categoryKey);
      const categoryLabels = CATEGORY_DEFINITIONS
        .filter((definition) => categories.includes(definition.key))
        .map((definition) => definition.label);

      return {
        ...source,
        reviewStatus: tr.querySelector('[data-review-status]')?.value || source?.reviewStatus || '',
        categories,
        categoryLabels,
        localNote: tr.querySelector('[data-local-note]')?.value || ''
      };
    }).filter(Boolean);
  }

  function exportCsv() {
    const rows = collectVisibleExportRows();
    const categoryHeaders = CATEGORY_DEFINITIONS.map((definition) => definition.label);
    const columns = [
      'Review Status',
      'Program Title',
      'NOLA',
      'Airings',
      'Duration',
      'Description',
      ...categoryHeaders,
      'Suggested Categories',
      'Confidence',
      'Reason',
      'Local Note'
    ];

    const lines = [columns.map(csvEscape).join(',')];

    rows.forEach((row) => {
      const categorySet = new Set(row.categories || []);
      lines.push([
        row.reviewStatus,
        row.title,
        row.nola,
        row.airingsText,
        row.duration,
        row.description,
        ...CATEGORY_DEFINITIONS.map((definition) => categorySet.has(definition.key) ? 'X' : ''),
        row.categoryLabels.join('; '),
        row.confidence,
        row.reason,
        row.localNote
      ].map(csvEscape).join(','));
    });

    const quarter = els.quarterSelect.value || 'quarter';
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quarterly-issues-programming-draft-${quarter}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    els.buildBtn?.addEventListener('click', buildRows);
    els.exportCsvBtn?.addEventListener('click', exportCsv);
    els.printBtn?.addEventListener('click', () => window.print());
    els.refreshBtn?.addEventListener('click', async () => {
      try {
        await fetchAllPrograms();
      } catch (error) {
        console.error(error);
        setStatus(error.message || String(error));
        alert(error.message || String(error));
      }
    });
    els.signOutBtn?.addEventListener('click', signOut);
    els.searchInput?.addEventListener('input', applySearchFilter);
    els.quarterSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
    els.channelSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
    els.archivedModeSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
  }

  function cacheElements() {
    els.status = $('#qirStatus');
    els.setupNotice = $('#qirSetupNotice');
    els.adminRequired = $('#qirAdminRequired');
    els.builder = $('#qirBuilder');
    els.quarterSelect = $('#qirQuarterSelect');
    els.channelSelect = $('#qirChannelSelect');
    els.archivedModeSelect = $('#qirArchivedModeSelect');
    els.searchInput = $('#qirSearchInput');
    els.buildBtn = $('#qirBuildBtn');
    els.exportCsvBtn = $('#qirExportCsvBtn');
    els.printBtn = $('#qirPrintBtn');
    els.refreshBtn = $('#qirRefreshBtn');
    els.signOutBtn = $('#qirSignOutBtn');
    els.summary = $('#qirSummary');
    els.output = $('#qirOutput');
  }

  async function init() {
    cacheElements();
    bindEvents();

    if (!hasValidConfig()) {
      setStatus(REQUIRED_CONFIG_MESSAGE);
      showOnly(els.setupNotice);
      return;
    }

    try {
      await initSupabase();

      if (!app.session) {
        setStatus('Admin mode is required.');
        showOnly(els.adminRequired);
        return;
      }

      els.signOutBtn?.classList.remove('hidden');
      showOnly(els.builder);
      setStatus('Admin session found. Loading current program data…');
      await fetchAllPrograms();
    } catch (error) {
      console.error(error);
      setStatus(error.message || String(error));
      showOnly(els.adminRequired);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.WNMUQuarterlyIssuesReport = {
    version: VERSION,
    categoryDefinitions: CATEGORY_DEFINITIONS,
    categorizeFromDescription,
    parseIsoFromAiringEntry
  };
})();
