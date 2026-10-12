import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function harness(){
 const images=[],window={};
 class Image{constructor(){images.push(this)}cloneNode(){return {src:this.src}}}
 const icons=runInNewContext(readFileSync(new URL('../icons.js',import.meta.url),'utf8')+';window.navdeskIcons',{window,Image,requestAnimationFrame:callback=>callback(),setTimeout:()=>1,clearTimeout:()=>{},URL,location:{href:'https://nav.example/'}});
 const node=url=>({dataset:{icon:url},isConnected:true,children:[],classList:{add(){this.ready=true}},append(image){this.children.push(image)}});
 const schedule=nodes=>icons.schedule({querySelectorAll:()=>nodes});
 return {images,node,schedule};
}
test('visible duplicate icons share one load and subsequent renders reuse its result',()=>{
 const {images,node,schedule}=harness(),a=node('/icon/a'),b=node('/icon/a');schedule([a,b]);assert.equal(images.length,1);
 Object.assign(images[0],{naturalWidth:32,naturalHeight:32});images[0].onload();assert.equal(a.children.length,1);assert.equal(b.children.length,1);
 const next=node('/icon/a');schedule([next]);assert.equal(images.length,1);assert.equal(next.children[0].src,'/icon/a');
});
test('icon queue remains bounded and failed icons keep text fallback',()=>{
 const {images,node,schedule}=harness(),nodes=Array.from({length:7},(_,i)=>node('/icon/'+i));schedule(nodes);assert.equal(images.length,4);
 images[0].onerror();assert.equal(images.length,5);assert.equal(nodes[0].children.length,0);
 const duplicate=node('/icon/0');schedule([duplicate]);assert.equal(images.length,5);assert.equal(duplicate.children.length,0);
});
