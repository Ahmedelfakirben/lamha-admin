import { NextResponse, type NextRequest } from "next/server"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, text, clientId, sessionId } = body

    if (!phone || !text) {
      return NextResponse.json({ error: "Faltan campos obligatorios (phone, text)" }, { status: 400 })
    }

    const result = await sendWhatsAppMessage({
      phone,
      text,
      clientId: clientId || null,
      sessionId: sessionId || null,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error, data: result.data }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
