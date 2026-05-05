'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Ingresa la contraseña')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.message ?? 'Contraseña incorrecta')
        setPassword('')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="gradient-bg min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">

        <div className="text-center mb-8">
          <span className="text-5xl inline-block animate-float-pulse">🔐</span>
          <h1
            className="font-heading text-4xl text-foreground tracking-widest mt-3 animate-fade-up"
            style={{ animationDelay: '0.08s' }}
          >
            PANEL ADMIN
          </h1>
          <p
            className="text-muted text-sm mt-2 animate-fade-up"
            style={{ animationDelay: '0.16s' }}
          >
            Rifa Grupo Cisneros
          </p>
        </div>

        <div
          className="glass-card p-7 animate-fade-up"
          style={{ animationDelay: '0.24s' }}
        >
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoFocus
              className={[
                'w-full bg-ink border rounded-xl px-4 py-3.5 text-sm text-foreground',
                'placeholder:text-muted/40 focus:outline-none transition-all duration-200',
                error
                  ? 'border-danger/60 focus:border-danger focus:ring-2 focus:ring-danger/20'
                  : 'border-border/60 focus:border-accent focus:ring-2 focus:ring-accent/20',
              ].join(' ')}
            />
            {error && (
              <p className="text-danger text-xs mt-1.5 flex items-center gap-1.5">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl py-4 font-heading text-xl tracking-widest text-ink bg-gradient-to-r from-accent to-accent-light active:scale-[0.98] transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              'ENTRAR'
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
