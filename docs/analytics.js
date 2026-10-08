(() => {
  'use strict';

  // This wrapper is deliberately separate from the local WORLD demonstrations.
  const config = document.getElementById('site-analytics');
  const status = document.getElementById('analytics-status');
  const toggle = document.getElementById('analytics-toggle');
  const origin = 'https://kiraboshi-neko.github.io';
  const sitePath = '/40sai-space-trip-site/';
  const storageKey = '40sai-space-trip.analytics-excluded';
  const website = config?.dataset.websiteId;
  const enabled = config?.dataset.enabled === 'true';
  const validID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(website || '');
  const onProduction = location.origin === origin &&
    [sitePath, sitePath + 'index.html'].includes(location.pathname);
  const params = new URLSearchParams(location.search);
  const excludedVisit = ['off', 'exclude'].includes(params.get('analytics'));
  const privacySignal = navigator.globalPrivacyControl === true ||
    [navigator.doNotTrack, window.doNotTrack, navigator.msDoNotTrack].some(value => ['1', 'yes', 1].includes(value));
  const automated = navigator.webdriver === true;
  let optedOut = false;
  let storageAvailable = true;
  let stopped = false;
  let ready = false;
  let failed = false;
  let queue = [];
  let timeout;
  let tracker;
  const startedVideos = new Set();

  try {
    if (params.get('analytics') === 'exclude') localStorage.setItem(storageKey, '1');
    optedOut = localStorage.getItem(storageKey) === '1';
  } catch {
    storageAvailable = false;
  }

  function mayTrack() {
    if (!enabled || !validID || !onProduction || excludedVisit || privacySignal || automated ||
        !storageAvailable || optedOut || stopped || failed) return false;
    try {
      return localStorage.getItem(storageKey) !== '1';
    } catch {
      storageAvailable = false;
      return false;
    }
  }

  function showStatus() {
    if (!status || !toggle) return;
    toggle.hidden = false;
    toggle.textContent = optedOut ? '計測を再開して再読み込み' : 'このブラウザーの計測を停止';
    if (optedOut || stopped) status.textContent = 'このブラウザーの計測は停止しています。';
    else if (excludedVisit) status.textContent = 'このアクセスは確認用として計測から除外しています。';
    else if (privacySignal) status.textContent = 'ブラウザーのプライバシー設定に従い、計測を停止しています。';
    else if (!storageAvailable) status.textContent = '停止設定を確認できないため、計測していません。';
    else if (!onProduction || automated) status.textContent = 'プレビュー・自動確認は計測していません。';
    else if (!enabled || !validID) status.textContent = '計測はまだ設定されていません。';
    else if (failed) status.textContent = '計測サービスに接続できません。ページはそのまま利用できます。';
    else status.textContent = 'このブラウザーからの計測を停止できます。';
  }

  function stop() {
    stopped = true;
    queue = [];
    clearTimeout(timeout);
    tracker?.remove();
    showStatus();
  }

  toggle?.addEventListener('click', () => {
    if (optedOut) {
      try {
        localStorage.removeItem(storageKey);
        location.reload();
      } catch {
        storageAvailable = false;
        showStatus();
      }
      return;
    }
    stop();
    try {
      localStorage.setItem(storageKey, '1');
      optedOut = true;
    } catch {
      if (status) status.textContent = 'このページの計測は停止しました。設定を保存できないため、次回は再度停止してください。';
      return;
    }
    showStatus();
  });
  window.addEventListener('storage', event => {
    if ((event.key === storageKey || event.key === null) && !mayTrack()) stop();
  });
  showStatus();
  if (!mayTrack()) return;

  // Keep only a fixed X referral label, never a full referrer URL or arbitrary query.
  let fromX = ['x', 'twitter'].includes((params.get('utm_source') || '').toLowerCase());
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    fromX ||= ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 't.co'].includes(host);
  } catch { /* An absent referrer is unknown, not proof of a direct visit. */ }
  const base = Object.freeze({
    website,
    hostname: 'kiraboshi-neko.github.io',
    title: '40歳、宇宙出張。｜公式サイト',
    url: sitePath,
    referrer: fromX ? 'https://x.com/' : ''
  });
  const placements = ['header', 'hero', 'episode', 'world', 'character', 'footer', 'other'];

  // Reject identify/performance calls and re-create only the two bounded event payloads.
  window.spaceTripBeforeSend = (type, payload) => {
    if (!mayTrack() || type !== 'event' || !payload || payload.website !== website || payload.url !== sitePath) return false;
    if (!payload.name) return {...base};
    if (payload.name === 'narou_click' && placements.includes(payload.data?.placement)) {
      const data = {placement: payload.data.placement};
      if (Number.isInteger(payload.data.episode) && payload.data.episode >= 0 && payload.data.episode <= 40) data.episode = payload.data.episode;
      return {...base, name: 'narou_click', data};
    }
    if (payload.name === 'pv_start' && ['pv01', 'pv02'].includes(payload.data?.video)) {
      return {...base, name: 'pv_start', data: {video: payload.data.video}};
    }
    return false;
  };

  function send(payload) {
    if (!mayTrack()) return;
    if (!ready) {
      if (queue.length < 20) queue.push(payload);
      return;
    }
    try {
      Promise.resolve(window.umami.track(payload)).catch(() => {});
    } catch { /* Analytics must never interrupt reading, links or playback. */ }
  }

  document.addEventListener('click', trackNarou);
  document.addEventListener('auxclick', event => { if (event.button === 1) trackNarou(event); });
  function trackNarou(event) {
    const link = event.target?.closest?.('a[href]');
    if (!link || event.defaultPrevented || !mayTrack()) return;
    let destination;
    try { destination = new URL(link.href); } catch { return; }
    if (destination.origin !== 'https://ncode.syosetu.com') return;
    const chapter = destination.pathname.match(/^\/n0686mv\/(\d+)\/$/);
    if (destination.pathname !== '/n0686mv/' && !(chapter && Number(chapter[1]) >= 1 && Number(chapter[1]) <= 41)) return;
    const placement = link.closest('header') ? 'header' : link.closest('#top') ? 'hero' :
      link.closest('#episode') ? 'episode' : link.closest('#world') ? 'world' :
      link.closest('#character') ? 'character' : link.closest('footer') ? 'footer' : 'other';
    const data = {placement};
    if (chapter) data.episode = Number(chapter[1]) - 1;
    send({...base, name: 'narou_click', data});
  }

  for (const [id, videoName] of [['pv01-video', 'pv01'], ['pv02-video', 'pv02']]) {
    document.getElementById(id)?.addEventListener('playing', () => {
      if (!mayTrack() || startedVideos.has(videoName)) return;
      startedVideos.add(videoName);
      send({...base, name: 'pv_start', data: {video: videoName}});
    });
  }

  // No automatic pageviews/clicks, session identity, replay or performance collection.
  if (window.umami) { failed = true; queue = []; showStatus(); return; }
  tracker = document.createElement('script');
  tracker.src = 'https://cloud.umami.is/script.js';
  tracker.defer = true;
  tracker.referrerPolicy = 'no-referrer';
  tracker.dataset.websiteId = website;
  tracker.dataset.autoTrack = 'false';
  tracker.dataset.domains = 'kiraboshi-neko.github.io';
  tracker.dataset.excludeSearch = 'true';
  tracker.dataset.excludeHash = 'true';
  tracker.dataset.doNotTrack = 'true';
  tracker.dataset.beforeSend = 'spaceTripBeforeSend';
  tracker.onload = () => {
    clearTimeout(timeout);
    if (!mayTrack()) { stop(); return; }
    if (typeof window.umami?.track !== 'function') { failed = true; queue = []; showStatus(); return; }
    ready = true;
    send({...base});
    const pending = queue;
    queue = [];
    for (const payload of pending) send(payload);
  };
  tracker.onerror = () => { failed = true; queue = []; clearTimeout(timeout); showStatus(); };
  timeout = setTimeout(() => { failed = true; queue = []; tracker.remove(); showStatus(); }, 8000);
  document.head.append(tracker);
})();
