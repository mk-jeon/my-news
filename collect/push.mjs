// Pages 배포 후 실행: 오늘 브리프 알림 (시크릿 없으면 건너뜀)
import { readFile } from 'node:fs/promises';
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, PUSH_SUBSCRIPTIONS: subs } = process.env;
if (!(pub && priv && subs)) { console.log('[push] skipped (no secrets)'); process.exit(0); }
const { dates } = JSON.parse(await readFile(new URL('../docs/data/index.json', import.meta.url), 'utf8'));
const d = JSON.parse(await readFile(new URL(`../docs/data/${dates[0]}.json`, import.meta.url), 'utf8'));
const top = d.sections.find((s) => s.groups[0]?.items[0])?.groups[0].items[0];
const payload = JSON.stringify({ title: `MARK · ${d.date.slice(5).replace('-', '/')} 브리프`, body: `오늘의 소식 ${d.count}건${top ? ` — ${top.title}` : ''}`, url: `./?d=${d.date}` });
webpush.setVapidDetails('https://github.com/mk-jeon/my-news', pub, priv);
for (const s of [JSON.parse(subs)].flat()) {
  await webpush.sendNotification(s, payload).then(() => console.log('[push] sent'), (e) => console.warn('[push] failed', e.statusCode, e.body));
}
