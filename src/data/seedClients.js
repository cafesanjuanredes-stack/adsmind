// ── Seed / demo client data ───────────────────────────────────────
// Replace or extend this with real client data

export const SEED_CLIENTS = [
  {
    id: 1,
    name: 'Café San Juan',
    industry: 'Gastronomía',
    avatar: 'CSJ',
    color: '#F59E0B',
    platforms: {
      instagram: {
        followers: 547000, posts: 624, reach_pct: 20, engagement_pct: 1.4,
        views_avg: 95000, views_viral: 3000000, freq_week: 4,
        video_dur: 60, completion_pct: 68, saves_avg: 3200, shares_avg: 890,
        status: 'active',
        notes: 'Consistente. Virales hasta 3M. Funciona: pastas, carnes, conservas. No funciona: platos dulces, stories.',
      },
      tiktok: {
        followers: 400000, posts: 210, reach_pct: 35, engagement_pct: 8.9,
        views_avg: 42000, views_viral: 1200000, freq_week: 3,
        video_dur: 30, completion_pct: 71, saves_avg: 0, shares_avg: 1840,
        status: 'warn',
        notes: 'Solo replica contenido de IG. Sin estrategia nativa TikTok. Oportunidad grande sin explotar.',
      },
      facebook: {
        followers: 89000, posts: 312, reach_pct: 4, engagement_pct: 1.1,
        views_avg: 8000, views_viral: 120000, freq_week: 2,
        video_dur: 0, completion_pct: 0, saves_avg: 0, shares_avg: 134,
        status: 'warn',
        notes: 'Alcance muy bajo. Canal secundario. Evaluar reducir frecuencia.',
      },
      youtube: {
        followers: 90300, posts: 247, reach_pct: 12, engagement_pct: 3.2,
        views_avg: 35000, views_viral: 314000, freq_week: 0,
        video_dur: 720, completion_pct: 52, saves_avg: 0, shares_avg: 0,
        status: 'dead',
        notes: 'Sin publicar hace 2 años. 90K suscriptores sin activar. Gran oportunidad en Shorts.',
      },
    },
    history: [
      { date: '2019-01', followers_ig: 90000,  milestone: 'Base inicial' },
      { date: '2020-03', followers_ig: 140000, milestone: 'Boom cuarentena — recetas pandemia' },
      { date: '2021-06', followers_ig: 280000, milestone: 'Taller de Conservas + Recetas Mecha' },
      { date: '2022-12', followers_ig: 390000, milestone: 'Recetas Lele consistentes' },
      { date: '2023-06', followers_ig: 450000, milestone: '' },
      { date: '2024-01', followers_ig: 500000, milestone: 'Eventos y blogs' },
      { date: '2025-06', followers_ig: 547000, milestone: 'Actualidad' },
    ],
    virals: [
      { title: 'Reel lasagna al horno', platform: 'instagram', date: '2023-08', views: 3000000, likes: 142000, comments: 4800, type: 'Reel' },
      { title: 'Conservas de verano — proceso', platform: 'instagram', date: '2022-11', views: 2800000, likes: 118000, comments: 3900, type: 'Reel' },
      { title: 'Capítulo Pastas — YouTube', platform: 'youtube', date: '2021-04', views: 314000, likes: 12400, comments: 890, type: 'Video largo' },
      { title: 'Empanadas de Lele — TikTok', platform: 'tiktok', date: '2023-03', views: 1200000, likes: 89000, comments: 2100, type: 'Video corto' },
    ],
    competitors: [
      { name: 'Nusr-Et Steakhouse',    handle: '@nusr_et',               followers_ig: 50000000, type: 'Cadena internacional', notes: 'Chef celebrity. Escala diferente.' },
      { name: 'Nobu Restaurants',       handle: '@noburestaurants',        followers_ig: 2000000,  type: 'Cadena internacional', notes: '' },
      { name: 'Amazónico',              handle: '@amazonico.restaurant',   followers_ig: 500000,   type: 'Cadena internacional', notes: 'Referencia directa. Misma escala.' },
    ],
    content: {
      works: [
        'Reels de proceso — primeros planos manos cocinando',
        'Conservas y talleres — proceso auténtico',
        'Lasagna y platos abundantes',
        'Viajes con cocina — narrativa + producto',
      ],
      fails: [
        'Platos dulces — engagement bajo',
        'Stories — alcance 60% menor que reels',
        'Contenido brandeado sin receta',
        'Resúmenes sin foco en comida',
      ],
      best_days: ['Lunes', 'Miércoles', 'Viernes'],
      best_time: '18:00 – 20:00',
    },
    ads: null,
    sentiment: { positive: 79, neutral: 17, negative: 4 },
  },
  {
    id: 2,
    name: 'TechFlow SaaS',
    industry: 'Tecnología',
    avatar: 'TF',
    color: '#06B6D4',
    platforms: {
      instagram: {
        followers: 38200, posts: 189, reach_pct: 8, engagement_pct: 4.1,
        views_avg: 12000, views_viral: 280000, freq_week: 3,
        video_dur: 45, completion_pct: 61, saves_avg: 890, shares_avg: 210,
        status: 'active',
        notes: 'Crecimiento sostenido. Tutoriales y demos funcionan bien.',
      },
      tiktok: {
        followers: 12400, posts: 67, reach_pct: 22, engagement_pct: 7.2,
        views_avg: 18000, views_viral: 420000, freq_week: 2,
        video_dur: 35, completion_pct: 74, saves_avg: 0, shares_avg: 640,
        status: 'active',
        notes: 'Canal emergente con muy buen engagement. Oportunidad de escalar.',
      },
      facebook: {
        followers: 18900, posts: 210, reach_pct: 3, engagement_pct: 1.8,
        views_avg: 3200, views_viral: 45000, freq_week: 2,
        video_dur: 0, completion_pct: 0, saves_avg: 0, shares_avg: 89,
        status: 'warn',
        notes: 'Bajo rendimiento. Evaluar reducir frecuencia a 1/semana.',
      },
      youtube: {
        followers: 8100, posts: 45, reach_pct: 18, engagement_pct: 5.4,
        views_avg: 8400, views_viral: 94000, freq_week: 1,
        video_dur: 480, completion_pct: 58, saves_avg: 0, shares_avg: 0,
        status: 'active',
        notes: 'Canal creciendo. Tutoriales largos con buen watch time.',
      },
    },
    history: [
      { date: '2022-01', followers_ig: 8000,  milestone: 'Lanzamiento cuenta' },
      { date: '2022-06', followers_ig: 14000, milestone: 'Primeros virales — tutoriales' },
      { date: '2023-01', followers_ig: 22000, milestone: '' },
      { date: '2023-09', followers_ig: 29000, milestone: 'Campaña lanzamiento v2.0' },
      { date: '2024-06', followers_ig: 34000, milestone: '' },
      { date: '2025-06', followers_ig: 38200, milestone: 'Actualidad' },
    ],
    virals: [
      { title: 'Tutorial: automatización en 60s', platform: 'tiktok',    date: '2024-03', views: 420000, likes: 28000, comments: 1200, type: 'Video corto' },
      { title: 'Caso de uso — 10x productividad', platform: 'instagram', date: '2023-11', views: 280000, likes: 18400, comments: 890,  type: 'Reel' },
    ],
    competitors: [
      { name: 'Notion',  handle: '@notionhq',  followers_ig: 890000, type: 'Marca digital', notes: 'Referente en contenido educativo.' },
      { name: 'Linear',  handle: '@linear_app', followers_ig: 120000, type: 'Marca digital', notes: 'Competencia directa.' },
    ],
    content: {
      works: [
        'Tutoriales cortos paso a paso (TikTok)',
        'Casos de uso reales de clientes',
        'Comparativas con competidores',
        'Demos de features nuevas',
      ],
      fails: [
        'Posts abstractos sin demo visual',
        'Contenido corporativo sin valor educativo',
        'Anuncios de updates sin mostrar el cambio',
      ],
      best_days: ['Martes', 'Jueves'],
      best_time: '09:00 – 11:00',
    },
    ads: {
      google: { spend: 14800, roas: 6.2, cpc: 0.42, ctr: 3.8, conversions: 890, cpa: 16.6, qs: 8.4 },
      meta:   { spend: 6200,  roas: 4.1, cpm: 3.1,  cpc: 0.18, ctr: 1.7, reach: 420000, conversions: 340 },
    },
    sentiment: { positive: 74, neutral: 20, negative: 6 },
  },
]
