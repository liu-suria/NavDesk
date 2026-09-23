import {json,requireAuth} from '../../_lib.js';
import {getNavigationStore} from '../../_storage.js';
import {loadHolidays} from '../../_holidays.js';
import {loadTerms} from '../../_calendar.js';
export async function onRequestGet(context){
 const auth=await requireAuth(context);if(auth.response)return auth.response;
 const year=Number(new URL(context.request.url).searchParams.get('year'));
 if(!Number.isInteger(year)||year<1901||year>2100)return json({error:'年份范围为1901至2100'},400);
 if(new URL(context.request.url).searchParams.get('kind')==='holidays'){
  try{const store=getNavigationStore(),key=`calendar/v1/holidays-${year}.json`;let data;try{data=await store.get(key,{type:'json'})}catch{}
   const refresh=new URL(context.request.url).searchParams.get('refresh')==='1',age=Date.now()-Date.parse(data?.checkedAt||'');
   if(!data||!Number.isFinite(age)||age>(refresh?60000:86400000)){data=await loadHolidays(year);try{await store.setJSON(key,data)}catch{}}
   return json(data);
  }catch(error){return json({error:error.message||'假期更新暂时不可用'},503)}
 }
 try{
  const store=getNavigationStore(),key=`calendar/v1/terms-${year}.json`;let terms;
  try{terms=await store.get(key,{type:'json'})}catch{}
  if(!terms){terms=await loadTerms(year);try{await store.setJSON(key,terms)}catch{}}
  return json({year,terms},200,{'Cache-Control':'private, max-age=86400','Vary':'Cookie'});
 }catch{return json({error:'节气数据暂时不可用，其他日历内容仍可查看'},503)}
}
