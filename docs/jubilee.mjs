// Promotional interaction only. No equipment dimensions, navigation, or remote state.
export function fitState(people, vessel, reach) {
  if (![1, 2].includes(people) || !['trial', 'compact'].includes(vessel) || !Number.isFinite(reach) || reach < 0 || reach > 100) throw new RangeError('Invalid illustration state');
  if (reach < 35) return { key: 'ready', title: '器は収まる。腕を動かすと？', copy: '下のつまみを動かして、食べる時の場所を見てみましょう。' };
  if (people === 2 && vessel === 'trial' && reach > 55) return { key: 'close', title: '器だけでなく、腕の場所も。', copy: '二人で腕を伸ばすと、使う場所が重なります。第50話の気づきを表した紹介図です。' };
  if (vessel === 'compact') return { key: 'room', title: '小さな容器では、違う余白が。', copy: 'この図では腕を動かす場所が増えます。味や使いやすさまで確認した完成品ではありません。' };
  return { key: 'alone', title: '一人で使う時と、二人で使う時。', copy: '隣が空いている時には気づかなかったこと。人数を変えて比べてみましょう。' };
}

export function diningPresentation(people, vessel, reach) {
  const state = fitState(people, vessel, reach);
  return {
    key: state.key,
    reachSize: 18 + reach * .25,
    reachOpacity: reach / 100 * .85,
    close: state.key === 'close',
    message: state.key === 'close' ? 'おいしいだけでは、置き方は決まらない。' : state.key === 'room' ? '小さな器で、手元に余白。' : people === 1 ? '一人なら気づかない、隣の人の場所。' : 'いつもの二人で、手元を確かめる。',
  };
}

export const trail = Object.freeze([
  { episode: 0, label: '会社命令', title: '出張届の、その先へ。', copy: '半年後の行き先は宇宙。いつもの会社員の、いつもではない出張が始まる。' },
  { episode: 13, label: '一枚の名刺', title: '親友にも、知らない仕事がある。', copy: '長く知っている相手の、まだ見ていなかった一面。名刺一枚で、隣の人との距離も少し変わる。' },
  { episode: 18, label: '軌道上の夕飯', title: '宇宙にも、食卓がある。', copy: '袋も身体も留めてから。地球の見える食卓へ、地上から持ってきた日常が続いていく。' },
  { episode: 21, label: '受渡室の入口', title: '夕飯を取りに来ただけなのに。', copy: '受け取りに向かった先で出会う、見知らぬ女性。ひとつの扉が、知らなかった食卓への接点になる。' },
  { episode: 37, label: 'ひとつの名前', title: '呼び名を、ひとつ教わる。', copy: '共用の説明室で知った呼び名はリセ。所属や出身が分かったこととは、まだ別の話。' },
  { episode: 50, label: '船の食卓へ', title: '窓の向こうに、人の暮らしがある。', copy: '接続したままの船で食事区画を見学する。器の使い方から、毎日の選択肢を届ける仕事が見えてくる。' },
]);

export function initJubilee(root) {
  if (!root || root.dataset.ready === 'true') return;
  const doc = root.ownerDocument, view = doc.defaultView;
  const get = id => root.querySelector('#' + id);
  const gate = get('jubilee-reader-gate');
  const tabs = [...root.querySelectorAll('[data-jubilee-tab]')];
  const panels = [...root.querySelectorAll('[data-jubilee-panel]')];
  const media = view.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = media.matches, visible = true, active = 'window';
  const seen = new Set();
  const status = get('jubilee-progress');
  const motion = get('jubilee-motion');
  function reflectMotion() {
    root.dataset.motion = paused || media.matches ? 'paused' : 'running';
    root.dataset.active = String(gate.open && visible && !doc.hidden);
    motion.setAttribute('aria-pressed', String(paused || media.matches));
    motion.textContent = paused || media.matches ? 'ラウンジの動きを再開' : 'ラウンジの動きを止める';
    motion.disabled = media.matches;
    if (media.matches) motion.textContent = '動きを減らす設定を使用中';
  }
  function stamp(name) {
    if (seen.has(name)) return;
    seen.add(name);
    root.querySelector('[data-stamp="' + name + '"]').dataset.done = 'true';
    status.textContent = '体験 ' + seen.size + ' / 3' + (seen.size === 3 ? ' — 50話記念パスを開きました。' : ' — あと' + (3 - seen.size) + 'つ。');
    if (seen.size === 3) get('jubilee-pass').hidden = false;
  }
  function chooseTab(name, focus = false) {
    if (!['window', 'fit', 'trail'].includes(name)) return;
    active = name;
    tabs.forEach(button => {
      const selected = button.dataset.jubileeTab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.jubileePanel !== name; });
    root.dataset.panel = active;
  }
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => chooseTab(button.dataset.jubileeTab));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      chooseTab(tabs[next].dataset.jubileeTab, true);
    });
  });
  root.querySelectorAll('[data-window-view]').forEach(button => button.addEventListener('click', () => {
    const ship = button.dataset.windowView === 'ship';
    root.dataset.window = ship ? 'ship' : 'station';
    get('jubilee-station-view').hidden = ship;
    get('jubilee-ship-view').hidden = !ship;
    root.querySelectorAll('[data-window-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    get('jubilee-window-label').textContent = ship ? '船の窓から / 第50話' : 'ステーションの窓から / 第18話';
    get('jubilee-window-title').textContent = ship ? '戻る場所も、窓の向こうに。' : 'いつもの夕飯の、その向こう。';
    get('jubilee-window-copy').textContent = ship ? '接続した船から、ステーションを外側から眺める。出航ではなく、食事区画を見学する日の景色。' : '仕事の机と、食事を受け取る場所と、誰かと眺める窓。ここにも、いつもの日常がある。';
    stamp('window');
  }));
  const reach = get('jubilee-reach');
  let lastFit = '';
  function renderFit() {
    const people = Number(root.querySelector('input[name="jubilee-people"]:checked').value);
    const vessel = root.querySelector('input[name="jubilee-vessel"]:checked').value;
    const extent = Number(reach.value);
    const state = fitState(people, vessel, extent);
    const scene = get('jubilee-fit-scene');
    scene.dataset.people = String(people);
    scene.dataset.vessel = vessel;
    scene.dataset.fit = state.key;
    const dining = get('jubilee-dining-stage');
    const presentation = diningPresentation(people, vessel, extent);
    dining.dataset.people = String(people);
    dining.dataset.vessel = vessel;
    dining.dataset.fit = state.key;
    dining.style.setProperty('--reach-size', presentation.reachSize + '%');
    dining.style.setProperty('--reach-opacity', String(presentation.reachOpacity));
    get('jubilee-dining-alert').hidden = !presentation.close;
    get('jubilee-dining-message').textContent = presentation.message;
    get('jubilee-arm-a').querySelector('path').setAttribute('d', vessel === 'compact' ? 'M300 330Q325 276 286 227' : 'M300 330Q343 280 417 231');
    get('jubilee-arm-b').querySelector('path').setAttribute('d', vessel === 'compact' ? 'M500 330Q475 276 514 227' : 'M500 330Q460 286 411 233');
    get('jubilee-arm-a').setAttribute('transform', 'rotate(' + (-35 + extent * .35) + ' 300 330)');
    get('jubilee-arm-b').setAttribute('transform', 'rotate(' + (35 - extent * .35) + ' 500 330)');
    reach.setAttribute('aria-valuetext', extent < 35 ? '手前に戻した状態' : extent > 65 ? '腕を伸ばした状態' : '腕を動かしている途中');
    if (lastFit !== state.key) {
      get('jubilee-fit-title').textContent = state.title;
      get('jubilee-fit-copy').textContent = state.copy;
      lastFit = state.key;
    }
    if (extent >= 65) stamp('fit');
  }
  root.querySelectorAll('input[name="jubilee-people"],input[name="jubilee-vessel"]').forEach(input => input.addEventListener('change', renderFit));
  reach.addEventListener('input', renderFit);
  function chooseTrail(episode) {
    const entry = trail.find(item => item.episode === episode);
    if (!entry) return;
    root.querySelectorAll('[data-trail-episode]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.trailEpisode) === episode)));
    get('jubilee-trail-number').textContent = 'EPISODE ' + String(episode).padStart(2, '0');
    get('jubilee-trail-title').textContent = entry.title;
    get('jubilee-trail-copy').textContent = entry.copy;
    const link = get('jubilee-trail-link');
    const published = episode <= Number(root.dataset.publishedThrough);
    if (published) link.href = 'https://ncode.syosetu.com/n0686mv/' + (episode + 1) + '/';
    else link.removeAttribute('href');
    link.setAttribute('aria-disabled', String(!published));
    link.textContent = published ? '第' + episode + '話を読む ↗' : 'この話へのリンクは公開確認後に';
    stamp('trail');
  }
  root.querySelectorAll('[data-trail-episode]').forEach(button => button.addEventListener('click', () => chooseTrail(Number(button.dataset.trailEpisode))));
  get('jubilee-celebrate').addEventListener('click', () => {
    root.dataset.celebrate = 'true';
    get('jubilee-pass-status').textContent = '50話まで、ご一緒してくださってありがとうございます。';
  });
  get('jubilee-reset').addEventListener('click', () => {
    seen.clear();
    root.querySelectorAll('[data-stamp]').forEach(item => { item.dataset.done = 'false'; });
    get('jubilee-pass').hidden = true;
    get('jubilee-pass-status').textContent = '';
    status.textContent = '体験 0 / 3 — 三つの窓を、ひとつずつ。';
    root.dataset.celebrate = 'false';
    root.dataset.window = 'station';
    const firstView = root.querySelector('[data-window-view="station"]');
    firstView.click();
    seen.clear();
    root.querySelector('[data-stamp="window"]').dataset.done = 'false';
    status.textContent = '体験 0 / 3 — 三つの窓を、ひとつずつ。';
    root.querySelector('input[name="jubilee-people"][value="2"]').checked = true;
    root.querySelector('input[name="jubilee-vessel"][value="trial"]').checked = true;
    reach.value = '0';
    root.querySelector('.jubilee-overhead').open = false;
    renderFit();
    root.querySelectorAll('[data-trail-episode]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    get('jubilee-trail-number').textContent = 'EPISODE 00';
    get('jubilee-trail-title').textContent = trail[0].title;
    get('jubilee-trail-copy').textContent = trail[0].copy;
    get('jubilee-trail-link').href = 'https://ncode.syosetu.com/n0686mv/1/';
    get('jubilee-trail-link').removeAttribute('aria-disabled');
    get('jubilee-trail-link').textContent = '第0話を読む ↗';
    chooseTab('window');
  });
  motion.addEventListener('click', () => { paused = !paused; reflectMotion(); });
  gate.addEventListener('toggle', reflectMotion);
  doc.addEventListener('visibilitychange', reflectMotion);
  media.addEventListener('change', () => { if (media.matches) paused = true; reflectMotion(); });
  if (view.IntersectionObserver) new view.IntersectionObserver(entries => { visible = entries[0].isIntersecting; reflectMotion(); }, { threshold: .05 }).observe(root);
  get('jubilee-controls').hidden = false;
  get('jubilee-interactions').hidden = false;
  const jump = doc.createElement('a');
  jump.id = 'jubilee-hero-link';
  jump.className = 'button jubilee-hero-link';
  jump.href = '#anniversary-50';
  jump.textContent = '50話記念ラウンジへ';
  doc.querySelector('.hero-actions')?.append(jump);
  root.dataset.ready = 'true';
  chooseTab('window');
  renderFit();
  reflectMotion();
}

if (typeof document !== 'undefined') initJubilee(document.getElementById('anniversary-50'));
