-- AdMind Analytics — schema para banco de contenido, calendario, Meta Graph API y métricas
-- Reemplaza SEED_CLIENTS (src/data/seedClients.js) como fuente de verdad de clientes.

create extension if not exists "pgcrypto";

-- ── Clientes ──────────────────────────────────────────────────────
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  industry     text,
  avatar       text,
  color        text,
  created_at   timestamptz not null default now()
);

-- ── Cuentas de Meta por cliente (server-only, nunca se expone al browser) ──
-- Acceso restringido: solo Edge Functions con service_role deben leer/escribir esta tabla.
create table if not exists meta_accounts (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  ig_user_id         text not null,          -- Instagram Business/Creator user id
  fb_page_id         text not null,
  access_token       text not null,          -- token de larga duración (60 días)
  token_expires_at   timestamptz not null,
  status             text not null default 'active' check (status in ('active','expired','revoked','pending_setup')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (client_id)
);

-- ── Banco de fotos/diseños subidos (materia prima, sin overlay) ──
create table if not exists media_assets (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  kind          text not null check (kind in ('foto','diseno')),
  storage_path  text not null,           -- path dentro del bucket de Storage
  public_url    text not null,           -- URL pública (requerida por Meta para publicar)
  tags          text[] default '{}',
  uploaded_at   timestamptz not null default now()
);

-- ── Piezas generadas (historia o post, con overlay de texto ya aplicado) ──
create table if not exists piezas (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  source_asset_id uuid references media_assets(id) on delete set null,
  tipo            text not null check (tipo in ('historia','post')),
  image_url       text not null,          -- PNG final (foto + overlay) con URL pública
  overlay_text    text,
  caption         text,                   -- solo aplica a posts de feed
  estado          text not null default 'borrador'
                    check (estado in ('borrador','banco','programada','publicada','error')),
  scheduled_for   timestamptz,            -- cuándo debe publicarse
  meta_media_id   text,                   -- id devuelto por Meta al publicar
  published_at    timestamptz,
  error_detail    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_piezas_client_estado on piezas(client_id, estado);
create index if not exists idx_piezas_scheduled on piezas(scheduled_for) where estado = 'programada';

-- ── Videos externos (cargados a mano, no generados por la app) ──
create table if not exists videos_externos (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  titulo          text not null,
  video_url       text not null,          -- link externo o storage_path propio
  notas           text,
  estado          text not null default 'programado'
                    check (estado in ('programado','publicado')),
  scheduled_for   timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Vista unificada para el calendario mensual por cliente ──
create or replace view calendario_items as
  select id, client_id, tipo::text as tipo, estado, scheduled_for, published_at,
         image_url as preview_url, caption
    from piezas
  union all
  select id, client_id, 'video_externo' as tipo, estado, scheduled_for, published_at,
         video_url as preview_url, titulo as caption
    from videos_externos;

-- ── Métricas post-publicación (vía Instagram Insights) ──
create table if not exists metricas_piezas (
  id           uuid primary key default gen_random_uuid(),
  pieza_id     uuid not null references piezas(id) on delete cascade,
  reach        integer,
  likes        integer,
  comments     integer,
  saves        integer,
  shares       integer,
  plays        integer,          -- para reels/historias con video
  fetched_at   timestamptz not null default now()
);

create index if not exists idx_metricas_pieza on metricas_piezas(pieza_id, fetched_at desc);

-- ── RLS ───────────────────────────────────────────────────────────
-- Habilitar RLS ni bien esté Supabase Auth en pie (Tarea #3). Hasta entonces
-- estas tablas quedan sin políticas — NO deployar a producción así.
alter table clients          enable row level security;
alter table meta_accounts    enable row level security;
alter table media_assets     enable row level security;
alter table piezas           enable row level security;
alter table videos_externos  enable row level security;
alter table metricas_piezas  enable row level security;

-- meta_accounts: ninguna policy para 'anon'/'authenticated' — solo service_role
-- (usado por Edge Functions) puede tocar esta tabla. Las demás tablas necesitan
-- policies por usuario/agencia una vez que Supabase Auth esté andando.
