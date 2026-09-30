import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const expectedAssets=['01-title-logo-v01.png','02-naoto-design-v01.png','03-mio-design-v01.png','04-makoto-design-v01.png','05-key-visual-v01.png','07-social-preview-v01.png','08-x-header-v01.png','icon.svg','teaser-30s-v02.mp4'];
const expectedRoot=['README.md','.gitignore','.gitattributes','verify.mjs','public-manifest.json','docs'];
assert.deepEqual(readdirSync(root).filter(name=>name!=='.git').sort(),expectedRoot.sort(),'Unexpected repository file');
assert.deepEqual(readdirSync(path.join(root,'docs')).sort(),['.nojekyll','assets','index.html','style.css'],'Unexpected public entry');
assert.deepEqual(readdirSync(path.join(root,'docs/assets')).sort(),expectedAssets.sort(),'Unexpected public asset');
const expectedFiles=['docs/.nojekyll','docs/index.html','docs/style.css',...expectedAssets.map(name=>`docs/assets/${name}`)].sort();
const manifest=JSON.parse(readFileSync(path.join(root,'public-manifest.json'),'utf8'));
assert.equal(manifest.schema,'public-static-site-v1');
assert.equal(manifest.repository,'kiraboshi-neko/40sai-space-trip-site','Wrong IP owner');
assert(/^[a-zA-Z0-9-]+\/40sai-space-trip-site$/.test(manifest.repository),'Unexpected IP repository');
const [owner,repoName]=manifest.repository.split('/');
assert.equal(manifest.origin,`https://${owner}.github.io/${repoName}`);
assert.deepEqual(manifest.files.map(file=>file.path).sort(),expectedFiles);
for(const name of ['docs','docs/assets']) {
 const stat=lstatSync(path.join(root,name));
 assert(stat.isDirectory()&&!stat.isSymbolicLink(),'Public directory must not be a link');
}
for(const item of manifest.files) {
 const filename=path.join(root,item.path); const stat=lstatSync(filename);
 assert(stat.isFile()&&!stat.isSymbolicLink(),`Not a regular file: ${item.path}`);
 const bytes=readFileSync(filename);
 assert.equal(bytes.length,item.bytes,`Size mismatch: ${item.path}`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,`Hash mismatch: ${item.path}`);
}
const html=readFileSync(path.join(root,'docs/index.html'),'utf8');
assert(html.includes('<small>著者：綺羅星の猫</small>'),'Public author credit missing');
assert(readFileSync(path.join(root,'README.md'),'utf8').includes('。著者：綺羅星の猫。'),'Repository author credit missing');
assert(!html.includes('{{'),'Unresolved template');
assert(!html.includes('.chatgpt.site'),'Old hosting reference');
assert(html.includes(`rel="canonical" href="${manifest.origin}/"`));
assert(html.includes(`og:image" content="${manifest.origin}/assets/07-social-preview-v01.png"`));
assert(html.includes('高瀬真琴'));
assert.equal((html.match(/<h3>UNKNOWN<\/h3>/g)||[]).length,2);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate anchor');
for(const match of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)) {
 const value=match[1];
 if(value.startsWith('#')) assert(ids.includes(value.slice(1)),`Missing anchor: ${value}`);
 else if(!value.startsWith('https://')) assert(existsSync(path.join(root,'docs',value)),`Missing resource: ${value}`);
 else assert(value.startsWith(`${manifest.origin}/`)||value==='https://ncode.syosetu.com/n0686mv/',`Unexpected external URL: ${value}`);
}
assert(html.includes('controls playsinline')&&html.includes('assets/teaser-30s-v02.mp4'),'Instrumental video missing');
assert(!/<track\b/.test(html),'Browser captions would duplicate burned-in subtitles');
assert(html.includes('class="pv-transcript"'),'Accessible transcript missing');
console.log(JSON.stringify({verified:true,publicFiles:expectedFiles.length,unknownSlots:2,exactAllowlist:true,sha256:true}));
