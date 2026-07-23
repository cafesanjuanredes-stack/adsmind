-- AdMind Analytics — 0013
-- Dos tablas nuevas, ambas de carga manual (mismo criterio que
-- client_competitors/client_virals — no dependen de ningún permiso nuevo
-- de Meta, así que funcionan ya para los 4 clientes):
--
--  · client_ads: registro de campañas publicitarias (pauta) por cliente,
--    para calcular CPM/CPC/CTR y comparar campañas entre sí.
--  · content_goals: plan de producción mensual por cliente — una lista
--    de metas ("20 historias", "4 reels", "cobertura día del amigo") que
--    el calendario cruza contra lo que ya está en banco/programado/
--    publicado ese mes para mostrar cuánto falta.

create table if not exists client_ads (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  platform      text not null,              -- 'instagram'|'facebook'|'tiktok'|...
  name          text not null,
  objective     text,                       -- ej: 'Alcance', 'Tráfico', 'Conversiones'
  start_date    date,
  end_date      date,
  spend         numeric(12,2) default 0,
  reach         integer default 0,
  clicks        integer default 0,
  conversions   integer default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_client_ads_client on client_ads(client_id, start_date desc);

-- items: [{ "id": "...", "label": "20 historias", "tipo": "historia"|null,
--           "qty_target": 20, "done": false }]
create table if not exists content_goals (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  month         text not null,              -- 'YYYY-MM'
  items         jsonb not null default '[]'::jsonb,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id, month)
);

alter table client_ads     enable row level security;
alter table content_goals  enable row level security;

create policy "authenticated full access" on client_ads
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on content_goals
  for all to authenticated using (true) with check (true);
