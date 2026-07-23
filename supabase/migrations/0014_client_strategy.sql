-- AdMind Analytics — 0014
-- Estrategia por cliente: una sola fila por cliente (a diferencia de
-- content_goals, que es por mes) con la política recurrente — cuotas
-- semanales de contenido, qué canales de pauta están activos, y el link +
-- métricas manuales de la landing (no conectamos Google Analytics todavía;
-- se carga a mano como el resto de las métricas de esta app).

create table if not exists client_strategy (
  client_id             uuid primary key references clients(id) on delete cascade,
  historias_x_semana    integer default 0,
  posts_x_semana        integer default 0,
  reels_x_semana        integer default 0,
  carruseles_x_semana   integer default 0,
  ads_instagram         boolean not null default false,
  ads_instagram_budget  numeric(12,2) default 0,
  ads_google            boolean not null default false,
  ads_google_budget     numeric(12,2) default 0,
  landing_url           text,
  landing_visits        integer default 0,
  landing_conversions   integer default 0,
  landing_notes         text,
  notes                 text,
  updated_at            timestamptz not null default now()
);

alter table client_strategy enable row level security;

create policy "authenticated full access" on client_strategy
  for all to authenticated using (true) with check (true);
