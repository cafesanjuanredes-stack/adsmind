-- AdMind Analytics — 0002
-- Ajusta el schema para bucket de Storage PRIVADO (no público), agrega
-- políticas de RLS para usuarios autenticados (herramienta interna, sin
-- signup público — los usuarios se crean a mano en el dashboard) y carga
-- los 4 clientes reales.

-- ── Storage privado: ya no guardamos "public_url" permanente ────────
-- Las URLs para mostrar en la app y para publicar en Meta se generan
-- al vuelo con createSignedUrl() (vencen a los pocos minutos).
alter table media_assets drop column if exists public_url;
alter table piezas rename column image_url to storage_path;

-- Recrear la vista con el nombre de columna actualizado
drop view if exists calendario_items;
create or replace view calendario_items as
  select id, client_id, tipo::text as tipo, estado, scheduled_for, published_at,
         storage_path as preview_path, caption
    from piezas
  union all
  select id, client_id, 'video_externo' as tipo, estado, scheduled_for, published_at,
         video_url as preview_path, titulo as caption
    from videos_externos;

-- ── Políticas RLS: cualquier usuario autenticado (auth real, sin signup
-- público) puede leer/escribir. No es multi-tenant por cliente: es una
-- sola agencia operando los 4 clientes. meta_accounts NO recibe policy
-- acá a propósito — solo service_role (Edge Functions) la toca.
create policy "authenticated full access" on clients
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on media_assets
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on piezas
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on videos_externos
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on metricas_piezas
  for all to authenticated using (true) with check (true);

-- ── Storage: bucket "content" privado, solo autenticados ────────────
create policy "authenticated read content" on storage.objects
  for select to authenticated using (bucket_id = 'content');

create policy "authenticated upload content" on storage.objects
  for insert to authenticated with check (bucket_id = 'content');

create policy "authenticated update content" on storage.objects
  for update to authenticated using (bucket_id = 'content');

create policy "authenticated delete content" on storage.objects
  for delete to authenticated using (bucket_id = 'content');

-- ── Clientes reales de AdsMind ───────────────────────────────────────
insert into clients (name, industry, avatar, color) values
  ('Café San Juan',     'Gastronomía', 'CSJ', '#F59E0B'),
  ('Lele Cristobal',    'Personal / Marca', 'LC',  '#EC4899'),
  ('Mr Green Coffee',   'Gastronomía', 'MGC', '#10B981'),
  ('Estudio Gilmore',   'Servicios',   'EG',  '#8B5CF6')
on conflict do nothing;
