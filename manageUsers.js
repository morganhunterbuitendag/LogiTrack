let toast;
const toastEl = document.getElementById('app-toast');
if(toastEl) toast = new bootstrap.Toast(toastEl);
const usersBody = document.querySelector('#users-table tbody');

async function load(){
  const res = await fetch('/api/users');
  if(!res.ok) return;
  const list = await res.json();
  usersBody.innerHTML = '';
  if(list.length === 0){
    usersBody.innerHTML = `<tr><td colspan="4" class="text-center p-3">No users</td></tr>`;
    return;
  }
  list.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.email}</td><td>${u.role}</td>`+
      `<td>${u.active!==false?'Active':'Inactive'}</td>`+
      `<td><button class="btn btn-sm ${u.active!==false?'btn-warning':'btn-success'}" `+
      `data-id="${u.id}" data-act="${u.active!==false?'deact':'act'}">`+
      `${u.active!==false?'Deactivate':'Activate'}</button></td>`;
    usersBody.appendChild(tr);
  });
}

usersBody.parentElement.addEventListener('click', async e=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  const res = await fetch(`/api/users/${id}/${act==='deact'?'deactivate':'activate'}`,{method:'POST'});
  if(res.ok){
    if(toast){
      toastEl.querySelector('.toast-body').textContent = act==='deact'? 'Deactivated':'Activated';
      toast.show();
    }
    load();
  }
});

load();

