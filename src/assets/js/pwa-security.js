/**
 * pwa-security.js — Módulo de Seguridad PWA con Detección de VPN y Región
 * Contactos Anónimos v3.0
 *
 * Integra:
 *   1. Detección de VPN y región cubana en PWA
 *   2. Sincronización de estado de seguridad
 *   3. Notificaciones de seguridad
 *   4. Bloqueo de acceso en PWA
 *   5. Caché seguro de datos
 *   6. Monitoreo continuo
 *
 * @module PWA_SECURITY
 * @version 3.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const PWA_SECURITY_KEY = '_ca_pwa_security_v3';
    const PWA_STATE_KEY = '_ca_pwa_state_v3';
    const SECURITY_CHECK_INTERVAL = 300000; // 5 minutos

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        isInstalled: false,
        isOnline: navigator.onLine,
        securityStatus: null,
        lastSecurityCheck: null,
        isBlocked: false,
        blockReason: null,
        monitoringActive: false,
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Verifica si la PWA está instalada.
     */
    function _checkPWAInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    }

    /**
     * Registra el service worker.
     */
    async function _registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[pwa-security] Service Worker no disponible');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });

            console.log('[pwa-security] Service Worker registrado:', registration);

            // Escuchar actualizaciones
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[pwa-security] Nueva versión disponible');
                        _notifyUpdate();
                    }
                });
            });

            return true;
        } catch (err) {
            console.error('[pwa-security] Error al registrar Service Worker:', err);
            return false;
        }
    }

    /**
     * Notifica al usuario sobre una actualización disponible.
     */
    function _notifyUpdate() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Actualización disponible', {
                body: 'Una nueva versión de Contactos Anónimos está disponible.',
                icon: 'src/assets/img/pwa_icons/icon-192x192.png',
                badge: 'src/assets/img/pwa_icons/icon-192x192.png',
                tag: 'ca-update',
                requireInteraction: true,
            });
        }
    }

    /**
     * Realiza una verificación de seguridad completa.
     */
    async function _performSecurityCheck() {
        try {
            console.log('[pwa-security] Realizando verificación de seguridad PWA...');

            // Verificar si SECURITY_ADVANCED está disponible
            if (typeof window.SECURITY_ADVANCED === 'undefined') {
                console.warn('[pwa-security] SECURITY_ADVANCED no disponible');
                return null;
            }

            const securityResult = await window.SECURITY_ADVANCED.init();

            state.securityStatus = securityResult;
            state.lastSecurityCheck = Date.now();

            // Guardar estado de seguridad
            try {
                localStorage.setItem(PWA_SECURITY_KEY, JSON.stringify({
                    timestamp: state.lastSecurityCheck,
                    status: securityResult,
                }));
            } catch (_) {
                /* Ignorar errores de almacenamiento */
            }

            // Determinar si está bloqueado
            const isBlocked = !securityResult.allowed;
            const wasBlocked = state.isBlocked;

            state.isBlocked = isBlocked;

            if (isBlocked && !wasBlocked) {
                state.blockReason = securityResult.vpnDetected ? 'VPN_DETECTED' : 'REGION_BLOCKED';
                _handleSecurityBlock(securityResult);
            } else if (!isBlocked && wasBlocked) {
                _handleSecurityUnblock();
            }

            return securityResult;

        } catch (err) {
            console.error('[pwa-security] Error en verificación de seguridad:', err);
            return null;
        }
    }

    /**
     * Maneja el bloqueo de acceso.
     */
    function _handleSecurityBlock(securityResult) {
        console.warn('[pwa-security] ⚠️ Acceso bloqueado');

        // Mostrar notificación
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Acceso Denegado', {
                body: securityResult.vpnDetected
                    ? 'Se detectó uso de VPN. El acceso ha sido bloqueado.'
                    : 'Tu ubicación no está autorizada. El acceso ha sido bloqueado.',
                icon: 'src/assets/img/pwa_icons/icon-192x192.png',
                badge: 'src/assets/img/pwa_icons/icon-192x192.png',
                tag: 'ca-blocked',
                requireInteraction: true,
            });
        }

        // Disparar evento
        const event = new CustomEvent('pwasecurityblocked', {
            detail: { reason: state.blockReason, securityResult },
        });
        window.dispatchEvent(event);

        // Mostrar UI de bloqueo
        _showBlockedUI(securityResult);
    }

    /**
     * Maneja el desbloqueo de acceso.
     */
    function _handleSecurityUnblock() {
        console.log('[pwa-security] ✅ Acceso permitido');

        // Disparar evento
        const event = new CustomEvent('pwasecurityunblocked');
        window.dispatchEvent(event);

        // Ocultar UI de bloqueo
        _hideBlockedUI();
    }

    /**
     * Muestra la UI de bloqueo.
     */
    function _showBlockedUI(securityResult) {
        // Crear overlay de bloqueo
        const overlay = document.createElement('div');
        overlay.id = 'pwa-security-blocked-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #03060c 0%, #1a1d2e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(10px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            text-align: center;
            color: white;
            max-width: 500px;
            padding: 40px 20px;
        `;

        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 80px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        `;
        icon.textContent = securityResult.vpnDetected ? '🔒' : '🚫';

        const title = document.createElement('h1');
        title.style.cssText = `
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        `;
        title.textContent = securityResult.vpnDetected
            ? 'VPN Detectado'
            : 'Acceso Denegado';

        const message = document.createElement('p');
        message.style.cssText = `
            font-size: 16px;
            color: #aaa;
            margin-bottom: 30px;
            line-height: 1.6;
        `;
        message.textContent = securityResult.vpnDetected
            ? 'Se detectó el uso de una VPN o proxy. Por razones de seguridad, el acceso a esta plataforma no está permitido con VPN.'
            : 'Tu ubicación no está autorizada para acceder a esta plataforma. Contactos Anónimos solo está disponible en Cuba.';

        const details = document.createElement('div');
        details.style.cssText = `
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: left;
        `;

        if (securityResult.vpnDetected) {
            details.innerHTML = `
                <strong>Información de Seguridad:</strong><br>
                Puntuación de VPN: ${securityResult.vpnScore}/100<br>
                Métodos de detección: ${securityResult.vpnDetectionMethods?.join(', ') || 'N/A'}
            `;
        } else {
            details.innerHTML = `
                <strong>Información de Ubicación:</strong><br>
                País: ${securityResult.country || 'Desconocido'}<br>
                En Cuba: ${securityResult.inCuba ? 'Sí' : 'No'}
            `;
        }

        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(details);

        overlay.appendChild(content);

        // Agregar estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);

        // Reemplazar contenido del body
        document.body.innerHTML = '';
        document.body.appendChild(overlay);
    }

    /**
     * Oculta la UI de bloqueo.
     */
    function _hideBlockedUI() {
        const overlay = document.getElementById('pwa-security-blocked-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Maneja cambios de conectividad.
     */
    function _handleOnlineStatusChange() {
        const isOnline = navigator.onLine;

        if (isOnline && !state.isOnline) {
            console.log('[pwa-security] Conexión restaurada');
            state.isOnline = true;

            // Realizar verificación de seguridad
            _performSecurityCheck();

            // Disparar evento
            const event = new CustomEvent('pwasonline');
            window.dispatchEvent(event);
        } else if (!isOnline && state.isOnline) {
            console.warn('[pwa-security] Conexión perdida');
            state.isOnline = false;

            // Disparar evento
            const event = new CustomEvent('pwaoffline');
            window.dispatchEvent(event);
        }
    }

    /**
     * Inicia el monitoreo de seguridad.
     */
    function _startSecurityMonitoring() {
        if (state.monitoringActive) return;
        state.monitoringActive = true;

        console.log('[pwa-security] Iniciando monitoreo de seguridad PWA...');

        // Realizar verificación inicial
        _performSecurityCheck();

        // Monitoreo continuo
        const intervalId = setInterval(() => {
            if (state.isOnline) {
                _performSecurityCheck();
            }
        }, SECURITY_CHECK_INTERVAL);

        // Guardar ID del intervalo
        state.monitoringIntervalId = intervalId;

        // Escuchar cambios de conectividad
        window.addEventListener('online', _handleOnlineStatusChange);
        window.addEventListener('offline', _handleOnlineStatusChange);
    }

    /**
     * Detiene el monitoreo de seguridad.
     */
    function _stopSecurityMonitoring() {
        if (!state.monitoringActive) return;
        state.monitoringActive = false;

        console.log('[pwa-security] Deteniendo monitoreo de seguridad PWA...');

        if (state.monitoringIntervalId) {
            clearInterval(state.monitoringIntervalId);
            state.monitoringIntervalId = null;
        }

        window.removeEventListener('online', _handleOnlineStatusChange);
        window.removeEventListener('offline', _handleOnlineStatusChange);
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Inicializa el módulo de seguridad PWA.
     */
    async function init() {
        console.log('[pwa-security] Inicializando módulo de seguridad PWA...');

        state.isInstalled = _checkPWAInstalled();
        console.log('[pwa-security] PWA instalada:', state.isInstalled);

        // Registrar service worker
        const swRegistered = await _registerServiceWorker();

        // Iniciar monitoreo de seguridad
        _startSecurityMonitoring();

        return {
            installed: state.isInstalled,
            swRegistered,
            online: state.isOnline,
        };
    }

    /**
     * Obtiene el estado de seguridad actual.
     */
    function getSecurityStatus() {
        return {
            isBlocked: state.isBlocked,
            blockReason: state.blockReason,
            securityStatus: state.securityStatus,
            lastCheck: state.lastSecurityCheck,
            isOnline: state.isOnline,
            isInstalled: state.isInstalled,
        };
    }

    /**
     * Obtiene el estado de la PWA.
     */
    function getPWAState() {
        return { ...state };
    }

    /**
     * Solicita permiso para notificaciones.
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('[pwa-security] Notifications API no disponible');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (err) {
            console.error('[pwa-security] Error al solicitar permiso de notificaciones:', err);
            return false;
        }
    }

    /**
     * Envía una notificación.
     */
    function sendNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const defaultOptions = {
                icon: 'src/assets/img/pwa_icons/icon-192x192.png',
                badge: 'src/assets/img/pwa_icons/icon-192x192.png',
            };

            return new Notification(title, { ...defaultOptions, ...options });
        }
    }

    /**
     * Solicita sincronización en segundo plano.
     */
    async function requestBackgroundSync(tag) {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
            console.warn('[pwa-security] Background Sync no disponible');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register(tag);
            console.log('[pwa-security] Sincronización registrada:', tag);
            return true;
        } catch (err) {
            console.error('[pwa-security] Error al registrar sincronización:', err);
            return false;
        }
    }

    /**
     * Obtiene el tamaño del caché.
     */
    async function getCacheSize() {
        if (!('serviceWorker' in navigator)) {
            return 0;
        }

        return new Promise((resolve) => {
            navigator.serviceWorker.controller?.postMessage({
                type: 'GET_CACHE_SIZE',
            });

            const handler = (event) => {
                if (event.data?.type === 'CACHE_SIZE') {
                    navigator.serviceWorker.controller?.removeEventListener('message', handler);
                    resolve(event.data.size);
                }
            };

            navigator.serviceWorker.controller?.addEventListener('message', handler);
            setTimeout(() => resolve(0), 5000);
        });
    }

    /**
     * Limpia el caché.
     */
    async function clearCache() {
        if (!('serviceWorker' in navigator)) {
            return false;
        }

        try {
            navigator.serviceWorker.controller?.postMessage({
                type: 'CLEAR_CACHE',
            });
            console.log('[pwa-security] Caché limpiado');
            return true;
        } catch (err) {
            console.error('[pwa-security] Error al limpiar caché:', err);
            return false;
        }
    }

    /**
     * Instala la PWA.
     */
    async function installPWA() {
        if (!('BeforeInstallPromptEvent' in window)) {
            console.warn('[pwa-security] PWA install prompt no disponible');
            return false;
        }

        try {
            // Guardar el evento de instalación
            let deferredPrompt;

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
            });

            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('[pwa-security] Resultado de instalación:', outcome);
                return outcome === 'accepted';
            }

            return false;
        } catch (err) {
            console.error('[pwa-security] Error al instalar PWA:', err);
            return false;
        }
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.PWA_SECURITY = Object.freeze({
        init,
        getSecurityStatus,
        getPWAState,
        requestNotificationPermission,
        sendNotification,
        requestBackgroundSync,
        getCacheSize,
        clearCache,
        installPWA,
    });

})(window);
