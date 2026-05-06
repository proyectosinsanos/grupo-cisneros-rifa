'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'

interface FormData {
  name: string
  phone: string
  email: string
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
}

interface Ripple {
  x: number
  y: number
  id: number
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) {
    errors.name = 'El nombre es requerido'
  }
  if (!data.phone.trim()) {
    errors.phone = 'El teléfono es requerido'
  } else if (!/^\d{10}$/.test(data.phone)) {
    errors.phone = 'Ingresa exactamente 10 dígitos'
  }
  if (!data.email.trim()) {
    errors.email = 'El correo es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Ingresa un correo electrónico válido'
  }
  return errors
}

function launchConfetti() {
  const palette = ['#bdd252', '#cfe06e', '#94b832', '#4ECDC4', '#FFFFFF', '#FFD700']
  confetti({
    particleCount: 130,
    spread: 90,
    origin: { x: 0.5, y: 0.4 },
    colors: palette,
    startVelocity: 50,
    gravity: 0.9,
  })
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: palette,
      startVelocity: 45,
    })
  }, 180)
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: palette,
      startVelocity: 45,
    })
  }, 360)
}

export default function Home() {
  const [screen, setScreen] = useState<'form' | 'success' | 'duplicate'>('form')
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', email: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [firstName, setFirstName] = useState('')

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e)
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.status === 409) {
        setScreen('duplicate')
      } else if (res.ok) {
        setFirstName(formData.name.trim().split(' ')[0])
        setScreen('success')
        launchConfetti()
      } else {
        setErrors({ email: data.message ?? 'Error al registrarse. Intenta de nuevo.' })
      }
    } catch {
      setErrors({ email: 'Error de conexión. Verifica tu internet.' })
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (field: keyof FormData) =>
    [
      'w-full bg-ink rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted/40',
      'focus:outline-none transition-all duration-200 border',
      errors[field]
        ? 'border-danger/60 focus:border-danger focus:ring-2 focus:ring-danger/20'
        : 'border-border/60 focus:border-accent focus:ring-2 focus:ring-accent/20',
    ].join(' ')

  if (screen === 'success') {
    return (
      <main className="gradient-bg min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[430px] text-center animate-scale-in">
          <span className="text-7xl inline-block animate-float-pulse mb-5">🏆</span>
          <div className="glass-card px-8 py-10">
            <h1 className="font-heading text-5xl text-accent tracking-widest mb-1">
              ¡REGISTRADO!
            </h1>
            <h2 className="font-heading text-2xl text-foreground/70 tracking-widest mb-6">
              EXITOSAMENTE
            </h2>
            <div className="w-12 h-px bg-accent/30 mx-auto mb-6" />
            <p className="text-foreground text-lg mb-2">
              Hola, <span className="text-accent font-semibold">{firstName}</span> 👋
            </p>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Tu participación en la rifa ha sido confirmada.
            </p>
            <div className="bg-ink/60 rounded-2xl px-6 py-4 border border-border/30">
              <p className="text-muted text-xs uppercase tracking-widest mb-1">Estado</p>
              <p className="text-accent text-sm font-semibold">✓ Participación confirmada</p>
            </div>
            <p className="text-muted/50 text-xs mt-7">✨ ¡Mucha suerte! ✨</p>
          </div>
        </div>
      </main>
    )
  }

  if (screen === 'duplicate') {
    return (
      <main className="gradient-bg min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[430px] text-center animate-scale-in">
          <span className="text-7xl inline-block animate-float-pulse mb-5">🎉</span>
          <div className="glass-card px-8 py-10">
            <h1 className="font-heading text-4xl text-accent tracking-widest mb-3">
              ¡YA ESTÁS DENTRO!
            </h1>
            <p className="text-foreground text-base mb-2">
              Ya estás registrado en la rifa
            </p>
            <p className="text-muted text-sm mb-6">
              Solo se permite un registro por dispositivo.
            </p>
            <div className="bg-accent/10 rounded-2xl px-6 py-4 border border-accent/20">
              <p className="text-accent text-sm">🎟️ Tu participación está activa</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="gradient-bg min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-107.5">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-6xl inline-block animate-float-pulse">🎟️</span>
          <h1
            className="font-heading text-5xl text-foreground tracking-[0.06em] mt-3 animate-fade-up"
            style={{ animationDelay: '0.08s' }}
          >
            RIFA GRUPO
          </h1>
          <h1
            className="font-heading text-5xl text-accent tracking-[0.06em] animate-fade-up"
            style={{ animationDelay: '0.16s' }}
          >
            CISNEROS
          </h1>
          <p
            className="text-muted text-sm mt-3 animate-fade-up"
            style={{ animationDelay: '0.26s' }}
          >
            Regístrate y gana premios increíbles
          </p>
        </div>

        {/* Card */}
        <div
          className="glass-card p-6 animate-fade-up"
          style={{ animationDelay: '0.34s' }}
        >
          {/* Name */}
          <div className="mb-4 animate-fade-up" style={{ animationDelay: '0.42s' }}>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Juan García López"
              autoComplete="name"
              className={inputCls('name')}
            />
            {errors.name && (
              <p className="text-danger text-xs mt-1.5 flex items-center gap-1.5">
                <span>⚠</span>{errors.name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="mb-4 animate-fade-up" style={{ animationDelay: '0.50s' }}>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted mb-2">
              Teléfono (10 dígitos)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="5512345678"
              autoComplete="tel"
              className={inputCls('phone')}
            />
            {errors.phone && (
              <p className="text-danger text-xs mt-1.5 flex items-center gap-1.5">
                <span>⚠</span>{errors.phone}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.58s' }}>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="juan@correo.com"
              autoComplete="email"
              className={inputCls('email')}
            />
            {errors.email && (
              <p className="text-danger text-xs mt-1.5 flex items-center gap-1.5">
                <span>⚠</span>{errors.email}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="animate-fade-up" style={{ animationDelay: '0.65s' }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl py-4 font-heading text-xl tracking-[0.12em] text-ink bg-gradient-to-r from-accent to-accent-light active:scale-[0.98] transition-transform duration-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-accent/30"
            >
              {ripples.map(r => (
                <span
                  key={r.id}
                  className="absolute rounded-full bg-ink/20 animate-ripple pointer-events-none"
                  style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40 }}
                />
              ))}
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                  Registrando...
                </span>
              ) : (
                'REGISTRARME'
              )}
            </button>
          </div>
        </div>

        <p
          className="text-center text-muted/40 text-xs mt-5 animate-fade-in"
          style={{ animationDelay: '0.8s' }}
        >
          Solo se permite un registro por persona
        </p>
      </div>
    </main>
  )
}
