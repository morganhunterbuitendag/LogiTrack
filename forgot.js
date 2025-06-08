const form = document.getElementById('forgot-form');
const emailInput = document.getElementById('fp-email');
const done = document.getElementById('fp-done');

form.addEventListener('submit', async e => {
  e.preventDefault();
  await fetch('/api/auth/forgot', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: emailInput.value.trim()})
  });
  form.classList.add('d-none');
  done.classList.remove('d-none');
});
