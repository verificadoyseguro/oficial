/**
 * api.js — Módulo de Generación de Números
 * Contactos Anónimos v2.0
 *
 * Genera números de teléfono móvil cubanos válidos de forma
 * aleatoria, los formatea y construye los enlaces de contacto
 * para WhatsApp y Telegram.
 *
 * Formato de número cubano: +53 5X XXX XXXX
 *   - Prefijo internacional: +53
 *   - Primer dígito móvil:   5 (fijo para móviles)
 *   - Segundo dígito válido: 2–9
 *   - Seis dígitos restantes: aleatorios (0–9)
 *
 * @module API
 * @version 2.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    /**
     * Segundo dígito válido para números móviles cubanos.
     * Los números cubanos siguen el patrón: +53 5X XXX XXXX
     * donde X es uno de estos dígitos.
     */
    const VALID_SECOND_DIGITS = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9']);

    /** Código de país de Cuba (sin el signo +) */
    const COUNTRY_CODE = '53';

    /**
     * Número máximo de intentos para generar números únicos.
     * Evita bucles infinitos cuando el conjunto de usados es muy grande.
     */
    const MAX_ATTEMPTS = 50_000;

    /** Mensaje por defecto si el usuario no proporciona uno */
    const DEFAULT_MESSAGE = 'Hola, vi tu número en la red anónima. ¿Charlamos?';

    /** Longitud máxima del mensaje personalizado */
    const MAX_MESSAGE_LENGTH = 300;

    /* ── Generación de números ───────────────────────────────── */

    /**
     * Genera un número de móvil cubano crudo (sin formato ni prefijo).
     * @returns {string} 8 dígitos, ej. "52345678"
     */
    function _generateRaw() {
        const second = VALID_SECOND_DIGITS[
            Math.floor(Math.random() * VALID_SECOND_DIGITS.length)
        ];
        let rest = '';
        for (let i = 0; i < 6; i++) {
            rest += Math.floor(Math.random() * 10);
        }
        return `5${second}${rest}`;
    }

    /**
     * Formatea un número crudo al estilo internacional cubano.
     * @param {string} raw - 8 dígitos sin formato
     * @returns {string} Número formateado, ej. "+53 52 345 6789"
     */
    function formatNumber(raw) {
        if (!raw || raw.length !== 8) return raw;
        return `+${COUNTRY_CODE} ${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5)}`;
    }

    /**
     * Construye el enlace de WhatsApp para iniciar un chat.
     * Formato: https://wa.me/{countryCode}{number}?text={message}
     * @param {string} raw     - Número crudo de 8 dígitos
     * @param {string} message - Mensaje pre-rellenado
     * @returns {string} URL de WhatsApp
     */
    function _buildWhatsAppLink(raw, message) {
        const number = `${COUNTRY_CODE}${raw}`;
        const text   = encodeURIComponent(_sanitizeMessage(message || DEFAULT_MESSAGE));
        return `https://wa.me/${number}?text=${text}`;
    }

    /**
     * Construye el enlace de Telegram para iniciar un chat por número.
     *
     * CORRECCIÓN v2.0: El formato anterior usaba encodeURIComponent en el número,
     * lo que generaba URLs inválidas (ej: https://t.me/%2B5352345678).
     * El formato correcto para Telegram es: https://t.me/+{countryCode}{number}
     *
     * @param {string} raw     - Número crudo de 8 dígitos
     * @param {string} message - Mensaje pre-rellenado
     * @returns {string} URL de Telegram
     */
    function _buildTelegramLink(raw, message) {
        const number = `+${COUNTRY_CODE}${raw}`;
        const text   = encodeURIComponent(_sanitizeMessage(message || DEFAULT_MESSAGE));
        return `https://t.me/${number}?text=${text}`;
    }

    /**
     * Sanitiza el mensaje del usuario para prevenir inyecciones.
     * Elimina caracteres de control y limita la longitud.
     * @param {string} msg - Mensaje a sanitizar
     * @returns {string} Mensaje limpio, nunca vacío
     */
    function _sanitizeMessage(msg) {
        if (typeof msg !== 'string') return DEFAULT_MESSAGE;
        const sanitized = msg
            .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
            .trim()
            .slice(0, MAX_MESSAGE_LENGTH);
        return sanitized || DEFAULT_MESSAGE;
    }

    /**
     * Genera un ID único para cada entrada de número.
     * Combina timestamp, número y aleatoriedad para garantizar unicidad.
     * @param {string} raw - Número crudo
     * @returns {string} ID único en formato base36
     */
    function _generateEntryId(raw) {
        return `${Date.now().toString(36)}-${raw}-${Math.random().toString(36).slice(2, 7)}`;
    }

    /* ── API Principal ───────────────────────────────────────── */

    /**
     * Genera un lote de números de teléfono únicos no repetidos.
     *
     * @param {number}      count       - Cantidad de números a generar (máx. 50)
     * @param {Set<string>} existingSet - Conjunto de números ya generados (para evitar repetición)
     * @param {string}      [message]   - Mensaje personalizado para los enlaces de contacto
     * @returns {{ newNumbers: Array<object>, usedSet: Set<string> }}
     *
     * Cada objeto en newNumbers contiene:
     *   - id:           {string}  ID único de la entrada
     *   - raw:          {string}  Número crudo (8 dígitos)
     *   - formatted:    {string}  Número formateado (+53 5X XXX XXXX)
     *   - waLink:       {string}  Enlace de WhatsApp
     *   - telegramLink: {string}  Enlace de Telegram
     *   - generatedAt:  {number}  Timestamp de generación
     */
    function generateUniqueNumbers(count, existingSet, message) {
        const safeCount = Math.max(1, Math.min(count, 50));
        const used      = new Set(existingSet instanceof Set ? existingSet : []);
        const results   = [];
        let   attempts  = 0;
        const msg       = _sanitizeMessage(message || DEFAULT_MESSAGE);

        while (results.length < safeCount && attempts < MAX_ATTEMPTS) {
            attempts++;
            const raw = _generateRaw();

            if (used.has(raw)) continue;

            used.add(raw);
            results.push({
                id:           _generateEntryId(raw),
                raw,
                formatted:    formatNumber(raw),
                waLink:       _buildWhatsAppLink(raw, msg),
                telegramLink: _buildTelegramLink(raw, msg),
                generatedAt:  Date.now(),
            });
        }

        if (attempts >= MAX_ATTEMPTS) {
            console.warn(`[api] Se alcanzó el límite de intentos (${MAX_ATTEMPTS}). Generados: ${results.length}/${safeCount}`);
        }

        return { newNumbers: results, usedSet: used };
    }

    /**
     * Valida si una cadena es un número de móvil cubano válido.
     * @param {string} raw - Cadena a validar
     * @returns {boolean} true si es un número móvil cubano válido
     */
    function isValidCubanMobile(raw) {
        if (typeof raw !== 'string' || raw.length !== 8) return false;
        if (raw[0] !== '5') return false;
        if (!VALID_SECOND_DIGITS.includes(raw[1])) return false;
        return /^\d{8}$/.test(raw);
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.API = Object.freeze({
        generateUniqueNumbers,
        formatNumber,
        isValidCubanMobile,
        DEFAULT_MESSAGE,
        COUNTRY_CODE,
    });

})(window);
