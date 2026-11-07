import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SERVICE_ROLE_KEY =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTkxODUwMCwiZXhwIjo0OTQ1NTkyMTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.vShCmR_4b4WTXwDdnc4yIIZI0iD3pssYZZ-YlEObzoE'

function resolveServiceRoleKey(): string {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Ignore legacy expired/mismatched key if still present in host environment
  if (envKey && !envKey.includes('4Li3DGCUyUzh8fYdgMoGjbEkI4MSLiSr_jj6brAOBDU')) {
    return envKey
  }
  return DEFAULT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}


