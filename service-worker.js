const CACHE_NAME = "videochat-v6";

const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json"
];

// تثبيت الـ Service Worker
self.addEventListener("install", event => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[Service Worker] Caching files");
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error("[Service Worker] Cache failed:", err))
  );
  self.skipWaiting();
});

// جلب الملفات
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});

// تنظيف الكاش القديم
self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// ✅ الكود الجديد
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'INCOMING_CALL') {
        const { callerName, callerId, callerAvatar, callType } = event.data.payload;
        
        // ✅ عرض إشعار
        self.registration.showNotification(`📞 مكالمة من ${callerName}`, {
            body: `${callType === 'audio' ? 'مكالمة صوتية' : 'مكالمة فيديو'} واردة`,
            icon: callerAvatar || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&rounded=true',
            badge: 'https://ui-avatars.com/api/?name=VC&background=667eea&color=fff&size=64',
            vibrate: [200, 100, 200, 100, 200, 100, 400],
            tag: `call_${callerId}_${Date.now()}`,
            renotify: true,
            requireInteraction: true,
            data: {
                callerId: callerId,
                callerName: callerName,
                callerAvatar: callerAvatar,
                callType: callType || 'video'
            },
            actions: [
                { action: 'answer', title: '📞 رد' },
                { action: 'decline', title: '📴 رفض' }
            ]
        });
        
        // ✅ محاولة فتح التطبيق تلقائياً
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // إذا كان التطبيق مفتوحاً، ركز عليه
                    for (const client of clientList) {
                        if (client.url.includes('/') && 'focus' in client) {
                            client.focus();
                            client.postMessage({
                                type: 'ANSWER_CALL',
                                payload: {
                                    callerId: callerId,
                                    callerName: callerName,
                                    callerAvatar: callerAvatar,
                                    callType: callType || 'video'
                                }
                            });
                            return;
                        }
                    }
                    // إذا كان مغلقاً، افتحه
                    return clients.openWindow('/')
                        .then((client) => {
                            // انتظر حتى يفتح ثم أرسل المكالمة
                            setTimeout(() => {
                                client.postMessage({
                                    type: 'ANSWER_CALL',
                                    payload: {
                                        callerId: callerId,
                                        callerName: callerName,
                                        callerAvatar: callerAvatar,
                                        callType: callType || 'video'
                                    }
                                });
                            }, 1000);
                        });
                })
        );
    }
});
