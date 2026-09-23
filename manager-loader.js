function createManagerLoader(services){
 let opening=false,manager;
 return async(action,payload)=>{
  if(matchMedia('(max-width:650px)').matches||opening)return;
  opening=true;
  try{manager ||= import('/__MANAGE_URL__').then(module=>module.createManager(services)).catch(error=>{manager=null;throw error});await (await manager).open(action,payload)}
  catch(error){services.notify(error.message||'整理工具加载失败，请重试')}
  finally{opening=false}
 };
}
