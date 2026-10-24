/**
 * Lamha Studios — Servicio Core de Integración WhatsApp (Evolution API v2)
 * Conexión, gestión de instancia, envío de mensajes y sincronización con Supabase
 */

import { createAdminClient } from "@/lib/supabase"
import type { WhatsAppMessage } from "@/types/database"

export interface InstanceStatusResponse {
  instanceName: string
  state: "open" | "connecting" | "close" | "refused" | "unknown"
  qrcode?: string | null
  pairingCode?: string | null
  raw?: any
}

export interface ConnectQRResponse {
  base64?: string | null
  code?: string | null
  pairingCode?: string | null
  count?: number
  state?: string
}

export interface SendWhatsAppParams {
  phone: string
  text: string
  clientId?: string | null
  sessionId?: string | null
}

export interface SendWhatsAppResult {
  success: boolean
  messageId?: string | null
  error?: string
  data?: any
}

function getEvolutionConfig() {
  const url = (process.env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY || ""
  const instance = process.env.EVOLUTION_INSTANCE_NAME || "lam7astudio"

  return { url, apiKey, instance }
}

/**
 * Normaliza cualquier número de teléfono dejando solo dígitos internacionales.
 * Si es un número local de Marruecos (06... o 07...), le asigna el prefijo 212.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ""
  let cleaned = phone.replace(/\D/g, "")

  // Caso: Formato local marroquí con 0 inicial (ej: 0612345678 -> 212612345678)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "212" + cleaned.substring(1)
  }

  // Caso: 9 dígitos empezando por 6 o 7 sin prefijo (ej: 612345678 -> 212612345678)
  if (cleaned.length === 9 && (cleaned.startsWith("6") || cleaned.startsWith("7"))) {
    cleaned = "212" + cleaned
  }

  return cleaned
}

/**
 * Consulta el estado actual de la conexión de la instancia.
 * Si devuelve 404 (instancia inexistente), la crea automáticamente en Evolution API.
 */
export async function getInstanceStatus(): Promise<InstanceStatusResponse> {
  const { url, apiKey, instance } = getEvolutionConfig()

  if (!apiKey) {
    return {
      instanceName: instance,
      state: "close",
      raw: { error: "EVOLUTION_API_KEY no configurada en variables de entorno" }
    }
  }

  try {
    const res = await fetch(`${url}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    })

    if (res.status === 404) {
      // Instancia no existe, crearla automáticamente
      console.log(`[WhatsApp] Creando instancia '${instance}' en Evolution API...`)
      const createRes = await fetch(`${url}/instance/create`, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      })

      const createData = await createRes.json()
      return {
        instanceName: instance,
        state: "connecting",
        qrcode: createData?.qrcode?.base64 || null,
        pairingCode: createData?.qrcode?.pairingCode || null,
        raw: createData
      }
    }

    const data = await res.json()
    const state = data?.instance?.state || data?.state || "close"

    return {
      instanceName: instance,
      state: state.toLowerCase() as any,
      raw: data
    }
  } catch (err: any) {
    console.error("[WhatsApp] Error en getInstanceStatus:", err)
    return {
      instanceName: instance,
      state: "unknown",
      raw: { error: err.message }
    }
  }
}

/**
 * Solicita el código QR en Base64 para escanear y vincular WhatsApp.
 */
export async function connectAndGetQR(): Promise<ConnectQRResponse> {
  const { url, apiKey, instance } = getEvolutionConfig()

  try {
    const res = await fetch(`${url}/instance/connect/${instance}`, {
      method: "GET",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    })

    const data = await res.json()
    return {
      base64: data?.base64 || data?.qrcode?.base64 || null,
      code: data?.code || data?.qrcode?.code || null,
      pairingCode: data?.pairingCode || data?.qrcode?.pairingCode || null,
      count: data?.count,
      state: data?.state
    }
  } catch (err: any) {
    console.error("[WhatsApp] Error en connectAndGetQR:", err)
    throw new Error(err.message || "Error al solicitar código QR a Evolution API")
  }
}

/**
 * Cierra la sesión de WhatsApp desvinculando el número de la instancia.
 */
export async function logoutInstance(): Promise<{ success: boolean; error?: string }> {
  const { url, apiKey, instance } = getEvolutionConfig()

  try {
    const res = await fetch(`${url}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      }
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data?.response?.message || "Error al cerrar sesión" }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Configura automáticamente el Webhook en Evolution API para recibir mensajes y estados.
 */
export async function setupWebhook(webhookUrl: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const { url, apiKey, instance } = getEvolutionConfig()

  try {
    const res = await fetch(`${url}/webhook/set/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE"
        ]
      })
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data?.message || "No se pudo configurar el webhook" }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Envía un mensaje de texto por WhatsApp a un cliente y lo registra en Supabase.
 */
export async function sendWhatsAppMessage({
  phone,
  text,
  clientId = null,
  sessionId = null
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const { url, apiKey, instance } = getEvolutionConfig()
  const cleanPhone = normalizePhone(phone)

  if (!cleanPhone) {
    return { success: false, error: "Número de teléfono no válido o vacío" }
  }

  if (!text || !text.trim()) {
    return { success: false, error: "El contenido del mensaje no puede estar vacío" }
  }

  let externalMessageId: string | null = null
  let rawPayload: any = null

  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text.trim(),
        delay: 1200
      })
    })

    rawPayload = await res.json()

    if (!res.ok) {
      console.warn("[WhatsApp] Envío fallido en Evolution API:", rawPayload)
      return {
        success: false,
        error: rawPayload?.message || rawPayload?.response?.message || "Error al enviar mensaje por Evolution API",
        data: rawPayload
      }
    }

    externalMessageId = rawPayload?.key?.id || null

    // Registrar en la base de datos de Supabase
    try {
      const supabase = createAdminClient()
      await supabase.from("whatsapp_messages").insert({
        client_id: clientId,
        session_id: sessionId,
        remote_jid: `${cleanPhone}@s.whatsapp.net`,
        phone: cleanPhone,
        from_me: true,
        message_type: "text",
        content: text.trim(),
        status: "sent",
        external_message_id: externalMessageId,
        raw_payload: rawPayload
      })
    } catch (dbErr) {
      console.error("[WhatsApp] Error al guardar mensaje saliente en Supabase:", dbErr)
    }

    return {
      success: true,
      messageId: externalMessageId,
      data: rawPayload
    }
  } catch (err: any) {
    console.error("[WhatsApp] Excepción en sendWhatsAppMessage:", err)
    return {
      success: false,
      error: err.message || "Error inesperado al conectar con el servidor de WhatsApp"
    }
  }
}
