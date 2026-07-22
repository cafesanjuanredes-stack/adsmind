-- AdMind Analytics — 0009
-- Agrega soporte real de tipos de publicación además de historia/post:
-- Reel (video) y Carrusel (varias fotos en un mismo posteo). También
-- agrega un campo de tags/hashtags libre y permite subir video al banco
-- (necesario para Reels).

alter table piezas drop constraint if exists piezas_tipo_check;
alter table piezas add constraint piezas_tipo_check
  check (tipo in ('historia', 'post', 'reel', 'carrusel'));

alter table piezas
  add column if not exists carousel_paths text[],  -- paths adicionales del bucket "content" para carrusel (el primero va en storage_path)
  add column if not exists tags text;              -- hashtags/@menciones libres, separado de caption

alter table media_assets drop constraint if exists media_assets_kind_check;
alter table media_assets add constraint media_assets_kind_check
  check (kind in ('foto', 'diseno', 'sticker', 'video'));
