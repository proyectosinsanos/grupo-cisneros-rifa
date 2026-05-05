'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase'

interface Participant {
  id: string
  name: string
  phone: string
  email: string
  created_at: string
}

// Accent-insensitive normalizer for search
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fireWinnerConfetti() {
  const p = ['#bdd252', '#cfe06e', '#94b832', '#4ECDC4', '#FFFFFF', '#FFD700']
  confetti({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.5 }, colors: p, startVelocity: 60, gravity: 0.7 })
  setTimeout(() => {
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors: p, startVelocity: 55 })
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors: p, startVelocity: 55 })
  }, 200)
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.1, y: 0.85 }, colors: p })
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.9, y: 0.85 }, colors: p })
  }, 500)
}

// Timing sequence: starts at 40 ms/tick, decelerates to 400 ms/tick (~4 seconds total)
const TICKS: number[] = [
  ...Array(10).fill(40),
  ...Array(8).fill(70),
  ...Array(6).fill(130),
  ...Array(4).fill(250),
  ...Array(3).fill(400),
]
const TICKS_TOTAL = TICKS.reduce((a, b) => a + b, 0) // ~3940 ms

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drawState, setDrawState] = useState<'idle' | 'spinning' | 'winner'>('idle')
  const [slotName, setSlotName] = useState('')
  const [slotKey, setSlotKey] = useState(0)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())

  // Keep a ref so animation closures always see the current list
  const participantsRef = useRef<Participant[]>([])
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    fetchParticipants()
    return () => pendingTimers.current.forEach(clearTimeout)
  }, [])

  const fetchParticipants = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('participants')
      .select('id, name, phone, email, created_at')
      .order('created_at', { ascending: false })
    if (data) {
      setParticipants(data)
      participantsRef.current = data
    }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return participants
    const q = normalize(search)
    return participants.filter(
      p => normalize(p.name).includes(q) || normalize(p.email).includes(q)
    )
  }, [participants, search])

  // Row numbers that stay stable when filtering
  const indexMap = useMemo(
    () => new Map(participants.map((p, i) => [p.id, i + 1])),
    [participants]
  )

  const eligible = useMemo(
    () => participants.filter(p => !usedIds.has(p.id)),
    [participants, usedIds]
  )

  // ─── CSV export ────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['#', 'Nombre', 'Teléfono', 'Correo', 'Registrado']
    const rows = participants.map((p, i) => [
      i + 1, p.name, p.phone, p.email, formatDate(p.created_at),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participantes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Slot machine animation ─────────────────────────────────────
  const animateDraw = (picked: Participant) => {
    const pool = participantsRef.current
    const randomName = () => pool[Math.floor(Math.random() * pool.length)].name

    pendingTimers.current.forEach(clearTimeout)
    pendingTimers.current = []

    setDrawState('spinning')
    setWinner(null)

    // Show the first name immediately
    setSlotName(randomName())
    setSlotKey(k => k + 1)

    // Schedule all subsequent ticks upfront
    let elapsed = 0
    for (let i = 0; i < TICKS.length; i++) {
      elapsed += TICKS[i]
      const nameIndex = i + 1
      // Land on the winner for the final 2 ticks
      const isLanding = nameIndex >= TICKS.length - 1

      const t = setTimeout(() => {
        setSlotName(isLanding ? picked.name : randomName())
        setSlotKey(k => k + 1)
      }, elapsed)
      pendingTimers.current.push(t)
    }

    // Reveal winner overlay 600 ms after last tick
    const reveal = setTimeout(() => {
      setWinner(picked)
      setDrawState('winner')
      fireWinnerConfetti()
    }, TICKS_TOTAL + 600)
    pendingTimers.current.push(reveal)
  }

  const pickAndAnimate = (pool: Participant[]) => {
    if (pool.length === 0) return
    const picked = pool[Math.floor(Math.random() * pool.length)]
    setUsedIds(prev => new Set([...prev, picked.id]))
    animateDraw(picked)
  }

  const startDraw = () => {
    if (drawState !== 'idle') return
    pickAndAnimate(participants.filter(p => !usedIds.has(p.id)))
  }

  // Called from winner overlay — skips idle check, jumps directly to spinning
  const drawAgain = () => {
    setWinner(null)
    const pool = participants.filter(p => !usedIds.has(p.id))
    if (pool.length === 0) { setDrawState('idle'); return }
    pickAndAnimate(pool)
  }

  const resetDraw = () => {
    pendingTimers.current.forEach(clearTimeout)
    pendingTimers.current = []
    setDrawState('idle')
    setWinner(null)
    setSlotName('')
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="gradient-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Header ── */}
        <div className="mb-8 animate-fade-up">
          <p className="text-muted text-xs uppercase tracking-[0.18em] mb-1.5">
            Panel Administrador
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl text-foreground tracking-widest">
            RIFA GRUPO{' '}
            <span className="text-accent">CISNEROS</span>
          </h1>
        </div>

        {/* ── Stats ── */}
        <div
          className="grid grid-cols-3 gap-3 mb-6 animate-fade-up"
          style={{ animationDelay: '0.08s' }}
        >
          {[
            {
              label: 'Total',
              value: loading ? null : participants.length,
              sub: 'participantes',
              accent: true,
            },
            { label: 'Sorteos', value: usedIds.size, sub: 'realizados', accent: false },
            {
              label: 'Pendientes',
              value: loading ? null : eligible.length,
              sub: 'por sortear',
              accent: false,
            },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} className="glass-card px-4 py-4">
              <p className="text-muted text-xs uppercase tracking-widest mb-1">{label}</p>
              {value === null ? (
                <div className="h-8 w-10 bg-surface/80 rounded animate-pulse mt-1" />
              ) : (
                <p className={`font-heading text-3xl ${accent ? 'text-accent' : 'text-foreground'}`}>
                  {value}
                </p>
              )}
              <p className="text-muted text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div
          className="flex flex-col sm:flex-row gap-2.5 mb-4 animate-fade-up"
          style={{ animationDelay: '0.16s' }}
        >
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="flex-1 bg-surface/40 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
          <button
            onClick={fetchParticipants}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-border/60 text-muted text-sm hover:border-border hover:text-foreground transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
            Actualizar
          </button>
          <button
            onClick={exportCSV}
            disabled={participants.length === 0}
            className="px-4 py-2.5 rounded-xl border border-accent/40 text-accent text-sm hover:bg-accent/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            ↓ Exportar CSV
          </button>
        </div>

        {/* ── Participants table ── */}
        <div
          className="glass-card overflow-hidden mb-8 animate-fade-up"
          style={{ animationDelay: '0.24s' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Nombre', 'Teléfono', 'Correo', 'Registrado'].map(col => (
                    <th
                      key={col}
                      className="text-left py-3.5 px-4 text-xs uppercase tracking-[0.1em] text-muted font-semibold whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-5 bg-surface rounded animate-pulse" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-36 bg-surface rounded animate-pulse" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-24 bg-surface rounded animate-pulse" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-44 bg-surface rounded animate-pulse" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-28 bg-surface rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-3xl mb-3">🎟️</p>
                      <p className="text-muted text-sm">
                        {search
                          ? 'No se encontraron resultados para esa búsqueda'
                          : 'Aún no hay participantes registrados'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr
                      key={p.id}
                      className={`border-b border-border/20 transition-colors hover:bg-white/[0.025] ${
                        usedIds.has(p.id) ? 'opacity-30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-muted text-xs tabular-nums">
                        {indexMap.get(p.id)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-foreground/80 whitespace-nowrap tabular-nums">
                        {p.phone}
                      </td>
                      <td className="py-3.5 px-4 text-foreground/80">
                        {p.email}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-xs whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && participants.length > 0 && (
            <div className="px-4 py-3 border-t border-border/20 flex items-center justify-between gap-4">
              <p className="text-muted text-xs">
                {search
                  ? `${filtered.length} de ${participants.length} participantes`
                  : `${participants.length} participante${participants.length !== 1 ? 's' : ''} registrado${participants.length !== 1 ? 's' : ''}`}
              </p>
              {usedIds.size > 0 && (
                <p className="text-muted/40 text-xs">
                  {usedIds.size} ya sorteado{usedIds.size !== 1 ? 's' : ''} (atenuados)
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Draw section ── */}
        <div
          className="glass-card p-6 sm:p-8 animate-fade-up"
          style={{ animationDelay: '0.32s' }}
        >
          <div className="text-center mb-6">
            <h2 className="font-heading text-3xl sm:text-4xl text-foreground tracking-widest mb-1">
              REALIZAR SORTEO
            </h2>
            <p className="text-muted text-sm">
              {loading
                ? 'Cargando participantes...'
                : eligible.length > 0
                  ? `${eligible.length} participante${eligible.length !== 1 ? 's' : ''} elegible${eligible.length !== 1 ? 's' : ''}`
                  : participants.length > 0
                    ? 'Todos los participantes ya han sido sorteados'
                    : 'No hay participantes registrados aún'}
            </p>
          </div>

          {/* Slot machine window */}
          {drawState !== 'idle' && (
            <div className="mb-6">
              <div
                className={`relative mx-auto max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border transition-all duration-500 ${
                  drawState === 'spinning'
                    ? 'border-accent/70 shadow-[0_0_35px_rgba(245,166,35,0.22)]'
                    : 'border-accent/30 shadow-[0_0_20px_rgba(245,166,35,0.1)]'
                }`}
              >
                {/* Fade overlays create the slot window illusion */}
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-ink to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink to-transparent z-10 pointer-events-none" />
                {/* Slot rails */}
                <div className="absolute inset-x-0 top-10 h-px bg-accent/25 z-10" />
                <div className="absolute inset-x-0 bottom-10 h-px bg-accent/25 z-10" />

                <div className="bg-ink/85 px-8 py-10 min-h-[6rem] flex items-center justify-center">
                  <p
                    key={slotKey}
                    className="animate-slot-tick font-heading text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wider text-center leading-snug"
                  >
                    {slotName || '?????'}
                  </p>
                </div>
              </div>

              {drawState === 'spinning' && (
                <p className="text-center text-muted/50 text-xs mt-3 animate-pulse tracking-[0.2em] uppercase">
                  seleccionando ganador…
                </p>
              )}
            </div>
          )}

          {/* CTA button */}
          {drawState === 'idle' && (
            <button
              onClick={startDraw}
              disabled={eligible.length === 0 || loading}
              className="relative w-full overflow-hidden rounded-xl py-5 font-heading text-2xl sm:text-3xl tracking-[0.1em] text-ink bg-gradient-to-r from-accent to-accent-light active:scale-[0.98] transition-transform duration-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-accent/30"
            >
              🎲 REALIZAR SORTEO
            </button>
          )}

          {drawState === 'spinning' && (
            <div className="w-full rounded-xl py-4 text-center font-heading text-lg tracking-widest text-muted/35 bg-surface/20 border border-border/20 cursor-not-allowed select-none">
              Sorteando...
            </div>
          )}

          {eligible.length === 0 && participants.length > 0 && drawState === 'idle' && (
            <button
              onClick={() => setUsedIds(new Set())}
              className="w-full mt-3.5 text-xs text-muted/50 hover:text-muted hover:underline underline-offset-2 transition-all"
            >
              Reiniciar historial de sorteos
            </button>
          )}
        </div>
      </div>

      {/* ── Winner overlay (fullscreen) ── */}
      {drawState === 'winner' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Dimmed backdrop — click to dismiss */}
          <div
            className="absolute inset-0 bg-ink/88 backdrop-blur-md"
            onClick={resetDraw}
          />

          <div className="relative glass-card w-full max-w-md p-7 sm:p-9 text-center animate-scale-in">
            <div className="text-7xl mb-4 animate-float-pulse">🏆</div>

            <p className="text-muted text-xs uppercase tracking-[0.22em] mb-3">
              ¡Ganador del Sorteo!
            </p>

            <h2 className="font-heading text-4xl sm:text-5xl text-accent tracking-wider leading-tight mb-6">
              {winner.name}
            </h2>

            {/* Winner details */}
            <div className="bg-ink/70 rounded-2xl p-5 border border-border/30 mb-6 text-left space-y-3">
              <div className="flex items-start gap-4">
                <span className="text-muted text-xs uppercase tracking-widest w-16 shrink-0 pt-0.5">
                  Tel.
                </span>
                <span className="text-foreground text-sm font-medium tabular-nums">
                  {winner.phone}
                </span>
              </div>
              <div className="h-px bg-border/20" />
              <div className="flex items-start gap-4">
                <span className="text-muted text-xs uppercase tracking-widest w-16 shrink-0 pt-0.5">
                  Correo
                </span>
                <span className="text-foreground text-sm font-medium break-all">
                  {winner.email}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {eligible.length > 0 ? (
                <button
                  onClick={drawAgain}
                  className="w-full rounded-xl py-4 font-heading text-lg sm:text-xl tracking-widest text-ink bg-gradient-to-r from-accent to-accent-light active:scale-[0.98] transition-transform shadow-lg shadow-accent/25"
                >
                  🎲 REALIZAR OTRO SORTEO
                </button>
              ) : (
                <p className="text-muted/60 text-sm py-2">
                  Todos los participantes han sido sorteados.
                </p>
              )}
              <button
                onClick={resetDraw}
                className="w-full rounded-xl py-3 text-muted text-sm border border-border/40 hover:border-border/70 hover:text-foreground transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
