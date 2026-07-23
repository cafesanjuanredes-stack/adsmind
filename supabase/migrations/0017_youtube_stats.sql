-- AdMind Analytics — 0017
-- Métricas reales de YouTube para videos_externos. A diferencia de Meta,
-- YouTube expone views/likes/comments de cualquier video público con solo
-- una API key gratuita (sin OAuth, sin verificación de negocio), así que
-- estos campos se sincronizan automáticamente por link.

alter table videos_externos
  add column if not exists views          bigint,
  add column if not exists likes          bigint,
  add column if not exists comments       integer,
  add column if not exists thumbnail_url  text,
  add column if not exists last_synced_at timestamptz;
