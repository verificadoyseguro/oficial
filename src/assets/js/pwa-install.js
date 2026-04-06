/**
 * pwa-install.js — Sistema de Instalación PWA Inteligente
 * Contactos Anónimos v4.0
 *
 * Gestiona:
 *   1. Captura del evento beforeinstallprompt
 *   2. Detección de estado de instalación
 *   3. Botón de instalación en el footer
 *   4. Banner de instalación inteligente
 *   5. Notificaciones de actualización
 *   6. Estado online/offline
 *
 * @module PWA_INSTALL
 * @version 4.0
 */

(function (global) {
    'use strict';

    /* ── Estado ──────────────────────────────────────────────── */
    const state = {
        deferredPrompt: null,
        isInstalled: false,
        isOnline: navigator.onLine,
        installBannerShown: false,
    };

    /* ── Constantes ──────────────────────────────────────────── */
    const INSTALL_KEY = '_ca_pwa_install_v4';
    const DISMISS_KEY = '_ca_pwa_banner_dismissed';

    /* ── Detección de instalación ────────────────────────────── */
    function _checkInstalled() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://')
        );
    }

    /* ── Captura del prompt de instalación ───────────────────── */
    function _captureInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            state.deferredPrompt = e;
            console.log('[PWA] Prompt de instalación capturado');
            _updateInstallButton();
            _maybeShowInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            state.isInstalled = true;
            state.deferredPrompt = null;
            console.log('[PWA] Aplicación instalada correctamente');
            _updateInstallButton();
            _hideInstallBanner();
            _saveInstallState();
            _showInstalledToast();
        });
    }

    /* ── Actualizar botón del footer ─────────────────────────── */
    function _updateInstallButton() {
        const btn = document.getElementById('installPWABtn');
        if (!btn) return;

        if (state.isInstalled) {
            btn.classList.add('pwa-installed');
            btn.setAttribute('aria-label', 'Aplicación ya instalada');
            btn.setAttribute('title', 'Contactos Anónimos ya está instalada');
            const icon = btn.querySelector('i');
            const label = btn.querySelector('span');
            if (icon) {
                icon.className = 'fas fa-check-circle';
            }
            if (label) {
                label.setAttribute('data-i18n', 'footer.pwa_installed');
                label.textContent = window.i18n ? window.i18n.t('footer.pwa_installed') : 'Instalada';
            }
        } else if (state.deferredPrompt) {
            btn.classList.remove('pwa-installed');
            btn.classList.add('pwa-available');
            btn.setAttribute('aria-label', 'Instalar aplicación PWA');
            const icon = btn.querySelector('i');
            const label = btn.querySelector('span');
            if (icon) {
                icon.className = 'fas fa-download';
            }
            if (label) {
                label.setAttribute('data-i18n', 'footer.install_pwa');
                label.textContent = window.i18n ? window.i18n.t('footer.install_pwa') : 'Instalar App';
            }
        } else {
            // No disponible en este navegador o ya instalada
            btn.classList.add('pwa-unavailable');
        }
    }

    /* ── Banner de instalación inteligente ───────────────────── */
    function _maybeShowInstallBanner() {
        if (state.installBannerShown) return;
        if (state.isInstalled) return;
        try {
            const dismissed = localStorage.getItem(DISMISS_KEY);
            if (dismissed) {
                const ts = parseInt(dismissed, 10);
                const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
                if (daysSince < 7) return; // No mostrar por 7 días
            }
        } catch (_) {}

        // Mostrar banner después de 3 segundos
        setTimeout(() => {
            _showInstallBanner();
        }, 3000);
    }

    function _showInstallBanner() {
        if (document.getElementById('pwa-install-banner')) return;
        state.installBannerShown = true;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.setAttribute('role', 'banner');
        banner.setAttribute('aria-label', 'Instalar aplicación');
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <img src="src/assets/img/favicon.svg" alt="Contactos Anónimos" class="pwa-banner-icon" width="40" height="40">
                <div class="pwa-banner-text">
                    <strong>Instala Contactos Anónimos</strong>
                    <span>Acceso rápido, sin navegador, funciona offline</span>
                </div>
                <div class="pwa-banner-actions">
                    <button id="pwa-banner-install" class="btn btn--primary pwa-banner-btn" type="button">
                        <i class="fas fa-download" aria-hidden="true"></i>
                        <span>Instalar</span>
                    </button>
                    <button id="pwa-banner-dismiss" class="btn btn--outline pwa-banner-btn" type="button" aria-label="Cerrar banner">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Animar entrada
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                banner.classList.add('pwa-banner--visible');
            });
        });

        // Eventos
        document.getElementById('pwa-banner-install')?.addEventListener('click', () => {
            installPWA();
            _hideInstallBanner();
        });

        document.getElementById('pwa-banner-dismiss')?.addEventListener('click', () => {
            _hideInstallBanner();
            try {
                localStorage.setItem(DISMISS_KEY, Date.now().toString());
            } catch (_) {}
        });
    }

    function _hideInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('pwa-banner--visible');
            setTimeout(() => banner.remove(), 400);
        }
    }

    /* ── Toast de instalación completada ─────────────────────── */
    function _showInstalledToast() {
        const toast = document.getElementById('toastMsg');
        if (toast) {
            toast.textContent = '¡Aplicación instalada correctamente!';
            toast.classList.add('toast--visible', 'toast--success');
            setTimeout(() => {
                toast.classList.remove('toast--visible', 'toast--success');
            }, 3500);
        }
    }

    /* ── Guardar estado ──────────────────────────────────────── */
    function _saveInstallState() {
        try {
            localStorage.setItem(INSTALL_KEY, JSON.stringify({
                installed: true,
                timestamp: Date.now(),
            }));
        } catch (_) {}
    }

    /* ── Monitoreo online/offline ────────────────────────────── */
    function _monitorConnectivity() {
        const indicator = document.getElementById('offlineIndicator');

        function updateStatus() {
            state.isOnline = navigator.onLine;
            if (indicator) {
                indicator.classList.toggle('offline--visible', !state.isOnline);
            }
            document.body.classList.toggle('is-offline', !state.isOnline);
        }

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Instala la PWA usando el prompt capturado.
     */
    async function installPWA() {
        if (!state.deferredPrompt) {
            console.warn('[PWA] No hay prompt de instalación disponible');

            // Mostrar instrucciones según el navegador
            _showInstallInstructions();
            return false;
        }

        try {
            state.deferredPrompt.prompt();
            const { outcome } = await state.deferredPrompt.userChoice;
            console.log('[PWA] Resultado:', outcome);

            if (outcome === 'accepted') {
                state.deferredPrompt = null;
                return true;
            }
            return false;
        } catch (err) {
            console.error('[PWA] Error al instalar:', err);
            return false;
        }
    }

    /**
     * Muestra instrucciones de instalación manual.
     */
    function _showInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        let msg = '';
        if (isIOS && isSafari) {
            msg = 'Para instalar: toca el botón Compartir (□↑) y selecciona "Añadir a pantalla de inicio"';
        } else if (isIOS) {
            msg = 'Para instalar en iOS, usa Safari y toca "Añadir a pantalla de inicio"';
        } else {
            msg = 'Para instalar: abre el menú del navegador y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"';
        }

        const toast = document.getElementById('toastMsg');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('toast--visible', 'toast--info');
            setTimeout(() => {
                toast.classList.remove('toast--visible', 'toast--info');
            }, 6000);
        }
    }

    /**
     * Verifica si la PWA está instalada.
     */
    function isInstalled() {
        return state.isInstalled;
    }

    /**
     * Verifica si la instalación está disponible.
     */
    function canInstall() {
        return !!state.deferredPrompt && !state.isInstalled;
    }

    /**
     * Inicializa el módulo PWA.
     */
    function init() {
        console.log('[PWA] Inicializando sistema PWA inteligente v4.0...');

        state.isInstalled = _checkInstalled();
        _captureInstallPrompt();
        _monitorConnectivity();

        // Vincular botón del footer
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('installPWABtn');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (state.isInstalled) {
                        _showInstalledToast();
                    } else {
                        installPWA();
                    }
                });
            }
            _updateInstallButton();
        });

        console.log('[PWA] Estado inicial — Instalada:', state.isInstalled);
        return { isInstalled: state.isInstalled };
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.PWA_INSTALL = Object.freeze({
        init,
        installPWA,
        isInstalled,
        canInstall,
    });

})(window);
