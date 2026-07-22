# AdMind Analytics

Plataforma de análisis de redes sociales para agencias de marketing digital.

## Stack

- **React 18** + **Vite 5**
- **Space Grotesk** (UI) + **JetBrains Mono** (datos)

## Estructura

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Layout, tabs de clientes, nav de módulos
├── index.css             # Estilos globales y animaciones
├── tokens.js             # Design tokens (colores, plataformas)
│
├── data/
│   └── seedClients.js    # Datos de demo (reemplazar con reales)
│
├── hooks/
│   └── useClients.js     # State management de clientes
│
├── utils/
│   ├── format.js         # Formatters de números y fechas
│   └── download.js       # CSV, TXT, JSON export helpers
│
├── components/
│   ├── ui/               # Primitivos: Btn, Input, Card, Toast, etc.
│   ├── charts/
│   │   └── LineChart.jsx # Gráfico SVG de crecimiento histórico
│   ├── modules/
│   │   ├── ModResumen.jsx
│   │   ├── ModHistorico.jsx
│   │   ├── ModPlataformas.jsx
│   │   ├── ModContenido.jsx
│   │   ├── ModBenchmark.jsx
│   │   ├── ModGenerador.jsx
│   │   └── ModCalendario.jsx
│   └── AddClientModal.jsx
```

## Instalación

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
# El output queda en /dist — subir a Vercel, Netlify o GitHub Pages
```

## Módulos

| Módulo | Descripción |
|---|---|
| Resumen | KPIs globales, estado por plataforma, sentimiento |
| Histórico | Línea de tiempo con hitos, análisis por rango de fechas |
| Plataformas | Diagnóstico profundo por red social, virales históricos |
| Contenido | ✓/✗ qué funciona, posts virales históricos |
| Benchmark | Tabla comparativa con competidores, gráfico de barras |
| Generador | Creación de piezas (historia/post/carrusel/reel) con edición y sugerencias de diseño |
| Calendario | Programación y vista de piezas por día/semana |

## Descargas disponibles

- Resumen ejecutivo `.txt`
- Histórico de crecimiento `.csv`
- Métricas de plataformas `.csv`
- Virales históricos `.csv`
- Benchmark competitivo `.csv`
- Análisis IA `.txt`
- Análisis de post individual `.txt`

## Agregar un cliente real

Editá `src/data/seedClients.js` y agregá un objeto con la estructura de los clientes de demo. Todos los campos tienen defaults en `src/hooks/useClients.js`.

## Deploy en Vercel

```bash
npm run build
# Conectar el repo a Vercel — detecta Vite automáticamente
```
