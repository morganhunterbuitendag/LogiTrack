/* ---------- helpers ---------- */
function dms(d,m,s,dir){let v=+d+(+m)/60+(+s)/3600;return(dir==="S"||dir==="W")?-v:v}
function hav(lat1,lon1,lat2,lon2){const R=6371,t=x=>x*Math.PI/180;const dLat=t(lat2-lat1),dLon=t(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(t(lat1))*Math.cos(t(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function fmtTime(km,speed){if(!km)return"0 min";const m=Math.round(km/speed*60);return`${Math.floor(m/60)}h ${m%60}m`.replace(/^0h /,"");}

/* ---------- data ---------- */
let depots=[];

const commodityPrices={
  Maize:{base:3200,diff:{Delpa:0,"De Vale":-20,"Groot Saxony":50,"Help Mekaar":10,Kleinhoek:0,Mispah:-10,Sarbyn:30,Schoongesight:0,Sparta:40,Theronia:-5,"Vyf Susters":-5}},
  Soybeans:{base:7500,diff:{Delpa:10,"De Vale":0,"Groot Saxony":-30,"Help Mekaar":20,Kleinhoek:0,Mispah:-20,Sarbyn:10,Schoongesight:0,Sparta:-15,Theronia:0,"Vyf Susters":0}},
  Wheat:{base:4800,diff:{}}
};

let farms=[];

async function loadPoints(url){
  const res=await fetch(url);
  const text=await res.text();
  return text.trim().split(/\r?\n/).map(l=>{
    const m=l.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\s+)(.+)$/);
    if(!m) return null;
    return{lat:+m[1],lon:+m[2],name:m[3].trim()};
  }).filter(Boolean);
}

const cfg={haulRate:2.5,speed:70};

/* ---------- DOM ---------- */
const farmSel=document.getElementById("client-farm");
const commSel=document.getElementById("commodity");
const tonInput=document.getElementById("tonnage");
const gridBody=document.getElementById("depot-grid-body");
const tariffDisp=document.getElementById("haulage-tariff-display");

/* ---------- map ---------- */
const saMap=L.map("sa-map",{zoomControl:false}).setView([-28,25],6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OSM"}).addTo(saMap);
const markerLayer=L.layerGroup().addTo(saMap);
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
    gridBody.innerHTML="<tr><td colspan='1' style='text-align:center;padding:20px'>Select farm and commodity.</td></tr>";
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
    tr.innerHTML=`<td>${r.name}</td>`;
    if(i===0) tr.classList.add("best-price");
    else if(i===1) tr.classList.add("runner-up-price");
  });
}
function renderMap(farm){
  markerLayer.clearLayers();routeLayer.clearLayers();
  L.circleMarker([farm.lat,farm.lon],{radius:8,weight:1,color:"#fff",fillColor:"#DD6B20",fillOpacity:1}).addTo(markerLayer).bindTooltip(farm.name);
  currentResults.forEach((d,i)=>{
    const clr=i===0?"#2F855A":i===1?"#D69E2E":"#3182CE";
    L.circleMarker([d.lat,d.lon],{radius:7,weight:1,color:"#fff",fillColor:clr,fillOpacity:1})
      .addTo(markerLayer).bindTooltip(`${d.name}\nR${d.landed.toFixed(2)} / ${d.km.toFixed(0)} km`);
  });
  let best=currentResults[0];L.polyline([[farm.lat,farm.lon],[best.lat,best.lon]],{color:"#2F855A",weight:3,dashArray:"6 3"}).addTo(routeLayer);
  if(currentResults.length>1){let run=currentResults[1];L.polyline([[farm.lat,farm.lon],[run.lat,run.lon]],{color:"#D69E2E",weight:2,dashArray:"4 2",opacity:.8}).addTo(routeLayer);}
  saMap.fitBounds(routeLayer.getBounds(),{padding:[30,30]});
}
/* ---------- events ---------- */
[farmSel,commSel,tonInput].forEach(el=>el.addEventListener("input",compute));

async function init(){
  [farms,depots]=await Promise.all([
    loadPoints('producers.txt'),
    loadPoints('processors.txt')
  ]);
  populateSelectors();
  if(farms.length) farmSel.value=farms[0].name;
  commSel.value="Maize";
  compute();
}

init();
