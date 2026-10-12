import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/"/g, "").trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").replace(/"/g, "").trim()

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: "Credenciales OAuth no configuradas en el servidor. Añade GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET."
      }, { status: 500 })
    }

    // Usar la URL de origen de la petición o fallback a localhost:3000
    const origin = req.nextUrl.origin || "http://localhost:3000"
    const redirectUri = `${origin}/api/auth/google/callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // Asegura que Google siempre devuelva el refresh_token
      scope: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: req.nextUrl.searchParams.get("redirect") || "/settings",
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
