import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { trashDriveFile } from "@/lib/gdrive"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * POST /api/deliveries/cleanup
 * Comprueba y recicla carpetas caducadas en Google Drive (Política de Retención)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1. Buscar entregas caducadas activas
    const { data: expiredDeliveries, error } = await supabase
      .from("media_deliveries")
      .select("id, session_id, gdrive_folder_id, label, url, expires_at")
      .not("gdrive_folder_id", "is", null)
      .lt("expires_at", nowIso)
      .eq("is_active", true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!expiredDeliveries || expiredDeliveries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay entregas caducadas pendientes de reciclaje.",
        processedCount: 0,
      })
    }

    const trashed: any[] = []

    // 2. Enviar a papelera en Google Drive y marcar desactivado
    for (const item of expiredDeliveries) {
      if (item.gdrive_folder_id) {
        const ok = await trashDriveFile(item.gdrive_folder_id)
        if (ok) {
          await supabase
            .from("media_deliveries")
            .update({ is_active: false })
            .eq("id", item.id)

          trashed.push({ id: item.id, folderId: item.gdrive_folder_id, label: item.label })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se han enviado a la papelera de Google Drive ${trashed.length} carpetas caducadas.`,
      processedCount: trashed.length,
      trashed,
    })
  } catch (error: any) {
    console.error("[Cleanup Deliveries Error]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
