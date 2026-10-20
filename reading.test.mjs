import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const narouWork = 'https://ncode.syosetu.com/n0686mv/';
const kakuyomuWork = 'https://kakuyomu.jp/works/11054822665065781184';

export function validateReadingPlatforms(reading, episodes, throughEpisode) {
  assert.deepEqual(Object.keys(reading).sort(), ['defaultGroup','kakuyomu','narou','scopeNote']);
  assert.equal(reading.defaultGroup, 'episodes-0-10');
  assert.equal(reading.scopeNote, 'reading-scope');
  assert.equal(reading.narou.label, '小説家になろう');
  assert.equal(reading.narou.workURL, narouWork);
  assert.equal(reading.narou.linkedThroughEpisode, throughEpisode);
  const k = reading.kakuyomu;
  assert.equal(k.label, 'カクヨム');
  assert.equal(k.workURL, kakuyomuWork);
  assert(Number.isInteger(k.linkedThroughEpisode) && k.linkedThroughEpisode >= 0 && k.linkedThroughEpisode <= throughEpisode);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(k.checkedOn) && Number.isFinite(Date.parse(k.checkedOn)));
  assert.deepEqual(k.episodes.map(e => e.number), Array.from({length:k.linkedThroughEpisode+1},(_,i)=>i), 'Missing, duplicate or future Kakuyomu episode');
  const urls = new Set();
  for (const entry of k.episodes) {
    assert.deepEqual(Object.keys(entry).sort(), ['number','title','url']);
    assert.equal(entry.title, episodes.find(e => e.number === entry.number)?.title, 'Publication title mismatch');
    const prefix=kakuyomuWork+'/episodes/';
    assert(typeof entry.url==='string' && entry.url.startsWith(prefix) && /^[0-9]+$/.test(entry.url.slice(prefix.length)), 'Unapproved Kakuyomu destination');
    assert(!urls.has(entry.url), 'Duplicate Kakuyomu URL'); urls.add(entry.url);
  }
}

export function verifyKakuyomuPublicationProof(proof, reading, now = Date.now()) {
  assert.equal(proof.schema, 'kakuyomu-public-index-v1');
  assert.equal(proof.sourceURL, kakuyomuWork);
  assert.equal(proof.statusCode, 200);
  const age = now - Date.parse(proof.checkedAt);
  assert(age >= -60000 && age < 30*60*1000, 'Kakuyomu publication proof is stale or invalid');
  assert.deepEqual(proof.episodes, reading.kakuyomu.episodes, 'Public Kakuyomu titles or URLs do not match');
}

export function verifyReading() {
  const manifest = JSON.parse(readFileSync(new URL('./public-manifest.json', import.meta.url), 'utf8'));
  const html = readFileSync(new URL('./docs/index.html', import.meta.url), 'utf8');
  let checks = 0;
  const check = fn => {fn(); checks++;};
  check(() => validateReadingPlatforms(manifest.readingPlatforms, manifest.episodes, manifest.throughEpisode));
  const reading = manifest.readingPlatforms, k = reading.kakuyomu;
  for (const mutate of [
    value => {value.narou.workURL = 'https://ncode.syosetu.com/another/';},
    value => {value.kakuyomu.workURL += '/another';},
    value => {value.kakuyomu.episodes[0].url = 'https://kakuyomu.jp.evil.invalid/works/11054822665065781184/episodes/1';},
    value => {value.kakuyomu.episodes[0].url = value.kakuyomu.episodes[0].url.replace('kakuyomu.jp','kakuyomuXjp');},
    value => {value.kakuyomu.episodes[0].url += '#unconfirmed';},
    value => {value.kakuyomu.episodes[0].url = value.kakuyomu.episodes[0].url.replace('https:','http:');},
    value => {value.kakuyomu.episodes[0].url = 'https://kakuyomu.jp/works/another/episodes/1';},
    value => {value.kakuyomu.episodes[0].url += '?hidden=1';},
    value => {value.kakuyomu.episodes[1].url = value.kakuyomu.episodes[0].url;},
    value => {value.kakuyomu.episodes[0].title = 'unconfirmed';},
    value => {value.kakuyomu.episodes.pop();},
    value => {value.kakuyomu.episodes.push({...value.kakuyomu.episodes[0]});},
    value => {value.kakuyomu.linkedThroughEpisode = manifest.throughEpisode+1;},
    value => {value.kakuyomu.episodes[0].privatePath = 'synthetic';},
    value => {value.kakuyomu.checkedOn = 'invalid';}
  ]) check(() => {const value=structuredClone(reading); mutate(value); assert.throws(()=>validateReadingPlatforms(value,manifest.episodes,manifest.throughEpisode));});

  const entries = [...html.matchAll(/<article class="episode-entry" data-episode="(\d+)">([\s\S]*?)<\/article>/g)];
  check(() => assert.deepEqual(entries.map(e=>Number(e[1])), manifest.episodes.map(e=>e.number)));
  for (const entry of entries) check(() => {
    const number = Number(entry[1]), canonical = manifest.episodes.find(e=>e.number===number);
    assert(entry[2].includes('<h3>'+canonical.title+'</h3>'));
    const links=[...entry[2].matchAll(/<a href="([^"]+)"[^>]*data-reading-platform="([^"]+)"[^>]*>/g)];
    const secondary=k.episodes.find(e=>e.number===number);
    assert.deepEqual(links.map(link=>[link[2],link[1]]), [['narou',canonical.url],...(secondary?[['kakuyomu',secondary.url]]:[])]);
    assert(links.every(link=>link[0].includes('target="_blank"')&&link[0].includes('rel="noopener noreferrer"')));
  });
  check(() => {
    const hero=html.match(/<div class="hero-actions reading-options" id="read-platforms"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    assert(hero && hero.includes('href="'+narouWork+'"') && hero.includes('href="'+kakuyomuWork+'"'));
    assert(html.includes('class="header-read" href="#read-platforms"'));
    const footer=html.match(/<nav class="footer-reading-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert(footer && footer.includes('href="'+narouWork+'"') && footer.includes('href="'+kakuyomuWork+'"'));
    assert(html.includes('id="news-kakuyomu"') && html.includes('カクヨムで連載を開始しました'));
  });
  check(() => {
    assert(html.includes('id="reading-scope"') && html.includes('掲載先によって連載の進み方が異なります'));
    const openGroups=[...html.matchAll(/<details class="episode-group" id="([^"]+)" open>/g)].map(m=>m[1]);
    assert.deepEqual(openGroups,['episodes-0-10']);
    assert(html.includes('カクヨム 第0〜'+k.linkedThroughEpisode+'話（'+k.checkedOn.replace(/(\d{4})-(\d{2})-(\d{2})/,'$1年$2月$3日')+'確認）'));
  });
  const proof = {schema:'kakuyomu-public-index-v1',sourceURL:kakuyomuWork,statusCode:200,checkedAt:'2026-10-20T12:16:58.000Z',episodes:structuredClone(k.episodes)};
  const now=Date.parse(proof.checkedAt)+60000;
  check(() => verifyKakuyomuPublicationProof(proof,reading,now));
  for(const mutate of [
    value=>{value.schema='unconfirmed';}, value=>{value.statusCode=403;}, value=>{value.sourceURL+='other';},
    value=>{value.checkedAt='2026-10-19T00:00:00Z';}, value=>{value.checkedAt='2026-10-21T00:00:00Z';},
    value=>{value.episodes[0].url += '0';}, value=>{value.episodes.pop();}
  ]) check(()=>{const value=structuredClone(proof);mutate(value);assert.throws(()=>verifyKakuyomuPublicationProof(value,reading,now));});
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify({verified:true,readingChecks:verifyReading(),externalRequests:0}));
