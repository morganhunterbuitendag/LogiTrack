import { getDistances } from './src/lib/ors.js';

let producers = [];
let processors = [];

async function loadData(){
  try{
    const prodRes = await fetch('producers.json',{cache:'no-store'});
    if(prodRes.ok){
      producers = await prodRes.json();
    }
  }catch{}
  try{
    const procRes = await fetch('processors.json',{cache:'no-store'});
    if(procRes.ok){
      processors = await procRes.json();
    }
  }catch{}
}

export function parseLocation(val){
  val = val.trim();
  if(val.includes('@')){
    const m = val.match(/@([-0-9.]+),([-0-9.]+)/);
    if(m) return {lat:parseFloat(m[1]),lng:parseFloat(m[2])};
  }
  const parts = val.split(/[,\s]+/);
  if(parts.length>=2){
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if(isFinite(lat) && isFinite(lng)) return {lat,lng};
  }
  return null;
}

function isNameUnique(name){
  return !producers.some(p => p.name.toLowerCase() === name.toLowerCase());
}

function showError(input,msg){
  input.classList.add('is-invalid');
  input.nextElementSibling.textContent = msg;
}
function clearError(input){
  input.classList.remove('is-invalid');
  input.nextElementSibling.textContent='';
}

function showToast(msg){
  if(!toast) return;
  toastEl.querySelector('.toast-body').textContent = msg;
  toast.show();
}

let fab, addModalEl, addModal, distModalEl, distModal, toastEl, toast;
let nameInput, locInput, addBtn, grid, uploadBtn, distCancel, distName;
let pendingLocation = null;
let currentDistances = null;

if (typeof document !== 'undefined') {
  fab = document.getElementById('add-producer-fab');
  addModalEl = document.getElementById('add-producer-modal');
  addModal = new bootstrap.Modal(addModalEl);
  distModalEl = document.getElementById('distance-preview-modal');
  distModal = new bootstrap.Modal(distModalEl,{backdrop:'static'});

  toastEl = document.getElementById('app-toast');
  if(toastEl) toast = new bootstrap.Toast(toastEl);

  nameInput = document.getElementById('producer-name');
  locInput = document.getElementById('producer-location');
  addBtn = document.getElementById('add-producer-confirm');
  grid = document.getElementById('distance-grid');
  uploadBtn = document.getElementById('distance-upload');
  distCancel = document.getElementById('distance-cancel');
  distName = document.getElementById('distance-producer');
}

function validateForm(){
  let valid = true;
  const name = nameInput.value.trim();
  if(!name){
    showError(nameInput,'Required');
    valid = false;
  }else if(name.length>50){
    showError(nameInput,'Max 50 characters');
    valid = false;
  }else if(!isNameUnique(name)){
    showError(nameInput,'Name already exists');
    valid=false;
  }else{
    clearError(nameInput);
  }

  const loc = parseLocation(locInput.value);
  if(!loc){
    showError(locInput,'Invalid location');
    valid = false;
  }else if(Math.abs(loc.lat)>90 || Math.abs(loc.lng)>180){
    showError(locInput,'Out of range');
    valid = false;
  }else{
    clearError(locInput);
  }
  addBtn.disabled = !valid;
  if(valid) pendingLocation = loc; else pendingLocation = null;
}

if (typeof document !== 'undefined') {
  nameInput.addEventListener('input',validateForm);
  locInput.addEventListener('input',validateForm);

  fab.addEventListener('click',()=>{
    nameInput.value='';
    locInput.value='';
    clearError(nameInput);clearError(locInput);
    addBtn.disabled=true;
    addModal.show();
  });

  document.querySelector('#add-producer-modal .btn-secondary').addEventListener('click',()=>addModal.hide());

  addBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    validateForm();
    if (addBtn.disabled) return;
    addModal.hide();
    const name = nameInput.value.trim();
    distName.textContent = name;
    buildGrid(name);
    uploadBtn.disabled = true;
    distModal.show();
    currentDistances = await loadDistances();
    uploadBtn.disabled = false;
  });

}

function buildGrid(prodName=''){ 
  grid.innerHTML='';
  const table=document.createElement('table');
  table.className='table table-sm';

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
  nameCell.textContent=prodName;
  row.appendChild(nameCell);
  processors.forEach(()=>{
    const td=document.createElement('td');
    const inp=document.createElement('input');
    inp.readOnly=true;
    inp.className='form-control text-center';
    inp.value='…';
    td.appendChild(inp);
    row.appendChild(td);
  });
  tbody.appendChild(row);
  table.appendChild(tbody);
  grid.appendChild(table);
}

async function loadDistances(){
  if(!pendingLocation) return null;
  const origin=[pendingLocation.lng,pendingLocation.lat];
  const depots=processors.map(p=>[p.lon,p.lat]);
  try{
    const vals = await getDistances(origin,depots);
    const inputs = grid.querySelectorAll('input');
    const result={};
    vals.forEach((v,i)=>{
      const inp=inputs[i];
      if(v==null){
        inp.value='';
        inp.classList.add('border-danger');
        result[processors[i].name]=null;
      }else{
        const n=Number(v).toFixed(2);
        inp.value=n;
        result[processors[i].name]=+n;
      }
    });
    return result;
  }catch(err){
    alert('Failed to fetch distances');
    return null;
  }
}

if (typeof document !== 'undefined') {
uploadBtn.addEventListener('click',async ()=>{
  uploadBtn.disabled=true;
  const prod={name:nameInput.value.trim(),location:`${pendingLocation.lat},${pendingLocation.lng}`};
  if(!currentDistances){ uploadBtn.disabled=false; return; }
  const payload={producer:prod.name,distances:currentDistances,producerRecord:prod};
  try{
    await fetch('/api/distances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    distModal.hide();
    showToast('\u271A Producer added \u2026');
    nameInput.value='';
    locInput.value='';
    distName.textContent='';
    currentDistances=null;
  }catch(err){
    alert('Upload failed');
  }finally{
    uploadBtn.disabled=false;
  }
});

distCancel.addEventListener('click',()=>{
  distModal.hide();
  addModal.show();
  uploadBtn.disabled=true;
  grid.innerHTML='';
  distName.textContent='';
  currentDistances=null;
});
}

export async function appendJSON(file,obj){
  if(typeof window==='undefined'){
    const fs = await import('fs/promises');
    let arr=[];
    try{ arr = JSON.parse(await fs.readFile(file,'utf8')); }catch{}
    arr.push(obj);
    await fs.writeFile(file,JSON.stringify(arr,null,2));
  }else{
    // attempt POST to backend; fallback download
    try{
      await fetch(file,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
    }catch{
      const res = await fetch(file);
      let arr=[];if(res.ok) arr=await res.json();
      arr.push(obj);
      const blob=new Blob([JSON.stringify(arr,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=file;document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();
    }
  }
}

loadData();
