// 오프라인 셀프체크: npm run check
import assert from 'node:assert/strict';
import { parseRss, parseTrending, parseYoutube, clean, aniItem, fmtViews } from './sources.mjs';
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

const kr = aniItem({ siteUrl: 'u', format: 'MANGA', countryOfOrigin: 'KR', title: { native: '화산귀환', romaji: 'Hwasan' }, genres: ['Action'], tags: [{ name: 'Wuxia', rank: 90 }, { name: 'Isekai', rank: 10 }] });
assert.deepEqual([kr.title, kr.meta, kr.tags], ['화산귀환', '웹툰 · Action', ['Wuxia']]);

console.log('check ok');
