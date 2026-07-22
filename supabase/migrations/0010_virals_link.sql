-- AdMind Analytics — 0010
-- Agrega el link real al post/video en los virales históricos, para poder
-- entrar directo desde la app en vez de solo ver el título y las métricas.

alter table client_virals
  add column if not exists url text;
