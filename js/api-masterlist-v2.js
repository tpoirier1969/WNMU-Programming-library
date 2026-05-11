export async function loadLocalDataWithMasterV2(baseLoadLocalData){
  const base = await baseLoadLocalData();
  try{
    const [core, mushrooms] = await Promise.all([
      fetch('data/species-master-additions-v1.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]})),
      fetch('data/species-master-mushrooms-v1.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]}))
    ]);
    const bySlug = new Map(base.records.map(r=>[r.slug,r]));
    [...(core.records||[]),...(mushrooms.records||[])].forEach(r=>{
      bySlug.set(r.slug,{...(bySlug.get(r.slug)||{}),...r});
    });
    return {...base,records:[...bySlug.values()]};
  }catch{
    return base;
  }
}
