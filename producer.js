// Producer management script
// ------------------------------------------------------------
// This file implements the producer CRUD page described in the
// specification. All producers are stored in the front-end array
// `producers` and persisted to localStorage after every change.

// -------- depot constants (hard coded from project list) ------
const DEPOT_NAMES = [
  "SPAR","SAX","SCH","THR","KLE",
  "SAR","MIS","HLP","VYF","Itau"
];
const DEPOTS = [
  [27.486046667781952,-28.581154919405076],
  [27.226272595865517,-28.46120571688839],
  [26.405485195860393,-28.31817552131897],
  [26.523585311188683,-28.010530642785685],
  [26.102694724690426,-28.188702177056772],
  [25.772347724680895,-27.919950635668116],
  [26.203191795843374,-27.845958675859443],
  [26.11489109583991,-27.750205831514368],
  [26.410354138161406,-27.505792080494125],
  [26.139810024521754,-29.084108130608936]
];

// -------- persistence helpers --------------------------------------------
let producers = [];
let nextId = 1;
loadData();
if(producers.length===0){
  importFromFile().then(renderTable);
}else{
  renderTable();
}

function loadData(){
  try{ producers = JSON.parse(localStorage.getItem('producers')) || []; }catch(e){ producers=[]; }
  nextId = parseInt(localStorage.getItem('nextId')||'1',10);
}
function saveData(){
  localStorage.setItem('producers', JSON.stringify(producers));
  localStorage.setItem('nextId', String(nextId));
}

async function importFromFile(){
  try{
    const res = await fetch('producers.json');
    if(!res.ok) return;
    const data = await res.json();
    if(!Array.isArray(data)) return;
    producers = data.map((obj,i)=>({
      id: nextId + i,
      lat: parseFloat(obj.lat),
      lon: parseFloat(obj.lon),
      name: obj.name,
      distances: Array(10).fill(null)
    }));
    nextId += producers.length;
    saveData();
  }catch(e){
    // ignore
  }
}

// -------- DOM elements ---------------------------------------
const bodyEl = document.getElementById('producer-body');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const newBtn = document.getElementById('new-btn');

newBtn.addEventListener('click', () => openModal());

// Render the producers table from the array
function renderTable(){
  bodyEl.innerHTML = '';
  producers.forEach(p => {
    const tr = document.createElement('tr');
    const loc = `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`;
    tr.innerHTML = `<td>${p.name}</td><td>${loc}</td>`+
      `<td><span data-id="${p.id}" class="edit" role="button">\u270E</span></td>`;
    bodyEl.appendChild(tr);
  });
  bodyEl.querySelectorAll('.edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id=parseInt(btn.getAttribute('data-id'));
      const obj=producers.find(p=>p.id===id);
      if(obj) openModal(obj);
    });
  });
}

// Create and display the modal dialog for adding/editing producers
function openModal(editObj){
  modal.classList.remove('hidden');
  modalContent.innerHTML = '';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Name';
  const locInput = document.createElement('input');
  locInput.type = 'text';
  locInput.placeholder = 'Lat, Lon';
  if(editObj){
    nameInput.value = editObj.name;
    locInput.value = `${editObj.lat}, ${editObj.lon}`;
  }
  const saveBtn = document.createElement('button');
  saveBtn.textContent = editObj ? 'Save' : 'Add';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.marginLeft='10px';

  const frag=document.createDocumentFragment();
  frag.appendChild(labelWrap('Name', nameInput));
  frag.appendChild(labelWrap('Location', locInput));
  frag.appendChild(saveBtn);
  frag.appendChild(cancelBtn);
  modalContent.appendChild(frag);

  saveBtn.addEventListener('click', ()=>{
    const newObj = editObj || {id: nextId++};
    newObj.name = nameInput.value.trim();
    const {lat,lon} = parseCoords(locInput.value);
    newObj.lat = lat;
    newObj.lon = lon;
    if(!editObj) producers.push(newObj);
    saveData();
    renderTable();
    closeModal();
  });

  cancelBtn.addEventListener('click', closeModal);
}

function closeModal(){
  modal.classList.add('hidden');
}

// util to wrap label and input
function labelWrap(text, input){
  const lbl=document.createElement('label');
  lbl.textContent=text+' ';
  lbl.appendChild(input);
  return lbl;
}

// Accept decimal degrees or DMS (deg°min'sec"H) and convert to decimal
function parseCoord(str){
  str = String(str).trim();
  if(/^-?\d+(?:\.\d+)?$/.test(str)) return parseFloat(str);
  const m=str.match(/^(-?\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)[″"]?\s*([NSEW])?$/i);
  if(m){
    let val = Math.abs(parseFloat(m[1])) + parseFloat(m[2])/60 + parseFloat(m[3])/3600;
    if(parseFloat(m[1])<0) val=-val;
    if(m[4]){
      let dir=m[4].toUpperCase();
      if(dir==='S' || dir==='W') val=-Math.abs(val);
    }
    return val;
  }
  return NaN;
}

function parseCoords(str){
  const parts=String(str).trim().split(/[ ,]+/);
  return {lat:parseCoord(parts[0]), lon:parseCoord(parts[1])};
}

// POST to the ORS matrix API for distances from one producer to all depots
async function requestDistances(lat,lon){
  let key = localStorage.getItem('ORS_KEY');
  if(!key){
    key = prompt('Enter OpenRouteService API key');
    if(!key) return Array(10).fill(null);
    localStorage.setItem('ORS_KEY', key);
  }
  const payload = {
    locations: [[lon,lat], ...DEPOTS],
    sources:[0],
    destinations:[1,2,3,4,5,6,7,8,9,10],
    metrics:["distance"],
    units:"km"
  };
  try{
    const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':key},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.distances) throw new Error('bad');
    return data.distances[0];
  }catch(e){
    // on failure allow manual entry
    return Array(10).fill(null);
  }
}
