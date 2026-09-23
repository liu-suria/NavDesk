import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHolidays,validatePublicHolidays,loadHolidays} from '../edge-functions/_holidays.js';
test('annual updates reject missing data and malformed dates',()=>{
 assert.throws(()=>validateHolidays({code:0,holiday:{}},2027));assert.throws(()=>validateHolidays({code:0,holiday:{'02-30':{holiday:true,name:'fake'}}},2026));
 const entries=validateHolidays({code:0,holiday:{'09-20':{holiday:false,name:'国庆调休',date:'2026-09-20'}}},2026);assert.equal(entries['2026-09-20'].kind,'work');
});
test('public dataset validates notice and handles cross-year rows',()=>{
 const result=validatePublicHolidays({year:2025,papers:['https://www.gov.cn/'],days:[{date:'2025-01-01',name:'元旦',isOffDay:true},{date:'2024-12-31',name:'test',isOffDay:true}]},2025);assert.deepEqual(Object.keys(result),['2025-01-01']);
 assert.throws(()=>validatePublicHolidays({year:2027,papers:[],days:[]},2027));
});
test('failed primary uses fallback and merges next notice December adjustments',async()=>{
 const data=await loadHolidays(2025,async url=>{
  if(url.includes('timor'))return new Response('',{status:403});
  const next=url.includes('2026.json');return Response.json({year:next?2026:2025,papers:['https://www.gov.cn/'],days:next?[{date:'2025-12-31',name:'元旦',isOffDay:false}]:[{date:'2025-01-01',name:'元旦',isOffDay:true}]});
 });assert.equal(data.entries['2025-12-31'].kind,'work');assert.equal(data.source,'https://github.com/NateScarlet/holiday-cn');
});
