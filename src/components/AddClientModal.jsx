import { useState } from 'react'
import { Card, SLabel, Btn, Input } from './ui'
import { Modal } from './ui/Modal'
import { T } from '../tokens'

export function AddClientModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', industry: '', avatar: '' })

  const submit = () => {
    if (!form.name.trim()) return
    onAdd(form.name.trim(), form.industry.trim(), form.avatar.trim().toUpperCase().slice(0, 3))
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <Card style={{ width: 420, maxWidth: '90vw' }} accent={T.blue}>
        <SLabel accent={T.blue}>Nuevo cliente</SLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Nombre del cliente *</div>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Café San Juan" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Industria / Rubro</div>
              <Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Gastronomía" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Siglas (3 letras)</div>
              <Input value={form.avatar} onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))} placeholder="CSJ" mono />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={submit} disabled={!form.name.trim()}>Crear cliente</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        </div>
      </Card>
    </Modal>
  )
}
