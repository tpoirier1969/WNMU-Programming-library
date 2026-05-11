import { MONTHS } from "./constants-mainfix.js?v=v2.1-mainfix";
import { medicinalRecords, isPlant, reviewRecords, avoidRecords, isForagingMushroom } from "./data-model-mainfix.js?v=v2.1-mainfix";
import { VOCAB } from "./vocabulary.js?v=v2.0";
import { renderResultCard } from "./renderers/cards-mainfix.js?v=v2.1-mainfix";
import { renderInteractiveTimeline } from "./renderers/timeline.js?v=v2.0";
import { escapeHtml } from "./utils.js?v=v2.0";

function optionHtml(values, current, label) { return [`<option value="">${label}</option>`].concat(values.map(v => `<option value="${escapeHtml(v)}" ${current === v ? 'selected' : ''}>${escapeHtml(v)}</option>`)).join(''); }
function vocabLabels(entries) { return (entries || []).map(entry => entry.label); }
function hostTreeLabels(treeType) { const all = VOCAB.mushrooms.hostTrees || []; if (!treeType) return all.map(entry => entry.label); if (treeType === 'Hardwood') return all.filter(entry => entry.broadType === 'hardwood').map(entry => entry.label); if (treeType === 'Conifer / softwood') return all.filter(entry => entry.broadType === 'conifer').map(entry => entry.label); return all.map(entry => entry.label); }
function formatLabelFromSlug(slug) { return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()); }
function renderResultList(records, context = 'general') { return records.length ? records.map(record => renderResultCard(record, context)).join("") : '<div class="panel empty-state"><h3>No matches</h3><p>No records matched the current filters.</p></div>'; }

function currentMonthName() { const focusDate = new Date(); focusDate.setDate(focusDate.getDate() + 14); return MONTHS[focusDate.getMonth()]; }
function inSeasonForagingRecords(allRecords) { const month = currentMonthName(); return allRecords.filter(record => (isPlant(record) || isForagingMushroom(record)) && (record.months_available || []).includes(month)); }

function renderCompactSeasonPanel(allRecords, page) {
  const month = currentMonthName();
  const inSeason = inSeasonForagingRecords(allRecords);
  const plantCount = inSeason.filter(isPlant).length;
  const mushroomCount = inSeason.filter(isForagingMushroom).length;
  const title = page === 'home' ? 'In season now' : `In season now · ${page === 'plants' ? 'Plants' : 'Mushrooms'}`;
  const links = page === 'home'
    ? `<div class="section-chip-row"><a class="section-chip" href="#/plants">Plants</a><a class="section-chip" href="#/mushrooms">Mushrooms</a></div>`
    : '';
  return `<section class="panel"><div class="result-header compact-result-header"><div><p class="eyebrow subtle">${escapeHtml(title)}</p><h2>${escapeHtml(month)}</h2><p class="results-meta">${inSeason.length} total · ${plantCount} plants · ${mushroomCount} mushrooms</p></div></div><div class="tag-row"><span class="tag">${inSeason.length} in season</span><span class="tag">${plantCount} plants</span><span class="tag">${mushroomCount} mushrooms</span></div>${links}</section>`;
}

function renderFilterBlock({ page, filters, extraFilters = [], title }) {
  return `<section class="panel workspace-pane filter-pane-card"><div class="section-heading-block"><h3>${escapeHtml(title)} filters</h3></div><div class="filter-form-grid"><label><span>Search</span><input type="search" data-filter="search" value="${escapeHtml(filters.search || '')}" placeholder="Search names, Latin names, notes, uses"></label><label><span>Month</span><select data-filter="month">${optionHtml(MONTHS, filters.month, 'Any month')}</select></label>${extraFilters.join('')}</div><div class="workspace-actions"><button type="button" data-action="clear-filters">Clear filters</button></div></section>`;
}

function renderStandardPage({ page, title, intro, records, filters, context, extraFilters }) {
  return `<section class="workspace-shell"><article class="panel workspace-head"><div><p class="eyebrow subtle">${escapeHtml(title)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p></div></article>${renderFilterBlock({ page, filters, extraFilters, title })}<section class="panel workspace-pane results-pane-card"><div class="result-header compact-result-header"><div><h3>${escapeHtml(title)} results</h3><p class="results-meta">${records.length} match${records.length === 1 ? '' : 'es'}</p></div></div><div class="result-list">${renderResultList(records, context)}</div></section></section>`;
}

function renderCreditsPage(allRecords, overridePayload) {
  const overrides = overridePayload?.overrides || {};
  const entries = Object.entries(overrides).map(([slug, value]) => {
    const record = allRecords.find(item => item.slug === slug);
    const label = record?.display_name || formatLabelFromSlug(slug);
    const sci = record?.scientific_name || '';
    const links = (value?.images || []).map((url, index) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Image ${index + 1}</a></li>`).join('');
    return `<article class="panel"><h3>${escapeHtml(label)}</h3><p class="results-meta">${escapeHtml(sci)}</p><ul>${links}</ul></article>`;
  }).join('');
  return `<section class="workspace-shell"><article class="panel workspace-head"><div><p class="eyebrow subtle">Credits</p><h2>Image credits</h2><p>This build uses Wikimedia Commons images supplied by you as file names or direct links.</p></div></article>${entries || '<section class="panel empty-state"><h3>No credits loaded</h3><p>No Wikimedia override entries were available for this build.</p></section>'}</section>`;
}

export function renderDashboard({ page, allRecords, currentRecords, filters, selectedMonth, selectedWeek, overridePayload }) {
  const activePage = ['home','plants','mushrooms','medicinal','lookalikes','timeline','review','credits'].includes(page) ? page : 'home';
  if (activePage === 'home') {
    const seasonRecords = inSeasonForagingRecords(allRecords);
    return `${renderCompactSeasonPanel(allRecords, 'home')}<section class="panel workspace-pane results-pane-card"><div class="result-header compact-result-header"><div><h3>In-season results</h3><p class="results-meta">${seasonRecords.length} match${seasonRecords.length === 1 ? '' : 'es'}</p></div></div><div class="result-list">${renderResultList(seasonRecords, 'general')}</div></section>`;
  }
  if (activePage === 'plants') {
    return `${renderCompactSeasonPanel(allRecords, 'plants')}${renderStandardPage({ page:'plants', title:'Plants', intro:'Filters first, results underneath. No extra window nonsense.', records:currentRecords, filters, context:'general', extraFilters:[`<label><span>Habitat</span><select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>`,`<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`,`<label><span>Size</span><select data-filter="size">${optionHtml(vocabLabels(VOCAB.common.sizes), filters.size, 'Any size')}</select></label>`,`<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`] })}`;
  }
  if (activePage === 'mushrooms') {
    return `${renderCompactSeasonPanel(allRecords, 'mushrooms')}${renderStandardPage({ page:'mushrooms', title:'Mushrooms', intro:'Edible and foraging-relevant mushrooms only.', records:currentRecords, filters, context:'mushrooms', extraFilters:[`<label><span>Substrate</span><select data-filter="substrate">${optionHtml(vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, 'Any substrate')}</select></label>`,`<label><span>Tree type</span><select data-filter="treeType">${optionHtml(vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, 'Any tree type')}</select></label>`,`<label><span>Host tree</span><select data-filter="hostTree">${optionHtml(hostTreeLabels(filters.treeType), filters.hostTree, 'Any host tree')}</select></label>`,`<label><span>Ring</span><select data-filter="ring">${optionHtml(vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, 'Any ring state')}</select></label>`,`<label><span>Texture</span><select data-filter="texture">${optionHtml(vocabLabels(VOCAB.mushrooms.textures), filters.texture, 'Any texture')}</select></label>`,`<label><span>Smell</span><select data-filter="smell">${optionHtml(vocabLabels(VOCAB.mushrooms.odors), filters.smell, 'Any smell')}</select></label>`,`<label><span>Staining</span><select data-filter="staining">${optionHtml(vocabLabels(VOCAB.mushrooms.stainingColors), filters.staining, 'Any staining')}</select></label>`,`<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`] })}`;
  }
  if (activePage === 'medicinal') {
    return renderStandardPage({ page:'medicinal', title:'Medicinal', intro:'Medicinal uses and related filters.', records:currentRecords, filters, context:'medicinal', extraFilters:[`<label><span>Medicinal action</span><select data-filter="medicinalAction">${optionHtml(vocabLabels(VOCAB.medicinal.actions), filters.medicinalAction, 'Any action')}</select></label>`,`<label><span>Body system</span><select data-filter="medicinalSystem">${optionHtml(vocabLabels(VOCAB.medicinal.bodySystems), filters.medicinalSystem, 'Any body system')}</select></label>`,`<label><span>Medical term</span><select data-filter="medicinalTerm">${optionHtml(vocabLabels(VOCAB.medicinal.symptoms), filters.medicinalTerm, 'Any medical term')}</select></label>`,`<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`] });
  }
  if (activePage === 'lookalikes') {
    const severities = [...new Set(currentRecords.map(r => r.non_edible_severity).filter(Boolean))];
    return renderStandardPage({ page:'lookalikes', title:'Non-edible look-alikes', intro:'Non-edible, poisonous, deadly, or otherwise not-for-the-pan entries.', records:currentRecords, filters, context:'lookalikes', extraFilters:[`<label><span>Severity</span><select data-filter="severity">${optionHtml(severities, filters.severity, 'Any severity')}</select></label>`] });
  }
  if (activePage === 'review') {
    const reviewReasons = [...new Set(currentRecords.flatMap(record => record.reviewReasons || []))].sort((a, b) => a.localeCompare(b));
    return renderStandardPage({ page:'review', title:'Needs Review', intro:'Internal cleanup queue.', records:currentRecords, filters, context:'review', extraFilters:[`<label><span>Review reason</span><select data-filter="reviewReason">${optionHtml(reviewReasons, filters.reviewReason, 'Any review reason')}</select></label>`] });
  }
  if (activePage === 'timeline') {
    return `<section class="workspace-shell timeline-workspace-shell"><article class="panel workspace-head"><div><p class="eyebrow subtle">Timeline</p><h2>Season slider</h2><p>The rail is compact now. Move the months, keep the focused month centered, and let the results sit underneath.</p></div></article>${renderInteractiveTimeline(allRecords, selectedMonth, selectedWeek, 'results')}</section>`;
  }
  if (activePage === 'credits') return renderCreditsPage(allRecords, overridePayload);
  return '';
}
