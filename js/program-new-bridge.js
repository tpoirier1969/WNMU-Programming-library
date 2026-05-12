// v1.5.57 standalone Add Program helper
// Adds: one-time Library-tab notice after save, return-to-library behavior,
// smarter duplicate detection for seasons/series records, and reliable Library tab update notices.

(function () {
  const CHANNEL_NAME = 'wnmu-program-library';
  const STORAGE_EVENT_KEY = 'wnmu-program-library-program-created';
  const SENT_IDS_KEY = 'wnmu-program-new-sent-ids-v157';
  const DUPLICATE_SELECT_FIELDS = 'id,title,nola_eidr,is_archived,length_minutes,program_type,episode_season';

  function text(value) {
    return (value ?? '').toString().trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function htmlEscape(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return text(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function placeholderNola(value) {
    if (typeof isPlaceholderNola === 'function') return isPlaceholderNola(value);
    return ['nonola', 'no nola', 'no-nola', 'n/a', 'na', 'none', 'unknown'].includes(lower(value));
  }

  function getLastSavedId() {
    try {
      if (typeof state === 'undefined') return null;
      return state?.lastSavedId ?? null;
    } catch {
      return null;
    }
  }

  function getCurrentLengthValue() {
    try {
      return els?.programForm?.elements?.length_minutes?.value ?? '';
    } catch {
      return '';
    }
  }

  function parseLength(value) {
    const raw = text(value);
    if (!raw) return null;
    const match = raw.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const number = Number(match[0]);
    if (!Number.isFinite(number) || number <= 0) return null;
    return Math.round(number);
  }

  function lengthStatus(newLength, existingLength) {
    if (newLength == null || existingLength == null) return { kind: 'unknown', diff: null, compatible: true };
    const diff = Math.abs(newLength - existingLength);
    if (diff <= 4) return { kind: 'compatible', diff, compatible: true };
    if (diff >= 5 && diff <= 25) return { kind: 'typo', diff, compatible: true };
    if (diff >= 30) return { kind: 'different', diff, compatible: false };
    return { kind: 'borderline', diff, compatible: false };
  }

  function normalizeForCompare(value) {
    return lower(value)
      .replace(/&/g, ' and ')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function removeSeasonMarkers(value) {
    return text(value)
      .replace(/(?:^|[\s:–—\-])(?:s|season|series)\.?\s*#?\s*\d{1,3}\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[\s:–—\-]+$/g, '')
      .trim();
  }

  function parseSeasonFromTitle(value) {
    const raw = text(value);
    const patterns = [
      /(?:^|[\s:–—\-])s\.?\s*#?\s*(\d{1,3})\b/i,
      /(?:^|[\s:–—\-])season\s*#?\s*(\d{1,3})\b/i,
      /(?:^|[\s:–—\-])series\s*#?\s*(\d{1,3})\b/i
    ];
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) {
        const number = Number(match[1]);
        if (Number.isFinite(number) && number > 0) return number;
      }
    }
    return null;
  }

  function parseSeasonFromEpisodeSeason(value) {
    const raw = text(value);
    if (!raw) return null;
    const hundreds = raw.match(/\b(\d)00['’]?s\b/i) || raw.match(/\b(\d)\d\d\s*\/\s*\d+\b/);
    if (hundreds) return Number(hundreds[1]);
    const slash = raw.match(/\b(\d{1,2})\s*\/\s*\d{1,4}\b/);
    if (slash) return Number(slash[1]);
    return null;
  }

  function parseTitleParts(titleValue, episodeSeasonValue = '') {
    const title = text(titleValue);
    const titleSeason = parseSeasonFromTitle(title);
    const episodeSeason = parseSeasonFromEpisodeSeason(episodeSeasonValue);
    const baseRaw = removeSeasonMarkers(title);
    return {
      title,
      normalizedTitle: normalizeForCompare(title),
      baseRaw,
      base: normalizeForCompare(baseRaw || title),
      season: titleSeason ?? episodeSeason ?? null
    };
  }

  function levenshtein(a, b) {
    a = a || '';
    b = b || '';
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
        prev = old;
      }
    }
    return row[b.length];
  }

  function similarity(a, b) {
    a = a || '';
    b = b || '';
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    return (maxLen - levenshtein(a, b)) / maxLen;
  }

  function tokenOverlap(a, b) {
    const left = new Set((a || '').split(' ').filter(Boolean));
    const right = new Set((b || '').split(' ').filter(Boolean));
    if (!left.size || !right.size) return 0;
    let common = 0;
    for (const token of left) if (right.has(token)) common += 1;
    return common / Math.max(left.size, right.size);
  }

  function baseLooksSame(a, b) {
    if (!a.base || !b.base) return false;
    if (a.base === b.base) return true;
    const score = similarity(a.base, b.base);
    const overlap = tokenOverlap(a.base, b.base);
    return score >= 0.88 && overlap >= 0.72;
  }

  function exactSeasonMatch(a, b) {
    if (a.season == null && b.season == null) return true;
    if (a.season == null || b.season == null) return false;
    return Number(a.season) === Number(b.season);
  }

  function differentKnownSeason(a, b) {
    return a.season != null && b.season != null && Number(a.season) !== Number(b.season);
  }

  function formatSeason(value) {
    return value == null ? '' : `S. ${value}`;
  }

  function meaningfulNola(value) {
    const candidate = text(value);
    return candidate && !placeholderNola(candidate) ? candidate : '';
  }

  function candidateReason(input, item, status, sameNola) {
    const reasons = [];
    if (sameNola) reasons.push('same NOLA');
    if (item.parts?.season != null) reasons.push(`same ${formatSeason(item.parts.season)}`);
    if (status.kind === 'typo') reasons.push(`length differs by ${status.diff} min — likely typo`);
    else if (status.kind === 'borderline') reasons.push(`length differs by ${status.diff} min`);
    else if (status.kind === 'compatible' && status.diff) reasons.push(`length differs by ${status.diff} min`);
    if (item.is_archived) reasons.push('archived');
    return reasons.length ? reasons : ['similar title'];
  }

  async function queryDuplicateCandidates(titleValue, nolaValue) {
    const byId = new Map();
    const queries = [];
    const title = text(titleValue);
    const parts = parseTitleParts(titleValue);
    const nola = meaningfulNola(nolaValue);

    if (title.length >= 4) {
      queries.push(
        state.supabase
          .from('programs_enriched')
          .select(DUPLICATE_SELECT_FIELDS)
          .ilike('title', title)
          .order('title', { ascending: true })
          .limit(12)
      );
    }

    if (parts.baseRaw && parts.baseRaw.length >= 8) {
      queries.push(
        state.supabase
          .from('programs_enriched')
          .select(DUPLICATE_SELECT_FIELDS)
          .ilike('title', `%${parts.baseRaw}%`)
          .order('title', { ascending: true })
          .limit(40)
      );
    }

    if (nola) {
      queries.push(
        state.supabase
          .from('programs_enriched')
          .select(DUPLICATE_SELECT_FIELDS)
          .ilike('nola_eidr', nola)
          .order('title', { ascending: true })
          .limit(80)
      );
    }

    if (!queries.length) return [];
    const responses = await Promise.all(queries);
    for (const response of responses) {
      if (response.error) throw response.error;
      (response.data || []).forEach((item) => byId.set(String(item.id), item));
    }
    return Array.from(byId.values());
  }

  function classifyCandidates(candidates, titleValue, nolaValue) {
    const input = parseTitleParts(titleValue, els?.programForm?.elements?.episode_season?.value || '');
    const inputLength = parseLength(getCurrentLengthValue());
    const inputNola = meaningfulNola(nolaValue);
    const duplicates = [];
    const relatedBySeason = new Map();

    for (const rawItem of candidates) {
      const item = { ...rawItem };
      item.parts = parseTitleParts(item.title, item.episode_season);
      const sameBase = baseLooksSame(input, item.parts);
      const sameNola = Boolean(inputNola && meaningfulNola(item.nola_eidr) && lower(inputNola) === lower(item.nola_eidr));
      const itemLength = parseLength(item.length_minutes);
      const status = lengthStatus(inputLength, itemLength);

      if (!sameBase) continue;

      if (differentKnownSeason(input, item.parts)) {
        relatedBySeason.set(`${item.parts.season}-${item.id}`, item);
        continue;
      }

      if (!status.compatible) continue;

      const sameSeason = exactSeasonMatch(input, item.parts);
      const titleClose = similarity(input.normalizedTitle, item.parts.normalizedTitle) >= 0.88;
      const strongDuplicate = sameSeason && (titleClose || sameNola || input.base === item.parts.base);

      if (strongDuplicate) {
        item._duplicateReasons = candidateReason(input, item, status, sameNola);
        duplicates.push(item);
      }
    }

    duplicates.sort((a, b) => lower(a.title).localeCompare(lower(b.title), undefined, { sensitivity: 'base' }));
    const relatedSeasons = Array.from(relatedBySeason.values()).sort((a, b) => {
      const seasonA = a.parts?.season ?? 9999;
      const seasonB = b.parts?.season ?? 9999;
      if (seasonA !== seasonB) return seasonA - seasonB;
      return lower(a.title).localeCompare(lower(b.title), undefined, { sensitivity: 'base' });
    });

    duplicates.relatedSeasons = relatedSeasons;
    return duplicates;
  }

  function renderRelatedSeasonsNote(relatedSeasons = []) {
    if (!relatedSeasons.length) return '';
    const uniqueSeasons = Array.from(new Set(
      relatedSeasons
        .map((item) => item.parts?.season)
        .filter((season) => season != null)
        .sort((a, b) => a - b)
        .map((season) => formatSeason(season))
    ));
    const shown = uniqueSeasons.slice(0, 10).join(', ');
    const more = uniqueSeasons.length > 10 ? `, +${uniqueSeasons.length - 10} more` : '';
    const summary = shown ? `${shown}${more}` : `${relatedSeasons.length} related record${relatedSeasons.length === 1 ? '' : 's'}`;
    return `
      <div class="duplicate-card info" style="margin-top:8px;background:#eef7fb;border:1px solid #cfe8e8;border-radius:12px;padding:10px 12px;color:#103a66;">
        <div class="duplicate-title">Related seasons already exist <span class="dup-meta">· ${htmlEscape(summary)}</span></div>
      </div>
    `;
  }

  function renderSmartDuplicateMatches(matches, titleValue, nolaValue) {
    const relatedSeasons = matches?.relatedSeasons || [];
    if (!matches.length && !relatedSeasons.length) {
      els.duplicateCheck.innerHTML = '';
      els.duplicateCheck.classList.add('hidden');
      return;
    }

    let warning = '';
    if (matches.length) {
      const archivedCount = matches.filter((item) => item.is_archived).length;
      const activeCount = matches.length - archivedCount;
      const summaryParts = [];
      if (activeCount) summaryParts.push(`${activeCount} active`);
      if (archivedCount) summaryParts.push(`${archivedCount} archived`);
      const items = matches.map((item) => {
        const meta = [];
        if (item.nola_eidr) meta.push(htmlEscape(item.nola_eidr));
        if (item.length_minutes) meta.push(`${htmlEscape(item.length_minutes)} min`);
        if (item.program_type) meta.push(htmlEscape(item.program_type));
        const metaText = meta.length ? ` <span class="dup-meta">· ${meta.join(' · ')}</span>` : '';
        const reasons = item._duplicateReasons?.length ? ` <span class="dup-reason">(${item._duplicateReasons.map(htmlEscape).join(', ')})</span>` : '';
        return `<li><strong>${htmlEscape(item.title || '(untitled)')}</strong>${metaText}${reasons}</li>`;
      }).join('');

      warning = `
        <div class="duplicate-card warn">
          <div class="duplicate-title">Possible duplicate${matches.length === 1 ? '' : 's'} found${summaryParts.length ? ` <span class="dup-meta">· ${htmlEscape(summaryParts.join(', '))}</span>` : ''}</div>
          <ul class="duplicate-list">${items}</ul>
        </div>
      `;
    }

    els.duplicateCheck.innerHTML = `${warning}${renderRelatedSeasonsNote(relatedSeasons)}`;
    els.duplicateCheck.classList.remove('hidden');
  }

  function patchSmartDuplicateHandling() {
    if (window.__wnmuSmartDuplicatePatched) return;
    if (typeof findDuplicateMatches !== 'function' || typeof renderDuplicateMatches !== 'function') return;
    window.__wnmuSmartDuplicatePatched = true;

    findDuplicateMatches = async function patchedFindDuplicateMatches(titleValue, nolaValue) {
      const title = text(titleValue);
      const nola = text(nolaValue);
      if (!title && !nola) {
        const empty = [];
        empty.relatedSeasons = [];
        return empty;
      }
      const candidates = await queryDuplicateCandidates(title, nola);
      return classifyCandidates(candidates, title, nola);
    };

    renderDuplicateMatches = function patchedRenderDuplicateMatches(matches, titleValue, nolaValue) {
      renderSmartDuplicateMatches(matches || [], titleValue, nolaValue);
    };
  }

  function returnToLibrary(event) {
    const link = event.target?.closest?.('a[href="index.html"], #backToLibraryTop, [data-return-library]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
        window.close();
        return;
      }
    } catch (error) {
      console.warn('Original Library tab was not reachable:', error);
    }

    window.location.href = 'index.html';
  }

  function readSentIds() {
    try {
      const parsed = JSON.parse(window.sessionStorage?.getItem(SENT_IDS_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function rememberSentId(programId) {
    const sent = readSentIds();
    sent.add(String(programId));
    try {
      window.sessionStorage?.setItem(SENT_IDS_KEY, JSON.stringify(Array.from(sent).slice(-50)));
    } catch {}
  }

  function sendProgramCreated(programId, title) {
    if (!programId) return;
    const sent = readSentIds();
    if (sent.has(String(programId))) return;
    rememberSentId(programId);

    const message = {
      type: 'program-created',
      id: programId,
      title: title || 'new program',
      savedAt: Date.now(),
      source: 'program-new-bridge-v1.5.57'
    };

    if ('BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage(message);
        window.setTimeout(() => {
          try { channel.close(); } catch {}
        }, 750);
      } catch (error) {
        console.warn('Program-created BroadcastChannel notice was skipped:', error);
      }
    }

    try {
      window.localStorage?.setItem(STORAGE_EVENT_KEY, JSON.stringify({
        ...message,
        nonce: Math.random().toString(36).slice(2)
      }));
    } catch (error) {
      console.warn('Program-created localStorage notice was skipped:', error);
    }
  }

  function installSubmitSaveWatcher() {
    const form = document.getElementById('programForm');
    if (!form || form.dataset.wnmuSubmitSaveWatcherV157 === '1') return;
    form.dataset.wnmuSubmitSaveWatcherV157 = '1';
    form.addEventListener('submit', () => {
      const titleBeforeSave = text(document.querySelector('#programForm [name="title"]')?.value);
      const previousSavedId = String(getLastSavedId() || '');
      const startedAt = Date.now();
      const pollForSavedId = () => {
        const nextSavedId = getLastSavedId();
        if (nextSavedId && String(nextSavedId) !== previousSavedId) {
          sendProgramCreated(nextSavedId, titleBeforeSave);
          return;
        }
        if (Date.now() - startedAt < 15000) window.setTimeout(pollForSavedId, 250);
      };
      window.setTimeout(pollForSavedId, 150);
    }, false);
  }

  function patchSaveHandler() {
    if (window.__wnmuProgramNewBridgePatched || typeof saveProgram !== 'function') return;
    window.__wnmuProgramNewBridgePatched = true;
    const originalSaveProgram = saveProgram;

    saveProgram = async function patchedSaveProgram(event) {
      const titleBeforeSave = text(document.querySelector('#programForm [name="title"]')?.value);
      const previousSavedId = getLastSavedId();
      const result = await originalSaveProgram.apply(this, arguments);
      const nextSavedId = getLastSavedId();
      if (nextSavedId && String(nextSavedId) !== String(previousSavedId || '')) {
        sendProgramCreated(nextSavedId, titleBeforeSave);
      }
      return result;
    };
  }


  function syncPbsImportCard() {
    const card = document.getElementById('pbsImportCard');
    const panel = document.getElementById('pbsImportPanel');
    if (!card || !panel) return;
    card.classList.toggle('hidden', panel.classList.contains('hidden'));
  }

  function installPbsImportCardSync() {
    const panel = document.getElementById('pbsImportPanel');
    if (!panel || panel.dataset.wnmuPbsCardSyncV157 === '1') return;
    panel.dataset.wnmuPbsCardSyncV157 = '1';
    syncPbsImportCard();
    try {
      const observer = new MutationObserver(syncPbsImportCard);
      observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    } catch {}
    document.getElementById('togglePbsImportBtn')?.addEventListener('click', () => {
      window.setTimeout(syncPbsImportCard, 0);
    });
  }

  function installPatches() {
    patchSaveHandler();
    patchSmartDuplicateHandling();
    installSubmitSaveWatcher();
    installPbsImportCardSync();
  }

  document.addEventListener('click', returnToLibrary, true);
  installPatches();
  document.addEventListener('DOMContentLoaded', installPatches);
})();
