// sw.js
const CACHE_NAME = 'videochat-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ تم فتح الكاش');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// استقبال إشعارات المكالمات
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'INCOMING_CALL') {
        const { callerName, callerId, callerAvatar, callType } = event.data.payload;
        
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
    }
});

// التعامل مع الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const action = event.action;
    const data = event.notification.data;

    if (action === 'answer') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes('/') && 'focus' in client) {
                            client.focus();
                            client.postMessage({
                                type: 'ANSWER_CALL',
                                payload: data
                            });
                            return;
                        }
                    }
                    return clients.openWindow('/')
                        .then((client) => {
                            client.postMessage({
                                type: 'ANSWER_CALL',
                                payload: data
                            });
                        });
                })
        );
    } else if (action === 'decline') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes('/')) {
                            client.postMessage({
                                type: 'DECLINE_CALL',
                                payload: data
                            });
                            return;
                        }
                    }
                })
        );
    }
});

// التعامل مع طلبات الشبكة
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});