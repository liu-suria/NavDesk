// NavDesk JavaScript module v2
import {PINYINS,UNIHANS,EXCEPTIONS} from './pinyin.d4bec1553626.mjs';
const collator=new Intl.Collator('zh-CN-u-co-pinyin');
const cache=new Map();
function syllable(ch){
 if(EXCEPTIONS[ch])return EXCEPTIONS[ch].toLowerCase();
 if(!/\p{Script=Han}/u.test(ch))return ch.toLowerCase();
 let low=0,high=UNIHANS.length-1;
 while(low<=high){const mid=(low+high)>>1,cmp=collator.compare(ch,UNIHANS[mid]);if(cmp===0)return PINYINS[mid].toLowerCase();if(cmp>0)low=mid+1;else high=mid-1}
 return PINYINS[Math.max(0,high)]?.toLowerCase()||ch;
}
export function romanize(value){
 // Common multi-character readings that differ from standalone character order.
 const readings={'重庆':['chong','qing'],'音乐':['yin','yue'],'银行':['yin','hang'],'厦门':['xia','men'],'长城':['chang','cheng']};
 const tokens=[];let i=0;const chars=[...value];
 while(i<chars.length){const word=chars.slice(i,i+2).join('');if(readings[word]){tokens.push(...readings[word]);i+=2}else tokens.push(syllable(chars[i++]))}
 return {full:tokens.join(''),initials:tokens.map(t=>/^[a-z]+$/.test(t)?t[0]:t).join('')};
}
const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v');
export function matchesText(text,terms){
 const normalized=normalize(text);
 if(!cache.has(text)){const p=romanize(normalized);cache.set(text,{...p,text:normalized})}
 const entry=cache.get(text);
 return terms.every(value=>{const term=normalize(value);if(/\p{Script=Han}/u.test(term)&&!/[a-z]/.test(term))return entry.text.includes(term);return entry.text.includes(term)||(/[aeiouv]/.test(term)&&entry.full.includes(romanize(term).full))||entry.initials.includes(romanize(term).full)});
}
const $=(selector,root)=>root.querySelector(selector);
function highlightName(tile,terms){
 const node=$('strong',tile),name=tile.dataset.name;if(node.__query===terms.join(' '))return;node.__query=terms.join(' ');if(!terms.length&&node.textContent===name)return;node.replaceChildren();
 const lower=name.toLowerCase(),positions=new Set();for(const term of terms){let at=lower.indexOf(term);while(at>=0){for(let i=at;i<at+term.length;i++)positions.add(i);at=lower.indexOf(term,at+term.length)}}
 let start=0;while(start<name.length){const marked=positions.has(start);let end=start+1;while(end<name.length&&positions.has(end)===marked)end++;const text=name.slice(start,end);if(marked){const mark=document.createElement('mark');mark.textContent=text;node.append(mark)}else node.append(document.createTextNode(text));start=end}
}
export function createSearch(){return {matches:matchesText,highlight:highlightName}}
