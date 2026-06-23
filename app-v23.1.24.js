(function(){
'use strict';
const VERSION='v23.1.24';
const DEFAULT_STATE='MI';

/*
  ICON POLICY LOCK — approved by Tod.
  Do not change layer icon assignments, symbol meanings, or marker shape/color mappings
  unless Tod explicitly requests a new icon revision.
  Canonical icon mapping for this build:
  - Modern campgrounds: RV
  - Rustic / Primitive: Tent
  - Private campgrounds: Red stop-sign shape with white tent
  - Boondocking / Dispersed: Tree
  - Boat / Backpack: Backpacker along water
  - Overnight Parking: P
  - Rest Areas & Roadside Stops: reversed R
  - Needs Verification: Draft/Pencil
  - Info / Reference: Info circle
*/

const STATE_BOUNDS={
  AL:[[30.14,-88.47],[35.01,-84.89]], AK:[[51.21,-179.15],[71.39,-129.98]], AZ:[[31.33,-114.82],[37.00,-109.05]], AR:[[33.00,-94.62],[36.50,-89.64]], CA:[[32.53,-124.48],[42.01,-114.13]],
  CO:[[36.99,-109.06],[41.00,-102.04]], CT:[[40.98,-73.73],[42.05,-71.79]], DE:[[38.45,-75.79],[39.84,-75.05]], FL:[[24.40,-87.63],[31.00,-80.03]], GA:[[30.36,-85.61],[35.00,-80.84]],
  HI:[[18.91,-160.25],[22.24,-154.80]], ID:[[42.00,-117.24],[49.00,-111.04]], IL:[[36.97,-91.51],[42.51,-87.50]], IN:[[37.77,-88.10],[41.76,-84.78]], IA:[[40.37,-96.64],[43.50,-90.14]],
  KS:[[36.99,-102.05],[40.00,-94.59]], KY:[[36.50,-89.57],[39.15,-81.96]], LA:[[28.92,-94.04],[33.02,-88.82]], ME:[[42.96,-71.08],[47.46,-66.95]], MD:[[37.89,-79.49],[39.72,-75.05]],
  MA:[[41.24,-73.51],[42.89,-69.93]], MI:[[41.69,-90.42],[48.31,-82.12]], MN:[[43.50,-97.24],[49.38,-89.49]], MS:[[30.17,-91.66],[35.01,-88.10]], MO:[[35.99,-95.77],[40.61,-89.10]],
  MT:[[44.36,-116.05],[49.00,-104.04]], NE:[[39.99,-104.05],[43.00,-95.31]], NV:[[35.00,-120.01],[42.00,-114.04]], NH:[[42.70,-72.56],[45.31,-70.61]], NJ:[[38.93,-75.56],[41.36,-73.89]],
  NM:[[31.33,-109.05],[37.00,-103.00]], NY:[[40.48,-79.76],[45.02,-71.85]], NC:[[33.84,-84.32],[36.59,-75.46]], ND:[[45.94,-104.05],[49.00,-96.55]], OH:[[38.40,-84.82],[41.98,-80.52]],
  OK:[[33.62,-103.00],[37.00,-94.43]], OR:[[42.00,-124.57],[46.30,-116.46]], PA:[[39.72,-80.52],[42.27,-74.69]], RI:[[41.15,-71.89],[42.02,-71.12]], SC:[[32.03,-83.35],[35.22,-78.54]],
  SD:[[42.48,-104.06],[45.95,-96.44]], TN:[[34.98,-90.31],[36.68,-81.65]], TX:[[25.84,-106.65],[36.50,-93.51]], UT:[[36.99,-114.05],[42.00,-109.04]], VT:[[42.73,-73.44],[45.02,-71.50]],
  VA:[[36.54,-83.68],[39.47,-75.24]], WA:[[45.54,-124.85],[49.00,-116.91]], WV:[[37.20,-82.64],[40.64,-77.72]], WI:[[42.49,-92.89],[47.31,-86.25]], WY:[[40.99,-111.06],[45.01,-104.05]]
};
const STORE={states:'campingMap.enabledStates.v22328',layers:'campingMap.layers.v22328',basemap:'campingMap.basemap.v22328',queue:'campingMap.draftQueue.v22328',filters:'campingMap.filters.v22328',pending:'campingMap.showPending.v22328',desktopMode:'campingMap.desktopMode.v23087'};
const SAVED_ROUTES_TABLE='boondocking_saved_routes';
const ICONS={tent:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M3 18.5 10.8 5h2.4L21 18.5h-3.1l-5.1-9.1-2.9 4.9 1.9 4.2H9.2l-1.5-3.2-1.7 3.2H3Zm6.8 0h4.5l-2.2-5-2.3 5Z\"/></svg>',tree:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"m12 2 4 5h-2.1l3.6 4.5H15l3 3.8h-4.2V22h-3.6v-6.7H6l3-3.8H6.5L10.1 7H8L12 2Z\"/></svg>',camper:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M4 8.5h10.6c.8 0 1.6.4 2.1 1l2.3 2.6H21a1 1 0 0 1 1 1v4.9h-1.7a2.6 2.6 0 0 1-5.1 0H9.8a2.6 2.6 0 0 1-5.1 0H3v-8.5a1 1 0 0 1 1-1Zm1.2 1.8v2.8H14v-2.8H5.2Zm11 3.1h3.2l-1.6-1.8a1.1 1.1 0 0 0-.8-.4h-.8v2.2ZM7.2 19a1.2 1.2 0 1 0 0-2.5 1.2 1.2 0 0 0 0 2.4Zm10.6 0a1.2 1.2 0 1 0 0-2.5 1.2 1.2 0 0 0 0 2.4Z\"/></svg>',stopTent:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M9 2.5h6l6.5 6.5v6L15 21.5H9L2.5 15V9L9 2.5Zm2 5.2-4 8h2.4l1-2h3.2l1 2H17l-4-8h-2Zm.9 4.2h.2l1 2h-2.2l1-2Z\"/></svg>',parking:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M6 3h7.4c3 0 5.1 2.1 5.1 5s-2.1 5.1-5.1 5.1H9.6V21H6V3Zm3.6 3.2v3.7h3.4c1.1 0 1.9-.7 1.9-1.9s-.8-1.8-1.9-1.8H9.6Z\"/></svg>',restR:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M6 3h7.2c3 0 5.1 1.9 5.1 4.8 0 2-1 3.5-2.8 4.3l3.3 5h-4.1L12 12.8H9.6V21H6V3Zm3.6 3v3.8h3c1.3 0 2.1-.7 2.1-1.9 0-1.2-.8-1.9-2.1-1.9h-3Z\"/></svg>',backpackerWater:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M10.2 3.3a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Zm1.7 4.2 2 1.1c.6.3 1 .9 1 1.5V12h-1.8v-1.3l-1.1-.6-.8 2.5 1.9 1.9v3.6h-1.8V15.3l-1.8-1.8-.8 2.4-1.6-.5 1.2-3.8.8-2.4c.3-1 1.2-1.7 2.3-1.7h.5Zm-4.7 3.7 1.5.7-1.4 2.9 1.6 1.6-1.3 1.2-2.4-2.4 2-4Zm9.4 3.3c1.1 0 2 .3 2.9.8l-.8 1.4c-.7-.3-1.3-.5-2.1-.5-1.2 0-1.8.5-2.6 1.1-.8.6-1.7 1.3-3.2 1.3-1.4 0-2.4-.6-3.2-1.3-.7-.5-1.4-1.1-2.6-1.1-.7 0-1.4.2-2 .5L2 16c.9-.5 1.8-.8 2.9-.8 1.7 0 2.7.7 3.5 1.4.7.5 1.2 1 2.3 1 .9 0 1.5-.4 2.2-1 .9-.8 2-1.6 3.7-1.6Zm.9 4c.7 0 1.4.2 2.1.5l-.8 1.4c-.4-.2-.8-.3-1.3-.3-.8 0-1.2.3-1.9.8-.7.5-1.6 1.1-3 1.1-1.3 0-2.2-.6-2.9-1-.6-.4-1-.7-1.8-.7-.5 0-.9.1-1.3.3l-.8-1.4c.7-.3 1.3-.5 2.1-.5 1.3 0 2.2.6 2.9 1 .6.4 1 .7 1.8.7.9 0 1.4-.3 2-.8.8-.5 1.7-1.1 2.9-1.1Z\"/></svg>',info:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 2.8A9.2 9.2 0 1 1 2.8 12 9.2 9.2 0 0 1 12 2.8Zm0 4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm-1.7 5v1.8h1.1v3.6h-1.1V19h4.5v-1.8h-1.1v-5.4h-3.4Z\"/></svg>',draft:'<svg viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M4 17.5V20h2.5l8.6-8.6-2.5-2.5L4 17.5Zm12.4-9.9 1.5-1.5a1.2 1.2 0 0 1 1.7 0l.8.8a1.2 1.2 0 0 1 0 1.7l-1.5 1.5-2.5-2.5Z\"/></svg>',navArrow:'<svg viewBox=\"0 0 28 28\"><circle cx=\"14\" cy=\"14\" r=\"11.5\" fill=\"#ffffff\"/><path fill=\"#1e78ff\" d=\"M14 3.8 20.8 21l-6.8-3.2L7.2 21 14 3.8Z\"/><circle cx=\"14\" cy=\"14\" r=\"11.5\" fill=\"none\" stroke=\"rgba(18,69,140,.22)\" stroke-width=\"1\"/></svg>',dot:'<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"6\" fill=\"currentColor\"/></svg>'};
const LAYERS=[
 {key:'modern',label:'Modern campgrounds',css:'pin-modern',icon:ICONS.camper},
 {key:'rustic',label:'Rustic campgrounds',css:'pin-rustic',icon:ICONS.tent},
 {key:'private',label:'Private campgrounds',css:'pin-private',icon:ICONS.stopTent},
 {key:'boondocking',label:'Boondocking / dispersed',css:'pin-boondocking',icon:ICONS.tree},
 {key:'boat-backpack',label:'Boat / Backpack',css:'pin-boat-backpack',icon:ICONS.backpackerWater},
 {key:'overnight-parking',label:'Overnight parking',css:'pin-parking',icon:ICONS.parking},
 {key:'rest-truck',label:'Rest Areas & Roadside Stops',css:'pin-rest',icon:ICONS.restR},
 {key:'info',label:'Info / reference',css:'pin-info',icon:ICONS.info},
 {key:'pending',label:'Needs Verification',css:'pin-draft',icon:ICONS.draft}
];
const MAP_LAYER_KEYS=new Set(['modern','rustic','private','boondocking','boat-backpack','overnight-parking','rest-truck','pending']);
const LAYER_CONTROL_KEYS=new Set(['modern','rustic','private','boondocking','boat-backpack','overnight-parking','pending']);
const MAP_LAYERS=LAYERS.filter(l=>LAYER_CONTROL_KEYS.has(l.key));
const SMALL_EMPHASIS_LAYERS=new Set(['overnight-parking','rest-truck']);
function markerSizeForLayer(key){if(key==='boat-backpack')return 26;return SMALL_EMPHASIS_LAYERS.has(key)?22:24;}
const $=id=>document.getElementById(id); const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
window.CAMPING_STATE_DATA = window.CAMPING_STATE_DATA || {};
window.CAMPING_PENDING_SITES = window.CAMPING_PENDING_SITES || window.CAMPING_PENDING || [];
const app={map:null,markerLayer:null,userMarker:null,userAccuracyCircle:null,liveLocationWatchId:null,liveLocationStarted:false,liveLocationLoading:false,liveLocationLastLoadCenter:null,draftMarker:null,baseLayers:{},sites:[],shownSites:[],stateData:{},enabledStates:new Set(),enabledLayers:new Set(),filters:{},draftPoint:null,draftQueue:[],supabase:null,session:null,restRoadsideStats:null,localAreaCenter:null,nearMeActive:false,loadSeq:0,restOnlyMode:false,routeSearch:{active:false,coords:[],basePoints:[],shapePoints:[],bufferMiles:25,layer:null,previousStates:null,distanceMiles:null,durationMinutes:null},areaOutline:{layer:null,cache:{},registry:{},standalone:[],active:{},layers:{},labelMarkers:[]},savedRoutes:[],savedRoutesLoaded:false,savedRoutesError:null,miDynamicLoaded:{mdot:false,localTraveler:false,privateRv:false,overnight:false}};
window.__campingApp=app;
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function readJson(key,fb){try{return JSON.parse(localStorage.getItem(key)||'null')??fb}catch{return fb}}
function saveJson(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(_e){}}
function manifestEntries(){const m=window.CAMPING_STATES_MANIFEST||{};return (Array.isArray(m.states)?m.states:Object.values(m)).filter(Boolean).sort((a,b)=>String(a.name||a.code).localeCompare(String(b.name||b.code)));}
function layerKey(site){
  let layer=String(site.layer||site.proposedLayer||'').toLowerCase();
  let subtype=String(site.subtype||site.proposedSubtype||'').toLowerCase();
  let form=String(site.siteForm||site.proposedSiteForm||'').toLowerCase();
  let raw=(layer+' '+subtype+' '+form+' '+(site.layerLabel||'')+' '+(site.categoryLabel||'')+' '+(site.rawCategory||'')).toLowerCase();
  if(site.pending||site.verificationStatus==='pending')return 'pending';
  // v23.0.20: explicit layer assignments win before keyword guessing.
  // This prevents casino-owned RV parks/campgrounds from being misclassified as Overnight Parking.
  if(layer==='overnight-parking')return 'overnight-parking';
  if(layer==='rest-truck'||layer==='rest-roadside'||layer==='roadside-stop')return 'rest-truck';
  if(layer==='private')return 'private';
  if(layer==='boondocking')return 'boondocking';
  if(['boat-backpack','boat','boat-in','backpack','hike-in','walk-in','water-access','canoe','kayak'].includes(layer))return 'boat-backpack';
  if(layer==='info')return 'info';
  if(['state','federal','local'].includes(layer)&&subtype==='rustic')return 'rustic';
  if(['state','federal','local'].includes(layer)&&subtype==='modern')return 'modern';
  if(subtype==='rustic')return 'rustic';
  if(subtype==='modern')return 'modern';
  if(/rest|roadside|wayside|truck/.test(raw))return 'rest-truck';
  if(/overnight|parking|walmart|cracker|cabela|bass pro|municipal lot/.test(raw))return 'overnight-parking';
  // v23.0.40: boat/backpack access gets its own layer. Primitive alone is not enough; it can remain Rustic or Boondocking depending on the site.
  if(/boat[- ]?in|boat access|water[- ]access|canoe|kayak|backpack|hike[- ]?in|walk[- ]?in/.test(raw))return 'boat-backpack';
  if(/dispersed|boondock/.test(raw))return 'boondocking';
  if(/reference/.test(raw))return 'info';
  return 'info';
}
function layerDef(key){return LAYERS.find(l=>l.key===key)||LAYERS[6];}function markerTypeNotice(site){const key=layerKey(site);const markerType=String(site.markerType||site.marker_type||'').toLowerCase().replace(/-/g,'_');const verification=(String(site.verificationStatus||'')+' '+String(site.validationStatus||'')+' '+String(site.status||'')+' '+String(site.layerLabel||'')+' '+String(site.categoryLabel||'')+' '+String(site.subtype||'')+' '+String(site.name||'')).toLowerCase();if(key==='pending'||site.pending||verification.includes('needs verification')||verification.includes('needs-verification'))return 'Needs Verification — not an import-ready legal camping marker.';if(markerType==='rule_area'||markerType==='rulearea')return 'Rule/permit information marker — not a campsite pin.';if(markerType==='system')return 'Camping system marker — not an individual campsite pin.';return '';}
function notify(msg,ms=3000){const el=$('statusBar');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(notify.t);notify.t=setTimeout(()=>el.hidden=true,ms)}
function setLoading(on,msg){const el=$('mapLoading');if(!el)return;if(msg)el.textContent=msg;el.classList.toggle('hidden',!on);}
function setLocationStatus(msg){
  const ids=['locationStatus','locationStatusMobile'];
  ids.forEach(id=>{const el=$(id);if(el)el.textContent=msg||'';});
}
function requestLocationFromButton(nearMeMode=false){
  setLocationStatus(nearMeMode?'Getting your location for Near Me…':'Getting your live location…');
  startLiveLocation(!!nearMeMode);
}
function migrateLayerKeys(rawLayers){
  const valid=new Set(MAP_LAYERS.map(l=>l.key));
  const migrated=new Set();
  (Array.isArray(rawLayers)?rawLayers:[]).forEach(key=>{
    key=String(key||'').toLowerCase();
    if(valid.has(key)){migrated.add(key);return;}
    if(['federal-modern','state-modern','local-modern'].includes(key))migrated.add('modern');
    else if(['federal-rustic','state-rustic','local-rustic'].includes(key))migrated.add('rustic');
    else if(['private-modern','private-rustic'].includes(key))migrated.add('private');
    else if(key==='boondocking')migrated.add('boondocking');
    else if(['boat','boat-in','backpack','hike-in','walk-in','water-access','canoe','kayak'].includes(key))migrated.add('boat-backpack');
    else if(key==='pending')migrated.add('pending');
  });
  if(migrated.size===0){
    LAYERS.filter(x=>x.key!=='pending'&&x.key!=='rest-truck'&&x.key!=='overnight-parking').forEach(x=>migrated.add(x.key));
  }
  return [...migrated];
}
function blankFilters(){return {maxCost:'',water:'',access:{twowd:false,hc:false,fw:false},chips:{showers:false}};}
function resetFiltersOnLoad(){app.filters=blankFilters();saveJson(STORE.filters,app.filters);}
function initState(){document.title='Boondocking & Camping Maps '+VERSION; const vt=$('versionTag'); if(vt)vt.textContent=VERSION; app.draftQueue=readJson(STORE.queue,[]); $('draftQueue').value=app.draftQueue.join('\n'); const storedStates=readJson(STORE.states,null); const states=Array.isArray(storedStates)?storedStates:[DEFAULT_STATE]; app.enabledStates=new Set(states); let layers=migrateLayerKeys(readJson(STORE.layers,MAP_LAYERS.filter(x=>x.key!=='pending').map(x=>x.key))); layers=layers.filter(key=>key!=='rest-truck'); app.enabledLayers=new Set(layers); saveJson(STORE.layers,layers); if(localStorage.getItem(STORE.pending)==='1')app.enabledLayers.add('pending'); resetFiltersOnLoad();}
function initMap(){app.map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([44.9,-89.7],6); app.areaOutline.layer=L.layerGroup().addTo(app.map); app.markerLayer=L.layerGroup().addTo(app.map); app.routeSearch.layer=L.layerGroup().addTo(app.map); app.baseLayers={osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}),opentopo:L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap'}),topo:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}),satellite:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'})}; const key=localStorage.getItem(STORE.basemap)||'topo'; (app.baseLayers[key]||app.baseLayers.topo).addTo(app.map); $('basemapSelect').value=key; app.map.on('zoomend moveend',updateAreaOutlineLabelVisibility);}
function buildControls(){buildStateSelect(); buildLayerList(); buildLegend(); syncFilters(); bindEvents(); updatePendingMeta(); syncRouteControls(); registerStandaloneAreaOutlines(); updateAreaOutlinePanel();}
function buildStateSelect(){buildStateChecklist(); syncStateControls();}
function mappedStateEntries(){return manifestEntries().filter(s=>Number(s.count||0)>0 || s.file || (Array.isArray(s.files)&&s.files.length))}
function buildStateChecklist(){const box=$('stateChecklist'); if(!box)return; const rows=mappedStateEntries(); box.innerHTML=rows.map(s=>`<label class="state-check"><input type="checkbox" data-state-code="${esc(s.code)}"><span>${esc(s.name||s.code)}</span><em class="state-count-pill">${Number(s.count||0)}</em></label>`).join('');}
function selectedStateSummary(){const n=app.enabledStates.size; const mapped=mappedStateEntries().length; if(app.nearMeActive){const codes=nearMeVisibleStateCodes(); if(!app.localAreaCenter)return 'Near Me: locating…'; if(codes.length===0)return `Near Me: ${NEAR_ME_RADIUS_MILES} mi`; if(codes.length===1)return `Near Me: ${stateLabel(codes[0])}`; return `Near Me: ${codes.length} states in range`;} if(n===0)return 'No states selected'; if(n===1)return `${stateLabel([...app.enabledStates][0])} selected`; if(n===mapped)return `All ${mapped} mapped states`; return `${n} states selected`;}
function syncStateControls(){const activeUiStates=app.nearMeActive?new Set(nearMeVisibleStateCodes()):app.enabledStates; $$('[data-state-code]').forEach(cb=>{cb.checked=activeUiStates.has(cb.dataset.stateCode)}); const summary=$('stateSelectionSummary'); if(summary)summary.textContent=selectedStateSummary(); const note=$('stateSelectionNote'); if(note){const n=app.enabledStates.size; if(app.nearMeActive){const codes=nearMeVisibleStateCodes(); const names=codes.map(stateLabel).join(', '); note.textContent=app.localAreaCenter?(codes.length?`Near Me is active: showing sites within ${NEAR_ME_RADIUS_MILES} miles. Visible result states: ${names}.`:`Near Me is active: showing sites within ${NEAR_ME_RADIUS_MILES} miles. No visible results are currently inside the radius.`):'Near Me is getting your location…';}else{note.textContent=n===0?'No states selected. Choose one or more states to load map data.':(n===1?`${stateLabel([...app.enabledStates][0])} selected.`:`${n} states selected. The map will zoom to the combined selected area.`);}}}
function stateLabel(code){const row=manifestEntries().find(s=>s.code===code); return row?(row.name||row.code):code}
function clearNearMeMode(){app.nearMeActive=false;app.liveLocationLoading=false;app.liveLocationLastLoadCenter=null;}
function setEnabledStates(codes,fit=true){clearNearMeMode();const valid=new Set(mappedStateEntries().map(s=>s.code)); const picked=(codes||[]).filter(c=>valid.has(c)); app.enabledStates=new Set(picked); saveJson(STORE.states,[...app.enabledStates]); syncStateControls(); renderAreaOutlineList(); loadEnabledStates(fit)}
function buildLayerList(){const box=$('layerList'); box.innerHTML=MAP_LAYERS.map(l=>`<label class="check layer-row"><input type="checkbox" data-layer="${l.key}" ${app.enabledLayers.has(l.key)?'checked':''}><span class="layer-icon ${l.css}">${l.icon}</span><span class="layer-title">${esc(l.label)}</span></label>`).join('');}
function legendCollapsedStored(){try{return localStorage.getItem('campingMap.legendCollapsed.v1')==='1'}catch(e){return false}}
function setLegendCollapsed(collapsed){const panel=$('mapLegendDesktop');if(!panel)return;panel.classList.toggle('collapsed',!!collapsed);const btn=$('legendToggleDesktop');if(btn){btn.setAttribute('aria-expanded',String(!collapsed));btn.setAttribute('aria-label',collapsed?'Expand map legend':'Shrink map legend')}try{localStorage.setItem('campingMap.legendCollapsed.v1',collapsed?'1':'0')}catch(e){}}
function toggleLegendCollapsed(){const panel=$('mapLegendDesktop');setLegendCollapsed(!(panel&&panel.classList.contains('collapsed')))}
function buildLegend(){const mobileItems=MAP_LAYERS.map(l=>`<div class="legend-item"><span class="layer-icon ${l.css}">${l.icon}</span><span>${esc(l.label)}</span></div>`).join('');const desktopItems=MAP_LAYERS.map(l=>`<label class="legend-item legend-layer-toggle"><input type="checkbox" data-layer="${l.key}" ${app.enabledLayers.has(l.key)?'checked':''}><span class="layer-icon ${l.css}">${l.icon}</span><span>${esc(l.label)}</span></label>`).join('');const desktopHtml=`<div class="legend-head"><h3>Map layers</h3><button id="legendToggleDesktop" class="legend-toggle" type="button" aria-expanded="true" aria-label="Shrink map legend"><span class="when-expanded">Shrink</span><span class="when-collapsed">Expand</span></button></div><div class="legend-grid legend-layer-grid">${desktopItems}</div>`;const mobileHtml=`<div class="legend-grid">${mobileItems}</div>`; if($('mapLegendDesktop')){$('mapLegendDesktop').innerHTML=desktopHtml;$('legendToggleDesktop').onclick=toggleLegendCollapsed;setLegendCollapsed(legendCollapsedStored())} if($('mapLegendMobile'))$('mapLegendMobile').innerHTML=mobileHtml;}
function syncLayerControls(){const boxes=$$('input[data-layer]');boxes.forEach(cb=>{cb.checked=app.enabledLayers.has(cb.dataset.layer)});const pending=$('showPendingLayer');if(pending)pending.checked=app.enabledLayers.has('pending')}
function applyLayerCheckboxChange(e){if(!e.target.dataset.layer)return;app.restOnlyMode=false;syncRestOnlyToggle();e.target.checked?app.enabledLayers.add(e.target.dataset.layer):app.enabledLayers.delete(e.target.dataset.layer);saveLayers();localStorage.setItem(STORE.pending,app.enabledLayers.has('pending')?'1':'0');updatePendingMeta();syncLayerControls();loadEnabledStates(false)}

function selectedStateCodes(){return [...app.enabledStates].filter(Boolean);}
function sortStateCodes(codes){const order=new Map(manifestEntries().map((s,i)=>[s.code,i]));return [...new Set(codes.filter(Boolean).map(c=>String(c).toUpperCase()))].sort((a,b)=>(order.get(a)??9999)-(order.get(b)??9999)||a.localeCompare(b));}
function stateCodeForVisibleSite(site){
  const explicit=String(site.stateCode||site.state||'').toUpperCase();
  if(explicit)return explicit;
  const lat=Number(site.lat),lng=Number(site.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return '';
  const hit=Object.entries(STATE_BOUNDS).find(([,b])=>pointInBounds(lat,lng,b));
  return hit?hit[0]:'';
}
function nearMeVisibleStateCodes(){
  if(!app.nearMeActive)return selectedStateCodes();
  const visible=app.shownSites.map(stateCodeForVisibleSite).filter(Boolean);
  return sortStateCodes(visible);
}
function markerBoundsFromShownSites(){
  const bounds=L.latLngBounds([]);
  app.shownSites.forEach(site=>{
    const lat=Number(site.lat),lng=Number(site.lng);
    if(Number.isFinite(lat)&&Number.isFinite(lng)) bounds.extend([lat,lng]);
  });
  return bounds;
}
function boundsForSelectedStates(){
  const bounds=L.latLngBounds([]);
  selectedStateCodes().forEach(code=>{
    const b=STATE_BOUNDS[String(code).toUpperCase()];
    if(b) bounds.extend(b);
  });
  return bounds;
}
function fitSelectedStateView(){
  if(!app.map) return;
  const codes=selectedStateCodes();
  const stateBounds=boundsForSelectedStates();
  const shownBounds=markerBoundsFromShownSites();
  const useStateBounds=stateBounds.isValid();
  const bounds=useStateBounds?stateBounds:shownBounds;
  if(!bounds.isValid()) return;
  const pad=window.matchMedia&&window.matchMedia('(max-width:700px)').matches?[22,22]:[42,42];
  const maxZoom=codes.length<=1?8:6;
  app.map.fitBounds(bounds,{padding:pad,maxZoom,animate:false});
}
function fitCurrentPreferredView(){
  if(app.routeSearch&&app.routeSearch.active&&app.routeSearch.coords&&app.routeSearch.coords.length){
    fitRouteView();
    return;
  }
  if(app.nearMeActive&&app.localAreaCenter){
    fitNearMeRadius(app.localAreaCenter);
    return;
  }
  fitSelectedStateView();
}


function bindSidebarTabs(){
  $$('[data-sidebar-tab]').forEach(btn=>{
    btn.onclick=()=>showSidebarTab(btn.dataset.sidebarTab);
  });
}
function showSidebarTab(tab){
  const main=$('mainTabPanel'), ref=$('referenceTabPanel');
  const mainBtn=$('mainTabButton'), refBtn=$('referenceTabButton');
  const isRef=tab==='reference';
  if(main)main.hidden=isRef;
  if(ref)ref.hidden=!isRef;
  if(mainBtn)mainBtn.classList.toggle('active',!isRef);
  if(refBtn)refBtn.classList.toggle('active',isRef);
  if(isRef)renderReferences();
}
function referenceItemHtml(site){
  const url=site.website||site.costSourceUrl||'';
  const desc=site.description||site.reviewSummary||site.notes||site.access||'';
  const name=site.name||site.title||'Reference item';
  return `<div class="reference-item"><strong>${esc(name)}</strong>${desc?`<p>${esc(desc)}</p>`:''}${url?`<a href="${esc(url)}" target="_blank" rel="noopener">Open reference</a>`:''}</div>`;
}
function renderReferences(){
  const target=$('referenceContent');
  if(!target)return;
  const refs=(app.sites||[]).filter(s=>layerKey(s)==='info');
  const national=refs.filter(s=>{const c=String(s.stateCode||s.state||'').toUpperCase(); return !c||['US','USA','NATIONAL','ALL'].includes(c);});
  const byState=new Map();
  refs.filter(s=>!national.includes(s)).forEach(s=>{const label=s.stateName||stateLabel(s.stateCode)||s.stateCode||'Other'; if(!byState.has(label))byState.set(label,[]); byState.get(label).push(s);});
  const sections=[];
  sections.push(`<div class="reference-section"><h3>Traveler stop inclusion rule</h3><div class="reference-note"><strong>Include:</strong> rest areas, welcome centers, roadside parks, scenic turnouts, waysides, beach/river access with useful parking, public boat launches with safe pause value, waterfront pocket parks, and trailhead/day-use parking that works for a traveler break.<br><br><strong>Exclude:</strong> playground-only parks, sports fields, school fields, campgrounds already listed elsewhere, ordinary neighborhood parks with no traveler-stop value, and special-use facilities where a stranger stopping briefly would feel out of place.<br><br><strong>Overnight note:</strong> this layer tracks traveler usefulness and overnight-parking status separately. It does not imply camping is allowed.</div></div>`);
  sections.push(`<div class="reference-section"><h3>National information</h3>${national.length?`<div class="reference-list">${national.map(referenceItemHtml).join('')}</div>`:'<div class="reference-note">No national reference items are loaded for the current selection.</div>'}</div>`);
  [...byState.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([state,items])=>{sections.push(`<div class="reference-section"><h3>${esc(state)}</h3><div class="reference-list">${items.map(referenceItemHtml).join('')}</div></div>`)});
  if(refs.length===0)sections.push('<div class="reference-section"><h3>State-by-state information</h3><div class="reference-note">No information/reference records are loaded for the selected states.</div></div>');
  target.innerHTML=sections.join('');
}


function parseLatLngText(text){
  const m=String(text||'').trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(!m)return null;
  const lat=Number(m[1]),lng=Number(m[2]);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
  return {lat,lng,label:`${lat.toFixed(5)}, ${lng.toFixed(5)}`};
}
async function fetchJsonWithTimeout(url,timeoutMs=20000){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const res=await fetch(url,{signal:ctrl.signal,headers:{'Accept':'application/json'}});
    if(!res.ok)throw new Error(`Request failed (${res.status})`);
    return await res.json();
  }finally{clearTimeout(timer)}
}
async function geocodeRoutePlace(text){
  const raw=String(text||'').trim();
  if(!raw)throw new Error('Add a start, stop, and destination before mapping a route.');
  const parsed=parseLatLngText(raw);
  if(parsed)return parsed;
  const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q='+encodeURIComponent(raw);
  const data=await fetchJsonWithTimeout(url,20000);
  const hit=Array.isArray(data)?data[0]:null;
  if(!hit)throw new Error(`Could not find “${raw}”. Try adding the state, or use coordinates.`);
  const lat=Number(hit.lat),lng=Number(hit.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error(`No usable coordinates found for “${raw}”.`);
  return {lat,lng,label:hit.display_name||raw};
}
function routeStopInputs(){return $$('[data-route-stop]').map(i=>i.value.trim()).filter(Boolean);}
function routePlaceInputs(){return [$('routeStart')?.value.trim()||'',...routeStopInputs(),$('routeEnd')?.value.trim()||''].filter(Boolean);}
function addRouteStopInput(value=''){
  const box=$('routeStops');
  if(!box)return;
  const row=document.createElement('div');
  row.className='route-stop-row';
  row.innerHTML=`<input type="text" data-route-stop placeholder="Optional stop / waypoint" value="${esc(value)}"><button class="secondary" type="button" aria-label="Remove stop">Remove</button>`;
  row.querySelector('button').onclick=()=>row.remove();
  box.appendChild(row);
}
function normalizeRouteMiles(value){
  const n=Math.round(Number(value));
  if(!Number.isFinite(n))return 25;
  return Math.max(1,Math.min(150,n));
}
function setRouteMilesUI(value,applyFilter){
  const n=normalizeRouteMiles(value);
  app.routeSearch.bufferMiles=n;
  const slider=$('routeMiles');
  const number=$('routeMilesNumber');
  const label=$('routeMilesValue');
  if(slider&&String(slider.value)!==String(n))slider.value=String(n);
  if(number&&String(number.value)!==String(n))number.value=String(n);
  if(label)label.textContent=String(n);
  if(app.routeSearch.active&&applyFilter){renderMarkers(false);updateRouteStatus();}
  else updateRouteStatus();
}
function getSavedRoutes(){
  return Array.isArray(app.savedRoutes)?app.savedRoutes.filter(r=>r&&r.id&&r.name):[];
}
function savedRouteStatusText(){
  if(!app.supabase)return 'Cloud saved routes need Supabase config.';
  if(!app.session)return 'Sign in to load cloud saved routes.';
  if(app.savedRoutesError)return app.savedRoutesError;
  if(!app.savedRoutesLoaded)return 'Cloud saved routes not loaded yet.';
  const n=getSavedRoutes().length;
  return n?`${n} cloud saved route${n===1?'':'s'} loaded.`:'No cloud saved routes yet.';
}
function setSavedRouteStatus(text){
  const el=$('routeSavedStatus');
  if(el)el.textContent=text||savedRouteStatusText();
}
function routeFromCloudRow(row){
  const payload=(row&&row.payload&&typeof row.payload==='object')?row.payload:{};
  return Object.assign({},payload,{
    id:String(row.id||payload.id||''),
    name:String(row.name||payload.name||'Saved route'),
    savedAt:row.updated_at||row.created_at||payload.savedAt||''
  });
}
function renderSavedRoutes(){
  const sel=$('routeSavedSelect');
  if(!sel)return;
  const current=sel.value;
  const routes=getSavedRoutes().sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||'')));
  const first=app.session?'Cloud saved routes':'Sign in for cloud saved routes';
  sel.innerHTML=`<option value="">${esc(first)}</option>`+routes.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
  if(current&&routes.some(r=>r.id===current))sel.value=current;
  setSavedRouteStatus();
}
async function refreshSavedRoutes(showNotice=false){
  if(!app.supabase){app.savedRoutes=[];app.savedRoutesLoaded=false;app.savedRoutesError='Cloud saved routes need Supabase config.';renderSavedRoutes();return [];}
  if(!app.session){app.savedRoutes=[];app.savedRoutesLoaded=false;app.savedRoutesError=null;renderSavedRoutes();return [];}
  const sel=$('routeSavedSelect');
  if(sel)sel.disabled=true;
  setSavedRouteStatus('Loading cloud saved routes…');
  try{
    const {data,error}=await app.supabase
      .from(SAVED_ROUTES_TABLE)
      .select('id,name,payload,created_at,updated_at')
      .order('updated_at',{ascending:false})
      .limit(100);
    if(error)throw error;
    app.savedRoutes=(Array.isArray(data)?data:[]).map(routeFromCloudRow).filter(r=>r.id&&r.name);
    app.savedRoutesLoaded=true;
    app.savedRoutesError=null;
    renderSavedRoutes();
    if(showNotice)notify('Cloud saved routes refreshed.');
    return app.savedRoutes;
  }catch(err){
    console.error(err);
    app.savedRoutes=[];
    app.savedRoutesLoaded=false;
    app.savedRoutesError='Cloud saved routes unavailable. Run the saved-routes SQL setup if this is the first install.';
    renderSavedRoutes();
    if(showNotice)notify(app.savedRoutesError,6000);
    return [];
  }finally{
    if(sel)sel.disabled=false;
  }
}
function routeInputSnapshot(){
  return {start:$('routeStart')?.value.trim()||'',end:$('routeEnd')?.value.trim()||'',stops:routeStopInputs()};
}
function applyRouteInputSnapshot(route){
  if($('routeStart'))$('routeStart').value=route.start||'';
  if($('routeEnd'))$('routeEnd').value=route.end||'';
  const stopBox=$('routeStops');
  if(stopBox)stopBox.innerHTML='';
  (Array.isArray(route.stops)?route.stops:[]).forEach(v=>addRouteStopInput(v));
  setRouteMilesUI(route.bufferMiles||25,false);
}
function makeRouteSaveName(){
  const typed=$('routeSaveName')?.value.trim();
  if(typed)return typed.slice(0,90);
  const snap=routeInputSnapshot();
  const auto=[snap.start,...snap.stops,snap.end].filter(Boolean).join(' → ');
  return (auto||'Saved route').slice(0,90);
}
function currentRoutePayload(){
  const snap=routeInputSnapshot();
  return {
    start:snap.start,
    end:snap.end,
    stops:snap.stops,
    bufferMiles:normalizeRouteMiles(app.routeSearch.bufferMiles||25),
    basePoints:(app.routeSearch.basePoints||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng),label:p.label||''})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)),
    shapePoints:(app.routeSearch.shapePoints||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng),seq:clampRouteSeq(p.seq)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)),
    savedByVersion:VERSION
  };
}
async function saveCurrentRoute(){
  if(!(app.routeSearch&&app.routeSearch.active)||(app.routeSearch.basePoints||[]).length<2){notify('Map a route before saving it.');return;}
  if(!app.supabase)return notify('Cloud saved routes need Supabase config. Local-only route saving has been disabled.',6000);
  if(!app.session)return notify('Create an account or sign in before saving routes across devices.',6000);
  const name=makeRouteSaveName();
  const payload=currentRoutePayload();
  const routes=getSavedRoutes();
  const existing=routes.find(r=>String(r.name||'').toLowerCase()===name.toLowerCase());
  const btn=$('routeSaveBtn');
  if(btn)btn.disabled=true;
  setSavedRouteStatus(existing?'Updating cloud saved route…':'Saving route to cloud…');
  try{
    let result;
    if(existing&&existing.id){
      result=await app.supabase
        .from(SAVED_ROUTES_TABLE)
        .update({name,payload,updated_at:new Date().toISOString()})
        .eq('id',existing.id)
        .select('id,name,payload,created_at,updated_at')
        .single();
    }else{
      result=await app.supabase
        .from(SAVED_ROUTES_TABLE)
        .insert({name,payload})
        .select('id,name,payload,created_at,updated_at')
        .single();
    }
    if(result.error)throw result.error;
    await refreshSavedRoutes(false);
    const sel=$('routeSavedSelect');
    if(sel&&result.data&&result.data.id)sel.value=String(result.data.id);
    notify(`Saved cloud route: ${name}`);
  }catch(err){
    console.error(err);
    notify(err&&err.message?`Cloud route save failed: ${err.message}`:'Cloud route save failed. Run the saved-routes SQL setup if needed.',7000);
    setSavedRouteStatus();
  }finally{
    if(btn)btn.disabled=false;
  }
}
async function loadSavedRoute(){
  if(app.supabase&&app.session&&!app.savedRoutesLoaded)await refreshSavedRoutes(false);
  const id=$('routeSavedSelect')?.value;
  if(!id){notify('Choose a cloud saved route first.');return;}
  const saved=getSavedRoutes().find(r=>r.id===id);
  if(!saved){notify('Cloud saved route not found.');await refreshSavedRoutes(false);return;}
  applyRouteInputSnapshot(saved);
  const base=(saved.basePoints||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng),label:p.label||''})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  app.routeSearch.shapePoints=(saved.shapePoints||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng),seq:clampRouteSeq(p.seq)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  app.routeSearch.bufferMiles=normalizeRouteMiles(saved.bufferMiles||25);
  if(base.length<2){await runRouteSearch();return;}
  const btn=$('routeLoadBtn');
  if(btn)btn.disabled=true;
  setLoading(true,'Loading cloud saved route…');
  try{
    if(!app.routeSearch.active)app.routeSearch.previousStates=selectedStateCodes();
    app.routeSearch.active=true;
    app.routeSearch.basePoints=base;
    const route=await requestOsrmRoute(routePointsWithShapes());
    const coords=route.geometry.coordinates.map(c=>({lat:Number(c[1]),lng:Number(c[0])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(coords.length<2)throw new Error('The saved route geometry was empty.');
    app.routeSearch.coords=coords;
    app.routeSearch.distanceMiles=Number(route.distance)/1609.344;
    app.routeSearch.durationMinutes=Number(route.duration)/60;
    drawRouteLine();
    const routeStates=routeStatesForCoords(coords,app.routeSearch.bufferMiles);
    app.enabledStates=new Set(routeStates);
    saveJson(STORE.states,[...app.enabledStates]);
    syncStateControls();
    await loadEnabledStates(false);
    drawRouteLine();
    fitRouteView();
    updateRouteStatus();
    notify(`Loaded cloud route: ${saved.name}`);
  }catch(err){console.error(err);notify(err&&err.message?err.message:'Could not load cloud saved route.');}
  finally{setLoading(false);if(btn)btn.disabled=false;}
}
async function deleteSavedRoute(){
  if(!app.supabase)return notify('Cloud saved routes need Supabase config.',6000);
  if(!app.session)return notify('Sign in before deleting cloud saved routes.',6000);
  const id=$('routeSavedSelect')?.value;
  if(!id){notify('Choose a cloud saved route to delete.');return;}
  const route=getSavedRoutes().find(r=>r.id===id);
  const btn=$('routeDeleteBtn');
  if(btn)btn.disabled=true;
  setSavedRouteStatus('Deleting cloud saved route…');
  try{
    const {error}=await app.supabase.from(SAVED_ROUTES_TABLE).delete().eq('id',id);
    if(error)throw error;
    await refreshSavedRoutes(false);
    notify(route?`Deleted cloud route: ${route.name}`:'Cloud route deleted.');
  }catch(err){
    console.error(err);
    notify(err&&err.message?`Delete failed: ${err.message}`:'Could not delete cloud saved route.',7000);
    setSavedRouteStatus();
  }finally{
    if(btn)btn.disabled=false;
  }
}
function syncRouteControls(){
  setRouteMilesUI(app.routeSearch.bufferMiles||25,false);
  renderSavedRoutes();
}
function formatRouteDuration(minutes){
  const min=Number(minutes);
  if(!Number.isFinite(min)||min<=0)return 'unknown';
  const rounded=Math.max(1,Math.round(min));
  const h=Math.floor(rounded/60),m=rounded%60;
  if(h<=0)return `${m} min`;
  return `${h} hr ${m} min`;
}
function formatRouteMiles(miles){
  const mi=Number(miles);
  if(!Number.isFinite(mi)||mi<=0)return 'unknown miles';
  return `${Math.round(mi)} mi`;
}
function updateRouteStatus(){
  const el=$('routeStatus');
  const summary=$('routeSummary');
  if(!app.routeSearch.active){
    if(el)el.textContent='Route Search is off.';
    if(summary){summary.hidden=true;summary.innerHTML='';}
    return;
  }
  const miles=app.routeSearch.bufferMiles||25;
  const distText=formatRouteMiles(app.routeSearch.distanceMiles);
  const timeText=formatRouteDuration(app.routeSearch.durationMinutes);
  const shapes=(app.routeSearch.shapePoints||[]).length;
  const shown=Array.isArray(app.shownSites)?app.shownSites.length:0;
  const shapeText=shapes?` · ${shapes} route handle${shapes===1?'':'s'}`:'';
  if(el)el.textContent=`Estimated drive time: ${timeText} · ${distText} route · filtering sites within ${miles} miles${shapeText}.`;
  if(summary){
    summary.hidden=false;
    summary.innerHTML=`<strong>Route summary</strong><span><b>Drive time:</b> ${esc(timeText)} estimated by OSRM</span><span><b>Distance:</b> ${esc(distText)}</span><span><b>Matching loaded sites:</b> ${shown}</span>`;
  }
}
function lngLatString(points){return points.map(p=>`${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');}
async function requestOsrmRoute(points){
  if(points.length<2)throw new Error('A route needs at least a start and destination.');
  const url='https://router.project-osrm.org/route/v1/driving/'+lngLatString(points)+'?overview=full&geometries=geojson&steps=false&alternatives=false';
  const data=await fetchJsonWithTimeout(url,25000);
  const route=data&&Array.isArray(data.routes)?data.routes[0]:null;
  if(!route||!route.geometry||!Array.isArray(route.geometry.coordinates))throw new Error('OSRM did not return a usable route.');
  return route;
}
function routeHandleIcon(){
  return L.divIcon({className:'route-shape-handle',html:'<span title="Drag to reshape route">↕</span>',iconSize:[28,28],iconAnchor:[14,14]});
}
function clampRouteSeq(seq){return Math.max(.001,Math.min(.999,Number(seq)||.5));}
function distanceLatLngMiles(lat1,lng1,lat2,lng2){
  const mid=toRad((Number(lat1)+Number(lat2))/2);
  const dx=(Number(lng2)-Number(lng1))*69.172*Math.cos(mid);
  const dy=(Number(lat2)-Number(lat1))*69.0;
  return Math.hypot(dx,dy);
}
function routeMeasure(coords){
  const cumulative=[0];
  let total=0;
  for(let i=1;i<(coords||[]).length;i++){
    const a=coords[i-1],b=coords[i];
    const seg=distanceLatLngMiles(a.lat,a.lng,b.lat,b.lng);
    total+=Number.isFinite(seg)?seg:0;
    cumulative.push(total);
  }
  return {total,cumulative};
}
function pointAtRouteSequence(seq,coordsOverride){
  const coords=coordsOverride||app.routeSearch.coords||[];
  if(coords.length<2)return null;
  const measure=routeMeasure(coords);
  const total=measure.total;
  if(!Number.isFinite(total)||total<=0)return coords[Math.max(0,Math.min(coords.length-1,Math.round(clampRouteSeq(seq)*(coords.length-1))))];
  const target=clampRouteSeq(seq)*total;
  for(let i=1;i<coords.length;i++){
    const a=coords[i-1],b=coords[i];
    const before=measure.cumulative[i-1],after=measure.cumulative[i];
    if(target<=after||i===coords.length-1){
      const span=Math.max(.000001,after-before);
      const t=Math.max(0,Math.min(1,(target-before)/span));
      return {lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t,seq:clampRouteSeq(seq)};
    }
  }
  const last=coords[coords.length-1];
  return {lat:last.lat,lng:last.lng,seq:clampRouteSeq(seq)};
}
function segmentProjectionInfo(p,a,b){
  const lat0=toRad((p.lat+a.lat+b.lat)/3);
  const scaleX=69.172*Math.cos(lat0);
  const scaleY=69.0;
  const px=p.lng*scaleX,py=p.lat*scaleY;
  const ax=a.lng*scaleX,ay=a.lat*scaleY;
  const bx=b.lng*scaleX,by=b.lat*scaleY;
  const dx=bx-ax,dy=by-ay;
  if(dx===0&&dy===0)return {t:0,distance:Math.hypot(px-ax,py-ay)};
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  return {t,distance:Math.hypot(px-(ax+t*dx),py-(ay+t*dy))};
}
function nearestRouteSequence(latlng){
  const coords=app.routeSearch.coords||[];
  if(coords.length<2)return .5;
  const p={lat:Number(latlng.lat),lng:Number(latlng.lng)};
  const measure=routeMeasure(coords);
  let best=Infinity,bestSeq=.5;
  for(let i=1;i<coords.length;i++){
    const a=coords[i-1],b=coords[i];
    const projection=segmentProjectionInfo(p,a,b);
    if(projection.distance<best){
      best=projection.distance;
      const before=measure.cumulative[i-1]||0;
      const seg=(measure.cumulative[i]||before)-before;
      bestSeq=measure.total>0?(before+(projection.t*seg))/measure.total:i/(coords.length-1);
    }
  }
  return clampRouteSeq(bestSeq);
}
function routePointsWithShapes(){
  const base=(app.routeSearch.basePoints||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)));
  if(base.length<2)return [];
  const lastIndex=base.length-1;
  const interior=base.slice(1,-1).map((p,i)=>Object.assign({},p,{seq:(i+1)/lastIndex,kind:'manual-stop'}));
  const shapes=(app.routeSearch.shapePoints||[])
    .map(p=>Object.assign({},p,{seq:clampRouteSeq(p.seq),kind:'route-handle'}))
    .filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)));
  const middle=interior.concat(shapes).sort((a,b)=>(Number(a.seq)||.5)-(Number(b.seq)||.5));
  return [base[0],...middle,base[lastIndex]];
}
function drawRouteLine(){
  if(app.routeSearch.layer)app.routeSearch.layer.clearLayers();
  const coords=app.routeSearch.coords||[];
  if(!coords.length||!app.routeSearch.layer)return;
  const line=L.polyline(coords.map(p=>[p.lat,p.lng]),{color:'#246ad4',weight:7,opacity:.82,lineCap:'round',lineJoin:'round',interactive:true});
  line.on('click',e=>addRouteShapePoint(e.latlng));
  app.routeSearch.layer.addLayer(line);
  (app.routeSearch.shapePoints||[]).forEach((pt,idx)=>{
    const marker=L.marker([pt.lat,pt.lng],{icon:routeHandleIcon(),draggable:true,keyboard:true,title:'Drag to reshape route'});
    marker.on('dragend',()=>{
      const ll=marker.getLatLng();
      app.routeSearch.shapePoints[idx].lat=ll.lat;
      app.routeSearch.shapePoints[idx].lng=ll.lng;
      rerouteWithShapePoints(true);
    });
    marker.on('click',e=>{if(e.originalEvent&&e.originalEvent.altKey){app.routeSearch.shapePoints.splice(idx,1);rerouteWithShapePoints(true);}});
    app.routeSearch.layer.addLayer(marker);
  });
}
function addRouteShapePoint(latlng){
  if(!(app.routeSearch&&app.routeSearch.active)){return;}
  app.routeSearch.shapePoints=app.routeSearch.shapePoints||[];
  app.routeSearch.shapePoints.push({lat:Number(latlng.lat),lng:Number(latlng.lng),seq:nearestRouteSequence(latlng)});
  drawRouteLine();
  notify('Route handle added. Drag it onto the road you want, then release to reroute. Add another handle farther along the road if you want the detour to last longer. Alt-click a handle to remove it.');
}
async function rerouteWithShapePoints(showNotice){
  const points=routePointsWithShapes();
  if(points.length<2)return;
  const keepCenter=app.map&&app.map.getCenter?app.map.getCenter():null;
  const keepZoom=app.map&&app.map.getZoom?app.map.getZoom():null;
  setLoading(true,'Re-routing…');
  try{
    const route=await requestOsrmRoute(points);
    const coords=route.geometry.coordinates.map(c=>({lat:Number(c[1]),lng:Number(c[0])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(coords.length<2)throw new Error('The reshaped route geometry was empty.');
    app.routeSearch.coords=coords;
    app.routeSearch.distanceMiles=Number(route.distance)/1609.344;
    app.routeSearch.durationMinutes=Number(route.duration)/60;
    drawRouteLine();
    renderMarkers(false);
    if(keepCenter&&Number.isFinite(keepZoom))app.map.setView(keepCenter,keepZoom,{animate:false});
    updateRouteStatus();
    if(showNotice)notify('Route reshaped. Add another handle if you need to hold the detour longer.');
  }catch(err){
    console.error(err);
    notify(err&&err.message?err.message:'Could not reshape route.');
    drawRouteLine();
  }finally{setLoading(false)}
}
function routeBounds(){
  const b=L.latLngBounds([]);
  (app.routeSearch.coords||[]).forEach(p=>b.extend([p.lat,p.lng]));
  return b;
}
function fitRouteView(){
  const b=routeBounds();
  if(b.isValid())app.map.fitBounds(b,{padding:[36,36],animate:false});
}
function routeStatesForCoords(coords,bufferMiles){
  const selected=selectedStateCodes();
  if(!coords||!coords.length)return selected.length?selected:[DEFAULT_STATE];
  const bufferLat=(Number(bufferMiles)||25)/69;
  const hits=[];
  for(const [code,b] of Object.entries(STATE_BOUNDS)){
    const midLat=(b[0][0]+b[1][0])/2;
    const bufferLng=(Number(bufferMiles)||25)/(Math.max(18,69*Math.cos(toRad(midLat))));
    const expanded=[[b[0][0]-bufferLat,b[0][1]-bufferLng],[b[1][0]+bufferLat,b[1][1]+bufferLng]];
    if(coords.some(p=>pointInBounds(p.lat,p.lng,expanded)))hits.push(code);
  }
  const mapped=new Set(mappedStateEntries().map(s=>s.code));
  const usable=sortStateCodes(hits.filter(c=>mapped.has(c)));
  return usable.length?usable:(selected.length?selected:[DEFAULT_STATE]);
}
function distancePointToSegmentMiles(p,a,b){
  const lat0=toRad((p.lat+a.lat+b.lat)/3);
  const scaleX=69.172*Math.cos(lat0);
  const scaleY=69.0;
  const px=p.lng*scaleX,py=p.lat*scaleY;
  const ax=a.lng*scaleX,ay=a.lat*scaleY;
  const bx=b.lng*scaleX,by=b.lat*scaleY;
  const dx=bx-ax,dy=by-ay;
  if(dx===0&&dy===0)return Math.hypot(px-ax,py-ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function routeDistanceMiles(lat,lng){
  const coords=app.routeSearch.coords||[];
  if(coords.length<2)return Infinity;
  const p={lat:Number(lat),lng:Number(lng)};
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return Infinity;
  let best=Infinity;
  for(let i=1;i<coords.length;i++){
    const d=distancePointToSegmentMiles(p,coords[i-1],coords[i]);
    if(d<best)best=d;
  }
  return best;
}
function siteWithinRouteRange(site){
  if(!(app.routeSearch&&app.routeSearch.active))return true;
  const lat=Number(site.lat),lng=Number(site.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
  return routeDistanceMiles(lat,lng)<=Number(app.routeSearch.bufferMiles||25);
}
async function runRouteSearch(){
  const startText=$('routeStart')?.value.trim()||'';
  const endText=$('routeEnd')?.value.trim()||'';
  if(!startText||!endText){notify('Add a route start and destination first.');return;}
  const places=[startText,...routeStopInputs(),endText];
  const miles=normalizeRouteMiles($('routeMilesNumber')?.value||$('routeMiles')?.value||25);
  app.routeSearch.bufferMiles=miles;
  const btn=$('routeGoBtn');
  if(btn)btn.disabled=true;
  setLoading(true,'Mapping route…');
  try{
    const points=[];
    for(const place of places){points.push(await geocodeRoutePlace(place));}
    const route=await requestOsrmRoute(points);
    const coords=route.geometry.coordinates.map(c=>({lat:Number(c[1]),lng:Number(c[0])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(coords.length<2)throw new Error('The route geometry was empty.');
    if(!app.routeSearch.active)app.routeSearch.previousStates=selectedStateCodes();
    app.routeSearch.active=true;
    app.routeSearch.coords=coords;
    app.routeSearch.basePoints=points.map((p,i)=>Object.assign({},p,{seq:points.length>1?i/(points.length-1):0}));
    app.routeSearch.shapePoints=[];
    app.routeSearch.bufferMiles=miles;
    app.routeSearch.distanceMiles=Number(route.distance)/1609.344;
    app.routeSearch.durationMinutes=Number(route.duration)/60;
    drawRouteLine();
    const routeStates=routeStatesForCoords(coords,miles);
    app.enabledStates=new Set(routeStates);
    saveJson(STORE.states,[...app.enabledStates]);
    syncStateControls();
    await loadEnabledStates(false);
    drawRouteLine();
    fitRouteView();
    updateRouteStatus();
    notify(`Route Search on: ${app.shownSites.length} matching sites within ${miles} miles.`);
  }catch(err){
    console.error(err);
    notify(err&&err.message?err.message:'Route search failed.');
  }finally{
    setLoading(false);
    if(btn)btn.disabled=false;
  }
}
function clearRouteSearch(){
  const prev=Array.isArray(app.routeSearch.previousStates)?app.routeSearch.previousStates:null;
  app.routeSearch.active=false;
  app.routeSearch.coords=[];
  app.routeSearch.basePoints=[];
  app.routeSearch.shapePoints=[];
  app.routeSearch.distanceMiles=null;
  app.routeSearch.durationMinutes=null;
  app.routeSearch.previousStates=null;
  if(app.routeSearch.layer)app.routeSearch.layer.clearLayers();
  if(prev){app.enabledStates=new Set(prev);saveJson(STORE.states,[...app.enabledStates]);syncStateControls();loadEnabledStates(true);}else{renderMarkers(true);}
  updateRouteStatus();
  notify('Route Search cleared.');
}

function bindEvents(){ bindSidebarTabs(); $('menuToggle').onclick=()=>{if($('sidebar').classList.contains('closed')){if(isPhoneView()){setMobileMode('more');$('sidebar').classList.remove('closed');}else{setDesktopMode(localStorage.getItem(STORE.desktopMode)||'where');}}else{if(isPhoneView()){setMobileMode('map');$('sidebar').classList.add('closed');}else{setDesktopMode('map');}} setTimeout(()=>app.map.invalidateSize(),220)}; $('closeSidebar').onclick=()=>{if(isPhoneView()){setMobileMode('map');$('sidebar').classList.add('closed');}else{setDesktopMode('map');} setTimeout(()=>app.map.invalidateSize(),220)}; $('basemapSelect').onchange=e=>{Object.values(app.baseLayers).forEach(t=>app.map.removeLayer(t));(app.baseLayers[e.target.value]||app.baseLayers.topo).addTo(app.map);localStorage.setItem(STORE.basemap,e.target.value)}; const stateMenuButton=$('stateMenuButton'); const stateMenuPanel=$('stateMenuPanel'); if(stateMenuButton&&stateMenuPanel)stateMenuButton.onclick=()=>{const open=stateMenuPanel.hidden; stateMenuPanel.hidden=!open; stateMenuButton.setAttribute('aria-expanded',open?'true':'false')}; document.addEventListener('click',e=>{if(stateMenuPanel&&stateMenuButton&&!stateMenuPanel.hidden&&!$('stateSection').contains(e.target)){stateMenuPanel.hidden=true;stateMenuButton.setAttribute('aria-expanded','false')}}); const areaOutlineMenuButton=$('areaOutlineMenuButton'); const areaOutlineMenuPanel=$('areaOutlineMenuPanel'); if(areaOutlineMenuButton&&areaOutlineMenuPanel)areaOutlineMenuButton.onclick=()=>{const open=areaOutlineMenuPanel.hidden; areaOutlineMenuPanel.hidden=!open; areaOutlineMenuButton.setAttribute('aria-expanded',open?'true':'false')}; document.addEventListener('click',e=>{if(areaOutlineMenuPanel&&areaOutlineMenuButton&&!areaOutlineMenuPanel.hidden&&!$('areaOutlineSection').contains(e.target)){areaOutlineMenuPanel.hidden=true;areaOutlineMenuButton.setAttribute('aria-expanded','false')}}); const allStatesBtn=$('selectAllStates'); if(allStatesBtn)allStatesBtn.onclick=()=>setEnabledStates(mappedStateEntries().map(s=>s.code),true); const clearStatesBtn=$('clearStates'); if(clearStatesBtn)clearStatesBtn.onclick=()=>setEnabledStates([],true); const stateChecklist=$('stateChecklist'); if(stateChecklist)stateChecklist.addEventListener('change',e=>{if(!e.target.dataset.stateCode)return; const codes=$$('[data-state-code]').filter(cb=>cb.checked).map(cb=>cb.dataset.stateCode); setEnabledStates(codes,true)}); $('selectAllLayers').onclick=()=>{app.restOnlyMode=false;syncRestOnlyToggle();setAllLayers(true)}; $('clearAllLayers').onclick=()=>{app.restOnlyMode=false;syncRestOnlyToggle();setAllLayers(false)}; const restOnlyToggle=$('restOnlyToggle'); if(restOnlyToggle)restOnlyToggle.onclick=toggleRestOnlyMode; const clearOutlineBtn=$('clearAreaOutlineBtn'); if(clearOutlineBtn)clearOutlineBtn.onclick=clearAreaOutline; const showOutlineBtn=$('showAreaOutlineBtn'); if(showOutlineBtn)showOutlineBtn.onclick=showSelectedAreaOutline; const showBoondockingOutlinesBtn=$('showBoondockingOutlinesBtn'); if(showBoondockingOutlinesBtn)showBoondockingOutlinesBtn.onclick=showBoondockingAreaOutlines; const layerList=$('layerList'); if(layerList)layerList.addEventListener('change',applyLayerCheckboxChange); const desktopLegend=$('mapLegendDesktop'); if(desktopLegend)desktopLegend.addEventListener('change',applyLayerCheckboxChange); $('showPendingLayer').onchange=e=>{e.target.checked?app.enabledLayers.add('pending'):app.enabledLayers.delete('pending');localStorage.setItem(STORE.pending,e.target.checked?'1':'0');saveLayers();updatePendingMeta();syncLayerControls();loadEnabledStates(false)}; $('searchBtn').onclick=runSearch; $('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()}); const routeGo=$('routeGoBtn'); if(routeGo)routeGo.onclick=runRouteSearch; const routeClear=$('routeClearBtn'); if(routeClear)routeClear.onclick=clearRouteSearch; const routeAdd=$('routeAddStopBtn'); if(routeAdd)routeAdd.onclick=()=>addRouteStopInput(); const routeMiles=$('routeMiles'); if(routeMiles)routeMiles.oninput=()=>setRouteMilesUI(routeMiles.value,true); const routeMilesNumber=$('routeMilesNumber'); if(routeMilesNumber){routeMilesNumber.oninput=()=>setRouteMilesUI(routeMilesNumber.value,true);routeMilesNumber.onchange=()=>setRouteMilesUI(routeMilesNumber.value,true);} const routeSave=$('routeSaveBtn'); if(routeSave)routeSave.onclick=()=>saveCurrentRoute(); const routeLoad=$('routeLoadBtn'); if(routeLoad)routeLoad.onclick=()=>loadSavedRoute(); const routeSavedSelect=$('routeSavedSelect'); if(routeSavedSelect)routeSavedSelect.onchange=()=>{if(routeSavedSelect.value)loadSavedRoute();}; const routeDelete=$('routeDeleteBtn'); if(routeDelete)routeDelete.onclick=()=>deleteSavedRoute(); const routeSignIn=$('routeSignInBtn'); if(routeSignIn)routeSignIn.onclick=e=>signIn(e); const routeCreate=$('routeCreateAccountBtn'); if(routeCreate)routeCreate.onclick=createAccount; const routeSignOut=$('routeSignOutBtn'); if(routeSignOut)routeSignOut.onclick=signOut; ['routeStart','routeEnd','routeSaveName'].forEach(id=>{$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter'){if(id==='routeSaveName')saveCurrentRoute();else runRouteSearch();}})}); ['routeAuthEmail','routeAuthPassword'].forEach(id=>{$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')signIn(e);});}); $('nearMeBtn').onclick=nearMe; ['enableLocationBtn','enableLocationBtnMobile'].forEach(id=>{const b=$(id);if(b)b.onclick=()=>requestLocationFromButton(false)}); $('openAddSiteBtn').onclick=()=>openModal('addSiteModal'); $('openQueueBtn').onclick=()=>openModal('queueModal'); $$('[data-close-modal]').forEach(b=>b.onclick=()=>closeModal(b.dataset.closeModal)); $$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)})); $$('[data-mobile-action]').forEach(b=>b.onclick=()=>mobileAction(b.dataset.mobileAction)); $$('[data-desktop-action]').forEach(b=>b.onclick=()=>desktopAction(b.dataset.desktopAction)); if(!isPhoneView())setDesktopMode(localStorage.getItem(STORE.desktopMode)||'where'); $$('[data-mobile-close]').forEach(b=>b.onclick=closeMobilePanel); $('addMode').onchange=()=>notify($('addMode').checked?'Click the map to place a draft pin.':'Add mode off.'); app.map.on('click',e=>{if($('addMode').checked)setDraftPoint(e.latlng)}); $('appendDraftBtn').onclick=appendDraft; $('clearDraftBtn').onclick=clearDraft; $('copyQueueBtn').onclick=copyQueue; $('clearQueueBtn').onclick=()=>{app.draftQueue=[];saveJson(STORE.queue,app.draftQueue);$('draftQueue').value='';notify('Queue cleared.')}; $('sendDraftSupabaseBtn').onclick=sendDraftSupabase; $('sbAuthForm').onsubmit=signIn; const createBtn=$('sbCreateAccountBtn'); if(createBtn)createBtn.onclick=createAccount; $('sbSignOutBtn').onclick=signOut; $('costFilter').onchange=()=>setCostFilter($('costFilter').value); $$('[data-water-filter]').forEach(cb=>cb.onchange=()=>setWaterFilter(cb.dataset.waterFilter,cb.checked)); $$('[data-access-filter]').forEach(cb=>cb.onchange=()=>setAccessFilter(cb.dataset.accessFilter,cb.checked)); $$('[data-filter-chip]').forEach(c=>c.onclick=()=>toggleQuickFilter(c.dataset.filterChip)); const clearFiltersBtn=$('clearFiltersBtn'); if(clearFiltersBtn)clearFiltersBtn.onclick=clearFilters;}
function saveLayers(){app.enabledLayers=new Set([...app.enabledLayers].filter(k=>LAYER_CONTROL_KEYS.has(k)));saveJson(STORE.layers,[...app.enabledLayers]);$$('[data-layer]').forEach(i=>i.checked=app.enabledLayers.has(i.dataset.layer));}
function syncRestOnlyToggle(){const btn=$('restOnlyToggle'); if(btn){btn.classList.toggle('active',!!app.restOnlyMode); btn.textContent=app.restOnlyMode?'Exit rest stops':'Rest stops only'; btn.setAttribute('aria-pressed',app.restOnlyMode?'true':'false');}}
function toggleRestOnlyMode(){app.restOnlyMode=!app.restOnlyMode;syncRestOnlyToggle();if(app.restOnlyMode){loadEnabledStates(true).then(()=>notify('Showing only Rest Areas & Roadside Stops for selected states.'));}else{renderMarkers(true);notify('Rest-stop focus off. Restored selected layers.');}}
function setAllLayers(on){app.restOnlyMode=false;syncRestOnlyToggle();MAP_LAYERS.forEach(l=>on?app.enabledLayers.add(l.key):app.enabledLayers.delete(l.key));saveLayers();updatePendingMeta();syncLayerControls();loadEnabledStates(false)}
function updatePendingMeta(){const on=app.enabledLayers.has('pending');$('showPendingLayer').checked=on;$('pendingMeta').textContent=on?'on':'off';syncRestOnlyToggle()}
function normalizeFilters(){
  app.filters=app.filters||{};
  app.filters.chips=app.filters.chips||{};
  app.filters.maxCost=String(app.filters.maxCost||'');
  const oldWater=typeof app.filters.water==='string'?app.filters.water:'';
  if(!app.filters.water||typeof app.filters.water!=='object'||Array.isArray(app.filters.water))app.filters.water={lake:false,rivercreek:false};
  if(oldWater==='lake')app.filters.water.lake=true;
  if(oldWater==='rivercreek')app.filters.water.rivercreek=true;
  app.filters.water.lake=!!app.filters.water.lake;
  app.filters.water.rivercreek=!!app.filters.water.rivercreek;
  const oldAccess=typeof app.filters.access==='string'?app.filters.access:'';
  if(!app.filters.access||typeof app.filters.access!=='object'||Array.isArray(app.filters.access))app.filters.access={twowd:false,hc:false,fw:false};
  if(oldAccess==='2wd')app.filters.access.twowd=true;
  if(oldAccess==='hc')app.filters.access.hc=true;
  if(oldAccess==='4wd')app.filters.access.fw=true;
  app.filters.access.twowd=!!app.filters.access.twowd;
  app.filters.access.hc=!!app.filters.access.hc;
  app.filters.access.fw=!!app.filters.access.fw;
  app.filters.chips.showers=!!app.filters.chips.showers;
  delete app.filters.chips.free;
  delete app.filters.chips.under20;
  delete app.filters.chips.twowd;
}
function isQuickFilterActive(key){
  normalizeFilters();
  if(key==='free')return app.filters.maxCost==='0';
  if(key==='under20')return app.filters.maxCost==='20';
  if(key==='twowd')return !!app.filters.access.twowd;
  if(key==='showers')return !!app.filters.chips.showers;
  return false;
}
function syncFilters(){
  normalizeFilters();
  const cost=$('costFilter'); if(cost)cost.value=app.filters.maxCost||'';
  $$('[data-water-filter]').forEach(cb=>{cb.checked=!!app.filters.water[cb.dataset.waterFilter]});
  $$('[data-access-filter]').forEach(cb=>{cb.checked=!!app.filters.access[cb.dataset.accessFilter]});
  $$('[data-filter-chip]').forEach(c=>c.classList.toggle('active',isQuickFilterActive(c.dataset.filterChip)));
  updateFilterStatus();
}
function saveFilters(){normalizeFilters();saveJson(STORE.filters,app.filters)}
function applyFilterChange(){syncFilters();saveFilters();renderMarkers(false)}
function setCostFilter(value){normalizeFilters();app.filters.maxCost=String(value||'');applyFilterChange()}
function setWaterFilter(key,on){normalizeFilters();if(app.filters.water&&key in app.filters.water)app.filters.water[key]=!!on;applyFilterChange()}
function setAccessFilter(key,on){normalizeFilters();if(app.filters.access&&key in app.filters.access)app.filters.access[key]=!!on;applyFilterChange()}
function toggleQuickFilter(key){
  normalizeFilters();
  const active=isQuickFilterActive(key);
  if(key==='free')app.filters.maxCost=active?'':'0';
  else if(key==='under20')app.filters.maxCost=active?'':'20';
  else if(key==='twowd')app.filters.access.twowd=!active;
  else if(key==='showers')app.filters.chips.showers=!active;
  applyFilterChange();
}
function clearFilters(){
  app.filters=blankFilters();
  applyFilterChange();
  notify('Filters cleared.');
}
function openModal(id){$(id)?.classList.add('open');$(id)?.setAttribute('aria-hidden','false')} function closeModal(id){$(id)?.classList.remove('open');$(id)?.setAttribute('aria-hidden','true')}
function isPhoneView(){return !!(window.matchMedia&&window.matchMedia('(max-width:700px)').matches)}
function closeMobilePanel(){mobileAction('map')}
function setMobileMode(mode){
  const body=document.body;
  ['map','where','layers','more'].forEach(m=>body.classList.toggle('mobile-mode-'+m,mode===m));
  body.classList.toggle('mobile-panel-active',mode&&mode!=='map');
  $$('[data-mobile-action]').forEach(b=>b.classList.toggle('active',b.dataset.mobileAction===mode));
}
function mobileAction(a){
  if(a==='map'){
    setMobileMode('map');
    $('sidebar').classList.add('closed');
    setTimeout(()=>app.map.invalidateSize(),220);
    return;
  }
  showSidebarTab('main');
  setMobileMode(a);
  $('sidebar').classList.remove('closed');
  setTimeout(()=>{app.map.invalidateSize();const target={where:'searchSection',layers:'layersSection',more:'filterSection'}[a];$(target)?.scrollIntoView({block:'start'});},120);
}
function setDesktopMode(mode){
  const safe=['map','where','layers','more'].includes(mode)?mode:'where';
  const body=document.body;
  ['map','where','layers','more'].forEach(m=>body.classList.toggle('desktop-mode-'+m,safe===m));
  body.classList.toggle('desktop-panel-active',safe!=='map');
  $$('[data-desktop-action]').forEach(b=>b.classList.toggle('active',b.dataset.desktopAction===safe));
  if(safe==='map')$('sidebar')?.classList.add('closed');
  else{
    $('sidebar')?.classList.remove('closed');
    try{localStorage.setItem(STORE.desktopMode,safe)}catch(_e){}
  }
}
function desktopAction(a){
  if(a==='map'){
    setDesktopMode('map');
    setTimeout(()=>app.map.invalidateSize(),220);
    return;
  }
  showSidebarTab('main');
  setDesktopMode(a);
  setTimeout(()=>{app.map.invalidateSize();const target={where:'searchSection',layers:'layersSection',more:'filterSection'}[a];$(target)?.scrollIntoView({block:'start'});},80);
}

async function loadEnabledStates(fit){const loadId=++app.loadSeq;setLoading(true,'Loading map…'); const states=[...app.enabledStates]; const nextSites=[]; if(states.length===0){if(loadId===app.loadSeq){app.sites=[];renderMarkers(false);setLoading(false);} return;} for(const code of states){await loadState(code); if(loadId!==app.loadSeq)return; nextSites.push(...(app.stateData[code]||[]));} if(app.enabledLayers.has('pending')) nextSites.push(...getPendingSites().filter(s=>states.includes(String(s.stateCode||s.state||'').toUpperCase()))); if(loadId!==app.loadSeq)return; app.sites=nextSites; renderMarkers(fit); setLoading(false);}
function loadScriptOnce(src,attr,val){return new Promise(res=>{const existing=document.querySelector(`script[${attr}="${val}"]`); if(existing)return res(); const s=document.createElement('script');s.src=src;s.setAttribute(attr,val);s.onload=()=>res();s.onerror=()=>{console.warn('Failed to load data file',src);res()};document.head.appendChild(s)})}

const MDOT_LIVE_REST_ROADSIDE={
  enabled:true,
  lastChecked:'2026-05-13',
  restAreas:{
    label:'MDOT rest areas / welcome centers',
    officialPage:'https://www.michigan.gov/mdot/travel/tourists/rest-areas',
    serviceUrl:'https://gisagomdot.state.mi.us/arcgis/rest/services/MDOT/MdotRestAreaPublic/FeatureServer/0/query'
  },
  roadsideParks:{
    label:'MDOT roadside parks / scenic views',
    officialPage:'https://www.michigan.gov/mdot/travel/tourists/roadside-parks',
    serviceUrl:'https://gisagomdot.state.mi.us/arcgis/rest/services/MDOT/MdotRoadsideParkPublic/FeatureServer/0/query'
  },
  fallbackFile:'data/mi-rest-roadside-v23.0.8.js'
};
function arcgisQueryUrl(serviceUrl){
  const params=new URLSearchParams({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',f:'json',resultRecordCount:'2000'});
  return serviceUrl+'?'+params.toString();
}
function cleanSlug(value){
  return String(value||'site').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'site';
}
function boolField(value){
  if(value===1||value===true)return 'Yes';
  if(value===0||value===false)return 'No';
  if(value==null||value==='')return '';
  return String(value);
}
function normalizedLng(x){
  let lng=Number(x);
  if(Number.isFinite(lng)&&lng>0&&lng>=82&&lng<=91)lng=-lng;
  return lng;
}
function normalizedLat(y){return Number(y);}
function validMichiganPoint(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=41.5&&lat<=48.5&&lng>=-91.5&&lng<=-82.0;}
function currentStatusToSeason(status,facilityType){
  status=String(status||'').toLowerCase();
  if(status.includes('closed for season'))return 'Seasonal';
  if(status.includes('closed'))return 'Temporarily closed';
  if(facilityType==='Roadside Park'||facilityType==='Scenic Turnout')return 'Seasonal';
  return 'Year-round';
}
function travelerUseForFacility(facilityType){
  if(facilityType==='Welcome Center')return 'Bathroom break; snack stop; stretch stop; dog walk; trip information; map/check-in stop';
  if(facilityType==='Rest Area')return 'Bathroom break; snack stop; stretch stop; dog walk; map/check-in stop';
  if(facilityType==='Scenic Turnout')return 'Scenic stop; stretch stop; map/check-in stop; short photo/view stop';
  if(facilityType==='Roadside Park')return 'Snack stop; stretch stop; picnic stop; dog walk; short break';
  if(/boat|water/i.test(facilityType||''))return 'Water access; stretch stop; snack stop when parking/restroom conditions are suitable';
  return 'Traveler stop; verify posted rules and amenities';
}
function restRoadsideSourceLink(site){
  const url=site&&site.sourceUrl;
  return url?`<a href="${esc(url)}" target="_blank" rel="noopener">Source data</a>`:'';
}
function arcgisAttrs(feature){return (feature&&feature.attributes)||{};}
function arcgisGeom(feature){return (feature&&feature.geometry)||{};}
function mapMdotRestAreaFeature(feature){
  const a=arcgisAttrs(feature), g=arcgisGeom(feature);
  const lat=normalizedLat(g.y), lng=normalizedLng(g.x);
  if(!validMichiganPoint(lat,lng))return null;
  const name=String(a.FacilityName||'MDOT Rest Area').trim();
  const fn=String(a.FacilityFunction||'');
  const facilityType=/welcome/i.test(fn+' '+name)?'Welcome Center':'Rest Area';
  const status=String(a.Status||'Open');
  const route=[a.RouteName,a.RouteDirection].filter(Boolean).join(' ');
  const details=[];
  if(a.FamilyRestrooms)details.push('family restrooms: '+a.FamilyRestrooms);
  if(a.DogRun)details.push('dog run: '+a.DogRun);
  if(boolField(a.OutsideWaterFaucet))details.push('outside water faucet: '+boolField(a.OutsideWaterFaucet));
  if(boolField(a.WalkingPath))details.push('walking path: '+boolField(a.WalkingPath));
  if(boolField(a.Playground))details.push('playground: '+boolField(a.Playground));
  if(boolField(a.Geocache))details.push('geocache: '+boolField(a.Geocache));
  return {
    id:'mi-mdot-live-rest-'+cleanSlug(name+'-'+(a.RouteName||'')+'-'+(a.RouteDirection||'')+'-'+(a.MileMarker||a.OBJECTID||'')),
    sourceId:a.GlobalID||a.OBJECTID||'',
    name:name,
    lat:lat,
    lng:lng,
    stateCode:'MI',
    stateName:'Michigan',
    layer:'rest-truck',
    subtype:facilityType==='Welcome Center'?'welcome-center':'rest-area',
    siteForm:'traveler-facility',
    facilityType:facilityType,
    owner:'Michigan Department of Transportation',
    ownerLevel:'State/MDOT',
    layerLabel:'Rest Areas & Roadside Stops',
    travelerUse:travelerUseForFacility(facilityType),
    currentStatus:status,
    overnightParking:'Unknown',
    seasonStatus:currentStatusToSeason(status,facilityType),
    seasonNotes:(a.ClosureDetails?String(a.ClosureDetails):'MDOT official GIS status: '+status+'. Verify posted signs and current MDOT status before relying on an overnight stop.'),
    routeName:a.RouteName||'',
    routeDirection:a.RouteDirection||'',
    mileMarker:a.MileMarker||'',
    honoree:a.Honoree||'',
    website:MDOT_LIVE_REST_ROADSIDE.restAreas.officialPage,
    sourceUrl:MDOT_LIVE_REST_ROADSIDE.restAreas.serviceUrl,
    sourceName:MDOT_LIVE_REST_ROADSIDE.restAreas.label,
    lastChecked:MDOT_LIVE_REST_ROADSIDE.lastChecked,
    cost:'Free traveler facility; not a campground.',
    costDisplay:'Free traveler facility; not a campground.',
    costIsFree:true,
    showers:'No',
    access:'Paved state-highway traveler facility; 2WD accessible. This is not a campground.',
    amenities:details.length?details.join('; '):'Restrooms, paved parking, picnic/pet amenities, and traveler services as posted by MDOT.',
    description:'Official MDOT GIS point for a '+facilityType.toLowerCase()+'. This app tracks overnight parking status separately and does not imply camping is allowed.',
    reviewSummary:'Official MDOT live GIS record. Verify posted rules before overnight use.',
    locationPrecision:'Official MDOT GIS point'
  };
}
function mapMdotRoadsideParkFeature(feature){
  const a=arcgisAttrs(feature), g=arcgisGeom(feature);
  const lat=normalizedLat(g.y), lng=normalizedLng(g.x);
  if(!validMichiganPoint(lat,lng))return null;
  const name=String(a.Name||'MDOT Roadside Park').trim();
  const status=String(a.Status||'Open');
  const isScenic=/scenic|view|overlook|turnout|bluffs/i.test(name);
  const facilityType=isScenic?'Scenic Turnout':'Roadside Park';
  return {
    id:'mi-mdot-live-roadside-'+cleanSlug(name+'-'+(a.OBJECTID||'')),
    sourceId:a.GlobalId||a.OBJECTID||'',
    name:name,
    lat:lat,
    lng:lng,
    stateCode:'MI',
    stateName:'Michigan',
    layer:'rest-truck',
    subtype:isScenic?'scenic-turnout':'roadside-park',
    siteForm:'traveler-facility',
    facilityType:facilityType,
    owner:'Michigan Department of Transportation',
    ownerLevel:'State/MDOT',
    layerLabel:'Rest Areas & Roadside Stops',
    travelerUse:travelerUseForFacility(facilityType),
    currentStatus:status,
    overnightParking:'Unknown',
    seasonStatus:currentStatusToSeason(status,facilityType),
    seasonNotes:(a.ClosureDetails?String(a.ClosureDetails):'MDOT official GIS status: '+status+'. Many roadside parks are seasonal; verify posted signs and current MDOT status.'),
    honoree:a.HonoreeName||'',
    website:MDOT_LIVE_REST_ROADSIDE.roadsideParks.officialPage,
    sourceUrl:MDOT_LIVE_REST_ROADSIDE.roadsideParks.serviceUrl,
    sourceName:MDOT_LIVE_REST_ROADSIDE.roadsideParks.label,
    lastChecked:MDOT_LIVE_REST_ROADSIDE.lastChecked,
    cost:'Free traveler facility; not a campground.',
    costDisplay:'Free traveler facility; not a campground.',
    costIsFree:true,
    showers:'No',
    access:'State-highway roadside facility; generally 2WD accessible when open. This is not a campground.',
    amenities:'Roadside park or scenic-view stop; amenities vary by site and season.',
    description:'Official MDOT GIS point for a '+facilityType.toLowerCase()+'. This app tracks overnight parking status separately and does not imply camping is allowed.',
    reviewSummary:'Official MDOT live GIS record. Verify posted rules before overnight use.',
    locationPrecision:'Official MDOT GIS point'
  };
}
async function fetchArcgisFeatures(source,mapFn){
  const response=await fetch(arcgisQueryUrl(source.serviceUrl),{cache:'no-store'});
  if(!response.ok)throw new Error(source.label+' request failed: '+response.status);
  const data=await response.json();
  if(data.error)throw new Error(source.label+' error: '+(data.error.message||'ArcGIS error'));
  return (Array.isArray(data.features)?data.features:[]).map(mapFn).filter(Boolean);
}
function mergeUniqueSites(base,extra){
  const ids=new Set(base.map(function(site){return site&&site.id;}));
  const keys=new Set(base.map(function(site){return [String(site&&site.name||'').toLowerCase(),Number(site&&site.lat||0).toFixed(4),Number(site&&site.lng||0).toFixed(4)].join('|');}));
  (extra||[]).forEach(function(site){
    const key=[String(site&&site.name||'').toLowerCase(),Number(site&&site.lat||0).toFixed(4),Number(site&&site.lng||0).toFixed(4)].join('|');
    if(site&&!ids.has(site.id)&&!keys.has(key)){base.push(site);ids.add(site.id);keys.add(key);}
  });
  return base;
}
async function loadMdotLiveRestRoadside(code){
  if(code!=='MI'||!MDOT_LIVE_REST_ROADSIDE.enabled)return [];
  try{
    const results=await Promise.all([
      fetchArcgisFeatures(MDOT_LIVE_REST_ROADSIDE.restAreas,mapMdotRestAreaFeature),
      fetchArcgisFeatures(MDOT_LIVE_REST_ROADSIDE.roadsideParks,mapMdotRoadsideParkFeature)
    ]);
    const combined=[].concat(results[0],results[1]);
    app.restRoadsideStats={source:'MDOT live',fallback:false,restWelcome:results[0].length,roadsideScenic:results[1].length,total:combined.length,lastChecked:MDOT_LIVE_REST_ROADSIDE.lastChecked};
    window.CAMPING_MDOT_LIVE_REST_ROADSIDE_COUNT=combined.length;
    return combined;
  }catch(err){
    console.warn('MDOT live rest/roadside load failed; using static fallback if available.',err);
    try{
      await loadScriptOnce(MDOT_LIVE_REST_ROADSIDE.fallbackFile,'data-state-file','MI-mdot-rest-roadside-static-fallback');
      const fallbackItems=(window.CAMPING_MI_REST_ROADSIDE_SUPPLEMENT||[]);
      app.restRoadsideStats={source:'static fallback',fallback:true,restWelcome:0,roadsideScenic:fallbackItems.length,total:fallbackItems.length,lastChecked:MDOT_LIVE_REST_ROADSIDE.lastChecked};
      return fallbackItems.map(function(site){
        const out=Object.assign({},site);
        out.reviewSummary=(out.reviewSummary||'')+' Static fallback shown because MDOT live GIS did not load.';
        out.sourceName=out.sourceName||'Static fallback, verify against MDOT GIS';
        return out;
      });
    }catch(fallbackErr){
      console.warn('MDOT static fallback also failed.',fallbackErr);
      return [];
    }
  }
}
async function loadMiLocalTravelerStops(){
  try{
    await loadScriptOnce('data/mi-local-traveler-stops-v23.0.17.js','data-state-file','MI-local-traveler-stops-v23_0_17');
    const items=window.CAMPING_MI_LOCAL_TRAVELER_STOPS||[];
    return Array.isArray(items)?items:[];
  }catch(err){
    console.warn('Michigan local traveler stops supplement failed to load.',err);
    return [];
  }
}
async function loadMiOvernightParking(){
  try{
    await loadScriptOnce('data/mi-overnight-parking-v23.0.24.js','data-state-file','MI-overnight-parking-v23_0_24');
    const items=window.CAMPING_MI_OVERNIGHT_PARKING||[];
    return Array.isArray(items)?items:[];
  }catch(err){
    console.warn('Michigan overnight parking supplement failed to load.',err);
    return [];
  }
}
async function loadMiPrivateRvParks(){
  try{
    await loadScriptOnce('data/mi-private-rv-parks-v23.0.21.js','data-state-file','MI-private-rv-parks-v23_0_21');
    const items=window.CAMPING_MI_PRIVATE_RV_PARKS||[];
    return Array.isArray(items)?items:[];
  }catch(err){
    console.warn('Michigan private RV park supplement failed to load.',err);
    return [];
  }
}
function shouldLoadMiRestRoadside(){return !!app.restOnlyMode;}
function shouldLoadMiLocalTravelerStops(){return !!app.restOnlyMode;}
function shouldLoadMiPrivateRvParks(){return app.enabledLayers.has('private');}
function shouldLoadMiOvernightParking(){return app.enabledLayers.has('overnight-parking');}
async function ensureMichiganDynamicSupplements(base){
  if(!base)return;
  if(shouldLoadMiRestRoadside()&&!app.miDynamicLoaded.mdot){
    const mdot=await loadMdotLiveRestRoadside('MI');
    mergeUniqueSites(base,mdot);
    app.miDynamicLoaded.mdot=true;
  }
  if(shouldLoadMiLocalTravelerStops()&&!app.miDynamicLoaded.localTraveler){
    const localStops=await loadMiLocalTravelerStops();
    mergeUniqueSites(base,localStops);
    app.miDynamicLoaded.localTraveler=true;
  }
  if(shouldLoadMiPrivateRvParks()&&!app.miDynamicLoaded.privateRv){
    const privateRvParks=await loadMiPrivateRvParks();
    mergeUniqueSites(base,privateRvParks);
    app.miDynamicLoaded.privateRv=true;
  }
  if(shouldLoadMiOvernightParking()&&!app.miDynamicLoaded.overnight){
    const overnightParking=await loadMiOvernightParking();
    mergeUniqueSites(base,overnightParking);
    app.miDynamicLoaded.overnight=true;
  }
}
async function loadState(code){
  code=String(code||'').toUpperCase();
  if(!app.stateData[code]){
    const row=manifestEntries().find(s=>s.code===code);
    const files=row?(Array.isArray(row.files)&&row.files.length?row.files:(row.file?[row.file]:[])):[];
    if(!files.length){app.stateData[code]=[];return Promise.resolve()}
    window.CAMPING_STATE_DATA=window.CAMPING_STATE_DATA||{};
    for(const file of files){await loadScriptOnce(file,'data-state-file',`${code}-${file.replace(/[^a-zA-Z0-9_-]/g,'_')}`)}
    app.stateData[code]=(window.CAMPING_STATE_DATA&&window.CAMPING_STATE_DATA[code])||[];
  }
  if(code==='MI')await ensureMichiganDynamicSupplements(app.stateData[code]);
}

function getPendingSites(){const raw=window.CAMPING_PENDING_SITES||window.CAMPING_PENDING||[];return Array.isArray(raw)?raw.map(s=>Object.assign({pending:true},s)):[]}
function markerIcon(site){const key=layerKey(site);const d=layerDef(key);const size=markerSizeForLayer(key);const anchor=Math.round(size/2);return L.divIcon({className:'',html:`<span class="map-pin ${d.css}">${d.icon}</span>`,iconSize:[size,size],iconAnchor:[anchor,anchor],popupAnchor:[0,-anchor]})}
function isTravelerStop(site){return layerKey(site)==='rest-truck'}
function restRoadsideDiagnosticText(){
  const st=app.restRoadsideStats;
  if(!(st&&app.enabledStates.has('MI')))return '';
  const pieces=[`Roadside stops source: ${st.source}`,`${st.total} loaded`];
  pieces.push(st.fallback?'fallback used':'fallback not used');
  if(st.restWelcome!=null)pieces.push(`${st.restWelcome} rest/welcome · ${st.roadsideScenic} roadside/scenic`);
  if(st.lastChecked)pieces.push(`checked ${st.lastChecked}`);
  return pieces.join(' · ');
}
function updateRestRoadsideDiagnostics(){
  const text=restRoadsideDiagnosticText();
  ['dataStats','restRoadsideStats'].forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.textContent=text;
    el.hidden=!text;
  });
}

function areaOutlineCandidate(site){
  if(!site)return null;
  const raw=site.areaOutline||site.area_outline||site.areaOverlay||site.area_overlay||null;
  let outline=(raw&&typeof raw==='object')?Object.assign({},raw):null;
  const status=site.areaOutlineStatus||site.areaOverlayStatus||site.area_outline_status||site.area_overlay_status;
  if(!outline&&status)outline={status};
  if(!outline)return null;
  outline.status=String(outline.status||outline.outlineStatus||'available').toLowerCase().replace(/\s+/g,'_');
  outline.sourceName=outline.sourceName||outline.source||outline.officialSourceName||site.areaOutlineSourceName||site.areaOverlaySourceName||'Official source';
  outline.sourceUrl=outline.sourceUrl||outline.officialSourceUrl||outline.official_outline_source_url||site.areaOutlineSourceUrl||site.areaOverlaySourceUrl||'';
  outline.boundaryRepresents=outline.boundaryRepresents||outline.boundary_represents||site.boundaryRepresents||'Official context boundary';
  outline.caution=outline.caution||outline.cautionWording||outline.caution_wording||site.areaOutlineCaution||'Context outline only — not a legal campsite boundary.';
  outline.recommendedUse=outline.recommendedUse||outline.recommended_use||'context-only';
  outline.exactCampingBoundary=!!(outline.exactCampingBoundary||outline.exact_camping_boundary);
  return outline;
}
function areaOutlineHasFetchSource(outline){
  if(!outline)return false;
  if(outline.geojson||outline.featureCollection)return true;
  if(outline.geojsonUrl||outline.queryUrl||outline.url)return true;
  if(outline.layerUrl||outline.arcgisLayerUrl||outline.gisLayerUrl)return true;
  if(outline.serviceUrl&&outline.layerId!==undefined)return true;
  return false;
}
function areaOutlineIsAvailable(outline){
  if(!outline)return false;
  if(['needs_verification','not_available','not-yet-available','not_yet_available','none','missing'].includes(String(outline.status||'').toLowerCase()))return false;
  return areaOutlineHasFetchSource(outline);
}
function siteOutlineKey(site){
  const base=[site.id||site.slug||site.name||'site',site.stateCode||site.stateName||'',site.lat||'',site.lng||''].join('|');
  let hash=0;
  for(let i=0;i<base.length;i++){hash=((hash<<5)-hash)+base.charCodeAt(i);hash|=0;}
  return 'outline_'+Math.abs(hash);
}
function jsString(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');}
function registerAreaOutlineSite(site){
  const outline=areaOutlineCandidate(site);
  if(!outline)return '';
  const key=siteOutlineKey(site);
  app.areaOutline.registry[key]=site;
  return key;
}
function areaOutlinePopup(site){
  const outline=areaOutlineCandidate(site);
  if(!outline)return '';
  const key=registerAreaOutlineSite(site);
  const exact=outline.exactCampingBoundary?'Exact legal camping boundary claimed by source':'Context boundary only';
  const caution=outline.caution||'Context outline only — not a legal campsite boundary.';
  if(areaOutlineIsAvailable(outline)){
    return `<div class="popup-notice area-outline-notice"><strong>Official area outline available.</strong><br>${esc(exact)}. ${esc(caution)}</div><div class="popup-actions"><button class="secondary" type="button" onclick="window.__campingApp&&window.__campingApp.showAreaOutlineByKey&&window.__campingApp.showAreaOutlineByKey('${jsString(key)}')">Show official area outline</button><button class="secondary" type="button" onclick="window.__campingApp&&window.__campingApp.clearAreaOutline&&window.__campingApp.clearAreaOutline()">Clear outline</button></div>`;
  }
  if(outline.status&&outline.status!=='available'){
    return `<div class="popup-notice area-outline-notice"><strong>Area outline not import-ready.</strong><br>${esc(caution)}</div>`;
  }
  return '';
}
function addQueryParams(url,params){
  const u=new URL(url,window.location.href);
  Object.entries(params).forEach(([k,v])=>{if(!u.searchParams.has(k))u.searchParams.set(k,v);});
  return u.href;
}
function areaOutlineArcgisUrl(outline){
  let layer=outline.layerUrl||outline.arcgisLayerUrl||outline.gisLayerUrl||'';
  if(!layer&&outline.serviceUrl&&outline.layerId!==undefined){
    layer=String(outline.serviceUrl).replace(/\/+$/,'')+'/'+String(outline.layerId).replace(/^\/+/,'');
  }
  if(!layer)return '';
  let url=String(layer).replace(/\/+$/,'');
  if(!/\/query$/i.test(url))url+='/query';
  const where=outline.where||outline.filter||outline.query||outline.countyFilter||'1=1';
  return addQueryParams(url,{where,outFields:outline.outFields||'*',returnGeometry:'true',outSR:outline.outSR||4326,f:'geojson'});
}
function areaOutlineFetchUrl(outline){
  if(!outline)return '';
  if(outline.queryUrl)return String(outline.queryUrl);
  if(outline.geojsonUrl)return String(outline.geojsonUrl);
  if(outline.url)return String(outline.url);
  return areaOutlineArcgisUrl(outline);
}
function normalizeAreaGeoJson(data){
  if(!data)throw new Error('No outline data returned.');
  if(data.type==='FeatureCollection'||data.type==='Feature')return data;
  if(Array.isArray(data.features)&&data.features.length&&data.features[0].geometry)return {type:'FeatureCollection',features:data.features};
  throw new Error('Outline source did not return GeoJSON geometry.');
}
async function loadAreaOutlineGeoJson(outline){
  if(outline.geojson||outline.featureCollection)return normalizeAreaGeoJson(outline.geojson||outline.featureCollection);
  const url=areaOutlineFetchUrl(outline);
  if(!url)throw new Error('No fetchable official outline URL is attached to this record.');
  const cacheKey=url;
  if(app.areaOutline.cache[cacheKey])return app.areaOutline.cache[cacheKey];
  const data=await fetchJsonWithTimeout(url,30000);
  const geo=normalizeAreaGeoJson(data);
  app.areaOutline.cache[cacheKey]=geo;
  return geo;
}
function areaOutlineStyle(feature){
  const props=(feature&&feature.properties)||{};
  const owner=String(props.ownerclassification||props.OWNERCLASSIFICATION||'').toLowerCase();
  if(owner && !/usda\s+forest\s+service/.test(owner)){
    return {color:'#8a4f13',weight:2,opacity:.9,fillColor:'#d6a24a',fillOpacity:.24,dashArray:'4 4'};
  }
  if(/usda\s+forest\s+service/.test(owner)){
    return {color:'#285d42',weight:2,opacity:.92,fillColor:'#6fa27f',fillOpacity:.18,dashArray:null};
  }
  return {color:'#285d42',weight:3,opacity:.95,fillColor:'#7aa68f',fillOpacity:.12,dashArray:'8 5'};
}

function normalizeStandaloneAreaOutline(raw){
  if(!raw||typeof raw!=='object')return null;
  const outline=raw.areaOutline&&typeof raw.areaOutline==='object'?Object.assign({},raw.areaOutline):Object.assign({},raw);
  const id=String(raw.id||outline.id||siteOutlineKey({name:raw.name||outline.name||'outline',stateCode:raw.stateCode||outline.stateCode||''}));
  const name=raw.name||outline.name||'Official area outline';
  outline.id=id;
  outline.name=name;
  outline.status=String(outline.status||raw.status||'available').toLowerCase().replace(/\s+/g,'_');
  outline.stateCode=raw.stateCode||outline.stateCode||'';
  outline.category=raw.category||outline.category||'Official area outline';
  outline.sourceName=outline.sourceName||raw.sourceName||'Official source';
  outline.sourceUrl=outline.sourceUrl||raw.sourceUrl||'';
  outline.boundaryRepresents=outline.boundaryRepresents||raw.boundaryRepresents||'Official context boundary';
  outline.caution=outline.caution||raw.caution||'Context outline only — not a legal campsite boundary.';
  outline.exactCampingBoundary=!!(outline.exactCampingBoundary||raw.exactCampingBoundary);
  return {id,name,stateCode:outline.stateCode,category:outline.category,areaOutline:outline,outlineStandalone:true};
}
function standaloneAreaOutlineRecords(){
  const list=Array.isArray(window.CAMPING_AREA_OUTLINES)?window.CAMPING_AREA_OUTLINES:[];
  return list.map(normalizeStandaloneAreaOutline).filter(Boolean);
}
function outlineLayerKey(site){
  const outline=areaOutlineCandidate(site)||{};
  const raw=String(outline.campingLayer||outline.layerKey||outline.appLayer||site.campingLayer||site.layerKey||site.layer||'').toLowerCase();
  if(raw)return raw;
  const cat=String(site.category||outline.category||'').toLowerCase();
  if(cat.includes('boondocking')||cat.includes('dispersed'))return 'boondocking';
  return '';
}
function outlineStateMatches(site){
  const state=String(site.stateCode||site.state||'').toUpperCase();
  return !state||app.enabledStates.has(state);
}
function boondockingOutlineRecords(){
  const records=(app.areaOutline&&Array.isArray(app.areaOutline.standalone)?app.areaOutline.standalone:standaloneAreaOutlineRecords());
  return records.filter(site=>outlineLayerKey(site)==='boondocking'&&outlineStateMatches(site)&&areaOutlineIsAvailable(areaOutlineCandidate(site)));
}
async function showBoondockingAreaOutlines(){
  const records=boondockingOutlineRecords();
  if(!records.length){notify('No official boondocking rule-area outlines are available for the selected states.',6000);return;}
  setLoading(true,'Loading official boondocking outlines…');
  try{
    for(const site of records){
      await showAreaOutlineByKey(site.id,{fit:false});
    }
    updateAreaOutlinePanel();
    fitAreaOutline();
    notify(`Showing ${records.length} official boondocking rule-area outline${records.length===1?'':'s'}. Context only — not campsite pins.`,6500);
  }finally{
    setLoading(false);
  }
}
function registerStandaloneAreaOutlines(){
  if(!app.areaOutline)return [];
  const records=standaloneAreaOutlineRecords();
  app.areaOutline.standalone=records;
  records.forEach(site=>{app.areaOutline.registry[site.id]=site;});
  renderAreaOutlineList();
  return records;
}
function areaOutlineRecordsForSelectedStates(){
  return (app.areaOutline&&Array.isArray(app.areaOutline.standalone)?app.areaOutline.standalone:standaloneAreaOutlineRecords())
    .filter(site=>outlineStateMatches(site)&&areaOutlineIsAvailable(areaOutlineCandidate(site)))
    .sort((a,b)=>String(a.stateCode||'').localeCompare(String(b.stateCode||''))||String(a.name).localeCompare(String(b.name)));
}
function areaOutlineRecordsByState(records){
  const byState={};
  (records||[]).forEach(site=>{const code=String(site.stateCode||site.state||'Other').toUpperCase();(byState[code]||(byState[code]=[])).push(site);});
  return byState;
}
function renderAreaOutlineList(){
  const box=$('areaOutlineChecklist');
  if(!box)return;
  const records=areaOutlineRecordsForSelectedStates();
  const active=app.areaOutline&&app.areaOutline.active?app.areaOutline.active:{};
  const byState=areaOutlineRecordsByState(records);
  const selectedCodes=sortStateCodes([...app.enabledStates]).filter(code=>byState[code]&&byState[code].length);
  const stateHtml=code=>{
    const rows=byState[code]||[];
    const activeCount=rows.filter(site=>active[site.id]).length;
    const checked=rows.length&&activeCount===rows.length;
    return `<label class="check outline-state-check"><input type="checkbox" data-outline-state="${esc(code)}" ${checked?'checked':''}><span><strong>${esc(stateLabel(code))}</strong><br><span class="mini-note">All ${rows.length} official context outline${rows.length===1?'':'s'}</span></span><span class="meta">${activeCount}/${rows.length}</span></label>`;
  };
  if(!records.length){
    box.innerHTML=app.enabledStates.size?'<div class="mini-note">No official context outlines are available for the selected state(s).</div>':'<div class="mini-note">Select one or more states to list official context outlines.</div>';
  }else{
    box.innerHTML=selectedCodes.map(stateHtml).join('');
  }
  $$('input[data-outline-state]',box).forEach(input=>{
    const rows=byState[input.dataset.outlineState]||[];
    const activeCount=rows.filter(site=>active[site.id]).length;
    input.indeterminate=activeCount>0&&activeCount<rows.length;
    input.onchange=()=>toggleAreaOutlineState(input.dataset.outlineState,input.checked);
  });
  const count=$('areaOutlineCount');
  if(count){
    const boondockingCount=boondockingOutlineRecords().length;
    const stateText=selectedCodes.length?` for ${selectedCodes.map(stateLabel).join(', ')}`:'';
    const extra=boondockingCount?` ${boondockingCount} official boondocking/dispersed rule-area outline${boondockingCount===1?' is':'s are'} available${stateText}.`:'';
    count.textContent=records.length?`${records.length} official context outline${records.length===1?'':'s'} listed for the selected state${app.enabledStates.size===1?'':'s'}.${extra} Area outlines are selected by state group, not one at a time.`:'No official context outlines listed for the selected state selection.';
  }
  const summary=$('areaOutlineSelectionSummary');
  if(summary){
    const activeSelected=records.filter(site=>active[site.id]).length;
    summary.textContent=activeSelected?`${activeSelected} shown`:(records.length?`${selectedCodes.length} state group${selectedCodes.length===1?'':'s'}`:'None available');
  }
}
async function showSelectedAreaOutline(){
  const checkedStates=$$('#areaOutlineChecklist input[data-outline-state]:checked').map(i=>i.dataset.outlineState);
  const records=areaOutlineRecordsForSelectedStates();
  const byState=areaOutlineRecordsByState(records);
  if(checkedStates.length){
    for(const code of checkedStates){
      for(const site of (byState[code]||[]))await showAreaOutlineByKey(site.id,{fit:false});
    }
  }
  if(!activeAreaOutlineList().length){notify('Check one or more state area groups first.');return;}
  fitAreaOutline();
}
async function toggleAreaOutlineState(code,on){
  const records=areaOutlineRecordsByState(areaOutlineRecordsForSelectedStates())[String(code||'').toUpperCase()]||[];
  if(on){
    for(const site of records)await showAreaOutlineByKey(site.id,{fit:false});
    fitAreaOutline();
    return;
  }
  records.forEach(site=>hideAreaOutlineByKey(site.id));
  fitAreaOutline();
}
async function toggleAreaOutlineByKey(key,on){
  if(on)return showAreaOutlineByKey(key,{fit:false});
  hideAreaOutlineByKey(key);
}

function activeAreaOutlineList(){
  const active=app.areaOutline&&app.areaOutline.active?app.areaOutline.active:{};
  return Object.values(active);
}
function syncOutlineCheckboxes(){
  const box=$('areaOutlineChecklist');
  if(!box)return;
  const active=app.areaOutline&&app.areaOutline.active?app.areaOutline.active:{};
  const records=areaOutlineRecordsForSelectedStates();
  const byState=areaOutlineRecordsByState(records);
  $$('#areaOutlineChecklist input[data-outline-state]').forEach(input=>{
    const rows=byState[input.dataset.outlineState]||[];
    const activeCount=rows.filter(site=>active[site.id]).length;
    input.checked=!!rows.length&&activeCount===rows.length;
    input.indeterminate=activeCount>0&&activeCount<rows.length;
  });
}
function updateAreaOutlinePanel(){
  const el=$('areaOutlineStatus');
  if(!el)return;
  const active=activeAreaOutlineList();
  if(!active.length){el.textContent='No official area outline is currently shown.';syncOutlineCheckboxes();return;}
  el.innerHTML=`Showing ${active.length} official context outline${active.length===1?'':'s'}:<br>`+
    active.map(o=>`<strong>${esc(o.name)}</strong><br><span>${esc(o.boundaryRepresents||'Official context boundary')}</span>${o.officialCampingLegality?`<br><span>${esc(o.officialCampingLegality)}</span>`:''}<br><span>${esc(o.caution||'Context outline only — not a legal campsite boundary.')}</span>`).join('<hr class="outline-divider">');
  syncOutlineCheckboxes();
}
function clearAreaOutline(){
  if(app.areaOutline&&app.areaOutline.layer)app.areaOutline.layer.clearLayers();
  if(app.areaOutline){app.areaOutline.active={};app.areaOutline.layers={};app.areaOutline.labelMarkers=[];}
  updateAreaOutlinePanel();
  renderAreaOutlineList();
  notify('Area outlines cleared.');
}
function hideAreaOutlineByKey(key){
  if(!(app.areaOutline&&key))return;
  const layer=app.areaOutline.layers&&app.areaOutline.layers[key];
  if(layer&&app.areaOutline.layer)app.areaOutline.layer.removeLayer(layer);
  if(app.areaOutline.layers)delete app.areaOutline.layers[key];
  if(app.areaOutline.active)delete app.areaOutline.active[key];
  if(Array.isArray(app.areaOutline.labelMarkers))app.areaOutline.labelMarkers=app.areaOutline.labelMarkers.filter(m=>m._areaOutlineKey!==key);
  updateAreaOutlinePanel();
  renderAreaOutlineList();
}
function fitAreaOutline(){
  if(!(app.areaOutline&&app.areaOutline.layer))return;
  const b=app.areaOutline.layer.getBounds&&app.areaOutline.layer.getBounds();
  if(b&&b.isValid())app.map.fitBounds(b,{padding:[34,34],animate:false}); updateAreaOutlineLabelVisibility();
}

function areaRulesHtml(site,outline){
  const sourceUrl=outline.sourceUrl||areaOutlineFetchUrl(outline)||site.website||'';
  const details=Array.isArray(outline.rulesDetails)?outline.rulesDetails:[];
  const rules=[
    ['Boundary represents',outline.boundaryRepresents],
    ['Camping rule summary',outline.officialCampingLegality||outline.rulesSummary||site.officialCampingLegality],
    ['Exact legal camping boundary',outline.exactCampingBoundary?'Yes':'No — context boundary only'],
    ['Caution',outline.caution],
    ['Source',outline.sourceName]
  ].filter(r=>r[1]);
  return `<div class="area-rules-popup"><div class="popup-title">${esc(site.name||outline.name||'Official area outline')}</div><div class="popup-notice">Context outline only — not a legal campsite boundary.</div><div class="popup-grid">${rules.map(r=>`<div class="popup-row"><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join('')}</div>${details.length?`<div class="area-rules-detail"><strong>Rule details to verify before camping</strong><ul>${details.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></div>`:''}${sourceUrl?`<div class="popup-actions"><a class="secondary" target="_blank" rel="noopener" href="${esc(sourceUrl)}">Official source</a></div>`:''}</div>`;
}
function areaOutlineLabelText(site,idx,total){
  let name=String(site.name||'Area outline').replace('Chequamegon-Nicolet National Forest','Cheq-Nicolet NF').replace('National Forest','NF').replace('County Forest','County Forest');
  if(total>1)name+=` ${idx+1}`;
  return name;
}
function ringSignedAreaXY(ring,lat0){
  if(!Array.isArray(ring)||ring.length<4)return 0;
  const cx=Math.cos(toRad(lat0||0));
  let sum=0;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=Number(ring[i][0])*69*cx, yi=Number(ring[i][1])*69;
    const xj=Number(ring[j][0])*69*cx, yj=Number(ring[j][1])*69;
    sum+=(xj*yi-xi*yj);
  }
  return sum/2;
}
function polygonLabelPoint(ring){
  if(!Array.isArray(ring)||!ring.length)return null;
  const pts=ring.map(p=>({lng:Number(p[0]),lat:Number(p[1])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  if(!pts.length)return null;
  let minLat=Infinity,maxLat=-Infinity,minLng=Infinity,maxLng=-Infinity;
  pts.forEach(p=>{minLat=Math.min(minLat,p.lat);maxLat=Math.max(maxLat,p.lat);minLng=Math.min(minLng,p.lng);maxLng=Math.max(maxLng,p.lng);});
  const lat0=(minLat+maxLat)/2, cx=Math.cos(toRad(lat0||0));
  let a=0,cxSum=0,cySum=0;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].lng*69*cx, yi=pts[i].lat*69;
    const xj=pts[j].lng*69*cx, yj=pts[j].lat*69;
    const cross=xj*yi-xi*yj;
    a+=cross; cxSum+=(xj+xi)*cross; cySum+=(yj+yi)*cross;
  }
  a=a/2;
  let candidate=null;
  if(Math.abs(a)>0.000001){
    const x=cxSum/(6*a), y=cySum/(6*a);
    candidate={lat:y/69,lng:x/(69*cx)};
  }
  function inside(p){
    let c=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const pi=pts[i],pj=pts[j];
      if(((pi.lat>p.lat)!==(pj.lat>p.lat))&&(p.lng<(pj.lng-pi.lng)*(p.lat-pi.lat)/(pj.lat-pi.lat)+pi.lng))c=!c;
    }
    return c;
  }
  if(candidate&&inside(candidate))return candidate;
  const center={lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2};
  if(inside(center))return center;
  let best=null,bestD=Infinity;
  for(let rows=5;rows<=13;rows+=4){
    for(let r=1;r<rows;r++){
      for(let c=1;c<rows;c++){
        const p={lat:minLat+(maxLat-minLat)*r/rows,lng:minLng+(maxLng-minLng)*c/rows};
        if(!inside(p))continue;
        const d=(p.lat-center.lat)**2+(p.lng-center.lng)**2;
        if(d<bestD){bestD=d;best=p;}
      }
    }
    if(best)return best;
  }
  return pts[Math.floor(pts.length/2)]||center;
}
function areaSqMilesForRing(ring){
  if(!Array.isArray(ring)||ring.length<4)return 0;
  let minLat=Infinity,maxLat=-Infinity;
  ring.forEach(p=>{const lat=Number(p[1]);if(Number.isFinite(lat)){minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);}});
  return Math.abs(ringSignedAreaXY(ring,(minLat+maxLat)/2));
}
function polygonPartsFromGeoJson(data){
  const features=data&&data.type==='FeatureCollection'?data.features:(data&&data.type==='Feature'?[data]:[{type:'Feature',geometry:data}]);
  const parts=[];
  (features||[]).forEach(feature=>{
    const g=feature&&feature.geometry;
    if(!g)return;
    if(g.type==='Polygon'&&Array.isArray(g.coordinates)&&g.coordinates[0])parts.push(g.coordinates[0]);
    if(g.type==='MultiPolygon'&&Array.isArray(g.coordinates))g.coordinates.forEach(poly=>{if(poly&&poly[0])parts.push(poly[0]);});
  });
  return parts;
}
function ringLatLngBounds(ring){
  const pts=(Array.isArray(ring)?ring:[]).map(p=>[Number(p[1]),Number(p[0])]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
  return pts.length?L.latLngBounds(pts):null;
}
function areaOutlineLabelShouldShow(bounds){
  if(!app.map||!bounds||!bounds.isValid||!bounds.isValid())return true;
  const view=app.map.getBounds&&app.map.getBounds();
  if(!view||!view.isValid||!view.isValid())return true;
  const areaLat=Math.max(0.002,Math.abs(bounds.getNorth()-bounds.getSouth()));
  const areaLng=Math.max(0.002,Math.abs(bounds.getEast()-bounds.getWest()));
  const viewLat=Math.abs(view.getNorth()-view.getSouth());
  const viewLng=Math.abs(view.getEast()-view.getWest());
  return viewLat<=areaLat*1.5&&viewLng<=areaLng*1.5;
}
function updateAreaOutlineLabelVisibility(){
  const labels=app.areaOutline&&Array.isArray(app.areaOutline.labelMarkers)?app.areaOutline.labelMarkers:[];
  labels.forEach(marker=>{
    const el=marker.getElement&&marker.getElement();
    if(!el)return;
    el.classList.toggle('area-outline-label-hidden',!areaOutlineLabelShouldShow(marker._areaOutlineLabelBounds));
  });
}
function labelRingsForOutline(geo){
  const parts=polygonPartsFromGeoJson(geo).map(ring=>({ring,area:areaSqMilesForRing(ring),point:polygonLabelPoint(ring),bounds:ringLatLngBounds(ring)})).filter(p=>p.point&&p.area>0.05);
  if(!parts.length)return [];
  parts.sort((a,b)=>b.area-a.area);
  const max=parts[0].area;
  const kept=[];
  parts.forEach(p=>{
    if(kept.length>=8)return;
    if(p.area>=Math.max(4,max*0.08)||kept.length===0)kept.push(p);
  });
  return kept;
}
function addAreaOutlineLabels(key,site,outline,group,geo){
  const parts=labelRingsForOutline(geo);
  const total=parts.length||1;
  parts.forEach((part,idx)=>{
    const icon=L.divIcon({
      className:'',
      html:`<button class="area-outline-label" type="button">${esc(areaOutlineLabelText(site,idx,total))}</button>`,
      iconSize:null,
      iconAnchor:[0,0]
    });
    const marker=L.marker([part.point.lat,part.point.lng],{icon,interactive:true,keyboard:true,title:`Rules for ${site.name||'area outline'}`})
      .bindPopup(areaRulesHtml(site,outline),{maxWidth:390});
    marker._areaOutlineKey=key;
    marker._areaOutlineLabelBounds=part.bounds;
    marker.on('click',()=>marker.openPopup());
    marker.addTo(group);
    if(app.areaOutline&&Array.isArray(app.areaOutline.labelMarkers))app.areaOutline.labelMarkers.push(marker);
  });
}

async function showAreaOutlineByKey(key,opts={}){
  const site=app.areaOutline.registry[key];
  if(!site){notify('Area outline record not found for this popup. Reopen the marker and try again.',5000);return;}
  const outline=areaOutlineCandidate(site);
  if(!areaOutlineIsAvailable(outline)){notify('This record does not have an import-ready official outline source yet.',5000);return;}
  if(app.areaOutline.layers&&app.areaOutline.layers[key]){updateAreaOutlinePanel();renderAreaOutlineList();if(opts.fit!==false)fitAreaOutline();updateAreaOutlineLabelVisibility();return;}
  setLoading(true,'Loading official area outline…');
  try{
    const geo=await loadAreaOutlineGeoJson(outline);
    const group=L.geoJSON(geo,{style:areaOutlineStyle,pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:6,weight:2,opacity:.9,fillOpacity:.25})});
    addAreaOutlineLabels(key,site,outline,group,geo);
    group.addTo(app.areaOutline.layer);
    updateAreaOutlineLabelVisibility();
    app.areaOutline.layers[key]=group;
    app.areaOutline.active[key]={name:site.name||'Area outline',boundaryRepresents:outline.boundaryRepresents,caution:outline.caution,sourceUrl:outline.sourceUrl||areaOutlineFetchUrl(outline),officialCampingLegality:outline.officialCampingLegality||outline.rulesSummary||site.officialCampingLegality};
    updateAreaOutlinePanel();
    renderAreaOutlineList();
    if(opts.fit!==false)fitAreaOutline();
    updateAreaOutlineLabelVisibility();
    notify('Official area outline shown. Context only — not a legal campsite boundary.',5500);
  }catch(err){
    console.error(err);
    notify(err&&err.message?err.message:'Could not load official area outline.',7000);
  }finally{setLoading(false)}
}
app.showAreaOutlineByKey=showAreaOutlineByKey;
app.hideAreaOutlineByKey=hideAreaOutlineByKey;
app.clearAreaOutline=clearAreaOutline;

function siteText(site){return Object.values(site||{}).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase()}
function waterFilterText(site){
  return [
    site.waterfront,site.waterFront,site.waterfrontType,site.waterFrontType,site.shoreline,site.shore,
    site.water,site.waterSource,site.waterSources,site.waterbody,site.waterBody,site.waterBodyName,
    site.waterAccess,site.boatAccess,site.canoeAccess,site.kayakAccess,site.paddleAccess,
    site.setting,site.locationNotes,site.accessNotes,site.activities,site.amenities,site.description,site.summary,site.notes
  ]
    .filter(v=>v!==undefined&&v!==null&&String(v).trim())
    .map(v=>String(v).toLowerCase())
    .join(' ');
}
function waterTypeText(site){
  return [site.waterfrontType,site.waterFrontType,site.waterbody,site.waterBody,site.waterBodyName,site.water,site.waterSource,site.waterSources,site.description,site.summary,site.notes]
    .filter(v=>v!==undefined&&v!==null&&String(v).trim())
    .map(v=>String(v).toLowerCase())
    .join(' ');
}
function hasWaterfrontContext(text){
  if(!text)return false;
  if(/\b(no|not|without)\s+(?:lake|river|creek|stream|shore|waterfront|water access|waterfront access|boat access)\b/.test(text))return false;
  if(/\b(lakefront|riverfront|waterfront|shoreline|shore line|on the shore|on shore|beachfront|water's edge|waters edge)\b/.test(text))return true;
  if(/\b(on|along|at|beside|adjacent to|bordering|borders|bordered by|fronting|overlooking|overlooks|right on|located on|situated on|set on|banks? of|edge of)\b.{0,80}\b(lake|pond|reservoir|flowage|impoundment|river|creek|cr\.?|stream|brook|branch|fork|run|rapids|shore|beach)\b/.test(text))return true;
  if(/\b(lake|pond|reservoir|flowage|impoundment|river|creek|cr\.?|stream|brook|branch|fork|run|rapids)\b.{0,80}\b(shore|shoreline|bank|banks|beach|boat launch|boat landing|canoe landing|kayak launch|dock|pier|water access|water-access|paddle-in|canoe-in|boat-in|island campsite|island site)\b/.test(text))return true;
  if(/\b(boat[- ]?in|canoe[- ]?in|kayak[- ]?in|paddle[- ]?in|water[- ]access|boat launch|boat landing|canoe landing|kayak launch|dock|pier|island campsite|island site)\b/.test(text))return true;
  return false;
}
function siteMatchesWater(site){
  normalizeFilters();
  const water=app.filters.water||{};
  const wantLake=!!water.lake;
  const wantRiverCreek=!!water.rivercreek;
  if(!wantLake&&!wantRiverCreek)return true;
  const text=waterFilterText(site);
  if(!hasWaterfrontContext(text))return false;
  const typeText=waterTypeText(site)||text;
  const isLake=/\b(lake|pond|reservoir|flowage|impoundment)\b/.test(typeText);
  const isRiverCreek=/\b(river|creek|cr\.?|stream|brook|branch|fork|run|rapids)\b/.test(typeText);
  return (wantLake&&isLake)||(wantRiverCreek&&isRiverCreek);
}
function costFilterText(site){
  return [site.costDisplay,site.cost,site.fees,site.fee,site.price,site.rate,site.rates,site.siteFee,site.campingFee,site.reservationFee]
    .filter(v=>v!==undefined&&v!==null&&String(v).trim())
    .map(v=>String(v).toLowerCase())
    .join(' ');
}
function costExplicitlyFree(site){
  const text=costFilterText(site);
  const paidAmounts=[...text.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map(m=>Number(m[1])).filter(n=>Number.isFinite(n)&&n>0);
  if(paidAmounts.length)return false;
  if(site.costIsFree===true)return true;
  if(!text)return false;
  if(/\bnot free\b|\bno free camping\b/.test(text))return false;
  return /\bfree\b|\bno fee\b|\bno charge\b|\$\s*0(?:\D|$)|\b0\s*(?:dollars?|usd)\b/.test(text);
}
function costDollarAmounts(site){
  const text=costFilterText(site);
  return [...text.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map(m=>Number(m[1])).filter(Number.isFinite);
}
function siteMatches(site){
  const key=layerKey(site);
  if(key==='info')return false;
  if(!siteWithinNearMeRange(site))return false;
  if(!siteWithinRouteRange(site))return false;
  if(!siteMatchesWater(site))return false;
  if(app.restOnlyMode)return key==='rest-truck';
  if(!app.enabledLayers.has(key))return false;
  const text=siteText(site);
  const max=app.filters.maxCost||'';
  if(max){
    const isFree=costExplicitlyFree(site);
    if(max==='0'){
      if(!isFree)return false;
    }else{
      const nums=costDollarAmounts(site);
      if(!isFree&&(nums.length===0||Math.min(...nums)>Number(max)))return false;
    }
  }
  const access=app.filters.access||{};
  if(access.twowd&&!/2wd|passenger car|paved|gravel road|easy access/.test(text))return false;
  if(access.hc&&!/high clearance|rough road|two[- ]track/.test(text))return false;
  if(access.fw&&!/4wd|four[- ]wheel/.test(text))return false;
  if(app.filters.chips&&app.filters.chips.showers&&!(/showers?:\s*(yes|available)|\bshowers\b/.test(text)&&!/no showers|showers?:\s*no/.test(text)))return false;
  return true;
}
function renderMarkers(fit){app.markerLayer.clearLayers(); if(app.areaOutline){app.areaOutline.registry={}; (app.areaOutline.standalone||[]).forEach(site=>{app.areaOutline.registry[site.id]=site;});} const bounds=[]; app.shownSites=[]; app.sites.forEach(site=>{if(!Number.isFinite(Number(site.lat))||!Number.isFinite(Number(site.lng))||!siteMatches(site))return; const m=L.marker([Number(site.lat),Number(site.lng)],{icon:markerIcon(site)}).bindPopup(popup(site)); app.markerLayer.addLayer(m); bounds.push([Number(site.lat),Number(site.lng)]); app.shownSites.push(site)}); const total=app.sites.filter(s=>layerKey(s)!=='info'&&Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))&&siteWithinNearMeRange(s)&&siteWithinRouteRange(s)&&(!app.restOnlyMode||layerKey(s)==='rest-truck')).length; const countEl=$('layerSiteCount'); const routeSuffix=(app.routeSearch&&app.routeSearch.active)?` within ${app.routeSearch.bufferMiles||25} mi of route`:''; if(countEl){
    const boOutlineCount=(app.enabledLayers&&app.enabledLayers.has('boondocking'))?boondockingOutlineRecords().length:0;
    const outlineSuffix=boOutlineCount?` + ${boOutlineCount} official boondocking rule-area outline${boOutlineCount===1?'':'s'} available`:'';
    countEl.textContent=app.restOnlyMode?`Rest stops only: ${app.shownSites.length} of ${total} loaded sites${routeSuffix}`:`Showing ${app.shownSites.length} of ${total} loaded sites${routeSuffix}${outlineSuffix}`;
  } updateRouteStatus(); const statusEl=$('statusLine'); if(statusEl && !statusEl.dataset.lockedNotice){statusEl.innerHTML='This app is still in active development. Errors may occur but should be corrected quickly. To report issues contact: <a href="mailto:tpoirier@nmu.edu">tpoirier@nmu.edu</a>'; statusEl.dataset.lockedNotice='1';} updateRestRoadsideDiagnostics(); updateFilterStatus(); renderReferences(); if(fit){fitCurrentPreferredView()}}
function popup(s){const siteLat=Number(s.lat),siteLng=Number(s.lng);const lat=siteLat.toFixed(6),lng=siteLng.toFixed(6);const userCenter=app.localAreaCenter;const hasUserLocation=Array.isArray(userCenter)&&Number.isFinite(Number(userCenter[0]))&&Number.isFinite(Number(userCenter[1]));const straightMiles=hasUserLocation?distanceMiles(Number(userCenter[0]),Number(userCenter[1]),siteLat,siteLng):null;const distanceText=Number.isFinite(straightMiles)?`${straightMiles<10?straightMiles.toFixed(1):Math.round(straightMiles)} mi straight-line`:'';const directionsUrl=hasUserLocation?`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(Number(userCenter[0]).toFixed(6)+','+Number(userCenter[1]).toFixed(6))}&destination=${encodeURIComponent(lat+','+lng)}&travelmode=driving`:`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;const links=[];if(s.website)links.push(`<a href="${esc(s.website)}" target="_blank" rel="noopener">Website</a>`); const sourceLink=restRoadsideSourceLink(s); if(sourceLink)links.push(sourceLink);const markerNotice=markerTypeNotice(s);const rows=[['Type',layerDef(layerKey(s)).label],['Distance from you',distanceText],['Traveler stop',isTravelerStop(s)?'Yes — useful for a short public pull-off/rest stop.':''],['Camping',isTravelerStop(s)?'Not implied. Use overnight-parking status and posted rules separately.':''],['Facility',s.facilityType],['Useful for',s.travelerUse],['Owner level',s.ownerLevel],['Current status',s.currentStatus],['Overnight parking',s.overnightParking],['Local likelihood',s.localParkingLikelihood],['Parking-policy note',s.parkingPolicyNotes],['Location evidence',s.locationEvidenceSummary],['Evidence confidence',s.evidenceConfidence],['Parking fit',s.parkingFit],['Season status',s.seasonStatus],['Season notes',s.seasonNotes],['Route',s.routeName],['Direction',s.routeDirection],['Mile marker',s.mileMarker],['Honoree',s.honoree],['Cost',s.costDisplay||s.cost],['Showers',s.showers],['Access',s.access],['Amenities',s.amenities],['Season',s.season],['Rating',s.rating],['Source',s.sourceName],['Location precision',s.locationPrecision],['Last checked',s.lastChecked]].filter(r=>r[1]);return `<div><div class="popup-title">${esc(s.name||'Unnamed site')}</div><div class="popup-meta">${esc(s.stateName||s.stateCode||'')} · ${lat}, ${lng}</div>${markerNotice?`<div class="popup-notice">${esc(markerNotice)}</div>`:''}${areaOutlinePopup(s)}<div class="popup-grid">${rows.map(r=>`<div class="popup-row"><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join('')}</div>${s.description?`<div class="popup-copy">${esc(s.description)}</div>`:''}${links.length?`<div class="popup-actions">${links.join('')}</div>`:''}<div class="popup-actions"><button class="secondary" onclick="navigator.clipboard&&navigator.clipboard.writeText('${lat}, ${lng}')">Copy coordinates</button><a class="secondary" target="_blank" rel="noopener" href="${directionsUrl}">${hasUserLocation?'Driving directions':'Google Maps'}</a><a class="secondary" target="_blank" rel="noopener" href="https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(s.name||'Camping site')}">Apple Maps</a></div></div>`}
function updateFilterStatus(){normalizeFilters();let parts=[];if(app.filters.maxCost==='0')parts.push('Free');else if(app.filters.maxCost)parts.push('≤ $'+app.filters.maxCost);const water=app.filters.water||{};if(water.lake)parts.push('Waterfront lake/pond/flowage');if(water.rivercreek)parts.push('Waterfront river/creek');const access=app.filters.access||{};if(access.twowd)parts.push('2WD');if(access.hc)parts.push('High clearance');if(access.fw)parts.push('4WD');if(app.filters.chips&&app.filters.chips.showers)parts.push('Showers');const el=$('filterStatus');if(el)el.textContent=parts.length?`Filters active: ${parts.join(' · ')}`:'No filters active.'}
function runSearch(){const q=$('searchInput').value.trim();const out=$('searchResults');out.innerHTML='';if(!q)return;const coord=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(coord){app.map.setView([Number(coord[1]),Number(coord[2])],13);return}const hits=app.sites.filter(s=>siteText(s).includes(q.toLowerCase())).slice(0,12);out.innerHTML=hits.length?hits.map(s=>`<button class="search-result" type="button" data-lat="${s.lat}" data-lng="${s.lng}"><strong>${esc(s.name)}</strong><br><span class="muted">${esc(s.stateName||s.stateCode||'')} · ${esc(layerDef(layerKey(s)).label)}</span></button>`).join(''):'<div class="mini-note">No loaded matching sites.</div>';$$('.search-result',out).forEach(b=>b.onclick=()=>app.map.setView([Number(b.dataset.lat),Number(b.dataset.lng)],13))}
const NEAR_ME_RADIUS_MILES=180;
const NEAR_ME_RADIUS_METERS=NEAR_ME_RADIUS_MILES*1609.344;
const LIVE_LOCATION_AUTO_START=false;
const LIVE_LOCATION_RELOAD_DISTANCE_MILES=25;
function toRad(v){return Number(v)*Math.PI/180}
function distanceMiles(aLat,aLng,bLat,bLng){const R=3958.7613;const dLat=toRad(bLat-aLat),dLng=toRad(bLng-aLng);const x=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function pointInBounds(lat,lng,b){return lat>=b[0][0]&&lat<=b[1][0]&&lng>=b[0][1]&&lng<=b[1][1]}
function stateNearLocation(code,lat,lng,radiusMiles=NEAR_ME_RADIUS_MILES){const b=STATE_BOUNDS[String(code).toUpperCase()];if(!b)return false;if(pointInBounds(lat,lng,b))return true;const closestLat=Math.max(b[0][0],Math.min(lat,b[1][0]));const closestLng=Math.max(b[0][1],Math.min(lng,b[1][1]));return distanceMiles(lat,lng,closestLat,closestLng)<=radiusMiles}
function mappedStatesNearLocation(lat,lng){const codes=mappedStateEntries().map(s=>s.code).filter(code=>stateNearLocation(code,lat,lng));return codes.length?codes:[DEFAULT_STATE]}
function showUserMarker(ll,accuracyMeters){
  const latLng=L.latLng(ll[0],ll[1]);
  const accuracy=Number(accuracyMeters);
  const radius=Number.isFinite(accuracy)&&accuracy>0?Math.max(accuracy,12):0;
  const icon=L.divIcon({className:'',html:`<span class="user-arrow-marker">${ICONS.navArrow}</span>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-12]});
  if(app.userMarker){app.userMarker.setLatLng(latLng);}else{app.userMarker=L.marker(latLng,{icon}).addTo(app.map).bindPopup(`You are here — live location is following you and showing roughly ${NEAR_ME_RADIUS_MILES} miles around you`);}
  if(radius){
    if(app.userAccuracyCircle){app.userAccuracyCircle.setLatLng(latLng).setRadius(radius);}else{app.userAccuracyCircle=L.circle(latLng,{radius,interactive:false,weight:1,opacity:.55,fillOpacity:.12}).addTo(app.map);}
  }
}
function fitNearMeRadius(ll){const circle=L.circle(ll,{radius:NEAR_ME_RADIUS_METERS});app.map.fitBounds(circle.getBounds(),{padding:[28,28],animate:false})}
function centerOnLiveLocation(ll){if(!app.map)return;const z=app.map.getZoom();app.map.setView(ll,Math.max(z||0,11),{animate:true});}
function liveLocationNeedsReload(lat,lng){
  if(!app.liveLocationLastLoadCenter)return true;
  return distanceMiles(app.liveLocationLastLoadCenter[0],app.liveLocationLastLoadCenter[1],lat,lng)>=LIVE_LOCATION_RELOAD_DISTANCE_MILES;
}
function siteWithinNearMeRange(site){
  if(!app.nearMeActive||!app.localAreaCenter)return true;
  const lat=Number(site.lat),lng=Number(site.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
  return distanceMiles(app.localAreaCenter[0],app.localAreaCenter[1],lat,lng)<=NEAR_ME_RADIUS_MILES;
}
async function applyNearMeLocation(lat,lng,accuracyMeters,options={}){
  const ll=[lat,lng];
  app.localAreaCenter=ll;
  showUserMarker(ll,accuracyMeters);
  const useNearMe=!!options.nearMe;
  if(useNearMe){
    app.nearMeActive=true;
    const shouldReload=!!options.forceReload||liveLocationNeedsReload(lat,lng);
    if(shouldReload&&!app.liveLocationLoading){
      app.liveLocationLoading=true;
      app.liveLocationLastLoadCenter=ll;
      const codes=mappedStatesNearLocation(lat,lng);
      app.enabledStates=new Set(codes);
      saveJson(STORE.states,[...app.enabledStates]);
      syncStateControls();
      app.sites=[];
      app.shownSites=[];
      renderMarkers(false);
      setLoading(true,`Loading local map area (${NEAR_ME_RADIUS_MILES} mi)…`);
      notify(`Near Me: loading sites within ${NEAR_ME_RADIUS_MILES} miles.`,3500);
      try{await loadEnabledStates(false);}finally{app.liveLocationLoading=false;setLoading(false);}
    }
    renderMarkers(false);
    syncStateControls();
    centerOnLiveLocation(ll);
    return;
  }
  renderMarkers(false);
  syncStateControls();
}
function startLiveLocation(force=false){
  if(!navigator.geolocation){setLocationStatus('Location is not available in this browser.');return notify('Location is not available in this browser.');}
  const manualNearMe=!!force;
  if(app.liveLocationStarted&&!manualNearMe)return;
  if(app.liveLocationWatchId!=null){navigator.geolocation.clearWatch(app.liveLocationWatchId);app.liveLocationWatchId=null;}
  app.liveLocationStarted=true;
  if(manualNearMe){
    app.nearMeActive=true;
    app.localAreaCenter=null;
    app.enabledStates=new Set();
    saveJson(STORE.states,[]);
    app.sites=[];
    app.shownSites=[];
    renderMarkers(false);
    syncStateControls();
    setLoading(true,'Getting your location for Near Me…');
    setLocationStatus('Waiting for location permission…');
    notify('Getting your location for Near Me…');
  }
  app.liveLocationWatchId=navigator.geolocation.watchPosition(pos=>{
    const c=pos.coords||{};
    applyNearMeLocation(c.latitude,c.longitude,c.accuracy,{nearMe:manualNearMe,forceReload:manualNearMe&&!app.liveLocationLastLoadCenter}).then(()=>setLocationStatus(manualNearMe?'Near Me is active.':'Live location is active.')).catch(e=>{console.error(e);setLoading(false);setLocationStatus('Could not update your live location.');notify('Could not update your live location.')});
  },err=>{
    app.liveLocationStarted=false;
    app.liveLocationWatchId=null;
    setLoading(false);
    const msg=err&&err.code===1?'Location permission was denied. Allow location for this site to use live location.':'Could not get your live location. Check browser/site location permission.';
    setLocationStatus(msg);notify(msg,6000);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:15000});
}
function nearMe(){requestLocationFromButton(true)}
function setDraftPoint(ll){app.draftPoint=ll;if(app.draftMarker)app.draftMarker.remove();app.draftMarker=L.marker(ll,{icon:L.divIcon({className:'',html:`<span class="map-pin pin-draft">${ICONS.draft}</span>`,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(app.map);$('draftCoords').textContent=`Draft point: ${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;openModal('addSiteModal')}
function clearDraft(){if(app.draftMarker)app.draftMarker.remove();app.draftMarker=null;app.draftPoint=null;$('draftCoords').textContent='No draft point selected.';['draftName','draftWebsite','draftNotes','draftCost','draftShowers','draftAccess','draftAmenities','draftTrailheads','draftSeason','draftReview','draftRating','draftExtraLinks'].forEach(id=>$(id).value='')}
function draftPayload(){const p=app.draftPoint;return {name:$('draftName').value.trim(),lat:p?p.lat:null,lng:p?p.lng:null,stateCode:$('draftState').value.trim().toUpperCase(),layer:$('draftCategory').value,website:$('draftWebsite').value.trim(),description:$('draftNotes').value.trim(),cost:$('draftCost').value.trim(),showers:$('draftShowers').value.trim(),access:$('draftAccess').value.trim(),amenities:$('draftAmenities').value.trim(),trailheads:$('draftTrailheads').value.trim(),season:$('draftSeason').value.trim(),reviewSummary:$('draftReview').value.trim(),rating:$('draftRating').value.trim(),extraLinks:$('draftExtraLinks').value.trim()}}
function appendDraft(){const d=draftPayload();if(!d.name)return notify('Add a site name first.');const line=JSON.stringify(d);app.draftQueue.push(line);saveJson(STORE.queue,app.draftQueue);$('draftQueue').value=app.draftQueue.join('\n');notify('Draft appended to queue.');openModal('queueModal')}
async function copyQueue(){try{await navigator.clipboard.writeText($('draftQueue').value);notify('Queue copied.')}catch{notify('Clipboard blocked; select and copy manually.')}}
function authEmail(){
  const route=$('routeAuthEmail')?.value.trim()||'';
  const account=$('sbEmail')?.value.trim()||'';
  return route||account;
}
function authPassword(){
  const route=$('routeAuthPassword')?.value||'';
  const account=$('sbPassword')?.value||'';
  return route||account;
}
function mirrorAuthFields(){
  const routeEmail=$('routeAuthEmail'),routePass=$('routeAuthPassword'),acctEmail=$('sbEmail'),acctPass=$('sbPassword');
  if(routeEmail&&acctEmail&&routeEmail.value&&!acctEmail.value)acctEmail.value=routeEmail.value;
  if(acctEmail&&routeEmail&&acctEmail.value&&!routeEmail.value)routeEmail.value=acctEmail.value;
  if(routePass&&acctPass&&routePass.value&&!acctPass.value)acctPass.value=routePass.value;
  if(acctPass&&routePass&&acctPass.value&&!routePass.value)routePass.value=acctPass.value;
}
function sessionEmail(){return app.session&&app.session.user?(app.session.user.email||'signed-in user'):'';}
function updateAuthUi(message){
  const status=$('supabaseStatus');
  if(status){
    if(message)status.textContent=message;
    else if(!app.supabase)status.textContent='Static fallback mode.';
    else if(app.session)status.textContent=`Signed in as ${sessionEmail()}.`;
    else status.textContent='Supabase ready; not signed in.';
  }
  const signedIn=!!(app.supabase&&app.session);
  const routeStatus=$('routeAccountStatus');
  if(routeStatus){
    if(message)routeStatus.textContent=message;
    else if(!app.supabase)routeStatus.textContent='Cloud accounts need Supabase config.';
    else if(signedIn)routeStatus.textContent=`Signed in as ${sessionEmail()}.`;
    else routeStatus.textContent='Create an account or sign in to save routes across devices.';
  }
  const routeAuthControls=$('routeAuthControls');
  const routeSignOut=$('routeSignOutBtn');
  if(routeAuthControls)routeAuthControls.hidden=signedIn;
  if(routeSignOut)routeSignOut.hidden=!signedIn;
  const accountAuthControls=$('accountAuthControls');
  const accountSignOut=$('sbSignOutBtn');
  if(accountAuthControls)accountAuthControls.hidden=signedIn;
  if(accountSignOut)accountSignOut.hidden=!signedIn;
  const save=$('routeSaveBtn'),load=$('routeLoadBtn'),del=$('routeDeleteBtn');
  if(save)save.disabled=!signedIn;
  if(load)load.disabled=!signedIn;
  if(del)del.disabled=!signedIn;
  renderSavedRoutes();
}
function validateAuthFields(){
  mirrorAuthFields();
  const email=authEmail(),password=authPassword();
  if(!email){notify('Enter an email address first.');return null;}
  if(!password||password.length<6){notify('Enter a password with at least 6 characters.');return null;}
  return {email,password};
}
async function initSupabase(){
  const cfg=window.CAMPING_SUPABASE_CONFIG;
  if(!cfg||!window.supabase){updateAuthUi('Static fallback mode.');return}
  app.supabase=window.supabase.createClient(cfg.url,cfg.anonKey,{db:{schema:cfg.schema||'public'}});
  app.supabase.auth.onAuthStateChange((_event,session)=>{app.session=session||null;updateAuthUi();if(app.session)refreshSavedRoutes(false);else{app.savedRoutes=[];app.savedRoutesLoaded=false;app.savedRoutesError=null;renderSavedRoutes();}});
  const {data}=await app.supabase.auth.getSession();
  app.session=data.session||null;
  updateAuthUi();
  if(app.session)await refreshSavedRoutes(false);
}
async function createAccount(){
  if(!app.supabase)return notify('Supabase config is not loaded.');
  const creds=validateAuthFields();
  if(!creds)return;
  const btn=$('sbCreateAccountBtn');
  const routeBtn=$('routeCreateAccountBtn');
  if(btn)btn.disabled=true;
  if(routeBtn)routeBtn.disabled=true;
  updateAuthUi('Creating account…');
  try{
    const {data,error}=await app.supabase.auth.signUp({email:creds.email,password:creds.password});
    if(error)throw error;
    if(data&&data.session){
      app.session=data.session;
      updateAuthUi();
      await refreshSavedRoutes(false);
      notify('Account created and signed in. Cloud saved routes are ready.');
    }else{
      updateAuthUi('Account created. Check email to confirm, then sign in.');
      notify('Account created. If email confirmation is enabled in Supabase, confirm the email before signing in.',7000);
    }
  }catch(err){console.error(err);updateAuthUi();notify(err&&err.message?err.message:'Could not create account.',7000);}
  finally{if(btn)btn.disabled=false;if(routeBtn)routeBtn.disabled=false;}
}
async function signIn(e){
  if(e)e.preventDefault();
  if(!app.supabase)return notify('Supabase config is not loaded.');
  const creds=validateAuthFields();
  if(!creds)return;
  const btn=$('sbSignInBtn');
  const routeBtn=$('routeSignInBtn');
  if(btn)btn.disabled=true;
  if(routeBtn)routeBtn.disabled=true;
  updateAuthUi('Signing in…');
  try{
    const {error}=await app.supabase.auth.signInWithPassword(creds);
    if(error)throw error;
    app.session=(await app.supabase.auth.getSession()).data.session;
    updateAuthUi();
    await refreshSavedRoutes(false);
    notify('Signed in.');
  }catch(err){console.error(err);updateAuthUi();notify(err&&err.message?err.message:'Sign in failed.',7000);}
  finally{if(btn)btn.disabled=false;if(routeBtn)routeBtn.disabled=false;}
}
async function signOut(){
  if(!app.supabase)return;
  await app.supabase.auth.signOut();
  app.session=null;
  app.savedRoutes=[];
  app.savedRoutesLoaded=false;
  app.savedRoutesError=null;
  updateAuthUi('Signed out.');
}
async function sendDraftSupabase(){const d=draftPayload();if(!d.name)return notify('Add a site name first.');if(!app.supabase||!app.session)return notify('Sign in to Supabase first, or use the manual queue.');notify('Supabase insert is not enabled in this integrated rebuild yet; added to manual queue instead.',5000);appendDraft()}

function versionParts(v){return String(v||'').replace(/^v/i,'').split('.').map(n=>parseInt(n,10)||0)}
function isNewerVersion(remote,current){const a=versionParts(remote),b=versionParts(current);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false;}return false}
function showUpdateNotice(remoteVersion){
  const line=$('statusLine');
  if(!line)return;
  line.dataset.lockedNotice='1';
  line.innerHTML=`Update available: <strong>${esc(remoteVersion)}</strong>. <button id="reloadLatestBtn" class="secondary" type="button" style="margin-left:8px;padding:5px 8px;min-height:0">Reload latest</button>`;
  const btn=$('reloadLatestBtn');
  if(btn)btn.onclick=()=>{try{localStorage.setItem('campingMap.lastManualRefresh',String(Date.now()))}catch(_e){} const entry=window.CAMPING_APP_ENTRY || new URL('index.html', window.location.href).href; const url=new URL(entry, window.location.href); url.search='?refresh='+Date.now(); url.hash=''; window.location.replace(url.href);};
}
async function checkForAppUpdate(){
  try{
    const res=await fetch('version.json?ts='+Date.now(),{cache:'no-store'});
    if(!res.ok)return;
    const data=await res.json();
    const remote=data.version||data.build||'';
    if(remote&&isNewerVersion(remote,VERSION))showUpdateNotice(remote);
  }catch(_e){}
}

function boot(){initState();initMap();buildControls();initSupabase().catch(()=>{});loadEnabledStates(true).catch(e=>{console.error(e);setLoading(false);notify('Map load failed.');});checkForAppUpdate();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
