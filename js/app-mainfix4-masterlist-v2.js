import { APP_VERSION, MONTHS } from "./constants-mainfix.js?v=2026-04-17-38";
import { loadLocalData, loadSupabaseData, loadOverridePayload } from "./api-mainfix4.js?v=2026-04-17-38";
import { loadLocalDataWithMaster } from "./api-masterlist.js?v=v3.1.3";
import { sortRecords, normalizeRecord, isPlant, isForagingMushroom, medicinalRecords, reviewRecords, avoidRecords } from "./data-model-mainfix4.js?v=v3.2.0";
import { applyCustomSort as applyStableSort } from "./sort-utils-mainfix.js?v=2026-04-17-38";
import { state } from "./state.js";
import { parseRoute } from "./router.js";
import { renderDashboard } from "./pages-mainfix4.js?v=2026-04-17-38";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal, openDetail } from "./ui-mainfix.js?v=2026-04-17-37";
import { loadRareSpecies, loadRareSightings, wireRarePage } from "./rare-watch.js";

const focusDate = new Date();
focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];
const RELEASED_REVIEW_KEY = "foraging_released_review_slugs_v1";
const RESCUED_BOLETE_SLUGS = new Set([
  'frosts-bolete',
  'larch-bolete',
  'old-man-of-the-woods',
  'orange-birch-bolete',
  'orange-oak-bolete',
  'painted-suillus',
  'red-cracking-bolete',
  'shaggy-stalked-bolete'
]);

const COMMONNESS_ORDER = {
  "very common": 5, "abundant": 5, "plentiful": 5, "widespread": 5, "extremely common": 5,
  "common": 4, "fairly common": 4, "locally common": 4, "frequent": 4, "regular": 4,
  "occasional": 3, "scattered": 3, "moderately common": 3, "patchy": 3,
  "uncommon": 2, "infrequent": 2, "scarce": 2, "local": 2, "locally scarce": 2,
  "rare": 1, "very rare": 1, "sparse": 1, "isolated": 1
};
const FOOD_QUALITY_ORDER = { "choice": 5, "excellent": 5, "very good": 4, "good": 3, "fair": 2, "poor": 1, "not worth foraging": 0 };
const emptyFilter = (page = '') => ({ search:'', month: page==='home' ? CURRENT_MONTH : '', habitat:'', part:'', size:'', taste:'', substrate:'', treeType:'', hostTree:'', ring:'', texture:'', smell:'', staining:'', boleteGroup:'', boleteSubgroup:'', poreColor:'', stemFeature:'', quickBlueStain:'', quickRedCapPores:'', quickStickyCap:'', quickRoughStalk:'', quickPinkPoresBitter:'', quickShaggyOddball:'', medicinalAction:'', medicinalSystem:'', medicinalTerm:'', reviewReason:'', severity:'', flowerColor:'', leafShape:'', leafArrangement:'', stemSurface:'', leafPointCount:'', sort:'' });
const filterState = { home:emptyFilter('home'), search:emptyFilter(), plants:emptyFilter(), mushrooms:emptyFilter(), "mushrooms-gilled":emptyFilter(), boletes:emptyFilter(), "mushrooms-other":emptyFilter(), medicinal:emptyFilter(), rare:emptyFilter(), lookalikes:emptyFilter(), timeline:emptyFilter(), review:emptyFilter(), credits:emptyFilter(), references:emptyFilter() };
let selectedTimelineMonth = CURRENT_MONTH;
let overridePayload = { overrides:{}, metadata:{}, references:[], creditsPayload:{credits:{}} };
let releasedReviewSlugs = new Set();

const IMAGE_OVERRIDE_NAME_ALIASES = {
  'butyriboletus frostii': 'frosts-bolete',
  'frost s bolete': 'frosts-bolete',
  'frosts bolete': 'frosts-bolete',
  'suillus grevillei': 'larch-bolete',
  'larch bolete': 'larch-bolete',
  'strobilomyces strobilaceus': 'old-man-of-the-woods',
  'old man of the woods': 'old-man-of-the-woods',
  'leccinum versipelle': 'orange-birch-bolete',
  'orange birch bolete': 'orange-birch-bolete',
  'leccinum aurantiacum': 'orange-oak-bolete',
  'orange oak bolete': 'orange-oak-bolete',
  'suillus spraguei': 'painted-suillus',
  'painted suillus': 'painted-suillus',
  'xerocomellus chrysenteron': 'red-cracking-bolete',
  'red cracking bolete': 'red-cracking-bolete',
  'suillus punctipes': 'dotted-stem-suillus',
  'dotted stem suillus': 'dotted-stem-suillus',
  'leccinum pseudoinsigne': 'eastern-orange-bolete',
  'eastern orange bolete': 'eastern-orange-bolete',
  'aureoboletus projectellus': 'admirable-bolete',
  'admirable bolete': 'admirable-bolete',
  'strobilomyces strobilaceus group': 'shaggy-stalked-bolete',
  'shaggy stalked bolete': 'shaggy-stalked-bolete'
};
function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findOverrideForRecord(record, overrides = {}) {
  if (!record) return null;
  if (record.slug && overrides[record.slug]) return overrides[record.slug];
  const keys = [record.scientific_name, record.display_name, record.common_name].map(normalizeKey).filter(Boolean);
  for (const key of keys) {
    const alias = IMAGE_OVERRIDE_NAME_ALIASES[key];
    if (alias && overrides[alias]) return overrides[alias];
  }
  return null;
}

async function loadBoletePack(){
  try{
    const response = await fetch("data/boletes-v1.json", { cache: "no-store" });
    const payload = await response.json();
    const records = Array.isArray(payload?.records) ? payload.records : [];
    return records.filter((record) => !RESCUED_BOLETE_SLUGS.has(record.slug));
  }catch{
    return [];
  }
}
function applyImageOverridesToRecords(records = [], overrides = {}) {
  return (records || []).map((record) => {
    const override = findOverrideForRecord(record, overrides);
    if (!override) return record;
    return { ...record, images: Array.isArray(override.images) ? override.images : (record.images || []) };
  });
}
function uniqueList(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}
function mergeDuplicateRecords(a, b) {
  const merged = { ...a, ...b };
  const arrayKeys = [
    'images','links','months_available','habitat','observedPart','size','taste','substrate','treeType','hostTree','ring','texture','smell','staining','boleteGroup','boleteSubgroup','poreColor','stemFeature','medicinalAction','medicinalSystem','medicinalTerms','reviewReasons','flowerColor','leafShape','leafArrangement','stemSurface','leafPointCount','look_alikes','use_tags','affected_systems'
  ];
  arrayKeys.forEach((key) => {
    merged[key] = uniqueList([...(a[key] || []), ...(b[key] || [])]);
    if (!merged[key].length) delete merged[key];
  });
  if (a.mushroom_profile || b.mushroom_profile) {
    merged.mushroom_profile = { ...(a.mushroom_profile || {}), ...(b.mushroom_profile || {}) };
  }
  const preferLonger = ['display_name','common_name','scientific_name','culinary_uses','medicinal_uses','notes','commonness','food_quality'];
  preferLonger.forEach((key) => {
    const av = String(a[key] || '');
    const bv = String(b[key] || '');
    merged[key] = bv.length >= av.length ? (b[key] || a[key]) : (a[key] || b[key]);
  });
  return merged;
}
function dedupeBySlug(records = []) {
  const bySlug = new Map();
  for (const record of records || []) {
    const key = record.slug || `${record.category || ''}|${record.display_name || ''}|${record.scientific_name || ''}`;
    if (bySlug.has(key)) bySlug.set(key, mergeDuplicateRecords(bySlug.get(key), record));
    else bySlug.set(key, record);
  }
  return [...bySlug.values()];
}
function loadReleasedReviewSlugs() {
  try { releasedReviewSlugs = new Set(JSON.parse(localStorage.getItem(RELEASED_REVIEW_KEY) || "[]")); } catch { releasedReviewSlugs = new Set(); }
}
function saveReleasedReviewSlugs() {
  localStorage.setItem(RELEASED_REVIEW_KEY, JSON.stringify([...releasedReviewSlugs]));
}
function arrayFilterMatch(record,key,value){ const hay = Array.isArray(record[key]) ? record[key] : []; if (!value) return true; return hay.includes(value); }
function normSortText(value){ return String(value || '').trim().toLowerCase().replace(/\s+/g,' '); }
function rankCommonness(record){
  const candidates = [
    record.commonness_score, record.commonnessScore, record.commonality_score, record.commonalityScore,
    record.commonness_rank, record.commonality_rank
  ].map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  if (candidates.length) return candidates[0];
  const text = normSortText(
    record.commonness || record.commonness_label || record.commonnessLabel ||
    record.commonality || record.commonality_label || record.commonalityLabel || ''
  );
  if (!text) return 0;
  if (COMMONNESS_ORDER[text]) return COMMONNESS_ORDER[text];
  if (/(very common|abundant|widespread|plentiful|extremely common)/.test(text)) return 5;
  if (/(^|\b)(common|frequent|regular|fairly common|locally common)(\b|$)/.test(text)) return 4;
  if (/(occasional|scattered|moderate|patchy)/.test(text)) return 3;
  if (/(uncommon|scarce|infrequent|local)/.test(text)) return 2;
  if (/(rare|sparse|isolated)/.test(text)) return 1;
  return 0;
}
function rankFoodQuality(record){
  const numeric = Number(record.food_quality_score ?? record.foodQualityScore ?? 0);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const text = normSortText(record.food_quality || record.foodQuality || record.mushroom_profile?.edibility_status || '');
  return FOOD_QUALITY_ORDER[text] || 0;
}
function sortWithRating(records, scoreFn, direction = 'desc'){
  return [...records].sort((a,b)=>{
    const aScore = scoreFn(a), bScore = scoreFn(b);
    const aRated = aScore > 0 ? 1 : 0, bRated = bScore > 0 ? 1 : 0;
    if (aRated !== bRated) return bRated - aRated;
    if (aRated && bRated && aScore !== bScore) return direction === 'asc' ? aScore - bScore : bScore - aScore;
    return String(a.display_name || a.common_name || '').localeCompare(String(b.display_name || b.common_name || ''));
  });
}
function applyCustomSort(records, sortValue){
  const list = [...records];
  if (!sortValue) return list;
  if (sortValue === 'common-desc') return sortWithRating(list, rankCommonness, 'desc');
  if (sortValue === 'common-asc') return sortWithRating(list, rankCommonness, 'asc');
  if (sortValue === 'food-quality-desc') return sortWithRating(list, rankFoodQuality, 'desc');
  if (sortValue === 'food-quality-asc') return sortWithRating(list, rankFoodQuality, 'asc');
  return list;
}
function queryMatches(record,filters){
  const query=(filters.search||'').trim().toLowerCase();
  const haystack=[record.display_name,record.common_name,record.scientific_name,record.category,record.culinary_uses,record.medicinal_uses,record.notes,record.other_uses,record.changes_over_time,record.edibility_detail,record.effects_on_body,record.use_tags?.join(' '),...(record.links||[]),...(record.reviewReasons||[]),...(record.affected_systems||[]),...(record.look_alikes||[]),...(record.mushroom_profile?.research_notes||[]),record.mushroom_profile?.summary,record.mushroom_profile?.ecology,record.mushroom_profile?.season_note].join(' ').toLowerCase();
  return (!query||haystack.includes(query))&&(!filters.month||(record.months_available||[]).includes(filters.month))&&(!filters.severity||(record.non_edible_severity||'')===filters.severity)&&arrayFilterMatch(record,'habitat',filters.habitat)&&arrayFilterMatch(record,'observedPart',filters.part)&&arrayFilterMatch(record,'size',filters.size)&&arrayFilterMatch(record,'taste',filters.taste)&&arrayFilterMatch(record,'substrate',filters.substrate)&&arrayFilterMatch(record,'treeType',filters.treeType)&&arrayFilterMatch(record,'hostTree',filters.hostTree)&&arrayFilterMatch(record,'ring',filters.ring)&&arrayFilterMatch(record,'texture',filters.texture)&&arrayFilterMatch(record,'smell',filters.smell)&&arrayFilterMatch(record,'staining',filters.staining)&&arrayFilterMatch(record,'boleteGroup',filters.boleteGroup)&&arrayFilterMatch(record,'boleteSubgroup',filters.boleteSubgroup)&&arrayFilterMatch(record,'poreColor',filters.poreColor)&&arrayFilterMatch(record,'stemFeature',filters.stemFeature)&&arrayFilterMatch(record,'medicinalAction',filters.medicinalAction)&&arrayFilterMatch(record,'medicinalSystem',filters.medicinalSystem)&&arrayFilterMatch(record,'medicinalTerms',filters.medicinalTerm)&&arrayFilterMatch(record,'flowerColor',filters.flowerColor)&&arrayFilterMatch(record,'leafShape',filters.leafShape)&&arrayFilterMatch(record,'leafArrangement',filters.leafArrangement)&&arrayFilterMatch(record,'stemSurface',filters.stemSurface)&&arrayFilterMatch(record,'leafPointCount',filters.leafPointCount)&&(!filters.reviewReason||(record.reviewReasons||[]).includes(filters.reviewReason));
}
function mushroomLane(record){
  const slug = String(record.slug || '').toLowerCase();
  const name = `${record.display_name || ''} ${record.common_name || ''}`.toLowerCase();
  const underside = (record.underside || []).map((v) => String(v).toLowerCase());
  const substrate = (record.substrate || []).map((v) => String(v).toLowerCase());
  const texture = (record.texture || []).map((v) => String(v).toLowerCase());
  if (slug.includes('morel') || name.includes('morel')) return 'other';
  if (underside.includes('gills')) return 'gills';
  const poreLike = underside.includes('pores');
  const woody = substrate.some((v) => /wood|tree|log|stump/.test(v)) || texture.includes('leathery');
  const boleteNamed = /bolete|suillus|slippery jack|old man of the woods|king bolete/i.test(name) || /bolete|suillus|slippery-jack|old-man-of-the-woods|king-bolete/.test(slug);
  if (poreLike && (boleteNamed || !woody)) return 'sponge';
  return 'other';
}
function applyQuickBoleteGroup() {
  const f = filterState.boletes;
  const suggestions = new Set();
  if (f.quickRoughStalk === 'yes') suggestions.add('Leccinum / scaber stalks');
  if (f.quickStickyCap === 'yes') suggestions.add('Suillus / slippery jacks');
  if (f.quickBlueStain === 'yes' || f.quickRedCapPores === 'yes') suggestions.add('Red & staining boletes');
  if (f.quickPinkPoresBitter === 'yes') suggestions.add('Tylopilus / bitter boletes');
  if (f.quickShaggyOddball === 'yes') suggestions.add('Oddballs / shaggy boletes');
  if (!suggestions.size && f.quickBlueStain === 'no' && f.quickRedCapPores === 'no' && f.quickStickyCap === 'no' && f.quickRoughStalk === 'no' && f.quickPinkPoresBitter === 'no') suggestions.add('Brown / king allies');
  if (suggestions.size === 1) {
    f.boleteGroup = [...suggestions][0];
  } else if (f.boleteGroup && !suggestions.has(f.boleteGroup)) {
    f.boleteGroup = '';
  }
}
function filteredForPage(page){
  let records;
  if(page==='home'||page==='credits'||page==='references'||page==='rare') records = state.allRecords.filter((record)=>queryMatches(record, filterState[page]||emptyFilter(page)));
  else if(page==='search') records = state.allRecords.filter((record)=>queryMatches(record, filterState.search));
  else if(page==='plants') records = state.allRecords.filter(isPlant).filter((record)=>queryMatches(record, filterState.plants));
  else if(page==='mushrooms') records = state.allRecords.filter(isForagingMushroom).filter((record)=>queryMatches(record, filterState.mushrooms));
  else if(page==='mushrooms-gilled') records = state.allRecords.filter(isForagingMushroom).filter((record)=>mushroomLane(record)==='gills').filter((record)=>queryMatches(record, filterState["mushrooms-gilled"]));
  else if(page==='boletes') records = state.allRecords.filter(isForagingMushroom).filter((record)=>mushroomLane(record)==='sponge').filter((record)=>queryMatches(record, filterState.boletes));
  else if(page==='mushrooms-other') records = state.allRecords.filter(isForagingMushroom).filter((record)=>mushroomLane(record)==='other').filter((record)=>queryMatches(record, filterState["mushrooms-other"]));
  else if(page==='medicinal') records = medicinalRecords(state.allRecords).filter((record)=>queryMatches(record, filterState.medicinal));
  else if(page==='lookalikes') records = avoidRecords(state.allRecords).filter((record)=>queryMatches(record, filterState.lookalikes));
  else if(page==='review') records = reviewRecords(state.allRecords).filter((record)=>!releasedReviewSlugs.has(record.slug)).filter((record)=>queryMatches(record, filterState.review));
  else records = state.allRecords;
  return applyStableSort(records, (filterState[page] || emptyFilter(page)).sort);
}
function navForPage(page){
  return ['mushrooms','mushrooms-gilled','boletes','mushrooms-other'].includes(page) ? 'mushrooms' : page;
}
function bindCustomActions(){
  document.querySelectorAll('[data-action="release-review"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const slug = btn.dataset.slug;
      if (!slug) return;
      releasedReviewSlugs.add(slug);
      saveReleasedReviewSlugs();
      renderCurrentRoute();
    });
  });
  document.querySelectorAll('[data-action="set-bolete-group"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      filterState.boletes.boleteGroup = btn.dataset.value || '';
      renderCurrentRoute();
    });
  });
  document.querySelectorAll('[data-action="set-quick-filter"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const key = btn.dataset.key || '';
      const value = btn.dataset.value || '';
      if (!key) return;
      filterState.boletes[key] = filterState.boletes[key] === value ? '' : value;
      applyQuickBoleteGroup();
      renderCurrentRoute();
    });
  });
  document.querySelectorAll('[data-action="clear-bolete-quickcheck"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      filterState.boletes.quickBlueStain = '';
      filterState.boletes.quickRedCapPores = '';
      filterState.boletes.quickStickyCap = '';
      filterState.boletes.quickRoughStalk = '';
      filterState.boletes.quickPinkPoresBitter = '';
      filterState.boletes.quickShaggyOddball = '';
      filterState.boletes.boleteGroup = '';
      renderCurrentRoute();
    });
  });
}
function renderCurrentRoute(){
  const route=parseRoute(location.hash||'#/home');
  const allowedPages=['home','search','plants','mushrooms','mushrooms-gilled','boletes','mushrooms-other','medicinal','rare','timeline','lookalikes','review','references','credits'];
  const activePage=route.page==='detail'?(state.route||'home'):(allowedPages.includes(route.page)?route.page:'home');
  state.route=activePage;
  markActiveNav(navForPage(activePage));
  if(route.page==='detail'&&route.slug){
    if(!document.getElementById('pageRoot').innerHTML.trim()) renderPage(renderDashboard({page:activePage,allRecords:state.allRecords,currentRecords:filteredForPage(activePage),filters:filterState[activePage]||emptyFilter(activePage),selectedMonth:selectedTimelineMonth,overridePayload,references:state.references}));
    bindDetailLinks();
    bindCustomActions();
    openDetail(route.slug);
    return;
  }
  renderPage(renderDashboard({page:activePage,allRecords:state.allRecords,currentRecords:filteredForPage(activePage),filters:filterState[activePage]||emptyFilter(activePage),selectedMonth:selectedTimelineMonth,overridePayload,references:state.references}));
  if (activePage === 'rare') wireRarePage();
  bindDetailLinks();
  bindCustomActions();
  bindSharedActions({
    onFilterChange:event=>{
      const target=event.currentTarget;
      const page=state.route;
      if(!filterState[page]) return;
      filterState[page][target.dataset.filter]=target.value;
      if(target.dataset.filter==='treeType') filterState[page].hostTree='';
      renderCurrentRoute();
    },
    onClearFilters:()=>{
      const page=state.route;
      if(!filterState[page]) return;
      filterState[page]=emptyFilter(page);
      renderCurrentRoute();
    },
    onTimelineMonthChange:month=>{ if(!month) return; selectedTimelineMonth=month; renderCurrentRoute(); },
    onPaneModeChange:()=>{},
    onTimelineShift:direction=>{
      const index=MONTHS.indexOf(selectedTimelineMonth);
      if(index<0) return;
      const delta=direction==='prev'?-1:1;
      selectedTimelineMonth=MONTHS[(index+delta+MONTHS.length)%MONTHS.length];
      renderCurrentRoute();
    },
    onToggleInSeason:page=>{
      if(!filterState[page]) return;
      filterState[page].month=filterState[page].month===CURRENT_MONTH?'':CURRENT_MONTH;
      renderCurrentRoute();
    }
  });
}
async function init(){
  wireModal();
  loadReleasedReviewSlugs();
  try{
    overridePayload=await loadOverridePayload();
    let payload;
    try{
      payload=await loadSupabaseData();
      payload=await loadLocalDataWithMaster(async()=>payload);
      state.dataSource='Supabase live data + local species additions + master species additions + Wikimedia override';
    }catch{
      payload=await loadLocalDataWithMaster(loadLocalData);
      state.dataSource='Local JSON + local species additions + master species additions + Wikimedia override';
    }
    const boletePack = applyImageOverridesToRecords(await loadBoletePack(), overridePayload?.overrides || {});
    const mergedRecords = dedupeBySlug([...(payload.records || []), ...boletePack]).map(normalizeRecord);
    state.allRecords=sortRecords(mergedRecords);
    state.references=payload.references||overridePayload.references||[];
    state.credits=payload.creditsPayload?.credits||overridePayload.creditsPayload?.credits||{};
    state.rareSpecies=await loadRareSpecies();
    state.rareSightings=await loadRareSightings();
    updateHeaderStats();
    const badge = document.getElementById('versionBadge');
    if (badge) badge.textContent = APP_VERSION;
    renderCurrentRoute();
    window.addEventListener('hashchange',renderCurrentRoute);
  }catch(error){
    console.error(error);
    renderPage(`<section class="panel empty-state"><h2>Data load failed</h2><p>${String(error.message||error)}</p></section>`);
  }
}
init();
