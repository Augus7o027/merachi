// Service Worker para MERACHI - PWA
const CACHE_NAME = 'merachi-v1.0.0';
const RUNTIME_CACHE = 'merachi-runtime';

// Arquivos essenciais para cache
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/src/css/styles.css',
  '/src/js/app.js',
  '/manifest.json',
  '/src/assets/icons/icon-192x192.png',
  '/src/assets/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// URLs que devem sempre vir da rede (APIs)
const NETWORK_ONLY_URLS = [
  'https://n8n-x8go8cgk0g0c0wc4004wosoc.themodernservers.com'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache aberto');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalado com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erro ao instalar Service Worker:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Ativando...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove caches antigos
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Ativado');
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network only para APIs
  if (NETWORK_ONLY_URLS.some(apiUrl => request.url.includes(apiUrl))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache dinâmico das respostas da API
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Tenta buscar do cache se offline
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first para recursos estáticos
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Não cachear se não for uma resposta válida
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              // Cache da resposta para futuro uso
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });

              return response;
            })
            .catch((error) => {
              console.error('❌ Erro ao buscar recurso:', request.url, error);

              // Retorna página offline customizada se disponível
              if (request.destination === 'document') {
                return caches.match('/offline.html');
              }
            });
        })
    );
  }
});

// Sincronização em background (quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Notificações Push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização disponível',
    icon: '/src/assets/icons/icon-192x192.png',
    badge: '/src/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir',
        icon: '/src/assets/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/src/assets/icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('MERACHI', options)
  );
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Função auxiliar para sincronização de dados
async function syncData() {
  try {
    console.log('📡 Sincronizando dados...');
    // Implementar lógica de sincronização aqui
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados:', error);
    return Promise.reject(error);
  }
}

console.log('✅ Service Worker: Carregado');
