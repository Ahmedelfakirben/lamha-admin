import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const url = (process.env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY || ""
  const instance = process.env.EVOLUTION_INSTANCE_NAME || "lam7astudio"

  try {
    const { remoteJid, phone } = await req.json()
    const targetJid = remoteJid || (phone ? `${phone.replace(/\D/g, "")}@s.whatsapp.net` : null)

    if (!targetJid) {
      return NextResponse.json({ success: false, error: "remoteJid ou phone requis" }, { status: 400 })
    }

    const res = await fetch(`${url}/chat/findMessages/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: targetJid,
          },
        },
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: err?.message || "Erreur récupération messages" }, { status: res.status })
    }

    const data = await res.json()
    const records = data?.messages?.records || (Array.isArray(data) ? data : [])
    return NextResponse.json({ success: true, messages: records })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
