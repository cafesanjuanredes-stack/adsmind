-- AdMind Analytics — 0018
-- Hasta ahora todas las Edge Functions de sincronización (seguidores,
-- métricas, publicación programada, etc.) existían y estaban deployadas,
-- pero NADA las llamaba automáticamente — por eso los seguidores y las
-- métricas nunca se actualizaban solas. Esta migración prende pg_cron +
-- pg_net para que Supabase mismo las dispare en horario, sin que Candelaria
-- tenga que entrar a tocar botones.
--
-- Los horarios están en UTC. Argentina es UTC-3, así que "10 UTC" = 7am
-- hora Argentina.
--
-- Si esta migración se vuelve a correr (por error o a propósito), primero
-- desanotar los cron.unschedule(...) de abajo para no duplicar los jobs.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- select cron.unschedule('publish-to-meta');
-- select cron.unschedule('sync-pieza-metrics');
-- select cron.unschedule('sync-platform-stats');
-- select cron.unschedule('auto-schedule-historias');
-- select cron.unschedule('compute-content-insights');
-- select cron.unschedule('sync-competitors');
-- select cron.unschedule('generate-ai-suggestions');
-- select cron.unschedule('sync-youtube-stats');
-- select cron.unschedule('import-existing-posts-weekly');

-- Publicar piezas programadas cuyo horario ya venció — cada 15 min.
select cron.schedule(
  'publish-to-meta',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/publish-to-meta',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Métricas reales (reach/likes/comments/etc.) de piezas ya publicadas — cada 8hs.
select cron.schedule(
  'sync-pieza-metrics',
  '0 */8 * * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/sync-pieza-metrics',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Seguidores + posts de Instagram por cliente — 1 vez por día, 7am Argentina.
select cron.schedule(
  'sync-platform-stats',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/sync-platform-stats',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Auto-programar historias del día — 1 vez por día, 8am Argentina.
select cron.schedule(
  'auto-schedule-historias',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/auto-schedule-historias',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Análisis de contenido (auto-cálculo de qué funciona) — 1 vez por semana, lunes.
select cron.schedule(
  'compute-content-insights',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/compute-content-insights',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Seguimiento de competidores — 1 vez por semana, domingo.
select cron.schedule(
  'sync-competitors',
  '0 9 * * 0',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/sync-competitors',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Sugerencias de fotos/diseños con IA — cada 3 días.
select cron.schedule(
  'generate-ai-suggestions',
  '0 9 */3 * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/generate-ai-suggestions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Métricas de YouTube (views/likes/comments) — 1 vez por día, junto con la de Instagram.
select cron.schedule(
  'sync-youtube-stats',
  '10 10 * * *',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/sync-youtube-stats',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);

-- Atrapar posts orgánicos nuevos publicados directo desde Instagram (no
-- generados en AdMind) — 1 vez por semana, para no pegarle todo el tiempo
-- a la Graph API sin necesidad.
select cron.schedule(
  'import-existing-posts-weekly',
  '30 9 * * 1',
  $$
  select net.http_post(
    url := 'https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/import-existing-posts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenBhc3p3emtuc2ZnbWlidmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTE2NjEsImV4cCI6MjEwMDIyNzY2MX0.X9Gh16Ky2HiQNtJR8rMMQGCFUIaZa4lynE9TbxaSUJk'),
    body := '{}'::jsonb
  );
  $$
);
