// NavDesk JavaScript module v2
// Numeric ICU fields avoid locale-specific day strings; all dates use Beijing time.
let chineseCalendar;
try{const f=new Intl.DateTimeFormat('en-u-ca-chinese-nu-latn',{month:'numeric',day:'numeric',timeZone:'Asia/Shanghai'});if(f.resolvedOptions().calendar==='chinese')chineseCalendar=f}catch{}
const lunarMonths='正二三四五六七八九十冬腊';
export function getLunar(date){
 if(!chineseCalendar)return null;
 const parts=chineseCalendar.formatToParts(date),value=parts.find(p=>p.type==='month')?.value||'',month=parseInt(value,10),day=Number(parts.find(p=>p.type==='day')?.value);
 if(!month||!day)return null;
 const leap=/bis|leap/i.test(value),digits='一二三四五六七八九十';
 const dayName=day<=10?'初'+digits[day-1]:day<20?'十'+digits[day-11]:day===20?'二十':day<30?'廿'+digits[day-21]:'三十';
 return {month,day,leap,monthName:(leap?'闰':'')+lunarMonths[month-1]+'月',dayName};
}
export function lunarLabel(date,compact=false){const value=getLunar(date);return value?(compact?(value.day===1?value.monthName:value.dayName):value.monthName+value.dayName):'农历不可用'}
