(async () => {
  const adminEls = document.querySelectorAll('.admin-link');
  try {
    const res = await fetch('/api/auth/check');
    if(!res.ok){
      adminEls.forEach(el=>el.remove());
      return;
    }
    const data = await res.json();
    if(data.role !== 'admin'){
      adminEls.forEach(el=>el.remove());
    }
  } catch {
    adminEls.forEach(el=>el.remove());
  }
})();
