// 같은 출처 요청은 전부 네트워크 우선(HTTP 캐시 무시) → 실패 시 캐시. 배포 직후에도 셸·데이터 버전이 섞이지 않는다.
const V = 'mark-v3';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' })
    .then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: u.pathname.endsWith('/') || u.pathname.endsWith('index.html') })));
});
self.addEventListener('push', (e) => {
  let d;
  try { d = e.data.json(); } catch { d = { title: 'MARK', body: e.data?.text() || '오늘의 브리프가 도착했어요' }; }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: d.url || './' }, tag: 'daily' }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((c) => c.url.startsWith(self.registration.scope));
    return w ? w.focus().then(() => w.navigate(url)) : clients.openWindow(url);
  }));
});
