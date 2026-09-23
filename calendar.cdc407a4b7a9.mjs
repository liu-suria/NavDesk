// NavDesk JavaScript module v2
// 2026 State Council schedule, verified 2026-09-23.
export const source='https://www.huoqiu.gov.cn/public/6601401/38667291.html';
export const holidays=[['元旦','01-01','01-03',['01-04']],['春节','02-15','02-23',['02-14','02-28']],['清明节','04-04','04-06',[]],['劳动节','05-01','05-05',['05-09']],['端午节','06-19','06-21',[]],['中秋节','09-25','09-27',[]],['国庆节','10-01','10-07',['09-20','10-10']]];
const holidayYears=new Map();
const pad=n=>String(n).padStart(2,'0');
export const dateKey=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
export function dayStatus(date){
 if(date.getFullYear()!==2026){const imported=holidayYears.get(date.getFullYear());if(imported)return imported.entries[dateKey(date)]||{kind:'normal',text:[0,6].includes(date.getDay())?'周末（来源未标注调休）':'工作日（来源未标注调休）'};return {kind:'unknown',text:'该年份尚未收录放假调休安排'}};
 const key=dateKey(date).slice(5);
 for(const [name,start,end,work] of holidays){if(work.includes(key))return {kind:'work',text:`${name}调休 · 补班`};if(key>=start&&key<=end)return {kind:'rest',text:`${name}假期 · 放假`}}
 return {kind:'normal',text:[0,6].includes(date.getDay())?'周末（无调休安排）':'工作日'};
}
let lunar;
try{const f=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric'});if(f.resolvedOptions().calendar==='chinese')lunar=f}catch{}
function lunarText(date){if(!lunar)return '农历不可用';const parts=lunar.formatToParts(date),day=Number(parts.find(p=>p.type==='day')?.value),month=parts.find(p=>p.type==='month')?.value||'';const digits='一二三四五六七八九十';return month+(day<=10?'初'+digits[day-1]:day<20?'十'+digits[day-11]:day===20?'二十':day<30?'廿'+digits[day-21]:'三十')}
const termsByYear=new Map([[2026,JSON.parse('{"2026-01-05":"小寒","2026-01-20":"大寒","2026-02-04":"立春","2026-02-18":"雨水","2026-03-05":"惊蛰","2026-03-20":"春分","2026-04-05":"清明","2026-04-20":"谷雨","2026-05-05":"立夏","2026-05-21":"小满","2026-06-05":"芒种","2026-06-21":"夏至","2026-07-07":"小暑","2026-07-23":"大暑","2026-08-07":"立秋","2026-08-23":"处暑","2026-09-07":"白露","2026-09-23":"秋分","2026-10-08":"寒露","2026-10-23":"霜降","2026-11-07":"立冬","2026-11-22":"小雪","2026-12-07":"大雪","2026-12-22":"冬至"}')]]),attemptedYears=new Set(),termErrors=new Set();
const solarFestivals={'01-01':'元旦','02-14':'情人节','03-08':'妇女节','03-12':'植树节','04-01':'愚人节','05-01':'劳动节','05-04':'青年节','06-01':'儿童节','07-01':'建党节','08-01':'建军节','09-10':'教师节','10-01':'国庆节','12-24':'平安夜','12-25':'圣诞节'};
const lunarFestivals={'正月-1':'春节','正月-15':'元宵节','二月-2':'龙抬头','五月-5':'端午节','七月-7':'七夕','七月-15':'中元节','八月-15':'中秋节','九月-9':'重阳节','腊月-8':'腊八节'};
export function festivals(date){
 const result=[],fixed=solarFestivals[dateKey(date).slice(5)];if(fixed)result.push(fixed);
 if(lunar){const parts=lunar.formatToParts(date),month=parts.find(p=>p.type==='month')?.value,day=Number(parts.find(p=>p.type==='day')?.value);const name=lunarFestivals[`${month}-${day}`];if(name)result.push(name);
  const next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1,12),p=lunar.formatToParts(next);if(p.find(v=>v.type==='month')?.value==='正月'&&Number(p.find(v=>v.type==='day')?.value)===1)result.push('除夕');
 }
 if(date.getDay()===0&&date.getMonth()===4&&date.getDate()>=8&&date.getDate()<=14)result.push('母亲节');
 if(date.getDay()===0&&date.getMonth()===5&&date.getDate()>=15&&date.getDate()<=21)result.push('父亲节');
 return result;
}
function events(date){const term=termsByYear.get(date.getFullYear())?.[dateKey(date)];const names=festivals(date);if(term==='清明')names.push('清明节');return {term,names:[...new Set(names)]}}
function loadYearTerms(value){
 if(termsByYear.has(value)||attemptedYears.has(value)||value<1901)return;attemptedYears.add(value);
 const key=`navdesk-solar-terms-v1-${value}`;
 const valid=terms=>terms&&Object.keys(terms).length===24&&Object.entries(terms).every(([k,v])=>k.startsWith(value+'-')&&typeof v==='string'&&v.length<=3);
 try{const cached=JSON.parse(localStorage.getItem(key));if(valid(cached)){termsByYear.set(value,cached);return}}catch{}
 fetch(`/api/calendar?year=${value}`,{credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(data.year!==value||!valid(data.terms))throw Error();termsByYear.set(value,data.terms);try{localStorage.setItem(key,JSON.stringify(data.terms))}catch{}}).catch(()=>termErrors.add(value)).finally(()=>{if(dialog?.open&&year===value)render()});
}

let dialog,year,month,selected;
const q=s=>dialog.querySelector(s);
function detail(){const state=dayStatus(selected),extra=events(selected);q('#calendarDetail').textContent=`${dateKey(selected)} · 周${'日一二三四五六'[selected.getDay()]} · 农历${lunarText(selected)}${extra.names.length?' · '+extra.names.join('、'):''}${extra.term?' · 节气：'+extra.term:''} · ${state.text}`;q('#calendarDetail').dataset.kind=state.kind}

function render(){
 loadYearTerms(year);
 if(!holidayYears.has(year)){try{const cached=JSON.parse(localStorage.getItem(`navdesk-holidays-v1-${year}`));if(cached?.year===year&&cached.entries&&['https://timor.tech/api/holiday/','https://github.com/NateScarlet/holiday-cn'].includes(cached.source)&&typeof cached.checkedAt==='string')holidayYears.set(year,cached)}catch{}}
 const annual=holidayYears.get(year);
 q('#calendarDataSummary').textContent=`${year}年假期：`+(year===2026?'官方安排已核对':annual?'已加载更新数据':'暂无数据，可展开更新');
 q('#holidayVersion').textContent=year===2026?'2026年：已核对官方安排'+(annual?'；接口检查于 '+annual.checkedAt.slice(0,10):''):annual?`${year}年：第三方假期数据，检查于 ${annual.checkedAt.slice(0,10)}，请以官方通知为准`:`${year}年：暂无假期数据，可检查更新`;
 q('#calendarNotice').hidden=year!==2026&&!!annual;
 q('#calendarYear').value=year;q('#calendarMonth').value=month;
 q('#calendarNotice').textContent=year===2026?'2026 年中国大陆统一放假调休安排；“休”包含连休及周末，不等同于全部为法定节假日。':'当前年份未收录官方放假调休安排，放假与补班不作推断。';
 q('#calendarPrev').disabled=year===1900&&month===0;q('#calendarNext').disabled=year===2100&&month===11;
 q('#calendarTermsNotice').textContent=termsByYear.has(year)?'节气按北京时间日期标注。节日、纪念日不代表放假。':termErrors.has(year)?'节气加载失败，可重新打开日历重试；节日与农历仍可查看。':year<1901?'此年份未收录节气。':'正在加载本年节气…';
 const grid=q('#calendarDays');grid.replaceChildren();const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate(),today=dateKey(new Date());
 for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank)}
 for(let day=1;day<=days;day++){
  const date=new Date(year,month,day,12),key=dateKey(date),state=dayStatus(date),button=document.createElement('button');button.type='button';button.className='calendar-day';button.dataset.kind=state.kind;button.dataset.date=key;button.classList.toggle('today',key===today);button.classList.toggle('weekend',[0,6].includes(date.getDay()));button.setAttribute('aria-pressed',String(key===dateKey(selected)));button.setAttribute('aria-label',`${key} 农历${lunarText(date)} ${state.text}`);
  const number=document.createElement('strong');number.textContent=day;const label=document.createElement('small'),extra=events(date);label.textContent=extra.term||extra.names[0]||lunarText(date);label.className=extra.term?'calendar-term':extra.names.length?'calendar-festival':'';button.title=[lunarText(date),...extra.names,extra.term,state.text].filter(Boolean).join(' · ');button.setAttribute('aria-label',key+' '+button.title);button.append(number,label);
  if(['work','rest'].includes(state.kind)){const badge=document.createElement('b');badge.className='calendar-badge';badge.textContent=state.kind==='work'?'班':'休';button.append(badge)}
  button.onclick=()=>{selected=date;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));detail()};grid.append(button);
 }
 detail();
}
function change(delta){const date=new Date(year,month+delta,1,12);if(date.getFullYear()<1900||date.getFullYear()>2100)return;year=date.getFullYear();month=date.getMonth();selected=date;render()}
export function open(){
 if(!dialog){
  const style=document.createElement('style');style.textContent=`
.calendar-dialog{width:min(580px,calc(100vw - 24px));max-height:92dvh;overflow:auto;padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--surface-solid);color:var(--text);box-shadow:var(--shadow)}.calendar-dialog::backdrop{background:#101b2c66}.calendar-head,.calendar-controls{display:flex;align-items:center;gap:10px}.calendar-head{justify-content:space-between;margin-bottom:18px}.calendar-head h2{margin:0;font-size:21px}.calendar-dialog button,.calendar-dialog select{font:inherit;color:inherit;background:var(--surface);border:1px solid var(--line);border-radius:8px;cursor:pointer;padding:8px}.calendar-controls{justify-content:space-between;margin-bottom:14px}.calendar-controls select{min-width:0}.calendar-week,.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.calendar-week{text-align:center;font-size:12px;color:var(--muted);margin-bottom:8px}.calendar-day{position:relative;min-height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}.calendar-day strong{font-size:17px}.calendar-day small{max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10px;color:var(--muted);white-space:nowrap}.calendar-day small.calendar-term{color:#43866d;font-weight:700}.calendar-day small.calendar-festival{color:var(--accent);font-weight:700}.calendar-day.weekend strong{color:var(--muted)}.calendar-day[data-kind=rest] strong{color:#c25b53}.calendar-day[data-kind=work] strong{color:#428077}.calendar-day[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft)}.calendar-day.today{box-shadow:inset 0 -3px var(--accent)}.calendar-badge{position:absolute;right:3px;top:2px;font-size:10px;color:#c25b53}.calendar-day[data-kind=work] .calendar-badge{color:#428077}.calendar-detail{padding:13px;background:var(--accent-soft);border-radius:9px;font-size:13px;line-height:1.8;margin:16px 0 10px}.calendar-notice,.calendar-source{font-size:12px;color:var(--muted);line-height:1.6}.calendar-source a{color:var(--accent)}.calendar-dialog button:disabled{opacity:.35;cursor:default}@media(max-width:650px){.calendar-dialog{padding:16px}.calendar-controls{gap:5px}.calendar-dialog button,.calendar-dialog select{min-height:44px}.calendar-day{min-height:61px!important;padding:4px!important}.calendar-day small{font-size:9px}.calendar-controls select{font-size:14px}.calendar-controls button{padding:5px}.calendar-days{gap:3px}}

.calendar-controls{gap:12px;margin:0 0 16px;padding:0 0 14px;border-bottom:1px solid var(--line)}
.calendar-date-picker{display:flex;align-items:center;gap:2px;min-width:0}
.calendar-controls .calendar-date-picker select{border:0;background:transparent;border-radius:6px;padding:7px 3px;font-size:18px;font-weight:700;letter-spacing:-.02em}
.calendar-month-actions{display:flex;align-items:center;flex:none;padding:3px;background:var(--surface);border:1px solid var(--line);border-radius:10px}
.calendar-controls .calendar-month-actions button{border:0;background:transparent;border-radius:6px;height:32px;padding:0;width:32px;font-size:22px;line-height:1}
.calendar-controls .calendar-month-actions #calendarToday{width:48px;font-size:12px;font-weight:600;color:var(--accent);border-radius:0;border-inline:1px solid var(--line)}
.calendar-controls button:hover,.calendar-controls select:hover{background:var(--accent-soft)}
.calendar-controls button:focus-visible,.calendar-controls select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:650px){.calendar-controls{gap:6px;margin-bottom:12px;padding-bottom:10px}.calendar-controls .calendar-date-picker select{font-size:14px;padding:4px 0;min-height:44px}.calendar-month-actions{padding:0}.calendar-controls .calendar-month-actions button{width:34px;min-height:44px}.calendar-controls .calendar-month-actions #calendarToday{width:44px}}
.calendar-legend,.calendar-explanation{font-size:12px;color:var(--muted);line-height:1.7}.calendar-explanation{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}.calendar-explanation summary{cursor:pointer}.calendar-explanation button{font-size:12px}
`;document.head.append(style);
  dialog=document.createElement('dialog');dialog.className='calendar-dialog';dialog.setAttribute('aria-labelledby','calendarTitle');dialog.innerHTML=`<header class="calendar-head"><h2 id="calendarTitle">万年历</h2><button id="calendarClose" aria-label="关闭日历">×</button></header><div class="calendar-controls"><div class="calendar-date-picker"><select id="calendarYear" aria-label="年份">${Array.from({length:201},(_,i)=>`<option value="${1900+i}">${1900+i}年</option>`).join('')}</select><select id="calendarMonth" aria-label="月份">${Array.from({length:12},(_,i)=>`<option value="${i}">${i+1}月</option>`).join('')}</select></div><div class="calendar-month-actions"><button id="calendarPrev" aria-label="上个月">‹</button><button id="calendarToday" title="回到今天">今天</button><button id="calendarNext" aria-label="下个月">›</button></div></div><div class="calendar-week">${[...'一二三四五六日'].map(v=>`<span>${v}</span>`).join('')}</div><div class="calendar-days" id="calendarDays"></div><p class="calendar-detail" id="calendarDetail" role="status"></p><div class="calendar-legend">休：放假　班：调休补班　底线：今天<br><span id="calendarDataSummary"></span></div><details class="calendar-explanation"><summary>数据说明与更新</summary><p class="calendar-notice" id="calendarNotice"></p><p class="calendar-notice" id="calendarTermsNotice"></p><div class="calendar-source"><a href="${source}" target="_blank" rel="noopener noreferrer">官方通知 · 2026 年放假调休安排</a><br><a href="https://www.hko.gov.hk/sc/gts/time/conversion.htm" target="_blank" rel="noopener noreferrer">节气数据：香港天文台</a><br><a href="https://timor.tech/api/holiday/" target="_blank" rel="noopener noreferrer">年度更新来源：提莫节假日接口</a> / <a href="https://github.com/NateScarlet/holiday-cn" target="_blank" rel="noopener noreferrer">holiday-cn 备用数据</a></div><p id="holidayVersion" class="calendar-notice"></p><button id="updateHolidays" type="button">检查本年假期更新</button><p id="holidayUpdateMessage" class="calendar-notice" role="status"></p></details>`;document.body.append(dialog);
  q('#updateHolidays').onclick=async()=>{const target=year,button=q('#updateHolidays');button.disabled=true;q('#holidayUpdateMessage').textContent=`正在检查 ${target} 年…`;try{const response=await fetch(`/api/calendar?kind=holidays&year=${target}&refresh=1`,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)}),data=await response.json();if(!response.ok)throw Error(data.error||'更新失败');holidayYears.set(target,data);try{localStorage.setItem(`navdesk-holidays-v1-${target}`,JSON.stringify(data))}catch{}q('#holidayUpdateMessage').textContent=`${target} 年数据已更新`+(target===2026?'，继续采用已核对的官方安排':'；来源：'+data.source);render()}catch(error){q('#holidayUpdateMessage').textContent=(error.name==='TimeoutError'?'请求超时':error.message)+'，保留已有数据'}finally{button.disabled=false}};
  q('#calendarClose').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
  q('#calendarPrev').onclick=()=>change(-1);q('#calendarNext').onclick=()=>change(1);q('#calendarYear').onchange=()=>{year=Number(q('#calendarYear').value);selected=new Date(year,month,1,12);render()};q('#calendarMonth').onchange=()=>{month=Number(q('#calendarMonth').value);selected=new Date(year,month,1,12);render()};q('#calendarToday').onclick=()=>{selected=new Date();year=selected.getFullYear();month=selected.getMonth();render()};
 }
 for(const failed of termErrors)attemptedYears.delete(failed);termErrors.clear();
 selected=new Date();year=selected.getFullYear();month=selected.getMonth();render();if(!dialog.open)dialog.showModal();
}
