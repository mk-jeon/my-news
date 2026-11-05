// 소스 목록 + 수집 함수. 소스 추가/삭제는 이 파일의 상수만 고치면 된다.
import { XMLParser } from 'fast-xml-parser';

const UA = 'Mozilla/5.0 (my-news daily brief; +https://github.com/mk-jeon/my-news)';
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });
const DAY = 864e5;

export const FEEDS = {
  hardware: [
    ['TechPowerUp', 'https://www.techpowerup.com/rss/news'],
    ["Tom's Hardware", 'https://www.tomshardware.com/feeds/all'],
    ['Overclock3D', 'https://overclock3d.net/feed/'],
    ['Notebookcheck', 'https://www.notebookcheck.net/RSS-Feed-Notebook-Reviews.8156.0.html'],
  ],
  games: [
    ['IGN', 'https://feeds.feedburner.com/ign/games-all'],
    ['PC Gamer', 'https://www.pcgamer.com/rss/'],
    ['Gematsu', 'https://www.gematsu.com/feed'],
    ['인벤', 'https://www.inven.co.kr/webzine/news/rss.php'],
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

// 취향 태그 (AniList 태그명 그대로). Romance 장르는 전부 제외.
export const TASTE_QUERY_TAGS = ['Isekai', 'Martial Arts', 'Video Games', 'Reincarnation', 'Super Power', 'Dungeon'];
export const LIKE_TAGS = ['Isekai', 'Reincarnation', 'Video Games', 'Dungeon', 'Super Power',
  'Martial Arts', 'Wuxia', 'Cultivation', 'Death Game', 'Revenge'];

async function get(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'user-agent': UA, ...opts.headers }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
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
    try { return parseRss(await (await get(url)).text(), name); } catch (e) { errors.push(`${name}: ${e.message}`); return []; }
  }))).flat();
  const since = Date.now() - hours * 36e5;
  // 소스 하나가 목록을 독점하지 않게 소스당 최대 8개
  const per = {};
  const items = all.filter((x) => !x.time || x.time >= since).sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    .filter((x) => (per[x.source] = (per[x.source] ?? 0) + 1) <= 8).slice(0, limit);
  return { items, errors };
}

export async function hardware() {
  const r = await feeds(FEEDS.hardware);
  return { groups: [{ title: '최신 하드웨어 뉴스', items: r.items }], errors: r.errors };
}

export async function games() {
  const [news, steam] = await Promise.all([
    feeds(FEEDS.games),
    get('https://store.steampowered.com/api/featuredcategories?cc=kr&l=koreana').then((r) => r.json()).catch((e) => ({ error: e.message })),
  ]);
  const toItem = (g, meta) => ({
    title: g.name, url: `https://store.steampowered.com/app/${g.id}`, source: 'Steam',
    image: g.header_image ?? g.large_capsule_image, time: null,
    meta: [meta, g.discount_percent ? `-${g.discount_percent}%` : null, g.final_price ? `₩${(g.final_price / 100).toLocaleString('ko-KR')}` : null].filter(Boolean).join(' · '),
  });
  const uniq = (xs) => [...new Map(xs.map((g) => [g.id, g])).values()];
  const groups = [{ title: '게임 뉴스', items: news.items }];
  if (!steam.error) {
    groups.push({ title: 'Steam 최고 판매', items: uniq(arr(steam.top_sellers?.items)).slice(0, 10).map((g) => toItem(g, '최고 판매')) });
    groups.push({ title: 'Steam 신작', items: uniq(arr(steam.new_releases?.items)).slice(0, 10).map((g) => toItem(g, '신작')) });
  }
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

const ANI_FIELDS = `id siteUrl type format countryOfOrigin title{romaji english native} coverImage{large}
  bannerImage description(asHtml:false) genres averageScore episodes chapters status startDate{year month day}
  tags{name rank}`;

function seasonNow(d = new Date()) {
  const m = d.getUTCMonth();
  return { season: ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'FALL', 'FALL', 'FALL', 'WINTER'][m], year: m === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear() };
}

export function aniItem(m) {
  const fmt = { TV: 'TV 애니', MOVIE: '극장판', ONA: 'ONA', OVA: 'OVA', MANGA: m.countryOfOrigin === 'KR' ? '웹툰' : m.countryOfOrigin === 'CN' ? '만화(중국)' : '만화', NOVEL: m.countryOfOrigin === 'KR' ? '웹소설' : '라노벨', ONE_SHOT: '단편' }[m.format] ?? m.format;
  const liked = (m.tags ?? []).filter((t) => LIKE_TAGS.includes(t.name) && t.rank >= 50).map((t) => t.name);
  const title = m.countryOfOrigin === 'KR' && m.title.native ? m.title.native : m.title.english || m.title.romaji;
  return {
    title, titleOrig: m.title.native, url: m.siteUrl, source: 'AniList', image: m.coverImage?.large, time: null,
    summary: clean(m.description, 200), tags: liked,
    meta: [fmt, m.averageScore ? `★ ${m.averageScore}` : null, ...m.genres.slice(0, 3)].filter(Boolean).join(' · '),
  };
}

async function anilist(query) {
  const r = await get('https://graphql.anilist.co', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  return (await r.json()).data.Page.media.filter((m) => !m.genres.includes('Romance')).map(aniItem);
}

export async function anime() {
  const errors = [];
  const { season, year } = seasonNow();
  const q = (args) => `{Page(perPage:24){media(${args},isAdult:false,genre_not_in:["Romance"]){${ANI_FIELDS}}}}`;
  const jobs = [
    ['이번 분기 신작 애니', [q(`type:ANIME,season:${season},seasonYear:${year},sort:POPULARITY_DESC`)]],
    // tag_in 은 AND 조건이라 태그별로 따로 조회 후 합친다
    ['취향 저격 · 이세계/게임/무협/먼치킨', TASTE_QUERY_TAGS.map((t) => q(`tag_in:["${t}"],status:RELEASING,popularity_greater:10000,sort:TRENDING_DESC`).replace('perPage:24', 'perPage:8'))],
    ['요즘 뜨는 만화·웹툰·라노벨', [q('type:MANGA,sort:TRENDING_DESC')]],
  ];
  const groups = [];
  const seen = new Set();
  for (const [title, queries] of jobs) {
    try {
      const lists = [];
      for (const query of queries) lists.push(await anilist(query)); // 순차: AniList 레이트리밋 회피
      // 라운드로빈으로 섞고, 앞 그룹에 이미 나온 작품은 제외
      const merged = [];
      for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) merged.push(l[i]);
      const items = merged.filter((x) => !seen.has(x.url) && seen.add(x.url))
        .sort((a, b) => b.tags.length - a.tags.length).slice(0, 16); // 취향 태그 많은 작품을 위로
      groups.push({ title, items });
    } catch (e) { errors.push(`AniList ${title}: ${e.message}`); }
  }
  return { groups, errors };
}

export const SECTIONS = [
  { id: 'hardware', title: '하드웨어', run: hardware },
  { id: 'games', title: '게임', run: games },
  { id: 'github', title: 'GitHub', run: github },
  { id: 'youtube', title: '유튜브', run: youtube },
  { id: 'anime', title: '애니·웹툰', run: anime },
];
