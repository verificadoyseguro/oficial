/**
 * themes.js — Sistema de Temas Visuales
 * Contactos Anónimos v4.0
 *
 * Gestiona:
 *   1. Aplicación de temas visuales
 *   2. Persistencia del tema seleccionado
 *   3. Tema aleatorio
 *   4. Sincronización con botones del header y sección de temas
 *
 * @module THEMES
 * @version 4.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */
    const THEME_KEY = '_ca_theme_v4';
    const DEFAULT_THEME = 'greenblue';

    const AVAILABLE_THEMES = ['greenblue', 'neon', 'sunset', 'ocean', 'purple'];

    /* ── Estado ──────────────────────────────────────────────── */
    let currentTheme = DEFAULT_THEME;

    /* ── Aplicar tema ────────────────────────────────────────── */
    function applyTheme(themeName) {
        let theme = themeName;

        if (theme === 'random') {
            const others = AVAILABLE_THEMES.filter(t => t !== currentTheme);
            theme = others[Math.floor(Math.random() * others.length)];
        }

        if (!AVAILABLE_THEMES.includes(theme)) {
            theme = DEFAULT_THEME;
        }

        // Aplicar al documento
        document.documentElement.setAttribute('data-theme', theme);

        // Actualizar tema actual
        currentTheme = theme;

        // Guardar preferencia
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (_) {}

        // Actualizar botones del header
        _updateHeaderButtons(theme);

        // Actualizar tarjetas de temas
        _updateThemeCards(theme);

        // Actualizar color del meta theme-color
        _updateThemeColor(theme);

        console.log('[THEMES] Tema aplicado:', theme);

        // Emitir evento
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    /* ── Actualizar botones del header ───────────────────────── */
    function _updateHeaderButtons(theme) {
        document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
            const btnTheme = btn.getAttribute('data-theme');
            const isActive = btnTheme === theme || (btnTheme === 'random');
            btn.classList.toggle('active', btnTheme === theme);
            btn.setAttribute('aria-pressed', btnTheme === theme ? 'true' : 'false');
        });
    }

    /* ── Actualizar tarjetas de temas ────────────────────────── */
    function _updateThemeCards(theme) {
        document.querySelectorAll('.theme-card[data-theme]').forEach(card => {
            const cardTheme = card.getAttribute('data-theme');
            const isActive = cardTheme === theme;
            card.classList.toggle('theme-card--active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    /* ── Actualizar meta theme-color ─────────────────────────── */
    function _updateThemeColor(theme) {
        const colors = {
            greenblue: '#03060c',
            neon:      '#050510',
            sunset:    '#1c0a00',
            ocean:     '#001a2e',
            purple:    '#0f0520',
        };

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme && colors[theme]) {
            metaTheme.setAttribute('content', colors[theme]);
        }
    }

    /* ── Cargar tema guardado ────────────────────────────────── */
    function _loadSavedTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved && AVAILABLE_THEMES.includes(saved)) {
                return saved;
            }
        } catch (_) {}
        return DEFAULT_THEME;
    }

    /* ── Vincular eventos ────────────────────────────────────── */
    function _bindEvents() {
        // Botones del header
        document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                applyTheme(theme);
            });
        });

        // Tarjetas de temas en la sección
        document.querySelectorAll('.theme-card[data-theme]').forEach(card => {
            card.addEventListener('click', () => {
                const theme = card.getAttribute('data-theme');
                applyTheme(theme);
            });
        });
    }

    /* ── Obtener tema actual ─────────────────────────────────── */
    function getCurrentTheme() {
        return currentTheme;
    }

    /* ── Obtener lista de temas ──────────────────────────────── */
    function getAvailableThemes() {
        return [...AVAILABLE_THEMES];
    }

    /* ── Inicializar ─────────────────────────────────────────── */
    function init() {
        const savedTheme = _loadSavedTheme();
        _bindEvents();
        applyTheme(savedTheme);
        console.log('[THEMES] Sistema de temas inicializado. Tema:', savedTheme);
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.THEMES = Object.freeze({
        init,
        applyTheme,
        getCurrentTheme,
        getAvailableThemes,
    });

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
