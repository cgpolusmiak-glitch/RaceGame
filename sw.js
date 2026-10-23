/* Сервис-воркер: сохраняет игру в память телефона, чтобы она открывалась без интернета.

   Как он работает:
   - при первом открытии кладёт в кеш все файлы игры (список FILES);
   - потом, когда интернет есть, каждый раз берёт свежие файлы с сайта и обновляет кеш;
   - когда интернета нет, берёт файлы из кеша.
   Поэтому после обновления игры на GitHub достаточно один раз открыть её с интернетом,
   и телефон сам подтянет новую версию.

   Если когда-нибудь добавите в игру новые файлы (картинки, звуки), впишите их в FILES
   и увеличьте номер VERSION, чтобы телефоны обновили кеш. */
const VERSION = 'v2';
const CACHE = 'jump-game-' + VERSION;
// Адрес самой папки сюда не вписываем: если в репозитории нет index.html, он даёт ошибку 404,
// а при любой ошибке установка кеша срывается целиком.
const FILES = ['./RaceGame.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

// Установка: сохраняем все файлы
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// Активация: удаляем кеш старых версий
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jump-game-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Запросы: сначала сеть (свежая версия), если сети нет — кеш
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // чужие сайты не трогаем

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));   // обновляем сохранённую копию
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || (req.mode === 'navigate' ? caches.match('./RaceGame.html') : Response.error())
        )
      )
  );
});
