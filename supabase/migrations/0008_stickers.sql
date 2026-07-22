-- AdMind Analytics — 0008
-- Permite subir stickers/vectores (PNG transparente) al banco, además de
-- foto y diseño, para poder componerlos como capa arrastrable sobre el
-- overlay del Generador.

alter table media_assets drop constraint if exists media_assets_kind_check;
alter table media_assets add constraint media_assets_kind_check
  check (kind in ('foto', 'diseno', 'sticker'));
