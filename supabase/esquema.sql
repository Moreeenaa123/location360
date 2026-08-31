-- ============================================================
-- NEXO · Esquema de base de datos para Supabase (PostgreSQL)
-- Ejecutar una sola vez en: proyecto → SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- Cuentas (1 fila por usuario; se crea sola al registrarse)
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default 'Usuario',
  telefono text default '',
  share_ubicacion boolean not null default false,
  created_at timestamptz not null default now()
);

-- Posición en vivo de cada usuario
create table public.ubicaciones (
  usuario_id uuid primary key references public.perfiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

-- Grupos (círculos)
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text default '',
  codigo text not null unique,
  propietario_id uuid not null references public.perfiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.miembros (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  rol text not null default 'MEMBER' check (rol in ('OWNER', 'ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

-- Lugares guardados
create table public.lugares (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null,
  categoria text default 'Otro',
  direccion text default '',
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

-- Alertas SOS
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  emisor_id uuid not null references public.perfiles (id) on delete cascade,
  mensaje text default '',
  lat double precision not null,
  lng double precision not null,
  estado text not null default 'ACTIVE' check (estado in ('ACTIVE', 'RESOLVED')),
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz
);

-- Notificaciones por usuario
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null default 'INFO',
  titulo text not null,
  cuerpo text default '',
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_grupos_codigo on public.grupos (codigo);
create index if not exists idx_alertas_grupo on public.alertas (grupo_id, estado);
create index if not exists idx_notificaciones_usuario on public.notificaciones (usuario_id);

-- ============================================================
-- Seguridad a nivel de fila (RLS): cada usuario puede editar lo
-- suyo y ver lo del círculo. Nivel académico.
-- ============================================================
alter table public.perfiles enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.grupos enable row level security;
alter table public.miembros enable row level security;
alter table public.lugares enable row level security;
alter table public.alertas enable row level security;
alter table public.notificaciones enable row level security;

create policy "leer perfiles" on public.perfiles for select to authenticated using (true);
create policy "crear propio perfil" on public.perfiles for insert to authenticated with check (id = auth.uid());
create policy "editar propio perfil" on public.perfiles for update to authenticated using (id = auth.uid());

create policy "leer ubicaciones" on public.ubicaciones for select to authenticated using (true);
create policy "reportar propia ubicacion" on public.ubicaciones for insert to authenticated with check (usuario_id = auth.uid());
create policy "actualizar propia ubicacion" on public.ubicaciones for update to authenticated using (usuario_id = auth.uid());

create policy "leer grupos" on public.grupos for select to authenticated using (true);
create policy "crear grupo" on public.grupos for insert to authenticated with check (propietario_id = auth.uid());
create policy "editar grupo" on public.grupos for update to authenticated using (propietario_id = auth.uid());
create policy "borrar grupo" on public.grupos for delete to authenticated using (propietario_id = auth.uid());

create policy "leer miembros" on public.miembros for select to authenticated using (true);
create policy "unirse al grupo" on public.miembros for insert to authenticated with check (usuario_id = auth.uid());
create policy "salir o administrar" on public.miembros for delete to authenticated using (true);

create policy "leer lugares" on public.lugares for select to authenticated using (true);
create policy "crear lugar" on public.lugares for insert to authenticated with check (usuario_id = auth.uid());
create policy "editar lugar propio" on public.lugares for update to authenticated using (usuario_id = auth.uid());
create policy "borrar lugar propio" on public.lugares for delete to authenticated using (usuario_id = auth.uid());

create policy "leer alertas" on public.alertas for select to authenticated using (true);
create policy "crear alerta" on public.alertas for insert to authenticated with check (emisor_id = auth.uid());
create policy "resolver alerta" on public.alertas for update to authenticated using (true);
create policy "borrar alerta" on public.alertas for delete to authenticated using (true);

create policy "enviar notificaciones" on public.notificaciones for insert to authenticated with check (true);
create policy "leer mis notificaciones" on public.notificaciones for select to authenticated using (usuario_id = auth.uid());
create policy "editar mis notificaciones" on public.notificaciones for update to authenticated using (usuario_id = auth.uid());
create policy "borrar mis notificaciones" on public.notificaciones for delete to authenticated using (usuario_id = auth.uid());

-- ============================================================
-- Al registrarse un usuario se crea su perfil automáticamente
-- ============================================================
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', 'Usuario'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.crear_perfil();