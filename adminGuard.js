const res = await fetch('/api/auth/check');
if(!res.ok){
  window.location.href = 'login.html';
} else {
  const data = await res.json().catch(()=>null);
  if(!data || data.role !== 'admin'){
    window.location.href = 'Index.html';
  }
}
