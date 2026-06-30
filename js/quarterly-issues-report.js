// Quarterly Issues & Programming Report Builder prototype v1.1.0
// Standalone prototype only. Not wired into the main app.
// Reads all current records, including archived records. Does not write to Supabase.
// Candidate selection is strict: known local/Michigan public-affairs series or description-proven regional impact.

(function () {
  'use strict';

  const VERSION = '1.1.0';

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
        'academic', 'workforce training', 'career technical', 'apprenticeship',
        'science', 'scientific', 'research', 'stem', 'technology', 'engineering',
        'dinosaurs', 'dinosaur', 'paleontology', 'palaeontology', 'fossil', 'fossils',
        'space', 'astronomy', 'physics', 'chemistry', 'biology'
      ]
    },
    {
      key: 'economy_business',
      label: 'Economy and Business',
      terms: [
        'economy', 'economic', 'business', 'businesses', 'jobs', 'job', 'workforce',
        'employment', 'industry', 'industries', 'tourism', 'mining', 'manufacturing',
        'market', 'financial', 'finance', 'development', 'redevelopment', 'housing',
        'small business', 'labor', 'entrepreneur', 'tax', 'wages'
      ]
    },
    {
      key: 'health_issues',
      label: 'Health Issues',
      terms: [
        'health care', 'healthcare', 'public health', 'medical', 'medicine', 'hospital',
        'doctor', 'nurse', 'disease', 'cancer', 'mental health', 'behavioral health',
        'addiction', 'substance use', 'opioid', 'disability', 'rehabilitation',
        'aging', 'elder care', 'caregiving', 'nutrition access', 'food insecurity',
        'suicide', 'dementia', 'alzheimer'
      ]
    },
    {
      key: 'environmental_issues',
      label: 'Environmental Issues',
      terms: [
        'environment', 'environmental', 'climate', 'conservation', 'water', 'watershed',
        'great lakes', 'lake superior', 'shoreline', 'forest', 'wildlife', 'pollution',
        'sustainability', 'renewable', 'energy policy', 'invasive species', 'ecology',
        'habitat', 'fisheries', 'wetland', 'mining', 'contamination', 'copperwood'
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
        'public officials', 'municipal', 'county', 'statehouse', 'campaign', 'medicare',
        'snap', 'regulatory'
      ]
    },
    {
      key: 'arts_humanities_cultural',
      label: 'Arts / Humanities / Cultural Issues',
      terms: [
        'art', 'arts', 'artist', 'artists', 'music', 'musical', 'theatre', 'theater',
        'humanities', 'culture', 'cultural', 'heritage', 'tradition', 'storytelling',
        'literature', 'museum', 'performance', 'poetry', 'film', 'craft', 'choir',
        'historic preservation', 'local history', 'regional history'
      ]
    },
    {
      key: 'historically_underrepresented',
      label: 'Historically Underrepresented',
      terms: [
        'indigenous', 'native american', 'ojibwe', 'anishinaabe', 'tribal', 'tribe',
        'black', 'african american', 'latino', 'latina', 'hispanic', 'women',
        'disability community', 'disabled', 'veterans', 'immigrant', 'refugee',
        'underserved', 'underrepresented', 'lgbtq', 'rural poor', 'boarding school'
      ]
    }
  ];

  const REVIEW_STATUSES = [
    'Needs Review',
    'Approved',
    'Exclude',
    'Needs Better Description',
    'Needs External Detail',
    'Category Changed'
  ];

  const REGIONAL_TERMS = [
    'upper peninsula', 'u.p.', 'up michigan', 'northern michigan', 'michigan',
    'marquette', 'negaunee', 'ishpeming', 'munising', 'escanga', 'escanaba',
    'manistique', 'houghton', 'hancock', 'calumet', 'keweenaw', 'iron mountain',
    'ironwood', 'sault ste. marie', 'sault saint marie', 'saulte ste. marie',
    'lake superior', 'great lakes', 'copper country', 'mackinac', 'wkar',
    'lansing', 'detroit', 'flint', 'grand rapids', 'nmu', 'northern michigan university',
    'michigan state', 'michigan legislature', 'michigan voters', 'michigan residents',
    'tribal communities', 'anishinaabe', 'ojibwe', 'great lakes region'
  ];

  const KNOWN_INCLUDE_SERIES = [
    {
      test: /\bmedia meet\b/i,
      categories: [],
      status: 'Needs Review',
      reason: 'Known WNMU/local public-affairs series. Use description to finalize categories.'
    },
    {
      test: /\bask the experts\b/i,
      categories: [],
      status: 'Needs Review',
      reason: 'Known WNMU/local issue series. Use episode topic/description to finalize categories.'
    },
    {
      test: /\boff the record\b/i,
      categories: ['political_government'],
      status: 'Needs External Detail',
      reason: 'Known Michigan public-affairs series. Episode-specific issue details should be pulled from WKAR before final filing.'
    },
    {
      test: /\bpublic eye news\b/i,
      categories: ['political_government'],
      status: 'Needs Review',
      reason: 'Known local/regional news/public-affairs programming.'
    },
    {
      test: /\bnative report\b/i,
      categories: ['historically_underrepresented'],
      status: 'Needs Review',
      reason: 'Known Indigenous/community-affairs series; confirm episode issue from description.'
    },
    {
      test: /\bict news\b/i,
      categories: ['historically_underrepresented'],
      status: 'Needs Review',
      reason: 'Known Indigenous/community-affairs news series; confirm episode issue from description.'
    },
    {
      test: /\bwhat'?s u\.?p\.?\b/i,
      categories: [],
      status: 'Needs Review',
      reason: 'Known regional/local series. Confirm issue and category from episode description.'
    }
  ];

  const GENERIC_EXCLUDE_PATTERNS = [
    /\bwai lana yoga\b/i,
    /\byoga\b/i,
    /\bpilates\b/i,
    /\bstretch(?:ing)?\b/i,
    /\bfitness\b/i,
    /\bworkout\b/i,
    /\bexercise\b/i,
    /\bcooking\b/i,
    /\bcook(?:s|ing)?\b/i,
    /\brecipe\b/i,
    /\brecipes\b/i,
    /\bkitchen\b/i,
    /\bchef\b/i,
    /\bfood show\b/i,
    /\boutdoor eats\b/i,
    /\btravel\b/i,
    /\bpainting\b/i,
    /\bsewing\b/i,
    /\bquilting\b/i,
    /\bgardening\b/i,
    /\bwoodsmith\b/i,
    /\bthis old house\b/i,
    /\bask this old house\b/i,
    /\bcrafts?\b/i,
    /\blifestyle\b/i
  ];

  const NATIONAL_ONLY_SERIES_PATTERNS = [
    /\benergy switch\b/i,
    /\bamanpour\b/i,
    /\bnewshour\b/i,
    /\bwashington week\b/i,
    /\bfiring line\b/i,
    /\bfrontline\b/i,
    /\bnova\b/i,
    /\bnature\b/i,
    /\bamerican experience\b/i,
    /\bamerican masters\b/i,
    /\bpov\b/i,
    /\bindependent lens\b/i
  ];

  const app = {
    supabase: null,
    session: null,
    programs: [],
    rows: [],
    includedRows: [],
    rejectedRows: [],
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
    app.includedRows = [];
    app.rejectedRows = [];
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
      setStatus(`Loading all program records… ${rows.length.toLocaleString()} rows so far`);
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
    setStatus(`Loaded ${rows.length.toLocaleString()} total records, including archived records.`);
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

  function hasAnyTerm(haystackLower, terms) {
    return terms.some((term) => haystackLower.includes(term));
  }

  function matchingTerms(haystackLower, terms) {
    return terms.filter((term) => haystackLower.includes(term));
  }

  function isRegionallyRelevant(program) {
    const description = lower(program.notes);
    const combined = `${lower(program.title)} ${description} ${lower(program.topic)} ${lower(program.secondary_topic)}`;
    return hasAnyTerm(combined, REGIONAL_TERMS);
  }

  function knownIncludeSeries(program) {
    const title = text(program.title);
    return KNOWN_INCLUDE_SERIES.find((entry) => entry.test.test(title)) || null;
  }

  function genericExcludeReason(program) {
    const title = text(program.title);
    const combined = `${title} ${text(program.notes)}`;

    const matchedGeneric = GENERIC_EXCLUDE_PATTERNS.find((pattern) => pattern.test(combined));
    if (matchedGeneric) {
      return 'Generic lifestyle/cooking/exercise/craft programming is excluded unless the description proves regional issue impact.';
    }

    const matchedNational = NATIONAL_ONLY_SERIES_PATTERNS.find((pattern) => pattern.test(title));
    if (matchedNational && !isRegionallyRelevant(program)) {
      return 'National-only series is excluded unless the description proves a local or regional issue connection.';
    }

    return '';
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
        terms: matchingTerms(descriptionLower, definition.terms)
      }))
      .filter((match) => match.terms.length);

    // Science/natural-history guard: a science description should not get Arts/Humanities
    // merely because broad history/culture words appear nearby.
    const hasScienceEducation = matches.some((match) => match.key === 'educational_issues')
      && hasAnyTerm(descriptionLower, ['science', 'scientific', 'dinosaurs', 'dinosaur', 'paleontology', 'fossil', 'fossils', 'natural history']);
    const cleanedMatches = hasScienceEducation
      ? matches.filter((match) => match.key !== 'arts_humanities_cultural' || match.terms.some((term) => ['art', 'arts', 'music', 'theatre', 'theater', 'culture', 'cultural', 'museum', 'local history', 'regional history'].includes(term)))
      : matches;

    if (!cleanedMatches.length) {
      return {
        categories: [],
        confidence: 'Needs review',
        reason: 'Description did not clearly match the standing issue categories.'
      };
    }

    const strongest = Math.max(...cleanedMatches.map((match) => match.terms.length));
    const confidence = strongest >= 3 || cleanedMatches.length >= 3
      ? 'High'
      : (strongest >= 2 || cleanedMatches.length >= 2 ? 'Medium' : 'Low');

    const reason = cleanedMatches
      .slice(0, 5)
      .map((match) => `${match.label}: ${match.terms.slice(0, 4).join(', ')}`)
      .join(' | ');

    return {
      categories: cleanedMatches.map((match) => match.key),
      confidence,
      reason: `Matched description terms — ${reason}`
    };
  }

  function mergeUniqueCategories(baseCategories, addedCategories) {
    return Array.from(new Set([...(baseCategories || []), ...(addedCategories || [])]));
  }

  function analyzeCandidate(program) {
    const includeRule = knownIncludeSeries(program);
    const categoryInfo = categorizeFromDescription(program);
    const regional = isRegionallyRelevant(program);
    const excludeReason = genericExcludeReason(program);

    if (includeRule) {
      const categories = mergeUniqueCategories(categoryInfo.categories, includeRule.categories);
      return {
        include: true,
        reviewStatus: includeRule.status || (categories.length ? 'Needs Review' : 'Needs Better Description'),
        categories,
        confidence: includeRule.categories?.length ? 'Medium' : categoryInfo.confidence,
        reason: `${includeRule.reason}${categoryInfo.categories.length ? ` ${categoryInfo.reason}` : ''}`.trim()
      };
    }

    if (excludeReason && !regional) {
      return {
        include: false,
        reviewStatus: 'Exclude',
        categories: [],
        confidence: 'Rejected',
        reason: excludeReason
      };
    }

    if (!regional) {
      return {
        include: false,
        reviewStatus: 'Exclude',
        categories: [],
        confidence: 'Rejected',
        reason: 'No local/regional impact found in title, topic, or description. PBS national/nonregional concerns are excluded from the station draft.'
      };
    }

    if (!categoryInfo.categories.length) {
      return {
        include: true,
        reviewStatus: 'Needs Review',
        categories: [],
        confidence: categoryInfo.confidence,
        reason: `Regional connection found, but category still needs review. ${categoryInfo.reason}`
      };
    }

    return {
      include: true,
      reviewStatus: 'Needs Review',
      categories: categoryInfo.categories,
      confidence: categoryInfo.confidence,
      reason: `Regional connection found. ${categoryInfo.reason}`
    };
  }

  function formatAirings(airings) {
    return airings.map((airing) => `${airing.channel} ${airing.entry}`).join('; ');
  }

  function buildRows() {
    const quarterKeyValue = els.quarterSelect.value;
    const channelMode = els.channelSelect.value || '13.1';
    const [year, quarter] = String(quarterKeyValue || '').split('-');

    const airedRows = app.programs
      .map((program) => {
        const matchingAirings = airingsForProgram(program, channelMode)
          .filter((airing) => airing.year === year && airing.quarter === quarter);

        if (!matchingAirings.length) return null;

        const analysis = analyzeCandidate(program);

        return {
          id: String(program.id),
          include: analysis.include,
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
          categories: analysis.categories,
          confidence: analysis.confidence,
          reason: analysis.reason,
          reviewStatus: analysis.reviewStatus,
          archived: Boolean(program.is_archived)
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const firstAiringA = a.airings[0]?.iso || '';
        const firstAiringB = b.airings[0]?.iso || '';
        return firstAiringA.localeCompare(firstAiringB) || a.title.localeCompare(b.title);
      });

    app.rows = airedRows;
    app.includedRows = airedRows.filter((row) => row.include);
    app.rejectedRows = airedRows.filter((row) => !row.include);
    applySearchFilter();

    setStatus(`Built strict draft: ${app.includedRows.length.toLocaleString()} included, ${app.rejectedRows.length.toLocaleString()} rejected from ${airedRows.length.toLocaleString()} aired rows.`);
  }

  function renderSummary() {
    if (!els.summary) return;

    if (!app.rows.length) {
      els.summary.classList.add('hidden');
      els.exportCsvBtn.disabled = true;
      els.printBtn.disabled = true;
      return;
    }

    const rows = app.includedRows;
    const missingDescriptions = rows.filter((row) => !row.description).length;
    const noCategory = rows.filter((row) => !row.categories.length).length;
    const externalDetail = rows.filter((row) => row.reviewStatus === 'Needs External Detail').length;

    els.summary.classList.remove('hidden');
    els.summary.innerHTML = `
      <div class="qir-summary-grid">
        <div class="qir-summary-item">
          <div class="qir-summary-label">Aired rows scanned</div>
          <div class="qir-summary-value">${app.rows.length.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Included candidates</div>
          <div class="qir-summary-value">${rows.length.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Rejected</div>
          <div class="qir-summary-value">${app.rejectedRows.length.toLocaleString()}</div>
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
          <div class="qir-summary-label">Need external detail</div>
          <div class="qir-summary-value">${externalDetail.toLocaleString()}</div>
        </div>
      </div>
    `;

    els.exportCsvBtn.disabled = !rows.length;
    els.printBtn.disabled = !rows.length;
  }

  function categoryCheckboxes(row) {
    if (!row.include) return '<span class="qir-muted">Rejected row</span>';
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

  function reviewStatusCell(row) {
    if (!row.include) {
      return `
        <span class="qir-reject-pill">Rejected</span>
        <div class="qir-confidence" data-level="Rejected">Audit only</div>
      `;
    }

    return `
      <select class="qir-review-select" data-review-status>
        ${REVIEW_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${status === row.reviewStatus ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
      </select>
      <div class="qir-confidence" data-level="${escapeHtml(row.confidence)}">${escapeHtml(row.confidence)}</div>
    `;
  }

  function renderRows(rows) {
    renderSummary();

    if (!rows.length) {
      els.output.innerHTML = '<div class="qir-empty">No matching rows. Check quarter/channel, clear the search box, or turn on rejected audit rows.</div>';
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
              <tr data-row-id="${escapeHtml(row.id)}" class="${row.include ? '' : 'qir-rejected-row'}">
                <td>${reviewStatusCell(row)}</td>
                <td>
                  <div class="qir-program-title">${escapeHtml(row.title || 'Untitled')}</div>
                  ${row.nola ? `<div class="qir-muted">${escapeHtml(row.nola)}</div>` : ''}
                  <div class="qir-airings">${escapeHtml(row.airingsText)}</div>
                  ${row.duration ? `<div class="qir-muted">Duration: ${escapeHtml(row.duration)}</div>` : ''}
                  ${row.programType ? `<div class="qir-muted">Type: ${escapeHtml(row.programType)}</div>` : ''}
                  ${row.archived ? '<div class="qir-muted">Archived record included in source scan</div>' : ''}
                </td>
                <td>
                  <div class="qir-description">
                    ${row.description ? escapeHtml(row.description) : '<span class="qir-warning">No description available.</span>'}
                  </div>
                </td>
                <td>${categoryCheckboxes(row)}</td>
                <td><div class="qir-reason">${escapeHtml(row.reason)}</div></td>
                <td>${row.include ? '<textarea class="qir-local-note" data-local-note placeholder="Optional report note"></textarea>' : '<span class="qir-muted">Not exported</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function applySearchFilter() {
    const query = lower(els.searchInput?.value || '');
    const showRejected = Boolean(els.showRejectedInput?.checked);
    const pool = showRejected ? app.rows : app.includedRows;

    if (!query) {
      app.filteredRows = [...pool];
    } else {
      app.filteredRows = pool.filter((row) => {
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
          row.include ? 'included' : 'rejected',
          ...row.categories.map((key) => CATEGORY_DEFINITIONS.find((definition) => definition.key === key)?.label || key)
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    renderRows(app.filteredRows);
  }

  function collectIncludedExportRows() {
    return Array.from(document.querySelectorAll('[data-row-id]'))
      .map((tr) => {
        const id = tr.dataset.rowId;
        const source = app.includedRows.find((row) => row.id === id);
        if (!source) return null;

        const categories = Array.from(tr.querySelectorAll('[data-category-key]:checked')).map((input) => input.dataset.categoryKey);
        const categoryLabels = CATEGORY_DEFINITIONS
          .filter((definition) => categories.includes(definition.key))
          .map((definition) => definition.label);

        return {
          ...source,
          reviewStatus: tr.querySelector('[data-review-status]')?.value || source.reviewStatus || '',
          categories,
          categoryLabels,
          localNote: tr.querySelector('[data-local-note]')?.value || ''
        };
      })
      .filter(Boolean);
  }

  function exportCsv() {
    const rows = collectIncludedExportRows();
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
    els.showRejectedInput?.addEventListener('change', applySearchFilter);
    els.quarterSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
    els.channelSelect?.addEventListener('change', () => {
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
    els.showRejectedInput = $('#qirShowRejectedInput');
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
      setStatus('Missing Supabase config. Check config.js.');
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
      setStatus('Admin session found. Loading all program records…');
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
    knownIncludeSeries: KNOWN_INCLUDE_SERIES,
    regionalTerms: REGIONAL_TERMS,
    categorizeFromDescription,
    analyzeCandidate,
    parseIsoFromAiringEntry
  };
})();
