import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, SLabel, Btn, Input, Sel, Tag } from '../ui'
import { T, RADIUS, SHADOW } from '../../tokens'
import { listAssets, listPiezas, createPieza, deleteAsset, deletePieza } from '../../lib/piezas'
import { uploadOriginal, uploadPieza, getSignedUrl } from '../../lib/storage'
import { uploadBrandFont, resolveBrandFont } from '../../lib/brand'
import { BRAND_FONTS } from '../../data/brandFonts'
import { Palette, X, Plus, Check, Layers, Move } from 'lucide-react'

// ── caché de signed URLs a nivel de módulo ──────────────────────────
// Mismo problema y misma solución que en ModCalendario.jsx: getSignedUrl()
// devuelve un token único cada vez, así que reutilizar la MISMA cadena de
// URL (mientras siga vigente) es lo que le permite al navegador servir
// desde su caché HTTP en vez de re-descargar, incluso si el componente se
// desmontó y volvió a montar (cambio de cliente, cambio de pestaña, etc).
const SIGNED_URL_TTL = 3600
const signedUrlCache = new Map() // storage_path -> { url, expiresAt }
async function getCachedSignedUrl(path) {
  const hit = signedUrlCache.get(path)
  if (hit && hit.expiresAt > Date.now()) return hit.url
  const url = await getSignedUrl(path, SIGNED_URL_TTL)
  signedUrlCache.set(path, { url, expiresAt: Date.now() + (SIGNED_URL_TTL - 600) * 1000 })
  return url
}

function hexToRgba(hex, alpha) {
  const m = (hex || '#000000').replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) || 0
  const g = parseInt(m.slice(2, 4), 16) || 0
  const b = parseInt(m.slice(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

// Historia es siempre vertical de pantalla completa — no tiene formato para
// elegir. Post/carrusel/reel sí admiten distintos encuadres, como en Instagram.
const HISTORIA_DIMS = { w: 1080, h: 1920 }

const FORMATOS = {
  post: [
    { v: 'cuadrado',   l: 'Cuadrado · 1:1',      w: 1080, h: 1080 },
    { v: 'vertical',   l: 'Vertical · 4:5',      w: 1080, h: 1350 },
    { v: 'horizontal', l: 'Horizontal · 1.91:1', w: 1080, h: 566 },
  ],
  carrusel: [
    { v: 'cuadrado',   l: 'Cuadrado · 1:1',      w: 1080, h: 1080 },
    { v: 'vertical',   l: 'Vertical · 4:5',      w: 1080, h: 1350 },
    { v: 'horizontal', l: 'Horizontal · 1.91:1', w: 1080, h: 566 },
  ],
  reel: [
    { v: 'vertical', l: 'Vertical · 9:16', w: 1080, h: 1920 },
    { v: 'cuadrado', l: 'Cuadrado · 1:1',  w: 1080, h: 1080 },
  ],
}

function scaledDims(w, h, maxBox = 340) {
  const dispW = w >= h ? maxBox : Math.round(maxBox * w / h)
  const dispH = w >= h ? Math.round(maxBox * h / w) : maxBox
  return { dispW, dispH }
}

// Devuelve { w, h, dispW, dispH } para el tipo/formato actual. Historia no
// tiene formato (siempre vertical fijo); post/carrusel/reel usan el formato
// elegido, con un fallback razonable si todavía no se eligió ninguno.
function getDims(tipo, formato) {
  if (tipo === 'historia') return { ...HISTORIA_DIMS, ...scaledDims(HISTORIA_DIMS.w, HISTORIA_DIMS.h) }
  const opts = FORMATOS[tipo] || FORMATOS.post
  const found = opts.find(o => o.v === formato) || opts[0]
  return { w: found.w, h: found.h, ...scaledDims(found.w, found.h) }
}

const TIPO_OPTIONS = [
  { v: 'historia', l: 'Historia' },
  { v: 'post',     l: 'Post (feed)' },
  { v: 'carrusel', l: 'Carrusel (varias fotos)' },
  { v: 'reel',     l: 'Reel (video)' },
]

const MIN_QUALITY_PX = 1080

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// ── Dibuja imagen + overlay de texto + sticker en un canvas dado ────
// Devuelve los bounds (en px del canvas) de texto y sticker, para hit-testing de drag.
function renderFrame(ctx, w, h, { img, text, textPos, fontSize, textColor, bgColor, bgBar, font, stickerImg, stickerPos, stickerScale }) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = T.surf2
  ctx.fillRect(0, 0, w, h)

  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const sw = w / scale, sh = h / scale
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  }

  let textBounds = null
  const trimmed = (text || '').trim()
  if (trimmed) {
    ctx.font = `700 ${fontSize}px "${font}", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxWidth = w * 0.86
    const lines = wrapText(ctx, trimmed, maxWidth)
    const lineHeight = fontSize * 1.25
    const totalHeight = lines.length * lineHeight
    const lineWidths = lines.map(l => ctx.measureText(l).width)
    const blockWidth = Math.min(maxWidth, Math.max(...lineWidths))
    const centerX = textPos.x * w
    const centerY = textPos.y * h
    const pad = bgBar ? fontSize * 0.4 : 6

    textBounds = {
      x: centerX - blockWidth / 2 - pad,
      y: centerY - totalHeight / 2 - pad,
      w: blockWidth + pad * 2,
      h: totalHeight + pad * 2,
    }

    if (bgBar) {
      ctx.fillStyle = hexToRgba(bgColor, 0.55)
      ctx.fillRect(0, centerY - totalHeight / 2 - pad, w, totalHeight + pad * 2)
    }

    ctx.fillStyle = textColor
    lines.forEach((line, i) => {
      const y = centerY - totalHeight / 2 + (i + 0.5) * lineHeight
      ctx.fillText(line, centerX, y)
    })
  }

  let stickerBounds = null
  if (stickerImg) {
    const sw = w * stickerScale
    const sh = sw * (stickerImg.height / stickerImg.width)
    const cx = stickerPos.x * w
    const cy = stickerPos.y * h
    stickerBounds = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh }
    ctx.drawImage(stickerImg, stickerBounds.x, stickerBounds.y, sw, sh)
  }

  return { textBounds, stickerBounds }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// ── caché de imágenes originales en resolución completa ────────────
// Estos archivos son las fotos tal cual se subieron (a veces 15-24MB, sin
// comprimir). Antes, cada vez que se seleccionaba una foto del banco (para
// verla en el canvas) o se guardaba una pieza, se pedía una signed URL
// nueva y se volvía a descargar el archivo entero — aunque fuera la MISMA
// foto que ya se había descargado segundos antes. Con bancos de fotos
// grandes y mucho ida-y-vuelta probando cuál queda mejor, esto multiplicaba
// muchísimo el tráfico real. Este caché (por storage_path, para toda la
// sesión del módulo) hace que cada archivo se baje una sola vez.

export function ModGenerador({ client, notify, updateBrand }) {
  const [assets, setAssets]     = useState([])
  const [stickers, setStickers] = useState([])
  const [piezas, setPiezas]     = useState([])
  const [thumbs, setThumbs]     = useState({})
  const [stickerThumbs, setStickerThumbs] = useState({})
  const [piezaThumbs, setPiezaThumbs] = useState({})
  const [loadingLists, setLoadingLists] = useState(true)

  const [uploadKind, setUploadKind] = useState('foto')
  const [uploading,  setUploading]  = useState(false)
  const [uploadingSticker, setUploadingSticker] = useState(false)

  // ── Selección de fotos (multi-select para carrusel/lote) ──────────
  const [batchMode, setBatchMode] = useState(false)
  const [batchIds, setBatchIds]   = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assetQuality, setAssetQuality] = useState(null) // { w, h, low }

  const [selectedSticker, setSelectedSticker] = useState(null)
  const [stickerPos,   setStickerPos]   = useState({ x: 0.78, y: 0.16 })
  const [stickerScale, setStickerScale] = useState(0.22)

  const [tipo,        setTipo]        = useState('historia')
  const [formato,     setFormato]     = useState(null) // null para historia (no aplica)
  const [overlayText, setOverlayText] = useState('')
  const [caption,     setCaption]     = useState('')
  const [tags,        setTags]        = useState('')
  const [reelFile,    setReelFile]    = useState(null)
  const [uploadingReel, setUploadingReel] = useState(false)
  const [uploadingFinished, setUploadingFinished] = useState(false)
  const [textPos,     setTextPos]     = useState({ x: 0.5, y: 0.86 })
  const [fontSize,    setFontSize]    = useState(72)
  const [textColor,   setTextColor]   = useState('#FFFFFF')
  const [bgColor,     setBgColor]     = useState('#000000')
  const [bgBar,       setBgBar]       = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [resolvedFont, setResolvedFont] = useState('Inter')

  // ── IA on-demand ───────────────────────────────────────────────────

  // ── Marca ──────────────────────────────────────────────────────
  const [showBrand,   setShowBrand]   = useState(false)
  const [brandForm,   setBrandForm]   = useState(null)
  const [savingBrand, setSavingBrand] = useState(false)
  const [uploadingFont, setUploadingFont] = useState(false)

  const canvasRef   = useRef(null)
  const imgRef      = useRef(null)
  const stickerImgRef = useRef(null)
  const textBoundsRef = useRef(null)
  const stickerBoundsRef = useRef(null)
  const dragRef = useRef(null)

  // ── al cambiar de cliente: colores/fuente por defecto = su marca ───
  useEffect(() => {
    setTextColor(client.brand?.textColor || '#FFFFFF')
    setBgColor(client.brand?.bgColor || '#000000')
    setBrandForm({
      fontSource: client.brand?.fontSource || 'google',
      fontFamily: client.brand?.fontFamily || 'Inter',
      textColor: client.brand?.textColor || '#FFFFFF',
      bgColor: client.brand?.bgColor || '#000000',
    })
    let cancelled = false
    resolveBrandFont(client)
      .then(f => { if (!cancelled) setResolvedFont(f) })
      .catch(() => { if (!cancelled) setResolvedFont('Inter') })
    return () => { cancelled = true }
  }, [client.id, client.brand])

  // ── cargar banco de assets, stickers y piezas al entrar / cambiar de cliente ──
  useEffect(() => {
    let cancelled = false
    setSelectedAsset(null)
    setBatchIds([])
    setLoadingLists(true)
    Promise.all([listAssets(client.id), listPiezas(client.id)])
      .then(([a, p]) => {
        if (!cancelled) {
          setAssets(a.filter(x => x.kind !== 'sticker'))
          setStickers(a.filter(x => x.kind === 'sticker'))
          setPiezas(p)
        }
      })
      .catch(err => notify('Error cargando: ' + err.message))
      .finally(() => { if (!cancelled) setLoadingLists(false) })
    return () => { cancelled = true }
  }, [client.id])

  // ── caché de imágenes en resolución completa (banco de fotos) ────
  // Ver comentario junto a loadImage() más arriba. Cachea por storage_path
  // durante toda la sesión del módulo — seleccionar la misma foto dos
  // veces, o guardarla después de haberla previsualizado, no la vuelve a
  // descargar.
  const fullImgCacheRef = useRef({})
  const loadFullImage = useCallback((storagePath) => {
    if (!fullImgCacheRef.current[storagePath]) {
      fullImgCacheRef.current[storagePath] = getCachedSignedUrl(storagePath).then(loadImage)
    }
    return fullImgCacheRef.current[storagePath]
  }, [])

  // ── thumbnails de assets ─────────────────────────────────────────
  // Ojo: cada getSignedUrl() genera una URL nueva con token único, así que
  // el navegador nunca puede servir desde cache — cada re-fetch es una
  // descarga completa del archivo. Si regenerábamos las URLs de TODAS las
  // piezas cada vez que se agregaba una nueva (porque cambia la referencia
  // del array), una carga masiva de N piezas terminaba re-descargando las
  // N-1 anteriores en cada guardado (O(n²)). Los refs de abajo cachean por
  // id y solo piden URL para lo que todavía no la tiene.
  const thumbsCacheRef = useRef({})
  useEffect(() => {
    let cancelled = false
    const missing = assets.filter(a => !(a.id in thumbsCacheRef.current))
    if (missing.length === 0) return
    Promise.all(missing.map(a => getCachedSignedUrl(a.storage_path).then(url => [a.id, url]).catch(() => [a.id, null])))
      .then(entries => {
        if (cancelled) return
        setThumbs(prev => {
          const next = { ...prev, ...Object.fromEntries(entries) }
          thumbsCacheRef.current = next
          return next
        })
      })
    return () => { cancelled = true }
  }, [assets])

  // ── thumbnails de stickers ────────────────────────────────────────
  const stickerThumbsCacheRef = useRef({})
  useEffect(() => {
    let cancelled = false
    const missing = stickers.filter(a => !(a.id in stickerThumbsCacheRef.current))
    if (missing.length === 0) return
    Promise.all(missing.map(a => getCachedSignedUrl(a.storage_path).then(url => [a.id, url]).catch(() => [a.id, null])))
      .then(entries => {
        if (cancelled) return
        setStickerThumbs(prev => {
          const next = { ...prev, ...Object.fromEntries(entries) }
          stickerThumbsCacheRef.current = next
          return next
        })
      })
    return () => { cancelled = true }
  }, [stickers])

  // ── thumbnails de piezas ya generadas ────────────────────────────
  const piezaThumbsCacheRef = useRef({})
  useEffect(() => {
    let cancelled = false
    const missing = piezas.filter(p => !(p.id in piezaThumbsCacheRef.current))
    if (missing.length === 0) return
    Promise.all(missing.map(p => getCachedSignedUrl(p.storage_path).then(url => [p.id, url]).catch(() => [p.id, null])))
      .then(entries => {
        if (cancelled) return
        setPiezaThumbs(prev => {
          const next = { ...prev, ...Object.fromEntries(entries) }
          piezaThumbsCacheRef.current = next
          return next
        })
      })
    return () => { cancelled = true }
  }, [piezas])

  // ── cargar imagen seleccionada para el canvas ──────
  useEffect(() => {
    if (!selectedAsset) { imgRef.current = null; setAssetQuality(null); draw(); return }
    let cancelled = false
    loadFullImage(selectedAsset.storage_path).then(img => {
      if (cancelled) return
      imgRef.current = img
      setAssetQuality({ w: img.naturalWidth, h: img.naturalHeight, low: Math.min(img.naturalWidth, img.naturalHeight) < MIN_QUALITY_PX })
      draw()
    }).catch(err => notify('Error cargando imagen: ' + err.message))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset])

  // ── cargar sticker seleccionado ───────────────────────────────────
  useEffect(() => {
    if (!selectedSticker) { stickerImgRef.current = null; draw(); return }
    let cancelled = false
    loadFullImage(selectedSticker.storage_path).then(img => {
      if (cancelled) return
      stickerImgRef.current = img
      draw()
    }).catch(err => notify('Error cargando sticker: ' + err.message))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSticker])

  // ── redibujar cuando cambian los controles del overlay ───────────
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, formato, overlayText, textPos, fontSize, textColor, bgColor, bgBar, resolvedFont, stickerPos, stickerScale])

  // ── Carrusel necesita varias fotos: forzar modo lote ──────────────
  useEffect(() => {
    if (tipo === 'carrusel') setBatchMode(true)
  }, [tipo])

  // ── al cambiar de tipo: resetear el formato a la primera opción válida ──
  useEffect(() => {
    setFormato(tipo === 'historia' ? null : (FORMATOS[tipo] || FORMATOS.post)[0].v)
  }, [tipo])

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = getDims(tipo, formato)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    const { textBounds, stickerBounds } = renderFrame(ctx, w, h, {
      img: imgRef.current,
      text: overlayText,
      textPos,
      fontSize,
      textColor,
      bgColor,
      bgBar,
      font: resolvedFont,
      stickerImg: stickerImgRef.current,
      stickerPos,
      stickerScale,
    })
    textBoundsRef.current = textBounds
    stickerBoundsRef.current = stickerBounds
  }

  // ── Drag and drop directo sobre el canvas: mover texto o sticker ──
  function canvasPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function inBounds(pt, b) {
    return b && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h
  }

  function handleCanvasDown(e) {
    const pt = canvasPoint(e)
    if (inBounds(pt, stickerBoundsRef.current)) {
      dragRef.current = { type: 'sticker' }
    } else if (inBounds(pt, textBoundsRef.current)) {
      dragRef.current = { type: 'text' }
    }
  }

  function handleCanvasMove(e) {
    if (!dragRef.current) return
    const pt = canvasPoint(e)
    const { w, h } = getDims(tipo, formato)
    if (dragRef.current.type === 'sticker') {
      setStickerPos({ x: clamp(pt.x / w, 0.05, 0.95), y: clamp(pt.y / h, 0.05, 0.95) })
    } else {
      setTextPos({ x: clamp(pt.x / w, 0.05, 0.95), y: clamp(pt.y / h, 0.05, 0.95) })
    }
  }

  function handleCanvasUp() { dragRef.current = null }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const asset = await uploadOriginal(client.id, file, uploadKind)
      setAssets(prev => [asset, ...prev])
      notify('Imagen subida al banco')
    } catch (err) {
      notify('Error subiendo: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleUploadSticker = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingSticker(true)
    try {
      const asset = await uploadOriginal(client.id, file, 'sticker')
      setStickers(prev => [asset, ...prev])
      notify('Sticker/vector subido')
    } catch (err) {
      notify('Error subiendo sticker: ' + err.message + (err.message?.includes('check') ? ' — corré la migración 0008 en Supabase.' : ''))
    } finally {
      setUploadingSticker(false)
      e.target.value = ''
    }
  }

  const handleDeleteAsset = async (asset) => {
    try {
      await deleteAsset(asset)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
      setStickers(prev => prev.filter(a => a.id !== asset.id))
      if (selectedAsset?.id === asset.id) setSelectedAsset(null)
      if (selectedSticker?.id === asset.id) setSelectedSticker(null)
      setBatchIds(prev => prev.filter(id => id !== asset.id))
    } catch (err) {
      notify('Error borrando: ' + err.message)
    }
  }

  const toggleBatch = (asset) => {
    setBatchIds(prev => prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id])
    if (!selectedAsset) setSelectedAsset(asset)
  }

  const handleSelectAsset = (asset) => {
    if (batchMode) { toggleBatch(asset); return }
    setSelectedAsset(asset)
  }

  const handleSaveToBanco = async () => {
    const targets = batchMode && batchIds.length
      ? assets.filter(a => batchIds.includes(a.id))
      : (selectedAsset ? [selectedAsset] : [])
    if (!targets.length) { notify('Elegí una imagen del banco primero'); return }
    if (tipo === 'carrusel' && targets.length < 2) { notify('Un carrusel necesita al menos 2 fotos — marcá más en el banco de la izquierda'); return }

    setSaving(true)
    try {
      const { w, h } = getDims(tipo, formato)
      const offscreen = document.createElement('canvas')
      offscreen.width = w
      offscreen.height = h
      const ctx = offscreen.getContext('2d')

      const renderedPaths = []
      for (const asset of targets) {
        const img = await loadFullImage(asset.storage_path)
        renderFrame(ctx, w, h, {
          img, text: overlayText, textPos, fontSize, textColor, bgColor, bgBar,
          font: resolvedFont, stickerImg: stickerImgRef.current, stickerPos, stickerScale,
        })
        const blob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/png'))
        const filename = `${tipo}-${Date.now()}-${renderedPaths.length}.png`
        renderedPaths.push(await uploadPieza(client.id, blob, filename))
      }

      if (tipo === 'carrusel') {
        const pieza = await createPieza({
          client_id: client.id,
          source_asset_id: targets[0].id,
          tipo: 'carrusel',
          formato,
          storage_path: renderedPaths[0],
          carousel_paths: renderedPaths.slice(1),
          overlay_text: overlayText || null,
          caption: caption || null,
          tags: tags || null,
          estado: 'banco',
        })
        setPiezas(prev => [pieza, ...prev])
        notify(`Carrusel de ${renderedPaths.length} fotos agregado al banco`)
      } else {
        for (let i = 0; i < renderedPaths.length; i++) {
          const pieza = await createPieza({
            client_id: client.id,
            source_asset_id: targets[i].id,
            tipo,
            formato: tipo === 'historia' ? null : formato,
            storage_path: renderedPaths[i],
            overlay_text: overlayText || null,
            caption: tipo === 'post' ? (caption || null) : null,
            tags: tipo === 'post' ? (tags || null) : null,
            estado: 'banco',
          })
          setPiezas(prev => [pieza, ...prev])
        }
        notify(renderedPaths.length > 1
          ? `${renderedPaths.length} ${tipo === 'historia' ? 'historias agregadas' : 'posts agregados'} al banco`
          : `${tipo === 'historia' ? 'Historia' : 'Post'} agregado al banco semanal/mensual`)
      }

      setOverlayText('')
      setCaption('')
      setTags('')
      setBatchIds([])
    } catch (err) {
      notify('Error guardando: ' + err.message + (err.message?.includes('carousel_paths') || err.message?.includes('tags') ? ' — corré la migración 0009 en Supabase.' : ''))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveReel = async () => {
    if (!reelFile) { notify('Elegí un video primero'); return }
    setUploadingReel(true)
    try {
      const path = await uploadPieza(client.id, reelFile, `reel-${Date.now()}-${reelFile.name}`)
      const pieza = await createPieza({
        client_id: client.id,
        tipo: 'reel',
        formato,
        storage_path: path,
        caption: caption || null,
        tags: tags || null,
        estado: 'banco',
      })
      setPiezas(prev => [pieza, ...prev])
      notify('Reel agregado al banco')
      setReelFile(null)
      setCaption('')
      setTags('')
    } catch (err) {
      notify('Error subiendo reel: ' + err.message)
    } finally {
      setUploadingReel(false)
    }
  }

  // ── Subir un diseño ya terminado (Canva, Photoshop, etc) directo al
  // banco, sin pasar por el canvas/overlay. Sube el archivo tal cual —
  // mismo patrón que handleSaveReel, generalizado a imágenes. Esto evita
  // el re-render a PNG que hace handleSaveToBanco (que igual re-sube el
  // archivo aunque no se toque el overlay).
  const handleUploadFinished = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFinished(true)
    try {
      const path = await uploadPieza(client.id, file, `${tipo}-${Date.now()}-${file.name}`)
      const pieza = await createPieza({
        client_id: client.id,
        tipo,
        formato: tipo === 'historia' ? null : formato,
        storage_path: path,
        caption: (tipo === 'post' || tipo === 'carrusel') ? (caption || null) : null,
        tags: (tipo === 'post' || tipo === 'carrusel') ? (tags || null) : null,
        estado: 'banco',
      })
      setPiezas(prev => [pieza, ...prev])
      notify('Diseño subido directo al banco (sin pasar por el editor)')
    } catch (err) {
      notify('Error subiendo: ' + err.message)
    } finally {
      setUploadingFinished(false)
      e.target.value = ''
    }
  }

  const handleDeletePieza = async (pieza) => {
    try {
      await deletePieza(pieza)
      setPiezas(prev => prev.filter(p => p.id !== pieza.id))
    } catch (err) {
      notify('Error borrando: ' + err.message)
    }
  }

  const handleUploadFont = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFont(true)
    try {
      const path = await uploadBrandFont(client.id, file)
      setBrandForm(f => ({ ...f, fontSource: 'custom', fontPath: path }))
      notify('Fuente subida — no olvides "Guardar marca"')
    } catch (err) {
      notify('Error subiendo fuente: ' + err.message)
    } finally {
      setUploadingFont(false)
      e.target.value = ''
    }
  }

  const handleSaveBrand = async () => {
    if (!brandForm) return
    setSavingBrand(true)
    try {
      await updateBrand(client.id, {
        brand_font_source: brandForm.fontSource,
        brand_font_family: brandForm.fontFamily,
        ...(brandForm.fontPath ? { brand_font_path: brandForm.fontPath } : {}),
        brand_text_color: brandForm.textColor,
        brand_bg_color: brandForm.bgColor,
      })
      notify('Marca guardada')
      setShowBrand(false)
    } catch (err) {
      notify('Error guardando marca: ' + err.message)
    } finally {
      setSavingBrand(false)
    }
  }

  const dims = getDims(tipo, formato)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <SLabel accent={client.color}>Generador de historias y posteos</SLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={() => setShowBrand(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={13} /> Marca de {client.name}</Btn>
        </div>
      </div>

      {showBrand && brandForm && (
        <Card accent={T.primary}>
          <SLabel accent={T.primary}>Marca — tipografía y colores del overlay</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Fuente de Google Fonts</div>
              <Sel
                value={brandForm.fontSource === 'google' ? brandForm.fontFamily : ''}
                onChange={e => setBrandForm(f => ({ ...f, fontSource: 'google', fontFamily: e.target.value }))}
                options={BRAND_FONTS.map(f => ({ v: f, l: f }))}
                style={{ width: '100%' }}
              />
              <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: T.text, fontFamily: brandForm.fontSource === 'google' ? `"${brandForm.fontFamily}"` : 'inherit' }}>
                {client.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>O subí la fuente propia de la marca (.woff2 / .ttf / .otf)</div>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: T.surf2, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2,
                fontSize: 11, color: T.sub, cursor: uploadingFont ? 'not-allowed' : 'pointer', padding: '8px',
              }}>
                {uploadingFont
                  ? 'Subiendo…'
                  : brandForm.fontSource === 'custom'
                    ? <><Check size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Fuente propia cargada — subir otra</>
                    : <><Plus size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Subir fuente propia</>}
                <input type="file" accept=".woff,.woff2,.ttf,.otf" style={{ display: 'none' }} onChange={handleUploadFont} disabled={uploadingFont} />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: T.dim, display: 'flex', alignItems: 'center', gap: 6 }}>
              Color de texto <input type="color" value={brandForm.textColor} onChange={e => setBrandForm(f => ({ ...f, textColor: e.target.value }))} />
            </label>
            <label style={{ fontSize: 10, color: T.dim, display: 'flex', alignItems: 'center', gap: 6 }}>
              Color de franja <input type="color" value={brandForm.bgColor} onChange={e => setBrandForm(f => ({ ...f, bgColor: e.target.value }))} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleSaveBrand} disabled={savingBrand}>{savingBrand ? 'Guardando…' : 'Guardar marca'}</Btn>
            <Btn variant="ghost" onClick={() => setShowBrand(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── Banco de fotos/diseños ─────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <SLabel style={{ marginBottom: 0 }}>Banco de fotos/diseños</SLabel>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.sub, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={batchMode} onChange={e => { setBatchMode(e.target.checked); setBatchIds([]) }} />
            Modo lote (elegir varias fotos para el mismo diseño)
          </label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <Sel value={uploadKind} onChange={e => setUploadKind(e.target.value)}
              options={[{ v: 'foto', l: 'Foto' }, { v: 'diseno', l: 'Diseño' }]} />
            <label style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.surf2, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2,
              fontSize: 11, color: T.sub, cursor: uploading ? 'not-allowed' : 'pointer', padding: '0 8px',
            }}>
              {uploading ? 'Subiendo…' : <><Plus size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Subir</>}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {assets.map(a => {
              const isSel = batchMode ? batchIds.includes(a.id) : selectedAsset?.id === a.id
              return (
                <div key={a.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => handleSelectAsset(a)}
                    style={{
                      aspectRatio: '1', borderRadius: RADIUS.sm - 3, overflow: 'hidden', cursor: 'pointer',
                      background: T.surf2,
                      border: isSel ? `2px solid ${T.primary}` : `1px solid ${T.border2}`,
                      boxShadow: isSel ? SHADOW.xs : 'none',
                    }}
                  >
                    {thumbs[a.id] && <img src={thumbs[a.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  {batchMode && isSel && (
                    <div style={{
                      position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%',
                      background: T.primary, color: '#fff', fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{batchIds.indexOf(a.id) + 1}</div>
                  )}
                  <span
                    onClick={() => handleDeleteAsset(a)}
                    style={{
                      position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                      background: 'rgba(0,0,0,.6)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  ><X size={10} /></span>
                </div>
              )
            })}
            {!loadingLists && !assets.length && (
              <div style={{ fontSize: 11, color: T.dim, gridColumn: '1 / -1' }}>Todavía no subiste nada para {client.name}.</div>
            )}
          </div>

          {/* ── Stickers / vectores ─────────────────────────────── */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              <Layers size={12} /> Stickers / vectores
            </div>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.surf2, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2,
              fontSize: 11, color: T.sub, cursor: uploadingSticker ? 'not-allowed' : 'pointer', padding: '7px 8px', marginBottom: 8,
            }}>
              {uploadingSticker ? 'Subiendo…' : <><Plus size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Subir PNG/SVG transparente</>}
              <input type="file" accept="image/png,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleUploadSticker} disabled={uploadingSticker} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {stickers.map(s => (
                <div key={s.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => setSelectedSticker(selectedSticker?.id === s.id ? null : s)}
                    style={{
                      aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                      background: '#00000008',
                      border: selectedSticker?.id === s.id ? `2px solid ${T.primary}` : `1px solid ${T.border2}`,
                    }}
                  >
                    {stickerThumbs[s.id] && <img src={stickerThumbs[s.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </div>
                  <span onClick={() => handleDeleteAsset(s)} style={{
                    position: 'absolute', top: 1, right: 1, width: 14, height: 14, borderRadius: '50%',
                    background: 'rgba(0,0,0,.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}><X size={8} /></span>
                </div>
              ))}
              {!stickers.length && <div style={{ fontSize: 10, color: T.dim, gridColumn: '1 / -1' }}>Sin stickers todavía.</div>}
            </div>
            {selectedSticker && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Move size={10} /> Arrastralo sobre la imagen · Tamaño</div>
                <input type="range" min="0.08" max="0.6" step="0.01" value={stickerScale} onChange={e => setStickerScale(+e.target.value)} style={{ width: '100%' }} />
              </div>
            )}
          </div>
        </Card>

        {/* ── Editor + preview ───────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SLabel style={{ marginBottom: 0 }}>Editor de overlay</SLabel>
            {batchMode && batchIds.length > 0 && (
              <Tag color={T.primary}>{batchIds.length} fotos seleccionadas</Tag>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {tipo !== 'reel' && (
              <div style={{ flexShrink: 0 }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasDown}
                  onMouseMove={handleCanvasMove}
                  onMouseUp={handleCanvasUp}
                  onMouseLeave={handleCanvasUp}
                  style={{
                    width: dims.dispW, height: dims.dispH, borderRadius: RADIUS.sm, cursor: 'move',
                    background: T.surf2, border: `1px solid ${T.border2}`, boxShadow: SHADOW.sm, display: 'block',
                  }}
                />
                <div style={{ fontSize: 9, color: T.dim, marginTop: 6, textAlign: 'center' }}>{dims.w}×{dims.h}px</div>
                {assetQuality && (
                  <div style={{
                    marginTop: 4, fontSize: 9, textAlign: 'center', fontWeight: 600,
                    color: assetQuality.low ? T.warn : T.green,
                  }}>
                    {assetQuality.low
                      ? `⚠ Original ${assetQuality.w}×${assetQuality.h}px — un poco justo, Instagram recomienda 1080px+`
                      : `✓ Original ${assetQuality.w}×${assetQuality.h}px — buena calidad`}
                  </div>
                )}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Tipo de publicación</div>
                <Sel value={tipo} onChange={e => setTipo(e.target.value)} options={TIPO_OPTIONS} style={{ width: '100%' }} />
              </div>

              {tipo !== 'historia' && (
                <div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Formato</div>
                  <Sel value={formato} onChange={e => setFormato(e.target.value)}
                    options={(FORMATOS[tipo] || FORMATOS.post).map(f => ({ v: f.v, l: f.l }))} style={{ width: '100%' }} />
                </div>
              )}

              {tipo !== 'reel' && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  background: T.surf2, border: `1px dashed ${T.border2}`, borderRadius: RADIUS.sm - 2,
                  padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.4 }}>
                    ¿Ya lo tenés diseñado (Canva, Photoshop, etc)? Subilo tal cual, sin pasar por el editor de acá abajo.
                  </div>
                  <label style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2,
                    fontSize: 10.5, color: T.sub, cursor: uploadingFinished ? 'not-allowed' : 'pointer', padding: '6px 10px', whiteSpace: 'nowrap',
                  }}>
                    {uploadingFinished ? 'Subiendo…' : <><Plus size={11} style={{ marginRight: 4, verticalAlign: -2 }} />Subir diseño</>}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadFinished} disabled={uploadingFinished} />
                  </label>
                </div>
              )}

              {tipo === 'reel' ? (
                <>
                  <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.5 }}>
                    Los Reels se suben tal cual (sin overlay de texto acá) — subí el video ya editado.
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: T.surf2, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2,
                    fontSize: 11, color: T.sub, cursor: 'pointer', padding: '10px',
                  }}>
                    {reelFile ? <><Check size={12} style={{ marginRight: 5, verticalAlign: -2 }} />{reelFile.name}</> : <><Plus size={12} style={{ marginRight: 5, verticalAlign: -2 }} />Elegir video</>}
                    <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setReelFile(e.target.files[0] || null)} />
                  </label>
                  <div>
                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Caption</div>
                    <Input value={caption} onChange={e => setCaption(e.target.value)}
                      placeholder="Texto para el pie del reel…" multiline rows={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Hashtags / @menciones</div>
                    <Input value={tags} onChange={e => setTags(e.target.value)}
                      placeholder="#cafe #especialidad @mrgreencoffee" />
                  </div>
                  <Btn onClick={handleSaveReel} disabled={!reelFile || uploadingReel} variant="success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {uploadingReel ? 'Subiendo…' : <><Plus size={13} /> Agregar reel al banco</>}
                  </Btn>
                </>
              ) : (
                <>
                  {tipo === 'carrusel' && (
                    <div style={{ fontSize: 10, color: T.dim, lineHeight: 1.5 }}>
                      Marcá 2 o más fotos en el banco de la izquierda (quedó activado el modo lote). El overlay de acá se aplica igual a todas.
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Texto sobre la imagen</div>
                    <Input value={overlayText} onChange={e => setOverlayText(e.target.value)}
                      placeholder="Ej: 2x1 en cafés hasta el domingo" multiline rows={2} />
                    <div style={{ fontSize: 9, color: T.dim, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Move size={10} /> Arrastrá el texto directo sobre la imagen para moverlo.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Tamaño texto</div>
                    <input type="range" min="36" max="140" value={fontSize}
                      onChange={e => setFontSize(+e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 10, color: T.dim, display: 'flex', alignItems: 'center', gap: 5 }}>
                      Texto <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                    </label>
                    <label style={{ fontSize: 11, color: T.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={bgBar} onChange={e => setBgBar(e.target.checked)} /> Franja de fondo
                    </label>
                    {bgBar && (
                      <label style={{ fontSize: 10, color: T.dim, display: 'flex', alignItems: 'center', gap: 5 }}>
                        Color franja <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                      </label>
                    )}
                  </div>
                  {(tipo === 'post' || tipo === 'carrusel') && (
                    <>
                      <div>
                        <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Caption</div>
                        <Input value={caption} onChange={e => setCaption(e.target.value)}
                          placeholder="Texto para el pie del posteo…" multiline rows={3} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Hashtags / @menciones</div>
                        <Input value={tags} onChange={e => setTags(e.target.value)}
                          placeholder="#cafe #especialidad @mrgreencoffee" />
                      </div>
                    </>
                  )}
                  <Btn onClick={handleSaveToBanco} disabled={(!selectedAsset && !batchIds.length) || saving} variant="success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {saving ? 'Guardando…' : <><Plus size={13} /> {batchMode && batchIds.length > 1 ? `Agregar ${batchIds.length} al banco` : 'Agregar al banco'}</>}
                  </Btn>
                </>
              )}
              {!selectedAsset && !batchIds.length && (
                <div style={{ fontSize: 10, color: T.dim
                }}>Elegí una foto o diseño del banco de la izquierda.</div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Banco semanal/mensual del cliente ──────────────────── */}
        <Card>
          <SLabel>Banco — {client.name}</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
            {piezas.map(p => (
              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.surf2, borderRadius: RADIUS.sm - 4, padding: 8 }}>
                <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.surf }}>
                  {p.tipo === 'reel'
                    ? (piezaThumbs[p.id]
                        // <video preload="metadata"> solo baja el header del archivo (duración/
                        // dimensiones), no el video entero — a diferencia de meterlo en un <img>,
                        // que fuerza al navegador a bajar todos los bytes igual sin poder
                        // decodificarlo como imagen.
                        ? <video src={`${piezaThumbs[p.id]}#t=0.1`} muted playsInline preload="metadata"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : null)
                    : ((piezaThumbs[p.id] || p.external_image_url)
                        ? <img src={piezaThumbs[p.id] || p.external_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : null)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: T.text, fontWeight: 600 }}>
                    {TIPO_OPTIONS.find(t => t.v === p.tipo)?.l || p.tipo}
                    {p.formato && <span style={{ color: T.dim, fontWeight: 400 }}> · {(FORMATOS[p.tipo] || []).find(f => f.v === p.formato)?.l || p.formato}</span>}
                  </div>
                  <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.estado}</div>
                  {p.overlay_text && <div style={{ fontSize: 10, color: T.sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.overlay_text}</div>}
                </div>
                <span onClick={() => handleDeletePieza(p)} style={{ cursor: 'pointer', color: T.dim, display: 'flex' }}><X size={13} /></span>
              </div>
            ))}
            {!loadingLists && !piezas.length && (
              <div style={{ fontSize: 11, color: T.dim }}>Banco vacío todavía.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
