const CLAVE_DB = "location360_db_v1";

const POSICION_BASE = { lat: 40.4168, lng: -3.7038 };

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fechaISO() {
  return new Date().toISOString();
}

function cargarDatos() {
  try {
    const crudo = localStorage.getItem(CLAVE_DB);
    return crudo ? JSON.parse(crudo) : semillar();
  } catch (e) {
    return semillar();
  }
}

function salvarDatos() {
  try {
    localStorage.setItem(CLAVE_DB, JSON.stringify(datos));
  } catch (e) {
    console.error("No se pudo guardar", e);
  }
}

function semillar() {
  const ahora = fechaISO();
  return {
    version: 1,
    users: [
      {
        id: "u-alicia",
        name: "Alicia García",
        email: "alicia@nexo.app",
        password: "demo123",
        phone: "555 010 2828",
        shareLocation: false,
        createdAt: ahora,
        points: []
      },
      {
        id: "u-brian",
        name: "Brian López",
        email: "brian@nexo.app",
        password: "demo123",
        phone: "",
        shareLocation: true,
        createdAt: ahora,
        points: []
      },
      {
        id: "u-carla",
        name: "Carla Ruiz",
        email: "carla@nexo.app",
        password: "demo123",
        phone: "",
        shareLocation: true,
        createdAt: ahora,
        points: []
      }
    ],
    sessionUserId: null,
    groups: [
      {
        id: "g-familia",
        name: "Familia",
        description: "Nuestro círculo seguro",
        code: "NEXO1234",
        ownerId: "u-alicia",
        createdAt: ahora,
        members: [
          { userId: "u-alicia", role: "OWNER" },
          { userId: "u-brian", role: "ADMIN" },
          { userId: "u-carla", role: "MEMBER" }
        ]
      }
    ],
    places: [
      {
        id: "p-casa",
        userId: "u-alicia",
        name: "Casa",
        category: "Casa",
        address: "Calle Principal 123",
        lat: 40.4168,
        lng: -3.7038,
        createdAt: ahora
      },
      {
        id: "p-trabajo",
        userId: "u-alicia",
        name: "Trabajo",
        category: "Trabajo",
        address: "Av. Central 45",
        lat: 40.428,
        lng: -3.7038,
        createdAt: ahora
      }
    ],
    alerts: [
      {
        id: "a-bien",
        groupId: "g-familia",
        senderId: "u-brian",
        message: "Todo en orden, llegué bien.",
        lat: 40.424,
        lng: -3.692,
        status: "RESOLVED",
        sentAt: ahora,
        resolvedAt: ahora
      }
    ],
    notifications: [
      {
        id: "n-bien",
        userId: "u-alicia",
        type: "SOS",
        title: "SOS activado",
        body: "Brian envió una alerta desde el mapa.",
        read: true,
        createdAt: ahora
      },
      {
        id: "n-bienvenida",
        userId: "u-alicia",
        type: "WELCOME",
        title: "Bienvenida a NEXO",
        body: "Tu círculo «Familia» te está esperando.",
        read: false,
        createdAt: ahora
      }
    ]
  };
}

let datos = cargarDatos();