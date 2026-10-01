import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const expectedAssets=['01-title-logo-v01.png','02-naoto-design-v01.png','03-mio-design-v01.png','04-makoto-design-v01.png','04-makoto-design-v02.png','05-key-visual-v01.png','05-key-visual-v02.png','07-social-preview-v01.png','07-social-preview-v02.png','07-social-preview-v03.png','08-x-header-v01.png','icon.svg','teaser-30s-v02.mp4'];
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
assert(html.includes(`og:image" content="${manifest.origin}/assets/07-social-preview-v03.png"`));
assert(html.includes('高瀬真琴'));
assert.equal(manifest.throughEpisode,20,'Public scope must match the approved publication boundary');
assert(Array.isArray(manifest.episodes),'Published episode metadata missing');
assert.deepEqual(manifest.episodes.map(e=>e.number),Array.from({length:manifest.throughEpisode+1},(_,i)=>i),'Episode gap or future episode');
function groupBounds(number){const start=number<=10?0:Math.floor((number-1)/10)*10+1;return [start,start===0?10:start+9];}
assert.deepEqual(groupBounds(0),[0,10]);
assert.deepEqual(groupBounds(10),[0,10]);
assert.deepEqual(groupBounds(11),[11,20]);
assert.deepEqual(groupBounds(21),[21,30]);
const groups=[...html.matchAll(/<details class="episode-group" id="episodes-(\d+)-(\d+)"(?: open)?><summary>[\s\S]*?<\/summary><div class="episode-list">([\s\S]*?)<\/div><\/details>/g)];
assert.deepEqual(groups.map(g=>[Number(g[1]),Number(g[2])]),[[0,10],[11,20]],'Published episode grouping mismatch');
const episodeLinks=[];
for(const group of groups){
 const links=[...group[3].matchAll(/<a href="([^"]+)"[^>]*aria-label="第(\d+)話 ([^"]+)を読む"><span>EPISODE \d+<\/span><strong>([^<]+)<\/strong>/g)];
 assert.equal(links.length,Number(group[2])-Number(group[1])+1,'Missing or duplicate group links');
 for(const link of links){
  const number=Number(link[2]),record=manifest.episodes.find(e=>e.number===number);
  assert(record&&number<=manifest.throughEpisode,'Unpublished episode link');
  assert.deepEqual(groupBounds(number),[Number(group[1]),Number(group[2])],'Episode in the wrong group');
  assert.equal(link[1],record.url);assert.equal(link[3],record.title);assert.equal(link[4],record.title);
  assert.equal(record.url,`https://ncode.syosetu.com/n0686mv/${number+1}/`,'Chapter numbering must include EP0');
  episodeLinks.push(number);
 }
}
assert.deepEqual(episodeLinks,manifest.episodes.map(e=>e.number),'Duplicate or missing published episode');
assert(html.includes('第0話から第20話まで公開中。'));
assert(!html.includes('第0話から第10話まで掲載。'),'Stale publication count');
assert(!html.includes('id="episodes-21-30"'),'Unpublished group is exposed');
assert(html.includes('class="hero-media"><img class="hero-art"'),'Hero artwork needs its own layout track');
assert(!html.includes('class="hero-shade"'),'Full-cover image overlay is still enabled');
const css=readFileSync(path.join(root,'docs/style.css'),'utf8');
assert(css.includes('.hero .hero-art{position:static;'),'Hero artwork must not cover copy');
assert(css.includes('grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)'),'Separated desktop layout missing');
assert(css.includes('@media(max-width:1000px)'),'Stacked mobile/tablet layout missing');
assert(html.includes('class="hero-art" src="assets/05-key-visual-v02.png"'),'Updated TOP visual missing');
assert(html.includes('poster="assets/05-key-visual-v02.png"'),'Updated video poster missing');
assert.equal((html.match(/assets\/04-makoto-design-v02\.png/g)||[]).length,3,'Updated Mako portrait and design links missing');
assert.equal((html.match(/assets\/07-social-preview-v03\.png/g)||[]).length,4,'Updated card and sharing images missing');
assert(!/assets\/(?:(?:04-makoto-design|05-key-visual)-v01|07-social-preview-v0[12])\.png/.test(html),'An active Mako image still uses a previous version');
assert.equal((html.match(/<h3>UNKNOWN<\/h3>/g)||[]).length,2);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate anchor');
for(const match of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)) {
 const value=match[1];
 if(value.startsWith('#')) assert(ids.includes(value.slice(1)),`Missing anchor: ${value}`);
 else if(!value.startsWith('https://')) assert(existsSync(path.join(root,'docs',value.split('?')[0])),`Missing resource: ${value}`);
 else assert(value.startsWith(`${manifest.origin}/`)||value==='https://ncode.syosetu.com/n0686mv/'||manifest.episodes.some(e=>e.url===value),`Unexpected external URL: ${value}`);
}
assert(html.includes('controls playsinline')&&html.includes('assets/teaser-30s-v02.mp4'),'Instrumental video missing');
assert(!/<track\b/.test(html),'Browser captions would duplicate burned-in subtitles');
assert(html.includes('class="pv-transcript"'),'Accessible transcript missing');
console.log(JSON.stringify({verified:true,publicFiles:expectedFiles.length,unknownSlots:2,throughEpisode:manifest.throughEpisode,episodeLinks:episodeLinks.length,groups:groups.length,heroSeparated:true,exactAllowlist:true,sha256:true}));
