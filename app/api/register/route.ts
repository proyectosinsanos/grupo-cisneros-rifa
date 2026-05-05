import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, email } = body

  if (!name || !phone || !email) {
    return NextResponse.json(
      { message: 'Todos los campos son requeridos.' },
      { status: 400 }
    )
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (request.headers.get('x-real-ip') ?? '127.0.0.1')

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('ip_address', ip)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { message: 'Ya estás registrado en la rifa 🎉' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('participants').insert({
    name,
    phone,
    email,
    ip_address: ip,
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json(
      { message: 'Ocurrió un error. Por favor intenta de nuevo.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
