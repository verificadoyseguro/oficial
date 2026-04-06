/**
 * permissions-advanced.js — Módulo Avanzado de Permisos del Navegador
 * Contactos Anónimos v3.0
 *
 * Solicita y verifica permisos del navegador con múltiples capas de seguridad.
 *
 * Permisos OBLIGATORIOS:
 *   1. Geolocalización (GPS)
 *   2. Almacenamiento (localStorage/sessionStorage)
 *   3. Notificaciones
 *   4. Cookies
 *   5. Acceso a red (fetch/XHR)
 *
 * Permisos OPCIONALES:
 *   6. Cámara
 *   7. Micrófono
 *   8. Vibración
 *   9. Acelerómetro
 *   10. Giroscopio
 *   11. Sensor de luz
 *   12. Sensor de proximidad
 *   13. Acceso a archivos
 *   14. Portapapeles
 *   15. Pantalla completa
 *
 * @module PERMISSIONS_ADVANCED
 * @version 3.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const PERMISSIONS_CACHE_KEY = '_ca_permissions_v3';
    const PERMISSIONS_TTL = 86_400_000; // 24 horas
    const APP_ICON = 'src/assets/img/favicon.svg';

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        permissionsGranted: {},
        allPermissionsApproved: false,
        permissionDetails: {},
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Lee el caché de permisos.
     */
    function _readPermissionsCache() {
        try {
            const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

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
     * Guarda el caché de permisos.
     */
    function _writePermissionsCache(permissions) {
        try {
            localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                permissions,
            }));
        } catch (_) {
            /* Ignorar errores */
        }
    }

    /**
     * Solicita geolocalización.
     */
    async function _requestGeolocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('[permissions-advanced] Geolocation API no disponible');
                resolve(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                () => {
                    console.log('[permissions-advanced] ✅ Geolocalización concedida');
                    resolve(true);
                },
                (error) => {
                    console.warn('[permissions-advanced] ❌ Geolocalización rechazada:', error.message);
                    resolve(false);
                },
                { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
            );
        });
    }

    /**
     * Solicita almacenamiento.
     */
    async function _requestStorage() {
        try {
            const testKey = '__ca_storage_test__';
            const testValue = '1';

            // Probar localStorage
            localStorage.setItem(testKey, testValue);
            if (localStorage.getItem(testKey) !== testValue) throw new Error('localStorage failed');
            localStorage.removeItem(testKey);

            // Probar sessionStorage
            sessionStorage.setItem(testKey, testValue);
            if (sessionStorage.getItem(testKey) !== testValue) throw new Error('sessionStorage failed');
            sessionStorage.removeItem(testKey);

            // Probar IndexedDB
            if (window.indexedDB) {
                const request = window.indexedDB.open('_ca_test_db_');
                await new Promise((resolve) => {
                    request.onsuccess = () => {
                        const db = request.result;
                        db.close();
                        resolve();
                    };
                    request.onerror = () => resolve();
                });
            }

            console.log('[permissions-advanced] ✅ Almacenamiento disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Almacenamiento no disponible:', err.message);
            return false;
        }
    }

    /**
     * Solicita notificaciones.
     */
    async function _requestNotifications() {
        if (!('Notification' in window)) {
            console.warn('[permissions-advanced] Notifications API no disponible');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('[permissions-advanced] ✅ Notificaciones ya concedidas');
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('[permissions-advanced] ❌ Notificaciones rechazadas');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            const granted = permission === 'granted';

            if (granted) {
                console.log('[permissions-advanced] ✅ Notificaciones concedidas');
                try {
                    new Notification('Contactos Anónimos', {
                        body: 'Notificaciones habilitadas correctamente.',
                        icon: APP_ICON,
                        badge: APP_ICON,
                        tag: 'ca-welcome',
                    });
                } catch (_) {
                    /* Ignorar */
                }
            }

            return granted;
        } catch (err) {
            console.error('[permissions-advanced] Error en notificaciones:', err);
            return false;
        }
    }

    /**
     * Verifica disponibilidad de cookies.
     */
    async function _requestCookies() {
        try {
            document.cookie = '__ca_cookie_test__=1; path=/; max-age=1';
            const hasCookie = document.cookie.includes('__ca_cookie_test__');
            document.cookie = '__ca_cookie_test__=; path=/; max-age=0';
            console.log('[permissions-advanced] ✅ Cookies disponibles');
            return hasCookie;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Cookies no disponibles:', err.message);
            return false;
        }
    }

    /**
     * Verifica disponibilidad de acceso a red.
     */
    async function _requestNetworkAccess() {
        try {
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
            });
            console.log('[permissions-advanced] ✅ Acceso a red disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Acceso a red limitado:', err.message);
            return false;
        }
    }

    /**
     * Solicita cámara.
     */
    async function _requestCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            console.warn('[permissions-advanced] Camera API no disponible');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((track) => track.stop());
            console.log('[permissions-advanced] ✅ Cámara concedida');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Cámara rechazada:', err.message);
            return false;
        }
    }

    /**
     * Solicita micrófono.
     */
    async function _requestMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
            console.warn('[permissions-advanced] Microphone API no disponible');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            console.log('[permissions-advanced] ✅ Micrófono concedido');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Micrófono rechazado:', err.message);
            return false;
        }
    }

    /**
     * Verifica vibración.
     */
    async function _requestVibration() {
        if (!navigator.vibrate) {
            console.warn('[permissions-advanced] Vibration API no disponible');
            return false;
        }

        try {
            navigator.vibrate(50);
            console.log('[permissions-advanced] ✅ Vibración disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Vibración no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica acelerómetro.
     */
    async function _requestAccelerometer() {
        if (!window.DeviceMotionEvent) {
            console.warn('[permissions-advanced] Accelerometer API no disponible');
            return false;
        }

        try {
            window.addEventListener('devicemotion', () => {}, false);
            console.log('[permissions-advanced] ✅ Acelerómetro disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Acelerómetro no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica giroscopio.
     */
    async function _requestGyroscope() {
        if (!window.DeviceOrientationEvent) {
            console.warn('[permissions-advanced] Gyroscope API no disponible');
            return false;
        }

        try {
            window.addEventListener('deviceorientation', () => {}, false);
            console.log('[permissions-advanced] ✅ Giroscopio disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Giroscopio no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica sensor de luz.
     */
    async function _requestLightSensor() {
        if (!window.AmbientLightSensor) {
            console.warn('[permissions-advanced] Light Sensor API no disponible');
            return false;
        }

        try {
            const sensor = new AmbientLightSensor();
            sensor.start();
            sensor.stop();
            console.log('[permissions-advanced] ✅ Sensor de luz disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Sensor de luz no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica sensor de proximidad.
     */
    async function _requestProximitySensor() {
        if (!window.ProximitySensor) {
            console.warn('[permissions-advanced] Proximity Sensor API no disponible');
            return false;
        }

        try {
            const sensor = new ProximitySensor();
            sensor.start();
            sensor.stop();
            console.log('[permissions-advanced] ✅ Sensor de proximidad disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Sensor de proximidad no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica acceso a archivos.
     */
    async function _requestFileAccess() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            console.log('[permissions-advanced] ✅ Acceso a archivos disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Acceso a archivos no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica acceso al portapapeles.
     */
    async function _requestClipboard() {
        if (!navigator.clipboard) {
            console.warn('[permissions-advanced] Clipboard API no disponible');
            return false;
        }

        try {
            await navigator.clipboard.writeText('test');
            console.log('[permissions-advanced] ✅ Portapapeles disponible');
            return true;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Portapapeles no disponible:', err.message);
            return false;
        }
    }

    /**
     * Verifica pantalla completa.
     */
    async function _requestFullscreen() {
        try {
            const isFullscreenEnabled = document.fullscreenEnabled ||
                document.webkitFullscreenEnabled ||
                document.mozFullScreenEnabled ||
                document.msFullscreenEnabled;

            if (isFullscreenEnabled) {
                console.log('[permissions-advanced] ✅ Pantalla completa disponible');
                return true;
            }

            console.warn('[permissions-advanced] ❌ Pantalla completa no disponible');
            return false;
        } catch (err) {
            console.warn('[permissions-advanced] ❌ Pantalla completa no disponible:', err.message);
            return false;
        }
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Solicita todos los permisos obligatorios.
     */
    async function requestMandatoryPermissions() {
        console.log('[permissions-advanced] Solicitando permisos obligatorios...');

        const cached = _readPermissionsCache();
        if (cached?.allApproved) {
            console.log('[permissions-advanced] Usando caché válido');
            state.permissionsGranted = cached;
            state.allPermissionsApproved = true;
            return cached;
        }

        const [
            geolocation,
            storage,
            notifications,
            cookies,
            networkAccess,
        ] = await Promise.all([
            _requestGeolocation(),
            _requestStorage(),
            _requestNotifications(),
            _requestCookies(),
            _requestNetworkAccess(),
        ]);

        const result = {
            geolocation,
            storage,
            notifications,
            cookies,
            networkAccess,
            allApproved: geolocation && storage && notifications && cookies && networkAccess,
        };

        state.permissionsGranted = result;
        state.allPermissionsApproved = result.allApproved;
        _writePermissionsCache(result);

        console.log('[permissions-advanced] Permisos obligatorios:', result);
        return result;
    }

    /**
     * Solicita permisos opcionales.
     */
    async function requestOptionalPermissions() {
        console.log('[permissions-advanced] Solicitando permisos opcionales...');

        const [
            camera,
            microphone,
            vibration,
            accelerometer,
            gyroscope,
            lightSensor,
            proximitySensor,
            fileAccess,
            clipboard,
            fullscreen,
        ] = await Promise.all([
            _requestCamera(),
            _requestMicrophone(),
            _requestVibration(),
            _requestAccelerometer(),
            _requestGyroscope(),
            _requestLightSensor(),
            _requestProximitySensor(),
            _requestFileAccess(),
            _requestClipboard(),
            _requestFullscreen(),
        ]);

        const result = {
            camera,
            microphone,
            vibration,
            accelerometer,
            gyroscope,
            lightSensor,
            proximitySensor,
            fileAccess,
            clipboard,
            fullscreen,
        };

        console.log('[permissions-advanced] Permisos opcionales:', result);
        return result;
    }

    /**
     * Obtiene información detallada de permisos.
     */
    function getDetailedPermissionsInfo() {
        return {
            mandatory: state.permissionsGranted,
            allApproved: state.allPermissionsApproved,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            onLine: navigator.onLine,
        };
    }

    /**
     * Verifica si todos los permisos obligatorios fueron aprobados.
     */
    function areMandatoryPermissionsApproved() {
        return state.allPermissionsApproved;
    }

    /**
     * Obtiene el estado de permisos.
     */
    function getPermissionsStatus() {
        return { ...state.permissionsGranted };
    }

    /**
     * Revoca el caché de permisos.
     */
    function revokePermissionsCache() {
        try {
            localStorage.removeItem(PERMISSIONS_CACHE_KEY);
            state.permissionsGranted = {};
            state.allPermissionsApproved = false;
            console.log('[permissions-advanced] Caché de permisos eliminado');
        } catch (_) {
            /* Ignorar */
        }
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.PERMISSIONS_ADVANCED = Object.freeze({
        requestMandatoryPermissions,
        requestOptionalPermissions,
        getDetailedPermissionsInfo,
        areMandatoryPermissionsApproved,
        getPermissionsStatus,
        revokePermissionsCache,
    });

})(window);
