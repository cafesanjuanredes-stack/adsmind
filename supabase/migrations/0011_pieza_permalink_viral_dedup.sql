-- AdMind Analytics — 0011
-- Guarda el permalink real de Instagram en la pieza publicada (lo devuelve
-- la Graph API al consultar métricas) y agrega un link a client_virals
-- hacia la pieza de origen, para poder distinguir los virales que la app
-- detectó sola (por métricas reales) de los cargados a mano, y evitar
-- duplicarlos cada vez que corre el cron de insights.

alter table piezas
  add column if not exists permalink text;

alter table client_virals
  add column if not exists pieza_id uuid references piezas(id) on delete set null;

create unique index if not exists idx_client_virals_pieza_unique
  on client_virals(pieza_id) where pieza_id is not null;
