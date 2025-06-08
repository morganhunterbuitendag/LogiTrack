async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

const form = document.getElementById('reset-form');
const passInput = document.getElementById('reset-password');
const errorEl = document.getElementById('reset-error');
const success = document.getElementById('reset-success');
const params = new URLSearchParams(location.search);
const token = params.get('token') || '';

form.addEventListener('submit', async e => {
  e.preventDefault();
  const passwordHash = await sha256(passInput.value);
  const res = await fetch('/api/auth/reset', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({token, passwordHash})
  });
  if(res.ok){
    form.classList.add('d-none');
    success.classList.remove('d-none');
  }else{
    errorEl.textContent = 'Invalid or expired token';
  }
});
