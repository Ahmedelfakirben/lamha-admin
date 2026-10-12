import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const redirectPath = searchParams.get("state") || "/settings"

  if (error) {
    return NextResponse.redirect(new URL(`${redirectPath}?gdrive_error=${encodeURIComponent(error)}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${redirectPath}?gdrive_error=missing_code`, req.url))
  }

  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/"/g, "").trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").replace(/"/g, "").trim()
    const origin = req.nextUrl.origin || "http://localhost:3000"
    const redirectUri = `${origin}/api/auth/google/callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Obtener información del usuario de Google conectado
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const connectedEmail = userInfo.data.email || "Google User"

    if (!tokens.refresh_token) {
      console.warn("[Google OAuth Callback] No se devolvió refresh_token, pero access_token está disponible.")
    }

    const refreshTokenToSave = tokens.refresh_token || tokens.access_token

    // Guardar en Supabase studio_delivery_settings
    const supabase = getSupabaseAdmin()
    await supabase
      .from("studio_delivery_settings")
      .upsert({
        id: 1,
        gdrive_client_email: connectedEmail,
        gdrive_private_key: `oauth_refresh:${refreshTokenToSave}`,
        updated_at: new Date().toISOString(),
      })

    return NextResponse.redirect(new URL(`${redirectPath}?gdrive=connected&email=${encodeURIComponent(connectedEmail)}`, req.url))
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]:", err)
    return NextResponse.redirect(new URL(`${redirectPath}?gdrive_error=${encodeURIComponent(err.message || "Error al conectar")}`, req.url))
  }
}
