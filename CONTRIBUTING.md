# Guía de Contribución — Contactos Anónimos

¡Gracias por tu interés en contribuir a este proyecto! Esta guía explica cómo participar de forma efectiva.

---

## Código de Conducta

Al contribuir, te comprometes a mantener un ambiente respetuoso y colaborativo. Se espera que todos los participantes:

- Usen un lenguaje inclusivo y respetuoso.
- Acepten críticas constructivas con profesionalismo.
- Se enfoquen en lo que es mejor para la comunidad y el proyecto.

---

## Cómo Contribuir

### 1. Reportar un Bug

Si encuentras un error, abre un **Issue** en GitHub con:

- Título claro y descriptivo.
- Pasos para reproducir el problema.
- Comportamiento esperado vs. comportamiento actual.
- Capturas de pantalla o logs si aplica.
- Información del entorno (navegador, sistema operativo, versión).

### 2. Sugerir una Mejora

Las sugerencias de nuevas funcionalidades son bienvenidas. Abre un **Issue** con la etiqueta `enhancement` y describe:

- El problema que resuelve la mejora.
- La solución propuesta.
- Alternativas consideradas.

### 3. Enviar un Pull Request

1. Haz un **fork** del repositorio.
2. Crea una rama descriptiva:
   ```bash
   git checkout -b feature/nombre-de-la-funcionalidad
   # o
   git checkout -b fix/descripcion-del-bug
   ```
3. Realiza tus cambios siguiendo las convenciones del proyecto.
4. Asegúrate de que el código funciona correctamente en los navegadores principales.
5. Haz commit con mensajes claros:
   ```bash
   git commit -m "feat: agregar soporte para tema oscuro personalizado"
   git commit -m "fix: corregir desbordamiento en tarjetas en móviles"
   ```
6. Envía el Pull Request con una descripción detallada de los cambios.

---

## Convenciones de Código

### JavaScript

- Usar `'use strict'` en todos los módulos.
- Preferir `const` sobre `let`; evitar `var`.
- Usar funciones con nombre en lugar de funciones anónimas cuando sea posible.
- Documentar funciones con JSDoc.
- Sanitizar siempre las entradas del usuario antes de usarlas en el DOM.

### CSS

- Usar variables CSS (`--nombre-variable`) para valores reutilizables.
- Organizar las reglas en secciones comentadas.
- Priorizar `flexbox` y `grid` para layouts.
- Incluir siempre estilos responsivos con `@media`.

### HTML

- Usar atributos `aria-*` para accesibilidad.
- Incluir `alt` en todas las imágenes.
- Usar elementos semánticos (`<header>`, `<main>`, `<footer>`, `<section>`).

---

## Estructura del Proyecto

```
/
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   └── main.css        ← Estilos principales
│   │   ├── img/
│   │   │   └── favicon.svg     ← Icono de la aplicación
│   │   └── js/
│   │       ├── security.js     ← Módulo de seguridad (cargar primero)
│   │       ├── db.js           ← Módulo de base de datos local
│   │       ├── api.js          ← Módulo de generación de números
│   │       └── main.js         ← Lógica principal de UI
│   └── index.html              ← Página principal
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD para GitHub Pages
├── .gitignore
├── CONTRIBUTING.md             ← Este archivo
├── LICENSE
├── README.md
└── SECURITY.md
```

---

## Proceso de Revisión

Los Pull Requests serán revisados en un plazo de 5 días hábiles. Se pueden solicitar cambios antes de la aprobación. Una vez aprobado, el mantenedor del proyecto realizará el merge.
