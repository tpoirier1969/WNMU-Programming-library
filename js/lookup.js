// Online metadata lookup for the editor drawer.
// Best-effort public lookup using PBS show pages and NETA's public program catalog.

const LOOKUP_TIMEOUT_MS = 12000;

function normalizeLookupTitle(value) {
  return normalizeLower(value)
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleTokens(value) {
  return normalizeLookupTitle(value)
    .split(/\s+/)
    .filter((token) => token && !['the', 'a', 'an', 'and', 'of', 'for', 'to', 'with'].includes(token));
}

function slugifyTitle(value, dropLeadingArticle = false) {
  let text = normalizeText(value)
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ');
  if (dropLeadingArticle) text = text.replace(/^(the|a|an)\s+/i, '');
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toIsoDate(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return '';
  let [, mm, dd, yy] = match;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function maybeHtml(text) {
  return /<html|<body|<table|<div|<meta/i.test(text || '');
}

function parseHtml(text) {
  return new DOMParser().parseFromString(text, 'text/html');
}

function textLinesFromPayload(text) {
  if (!text) return [];
  if (maybeHtml(text)) {
    const doc = parseHtml(text);
    return doc.body.textContent.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLookupText(url) {
  const attempts = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const text = await fetchWithTimeout(attempt);
      if (normalizeText(text)) return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Lookup fetch failed.');
}

function scoreTitleMatch(candidateTitle, requestedTitle) {
  const candidate = normalizeLookupTitle(candidateTitle);
  const requested = normalizeLookupTitle(requestedTitle);
  if (!candidate || !requested) return 0;
  if (candidate === requested) return 120;
  if (candidate.includes(requested) || requested.includes(candidate)) return 80;
  const tokens = titleTokens(requested);
  const hits = tokens.filter((token) => candidate.includes(token)).length;
  return hits * 10;
}

function parseNetaRows(text) {
  const rows = [];
  if (maybeHtml(text)) {
    const doc = parseHtml(text);
    const htmlRows = Array.from(doc.querySelectorAll('table tbody tr'));
    htmlRows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => normalizeText(cell.textContent));
      if (cells.length >= 7) {
        rows.push({
          title: cells[0],
          nola: cells[1],
          episodes: cells[2],
          length: cells[3],
          genre: cells[4],
          version: cells[5],
          rightsEnd: cells[6]
        });
      }
    });
    if (rows.length) return rows;
  }

  const lines = textLinesFromPayload(text);
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const parts = line.split('|').map((part) => normalizeText(part)).filter(Boolean);
    if (parts.length < 7) continue;
    const [title, nola, episodes, length, genre, version, rightsEnd] = parts;
    if (normalizeLower(title) === 'title' || /^-+$/.test(title)) continue;
    rows.push({ title, nola, episodes, length, genre, version, rightsEnd });
  }
  return rows;
}

async function lookupNetaMetadata(title, nola) {
  const url = `https://www.netaonline.org/programming-service/program-catalog?title=${encodeURIComponent(title || '')}&field_program_nola_value=${encodeURIComponent(nola || '')}`;
  const text = await fetchLookupText(url);
  const rows = parseNetaRows(text);
  if (!rows.length) return null;

  const requestedNola = normalizeLower(nola);
  const best = rows
    .map((row) => {
      const exactNola = requestedNola && normalizeLower(row.nola) === requestedNola ? 150 : 0;
      return { row, score: exactNola + scoreTitleMatch(row.title, title) };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < 40) return null;

  const fields = {};
  if (best.row.nola) fields.nola_eidr = best.row.nola;
  if (best.row.length) fields.length_minutes = best.row.length;
  if (best.row.genre) fields.topic = best.row.genre;
  if (best.row.episodes) {
    const count = Number(best.row.episodes);
    fields.episode_season = Number.isFinite(count) && count > 0 ? `${count} episode${count === 1 ? '' : 's'}` : best.row.episodes;
  }
  const rightsEnd = toIsoDate(best.row.rightsEnd);
  if (rightsEnd) fields.rights_end = rightsEnd;
  fields.distributor = fields.distributor || 'NETA';

  return { source: 'NETA Program Catalog', fields, matchedTitle: best.row.title };
}

function extractGenreFromLines(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    if (normalizeLower(lines[i]) === 'genre') {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
        const value = normalizeText(lines[j]);
        if (value && normalizeLower(value) !== 'share this show') return value;
      }
    }
  }
  return '';
}

function parsePbsPage(text, requestedTitle, url) {
  const lines = textLinesFromPayload(text);
  const doc = maybeHtml(text) ? parseHtml(text) : null;
  const metaTitle = normalizeText(doc?.querySelector('meta[property="og:title"]')?.content || doc?.querySelector('title')?.textContent || '');
  const heading = normalizeText(doc?.querySelector('h1')?.textContent || lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') || '');
  const resolvedTitle = heading || metaTitle.replace(/\|\s*PBS$/i, '').trim();
  const score = scoreTitleMatch(resolvedTitle, requestedTitle);
  if (score < 40) return null;

  const description = normalizeText(doc?.querySelector('meta[name="description"]')?.content || doc?.querySelector('meta[property="og:description"]')?.content || lines[lines.findIndex((line) => normalizeLookupTitle(line) === normalizeLookupTitle(resolvedTitle)) + 1] || '');
  const bodyText = lines.join('\n');
  const distributorMatch = bodyText.match(/Distributed nationally by\s+([^\n]+)/i);
  const distributor = distributorMatch ? normalizeText(distributorMatch[1].replace(/\s*Learn More.*$/i, '')) : '';
  const genre = extractGenreFromLines(lines);
  const fields = {};
  if (description) fields.notes = description;
  if (genre) fields.topic = genre;
  if (distributor) fields.distributor = distributor;
  if (/\bEpisodes\b/i.test(bodyText)) fields.program_type = 'Series';
  return { source: 'PBS show page', fields, matchedTitle: resolvedTitle, url };
}

async function lookupPbsMetadata(title) {
  const slugs = Array.from(new Set([
    slugifyTitle(title, false),
    slugifyTitle(title, true)
  ].filter(Boolean)));

  for (const slug of slugs) {
    const url = `https://www.pbs.org/show/${slug}/`;
    try {
      const text = await fetchLookupText(url);
      const parsed = parsePbsPage(text, title, url);
      if (parsed) return parsed;
    } catch (error) {
      // keep trying other slug variants
    }
  }
  return null;
}

function shouldFillField(fieldName, currentValue) {
  const current = normalizeText(currentValue);
  if (!current) return true;
  if (fieldName === 'nola_eidr' && isPlaceholderNola(current)) return true;
  return false;
}

function applyLookupFields(resultFields) {
  const filled = [];
  const skipped = [];
  Object.entries(resultFields || {}).forEach(([fieldName, value]) => {
    const field = els.programForm?.elements?.[fieldName];
    const normalizedValue = normalizeText(value);
    if (!field || !normalizedValue) return;
    if (!shouldFillField(fieldName, field.value)) {
      skipped.push(fieldName);
      return;
    }
    if (field.tagName === 'SELECT') ensureEditorSelectOption(fieldName, normalizedValue);
    field.value = normalizedValue;
    filled.push(fieldName);
  });
  return { filled, skipped };
}

function humanFieldName(fieldName) {
  const labels = {
    nola_eidr: 'NOLA',
    notes: 'Description',
    program_type: 'Program or series',
    length_minutes: 'Length',
    topic: 'Topic',
    secondary_topic: 'Secondary topic',
    rights_end: 'Rights end',
    episode_season: 'Episode / Season',
    distributor: 'Distributor'
  };
  return labels[fieldName] || fieldName;
}

async function performMetadataLookup() {
  if (!canEdit()) {
    setLookupMessage('Sign in as admin to use online lookup.', 'warn');
    return;
  }
  const title = normalizeText(els.programForm?.elements?.title?.value);
  const nola = normalizeText(els.programForm?.elements?.nola_eidr?.value);
  if (!title) {
    updateLookupButtonState();
    return;
  }

  state.lookupBusy = true;
  updateLookupButtonState();

  try {
    const sources = [];
    const combinedFields = {};

    const neta = await lookupNetaMetadata(title, nola).catch(() => null);
    if (neta) {
      Object.assign(combinedFields, neta.fields);
      sources.push(neta.source);
    }

    const pbs = await lookupPbsMetadata(title).catch(() => null);
    if (pbs) {
      Object.entries(pbs.fields).forEach(([key, value]) => {
        if (!combinedFields[key]) combinedFields[key] = value;
      });
      sources.push(pbs.source);
    }

    if (!sources.length || !Object.keys(combinedFields).length) {
      setLookupMessage('No public match found from PBS or NETA for that title.', 'warn');
      setStatus('Lookup finished, but no public metadata match was found.');
      return;
    }

    const { filled } = applyLookupFields(combinedFields);
    updateVoteVisibility();
    renderDuplicateCheck();
    updateLookupButtonState();

    if (!filled.length) {
      setLookupMessage(`Lookup found data from ${Array.from(new Set(sources)).join(' + ')}, but your current fields already had values.`, 'info');
      setStatus('Lookup found matching public metadata, but there was nothing blank to fill.');
      return;
    }

    const fieldList = filled.map(humanFieldName).join(', ');
    const sourceLabel = Array.from(new Set(sources)).join(' + ');
    setLookupMessage(`Loaded ${filled.length} field${filled.length === 1 ? '' : 's'} from ${sourceLabel}: ${fieldList}.`, 'good');
    setStatus(`Lookup loaded ${filled.length} field${filled.length === 1 ? '' : 's'} from ${sourceLabel}.`);
  } catch (error) {
    console.error(error);
    setLookupMessage('Lookup hit an error. The public sources may be blocking the request right now.', 'danger');
    setStatus(error.message || 'Lookup failed.');
  } finally {
    state.lookupBusy = false;
    updateLookupButtonState();
  }
}
