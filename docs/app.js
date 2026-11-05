// MARK 데일리 브리프 — 프레임워크 없음
const VAPID_PUBLIC_KEY = 'BNBGlzDKbQsjlHvbsGKW8JOIY5eDSm4ueZbnPIFN5uZqQsNC3bqIlZcGdSwW-H6jIO9RS6N07PVDNZa2j4xNIik';

const ICON = {
  brief: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
  hardware: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  games: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 00-1-2.5c3 0 6-2 6-5.5a4.5 4.5 0 00-1.2-3.2 4 4 0 00-.1-3.2s-1-.3-3.4 1.3a11 11 0 00-6 0C6.9 3.8 5.9 4.1 5.9 4.1a4 4 0 00-.1 3.2A4.5 4.5 0 004.6 10.5c0 3.5 3 5.5 6 5.5a3 3 0 00-1 2.5V22"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
  anime: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  scrap: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  ext: '<path d="M7 17L17 7M8 7h9v9"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u ?? '') ? u : '#'); // 피드 데이터는 외부 입력

// ponytail: 스크랩을 localStorage 에 저장 (~5MB). 수백 일치 쌓이면 IndexedDB 로.
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
let scraps = store.get('mark.items', {});   // id → item(+date)
let days = store.get('mark.days', {});      // date → 전체 데이터 사본

const state = { dates: [], date: null, data: null, tab: new URLSearchParams(location.search).get('t') || 'brief' };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1800); }

function ago(ms) {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 6e4);
  if (m < 60) return `${Math.max(m, 1)}분 전`;
  if (m < 1440) return `${Math.round(m / 60)}시간 전`;
  return `${Math.round(m / 1440)}일 전`;
}
const dayLabel = (d) => { const x = new Date(d + 'T00:00:00+09:00'); return `${x.getMonth() + 1}.${String(x.getDate()).padStart(2, '0')} (${'일월화수목금토'[x.getDay()]})`; };

function card(it, { hero = false, date = state.date } = {}) {
  const saved = !!scraps[it.id];
  const img = it.image ? `<div class="thumb"><img src="${esc(safeUrl(it.image))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>` : '';
  const en = it.translated ? `<a class="chip" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener" title="${esc(it.titleEn || it.summaryEn)}">EN 원문${svg('ext')}</a>` : '';
  const tags = (it.tags ?? []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  return `<article class="card${hero ? ' hero' : ''}${img ? '' : ' noimg'}" data-id="${esc(it.id)}">
    ${img}
    <div class="body">
      <h3><a href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
      ${it.summary ? `<p class="sum">${esc(it.summary)}</p>` : ''}
      ${it.meta || tags ? `<div class="meta">${it.meta ? `<span>${esc(it.meta)}</span>` : ''}${tags}</div>` : ''}
    </div>
    <div class="foot">
      <span class="src">${esc(it.source)}</span>
      ${it.time ? `<span>${ago(it.time)}</span>` : ''}
      ${en}
      <button class="save" data-save="${esc(it.id)}" data-date="${esc(date)}" aria-pressed="${saved}" aria-label="${saved ? '스크랩 해제' : '스크랩'}">${svg('scrap')}</button>
    </div>
  </article>`;
}

const allItems = (data) => data.sections.flatMap((s) => s.groups.flatMap((g) => g.items));
const findItem = (id) => scraps[id] || (state.data && allItems(state.data).find((x) => x.id === id));

function renderTabs() {
  const secs = state.data?.sections ?? [];
  const tabs = [['brief', '브리핑', null], ...secs.map((s) => [s.id, s.title, s.groups.reduce((n, g) => n + g.items.length, 0)]), ['scrap', '스크랩', Object.keys(scraps).length]];
  $('#tabs').innerHTML = tabs.map(([id, t, n]) =>
    `<button class="tab" role="tab" data-tab="${id}" aria-selected="${state.tab === id}">${svg(ICON[id] ? id : 'brief')}${esc(t)}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('');
  $('#tabs').setAttribute('role', 'tablist');
}

function renderBrief(d) {
  const total = d.count ?? allItems(d).length;
  const h = new Date().getHours();
  const hi = h < 11 ? '좋은 아침이에요, Mark' : h < 18 ? '오늘의 브리프, Mark' : '오늘 하루 정리, Mark';
  return `<div class="hello"><h1>${hi}</h1><p>${dayLabel(d.date)} · 소식 ${total}건 · ${new Date(d.generatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트</p></div>
  <div class="brief">${d.sections.filter((s) => s.groups.length).map((s) => `
    <section class="panel">
      <div class="panel-head"><h2>${svg(s.id)}${esc(s.title)}</h2><button class="more" data-tab="${s.id}">전체보기</button></div>
      <div class="mini">${s.groups[0].items.slice(0, 4).map((it) => card(it)).join('')}</div>
    </section>`).join('')}</div>`;
}

function renderSection(s) {
  if (!s) return '<p class="empty">이 날짜에는 없는 분류예요.</p>';
  if (!s.groups.length) return `<p class="empty">수집 실패 — ${esc(s.errors.join(', '))}</p>`;
  return s.groups.map((g, gi) => `<section class="group"><h2>${esc(g.title)}</h2>
    <div class="cards">${g.items.map((it, i) => card(it, { hero: gi === 0 && i === 0 && !!it.image })).join('')}</div></section>`).join('')
    + (s.errors.length ? `<p class="errors">일부 소스 수집 실패: ${esc(s.errors.map((e) => e.split(':')[0]).join(', '))}</p>` : '');
}

function renderScrap() {
  const list = Object.values(scraps).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  const dl = Object.keys(days).sort().reverse();
  return `<div class="hello"><h1>스크랩</h1><p>이 기기에 저장됨 · 소식 ${list.length}건 · 날짜 ${dl.length}개</p></div>
    ${dl.length ? `<section class="group"><h2>통째로 저장한 날짜</h2><div class="days">${dl.map((d) => `<button class="tab" data-day="${d}">${svg('scrap')}${dayLabel(d)}</button>`).join('')}</div></section>` : ''}
    <section class="group"><h2>저장한 소식</h2>${list.length ? `<div class="cards">${list.map((it) => card(it, { date: it.date })).join('')}</div>` : '<p class="empty">카드의 책갈피 버튼을 누르면 여기에 모여요.</p>'}</section>`;
}

function render() {
  renderTabs();
  const d = state.data;
  const main = $('#main');
  if (state.tab === 'scrap') main.innerHTML = renderScrap();
  else if (!d) main.innerHTML = '<p class="empty">아직 데이터가 없어요. 첫 수집을 기다리는 중…</p>';
  else if (state.tab === 'brief') main.innerHTML = renderBrief(d);
  else main.innerHTML = renderSection(d.sections.find((s) => s.id === state.tab));
  const i = state.dates.indexOf(state.date);
  $('#dateLabel').textContent = state.date ? dayLabel(state.date) : '—';
  $('#prev').disabled = i < 0 || i >= state.dates.length - 1;
  $('#next').disabled = i <= 0;
  $('#saveDay').setAttribute('aria-pressed', !!days[state.date]);
  const u = new URL(location); u.searchParams.set('d', state.date ?? ''); u.searchParams.set('t', state.tab); history.replaceState(null, '', u);
}

async function load(date) {
  state.date = date;
  try {
    state.data = days[date] ?? await fetch(`data/${date}.json`).then((r) => { if (!r.ok) throw r.status; return r.json(); });
  } catch { state.data = null; toast('이 날짜 데이터를 못 불러왔어요'); }
  render();
  scrollTo({ top: 0 });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-save],[data-day]');
  if (!t) return;
  if (t.dataset.tab) { state.tab = t.dataset.tab; render(); scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); return; }
  if (t.dataset.day) { state.tab = 'brief'; load(t.dataset.day); return; }
  const id = t.dataset.save;
  if (scraps[id]) { delete scraps[id]; toast('스크랩 해제'); }
  else { const it = findItem(id); if (!it) return; scraps[id] = { ...it, date: t.dataset.date, savedAt: Date.now() }; toast('스크랩했어요'); }
  store.set('mark.items', scraps);
  document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute('aria-pressed', !!scraps[id]); b.setAttribute('aria-label', scraps[id] ? '스크랩 해제' : '스크랩'); });
  if (state.tab === 'scrap') render(); else renderTabs();
});

$('#prev').onclick = () => load(state.dates[state.dates.indexOf(state.date) + 1]);
$('#next').onclick = () => load(state.dates[state.dates.indexOf(state.date) - 1]);
$('#datePick').onchange = (e) => {
  const v = e.target.value;
  if (state.dates.includes(v)) load(v); else toast('그 날짜에는 브리프가 없어요');
};
$('#saveDay').onclick = () => {
  if (!state.data) return;
  if (days[state.date]) { delete days[state.date]; toast('날짜 스크랩 해제'); }
  else { days[state.date] = state.data; toast(`${dayLabel(state.date)} 통째로 저장`); }
  try { store.set('mark.days', days); } catch { delete days[state.date]; toast('저장 공간이 부족해요'); }
  render();
};

// 설정 시트
$('#openSettings').onclick = () => $('#settings').showModal();
$('#exportScrap').onclick = () => {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify({ scraps, days })], { type: 'application/json' })), download: `mark-scrap-${state.date}.json` });
  a.click();
};
$('#importScrap').onchange = async (e) => {
  try {
    const j = JSON.parse(await e.target.files[0].text());
    scraps = { ...scraps, ...j.scraps }; days = { ...days, ...j.days };
    store.set('mark.items', scraps); store.set('mark.days', days); toast('가져왔어요'); render();
  } catch { toast('파일을 읽지 못했어요'); }
};
$('#enablePush').onclick = async () => {
  const msg = $('#pushMsg');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { msg.textContent = '이 브라우저는 웹 푸시를 지원하지 않아요. 홈 화면에 설치한 앱에서 시도해 주세요.'; return; }
  if (await Notification.requestPermission() !== 'granted') { msg.textContent = '알림 권한이 거부됐어요. 브라우저 사이트 설정에서 허용해 주세요.'; return; }
  const reg = await navigator.serviceWorker.ready;
  const key = Uint8Array.from(atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
  $('#subOut').value = JSON.stringify(sub);
  $('#subOut').hidden = $('#copySub').hidden = false;
  msg.textContent = '알림 켜짐. 이 코드를 Claude에게 보내 주세요.';
};
$('#copySub').onclick = () => navigator.clipboard.writeText($('#subOut').value).then(() => toast('복사했어요'));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

// 시작
(async () => {
  try { state.dates = (await fetch('data/index.json', { cache: 'no-cache' }).then((r) => r.json())).dates; } catch { state.dates = []; }
  const want = new URLSearchParams(location.search).get('d');
  const dates = [...new Set([...state.dates, ...Object.keys(days)])].sort().reverse();
  state.dates = dates;
  if (dates.length) $('#datePick').min = dates.at(-1), $('#datePick').max = dates[0];
  if (dates.length) await load(dates.includes(want) ? want : dates[0]); else render();
})();
