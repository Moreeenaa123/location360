// ============================================================
// NEXO · Adaptador de base de datos en la nube (Supabase)
// Si no hay credenciales configuradas, la app usa cuentas locales
// de prueba (localStorage).
// ============================================================

window.NUBE = (function () {
  const cfg = window.NEXO_CONFIG || {};
  const cliente = (window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey)
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  const activo = !!cliente;

  async function inicioSesion(correo, clave) {
    const r = await cliente.auth.signInWithPassword({ email: correo, password: clave });
    if (r.error) throw new Error("Correo o contraseña incorrectos.");
  }

  async function registro(nombre, correo, clave) {
    const r = await cliente.auth.signUp({
      email: correo,
      password: clave,
      options: { data: { nombre } }
    });
    if (r.error) {
      if (r.error.message.toLowerCase().includes("already registered")) throw new Error("Ese correo ya está registrado.");
      throw new Error(r.error.message);
    }
    return !!r.data.session;
  }

  async function cerrarSesion() {
    await cliente.auth.signOut();
  }

  async function cargarTodo() {
    const tablas = ["perfiles", "ubicaciones", "grupos", "miembros", "lugares", "alertas", "notificaciones"];
    const resultado = await Promise.all(tablas.map((t) => cliente.from(t).select("*")));
    const error = resultado.map((x) => x.error).find(Boolean);
    if (error) throw new Error(error.message);
    return {
      perfiles: resultado[0].data,
      ubicaciones: resultado[1].data,
      grupos: resultado[2].data,
      miembros: resultado[3].data,
      lugares: resultado[4].data,
      alertas: resultado[5].data,
      notificaciones: resultado[6].data
    };
  }

  function insert(tabla, fila) {
    return cliente.from(tabla).insert(fila);
  }

  function actualizar(tabla, campos, columna, valor) {
    return cliente.from(tabla).update(campos).eq(columna, valor);
  }

  function borrar(tabla, columna, valor) {
    return cliente.from(tabla).delete().eq(columna, valor);
  }

  function remove(tabla, condiciones) {
    return cliente.from(tabla).delete().match(condiciones);
  }

  async function reportarUbicacion(usuarioId, lat, lng) {
    const r = await cliente.from("ubicaciones").upsert({
      usuario_id: usuarioId,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      updated_at: new Date().toISOString(),
      on_conflict: "usuario_id"
    }, { onConflict: "usuario_id" });
    if (r.error) throw r.error;
  }

  async function guardarPerfil(usuarioId, campos) {
    const r = await actualizar("perfiles", campos, "id", usuarioId);
    if (r.error) throw r.error;
  }

  let canal = null;

  function conectarEnVivo(onCambio) {
    if (canal) return;
    canal = cliente.channel("nexo-en-vivo");
    canal
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ubicaciones" }, (pc) => onCambio({ tipo: "ubicacion", dato: pc.new }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertas" }, (pc) => onCambio({ tipo: "sos", dato: pc.new }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, (pc) => onCambio({ tipo: "notificacion", dato: pc.new }))
      .on("postgres_changes", { event: "*", schema: "public", table: "miembros" }, (pc) => onCambio({ tipo: "miembro", dato: pc.new }))
      .subscribe();
  }

  function desconectarEnVivo() {
    if (canal) { canal.unsubscribe(); canal = null; }
  }

  return {
    activo, cliente,
    inicioSesion, registro, cerrarSesion,
    cargarTodo, insert, actualizar, borrar, remove,
    reportarUbicacion, guardarPerfil,
    conectarEnVivo, desconectarEnVivo,
    nuevoId: () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : uuid())
  };
})();