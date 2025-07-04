// Processor management re-implemented per new spec
const wrapper = document.querySelector('.main-content-wrapper');
const headerRow = wrapper.querySelector('.header');
const listEl = document.createElement('div');
listEl.id = 'processor-list';
wrapper.insertBefore(listEl, headerRow.nextSibling);

const addBtn = document.getElementById('new-btn');
const orderBtn = document.getElementById('order-btn');
const modal = document.getElementById('processor-modal');
const form = document.getElementById('processor-form');
const modalTitle = document.getElementById('processor-modal-title');
const nameInput = document.getElementById('processor-name');
const locInput = document.getElementById('processor-location');
const saveBtn = form.querySelector('.primary');
const cancelBtn = form.querySelector('.cancel');
const deleteDialog = document.getElementById('delete-dialog');
const confirmDeleteBtn = deleteDialog.querySelector('.confirm');
const cancelDeleteBtn = deleteDialog.querySelector('.cancel');
let deleteIndex = null;
let processors = [];
let reorderMode = false;

async function loadProcessors(){
  try{
    const res = await fetch('/api/processors',{cache:'no-store'});
    if(res.ok) processors = await res.json();
  }catch{}
  if(!Array.isArray(processors) || processors.length === 0){
    const cached = localStorage.getItem('processors');
    if(cached){
      try{ processors = JSON.parse(cached); }catch{}
    }
    if(!Array.isArray(processors) || processors.length === 0){
      try{
        const res = await fetch('processors.json',{cache:'no-store'});
        if(res.ok) processors = await res.json();
      }catch{}
    }
    if(!Array.isArray(processors) || processors.length === 0){
      processors = [
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
        {lat:-26.891791143416583,lon:26.66169294714649,name:"Klerksdorp"},
      ];
    }
  }
  localStorage.setItem('processors', JSON.stringify(processors));
}

function renderList(){
  listEl.innerHTML='';
  processors.forEach((p,i)=>{
    const row=document.createElement('div');
    row.className='processor-row';
    let actions='';
    if(reorderMode){
      actions+=`<button class="up" data-index="${i}">↑</button><button class="down" data-index="${i}">↓</button>`;
    }
    actions+=`<button class="edit" data-index="${i}">✎</button><button class="delete" data-index="${i}">🗑</button>`;
    row.innerHTML=`<div class="name">${p.name}</div>
      <div class="location">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
      <div class="actions">${actions}</div>`;
    listEl.appendChild(row);
  });
}

listEl.addEventListener('click',e=>{
  const editBtn=e.target.closest('.edit');
  if(editBtn){
    openModal(Number(editBtn.dataset.index));
    return;
  }
  const upBtn=e.target.closest('.up');
  if(upBtn){
    const idx=Number(upBtn.dataset.index);
    if(idx>0){
      [processors[idx-1],processors[idx]]=[processors[idx],processors[idx-1]];
      persistProcessors();
      renderList();
    }
    return;
  }
  const downBtn=e.target.closest('.down');
  if(downBtn){
    const idx=Number(downBtn.dataset.index);
    if(idx<processors.length-1){
      [processors[idx],processors[idx+1]]=[processors[idx+1],processors[idx]];
      persistProcessors();
      renderList();
    }
    return;
  }
  const delBtn=e.target.closest('.delete');
  if(delBtn){
    openDeleteModal(Number(delBtn.dataset.index));
  }
});

addBtn.addEventListener('click',()=>openModal());
orderBtn.addEventListener('click',()=>{
  reorderMode=!reorderMode;
  renderList();
});

function openModal(index){
  if(typeof index==='number'){
    const p=processors[index];
    nameInput.value=p.name;
    locInput.value=`${p.lat}, ${p.lon}`;
    form.dataset.index=index;
    modalTitle.textContent='Edit Processor';
    saveBtn.textContent='Save';
  }else{
    nameInput.value='';
    locInput.value='';
    delete form.dataset.index;
    modalTitle.textContent='Add Processor';
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
    processors.splice(deleteIndex,1);
    persistProcessors();
    renderList();
  }
  deleteDialog.close();
  deleteIndex = null;
});

form.addEventListener('submit',e=>{
  e.preventDefault();
  const parts=locInput.value.split(/[,\s]+/);
  const lat=parseFloat(parts[0]);
  const lon=parseFloat(parts[1]);
  if(!nameInput.value.trim() || isNaN(lat) || isNaN(lon)) return;
  if(form.dataset.index!==undefined){
    const idx=Number(form.dataset.index);
    processors[idx]={name:nameInput.value.trim(),lat,lon};
  }else{
    processors.push({name:nameInput.value.trim(),lat,lon});
  }
  persistProcessors();
  renderList();
  modal.close();
});

async function persistProcessors(){
  localStorage.setItem('processors',JSON.stringify(processors));
  try{
    await fetch('/api/processors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(processors)});
  }catch(err){
    const blob=new Blob([JSON.stringify(processors,null,2)],{type:'application/json'});
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'processors.json'});
    document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();
  }
}

(async function init(){
  await loadProcessors();
  renderList();
})();
