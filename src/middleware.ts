import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicPwa = pathname === '/manifest.json' || pathname === '/sw.js'

  // Rutas API públicas legítimas (webhooks y callbacks externos)
  const isPublicApiRoute =
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/auth/google/callback') ||
    pathname.startsWith('/api/auth/google/url') ||
    pathname === '/api/retention/request' ||
    pathname === '/api/portal/selection'

  // 1. Proteger rutas API administrativas: denegar acceso a usuarios no autenticados
  if (isApiRoute && !isPublicApiRoute) {
    const authHeader = request.headers.get('authorization') || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isServiceRole = Boolean(
      serviceKey &&
      (authHeader === `Bearer ${serviceKey}` || request.headers.get('x-service-key') === serviceKey)
    )

    if (!user && !isServiceRole) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesión de administrador o clave de servicio requerida' },
        { status: 401 }
      )
    }
  }

  // 2. Si no está autenticado y accede a páginas protegidas -> Redirigir a /login
  if (!user && !isAuthPage && !isApiRoute && !isPublicPwa) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Si está autenticado e intenta acceder a /login -> Redirigir al dashboard /
  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/'
    dashboardUrl.searchParams.delete('redirectedFrom')
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Interceptar todas las rutas excepto recursos estáticos e imágenes:
     * - _next/static (ficheros estáticos compilados)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - ficheros públicos (svg, png, jpg, webp, json, js)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)',
  ],
}

