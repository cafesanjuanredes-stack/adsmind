-- AdMind Analytics — 0004
-- Carga la data real de Café San Juan y Lele Cristobal extraída de la
-- presentación (csj-presentacion.html). Los rangos de la presentación
-- (ej. "views 60K–130K") se cargaron como el punto medio aproximado —
-- editable desde la pestaña Plataformas cuando tengas el número exacto.

-- ══ CAFÉ SAN JUAN — Instagram @cafesanjuanoficial ═══════════════════
update client_platforms set
  handle = 'cafesanjuanoficial',
  profile_url = 'https://instagram.com/cafesanjuanoficial',
  followers = 547000,
  posts = 624,
  reach_pct = 20,
  engagement_pct = 1.4,
  views_avg = 95000,
  views_viral = 3000000,
  video_dur = 60,
  status = 'active',
  notes = 'Consistente pero repetitivo. Funciona: pastas, carnes, lasagna, conservas — proceso real, primeros planos. No funciona: platos dulces, stories (alcance muy bajo).'
where client_id = (select id from clients where name = 'Café San Juan')
  and platform = 'instagram';

-- ══ CAFÉ SAN JUAN — YouTube @cafesanjuanoficial ═════════════════════
update client_platforms set
  handle = 'cafesanjuanoficial',
  profile_url = 'https://youtube.com/@cafesanjuanoficial',
  followers = 90300,
  posts = 247,
  views_avg = 60000,
  views_viral = 1000000,
  video_dur = 720,
  status = 'dead',
  notes = 'Sin publicar hace 2 años. No usamos Shorts. Audiencia construida sin activar. Virales: Capítulo Pastas 314K, Reapertura Ep.2 97K.'
where client_id = (select id from clients where name = 'Café San Juan')
  and platform = 'youtube';

-- ══ LELE CRISTOBAL — Instagram @lelecristobal ═══════════════════════
update client_platforms set
  handle = 'lelecristobal',
  profile_url = 'https://instagram.com/lelecristobal',
  followers = 796000,
  posts = 842,
  reach_pct = 22.6,
  engagement_pct = 3.2,
  views_avg = 240000,
  views_viral = 2400000,
  video_dur = 120,
  status = 'warn',
  notes = 'Perdió consistencia en 2024–2025, mucho contenido brandeado. Funciona: carnes, pastas, empanadas, conservas, viajes con cocina. No funciona: resúmenes, publi sin receta, stories habladas al inicio, reshares.'
where client_id = (select id from clients where name = 'Lele Cristobal')
  and platform = 'instagram';

-- ══ LELE CRISTOBAL — TikTok @lelecristobal ══════════════════════════
update client_platforms set
  handle = 'lelecristobal',
  profile_url = 'https://tiktok.com/@lelecristobal',
  followers = 400000,
  status = 'warn',
  notes = 'Solo replica contenido de Instagram, sin producción adicional. Oportunidad: formatos nativos A/B/E (el storytime es el de mayor potencial viral).'
where client_id = (select id from clients where name = 'Lele Cristobal')
  and platform = 'tiktok';

-- ══ Histórico de seguidores ══════════════════════════════════════════
insert into client_history (client_id, date, followers, milestone)
select id, '2019-01', 90000, 'Base inicial — fotos/videos con música externa, sin publicidad pagada'
  from clients where name = 'Café San Juan'
union all
select id, '2026-07', 547000, 'Actualidad — 624 posts, crecimiento sin publicidad pagada desde 2019'
  from clients where name = 'Café San Juan'
union all
select id, '2020-01', 150000, 'Base — recetas de cuarentena, publicación consistente'
  from clients where name = 'Lele Cristobal'
union all
select id, '2026-07', 796000, 'Actualidad — perdió consistencia en 2024–2025, mucho contenido brandeado'
  from clients where name = 'Lele Cristobal';

-- ══ Virales ═══════════════════════════════════════════════════════
insert into client_virals (client_id, title, platform, views, type)
select id, 'Reel viral de proceso (pico más alto)', 'instagram', 3000000, 'Reel'
  from clients where name = 'Café San Juan'
union all
select id, 'Reel viral de proceso (segundo pico)', 'instagram', 2800000, 'Reel'
  from clients where name = 'Café San Juan'
union all
select id, 'Capítulo Pastas', 'youtube', 314000, 'Video largo'
  from clients where name = 'Café San Juan'
union all
select id, 'Reapertura Ep. 2', 'youtube', 97000, 'Video largo'
  from clients where name = 'Café San Juan'
union all
select id, 'Reel receta directa (pico más alto)', 'instagram', 2400000, 'Reel'
  from clients where name = 'Lele Cristobal'
union all
select id, 'Reel receta directa (segundo pico)', 'instagram', 2200000, 'Reel'
  from clients where name = 'Lele Cristobal';

-- ══ Benchmark / competidores (contexto: cuentas gastronómicas +500K) ══
insert into client_competitors (client_id, name, handle, followers_ig, type, notes)
select id, 'Nusr-Et Steakhouse', '@nusr_et', 50000000, 'Cadena internacional', 'Chef celebrity, escala global'
  from clients where name = 'Café San Juan'
union all
select id, 'Nobu Restaurants', '@noburestaurants', 2000000, 'Cadena internacional', 'Cadena de lujo global'
  from clients where name = 'Café San Juan'
union all
select id, 'Cipriani', '@cipriani', 1000000, 'Cadena internacional', 'Cadena de lujo global'
  from clients where name = 'Café San Juan'
union all
select id, 'Zuma Restaurants', '@zumarestaurant', 1000000, 'Cadena internacional', null
  from clients where name = 'Café San Juan'
union all
select id, 'STK Steakhouse', '@stksteakhouse', 800000, 'Cadena internacional', null
  from clients where name = 'Café San Juan'
union all
select id, 'Catch Hospitality', '@catchrestaurants', 800000, 'Cadena internacional', null
  from clients where name = 'Café San Juan'
union all
select id, 'COYA Restaurants', '@coyarestaurant', 700000, 'Cadena internacional', null
  from clients where name = 'Café San Juan'
union all
select id, 'Amazónico', '@amazonico.restaurant', 500000, 'Cadena internacional', 'Grupo internacional, referencia directa'
  from clients where name = 'Café San Juan'
union all
select id, 'Bagatelle', '@bagatellegroup', 500000, 'Cadena internacional', 'Grupo internacional'
  from clients where name = 'Café San Juan'
union all
select id, 'Beefbar', '@beefbarofficial', 500000, 'Cadena internacional', null
  from clients where name = 'Café San Juan'
union all
select id, 'Osteria Renata', '@osteriarenata', 192000, 'Independiente', 'Benchmark de contenido: cinematográfico, 655K views en un reel'
  from clients where name = 'Café San Juan'
union all
select id, 'Confitería Ritz', '@confiteriaritz', 37200, 'Independiente', 'Producto limpio, tradición argentina'
  from clients where name = 'Café San Juan';

-- ══ Contenido: qué funciona / no funciona ═══════════════════════════
insert into client_meta (client_id, content_works, content_fails)
select id,
  array[
    'Pastas y carnes en proceso — primeros planos, manos trabajando',
    'Conservas y taller — proceso auténtico',
    'Lasagna y platos abundantes',
    'Virales de 2.8M–3M sin producción especial'
  ],
  array[
    'Platos dulces — menor engagement',
    'Stories — alcance muy bajo, no convierten'
  ]
  from clients where name = 'Café San Juan'
union all
select id,
  array[
    'Comida en los primeros segundos del reel',
    'Carnes, pastas, empanadas, conservas, comidas grandes',
    'Viajes con cocina — autenticidad + narrativa + producto',
    'Virales de 2.2M–2.4M con formato de receta directa'
  ],
  array[
    'Resúmenes sin foco en comida',
    'Contenido con publi de fondo sin receta',
    'Stories habladas al inicio — caída inmediata',
    'Reshares — alcance bajo',
    '2024–2025: perdió consistencia, mucho contenido brandeado'
  ]
  from clients where name = 'Lele Cristobal'
on conflict (client_id) do update set
  content_works = excluded.content_works,
  content_fails = excluded.content_fails,
  updated_at = now();
