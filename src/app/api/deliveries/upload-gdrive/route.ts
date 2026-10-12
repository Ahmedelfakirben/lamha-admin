import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createDeliveryDriveFolder, uploadFileToDrive } from "@/lib/gdrive"

export const maxDuration = 120 // Timeout ampliado para subidas de lote

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * POST /api/deliveries/upload-gdrive
 * Sube un lote de archivos finales a Google Drive de forma autónoma (Modo Nube / Remoto)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sessionId = formData.get("sessionId") as string
    const clientName = (formData.get("clientName") as string) || "Cliente"
    const retentionDaysStr = formData.get("retentionDays") as string
    const files = formData.getAll("files") as File[]

    if (!sessionId || !files || files.length === 0) {
      return NextResponse.json({ error: "Parámetros faltantes o ningún archivo adjunto." }, { status: 400 })
    }

    const retentionDays = parseInt(retentionDaysStr, 10) || 30
    const cleanClient = clientName.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
    const datePrefix = new Date().toISOString().split("T")[0]
    const folderName = `${datePrefix}_${cleanClient}_Entrega_Final`

    // 1. Crear la carpeta en Google Drive y hacerla compartida
    const { folderId, folderUrl } = await createDeliveryDriveFolder(folderName)

    let totalBytes = 0
    let uploadedCount = 0

    // 2. Subir cada archivo a la carpeta de Google Drive
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      totalBytes += buffer.length

      await uploadFileToDrive(
        folderId,
        file.name,
        file.type || "image/jpeg",
        buffer
      )
      uploadedCount++
    }

    const totalSizeMb = Number((totalBytes / (1024 * 1024)).toFixed(2))
    const now = new Date()
    const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)

    const supabase = getSupabaseAdmin()

    // 3. Registrar o actualizar la entrega en Supabase media_deliveries
    const { error: deliveryError } = await supabase
      .from("media_deliveries")
      .insert({
        session_id: sessionId,
        delivery_type: "final_link",
        url: folderUrl,
        label: `Google Drive Álbum Final (${uploadedCount} fotos)`,
        delivered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        gdrive_folder_id: folderId,
        delivery_mode: "cloud_direct",
        total_files: uploadedCount,
        total_size_mb: totalSizeMb,
        is_active: true,
      })

    if (deliveryError) {
      console.warn("Aviso al guardar en media_deliveries:", deliveryError.message)
    }

    // 4. Actualizar el estado de la sesión a 'delivered'
    await supabase
      .from("sessions")
      .update({
        status: "delivered",
        updated_at: now.toISOString(),
      })
      .eq("id", sessionId)

    return NextResponse.json({
      success: true,
      message: `Entrega completada. Se subieron ${uploadedCount} archivos a Google Drive con éxito.`,
      folderUrl,
      folderId,
      expiresAt: expiresAt.toISOString(),
      totalFiles: uploadedCount,
      totalSizeMb,
    })
  } catch (error: any) {
    console.error("[Upload GDrive Error]:", error)
    return NextResponse.json({ error: error.message || "Error procesando la entrega en Google Drive" }, { status: 500 })
  }
}
