export async function loadLocalDataWithMasterV5(baseLoadLocalData){
  const base = await baseLoadLocalData();
  try{
    const [core, plants1, plants2, mushrooms] = await Promise.all([
      fetch('data/species-master-core-v2.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]})),
      fetch('data/species-master-plants-v1.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]})),
      fetch('data/species-master-plants-v2.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]})),
      fetch('data/species-master-mushrooms-v1.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({records:[]}))
    ]);
    const bySlug = new Map(base.records.map(r=>[r.slug,r]));
    [...(core.records||[]), ...(plants1.records||[]), ...(plants2.records||[]), ...(mushrooms.records||[])].forEach(r=>{
      bySlug.set(r.slug,{...(bySlug.get(r.slug)||{}),...r});
    });
    return {...base,records:[...bySlug.values()]};
  }catch{
    return base;
  }
}
