const CACHE_NAME = 'solobet-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/tekgir/',
  '/tekgir/index.html',
  '/manifest.json',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-database-compat.js'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache açıldı: ', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Tüm dosyalar cache\'lendi');
        return self.skipWaiting(); // Hemen aktif ol
      })
  );
});

// Fetch event - Firebase istekleri için özel handling
self.addEventListener('fetch', event => {
  // Firebase isteklerini cache'leme, her zaman network'ten al
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa return et
        if (response) {
          console.log('Cache\'ten döndürülüyor: ', event.request.url);
          return response;
        }
        
        // Cache'de yoksa network'ten al
        return fetch(event.request)
          .then(response => {
            // Sadece başarılı istekleri cache'le
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Response'u clone'la (bir kez kullanılabilir)
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => {
        // Network hatası durumunda fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Aktif!');
      return self.clients.claim(); // Hemen kontrol al
    })
  );
});

// Push notification event - SoloBet bildirimleri için
self.addEventListener('push', event => {
  console.log('Push notification alındı');
  
  let notificationData = {
    title: 'SoloBet',
    body: 'Yeni bildirim var!',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiNGRjZCMzUiLz4KPHR',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiNGRjZCMzUiLz4KPHR',
    vibrate: [200, 100, 200],
    tag: 'solobet-notification',
    data: {
      url: '/',
      dateOfArrival: Date.now(),
      primaryKey: 'solobet-main'
    },
    actions: [
      {
        action: 'open',
        title: 'Siteyi Aç',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+'
      }
    ]
  };

  // Eğer push data varsa kullan
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      console.log('Push data parse edilemedi:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification click: ', event.notification.tag);
  event.notification.close();
  
  let urlToOpen = '/';
  
  // Notification data'dan URL al
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  // Action'a göre URL belirle
  if (event.action === 'open') {
    urlToOpen = '/';
  } else if (event.action === 'admin') {
    urlToOpen = '/tekgir/';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Eğer açık sekme varsa odaklan
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Açık sekme yoksa yeni sekme aç
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (gelecekte kullanım için)
self.addEventListener('sync', event => {
  console.log('Background sync: ', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Arka plan senkronizasyonu yapılabilir
      console.log('Background sync tamamlandı')
    );
  }
});

// Message event (Ana sayfa ile iletişim için)
self.addEventListener('message', event => {
  console.log('Service Worker message alındı: ', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
