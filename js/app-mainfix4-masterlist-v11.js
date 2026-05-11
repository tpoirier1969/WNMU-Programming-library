import { loadLocalData, loadSupabaseData } from "./api-mainfix4.js?v=v2.1-mainfix23";
import { loadLocalDataWithMasterV5 } from "./api-masterlist-v5.js";
import { sortRecords, normalizeRecord } from "./data-model-mainfix4.js?v=v2.1-mainfix21";
import { state } from "./state.js?v=v2.1-mainfix21";
import { renderDashboard } from "./pages-mainfix4.js?v=v2.1-mainfix22";
import { renderPage, bindDetailLinks, wireModal } from "./ui-mainfix-v2.js";

async function init(){
  wireModal();
  let payload;
  try{
    payload = await loadSupabaseData();
    payload = await loadLocalDataWithMasterV5(async()=>payload);
  }catch{
    payload = await loadLocalDataWithMasterV5(loadLocalData);
  }
  state.allRecords = sortRecords((payload.records||[]).map(normalizeRecord));
  renderPage(renderDashboard({page:'home',allRecords:state.allRecords,currentRecords:state.allRecords}));
  bindDetailLinks();
}
init();
