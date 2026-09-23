export const TERM_NAMES=['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
export function parseTerms(text,year){
 const terms={};const translate={'驚':'惊','蟄':'蛰','穀':'谷','滿':'满','種':'种','處':'处'};
 for(const line of text.split(/\r?\n/)){
  const match=line.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+\S+\s+星期\S\s+(\S+)/);if(!match||Number(match[1])!==year)continue;
  const name=match[4].replace(/[驚蟄穀滿種處]/g,c=>translate[c]);if(!TERM_NAMES.includes(name))continue;
  const month=Number(match[2]),day=Number(match[3]);if(month<1||month>12||day<1||day>new Date(year,month,0).getDate())throw Error('Invalid date');
  terms[`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`]=name;
 }
 if(Object.keys(terms).length!==24||new Set(Object.values(terms)).size!==24)throw Error('Incomplete solar-term table');return terms;
}
export async function loadTerms(year,fetcher=fetch){
 if(!Number.isInteger(year)||year<1901||year>2100)throw Error('年份范围为1901至2100');
 const response=await fetcher(`https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T${year}c.txt`,{signal:AbortSignal.timeout(7000),redirect:'error'});
 if(!response.ok)throw Error('节气来源暂时不可用');const text=await response.text();if(text.length>100000)throw Error('Invalid calendar response');return parseTerms(text,year);
}
