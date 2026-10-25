import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const url = (process.env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY || ""
  const instance = process.env.EVOLUTION_INSTANCE_NAME || "lam7astudio"

  try {
    const headers = {
      apikey: apiKey,
      "Content-Type": "application/json",
    }

    // 1. Obtener chats y contactos de WhatsApp en paralelo
    const [chatsRes, contactsRes] = await Promise.allSettled([
      fetch(`${url}/chat/findChats/${instance}`, {
        method: "POST",
        headers,
        cache: "no-store",
      }),
      fetch(`${url}/chat/findContacts/${instance}`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
        cache: "no-store",
      }),
    ])

    let rawChats: any[] = []
    if (chatsRes.status === "fulfilled" && chatsRes.value.ok) {
      const data = await chatsRes.value.json().catch(() => [])
      if (Array.isArray(data)) rawChats = data
    }

    let rawContacts: any[] = []
    if (contactsRes.status === "fulfilled" && contactsRes.value.ok) {
      const data = await contactsRes.value.json().catch(() => [])
      if (Array.isArray(data)) rawContacts = data
    }

    // 2. Indexar contactos por remoteJid, dígitos puros y últimos 9 dígitos
    const contactMap = new Map<string, any>()
    for (const c of rawContacts) {
      if (c.remoteJid) {
        contactMap.set(c.remoteJid.toLowerCase(), c)
        const digits = c.remoteJid.replace(/@.*$/, "").replace(/\D/g, "")
        if (digits) {
          contactMap.set(digits, c)
          if (digits.length >= 9) {
            contactMap.set(digits.slice(-9), c)
          }
        }
      }
    }

    // 3. Enriquecer los chats con los nombres de contactos guardados
    const enrichedChats = rawChats.map((chat: any) => {
      const rawJid = (chat.remoteJid || "").toLowerCase()
      const rawDigits = rawJid.replace(/@.*$/, "").replace(/\D/g, "")
      const last9 = rawDigits.slice(-9)

      // Si es un LID numérico de WhatsApp (@lid), verificar si tiene teléfono alternativo real
      const altJid = chat.lastMessage?.key?.remoteJidAlt
      const altDigits = altJid ? altJid.replace(/@.*$/, "").replace(/\D/g, "") : ""
      const altLast9 = altDigits ? altDigits.slice(-9) : ""

      const contact = contactMap.get(rawJid) 
        || contactMap.get(rawDigits) 
        || (last9 ? contactMap.get(last9) : null)
        || (altJid ? contactMap.get(altJid.toLowerCase()) : null)
        || (altDigits ? contactMap.get(altDigits) : null)
        || (altLast9 ? contactMap.get(altLast9) : null)

      let contactName: string | null = null

      if (contact) {
        const candidate = contact.pushName || contact.name
        // Solo considerar como nombre de contacto si no es simplemente el número repetido
        if (candidate && /[a-zA-Z\u0600-\u06FF]/.test(candidate)) {
          contactName = candidate.trim()
        }
        if (!chat.profilePicUrl && contact.profilePicUrl) {
          chat.profilePicUrl = contact.profilePicUrl
        }
      }

      // Si aún no tiene nombre pero el último mensaje recibido tiene pushName con texto real
      if (!contactName && chat.lastMessage?.pushName && !chat.lastMessage?.key?.fromMe) {
        const senderPush = chat.lastMessage.pushName
        if (senderPush && /[a-zA-Z\u0600-\u06FF]/.test(senderPush) && senderPush !== "Você" && senderPush !== "You") {
          contactName = senderPush.trim()
        }
      }

      return {
        ...chat,
        realPhone: altDigits || rawDigits,
        contactName: contactName || chat.contactName || null,
      }
    })

    return NextResponse.json({
      success: true,
      chats: enrichedChats,
      contactsCount: rawContacts.length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
