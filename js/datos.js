// ============================================================
// NEXO · Datos locales (cuentas de prueba)
// En modo nube (Supabase) estos datos son solo un espejo en la
// memoria; las cuentas locales de prueba viven en localStorage.
// ============================================================

const CLAVE_DB = "nexo_datos_v1";

// Centro del mapa (Buenos Aires, Argentina)
const POSICION_BASE = { lat: -34.6037, lng: -58.3816 };

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fechaISO() {
  return new Date().toISOString();
}

function datosSemilla() {
  const ahora = fechaISO();
  return {
    users: [
      {
        id: "u-alicia", name: "Alicia García", email: "alicia@nexo.app", password: "demo123",
        phone: "+54 9 11 5555-0101", shareLocation: true, createdAt: ahora, points: []
      },
      {
        id: "u-brian", name: "Brian López", email: "brian@nexo.app", password: "demo123",
        phone: "+54 9 11 5555-0202", shareLocation: true, createdAt: ahora, points: []
      },
      {
        id: "u-carla", name: "Carla Méndez", email: "carla@nexo.app", password: "demo123",
        phone: "+54 9 11 5555-0303", shareLocation: true, createdAt: ahora, points: []
      }
    ],
    groups: [
      {
        id: "g-familia", name: "Familia", description: "Círculo de confianza",
        code: "NEXO1234", ownerId: "u-alicia", createdAt: ahora,
        members: [
          { userId: "u-alicia", role: "OWNER" },
          { userId: "u-brian", role: "MEMBER" },
          { userId: "u-carla", role: "MEMBER" }
        ]
      }
    ],
    places: [
      {
        id: "p-casa", userId: "u-alicia", name: "Casa", category: "Hogar",
        address: "Av. del Libertador 6480, Núñez, CABA",
        lat: -34.5427, lng: -58.4498, createdAt: ahora
      },
      {
        id: "p-trabajo", userId: "u-alicia", name: "Oficina", category: "Trabajo",
        address: "Av. Corrientes 1543, Balvanera, CABA",
        lat: -34.6043, lng: -58.3915, createdAt: ahora
      },
      {
        id: "p-casa-brian", userId: "u-brian", name: "Casa", category: "Hogar",
        address: "Defensa 850, San Telmo, CABA",
        lat: -34.6229, lng: -58.3722, createdAt: ahora
      },
      {
        id: "p-casa-carla", userId: "u-carla", name: "Casa", category: "Hogar",
        address: "Av. Scalabrini Ortiz 1450, Palermo, CABA",
        lat: -34.5834, lng: -58.4273, createdAt: ahora
      },
      {
        id: "p-cafe", userId: "u-carla", name: "Café favorito", category: "Café",
        address: "Av. Córdoba 4521, Palermo, CABA",
        lat: -34.5807, lng: -58.4302, createdAt: ahora
      }
    ],
    alerts: [],
    notifications: [],
    sessionUserId: null
  };
}

function cargarAlmacen() {
  try {
    const cruda = localStorage.getItem(CLAVE_DB);
    const guardado = cruda ? JSON.parse(cruda) : null;
    if (guardado && Array.isArray(guardado.users) && Array.isArray(guardado.groups)) return guardado;
  } catch (e) { /* almacén corrupto: se vuelve a sembrar */ }
  return datosSemilla();
}

window.datos = cargarAlmacen();

// En modo nube la fuente de verdad vive en Supabase: no conviene
// pisar las cuentas locales ni guardar espejos parciales.
function salvarDatos() {
  if (window.NUBE && window.NUBE.activo) return;
  try {
    localStorage.setItem(CLAVE_DB, JSON.stringify(window.datos));
  } catch (e) { /* sin espacio o modo privado: la sesión sigue en memoria */ }
}