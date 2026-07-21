-- AdMind Analytics — 0006
-- Sugerencias de fotos/diseños generadas por IA (OpenAI), cada ~3 días,
-- como punto de partida para el Generador. No entran directo al banco:
-- Candelaria las revisa y decide "usar" (pasa a media_assets) o
-- "descartar" (se borra del Storage). Ver supabase/functions/generate-ai-suggestions.

create table if not exists ai_suggestions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  storage_path  text not null,        -- path dentro del bucket "content"
  prompt        text,                 -- prompt usado para generarla (referencia/debug)
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente','usada','descartada')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_ai_suggestions_client
  on ai_suggestions (client_id, estado, created_at desc);

-- ── RLS: mismo criterio que el resto — solo usuarios autenticados ───
alter table ai_suggestions enable row level security;

create policy "authenticated full access" on ai_suggestions
  for all to authenticated using (true) with check (true);
