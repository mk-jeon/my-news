// 매일 실행: 수집 → 번역 → docs/data/YYYY-MM-DD.json + index.json → 웹 푸시
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SECTIONS } from './sources.mjs';
import { translateSections } from './translate.mjs';

const DATA = new URL('../docs/data/', import.meta.url);
const kstDate = (d = new Date()) => new Date(d.getTime() + 9 * 36e5).toISOString().slice(0, 10);
const id = (url) => createHash('sha1').update(url).digest('hex').slice(0, 12);

const date = process.env.NEWS_DATE || kstDate();
console.log(`[collect] ${date}`);

const sections = await Promise.all(SECTIONS.map(async ({ id: sid, title, run }) => {
  const t = Date.now();
  try {
    const r = await run();
    for (const g of r.groups) for (const it of g.items) it.id = id(it.url);
    console.log(`  ${sid}: ${r.groups.map((g) => `${g.title}=${g.items.length}`).join(', ')} (${Date.now() - t}ms)${r.errors.length ? ` errors=${r.errors.join(' | ')}` : ''}`);
    return { id: sid, title, groups: r.groups.filter((g) => g.items.length), errors: r.errors };
  } catch (e) {
    console.error(`  ${sid}: FAILED ${e.message}`);
    return { id: sid, title, groups: [], errors: [e.message] };
  }
}));

const tr = await translateSections(sections);
console.log(`[translate] ${tr.done}/${tr.total}`);

const count = sections.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.items.length, 0), 0);
await mkdir(DATA, { recursive: true });
await writeFile(new URL(`${date}.json`, DATA), JSON.stringify({ date, generatedAt: new Date().toISOString(), count, sections }));

const idxUrl = new URL('index.json', DATA);
const idx = JSON.parse(await readFile(idxUrl, 'utf8').catch(() => '{"dates":[]}'));
idx.dates = [...new Set([date, ...idx.dates])].sort().reverse();
await writeFile(idxUrl, JSON.stringify(idx));
console.log(`[write] ${count} items`);
