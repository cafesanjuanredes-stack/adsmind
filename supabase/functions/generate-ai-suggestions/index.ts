// Función de IA sacada de la app por pedido explícito. El cron que la
// disparaba cada 3 días ya se desactivó (cron.unschedule). Este archivo
// queda vacío para que el próximo commit lo borre del todo — además hay
// que borrar la función deployada en Supabase (Dashboard → Edge Functions
// → generate-ai-suggestions → Delete, o `supabase functions delete
// generate-ai-suggestions` desde la terminal).
Deno.serve(async () => {
  return new Response(JSON.stringify({ ok: false, error: 'Función desactivada' }), { status: 410 })
})
