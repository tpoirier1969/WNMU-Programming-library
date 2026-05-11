import { loadLocalData, loadSupabaseData } from "./api.js?v=v2.0";
import { sortRecords, normalizeRecord, isMushroom, isPlant, medicinalRecords } from "./data-model.js?v=v2.0";
import { state } from "./state.js?v=v2.0";
import { parseRoute } from "./router.js?v=v2.0";
import { MONTHS } from "./constants.js?v=v2.0";
import { renderDashboard } from "./pages-v2.2-identify.js?v=v2.2-identify";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal } from "./ui.js?v=v2.0";

const focusDate = new Date(); focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];

const emptyFilter = () => ({ search:"", month:"", category:"", habitat:"", part:"", size:"", taste:"", substrate:"", treeType:"", hostTree:"", ring:"", texture:"", smell:"", staining:"", medicinalAction:"", medicinalSystem:"", medicinalTerm:"", reviewReason:"", severity:"", kind:"" });

const filterState = { home:emptyFilter(), identify:emptyFilter(), plants:emptyFilter(), mushrooms:emptyFilter(), medicinal:emptyFilter(), lookalikes:emptyFilter(), review:emptyFilter() };
const paneMode = { home:'results', identify:'results', plants:'results', mushrooms:'results', medicinal:'results', lookalikes:'results', timeline:'results', review:'results' };
let selectedTimelineMonth = CURRENT_MONTH; let selectedTimelineWeek = 1;

function edibleOrMedicinalHome(record){
  if(record.non_edible_severity) return false;
  const med = (record.medicinal_uses||'').trim().length>0;
  if(isPlant(record)) return true;
  if(isMushroom(record)){
    const status = String(record.mushroom_profile?.edibility_status||'').toLowerCase();
    if(/inedible|poison|toxic|deadly/.test(status)) return false;
    if(/edible|choice/.test(status)) return true;
    return med; // include if medicinal, otherwise exclude unknown
  }
  return med;
}

function arrayFilterMatch(record, key, value) { if (!value) return true; return (record[key] || []).includes(value); }
function queryMatches(record, f){
  const q=(f.search||'').toLowerCase();
  const hay=(record.display_name+' '+record.common_name+' '+record.scientific_name).toLowerCase();
  const m=!f.month || (record.months_available||[]).includes(f.month);
  return (!q||hay.includes(q)) && m
    && (!f.category || record.category===f.category)
    && arrayFilterMatch(record,'habitat',f.habitat)
    && arrayFilterMatch(record,'observedPart',f.part)
    && arrayFilterMatch(record,'size',f.size)
    && arrayFilterMatch(record,'taste',f.taste)
    && arrayFilterMatch(record,'substrate',f.substrate)
    && arrayFilterMatch(record,'treeType',f.treeType)
    && arrayFilterMatch(record,'hostTree',f.hostTree)
    && arrayFilterMatch(record,'ring',f.ring)
    && arrayFilterMatch(record,'texture',f.texture)
    && arrayFilterMatch(record,'smell',f.smell)
    && arrayFilterMatch(record,'staining',f.staining)
    && arrayFilterMatch(record,'medicinalAction',f.medicinalAction)
    && arrayFilterMatch(record,'medicinalSystem',f.medicinalSystem)
    && arrayFilterMatch(record,'medicinalTerms',f.medicinalTerm);
}

function filteredForPage(page){
  if(page==='home') return state.allRecords.filter(edibleOrMedicinalHome).filter(r=>queryMatches(r,filterState.home));
  if(page==='identify'){
    const kind = filterState.identify.kind;
    let base = state.allRecords;
    if(kind==='plant') base = base.filter(isPlant);
    if(kind==='mushroom') base = base.filter(isMushroom);
    return base.filter(r=>queryMatches(r,filterState.identify));
  }
  if(page==='plants') return state.allRecords.filter(isPlant).filter(r=>queryMatches(r,filterState.plants));
  if(page==='mushrooms') return state.allRecords.filter(isMushroom).filter(r=>queryMatches(r,filterState.mushrooms));
  if(page==='medicinal') return medicinalRecords(state.allRecords).filter(r=>queryMatches(r,filterState.medicinal));
  return state.allRecords.filter(r=>queryMatches(r,filterState.home));
}

function renderCurrentRoute(){
  const route=parseRoute(location.hash||"#/home");
  const allowed=['home','identify','plants','mushrooms','medicinal','lookalikes','timeline','review'];
  const page=allowed.includes(route.page)?route.page:'home';
  if(route.focus && filterState[page]) filterState[page].month=CURRENT_MONTH;
  state.route=page; markActiveNav(page);
  renderPage(renderDashboard({page,allRecords:state.allRecords,currentRecords:filteredForPage(page),filters:filterState[page],selectedMonth:selectedTimelineMonth,selectedWeek:selectedTimelineWeek,paneMode:paneMode[page]}));
  bindDetailLinks();
  bindSharedActions({
    onFilterChange:e=>{ const p=state.route; filterState[p][e.currentTarget.dataset.filter]=e.currentTarget.value; if(e.currentTarget.dataset.filter==='treeType') filterState[p].hostTree=''; renderCurrentRoute(); },
    onClearFilters:()=>{ const p=state.route; filterState[p]=emptyFilter(); renderCurrentRoute(); }
  });
}

async function init(){
  wireModal();
  let payload; try{ payload=await loadSupabaseData(); }catch{ payload=await loadLocalData(); }
  state.allRecords=sortRecords((payload.records||[]).map(normalizeRecord));
  updateHeaderStats(state.allRecords);
  renderCurrentRoute(); window.addEventListener('hashchange',renderCurrentRoute);
}
init();