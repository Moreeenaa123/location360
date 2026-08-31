// ============================================================
// NEXO · Datos locales (modo demostración)
// En modo nube (Supabase) estos datos son solo un espejo en la
// memoria; en modo demo viven en el navegador con localStorage.
// ============================================================

const CLAVE_DB = "nexo_datos_v1";

// Centro del mapa para la demostración (Buenos Aires, Argentina)
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
        id: "u-brian", name: "Brian López", email: "brian@demo.nexo.app", password: "demo123",
        phone: "+54 9 11 5555-0202", shareLocation: true, createdAt: ahora, points: []
      },
      {
        id: "u-carla", name: "Carla Méndez", email: "carla@demo.nexo.app", password: "demo123",
        phone: "+54 9 11 5555-0303", shareLocation: true, createdAt: ahora, points: []
      }
    ],
    groups: [
      {
        id: "g-familia", name: "Familia", description: "El círculo de demostración",
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
        address: "Av. Corrientes 1234, CABA", lat: POSICION_BASE.lat + 0.004, lng: POSICION_BASE.lng - 0.003, createdAt: ahora
      },
      {
        id: "p-trabajo", userId: "u-alicia", name: "Trabajo", category: "Trabajo",
        address: "Av. 9 de Julio 5678, CABA", lat: POSICION_BASE.lat - 0.006, lng: POSICION_BASE.lng + 0.005, createdAt: ahora
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
// pisar la demostración local ni guardar espejos parciales.
function salvarDatos() {
  if (window.NUBE && window.NUBE.activo) return;
  try {
    localStorage.setItem(CLAVE_DB, JSON.stringify(window.datos));
  } catch (e) { /* sin espacio o modo privado: la sesión sigue en memoria */ }
}