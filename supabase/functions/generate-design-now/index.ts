// Función de IA sacada de la app por pedido explícito. El botón "Generar
// con IA" ya se sacó de ModGenerador.jsx. Este archivo queda vacío para
// que el próximo commit lo borre del todo — además hay que borrar la
// función deployada en Supabase (Dashboard → Edge Functions →
// generate-design-now → Delete, o `supabase functions delete
// generate-design-now` desde la terminal).
Deno.serve(async () => {
  return new Response(JSON.stringify({ ok: false, error: 'Función desactivada' }), { status: 410 })
})
