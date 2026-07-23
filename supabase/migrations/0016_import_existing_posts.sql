-- AdMind Analytics — 0016
-- Permite backfillear en "piezas" el contenido que ya está publicado en
-- Instagram (posteado directamente desde el celu, no generado en AdMind).
-- Estas piezas "importadas" no tienen un PNG generado por la app, así que
-- storage_path pasa a ser opcional, y agregamos external_image_url para
-- guardar la miniatura real que devuelve la Graph API (fallback de imagen
-- cuando no hay storage_path propio).

alter table piezas
  alter column storage_path drop not null;

alter table piezas
  add column if not exists imported boolean not null default false,
  add column if not exists external_image_url text;
