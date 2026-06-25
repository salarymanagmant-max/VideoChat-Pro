// sw.js
const CACHE_NAME = 'videochat-v2';
const BASE_PATH = self.location.pathname.replace(/\/[^/]*$/, '/') || '/';

// الملفات التي سيتم تخزينها مؤقتاً
const urlsToCache = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'manifest.json',
    'https://ui-avatars.com/api/?name=VC&background=667eea&color=fff&size=192',
    'https://ui-avatars.com/api/?name=VC&background=667eea&color=fff&size=512'
];

self.addEventListener('install', (event) => {
    console.log('📦 تثبيت Service Worker');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ تم فتح الكاش');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('❌ فشل في تخزين الملفات:', error);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('✅ تفعيل Service Worker');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// استقبال المكالمات
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

// التعامل مع الإشعارات
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
                    return clients.openWindow(BASE_PATH)
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
                // إذا وجد في الكاش، أعد الكاش
                if (response) {
                    return response;
                }
                
                // وإلا، حاول من الشبكة
                return fetch(event.request)
                    .then((response) => {
                        // لا تخزن طلبات غير ناجحة
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // تخزين النسخة في الكاش
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error('❌ فشل في جلب:', event.request.url);
                        // إرجاع صفحة الخطأ
                        return new Response('⚠️ غير متصل بالإنترنت', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

console.log('✅ Service Worker جاهز!');
console.log('📁 المسار الأساسي:', BASE_PATH);
