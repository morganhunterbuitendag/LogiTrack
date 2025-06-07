async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

const form = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passInput = document.getElementById('login-password');
const errorEl = document.getElementById('login-error');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const passwordHash = await sha256(passInput.value);
  const res = await fetch('/api/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email: emailInput.value.trim(), passwordHash})
  });
  if(res.ok){
    location.href = 'board.html';
  }else if(res.status === 403){
    let data = null;
    try{ data = await res.json(); }catch{}
    if(data && data.error === 'pending'){
      errorEl.textContent = "Your registration hasn't been approved yet.";
    }else if(data && data.error === 'inactive'){
      errorEl.textContent = 'Your account is inactive.';
    }else{
      errorEl.textContent = 'Access denied';
    }
  }else{
    errorEl.textContent = 'Invalid credentials';
  }
});
