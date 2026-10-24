import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const url = (process.env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY || ""
  const instance = process.env.EVOLUTION_INSTANCE_NAME || "lam7astudio"

  try {
    const res = await fetch(`${url}/chat/findChats/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: errData?.message || "Erreur Evolution API" }, { status: res.status })
    }

    const chats = await res.json()
    return NextResponse.json({ success: true, chats: Array.isArray(chats) ? chats : [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
