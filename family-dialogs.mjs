export function installFamilyDialogs({get,set,request,render,message,today,esc,field,HOME}){
 function dialog(){let node=document.getElementById('familyDialog');if(!node){node=document.createElement('dialog');node.id='familyDialog';node.className='family-dialog';document.body.append(node)}return node}
 async function details(id){
  const item=get().events.find(e=>e.id===id);if(!item)return;const node=dialog();
  node.innerHTML=`<div class="family-modal"><header><h2>${esc(item.title)}</h2><button type="button" data-close aria-label="关闭">×</button></header><dl><dt>日期</dt><dd>${esc(item.date)}</dd><dt>状态</dt><dd>${item.status==='done'?'已完成':'待办'}</dd>${Number(item.amount)?`<dt>金额</dt><dd>${esc(item.currency||'CNY')} ${esc(item.amount)}</dd>`:''}</dl><p class="family-note">${esc(item.note||'暂无备注')}</p><div class="family-attachments"></div><footer><a href="${HOME}" target="_blank" rel="noopener">完整管理 ↗</a><button type="button" class="family-primary" data-edit>编辑</button></footer></div>`;
  node.querySelector('[data-close]').onclick=()=>node.close();node.querySelector('[data-edit]').onclick=()=>{node.close();edit(item)};node.showModal();
  if(!item.attachments?.length)return;
  const area=node.querySelector('.family-attachments');area.textContent='正在读取附件…';
  try{const data=await request('/api/family/ledger?id='+encodeURIComponent(id),{},false,false);if(!area.isConnected)return;area.replaceChildren();
   for(const file of data.event?.attachments||[]){const button=document.createElement('button');button.type='button';button.textContent=file.name||'附件';button.onclick=()=>{
    const match=String(file.data||'').match(/^data:(image\/(?:png|jpeg|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/);if(!match){message('此附件请通过完整管理查看');return}
    const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:match[1]})),a=document.createElement('a');a.href=url;a.download=file.name||'附件';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   };area.append(button)}
  }catch(error){area.textContent=error.message}
 }
 function edit(item=null){
  const ledger=get();
  if(!ledger){message('请先连接家庭事务');return}
  const node=dialog();node.innerHTML=`<form class="family-modal"><header><h2>${item?'编辑事项':'新增事项'}</h2><button type="button" data-close aria-label="关闭">×</button></header><div class="family-form-grid">${field('标题','title',item?.title||'')}${field('日期','date',item?.date||today(),'date')}<label>分类<select name="type">${(ledger.settings?.types||[]).map(t=>`<option value="${esc(t.id)}" ${t.id===item?.type?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>${field('金额（可选）','amount',item?.amount||0,'number')}<label>币种<select name="currency">${['CNY','USD','HKD','EUR','JPY','INR','GBP'].map(c=>`<option ${c===(item?.currency||'CNY')?'selected':''}>${c}</option>`).join('')}</select></label>${item?'':'<label>重复<select name="repeat"><option value="none">单次</option><option value="monthly">每月</option><option value="yearly">每年</option></select></label>'}<label class="family-form-note">备注<textarea name="note">${esc(item?.note||'')}</textarea></label></div><p class="family-error" role="alert"></p><footer><button type="button" data-cancel>取消</button><button class="family-primary" type="submit">保存</button></footer></form>`;
  node.querySelector('[data-close]').onclick=node.querySelector('[data-cancel]').onclick=()=>node.close();
  node.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('[type=submit]');submit.disabled=true;const values=Object.fromEntries(new FormData(form));values.amount=Number(values.amount)||0;
   try{const result=await request('/api/family/events',{method:item?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:ledger.revision,...(item?{id:item.id,event:values}:values)})},false,false);set(result.data);node.close();render();message('已保存')}
   catch(error){form.querySelector('.family-error').textContent=error.status===409?'数据已更新，请取消并刷新后再编辑。':error.message}
   finally{submit.disabled=false}
  };node.showModal();
 }
 return {details,edit};
}
