import { useState } from 'react'
import { useAuth } from './AuthContext'
import { T } from '../tokens'

export function LoginPage() {
  const { login, error, setError } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    await login(email, password)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        opacity: 0.3,
      }} />

      {/* Glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${T.primary}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 380, animation: 'slide-up .3s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: T.text, marginBottom: 6 }}>
            Ad<span style={{ color: T.primary }}>Mind</span>
          </div>
          <div style={{ fontSize: 10, color: T.dim, letterSpacing: '0.15em', fontWeight: 500 }}>
            ANALYTICS PLATFORM
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: `0 16px 40px rgba(23,19,16,.08)`,
        }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Iniciar sesión</div>
            <div style={{ fontSize: 12, color: T.dim }}>Acceso privado — solo uso interno</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: 10, color: T.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: T.surf, border: `1px solid ${error ? T.red + '60' : T.border2}`,
                  borderRadius: 8, padding: '10px 13px',
                  fontSize: 13, color: T.text, outline: 'none',
                  fontFamily: 'inherit', transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = T.primary}
                onBlur={e  => e.target.style.borderColor = error ? T.red + '60' : T.border2}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 10, color: T.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: T.surf, border: `1px solid ${error ? T.red + '60' : T.border2}`,
                    borderRadius: 8, padding: '10px 40px 10px 13px',
                    fontSize: 13, color: T.text, outline: 'none',
                    fontFamily: "'IBM Plex Mono', monospace", transition: 'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor = T.primary}
                  onBlur={e  => e.target.style.borderColor = error ? T.red + '60' : T.border2}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.dim, fontSize: 14, padding: 2,
                  }}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: T.red + '15', border: `1px solid ${T.red}40`,
                borderRadius: 7, padding: '8px 12px',
                fontSize: 12, color: T.red,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                background: loading
                  ? T.surf2
                  : `linear-gradient(135deg, ${T.primary}, ${T.violet})`,
                border: 'none', borderRadius: 8,
                padding: '11px', fontSize: 13, fontWeight: 700,
                color: loading ? T.dim : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Verificando…</>
                : 'Entrar →'
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: T.dim }}>
          AdMind Analytics · Uso privado
        </div>
      </div>
    </div>
  )
}
