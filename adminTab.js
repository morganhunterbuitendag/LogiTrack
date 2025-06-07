document.addEventListener('DOMContentLoaded',()=>{
  const adminLink=document.querySelector('.admin-link a');
  const contentArea=document.querySelector('.content-area');
  const adminContainer=document.getElementById('admin-container');
  if(adminLink && contentArea && adminContainer){
    adminLink.addEventListener('click',(e)=>{
      e.preventDefault();
      contentArea.style.display='none';
      adminContainer.style.display='block';
    });
  }
});
