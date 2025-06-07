const res = await fetch('/api/auth/check');
if(!res.ok){
  window.location.href = 'login.html';
}
