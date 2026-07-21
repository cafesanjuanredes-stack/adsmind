// Supabase Edge Function: generate-ai-suggestions
//
// Corre por cron (recomendado: cada 3 días). Para cada cliente, genera 1
// imagen con OpenAI a partir de su perfil de contenido (qué funciona,
// industria) y la deja en `ai_suggestions` como punto de partida — NO
// entra directo al banco. Candelaria la revisa desde el Generador y si le
// gusta la "usa" (ahí pasa a media_assets, como una foto subida a mano).
//
// Requiere el secret OPENAI_API_KEY configurado en el proyecto:
//   supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!

function buildPrompt(client: any, meta: any) {
  const works = (meta?.content_works || []).slice(0, 3).join('; ')
  return [
    `Fotografía profesional para redes sociales de "${client.name}"`,
    client.industry ? `(rubro: ${client.industry}).` : '',
    'Estilo auténtico, luz natural, sin apariencia de IA ni de stock genérico, como si la hubiera tomado el propio equipo.',
    works ? `Inspirate en lo que mejor funciona en esta cuenta: ${works}.` : '',
    'Sin texto ni logos superpuestos — esa parte se agrega después en la app.',
  ].filter(Boolean).join(' ')
}

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error ${res.status}`)
  return json.data[0].b64_json
}

Deno.serve(async () => {
  const { data: clients, error } = await supabase.from('clients').select('id, name, industry')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results = []
  for (const client of clients || []) {
    try {
      const { data: meta } = await supabase.from('client_meta').select('*').eq('client_id', client.id).maybeSingle()
      const prompt = buildPrompt(client, meta)
      const b64 = await generateImage(prompt)
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const path = `${client.id}/ai-suggestions/${Date.now()}.png`

      const { error: upErr } = await supabase.storage.from('content').upload(path, bytes, {
        contentType: 'image/png',
        upsert: false,
      })
      if (upErr) throw upErr

      await supabase.from('ai_suggestions').insert({ client_id: client.id, storage_path: path, prompt })
      results.push({ client: client.name, ok: true })
    } catch (err) {
      results.push({ client: client.name, ok: false, error: String(err?.message || err) })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), { headers: { 'Content-Type': 'application/json' } })
})
