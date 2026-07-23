const CACHE_NAME = 'audio-walk-v9';

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log(' Service Worker: установка');
    self.skipWaiting();
});

// Активация - очищаем ВСЕ старые кэши
self.addEventListener('activate', (event) => {
    console.log(' Service Worker: активация');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('🗑️ Удаление старого кэша:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
    event.waitUntil(clients.claim());
});

// Перехват запросов - НЕ кэшируем аудио
self.addEventListener('fetch', (event) => {
    // Аудио файлы из Supabase Storage - загружаем без кэша
    if (event.request.url.includes('supabase.co/storage')) {
        console.log('📥 Запрос аудио (без кэширования):', event.request.url);
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Остальные файлы - стандартная обработка
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
