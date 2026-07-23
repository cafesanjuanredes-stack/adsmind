import { useState, useEffect, useCallback } from 'react'
import { Card, SLabel, Btn, Input, Sel } from '../ui'
import { T, RADIUS, SHADOW, PLATFORM_META } from '../../tokens'
import { fmtNum } from '../../utils/format'
import { listPiezas, updatePiezaEstado } from '../../lib/piezas'
import { getSignedUrl } from '../../lib/storage'
import { listVideos, createVideo, updateVideo, deleteVideo, syncYoutubeStats } from '../../lib/videosExternos'
import { listContentTasks, createContentTask, updateContentTask, toggleContentTaskDone, deleteContentTask } from '../../lib/contentTasks'
import { getContentGoal, saveContentGoal } from '../../lib/contentGoals'
import { listTrips, createTrip, updateTrip, deleteTrip } from '../../lib/trips'
import { getLatestMetrica, createMetrica, importExistingPosts } from '../../lib/metricas'
import { getUpcomingFindeLargo, getEfemerideFor } from '../../data/efemerides'
import { ChevronLeft, ChevronRight, X, Plus, CircleDot, LayoutGrid, Play, AlertTriangle, Check, Calendar as CalIcon, Rows3, Images, Film, Clapperboard, PartyPopper, Megaphone, Trash2, ClipboardList, Plane, DownloadCloud } from 'lucide-react'

const DIA_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TIPO_META = {
  historia: { label: 'Historia', color: T.violet, icon: CircleDot },
  post:     { label: 'Post',     color: T.cyan,   icon: LayoutGrid },
  carrusel: { label: 'Carrusel', color: T.pink,   icon: Images },
  reel:     { label: 'Reel',     color: T.green,  icon: Film },
  video:    { label: 'Video',    color: T.orange, icon: Play },
}
const TASK_KIND_META = {
  filmacion: { label: 'Filmación', color: T.blue,   icon: Clapperboard },
  evento:    { label: 'Evento',    color: T.orange, icon: PartyPopper },
}

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

// Formatea 'YYYY-MM-DD' (fecha plana, sin hora/TZ) a "9 jul" en es-AR.
function toEsDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Suma días a una fecha plana 'YYYY-MM-DD' y devuelve otra fecha plana.
function addDaysISO(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// scheduled_for se guarda en UTC — hay que convertirlo a la hora local
// del navegador (Argentina) para mostrarlo y para reprogramarlo sin que
// se corra 3 horas en cada drag.
function localTimeStr(isoUtc) {
  if (!isoUtc) return ''
  return new Date(isoUtc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// 'en-CA' da directo el formato YYYY-MM-DD, en hora local (no UTC).
function localDateStr(isoUtc) {
  if (!isoUtc) return ''
  return new Date(isoUtc).toLocaleDateString('en-CA')
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // lunes=0
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return { date: d, inMonth: d.getMonth() === month }
  })
}

function buildWeekGrid(anchorDate) {
  const d = new Date(anchorDate)
  const offset = (d.getDay() + 6) % 7 // lunes=0
  const monday = new Date(d)
  monday.setDate(d.getDate() - offset)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

// ── Miniatura de una pieza/video programado — arrastrable ──────────
function ItemThumb({ item, thumbs, size, onClick, onDragStart, onDragEnd }) {
  const isTask = item.kind === 'task'
  const tipo = item.kind === 'video' ? 'video' : item.data.tipo
  const meta = isTask ? TASK_KIND_META[item.data.kind] : TIPO_META[tipo]
  const isError = item.kind === 'pieza' && item.data.estado === 'error'
  const isPublished = !isTask && (item.data.estado === 'publicada' || item.data.estado === 'publicado')
  const isDone = isTask && item.data.done
  const img = item.kind === 'pieza' ? thumbs[item.data.id] : null
  const badgeColor = isError ? T.red : (isPublished || isDone) ? T.active : meta.color

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        position: 'relative', width: size, height: size, borderRadius: RADIUS.sm - 3, overflow: 'hidden',
        background: T.surf2, cursor: 'grab', flexShrink: 0,
        border: isError ? `2px solid ${T.red}` : `1px solid ${T.border2}`,
        boxShadow: SHADOW.xs,
        opacity: isDone ? 0.55 : 1,
      }}
    >
      {(img || (item.kind === 'pieza' && item.data.external_image_url))
        ? <img src={img || item.data.external_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.color + '18' }}>
            <meta.icon size={Math.round(size * 0.4)} color={meta.color} />
          </div>
        )}
      <div style={{
        position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: '50%',
        background: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,.35)',
      }}>
        {isError ? <AlertTriangle size={9} color="#fff" /> : (isPublished || isDone) ? <Check size={9} color="#fff" /> : <meta.icon size={9} color="#fff" />}
      </div>
    </div>
  )
}

export function ModCalendario({ client, notify }) {
  const [view, setView] = useState('mes') // 'mes' | 'semana'
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [piezas, setPiezas] = useState([])
  const [videos, setVideos] = useState([])
  const [tasks, setTasks] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [loading, setLoading] = useState(true)

  const [newTask, setNewTask] = useState({ title: '', kind: 'filmacion', platform: '', dueDate: '' })
  const [savingTask, setSavingTask] = useState(false)

  const [newVideo, setNewVideo] = useState({ titulo: '', videoUrl: '', scheduledFor: '', scheduledTime: '10:00' })
  const [savingVideo, setSavingVideo] = useState(false)
  const [syncingYoutube, setSyncingYoutube] = useState(false)
  const [scheduleDates, setScheduleDates] = useState({}) // { [piezaId]: 'YYYY-MM-DD' }
  const [scheduleTimes, setScheduleTimes] = useState({}) // { [piezaId]: 'HH:MM' }

  const [dragging, setDragging] = useState(null) // { kind, id, defaultTime }
  const [dragOverKey, setDragOverKey] = useState(null)

  const [editingItem, setEditingItem] = useState(null) // { kind, data }
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [metricaDraft, setMetricaDraft] = useState({ reach: '', likes: '', comments: '', saves: '', plays: '' })
  const [savingMetrica, setSavingMetrica] = useState(false)

  const [goalItems, setGoalItems] = useState([])
  const [goalLoading, setGoalLoading] = useState(true)
  const [newGoalItem, setNewGoalItem] = useState({ label: '', tipo: '', qtyTarget: '' })

  const [trips, setTrips] = useState([])
  const [newTrip, setNewTrip] = useState({ title: '', startDate: '', endDate: '', notes: '' })
  const [savingTrip, setSavingTrip] = useState(false)
  const [tripItemDrafts, setTripItemDrafts] = useState({}) // { [tripId]: { label, tipo, qtyTarget } }

  const [importing, setImporting] = useState(false)

  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, v, t, tr] = await Promise.all([listPiezas(client.id), listVideos(client.id), listContentTasks(client.id), listTrips(client.id)])
      setPiezas(p)
      setVideos(v)
      setTasks(t)
      setTrips(tr)
    } catch (err) {
      notify('Error cargando calendario: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [client.id, notify])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    setGoalLoading(true)
    getContentGoal(client.id, monthStr)
      .then(g => { if (!cancelled) setGoalItems(g?.items || []) })
      .catch(err => notify('Error cargando plan del mes: ' + err.message))
      .finally(() => { if (!cancelled) setGoalLoading(false) })
    return () => { cancelled = true }
  }, [client.id, monthStr, notify])

  const persistGoalItems = async (items) => {
    setGoalItems(items)
    try {
      await saveContentGoal(client.id, monthStr, items)
    } catch (err) {
      notify('Error guardando el plan: ' + err.message)
    }
  }

  const handleAddGoalItem = () => {
    if (!newGoalItem.label) return
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: newGoalItem.label,
      tipo: newGoalItem.tipo || null,
      qty_target: newGoalItem.tipo ? (+newGoalItem.qtyTarget || 0) : 0,
      done: false,
    }
    persistGoalItems([...goalItems, item])
    setNewGoalItem({ label: '', tipo: '', qtyTarget: '' })
  }

  const handleToggleGoalItem = (id) => {
    persistGoalItems(goalItems.map(it => it.id === id ? { ...it, done: !it.done } : it))
  }

  const handleDeleteGoalItem = (id) => {
    persistGoalItems(goalItems.filter(it => it.id !== id))
  }

  // Progreso real de un item con tipo: cuenta piezas de ese tipo generadas
  // este mes (created_at), sin importar si ya se programaron/publicaron.
  const goalProgress = (item) => {
    if (!item.tipo) return null
    const count = piezas.filter(p => p.tipo === item.tipo && p.created_at?.slice(0, 7) === monthStr).length
    return count
  }

  useEffect(() => {
    let cancelled = false
    const withImage = piezas.filter(p => p.storage_path)
    Promise.all(withImage.map(p => getSignedUrl(p.storage_path, 900).then(url => [p.id, url]).catch(() => [p.id, null])))
      .then(entries => { if (!cancelled) setThumbs(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [piezas])

  const banco = piezas.filter(p => p.estado === 'banco')
  const grid = view === 'mes' ? buildMonthGrid(month) : buildWeekGrid(weekAnchor).map(date => ({ date, inMonth: true }))

  const itemsByDay = {}
  for (const p of piezas) {
    if (!p.scheduled_for) continue
    const key = p.scheduled_for.slice(0, 10)
    ;(itemsByDay[key] ||= []).push({ kind: 'pieza', data: p })
  }
  for (const v of videos) {
    if (!v.scheduled_for) continue
    const key = v.scheduled_for.slice(0, 10)
    ;(itemsByDay[key] ||= []).push({ kind: 'video', data: v })
  }
  for (const t of tasks) {
    if (!t.due_date) continue
    const key = t.due_date.slice(0, 10)
    ;(itemsByDay[key] ||= []).push({ kind: 'task', data: t })
  }

  const upcomingFinde = getUpcomingFindeLargo()
  const pendingTasks = tasks.filter(t => !t.done).sort((a, b) => a.due_date.localeCompare(b.due_date))

  const todayKey = dayKey(new Date())
  const tripForDay = (key) => trips.find(t => key >= t.start_date && key <= t.end_date)
  const activeTrip = trips.find(t => todayKey >= t.start_date && todayKey <= t.end_date)
  const upcomingTrip = !activeTrip
    ? trips.filter(t => t.start_date > todayKey).sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
    : null
  const highlightTrip = activeTrip || (upcomingTrip && upcomingTrip.start_date <= addDaysISO(todayKey, 10) ? upcomingTrip : null)

  const monthLabel = month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const weekDays = buildWeekGrid(weekAnchor)
  const weekLabel = `${weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`

  const handleProgramarPieza = async (pieza) => {
    const dateStr = scheduleDates[pieza.id]
    if (!dateStr) { notify('Elegí una fecha primero'); return }
    const timeStr = scheduleTimes[pieza.id] || '10:00'
    try {
      await updatePiezaEstado(pieza.id, 'programada', { scheduled_for: new Date(`${dateStr}T${timeStr}:00`).toISOString() })
      notify(`${pieza.tipo === 'historia' ? 'Historia' : 'Post'} programado para las ${timeStr}`)
      load()
    } catch (err) {
      notify('Error programando: ' + err.message)
    }
  }

  const handleVolverABanco = async (pieza) => {
    try {
      await updatePiezaEstado(pieza.id, 'banco', { scheduled_for: null })
      notify('Volvió al banco')
      closeEdit()
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  // ── Editar fecha/hora de algo ya programado ───────────────────────
  const openEdit = (kind, data) => {
    setEditingItem({ kind, data })
    setMetricaDraft({ reach: '', likes: '', comments: '', saves: '', plays: '' })
    if (kind === 'task') {
      setEditDate(data.due_date ? data.due_date.slice(0, 10) : dayKey(new Date()))
      setEditTime('')
    } else {
      setEditDate(data.scheduled_for ? localDateStr(data.scheduled_for) : dayKey(new Date()))
      setEditTime(data.scheduled_for ? localTimeStr(data.scheduled_for) : '10:00')
    }
    if (kind === 'pieza' && data.estado === 'publicada') {
      getLatestMetrica(data.id).then(m => {
        if (m) setMetricaDraft({ reach: m.reach ?? '', likes: m.likes ?? '', comments: m.comments ?? '', saves: m.saves ?? '', plays: m.plays ?? '' })
      }).catch(() => {})
    }
  }

  const handleSaveMetrica = async () => {
    if (!editingItem) return
    setSavingMetrica(true)
    try {
      await createMetrica({
        piezaId: editingItem.data.id,
        reach: +metricaDraft.reach || 0,
        likes: +metricaDraft.likes || 0,
        comments: +metricaDraft.comments || 0,
        saves: +metricaDraft.saves || 0,
        plays: +metricaDraft.plays || 0,
      })
      notify('Métricas guardadas')
    } catch (err) {
      notify('Error guardando métricas: ' + err.message)
    } finally {
      setSavingMetrica(false)
    }
  }

  const handleSyncYoutube = async () => {
    setSyncingYoutube(true)
    try {
      const res = await syncYoutubeStats(client.id)
      notify(res.updated > 0 ? `Se actualizaron ${res.updated} video(s) de YouTube` : (res.message || 'No hay videos de YouTube para sincronizar'))
      load()
    } catch (err) {
      notify('Error sincronizando YouTube: ' + err.message)
    } finally {
      setSyncingYoutube(false)
    }
  }

  const handleImportExisting = async () => {
    setImporting(true)
    try {
      const results = await importExistingPosts(client.id)
      const mine = results.find(r => r.client_id === client.id) || results[0]
      if (mine?.ok === false) throw new Error(mine.error)
      const n = mine?.imported ?? 0
      notify(n > 0 ? `Se importaron ${n} publicaciones con sus métricas` : 'No hay publicaciones nuevas para importar')
      load()
    } catch (err) {
      notify('Error importando: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const closeEdit = () => setEditingItem(null)

  const handleSaveEdit = async () => {
    if (!editingItem || !editDate || (editingItem.kind !== 'task' && !editTime)) return
    setSavingEdit(true)
    try {
      if (editingItem.kind === 'task') {
        await updateContentTask(editingItem.data.id, { due_date: editDate })
      } else {
        const iso = new Date(`${editDate}T${editTime}:00`).toISOString()
        if (editingItem.kind === 'pieza') {
          await updatePiezaEstado(editingItem.data.id, 'programada', { scheduled_for: iso, error_detail: null })
        } else {
          await updateVideo(editingItem.data.id, { scheduled_for: iso })
        }
      }
      notify('Horario actualizado')
      closeEdit()
      load()
    } catch (err) {
      notify('Error actualizando horario: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateVideo = async () => {
    if (!newVideo.titulo || !newVideo.videoUrl) return
    setSavingVideo(true)
    try {
      await createVideo({
        clientId: client.id,
        titulo: newVideo.titulo,
        videoUrl: newVideo.videoUrl,
        scheduledFor: newVideo.scheduledFor ? new Date(`${newVideo.scheduledFor}T${newVideo.scheduledTime || '10:00'}:00`).toISOString() : null,
      })
      setNewVideo({ titulo: '', videoUrl: '', scheduledFor: '', scheduledTime: '10:00' })
      notify('Video externo agregado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    } finally {
      setSavingVideo(false)
    }
  }

  const handleToggleVideoPublicado = async (video) => {
    try {
      await updateVideo(video.id, {
        estado: video.estado === 'publicado' ? 'programado' : 'publicado',
        published_at: video.estado === 'publicado' ? null : new Date().toISOString(),
      })
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleDeleteVideo = async (video) => {
    try {
      await deleteVideo(video.id)
      notify('Video eliminado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  // ── Tareas de filmación / eventos especiales ────────────────────────
  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.dueDate) return
    setSavingTask(true)
    try {
      await createContentTask({
        clientId: client.id,
        platform: newTask.platform || null,
        kind: newTask.kind,
        title: newTask.title,
        dueDate: newTask.dueDate,
      })
      setNewTask({ title: '', kind: 'filmacion', platform: '', dueDate: '' })
      notify('Tarea agregada al calendario')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    } finally {
      setSavingTask(false)
    }
  }

  const handleToggleTask = async (task) => {
    try {
      await toggleContentTaskDone(task.id, !task.done)
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleDeleteTask = async (task) => {
    try {
      await deleteContentTask(task.id)
      notify('Tarea eliminada')
      closeEdit()
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  // ── Viajes ────────────────────────────────────────────────────────
  const handleCreateTrip = async () => {
    if (!newTrip.title || !newTrip.startDate || !newTrip.endDate) return
    setSavingTrip(true)
    try {
      await createTrip({
        clientId: client.id,
        title: newTrip.title,
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        notes: newTrip.notes,
      })
      setNewTrip({ title: '', startDate: '', endDate: '', notes: '' })
      notify('Viaje agregado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    } finally {
      setSavingTrip(false)
    }
  }

  const handleDeleteTrip = async (trip) => {
    try {
      await deleteTrip(trip.id)
      notify('Viaje eliminado')
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const setTripDraft = (tripId, patch) =>
    setTripItemDrafts(d => ({ ...d, [tripId]: { label: '', tipo: '', qtyTarget: '', ...d[tripId], ...patch } }))

  const handleAddTripItem = async (trip) => {
    const draft = tripItemDrafts[trip.id]
    if (!draft?.label) return
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: draft.label,
      tipo: draft.tipo || null,
      qty_target: draft.tipo ? (+draft.qtyTarget || 0) : 0,
      done: false,
    }
    try {
      await updateTrip(trip.id, { items: [...(trip.items || []), item] })
      setTripItemDrafts(d => ({ ...d, [trip.id]: { label: '', tipo: '', qtyTarget: '' } }))
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleToggleTripItem = async (trip, itemId) => {
    try {
      await updateTrip(trip.id, {
        items: (trip.items || []).map(it => it.id === itemId ? { ...it, done: !it.done } : it),
      })
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  const handleDeleteTripItem = async (trip, itemId) => {
    try {
      await updateTrip(trip.id, { items: (trip.items || []).filter(it => it.id !== itemId) })
      load()
    } catch (err) {
      notify('Error: ' + err.message)
    }
  }

  // Progreso de un item de viaje: cuenta piezas de ese tipo creadas dentro
  // del rango de fechas del viaje (igual criterio que el plan mensual).
  const tripItemProgress = (trip, item) => {
    if (!item.tipo) return null
    return piezas.filter(p => p.tipo === item.tipo && p.created_at && p.created_at.slice(0, 10) >= trip.start_date && p.created_at.slice(0, 10) <= trip.end_date).length
  }

  // ── Arrastrar y soltar: reprogramar a otro día ─────────────────────
  const startDrag = (kind, data) => (e) => {
    const defaultTime = data.scheduled_for ? localTimeStr(data.scheduled_for) : '10:00'
    setDragging({ kind, id: data.id, defaultTime })
    e.dataTransfer.effectAllowed = 'move'
  }

  const endDrag = () => { setDragging(null); setDragOverKey(null) }

  const handleDropOnDay = async (dateObj) => {
    if (!dragging) return
    const dateStr = dayKey(dateObj)
    const timeStr = dragging.defaultTime || '10:00'
    try {
      if (dragging.kind === 'pieza') {
        await updatePiezaEstado(dragging.id, 'programada', { scheduled_for: new Date(`${dateStr}T${timeStr}:00`).toISOString() })
        notify('Reprogramado a ' + dateObj.toLocaleDateString('es-AR'))
      } else if (dragging.kind === 'video') {
        await updateVideo(dragging.id, { scheduled_for: new Date(`${dateStr}T${timeStr}:00`).toISOString() })
        notify('Video reprogramado a ' + dateObj.toLocaleDateString('es-AR'))
      } else {
        await updateContentTask(dragging.id, { due_date: dateStr })
        notify('Tarea movida a ' + dateObj.toLocaleDateString('es-AR'))
      }
      load()
    } catch (err) {
      notify('Error reprogramando: ' + err.message)
    }
    endDrag()
  }

  const dayCellProps = (date) => {
    const key = dayKey(date)
    return {
      onDragOver: (e) => { e.preventDefault(); if (dragOverKey !== key) setDragOverKey(key) },
      onDragLeave: () => { if (dragOverKey === key) setDragOverKey(null) },
      onDrop: (e) => { e.preventDefault(); handleDropOnDay(date) },
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <SLabel accent={client.color}>Calendario — {client.name}</SLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn size="sm" variant="ghost" onClick={handleImportExisting} disabled={importing}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Trae de Instagram los posts/reels/carruseles ya publicados y les carga el primer snapshot de métricas (reach, likes, comments, etc.)">
          <DownloadCloud size={12} /> {importing ? 'Importando…' : 'Importar publicaciones de Instagram'}
        </Btn>
        <div style={{ display: 'flex', gap: 4, background: T.surf, borderRadius: RADIUS.pill, padding: 3 }}>
          <button onClick={() => setView('mes')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: RADIUS.pill,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
            background: view === 'mes' ? T.card : 'transparent', color: view === 'mes' ? T.primary : T.dim,
            boxShadow: view === 'mes' ? SHADOW.xs : 'none',
          }}><CalIcon size={13} /> Mes</button>
          <button onClick={() => setView('semana')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: RADIUS.pill,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
            background: view === 'semana' ? T.card : 'transparent', color: view === 'semana' ? T.primary : T.dim,
            boxShadow: view === 'semana' ? SHADOW.xs : 'none',
          }}><Rows3 size={13} /> Semana</button>
        </div>
        </div>
      </div>

      {upcomingFinde && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: T.warn + '14',
          border: `1px solid ${T.warn}40`, borderRadius: RADIUS.sm, padding: '10px 14px',
        }}>
          <Megaphone size={16} color={T.warn} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: T.text, lineHeight: 1.5 }}>
            <strong>Se viene un fin de semana largo:</strong> {upcomingFinde.motivos.join(' + ')}
            {' '}({toEsDate(upcomingFinde.start)} al {toEsDate(upcomingFinde.end)}, {upcomingFinde.days} días).
            {' '}Es buen momento para generar contenido antes.
          </div>
        </div>
      )}

      {highlightTrip && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: T.blue + '14',
          border: `1px solid ${T.blue}40`, borderRadius: RADIUS.sm, padding: '10px 14px',
        }}>
          <Plane size={16} color={T.blue} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: T.text, lineHeight: 1.5 }}>
            <strong>{activeTrip ? 'Viaje en curso:' : 'Viaje próximo:'}</strong> {highlightTrip.title}
            {' '}({toEsDate(highlightTrip.start_date)} al {toEsDate(highlightTrip.end_date)}).
            {' '}{activeTrip ? 'Aprovechá para filmar todo lo que puedas.' : 'Preparate: revisá qué hay que generar en la sección Viajes.'}
          </div>
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <SLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList size={13} /> Plan de producción — {monthLabel}</span></SLabel>
        </div>
        <div style={{ fontSize: 10, color: T.dim, marginBottom: 10 }}>
          Anotá lo que hay que producir este mes (ej: "20 historias", "4 reels") y el progreso se calcula solo contando lo que ya generaste. Para pendientes sin cantidad (ej: "cobertura día del amigo") usá el checkbox.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {goalItems.map(item => {
            const progress = goalProgress(item)
            const isDone = progress !== null ? progress >= item.qty_target && item.qty_target > 0 : item.done
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.surf2, borderRadius: RADIUS.sm - 4, padding: '8px 10px' }}>
                {progress === null ? (
                  <span onClick={() => handleToggleGoalItem(item.id)} style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                    border: `1.5px solid ${isDone ? T.active : T.border2}`, background: isDone ? T.active : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone && <Check size={12} color="#fff" />}
                  </span>
                ) : (
                  <div style={{
                    fontSize: 10, fontWeight: 800, flexShrink: 0, minWidth: 42, textAlign: 'center',
                    padding: '3px 6px', borderRadius: RADIUS.pill,
                    color: isDone ? T.active : T.warn, background: (isDone ? T.active : T.warn) + '18',
                  }}>
                    {progress}/{item.qty_target}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.text, textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                  {item.label}
                  {item.tipo && <span style={{ color: T.dim, fontSize: 10 }}> · {TIPO_META[item.tipo]?.label}</span>}
                </div>
                <span onClick={() => handleDeleteGoalItem(item.id)} style={{ cursor: 'pointer', color: T.dim, display: 'flex', flexShrink: 0 }}><X size={13} /></span>
              </div>
            )
          })}
          {!goalLoading && !goalItems.length && (
            <div style={{ fontSize: 11, color: T.dim }}>Sin plan cargado para {monthLabel} todavía.</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Input value={newGoalItem.label} onChange={e => setNewGoalItem(v => ({ ...v, label: e.target.value }))} placeholder="Ej: 20 historias con diseño" style={{ flex: 2, minWidth: 160 }} />
          <Sel
            value={newGoalItem.tipo}
            onChange={e => setNewGoalItem(v => ({ ...v, tipo: e.target.value }))}
            style={{ flex: 1, minWidth: 110 }}
            options={[{ v: '', l: 'Sin tipo (manual)' }, ...Object.entries(TIPO_META).filter(([k]) => k !== 'video').map(([k, m]) => ({ v: k, l: m.label }))]}
          />
          {newGoalItem.tipo && (
            <input
              type="number" min="0" value={newGoalItem.qtyTarget} onChange={e => setNewGoalItem(v => ({ ...v, qtyTarget: e.target.value }))}
              placeholder="Cantidad" style={{ width: 80, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px' }}
            />
          )}
          <Btn size="sm" onClick={handleAddGoalItem} disabled={!newGoalItem.label}>Agregar</Btn>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Calendario ──────────────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {view === 'mes' ? (
              <>
                <Btn size="sm" variant="ghost" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={13} /> Mes</Btn>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>{monthLabel}</div>
                <Btn size="sm" variant="ghost" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Mes <ChevronRight size={13} /></Btn>
              </>
            ) : (
              <>
                <Btn size="sm" variant="ghost" onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={13} /> Semana</Btn>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>{weekLabel}</div>
                <Btn size="sm" variant="ghost" onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Semana <ChevronRight size={13} /></Btn>
              </>
            )}
          </div>

          {view === 'mes' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
                {DIA_LABELS.map(l => (
                  <div key={l} style={{ fontSize: 9, color: T.dim, textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                {grid.map(({ date, inMonth }) => {
                  const key = dayKey(date)
                  const items = itemsByDay[key] || []
                  const isToday = key === dayKey(new Date())
                  const isOver = dragOverKey === key
                  const efem = getEfemerideFor(key)
                  const dayTrip = tripForDay(key)
                  return (
                    <div key={key} {...dayCellProps(date)} style={{
                      minHeight: 96, borderRadius: RADIUS.sm - 2, padding: 6,
                      background: isOver ? T.primary + '12' : dayTrip ? T.blue + '0C' : inMonth ? T.surf : 'transparent',
                      border: `1.5px solid ${isOver ? T.primary : isToday ? T.primary : T.border}`,
                      borderTop: dayTrip ? `3px solid ${T.blue}` : undefined,
                      opacity: inMonth ? 1 : 0.35,
                      transition: 'background .12s, border-color .12s',
                    }} title={dayTrip ? `Viaje: ${dayTrip.title}` : undefined}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, marginBottom: 3 }}>
                        <div style={{ fontSize: 10, color: isToday ? T.primary : T.dim, fontWeight: isToday ? 800 : 600 }}>
                          {date.getDate()}
                        </div>
                        {efem && (
                          <div title={efem.feriado?.name || efem.tematico?.name} style={{
                            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                            background: efem.feriado ? T.warn : T.dim,
                          }} />
                        )}
                      </div>
                      {efem && (
                        <div title={efem.feriado?.name || efem.tematico?.name} style={{
                          fontSize: 7, color: efem.feriado ? T.warn : T.dim, fontWeight: 700,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3,
                        }}>
                          {efem.feriado?.name || efem.tematico?.name}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {items.slice(0, 4).map((item, i) => (
                          <ItemThumb
                            key={i} item={item} thumbs={thumbs} size={26}
                            onDragStart={startDrag(item.kind, item.data)} onDragEnd={endDrag}
                            onClick={() => openEdit(item.kind, item.data)}
                          />
                        ))}
                        {items.length > 4 && (
                          <div style={{ fontSize: 8, color: T.dim, alignSelf: 'center' }}>+{items.length - 4}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
              {weekDays.map(date => {
                const key = dayKey(date)
                const items = itemsByDay[key] || []
                const isToday = key === dayKey(new Date())
                const isOver = dragOverKey === key
                const efem = getEfemerideFor(key)
                const dayTrip = tripForDay(key)
                return (
                  <div key={key} {...dayCellProps(date)} style={{
                    minHeight: 220, borderRadius: RADIUS.sm - 2, padding: 8,
                    background: isOver ? T.primary + '12' : dayTrip ? T.blue + '0C' : T.surf,
                    border: `1.5px solid ${isOver ? T.primary : isToday ? T.primary : T.border}`,
                    borderTop: dayTrip ? `3px solid ${T.blue}` : undefined,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'background .12s, border-color .12s',
                  }} title={dayTrip ? `Viaje: ${dayTrip.title}` : undefined}>
                    <div>
                      <div style={{ fontSize: 9, color: T.dim, fontWeight: 700, textTransform: 'uppercase' }}>{DIA_LABELS[(date.getDay() + 6) % 7]}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isToday ? T.primary : T.text }}>{date.getDate()}</div>
                      {efem && (
                        <div style={{ fontSize: 8.5, color: efem.feriado ? T.warn : T.dim, fontWeight: 700, marginTop: 2 }}>
                          {efem.feriado?.name || efem.tematico?.name}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                      {items.map((item, i) => {
                        const label = item.kind === 'video' ? item.data.titulo
                          : item.kind === 'task' ? item.data.title
                          : (item.data.overlay_text || TIPO_META[item.data.tipo].label)
                        const time = localTimeStr(item.data.scheduled_for)
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ItemThumb
                              item={item} thumbs={thumbs} size={34}
                              onDragStart={startDrag(item.kind, item.data)} onDragEnd={endDrag}
                              onClick={() => openEdit(item.kind, item.data)}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 10, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                              {time && <div style={{ fontSize: 9, color: T.dim }}>{time}</div>}
                            </div>
                          </div>
                        )
                      })}
                      {!items.length && <div style={{ fontSize: 9, color: T.dim }}>—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 10, color: T.dim, lineHeight: 1.6 }}>
            Arrastrá una miniatura a otro día para reprogramarla (mantiene el horario). Click = editar fecha/hora.
            {' '}<span style={{ color: T.red }}>Borde rojo</span> = falló al publicar.
          </div>
        </Card>

        {/* ── Sidebar: banco pendiente + video externo ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {editingItem && (
            <Card accent={T.primary}>
              <SLabel accent={T.primary}>Editar horario</SLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <ItemThumb item={editingItem} thumbs={thumbs} size={38} onDragStart={() => {}} onDragEnd={() => {}} onClick={() => {}} />
                <div style={{ fontSize: 11, color: T.text, minWidth: 0, flex: 1 }}>
                  {editingItem.kind === 'video' ? editingItem.data.titulo
                    : editingItem.kind === 'task' ? editingItem.data.title
                    : (editingItem.data.overlay_text || TIPO_META[editingItem.data.tipo]?.label)}
                </div>
              </div>
              {editingItem.kind === 'pieza' && editingItem.data.estado === 'error' && editingItem.data.error_detail && (
                <div style={{ fontSize: 10, color: T.red, background: T.red + '12', borderRadius: 6, padding: '7px 9px', marginBottom: 10, lineHeight: 1.5 }}>
                  Falló: {editingItem.data.error_detail}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  style={{ flex: 1, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px' }}
                />
                {editingItem.kind !== 'task' && (
                  <input
                    type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                    style={{ width: 90, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 8px' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn size="sm" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Guardando…' : 'Guardar fecha'}</Btn>
                {editingItem.kind === 'pieza' && (
                  <Btn size="sm" variant="ghost" onClick={() => handleVolverABanco(editingItem.data)}>Volver al banco</Btn>
                )}
                {editingItem.kind === 'video' && (
                  <Btn size="sm" variant="ghost" onClick={() => { handleToggleVideoPublicado(editingItem.data); closeEdit() }}>
                    Marcar {editingItem.data.estado === 'publicado' ? 'sin publicar' : 'publicado'}
                  </Btn>
                )}
                {editingItem.kind === 'task' && (
                  <>
                    <Btn size="sm" variant="ghost" onClick={() => { handleToggleTask(editingItem.data); closeEdit() }}>
                      Marcar {editingItem.data.done ? 'pendiente' : 'hecha'}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => handleDeleteTask(editingItem.data)} style={{ color: T.red }}>
                      <Trash2 size={12} /> Eliminar
                    </Btn>
                  </>
                )}
                <Btn size="sm" variant="ghost" onClick={closeEdit}>Cancelar</Btn>
              </div>

              {editingItem.kind === 'pieza' && editingItem.data.estado === 'publicada' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Cargar métricas a mano
                  </div>
                  <div style={{ fontSize: 9, color: T.dim, marginBottom: 8, marginTop: -4 }}>
                    Para clientes sin conexión de Meta activa (llega solo cuando sí la tienen).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>Alcance</div>
                      <input type="number" min="0" value={metricaDraft.reach} onChange={e => setMetricaDraft(d => ({ ...d, reach: e.target.value }))}
                        style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '6px 8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>Likes</div>
                      <input type="number" min="0" value={metricaDraft.likes} onChange={e => setMetricaDraft(d => ({ ...d, likes: e.target.value }))}
                        style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '6px 8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>Comentarios</div>
                      <input type="number" min="0" value={metricaDraft.comments} onChange={e => setMetricaDraft(d => ({ ...d, comments: e.target.value }))}
                        style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '6px 8px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>Guardados</div>
                      <input type="number" min="0" value={metricaDraft.saves} onChange={e => setMetricaDraft(d => ({ ...d, saves: e.target.value }))}
                        style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '6px 8px', boxSizing: 'border-box' }} />
                    </div>
                    {(editingItem.data.tipo === 'reel' || editingItem.data.tipo === 'historia') && (
                      <div>
                        <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>Reproducciones</div>
                        <input type="number" min="0" value={metricaDraft.plays} onChange={e => setMetricaDraft(d => ({ ...d, plays: e.target.value }))}
                          style={{ width: '100%', fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '6px 8px', boxSizing: 'border-box' }} />
                      </div>
                    )}
                  </div>
                  <Btn size="sm" onClick={handleSaveMetrica} disabled={savingMetrica}>{savingMetrica ? 'Guardando…' : 'Guardar métricas'}</Btn>
                </div>
              )}
            </Card>
          )}

          <Card>
            <SLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clapperboard size={12} /> Tareas y eventos</span></SLabel>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 8, marginTop: -6 }}>
              Pendientes de filmación o eventos especiales — no son piezas, son recordatorios.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <Input value={newTask.title} onChange={e => setNewTask(v => ({ ...v, title: e.target.value }))} placeholder="Ej: Filmar reel para el finde largo" />
              <div style={{ display: 'flex', gap: 6 }}>
                <Sel
                  value={newTask.kind}
                  onChange={e => setNewTask(v => ({ ...v, kind: e.target.value }))}
                  style={{ flex: 1 }}
                  options={[{ v: 'filmacion', l: 'Filmación' }, { v: 'evento', l: 'Evento especial' }]}
                />
                <Sel
                  value={newTask.platform}
                  onChange={e => setNewTask(v => ({ ...v, platform: e.target.value }))}
                  style={{ flex: 1 }}
                  options={[{ v: '', l: 'Todas las redes' }, ...Object.entries(PLATFORM_META).map(([key, m]) => ({ v: key, l: m.label }))]}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="date" value={newTask.dueDate} onChange={e => setNewTask(v => ({ ...v, dueDate: e.target.value }))}
                  style={{ flex: 1, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px' }}
                />
                <Btn size="sm" onClick={handleCreateTask} disabled={!newTask.title || !newTask.dueDate || savingTask}>
                  {savingTask ? '…' : 'Agregar'}
                </Btn>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {pendingTasks.map(t => {
                const meta = TASK_KIND_META[t.kind]
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: T.surf2, borderRadius: RADIUS.sm - 4, padding: 6 }}>
                    <span onClick={() => handleToggleTask(t)} style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <meta.icon size={10} color={meta.color} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: 9, color: T.dim }}>
                        {toEsDate(t.due_date)} · {t.platform ? PLATFORM_META[t.platform]?.label : 'Todas las redes'}
                      </div>
                    </div>
                    <span onClick={() => handleDeleteTask(t)} style={{ cursor: 'pointer', color: T.dim, display: 'flex', flexShrink: 0 }}><X size={13} /></span>
                  </div>
                )
              })}
              {!loading && !pendingTasks.length && (
                <div style={{ fontSize: 11, color: T.dim }}>Sin pendientes — todo al día.</div>
              )}
            </div>
          </Card>

          <Card>
            <SLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plane size={12} /> Viajes</span></SLabel>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 8, marginTop: -6 }}>
              Rango de fechas del viaje + qué se necesita generar ahí.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <Input value={newTrip.title} onChange={e => setNewTrip(v => ({ ...v, title: e.target.value }))} placeholder="Destino / nombre del viaje" />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="date" value={newTrip.startDate} onChange={e => setNewTrip(v => ({ ...v, startDate: e.target.value }))}
                  style={{ flex: 1, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px' }}
                />
                <input
                  type="date" value={newTrip.endDate} onChange={e => setNewTrip(v => ({ ...v, endDate: e.target.value }))}
                  style={{ flex: 1, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 10px' }}
                />
              </div>
              <Btn size="sm" onClick={handleCreateTrip} disabled={!newTrip.title || !newTrip.startDate || !newTrip.endDate || savingTrip}>
                {savingTrip ? 'Guardando…' : 'Agregar viaje'}
              </Btn>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {trips.map(trip => {
                const draft = tripItemDrafts[trip.id] || { label: '', tipo: '', qtyTarget: '' }
                return (
                  <div key={trip.id} style={{ background: T.surf2, borderRadius: RADIUS.sm - 4, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{trip.title}</div>
                        <div style={{ fontSize: 9, color: T.dim }}>{toEsDate(trip.start_date)} al {toEsDate(trip.end_date)}</div>
                      </div>
                      <span onClick={() => handleDeleteTrip(trip)} style={{ cursor: 'pointer', color: T.dim, display: 'flex', flexShrink: 0 }}><Trash2 size={12} /></span>
                    </div>

                    {(trip.items || []).map(item => {
                      const progress = tripItemProgress(trip, item)
                      const isDone = progress !== null ? progress >= item.qty_target && item.qty_target > 0 : item.done
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          {progress === null ? (
                            <span onClick={() => handleToggleTripItem(trip, item.id)} style={{
                              width: 15, height: 15, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                              border: `1.5px solid ${isDone ? T.active : T.border2}`, background: isDone ? T.active : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{isDone && <Check size={10} color="#fff" />}</span>
                          ) : (
                            <span style={{
                              fontSize: 9, fontWeight: 800, flexShrink: 0, minWidth: 34, textAlign: 'center',
                              padding: '2px 5px', borderRadius: RADIUS.pill,
                              color: isDone ? T.active : T.warn, background: (isDone ? T.active : T.warn) + '18',
                            }}>{progress}/{item.qty_target}</span>
                          )}
                          <span style={{ flex: 1, fontSize: 10.5, color: T.text, textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                            {item.label}
                          </span>
                          <span onClick={() => handleDeleteTripItem(trip, item.id)} style={{ cursor: 'pointer', color: T.dim, display: 'flex' }}><X size={11} /></span>
                        </div>
                      )
                    })}

                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <Input value={draft.label} onChange={e => setTripDraft(trip.id, { label: e.target.value })} placeholder="Ej: 4 reels" style={{ flex: 1, fontSize: 10.5, padding: '6px 8px' }} />
                      <Sel
                        value={draft.tipo}
                        onChange={e => setTripDraft(trip.id, { tipo: e.target.value })}
                        style={{ width: 90, fontSize: 10, padding: '6px 4px' }}
                        options={[{ v: '', l: 'Manual' }, ...Object.entries(TIPO_META).filter(([k]) => k !== 'video').map(([k, m]) => ({ v: k, l: m.label }))]}
                      />
                      {draft.tipo && (
                        <input
                          type="number" min="0" value={draft.qtyTarget} onChange={e => setTripDraft(trip.id, { qtyTarget: e.target.value })}
                          placeholder="#" style={{ width: 40, fontSize: 10.5, background: T.card, border: `1px solid ${T.border2}`, borderRadius: 6, color: T.text, padding: '6px 4px' }}
                        />
                      )}
                      <Btn size="sm" onClick={() => handleAddTripItem(trip)} disabled={!draft.label} style={{ padding: '5px 8px' }}>+</Btn>
                    </div>
                  </div>
                )
              })}
              {!loading && !trips.length && (
                <div style={{ fontSize: 11, color: T.dim }}>Sin viajes cargados todavía.</div>
              )}
            </div>
          </Card>

          <Card>
            <SLabel>Banco sin programar</SLabel>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 8, marginTop: -6 }}>Arrastrá una foto directo al calendario, o elegí fecha y hora acá.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {banco.map(p => {
                const meta = TIPO_META[p.tipo]
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: T.surf2, borderRadius: RADIUS.sm - 4, padding: 6 }}>
                    <ItemThumb
                      item={{ kind: 'pieza', data: p }} thumbs={thumbs} size={32}
                      onDragStart={startDrag('pieza', p)} onDragEnd={endDrag}
                    />
                    <div style={{ fontSize: 10, color: meta.color, flexShrink: 0, width: 40, display: 'flex', alignItems: 'center', gap: 3 }}><meta.icon size={11} /> {meta.label}</div>
                    <input
                      type="date"
                      value={scheduleDates[p.id] || ''}
                      onChange={e => setScheduleDates(s => ({ ...s, [p.id]: e.target.value }))}
                      style={{ flex: 1, minWidth: 0, fontSize: 10, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 4, color: T.text, padding: '3px 4px' }}
                    />
                    <input
                      type="time"
                      value={scheduleTimes[p.id] || '10:00'}
                      onChange={e => setScheduleTimes(s => ({ ...s, [p.id]: e.target.value }))}
                      style={{ width: 62, flexShrink: 0, fontSize: 10, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 4, color: T.text, padding: '3px 2px' }}
                    />
                    <Btn size="sm" onClick={() => handleProgramarPieza(p)}>OK</Btn>
                  </div>
                )
              })}
              {!loading && !banco.length && (
                <div style={{ fontSize: 11, color: T.dim }}>Nada pendiente — todo lo del banco ya está programado.</div>
              )}
            </div>
          </Card>

          <Card>
            <SLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={12} /> Video externo</span></SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input value={newVideo.titulo} onChange={e => setNewVideo(v => ({ ...v, titulo: e.target.value }))} placeholder="Título del video" />
              <Input value={newVideo.videoUrl} onChange={e => setNewVideo(v => ({ ...v, videoUrl: e.target.value }))} placeholder="Link o path del archivo" mono />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={newVideo.scheduledFor}
                  onChange={e => setNewVideo(v => ({ ...v, scheduledFor: e.target.value }))}
                  style={{ flex: 1, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 12px' }}
                />
                <input
                  type="time"
                  value={newVideo.scheduledTime}
                  onChange={e => setNewVideo(v => ({ ...v, scheduledTime: e.target.value }))}
                  style={{ width: 90, fontSize: 12, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: RADIUS.sm - 2, color: T.text, padding: '8px 8px' }}
                />
              </div>
              <Btn onClick={handleCreateVideo} disabled={!newVideo.titulo || !newVideo.videoUrl || savingVideo}>
                {savingVideo ? 'Guardando…' : 'Agregar al calendario'}
              </Btn>
            </div>
          </Card>

          {videos.length > 0 && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: -4 }}>
                <SLabel>Videos externos — {client.name}</SLabel>
                <Btn size="sm" variant="ghost" onClick={handleSyncYoutube} disabled={syncingYoutube}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Trae views/likes/comentarios reales de YouTube para los links reconocidos">
                  <DownloadCloud size={11} /> {syncingYoutube ? 'Sincronizando…' : 'Sincronizar YouTube'}
                </Btn>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {videos.map(v => (
                  <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: T.surf2, borderRadius: RADIUS.sm - 4, padding: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.titulo}</div>
                      <div style={{ fontSize: 9, color: T.dim }}>{v.scheduled_for ? v.scheduled_for.slice(0, 10) : 'sin fecha'} · {v.estado}</div>
                      {v.views != null && (
                        <div style={{ fontSize: 9.5, color: T.sub, marginTop: 2, display: 'flex', gap: 8 }}>
                          <span>{fmtNum(v.views)} views</span>
                          {v.likes != null && <span>{fmtNum(v.likes)} likes</span>}
                          {v.comments != null && <span>{fmtNum(v.comments)} coment.</span>}
                        </div>
                      )}
                    </div>
                    <span onClick={() => handleDeleteVideo(v)} style={{ cursor: 'pointer', color: T.dim, display: 'flex' }}><X size={13} /></span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
