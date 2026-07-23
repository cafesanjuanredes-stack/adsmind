-- AdMind Analytics — 0012
-- Tareas de planificación de contenido (filmación, eventos especiales) que
-- se ven en el Calendario pero NO son piezas listas para publicar — son
-- pendientes/recordatorios ("Filmar reel para el finde largo", "Cobertura
-- evento apertura"), que se pueden tildar como hechas y opcionalmente
-- convertir después en una pieza real del banco.

create table if not exists content_tasks (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  platform     text,                     -- 'instagram'|'tiktok'|... o null = todas las redes
  kind         text not null default 'filmacion'
                 check (kind in ('filmacion','evento')),
  title        text not null,
  description  text,
  due_date     date not null,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_content_tasks_client_due on content_tasks(client_id, due_date);

alter table content_tasks enable row level security;

create policy "authenticated full access" on content_tasks
  for all to authenticated using (true) with check (true);
