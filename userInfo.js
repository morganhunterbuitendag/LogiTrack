(async () => {
  let info = document.getElementById('user-info');
  if(!info){
    const header = document.querySelector('header');
    if(!header) return;
    info = document.createElement('div');
    info.id = 'user-info';
    header.appendChild(info);
  }
  info.className = 'user-info';
  try {
    const res = await fetch('/api/auth/check');
    if(!res.ok) return;
    const data = await res.json();
    const letter = data.email ? data.email.charAt(0).toUpperCase() : '?';
    const name = data.email ? data.email.split('@')[0] : '';
    info.innerHTML = `<div class="user-circle">${letter}</div><span>${name}</span>`;
  } catch {}
})();
