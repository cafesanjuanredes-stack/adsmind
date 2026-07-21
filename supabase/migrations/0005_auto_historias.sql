-- AdMind Analytics — 0005
-- Soporte para historias 100% automáticas: la app elige sola del banco
-- y programa, sin que Candelaria tenga que estar semana a semana.
-- Los posts (feed) siguen siendo selección manual — solo historias
-- se auto-rotan.

alter table client_platforms
  add column if not exists auto_historias      boolean not null default false,
  add column if not exists historias_per_week  integer not null default 2;

alter table piezas
  add column if not exists auto_picked boolean not null default false;

-- Activar auto-historias para Café San Juan y Mr Green Coffee en Instagram
-- (los dos clientes con publicación automática vía Meta). Lele y el resto
-- quedan en manual.
update client_platforms set auto_historias = true, historias_per_week = 2
where platform = 'instagram'
  and client_id in (
    select id from clients where name in ('Café San Juan', 'Mr Green Coffee')
  );

-- Índice para que el picker encuentre rápido "historias sin usar, más viejas primero"
create index if not exists idx_piezas_auto_pick
  on piezas (client_id, tipo, estado, created_at)
  where tipo = 'historia' and estado = 'banco';
