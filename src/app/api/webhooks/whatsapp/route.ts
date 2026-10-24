import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { normalizePhone } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body?.event || body?.type || ""
    const data = body?.data || body

    // 1. Manejo de mensajes nuevos o actualizados (MESSAGES_UPSERT)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const key = data?.key
      if (!key) {
        return NextResponse.json({ received: true, ignored: "no_key" })
      }

      const remoteJid: string = key.remoteJid || ""

      // Ignorar mensajes de grupos y difusiones de estados
      if (remoteJid.includes("@g.us") || remoteJid.includes("broadcast")) {
        return NextResponse.json({ received: true, ignored: "group_or_broadcast" })
      }

      const externalMessageId: string = key.id || ""
      const fromMe = Boolean(key.fromMe)
      const rawNumber = remoteJid.split("@")[0] || ""
      const cleanPhone = normalizePhone(rawNumber)

      // Extraer contenido de texto según tipo de mensaje de Baileys
      const msg = data?.message || {}
      let content = 
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        ""

      let messageType: "text" | "image" | "audio" | "video" | "document" = "text"

      if (msg.imageMessage) {
        messageType = "image"
        if (!content) content = "[Fotografía]"
      } else if (msg.audioMessage) {
        messageType = "audio"
        content = "[Nota de voz]"
      } else if (msg.videoMessage) {
        messageType = "video"
        if (!content) content = "[Vídeo]"
      } else if (msg.documentMessage) {
        messageType = "document"
        if (!content) content = `[Documento: ${msg.documentMessage.fileName || "Archivo"}]`
      } else if (!content) {
        content = "[Mensaje de WhatsApp]"
      }

      const supabase = createAdminClient()

      // Búsqueda inteligente del cliente por coincidencia exacta o por los últimos 9 dígitos
      let clientId: string | null = null
      let sessionId: string | null = null

      const last9Digits = cleanPhone.slice(-9)

      const { data: clients } = await supabase
        .from("clients")
        .select("id, phone")
        .limit(10)

      if (clients && clients.length > 0) {
        const matched = clients.find((c) => {
          if (!c.phone) return false
          const cClean = normalizePhone(c.phone)
          return cClean === cleanPhone || cClean.endsWith(last9Digits)
        })

        if (matched) {
          clientId = matched.id
        }
      }

      // Si encontramos cliente, buscar su proyecto / sesión más reciente
      if (clientId) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id")
          .eq("client_id", clientId)
          .order("session_date", { ascending: false })
          .limit(1)

        if (sessions && sessions.length > 0) {
          sessionId = sessions[0].id
        }
      }

      // Guardar o actualizar mensaje con ON CONFLICT (external_message_id)
      const { error: upsertErr } = await supabase
        .from("whatsapp_messages")
        .upsert(
          {
            client_id: clientId,
            session_id: sessionId,
            remote_jid: remoteJid,
            phone: cleanPhone,
            from_me: fromMe,
            message_type: messageType,
            content: content.trim(),
            status: fromMe ? "sent" : "delivered",
            external_message_id: externalMessageId,
            raw_payload: data
          },
          { onConflict: "external_message_id" }
        )

      if (upsertErr) {
        console.error("[Webhook WhatsApp] Error al insertar mensaje:", upsertErr)
      }

      return NextResponse.json({ received: true, success: true, externalMessageId })
    }

    // 2. Manejo de estado de entrega y lectura (MESSAGES_UPDATE)
    if (event === "messages.update" || event === "MESSAGES_UPDATE") {
      const updates = Array.isArray(data) ? data : [data]
      const supabase = createAdminClient()

      for (const item of updates) {
        const msgId = item?.key?.id
        const updateStatus = item?.update?.status

        if (msgId && updateStatus) {
          let statusText = "sent"
          if (updateStatus === "READ" || updateStatus === 4 || updateStatus === 5) {
            statusText = "read"
          } else if (updateStatus === "DELIVERY_ACK" || updateStatus === 3) {
            statusText = "delivered"
          }

          await supabase
            .from("whatsapp_messages")
            .update({ status: statusText })
            .eq("external_message_id", msgId)
        }
      }

      return NextResponse.json({ received: true, updated: updates.length })
    }

    // Eventos de conexión u otros
    return NextResponse.json({ received: true, event })
  } catch (err: any) {
    console.error("[Webhook WhatsApp] Error inesperado:", err)
    return NextResponse.json({ received: false, error: err.message }, { status: 500 })
  }
}
