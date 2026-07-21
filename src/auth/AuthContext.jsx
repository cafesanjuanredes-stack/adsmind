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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
