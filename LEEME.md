# NEXO — Tu círculo, tu seguridad

Aplicación web de localización y seguridad familiar, hecha **solo con HTML, CSS y JavaScript** (sin frameworks ni librerías propias). El mapa usa **Leaflet + OpenStreetMap** y los datos se guardan en el navegador (localStorage).

## Cómo ejecutarla

1. Abre `index.html` con doble clic (Chrome, Edge o Firefox). La app funciona perfecto así.
2. Para que el botón **GPS** funcione con tu posición real, es mejor servirla como página web:
   - Con Python: `python -m http.server 8080` y abre `http://localhost:8080`
   - Con Node: `npx serve`
   - O súbela a GitHub Pages / Vercel / Netlify.

> Abrir desde `file://` o en páginas sin `https` puede bloquear el acceso al GPS; la app lo detecta y usa una posición simulada para que la presentación nunca se quede vacía.

## Cuenta de demostración

En la pantalla de ingreso usa el botón **"Probar con la cuenta de demostración"** (Alicia García) o entra con:

- **Correo:** `alicia@nexo.app`
- **Contraseña:** `demo123`

También existen `brian@nexo.app` y `carla@nexo.app` (misma clave), miembros del grupo **Familia** (código `NEXO1234`).

## Características

- Círculo (grupo) con creación, código de invitación, roles (líder / co-líder / miembro) y administración de miembros.
- Mapa en vivo con la ubicación de los miembros que comparten su posición. Los miembros simulados se mueven levemente para mostrar el mapa activo.
- **Privacidad real de demostración**: cada usuario decide si comparte o no su ubicación (Carla no la comparte por defecto).
- Alerta **SOS** con posición y mensaje, que aparece en "Alertas" del resto del grupo.
- **Lugares** guardados con posición tomada del mapa y navegación con Waze.
- **Historial de ubicación** personal, con opción de borrarlo.
- Notificaciones con contador de no leídas, cerrar sesión y borrar cuenta.

## Estructura del proyecto

El repositorio completo tiene solo **5 archivos**, todos en HTML, CSS y JavaScript:

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de las pantallas (ingreso, app, modales) |
| `css/estilos.css` | Todo el diseño y estilos de la interfaz |
| `js/datos.js` | Datos de ejemplo, persistencia en localStorage y utilidades |
| `js/app.js` | Lógica completa: sesión, mapa, grupos, lugares, alertas y perfil |
| `LEEME.md` | Este manual |

## Librerías externas

- **Leaflet 1.9.4** (CDN `unpkg.com`) para el mapa.
- **OpenStreetMap** para las capas de mapa (sin API key).
- Iconos e identidad visual: 100% SVG/HTML/CSS propios.

## Nota académica

Es una versión de demostración: los miembros y sus movimientos son **simulados en el navegador** y las contraseñas se guardan sin cifrar, suficiente para un proyecto de prácticas. La versión productiva usaría un servidor para sincronizar usuarios reales en tiempo real.