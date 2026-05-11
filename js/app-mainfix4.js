import { loadLocalData, loadSupabaseData, loadOverridePayload } from "./api-mainfix4.js?v=v2.1-mainfix23";
import { sortRecords, normalizeRecord, isPlant, isForagingMushroom, medicinalRecords, reviewRecords, avoidRecords } from "./data-model-mainfix4.js?v=v2.1-mainfix21";
import { state } from "./state.js?v=v2.1-mainfix21";
import { parseRoute } from "./router.js?v=v2.0";
import { MONTHS } from "./constants-mainfix.js?v=v2.1-mainfix23";
import { renderDashboard } from "./pages-mainfix4.js?v=v2.1-mainfix22";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal, openDetail } from "./ui-mainfix.js?v=v2.1-mainfix22";

const focusDate = new Date();
focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];
const emptyFilter = (page='') => ({ search:'', month: page==='home'?CURRENT_MONTH:'', habitat:'', part:'', size:'', taste:'', substrate:'', treeType:'', hostTree:'', ring:'', texture:'', smell:'', staining:'', medicinalAction:'', medicinalSystem:'', medicinalTerm:'', reviewReason:'', severity:'', flowerColor:'', leafShape:'', leafArrangement:'', stemSurface:'', leafPointCount:'' });
const filterState = { home: emptyFilter('home'), search: emptyFilter(), identification: emptyFilter(), plants: emptyFilter(), mushrooms: emptyFilter(), medicinal: emptyFilter(), lookalikes: emptyFilter(), review: emptyFilter(), credits: emptyFilter(), references: emptyFilter() };
let selectedTimelineMonth = CURRENT_MONTH;
let overridePayload = { overrides:{}, metadata:{}, references:[], creditsPayload:{credits:{}} };
function arrayFilterMatch(record,key,value){ const hay = Array.isArray(record[key]) ? record[key] : []; if(!value) return true; return hay.includes(value); }
function queryMatches(record, filters) {
  const query = (filters.search||'').trim().toLowerCase();
  const haystack = [record.display_name,record.common_name,record.scientific_name,record.category,record.culinary_uses,record.medicinal_uses,record.notes,record.other_uses,record.changes_over_time,record.edibility_detail,record.effects_on_body,...(record.links||[]),...(record.reviewReasons||[]),...(record.affected_systems||[]),...(record.look_alikes||[]),...(record.mushroom_profile?.research_notes||[]),record.mushroom_profile?.summary,record.mushroom_profile?.ecology,record.mushroom_profile?.season_note].join(' ').toLowerCase();
  return (!query || haystack.includes(query)) && (!filters.month || (record.months_available||[]).includes(filters.month)) && (!filters.severity || (record.non_edible_severity||'')===filters.severity) && arrayFilterMatch(record,'habitat',filters.habitat) && arrayFilterMatch(record,'observedPart',filters.part) && arrayFilterMatch(record,'size',filters.size) && arrayFilterMatch(record,'taste',filters.taste) && arrayFilterMatch(record,'substrate',filters.substrate) && arrayFilterMatch(record,'treeType',filters.treeType) && arrayFilterMatch(record,'hostTree',filters.hostTree) && arrayFilterMatch(record,'ring',filters.ring) && arrayFilterMatch(record,'texture',filters.texture) && arrayFilterMatch(record,'smell',filters.smell) && arrayFilterMatch(record,'staining',filters.staining) && arrayFilterMatch(record,'medicinalAction',filters.medicinalAction) && arrayFilterMatch(record,'medicinalSystem',filters.medicinalSystem) && arrayFilterMatch(record,'medicinalTerms',filters.medicinalTerm) && arrayFilterMatch(record,'flowerColor',filters.flowerColor) && arrayFilterMatch(record,'leafShape',filters.leafShape) && arrayFilterMatch(record,'leafArrangement',filters.leafArrangement) && arrayFilterMatch(record,'stemSurface',filters.stemSurface) && arrayFilterMatch(record,'leafPointCount',filters.leafPointCount) && (!filters.reviewReason || (record.reviewReasons||[]).includes(filters.reviewReason));
}
function filteredForPage(page){
  if(page==='home' || page==='credits' || page==='references' || page==='identification') return state.allRecords;
  if(page==='search') return state.allRecords.filter(record => queryMatches(record, filterState.search));
  if(page==='plants') return state.allRecords.filter(isPlant).filter(record => queryMatches(record, filterState.plants));
  if(page==='mushrooms') return state.allRecords.filter(isForagingMushroom).filter(record => queryMatches(record, filterState.mushrooms));
  if(page==='medicinal') return medicinalRecords(state.allRecords).filter(record => queryMatches(record, filterState.medicinal));
  if(page==='lookalikes') return avoidRecords(state.allRecords).filter(record => queryMatches(record, filterState.lookalikes));
  if(page==='review') return reviewRecords(state.allRecords).filter(record => queryMatches(record, filterState.review));
  return state.allRecords;
}
function renderCurrentRoute(){
  const route = parseRoute(location.hash||'#/home');
  const allowedPages = ['home','search','identification','plants','mushrooms','medicinal','lookalikes','timeline','review','credits','references'];
  const activePage = route.page==='detail' ? (state.route||'home') : (allowedPages.includes(route.page)?route.page:'home');
  state.route = activePage;
  markActiveNav(activePage);
  if(route.page==='detail' && route.slug){
    if(!document.getElementById('pageRoot').innerHTML.trim()) renderPage(renderDashboard({ page: activePage, allRecords: state.allRecords, currentRecords: filteredForPage(activePage), filters: filterState[activePage]||emptyFilter(activePage), selectedMonth: selectedTimelineMonth, overridePayload, references: state.references }));
    bindDetailLinks(); openDetail(route.slug); return;
  }
  renderPage(renderDashboard({ page: activePage, allRecords: state.allRecords, currentRecords: filteredForPage(activePage), filters: filterState[activePage]||emptyFilter(activePage), selectedMonth: selectedTimelineMonth, overridePayload, references: state.references }));
  bindDetailLinks();
  bindSharedActions({ onFilterChange: event => { const target = event.currentTarget; const page = state.route; if(!filterState[page]) return; filterState[page][target.dataset.filter] = target.value; if(target.dataset.filter==='treeType') filterState[page].hostTree=''; renderCurrentRoute(); }, onClearFilters: ()=>{ const page = state.route; if(!filterState[page]) return; filterState[page] = emptyFilter(page); renderCurrentRoute(); }, onTimelineMonthChange: month => { if(!month) return; selectedTimelineMonth=month; renderCurrentRoute(); }, onPaneModeChange: ()=>{}, onTimelineShift: direction => { const index = MONTHS.indexOf(selectedTimelineMonth); if(index<0) return; const delta = direction==='prev' ? -1 : 1; selectedTimelineMonth = MONTHS[(index+delta+MONTHS.length)%MONTHS.length]; renderCurrentRoute(); }, onToggleInSeason: page => { if(!filterState[page]) return; filterState[page].month = filterState[page].month === CURRENT_MONTH ? '' : CURRENT_MONTH; renderCurrentRoute(); } });
}
async function init(){ wireModal(); try{ overridePayload = await loadOverridePayload(); let payload; try{ payload = await loadSupabaseData(); state.dataSource = 'Supabase live data + local species additions + Wikimedia override'; } catch(e){ payload = await loadLocalData(); state.dataSource = 'Local JSON + local species additions + Wikimedia override'; } state.allRecords = sortRecords((payload.records||[]).map(normalizeRecord)); state.references = payload.references || overridePayload.references || []; state.credits = payload.creditsPayload?.credits || overridePayload.creditsPayload?.credits || {}; updateHeaderStats(); renderCurrentRoute(); window.addEventListener('hashchange', renderCurrentRoute); } catch(error){ console.error(error); renderPage(`<section class="panel empty-state"><h2>Data load failed</h2><p>${String(error.message||error)}</p></section>`); } }
init();
