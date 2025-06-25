let toastTimer;
const toastEl = document.getElementById('app-toast');
const usersBody = document.querySelector('#users-table tbody');

async function load(){
  const res = await fetch('/api/users');
  if(!res.ok) return;
  const list = await res.json();
  usersBody.innerHTML = '';
  if(list.length === 0){
    usersBody.innerHTML = `<tr><td colspan="5" class="text-center p-3">No users</td></tr>`;
    return;
  }
  list.forEach(u=>{
    const tr = document.createElement('tr');
    const btnClass = u.active!==false ? 'bg-yellow-500' : 'bg-green-600';
    const btnLabel = u.active!==false ? 'Deactivate' : 'Activate';
    tr.innerHTML = `<td>${u.email}</td><td>${u.role}</td>`+
      `<td>${u.active!==false?'Active':'Inactive'}</td>`+
      `<td><button class="text-white text-sm px-2 py-1 rounded ${btnClass}" `+
      `data-id="${u.id}" data-act="${u.active!==false?'deact':'act'}">`+
      `${btnLabel}</button></td>`+
      `<td><button class="text-white text-sm px-2 py-1 rounded bg-red-600" `+
      `data-id="${u.id}" data-del="1">Delete</button></td>`;
    usersBody.appendChild(tr);
  });
}

usersBody.parentElement.addEventListener('click', async e=>{
  const delBtn = e.target.closest('button[data-del]');
  if(delBtn){
    const id = delBtn.getAttribute('data-id');
    const res = await fetch(`/api/users/${id}`,{method:'DELETE'});
    if(res.ok){
      if(toastEl){
        toastEl.textContent = 'Deleted';
        toastEl.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(()=>toastEl.classList.add('hidden'),3000);
      }
      load();
    }
    return;
  }
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  const res = await fetch(`/api/users/${id}/${act==='deact'?'deactivate':'activate'}`,{method:'POST'});
  if(res.ok){
    if(toastEl){
      toastEl.textContent = act==='deact'? 'Deactivated':'Activated';
      toastEl.classList.remove('hidden');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(()=>toastEl.classList.add('hidden'),3000);
    }
    load();
  }
});

load();

