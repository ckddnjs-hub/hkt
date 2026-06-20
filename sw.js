const CACHE = 'welfare-ai-v14';
const ASSETS = [
  '/', '/index.html',
  '/app.css?v=14', '/core.js?v=14', '/wizard.js?v=14',
  '/dashboard.js?v=14', '/chat.js?v=14', '/strategy.js?v=14', '/calendar.js?v=14',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  // chrome-extension, non-http 요청 무시
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;
  // Supabase 등 외부 API는 캐시하지 않음
  if (e.request.url.includes('supabase.co') || e.request.url.includes('railway.app')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (!res || res.status !== 200 || res.type === 'opaque') return res;
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, clone));
    return res;
  })));
});
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || '복지AI 알림', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
