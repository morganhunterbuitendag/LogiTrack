async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

const emailEl = document.getElementById('profile-email');
(async () => {
  try {
    const res = await fetch('/api/auth/check');
    if(res.ok){
      const data = await res.json();
      emailEl.textContent = `Logged in as ${data.email}`;
    }
  } catch {}
})();

const form = document.getElementById('password-form');
const msg = document.getElementById('password-msg');
form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = '';
  const currentHash = await sha256(document.getElementById('current-password').value);
  const newHash = await sha256(document.getElementById('new-password').value);
  const res = await fetch('/api/auth/change-password', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({oldPasswordHash: currentHash, newPasswordHash: newHash})
  });
  if(res.ok){
    msg.textContent = 'Password updated';
    msg.style.color = 'green';
    form.reset();
  } else {
    msg.textContent = 'Update failed';
    msg.style.color = 'red';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', {method:'POST'});
  location.href = 'login.html';
});
