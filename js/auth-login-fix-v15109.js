// v1.5.109 Admin GitHub login redirect fix
// Mirrors the working Pledge Library approach: prefer config.ADMIN_REDIRECT_URL,
// otherwise redirect back to the current page without the OAuth hash.
// This intentionally intercepts the older hard-coded login handler in events.js.

(function () {
  const VERSION = 'v1.5.109 admin login redirect fix';

  function text(value) {
    if (typeof normalizeText === 'function') return normalizeText(value);
    return String(value ?? '').trim();
  }

  function getAdminRedirectUrl() {
    const configured = text(window.APP_CONFIG?.ADMIN_REDIRECT_URL || (typeof config !== 'undefined' ? config.ADMIN_REDIRECT_URL : ''));
    if (configured) return configured;
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
  }

  function getSupabaseClient() {
    try {
      if (typeof state !== 'undefined' && state?.supabase) return state.supabase;
    } catch (_error) {}
    return null;
  }

  function message(textValue) {
    try {
      if (typeof els !== 'undefined' && els?.authMessage) els.authMessage.textContent = textValue || '';
      if (typeof setStatus === 'function') setStatus(textValue || '');
    } catch (_error) {}
  }

  async function startAdminLogin(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof event?.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const client = getSupabaseClient();
    if (!client?.auth?.signInWithOAuth) {
      message('Admin sign-in is not ready yet. Refresh the page and try again.');
      return;
    }

    message('Sending you to GitHub…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: getAdminRedirectUrl() }
    });
    if (error) message(error.message || String(error));
  }

  function install() {
    const button = document.getElementById('loginGitHubBtn');
    if (!button || button.dataset.wnmuAdminRedirectFix === '1') return;
    button.dataset.wnmuAdminRedirectFix = '1';
    button.addEventListener('click', startAdminLogin, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUAdminLoginFix = { version: VERSION, getAdminRedirectUrl };
})();

// v1.5.110 additive admin-only Quarterly Issues & Programming report builder
// Read-only against current in-browser program data. Does not write to Supabase or mutate source records.
(function () {
  const VERSION = 'v1.5.110 quarterly issues report builder';
  const REPORT_BUTTON_ID = 'quarterlyIssuesReportBtn';
  const MODAL_ID = 'quarterlyIssuesReportModal';

  const REPORT_CATEGORIES = [
    'Children’s Education / Programming',
    'Educational Issues',
    'Economy and Business',
    'Health Issues',
    'Environmental Issues',
    'Legal / Civil Rights',
    'Political / Government Issues',
    'Arts / Humanities / Cultural Issues',
    'Historically Underrepresented'
  ];

  const CATEGORY_RULES = [
    {
      category: 'Children’s Education / Programming',
      terms: ['children', 'child', 'kids', 'youth', 'preschool', 'pre-school', 'early learning', 'kindergarten', 'school readiness', 'caregiver', 'family learning', 'pbs kids']
    },
    {
      category: 'Educational Issues',
      terms: ['education', 'educational', 'school', 'schools', 'student', 'students', 'teacher', 'teachers', 'college', 'university', 'learning', 'literacy', 'classroom', 'academic', 'workforce training']
    },
    {
      category: 'Economy and Business',
      terms: ['economy', 'economic', 'business', 'jobs', 'job', 'workforce', 'employment', 'industry', 'industries', 'tourism', 'mining', 'manufacturing', 'market', 'financial', 'finance', 'development', 'housing']
    },
    {
      category: 'Health Issues',
      terms: ['health', 'medical', 'medicine', 'hospital', 'doctor', 'nurse', 'disease', 'cancer', 'mental health', 'addiction', 'opioid', 'disability', 'rehabilitation', 'wellness', 'aging', 'caregiving', 'public health']
    },
    {
      category: 'Environmental Issues',
      terms: ['environment', 'environmental', 'climate', 'conservation', 'water', 'watershed', 'great lakes', 'lake superior', 'shoreline', 'forest', 'wildlife', 'pollution', 'sustainability', 'renewable', 'energy', 'invasive species', 'ecology', 'habitat', 'fisheries']
    },
    {
      category: 'Legal / Civil Rights',
      terms: ['legal', 'law', 'court', 'justice', 'civil rights', 'rights', 'accessibility', 'discrimination', 'equity', 'treaty', 'sovereignty', 'voting rights', 'public safety', 'criminal justice']
    },
    {
      category: 'Political / Government Issues',
      terms: ['government', 'political', 'politics', 'policy', 'public policy', 'election', 'elections', 'legislature', 'legislative', 'governor', 'congress', 'senate', 'representative', 'state budget', 'city council', 'county board', 'public officials']
    },
    {
      category: 'Arts / Humanities / Cultural Issues',
      terms: ['art', 'arts', 'artist', 'music', 'musical', 'theatre', 'theater', 'history', 'historic', 'humanities', 'culture', 'cultural', 'heritage', 'tradition', 'storytelling', 'literature', 'museum', 'documentary']
    },
    {
      category: 'Historically Underrepresented',
      terms: ['indigenous', 'native american', 'ojibwe', 'anishinaabe', 'tribal', 'tribe', 'black', 'african american', 'latino', 'latina', 'hispanic', 'women', 'disability community', 'disabled', 'veterans', 'immigrant', 'refugee', 'underserved', 'underrepresented']
    }
  ];

  function cleanText(value) {
    if (typeof normalizeText === 'function') return normalizeText(value);
    return String(value ?? '').trim();
  }

  function lowerText(value) {
    return cleanText(value).toLowerCase();
  }

  function html(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isAdminMode() {
    try {
      return typeof canEdit === 'function' && canEdit();
    } catch (_error) {
      return false;
    }
  }

  function programRows() {
    try {
      return Array.isArray(state?.programs) ? state.programs : [];
    } catch (_error) {
      return [];
    }
  }

  function twoDigitYearToFour(yearText) {
    const year = Number(yearText);
    if (yearText.length === 2) return 2000 + year;
    return year;
  }

  function dateToIso(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return '';
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function parseIsoFromText(value) {
    const textValue = cleanText(value);
    if (!textValue) return '';
    const iso = textValue.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return dateToIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const slash = textValue.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})\b/);
    if (slash) return dateToIso(twoDigitYearToFour(slash[3]), Number(slash[1]), Number(slash[2]));
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
    const textValue = cleanText(value)
      .replace(/\r/g, '')
      .replace(/\n+/g, ';')
      .replace(/\s*;\s*/g, ';')
      .replace(/,\s*(?=\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|20\d{2}-\d{1,2}-\d{1,2})/g, ';');
    if (!textValue) return [];
    return textValue.split(';').map((entry) => cleanText(entry)).filter(Boolean);
  }

  function airingsForProgram(program, channelMode) {
    const fields = channelMode === 'both'
      ? [['13.1', 'aired_13_1'], ['13.3', 'aired_13_3']]
      : [[channelMode, channelMode === '13.3' ? 'aired_13_3' : 'aired_13_1']];
    const airings = [];
    fields.forEach(([channel, field]) => {
      splitAiringText(program?.[field]).forEach((entry) => {
        const iso = parseIsoFromText(entry);
        if (!iso) return;
        airings.push({ channel, entry, iso, year: yearForIso(iso), quarter: quarterForIso(iso) });
      });
    });
    return airings.sort((a, b) => a.iso.localeCompare(b.iso) || a.channel.localeCompare(b.channel));
  }

  function quarterKey(airing) {
    return `${airing.year}-${airing.quarter}`;
  }

  function availableQuarters() {
    const keys = new Set();
    programRows().forEach((program) => {
      airingsForProgram(program, 'both').forEach((airing) => {
        if (airing.year && airing.quarter) keys.add(quarterKey(airing));
      });
    });
    const sorted = Array.from(keys).sort().reverse();
    if (sorted.length) return sorted;
    const now = new Date();
    return [`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`];
  }

  function findTermMatches(descriptionLower, terms) {
    return terms.filter((term) => descriptionLower.includes(term));
  }

  function categorizeFromDescription(program) {
    const description = cleanText(program?.notes);
    const descriptionLower = lowerText(description);
    if (!descriptionLower) {
      return {
        categories: [],
        confidence: 'Needs description',
        reason: 'No description is available, so categories were not guessed from the title.'
      };
    }

    const matches = CATEGORY_RULES
      .map((rule) => ({ category: rule.category, terms: findTermMatches(descriptionLower, rule.terms) }))
      .filter((match) => match.terms.length);

    if (!matches.length) {
      return {
        categories: [],
        confidence: 'Needs review',
        reason: 'Description did not clearly match the standing issue categories.'
      };
    }

    const strongest = Math.max(...matches.map((match) => match.terms.length));
    const confidence = strongest >= 3 || matches.length >= 3 ? 'High' : (strongest >= 2 || matches.length >= 2 ? 'Medium' : 'Low');
    const reason = matches
      .slice(0, 4)
      .map((match) => `${match.category}: ${match.terms.slice(0, 3).join(', ')}`)
      .join(' | ');

    return {
      categories: matches.map((match) => match.category),
      confidence,
      reason: `Matched description terms — ${reason}`
    };
  }

  function formatAirings(airings) {
    return airings.map((airing) => `${airing.channel} ${airing.entry}`).join('; ');
  }

  function buildReportRows(quarterKeyValue, channelMode) {
    const [year, quarter] = String(quarterKeyValue || '').split('-');
    return programRows()
      .filter((program) => !program?.is_archived)
      .map((program) => {
        const matchingAirings = airingsForProgram(program, channelMode)
          .filter((airing) => airing.year === year && airing.quarter === quarter);
        if (!matchingAirings.length) return null;
        const categoryInfo = categorizeFromDescription(program);
        return {
          id: program.id,
          title: cleanText(program.title),
          nola: cleanText(program.nola_eidr),
          duration: cleanText(program.length_minutes),
          description: cleanText(program.notes),
          airings: matchingAirings,
          airingsText: formatAirings(matchingAirings),
          categories: categoryInfo.categories,
          confidence: categoryInfo.confidence,
          reason: categoryInfo.reason,
          reviewStatus: categoryInfo.categories.length ? 'Needs Review' : 'Needs Better Description / Category Review'
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const firstAiring = a.airings[0]?.iso || '';
        const firstB = b.airings[0]?.iso || '';
        return firstAiring.localeCompare(firstB) || a.title.localeCompare(b.title);
      });
  }

  function csvEscape(value) {
    const textValue = String(value ?? '');
    if (/[",\n]/.test(textValue)) return `"${textValue.replaceAll('"', '""')}"`;
    return textValue;
  }

  function exportRowsToCsv(rows, quarterKeyValue) {
    const columns = ['Review Status', 'Program Title', 'NOLA', 'Airings', 'Duration', 'Suggested Categories', 'Confidence', 'Reason', 'Description'];
    const lines = [columns.map(csvEscape).join(',')];
    rows.forEach((row) => {
      lines.push([
        row.reviewStatus,
        row.title,
        row.nola,
        row.airingsText,
        row.duration,
        row.categories.join('; '),
        row.confidence,
        row.reason,
        row.description
      ].map(csvEscape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quarterly-issues-draft-${quarterKeyValue || 'report'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function renderCategoryMarks(categories) {
    if (!categories.length) return '<span class="qir-muted">No suggestion</span>';
    return `<div class="qir-category-wrap">${REPORT_CATEGORIES.map((category) => {
      const active = categories.includes(category);
      return `<span class="qir-category ${active ? 'active' : ''}" title="${html(category)}">${active ? '■' : '□'} ${html(category)}</span>`;
    }).join('')}</div>`;
  }

  function renderRows(rows, quarterKeyValue) {
    const output = document.getElementById('qirOutput');
    const exportButton = document.getElementById('qirExportCsvBtn');
    if (!output || !exportButton) return;
    exportButton.disabled = !rows.length;
    exportButton.onclick = () => exportRowsToCsv(rows, quarterKeyValue);

    if (!rows.length) {
      output.innerHTML = '<div class="qir-empty">No aired programs found for that quarter/channel in the current in-browser data.</div>';
      return;
    }

    const noDescription = rows.filter((row) => !row.description).length;
    const noCategories = rows.filter((row) => !row.categories.length).length;
    output.innerHTML = `
      <div class="qir-summary">
        <strong>${rows.length.toLocaleString()}</strong> candidate program rows ·
        <strong>${noDescription.toLocaleString()}</strong> missing descriptions ·
        <strong>${noCategories.toLocaleString()}</strong> needing category review
      </div>
      <div class="qir-table-wrap">
        <table class="qir-table">
          <thead>
            <tr>
              <th>Review</th>
              <th>Program / Airings</th>
              <th>Description</th>
              <th>Suggested categories</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><span class="qir-review-pill">${html(row.reviewStatus)}</span><br><span class="qir-confidence">${html(row.confidence)}</span></td>
                <td>
                  <strong>${html(row.title || 'Untitled')}</strong>
                  ${row.nola ? `<div class="qir-muted">${html(row.nola)}</div>` : ''}
                  <div class="qir-airings">${html(row.airingsText)}</div>
                  ${row.duration ? `<div class="qir-muted">${html(row.duration)}</div>` : ''}
                </td>
                <td><div class="qir-description">${row.description ? html(row.description) : '<span class="qir-warning">No description available.</span>'}</div></td>
                <td>${renderCategoryMarks(row.categories)}</td>
                <td><div class="qir-reason">${html(row.reason)}</div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById('quarterlyIssuesReportStyles')) return;
    const style = document.createElement('style');
    style.id = 'quarterlyIssuesReportStyles';
    style.textContent = `
      #${REPORT_BUTTON_ID}.hidden { display: none !important; }
      .qir-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1300;
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, .48);
      }
      .qir-backdrop.hidden { display: none !important; }
      .qir-modal {
        width: min(1500px, 100%);
        max-height: calc(100vh - 40px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, .32);
      }
      .qir-header,
      .qir-controls {
        padding: 14px 18px;
        border-bottom: 1px solid rgba(15, 23, 42, .12);
      }
      .qir-header {
        display: flex;
        gap: 16px;
        align-items: start;
        justify-content: space-between;
      }
      .qir-header h2 { margin: 0; font-size: 1.2rem; }
      .qir-header p { margin: 4px 0 0; color: var(--muted, #64748b); }
      .qir-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
        background: #f8fafc;
      }
      .qir-controls label {
        display: grid;
        gap: 4px;
        font-size: .78rem;
        font-weight: 800;
        color: #334155;
      }
      .qir-controls select {
        min-width: 170px;
        padding: 8px 10px;
        border: 1px solid rgba(15, 23, 42, .16);
        border-radius: 10px;
        background: #fff;
      }
      .qir-output {
        overflow: auto;
        padding: 14px 18px 18px;
      }
      .qir-summary,
      .qir-empty {
        margin-bottom: 12px;
        padding: 10px 12px;
        border: 1px solid rgba(20, 184, 166, .2);
        border-radius: 12px;
        background: rgba(20, 184, 166, .08);
        color: #134e4a;
      }
      .qir-table-wrap { overflow: auto; border: 1px solid rgba(15,23,42,.12); border-radius: 12px; }
      .qir-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
      .qir-table th,
      .qir-table td { vertical-align: top; padding: 9px 10px; border-bottom: 1px solid rgba(15,23,42,.1); }
      .qir-table th { position: sticky; top: 0; z-index: 1; background: #eaf4f7; color: #0f3f55; text-align: left; }
      .qir-table tbody tr:nth-child(even) { background: #fbfdff; }
      .qir-review-pill { display: inline-flex; padding: 3px 7px; border-radius: 999px; background: #fff7ed; color: #9a3412; font-weight: 800; }
      .qir-confidence { display: inline-block; margin-top: 6px; color: #475569; font-weight: 800; }
      .qir-muted { color: #64748b; font-size: .76rem; }
      .qir-airings { margin-top: 6px; color: #0f766e; font-weight: 700; }
      .qir-description { max-width: 460px; line-height: 1.35; }
      .qir-warning { color: #b45309; font-weight: 800; }
      .qir-category-wrap { display: grid; gap: 3px; min-width: 230px; }
      .qir-category { color: #94a3b8; white-space: nowrap; }
      .qir-category.active { color: #0f3f55; font-weight: 800; }
      .qir-reason { min-width: 220px; max-width: 340px; color: #334155; line-height: 1.35; }
      @media (max-width: 760px) {
        .qir-backdrop { padding: 8px; }
        .qir-modal { max-height: calc(100vh - 16px); border-radius: 12px; }
        .qir-header, .qir-controls, .qir-output { padding-left: 10px; padding-right: 10px; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'qir-backdrop hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'qirTitle');
    modal.innerHTML = `
      <div class="qir-modal">
        <div class="qir-header">
          <div>
            <h2 id="qirTitle">Quarterly Issues & Programming Report Builder</h2>
            <p>Admin-only draft builder. Uses current program data and description text; it does not save or change program records.</p>
          </div>
          <button type="button" id="qirCloseBtn" class="ghost">Close</button>
        </div>
        <div class="qir-controls">
          <label>Quarter
            <select id="qirQuarterSelect"></select>
          </label>
          <label>Channel data
            <select id="qirChannelSelect">
              <option value="13.1">13.1</option>
              <option value="13.3">13.3</option>
              <option value="both">13.1 + 13.3</option>
            </select>
          </label>
          <button type="button" id="qirBuildBtn" class="primary">Build draft</button>
          <button type="button" id="qirExportCsvBtn" disabled>Export CSV</button>
        </div>
        <div id="qirOutput" class="qir-output">
          <div class="qir-empty">Choose a quarter and build a draft. Category suggestions are description-first; blank descriptions are flagged instead of guessed from titles.</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    modal.querySelector('#qirCloseBtn')?.addEventListener('click', closeModal);
    modal.querySelector('#qirBuildBtn')?.addEventListener('click', () => {
      const quarter = modal.querySelector('#qirQuarterSelect')?.value || '';
      const channel = modal.querySelector('#qirChannelSelect')?.value || '13.1';
      const rows = buildReportRows(quarter, channel);
      renderRows(rows, quarter);
      try { if (typeof setStatus === 'function') setStatus(`Quarterly Issues draft built with ${rows.length.toLocaleString()} candidate rows.`); } catch (_error) {}
    });
    return modal;
  }

  function populateQuarterOptions() {
    const select = document.getElementById('qirQuarterSelect');
    if (!select) return;
    const previous = select.value;
    const keys = availableQuarters();
    select.innerHTML = keys.map((key) => {
      const [year, quarter] = key.split('-');
      return `<option value="${html(key)}">${html(year)} ${html(quarter)} · ${html(quarterMonths(quarter))}</option>`;
    }).join('');
    if (previous && keys.includes(previous)) select.value = previous;
  }

  function openModal() {
    if (!isAdminMode()) {
      try { if (typeof setStatus === 'function') setStatus('Admin mode is required for the Quarterly Issues report builder.'); } catch (_error) {}
      return;
    }
    injectStyles();
    const modal = ensureModal();
    populateQuarterOptions();
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    modal.querySelector('#qirBuildBtn')?.focus();
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function ensureButton() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return null;
    let button = document.getElementById(REPORT_BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = REPORT_BUTTON_ID;
      button.type = 'button';
      button.textContent = 'Quarterly issues';
      button.className = 'hidden';
      button.title = 'Build a draft Quarterly Issues & Programming report from current program data';
      button.addEventListener('click', openModal);
      const exportButton = document.getElementById('exportBtn');
      if (exportButton?.parentElement === actions) actions.insertBefore(button, exportButton);
      else actions.appendChild(button);
    }
    return button;
  }

  function syncAdminVisibility() {
    const button = ensureButton();
    if (!button) return;
    const visible = isAdminMode();
    button.classList.toggle('hidden', !visible);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible) closeModal();
  }

  function install() {
    injectStyles();
    syncAdminVisibility();
    window.setTimeout(syncAdminVisibility, 250);
    window.setTimeout(syncAdminVisibility, 1000);
    window.setInterval(syncAdminVisibility, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUQuarterlyIssuesReportBuilder = {
    version: VERSION,
    buildReportRows,
    categorizeFromDescription,
    availableQuarters
  };
})();
