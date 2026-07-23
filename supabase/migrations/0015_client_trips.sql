-- AdMind Analytics — 0015
-- Viajes de producción de contenido (Café San Juan viaja seguido y filma/
-- genera contenido durante esos viajes). Un viaje tiene un rango de fechas
-- y una lista de metas de contenido a generar durante ese rango — mismo
-- shape de "items" que content_goals, para reusar la lógica de progreso.

create table if not exists client_trips (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  title        text not null,
  start_date   date not null,
  end_date     date not null,
  notes        text,
  items        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_client_trips_client_dates on client_trips(client_id, start_date);

alter table client_trips enable row level security;

create policy "authenticated full access" on client_trips
  for all to authenticated using (true) with check (true);
