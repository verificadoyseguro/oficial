/**
 * geo.js — Módulo de Geolocalización y Geobloqueo
 * Contactos Anónimos v2.0
 *
 * Implementa:
 *   1. Geolocalización por IP (APIs externas: ipwho.is, ipapi.co)
 *   2. Detección de VPN/Proxy por API y por discrepancia GPS vs IP
 *   3. Geobloqueo para Cuba (restricción de acceso)
 *   4. Monitoreo continuo de ubicación con Geolocation API del navegador
 *   5. Caché local de ubicación para optimizar requests (TTL: 5 min)
 *
 * Dependencias externas:
 *   - https://ipwho.is/  (API primaria de geolocalización por IP)
 *   - https://ipapi.co/json/ (API de respaldo)
 *
 * IMPORTANTE: La CSP del documento debe incluir:
 *   connect-src 'self' https://ipwho.is https://ipapi.co;
 *
 * @module GEO
 * @version 2.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    /**
     * Límites geográficos de Cuba.
     * Cuba se extiende aproximadamente:
     *   - Latitud:  19.8°N (extremo sur, Cabo Cruz) a 23.2°N (extremo norte, Punta Hicacos)
     *   - Longitud: 84.9°O (extremo oeste, Cabo San Antonio) a 74.1°O (extremo este, Punta de Maisí)
     *
     * CORRECCIÓN v2.0: El rango de latitud fue corregido de (19.8–20.4) a (19.8–23.3)
     * para incluir todo el territorio cubano. La Habana (~23.1°N) estaba excluida
     * con los límites anteriores.
     */
    const CUBA_BOUNDS = {
        lat: { min: 19.8, max: 23.3 },
        lon: { min: -84.9, max: -74.1 },
    };

    /** Margen de tolerancia en grados para geolocalización por GPS (≈ 167 km) */
    const GPS_TOLERANCE = 1.5;

    /**
     * APIs de geolocalización por IP (gratuitas con límites de uso).
     * Se intentan en orden; si la primera falla, se usa la segunda.
     */
    const GEO_APIS = [
        {
            name:   'ipwhois',
            url:    'https://ipwho.is/',
            parser: (data) => ({
                country:      data.country,
                country_code: data.country_code,
                latitude:     data.latitude,
                longitude:    data.longitude,
                is_vpn:       data.is_vpn   || false,
                is_proxy:     data.is_proxy || false,
                is_tor:       data.is_tor   || false,
            }),
        },
        {
            name:   'ipapi-free',
            url:    'https://ipapi.co/json/',
            parser: (data) => ({
                country:      data.country_name,
                country_code: data.country_code,
                latitude:     data.latitude,
                longitude:    data.longitude,
                is_vpn:       false,
                is_proxy:     false,
                is_tor:       false,
            }),
        },
    ];

    /** Duración del caché de ubicación en milisegundos (5 minutos) */
    const CACHE_TTL = 300_000;

    /** Distancia máxima en km entre IP y GPS para considerar VPN */
    const VPN_DISTANCE_THRESHOLD = 100;

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        currentLocation: null,
        lastGPSLocation: null,
        locationCache:   null,
        cacheTTL:        null,
        isMonitoring:    false,
        watchId:         null,
        isVpnDetected:   false,
        isBlocked:       false,
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Comprueba si una coordenada está dentro de los límites de Cuba.
     * @param {number} lat - Latitud en grados decimales
     * @param {number} lon - Longitud en grados decimales
     * @returns {boolean} true si la coordenada está en Cuba
     */
    function _isInCuba(lat, lon) {
        return (
            lat >= CUBA_BOUNDS.lat.min &&
            lat <= CUBA_BOUNDS.lat.max &&
            lon >= CUBA_BOUNDS.lon.min &&
            lon <= CUBA_BOUNDS.lon.max
        );
    }

    /**
     * Calcula la distancia aproximada entre dos puntos geográficos
     * usando la fórmula de Haversine.
     * @param {number} lat1 - Latitud del punto 1
     * @param {number} lon1 - Longitud del punto 1
     * @param {number} lat2 - Latitud del punto 2
     * @param {number} lon2 - Longitud del punto 2
     * @returns {number} Distancia en kilómetros
     */
    function _distance(lat1, lon1, lat2, lon2) {
        const R    = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Realiza una petición GET con timeout configurable.
     * @param {string} url     - URL a consultar
     * @param {number} timeout - Tiempo máximo en ms (por defecto 6000)
     * @returns {Promise<object>} Datos JSON de la respuesta
     * @throws {Error} Si la petición falla o supera el timeout
     */
    async function _fetchWithTimeout(url, timeout = 6000) {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal:  controller.signal,
                headers: { 'Accept': 'application/json' },
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    /**
     * Obtiene la ubicación del usuario por IP consultando APIs externas.
     * Intenta con la API primaria; si falla, usa la de respaldo.
     * @returns {Promise<object|null>} Datos de ubicación o null si todas las APIs fallan
     */
    async function _getLocationByIP() {
        for (const api of GEO_APIS) {
            try {
                const data = await _fetchWithTimeout(api.url);
                const parsed = api.parser(data);
                console.log(`[geo] API ${api.name} OK:`, parsed.country_code);
                return parsed;
            } catch (err) {
                console.warn(`[geo] API ${api.name} falló:`, err.message);
            }
        }
        console.error('[geo] Todas las APIs de geolocalización fallaron');
        return null;
    }

    /**
     * Obtiene la ubicación del navegador usando la Geolocation API.
     * Resuelve con null si no está disponible o el usuario la rechaza.
     * @returns {Promise<object|null>} Coordenadas GPS o null
     */
    function _getLocationByGPS() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('[geo] Geolocation API no disponible en este navegador');
                resolve(null);
                return;
            }

            const timeout = setTimeout(() => {
                console.warn('[geo] GPS: timeout alcanzado');
                resolve(null);
            }, 10_000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeout);
                    resolve({
                        latitude:  position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy:  position.coords.accuracy,
                        source:    'gps',
                    });
                },
                (error) => {
                    clearTimeout(timeout);
                    console.warn('[geo] GPS error:', error.message);
                    resolve(null);
                },
                { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false }
            );
        });
    }

    /**
     * Detecta posible VPN comparando la distancia entre la ubicación
     * por IP y la ubicación por GPS. Una discrepancia > 100 km sugiere VPN.
     * @param {object|null} ipLocation  - Ubicación por IP
     * @param {object|null} gpsLocation - Ubicación por GPS
     * @returns {boolean} true si hay discrepancia sospechosa de VPN
     */
    function _detectVPNByLocationMismatch(ipLocation, gpsLocation) {
        if (!ipLocation || !gpsLocation) return false;
        if (typeof ipLocation.latitude  !== 'number') return false;
        if (typeof gpsLocation.latitude !== 'number') return false;

        const dist = _distance(
            ipLocation.latitude,
            ipLocation.longitude,
            gpsLocation.latitude,
            gpsLocation.longitude
        );

        if (dist > VPN_DISTANCE_THRESHOLD) {
            console.warn(`[geo] Discrepancia IP vs GPS: ${dist.toFixed(0)} km (umbral: ${VPN_DISTANCE_THRESHOLD} km)`);
            return true;
        }
        return false;
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Inicializa el módulo de geolocalización.
     *
     * Flujo:
     *   1. Obtiene ubicación por IP (con fallback entre APIs)
     *   2. Obtiene ubicación por GPS (si está disponible)
     *   3. Detecta VPN por discrepancia o por flags de la API
     *   4. Verifica si el usuario está en Cuba
     *   5. Retorna el resultado de acceso
     *
     * @returns {Promise<{allowed: boolean, location: object|null, vpnDetected: boolean, inCuba: boolean, country: string|null}>}
     */
    async function init() {
        try {
            console.log('[geo] Iniciando verificación de geolocalización...');

            // Obtener ubicación por IP y GPS en paralelo para mayor velocidad
            const [ipLocation, gpsLocation] = await Promise.all([
                _getLocationByIP(),
                _getLocationByGPS(),
            ]);

            console.log('[geo] Ubicación por IP:', ipLocation);
            console.log('[geo] Ubicación por GPS:', gpsLocation);

            // Detectar VPN
            const vpnByMismatch = _detectVPNByLocationMismatch(ipLocation, gpsLocation);
            const vpnByAPI      = ipLocation && (ipLocation.is_vpn || ipLocation.is_proxy || ipLocation.is_tor);
            const isVpnDetected = vpnByMismatch || !!vpnByAPI;
            state.isVpnDetected = isVpnDetected;

            if (isVpnDetected) {
                console.warn('[geo] ⚠️ VPN/Proxy/Tor detectado');
            }

            // Usar GPS si está disponible y es más preciso; sino usar IP
            const location = gpsLocation || ipLocation;
            state.currentLocation = location;
            state.locationCache   = location;
            state.cacheTTL        = Date.now();

            // Verificar si está en Cuba
            const isInCuba = !!(
                location &&
                typeof location.latitude  === 'number' &&
                typeof location.longitude === 'number' &&
                _isInCuba(location.latitude, location.longitude)
            );

            // También verificar por código de país como respaldo
            const countryCode   = ipLocation?.country_code || null;
            const isInCubaByIP  = countryCode === 'CU';

            // Se considera en Cuba si las coordenadas lo indican O si el código de país es CU
            const finalInCuba = isInCuba || isInCubaByIP;

            console.log('[geo] País:', countryCode, '| En Cuba (coords):', isInCuba, '| En Cuba (IP):', isInCubaByIP);

            // Bloquear si no está en Cuba O si usa VPN
            const isBlocked  = !finalInCuba || isVpnDetected;
            state.isBlocked  = isBlocked;

            return {
                allowed:     !isBlocked,
                location,
                vpnDetected: isVpnDetected,
                inCuba:      finalInCuba,
                country:     countryCode,
            };

        } catch (err) {
            console.error('[geo] Error crítico en inicialización:', err);
            // En caso de error, denegar acceso por seguridad
            return {
                allowed:     false,
                location:    null,
                vpnDetected: false,
                inCuba:      false,
                country:     null,
            };
        }
    }

    /**
     * Inicia el monitoreo continuo de ubicación mediante GPS.
     * Verifica cada 30 segundos si el usuario sigue en Cuba.
     * Respeta el caché de 5 minutos para no saturar la API de GPS.
     *
     * @param {Function} onLocationChange - Callback(location) cuando cambia la ubicación
     * @param {Function} onBlockedChange  - Callback(isBlocked) cuando cambia el estado de bloqueo
     */
    function startMonitoring(onLocationChange, onBlockedChange) {
        if (state.isMonitoring) return;
        state.isMonitoring = true;

        console.log('[geo] Iniciando monitoreo continuo de ubicación (intervalo: 30s)...');

        const intervalId = setInterval(async () => {
            try {
                // Respetar caché para no saturar el GPS
                const now = Date.now();
                if (state.locationCache && (now - state.cacheTTL) < CACHE_TTL) {
                    return;
                }

                const gpsLocation = await _getLocationByGPS();
                if (!gpsLocation) return;

                const wasBlocked = state.isBlocked;
                const isInCuba   = _isInCuba(gpsLocation.latitude, gpsLocation.longitude);
                state.isBlocked       = !isInCuba;
                state.currentLocation = gpsLocation;
                state.locationCache   = gpsLocation;
                state.cacheTTL        = now;

                if (typeof onLocationChange === 'function') {
                    onLocationChange(gpsLocation);
                }

                if (wasBlocked !== state.isBlocked && typeof onBlockedChange === 'function') {
                    onBlockedChange(state.isBlocked);
                }

                console.log('[geo] Ubicación actualizada por monitoreo:', gpsLocation);

            } catch (err) {
                console.error('[geo] Error en ciclo de monitoreo:', err);
            }
        }, 30_000);

        state.watchId = intervalId;
    }

    /**
     * Detiene el monitoreo continuo de ubicación.
     */
    function stopMonitoring() {
        if (state.watchId) {
            clearInterval(state.watchId);
            state.watchId      = null;
            state.isMonitoring = false;
            console.log('[geo] Monitoreo detenido');
        }
    }

    /**
     * Retorna la ubicación actual almacenada en caché.
     * @returns {object|null} Objeto de ubicación o null si no hay datos
     */
    function getCurrentLocation() {
        return state.currentLocation;
    }

    /**
     * Indica si el usuario está actualmente bloqueado.
     * @returns {boolean}
     */
    function isBlocked() {
        return state.isBlocked;
    }

    /**
     * Indica si se detectó uso de VPN, proxy o Tor.
     * @returns {boolean}
     */
    function isVpnDetected() {
        return state.isVpnDetected;
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.GEO = Object.freeze({
        init,
        startMonitoring,
        stopMonitoring,
        getCurrentLocation,
        isBlocked,
        isVpnDetected,
    });

})(window);
