/* ---------- helpers ---------- */
function dms(d,m,s,dir){let v=+d+(+m)/60+(+s)/3600;return(dir==="S"||dir==="W")?-v:v}
function hav(lat1,lon1,lat2,lon2){const R=6371,t=x=>x*Math.PI/180;const dLat=t(lat2-lat1),dLon=t(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(t(lat1))*Math.cos(t(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function fmtTime(km,speed){if(!km)return"0 min";const m=Math.round(km/speed*60);return`${Math.floor(m/60)}h ${m%60}m`.replace(/^0h /,"");}

/* ---------- data ---------- */
let depots=[];

const DEFAULT_FARMS=[
  {lat:-27.413064112082218,lon:26.39355653815821,name:"Sf Haasbroek"},
  {lat:-27.69152172672409,lon:26.44368253816803,name:"Cornelia"},
  {lat:-27.651250282596436,lon:26.43624093558256,name:"JN Jacobsz"},
  {lat:-28.071317908331952,lon:26.25064526701652,name:"HP Ferreira"},
  {lat:-28.225539375209316,lon:26.124705380517383,name:"Teo Ferreira"},
  {lat:-28.20738224520913,lon:26.38936080935168,name:"Izak Cronje"},
  {lat:-28.240370859154467,lon:26.42322172469238,name:"Gerhard Cronje"},
  {lat:-28.06731496698842,lon:26.574214267016327,name:"Matomundi"},
  {lat:-27.94686542875395,lon:26.329509695847,name:"Maas Bdry"},
  {lat:-28.091158479215565,lon:25.831808767017293,name:"Betmar"},
  {lat:-27.716815778604488,lon:26.386336167003904,name:"Borlinghaus"},
  {lat:-28.184118742166113,lon:26.989235695855452,name:"WD Botha"},
  {lat:-28.12538113906193,lon:26.14054977848897,name:"Mons Bdy"}
];

const DEFAULT_DEPOTS=[
  {lat:-28.581154919405076,lon:27.486046667781952,name:"SPAR"},
  {lat:-28.46120571688839,lon:27.226272595865517,name:"SAX"},
  {lat:-28.31817552131897,lon:26.405485195860393,name:"SCH"},
  {lat:-28.010530642785685,lon:26.523585311188683,name:"THR"},
  {lat:-28.188702177056772,lon:26.102694724690426,name:"KLE"},
  {lat:-27.919950635668116,lon:25.772347724680895,name:"SAR"},
  {lat:-27.845958675859443,lon:26.203191795843374,name:"MIS"},
  {lat:-27.750205831514368,lon:26.11489109583991,name:"HLP"},
  {lat:-27.505792080494125,lon:26.410354138161406,name:"VYF"},
  {lat:-29.084108130608936,lon:26.139810024521754,name:"Itau"},
  {lat:-27.972661330182213,lon:26.76107189731688,name:"Gritsly"},
  {lat:-27.6686773822071,lon:27.21290848824452,name:"Premier"},
  {lat:-30.695233329631165,lon:26.702676512363553,name:"Aliwal"},
  {lat:-28.865702375034086,lon:27.87487832537334,name:"Ficksburg"},
  {lat:-26.891791143416583,lon:26.66169294714649,name:"Klerksdorp"}
];

const commodityPrices={
  Maize:{base:3200,diff:{Delpa:0,"De Vale":-20,"Groot Saxony":50,"Help Mekaar":10,Kleinhoek:0,Mispah:-10,Sarbyn:30,Schoongesight:0,Sparta:40,Theronia:-5,"Vyf Susters":-5}},
  Soybeans:{base:7500,diff:{Delpa:10,"De Vale":0,"Groot Saxony":-30,"Help Mekaar":20,Kleinhoek:0,Mispah:-20,Sarbyn:10,Schoongesight:0,Sparta:-15,Theronia:0,"Vyf Susters":0}},
  Wheat:{base:4800,diff:{}}
};

let farms=[];

async function loadPoints(url,fallback){
  try{
    const res=await fetch(url);
    if(!res.ok) throw new Error('bad');
    const data=await res.json();
    if(!Array.isArray(data)) throw new Error('bad');
    return data.map(o=>({lat:+o.lat,lon:+o.lon,name:o.name}));
  }catch(e){
    return fallback;
  }
}

const cfg={haulRate:2.5,speed:70};

/* ---------- DOM ---------- */
const farmSel=document.getElementById("producer-select");
const commSel=document.getElementById("commodity");
const tonInput=document.getElementById("tonnage");
const gridBody=document.getElementById("depot-grid-body");
const tariffDisp=document.getElementById("haulage-tariff-display");

/* ---------- map ---------- */
const saMap=L.map("sa-map",{zoomControl:false}).setView([-28,25],6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OSM"}).addTo(saMap);
const producerLayer=L.layerGroup().addTo(saMap); // all producers
const markerLayer=L.layerGroup().addTo(saMap);   // selected farm + depots
const routeLayer=L.layerGroup().addTo(saMap);

/* ---------- populate selectors ---------- */
function populateSelectors(){
  farmSel.innerHTML="";
  farms.forEach(f=>{let o=document.createElement("option");o.value=o.textContent=f.name;farmSel.appendChild(o)});
  commSel.innerHTML="";
  Object.keys(commodityPrices).forEach(c=>{let o=document.createElement("option");o.value=o.textContent=c;commSel.appendChild(o)});
  tariffDisp.textContent=cfg.haulRate.toFixed(2);
}

/* ---------- core ---------- */
let currentResults=[];
function compute(){
  const farm=farms.find(f=>f.name===farmSel.value);
  const comm=commSel.value;
  if(!farm||!comm){
    gridBody.innerHTML="<tr><td colspan='2' style='text-align:center;padding:20px'>Select producer and commodity.</td></tr>";
    markerLayer.clearLayers();routeLayer.clearLayers();currentResults=[];
    return;
  }
  const info=commodityPrices[comm];
  currentResults=depots.map(d=>{
    const km=hav(farm.lat,farm.lon,d.lat,d.lon);
    const haul=km*cfg.haulRate;
    const price=info.base+(info.diff[d.name]||0);
    return{...d,km,haul,landed:price+haul,price};
  }).sort((a,b)=>a.landed-b.landed);

  renderGrid();renderMap(farm);
  const best=currentResults[0];
}
function renderGrid(){
  gridBody.innerHTML="";
  currentResults.forEach((r,i)=>{
    let tr=gridBody.insertRow();
    tr.innerHTML=`<td>${r.name}</td><td>${r.km.toFixed(0)} km</td>`;
    if(i===0) tr.classList.add("best-price");
    else if(i===1) tr.classList.add("runner-up-price");
  });
}

function renderProcessorList(){
  gridBody.innerHTML="";
  depots.forEach(d=>{
    let tr=gridBody.insertRow();
    tr.innerHTML=`<td>${d.name}</td><td></td>`;
  });
}

function renderAllProducers(){
  producerLayer.clearLayers();
  farms.forEach(f=>{
    L.circleMarker([f.lat,f.lon],{radius:4,weight:1,color:"#fff",fillColor:"#666",fillOpacity:.8})
      .addTo(producerLayer).bindTooltip(f.name);
  });
  if(farms.length){
    saMap.fitBounds(producerLayer.getBounds(),{padding:[30,30]});
  }
}
function renderMap(farm){
  markerLayer.clearLayers();routeLayer.clearLayers();
  L.circleMarker([farm.lat,farm.lon],{radius:8,weight:1,color:"#fff",fillColor:"#DD6B20",fillOpacity:1}).addTo(markerLayer).bindTooltip(farm.name);
  currentResults.forEach((d,i)=>{
    const clr=i===0?"#2F855A":i===1?"#D69E2E":"#3182CE";
    L.circleMarker([d.lat,d.lon],{radius:7,weight:1,color:"#fff",fillColor:clr,fillOpacity:1})
      .addTo(markerLayer).bindTooltip(`${d.name}\nR${d.landed.toFixed(2)} / ${d.km.toFixed(0)} km`);
  });
  let best=currentResults[0];
  const bestLine=L.polyline([[farm.lat,farm.lon],[best.lat,best.lon]],{color:"#2F855A",weight:3,dashArray:"6 3"}).addTo(routeLayer);
  bestLine.bindTooltip(`${best.km.toFixed(0)} km`,{permanent:true,direction:'center',className:'line-label'});
  if(currentResults.length>1){
    let run=currentResults[1];
    const runLine=L.polyline([[farm.lat,farm.lon],[run.lat,run.lon]],{color:"#D69E2E",weight:2,dashArray:"4 2",opacity:.8}).addTo(routeLayer);
    runLine.bindTooltip(`${run.km.toFixed(0)} km`,{permanent:true,direction:'center',className:'line-label'});
  }
  saMap.fitBounds(routeLayer.getBounds(),{padding:[30,30]});
}
/* ---------- events ---------- */
[farmSel,commSel,tonInput].forEach(el=>el.addEventListener("input",compute));

async function init(){
  [farms,depots]=await Promise.all([
    loadPoints('producers.json', DEFAULT_FARMS),
    loadPoints('processors.json', DEFAULT_DEPOTS)
  ]);
  populateSelectors();
  renderAllProducers();
  if(farms.length) farmSel.value=farms[0].name;
  commSel.value="Maize";
  renderProcessorList();
}

init();
