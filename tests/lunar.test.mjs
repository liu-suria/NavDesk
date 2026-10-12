import test from 'node:test';import assert from 'node:assert/strict';import {getLunar,lunarLabel} from '../lunar.mjs';
test('Beijing lunar dates match HKO calendar including month boundaries and leap months',()=>{
 for(const [date,label]of [['2026-02-17','正月初一'],['2026-09-25','八月十五'],['2026-10-10','九月初一'],['2026-10-12','九月初三'],['2023-03-22','闰二月初一']])assert.equal(lunarLabel(new Date(date+'T12:00:00+08:00')),label);
 assert.equal(lunarLabel(new Date('2026-10-10T12:00:00+08:00'),true),'九月');assert.equal(lunarLabel(new Date('2026-10-12T12:00:00+08:00'),true),'初三');assert.equal(lunarLabel(new Date('2026-10-09T16:05:00Z')),'九月初一');assert.equal(getLunar(new Date('2023-03-22T12:00:00+08:00')).leap,true);
});
