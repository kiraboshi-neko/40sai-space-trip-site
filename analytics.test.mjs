import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {pathToFileURL} from 'node:url';

const source = readFileSync(new URL('./docs/analytics.js', import.meta.url), 'utf8');
const id = '5dd0ffe5-4dc6-4f44-8b26-810e4a3bead4';
const key = '40sai-space-trip.analytics-excluded';
const sitePath = '/40sai-space-trip-site/';
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(options = {}) {
  const received = [], scripts = [], timers = new Map(), stored = new Map(Object.entries(options.stored || {}));
  let reloads = 0;
  function element(extra = {}) {
    const listeners = new Map();
    return {hidden: true, textContent: '', ...extra, listeners,
      addEventListener(type, handler) { listeners.set(type, handler); },
      fire(type, event = {}) { listeners.get(type)?.(event); }};
  }
  const config = element({dataset: {websiteId: options.websiteID ?? id, enabled: options.enabled ?? 'true'}});
  const status = element(), toggle = element(), pv01 = element(), pv02 = element();
  const elements = new Map([['site-analytics', config], ['analytics-status', status], ['analytics-toggle', toggle], ['pv01-video', pv01], ['pv02-video', pv02]]);
  const document = element({referrer: options.referrer || '',
    getElementById(name) { return elements.get(name); },
    createElement() { return {dataset: {}, remove() { this.removed = true; }}; },
    head: {append(script) { scripts.push(script); }}});
  const window = element({doNotTrack: options.windowDNT});
  if (options.existingTracker) window.umami = {};
  const location = {origin: options.origin ?? 'https://kiraboshi-neko.github.io', pathname: options.path ?? sitePath,
    search: options.search || '', reload() { reloads++; }};
  const navigator = {webdriver: options.webdriver ?? false, doNotTrack: options.dnt, globalPrivacyControl: options.gpc};
  const localStorage = {
    getItem(name) { if (options.storageDenied) throw new Error('Storage disabled'); return stored.get(name) ?? null; },
    setItem(name, value) { if (options.writeDenied || options.storageDenied) throw new Error('Storage disabled'); stored.set(name, value); },
    removeItem(name) { if (options.storageDenied) throw new Error('Storage disabled'); stored.delete(name); }};
  runInNewContext(source, {document, window, location, navigator, localStorage, URL, URLSearchParams,
    setTimeout(handler) { const token = timers.size + 1; timers.set(token, handler); return token; },
    clearTimeout(token) { timers.delete(token); }});
  const load = () => {
    window.umami = {track(payload) {
      const safe = window.spaceTripBeforeSend('event', payload);
      if (safe) received.push(plain(safe));
      return Promise.resolve(); }};
    scripts[0]?.onload();
  };
  const click = (href, area = 'other', extra = {}) => {
    const link = {href, closest(selector) {
      const map = {header: 'header', '#top': 'hero', '#episode': 'episode', '#world': 'world', '#character': 'character', footer: 'footer'};
      return map[selector] === area ? {} : null; }};
    const event = {target: {closest: () => link}, defaultPrevented: false, ...extra};
    document.fire(extra.type || 'click', event);
  };
  return {received, scripts, timers, stored, status, toggle, pv01, pv02, window, load, click, reloads: () => reloads};
}

export function verifyAnalytics() {
  let checks = 0;
  const check = work => { work(); checks++; };
  for (const options of [
    {origin: 'http://127.0.0.1:4184'}, {origin: 'null'}, {origin: 'https://example.invalid'},
    {path: '/another-work/'}, {path: sitePath + 'assets/test.html'}, {path: sitePath + 'future/'},
    {webdriver: true}, {dnt: '1'}, {dnt: 'yes'}, {windowDNT: '1'}, {gpc: true},
    {storageDenied: true}, {websiteID: ''}, {websiteID: 'invalid'}, {enabled: 'false'},
    {search: '?analytics=off'}, {stored: {[key]: '1'}}, {existingTracker: true}
  ]) check(() => { const f = fixture(options); assert.equal(f.scripts.length, 0); assert.equal(f.received.length, 0); });

  check(() => {
    const f = fixture({search: '?analytics=exclude'});
    assert.equal(f.scripts.length, 0); assert.equal(f.stored.get(key), '1'); assert.equal(f.stored.size, 1);
  });
  check(() => {
    const f = fixture({path: sitePath + 'index.html'}); f.load();
    assert.equal(f.received.length, 1); assert.equal(f.received[0].url, sitePath);
  });
  check(() => {
    const f = fixture({search: '?email=synthetic@example.invalid#private', referrer: 'https://example.invalid/private?secret=synthetic'});
    assert.equal(f.scripts.length, 1);
    const script = f.scripts[0];
    assert.equal(script.src, 'https://cloud.umami.is/script.js'); assert.equal(script.referrerPolicy, 'no-referrer');
    assert.equal(script.dataset.autoTrack, 'false'); assert.equal(script.dataset.beforeSend, 'spaceTripBeforeSend');
    assert.equal(script.dataset.websiteId, id); assert.equal(script.dataset.doNotTrack, 'true');
    f.load();
    assert.deepEqual(f.received, [{website: id, hostname: 'kiraboshi-neko.github.io', title: '40歳、宇宙出張。｜公式サイト', url: sitePath, referrer: ''}]);
    f.window.fire('hashchange'); f.window.fire('popstate'); assert.equal(f.received.length, 1);
  });
  for (const options of [{search: '?utm_source=x&secret=synthetic'}, {search: '?utm_source=TWITTER'}, {referrer: 'https://t.co/private?secret=synthetic'}, {referrer: 'https://x.com/author/status/123'}]) check(() => {
    const f = fixture(options); f.load(); assert.equal(f.received[0].referrer, 'https://x.com/'); assert.equal(f.received[0].url, sitePath);
    assert(!JSON.stringify(f.received).includes('synthetic'));
  });
  check(() => {
    const f = fixture({referrer: 'https://x.com.example.invalid/'}); f.load(); assert.equal(f.received[0].referrer, '');
  });
  check(() => {
    const f = fixture(); f.load();
    for (const area of ['header', 'hero', 'episode', 'world', 'character', 'footer', 'other']) f.click('https://ncode.syosetu.com/n0686mv/', area);
    assert.deepEqual(f.received.slice(1).map(p => p.data.placement), ['header', 'hero', 'episode', 'world', 'character', 'footer', 'other']);
    f.click('https://ncode.syosetu.com/n0686mv/1/', 'episode'); f.click('https://ncode.syosetu.com/n0686mv/41/', 'episode', {type: 'auxclick', button: 1});
    assert.equal(f.received.at(-2).data.episode, 0); assert.equal(f.received.at(-1).data.episode, 40);
    const count = f.received.length;
    for (const href of ['https://ncode.syosetu.com/n0686mv/42/', 'https://ncode.syosetu.com/n0686mv/0/', 'https://ncode.syosetu.com/other/', 'https://example.invalid/']) f.click(href);
    f.click('https://ncode.syosetu.com/n0686mv/', 'other', {defaultPrevented: true});
    assert.equal(f.received.length, count);
  });
  check(() => {
    const f = fixture(); f.load(); f.pv01.fire('play'); f.pv02.fire('pause'); assert.equal(f.received.length, 1);
    f.pv01.fire('playing'); f.pv01.fire('pause'); f.pv01.fire('playing'); f.pv02.fire('playing'); f.pv02.fire('playing');
    assert.deepEqual(f.received.slice(1).map(p => p.data.video), ['pv01', 'pv02']);
  });
  check(() => {
    const f = fixture(); for (let i = 0; i < 25; i++) f.click('https://ncode.syosetu.com/n0686mv/');
    assert.equal(f.received.length, 0); f.load(); assert.equal(f.received.length, 21);
  });
  check(() => {
    const f = fixture(); f.click('https://ncode.syosetu.com/n0686mv/'); f.toggle.fire('click'); f.load();
    assert.equal(f.received.length, 0); assert.equal(f.stored.get(key), '1'); assert.equal(f.scripts[0].removed, true);
  });
  check(() => {
    const f = fixture(); f.load(); f.toggle.fire('click'); f.click('https://ncode.syosetu.com/n0686mv/'); f.pv02.fire('playing');
    assert.equal(f.received.length, 1); assert.equal(f.stored.size, 1); assert.equal(f.stored.get(key), '1');
    assert.equal(f.window.spaceTripBeforeSend('event', f.received[0]), false);
    f.toggle.fire('click'); assert.equal(f.stored.size, 0); assert.equal(f.reloads(), 1);
  });
  check(() => {
    const f = fixture(); f.load(); f.stored.set(key, '1'); f.window.fire('storage', {key});
    f.click('https://ncode.syosetu.com/n0686mv/'); assert.equal(f.received.length, 1); assert.equal(f.scripts[0].removed, true);
  });
  check(() => {
    const f = fixture({writeDenied: true}); f.load(); f.toggle.fire('click'); f.pv01.fire('playing');
    assert.equal(f.received.length, 1); assert.match(f.status.textContent, /次回は再度停止/);
  });
  check(() => {
    const f = fixture(); f.scripts[0].onerror(); f.click('https://ncode.syosetu.com/n0686mv/');
    assert.equal(f.received.length, 0); assert.equal(f.timers.size, 0); assert.match(f.status.textContent, /接続できません/);
  });
  check(() => {
    const f = fixture(); [...f.timers.values()][0](); f.load(); assert.equal(f.received.length, 0); assert.equal(f.scripts[0].removed, true);
  });
  check(() => {
    const f = fixture(); f.load(); const sanitize = f.window.spaceTripBeforeSend, payload = f.received[0];
    for (const type of ['identify', 'performance', 'replay', undefined]) assert.equal(sanitize(type, payload), false);
    assert.equal(sanitize('event', {...payload, website: 'other'}), false);
    assert.equal(sanitize('event', {...payload, url: '/another-work/'}), false);
    assert.equal(sanitize('event', {...payload, name: 'unapproved'}), false);
    assert.equal(sanitize('event', {...payload, name: 'pv_start', data: {video: 'future'}}), false);
    assert.deepEqual(plain(sanitize('event', {...payload, id: 'synthetic', referrer: 'https://example.invalid/private', data: {secret: 'synthetic'}})), payload);
    const safe = plain(sanitize('event', {...payload, name: 'narou_click', data: {placement: 'episode', episode: 999, secret: 'synthetic'}}));
    assert.deepEqual(safe.data, {placement: 'episode'});
  });
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify({verified: true, analyticsChecks: verifyAnalytics(), externalRequests: 0}));
}
