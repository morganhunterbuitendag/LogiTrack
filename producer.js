// Simple producer management for client-side editing
const listEl = document.getElementById('producer-list');
const addBtn = document.getElementById('new-btn');
const modal = document.getElementById('producer-modal');
const form = document.getElementById('producer-form');
const nameInput = document.getElementById('producer-name');
const locInput = document.getElementById('producer-location');
const saveBtn = form.querySelector('.primary');
const cancelBtn = form.querySelector('.cancel');
let producers = [];

async function loadProducers() {
  const stored = localStorage.getItem('producers');
  if (stored) {
    try { producers = JSON.parse(stored); } catch { producers = []; }
  }
  if (!Array.isArray(producers) || producers.length === 0) {
    const res = await fetch('producers.json');
    producers = await res.json();
  }
  localStorage.setItem('producers', JSON.stringify(producers));
}

function renderList() {
  listEl.innerHTML = '';
  producers.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'producer-row';
    row.innerHTML = `
      <div class="name">${p.name}</div>
      <div class="location">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
      <div class="actions"><button class="edit" data-index="${i}">✎</button></div>`;
    listEl.appendChild(row);
  });
}

listEl.addEventListener('click', e => {
  const btn = e.target.closest('.edit');
  if (!btn) return;
  openModal(Number(btn.dataset.index));
});

addBtn.addEventListener('click', () => openModal());

function openModal(index) {
  if (typeof index === 'number') {
    const p = producers[index];
    nameInput.value = p.name;
    locInput.value = `${p.lat}, ${p.lon}`;
    form.dataset.index = index;
    saveBtn.textContent = 'Save';
  } else {
    nameInput.value = '';
    locInput.value = '';
    delete form.dataset.index;
    saveBtn.textContent = 'Add';
  }
  modal.showModal();
}

cancelBtn.addEventListener('click', () => modal.close());

form.addEventListener('submit', e => {
  e.preventDefault();
  const [latStr, lonStr] = locInput.value.split(/[,\s]+/);
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (!nameInput.value.trim() || isNaN(lat) || isNaN(lon)) {
    alert('Please enter a name and numeric coordinates.');
    return;
  }
  if (form.dataset.index !== undefined) {
    const p = producers[+form.dataset.index];
    p.name = nameInput.value.trim();
    p.lat = lat;
    p.lon = lon;
  } else {
    producers.push({ name: nameInput.value.trim(), lat, lon });
  }
  persistProducers();
  renderList();
  modal.close();
});

function persistProducers() {
  localStorage.setItem('producers', JSON.stringify(producers));
  const blob = new Blob([JSON.stringify(producers, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'producers.json';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

(async function init() {
  await loadProducers();
  renderList();
})();
