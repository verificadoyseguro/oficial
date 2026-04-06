/**
 * i18n.js — Sistema de Internacionalización
 * Contactos Anónimos v4.0 — Optimizado
 *
 * Gestiona la traducción de la interfaz entre español e inglés.
 *
 * @module i18n
 * @version 4.0
 */

(function (global) {
    'use strict';

    const STORAGE_KEY = '_ca_language';
    const DEFAULT_LANGUAGE = 'es';
    const SUPPORTED_LANGUAGES = Object.freeze(['es', 'en']);

    const translations = Object.freeze({
        es: {
            'header.title':             'Contactos Anónimos',
            'header.subtitle':          'Contacta sin límites',
            'header.description':       'Millones de números móviles reales para chatear',
            'header.language':          'Idioma',
            'header.menu':              'Menú',
            'menu.section.main':        'Principal',
            'menu.section.config':      'Configuración',
            'menu.section.app':         'Aplicación',
            'menu.contacts':            'Contactos',
            'menu.favorites':           'Favoritos',
            'menu.stats':               'Estadísticas',
            'menu.settings':            'Ajustes',
            'menu.language':            'Idioma',
            'menu.install':             'Instalar App',
            'menu.about':               'Acerca de',
            'hero.title':               'Conecta sin límites',
            'hero.subtitle':            'Privacidad total en cada mensaje',
            'hero.channel':             'Canal Oficial',
            'status.offline':           'Sin conexión — Modo offline',
            'status.loading':           'Cargando...',
            'status.generating':        'Generando...',
            'status.empty':             'No hay números disponibles.',
            'status.copied':            'Copiado al portapapeles',
            'modal.accept.title':       'Aviso de Acceso',
            'modal.accept.desc':        'Para continuar, debes aceptar nuestra Política de Privacidad y Términos de Uso.',
            'modal.blocked.title':      'Acceso Denegado',
            'modal.blocked.location':   'Esta plataforma solo está disponible en Cuba.',
            'info.version':             'Versión',
            'info.about':               'Acerca de'
        },
        en: {
            'header.title':             'Anonymous Contacts',
            'header.subtitle':          'Connect without limits',
            'header.description':       'Millions of real mobile numbers to chat',
            'header.language':          'Language',
            'header.menu':              'Menu',
            'menu.section.main':        'Main',
            'menu.section.config':      'Settings',
            'menu.section.app':         'Application',
            'menu.contacts':            'Contacts',
            'menu.favorites':           'Favorites',
            'menu.stats':               'Statistics',
            'menu.settings':            'Settings',
            'menu.language':            'Language',
            'menu.install':             'Install App',
            'menu.about':               'About',
            'hero.title':               'Connect without limits',
            'hero.subtitle':            'Total privacy in every message',
            'hero.channel':             'Official Channel',
            'status.offline':           'No connection — Offline mode',
            'status.loading':           'Loading...',
            'status.generating':        'Generating...',
            'status.empty':             'No numbers available.',
            'status.copied':            'Copied to clipboard',
            'modal.accept.title':       'Access Notice',
            'modal.accept.desc':        'To continue, you must accept our Privacy Policy and Terms of Use.',
            'modal.blocked.title':      'Access Denied',
            'modal.blocked.location':   'This platform is only available in Cuba.',
            'info.version':             'Version',
            'info.about':               'About'
        }
    });

    let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;

    function init() {
        if (!SUPPORTED_LANGUAGES.includes(currentLang)) {
            currentLang = DEFAULT_LANGUAGE;
        }
        updateUI();
    }

    function setLanguage(lang) {
        if (SUPPORTED_LANGUAGES.includes(lang)) {
            currentLang = lang;
            localStorage.setItem(STORAGE_KEY, lang);
            updateUI();
            window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
        }
    }

    function getLanguage() {
        return currentLang;
    }

    function t(key) {
        return translations[currentLang][key] || key;
    }

    function updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
        document.documentElement.lang = currentLang;
    }

    global.i18n = {
        init,
        setLanguage,
        getLanguage,
        t,
        updateUI
    };

})(window);
