-- AdMind Analytics — 0019
-- Formato/encuadre de la pieza (cuadrado, vertical, horizontal). Aplica a
-- post/carrusel/reel — historia no lo usa, siempre es vertical de pantalla
-- completa, así que queda null para ese tipo.

alter table piezas
  add column if not exists formato text;
