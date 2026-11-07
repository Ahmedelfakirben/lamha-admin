import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createDeliveryDriveFolder, getDriveAccessToken } from "@/lib/gdrive"
import { sendPhotosReadyNotification } from "@/lib/email"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { getPhotosReadyWhatsApp } from "@/lib/whatsapp-templates"

export const maxDuration = 120
export const dynamic = "force-dynamic"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * POST /api/deliveries/gdrive-direct
 * Permite inicializar una carpeta compartida en Google Drive y obtener el Access Token
 * para subir archivos directamente desde el disco C:\ del PC hacia Google Drive sin pasar
 * por el límite de tamaño del servidor en la nube, y registrar la entrega final al terminar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // -------------------------------------------------------------------------
    // PASO 1: Inicializar carpeta en Google Drive + devolver Access Token
    // -------------------------------------------------------------------------
    if (action === "init") {
      const { sessionId, clientName = "Cliente" } = body
      if (!sessionId) {
        return NextResponse.json({ error: "Falta sessionId." }, { status: 400 })
      }

      const cleanClient = clientName.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
      const datePrefix = new Date().toISOString().split("T")[0]
      const gdriveFolderName = `${datePrefix}_${cleanClient}_Entrega_Final`

      const [{ folderId, folderUrl }, { accessToken }] = await Promise.all([
        createDeliveryDriveFolder(gdriveFolderName),
        getDriveAccessToken(),
      ])

      return NextResponse.json({
        success: true,
        folderId,
        folderUrl,
        gdriveFolderName,
        accessToken,
      })
    }

    // -------------------------------------------------------------------------
    // PASO 2: Registrar entrega final en Supabase + Notificar Cliente
    // -------------------------------------------------------------------------
    if (action === "complete") {
      const {
        sessionId,
        folderId,
        folderUrl,
        totalFiles = 0,
        totalSizeMb = 0,
        retentionDays = 30,
        language = "fr",
      } = body

      if (!sessionId || !folderId || !folderUrl) {
        return NextResponse.json(
          { error: "Faltan parámetros sessionId, folderId o folderUrl." },
          { status: 400 }
        )
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)
      const supabase = getSupabaseAdmin()
      const logs: Array<{ level: "info" | "success" | "warn" | "error"; msg: string }> = []

      const labelMap: Record<string, string> = {
        es: `Google Drive Sincronizado (${totalFiles} archivos)`,
        fr: `Google Drive Synchronisé (${totalFiles} fichiers)`,
        en: `Google Drive Synced (${totalFiles} files)`,
        ar: `مزامنة Google Drive (${totalFiles} ملفات)`,
      }

      // Desactivar entregas final_link anteriores de esta misma sesión para mantener limpia la vista
      await supabase
        .from("media_deliveries")
        .update({ is_active: false })
        .eq("session_id", sessionId)
        .eq("delivery_type", "final_link")

      // Insertar nueva entrega activa
      await supabase.from("media_deliveries").insert({
        session_id: sessionId,
        delivery_type: "final_link",
        url: folderUrl,
        label: labelMap[language] || labelMap.fr,
        delivered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        gdrive_folder_id: folderId,
        delivery_mode: "nas_sync",
        total_files: totalFiles,
        total_size_mb: totalSizeMb,
        is_active: true,
      })

      // Actualizar sesión en Supabase
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("id, client_name, client_email, client_phone, portal_pin, tags")
        .eq("id", sessionId)
        .single()

      const currentTags = Array.isArray(sessionData?.tags) ? sessionData.tags : []
      const filteredTags = currentTags.filter((t: string) => !t.startsWith("stage:"))
      const updatedTags = [...filteredTags, "stage:shared"]

      await supabase
        .from("sessions")
        .update({
          tags: updatedTags,
          status: "delivered",
          updated_at: now.toISOString(),
        })
        .eq("id", sessionId)

      // Resolver teléfono si no está configurado directamente en la sesión
      let clientPhone = sessionData?.client_phone
      if (!clientPhone && sessionData?.client_email) {
        const { data: siblingSession } = await supabase
          .from("sessions")
          .select("client_phone")
          .eq("client_email", sessionData.client_email)
          .not("client_phone", "is", null)
          .limit(1)
          .maybeSingle()
        if (siblingSession?.client_phone) {
          clientPhone = siblingSession.client_phone
          await supabase.from("sessions").update({ client_phone: clientPhone }).eq("id", sessionId)
        }
      }

      // Enviar automáticamente Correo y WhatsApp al cliente
      if (sessionData?.client_email && sessionData?.portal_pin) {
        try {
          await sendPhotosReadyNotification({
            clientName: sessionData.client_name,
            clientEmail: sessionData.client_email,
            portalPin: sessionData.portal_pin,
            driveFolderUrl: folderUrl,
            photosCount: totalFiles,
            language: language || "fr",
          })
          logs.push({
            level: "success",
            msg: `✦ Email enviado a ${sessionData.client_email} con el código PIN y enlace Google Drive.`,
          })
        } catch (eEmail: any) {
          logs.push({
            level: "warn",
            msg: `Aviso email: ${eEmail?.message || eEmail}`,
          })
        }
      }

      if (clientPhone && sessionData?.portal_pin) {
        try {
          const waText = getPhotosReadyWhatsApp({
            clientName: sessionData.client_name,
            portalPin: sessionData.portal_pin,
            clientEmail: sessionData.client_email || "",
            driveUrl: folderUrl,
            photosCount: totalFiles,
            language: language || "fr",
          })

          await sendWhatsAppMessage({
            phone: clientPhone,
            text: waText,
            sessionId,
          })
          logs.push({
            level: "success",
            msg: `✦ WhatsApp enviado a ${clientPhone} con el código PIN y enlace Google Drive.`,
          })
        } catch (eWa: any) {
          logs.push({
            level: "warn",
            msg: `Aviso WhatsApp: ${eWa?.message || eWa}`,
          })
        }
      }

      return NextResponse.json({
        success: true,
        folderUrl,
        folderId,
        totalFiles,
        totalSizeMb,
        expiresAt: expiresAt.toISOString(),
        logs,
      })
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 })
  } catch (error: any) {
    console.error("[gdrive-direct error]:", error)
    return NextResponse.json(
      { error: error.message || "Error al procesar la conexión con Google Drive" },
      { status: 500 }
    )
  }
}

