import { ACTIVE_NOW_LABEL, MONTHS } from "./constants.js?v=v2.0";
import { medicinalRecords, isMushroom, isPlant, reviewRecords, lookalikeRecords } from "./data-model.js?v=v2.0";
import { VOCAB } from "./vocabulary.js?v=v2.0";
import { renderResultCard } from "./renderers/cards.js?v=v2.0";
import { renderInteractiveTimeline } from "./renderers/timeline.js?v=v2.0";
import { escapeHtml } from "./utils.js?v=v2.0";

function optionHtml(values, current, label) {
  return [`<option value="">${label}</option>`]
    .concat(values.map(v => `<option value="${escapeHtml(v)}" ${current === v ? 'selected' : ''}>${escapeHtml(v)}</option>`)).join('');
}
function vocabLabels(entries) { return (entries || []).map(entry => entry.label); }
function categoryOptions(records, current) {
  const categories = [...new Set((records || []).map(record => record.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return optionHtml(categories, current, 'Any category');
}
function hostTreeLabels(treeType) {
  const all = VOCAB.mushrooms.hostTrees || [];
  if (!treeType) return all.map(entry => entry.label);
  if (treeType === 'Hardwood') return all.filter(entry => entry.broadType === 'hardwood').map(entry => entry.label);
  if (treeType === 'Conifer / softwood') return all.filter(entry => entry.broadType === 'conifer').map(entry => entry.label);
  return all.map(entry => entry.label);
}
function renderResultList(records, context = 'general') {
  return records.length
    ? records.map(record => renderResultCard(record, context)).join("")
    : '<div class="panel empty-state"><h3>No matches</h3><p>That filter combination is too tight right now. Loosen one or two dropdowns.</p></div>';
}
function getCurrentMonth() {
  const focusDate = new Date();
  focusDate.setDate(focusDate.getDate() + 14);
  return MONTHS[focusDate.getMonth()];
}
function seasonToggleProps(page, filters) {
  const currentMonth = getCurrentMonth();
  const isSeasonFiltered = !!filters?.month && filters.month === currentMonth;
  return {
    href: isSeasonFiltered ? `#/${page}` : (page === 'timeline' ? '#/focus/timeline' : `#/focus/${page}`),
    label: isSeasonFiltered ? 'Show all' : ACTIVE_NOW_LABEL
  };
}
function renderWorkspace({ page, title, intro = '', records, filters, context = 'general', extraFilters = [], paneMode = 'results', scopeRecords, showResultsMeta = true }) {
  const seasonToggle = seasonToggleProps(page, filters);
  const filterHtml = `
    <section class="panel workspace-pane filter-pane-card">
      <div class="section-heading-block">
        <h3>${escapeHtml(title)} filters</h3>
      </div>
      <div class="filter-form-grid">
        <label><span>Search</span><input type="search" data-filter="search" value="${escapeHtml(filters.search || '')}" placeholder="Search names, Latin names, notes, uses"></label>
        <label><span>Month</span><select data-filter="month">${optionHtml(MONTHS, filters.month, 'Any month')}</select></label>
        ${page === 'home' ? `<label><span>Category</span><select data-filter="category">${categoryOptions(scopeRecords, filters.category)}</select></label>` : ''}
        ${extraFilters.join('')}
      </div>
      <div class="workspace-actions">
        <button type="button" data-action="clear-filters">Clear filters</button>
        ${page !== 'review' ? `<a class="buttonish" href="${seasonToggle.href}">${seasonToggle.label}</a>` : ''}
        <a class="buttonish" href="#/review">Needs Review</a>
      </div>
    </section>`;
  const resultsHtml = `
    <section class="panel workspace-pane results-pane-card">
      <div class="result-header compact-result-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${showResultsMeta ? `<p class="results-meta">${records.length} item${records.length === 1 ? '' : 's'}</p>` : ''}
        </div>
        <div class="result-actions">
          ${page !== 'review' ? `<a class="buttonish" href="${seasonToggle.href}">${seasonToggle.label}</a>` : ''}
          <a class="buttonish" href="#/review">Needs Review</a>
        </div>
      </div>
      <div class="result-list">${renderResultList(records, context)}</div>
    </section>`;
  return `
    <section class="workspace-shell">
      <article class="panel workspace-head">
        <div>
          <p class="eyebrow subtle">${escapeHtml(title)}</p>
          <h2>${escapeHtml(title)}</h2>
          ${intro ? `<p>${escapeHtml(intro)}</p>` : ''}
        </div>
        <div class="workspace-tabs" role="tablist" aria-label="${escapeHtml(title)} panels">
          <button class="workspace-tab ${paneMode === 'filters' ? 'active' : ''}" type="button" data-action="set-pane-mode" data-page="${escapeHtml(page)}" data-pane-mode="filters" aria-pressed="${paneMode === 'filters' ? 'true' : 'false'}">Filters</button>
          <button class="workspace-tab ${paneMode === 'results' ? 'active' : ''}" type="button" data-action="set-pane-mode" data-page="${escapeHtml(page)}" data-pane-mode="results" aria-pressed="${paneMode === 'results' ? 'true' : 'false'}">Results</button>
        </div>
      </article>
      ${paneMode === 'filters' ? filterHtml : resultsHtml}
    </section>`;
}
function renderSectionNav(activePage) {
  const items = [['home','Home'],['identify','Identify'],['plants','Plants'],['mushrooms','Mushrooms'],['medicinal','Medicinal'],['lookalikes','Look-Alikes'],['timeline','Timeline'],['review','Needs Review']];
  return `<div class="section-chip-row" aria-label="Section chooser">${items.map(([slug, label]) => `<a class="section-chip ${activePage === slug ? 'active' : ''}" href="#/${slug}">${escapeHtml(label)}</a>`).join('')}</div>`;
}
function renderSeasonHero(allRecords, activePage) {
  const currentMonth = getCurrentMonth();
  const activeNow = allRecords.filter(record => (record.months_available || []).includes(currentMonth));
  return `
    <section class="focus-now-panel panel">
      <div class="focus-now-grid">
        <div class="focus-now-copy">
          <p class="eyebrow subtle">In season now</p>
          <h2>${escapeHtml(currentMonth)}</h2>
          <p>${activeNow.length} entries line up with the current seasonal window.</p>
        </div>
      </div>
      <div class="section-chip-row" aria-label="Seasonal section chooser">
        <a class="section-chip ${activePage === 'home' ? 'active' : ''}" href="#/focus/home">All in season</a>
        <a class="section-chip ${activePage === 'plants' ? 'active' : ''}" href="#/focus/plants">Plants in season</a>
        <a class="section-chip ${activePage === 'mushrooms' ? 'active' : ''}" href="#/focus/mushrooms">Mushrooms in season</a>
        <a class="section-chip ${activePage === 'medicinal' ? 'active' : ''}" href="#/focus/medicinal">Medicinal in season</a>
      </div>
      ${renderSectionNav(activePage)}
    </section>`;
}
function renderIdentifyPage({ filters, records }) {
  const kind = filters.kind || '';
  const plantFilters = [
    `<label><span>Month</span><select data-filter="month">${optionHtml(MONTHS, filters.month, 'Any month')}</select></label>`,
    `<label><span>Plant category</span><select data-filter="category">${optionHtml(['Fruit','Green','Flower','Root','Tree Product','Green / Tubers'], filters.category, 'Any plant type')}</select></label>`,
    `<label><span>Habitat</span><select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>`,
    `<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`,
    `<label><span>Size</span><select data-filter="size">${optionHtml(vocabLabels(VOCAB.common.sizes), filters.size, 'Any size')}</select></label>`,
    `<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`
  ];
  const mushroomFilters = [
    `<label><span>Month</span><select data-filter="month">${optionHtml(MONTHS, filters.month, 'Any month')}</select></label>`,
    `<label><span>Substrate</span><select data-filter="substrate">${optionHtml(vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, 'Any substrate')}</select></label>`,
    `<label><span>Tree type</span><select data-filter="treeType">${optionHtml(vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, 'Any tree type')}</select></label>`,
    `<label><span>Host tree</span><select data-filter="hostTree">${optionHtml(hostTreeLabels(filters.treeType), filters.hostTree, 'Any host tree')}</select></label>`,
    `<label><span>Underside</span><select data-filter="underside">${optionHtml(vocabLabels(VOCAB.mushrooms.undersideTypes), filters.underside, 'Any underside')}</select></label>`,
    `<label><span>Ring</span><select data-filter="ring">${optionHtml(vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, 'Any ring state')}</select></label>`,
    `<label><span>Texture</span><select data-filter="texture">${optionHtml(vocabLabels(VOCAB.mushrooms.textures), filters.texture, 'Any texture')}</select></label>`,
    `<label><span>Smell</span><select data-filter="smell">${optionHtml(vocabLabels(VOCAB.mushrooms.odors), filters.smell, 'Any smell')}</select></label>`,
    `<label><span>Staining</span><select data-filter="staining">${optionHtml(vocabLabels(VOCAB.mushrooms.stainingColors), filters.staining, 'Any staining')}</select></label>`,
    `<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`
  ];
  const filterHtml = `
    <section class="panel workspace-pane filter-pane-card">
      <div class="section-heading-block">
        <h2>Identify</h2>
        <p>Choose plant or mushroom, then narrow it down. Results update below as you go.</p>
      </div>
      <div class="filter-form-grid">
        <label><span>Search type</span><select data-filter="kind">
          <option value="">Choose plant or mushroom</option>
          <option value="plant" ${kind === 'plant' ? 'selected' : ''}>Plant</option>
          <option value="mushroom" ${kind === 'mushroom' ? 'selected' : ''}>Mushroom</option>
        </select></label>
        <label><span>Name search</span><input type="search" data-filter="search" value="${escapeHtml(filters.search || '')}" placeholder="Common or Latin name if you know part of it"></label>
        ${(kind === 'plant' ? plantFilters : kind === 'mushroom' ? mushroomFilters : []).join('')}
      </div>
      <div class="workspace-actions">
        <button type="button" data-action="clear-filters">Clear filters</button>
      </div>
    </section>`;
  const resultsHtml = !kind
    ? `<section class="panel empty-state"><h3>Start with a type</h3><p>Pick plant or mushroom first. Then the ID dropdowns will do their job.</p></section>`
    : `<section class="panel workspace-pane results-pane-card"><div class="result-header compact-result-header"><div><h3>Possible matches</h3><p class="results-meta">${records.length} candidate${records.length === 1 ? '' : 's'}</p></div></div><div class="result-list">${renderResultList(records, kind === 'mushroom' ? 'mushrooms' : 'general')}</div></section>`;
  return `<section class="workspace-shell identify-shell">${filterHtml}${resultsHtml}</section>`;
}
export function renderDashboard({ page, allRecords, currentRecords, filters, selectedMonth, selectedWeek, paneMode }) {
  const activePage = ['home','identify','plants','mushrooms','medicinal','lookalikes','timeline','review'].includes(page) ? page : 'home';
  let workspaceHtml = '';
  if (activePage === 'identify') {
    workspaceHtml = renderIdentifyPage({ filters, records: currentRecords });
  } else if (activePage === 'plants') {
    workspaceHtml = renderWorkspace({ page:'plants', title:'Plants', intro:'', records:currentRecords, filters, context:'general', paneMode, scopeRecords: allRecords.filter(isPlant), extraFilters:[`<label><span>Habitat</span><select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>`,`<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`,`<label><span>Size</span><select data-filter="size">${optionHtml(vocabLabels(VOCAB.common.sizes), filters.size, 'Any size')}</select></label>`,`<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`] });
  } else if (activePage === 'mushrooms') {
    workspaceHtml = renderWorkspace({ page:'mushrooms', title:'Mushrooms', intro:'', records:currentRecords, filters, context:'mushrooms', paneMode, scopeRecords: allRecords.filter(isMushroom), extraFilters:[`<label><span>Substrate</span><select data-filter="substrate">${optionHtml(vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, 'Any substrate')}</select></label>`,`<label><span>Tree type</span><select data-filter="treeType">${optionHtml(vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, 'Any tree type')}</select></label>`,`<label><span>Host tree</span><select data-filter="hostTree">${optionHtml(hostTreeLabels(filters.treeType), filters.hostTree, 'Any host tree')}</select></label>`,`<label><span>Ring</span><select data-filter="ring">${optionHtml(vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, 'Any ring state')}</select></label>`,`<label><span>Texture</span><select data-filter="texture">${optionHtml(vocabLabels(VOCAB.mushrooms.textures), filters.texture, 'Any texture')}</select></label>`,`<label><span>Smell</span><select data-filter="smell">${optionHtml(vocabLabels(VOCAB.mushrooms.odors), filters.smell, 'Any smell')}</select></label>`,`<label><span>Staining</span><select data-filter="staining">${optionHtml(vocabLabels(VOCAB.mushrooms.stainingColors), filters.staining, 'Any staining')}</select></label>`,`<label><span>Underside</span><select data-filter="underside">${optionHtml(vocabLabels(VOCAB.mushrooms.undersideTypes), filters.underside, 'Any underside')}</select></label>`] });
  } else if (activePage === 'medicinal') {
    workspaceHtml = renderWorkspace({ page:'medicinal', title:'Medicinal', intro:'', records:currentRecords, filters, context:'medicinal', paneMode, scopeRecords: medicinalRecords(allRecords), extraFilters:[`<label><span>Medicinal action</span><select data-filter="medicinalAction">${optionHtml(vocabLabels(VOCAB.medicinal.actions), filters.medicinalAction, 'Any action')}</select></label>`,`<label><span>Body system</span><select data-filter="medicinalSystem">${optionHtml(vocabLabels(VOCAB.medicinal.bodySystems), filters.medicinalSystem, 'Any body system')}</select></label>`,`<label><span>Medical term</span><select data-filter="medicinalTerm">${optionHtml(vocabLabels(VOCAB.medicinal.symptoms), filters.medicinalTerm, 'Any medical term')}</select></label>`] });
  } else if (activePage === 'lookalikes') {
    const source = lookalikeRecords(allRecords); const severities = [...new Set(source.map(r => r.non_edible_severity).filter(Boolean))];
    workspaceHtml = renderWorkspace({ page:'lookalikes', title:'Look-Alikes', intro:'', records:currentRecords, filters, context:'lookalikes', paneMode, scopeRecords: source, extraFilters:[`<label><span>Severity</span><select data-filter="severity">${optionHtml(severities, filters.severity, 'Any severity')}</select></label>`] });
  } else if (activePage === 'review') {
    const source = reviewRecords(allRecords); const reviewReasons = [...new Set(source.flatMap(record => record.reviewReasons || []))].sort((a, b) => a.localeCompare(b));
    workspaceHtml = renderWorkspace({ page:'review', title:'Needs Review', intro:'', records:currentRecords, filters, context:'review', paneMode, scopeRecords: source, extraFilters:[`<label><span>Review reason</span><select data-filter="reviewReason">${optionHtml(reviewReasons, filters.reviewReason, 'Any review reason')}</select></label>`] });
  } else if (activePage === 'timeline') {
    workspaceHtml = `<section class="workspace-shell timeline-workspace-shell"><article class="panel workspace-head"><div><p class="eyebrow subtle">Timeline</p><h2>Season slider</h2></div><div class="workspace-tabs" role="tablist" aria-label="Timeline panels"><button class="workspace-tab ${paneMode === 'filters' ? 'active' : ''}" type="button" data-action="set-pane-mode" data-page="timeline" data-pane-mode="filters" aria-pressed="${paneMode === 'filters' ? 'true' : 'false'}">Filters</button><button class="workspace-tab ${paneMode === 'results' ? 'active' : ''}" type="button" data-action="set-pane-mode" data-page="timeline" data-pane-mode="results" aria-pressed="${paneMode === 'results' ? 'true' : 'false'}">Results</button></div></article>${renderInteractiveTimeline(allRecords, selectedMonth, selectedWeek, paneMode)}</section>`;
  } else {
    workspaceHtml = renderWorkspace({ page:'home', title:'Guide species', intro:'', records:currentRecords, filters, context:'general', paneMode, scopeRecords: currentRecords, extraFilters:[`<label><span>Habitat</span><select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>`,`<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`,`<label><span>Size</span><select data-filter="size">${optionHtml(vocabLabels(VOCAB.common.sizes), filters.size, 'Any size')}</select></label>`], showResultsMeta:false });
  }
  return `${renderSeasonHero(allRecords, activePage)}${workspaceHtml}`;
}
