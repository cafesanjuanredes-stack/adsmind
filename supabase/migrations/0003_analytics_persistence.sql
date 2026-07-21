-- AdMind Analytics — 0003
-- Persiste en Supabase todo lo que hasta ahora vivía solo en memoria del
-- browser (se perdía al refrescar): plataformas/redes por cliente,
-- histórico de seguidores, posts virales, competidores, y contenido/
-- sentimiento. Esto es la base para poder comparar métricas reales
-- (baseline) contra lo que rinda cada pieza publicada más adelante.

-- ── Plataformas / redes por cliente ─────────────────────────────────
-- Reemplaza el objeto fijo de 4 plataformas: ahora cada cliente tiene
-- las que realmente usa (instagram, tiktok, facebook, youtube, twitter),
-- con su link/handle propio para poder abrir la cuenta y, a futuro,
-- sincronizar seguidores automáticamente donde haya API disponible.
create table if not exists client_platforms (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id) on delete cascade,
  platform         text not null check (platform in ('instagram','tiktok','facebook','youtube','twitter')),
  handle           text,
  profile_url      text,
  followers        integer not null default 0,
  posts            integer not null default 0,
  reach_pct        numeric not null default 0,
  engagement_pct   numeric not null default 0,
  views_avg        integer not null default 0,
  views_viral      integer not null default 0,
  freq_week        numeric not null default 0,
  video_dur        integer not null default 0,
  completion_pct   numeric not null default 0,
  saves_avg        integer not null default 0,
  shares_avg       integer not null default 0,
  status           text not null default 'warn' check (status in ('active','warn','dead')),
  notes            text not null default '',
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  unique (client_id, platform)
);

-- ── Histórico de seguidores (Instagram, por ahora la referencia principal) ──
create table if not exists client_history (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  date         text not null,   -- 'YYYY-MM'
  followers    integer not null,
  milestone    text,
  created_at   timestamptz not null default now()
);

-- ── Posts virales históricos ─────────────────────────────────────────
create table if not exists client_virals (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  title        text not null,
  platform     text not null check (platform in ('instagram','tiktok','facebook','youtube','twitter')),
  date         text,
  views        integer not null default 0,
  likes        integer not null default 0,
  comments     integer not null default 0,
  type         text,
  created_at   timestamptz not null default now()
);

-- ── Competidores (benchmark) ─────────────────────────────────────────
create table if not exists client_competitors (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  name           text not null,
  handle         text,
  followers_ig   integer not null default 0,
  type           text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ── Contenido (qué funciona/no) + sentimiento + ads — 1 fila por cliente ──
create table if not exists client_meta (
  client_id            uuid primary key references clients(id) on delete cascade,
  content_works        text[] not null default '{}',
  content_fails        text[] not null default '{}',
  best_days            text[] not null default '{}',
  best_time            text,
  sentiment_positive   numeric not null default 0,
  sentiment_neutral    numeric not null default 0,
  sentiment_negative   numeric not null default 0,
  ads                  jsonb,
  updated_at           timestamptz not null default now()
);

-- ── RLS: mismo criterio que el resto — solo usuarios autenticados ───
alter table client_platforms   enable row level security;
alter table client_history     enable row level security;
alter table client_virals      enable row level security;
alter table client_competitors enable row level security;
alter table client_meta        enable row level security;

create policy "authenticated full access" on client_platforms   for all to authenticated using (true) with check (true);
create policy "authenticated full access" on client_history     for all to authenticated using (true) with check (true);
create policy "authenticated full access" on client_virals      for all to authenticated using (true) with check (true);
create policy "authenticated full access" on client_competitors for all to authenticated using (true) with check (true);
create policy "authenticated full access" on client_meta        for all to authenticated using (true) with check (true);

-- ── Carga inicial de redes reales por cliente ────────────────────────
-- Solo el link/handle. Los números (seguidores, engagement, etc.) se
-- completan a mano desde la pestaña Plataformas — ahí mismo se van a
-- poder editar y volver a chequear "de vez en cuando".
insert into client_platforms (client_id, platform, handle, profile_url)
select id, 'instagram', null, null from clients where name = 'Café San Juan'
union all
select id, 'youtube',   null, null from clients where name = 'Café San Juan'
union all
select id, 'tiktok',    null, null from clients where name = 'Lele Cristobal'
union all
select id, 'instagram', null, null from clients where name = 'Lele Cristobal'
union all
select id, 'tiktok',    null, null from clients where name = 'Mr Green Coffee'
union all
select id, 'instagram', null, null from clients where name = 'Mr Green Coffee'
union all
select id, 'twitter',   null, null from clients where name = 'Mr Green Coffee'
on conflict do nothing;
