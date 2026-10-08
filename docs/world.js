/* Reader-facing facts through EP40 only. No future canon or remote requests. */
(() => {
  'use strict';
  const atlas = document.getElementById('world-atlas');
  if (!atlas) return;
  const locations = {
    earth: { file:'WORLD FILE / 01', title:'現代地球', description:'通勤電車とオフィス。訓練の合間の休日。\n物語の出発点は、いつもの日常。', label:'EARTH / 物語の出発点', tag:'出張届に書いた、その先へ。', caption:'いつもの仕事。\nいつもの食卓。' },
    station: { file:'WORLD FILE / 02', title:'宇宙ステーション', description:'仕事をする。ご飯を食べる。休む。\n宇宙でも、暮らしは続いていく。', label:'ORBITAL STATION / 軌道の暮らし', tag:'窓の向こうに、家のある星。', caption:'地球を眺めながら、\n今日の夕飯を食べる。' }
  };
  const spots = {
    dining: { tag:'DINING / 第18話', title:'置く、ではなく。留める。', copy:'食事袋は面ファスナーやクリップで、身体は足元のループで固定する。出汁の香りと、地球の見える晩ごはん。', chapter:19 },
    work: { tag:'WORK / 第19話', title:'地上の仕事を、宇宙へ持ってくる。', copy:'食品の一覧を照合し、袋の開けやすさを評価する。直人、美緒、真琴にはそれぞれの担当があり、仕事場も別々。', chapter:20 },
    cabin: { tag:'CABIN / 第18話', title:'低い風の音がする、寝る場所。', copy:'荷物と手帳を固定し、地上へ到着を知らせる。照明を落とすと、壁の奥から来る低い風の音が聞こえる。', chapter:19 },
    window: { tag:'WINDOW / 第19話', title:'仕事を終えたら、窓の横へ。', copy:'飲み物を手に、窓の外の地球を見る。容器の返却先も確認してから、少しだけ仕事を離れる時間。', chapter:20 },
    receiving: { tag:'RECEIVING / 第33話', title:'親友の仕事が動く場所。', copy:'社員証と入室案内を照合して、許可された打ち合わせ区画へ。窓の向こうに接続設備が見える。受入れ・洗浄・保管には、それぞれの担当がある。', chapter:34 },
    evaluation: { tag:'EVALUATION / 第39話', title:'箱の中の器が、夕飯になる。', copy:'身体とトレイ、蓋付きの器を固定して使う。取り口や手首の向き、最後の一口まで届くかを評価する。見栄えがよいだけで扱いやすいことにはしない。', chapter:40 },
    briefing: { tag:'BRIEFING / 第37話', title:'顔を見て、料理を説明する。', copy:'案内と許可を確認して、共用の説明室へ。料理の説明と確認済みの品目の試食を行い、食べる人の感想を次の評価へつなぐ。', chapter:38 }
  };
  const locationButtons = [...atlas.querySelectorAll('[data-world-location]')];
  const spotButtons = [...atlas.querySelectorAll('[data-world-spot]')];
  const byId = id => document.getElementById(id);
  const fixButton = byId('world-fix');
  const motionButton = byId('world-motion');
  const mealTerminal = byId('meal-terminal');
  const mealButtons = [...atlas.querySelectorAll('[data-meal-ticket]')];
  const mealReset = byId('meal-reset');
  const mealTickets = ['01', '02', '03'];
  const tableDemo = byId('table-demo');
  const tableButtons = [...tableDemo.querySelectorAll('button[data-table-mode]')];
  const tableImages = [...tableDemo.querySelectorAll('img[data-table-image]')];
  const tableModes = {
    bag: { label:'PACK / いつもの食品袋', safety:'並べ方の紹介', note:'袋の名前を見て選ぶ。', title:'ひと袋ずつ、いつものご飯。', copy:'袋なら、自分へ寄せて持てる。中身を取り出す前は、袋の表示から料理を選ぶ。' },
    ground: { label:'GROUND / お皿に盛り付けた例', safety:'地上のテーブル', note:'袋の中のご飯を、お皿に盛り付ける。', title:'温めて、お皿へ。いつものご飯が、ご馳走に。', copy:'主菜、ご飯、小さなおかず。同じ献立でも、お皿に盛り付けると華やかな一食になる。地上の食卓での紹介例です。宇宙では別の固定方法が必要になる。' },
    orbit: { label:'ORBIT / 固定トレイで評価中', safety:'微小重力：身体・器・トレイを固定', note:'蓋の開け方と、一口の取りやすさを確かめる。', title:'宇宙では、留めてから食べる。', copy:'蓋付きの器を固定トレイへ取り付け、身体も固定して評価する。袋とは違う手首の向きや、最後の一口まで取りやすいかを確かめる。完成品ではなく、試しているところ。' }
  };
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setText = (id, value) => { byId(id).textContent = value; };
  const setPressed = (buttons, key, value) => buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === value)));
  const reflectFixStatus = () => setText('world-fix-status', atlas.dataset.secured === 'true' ? '食事袋は固定されています。' : media.matches || atlas.dataset.motion === 'paused' ? '固定されていません（静止表示）。' : '食事袋が漂っています。');
  function chooseLocation(location) {
    if (!Object.hasOwn(locations, location)) return;
    const value = locations[location];
    atlas.dataset.location = location;
    setPressed(locationButtons, 'worldLocation', location);
    atlas.querySelector('.world-file').textContent = value.file;
    setText('world-location-title', value.title);
    setText('world-location-description', value.description);
    setText('world-view-label', value.label);
    setText('world-view-tag', value.tag);
    setText('world-view-copy', value.caption);
    byId('world-station-guide').hidden = location !== 'station';
    byId('world-earth-guide').hidden = location !== 'earth';
    mealTerminal.hidden = location !== 'station';
  }
  function chooseSpot(spot) {
    if (!Object.hasOwn(spots, spot)) return;
    const value = spots[spot];
    setPressed(spotButtons, 'worldSpot', spot);
    setText('world-place-tag', value.tag);
    setText('world-place-title', value.title);
    setText('world-place-copy', value.copy);
    byId('world-place-link').setAttribute('href', 'https://ncode.syosetu.com/n0686mv/' + value.chapter + '/');
  }
  function receiveMeal(ticket) {
    if (!mealTickets.includes(ticket)) return;
    mealTerminal.dataset.receipt = 'received';
    setPressed(mealButtons, 'mealTicket', ticket);
    setText('meal-status', '番号 ' + ticket + ' を照合しました。夕飯袋を回収し、固定しました。');
    mealTerminal.querySelector('.meal-package-label').textContent = 'DINNER / 番号 ' + ticket;
    mealReset.disabled = false;
  }
  function resetMeal() {
    mealTerminal.dataset.receipt = 'waiting';
    setPressed(mealButtons, 'mealTicket', '');
    setText('meal-status', '夕飯袋は、受け渡しを待っています。');
    mealTerminal.querySelector('.meal-package-label').textContent = 'DINNER / 受渡待ち';
    mealReset.disabled = true;
  }
  function chooseTableMode(mode) {
    if (!Object.hasOwn(tableModes, mode)) return;
    const value = tableModes[mode];
    tableDemo.dataset.tableMode = mode;
    setPressed(tableButtons, 'tableMode', mode);
    tableImages.forEach(image => { image.hidden = image.dataset.tableImage !== mode; });
    setText('table-view-label', value.label);
    setText('table-safety', value.safety);
    setText('table-tray-note', value.note);
    setText('table-state-title', value.title);
    setText('table-state-copy', value.copy);
  }
  tableButtons.forEach(button => button.addEventListener('click', () => chooseTableMode(button.dataset.tableMode)));
  tableDemo.querySelector('.table-controls').hidden = false;
  mealButtons.forEach(button => button.addEventListener('click', () => receiveMeal(button.dataset.mealTicket)));
  mealReset.addEventListener('click', resetMeal);
  mealTerminal.hidden = atlas.dataset.location !== 'station';
  locationButtons.forEach(button => button.addEventListener('click', () => chooseLocation(button.dataset.worldLocation)));
  spotButtons.forEach(button => button.addEventListener('click', () => chooseSpot(button.dataset.worldSpot)));
  fixButton.addEventListener('click', () => {
    const secured = atlas.dataset.secured !== 'true';
    atlas.dataset.secured = String(secured);
    fixButton.setAttribute('aria-pressed', String(secured));
    fixButton.textContent = secured ? '固定を外してみる' : '食事袋を固定する';
    reflectFixStatus();
  });
  motionButton.addEventListener('click', () => {
    const paused = atlas.dataset.motion !== 'paused';
    atlas.dataset.motion = paused ? 'paused' : 'running';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? '景色を動かす' : '景色を止める';
    reflectFixStatus();
  });
  const reflectReducedMotion = () => {
    if (media.matches) {
      atlas.dataset.motion = 'paused';
      motionButton.setAttribute('aria-pressed', 'true');
      motionButton.textContent = '景色を動かす';
    }
    reflectFixStatus();
  };
  media.addEventListener('change', reflectReducedMotion);
  reflectReducedMotion();
  atlas.dataset.ready = 'true';
})();

// Closing the opt-in PV also stops its user-started picture and music.
(() => {
  const gate = document.getElementById('pv02-0-40');
  const video = document.getElementById('pv02-video');
  if (!gate || !video) return;
  gate.addEventListener('toggle', () => {
    if (!gate.open) video.pause();
  });
})();
