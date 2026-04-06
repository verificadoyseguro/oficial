<div align="center">

# Contactos Anónimos 📞

[![Licencia MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Estado](https://img.shields.io/badge/Estado-Activo-blue.svg)]()
[![Versión](https://img.shields.io/badge/Versi%C3%B3n-2.0.0-orange.svg)]()

**Plataforma web para conectar de forma anónima y segura con millones de números móviles reales.**

[Características](#características) • [Arquitectura](#arquitectura) • [Seguridad](#seguridad) • [Instalación](#instalación) • [Contribución](#contribución)

</div>

---

## 📖 Descripción General

**Contactos Anónimos** es una aplicación web de una sola página (SPA) diseñada para generar de forma aleatoria números de teléfono móviles válidos en Cuba (+53). La plataforma facilita la comunicación directa a través de enlaces integrados hacia WhatsApp y Telegram, permitiendo a los usuarios establecer contacto sin necesidad de guardar los números en sus agendas personales.

Esta versión 2.0 ha sido completamente reescrita para ofrecer una experiencia de usuario superior, un rendimiento optimizado y múltiples capas de seguridad en el lado del cliente.

## ✨ Características

- 🎲 **Generación Aleatoria:** Algoritmo optimizado para generar números únicos y válidos del formato `+53 5X XXX XXXX`.
- 💬 **Integración Directa:** Botones de acceso rápido para iniciar chats en WhatsApp y Telegram con un clic.
- 🎨 **Temas Visuales:** Interfaz moderna con modo oscuro por defecto y selector de temas dinámicos (Verde/Azul y Aleatorio).
- 📱 **Diseño Responsivo:** Experiencia fluida adaptada a cualquier dispositivo (móvil, tablet, escritorio).
- 🛡️ **Seguridad Mejorada:** Múltiples capas de protección contra inspección de código, framing y copias no autorizadas.
- 💾 **Base de Datos Local:** Sistema de caché y almacenamiento de sesión integrado (`db.js`) para mantener el historial sin comprometer la privacidad.
- ⚡ **Alto Rendimiento:** Arquitectura sin dependencias externas pesadas, carga rápida y animaciones fluidas.
- 📍 **Geobloqueo Inteligente:** Restricción de acceso a usuarios fuera de Cuba, con monitoreo continuo de ubicación.
- 🚫 **Detección de VPN/Proxy:** Bloqueo automático de acceso si se detecta el uso de VPN, proxy o Tor.
- ✅ **Permisos Obligatorios:** Solicita y verifica permisos esenciales del navegador (Geolocalización, Almacenamiento, Notificaciones) para garantizar el funcionamiento y la seguridad.

## 🏗️ Arquitectura

El proyecto ha sido reestructurado para mejorar su mantenibilidad y escalabilidad. La nueva estructura separa claramente la lógica de negocio, la interfaz de usuario y las medidas de seguridad:

```text
/
├── index.html                  # Archivo principal en la raíz
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   └── main.css        # Estilos principales con variables y animaciones
│   │   ├── img/
│   │   │   ├── favicon.svg     # Favicon optimizado (escudo azul-verde)
│   │   │   └── banner.png      # Banner profesional para GitHub
│   │   └── js/
│   │       ├── security.js     # Capa de protección del cliente
│   │       ├── geo.js          # Geolocalización y geobloqueo (NUEVO)
│   │       ├── permissions.js  # Solicitud de permisos (NUEVO)
│   │       ├── db.js           # Gestión de estado, caché y estadísticas
│   │       ├── api.js          # Lógica de generación y formateo de números
│   │       └── main.js         # Controladores de UI y eventos
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline de integración continua (CI/CD)
├── docs/
│   └── github-pages-deploy.yml # Archivo de referencia del workflow (no activo)
├── .gitignore                  # Reglas de exclusión de Git
├── CONTRIBUTING.md             # Guía para nuevos colaboradores
├── LICENSE                     # Licencia MIT
├── README.md                   # Documentación principal
└── SECURITY.md                 # Política de seguridad y reporte de vulnerabilidades
```

## 🔒 Seguridad y Privacidad

La plataforma implementa diversas medidas de seguridad en el frontend para disuadir el mal uso y proteger la integridad de la aplicación:

- **Geobloqueo Estricto:** Acceso restringido exclusivamente a usuarios ubicados en Cuba, con verificación continua de la posición geográfica.
- **Detección de VPN/Proxy:** Identificación y bloqueo automático de conexiones que utilizan servicios de anonimato para evadir restricciones geográficas.
- **Permisos Obligatorios:** Requiere y verifica permisos de Geolocalización, Almacenamiento y Notificaciones del navegador para un funcionamiento seguro y transparente.
- **Anti-Clickjacking:** Bloqueo estricto de carga en iframes (`X-Frame-Options: DENY` y scripts de validación).
- **Protección de Código:** Deshabilitación de menú contextual, atajos de DevTools (F12, Ctrl+Shift+I) y selección de texto.
- **Sanitización de Entradas:** Limpieza rigurosa de mensajes personalizados para prevenir ataques XSS.
- **Privacidad Total:** No se utilizan cookies de seguimiento ni se envían datos a servidores externos. Todo el procesamiento ocurre en el navegador del usuario.

Para más detalles, consulta nuestra [Política de Seguridad](SECURITY.md).

## 🚀 Instalación y Uso Local

El proyecto es completamente estático y no requiere de un servidor backend complejo. Puedes ejecutarlo localmente en segundos:

### Prerrequisitos
- Un navegador web moderno (Chrome, Firefox, Safari, Edge).
- Opcional: Un servidor HTTP local (como `Live Server` en VS Code o `http-server` en Node.js).

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/cuentabaneadatemp/web.git
   cd web
   ```

2. **Ejecutar la aplicación:**
   - **Opción A (Recomendada):** Usa un servidor local para evitar problemas con CORS.
     ```bash
     # Usando npx (requiere Node.js)
     npx serve .
     
     # Usando Python 3
     python3 -m http.server 8080
     ```
   - **Opción B:** Simplemente abre el archivo `index.html` (en la raíz) en tu navegador.

3. **Uso:**
   - Navega a `http://localhost:8080` (o el puerto que asigne tu servidor). El punto de entrada es `index.html` en la raíz del repositorio.
   - **Acepta los permisos obligatorios** y los términos de uso en los modales iniciales.
   - Utiliza el botón "Buscar" o "Cargar más" para generar nuevos contactos.

## 🛠️ Contribución

¡Las contribuciones son bienvenidas! Si deseas mejorar el proyecto, por favor sigue estos pasos:

1. Revisa nuestra [Guía de Contribución](CONTRIBUTING.md).
2. Haz un Fork del repositorio.
3. Crea una rama para tu nueva funcionalidad (`git checkout -b feature/nueva-idea`).
4. Haz commit de tus cambios (`git commit -m 'feat: añadir nueva idea'`).
5. Haz push a la rama (`git push origin feature/nueva-idea`).
6. Abre un Pull Request.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---
*Desarrollado con ❤️ para la comunidad.*
