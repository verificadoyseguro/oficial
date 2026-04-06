/**
 * security-advanced.js — Módulo Integrado de Seguridad Avanzada
 * Contactos Anónimos v3.0
 *
 * Integra:
 *   1. Geolocalización avanzada (geo-advanced.js)
 *   2. Permisos avanzados (permissions-advanced.js)
 *   3. Monitoreo de seguridad en tiempo real
 *   4. Alertas de anomalías
 *   5. Reportes de seguridad
 *   6. Bloqueo automático de amenazas
 *
 * @module SECURITY_ADVANCED
 * @version 3.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const SECURITY_LOG_KEY = '_ca_security_log_v3';
    const SECURITY_ALERTS_KEY = '_ca_security_alerts_v3';
    const MAX_LOG_ENTRIES = 1000;
    const ALERT_TTL = 3600_000; // 1 hora

    const THREAT_LEVELS = {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
        INFO: 'info',
    };

    /* ── Estado interno ──────────────────────────────────────── */
    const state = {
        securityLog: [],
        activeAlerts: [],
        isMonitoring: false,
        monitoringIntervalId: null,
        lastSecurityCheck: null,
        threatLevel: THREAT_LEVELS.INFO,
        isBlocked: false,
    };

    /* ── Utilidades privadas ─────────────────────────────────── */

    /**
     * Registra un evento de seguridad.
     */
    function _logSecurityEvent(event) {
        const logEntry = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            type: event.type,
            level: event.level || THREAT_LEVELS.INFO,
            message: event.message,
            details: event.details || {},
            source: event.source || 'unknown',
        };

        state.securityLog.push(logEntry);

        // Mantener tamaño máximo del log
        if (state.securityLog.length > MAX_LOG_ENTRIES) {
            state.securityLog.shift();
        }

        // Guardar en localStorage
        try {
            localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(state.securityLog));
        } catch (_) {
            /* Ignorar errores de almacenamiento */
        }

        console.log(`[security-advanced] [${logEntry.level}] ${logEntry.message}`, logEntry.details);
    }

    /**
     * Crea una alerta de seguridad.
     */
    function _createAlert(alert) {
        const alertEntry = {
            id: `alert_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            type: alert.type,
            level: alert.level || THREAT_LEVELS.MEDIUM,
            title: alert.title,
            message: alert.message,
            action: alert.action || null,
            dismissed: false,
        };

        state.activeAlerts.push(alertEntry);

        // Guardar en localStorage
        try {
            localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(state.activeAlerts));
        } catch (_) {
            /* Ignorar */
        }

        // Disparar evento
        const event = new CustomEvent('securityalert', {
            detail: alertEntry,
        });
        window.dispatchEvent(event);

        return alertEntry;
    }

    /**
     * Limpia alertas expiradas.
     */
    function _cleanupExpiredAlerts() {
        const now = Date.now();
        state.activeAlerts = state.activeAlerts.filter((alert) => {
            return (now - alert.timestamp) < ALERT_TTL;
        });

        try {
            localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(state.activeAlerts));
        } catch (_) {
            /* Ignorar */
        }
    }

    /**
     * Determina el nivel de amenaza.
     */
    function _calculateThreatLevel(geoResult, permissionsResult) {
        let level = THREAT_LEVELS.INFO;
        let score = 0;

        // Análisis de geolocalización
        if (!geoResult.allowed) {
            score += 50;
            level = THREAT_LEVELS.CRITICAL;
        }

        if (geoResult.vpnDetected) {
            score += 30;
            if (level === THREAT_LEVELS.INFO) level = THREAT_LEVELS.HIGH;
        }

        if (geoResult.vpnScore && geoResult.vpnScore >= 70) {
            score += 20;
            if (level === THREAT_LEVELS.INFO) level = THREAT_LEVELS.HIGH;
        }

        // Análisis de permisos
        if (!permissionsResult.allApproved) {
            score += 15;
            if (level === THREAT_LEVELS.INFO) level = THREAT_LEVELS.MEDIUM;
        }

        if (!permissionsResult.geolocation) {
            score += 10;
        }

        if (!permissionsResult.storage) {
            score += 10;
        }

        // Análisis de WebRTC leak
        if (geoResult.webrtcLeakIPs && geoResult.webrtcLeakIPs.length > 0) {
            score += 25;
            if (level === THREAT_LEVELS.INFO || level === THREAT_LEVELS.LOW) {
                level = THREAT_LEVELS.MEDIUM;
            }
        }

        // Análisis de DNS leak
        if (geoResult.dnsLeakDetected) {
            score += 20;
            if (level === THREAT_LEVELS.INFO || level === THREAT_LEVELS.LOW) {
                level = THREAT_LEVELS.MEDIUM;
            }
        }

        state.threatLevel = level;
        return { level, score };
    }

    /**
     * Realiza una verificación de seguridad completa.
     */
    async function _performSecurityCheck() {
        try {
            console.log('[security-advanced] Realizando verificación de seguridad...');

            // Verificar geolocalización
            const geoResult = await GEO_ADVANCED.init();

            // Verificar permisos
            const permissionsResult = await PERMISSIONS_ADVANCED.requestMandatoryPermissions();

            // Calcular nivel de amenaza
            const threatAnalysis = _calculateThreatLevel(geoResult, permissionsResult);

            // Registrar eventos
            if (!geoResult.allowed) {
                _logSecurityEvent({
                    type: 'geo_blocked',
                    level: THREAT_LEVELS.CRITICAL,
                    message: 'Acceso bloqueado: ubicación fuera de Cuba o VPN detectado',
                    details: {
                        country: geoResult.country,
                        vpnDetected: geoResult.vpnDetected,
                        vpnScore: geoResult.vpnScore,
                        inCuba: geoResult.inCuba,
                    },
                    source: 'geolocation',
                });

                _createAlert({
                    type: 'access_denied',
                    level: THREAT_LEVELS.CRITICAL,
                    title: 'Acceso Denegado',
                    message: 'Tu ubicación no está autorizada para acceder a esta plataforma.',
                    action: 'contact_support',
                });

                state.isBlocked = true;
            }

            if (geoResult.vpnDetected) {
                _logSecurityEvent({
                    type: 'vpn_detected',
                    level: THREAT_LEVELS.HIGH,
                    message: `VPN detectado (puntuación: ${geoResult.vpnScore}/100)`,
                    details: {
                        vpnScore: geoResult.vpnScore,
                        detectionMethods: geoResult.vpnDetectionMethods,
                        webrtcLeakIPs: geoResult.webrtcLeakIPs,
                        dnsLeakDetected: geoResult.dnsLeakDetected,
                    },
                    source: 'vpn_detection',
                });

                _createAlert({
                    type: 'vpn_detected',
                    level: THREAT_LEVELS.HIGH,
                    title: 'VPN Detectado',
                    message: `Se detectó actividad de VPN/Proxy (puntuación: ${geoResult.vpnScore}/100)`,
                    action: 'disable_vpn',
                });
            }

            if (!permissionsResult.allApproved) {
                _logSecurityEvent({
                    type: 'permissions_incomplete',
                    level: THREAT_LEVELS.MEDIUM,
                    message: 'No todos los permisos obligatorios fueron concedidos',
                    details: permissionsResult,
                    source: 'permissions',
                });

                _createAlert({
                    type: 'permissions_required',
                    level: THREAT_LEVELS.MEDIUM,
                    title: 'Permisos Requeridos',
                    message: 'Algunos permisos obligatorios no fueron concedidos. La funcionalidad puede ser limitada.',
                    action: 'grant_permissions',
                });
            }

            if (geoResult.webrtcLeakIPs && geoResult.webrtcLeakIPs.length > 0) {
                _logSecurityEvent({
                    type: 'webrtc_leak_detected',
                    level: THREAT_LEVELS.MEDIUM,
                    message: `WebRTC leak detectado: ${geoResult.webrtcLeakIPs.join(', ')}`,
                    details: { ips: geoResult.webrtcLeakIPs },
                    source: 'webrtc_detection',
                });
            }

            if (geoResult.dnsLeakDetected) {
                _logSecurityEvent({
                    type: 'dns_leak_detected',
                    level: THREAT_LEVELS.MEDIUM,
                    message: 'DNS leak detectado',
                    details: { dnsLeakDetected: true },
                    source: 'dns_detection',
                });
            }

            state.lastSecurityCheck = {
                timestamp: Date.now(),
                geoResult,
                permissionsResult,
                threatAnalysis,
            };

            console.log('[security-advanced] Verificación completada:', {
                threatLevel: threatAnalysis.level,
                threatScore: threatAnalysis.score,
                isBlocked: state.isBlocked,
            });

            return {
                allowed: !state.isBlocked,
                threatLevel: threatAnalysis.level,
                threatScore: threatAnalysis.score,
                geoResult,
                permissionsResult,
            };

        } catch (err) {
            console.error('[security-advanced] Error en verificación:', err);

            _logSecurityEvent({
                type: 'security_check_error',
                level: THREAT_LEVELS.HIGH,
                message: 'Error durante la verificación de seguridad',
                details: { error: err.message },
                source: 'security_check',
            });

            return {
                allowed: false,
                threatLevel: THREAT_LEVELS.HIGH,
                threatScore: 0,
                error: err.message,
            };
        }
    }

    /* ── API Pública ─────────────────────────────────────────── */

    /**
     * Inicializa el módulo de seguridad.
     */
    async function init() {
        console.log('[security-advanced] Inicializando módulo de seguridad...');

        // Cargar log y alertas del localStorage
        try {
            const savedLog = localStorage.getItem(SECURITY_LOG_KEY);
            if (savedLog) {
                state.securityLog = JSON.parse(savedLog);
            }

            const savedAlerts = localStorage.getItem(SECURITY_ALERTS_KEY);
            if (savedAlerts) {
                state.activeAlerts = JSON.parse(savedAlerts);
            }
        } catch (_) {
            /* Ignorar errores */
        }

        // Realizar verificación inicial
        return await _performSecurityCheck();
    }

    /**
     * Inicia el monitoreo continuo de seguridad.
     */
    function startMonitoring(interval = 300_000) {
        if (state.isMonitoring) return;
        state.isMonitoring = true;

        console.log(`[security-advanced] Iniciando monitoreo continuo (intervalo: ${interval}ms)...`);

        state.monitoringIntervalId = setInterval(async () => {
            try {
                await _performSecurityCheck();
            } catch (err) {
                console.error('[security-advanced] Error en ciclo de monitoreo:', err);
            }
        }, interval);
    }

    /**
     * Detiene el monitoreo.
     */
    function stopMonitoring() {
        if (state.monitoringIntervalId) {
            clearInterval(state.monitoringIntervalId);
            state.monitoringIntervalId = null;
            state.isMonitoring = false;
            console.log('[security-advanced] Monitoreo detenido');
        }
    }

    /**
     * Obtiene el estado de seguridad actual.
     */
    function getSecurityStatus() {
        _cleanupExpiredAlerts();

        return {
            isBlocked: state.isBlocked,
            threatLevel: state.threatLevel,
            lastCheck: state.lastSecurityCheck,
            activeAlerts: state.activeAlerts,
            alertCount: state.activeAlerts.length,
            logEntries: state.securityLog.length,
        };
    }

    /**
     * Obtiene el log de seguridad.
     */
    function getSecurityLog(limit = 100) {
        return state.securityLog.slice(-limit).reverse();
    }

    /**
     * Obtiene las alertas activas.
     */
    function getActiveAlerts() {
        _cleanupExpiredAlerts();
        return [...state.activeAlerts];
    }

    /**
     * Descarta una alerta.
     */
    function dismissAlert(alertId) {
        const alert = state.activeAlerts.find((a) => a.id === alertId);
        if (alert) {
            alert.dismissed = true;
            try {
                localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(state.activeAlerts));
            } catch (_) {
                /* Ignorar */
            }
        }
    }

    /**
     * Obtiene información detallada de seguridad.
     */
    function getDetailedSecurityInfo() {
        return {
            status: getSecurityStatus(),
            alerts: getActiveAlerts(),
            log: getSecurityLog(50),
            geoInfo: state.lastSecurityCheck?.geoResult || null,
            permissionsInfo: state.lastSecurityCheck?.permissionsResult || null,
        };
    }

    /**
     * Limpia el log de seguridad.
     */
    function clearSecurityLog() {
        state.securityLog = [];
        try {
            localStorage.removeItem(SECURITY_LOG_KEY);
        } catch (_) {
            /* Ignorar */
        }
    }

    /**
     * Limpia las alertas.
     */
    function clearAlerts() {
        state.activeAlerts = [];
        try {
            localStorage.removeItem(SECURITY_ALERTS_KEY);
        } catch (_) {
            /* Ignorar */
        }
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.SECURITY_ADVANCED = Object.freeze({
        init,
        startMonitoring,
        stopMonitoring,
        getSecurityStatus,
        getSecurityLog,
        getActiveAlerts,
        dismissAlert,
        getDetailedSecurityInfo,
        clearSecurityLog,
        clearAlerts,
        THREAT_LEVELS,
    });

})(window);
