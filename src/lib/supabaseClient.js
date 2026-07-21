import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el .env')
}

// Cliente del lado del browser — usa la anon key (segura para exponer,
// el acceso real lo controlan las policies de RLS). Nunca usar acá la
// service_role key ni tokens de Meta: esos solo viven en Edge Functions.
export const supabase = createClient(url, anonKey)
