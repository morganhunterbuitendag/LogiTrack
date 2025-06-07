async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

const form = document.getElementById('register-form');
const emailInput = document.getElementById('reg-email');
const passInput = document.getElementById('reg-password');
const toggleBtn = document.getElementById('toggle-pass');
const strength = document.getElementById('pass-strength');
const success = document.getElementById('register-success');

function validate(){
  const email = emailInput.value.trim();
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  emailInput.classList.toggle('is-invalid', !emailOk);
  const val = passInput.value;
  const strong = val.length >= 8 && /[A-Z]/i.test(val) && /[0-9]/.test(val);
  strength.textContent = strong ? 'Strong' : 'Weak';
  return emailOk && strong;
}

emailInput.addEventListener('input', validate);
passInput.addEventListener('input', validate);

toggleBtn.addEventListener('click', () => {
  passInput.type = passInput.type === 'password' ? 'text' : 'password';
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  if(!validate()) return;
  const passwordHash = await sha256(passInput.value);
  const res = await fetch('/api/pending-users', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email: emailInput.value.trim(), passwordHash})
  });
  if(res.ok){
    form.classList.add('d-none');
    success.classList.remove('d-none');
  }
});
