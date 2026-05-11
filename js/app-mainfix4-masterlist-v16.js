import { loadLocalData, loadSupabaseData, loadOverridePayload } from "./api-mainfix4.js";
import { loadLocalDataWithMasterV5 } from "./api-masterlist-v5.js";
import { applyAuditCorrections } from "./api-masterlist-v6.js";
import { sortRecords, normalizeRecord } from "./data-model-mainfix4.js";
import { state } from "./state.js";

async function init(){
  try{
    let payload;
    try{
      payload = await loadSupabaseData();
      payload = await loadLocalDataWithMasterV5(async()=>payload);
    }catch{
      payload = await loadLocalDataWithMasterV5(loadLocalData);
    }

    let records = (payload.records||[]).map(normalizeRecord);
    records = await applyAuditCorrections(records);

    state.allRecords = sortRecords(records);

    window.location.hash = "#/home";
  }catch(e){
    console.error(e);
  }
}

init();
