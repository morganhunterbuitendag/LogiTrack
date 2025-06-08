async function fetchJSON(url, fallback){
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('Failed to load '+url);
    return await res.json();
  }catch(err){
    if(fallback){
      const res = await fetch(fallback, {cache:'no-store'});
      if(res.ok) return res.json();
    }
    throw err;
  }
}

function buildTable(producers, processors, matrix){
  const cont = document.getElementById('distance-table');
  cont.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'table-auto border-collapse';
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  hrow.appendChild(document.createElement('th'));
  processors.forEach(p => {
    const th = document.createElement('th');
    th.textContent = p.name;
    th.className = 'px-2 py-1 text-center';
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  producers.forEach(prod => {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = prod.name;
    th.scope = 'row';
    th.className = 'text-left px-2 py-1';
    row.appendChild(th);
    processors.forEach(proc => {
      const td = document.createElement('td');
      td.className = 'px-2 py-1 text-center';
      const val = matrix[prod.name] && matrix[prod.name][proc.name];
      td.textContent = val != null ? val.toFixed(2) : 'N/A';
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  cont.appendChild(table);
}

(async () => {
  async function loadList(key, url, fallback){
    let arr;
    const cached = localStorage.getItem(key);
    if(cached){
      try{ arr = JSON.parse(cached); }catch{}
    }
    if(!Array.isArray(arr) || arr.length === 0){
      arr = await fetchJSON(url, fallback);
    }
    return arr;
  }
  try{
    const [producers, processors, records] = await Promise.all([
      loadList('producers','producers.json'),
      loadList('processors','processors.json'),
      fetchJSON('/api/distances', 'data/distances.json')
    ]);
    const matrix = {};
    records.forEach(r => { matrix[r.producer] = r.distances; });
    buildTable(producers, processors, matrix);
  }catch(err){
    document.getElementById('distance-table').textContent = 'Failed to load data';
    console.error(err);
  }
})();
