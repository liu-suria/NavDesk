import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTerms,loadTerms} from '../edge-functions/_calendar.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const asset=html.match(/import\('\/(calendar\.[a-f0-9]+\.mjs)'\)/)[1];
const {dayStatus,festivals}=await import('../'+asset);
const date=s=>new Date(s+'T12:00:00');
test('official makeup days differ from festivals',()=>{
 assert.equal(dayStatus(date('2026-09-20')).kind,'work');assert.equal(dayStatus(date('2026-09-25')).kind,'rest');assert.equal(dayStatus(date('2027-10-01')).kind,'unknown');assert.deepEqual(festivals(date('2026-09-25')),['中秋节']);
});
test('traditional, fixed, floating festivals and lunar new year eve',()=>{
 for(const [day,name] of [['2026-02-16','除夕'],['2026-02-17','春节'],['2026-03-03','元宵节'],['2026-06-19','端午节'],['2026-05-10','母亲节'],['2026-06-21','父亲节'],['2026-10-01','国庆节']])assert.ok(festivals(date(day)).includes(name),day);
 assert.ok(!festivals(date('2023-03-23')).includes('龙抬头'),'no festival on leap second month');
});
test('solar term parser validates full year and rejects incomplete upstream data',async()=>{
 const terms=JSON.parse(readFileSync(new URL('../calendar-data/2026.json',import.meta.url)));
 const text=Object.entries(terms).map(([key,name])=>{const [y,m,d]=key.split('-');return `${y}年${Number(m)}月${Number(d)}日 初一 星期一 ${name}`}).join('\n');
 assert.deepEqual(parseTerms(text,2026),terms);assert.equal(terms['2026-09-23'],'秋分');assert.throws(()=>parseTerms('error',2026));
 await assert.rejects(()=>loadTerms(1899,()=>assert.fail('no network')));
 await assert.rejects(()=>loadTerms(2026,async()=>new Response('upstream offline',{status:503})));
});
