import test from 'node:test';import assert from 'node:assert/strict';import {matchesText,romanize} from '../search.mjs';
test('Chinese names match full pinyin, initials, uppercase, accents and mixed input',()=>{
 for(const query of ['京东','jingdong','jd','JD','京dong','JĪNGDŌNG'])assert.equal(matchesText('京东 购物与生活',[query]),true,query);
 for(const query of ['guomei','gm','国mei'])assert.equal(matchesText('国美统一登录 工作',[query]),true,query);
 assert.equal(matchesText('腾讯云 云服务',['txy']),true);
 assert.equal(matchesText('京东 购物与生活',['jingdong','gouwu']),true);
 assert.equal(matchesText('京东 购物与生活',['jingdong','missing']),false);
});
test('mixed Latin labels and common multi-character readings retain meaning',()=>{
 assert.equal(romanize('重庆银行').full,'chongqingyinhang');assert.equal(matchesText('重庆银行',['cqyh']),true);
 assert.equal(matchesText('HHanClub PT 影音视频',['hhanclub']),true);
 assert.equal(matchesText('OpenList 管理后台',['openlist','glht']),true);
 assert.equal(matchesText('京东 购物',['淘宝']),false);assert.equal(matchesText('百度',['百杜']),false);
});
