import { loadLocalData, loadSupabaseData } from "./api.js?v=v2.0";
import { sortRecords, normalizeRecord, isMushroom, isPlant, medicinalRecords } from "./data-model.js?v=v2.0";
import { state } from "./state.js?v=v2.0";
import { parseRoute } from "./router.js?v=v2.0";
import { renderHome } from "./v2.3/pages/home.js";
import { renderIdentify } from "./v2.3/pages/identify.js";
import { updateHeaderStats, renderPage, markActiveNav, bindDetailLinks, bindSharedActions, wireModal } from "./ui.js?v=v2.0";

const emptyFilter = () => ({ search:"", month:"", category:"", habitat:"", part:"", size:"", taste:"", substrate:"", treeType:"", hostTree:"", ring:"", texture:"", smell:"", staining:"", medicinalAction:"", medicinalSystem:"", medicinalTerm:"", reviewReason:"", severity:"", kind:"" });

const filterState = { home:emptyFilter(), identify:emptyFilter() };

function edibleOrMedicinal(record){
  if(record.non_edible_severity) return false;
  if(isPlant(record)) return true;
  if(isMushroom(record)){
    const s=(record.mushroom_profile?.edibility_status||'').toLowerCase();
    if(/inedible|poison|toxic|deadly/.test(s)) return false;
    return /edible|choice/.test(s);
  }
  return false;
}

function match(r,f){
  const q=(f.search||'').toLowerCase();
  const m=!f.month || (r.months_available||[]).includes(f.month);
  return (!q|| (r.display_name+' '+r.common_name).toLowerCase().includes(q)) && m;
}

function getRecords(page){
  if(page==='home') return state.allRecords.filter(edibleOrMedicinal).filter(r=>match(r,filterState.home));
  if(page==='identify'){
    const kind=filterState.identify.kind;
    let base=state.allRecords;
    if(kind==='plant') base=base.filter(isPlant);
    if(kind==='mushroom') base=base.filter(isMushroom);
    return base.filter(r=>match(r,filterState.identify));
  }
  return [];
}

function render(){
  const route=parseRoute(location.hash||"#/home");
  const page=route.page||'home';
  state.route=page;
  markActiveNav(page);

  const records=getRecords(page);
  let html='';

  if(page==='identify') html=renderIdentify({filters:filterState.identify, records});
  else html=renderHome({filters:filterState.home, records});

  renderPage(html);

  bindSharedActions({
    onFilterChange:e=>{
      const f=filterState[state.route];
      f[e.currentTarget.dataset.filter]=e.currentTarget.value;
      render();
    },
    onClearFilters:()=>{
      filterState[state.route]=emptyFilter();
      render();
    }
  });
}

async function init(){
  wireModal();
  let payload;
  try{payload=await loadSupabaseData();}catch{payload=await loadLocalData();}
  state.allRecords=sortRecords((payload.records||[]).map(normalizeRecord));
  updateHeaderStats(state.allRecords);
  render();
  window.addEventListener('hashchange',render);
}

init();