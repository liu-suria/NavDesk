import test from 'node:test';import assert from 'node:assert/strict';import {readNavigation} from '../edge-functions/_navigation-read.js';
test('list uses authenticated edge read but never regresses below writer version',async()=>{
 const calls=[],old={updatedAt:'2026-10-10T00:00:00.000Z',groups:[]},fresh={updatedAt:'2026-10-12T00:00:00.000Z',groups:[]};const store={get:async(key,options)=>{calls.push(options.consistency);return options.consistency==='strong'?fresh:old}};
 assert.equal((await readNavigation(store,{list:true})).updatedAt,old.updatedAt);assert.deepEqual(calls,['eventual']);calls.length=0;
 assert.equal((await readNavigation(store,{list:true,minVersion:fresh.updatedAt})).updatedAt,fresh.updatedAt);assert.deepEqual(calls,['eventual','strong']);calls.length=0;
 await readNavigation(store);assert.deepEqual(calls,['strong']);
});
test('explicit fresh reads and missing objects keep stable shape',async()=>{let consistency;const value=await readNavigation({get:async(k,o)=>{consistency=o.consistency;return null}},{list:true,fresh:true});assert.equal(consistency,'strong');assert.deepEqual(value.groups,[])});
