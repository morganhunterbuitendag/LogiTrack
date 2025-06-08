// Producer management re-implemented per new spec
const wrapper = document.querySelector('.main-content-wrapper');
const headerRow = wrapper.querySelector('.header');
const listEl = document.createElement('div');
listEl.id = 'producer-list';
wrapper.insertBefore(listEl, headerRow.nextSibling);

const addBtn = document.getElementById('new-btn');
const modal = document.getElementById('producer-modal');
const form = document.getElementById('producer-form');
const modalTitle = document.getElementById('producer-modal-title');
const nameInput = document.getElementById('producer-name');
const locInput = document.getElementById('producer-location');
const saveBtn = form.querySelector('.primary');
const cancelBtn = form.querySelector('.cancel');
const deleteDialog = document.getElementById('delete-dialog');
const confirmDeleteBtn = deleteDialog.querySelector('.confirm');
const cancelDeleteBtn = deleteDialog.querySelector('.cancel');
const distDialog = document.getElementById('distance-dialog');
const distGrid = document.getElementById('distance-grid');
const distUploadBtn = distDialog.querySelector('.upload');
const distCancelBtn = distDialog.querySelector('.cancel');
let deleteIndex = null;
let producers = [];
let processors = [];
let pendingProducer = null;
let currentDistances = null;

async function loadProducers(){
  const cached = localStorage.getItem('producers');
  if(cached){
    try{ producers = JSON.parse(cached); }catch{ producers = []; }
  }
  if(!Array.isArray(producers) || producers.length === 0){
    try{
      const res = await fetch('producers.json',{cache:'no-store'});
      if(!res.ok) throw new Error('fetch failed');
      producers = await res.json();
    }catch(err){
      producers = [
        {lat:-27.413064112082218,lon:26.39355653815821,name:'Sf Haasbroek'},
        {lat:-27.69152172672409, lon:26.44368253816803,name:'Cornelia'},
        {lat:-27.651250282596436, lon:26.43624093558256,name:'JN Jacobsz'},
        {lat:-28.071317908331952,lon:26.25064526701652,name:'HP Ferreira'},
        {lat:-28.225539375209316,lon:26.124705380517383,name:'Teo Ferreira'},
        {lat:-28.20738224520913, lon:26.38936080935168,name:'Izak Cronje'},
        {lat:-28.240370859154467,lon:26.42322172469238,name:'Gerhard Cronje'},
        {lat:-28.06731496698842, lon:26.574214267016327,name:'Matomundi'},
        {lat:-27.94686542875395, lon:26.329509695847,name:'Maas Bdry'},
        {lat:-28.091158479215565,lon:25.831808767017293,name:'Betmar'},
        {lat:-27.716815778604488,lon:26.386336167003904,name:'Borlinghaus'},
        {lat:-28.184118742166113,lon:26.989235695855452,name:'WD Botha'},
        {lat:-28.12538113906193, lon:26.14054977848897,name:'Mons Bdy'},
      ];
    }
  }
  localStorage.setItem('producers', JSON.stringify(producers));
}

async function loadProcessors(){
  const cached = localStorage.getItem('processors');
  if(cached){
    try{ processors = JSON.parse(cached); }catch{ processors = []; }
  }
  if(!Array.isArray(processors) || processors.length === 0){
    try{
      const res = await fetch('processors.json',{cache:'no-store'});
      if(res.ok) processors = await res.json();
    }catch{}
  }
  if(!Array.isArray(processors)) processors = [];
}

function buildGrid(){
  distGrid.innerHTML='';
  const table=document.createElement('table');
  table.className='table table-sm w-full';

  const thead=document.createElement('thead');
  const headRow=document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  processors.forEach(p=>{
    const th=document.createElement('th');
    th.className='text-center';
    th.textContent=p.name;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody=document.createElement('tbody');
  const row=document.createElement('tr');
  const nameCell=document.createElement('th');
  nameCell.scope='row';
  nameCell.className='text-nowrap';
  nameCell.textContent=pendingProducer?pendingProducer.name:'';
  row.appendChild(nameCell);
  processors.forEach(()=>{
    const td=document.createElement('td');
    const inp=document.createElement('input');
    inp.readOnly=true;
    inp.className='border rounded px-2 py-1 w-full text-center';
    inp.value='…';
    td.appendChild(inp);
    row.appendChild(td);
  });
  tbody.appendChild(row);
  table.appendChild(tbody);

  distGrid.appendChild(table);
}

async function getDistances(origin,depots){
  const key = window.ORS_KEY;
  if(!key) return [];
  const body={locations:[origin,...depots],sources:[0],destinations:depots.map((_,i)=>i+1),metrics:['distance'],units:'km'};
  const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car',{method:'POST',headers:{'Authorization':key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) return [];
  const data=await res.json();
  const dists=data.distances && data.distances[0];
  return Array.isArray(dists)?dists:[];
}

async function loadDistances(){
  if(!pendingProducer) return;
  const origin=[pendingProducer.lon,pendingProducer.lat];
  const depots=processors.map(p=>[p.lon,p.lat]);
  const vals=await getDistances(origin,depots);
  const inputs=distGrid.querySelectorAll('input');
  const result={};
  vals.forEach((v,i)=>{
    const inp=inputs[i];
    if(v==null){
      inp.value='';
      inp.classList.add('border-red-500');
      result[processors[i].name]=null;
    }else{
      const n=Number(v).toFixed(2);
      inp.value=n;
      result[processors[i].name]=+n;
    }
  });
  currentDistances = result;
}

function renderList(){
  listEl.innerHTML='';
  producers.forEach((p,i)=>{
    const row=document.createElement('div');
    row.className='producer-row';
    row.innerHTML=`<div class="name">${p.name}</div>
      <div class="location">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
      <div class="actions"><button class="edit" data-index="${i}">✎</button><button class="delete" data-index="${i}">🗑</button></div>`;
    listEl.appendChild(row);
  });
}

listEl.addEventListener('click',e=>{
  const editBtn=e.target.closest('.edit');
  if(editBtn){
    openModal(Number(editBtn.dataset.index));
    return;
  }
  const delBtn=e.target.closest('.delete');
  if(delBtn){
    openDeleteModal(Number(delBtn.dataset.index));
  }
});

addBtn.addEventListener('click',()=>openModal());

function openModal(index){
  if(typeof index==='number'){
    const p=producers[index];
    nameInput.value=p.name;
    locInput.value=`${p.lat}, ${p.lon}`;
    form.dataset.index=index;
    modalTitle.textContent='Edit Producer';
    saveBtn.textContent='Save';
  }else{
    nameInput.value='';
    locInput.value='';
    delete form.dataset.index;
    modalTitle.textContent='Add Producer';
    saveBtn.textContent='Add';
  }
  modal.showModal();
}

function openDeleteModal(index){
  deleteIndex = index;
  deleteDialog.showModal();
}

cancelBtn.addEventListener('click',()=>modal.close());

cancelDeleteBtn.addEventListener('click',()=>{
  deleteDialog.close();
  deleteIndex = null;
});

confirmDeleteBtn.addEventListener('click',()=>{
  if(deleteIndex !== null){
    producers.splice(deleteIndex,1);
    persistProducers();
    renderList();
  }
  deleteDialog.close();
  deleteIndex = null;
});

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const parts = locInput.value.split(/[ ,\s]+/);
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!nameInput.value.trim() || isNaN(lat) || isNaN(lon)) return;
    pendingProducer = {name: nameInput.value.trim(), lat, lon};
    await loadProcessors();
    buildGrid();
    modal.close();
    distDialog.showModal();
    await loadDistances();
  });

distCancelBtn.addEventListener('click',()=>{
  distDialog.close();
  pendingProducer=null;
  modal.showModal();
});

distUploadBtn.addEventListener('click', async ()=>{
  if(!pendingProducer || !currentDistances) return;
  if(form.dataset.index!==undefined){
    const idx=Number(form.dataset.index);
    producers[idx]=pendingProducer;
  }else{
    producers.push(pendingProducer);
  }
  persistProducers();
  renderList();
  const payload={producer:pendingProducer.name,distances:currentDistances,producerRecord:pendingProducer};
  try{
    await saveDistanceRecord(payload);
  }catch(err){
    console.error('Upload failed', err);
  }
  pendingProducer=null;
  currentDistances=null;
  distDialog.close();
});

function persistProducers(){
  localStorage.setItem('producers',JSON.stringify(producers));
  const blob=new Blob([JSON.stringify(producers,null,2)],{type:'application/json'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'producers.json'});
  document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();
}

async function saveDistanceRecord(obj){
  try{
    await fetch('/api/distances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
  }catch(err){
    const res = await fetch('data/distances.json');
    let arr=[];if(res.ok) arr=await res.json();
    arr.push(obj);
    const blob=new Blob([JSON.stringify(arr,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='distances.json';
    document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();
  }
}

(async function init(){
  await loadProducers();
  await loadProcessors();
  renderList();
})();
