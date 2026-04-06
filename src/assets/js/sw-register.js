/**
 * sw-register.js — Registro del Service Worker
 * Contactos Anónimos v4.0
 *
 * Registra el Service Worker en el navegador cuando está disponible.
 * Se ejecuta de forma no bloqueante después de que la página se haya cargado.
 *
 * @version 4.0
 */

(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) {
        console.warn('[SW-Register] Service Workers no disponibles en este navegador');
        return;
    }

    // Registrar el Service Worker después de que la página esté completamente cargada
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerServiceWorker);
    } else {
        // Si el documento ya está cargado, registrar inmediatamente
        registerServiceWorker();
    }

    /**
     * Registra el Service Worker y maneja actualizaciones
     */
    function registerServiceWorker() {
        navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        })
            .then((registration) => {
                console.log('[SW-Register] ✅ Service Worker registrado:', registration);

                // Escuchar actualizaciones del Service Worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[SW-Register] Nueva versión del Service Worker encontrada');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('[SW-Register] Service Worker actualizado');
                            // Notificar al usuario sobre la actualización
                            notifyUpdate();
                        }
                    });
                });

                // Verificar actualizaciones cada 6 horas
                setInterval(() => {
                    registration.update();
                }, 6 * 60 * 60 * 1000);
            })
            .catch((err) => {
                console.error('[SW-Register] ❌ Error al registrar Service Worker:', err);
            });
    }

    /**
     * Notifica al usuario sobre una actualización disponible
     */
    function notifyUpdate() {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Contactos Anónimos', {
                    body: 'Nueva versión disponible. Recarga la página para actualizar.',
                    icon: '/src/assets/img/favicon.svg',
                    badge: '/src/assets/img/favicon.svg',
                    tag: 'ca-update',
                });
            } catch (_) {
                /* Ignorar si la notificación falla */
            }
        }
    }

})();
