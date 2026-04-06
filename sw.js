/**
 * sw.js — Service Worker Avanzado para PWA
 * Contactos Anónimos v3.0
 *
 * Implementa:
 *   1. Caché inteligente de archivos estáticos
 *   2. Estrategia Network-first para HTML, Cache-first para assets
 *   3. Soporte offline avanzado
 *   4. Limpieza automática de caché obsoleto
 *   5. Sincronización en segundo plano
 *   6. Notificaciones push
 *   7. Integración con detección de VPN/región
 *   8. Manejo de errores robusto
 *
 * @version 3.0
 */

const CACHE_VERSION = 'v4.0';
const CACHE_NAME = `contactos-anonimos-${CACHE_VERSION}`;
const RUNTIME_CACHE = `contactos-anonimos-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `contactos-anonimos-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    // CSS
    '/src/assets/css/main.css',
    '/src/assets/css/premium.css',
    '/src/assets/css/animations.css',
    '/src/assets/css/menu.css',
    '/src/assets/css/pwa.css',
    '/src/assets/css/beta.css',
    // JS Core
    '/src/assets/js/security.js',
    '/src/assets/js/geo.js',
    '/src/assets/js/permissions.js',
    '/src/assets/js/db.js',
    '/src/assets/js/api.js',
    '/src/assets/js/main.js',
    // JS i18n y Beta
    '/src/assets/js/i18n.js',
    '/src/assets/js/beta.js',
    '/src/assets/js/advanced-api.js',
    '/src/assets/js/beta-panel.js',
    // JS Avanzado
    '/src/assets/js/geo-advanced.js',
    '/src/assets/js/permissions-advanced.js',
    '/src/assets/js/security-advanced.js',
    // PWA y UI
    '/src/assets/js/pwa-security.js',
    '/src/assets/js/pwa-install.js',
    '/src/assets/js/ui-components.js',
    '/src/assets/js/menu.js',
    '/src/assets/js/themes.js',
    // Imágenes
    '/src/assets/img/favicon.svg',
    '/src/assets/img/pwa_icons/icon-192x192.png',
    '/src/assets/img/pwa_icons/icon-512x512.png',
    '/src/assets/img/pwa_icons/apple-touch-icon.png',
];

const CACHE_EXPIRY_TIME = {
    html: 3600000,      // 1 hora
    assets: 604800000,  // 7 días
    images: 2592000000, // 30 días
};

/* ── Utilidades ──────────────────────────────────────────────── */

/**
 * Obtiene el tipo de contenido basado en la URL.
 */
function getContentType(url) {
    if (url.endsWith('.html')) return 'html';
    if (url.match(/\.(css|js)$/)) return 'assets';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'images';
    return 'other';
}

/**
 * Verifica si una respuesta en caché ha expirado.
 */
function isCacheExpired(cacheTime, contentType) {
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_TIME[contentType] || CACHE_EXPIRY_TIME.assets;
    return (now - cacheTime) > expiryTime;
}

/**
 * Crea una respuesta offline.
 */
function createOfflineResponse() {
    return new Response(
        `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Contactos Anónimos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #03060c 0%, #1a1d2e 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 500px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        p {
            font-size: 16px;
            color: #aaa;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .status {
            background: rgba(37, 211, 102, 0.1);
            border: 1px solid rgba(37, 211, 102, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        button {
            background: linear-gradient(135deg, #25D366 0%, #1fb359 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>Sin Conexión</h1>
        <p>No hay conexión a internet disponible en este momento. Por favor, verifica tu conexión e intenta de nuevo.</p>
        <div class="status">
            <strong>Estado:</strong> Modo offline activado
        </div>
        <button onclick="location.reload()">Reintentar</button>
    </div>
</body>
</html>`,
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
    );
}

/* ── Instalación del Service Worker ──────────────────────────── */
self.addEventListener('install', (event) => {
    console.log('[SW v3.0] Instalando Service Worker...');
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[SW] Cacheando archivos estáticos...');
                return cache.addAll(STATIC_ASSETS).catch((err) => {
                    console.warn('[SW] Error al cachear algunos archivos:', err);
                });
            }),
            caches.open(RUNTIME_CACHE),
            caches.open(IMAGE_CACHE),
        ]).then(() => {
            console.log('[SW] Instalación completada');
        })
    );
    self.skipWaiting();
});

/* ── Activación del Service Worker ──────────────────────────── */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheName.includes(CACHE_VERSION)) {
                        console.log('[SW] Eliminando caché obsoleto:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activación completada');
            return self.clients.claim();
        })
    );
});

/* ── Interceptación de peticiones ────────────────────────────── */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // No cachear peticiones a APIs externas
    if (url.origin !== location.origin) {
        event.respondWith(
            fetch(request).catch(() => {
                console.warn('[SW] API externa no disponible:', url.hostname);
                return new Response('API no disponible', { status: 503 });
            })
        );
        return;
    }

    const contentType = getContentType(url.pathname);

    // Estrategia Network-first para HTML
    if (request.mode === 'navigate' || contentType === 'html') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || createOfflineResponse();
                    });
                })
        );
        return;
    }

    // Estrategia Cache-first para imágenes
    if (contentType === 'images') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(IMAGE_CACHE).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        return new Response('Imagen no disponible', { status: 404 });
                    });
            })
        );
        return;
    }

    // Estrategia Cache-first para assets (CSS, JS)
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        console.warn('[SW] No se pudo obtener:', request.url);
                        return new Response('Recurso no disponible', { status: 404 });
                    });
            })
    );
});

/* ── Sincronización en segundo plano ──────────────────────────– */
self.addEventListener('sync', (event) => {
    console.log('[SW] Evento de sincronización:', event.tag);

    if (event.tag === 'sync-security-check') {
        event.waitUntil(
            fetch('/api/security-check')
                .then((response) => {
                    console.log('[SW] Verificación de seguridad sincronizada');
                    return response;
                })
                .catch((err) => {
                    console.error('[SW] Error en sincronización de seguridad:', err);
                })
        );
    }

    if (event.tag === 'sync-contacts') {
        event.waitUntil(
            fetch('/api/sync-contacts')
                .then((response) => {
                    console.log('[SW] Contactos sincronizados');
                    return response;
                })
                .catch((err) => {
                    console.error('[SW] Error en sincronización de contactos:', err);
                })
        );
    }
});

/* ── Notificaciones push ──────────────────────────────────────– */
self.addEventListener('push', (event) => {
    console.log('[SW] Notificación push recibida');

    let notificationData = {
        title: 'Contactos Anónimos',
        body: 'Tienes una nueva notificación',
        icon: 'src/assets/img/pwa_icons/icon-192x192.png',
        badge: 'src/assets/img/pwa_icons/icon-192x192.png',
        tag: 'ca-notification',
        requireInteraction: false,
    };

    if (event.data) {
        try {
            notificationData = { ...notificationData, ...event.data.json() };
        } catch (err) {
            notificationData.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

/* ── Clic en notificación ────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificación clickeada:', event.notification.tag);
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si la app está abierta, enfocar la ventana
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no está abierta, abrir una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

/* ── Manejo de mensajes desde el cliente ──────────────────────– */
self.addEventListener('message', (event) => {
    console.log('[SW] Mensaje recibido:', event.data.type);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        });
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.urls || [];
        caches.open(CACHE_NAME).then((cache) => {
            cache.addAll(urls).catch((err) => {
                console.warn('[SW] Error al cachear URLs:', err);
            });
        });
    }

    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        caches.keys().then((cacheNames) => {
            let totalSize = 0;
            Promise.all(
                cacheNames.map((cacheName) =>
                    caches.open(cacheName).then((cache) =>
                        cache.keys().then((requests) => {
                            return Promise.all(
                                requests.map((request) =>
                                    cache.match(request).then((response) => {
                                        if (response) {
                                            totalSize += response.headers.get('content-length') || 0;
                                        }
                                    })
                                )
                            );
                        })
                    )
                )
            ).then(() => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size: totalSize });
            });
        });
    }
});

console.log('[SW v3.0] Service Worker cargado correctamente');
