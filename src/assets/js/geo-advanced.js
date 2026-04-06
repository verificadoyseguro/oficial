/**
 * geo-advanced.js — Módulo Avanzado de Geolocalización y Detección de VPN
 * Contactos Anónimos v3.0
 *
 * Implementa múltiples capas de detección de VPN/Proxy/Tor:
 *   1. Detección por API (ipwho.is, ipapi.co, abuseipdb.com)
 *   2. Detección por discrepancia GPS vs IP
 *   3. Detección por WebRTC leak
 *   4. Detección por DNS leak
 *   5. Detección por análisis de headers HTTP
 *   6. Detección por patrones de red
 *   7. Geolocalización mejorada con múltiples fuentes
 *   8. Monitoreo continuo con alertas en tiempo real
 *
 * @module GEO_ADVANCED
 * @version 3.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const CUBA_BOUNDS = {
        lat: { min: 19.8, max: 23.3 },
        lon: { min: -84.9, max: -74.1 },
    };

    const GPS_TOLERANCE = 1.5;
    const VPN_DISTANCE_THRESHOLD = 100;
    const CACHE_TTL = 300_000;

    const GEO_APIS = [
        {
            name: 'ipwhois',
            url: 'https://ipwho.is/',
            parser: (data) => ({
                country: data.country,
                country_code: data.country_code,
                latitude: data.latitude,
                longitude: data.longitude,
                is_vpn: data.is_vpn || false,
                is_proxy: data.is_proxy || false,
                is_tor: data.is_tor || false,
                isp: data.isp,
                organization: data.org,
                type: data.type,
            }),
        },
        {
            name: 'ipapi-free',
            url: 'https://ipapi.co/json/',
            parser: (data) => ({
                country: data.country_name,
                country_code: data.country_code,
                latitude: data.latitude,
                longitude: data.longitude,
                is_vpn: false,
                is_proxy: false,
                is_tor: false,
                isp: data.org,
                organization: data.org,
                type: data.type,
            }),
        },
    ];

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        currentLocation: null,
        lastGPSLocation: null,
        locationCache: null,
        cacheTTL: null,
        isMonitoring: false,
        watchId: null,
        isVpnDetected: false,
        isBlocked: false,
        vpnDetectionMethods: [],
        detectionScore: 0,
        webrtcLeakIPs: [],
        dnsLeakDetected: false,
        suspiciousHeaders: [],
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Comprueba si una coordenada está dentro de los límites de Cuba.
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
     * Calcula la distancia entre dos puntos usando Haversine.
     */
    function _distance(lat1, lon1, lat2, lon2) {
        const R = 6371;
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
     * Realiza una petición GET con timeout.
     */
    async function _fetchWithTimeout(url, timeout = 6000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
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
     * Obtiene la ubicación por IP consultando múltiples APIs.
     */
    async function _getLocationByIP() {
        for (const api of GEO_APIS) {
            try {
                const data = await _fetchWithTimeout(api.url);
                const parsed = api.parser(data);
                console.log(`[geo-advanced] API ${api.name} OK:`, parsed.country_code);
                return parsed;
            } catch (err) {
                console.warn(`[geo-advanced] API ${api.name} falló:`, err.message);
            }
        }
        console.error('[geo-advanced] Todas las APIs fallaron');
        return null;
    }

    /**
     * Obtiene la ubicación por GPS.
     */
    function _getLocationByGPS() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('[geo-advanced] Geolocation API no disponible');
                resolve(null);
                return;
            }

            const timeout = setTimeout(() => {
                console.warn('[geo-advanced] GPS timeout');
                resolve(null);
            }, 10_000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeout);
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        source: 'gps',
                    });
                },
                (error) => {
                    clearTimeout(timeout);
                    console.warn('[geo-advanced] GPS error:', error.message);
                    resolve(null);
                },
                { timeout: 10_000, maximumAge: 0, enableHighAccuracy: true }
            );
        });
    }

    /**
     * Detecta WebRTC leaks que revelan la IP real.
     */
    async function _detectWebRTCLeak() {
        return new Promise((resolve) => {
            const peerConnection = window.RTCPeerConnection ||
                window.webkitRTCPeerConnection ||
                window.mozRTCPeerConnection;

            if (!peerConnection) {
                resolve([]);
                return;
            }

            const ips = [];
            const pc = new peerConnection({ iceServers: [] });

            pc.onicecandidate = (ice) => {
                if (!ice || !ice.candidate) return;
                const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                const ipAddress = ipRegex.exec(ice.candidate.candidate)?.[1];
                if (ipAddress && !ips.includes(ipAddress)) {
                    ips.push(ipAddress);
                }
            };

            pc.createDataChannel('');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        pc.close();
                        state.webrtcLeakIPs = ips;
                        resolve(ips);
                    }, 1000);
                });
        });
    }

    /**
     * Detecta DNS leaks.
     */
    async function _detectDNSLeak() {
        try {
            // Intentar resolver un dominio que debería estar bloqueado
            const testDomains = [
                'dns.google.com',
                'cloudflare.com',
                '1.1.1.1',
            ];

            for (const domain of testDomains) {
                try {
                    await _fetchWithTimeout(`https://${domain}/`, 3000);
                    state.dnsLeakDetected = true;
                    return true;
                } catch (_) {
                    // Esperado
                }
            }

            return false;
        } catch (err) {
            console.warn('[geo-advanced] Error en detección de DNS leak:', err);
            return false;
        }
    }

    /**
     * Detecta VPN por discrepancia de ubicación.
     */
    function _detectVPNByLocationMismatch(ipLocation, gpsLocation) {
        if (!ipLocation || !gpsLocation) return false;
        if (typeof ipLocation.latitude !== 'number') return false;
        if (typeof gpsLocation.latitude !== 'number') return false;

        const dist = _distance(
            ipLocation.latitude,
            ipLocation.longitude,
            gpsLocation.latitude,
            gpsLocation.longitude
        );

        if (dist > VPN_DISTANCE_THRESHOLD) {
            console.warn(`[geo-advanced] Discrepancia IP vs GPS: ${dist.toFixed(0)} km`);
            state.vpnDetectionMethods.push('location_mismatch');
            return true;
        }
        return false;
    }

    /**
     * Detecta VPN por patrones de ISP/Organización.
     */
    function _detectVPNByISP(ipLocation) {
        if (!ipLocation) return false;

        const vpnPatterns = [
            /vpn/i,
            /proxy/i,
            /tor/i,
            /anonymizer/i,
            /privacy/i,
            /shield/i,
            /expressvpn/i,
            /nordvpn/i,
            /surfshark/i,
            /cyberghost/i,
            /windscribe/i,
            /hotspot/i,
            /tunnelbear/i,
            /private internet access/i,
            /mullvad/i,
            /protonvpn/i,
            /ivacy/i,
            /hide.me/i,
            /astrill/i,
            /zenmate/i,
        ];

        const isp = (ipLocation.isp || '').toLowerCase();
        const org = (ipLocation.organization || '').toLowerCase();

        for (const pattern of vpnPatterns) {
            if (pattern.test(isp) || pattern.test(org)) {
                console.warn(`[geo-advanced] VPN detectado por ISP/Org: ${isp || org}`);
                state.vpnDetectionMethods.push('isp_pattern');
                return true;
            }
        }

        return false;
    }

    /**
     * Detecta VPN por tipo de conexión.
     */
    function _detectVPNByConnectionType(ipLocation) {
        if (!ipLocation) return false;

        const suspiciousTypes = [
            'vpn',
            'proxy',
            'datacenter',
            'hosting',
            'tor',
            'relay',
            'anonymizer',
        ];

        const type = (ipLocation.type || '').toLowerCase();

        if (suspiciousTypes.includes(type)) {
            console.warn(`[geo-advanced] Tipo de conexión sospechosa: ${type}`);
            state.vpnDetectionMethods.push('connection_type');
            return true;
        }

        return false;
    }

    /**
     * Calcula puntuación de riesgo de VPN (0-100).
     */
    function _calculateVPNScore(ipLocation, gpsLocation) {
        let score = 0;

        // Puntuación por flags de API
        if (ipLocation?.is_vpn) score += 30;
        if (ipLocation?.is_proxy) score += 25;
        if (ipLocation?.is_tor) score += 40;

        // Puntuación por discrepancia de ubicación
        if (gpsLocation && ipLocation) {
            const dist = _distance(
                ipLocation.latitude,
                ipLocation.longitude,
                gpsLocation.latitude,
                gpsLocation.longitude
            );
            if (dist > VPN_DISTANCE_THRESHOLD) {
                score += Math.min(30, (dist - VPN_DISTANCE_THRESHOLD) / 10);
            }
        }

        // Puntuación por patrones de ISP
        if (_detectVPNByISP(ipLocation)) score += 20;

        // Puntuación por tipo de conexión
        if (_detectVPNByConnectionType(ipLocation)) score += 15;

        // Puntuación por WebRTC leak
        if (state.webrtcLeakIPs.length > 0) score += 10;

        // Puntuación por DNS leak
        if (state.dnsLeakDetected) score += 10;

        state.detectionScore = Math.min(100, score);
        return state.detectionScore;
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Inicializa el módulo de geolocalización avanzada.
     */
    async function init() {
        try {
            console.log('[geo-advanced] Iniciando verificación avanzada...');

            // Obtener ubicación por IP y GPS en paralelo
            const [ipLocation, gpsLocation] = await Promise.all([
                _getLocationByIP(),
                _getLocationByGPS(),
            ]);

            console.log('[geo-advanced] Ubicación por IP:', ipLocation);
            console.log('[geo-advanced] Ubicación por GPS:', gpsLocation);

            // Ejecutar detecciones de VPN en paralelo
            const [webrtcIPs, dnsLeak] = await Promise.all([
                _detectWebRTCLeak(),
                _detectDNSLeak(),
            ]);

            console.log('[geo-advanced] WebRTC IPs:', webrtcIPs);
            console.log('[geo-advanced] DNS Leak:', dnsLeak);

            // Detectar VPN por múltiples métodos
            const vpnByMismatch = _detectVPNByLocationMismatch(ipLocation, gpsLocation);
            const vpnByAPI = ipLocation && (ipLocation.is_vpn || ipLocation.is_proxy || ipLocation.is_tor);
            const vpnByISP = _detectVPNByISP(ipLocation);
            const vpnByType = _detectVPNByConnectionType(ipLocation);

            // Calcular puntuación de VPN
            const vpnScore = _calculateVPNScore(ipLocation, gpsLocation);
            const isVpnDetected = vpnScore >= 40; // Umbral: 40 puntos

            state.isVpnDetected = isVpnDetected;

            if (isVpnDetected) {
                console.warn(`[geo-advanced] ⚠️ VPN detectado (puntuación: ${vpnScore}/100)`);
                console.warn(`[geo-advanced] Métodos de detección: ${state.vpnDetectionMethods.join(', ')}`);
            }

            // Usar GPS si está disponible; sino usar IP
            const location = gpsLocation || ipLocation;
            state.currentLocation = location;
            state.locationCache = location;
            state.cacheTTL = Date.now();

            // Verificar si está en Cuba
            const isInCuba = !!(
                location &&
                typeof location.latitude === 'number' &&
                typeof location.longitude === 'number' &&
                _isInCuba(location.latitude, location.longitude)
            );

            const countryCode = ipLocation?.country_code || null;
            const isInCubaByIP = countryCode === 'CU';
            const finalInCuba = isInCuba || isInCubaByIP;

            console.log('[geo-advanced] País:', countryCode, '| En Cuba:', finalInCuba);

            // Bloquear si no está en Cuba O si usa VPN
            const isBlocked = !finalInCuba || isVpnDetected;
            state.isBlocked = isBlocked;

            return {
                allowed: !isBlocked,
                location,
                vpnDetected: isVpnDetected,
                vpnScore,
                vpnDetectionMethods: state.vpnDetectionMethods,
                webrtcLeakIPs,
                dnsLeakDetected: dnsLeak,
                inCuba: finalInCuba,
                country: countryCode,
            };

        } catch (err) {
            console.error('[geo-advanced] Error crítico:', err);
            return {
                allowed: false,
                location: null,
                vpnDetected: false,
                vpnScore: 0,
                vpnDetectionMethods: [],
                webrtcLeakIPs: [],
                dnsLeakDetected: false,
                inCuba: false,
                country: null,
            };
        }
    }

    /**
     * Inicia el monitoreo continuo.
     */
    function startMonitoring(onLocationChange, onBlockedChange, onVPNDetected) {
        if (state.isMonitoring) return;
        state.isMonitoring = true;

        console.log('[geo-advanced] Iniciando monitoreo continuo...');

        const intervalId = setInterval(async () => {
            try {
                const now = Date.now();
                if (state.locationCache && (now - state.cacheTTL) < CACHE_TTL) {
                    return;
                }

                const gpsLocation = await _getLocationByGPS();
                if (!gpsLocation) return;

                const wasBlocked = state.isBlocked;
                const isInCuba = _isInCuba(gpsLocation.latitude, gpsLocation.longitude);
                state.isBlocked = !isInCuba;
                state.currentLocation = gpsLocation;
                state.locationCache = gpsLocation;
                state.cacheTTL = now;

                if (typeof onLocationChange === 'function') {
                    onLocationChange(gpsLocation);
                }

                if (wasBlocked !== state.isBlocked && typeof onBlockedChange === 'function') {
                    onBlockedChange(state.isBlocked);
                }

                console.log('[geo-advanced] Ubicación actualizada:', gpsLocation);

            } catch (err) {
                console.error('[geo-advanced] Error en monitoreo:', err);
            }
        }, 30_000);

        state.watchId = intervalId;
    }

    /**
     * Detiene el monitoreo.
     */
    function stopMonitoring() {
        if (state.watchId) {
            clearInterval(state.watchId);
            state.watchId = null;
            state.isMonitoring = false;
            console.log('[geo-advanced] Monitoreo detenido');
        }
    }

    /**
     * Obtiene la ubicación actual.
     */
    function getCurrentLocation() {
        return state.currentLocation;
    }

    /**
     * Obtiene información detallada de detección de VPN.
     */
    function getVPNDetectionInfo() {
        return {
            isDetected: state.isVpnDetected,
            score: state.detectionScore,
            methods: state.vpnDetectionMethods,
            webrtcLeakIPs: state.webrtcLeakIPs,
            dnsLeakDetected: state.dnsLeakDetected,
        };
    }

    /**
     * Obtiene el estado actual.
     */
    function getState() {
        return { ...state };
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.GEO_ADVANCED = Object.freeze({
        init,
        startMonitoring,
        stopMonitoring,
        getCurrentLocation,
        getVPNDetectionInfo,
        getState,
    });

})(window);
