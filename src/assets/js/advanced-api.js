/**
 * advanced-api.js — API Avanzada para Modo Beta
 * Contactos Anónimos v2.0
 *
 * Proporciona funcionalidades experimentales para usuarios en modo beta:
 * - Generación avanzada de números con filtros
 * - Análisis de contactos y estadísticas
 * - Exportación de datos
 * - Gestión de temas personalizados
 *
 * @module AdvancedAPI
 * @version 2.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const OPERATORS = Object.freeze({
        etecsa: { code: '2', name: 'ETECSA', color: '#FF6B35' },
        digicel: { code: '5', name: 'Digicel', color: '#004E89' },
        viya: { code: '6', name: 'Viya', color: '#F77F00' },
    });

    const REGIONS = Object.freeze({
        havana: { code: '01', name: 'La Habana', province: 'Ciudad de La Habana' },
        santiago: { code: '02', name: 'Santiago de Cuba', province: 'Santiago de Cuba' },
        pinar: { code: '03', name: 'Pinar del Río', province: 'Pinar del Río' },
        matanzas: { code: '04', name: 'Matanzas', province: 'Matanzas' },
        villaclara: { code: '05', name: 'Villa Clara', province: 'Villa Clara' },
        camaguey: { code: '06', name: 'Camagüey', province: 'Camagüey' },
        holguín: { code: '07', name: 'Holguín', province: 'Holguín' },
        granma: { code: '08', name: 'Granma', province: 'Granma' },
        tunas: { code: '09', name: 'Las Tunas', province: 'Las Tunas' },
        ciego: { code: '10', name: 'Ciego de Ávila', province: 'Ciego de Ávila' },
    });

    const THEMES_STORAGE_KEY = '_ca_custom_themes';

    /* ── Generador Avanzado ──────────────────────────────────– */

    /**
     * Genera números con filtros específicos (operador, región).
     * @param {object} options - Opciones de filtrado
     * @param {string} [options.operator] - Operador específico ('2', '5', '6')
     * @param {string} [options.region] - Región específica
     * @param {number} [options.count] - Cantidad de números a generar
     * @returns {Array<object>} Array de números generados
     */
    function generateWithFilters(options = {}) {
        if (typeof API === 'undefined') {
            console.error('[advanced-api] API no disponible');
            return [];
        }

        const { operator, region, count = 5 } = options;
        const results = [];
        const attempts = [];
        const maxAttempts = 100;

        for (let i = 0; i < maxAttempts && results.length < count; i++) {
            const { newNumbers } = API.generateUniqueNumbers(1, new Set(attempts));

            if (newNumbers.length === 0) break;

            const raw = newNumbers[0].raw;
            attempts.push(raw);

            // Filtrar por operador
            if (operator && raw[1] !== operator) continue;

            // Filtrar por región (primer dígito después del operador)
            if (region && raw[2] !== region) continue;

            results.push(newNumbers[0]);
        }

        return results;
    }

    /**
     * Obtiene lista de operadores disponibles.
     * @returns {Array<object>} Array de operadores
     */
    function getOperators() {
        return Object.values(OPERATORS);
    }

    /**
     * Obtiene lista de regiones disponibles.
     * @returns {Array<object>} Array de regiones
     */
    function getRegions() {
        return Object.values(REGIONS);
    }

    /* ── Análisis de Contactos ───────────────────────────────– */

    /**
     * Calcula estadísticas del historial de contactos.
     * @returns {object} Objeto con estadísticas
     */
    function getContactAnalytics() {
        if (typeof DB === 'undefined') {
            console.error('[advanced-api] DB no disponible');
            return null;
        }

        const stats = DB.Stats.get();
        const history = DB.History.asSet();

        return {
            totalGenerated: stats.totalGenerated || 0,
            totalSearches: stats.totalSearches || 0,
            totalResets: stats.totalResets || 0,
            historyCount: history.size,
            firstVisit: new Date(stats.firstVisit * 1000),
            lastVisit: new Date(stats.lastVisit * 1000),
            averagePerSession: stats.totalGenerated > 0
                ? Math.round(stats.totalGenerated / (stats.totalSearches + 1))
                : 0,
        };
    }

    /**
     * Genera un reporte detallado de uso.
     * @returns {object} Reporte de uso
     */
    function generateUsageReport() {
        const analytics = getContactAnalytics();
        if (!analytics) return null;

        const now = new Date();
        const firstVisit = analytics.firstVisit;
        const daysActive = Math.ceil((now - firstVisit) / (1000 * 60 * 60 * 24));

        return {
            ...analytics,
            daysActive,
            generatedPerDay: daysActive > 0
                ? Math.round(analytics.totalGenerated / daysActive)
                : 0,
            reportGeneratedAt: now,
        };
    }

    /* ── Exportación de Datos ────────────────────────────────– */

    /**
     * Exporta el historial de contactos como CSV.
     * @returns {string} Contenido CSV
     */
    function exportHistoryAsCSV() {
        if (typeof DB === 'undefined') {
            console.error('[advanced-api] DB no disponible');
            return '';
        }

        const history = DB.History.asSet();
        const rows = ['Número Móvil,Formato Internacional,Generado'];

        history.forEach((raw) => {
            const formatted = typeof API !== 'undefined'
                ? API.formatNumber(raw)
                : `+53 ${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5)}`;
            rows.push(`${raw},"${formatted}",${new Date().toISOString()}`);
        });

        return rows.join('\n');
    }

    /**
     * Exporta el historial de contactos como JSON.
     * @returns {string} Contenido JSON
     */
    function exportHistoryAsJSON() {
        if (typeof DB === 'undefined') {
            console.error('[advanced-api] DB no disponible');
            return '{}';
        }

        const history = DB.History.asSet();
        const data = {
            exportedAt: new Date().toISOString(),
            totalNumbers: history.size,
            numbers: Array.from(history).map((raw) => ({
                raw,
                formatted: typeof API !== 'undefined'
                    ? API.formatNumber(raw)
                    : `+53 ${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5)}`,
            })),
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Descarga datos como archivo.
     * @param {string} content - Contenido del archivo
     * @param {string} filename - Nombre del archivo
     * @param {string} mimeType - Tipo MIME
     */
    function downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /* ── Temas Personalizados ────────────────────────────────– */

    /**
     * Crea un tema personalizado.
     * @param {object} theme - Configuración del tema
     * @returns {object} Tema creado con ID
     */
    function createCustomTheme(theme) {
        const themes = _loadCustomThemes();
        const id = `custom-${Date.now()}`;

        const customTheme = {
            id,
            name: theme.name || 'Custom Theme',
            description: theme.description || '',
            colors: {
                primary: theme.primary || '#25D366',
                secondary: theme.secondary || '#26A5E4',
                accent: theme.accent || '#FF6B35',
                background: theme.background || '#03060c',
                foreground: theme.foreground || '#FFFFFF',
            },
            createdAt: new Date().toISOString(),
        };

        themes[id] = customTheme;
        _saveCustomThemes(themes);

        return customTheme;
    }

    /**
     * Obtiene todos los temas personalizados.
     * @returns {Array<object>} Array de temas
     */
    function getCustomThemes() {
        const themes = _loadCustomThemes();
        return Object.values(themes);
    }

    /**
     * Aplica un tema personalizado.
     * @param {string} themeId - ID del tema
     * @returns {boolean} true si fue aplicado exitosamente
     */
    function applyCustomTheme(themeId) {
        const themes = _loadCustomThemes();
        const theme = themes[themeId];

        if (!theme) {
            console.warn(`[advanced-api] Tema no encontrado: ${themeId}`);
            return false;
        }

        const root = document.documentElement;
        root.style.setProperty('--primary-wa', theme.colors.primary);
        root.style.setProperty('--primary-tg', theme.colors.secondary);
        root.style.setProperty('--accent-color', theme.colors.accent);
        root.style.setProperty('--theme-bg', theme.colors.background);
        root.style.setProperty('--theme-fg', theme.colors.foreground);

        document.body.style.background = `radial-gradient(ellipse at 30% 10%, ${theme.colors.background}, ${theme.colors.foreground})`;

        return true;
    }

    /**
     * Elimina un tema personalizado.
     * @param {string} themeId - ID del tema
     * @returns {boolean} true si fue eliminado exitosamente
     */
    function deleteCustomTheme(themeId) {
        const themes = _loadCustomThemes();

        if (!themes[themeId]) {
            console.warn(`[advanced-api] Tema no encontrado: ${themeId}`);
            return false;
        }

        delete themes[themeId];
        _saveCustomThemes(themes);

        return true;
    }

    /* ── Funciones Privadas ──────────────────────────────────– */

    /**
     * Carga temas personalizados del almacenamiento local.
     * @returns {object} Mapa de temas
     */
    function _loadCustomThemes() {
        try {
            const stored = localStorage.getItem(THEMES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (_) {
            return {};
        }
    }

    /**
     * Persiste temas personalizados en almacenamiento local.
     * @param {object} themes - Mapa de temas
     */
    function _saveCustomThemes(themes) {
        try {
            localStorage.setItem(THEMES_STORAGE_KEY, JSON.stringify(themes));
        } catch (_) {
            /* Cuota excedida u otro error — ignorar silenciosamente */
        }
    }

    /* ── Exportación ─────────────────────────────────────────– */

    global.AdvancedAPI = Object.freeze({
        // Generador avanzado
        generateWithFilters,
        getOperators,
        getRegions,

        // Análisis
        getContactAnalytics,
        generateUsageReport,

        // Exportación
        exportHistoryAsCSV,
        exportHistoryAsJSON,
        downloadFile,

        // Temas personalizados
        createCustomTheme,
        getCustomThemes,
        applyCustomTheme,
        deleteCustomTheme,
    });

})(window);
