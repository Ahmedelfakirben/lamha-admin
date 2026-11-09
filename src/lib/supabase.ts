import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function resolveServiceRoleKey(): string {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Ignorar clave legada expirada si estuviera presente
  if (envKey && !envKey.includes('4Li3DGCUyUzh8fYdgMoGjbEkI4MSLiSr_jj6brAOBDU')) {
    return envKey
  }
  if (!envKey && process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] SUPABASE_SERVICE_ROLE_KEY no está definida en el entorno.')
  }
  return envKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export function createServiceRoleClient() {
  return createAdminClient()
}

export function createClient() {
  // En entorno servidor (Server Components / SSR), usar cliente administrativo con permisos
  if (typeof window === 'undefined') {
    return createAdminClient()
  }
  // En entorno navegador ("use client"), usar cliente con sesión de cookies
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


