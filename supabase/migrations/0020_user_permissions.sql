-- AdMind Analytics — 0020
-- Sistema de permisos por usuario. Hasta ahora cualquier usuario logueado
-- (Supabase Auth) veía y podía editar TODOS los clientes y TODOS los
-- módulos — no había restricción real, solo la UI mostraba todo.
--
-- Esto agrega una tabla user_permissions: si un usuario NO tiene fila acá,
-- sigue viendo todo (admin, comportamiento actual, sin cambios — así
-- sigue Candelaria). Si SÍ tiene una fila, queda restringido a los
-- client_ids que se le asignen (a nivel de base de datos, con RLS real,
-- no solo ocultando cosas en el front) y a los módulos indicados (esto
-- último es solo a nivel UI — dentro de "su" cliente no hay compartimentos
-- estancos por módulo, ver nota más abajo).
--
-- Las filas de esta tabla se cargan a mano desde el SQL Editor o el
-- dashboard de Supabase (mismo criterio que la creación de usuarios:
-- no hay UI de "invitar usuario" en la app).

create table if not exists public.user_permissions (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  client_ids  uuid[],              -- null = todos los clientes (admin)
  modules     text[],              -- null = todos los módulos; si no, ej. '{generador,calendario}'
  created_at  timestamptz not null default now()
);

alter table public.user_permissions enable row level security;

-- Cada usuario puede leer su propia fila (el frontend la usa para saber
-- qué mostrar). Nadie escribe esta tabla desde el navegador.
create policy "users read own permissions"
  on public.user_permissions for select
  to authenticated
  using (auth.uid() = user_id);

-- ── Helpers ──────────────────────────────────────────────────────────
-- uuid[] de clientes permitidos para el usuario actual. NULL = sin
-- restricción (admin, o usuario sin fila en user_permissions).
create or replace function public.allowed_client_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select client_ids from public.user_permissions where user_id = auth.uid();
$$;

-- Convierte texto a uuid sin explotar si no matchea (para paths de
-- Storage: el primer segmento debería ser un client_id, pero no queremos
-- que un path con forma rara tire error en vez de simplemente no matchear).
create or replace function public.safe_uuid(txt text)
returns uuid
language sql
immutable
as $$
  select case
    when txt ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then txt::uuid else null
  end;
$$;

-- ── Tablas con client_id (columna directa) ──────────────────────────
-- Reemplaza "authenticated full access" (using true) por una versión
-- que respeta allowed_client_ids(). Para un admin (sin fila en
-- user_permissions) esto sigue siendo exactamente "using (true)".
do $$
declare
  t text;
  col text;
begin
  for t, col in select * from (values
    ('clients', 'id'),
    ('media_assets', 'client_id'),
    ('piezas', 'client_id'),
    ('videos_externos', 'client_id'),
    ('client_platforms', 'client_id'),
    ('client_history', 'client_id'),
    ('client_virals', 'client_id'),
    ('client_competitors', 'client_id'),
    ('client_meta', 'client_id'),
    ('content_tasks', 'client_id'),
    ('client_ads', 'client_id'),
    ('content_goals', 'client_id'),
    ('client_strategy', 'client_id'),
    ('client_trips', 'client_id')
  ) as x(t, col)
  loop
    execute format('drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated scoped access" on %I for all to authenticated
         using (public.allowed_client_ids() is null or %I = any(public.allowed_client_ids()))
         with check (public.allowed_client_ids() is null or %I = any(public.allowed_client_ids()));',
      t, col, col
    );
  end loop;
end $$;

-- ── metricas_piezas: no tiene client_id propio, se scopea vía piezas ──
drop policy if exists "authenticated full access" on metricas_piezas;
create policy "authenticated scoped access" on metricas_piezas
  for all to authenticated
  using (
    public.allowed_client_ids() is null
    or pieza_id in (select id from piezas where client_id = any(public.allowed_client_ids()))
  )
  with check (
    public.allowed_client_ids() is null
    or pieza_id in (select id from piezas where client_id = any(public.allowed_client_ids()))
  );

-- ── Storage: bucket "content", scopeado por el primer segmento del path
-- (los uploads ya usan `${clientId}/...` como prefijo — ver src/lib/storage.js
-- y src/lib/brand.js) ────────────────────────────────────────────────
drop policy if exists "authenticated read content" on storage.objects;
drop policy if exists "authenticated upload content" on storage.objects;
drop policy if exists "authenticated update content" on storage.objects;
drop policy if exists "authenticated delete content" on storage.objects;

create policy "scoped read content" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'content' and (
      public.allowed_client_ids() is null
      or public.safe_uuid((storage.foldername(name))[1]) = any(public.allowed_client_ids())
    )
  );

create policy "scoped upload content" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content' and (
      public.allowed_client_ids() is null
      or public.safe_uuid((storage.foldername(name))[1]) = any(public.allowed_client_ids())
    )
  );

create policy "scoped update content" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'content' and (
      public.allowed_client_ids() is null
      or public.safe_uuid((storage.foldername(name))[1]) = any(public.allowed_client_ids())
    )
  );

create policy "scoped delete content" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content' and (
      public.allowed_client_ids() is null
      or public.safe_uuid((storage.foldername(name))[1]) = any(public.allowed_client_ids())
    )
  );

-- NOTA sobre módulos: la columna `modules` de user_permissions solo se usa
-- en el frontend (App.jsx) para decidir qué pestañas mostrar. No hay una
-- pared de RLS por módulo — un usuario restringido a "generador,calendario"
-- sigue teniendo, a nivel de base, los mismos permisos que un admin PERO
-- solo dentro de los client_ids que se le asignaron. Es decir: no puede
-- ver ni tocar ningún dato de otro cliente bajo ninguna circunstancia
-- (eso sí es un límite real, a nivel de base), pero si abre las devtools
-- y llama a Supabase directamente podría leer/escribir otras tablas de
-- SU PROPIO cliente aunque no aparezcan en su menú (por ejemplo client_ads
-- de Café San Juan). Para este caso de uso (dar de alta a alguien del
-- propio equipo de Café San Juan) no hace falta más que eso.
