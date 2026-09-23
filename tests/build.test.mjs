import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('homepage keeps editing and recovery outside the critical payload',()=>{
 const html=read('index.html');
 assert.ok(gzipSync(html).length<14*1024,'critical homepage gzip budget is 14 KiB');
 assert.ok(!/<script[^>]+src=|rel="stylesheet"/.test(html),'no render-blocking external files');
 assert.ok(!html.includes('id="quickEditor"')&&!html.includes('id="sortEditor"'),'dialog DOM is lazy');
 assert.ok(!html.includes('export function recover')&&!html.includes('function drawSort'),'editor code is lazy');
 assert.ok(html.indexOf('window.navdeskBoot')<html.indexOf('<style>'),'data request begins before CSS parsing');
});
test('all generated module dependencies resolve and template tokens are replaced',()=>{
 const seen=new Set();
 function inspect(path){if(seen.has(path))return;seen.add(path);const text=read(path);
  if(path.endsWith('.mjs'))execFileSync(process.execPath,['--check',fileURLToPath(new URL('../'+path,import.meta.url))]);
  assert.ok(!/__\w+_URL__|__EDITOR_HTML__|__TERMS_2026__/.test(text),path+' has no unresolved templates');
  for(const match of text.matchAll(/["']\.?\/((?:calendar|editor|dialogs|manage|model|navschema|recovery)\.[a-f0-9]{12}\.mjs)["']/g)){
   assert.ok(existsSync(new URL('../'+match[1],import.meta.url)),match[1]);inspect(match[1]);
  }
 }
 inspect('index.html');inspect('admin/index.html');assert.ok(seen.size>=9,'walk both entrypoints and lazy modules');
});
