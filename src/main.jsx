import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage } from './auth/LoginPage'
import App from './App'
import './index.css'

function AppWithAuth() {
  const { authed, checkingSession } = useAuth()
  if (checkingSession) return null // evita el flash del login mientras se verifica la sesión
  return authed ? <App /> : <LoginPage />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  </React.StrictMode>
)
