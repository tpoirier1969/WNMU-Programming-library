export async function loadLocalDataWithMaster(baseLoadLocalData){
  const base = await baseLoadLocalData();
  try{
    const res = await fetch('data/species-master-additions-v1.json',{cache:'no-store'});
    const master = await res.json();
    const bySlug = new Map(base.records.map(r=>[r.slug,r]));
    (master.records||[]).forEach(r=>{
      bySlug.set(r.slug,{...(bySlug.get(r.slug)||{}),...r});
    });
    return {...base,records:[...bySlug.values()]};
  }catch{
    return base;
  }
}
