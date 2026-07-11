import { useState, useRef, useEffect } from 'react'
import { SLabel, Btn } from '../ui'
import { T, PLATFORM_META } from '../../tokens'
import { fmtNum, fmtPct, fmtDate } from '../../utils/format'
import { downloadTXT } from '../../utils/download'
import { callClaude, buildClientSystem } from '../../utils/ai'

const SUGGESTIONS = [
  'Analizá la cuenta completa',
  'Crecimiento IG desde el inicio',
  '¿Qué contenido funciona más?',
  'Reporte ejecutivo para el cliente',
  'Comparame con los otros clientes de la agencia',
  'Analizá este post: [pegar link]',
  '¿Qué plataforma tiene más potencial?',
  'Plan de acción para los próximos 90 días',
]

function Msg({ role, content }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: role === 'user' ? T.violet + '40' : `linear-gradient(135deg,${T.blue},${T.cyan})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
      }}>
        {role === 'user' ? 'U' : '✦'}
      </div>
      <div style={{
        maxWidth: '80%',
        background: role === 'user' ? T.violet + '20' : T.surf,
        border: `1px solid ${role === 'user' ? T.violet + '40' : T.border}`,
        borderRadius: role === 'user' ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
        padding: '10px 13px',
        fontSize: 12, color: T.text, lineHeight: 1.75, whiteSpace: 'pre-wrap',
      }}>
        {content}
      </div>
    </div>
  )
}

export function ModIA({ client, allClients, notify }) {
  const [msgs,    setMsgs]    = useState([{
    role: 'assistant',
    content: `Hola. Tengo acceso completo a los datos de **${client.name}** y de los ${allClients.length} clientes de tu agencia.\n\nPuedo analizar el crecimiento histórico, diagnosticar plataformas, comparar períodos, analizar posts individuales por link, o generar un reporte ejecutivo completo.\n\n¿Por dónde empezamos?`,
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    const newMsgs = [...msgs, { role: 'user', content: msg }]
    setMsgs(newMsgs)
    try {
      const system = buildClientSystem(client, allClients, { fmtNum, fmtPct, fmtDate, PLATFORM_META })
      const reply  = await callClaude(system, newMsgs.map(m => ({ role: m.role, content: m.content })))
      setMsgs([...newMsgs, { role: 'assistant', content: reply }])
    } catch (e) {
      setMsgs([...newMsgs, { role: 'assistant', content: `⚠️ Error: ${e.message}` }])
    }
    setLoading(false)
  }

  const doDownload = () => {
    const text = msgs
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n' + '─'.repeat(60) + '\n\n')
    downloadTXT(`ANÁLISIS IA — ${client.name}\n${'─'.repeat(60)}\n\n${text}`, `analisis_ia_${client.name.replace(/\s/g, '_')}.txt`)
    notify('Análisis descargado')
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 230px)', minHeight: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SLabel accent={T.cyan}>✦ IA Análisis — {client.name}</SLabel>
        {msgs.length > 1 && (
          <Btn size="sm" variant="success" onClick={doDownload}>⬇ Descargar análisis</Btn>
        )}
      </div>

      {/* Quick suggestions */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)} style={{
            background: T.surf, border: `1px solid ${T.border2}`,
            borderRadius: 20, padding: '4px 10px', fontSize: 10, color: T.sub,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{s}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>
        {msgs.map((m, i) => <Msg key={i} role={m.role} content={m.content} />)}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${T.blue},${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✦</div>
            <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: '2px 10px 10px 10px', padding: '10px 13px', fontSize: 12, color: T.dim }}>
              Analizando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Analizá, compará períodos, pegá un link de post…"
          style={{
            flex: 1, background: T.surf, border: `1px solid ${T.border2}`,
            borderRadius: 8, padding: '9px 12px', fontSize: 12,
            color: T.text, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            background: `linear-gradient(135deg,${T.blue},${T.violet})`,
            border: 'none', borderRadius: 8, padding: '9px 18px',
            color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >→</button>
      </div>
    </div>
  )
}
