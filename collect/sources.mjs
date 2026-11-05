// 소스 목록 + 수집 함수. 소스 추가/삭제는 이 파일의 상수만 고치면 된다.
import { XMLParser } from 'fast-xml-parser';

// 국내 사이트 일부가 봇 UA 를 막아서 일반 브라우저 UA 사용
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });
const DAY = 864e5;

// 국내 소스가 메인, 해외 소스는 번역해서 보조 그룹으로
export const FEEDS = {
  hardwareKo: [
    ['기글하드웨어', 'https://gigglehd.com/gg/hard/rss'],
    ['보드나라', 'https://www.bodnara.co.kr/rss/news.xml'],
  ],
  hardwareEn: [
    ['TechPowerUp', 'https://www.techpowerup.com/rss/news'],
    ["Tom's Hardware", 'https://www.tomshardware.com/feeds/all'],
    ['Overclock3D', 'https://overclock3d.net/feed/'],
    ['Notebookcheck', 'https://www.notebookcheck.net/RSS-Feed-Notebook-Reviews.8156.0.html'],
  ],
  gamesKo: [
    ['인벤', 'https://www.inven.co.kr/webzine/news/rss.php'],
    ['게임메카', 'https://www.gamemeca.com/rss.php'],
    ['루리웹 PC', 'https://bbs.ruliweb.com/news/board/1003/rss'],
    ['루리웹 콘솔', 'https://bbs.ruliweb.com/news/board/1001/rss'],
  ],
  gamesEn: [
    ['IGN', 'https://feeds.feedburner.com/ign/games-all'],
    ['PC Gamer', 'https://www.pcgamer.com/rss/'],
    ['Gematsu', 'https://www.gematsu.com/feed'],
  ],
};

export const CHANNELS = {
  '하드웨어 유튜버': [
    ['Gamers Nexus', 'UChIs72whgZI9w6d6FhwGGHA'],
    ['Hardware Unboxed', 'UCI8iQa1hv7oV_Z8D35vVuSg'],
    ['Linus Tech Tips', 'UCXuqSBlHAE6Xw-yeJA0Tunw'],
    ['der8auer', 'UCYAg4bYdyqENxEyHUX7t1FA'],
    ['JayzTwoCents', 'UCkWQ0gDrqOCarmUKmppD7GQ'],
    ['Optimum', 'UCRYOj4DmyxhBVrdvbsUwmAA'],
    ['ITSub잇섭', 'UCdUcjkyZtf-1WJyPPiETF1g'],
    ['테크몽', 'UCFX6adXoyQKxft933NB3rmA'],
  ],
  '개발자 유튜버': [
    ['Fireship', 'UCsBjURrPoezykLs9EqgamOA'],
    ['ThePrimeTime', 'UCUyeluBRhGPCW4rPe_UvBZQ'],
    ['Theo - t3.gg', 'UCbRP3c757lWg9M-U7TyEkXA'],
    ['노마드 코더', 'UCUpJs89fSBXNolQGOYKn0YQ'],
    ['코딩애플', 'UCSLrpBAzr-ROVGHQ5EmxnUg'],
    ['드림코딩', 'UC_4u-bXaba7yrRz_6x6kb_w'],
    ['조코딩', 'UCQNE2JmbasNYbjGAcuBiRRg'],
  ],
};

// 취향 장르/태그 (라프텔·네이버 표기). 많이 걸릴수록 위로.
export const TASTE = ['이세계', '추방물', '무협', '먼치킨', '회귀', '환생', '빙의', '게임', '헌터', '던전', '레벨업', '복수', '판타지', '액션', '현판', '사극'];
// 제외 장르/태그
export const EXCLUDE = /로맨스|순정|로판|BL|GL|백합|연애|하렘/;

async function get(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'user-agent': UA, ...opts.headers }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
}

// EUC-KR 같은 비 UTF-8 페이지도 읽는다 (보드나라)
async function getText(url) {
  const r = await get(url);
  const buf = new Uint8Array(await r.arrayBuffer());
  const head = new TextDecoder('latin1').decode(buf.slice(0, 300));
  const enc = (r.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] || head.match(/encoding=["']([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
  return new TextDecoder(enc).decode(buf);
}

// 국내 기사 본문에서 해외 원문(출처) 링크 찾기. 못 찾으면 null.
const ORIGIN_HOSTS = /(techpowerup|videocardz|tomshardware|wccftech|guru3d|overclock3d|notebookcheck|pcgamer|ign\.com|gematsu|kotaku|eurogamer|theverge|anandtech|computerbase|hardwareluxx|ithome|mydrivers|chiphell|benchlife|igorslab|pcgameshardware|tweaktown|techradar|engadget|gamesindustry|videogameschronicle|famitsu|4gamer|bloomberg|reuters|x\.com|twitter\.com|reddit\.com|bilibili|weibo|steampowered|nvidia\.com|amd\.com|intel\.com|asus\.com|msi\.com|gigabyte\.com|digitimes|trendforce|tomsguide|9to5|neowin|hothardware|servethehome|techspot|pcworld|arstechnica|polygon|gamespot|gamerant|dsogaming|playstation\.com|xbox\.com|nintendo|blizzard|ea\.com|ubisoft|capcom|square-enix|bandainamco)/i;
export function findOrigin(html, pageUrl) {
  const self = new URL(pageUrl).host;
  for (const [raw] of html.matchAll(/https?:\/\/[^\s"'<>()\\]+/g)) {
    let u;
    try { u = new URL(raw.replace(/&amp;/g, '&')); } catch { continue; }
    if (u.host === self || !ORIGIN_HOSTS.test(u.host)) continue;
    if (/\.(css|js|png|jpe?g|gif|webp|ico|svg|woff2?)$/i.test(u.pathname) || /share|intent|widget|embed|oembed/i.test(u.href)) continue;
    if (/(^|\.)(x|twitter)\.com$/.test(u.host) && !/\/status\//.test(u.pathname)) continue; // 프로필 링크 제외
    if (u.pathname.split('/').filter(Boolean).length < 2 && !u.search) continue;           // 홈/계정 루트 제외
    return u.href;
  }
  return null;
}

async function withOrigins(items) {
  await pool(items, 4, async (it) => { it.origin = findOrigin(await getText(it.url), it.url); });
  return items;
}

async function pool(xs, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) await fn(xs[i++]).catch(() => {}); }));
}

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (typeof x === 'object' && x ? x['#text'] ?? '' : x ?? '') + '';

export function clean(html, max = 220) {
  const s = txt(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function imageOf(it) {
  const m = arr(it['media:content']).concat(arr(it['media:thumbnail'])).find((x) => x?.['@url']);
  if (m) return m['@url'];
  const e = arr(it.enclosure).find((x) => /image/.test(x?.['@type'] ?? '') || /\.(jpe?g|png|webp)/i.test(x?.['@url'] ?? ''));
  if (e) return e['@url'];
  return txt(it['content:encoded'] || it.description).match(/<img[^>]+src=["']([^"']+)/i)?.[1] ?? null;
}

// RSS 2.0 → item 목록
export function parseRss(body, source) {
  const ch = xml.parse(body)?.rss?.channel;
  return arr(ch?.item).map((it) => ({
    title: clean(it.title, 200),
    summary: clean(it.description || it['content:encoded']),
    url: txt(it.link).trim(),
    source,
    image: imageOf(it),
    time: Date.parse(txt(it.pubDate)) || null,
  })).filter((x) => x.title && x.url);
}

async function feeds(list, hours = 36, limit = 30) {
  const errors = [];
  const all = (await Promise.all(list.map(async ([name, url]) => {
    try { return parseRss(await getText(url), name); } catch (e) { errors.push(`${name}: ${e.message}`); return []; }
  }))).flat();
  const since = Date.now() - hours * 36e5;
  // 소스 하나가 목록을 독점하지 않게 소스당 최대 8개
  const per = {};
  const items = all.filter((x) => !x.time || x.time >= since).sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    .filter((x) => (per[x.source] = (per[x.source] ?? 0) + 1) <= 8).slice(0, limit);
  return { items, errors };
}

// 홍보성 보도자료 제외
const PROMO = /컬래버|콜라보|행사|증정|이벤트|기념|프로모션|경품|할인|특가|사은품|체험단/;

// 국내 뉴스(해외 원문 링크 포함) + 해외 뉴스(번역) 2단 구성
async function koEn(ko, en, koTitle, enTitle) {
  const [k, e] = await Promise.all([feeds(ko, 36, 40), feeds(en, 36, 12)]);
  k.items = k.items.filter((x) => !PROMO.test(x.title)).slice(0, 24);
  await withOrigins(k.items);
  return { groups: [{ title: koTitle, items: k.items }, { title: enTitle, items: e.items }], errors: [...k.errors, ...e.errors] };
}

export const hardware = () => koEn(FEEDS.hardwareKo, FEEDS.hardwareEn, '국내 하드웨어 소식', '해외 하드웨어 소식 · 번역');

export async function games() {
  const [news, steam] = await Promise.all([
    koEn(FEEDS.gamesKo, FEEDS.gamesEn, '국내 게임 소식', '해외 게임 소식 · 번역'),
    get('https://store.steampowered.com/api/featuredcategories?cc=kr&l=koreana').then((r) => r.json()).catch((e) => ({ error: e.message })),
  ]);
  const toItem = (g, meta) => ({
    title: g.name, url: `https://store.steampowered.com/app/${g.id}`, source: 'Steam',
    image: g.header_image ?? g.large_capsule_image, time: null,
    meta: [meta, g.discount_percent ? `-${g.discount_percent}%` : null, g.final_price ? `₩${(g.final_price / 100).toLocaleString('ko-KR')}` : null].filter(Boolean).join(' · '),
  });
  const uniq = (xs) => [...new Map(xs.map((g) => [g.id, g])).values()];
  const groups = [news.groups[0]];
  if (!steam.error) {
    groups.push({ title: 'Steam 최고 판매', items: uniq(arr(steam.top_sellers?.items)).slice(0, 10).map((g) => toItem(g, '최고 판매')) });
    groups.push({ title: 'Steam 신작', items: uniq(arr(steam.new_releases?.items)).slice(0, 10).map((g) => toItem(g, '신작')) });
  }
  groups.push(news.groups[1]);
  return { groups, errors: [...news.errors, ...(steam.error ? [`Steam: ${steam.error}`] : [])] };
}

// github.com/trending HTML 파싱 (공식 API 없음)
export function parseTrending(html) {
  return html.split('<article class="Box-row"').slice(1).map((a) => {
    const path = a.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"]+)"/)?.[1];
    if (!path) return null;
    const num = (re) => +(a.match(re)?.[1] ?? '0').replace(/,/g, '');
    return {
      title: path, url: `https://github.com/${path}`, source: 'GitHub',
      summary: clean(a.match(/<p class="[^"]*col-9[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? ''),
      image: `https://opengraph.githubassets.com/1/${path}`, time: null,
      lang: a.match(/itemprop="programmingLanguage">([^<]+)/)?.[1] ?? null,
      stars: num(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/),
      gained: num(/([\d,]+) stars (?:today|this week|this month)/),
    };
  }).filter(Boolean);
}

export async function github() {
  const errors = [];
  const groups = [];
  for (const [since, title, unit] of [['daily', '오늘', '오늘'], ['weekly', '이번 주', '이번 주'], ['monthly', '이번 달', '이번 달']]) {
    try {
      const items = parseTrending(await (await get(`https://github.com/trending?since=${since}`)).text()).slice(0, 15)
        .map((x) => ({ ...x, meta: [x.lang, `★ ${x.stars.toLocaleString()}`, `${unit} +${x.gained.toLocaleString()}`].filter(Boolean).join(' · ') }));
      groups.push({ title: `트렌딩 · ${title}`, items });
    } catch (e) { errors.push(`trending ${since}: ${e.message}`); }
  }
  return { groups, errors };
}

// 유튜브 채널 Atom 피드 → 최근 7일 영상 조회수 순
export function parseYoutube(body, channel) {
  return arr(xml.parse(body)?.feed?.entry).map((e) => {
    const g = e['media:group'] ?? {};
    const id = e['yt:videoId'];
    return {
      title: clean(e.title, 200), url: `https://www.youtube.com/watch?v=${id}`, source: channel,
      image: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, time: Date.parse(e.published) || null,
      views: +(g['media:community']?.['media:statistics']?.['@views'] ?? 0),
    };
  });
}

export async function youtube() {
  const errors = [];
  const since = Date.now() - 7 * DAY;
  const groups = await Promise.all(Object.entries(CHANNELS).map(async ([title, list]) => {
    const vids = (await Promise.all(list.map(async ([name, id]) => {
      try { return parseYoutube(await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`)).text(), name); } catch (e) { errors.push(`${name}: ${e.message}`); return []; }
    }))).flat().filter((v) => v.time >= since).sort((a, b) => b.views - a.views).slice(0, 12)
      .map((v) => ({ ...v, meta: `조회수 ${fmtViews(v.views)}` }));
    return { title: `${title} · 이번 주 인기`, items: vids };
  }));
  return { groups, errors };
}

export const fmtViews = (n) => (n >= 1e4 ? `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)}만회` : `${n.toLocaleString()}회`);

// 취향 점수: TASTE 단어가 몇 개 걸리는지
export const tasteScore = (words) => TASTE.filter((t) => words.some((w) => w.includes(t))).length;
const byTaste = (a, b) => b.score - a.score;
const WEEKDAY = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const strip = ({ score, excluded, synopsis, author, star, ...x }) => x;

// 애니시아(국내 애니 편성표): 지금 방영 중인 애니. 라프텔 API 는 해외 IP(GitHub 서버)를 막아서 못 씀.
// 카드는 라프텔 검색으로 연결 → 폰에서 어디서 볼 수 있는지 바로 확인.
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function anissiaItem(a) {
  const genres = (a.genres ?? '').split(',').map((g) => g.trim()).filter(Boolean);
  return {
    title: a.subject, url: `https://laftel.net/search?keyword=${encodeURIComponent(a.subject)}`, source: '애니시아', image: a.thumbnail || null, time: null,
    meta: [`${DAYS[+a.week] ?? ''} ${a.time ?? ''}`.trim(), ...genres.slice(0, 3)].filter(Boolean).join(' · '),
    tags: genres.filter((g) => TASTE.includes(g)).slice(0, 3), score: tasteScore(genres), start: a.startDate ?? '',
    excluded: genres.some((g) => EXCLUDE.test(g)) || a.status !== 'ON',
  };
}
async function anissia() {
  const weeks = await Promise.all([0, 1, 2, 3, 4, 5, 6].map(async (w) => (await (await get(`https://api.anissia.net/anime/schedule/${w}`)).json()).data ?? []));
  const uniq = [...new Map(weeks.flat().map((a) => [a.animeNo, a])).values()];
  return uniq.map(anissiaItem).filter((x) => !x.excluded)
    .sort((x, y) => y.score - x.score || y.start.localeCompare(x.start)).slice(0, 18) // 취향 → 최근 시작 순
    .map(({ start, ...x }) => x);
}

// 네이버 웹툰: 오늘 요일 인기순 + 신작. 태그는 작품별 info API 에서.
async function naverInfo(id) {
  const j = await (await get(`https://comic.naver.com/api/article/list/info?titleId=${id}`)).json();
  return { tags: (j.curationTagList ?? []).map((t) => t.tagName), synopsis: clean(j.synopsis, 160) };
}
async function naverWebtoon(kind) {
  const url = kind === 'new' ? 'https://comic.naver.com/api/webtoon/titlelist/new?order=update' : 'https://comic.naver.com/api/webtoon/titlelist/weekday?order=user';
  const j = await (await get(url)).json();
  const today = WEEKDAY[new Date(Date.now() + 9 * 36e5).getUTCDay()];
  const list = (kind === 'new' ? j.titleList : j.titleListMap[today]).filter((t) => !t.adult).slice(0, 30);
  const items = list.map((t) => ({ id: t.titleId, title: t.titleName, url: `https://comic.naver.com/webtoon/list?titleId=${t.titleId}`, source: '네이버웹툰', image: t.thumbnailUrl, time: null, author: t.author, star: t.starScore, tags: [] }));
  await pool(items, 5, async (it) => Object.assign(it, await naverInfo(it.id)));
  return items.map(({ id, ...it }) => ({
    ...it, summary: it.synopsis, meta: [it.author, it.star ? `★ ${it.star.toFixed(2)}` : null].filter(Boolean).join(' · '),
    score: tasteScore(it.tags), excluded: it.tags.some((t) => EXCLUDE.test(t)),
    tags: it.tags.filter((t) => TASTE.some((w) => t.includes(w))).slice(0, 3),
  })).filter((x) => !x.excluded).sort(byTaste).slice(0, 15);
}

// 네이버 시리즈 웹소설 일간 TOP (판타지·현판·무협·라노벨 각 상위권)
export function parseSeries(html, genre) {
  const parts = html.split('<div class="comic_cont">');
  return parts.slice(1).map((c, i) => {
    const id = c.match(/productNo=(\d+)/)?.[1];
    const img = parts[i].match(/<img src="([^"]+)"[^>]*alt=/g)?.at(-1)?.match(/src="([^"]+)/)?.[1] ?? null;
    return id && {
      title: clean(c.match(/productNo=\d+"[^>]*>([^<]+)<\/a>/)?.[1] ?? '', 100), url: `https://series.naver.com/novel/detail.series?productNo=${id}`,
      source: '네이버시리즈', image: img?.replace(/\?type=m79$/, '?type=m260') ?? null, time: null,
      summary: clean(c.match(/<p class="dsc">([\s\S]*?)<\/p>/)?.[1] ?? '', 150),
      meta: [`★ ${c.match(/score_num">([\d.]+)/)?.[1] ?? '-'}`, clean(c.match(/class="author">([^<]+)/)?.[1] ?? '')].filter(Boolean).join(' · '), tags: [genre],
    };
  }).filter((x) => x && x.title);
}
async function series() {
  const cats = [['판타지', 202], ['현판', 208], ['무협', 206], ['라이트노벨', 205]];
  const lists = await Promise.all(cats.map(async ([g, c]) => parseSeries(await getText(`https://series.naver.com/novel/top100List.series?rankingTypeCode=DAILY&categoryCode=${c}`), g).slice(0, 5)));
  return lists.flat();
}

export async function anime() {
  const errors = [];
  const jobs = [
    ['방영 중인 애니 · 애니시아 편성표', anissia],
    ['오늘의 인기 웹툰 · 네이버', () => naverWebtoon('weekday')],
    ['신작 웹툰 · 네이버', () => naverWebtoon('new')],
    ['웹소설 일간 TOP · 네이버 시리즈', series],
  ];
  const groups = [];
  for (const [title, run] of jobs) {
    try { groups.push({ title, items: (await run()).map(strip) }); } catch (e) { errors.push(`${title}: ${e.message}`); }
  }
  return { groups, errors };
}

export const SECTIONS = [
  { id: 'hardware', title: '하드웨어', run: hardware },
  { id: 'games', title: '게임', run: games },
  { id: 'github', title: 'GitHub', run: github },
  { id: 'youtube', title: '유튜브', run: youtube },
  { id: 'anime', title: '애니·웹툰·소설', run: anime },
];
