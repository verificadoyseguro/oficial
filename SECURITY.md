# Política de Seguridad — Contactos Anónimos

## Versiones Soportadas

La siguiente tabla indica qué versiones del proyecto reciben actualizaciones de seguridad activamente:

| Versión | Soporte de Seguridad |
|---------|----------------------|
| 2.x     | ✅ Activo             |
| 1.x     | ❌ Sin soporte        |

---

## Reporte de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad en este proyecto, te pedimos que **no la divulgues públicamente** hasta que haya sido evaluada y corregida.

### Cómo reportar

1. **Abre un Issue privado** en este repositorio usando la opción "Security Advisory" de GitHub.
2. Incluye en tu reporte:
   - Descripción detallada de la vulnerabilidad.
   - Pasos para reproducirla.
   - Impacto potencial estimado.
   - Sugerencia de corrección (opcional pero bienvenida).

### Tiempo de respuesta

Nos comprometemos a:

| Acción                          | Plazo estimado |
|---------------------------------|----------------|
| Confirmación de recepción       | 48 horas       |
| Evaluación inicial              | 5 días hábiles |
| Corrección y publicación de fix | 14 días hábiles|

---

## Medidas de Seguridad Implementadas

### Lado del Cliente (Frontend)

| Medida                              | Descripción                                                                 |
|-------------------------------------|-----------------------------------------------------------------------------|
| **Geobloqueo Estricto**             | Restricción de acceso a usuarios fuera de Cuba, con monitoreo continuo.     |
| **Detección de VPN/Proxy**          | Identificación y bloqueo automático de conexiones anónimas (VPN, proxy, Tor).|
| **Permisos Obligatorios**           | Solicitud y verificación de permisos de Geolocalización, Almacenamiento y Notificaciones. |
| Anti-Framing (Clickjacking)         | Detección y bloqueo de carga dentro de `<iframe>` de terceros.              |
| Content Security Policy (CSP)       | Restricción de fuentes de scripts, estilos e imágenes mediante meta tag.    |
| X-Frame-Options                     | Cabecera `DENY` para prevenir embedding no autorizado.                      |
| Bloqueo de DevTools                 | Prevención de atajos de teclado de inspección (F12, Ctrl+Shift+I, etc.).    |
| Protección de selección de texto    | Deshabilitación de selección de contenido fuera de inputs.                  |
| Protección de arrastre de medios    | Prevención de drag & drop de imágenes y SVGs.                               |
| Rate-limiting de clics              | Limitación de frecuencia de clics en botones de contacto.                   |
| Prevención de impresión             | Bloqueo de la función de impresión del navegador.                           |
| Detección básica de bots            | Verificación de `navigator.webdriver` y otras señales de automatización.    |
| Trampa de consola                   | Mensaje de advertencia en la consola del navegador.                         |
| Sanitización de entradas            | Limpieza de mensajes personalizados para prevenir XSS.                      |
| Escape de HTML                      | Escape de todos los datos antes de insertarlos en el DOM.                   |

### Almacenamiento de Datos

- No se utilizan cookies de seguimiento.
- Los datos de sesión se almacenan únicamente en `sessionStorage` del dispositivo del usuario.
- La aceptación de términos se persiste en `localStorage` sin datos personales.
- No se envía ningún dato a servidores externos.

---

## Limitaciones Conocidas

La seguridad del lado del cliente es una capa de **disuasión**, no una garantía absoluta. Un usuario técnicamente avanzado puede eludir las protecciones del navegador. Para una seguridad robusta, se recomienda implementar las siguientes medidas en el servidor cuando se migre a una arquitectura con backend:

- Configurar cabeceras HTTP de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`).
- Implementar autenticación y autorización en la API.
- Aplicar rate-limiting en el servidor.
- Usar HTTPS con certificados válidos.
- Implementar logging y monitoreo de accesos.

---

## Créditos

Agradecemos a todos los investigadores de seguridad que reportan vulnerabilidades de forma responsable.
