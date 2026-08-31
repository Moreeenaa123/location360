// =====================================================================
// NEXO · Tu círculo, tu seguridad
// Single Page Application hecha en JavaScript puro (sin frameworks)
// Mapa: Leaflet + OpenStreetMap · Datos: localStorage
// =====================================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const INTERVALO_SIMULACION = 4000;

let mapa = null;
let mapaPicker = null;
let pickerMarker = null;
let marcadores = {};
let vivo = {};
let miPos = null;
let usandoSimulacion = false;
let watchId = null;
let intervaloTiempo = null;
let fichaAbiertaId = null;
let grupoDetalleId = null;
let toastTimer = null;

// ============================ UTILIDADES ============================

function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function iniciales(nombre) {
  const partes = String(nombre || "?").trim().split(/\s+/);
  const letras = (partes[0] ? partes[0][0] : "") + (partes[1] ? partes[1][0] : "");
  return letras.toUpperCase() || "?";
}

function fmtAgo(iso) {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return "hace " + s + " s";
  const m = Math.round(s / 60);
  if (m < 60) return "hace " + m + " min";
  const h = Math.round(m / 60);
  if (h < 24) return "hace " + h + " h";
  return "hace " + Math.round(h / 24) + " d";
}

function fmtHora(iso) {
  try { return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}

function fmtFecha(iso) {
  try { return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); }
  catch (e) { return ""; }
}

function mostrarToast(mensaje, tipo) {
  const t = $("#toast");
  t.textContent = mensaje;
  t.className = "toast " + (tipo || "");
  t.classList.remove("oculta");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("oculta"), 2800);
}

function abrirModal(html) {
  $("#modal").innerHTML = html;
  $("#modal").classList.remove("oculta");
  $("#tapete").classList.remove("oculta");
}

function cerrarModal() {
  $("#modal").classList.add("oculta");
  $("#tapete").classList.add("oculta");
  if (mapaPicker) { mapaPicker.remove(); mapaPicker = null; pickerMarker = null; }
}

// ============================ ACCESO ============================

function usuarioActual() {
  return datos.users.find((u) => u.id === datos.sessionUserId) || null;
}

function entrarComo(userId) {
  datos.sessionUserId = userId;
  salvarDatos();
  entrarApp();
}

function entrarApp() {
  $("#vistaLogin").classList.add("oculta");
  $("#vistaRegistro").classList.add("oculta");
  $("#app").classList.remove("oculta");
  const u = usuarioActual();
  $("#textoEnVivo").textContent = u ? u.name : "en vivo";
  mostrarVista("mapa");
  iniciarMapa();
  arrancarSimulacion();
  actualizarBadge();
}

function salirApp() {
  if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (intervaloTiempo) { clearInterval(intervaloTiempo); intervaloTiempo = null; }
  if (mapa) { mapa.remove(); mapa = null; }
  marcadores = {}; vivo = {}; miPos = null; usandoSimulacion = false; fichaAbiertaId = null;
  datos.sessionUserId = null;
  salvarDatos();
  $("#app").classList.add("oculta");
  $("#vistaLogin").classList.remove("oculta");
  $("#loginError").textContent = "";
  $("#vistaRegistro").classList.add("oculta");
}

function iniciarSesion() {
  const correo = $("#loginCorreo").value.trim().toLowerCase();
  const clave = $("#loginContrasena").value;
  const u = datos.users.find((x) => x.email === correo && x.password === clave);
  if (!u) { $("#loginError").textContent = "Correo o contraseña incorrectos."; return; }
  entrarComo(u.id);
}

function registrarUsuario() {
  const nombre = $("#regNombre").value.trim();
  const correo = $("#regCorreo").value.trim().toLowerCase();
  const clave = $("#regContrasena").value;
  $("#regError").textContent = "";
  if (!nombre) { $("#regError").textContent = "Escribe tu nombre."; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { $("#regError").textContent = "Correo no válido."; return; }
  if (clave.length < 6) { $("#regError").textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
  if (datos.users.some((x) => x.email === correo)) { $("#regError").textContent = "Ese correo ya está registrado."; return; }
  datos.users.push({
    id: uuid(), name: nombre, email: correo, password: clave,
    phone: "", shareLocation: false, createdAt: fechaISO(), points: []
  });
  salvarDatos();
  entrarComo(datos.users[datos.users.length - 1].id);
  mostrarToast("Cuenta creada. ¡Bienvenido a NEXO!", "exito");
}

// ============================ NAVEGACION ============================

const NOMBRES_VISTA = { mapa: "Mapa", grupo: "Mi grupo", lugares: "Lugares", alertas: "Alertas", perfil: "Perfil" };
const IDS_VISTA = { mapa: "vistaMapa", grupo: "vistaGrupo", lugares: "vistaLugares", alertas: "vistaAlertas", perfil: "vistaPerfil" };

function mostrarVista(vista) {
  $$(".vista").forEach((v) => v.classList.add("oculta"));
  $("#" + IDS_VISTA[vista]).classList.remove("oculta");
  $$(".tab").forEach((t) => t.classList.toggle("activa", t.dataset.vista === vista));
  $("#textoCabecera").textContent = NOMBRES_VISTA[vista];
  if (vista === "mapa") {
    if (mapa) setTimeout(() => mapa.invalidateSize(), 80);
    actualizarBannerPrivacidad();
    renderFichaSiAbierta();
  }
  if (vista === "grupo") grupoDetalleId ? verDetalleGrupo(grupoDetalleId) : renderGrupos();
  if (vista === "lugares") renderLugares();
  if (vista === "alertas") renderAlertas();
  if (vista === "perfil") renderPerfil();
}

// ============================ MAPA ============================

function iniciarMapa() {
  if (typeof L === "undefined") { mostrarToast("Sin red: no se pudo cargar el mapa.", "error"); return; }
  mapa = L.map("mapa").setView([POSICION_BASE.lat, POSICION_BASE.lng], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  const yo = usuarioActual();
  if (yo.shareLocation) comenzarMiUbicacion();
  actualizarMarcadores();
}

function comenzarMiUbicacion() {
  if (watchId) return;
  if (!navigator.geolocation) { usarPosicionPorDefecto(); return; }
  watchId = navigator.geolocation.watchPosition(
    (pos) => fijarPosicionMia(pos.coords.latitude, pos.coords.longitude),
    () => usarPosicionPorDefecto(),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

function usarPosicionPorDefecto() {
  if (miPos) return;
  usandoSimulacion = true;
  fijarPosicionMia(
    POSICION_BASE.lat + (Math.random() - 0.5) * 0.02,
    POSICION_BASE.lng + (Math.random() - 0.5) * 0.02
  );
  mostrarToast("GPS no disponible: se usa una posición simulada.", "aviso");
}

function fijarPosicionMia(lat, lng) {
  miPos = { lat, lng };
  if (!marcadores["yo"]) crearMarca("yo", usuarioActual().name, true);
  else marcadores["yo"].setLatLng([lat, lng]);
  const yo = usuarioActual();
  yo.points = yo.points || [];
  yo.points.push({ lat, lng, t: fechaISO() });
  if (yo.points.length > 500) yo.points = yo.points.slice(-500);
  salvarDatos();
}

function detenerMiUbicacion() {
  if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  miPos = null; usandoSimulacion = false;
  if (marcadores["yo"]) { mapa.removeLayer(marcadores["yo"]); delete marcadores["yo"]; }
}

function crearMarca(userId, nombre, esYo) {
  const latlng = esYo
    ? [miPos.lat, miPos.lng]
    : [vivo[userId].lat, vivo[userId].lng];
  const icono = L.divIcon({
    className: "",
    html: `<div class="marca ${esYo ? "marca-mia" : "marca-miembro"}">${iniciales(nombre)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
  const m = L.marker(latlng, { icon: icono }).addTo(mapa);
  m.on("click", () => abrirFicha(userId));
  marcadores[userId] = m;
}

function posicionInicial() {
  return {
    lat: POSICION_BASE.lat + (Math.random() - 0.5) * 0.06,
    lng: POSICION_BASE.lng + (Math.random() - 0.5) * 0.06,
    lastAt: fechaISO()
  };
}

function actualizarMarcadores() {
  const yo = usuarioActual();
  if (!mapa || !yo) return;
  const idsValidos = miembrosDe(yo.id).map((m) => m.userId);
  if (yo.shareLocation) idsValidos.push("yo");
  Object.keys(marcadores).forEach((k) => {
    if (!idsValidos.includes(k)) { mapa.removeLayer(marcadores[k]); delete marcadores[k]; }
  });
  miembrosDe(yo.id).forEach((mm) => {
    const u = usuarioPorId(mm.userId);
    if (!u || !u.shareLocation) return;
    if (!vivo[u.id]) vivo[u.id] = posicionInicial();
    if (!marcadores[u.id]) crearMarca(u.id, u.name, false);
    else marcadores[u.id].setLatLng([vivo[u.id].lat, vivo[u.id].lng]);
  });
  if (yo.shareLocation && miPos) {
    if (!marcadores["yo"]) crearMarca("yo", yo.name, true);
    else marcadores["yo"].setLatLng([miPos.lat, miPos.lng]);
  }
}

function ajustarVista() {
  if (!mapa) return;
  const puntos = Object.values(marcadores).map((m) => m.getLatLng());
  if (!puntos.length) { mapa.setView([POSICION_BASE.lat, POSICION_BASE.lng], 13); return; }
  if (puntos.length === 1) { mapa.setView(puntos[0], 15); return; }
  mapa.fitBounds(L.latLngBounds(puntos), { padding: [50, 50] });
}

function centrarEn(lat, lng) {
  if (mapa) mapa.flyTo([lat, lng], 15);
}

function centrarEnMi() {
  if (!mapa) return;
  if (miPos) { centrarEn(miPos.lat, miPos.lng); return; }
  mapa.locate({ setView: true, maxZoom: 15 });
  mapa.once("locationerror", () => {
    mapa.setView([POSICION_BASE.lat, POSICION_BASE.lng], 13);
    mostrarToast("No se pudo obtener tu ubicación GPS.", "aviso");
  });
}

// Movimiento simulado de los miembros con ubicación visible,
// para que el mapa se vea "en vivo" durante la presentación.
function arrancarSimulacion() {
  if (intervaloTiempo) clearInterval(intervaloTiempo);
  intervaloTiempo = setInterval(moverMiembros, INTERVALO_SIMULACION);
}

function moverMiembros() {
  const yo = usuarioActual();
  if (!yo || !mapa) return;
  miembrosDe(yo.id).forEach((mm) => {
    if (mm.userId === yo.id) return;
    const u = usuarioPorId(mm.userId);
    if (!u || !u.shareLocation) return;
    if (!vivo[u.id]) vivo[u.id] = posicionInicial();
    vivo[u.id].lat += (Math.random() - 0.5) * 0.0012;
    vivo[u.id].lng += (Math.random() - 0.5) * 0.0012;
    vivo[u.id].lastAt = fechaISO();
    if (marcadores[u.id]) marcadores[u.id].setLatLng([vivo[u.id].lat, vivo[u.id].lng]);
  });
  if (usandoSimulacion && miPos) {
    miPos.lat += (Math.random() - 0.5) * 0.0008;
    miPos.lng += (Math.random() - 0.5) * 0.0008;
    if (marcadores["yo"]) marcadores["yo"].setLatLng([miPos.lat, miPos.lng]);
  }
  renderFichaSiAbierta();
}

// ============================ FICHA DE MIEMBRO ============================

function abrirFicha(userId) {
  fichaAbiertaId = userId;
  renderFicha();
}

function renderFicha() {
  const el = $("#fichaMiembro");
  const yo = usuarioActual();
  const esYo = fichaAbiertaId === "yo" || fichaAbiertaId === yo.id;
  const u = esYo ? yo : usuarioPorId(fichaAbiertaId);
  if (!u) { el.classList.add("oculta"); return; }
  const pos = esYo ? (miPos || vivo[yo.id]) : vivo[u.id];
  const lat = pos ? pos.lat : POSICION_BASE.lat;
  const lng = pos ? pos.lng : POSICION_BASE.lng;
  const estado = pos ? ("Visto " + fmtAgo(pos.lastAt || u.createdAt) + " · " + lat.toFixed(5) + ", " + lng.toFixed(5)) : "No comparte ubicación";
  el.innerHTML = `
    <div class="tarjeta-fila">
      <div class="avatar-miembro">${iniciales(u.name)}</div>
      <div style="flex:1">
        <strong>${esc(u.name)}</strong>
        <div class="texto-suave">${estado}</div>
      </div>
      <button class="btn-conexo" onclick="cerrarFicha()">✕</button>
    </div>
    <div class="fila-acciones">
      <button class="btn btn-primario" onclick="centrarEn(${lat}, ${lng})">Centrar</button>
      <button class="btn btn-secundario" onclick="abrirWaze(${lat}, ${lng})">Navegar con Waze</button>
    </div>`;
  el.classList.remove("oculta");
}

function renderFichaSiAbierta() {
  if (fichaAbiertaId && !$("#fichaMiembro").classList.contains("oculta")) renderFicha();
}

function cerrarFicha() {
  $("#fichaMiembro").classList.add("oculta");
  fichaAbiertaId = null;
}

function abrirWaze(lat, lng) {
  const urlWeb = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMovil) {
    try { window.location.href = `waze://?ll=${lat},${lng}&navigate=yes`; } catch (e) {}
  }
  window.open(urlWeb, "_blank");
}

// ============================ ALERTA SOS ============================

function abrirModalSos() {
  const yo = usuarioActual();
  const grupos = gruposDe(yo.id);
  const opciones = grupos.length
    ? grupos.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")
    : `<option value="">(sin grupos)</option>`;
  abrirModal(`
    <h2>Enviar alerta SOS</h2>
    <label>Grupo</label>
    <select id="sosGrupo">${opciones}</select>
    <label>Mensaje (opcional)</label>
    <input id="sosMensaje" placeholder="Necesito ayuda">
    <div class="texto-suave" style="margin-top:10px">Tu círculo recibirá tu posición actual y podrá llegar a ti.</div>
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-peligro" onclick="enviarSos()">Enviar SOS</button>
    </div>`);
}

function enviarSos() {
  const gid = $("#sosGrupo").value;
  if (!gid || !grupoPorId(gid)) { mostrarToast("Primero crea o únete a un grupo.", "aviso"); return; }
  const yo = usuarioActual();
  const pos = miPos || vivo[yo.id] || null;
  const lat = pos ? pos.lat : POSICION_BASE.lat;
  const lng = pos ? pos.lng : POSICION_BASE.lng;
  datos.alerts.push({
    id: uuid(), groupId: gid, senderId: yo.id,
    message: $("#sosMensaje").value.trim() || "Necesito ayuda",
    lat, lng, status: "ACTIVE", sentAt: fechaISO()
  });
  miembrosDelGrupo(gid).forEach((mm) => {
    if (mm.userId === yo.id) return;
    datos.notifications.push({
      id: uuid(), userId: mm.userId, type: "SOS",
      title: "SOS de " + yo.name,
      body: "Envió una alerta desde el mapa.",
      read: false, createdAt: fechaISO()
    });
  });
  salvarDatos();
  cerrarModal();
  actualizarBadge();
  mostrarToast("SOS enviado a tu círculo.", "exito");
}

// ============================ GRUPOS ============================

function usuarioPorId(id) { return datos.users.find((u) => u.id === id); }
function grupoPorId(id) { return datos.groups.find((g) => g.id === id); }

function gruposDe(userId) { return datos.groups.filter((g) => g.members.some((m) => m.userId === userId)); }

function miembrosDe(userId) {
  const lista = [];
  gruposDe(userId).forEach((g) => g.members.forEach((m) => {
    if (!lista.find((x) => x.userId === m.userId)) lista.push(m);
  }));
  return lista;
}

function miembrosDelGrupo(gid) {
  const g = grupoPorId(gid);
  return g ? g.members : [];
}

function rolEnGrupo(gid, userId) {
  const g = grupoPorId(gid);
  const m = g && g.members.find((x) => x.userId === userId);
  return m ? m.role : null;
}

const ROL_LABEL = { OWNER: "Líder", ADMIN: "Co-líder", MEMBER: "Miembro" };

function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NEXO";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function renderGrupos() {
  const yo = usuarioActual();
  const grupos = gruposDe(yo.id);
  let html = `
    <div class="titulo-panel">Mis grupos</div>
    <div class="subtitulo-panel">Crea un círculo o únete con un código.</div>
    <div class="fila-acciones">
      <button class="btn btn-primario" onclick="abrirModalCrearGrupo()">+ Crear grupo</button>
      <button class="btn btn-secundario" onclick="abrirModalUnirse()">Unirme con código</button>
    </div>`;
  if (!grupos.length) html += `<div class="contenedor-vacio"><span class="icono">👥</span>Aún no formas parte de ningún grupo.</div>`;
  grupos.forEach((g) => {
    html += `
      <div class="tarjeta">
        <div class="tarjeta-fila">
          <div class="avatar-miembro">${iniciales(g.name)}</div>
          <div style="flex:1">
            <strong>${esc(g.name)}</strong>
            <div class="texto-suave">${g.members.length} miembros · código ${esc(g.code)} · ${fmtAgo(g.createdAt)}</div>
          </div>
          <span class="chip">${ROL_LABEL[rolEnGrupo(g.id, yo.id)]}</span>
        </div>
        <div class="fila-acciones">
          <button class="btn btn-conexo" onclick="verDetalleGrupo('${g.id}')">Ver círculo</button>
        </div>
      </div>`;
  });
  $("#contenidoGrupo").innerHTML = html;
}

function abrirModalCrearGrupo() {
  abrirModal(`
    <h2>Crear grupo</h2>
    <label>Nombre</label>
    <input id="nuevoGrupoNombre" placeholder="Familia">
    <label>Descripción</label>
    <input id="nuevoGrupoDesc" placeholder="Nuestro círculo seguro">
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primario" onclick="crearGrupo()">Crear</button>
    </div>`);
}

function crearGrupo() {
  const nombre = $("#nuevoGrupoNombre").value.trim();
  if (!nombre) { mostrarToast("Escribe un nombre para el grupo.", "aviso"); return; }
  const yo = usuarioActual();
  const nuevo = {
    id: uuid(), name: nombre, description: $("#nuevoGrupoDesc").value.trim(),
    code: generarCodigo(), ownerId: yo.id, createdAt: fechaISO(),
    members: [{ userId: yo.id, role: "OWNER" }]
  };
  datos.groups.push(nuevo);
  salvarDatos();
  cerrarModal();
  mostrarToast("Grupo creado. Código: " + nuevo.code, "exito");
  actualizarMarcadores();
  if (vistaActual === "grupo") renderGrupos();
}

function abrirModalUnirse() {
  abrirModal(`
    <h2>Unirme a un grupo</h2>
    <label>Código de invitación</label>
    <input id="codigoUnirse" placeholder="NEXO1234" style="text-transform:uppercase">
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primario" onclick="unirseGrupo()">Unirme</button>
    </div>`);
}

function unirseGrupo() {
  const codigo = $("#codigoUnirse").value.trim().toUpperCase();
  const grupo = datos.groups.find((g) => g.code.toUpperCase() === codigo);
  const yo = usuarioActual();
  if (!grupo) { mostrarToast("Código no válido.", "error"); return; }
  if (grupo.members.some((m) => m.userId === yo.id)) { mostrarToast("Ya formas parte de ese grupo.", "aviso"); cerrarModal(); return; }
  grupo.members.push({ userId: yo.id, role: "MEMBER" });
  datos.notifications.push({
    id: uuid(), userId: grupo.ownerId, type: "GRUPO",
    title: "Nuevo miembro", body: yo.name + " se unió a " + grupo.name,
    read: false, createdAt: fechaISO()
  });
  salvarDatos();
  cerrarModal();
  mostrarToast("¡Bienvenido a " + grupo.name + "!", "exito");
  actualizarMarcadores();
  if (vistaActual === "grupo") renderGrupos();
}

function verDetalleGrupo(gid) {
  grupoDetalleId = gid;
  const g = grupoPorId(gid);
  if (!g) return;
  const yo = usuarioActual();
  const miRol = rolEnGrupo(gid, yo.id);
  let html = `
    <button class="btn btn-conexo" onclick="grupoDetalleId=null; mostrarVista('grupo')">← Volver</button>
    <div class="tarjeta" style="margin-top:12px">
      <div class="tarjeta-fila">
        <div class="avatar-miembro">${iniciales(g.name)}</div>
        <div style="flex:1">
          <strong>${esc(g.name)}</strong>
          <div class="texto-suave">${esc(g.description || "Sin descripción")}</div>
        </div>
        <span class="chip">${ROL_LABEL[miRol]}</span>
      </div>
      <div style="margin-top:14px; text-align:center">
        <div class="texto-suave">Código de invitación</div>
        <div class="codigo-grande">${esc(g.code)}</div>
        <div class="fila-acciones">
          <button class="btn btn-secundario" onclick="copiarCodigo('${esc(g.code)}')">Copiar</button>
          ${miRol === "OWNER" ? `<button class="btn btn-conexo" onclick="regenerarCodigo()">Nuevo código</button>` : ""}
        </div>
      </div>
    </div>
    <div class="titulo-panel" style="font-size:17px">Miembros (${g.members.length})</div>`;
  g.members.forEach((mm) => {
    const u = usuarioPorId(mm.userId);
    const visible = u && u.shareLocation;
    html += `
      <div class="tarjeta tarjeta-fila">
        <div class="avatar-miembro">${iniciales(u ? u.name : "?")}</div>
        <div style="flex:1">
          <strong>${esc(u ? u.name : "Desconocido")}</strong>
          <div class="texto-suave ${visible ? "texto-exito" : ""}">${visible ? "Compartiendo ubicación" : "Ubicación oculta"}</div>
        </div>
        <span class="chip ${visible ? "chip-exito" : "chip-oscuro"}">${visible ? "EN LÍNEA" : "OCULTO"}</span>
        ${miRol !== "MEMBER" && mm.userId !== yo.id && mm.role !== "OWNER"
          ? `<button class="btn btn-peligro" onclick="quitarMiembro('${mm.userId}')">Quitar</button>` : ""}
      </div>`;
  });
  html += `
    <div class="fila-acciones">
      ${miRol === "OWNER"
        ? `<button class="btn btn-peligro" onclick="eliminarGrupoConfirm()">Eliminar grupo</button>`
        : `<button class="btn btn-peligro" onclick="salirGrupoConfirm()">Salir del grupo</button>`}
    </div>`;
  $("#contenidoGrupo").innerHTML = html;
}

function copiarCodigo(codigo) {
  if (navigator.clipboard) { navigator.clipboard.writeText(codigo); mostrarToast("Código copiado.", "exito"); }
  else mostrarToast(codigo, "aviso");
}

function regenerarCodigo() {
  const g = grupoPorId(grupoDetalleId);
  if (!g) return;
  g.code = generarCodigo();
  salvarDatos();
  verDetalleGrupo(g.id);
  mostrarToast("Nuevo código generado.", "exito");
}

function quitarMiembro(userId) {
  const g = grupoPorId(grupoDetalleId);
  if (!g) return;
  g.members = g.members.filter((m) => m.userId !== userId);
  salvarDatos();
  verDetalleGrupo(g.id);
  mostrarToast("Miembro retirado del círculo.", "exito");
}

function salirGrupoConfirm() {
  if (!confirm("¿Salir de este grupo?")) return;
  const g = grupoPorId(grupoDetalleId);
  if (g) g.members = g.members.filter((m) => m.userId !== usuarioActual().id);
  salvarDatos();
  grupoDetalleId = null;
  renderGrupos();
  actualizarMarcadores();
  mostrarToast("Has salido del grupo.", "aviso");
}

function eliminarGrupoConfirm() {
  if (!confirm("¿Eliminar el grupo y su historial?")) return;
  datos.groups = datos.groups.filter((g) => g.id !== grupoDetalleId);
  datos.alerts = datos.alerts.filter((a) => a.groupId !== grupoDetalleId);
  salvarDatos();
  grupoDetalleId = null;
  renderGrupos();
  actualizarMarcadores();
  mostrarToast("Grupo eliminado.", "aviso");
}

// ============================ LUGARES ============================

const CATEGORIAS = ["Casa", "Trabajo", "Escuela", "Gimnasio", "Otro"];

function renderLugares() {
  const yo = usuarioActual();
  const lugares = datos.places.filter((p) => p.userId === yo.id);
  let html = `
    <div class="titulo-panel">Mis lugares</div>
    <div class="subtitulo-panel">Lugares importantes para tu círculo.</div>
    <button class="btn btn-primario btn-block" onclick="abrirModalLugar()">+ Agregar lugar</button>`;
  if (!lugares.length) html += `<div class="contenedor-vacio"><span class="icono">📍</span>Aún no tienes lugares guardados.</div>`;
  lugares.forEach((p) => {
    html += `
      <div class="tarjeta">
        <div class="tarjeta-fila">
          <div class="avatar-miembro">${esc(p.category[0])}</div>
          <div style="flex:1">
            <strong>${esc(p.name)}</strong>
            <div class="texto-suave">${esc(p.address || p.category)}</div>
            <div class="texto-suave">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
          </div>
          <span class="chip">${esc(p.category)}</span>
        </div>
        <div class="fila-acciones">
          <button class="btn btn-secundario" onclick="abrirWaze(${p.lat}, ${p.lng})">Navegar</button>
          <button class="btn btn-peligro" onclick="eliminarLugar('${p.id}')">Eliminar</button>
        </div>
      </div>`;
  });
  $("#contenidoLugares").innerHTML = html;
}

function abrirModalLugar() {
  const base = miPos || { lat: POSICION_BASE.lat, lng: POSICION_BASE.lng };
  abrirModal(`
    <h2>Agregar lugar</h2>
    <label>Nombre</label>
    <input id="lugNombre" placeholder="Casa de la abuela">
    <label>Categoría</label>
    <select id="lugCategoria">${CATEGORIAS.map((c) => `<option>${c}</option>`).join("")}</select>
    <label>Dirección (opcional)</label>
    <input id="lugDireccion" placeholder="Calle y número">
    <label>Ubicación en el mapa</label>
    <div id="miniMapa" class="mini-mapa"></div>
    <div class="texto-suave" style="margin-top:6px" id="lugCoord"></div>
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="usarMiUbicacionLugar()">Usar mi ubicación</button>
    </div>
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primario" onclick="guardarLugar()">Guardar</button>
    </div>`);
  setTimeout(() => iniciarMapaPicker(base.lat, base.lng), 60);
}

function iniciarMapaPicker(lat, lng) {
  if (typeof L === "undefined") return;
  mapaPicker = L.map("miniMapa").setView([lat, lng], 15);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapaPicker);
  pickerMarker = L.marker([lat, lng]).addTo(mapaPicker);
  mapaPicker.on("click", (e) => {
    pickerMarker.setLatLng(e.latlng);
    actualizarCoordPicker(e.latlng.lat, e.latlng.lng);
  });
  actualizarCoordPicker(lat, lng);
}

function actualizarCoordPicker(lat, lng) {
  const el = $("#lugCoord");
  if (el) el.textContent = "Lat " + lat.toFixed(5) + " · Lng " + lng.toFixed(5);
}

function usarMiUbicacionLugar() {
  const base = miPos || { lat: POSICION_BASE.lat, lng: POSICION_BASE.lng };
  if (pickerMarker) pickerMarker.setLatLng([base.lat, base.lng]);
  actualizarCoordPicker(base.lat, base.lng);
}

function guardarLugar() {
  const nombre = $("#lugNombre").value.trim();
  if (!nombre) { mostrarToast("Escribe el nombre del lugar.", "aviso"); return; }
  let lat, lng;
  if (pickerMarker) { const ll = pickerMarker.getLatLng(); lat = ll.lat; lng = ll.lng; }
  else { const base = miPos || POSICION_BASE; lat = base.lat; lng = base.lng; }
  const yo = usuarioActual();
  datos.places.push({
    id: uuid(), userId: yo.id, name: nombre, category: $("#lugCategoria").value,
    address: $("#lugDireccion").value.trim(), lat, lng, createdAt: fechaISO()
  });
  salvarDatos();
  cerrarModal();
  renderLugares();
  mostrarToast("Lugar guardado.", "exito");
}

function eliminarLugar(id) {
  if (!confirm("¿Eliminar este lugar?")) return;
  datos.places = datos.places.filter((p) => p.id !== id);
  salvarDatos();
  renderLugares();
  mostrarToast("Lugar eliminado.", "exito");
}

// ============================ ALERTAS ============================

function esDeMiGrupo(alerta) {
  const yo = usuarioActual();
  return gruposDe(yo.id).some((g) => g.id === alerta.groupId);
}

function renderAlertas() {
  const yo = usuarioActual();
  const sos = datos.alerts.filter((a) => esDeMiGrupo(a));
  const pendientes = sos.filter((a) => a.status === "ACTIVE");
  const historial = sos.filter((a) => a.status !== "ACTIVE");
  const notifs = datos.notifications
    .filter((n) => n.userId === yo.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let html = `
    <div class="titulo-panel">Alertas</div>
    <div class="subtitulo-panel">SOS activos y notificaciones de tu círculo.</div>
    <div class="seccion-alertas"><h3>🚨 SOS activos</h3>`;
  if (!pendientes.length) html += `<div class="tarjeta texto-suave">No hay alertas SOS activas. Todo en calma.</div>`;
  pendientes.forEach((a) => {
    const emisor = usuarioPorId(a.senderId);
    const grupo = grupoPorId(a.groupId);
    html += `
      <div class="tarjeta" style="border-color:var(--peligro)">
        <div class="tarjeta-fila">
          <div class="avatar-miembro" style="background:var(--peligro)">SOS</div>
          <div style="flex:1">
            <strong>${esc(emisor ? emisor.name : "Miembro")}</strong>
            <div class="texto-suave">${esc(a.message)}</div>
            <div class="texto-suave">${grupo ? esc(grupo.name) : ""} · ${fmtAgo(a.sentAt)}</div>
          </div>
        </div>
        <div class="fila-acciones">
          <button class="btn btn-secundario" onclick="abrirWaze(${a.lat}, ${a.lng})">Ir a donde está</button>
          <button class="btn btn-primario" onclick="resolverSos('${a.id}')">Marcar resuelto</button>
        </div>
      </div>`;
  });
  html += `</div><div class="seccion-alertas"><h3>Historial SOS</h3>`;
  if (!historial.length) html += `<div class="tarjeta texto-suave">Sin historial aún.</div>`;
  historial.forEach((a) => {
    const emisor = usuarioPorId(a.senderId);
    html += `
      <div class="tarjeta">
        <div class="tarjeta-fila">
          <div class="avatar-miembro">SOS</div>
          <div style="flex:1">
            <strong>${esc(emisor ? emisor.name : "Miembro")}</strong>
            <div class="texto-suave">${esc(a.message)} · ${fmtAgo(a.sentAt)}</div>
          </div>
          <span class="chip chip-exito">RESUELTO</span>
        </div>
      </div>`;
  });
  html += `</div><div class="seccion-alertas"><h3>🔔 Notificaciones</h3>`;
  html += `<div class="fila-acciones"><button class="btn btn-conexo" onclick="marcarTodasLeidas()">Marcar todas como leídas</button></div>`;
  if (!notifs.length) html += `<div class="contenedor-vacio"><span class="icono">🔔</span>Sin notificaciones.</div>`;
  notifs.forEach((n) => {
    html += `
      <div class="tarjeta fila-notificacion ${n.read ? "" : "no-leida"}">
        <span class="icono-notificacion">${n.type === "SOS" ? "🚨" : "ℹ️"}</span>
        <div style="flex:1">
          <strong>${esc(n.title)}</strong>
          <div class="texto-suave">${esc(n.body)}</div>
          <div class="texto-suave">${fmtAgo(n.createdAt)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${n.read ? "" : `<button class="btn btn-conexo" onclick="marcarLeida('${n.id}')">Leída</button>`}
          <button class="btn btn-peligro" onclick="borrarNotificacion('${n.id}')">✕</button>
        </div>
      </div>`;
  });
  html += `</div>`;

  html += `
    <div class="seccion-alertas">
      <h3>🧪 Simulación para presentar</h3>
      <div class="tarjeta">
        <div class="texto-suave">Genera una alerta SOS desde un miembro simulado para mostrar el flujo en vivo.</div>
        <div class="fila-acciones">
          <button class="btn btn-secundario" onclick="simularSosDeBrian()">SOS desde Brian</button>
        </div>
      </div>
    </div>`;

  $("#contenidoAlertas").innerHTML = html;
}

function resolverSos(id) {
  const a = datos.alerts.find((x) => x.id === id);
  if (!a) return;
  a.status = "RESOLVED";
  a.resolvedAt = fechaISO();
  salvarDatos();
  renderAlertas();
  actualizarBadge();
  mostrarToast("SOS marcado como resuelto.", "exito");
}

function marcarLeida(id) {
  const n = datos.notifications.find((x) => x.id === id);
  if (n) { n.read = true; salvarDatos(); renderAlertas(); actualizarBadge(); }
}

function marcarTodasLeidas() {
  const yo = usuarioActual();
  datos.notifications.forEach((n) => { if (n.userId === yo.id) n.read = true; });
  salvarDatos();
  renderAlertas();
  actualizarBadge();
  mostrarToast("Notificaciones marcadas como leídas.", "exito");
}

function borrarNotificacion(id) {
  datos.notifications = datos.notifications.filter((n) => n.id !== id);
  salvarDatos();
  renderAlertas();
  actualizarBadge();
}

function simularSosDeBrian() {
  const yo = usuarioActual();
  const grupo = gruposDe(yo.id)[0];
  if (!grupo) { mostrarToast("Necesitas un grupo para la simulación.", "aviso"); return; }
  const brian = usuarioPorId("u-brian");
  const pos = vivo["u-brian"] || { lat: POSICION_BASE.lat + 0.01, lng: POSICION_BASE.lng - 0.01 };
  datos.alerts.push({
    id: uuid(), groupId: grupo.id, senderId: brian.id,
    message: "Necesito ayuda en mi ubicación.",
    lat: pos.lat, lng: pos.lng, status: "ACTIVE", sentAt: fechaISO()
  });
  datos.notifications.push({
    id: uuid(), userId: yo.id, type: "SOS",
    title: "SOS de Brian López",
    body: "Envió una alerta desde el mapa.",
    read: false, createdAt: fechaISO()
  });
  salvarDatos();
  renderAlertas();
  actualizarBadge();
  mostrarToast("SOS simulado generado.", "exito");
}

function actualizarBadge() {
  const yo = usuarioActual();
  if (!yo) { $("#badgeAlertas").classList.add("oculta"); return; }
  const noLeidas = datos.notifications.filter((n) => n.userId === yo.id && !n.read).length;
  const activos = datos.alerts.filter((a) => a.status === "ACTIVE" && esDeMiGrupo(a)).length;
  const total = noLeidas + activos;
  const b = $("#badgeAlertas");
  if (total > 0) { b.textContent = total; b.classList.remove("oculta"); }
  else b.classList.add("oculta");
}

// ============================ PERFIL ============================

function renderPerfil() {
  const yo = usuarioActual();
  let html = `
    <div class="titulo-panel">Mi perfil</div>
    <div class="subtitulo-panel">${esc(yo.email)}</div>
    <div class="tarjeta">
      <div class="tarjeta-fila">
        <div class="avatar-miembro">${iniciales(yo.name)}</div>
        <div style="flex:1">
          <strong>${esc(yo.name)}</strong>
          <div class="texto-suave">Miembro desde ${fmtFecha(yo.createdAt)}</div>
        </div>
      </div>
    </div>
    <div class="tarjeta">
      <label>Nombre</label>
      <input id="perfilNombre" value="${esc(yo.name)}">
      <label>Teléfono (opcional)</label>
      <input id="perfilTelefono" value="${esc(yo.phone || "")}" placeholder="Ej. 555 010 2828">
      <div class="fila-acciones">
        <button class="btn btn-primario" onclick="guardarPerfil()">Guardar cambios</button>
      </div>
    </div>
    <div class="tarjeta interruptor">
      <div class="texto-interruptor">
        <strong>Compartir mi ubicación</strong>
        <div class="texto-suave">Si lo desactivas, tu círculo no podrá verte en el mapa.</div>
      </div>
      <button class="switch ${yo.shareLocation ? "encendido" : ""}" onclick="alternarCompartir()"></button>
    </div>
    <div class="tarjeta">
      <div class="titulo-panel" style="font-size:17px">Historial de ubicación</div>
      <div class="texto-suave">Registro de tus posiciones. Es solo tuyo y puedes borrarlo cuando quieras.</div>
      <div class="fila-acciones">
        <button class="btn btn-conexo" onclick="verHistorial()">Ver historial</button>
        <button class="btn btn-peligro" onclick="borrarHistorial()">Borrar</button>
      </div>
    </div>
    <div class="fila-acciones">
      <button class="btn btn-secundario" onclick="salirApp()">Cerrar sesión</button>
      <button class="btn btn-peligro" onclick="borrarCuentaConfirm()">Borrar mi cuenta</button>
    </div>
    <div class="contenedor-vacio">
      <div class="logo-nudo" style="margin:0 auto 8px">
        <svg viewBox="0 0 64 64" style="width:40px;height:40px">
          <circle cx="20" cy="20" r="12" fill="#F05454"/>
          <circle cx="44" cy="20" r="12" fill="#D94646"/>
          <circle cx="32" cy="40" r="12" fill="#F05454"/>
        </svg>
      </div>
      <div class="texto-suave">NEXO v1.0 · HTML + CSS + JavaScript<br>Mapa: Leaflet + OpenStreetMap</div>
    </div>`;
  $("#contenidoPerfil").innerHTML = html;
}

function guardarPerfil() {
  const yo = usuarioActual();
  yo.name = $("#perfilNombre").value.trim() || yo.name;
  yo.phone = $("#perfilTelefono").value.trim();
  salvarDatos();
  renderPerfil();
  $("#textoEnVivo").textContent = yo.name;
  if (marcadores["yo"]) {
    mapa.removeLayer(marcadores["yo"]);
    delete marcadores["yo"];
    if (yo.shareLocation && miPos) crearMarca("yo", yo.name, true);
  }
  mostrarToast("Perfil actualizado.", "exito");
}

function alternarCompartir() {
  const yo = usuarioActual();
  yo.shareLocation = !yo.shareLocation;
  if (yo.shareLocation) {
    comenzarMiUbicacion();
    if (!miPos) usarPosicionPorDefecto();
    mostrarToast("Ahora tu círculo puede verte.", "exito");
  } else {
    detenerMiUbicacion();
    mostrarToast("Tu ubicación está oculta.", "aviso");
  }
  actualizarMarcadores();
  actualizarBannerPrivacidad();
  renderPerfil();
}

function actualizarBannerPrivacidad() {
  const yo = usuarioActual();
  $("#bannerPrivacidad").classList.toggle("oculta", !yo || yo.shareLocation);
}

function verHistorial() {
  const yo = usuarioActual();
  const puntos = yo.points || [];
  let filas;
  if (!puntos.length) {
    filas = `<div class="contenedor-vacio"><span class="icono">🗺️</span>Aún no hay registros.</div>`;
  } else {
    filas = puntos.slice().reverse().slice(0, 50).map((p) => `
      <div class="tarjeta fila-notificacion">
        <div style="flex:1">
          <strong>${fmtHora(p.t)}</strong>
          <div class="texto-suave">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
        </div>
        <button class="btn btn-secundario" onclick="cerrarModal(); abrirWaze(${p.lat}, ${p.lng})">Waze</button>
      </div>`).join("");
  }
  abrirModal(`
    <h2>Historial de ubicación (${puntos.length})</h2>
    <div class="texto-suave">Se muestran los 50 registros más recientes.</div>
    <div style="margin-top:10px">${filas}</div>
    <div class="fila-acciones">
      <button class="btn btn-conexo" onclick="cerrarModal()">Cerrar</button>
    </div>`);
}

function borrarHistorial() {
  if (!confirm("¿Borrar todo tu historial de ubicación?")) return;
  usuarioActual().points = [];
  salvarDatos();
  mostrarToast("Historial borrado.", "exito");
}

function borrarCuentaConfirm() {
  if (!confirm("Se borrará tu cuenta, tus grupos y tus lugares. ¿Continuar?")) return;
  const yo = usuarioActual();
  datos.users = datos.users.filter((u) => u.id !== yo.id);
  datos.groups = datos.groups.filter((g) => g.ownerId !== yo.id);
  datos.places = datos.places.filter((p) => p.userId !== yo.id);
  salirApp();
  mostrarToast("Cuenta eliminada.", "aviso");
}

// ============================ EVENTOS E INICIO ============================

function bindEvents() {
  $("#formLogin").addEventListener("submit", (e) => { e.preventDefault(); iniciarSesion(); });
  $("#formRegistro").addEventListener("submit", (e) => { e.preventDefault(); registrarUsuario(); });
  $("#btnDemo").addEventListener("click", () => entrarComo("u-alicia"));
  $("#linkRegistro").addEventListener("click", (e) => {
    e.preventDefault();
    $("#vistaLogin").classList.add("oculta");
    $("#vistaRegistro").classList.remove("oculta");
    $("#regError").textContent = "";
  });
  $("#linkLogin").addEventListener("click", (e) => {
    e.preventDefault();
    $("#vistaRegistro").classList.add("oculta");
    $("#vistaLogin").classList.remove("oculta");
    $("#loginError").textContent = "";
  });
  $("#linkOlvide").addEventListener("click", (e) => {
    e.preventDefault();
    mostrarToast("En la demo usa la contraseña demo123", "aviso");
  });
  $$(".tab").forEach((t) => t.addEventListener("click", () => mostrarVista(t.dataset.vista)));
  $("#btnSos").addEventListener("click", abrirModalSos);
  $("#btnCentrar").addEventListener("click", centrarEnMi);
  $("#btnAjustar").addEventListener("click", ajustarVista);
  $("#tapete").addEventListener("click", cerrarModal);
}

function iniciar() {
  bindEvents();
  if (usuarioActual()) entrarApp();
}

iniciar();