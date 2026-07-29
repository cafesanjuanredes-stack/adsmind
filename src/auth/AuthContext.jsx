import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// ── Auth real vía Supabase ────────────────────────────────────────
// Los usuarios se crean a mano en el dashboard de Supabase
// (Authentication → Users → Add user). No hay signup público:
// esto es una herramienta interna de agencia, no un SaaS multi-tenant.

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = todavía verificando
  const [error,   setError]   = useState('')
  // undefined = todavía no se buscó, null = usuario sin restricciones (admin)
  const [permissions, setPermissions] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // ── Permisos (client_ids / modules) del usuario logueado ────────────
  // Si no hay fila en user_permissions, el usuario es admin (ve todo) —
  // mismo comportamiento que antes de que existiera esta tabla.
  useEffect(() => {
    if (!session?.user?.id) { setPermissions(session === null ? null : undefined); return }
    let cancelled = false
    supabase.from('user_permissions')
      .select('client_ids, modules')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setPermissions(data ? { clientIds: data.client_ids || null, modules: data.modules || null } : null)
      })
    return () => { cancelled = true }
  }, [session?.user?.id])

  const login = useCallback(async (email, password) => {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (authError) {
      setError('Email o contraseña incorrectos.')
      return false
    }
    setError('')
    return true
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        authed: !!session,
        checkingSession: session === undefined,
        login,
        logout,
        error,
        setError,
        permissions, // null = admin (todo permitido), { clientIds, modules } = restringido
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
