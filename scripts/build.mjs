import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const read = name => readFileSync(name, 'utf8');
const inlineJS = text => text.replace(/<\/script/gi, '<\\/script');
const css = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
for (const [name, output, script, styles] of [
  ['home', 'index.html', 'app.js', ['style.css']],
  ['admin', 'admin/index.html', 'admin/app.js', ['style.css', 'admin/admin.css']],
]) {
  const html = read(`templates/${name}.html`)
    .replace('<!-- BOOT -->', () => `<script>${inlineJS(read('boot.js'))}</script>`)
    .replace('<!-- STYLE -->', () => `<style>${css(styles.map(read).join('\n'))}</style>`)
    .replace('<!-- APP -->', () => `<script>${inlineJS(read('icons.js')+'\n'+read(script))}</script>`);
  writeFileSync(output, html);
  console.log(`${output}: ${Buffer.byteLength(html)} B; gzip ${gzipSync(html).length} B; no external JS/CSS`);
}
