// 셸은 캐시 우선, 데이터는 네트워크 우선(오프라인이면 캐시)
const V = 'mark-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const net = fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; });
  e.respondWith(u.pathname.includes('/data/') || u.pathname.endsWith('/app.js') || u.pathname.endsWith('/style.css')
    ? net.catch(() => caches.match(e.request))
    : caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || net));
});
self.addEventListener('push', (e) => {
  const d = e.data?.json() ?? { title: 'MARK', body: '오늘의 브리프가 도착했어요' };
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: d.url || './' }, tag: 'daily' }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(new URL(e.notification.data.url, self.registration.scope).href));
});
