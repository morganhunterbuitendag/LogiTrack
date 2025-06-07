let toast;
const toastEl = document.getElementById('app-toast');
if(toastEl) toast = new bootstrap.Toast(toastEl);
const body = document.querySelector('#requests-table tbody');

async function load(){
  const res = await fetch('/api/pending-users');
  if(!res.ok) return;
  const list = await res.json();
  body.innerHTML = '';
  if(list.length===0){
    body.innerHTML = `<tr><td colspan="4" class="text-center p-3">No pending requests</td></tr>`;
    return;
  }
  list.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.email}</td><td>${new Date(r.requested).toLocaleString()}</td>`+
      `<td><button class="btn btn-sm btn-success" data-id="${r.id}" data-act="ap">Approve</button></td>`+
      `<td><button class="btn btn-sm btn-danger" data-id="${r.id}" data-act="re">Reject</button></td>`;
    body.appendChild(tr);
  });
}

body.parentElement.addEventListener('click', async e=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  const res = await fetch(`/api/pending-users/${id}/${act==='ap'?'approve':'reject'}`,{method:'POST'});
  if(res.ok){
    if(toast){
      toastEl.querySelector('.toast-body').textContent = act==='ap'? 'Approved':'Rejected';
      toast.show();
    }
    load();
  }
});

load();
