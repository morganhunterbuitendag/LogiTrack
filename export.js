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
  table.className = 'table-auto border-collapse mb-4';
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  hrow.appendChild(document.createElement('th')); // corner
  processors.forEach(p => {
    const th = document.createElement('th');
    th.textContent = p.name;
    th.className = 'px-2 py-1 text-center bg-slate-200';
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
    th.className = 'text-left px-2 py-1 bg-blue-50';
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

async function exportToExcel(){
  const table = document.querySelector('#distance-table table');
  if(!table) return;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Distances');

  // extract headers
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent || '');
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
    Array.from(tr.children).map(td => td.textContent)
  );

  ws.addRow(headers);
  rows.forEach(r => ws.addRow(r));

  ws.columns.forEach(col => {
    let max = 10;
    col.eachCell({includeEmpty:true}, cell => {
      const len = cell.value ? cell.value.toString().length : 0;
      if(len > max) max = len;
    });
    col.width = max + 2;
  });

  ws.getRow(1).eachCell(cell => {
    cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF4A5568'}};
    cell.alignment = {vertical:'middle', horizontal:'center'};
  });

  for(let i=2;i<=ws.rowCount;i++){
    const cell = ws.getCell(`A${i}`);
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFEBF4FF'}};
    cell.font = {color:{argb:'FF1E429F'}};
  }

  ws.addTable({
    name:'DistancesTable',
    ref:'A1',
    headerRow:true,
    columns: headers.map(h => ({name:h})),
    rows: rows
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const fname = `distances-${dateStr}.xlsx`;
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
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
    const btn = document.getElementById('export-btn');
    if(btn){
      btn.addEventListener('click', exportToExcel);
    }
  }catch(err){
    document.getElementById('distance-table').textContent = 'Failed to load data';
    console.error(err);
  }
})();
