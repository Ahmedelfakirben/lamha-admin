import { NextRequest } from "next/server"

/**
 * Obtiene la URI de redireccionamiento para Google OAuth asegurando cumplimiento con las políticas de Google:
 * 1. Google OAuth 2.0 prohíbe terminantemente `http://` en cualquier dominio público (exige HTTPS).
 *    Detrás de proxies como Coolify/Traefik, req.nextUrl puede llegar con `http://` interno, lo que provoca:
 *    "Error 400: invalid_request - doesn't comply with Google's OAuth 2.0 policy".
 * 2. Solo permite `http://` en localhost / 127.0.0.1.
 */
export function getOAuthRedirectUri(req: NextRequest): string {
  // 1. Variable de entorno explícita (si se configura en Coolify)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/$/, "")
    return `${cleanUrl}/api/auth/google/callback`
  }

  // 2. Cabeceras del proxy inverso (Traefik / Nginx / Coolify)
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || ""
  
  if (forwardedHost) {
    const isLocal = forwardedHost.includes("localhost") || forwardedHost.includes("127.0.0.1")
    const proto = isLocal ? "http" : "https"
    return `${proto}://${forwardedHost}/api/auth/google/callback`
  }

  // 3. Fallback a req.nextUrl
  let origin = req.nextUrl.origin || "http://localhost:3000"
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1")
  if (!isLocal && origin.startsWith("http://")) {
    origin = origin.replace("http://", "https://")
  }

  return `${origin}/api/auth/google/callback`
}

