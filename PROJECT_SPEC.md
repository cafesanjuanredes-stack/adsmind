# AdMind Analytics — Spec técnico / contexto de proyecto

Documento de referencia para retomar el proyecto en otra conversación. Resume stack, arquitectura, modelo de datos, estado de las conexiones de Meta, funciones automatizadas y qué falta. No contiene tokens/keys en texto plano a propósito — solo dice dónde vive cada uno.

## Qué es

"AdMind Analytics" — app interna de gestión de redes sociales para una agencia (Candelaria), con 4 clientes actuales: **Café San Juan** (CSJ, gastronomía), **Lele Cristobal**, **Mr Green Coffee** (café — el único con integración Meta activa), **Estudio Gilmore**.

## Stack

- React 18 + Vite 5, sin router (tabs de cliente + tabs de módulo en `App.jsx`, todo client-side state).
- Supabase: Postgres + Auth + Storage (bucket privado `content`) + Edge Functions (Deno) + pg_cron/pg_net para scheduling.
- Sin backend propio — toda la lógica server-side vive en Edge Functions de Supabase.
- Proyecto Supabase: ref `vnzpaszwzknsfgmibvhw` (URL `https://vnzpaszwzknsfgmibvhw.supabase.co`).
- Deploy del frontend: Vercel (`adsmind-seven.vercel.app`).
- Carpeta local: `/Users/candelaria/Documents/Apps/ot-admind`.

## Estructura de carpetas

```
src/
  App.jsx                 → tabs de cliente + nav de módulos (MODULES array)
  tokens.js               → design tokens (T, RADIUS, SHADOW, PLATFORM_META) — fuente única de colores/estilos
  index.css               → estilos globales, fondo base
  data/
    seedClients.js         → ya no es la fuente de verdad (los clientes viven en la tabla `clients`)
    efemerides.js           → dataset de 66 efemérides 2026 (feriados + gastronómico + comercial), con categoría/prioridad/idea de contenido. Fuente: calendario armado a mano, no un dataset genérico.
    brandFonts.js
  lib/                     → una función por tabla/feature, todas usan supabaseClient directo (sin ORM)
    piezas.js, videosExternos.js, storage.js, ads.js, contentGoals.js,
    contentTasks.js, strategy.js, trips.js, metricas.js, aiSuggestions.js, brand.js
  components/
    ui/                    → primitivos: Card, Btn, Input, Sel, SLabel, MetricBig, Tag, Pulse
    modules/                → un componente por pestaña (ver abajo)
supabase/
  migrations/              → 0001 a 0019, secuenciales, todas con RLS "authenticated full access"
  functions/                → 10 Edge Functions (Deno), ver tabla de cron abajo
```

## Módulos (pestañas dentro de cada cliente)

| Módulo | Archivo | Qué hace |
|---|---|---|
| Resumen | ModResumen.jsx | KPIs generales del cliente |
| Estrategia | ModEstrategia.jsx | Cuotas semanales de contenido, canales de pauta + presupuesto, métricas de landing, resumen YouTube |
| Histórico | ModHistorico.jsx | Evolución de seguidores por mes (`client_history`) |
| Plataformas | ModPlataformas.jsx | Una tarjeta por red social (`client_platforms`), edición manual de métricas, virales históricos |
| Contenido | ModContenido.jsx | Qué funciona / qué no, sentimiento (`client_meta`) |
| Benchmark | ModBenchmark.jsx | Competidores (`client_competitors`) |
| Anuncios | ModAnuncios.jsx | Carga manual de campañas (Meta Ads, Google Ads, etc.) — **100% manual, no hay pull automático** (decisión tomada: no vale la pena la burocracia extra de Meta Marketing API / Google Ads API developer token) |
| Generador | ModGenerador.jsx | Editor de piezas: sube foto/video, overlay de texto, elige tipo (historia/post/reel/carrusel) y **formato** (cuadrado 1:1, vertical 4:5/9:16, horizontal 1.91:1 — historia siempre fija vertical) |
| Calendario | ModCalendario.jsx | El módulo más grande: drag&drop de piezas programadas, tareas de filmación/eventos, plan de producción mensual (checklist con progreso automático), viajes (rango de fechas + checklist), marcadores de efemérides, alerta de finde largo próximo, **alerta nueva de fin de mes con efemérides del mes siguiente**, carga manual de métricas, botones "Importar publicaciones de Instagram" y "Sincronizar YouTube" |

## Modelo de datos (tablas Postgres, todas con RLS `authenticated full access` salvo `meta_accounts`)

- `clients` — id, name, industry, avatar, color
- `meta_accounts` (**solo service_role**, nunca expuesta al browser) — `client_id`, `ig_user_id`, `fb_page_id`, `access_token` (larga duración, 60 días), `token_expires_at`, `status` (`active`/`expired`/`revoked`/`pending_setup`)
- `media_assets` — banco de fotos/diseños crudos (sin overlay)
- `piezas` — historia/post/reel/carrusel ya con overlay aplicado. Campos clave: `tipo`, `formato` (nuevo, nullable — cuadrado/vertical/horizontal, no aplica a historia), `storage_path` (nullable — null para piezas **importadas** de Instagram), `external_image_url` (thumbnail de Instagram cuando no hay storage_path propio), `imported` (bool), `estado` (`borrador`/`banco`/`programada`/`publicada`/`error`), `meta_media_id`, `permalink`, `carousel_paths`, `caption`, `tags`
- `videos_externos` — videos cargados a mano (típicamente YouTube), con `views`/`likes`/`comments`/`thumbnail_url`/`last_synced_at` (sync automático, ver abajo)
- `metricas_piezas` — histórico de métricas reales por pieza (`reach`,`likes`,`comments`,`saves`,`shares`,`plays`), múltiples filas por pieza en el tiempo, `fetched_at`. Se llenan tanto por el cron automático como por carga manual — conviven sin conflicto (siempre se toma la última fila por pieza)
- `client_platforms`, `client_history`, `client_virals`, `client_competitors`, `client_meta` — analytics persistente por cliente (seguidores, engagement, virales, competidores, sentimiento)
- `content_tasks` — tareas de filmación/eventos en el calendario
- `content_goals` — plan de producción mensual (`client_id`+`month`, `items` jsonb con checklist)
- `client_ads` — campañas de pauta cargadas a mano
- `client_strategy` — 1 fila por cliente: cuotas semanales por tipo de contenido, canales de pauta + presupuesto, landing, notas
- `client_trips` — viajes de producción (rango de fechas + `items` jsonb checklist, mismo shape que `content_goals`)

Todas las migraciones relevantes: `0001_init`, `0002_auth_private_storage_clients`, `0003_analytics_persistence`, `0004_csj_lele_real_data`, `0005_auto_historias`, `0006_ai_suggestions`, `0007_brand_kit`, `0008_stickers`, `0009_reel_carrusel`, `0010_virals_link`, `0011_pieza_permalink_viral_dedup`, `0012_content_tasks`, `0013_ads_and_content_goals`, `0014_client_strategy`, `0015_client_trips`, `0016_import_existing_posts`, `0017_youtube_stats`, `0018_schedule_crons`, `0019_pieza_formato`.

## Estado real de la conexión con Meta (¡importante!)

Solo **Mr Green Coffee** tiene una fila `active` en `meta_accounts` hoy. Esto significa: publicación automática, sync de seguidores, sync de métricas de posts, e importación de publicaciones existentes **solo funcionan para Mr Green Coffee**.

- **Café San Juan**: bloqueada. Todo el flujo de OAuth/Business Manager se completó ("Candelaria Serra se conectó a AdMind CSJ" confirmado), `/me/permissions` muestra todo `granted`, pero `/me/accounts` devuelve vacío. Causa raíz identificada: la **Verificación del negocio** de "CAFE SAN JUAN S.R.L." en Meta Business Manager está en estado **"Solicitud pendiente"** — es un trámite documental externo, no algo que se arregle con más configuración. Hasta que Meta la apruebe, no va a exponer los assets vía Graph API.
- **Lele Cristobal** y **Estudio Gilmore**: nunca se conectaron a Meta (decisión explícita de Candelaria en su momento: "ninguno más por ahora"). Seguidores/métricas para estos dos son 100% carga manual en la pestaña Plataformas.

Detalles técnicos del flujo de conexión (por si hay que repetirlo para otro cliente):
- Usar el producto **"Facebook Login"** en el Developer App de Meta — NO "Instagram API with Instagram Login" (usa `graph.instagram.com` y un App ID distinto, no sirve para este schema).
- Hay 4 capas de acceso independientes que hay que configurar todas: acceso personal a la Página de Facebook, acceso a la Cuenta de Instagram profesional vinculada (en Business Settings → Cuentas → Cuentas de Instagram — es un permiso SEPARADO del de la Página), acceso a nivel App ("Aplicaciones" en Business Settings), y roles clásicos del developer app.
- En Graph API Explorer, si aparece el popup "¿Reconectar?", hay que tocar **"Editar configuración"** (no "Reconectar", que restaura la config vieja rota) y elegir "Activar todos los Páginas/Negocios/Cuentas de Instagram actuales y futuros" (la opción "solo actuales" no lista las compartidas por Business Manager).
- `meta_accounts.access_token` es un token de larga duración (60 días) — hay que rotarlo antes de que expire (`token_expires_at`).

## Edge Functions y su cron (todas deployadas y programadas vía pg_cron + pg_net desde la migración 0018)

| Función | Qué hace | Frecuencia |
|---|---|---|
| `publish-to-meta` | Publica piezas `programada` cuyo horario venció | cada 15 min |
| `sync-pieza-metrics` | Trae reach/likes/comments/saves/shares/plays de piezas ya publicadas (ventana 24hs–14 días) | cada 8hs |
| `sync-platform-stats` | Seguidores + cantidad de posts de Instagram, actualiza `client_platforms` + checkpoint mensual en `client_history` | diario, 10 UTC (7am ARG) |
| `auto-schedule-historias` | Auto-programa historias pendientes del banco | diario, 11 UTC (8am ARG) |
| `compute-content-insights` | Recalcula qué funciona/no (`client_meta.content_works/content_fails`) | semanal, lunes |
| `sync-competitors` | Sigue seguidores de competidores cargados | semanal, domingo |
| `generate-ai-suggestions` | Sugerencias de fotos/diseños con OpenAI (gpt-image-1) | cada 3 días |
| `sync-youtube-stats` | Views/likes/comments de `videos_externos` con link de YouTube — usa `YOUTUBE_API_KEY` (API key gratuita, sin OAuth) | diario, 10:10 UTC — también invocable a mano con el botón "Sincronizar YouTube" |
| `import-existing-posts` | Trae de `/media` de Instagram los posts/reels/carruseles ya públicos que no fueron creados desde AdMind, los inserta en `piezas` (`imported:true`) con su primer snapshot de métricas. **No puede traer historias viejas** (limitación real de la API: Instagram solo expone insights de una historia mientras está activa, 24hs) | semanal, lunes — también invocable a mano con el botón "Importar publicaciones de Instagram" |
| `generate-design-now` | Versión on-demand de `generate-ai-suggestions`, disparada desde el botón "Generar con IA" | solo on-demand |

Todas requieren CORS headers si se invocan desde el browser (`generate-design-now`, `import-existing-posts`, `sync-youtube-stats` las tienen; las demás son cron-only, invocadas por `pg_net.http_post` con la anon key, no necesitan CORS).

## Secrets y dónde viven (nunca en el repo ni en texto plano fuera de Supabase)

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — disponibles automáticamente dentro de cada Edge Function (inyectados por Supabase).
- `YOUTUBE_API_KEY` — Supabase secret (Project Settings → Edge Functions → Secrets), API key gratuita de Google Cloud (YouTube Data API v3), sin OAuth.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — en `.env` del frontend, es la "anon key" pública (protegida por RLS, safe para exponer en el bundle del browser).
- `meta_accounts.access_token` (por cliente) — token de Meta de larga duración, vive solo en la tabla `meta_accounts` (RLS: solo service_role), nunca se expone al frontend.
- Ya no hay tokens sueltos en texto plano en la carpeta del proyecto (se borraron `_csj_step1.sh`/`_csj_step1b.sh` que habían quedado de una sesión de debugging).

## Deploy / operación

CLI de Supabase instalada vía Homebrew (`brew install supabase/tap/supabase`), proyecto linkeado (`supabase link --project-ref vnzpaszwzknsfgmibvhw`). Deploy de una función: `supabase functions deploy <nombre>`. La CLI instalada (2.109.1) **no tiene el subcomando `invoke`** — para probar una función a mano hay que pegarle por `curl` directo a `https://vnzpaszwzknsfgmibvhw.supabase.co/functions/v1/<nombre>` con `Authorization: Bearer <anon key>`.

## Pendientes / abiertos

1. **Café San Juan bloqueada** — esperando que Meta apruebe la Verificación del Negocio. No hay nada más de configuración que hacer del lado de la app.
2. Extender Estrategia/Anuncios/Viajes/conexión Meta a Lele Cristobal y Estudio Gilmore — no iniciado, deferred a pedido de Candelaria.
3. Cross-post de historias de Instagram a Facebook — se optó por el toggle nativo de Instagram (Configuración → Compartir a otras apps → Facebook) en vez de construirlo por API (que hubiera requerido el permiso `pages_manage_posts`, con riesgo de otra vuelta de revisión de Meta). Pendiente de confirmar si ese toggle también replica lo que publica AdMind automáticamente vía API (no está documentado); si no, construir el cross-post en `publish-to-meta` usando `meta_accounts.fb_page_id` (ya lo tenemos guardado).
4. Métricas de campañas de Meta Ads / Google Ads — decisión tomada: quedan 100% manuales por ahora (no se justifica la burocracia de permisos adicionales todavía).
