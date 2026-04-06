/**
 * permissions.js — Módulo de Solicitud de Permisos del Navegador
 * Contactos Anónimos v2.0
 *
 * Solicita y verifica los permisos del navegador necesarios para
 * el funcionamiento de la plataforma.
 *
 * Permisos OBLIGATORIOS (bloquean el acceso si se rechazan):
 *   1. Geolocalización (GPS) — necesario para el geobloqueo
 *   2. Almacenamiento (localStorage/sessionStorage) — necesario para la sesión
 *   3. Notificaciones — necesario para alertas de la plataforma
 *
 * Permisos OPCIONALES (no bloquean el acceso):
 *   4. Cámara
 *   5. Micrófono
 *   6. Vibración
 *
 * Caché: Los resultados se guardan en localStorage por 24 horas para
 * evitar solicitar permisos en cada visita.
 *
 * @module PERMISSIONS
 * @version 2.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    /** Clave de localStorage para el caché de permisos */
    const PERMISSIONS_CACHE_KEY = '_ca_permissions_v2';

    /** Tiempo de vida del caché en ms (24 horas) */
    const PERMISSIONS_TTL = 86_400_000;

    /** Ruta al ícono de la aplicación para notificaciones */
    const APP_ICON = 'src/assets/img/favicon.svg';

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        permissionsGranted:     {},
        allPermissionsApproved: false,
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Lee el caché de permisos almacenado en localStorage.
     * Retorna null si no existe o si ha expirado.
     * @returns {object|null} Objeto de permisos cacheado o null
     */
    function _readPermissionsCache() {
        try {
            const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now  = Date.now();

            if ((now - data.timestamp) > PERMISSIONS_TTL) {
                localStorage.removeItem(PERMISSIONS_CACHE_KEY);
                return null;
            }

            return data.permissions;
        } catch (_) {
            return null;
        }
    }

    /**
     * Guarda el resultado de los permisos en localStorage con timestamp.
     * @param {object} permissions - Resultado de los permisos a cachear
     */
    function _writePermissionsCache(permissions) {
        try {
            localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                permissions,
            }));
        } catch (_) {
            /* Ignorar errores de almacenamiento */
        }
    }

    /**
     * Solicita el permiso de geolocalización al usuario.
     * Usa un timeout de 8 segundos para no bloquear indefinidamente.
     * @returns {Promise<boolean>} true si el permiso fue concedido
     */
    async function _requestGeolocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('[permissions] Geolocation API no disponible en este navegador');
                resolve(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                () => {
                    console.log('[permissions] ✅ Geolocalización concedida');
                    resolve(true);
                },
                (error) => {
                    console.warn('[permissions] ❌ Geolocalización rechazada:', error.message);
                    resolve(false);
                },
                { timeout: 8000, maximumAge: 60000 }
            );
        });
    }

    /**
     * Verifica el acceso al almacenamiento local.
     * Intenta escribir y leer en localStorage y sessionStorage.
     * @returns {Promise<boolean>} true si el almacenamiento está disponible
     */
    async function _requestStorage() {
        try {
            const testKey   = '__ca_storage_test__';
            const testValue = '1';

            // Probar localStorage
            localStorage.setItem(testKey, testValue);
            if (localStorage.getItem(testKey) !== testValue) throw new Error('localStorage read failed');
            localStorage.removeItem(testKey);

            // Probar sessionStorage
            sessionStorage.setItem(testKey, testValue);
            if (sessionStorage.getItem(testKey) !== testValue) throw new Error('sessionStorage read failed');
            sessionStorage.removeItem(testKey);

            console.log('[permissions] ✅ Almacenamiento disponible');
            return true;
        } catch (err) {
            console.warn('[permissions] ❌ Almacenamiento no disponible:', err.message);
            return false;
        }
    }

    /**
     * Solicita el permiso de notificaciones al usuario.
     * Si ya fue concedido, retorna true sin volver a solicitarlo.
     * @returns {Promise<boolean>} true si el permiso fue concedido
     */
    async function _requestNotifications() {
        if (!('Notification' in window)) {
            console.warn('[permissions] Notifications API no disponible en este navegador');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('[permissions] ✅ Notificaciones ya concedidas');
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('[permissions] ❌ Notificaciones previamente rechazadas');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            const granted    = permission === 'granted';

            if (granted) {
                console.log('[permissions] ✅ Notificaciones concedidas');
                // Enviar notificación de bienvenida
                // CORRECCIÓN: Ruta del ícono corregida de 'assets/img/favicon.svg' a 'src/assets/img/favicon.svg'
                try {
                    new Notification('Contactos Anónimos', {
                        body:  'Notificaciones habilitadas correctamente.',
                        icon:  APP_ICON,
                        badge: APP_ICON,
                        tag:   'ca-welcome',
                    });
                } catch (_) {
                    /* Ignorar si la notificación falla */
                }
            } else {
                console.warn('[permissions] ❌ Notificaciones rechazadas por el usuario');
            }

            return granted;
        } catch (err) {
            console.error('[permissions] Error al solicitar notificaciones:', err);
            return false;
        }
    }

    /**
     * Solicita el permiso de cámara (opcional).
     * Libera el stream inmediatamente después de obtener el permiso.
     * @returns {Promise<boolean>} true si el permiso fue concedido
     */
    async function _requestCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            console.warn('[permissions] Camera API no disponible');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((track) => track.stop());
            console.log('[permissions] ✅ Cámara concedida');
            return true;
        } catch (err) {
            console.warn('[permissions] ❌ Cámara rechazada:', err.message);
            return false;
        }
    }

    /**
     * Solicita el permiso de micrófono (opcional).
     * Libera el stream inmediatamente después de obtener el permiso.
     * @returns {Promise<boolean>} true si el permiso fue concedido
     */
    async function _requestMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
            console.warn('[permissions] Microphone API no disponible');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            console.log('[permissions] ✅ Micrófono concedido');
            return true;
        } catch (err) {
            console.warn('[permissions] ❌ Micrófono rechazado:', err.message);
            return false;
        }
    }

    /**
     * Verifica la disponibilidad de la API de vibración (opcional).
     * @returns {Promise<boolean>} true si la vibración está disponible
     */
    async function _requestVibration() {
        if (!navigator.vibrate) {
            console.warn('[permissions] Vibration API no disponible');
            return false;
        }

        try {
            navigator.vibrate(50);
            console.log('[permissions] ✅ Vibración disponible');
            return true;
        } catch (err) {
            console.warn('[permissions] ❌ Vibración no disponible:', err.message);
            return false;
        }
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Solicita todos los permisos OBLIGATORIOS en paralelo.
     *
     * Si existe un caché válido con todos los permisos aprobados,
     * lo usa directamente sin volver a solicitar permisos.
     *
     * @returns {Promise<{geolocation: boolean, storage: boolean, notifications: boolean, allApproved: boolean}>}
     */
    async function requestMandatoryPermissions() {
        console.log('[permissions] Solicitando permisos obligatorios...');

        // Verificar caché válido
        const cached = _readPermissionsCache();
        if (cached?.allApproved) {
            console.log('[permissions] Usando caché de permisos (válido por 24h)');
            state.permissionsGranted    = cached;
            state.allPermissionsApproved = true;
            return cached;
        }

        // Solicitar los tres permisos en paralelo
        const [geolocation, storage, notifications] = await Promise.all([
            _requestGeolocation(),
            _requestStorage(),
            _requestNotifications(),
        ]);

        const result = {
            geolocation,
            storage,
            notifications,
            allApproved: geolocation && storage && notifications,
        };

        state.permissionsGranted     = result;
        state.allPermissionsApproved = result.allApproved;

        // Guardar en caché (incluso si no todos fueron aprobados,
        // para recordar el estado en la próxima visita)
        _writePermissionsCache(result);

        console.log('[permissions] Resultado de permisos obligatorios:', result);
        return result;
    }

    /**
     * Solicita permisos OPCIONALES (cámara, micrófono, vibración).
     * No bloquea el acceso si se rechazan.
     * @returns {Promise<{camera: boolean, microphone: boolean, vibration: boolean}>}
     */
    async function requestOptionalPermissions() {
        console.log('[permissions] Solicitando permisos opcionales...');

        const [camera, microphone, vibration] = await Promise.all([
            _requestCamera(),
            _requestMicrophone(),
            _requestVibration(),
        ]);

        const result = { camera, microphone, vibration };
        console.log('[permissions] Resultado de permisos opcionales:', result);
        return result;
    }

    /**
     * Indica si todos los permisos obligatorios fueron aprobados.
     * @returns {boolean}
     */
    function areMandatoryPermissionsApproved() {
        return state.allPermissionsApproved;
    }

    /**
     * Retorna el estado actual de los permisos concedidos.
     * @returns {object} Copia del estado de permisos
     */
    function getPermissionsStatus() {
        return { ...state.permissionsGranted };
    }

    /**
     * Elimina el caché de permisos, forzando una nueva solicitud
     * en la próxima llamada a requestMandatoryPermissions().
     */
    function revokePermissionsCache() {
        try {
            localStorage.removeItem(PERMISSIONS_CACHE_KEY);
            state.permissionsGranted     = {};
            state.allPermissionsApproved = false;
            console.log('[permissions] Caché de permisos eliminado');
        } catch (_) {}
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.PERMISSIONS = Object.freeze({
        requestMandatoryPermissions,
        requestOptionalPermissions,
        areMandatoryPermissionsApproved,
        getPermissionsStatus,
        revokePermissionsCache,
    });

})(window);
