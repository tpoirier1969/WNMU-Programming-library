from pathlib import Path
import json

FILTERS = Path('js/filters-list.js')
WORKSPACE = Path('js/workspace-default-main-v15122.js')

filters = FILTERS.read_text(encoding='utf-8')
start_marker = 'function renderTable() {'
end_marker = '\nfunction renderStats() {'
if filters.count(start_marker) != 1 or filters.count(end_marker) != 1:
    raise SystemExit('Could not uniquely locate renderTable/renderStats boundary')
before, remainder = filters.split(start_marker, 1)
_, after = remainder.split(end_marker, 1)

virtual_code = r'''const VIRTUAL_ROW_OVERSCAN = 12;
const VIRTUAL_ROW_MIN_WINDOW = 48;
const VIRTUAL_ROW_ESTIMATED_HEIGHT = 104;
const PROGRAM_TABLE_COLUMN_COUNT = 9;

const virtualProgramTable = {
  items: [],
  key: '',
  start: -1,
  end: -1,
  frame: null,
  scroller: null
};

function programRowMarkup(item) {
  const badges = badgesFor(item).map((b) => `<span class="badge ${b.cls}">${b.label}</span>`).join('');
  const selectedClass = item.id === state.selectedId ? 'selected' : '';
  const archivedClass = item.is_archived ? 'archived-row' : '';
  return `
      <tr data-id="${item.id}" class="virtual-program-row ${selectedClass} ${archivedClass}">
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
}

function virtualSpacerMarkup(height, position) {
  const safeHeight = Math.max(0, Math.round(height));
  if (!safeHeight) return '';
  return `<tr class="virtual-row-spacer virtual-row-spacer-${position}" aria-hidden="true"><td colspan="${PROGRAM_TABLE_COLUMN_COUNT}" style="height:${safeHeight}px;padding:0;border:0;line-height:0;font-size:0"></td></tr>`;
}

function getProgramTableScroller() {
  if (virtualProgramTable.scroller?.isConnected) return virtualProgramTable.scroller;
  virtualProgramTable.scroller = els.tableBody?.closest('.table-wrap') || null;
  return virtualProgramTable.scroller;
}

function renderVirtualProgramWindow(force = false) {
  const items = virtualProgramTable.items;
  const total = items.length;
  const scroller = getProgramTableScroller();
  if (!els.tableBody || !scroller) return;
  if (!total) {
    els.tableBody.innerHTML = '';
    virtualProgramTable.start = 0;
    virtualProgramTable.end = 0;
    return;
  }

  const viewportHeight = Math.max(VIRTUAL_ROW_ESTIMATED_HEIGHT, scroller.clientHeight || window.innerHeight || 800);
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / VIRTUAL_ROW_ESTIMATED_HEIGHT));
  const windowSize = Math.max(VIRTUAL_ROW_MIN_WINDOW, visibleRows + (VIRTUAL_ROW_OVERSCAN * 2));
  const maxStart = Math.max(0, total - windowSize);
  const requestedStart = Math.floor(Math.max(0, scroller.scrollTop) / VIRTUAL_ROW_ESTIMATED_HEIGHT) - VIRTUAL_ROW_OVERSCAN;
  const start = Math.max(0, Math.min(maxStart, requestedStart));
  const end = Math.min(total, start + windowSize);

  if (!force && start === virtualProgramTable.start && end === virtualProgramTable.end) return;
  virtualProgramTable.start = start;
  virtualProgramTable.end = end;

  const topHeight = start * VIRTUAL_ROW_ESTIMATED_HEIGHT;
  const bottomHeight = Math.max(0, (total - end) * VIRTUAL_ROW_ESTIMATED_HEIGHT);
  els.tableBody.innerHTML = `${virtualSpacerMarkup(topHeight, 'top')}${items.slice(start, end).map(programRowMarkup).join('')}${virtualSpacerMarkup(bottomHeight, 'bottom')}`;
  setSelectedRowHighlight(state.selectedId);
}

function scheduleVirtualProgramWindow() {
  if (virtualProgramTable.frame != null) return;
  virtualProgramTable.frame = window.requestAnimationFrame(() => {
    virtualProgramTable.frame = null;
    renderVirtualProgramWindow(false);
  });
}

function ensureVirtualProgramScrollOwner() {
  const scroller = getProgramTableScroller();
  if (!scroller || scroller.dataset.virtualProgramRowsBound === '1') return;
  scroller.dataset.virtualProgramRowsBound = '1';
  scroller.addEventListener('scroll', scheduleVirtualProgramWindow, { passive: true });
  window.addEventListener('resize', scheduleVirtualProgramWindow, { passive: true });
}

function renderTable() {
  const allItems = sortProgramsForDisplay(activePrograms());
  const poolCount = programsInCurrentViewPool().length;
  const scroller = getProgramTableScroller();
  const virtualKey = `${state.filteredCacheKey}|${state.currentSort?.field || 'title'}|${state.currentSort?.direction || 'asc'}|${allItems.length}`;
  const dataChanged = virtualKey !== virtualProgramTable.key;

  virtualProgramTable.items = allItems;
  virtualProgramTable.key = virtualKey;
  if (dataChanged && scroller) scroller.scrollTop = 0;
  if (dataChanged) {
    virtualProgramTable.start = -1;
    virtualProgramTable.end = -1;
  }

  updateListSummary(allItems.length, poolCount, allItems.length);
  renderSortHeaders();
  ensureVirtualProgramScrollOwner();
  renderVirtualProgramWindow(true);
}
'''
FILTERS.write_text(before + virtual_code + end_marker + after, encoding='utf-8')

workspace = WORKSPACE.read_text(encoding='utf-8')
old_suppress = '''  function suppressNewProgramButton() {\n    const btn = byId('newProgramBtn');\n    if (!btn) return;\n    btn.classList.add('hidden', 'removed-control');\n    btn.setAttribute('aria-hidden', 'true');\n    btn.setAttribute('tabindex', '-1');\n    btn.disabled = true;\n  }\n'''
new_guard = '''  function guardNewProgramButton() {\n    const btn = byId('newProgramBtn');\n    if (!btn) return;\n    if (!btn.classList.contains('hidden')) btn.classList.add('hidden');\n    if (!btn.classList.contains('removed-control')) btn.classList.add('removed-control');\n    if (btn.getAttribute('aria-hidden') !== 'true') btn.setAttribute('aria-hidden', 'true');\n    if (btn.getAttribute('tabindex') !== '-1') btn.setAttribute('tabindex', '-1');\n    if (!btn.disabled) btn.disabled = true;\n  }\n\n  function installNewProgramButtonGuard() {\n    const btn = byId('newProgramBtn');\n    if (!btn || window.__wnmuNewProgramButtonObserver) return;\n    guardNewProgramButton();\n    const observer = new MutationObserver(() => guardNewProgramButton());\n    observer.observe(btn, {\n      attributes: true,\n      attributeFilter: ['class', 'disabled', 'aria-hidden', 'tabindex']\n    });\n    window.__wnmuNewProgramButtonObserver = observer;\n  }\n'''
if workspace.count(old_suppress) != 1:
    raise SystemExit('Could not uniquely locate suppressNewProgramButton')
workspace = workspace.replace(old_suppress, new_guard, 1)

install_start = '  function install() {'
install_end = '\n\n  loadPhoneModule();'
if workspace.count(install_start) != 1 or workspace.count(install_end) != 1:
    raise SystemExit('Could not uniquely locate workspace install block')
wb, wr = workspace.split(install_start, 1)
_, wa = wr.split(install_end, 1)
new_install = '''  function install() {\n    ensureStyles();\n    guardNewProgramButton();\n    normalizeLabels();\n    installNewProgramButtonGuard();\n\n    [60, 180, 500, 1000, 1800, 3200].forEach((delay) => {\n      window.setTimeout(() => {\n        ensureStyles();\n        guardNewProgramButton();\n        normalizeLabels();\n      }, delay);\n    });\n  }'''
workspace = wb + new_install + install_end + wa
workspace = workspace.replace("    document.title = 'WNMU-TV PBS Programming Library';", "    if (document.title !== 'WNMU-TV PBS Programming Library') document.title = 'WNMU-TV PBS Programming Library';")
workspace = workspace.replace("    if (version) version.textContent = VERSION;", "    if (version && version.textContent !== VERSION) version.textContent = VERSION;")
workspace = workspace.replace('    suppressNewProgramButton\n  };', '    suppressNewProgramButton: guardNewProgramButton\n  };')
WORKSPACE.write_text(workspace, encoding='utf-8')

for html_name in ('index.html', 'program-workspace-test.html'):
    p = Path(html_name)
    text = p.read_text(encoding='utf-8')
    if 'v1.5.129' not in text:
        raise SystemExit(f'Expected v1.5.129 in {html_name}')
    p.write_text(text.replace('v1.5.129', 'v1.5.130'), encoding='utf-8')

version_path = Path('version.json')
manifest = json.loads(version_path.read_text(encoding='utf-8'))
for key in ('currentAppVersion','requiredAppVersion','publishedVersion','appVersion','version','legacyCompatibilityVersion'):
    manifest[key] = 'v1.5.130'
manifest['notes'] = 'v1.5.130 reduces browser memory pressure by virtualizing the program table while keeping every filtered result reachable by scrolling, and replaces the document-wide workspace MutationObserver with a narrowly scoped new-program-button guard.'
manifest['updated'] = '2026-08-25T19:22:00Z'
version_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

for helper in (
    Path('.github/workflows/one-time-memory-stability-v15130.yml'),
    Path('.github/workflows/one-time-memory-stability-v15130b.yml'),
    Path('.github/scripts/memory_stability_v15130.py'),
):
    if helper.exists():
        helper.unlink()
