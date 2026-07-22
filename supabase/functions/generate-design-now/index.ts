// Supabase Edge Function: generate-design-now
//
// Versión "on-demand" de generate-ai-suggestions: en vez de esperar al cron
// de cada 3 días, Candelaria puede pedir una imagen puntual desde el
// Generador (con o sin prompt propio) y la recibe al toque en
// "Sugerencias IA" para usarla o descartarla — mismo flujo que las
// automáticas, solo que disparado a demanda.
//
// Body esperado: { client_id: string, prompt?: string }
// Requiere el secret OPENAI_API_KEY configurado en el proyecto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPrompt(client: any, meta: any, custom?: string) {
  if (custom && custom.trim()) {
    return `Diseño/foto para redes sociales de "${client.name}" (rubro: ${client.industry || 'n/d'}). ${custom.trim()}. Sin texto ni logos superpuestos — eso se agrega después en la app.`
  }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { client_id, prompt: customPrompt } = await req.json()
    if (!client_id) {
      return new Response(JSON.stringify({ error: 'Falta client_id' }), { status: 400, headers: corsHeaders })
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients').select('id, name, industry').eq('id', client_id).single()
    if (clientErr || !client) throw clientErr || new Error('Cliente no encontrado')

    const { data: meta } = await supabase.from('client_meta').select('*').eq('client_id', client_id).maybeSingle()
    const prompt = buildPrompt(client, meta, customPrompt)
    const b64 = await generateImage(prompt)
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const path = `${client_id}/ai-suggestions/${Date.now()}.png`

    const { error: upErr } = await supabase.storage.from('content').upload(path, bytes, {
      contentType: 'image/png',
      upsert: false,
    })
    if (upErr) throw upErr

    const { data: suggestion, error: insErr } = await supabase
      .from('ai_suggestions')
      .insert({ client_id, storage_path: path, prompt })
      .select()
      .single()
    if (insErr) throw insErr

    return new Response(JSON.stringify({ ok: true, suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
