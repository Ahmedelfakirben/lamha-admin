import { NextResponse, type NextRequest } from "next/server"
import { setupWebhook } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let webhookUrl = body?.url

    if (!webhookUrl) {
      // Intentar deducir la URL del host si no se provee
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "admin.lam7a.ma"
      const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
      webhookUrl = `${proto}://${host}/api/webhooks/whatsapp`
    }

    const result = await setupWebhook(webhookUrl)
    return NextResponse.json({ ...result, configuredUrl: webhookUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
