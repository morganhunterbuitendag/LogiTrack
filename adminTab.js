document.addEventListener('DOMContentLoaded',()=>{
  const adminLink=document.querySelector('.admin-link a');
  const navLinks=document.querySelectorAll('.sidebar a');
  const contentArea=document.querySelector('.content-area');
  const adminContainer=document.getElementById('admin-container');
  if(adminLink&&contentArea&&adminContainer){
    adminLink.addEventListener('click',e=>{
      e.preventDefault();
      contentArea.style.display='none';
      adminContainer.style.display='flex';
      navLinks.forEach(l=>l.classList.remove('bg-blue-50','text-blue-700','border','border-blue-200'));
      adminLink.classList.add('bg-blue-50','text-blue-700','border','border-blue-200');
    });
  }
});
