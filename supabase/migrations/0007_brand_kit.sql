-- AdMind Analytics — 0007
-- Kit de marca por cliente: tipografía y colores propios para el overlay
-- del Generador. Sin esto, todas las piezas salían con la misma fuente
-- genérica — ahora cada cliente tiene la suya.

alter table client_meta
  add column if not exists brand_font_source text not null default 'google' check (brand_font_source in ('google','custom')),
  add column if not exists brand_font_family text not null default 'Inter',
  add column if not exists brand_font_path   text,       -- storage path si subió su propia fuente (.woff2/.ttf/.otf)
  add column if not exists brand_text_color  text not null default '#FFFFFF',
  add column if not exists brand_bg_color    text not null default '#000000';

-- Café San Juan ya tiene marca real (de su presentación): Archivo Black +
-- naranja de marca (#D4642A). El resto arranca en default hasta que
-- Candelaria cargue la suya desde "🎨 Marca" en el Generador.
insert into client_meta (client_id, brand_font_source, brand_font_family, brand_text_color, brand_bg_color)
select id, 'google', 'Archivo Black', '#FFFFFF', '#D4642A'
from clients where name = 'Café San Juan'
on conflict (client_id) do update set
  brand_font_source = excluded.brand_font_source,
  brand_font_family = excluded.brand_font_family,
  brand_bg_color     = excluded.brand_bg_color,
  updated_at         = now();
