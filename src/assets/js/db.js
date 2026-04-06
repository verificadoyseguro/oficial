/**
 * db.js — Módulo de Base de Datos del Cliente
 * Contactos Anónimos v2.0
 *
 * Gestiona el almacenamiento local, caché de sesión y
 * estadísticas de uso sin exponer datos sensibles.
 * Preparado para conectarse a una API REST en el futuro.
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */
    const DB_VERSION    = '2.0';
    const STORE_KEY     = '_ca_session';
    const STATS_KEY     = '_ca_stats';
    const TERMS_KEY     = '_ca_terms_v2';
    const MAX_HISTORY   = 200;   // máximo de números en historial
    const SESSION_TTL   = 3600;  // segundos de vida de sesión (1 hora)

    /* ── Utilidades internas ─────────────────────────────────── */

    /**
     * Lee un valor de sessionStorage de forma segura.
     * @param {string} key
     * @returns {*|null}
     */
    function _readSession(key) {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Escribe un valor en sessionStorage de forma segura.
     * @param {string} key
     * @param {*} value
     */
    function _writeSession(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            /* Cuota excedida u otro error — ignorar silenciosamente */
        }
    }

    /**
     * Lee un valor de localStorage de forma segura.
     * @param {string} key
     * @returns {*|null}
     */
    function _readLocal(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Escribe un valor en localStorage de forma segura.
     * @param {string} key
     * @param {*} value
     */
    function _writeLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            /* Cuota excedida u otro error — ignorar silenciosamente */
        }
    }

    /**
     * Devuelve el timestamp Unix actual.
     * @returns {number}
     */
    function _now() {
        return Math.floor(Date.now() / 1000);
    }

    /* ── Módulo de Sesión ────────────────────────────────────── */
    const Session = {
        /**
         * Inicializa o recupera la sesión activa.
         * @returns {object} datos de sesión
         */
        init() {
            let session = _readSession(STORE_KEY);
            const now   = _now();

            if (!session || (now - session.createdAt) > SESSION_TTL) {
                session = {
                    id:        _generateId(),
                    createdAt: now,
                    updatedAt: now,
                    version:   DB_VERSION,
                    history:   [],
                };
                _writeSession(STORE_KEY, session);
            }
            return session;
        },

        /**
         * Actualiza el timestamp de la sesión.
         */
        touch() {
            const s = this.init();
            s.updatedAt = _now();
            _writeSession(STORE_KEY, s);
        },

        /**
         * Destruye la sesión actual.
         */
        destroy() {
            try { sessionStorage.removeItem(STORE_KEY); } catch (_) {}
        },
    };

    /* ── Módulo de Historial ─────────────────────────────────── */
    const History = {
        /**
         * Agrega un número al historial de la sesión.
         * @param {string} raw - número sin formato
         */
        add(raw) {
            if (!raw || typeof raw !== 'string') return;
            const s = Session.init();
            if (!Array.isArray(s.history)) s.history = [];

            // Evitar duplicados
            if (s.history.includes(raw)) return;

            s.history.unshift(raw);

            // Limitar tamaño
            if (s.history.length > MAX_HISTORY) {
                s.history = s.history.slice(0, MAX_HISTORY);
            }
            _writeSession(STORE_KEY, s);
        },

        /**
         * Devuelve el historial como Set para búsquedas O(1).
         * @returns {Set<string>}
         */
        asSet() {
            const s = Session.init();
            return new Set(Array.isArray(s.history) ? s.history : []);
        },

        /**
         * Limpia el historial de la sesión.
         */
        clear() {
            const s = Session.init();
            s.history = [];
            _writeSession(STORE_KEY, s);
        },

        /**
         * Devuelve el número de entradas en el historial.
         * @returns {number}
         */
        count() {
            return this.asSet().size;
        },
    };

    /* ── Módulo de Estadísticas ──────────────────────────────── */
    const Stats = {
        /**
         * Devuelve las estadísticas actuales.
         * @returns {object}
         */
        get() {
            return _readLocal(STATS_KEY) || {
                totalGenerated: 0,
                totalSearches:  0,
                totalResets:    0,
                firstVisit:     _now(),
                lastVisit:      _now(),
            };
        },

        /**
         * Incrementa un contador de estadísticas.
         * @param {'totalGenerated'|'totalSearches'|'totalResets'} field
         * @param {number} [amount=1]
         */
        increment(field, amount = 1) {
            const s = this.get();
            if (typeof s[field] === 'number') {
                s[field] += amount;
            }
            s.lastVisit = _now();
            _writeLocal(STATS_KEY, s);
        },
    };

    /* ── Módulo de Términos ──────────────────────────────────── */
    const Terms = {
        /**
         * Comprueba si el usuario ya aceptó los términos.
         * @returns {boolean}
         */
        hasAccepted() {
            const data = _readLocal(TERMS_KEY);
            return !!(data && data.accepted);
        },

        /**
         * Registra la aceptación de los términos.
         */
        accept() {
            _writeLocal(TERMS_KEY, {
                accepted:  true,
                timestamp: _now(),
                version:   DB_VERSION,
            });
        },

        /**
         * Revoca la aceptación (para pruebas o reset).
         */
        revoke() {
            try { localStorage.removeItem(TERMS_KEY); } catch (_) {}
        },
    };

    /* ── Utilidades ──────────────────────────────────────────── */

    /**
     * Genera un identificador único simple.
     * @returns {string}
     */
    function _generateId() {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8)
        ).toUpperCase();
    }

    /* ── API Pública ─────────────────────────────────────────── */
    global.DB = Object.freeze({
        version:  DB_VERSION,
        Session,
        History,
        Stats,
        Terms,
    });

})(window);
