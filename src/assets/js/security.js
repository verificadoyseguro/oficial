/**
 * security.js — Módulo de Seguridad del Cliente
 * Contactos Anónimos v2.0
 *
 * Implementa múltiples capas de protección del lado del cliente:
 *   1. Prevención de inspección de código (DevTools, View Source)
 *   2. Protección contra copia no autorizada de contenido
 *   3. Prevención de Clickjacking (framing)
 *   4. Detección de entornos automatizados (bots básicos)
 *   5. Protección de arrastre de medios
 *   6. Rate-limiting de interacciones
 *   7. Integridad de scripts cargados
 *
 * NOTA: La seguridad del lado del cliente es una capa de
 * disuasión, no un reemplazo de la seguridad del servidor.
 */

(function () {
    'use strict';

    /* ── 1. Anti-Framing (Clickjacking) ──────────────────────── */
    (function preventFraming() {
        if (window.self !== window.top) {
            try {
                window.top.location.href = window.self.location.href;
            } catch (_) {
                document.documentElement.innerHTML = '';
                document.write('<h1 style="font-family:sans-serif;padding:2rem;">Acceso denegado.</h1>');
            }
        }
    })();

    /* ── 2. Bloqueo de menú contextual ───────────────────────── */
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    }, { capture: true });

    /* ── 3. Bloqueo de atajos de teclado de inspección ───────── */
    document.addEventListener('keydown', function (e) {
        const tag    = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

        // Permitir Ctrl+C / Ctrl+V en campos de texto
        if (isInput && e.ctrlKey && ['c', 'C', 'v', 'V', 'a', 'A', 'z', 'Z'].includes(e.key)) {
            return;
        }

        // Bloquear atajos de inspección / guardado / impresión
        const blockedCtrl = ['s', 'S', 'u', 'U', 'p', 'P', 'j', 'J', 'i', 'I'];
        if (e.ctrlKey && blockedCtrl.includes(e.key)) {
            e.preventDefault();
            return false;
        }

        // Bloquear F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+U (ver fuente)
        if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            return false;
        }
    }, { capture: true });

    /* ── 4. Selección de texto (solo en inputs) ──────────────── */
    (function applySelectionRules() {
        const style = document.createElement('style');
        style.id    = '__ca_sec_style';
        style.textContent = `
            body,
            .phone-card,
            .phone-number,
            .logo-text,
            .banner-title {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);
    })();

    /* ── 5. Protección de arrastre de medios ─────────────────── */
    document.addEventListener('dragstart', function (e) {
        const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
        if (['IMG', 'SVG', 'VIDEO', 'IFRAME', 'CANVAS'].includes(tag)) {
            e.preventDefault();
        }
    }, { capture: true });

    /* ── 6. Detección básica de DevTools (tamaño de ventana) ─── */
    (function detectDevTools() {
        const THRESHOLD = 160;
        let devToolsOpen = false;

        function check() {
            const widthDiff  = window.outerWidth  - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;

            if (widthDiff > THRESHOLD || heightDiff > THRESHOLD) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    // Acción suave: solo limpiar la consola
                    try { console.clear(); } catch (_) {}
                }
            } else {
                devToolsOpen = false;
            }
        }

        // Verificar periódicamente
        setInterval(check, 1500);
    })();

    /* ── 7. Trampa de consola ────────────────────────────────── */
    (function consoleTrap() {
        const msg = '%cContactos Anónimos — Zona restringida\n%cEsta herramienta está destinada a desarrolladores. Si alguien te indicó pegar algo aquí, es una estafa.';
        try {
            console.log(msg, 'color:#25D366;font-size:1.4rem;font-weight:bold;', 'color:#ff6b6b;font-size:0.9rem;');
        } catch (_) {}
    })();

    /* ── 8. Rate-limiting de clics en botones de chat ────────── */
    (function rateLimitChatButtons() {
        const LIMIT_MS = 800;
        let lastClick  = 0;

        document.addEventListener('click', function (e) {
            const el = e.target.closest('.wa-btn, .telegram-btn');
            if (!el) return;

            const now = Date.now();
            if (now - lastClick < LIMIT_MS) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            lastClick = now;
        }, { capture: true });
    })();

    /* ── 9. Prevención de impresión ──────────────────────────── */
    (function preventPrint() {
        const style = document.createElement('style');
        style.textContent = '@media print { body { display: none !important; } }';
        document.head.appendChild(style);

        window.addEventListener('beforeprint', function (e) {
            e.preventDefault();
            return false;
        });
    })();

    /* ── 10. Detección de bots básica ────────────────────── */
    (function detectBot() {
        const checks = [
            typeof navigator.webdriver !== 'undefined' && navigator.webdriver,
            navigator.languages && navigator.languages.length === 0,
            !window.chrome && navigator.userAgent.includes('HeadlessChrome'),
        ];

        if (checks.some(Boolean)) {
            // Redirigir o mostrar página vacía a bots detectados
            document.documentElement.innerHTML = '';
        }
    })();

    /* ── 11. Validación de almacenamiento local ──────────── */
    (function validateStorage() {
        try {
            const testKey = '__ca_storage_check__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (err) {
            console.error('[security] localStorage no disponible:', err);
            document.documentElement.innerHTML = '<h1 style="font-family:sans-serif;padding:2rem;color:#ff6b6b;">Almacenamiento local requerido.</h1>';
        }
    })();

    /* ── 12. Protección contra inyección de scripts ────── */
    (function preventScriptInjection() {
        // Bloquear acceso a eval y Function
        window.eval = function() {
            throw new Error('eval() está deshabilitado por razones de seguridad.');
        };
        window.Function = function() {
            throw new Error('Function() está deshabilitado por razones de seguridad.');
        };
    })();

    /* ── 13. Protección de datos sensibles en memoria ───── */
    (function protectSensitiveData() {
        // Limpiar datos sensibles al descargar la página
        window.addEventListener('beforeunload', function() {
            if (typeof DB !== 'undefined' && DB.Session) {
                // Mantener sesión activa pero limpiar datos temporales
                try {
                    sessionStorage.clear();
                } catch (_) {}
            }
        });
    })();

})();
