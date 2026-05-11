// season toggle build
import { loadLocalData, loadSupabaseData } from "./api.js?v=v2.0";
import { sortRecords, normalizeRecord, isMushroom, isPlant, medicinalRecords, reviewRecords, lookalikeRecords } from "./data-model.js?v=v2.0";
import { state } from "./state.js?v=v2.0";
import { parseRoute } from "./router.js?v=v2.0";
import { MONTHS } from "./constants.js?v=v2.0";
import { renderDashboard } from "./pages-seasontoggle.js?v=v2.1-seasontoggle";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal, openDetail } from "./ui.js?v=v2.0";

const focusDate = new Date();
focusDate.setDate(focusDate.getDate() + 14);
const CURRENT_MONTH = MONTHS[focusDate.getMonth()] || MONTHS[0];

const emptyFilter = () => ({ search:"", month:"" });
const filterState = { home:emptyFilter(), plants:emptyFilter(), mushrooms:emptyFilter(), medicinal:emptyFilter(), lookalikes:emptyFilter(), review:emptyFilter() };

function queryMatches(r,f){
  const m=!f.month || (r.months_available||[]).includes(f.month);
  return m;
}

function filteredForPage(page){
  if(page==='plants')return state.allRecords.filter(isPlant).filter(r=>queryMatches(r,filterState.plants));
  if(page==='mushrooms')return state.allRecords.filter(isMushroom).filter(r=>queryMatches(r,filterState.mushrooms));
  if(page==='medicinal')return medicinalRecords(state.allRecords).filter(r=>queryMatches(r,filterState.medicinal));
  return state.allRecords.filter(r=>queryMatches(r,filterState.home));
}

function renderCurrentRoute(){
  const route=parseRoute(location.hash||"#/home");
  const page=route.page;
  if(route.focus && filterState[page]){
    filterState[page].month=CURRENT_MONTH;
  }
  state.route=page;
  markActiveNav(page);
  renderPage(renderDashboard({page,allRecords:state.allRecords,currentRecords:filteredForPage(page),filters:filterState[page]}));
}

async function init(){
  wireModal();
  let payload;
  try{payload=await loadSupabaseData();}catch{payload=await loadLocalData();}
  state.allRecords=sortRecords((payload.records||[]).map(normalizeRecord));
  updateHeaderStats(state.allRecords);
  renderCurrentRoute();
  window.addEventListener("hashchange",renderCurrentRoute);
}
init();