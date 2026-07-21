import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, SLabel, Btn, Input, Sel } from '../ui'
import { T } from '../../tokens'
import { listAssets, listPiezas, createPieza, deleteAsset, deletePieza } from '../../lib/piezas'
import { uploadOriginal, uploadPieza, getSignedUrl } from '../../lib/storage'

const DIMENSIONS = {
  historia: { w: 1080, h: 1920, dispW: 162, dispH: 288 },
  post:     { w: 1080, h: 1080, dispW: 220, dispH: 220 },
}

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

export function ModGenerador({ client, notify }) {
  const [assets, setAssets]     = useState([])
  const [piezas, setPiezas]     = useState([])
  const [thumbs, setThumbs]     = useState({})
  const [piezaThumbs, setPiezaThumbs] = useState({})
  const [loadingLists, setLoadingLists] = useState(true)

  const [uploadKind, setUploadKind] = useState('foto')
  const [uploading,  setUploading]  = useState(false)

  const [selectedAsset, setSelectedAsset] = useState(null)
  const [tipo,        setTipo]        = useState('historia')
  const [overlayText, setOverlayText] = useState('')
  const [caption,     setCaption]     = useState('')
  const [position,    setPosition]    = useState('bottom')
  const [fontSize,    setFontSize]    = useState(72)
  const [textColor,   setTextColor]   = useState('#FFFFFF')
  const [bgBar,       setBgBar]       = useState(true)
  const [saving,      setSaving]      = useState(false)

  const canvasRef = useRef(null)
  const imgRef    = useRef(null)

  // ── cargar banco de assets y piezas al entrar / cambiar de cliente ──
  useEffect(() => {
    let cancelled = false
    setSelectedAsset(null)
    setLoadingLists(true)
    Promise.all([listAssets(client.id), listPiezas(client.id)])
      .then(([a, p]) => { if (!cancelled) { setAssets(a); setPiezas(p) } })
      .catch(err => notify('Error cargando: ' + err.message))
      .finally(() => { if (!cancelled) setLoadingLists(false) })
    return () => { cancelled = true }
  }, [client.id])

  // ── thumbnails de assets ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all(assets.map(a => getSignedUrl(a.storage_path, 900).then(url => [a.id, url]).catch(() => [a.id, null])))
      .then(entries => { if (!cancelled) setThumbs(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [assets])

  // ── thumbnails de piezas ya generadas ────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all(piezas.map(p => getSignedUrl(p.storage_path, 900).then(url => [p.id, url]).catch(() => [p.id, null])))
      .then(entries => { if (!cancelled) setPiezaThumbs(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [piezas])

  // ── cargar imagen seleccionada en un <Image> para el canvas ──────
  useEffect(() => {
    if (!selectedAsset) { imgRef.current = null; draw(); return }
    let cancelled = false
    getSignedUrl(selectedAsset.storage_path, 600).then(url => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { if (!cancelled) { imgRef.current = img; draw() } }
      img.src = url
    }).catch(err => notify('Error cargando imagen: ' + err.message))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset])

  // ── redibujar cuando cambian los controles del overlay ───────────
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, overlayText, position, fontSize, textColor, bgBar])

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = DIMENSIONS[tipo]
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = T.surf2
    ctx.fillRect(0, 0, w, h)

    const img = imgRef.current
    if (img) {
      const scale = Math.max(w / img.width, h / img.height)
      const sw = w / scale, sh = h / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    }

    const text = overlayText.trim()
    if (text) {
      ctx.font = `700 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const maxWidth = w * 0.86
      const lines = wrapText(ctx, text, maxWidth)
      const lineHeight = fontSize * 1.25
      const totalHeight = lines.length * lineHeight
      let centerY
      if (position === 'top') centerY = h * 0.14 + totalHeight / 2
      else if (position === 'bottom') centerY = h * 0.86 - totalHeight / 2
      else centerY = h / 2

      if (bgBar) {
        const pad = fontSize * 0.45
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, centerY - totalHeight / 2 - pad, w, totalHeight + pad * 2)
      }

      ctx.fillStyle = textColor
      lines.forEach((line, i) => {
        const y = centerY - totalHeight / 2 + (i + 0.5) * lineHeight
        ctx.fillText(line, w / 2, y)
      })
    }
  }

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

  const handleDeleteAsset = async (asset) => {
    try {
      await deleteAsset(asset)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
      if (selectedAsset?.id === asset.id) setSelectedAsset(null)
    } catch (err) {
      notify('Error borrando: ' + err.message)
    }
  }

  const handleSaveToBanco = async () => {
    if (!selectedAsset || !canvasRef.current) { notify('Elegí una imagen del banco primero'); return }
    setSaving(true)
    try {
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'))
      const filename = `${tipo}-${Date.now()}.png`
      const path = await uploadPieza(client.id, blob, filename)
      const pieza = await createPieza({
        client_id: client.id,
        source_asset_id: selectedAsset.id,
        tipo,
        storage_path: path,
        overlay_text: overlayText || null,
        caption: tipo === 'post' ? (caption || null) : null,
        estado: 'banco',
      })
      setPiezas(prev => [pieza, ...prev])
      notify(`${tipo === 'historia' ? 'Historia' : 'Post'} agregado al banco semanal/mensual`)
      setOverlayText('')
      setCaption('')
    } catch (err) {
      notify('Error guardando: ' + err.message)
    } finally {
      setSaving(false)
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

  const dims = DIMENSIONS[tipo]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SLabel accent={client.color}>Generador de historias y posteos</SLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── Banco de fotos/diseños ─────────────────────────────── */}
        <Card>
          <SLabel>Banco de fotos/diseños</SLabel>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <Sel value={uploadKind} onChange={e => setUploadKind(e.target.value)}
              options={[{ v: 'foto', l: 'Foto' }, { v: 'diseno', l: 'Diseño' }]} />
            <label style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.surf2, border: `1px solid ${T.border2}`, borderRadius: 7,
              fontSize: 11, color: T.sub, cursor: uploading ? 'not-allowed' : 'pointer', padding: '0 8px',
            }}>
              {uploading ? 'Subiendo…' : '+ Subir'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
            {assets.map(a => (
              <div key={a.id} style={{ position: 'relative' }}>
                <div
                  onClick={() => setSelectedAsset(a)}
                  style={{
                    aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                    background: T.surf2,
                    border: selectedAsset?.id === a.id ? `2px solid ${T.primary}` : `1px solid ${T.border2}`,
                  }}
                >
                  {thumbs[a.id] && <img src={thumbs[a.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <span
                  onClick={() => handleDeleteAsset(a)}
                  style={{
                    position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                    background: 'rgba(0,0,0,.6)', color: T.sub, fontSize: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >✕</span>
              </div>
            ))}
            {!loadingLists && !assets.length && (
              <div style={{ fontSize: 11, color: T.dim, gridColumn: '1 / -1' }}>Todavía no subiste nada para {client.name}.</div>
            )}
          </div>
        </Card>

        {/* ── Editor + preview ───────────────────────────────────── */}
        <Card>
          <SLabel>Editor de overlay</SLabel>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: dims.dispW, height: dims.dispH, borderRadius: 8,
                background: T.surf2, border: `1px solid ${T.border2}`, flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Tipo</div>
                <Sel value={tipo} onChange={e => setTipo(e.target.value)}
                  options={[{ v: 'historia', l: 'Historia' }, { v: 'post', l: 'Post (feed)' }]} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Texto sobre la imagen</div>
                <Input value={overlayText} onChange={e => setOverlayText(e.target.value)}
                  placeholder="Ej: 2x1 en cafés hasta el domingo" multiline rows={2} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Posición</div>
                  <Sel value={position} onChange={e => setPosition(e.target.value)}
                    options={[{ v: 'top', l: 'Arriba' }, { v: 'center', l: 'Centro' }, { v: 'bottom', l: 'Abajo' }]} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Tamaño texto</div>
                  <input type="range" min="36" max="140" value={fontSize}
                    onChange={e => setFontSize(+e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                <label style={{ fontSize: 11, color: T.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={bgBar} onChange={e => setBgBar(e.target.checked)} /> Franja de fondo
                </label>
              </div>
              {tipo === 'post' && (
                <div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Caption del post</div>
                  <Input value={caption} onChange={e => setCaption(e.target.value)}
                    placeholder="Texto para el pie del posteo" multiline rows={3} />
                </div>
              )}
              <Btn onClick={handleSaveToBanco} disabled={!selectedAsset || saving} variant="success">
                {saving ? 'Guardando…' : '+ Agregar al banco'}
              </Btn>
              {!selectedAsset && (
                <div style={{ fontSize: 10, color: T.dim }}>Elegí una foto o diseño del banco de la izquierda.</div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Banco semanal/mensual del cliente ──────────────────── */}
        <Card>
          <SLabel>Banco — {client.name}</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
            {piezas.map(p => (
              <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: T.surf2, borderRadius: 6, padding: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: T.surf }}>
                  {piezaThumbs[p.id] && <img src={piezaThumbs[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{p.tipo === 'historia' ? 'Historia' : 'Post'}</div>
                  <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.estado}</div>
                </div>
                <span onClick={() => handleDeletePieza(p)} style={{ cursor: 'pointer', color: T.dim, fontSize: 12 }}>✕</span>
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
