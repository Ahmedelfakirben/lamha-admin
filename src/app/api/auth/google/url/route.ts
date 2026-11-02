import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { getOAuthRedirectUri } from "../oauth-utils"

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

    const redirectUri = getOAuthRedirectUri(req)

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

    return NextResponse.json({ url, redirectUri })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
