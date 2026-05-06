import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('admin_session')?.value
  const token = process.env.NEXT_PUBLIC_ADMIN_SESSION_TOKEN
  const isAuthenticated = !!token && session === token

  // Si ya está autenticado y va al login, redirigir al panel
  if (pathname === '/admin/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Rutas protegidas: redirigir al login si no hay sesión válida
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
