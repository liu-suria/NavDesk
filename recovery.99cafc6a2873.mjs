// NavDesk JavaScript module v2
import './dialogs.83efedf8180f.mjs';
// Keep editor DOM and drafts intact while a session is renewed.

 let pending;
 export function recover(request){
  if(pending)return pending;
  pending=new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='quick-editor session-dialog';dialog.innerHTML='<form><h2>重新登录</h2><p>登录已失效，未保存的输入仍保留在当前页面。</p><label>密码<input type="password" autocomplete="current-password" required></label><p role="status"></p><footer><button type="button">暂不登录</button><button type="submit" class="primary">登录并继续</button></footer></form>';document.body.append(dialog);
   const finish=value=>{dialog.close();dialog.remove();pending=null;resolve(value)};
   dialog.querySelector('[type=button]').onclick=()=>finish(false);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
   dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=dialog.querySelector('[type=submit]');button.disabled=true;try{await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:dialog.querySelector('input').value})});finish(true)}catch(error){dialog.querySelector('[role=status]').textContent=error.message;button.disabled=false}};
   dialog.showModal();dialog.querySelector('input').focus();
  });return pending;
 };

