// Quarterly Issues & Programming Report Builder prototype v1.2.0
// Standalone prototype only. Not wired into the main app.
// Reads all current records, including archived records. Does not write to Supabase.
// Candidate selection uses scoring buckets so the review pool can be quantified.

(function () {
  'use strict';

  const VERSION = 'v1.2.0';

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
    'marquette', 'negaunee', 'ishpeming', 'munising', 'escanaba', 'manistique',
    'houghton', 'hancock', 'calumet', 'keweenaw', 'iron mountain', 'ironwood',
    'sault ste. marie', 'sault saint marie', 'lake superior', 'great lakes',
    'copper country', 'mackinac', 'wkar', 'lansing', 'detroit', 'flint',
    'grand rapids', 'nmu', 'northern michigan university', 'michigan state',
    'michigan legislature', 'michigan voters', 'michigan residents',
    'tribal communities', 'anishinaabe', 'ojibwe', 'great lakes region'
  ];

  const KNOWN_INCLUDE_SERIES = [
    { test: /\bmedia meet\b/i, categories: [], points: 70, external: false, reason: 'Known WNMU/local public-affairs series.' },
    { test: /\bask the experts\b/i, categories: [], points: 70, external: false, reason: 'Known WNMU/local issue series.' },
    { test: /\boff the record\b/i, categories: ['political_government'], points: 65, external: true, reason: 'Known Michigan public-affairs series. Pull episode-specific details from WKAR.' },
    { test: /\bpublic eye news\b/i, categories: ['political_government'], points: 70, external: false, reason: 'Known local/regional news/public-affairs programming.' },
    { test: /\bnative report\b/i, categories: ['historically_underrepresented'], points: 55, external: false, reason: 'Known Indigenous/community-affairs series; confirm episode issue.' },
    { test: /\bict news\b/i, categories: ['historically_underrepresented'], points: 55, external: false, reason: 'Known Indigenous/community-affairs news series; confirm episode issue.' },
    { test: /\bwhat'?s u\.?p\.?\b/i, categories: [], points: 65, external: false, reason: 'Known regional/local series.' }
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

  function matchingTerms(haystackLower, terms) {
    return terms.filter((term) => haystackLower.includes(term));
  }

  function hasAnyTerm(haystackLower, terms) {
    return terms.some((term) => haystackLower.includes(term));
  }

  function regionalMatches(program) {
    const haystack = `${lower(program.title)} ${lower(program.notes)} ${lower(program.topic)} ${lower(program.secondary_topic)}`;
    return matchingTerms(haystack, REGIONAL_TERMS);
  }

  function knownIncludeSeries(program) {
    const title = text(program.title);
    return KNOWN_INCLUDE_SERIES.find((entry) => entry.test.test(title)) || null;
  }

  function categoryMatchesFromDescription(program) {
    const descriptionLower = lower(program.notes);
    if (!descriptionLower) return [];

    const matches = CATEGORY_DEFINITIONS
      .map((definition) => ({
        key: definition.key,
        label: definition.label,
        terms: matchingTerms(descriptionLower, definition.terms)
      }))
      .filter((match) => match.terms.length);

    const hasScienceEducation = matches.some((match) => match.key === 'educational_issues')
      && hasAnyTerm(descriptionLower, ['science', 'scientific', 'dinosaurs', 'dinosaur', 'paleontology', 'fossil', 'fossils', 'natural history']);

    if (!hasScienceEducation) return matches;

    return matches.filter((match) => {
      if (match.key !== 'arts_humanities_cultural') return true;
      return match.terms.some((term) => ['art', 'arts', 'music', 'theatre', 'theater', 'culture', 'cultural', 'museum', 'local history', 'regional history'].includes(term));
    });
  }

  function genericPenalty(program) {
    const combined = `${text(program.title)} ${text(program.notes)}`;
    return GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(combined)) ? 55 : 0;
  }

  function nationalOnlyPenalty(program, hasRegional) {
    const title = text(program.title);
    return !hasRegional && NATIONAL_ONLY_SERIES_PATTERNS.some((pattern) => pattern.test(title)) ? 35 : 0;
  }

  function mergeUniqueCategories(baseCategories, addedCategories) {
    return Array.from(new Set([...(baseCategories || []), ...(addedCategories || [])]));
  }

  function scoreProgram(program) {
    let score = 0;
    const reasons = [];
    const warnings = [];

    const known = knownIncludeSeries(program);
    const regional = regionalMatches(program);
    const categoryMatches = categoryMatchesFromDescription(program);
    const categoryKeys = categoryMatches.map((match) => match.key);
    const hasDescription = Boolean(text(program.notes));
    const generic = genericPenalty(program);
    const nationalPenalty = nationalOnlyPenalty(program, regional.length > 0);

    let categories = categoryKeys;

    if (known) {
      score += known.points;
      categories = mergeUniqueCategories(categories, known.categories);
      reasons.push(`${known.points} pts: ${known.reason}`);
      if (known.external) warnings.push('Needs external episode detail.');
    }

    if (regional.length) {
      score += Math.min(45, 25 + regional.length * 5);
      reasons.push(`Regional proof: ${regional.slice(0, 5).join(', ')}`);
    } else {
      warnings.push('No regional/local proof found in current description fields.');
    }

    if (categoryMatches.length) {
      const categoryPoints = Math.min(35, 15 + categoryMatches.length * 6);
      score += categoryPoints;
      reasons.push(`${categoryPoints} pts: description matched issue categories (${categoryMatches.map((match) => match.label).join('; ')}).`);
    } else if (hasDescription) {
      warnings.push('Description did not clearly match a standing issue category.');
    } else {
      score -= 10;
      warnings.push('No description available.');
    }

    if (hasDescription) {
      score += 5;
    }

    if (generic) {
      score -= generic;
      warnings.push('Generic cooking/yoga/lifestyle/craft/home/garden pattern detected.');
    }

    if (nationalPenalty) {
      score -= nationalPenalty;
      warnings.push('National-only series pattern without regional proof.');
    }

    // Important: issue-relevant national rows are not final-safe, but should stay visible
    // in the review pool so the user can quantify what was excluded or needs local proof.
    const hasIssueWithoutRegionalProof = categoryMatches.length > 0 && !regional.length && !known;

    let bucket = 'rejected';
    let reviewStatus = 'Exclude';

    if (known?.external) {
      bucket = 'review';
      reviewStatus = 'Needs External Detail';
    } else if (score >= 70 && (known || regional.length)) {
      bucket = 'recommended';
      reviewStatus = 'Needs Review';
    } else if (score >= 35 || hasIssueWithoutRegionalProof || known || regional.length) {
      bucket = 'review';
      reviewStatus = hasIssueWithoutRegionalProof ? 'Needs Review' : 'Needs Review';
    } else if (score >= 15) {
      bucket = 'weak';
      reviewStatus = 'Needs Better Description';
    }

    if (generic && !regional.length && !known) {
      bucket = 'rejected';
      reviewStatus = 'Exclude';
    }

    return {
      score,
      bucket,
      reviewStatus,
      categories,
      reasons,
      warnings,
      reason: [...reasons, ...warnings.map((warning) => `Warning: ${warning}`)].join(' ')
    };
  }

  function bucketLabel(bucket) {
    return {
      recommended: 'Recommended',
      review: 'Review',
      weak: 'Weak / needs proof',
      rejected: 'Rejected'
    }[bucket] || bucket;
  }

  function formatAirings(airings) {
    return airings.map((airing) => `${airing.channel} ${airing.entry}`).join('; ');
  }

  function buildRows() {
    const quarterKeyValue = els.quarterSelect.value;
    const channelMode = els.channelSelect.value || '13.1';
    const [year, quarter] = String(quarterKeyValue || '').split('-');

    app.rows = app.programs
      .map((program) => {
        const matchingAirings = airingsForProgram(program, channelMode)
          .filter((airing) => airing.year === year && airing.quarter === quarter);

        if (!matchingAirings.length) return null;

        const scored = scoreProgram(program);

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
          categories: scored.categories,
          score: scored.score,
          bucket: scored.bucket,
          reviewStatus: scored.reviewStatus,
          reason: scored.reason,
          archived: Boolean(program.is_archived)
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const bucketOrder = { recommended: 0, review: 1, weak: 2, rejected: 3 };
        const bucketDiff = (bucketOrder[a.bucket] ?? 9) - (bucketOrder[b.bucket] ?? 9);
        if (bucketDiff) return bucketDiff;
        const scoreDiff = b.score - a.score;
        if (scoreDiff) return scoreDiff;
        const firstAiringA = a.airings[0]?.iso || '';
        const firstAiringB = b.airings[0]?.iso || '';
        return firstAiringA.localeCompare(firstAiringB) || a.title.localeCompare(b.title);
      });

    applySearchFilter();

    const counts = bucketCounts();
    setStatus(`Built scored draft: ${counts.recommended} recommended, ${counts.review} review, ${counts.weak} weak, ${counts.rejected} rejected from ${app.rows.length} aired rows.`);
  }

  function bucketCounts() {
    return app.rows.reduce((acc, row) => {
      acc[row.bucket] = (acc[row.bucket] || 0) + 1;
      return acc;
    }, { recommended: 0, review: 0, weak: 0, rejected: 0 });
  }

  function rowsForCandidateView() {
    const view = els.candidateViewSelect?.value || 'review_pool';
    switch (view) {
      case 'recommended':
        return app.rows.filter((row) => row.bucket === 'recommended');
      case 'weak':
        return app.rows.filter((row) => row.bucket === 'weak');
      case 'rejected':
        return app.rows.filter((row) => row.bucket === 'rejected');
      case 'all':
        return app.rows;
      case 'review_pool':
      default:
        return app.rows.filter((row) => row.bucket === 'recommended' || row.bucket === 'review');
    }
  }

  function renderSummary() {
    if (!els.summary) return;

    if (!app.rows.length) {
      els.summary.classList.add('hidden');
      els.exportCsvBtn.disabled = true;
      els.printBtn.disabled = true;
      return;
    }

    const counts = bucketCounts();
    const missingDescriptions = app.rows.filter((row) => !row.description).length;
    const externalDetail = app.rows.filter((row) => row.reviewStatus === 'Needs External Detail').length;
    const displayed = app.filteredRows.length;

    els.summary.classList.remove('hidden');
    els.summary.innerHTML = `
      <div class="qir-summary-grid">
        <div class="qir-summary-item">
          <div class="qir-summary-label">Aired scanned</div>
          <div class="qir-summary-value">${app.rows.length.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Recommended</div>
          <div class="qir-summary-value">${(counts.recommended || 0).toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Review</div>
          <div class="qir-summary-value">${(counts.review || 0).toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Weak</div>
          <div class="qir-summary-value">${(counts.weak || 0).toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Rejected</div>
          <div class="qir-summary-value">${(counts.rejected || 0).toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Missing desc.</div>
          <div class="qir-summary-value">${missingDescriptions.toLocaleString()}</div>
        </div>
        <div class="qir-summary-item">
          <div class="qir-summary-label">Displayed</div>
          <div class="qir-summary-value">${displayed.toLocaleString()}</div>
        </div>
      </div>
      ${externalDetail ? `<p class="qir-help"><strong>${externalDetail.toLocaleString()}</strong> row(s) need external episode detail, such as WKAR details for Off the Record.</p>` : ''}
    `;

    els.exportCsvBtn.disabled = !app.filteredRows.some((row) => row.bucket === 'recommended' || row.bucket === 'review');
    els.printBtn.disabled = !app.filteredRows.length;
  }

  function categoryCheckboxes(row) {
    if (row.bucket === 'rejected') return '<span class="qir-muted">Rejected audit row</span>';
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
    if (row.bucket === 'rejected') {
      return `
        <div class="qir-score">${escapeHtml(row.score)}</div>
        <div class="qir-bucket" data-bucket="rejected">${escapeHtml(bucketLabel(row.bucket))}</div>
      `;
    }

    return `
      <select class="qir-review-select" data-review-status>
        ${REVIEW_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${status === row.reviewStatus ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
      </select>
      <div class="qir-score">${escapeHtml(row.score)}</div>
      <div class="qir-bucket" data-bucket="${escapeHtml(row.bucket)}">${escapeHtml(bucketLabel(row.bucket))}</div>
    `;
  }

  function renderRows(rows) {
    renderSummary();

    if (!rows.length) {
      els.output.innerHTML = '<div class="qir-empty">No matching rows. Change Candidate view, check quarter/channel, or clear the search box.</div>';
      return;
    }

    els.output.innerHTML = `
      <div class="qir-table-wrap">
        <table class="qir-table">
          <thead>
            <tr>
              <th>Score / Review</th>
              <th>Program / Airings</th>
              <th>Description</th>
              <th>Categories</th>
              <th>Scoring reason</th>
              <th>Local note</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr data-row-id="${escapeHtml(row.id)}" class="qir-row-${escapeHtml(row.bucket)}">
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
                <td><div class="qir-reason">${escapeHtml(row.reason || 'No scoring reason available.')}</div></td>
                <td>${row.bucket === 'rejected' ? '<span class="qir-muted">Not exported by default</span>' : '<textarea class="qir-local-note" data-local-note placeholder="Optional report note"></textarea>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function applySearchFilter() {
    const query = lower(els.searchInput?.value || '');
    const pool = rowsForCandidateView();

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
          row.bucket,
          row.score,
          ...row.categories.map((key) => CATEGORY_DEFINITIONS.find((definition) => definition.key === key)?.label || key)
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    renderRows(app.filteredRows);
  }

  function collectExportRows() {
    return Array.from(document.querySelectorAll('[data-row-id]'))
      .map((tr) => {
        const id = tr.dataset.rowId;
        const source = app.rows.find((row) => row.id === id);
        if (!source || source.bucket === 'rejected') return null;

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
    const rows = collectExportRows();
    const categoryHeaders = CATEGORY_DEFINITIONS.map((definition) => definition.label);
    const columns = [
      'Review Status',
      'Score',
      'Bucket',
      'Program Title',
      'NOLA',
      'Airings',
      'Duration',
      'Description',
      ...categoryHeaders,
      'Suggested Categories',
      'Reason',
      'Local Note'
    ];

    const lines = [columns.map(csvEscape).join(',')];

    rows.forEach((row) => {
      const categorySet = new Set(row.categories || []);
      lines.push([
        row.reviewStatus,
        row.score,
        bucketLabel(row.bucket),
        row.title,
        row.nola,
        row.airingsText,
        row.duration,
        row.description,
        ...CATEGORY_DEFINITIONS.map((definition) => categorySet.has(definition.key) ? 'X' : ''),
        row.categoryLabels.join('; '),
        row.reason,
        row.localNote
      ].map(csvEscape).join(','));
    });

    const quarter = els.quarterSelect.value || 'quarter';
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quarterly-issues-programming-draft-${quarter}-${VERSION}.csv`;
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
    els.candidateViewSelect?.addEventListener('change', applySearchFilter);
    els.quarterSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
    els.channelSelect?.addEventListener('change', () => {
      if (app.rows.length) buildRows();
    });
  }

  function cacheElements() {
    els.status = $('#qirStatus');
    els.versionFlag = $('#qirVersionFlag');
    els.setupNotice = $('#qirSetupNotice');
    els.adminRequired = $('#qirAdminRequired');
    els.builder = $('#qirBuilder');
    els.quarterSelect = $('#qirQuarterSelect');
    els.channelSelect = $('#qirChannelSelect');
    els.candidateViewSelect = $('#qirCandidateViewSelect');
    els.searchInput = $('#qirSearchInput');
    els.buildBtn = $('#qirBuildBtn');
    els.exportCsvBtn = $('#qirExportCsvBtn');
    els.printBtn = $('#qirPrintBtn');
    els.refreshBtn = $('#qirRefreshBtn');
    els.signOutBtn = $('#qirSignOutBtn');
    els.summary = $('#qirSummary');
    els.output = $('#qirOutput');

    if (els.versionFlag) els.versionFlag.textContent = VERSION;
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
      setStatus(`Admin session found. Loading all program records… ${VERSION}`);
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
    scoreProgram,
    parseIsoFromAiringEntry
  };
})();
