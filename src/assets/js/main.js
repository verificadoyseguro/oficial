/**
 * main.js — Lógica Principal de la Interfaz
 * Contactos Anónimos v4.0 — Optimizado
 *
 * Gestiona el estado de la aplicación, la interacción con el DOM,
 * los modales, los temas visuales y la integración con los módulos
 * API, DB, GEO y PERMISSIONS.
 *
 * @module main
 * @version 4.0
 */

(function () {
    'use strict';

    /* ── Configuración ───────────────────────────────────────── */

    const CONFIG = Object.freeze({
        BATCH_SIZE:       5,
        WHATSAPP_CHANNEL: 'https://whatsapp.com/channel/0029VbCdMrUHgZWU8CQ6uu0h',
        TOAST_DURATION:   2200,
        DEFAULT_MESSAGE:  'Hola, vi tu número en la red anónima. ¿Charlamos?',
        THEMES: {
            greenblue: {
                gradStart:   '#0f172a',
                gradEnd:     '#03060c',
                accentColor: '#25D366',
                primaryWa:   '#25D366',
                primaryTg:   '#26A5E4',
            },
        },
    });

    /* ── Estado ──────────────────────────────────────────────── */

    const state = {
        numbers:        [],
        usedSet:        new Set(),
        currentMessage: CONFIG.DEFAULT_MESSAGE,
        isLoading:      false,
        currentTheme:   'greenblue',
        toastTimer:     null,
    };

    /* ── Referencias al DOM ──────────────────────────────────── */

    const $ = (id) => document.getElementById(id);

    const DOM = {
        phoneList:          $('phoneList'),
        counter:            $('numbersCounter'),
        customMsg:          $('customMsg'),
        searchBtn:          $('searchBtn'),
        resetBtn:           $('resetBtn'),
        loadMoreBtn:        $('loadMoreBtn'),
        acceptModal:        $('acceptTermsModal'),
        acceptBtn:          $('acceptTermsBtn'),
        privacyModal:       $('privacyModal'),
        termsModal:         $('termsModal'),
        openPrivacy:        $('openPrivacy'),
        openTerms:          $('openTerms'),
        loadingModal:       $('loadingPermissionsModal'),
        blockedModal:       $('blockedAccessModal'),
        permDeniedModal:    $('permissionsDeniedModal'),
        blockedReason:      $('blockedReason'),
        retryBtn:           $('retryPermissionsBtn'),
        permGeo:            $('perm-geo'),
        permStorage:        $('perm-storage'),
        permNotif:          $('perm-notif'),
        toast:              $('toastMsg'),
        shareChannel:       $('shareWhatsAppChannel'),
    };

    /* ── Utilidades ──────────────────────────────────────────── */

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(str).replace(/[&<>"']/g, (c) => map[c]);
    }

    function showToast(text, duration = CONFIG.TOAST_DURATION) {
        if (!DOM.toast) return;
        clearTimeout(state.toastTimer);
        const displayText = (typeof i18n !== 'undefined' && text.includes('.'))
            ? i18n.t(text, { plural: '' })
            : text;
        DOM.toast.textContent = displayText;
        DOM.toast.classList.add('show');
        state.toastTimer = setTimeout(() => {
            DOM.toast.classList.remove('show');
        }, duration);
    }

    async function copyToClipboard(text, successMsg = 'Copiado al portapapeles') {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMsg);
        } catch (_) {
            showToast('No se pudo copiar');
        }
    }

    /* ── Renderizado ─────────────────────────────────────────── */

    function buildPhoneCardHTML(item) {
        return `
            <div class="phone-card" data-id="${escapeHtml(item.id)}" role="listitem">
                <div class="phone-info">
                    <div class="phone-icon" aria-hidden="true">👤</div>
                    <div class="phone-details">
                        <div class="phone-number">${escapeHtml(item.formatted)}</div>
                        <div class="phone-label">Número móvil cubano</div>
                    </div>
                </div>
                <div class="chat-buttons">
                    <a href="${escapeHtml(item.waLink)}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="wa-btn"
                       aria-label="Contactar por WhatsApp al ${escapeHtml(item.formatted)}">
                        <i class="fab fa-whatsapp" aria-hidden="true"></i>
                        <span>WhatsApp</span>
                    </a>
                    <a href="${escapeHtml(item.telegramLink)}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="telegram-btn"
                       aria-label="Contactar por Telegram al ${escapeHtml(item.formatted)}">
                        <i class="fab fa-telegram" aria-hidden="true"></i>
                        <span>Telegram</span>
                    </a>
                </div>
            </div>
        `;
    }

    function renderNumbers() {
        if (!DOM.phoneList) return;

        if (state.numbers.length === 0) {
            DOM.phoneList.setAttribute('aria-busy', 'false');
            DOM.phoneList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-phone-slash" aria-hidden="true"></i>
                    <span>No hay números. Usa "Buscar" o "Cargar más".</span>
                </div>`;
            if (DOM.counter) DOM.counter.textContent = '0 números';
            return;
        }

        DOM.phoneList.setAttribute('aria-busy', 'false');
        DOM.phoneList.innerHTML = state.numbers.map(buildPhoneCardHTML).join('');

        if (DOM.counter) {
            const n = state.numbers.length;
            DOM.counter.textContent = `${n} número${n !== 1 ? 's' : ''}`;
        }
    }

    /* ── Carga de números ────────────────────────────────────── */

    async function loadNumbers(batchSize = CONFIG.BATCH_SIZE, reset = false) {
        if (state.isLoading) return;
        state.isLoading = true;

        if (DOM.loadMoreBtn) {
            DOM.loadMoreBtn.disabled = true;
            DOM.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-pulse" aria-hidden="true"></i> <span>Generando...</span>';
        }

        try {
            const usedSet = reset ? new Set() : state.usedSet;
            const { newNumbers, usedSet: updatedSet } = API.generateUniqueNumbers(
                batchSize,
                usedSet,
                state.currentMessage
            );

            if (newNumbers.length === 0) {
                showToast('No hay más números únicos disponibles.', 3000);
                return;
            }

            if (typeof DB !== 'undefined') {
                newNumbers.forEach((n) => DB.History.add(n.raw));
                DB.Stats.increment('totalGenerated', newNumbers.length);
            }

            state.usedSet = updatedSet;
            state.numbers = reset ? newNumbers : [...state.numbers, ...newNumbers];

            renderNumbers();

        } catch (err) {
            console.error('[main] Error al generar números:', err);
            showToast('Error al generar números. Inténtalo de nuevo.', 3000);
        } finally {
            state.isLoading = false;
            if (DOM.loadMoreBtn) {
                DOM.loadMoreBtn.disabled = false;
                DOM.loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle" aria-hidden="true"></i> <span>Cargar más</span>';
            }
        }
    }

    function resetNumbers() {
        state.numbers = [];
        state.usedSet = new Set();
        renderNumbers();
        loadNumbers(CONFIG.BATCH_SIZE, true);
    }

    function applySearch() {
        const msg = DOM.customMsg ? DOM.customMsg.value.trim() : '';
        state.currentMessage = msg || CONFIG.DEFAULT_MESSAGE;

        if (typeof DB !== 'undefined') {
            DB.Stats.increment('totalSearches');
        }

        resetNumbers();
    }

    /* ── Temas visuales ──────────────────────────────────────── */

    function applyTheme(theme) {
        state.currentTheme = theme;
        const root = document.documentElement;

        if (theme === 'greenblue') {
            const t = CONFIG.THEMES.greenblue;
            root.style.setProperty('--primary-wa',   t.primaryWa);
            root.style.setProperty('--primary-tg',   t.primaryTg);
            root.style.setProperty('--accent-color', t.accentColor);
            root.style.setProperty('--grad-start',   t.gradStart);
            root.style.setProperty('--grad-end',     t.gradEnd);
            document.body.style.background = `radial-gradient(ellipse at 30% 10%, ${t.gradStart}, ${t.gradEnd})`;
        }
    }

    /* ── Canal de WhatsApp ───────────────────────────────────── */

    function shareWhatsAppChannel() {
        const url = CONFIG.WHATSAPP_CHANNEL;

        if (navigator.share) {
            navigator.share({
                title: 'Canal de WhatsApp — Contactos Anónimos',
                text:  'Únete al canal oficial de Contactos Anónimos',
                url,
            }).catch(() => copyToClipboard(url, 'Enlace copiado al portapapeles'));
        } else {
            copyToClipboard(url, 'Enlace copiado al portapapeles');
        }
    }

    /* ── Modales ─────────────────────────────────────────────── */

    function openModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        const focusable = modal.querySelector('button, [tabindex="0"], a[href]');
        if (focusable) setTimeout(() => focusable.focus(), 50);
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    function initModals() {
        const alreadyAccepted = (typeof DB !== 'undefined')
            ? DB.Terms.hasAccepted()
            : false;

        if (!alreadyAccepted) {
            openModal(DOM.acceptModal);
        } else {
            loadNumbers(CONFIG.BATCH_SIZE, true);
        }

        if (DOM.acceptBtn) {
            DOM.acceptBtn.addEventListener('click', () => {
                if (typeof DB !== 'undefined') DB.Terms.accept();
                closeModal(DOM.acceptModal);
                loadNumbers(CONFIG.BATCH_SIZE, true);
            });
        }

        if (DOM.openPrivacy) {
            DOM.openPrivacy.addEventListener('click', () => openModal(DOM.privacyModal));
        }

        if (DOM.openTerms) {
            DOM.openTerms.addEventListener('click', () => openModal(DOM.termsModal));
        }

        document.querySelectorAll('.modal-close').forEach((btn) => {
            btn.addEventListener('click', () => {
                closeModal(DOM.privacyModal);
                closeModal(DOM.termsModal);
            });
        });

        [DOM.privacyModal, DOM.termsModal].forEach((overlay) => {
            if (!overlay) return;
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal(DOM.privacyModal);
                closeModal(DOM.termsModal);
            }
        });
    }

    /* ── Eventos ─────────────────────────────────────────────── */

    function bindEvents() {
        if (DOM.searchBtn)      DOM.searchBtn.addEventListener('click', applySearch);
        if (DOM.resetBtn)       DOM.resetBtn.addEventListener('click', resetNumbers);
        if (DOM.loadMoreBtn)    DOM.loadMoreBtn.addEventListener('click', () => loadNumbers(CONFIG.BATCH_SIZE, false));
        if (DOM.shareChannel)   DOM.shareChannel.addEventListener('click', shareWhatsAppChannel);

        if (typeof window !== 'undefined') {
            window.addEventListener('languagechange', () => {
                renderNumbers();
            });
        }

        if (DOM.customMsg) {
            DOM.customMsg.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') applySearch();
            });
        }

        if (DOM.retryBtn) {
            DOM.retryBtn.addEventListener('click', () => {
                closeModal(DOM.permDeniedModal);
                location.reload();
            });
        }
    }

    /* ── Verificación de Acceso ──────────────────────────────── */

    async function checkAccessRequirements() {
        try {
            openModal(DOM.loadingModal);

            if (typeof PERMISSIONS !== 'undefined') {
                const permsResult = await PERMISSIONS.requestMandatoryPermissions();
                if (!permsResult.allApproved) {
                    closeModal(DOM.loadingModal);
                    openModal(DOM.permDeniedModal);
                    return false;
                }
            }

            if (typeof GEO !== 'undefined') {
                const geoResult = await GEO.init();
                if (!geoResult.allowed) {
                    closeModal(DOM.loadingModal);
                    openModal(DOM.blockedModal);
                    return false;
                }
            }

            closeModal(DOM.loadingModal);
            return true;
        } catch (err) {
            console.error('[main] Error en verificación de acceso:', err);
            closeModal(DOM.loadingModal);
            return false;
        }
    }

    /* ── Inicialización ──────────────────────────────────────── */

    function init() {
        if (typeof i18n !== 'undefined') i18n.init();
        if (typeof DB !== 'undefined') DB.Session.init();

        bindEvents();
        applyTheme('greenblue');

        if (typeof MENU !== 'undefined') MENU.init();

        checkAccessRequirements().then((allowed) => {
            if (allowed) {
                initModals();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
