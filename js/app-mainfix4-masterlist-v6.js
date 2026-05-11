import { loadLocalData, loadSupabaseData } from "./api-mainfix4.js?v=v2.1-mainfix23";
import { loadLocalDataWithMasterV4 } from "./api-masterlist-v4.js";
import { sortRecords, normalizeRecord } from "./data-model-mainfix4.js?v=v2.1-mainfix21";
import { state } from "./state.js?v=v2.1-mainfix21";
import { renderDashboard } from "./pages-mainfix4.js?v=v2.1-mainfix22";
import { renderPage } from "./ui-mainfix.js?v=v2.1-mainfix22";

async function init(){
  try{
    let payload;
    try{
      payload = await loadSupabaseData();
      payload = await loadLocalDataWithMasterV4(async()=>payload);
    }catch{
      payload = await loadLocalDataWithMasterV4(loadLocalData);
    }
    state.allRecords = sortRecords((payload.records||[]).map(normalizeRecord));
    renderPage(renderDashboard({page:'home',allRecords:state.allRecords,currentRecords:state.allRecords}));
  }catch(e){console.error(e);} }
init();
