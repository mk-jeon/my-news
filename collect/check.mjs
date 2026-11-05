// 오프라인 셀프체크: npm run check
import assert from 'node:assert/strict';
import { parseRss, parseTrending, parseYoutube, clean, fmtViews, laftelItem, parseSeries, findOrigin, tasteScore } from './sources.mjs';
import { needsKo } from './translate.mjs';

const rss = parseRss(`<rss><channel><item><title>RTX 6090 &amp; more</title><link>https://x.com/a</link>
<pubDate>Wed, 05 Nov 2026 01:00:00 GMT</pubDate><description><![CDATA[<p>Big <b>news</b></p><img src="https://x.com/i.jpg">]]></description></item>
<item><title></title><link>https://x.com/skip</link></item></channel></rss>`, 'X');
assert.equal(rss.length, 1, '제목 없는 항목은 버린다');
assert.deepEqual([rss[0].title, rss[0].summary, rss[0].image, rss[0].source], ['RTX 6090 & more', 'Big news', 'https://x.com/i.jpg', 'X']);

const tr = parseTrending(`<article class="Box-row"><h2 class="h3"><a href="/foo/bar" class="Link">foo / bar</a></h2>
<p class="col-9 color-fg-muted my-1 pr-4">A <em>tool</em></p><span itemprop="programmingLanguage">Rust</span>
<a href="/foo/bar/stargazers" class="Link"><svg></svg> 12,345</a> <span>1,234 stars today</span></article>`);
assert.deepEqual([tr[0].title, tr[0].summary, tr[0].lang, tr[0].stars, tr[0].gained], ['foo/bar', 'A tool', 'Rust', 12345, 1234]);

const yt = parseYoutube(`<feed xmlns:yt="y" xmlns:media="m"><entry><yt:videoId>abc</yt:videoId><title>Hi</title>
<published>2026-11-04T00:00:00Z</published><media:group><media:community><media:statistics views="54321"/></media:community></media:group></entry></feed>`, 'Ch');
assert.deepEqual([yt[0].url, yt[0].views], ['https://www.youtube.com/watch?v=abc', 54321]);
assert.equal(fmtViews(54321), '5.4만회');
assert.equal(fmtViews(1234567), '123만회');

assert.equal(clean('a'.repeat(300), 10).length, 10);
assert.ok(needsKo('Nvidia launches GPU'));
assert.ok(!needsKo('엔비디아 RTX 출시'));
assert.ok(!needsKo('RTX'));

// 라프텔: 로맨스 제외, 취향 장르 태그
const lf = laftelItem({ id: 1, name: '전생검', img: 'i', genres: ['이세계', '액션', '판타지'], distributed_air_times: ['목요일'] });
assert.deepEqual([lf.url, lf.meta, lf.tags, lf.excluded], ['https://laftel.net/item/1', '목요일 · 이세계 · 액션 · 판타지', ['이세계', '액션', '판타지'], false]);
assert.ok(laftelItem({ id: 2, name: 'x', genres: ['로맨스', '코미디'] }).excluded);
assert.equal(tasteScore(['무협/사극', '먼치킨', '개그']), 3); // 무협+사극+먼치킨

// 네이버 시리즈 랭킹 HTML
const se = parseSeries(`<a href="/novel/detail.series?productNo=7"><img src="https://c/x.jpg?type=m79" alt="t"></a><div class="comic_cont"><h3><a href="/novel/detail.series?productNo=7" class="NPI=a:content">화산귀환 [독점]</a></h3>
<p class="info"><em class="score_num">9.8</em><span class="author">비가</span></p><p class="dsc">대 화산파&nbsp;13대 제자</p></div>`, '무협');
assert.deepEqual([se[0].title, se[0].image, se[0].summary, se[0].meta], ['화산귀환 [독점]', 'https://c/x.jpg?type=m260', '대 화산파 13대 제자', '★ 9.8 · 비가']);

// 해외 원문 링크: 프로필·이미지·자기 사이트는 건너뛰고 기사 링크만
const page = `<a href="https://gigglehd.com/gg/1">x</a><img src="https://videocardz.com/a/b.jpg"><a href="https://x.com/Warcraft">p</a>
<a href="https://x.com/jay/status/123">t</a><a href="https://videocardz.com/newz/amd-thing">s</a>`;
assert.equal(findOrigin(page, 'https://gigglehd.com/gg/hard/1'), 'https://x.com/jay/status/123');
assert.equal(findOrigin('<a href="https://www.naver.com/news/1">n</a>', 'https://a.kr/1'), null);

console.log('check ok');
