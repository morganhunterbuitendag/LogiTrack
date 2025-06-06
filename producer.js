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
    const res = await fetch('producers.txt');
    if(!res.ok) return;
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    producers = lines.map((l,i)=>{
      const m=l.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\s+)(.+)$/);
      if(!m) return null;
      return {id: nextId + i, lat:parseFloat(m[1]), lon:parseFloat(m[2]), name:m[3].trim(), distances:Array(10).fill(null)};
    }).filter(Boolean);
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
    tr.innerHTML = `<td>${p.id}</td><td>${p.name||'name required still:'}</td>`+
      `<td>${p.lat.toFixed(3)}</td><td>${p.lon.toFixed(3)}</td>`+
      `<td><button data-id="${p.id}" class="edit">Edit</button></td>`;
    bodyEl.appendChild(tr);
  });
  bodyEl.querySelectorAll('button.edit').forEach(btn=>{
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
  const coordInput = document.createElement('input');
  coordInput.type = 'text';
  coordInput.placeholder = 'Lat, Lon';
  const fetchBtn = document.createElement('button');
  fetchBtn.textContent = 'Fetch distances';
  fetchBtn.disabled = true;
  const grid = document.createElement('div');
  grid.className = 'distance-grid';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add producer';
  addBtn.disabled = true;
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.marginLeft = '10px';

  const formFrag = document.createDocumentFragment();
  formFrag.appendChild(labelWrap('Name', nameInput));
  formFrag.appendChild(labelWrap('Coords', coordInput));
  formFrag.appendChild(fetchBtn);
  formFrag.appendChild(grid);
  formFrag.appendChild(addBtn);
  formFrag.appendChild(cancelBtn);
  modalContent.appendChild(formFrag);

  const distInputs = [];

  // when coordinates are valid enable fetch
  function coordHandler(){
    const {lat,lon}=parseCoords(coordInput.value);
    if(editObj){
      const changed = lat !== editObj.lat || lon !== editObj.lon;
      fetchBtn.disabled = !changed || isNaN(lat) || isNaN(lon);
      if(changed) addBtn.disabled = true; else checkAll();
    }else{
      fetchBtn.disabled = isNaN(lat) || isNaN(lon);
    }
  }
  coordInput.addEventListener('input', coordHandler);
  coordHandler();

  function fillGrid(values){
    grid.innerHTML='';
    for(let i=0;i<10;i++){
      const lab=document.createElement('label');
      lab.textContent = DEPOT_NAMES[i];
      const inp=document.createElement('input');
      inp.type='number';
      inp.step='any';
      if(values && values[i]!=null) inp.value=values[i];
      lab.appendChild(inp);
      grid.appendChild(lab);
      distInputs.push(inp);
      inp.addEventListener('input', checkAll);
    }
    checkAll();
  }

  if(editObj){
    nameInput.value = editObj.name;
    coordInput.value = `${editObj.lat}, ${editObj.lon}`;
    fillGrid(editObj.distances);
    addBtn.textContent='Save';
    fetchBtn.disabled=true;
  }

  fetchBtn.addEventListener('click', async ()=>{
    fetchBtn.disabled=true;
    const {lat,lon}=parseCoords(coordInput.value);
    const dists = await requestDistances(lat,lon);
    fillGrid(dists);
  });

  addBtn.addEventListener('click', ()=>{
    const newObj = editObj || {id: nextId++};
    newObj.name = nameInput.value.trim();
    const {lat,lon}=parseCoords(coordInput.value);
    newObj.lat = lat;
    newObj.lon = lon;
    newObj.distances = distInputs.map(inp=>parseFloat(inp.value));
    if(!editObj) producers.push(newObj);
    saveData();
    renderTable();
    closeModal();
  });

  cancelBtn.addEventListener('click', closeModal);

  function checkAll(){
    addBtn.disabled = distInputs.some(inp=>isNaN(parseFloat(inp.value)));
  }
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
