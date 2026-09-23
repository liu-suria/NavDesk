import {readFileSync, writeFileSync, readdirSync, unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const read = name => readFileSync(name, 'utf8');
const inlineJS = text => text.replace(/<\/script/gi, '<\\/script');
const css = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
const asset=(name,text)=>{const path=`${name}.${createHash('sha256').update(text).digest('hex').slice(0,12)}.mjs`;writeFileSync(path,text);return path};
const uiURL=asset('dialogs',`const style=document.createElement('style');style.textContent=${JSON.stringify(css(read('interactions.css')))};document.head.append(style);`);
const lazyStyle=text=>`import './${uiURL}';\n`+text;
const recoveryURL=asset('recovery',lazyStyle(read('recovery.mjs')));
const calendarURL=asset('calendar',read('calendar.mjs').replace('__TERMS_2026__',JSON.stringify(JSON.parse(read('calendar-data/2026.json')))));
const schemaURL=asset('navschema',read('edge-functions/_navigation-model.js'));
const modelURL=asset('model',read('model.mjs').replace('./edge-functions/_navigation-model.js','./'+schemaURL));
const manageURL=asset('manage',lazyStyle(read('manage.mjs').replace('__MODEL_URL__',modelURL)));
const editorURL=asset('editor',lazyStyle(read('editor.mjs').replace('__EDITOR_HTML__',()=>JSON.stringify(read('templates/editor.html'))).replaceAll('__MODEL_URL__',modelURL)));
for (const [name, output, script, styles] of [
  ['home', 'index.html', 'app.js', ['style.css']],
  ['admin', 'admin/index.html', 'admin/app.js', ['style.css', 'admin/admin.css']],
]) {
  const html = read(`templates/${name}.html`)
    .replace('<!-- BOOT -->', () => `<script>${inlineJS(read('boot.js').replace('__RECOVERY_URL__',recoveryURL))}</script>`)
    .replace('<!-- STYLE -->', () => `<style>${css(styles.map(read).join('\n'))}</style>`)
    .replace('<!-- APP -->', () => `<script>${inlineJS(read('icons.js')+'\n'+read('services.js')+'\n'+read('manager-loader.js').replace('__MANAGE_URL__',manageURL)+'\n'+read(script).replace('__CALENDAR_URL__',calendarURL).replaceAll('__MODEL_URL__',modelURL).replace('__EDITOR_URL__',editorURL))}</script>`);
  writeFileSync(output, html);
  console.log(`${output}: ${Buffer.byteLength(html)} B; gzip ${gzipSync(html).length} B; no external JS/CSS`);
}

// Only remove obsolete generated assets after every output has been written.
const currentAssets=new Set([calendarURL,modelURL,manageURL,schemaURL,uiURL,recoveryURL,editorURL]);
// Content-addressed public code can be reused indefinitely; private API data is never cached here.
const deployment=JSON.parse(read('edgeone.json'));
deployment.headers=deployment.headers.filter(rule=>!/^\/(calendar|model|manage|navschema|dialogs|recovery|editor)\.[a-f0-9]{12}\.mjs$/.test(rule.source));
for(const path of currentAssets)deployment.headers.unshift({source:'/'+path,headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]});
writeFileSync('edgeone.json',JSON.stringify(deployment,null,2)+'\n');
for(const file of readdirSync('.'))if(/^(calendar|model|manage|navschema|dialogs|recovery|editor)\.[a-f0-9]{12}\.mjs$/.test(file)&&!currentAssets.has(file))unlinkSync(file);
