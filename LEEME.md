# NEXO · Tu círculo, tu seguridad

Aplicación web estilo Life360 creada **solo con HTML, CSS y JavaScript** (sin frameworks). Muestra a tu círculo en un mapa en vivo, permite crear grupos, lugares, alertas SOS y notificaciones.

- **Modo demo (por defecto):** funciona sin servidor; los datos viven en `localStorage`.
- **Modo nube:** usa **Supabase** para usuarios reales, compartir la ubicación en vivo y tiempo real entre dispositivos.

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

> Para probarla sin registrarse: botón **"Cuenta de demostración"** (Alicia García). También puedes entrar con `alicia@nexo.app` / `demo123`.

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
- Grupos con código de invitación, roles (Líder / Co-líder / Miembro).
- Lugares guardados y enlaces a Waze para navegar.
- Botón **SOS** con alerta a todo el círculo e historial.
- Notificaciones con contador de no leídas.
- En modo demo hay un movimiento simulado para ver la app funcionando sin GPS.

## Tecnologías

- HTML5, CSS3, JavaScript puro.
- [Leaflet](https://leafletjs.com/) para el mapa + tiles oscuros de Esri.
- [Supabase](https://supabase.com) (PostgreSQL + Auth + Realtime).
- Tipografía **Plus Jakarta Sans** de Google Fonts.

---

> La versión full-stack original (servidor Node/TypeScript + app móvil React Native) se conserva completa por separado en la carpeta `Documents\Default Project`.