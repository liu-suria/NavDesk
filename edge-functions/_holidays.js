export function validateHolidays(data,year){
 if(data?.code!==0||!data.holiday||typeof data.holiday!=='object'||Array.isArray(data.holiday))throw Error('假期数据格式不正确');
 const entries={};for(const [key,item] of Object.entries(data.holiday)){
  if(!/^\d{2}-\d{2}$/.test(key)||typeof item?.holiday!=='boolean'||typeof item.name!=='string'||!item.name.trim())throw Error('假期数据格式不正确');
  const date=`${year}-${key}`,parsed=new Date(date+'T12:00:00Z');if(Number.isNaN(+parsed)||parsed.toISOString().slice(0,10)!==date||item.date&&item.date!==date)throw Error('假期日期不正确');
  entries[date]={kind:item.holiday?'rest':'work',text:item.name.slice(0,40)+(item.holiday?' · 放假':' · 补班')};
 }
 if(!Object.keys(entries).length)throw Error('该年份暂未提供假期安排');return entries;
}
export async function loadHolidays(year,fetcher=fetch){
 if(!Number.isInteger(year)||year<2000||year>2100)throw Error('假期更新支持2000至2100年');
 try{
  const response=await fetcher(`https://timor.tech/api/holiday/year/${year}/`,{signal:AbortSignal.timeout(4000),redirect:'error'});if(!response.ok)throw Error();
  return {year,entries:validateHolidays(await response.json(),year),checkedAt:new Date().toISOString(),source:'https://timor.tech/api/holiday/'};
 }catch{}
 const response=await fetcher(`https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,{signal:AbortSignal.timeout(4000),redirect:'error'});if(!response.ok)throw Error('假期来源暂时不可用');
 const data=await response.json();const entries=validatePublicHolidays(data,year);
 // A following year's notice can amend December of this calendar year.
 try{const next=await fetcher(`https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year+1}.json`,{signal:AbortSignal.timeout(2000),redirect:'error'});if(next.ok){const value=await next.json();if(value.year===year+1&&Array.isArray(value.days)){const days=value.days.filter(d=>typeof d.date==='string'&&d.date.startsWith(year+'-'));if(days.length)Object.assign(entries,validatePublicHolidays({year,papers:value.papers,days},year))}}}catch{}
 return {year,entries,checkedAt:new Date().toISOString(),source:'https://github.com/NateScarlet/holiday-cn'};
}
export function validatePublicHolidays(data,year){
 if(data?.year!==year||!Array.isArray(data.days)||!Array.isArray(data.papers)||!data.papers.length)throw Error('该年份暂未提供已发布的假期安排');
 const holiday={};for(const item of data.days){if(typeof item.date!=='string'||typeof item.isOffDay!=='boolean')throw Error('假期格式不正确');if(!item.date.startsWith(year+'-'))continue;holiday[item.date.slice(5)]={date:item.date,holiday:item.isOffDay,name:item.name}}
 return validateHolidays({code:0,holiday},year);
}
