# NEXO · Tu círculo, tu seguridad

Aplicación web estilo Life360 creada **solo con HTML, CSS y JavaScript** (sin frameworks). Muestra a tu círculo en un mapa en vivo, permite crear grupos, lugares, alertas SOS, notificaciones y navegar a cualquier punto usando la **integración de Waze**.

- **Base de datos:** usa **Supabase** para usuarios reales, compartir la ubicación en vivo y tiempo real entre dispositivos.
- **Mapa y navegación:** mapa en vivo + **lonkis de Waze** (Deep Links) para abrir la app de Waze y navegar a una latitud/longitud o dirección, y **mapa integrado de Waze** (iframe) para ver la ubicación.

## Archivos del proyecto (8)

| Archivo | Descripción |
| --- | --- |
| `index.html` | Estructura completa (login, registro, mapa, pestañas). |
| `css/estilos.css` | Diseño profesional inspirado en Life360 (paleta violeta). |
| `js/config.js` | Aquí se pegan las credenciales de Supabase (vacías = modo demo). |
| `js/datos.js` | Datos locales del modo demo + fallback/seed y persistencia. |
| `js/supabase.js` | Adaptador de base de datos (auth, consultas, tiempo real). |
| `js/app.js` | Toda la lógica de la aplicación (mapa, grupos, SOS, perfil). |
| `supabase/esquema.sql` | Esquema de la base de datos para ejecutar en Supabase. |
| `LEEME.md` | Este archivo. |

## Cómo abrir la app

1. Abre `index.html` en un navegador (doble clic) o,
2. súbela a GitHub y actívala con **GitHub Pages** → *Settings → Pages*, rama `main`, carpeta `/ (root)`.

> **Nota:** si aún no configuraste Supabase, la app usa una cuenta local de prueba: `alicia@nexo.app` / `demo123`.

## Activar la base de datos (Supabase, opcional)

1. Crea una cuenta gratis en https://supabase.com y un nuevo proyecto.
2. En **SQL Editor**, pega y ejecuta el contenido de `supabase/esquema.sql` (crea las tablas, la política de seguridad RLS y el trigger que crea el perfil al registrarse).
3. Opcional, más cómodo para pruebas: en **Authentication → Providers → Email**, desactiva *"Confirm email"*.
4. Ve a **Project Settings → API** y copia el *Project URL* y la *anon public key*.
5. Pégalos en `js/config.js`:

```js
window.NEXO_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU-ANON-KEY"
};
```

6. Recarga `index.html`. Ahora el registro crea usuarios reales y el primer usuario recibe automáticamente el grupo *Familia* (código `NEXO1234`). Abre la app en dos navegadores para ver el tiempo real.

## Características

- Login y registro con diseño tipo Life360 (fondo con burbujas, sello NEXO).
- Mapa oscuro con la ubicación de cada miembro (colores fijos por persona).
- Grupos con **invitación por WhatsApp y código QR**: el líder comparte un enlace, un código QR para escanear, o un código para ingresar. Quien lo abre entra al grupo con el código ya cargado.
- Lugares guardados con **direcciones reales** (Buenos Aires).
- Integración con **Waze**: botón "Navegar con Waze" (abre la app) y mapa integrado de Waze (iframe) para ver cada lugar.
- Botón **SOS** con alerta a todo el círculo e historial.
- Notificaciones con contador de no leídas.

## Invitación a grupos por WhatsApp

En el detalle de un grupo, el líder ve una tarjeta con el **código de invitación** y tres opciones:

1. **Invitar por WhatsApp** — abre WhatsApp (app en móvil o web en escritorio) con el mensaje ya armado y el enlace de invitación (`tu-app?unirse=CODIGO`).
2. **Código QR** — muestra un código QR con el enlace de invitación para escanear con la cámara del celular.
3. **Copiar enlace** — copia el enlace directo al portapapeles.

Quien recibe el enlace (o escanea el QR) lo abre, inicia sesión (o se registra) y la aplicación **detecta el parámetro `?unirse=CODIGO` y lo une al grupo automáticamente**. El enlace se construye a partir de la URL actual, así que funciona tanto en la versión local como en GitHub Pages. El QR se genera con la librería [qrcodejs](https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js) y, si esa librería no carga, se usa el respaldo de [goqr.me](https://api.qrserver.com/).

## Integración con Waze

NEXO usa la **API pública de Waze** de dos formas (sin necesitar clave):

1. **Deep Links** — al tocar "Navegar con Waze" se abre `https://www.waze.com/ul?ll=lat,lng&navigate=yes` (o con `q=dirección`) para lanzar la app de Waze y empezar a navegar.
2. **Live Map (iframe)** — cada lugar embebe `https://embed.waze.com/iframe?zoom=15&lat=..&lon=..&pin=1` para mostrar el mapa de Waze dentro de la app.

Ver [documentación oficial de Waze](https://developers.google.com/waze) para más detalles.

## Tecnologías

- HTML5, CSS3, JavaScript puro.
- [Leaflet](https://leafletjs.com/) para el mapa + tiles oscuros de Esri.
- [Supabase](https://supabase.com) (PostgreSQL + Auth + Realtime).
- Tipografía **Plus Jakarta Sans** de Google Fonts.

---

> La versión full-stack original (servidor Node/TypeScript + app móvil React Native) se conserva completa por separado en la carpeta `Documents\Default Project`.