import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzozrzyzzitgpbcsdvwp.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3pyenl6eml0Z3BiY3NkdndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxODAsImV4cCI6MjA4ODU5MjE4MH0.g36iagNIIm0C46RVTu7fI3hOTDL3uc4Pp_q2WTErlIE",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: NO uses getSession, usa getUser para comprobaciones de seguridad reales
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proteger rutas bajo /(dashboard) o la raíz
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                           request.nextUrl.pathname.startsWith('/pos') ||
                           request.nextUrl.pathname.startsWith('/caja') ||
                           request.nextUrl.pathname.startsWith('/products') ||
                           request.nextUrl.pathname.startsWith('/inventory') ||
                           request.nextUrl.pathname.startsWith('/promotions') ||
                           request.nextUrl.pathname.startsWith('/customers') ||
                           request.nextUrl.pathname.startsWith('/reports') ||
                           request.nextUrl.pathname === '/';

  if (!user && isDashboardRoute) {
    // Si no hay usuario y trata de acceder a una ruta protegida, redirigir al login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si hay usuario y trata de ir al login, redirigir al dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
